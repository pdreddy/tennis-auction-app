"""Firebase migration regression tests for Tennis Auction (Jan 2026).

Focuses on Firebase Realtime DB specifics:
- arrays stored as index-keyed objects (normalization on read)
- empty arrays dropped by Firebase
- pool progression across multiple finalize/skip operations
- end-to-end persistence (fresh GET after mutation reflects DB state)
"""
import os
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://player-bidding-8.preview.emergentagent.com"
).rstrip("/")

# All 16 captain PINs (mirrors backend/seed_data.py TEAM_PINS)
TEAM_PINS = {
    1: "481027", 2: "635914", 3: "217658", 4: "859302", 5: "374186",
    6: "196540", 7: "742839", 8: "503271", 9: "618495", 10: "285063",
    11: "947612", 12: "360728", 13: "814359", 14: "572046", 15: "639021",
    16: "184756",
}


def _login(s, code, pin):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"code": code, "pin": pin}, timeout=15)
    assert r.status_code == 200, f"login {code} failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def team_headers(api_client):
    """Return {1: hdrs, 2: hdrs, ...} for all 16 captains."""
    return {
        tid: {
            "Authorization": f"Bearer {_login(api_client, f'TEAM{tid}', pin)}",
            "Content-Type": "application/json",
        }
        for tid, pin in TEAM_PINS.items()
    }


# ===================== Firebase create + initial-state shape =====================
class TestInitialState:
    def test_create_session_has_16_teams_with_captains_and_pools(self, api_client, fresh_session, admin_headers):
        sid = fresh_session["sessionId"]
        assert len(sid) == 6

        r = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers)
        assert r.status_code == 200
        state = r.json()["state"]

        # 16 teams, each with exactly the captain pre-assigned
        assert len(state["teams"]) == 16
        for t in state["teams"]:
            assert len(t["players"]) == 1, f"team {t['id']} should start with only captain"
            cap = t["players"][0]
            assert cap["Name"] == t["captain"]
            assert "acquiredPrice" in cap
            # budget reduced by captain price
            assert t["budget"] == 100000 - cap["acquiredPrice"]
            assert t["totalSpent"] == cap["acquiredPrice"]

        # Pools auctioned lowest-UTR first; UTR 3.0 leads with 16 players.
        assert len(state["playerPools"]["utr_3_0"]) == 16

        # First current player comes from UTR 3.0 (raw index 0, first non-empty pool)
        assert state["currentPoolIndex"] == 0

    def test_first_player_is_utr_3_base_5000(self, api_client, fresh_session, admin_headers, team_headers):
        sid = fresh_session["sessionId"]
        # 5000 succeeds → confirms base price 5000 (UTR 3.0, first pool auctioned)
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team_headers[1],
            json={"teamId": 1, "amount": 5000},
        )
        assert r.status_code == 200, r.text


# ===================== Persistence across fresh GETs =====================
class TestPersistence:
    def test_state_persists_in_firebase(self, api_client, admin_headers, team_headers):
        # Create
        r = api_client.post(f"{BASE_URL}/api/auctions", headers=admin_headers)
        sid = r.json()["sessionId"]

        # Bid
        rb = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team_headers[2],
            json={"teamId": 2, "amount": 12000},
        )
        assert rb.status_code == 200

        # Fresh GET (no caching) sees the bid
        s2 = requests.Session()
        s2.headers.update(admin_headers)
        polled = s2.get(f"{BASE_URL}/api/auctions/{sid}").json()["state"]
        assert polled["currentBids"]["2"] == 12000

        # Finalize
        rf = api_client.post(f"{BASE_URL}/api/auctions/{sid}/finalize", headers=admin_headers)
        assert rf.status_code == 200

        # Brand new session sees the awarded player
        s3 = requests.Session()
        s3.headers.update(admin_headers)
        after = s3.get(f"{BASE_URL}/api/auctions/{sid}").json()["state"]
        t2 = next(t for t in after["teams"] if t["id"] == 2)
        assert len(t2["players"]) == 2
        assert t2["players"][-1]["acquiredPrice"] == 12000
        assert t2["totalSpent"] == t2["players"][0]["acquiredPrice"] + 12000
        assert after["currentBids"] == {}


# ===================== Multi-finalize / pool-progression (Firebase array edge case) =====================
class TestMultiFinalize:
    def test_drain_pool_3_0_then_cross_into_pool_3_5(self, api_client, admin_headers, team_headers):
        """Award all 16 UTR-3.0 players to 16 different teams (cap=1/team), then verify
        pool transition to UTR 3.5 — exercises Firebase array normalization across many writes."""
        r = api_client.post(f"{BASE_URL}/api/auctions", headers=admin_headers)
        sid = r.json()["sessionId"]

        awarded = {}  # tid -> awarded player name
        for tid in range(1, 17):  # 16 distinct teams drain the 16-player UTR-3.0 pool
            # capture player BEFORE bidding
            state = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers).json()["state"]
            pool = state["playerPools"]["utr_3_0"]
            assert pool, f"pool 3.0 unexpectedly empty before iter {tid}"
            current_player = pool[0]

            rb = api_client.post(
                f"{BASE_URL}/api/auctions/{sid}/bid",
                headers=team_headers[tid],
                json={"teamId": tid, "amount": 5000},  # UTR 3.0 base
            )
            assert rb.status_code == 200, f"bid tid={tid} failed: {rb.text}"

            rf = api_client.post(f"{BASE_URL}/api/auctions/{sid}/finalize", headers=admin_headers)
            assert rf.status_code == 200, f"finalize iter={tid} failed: {rf.text}"
            awarded[tid] = current_player["Name"]

        # Verify pool 3.0 fully drained and arrays normalized cleanly
        state = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers).json()["state"]
        assert state["playerPools"]["utr_3_0"] == [], "pool 3.0 should be empty"
        assert len(state["playerPools"]["utr_3_5"]) == 15, "pool 3.5 untouched (15 players)"

        # Each team has 2 players, $5k spent on top of captain price
        for tid in range(1, 17):
            t = next(x for x in state["teams"] if x["id"] == tid)
            assert len(t["players"]) == 2, f"team {tid} should have captain + 1 acquired"
            assert t["players"][-1]["acquiredPrice"] == 5000
            assert t["players"][-1]["Name"] == awarded[tid]

        # Effective player must now come from utr_3_5 — verify by bidding its base ($7.5k)
        rb = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team_headers[1],
            json={"teamId": 1, "amount": 7500},  # UTR 3.5 base
        )
        assert rb.status_code == 200, f"first 3.5-pool bid failed: {rb.text}"
        # below-base for 3.5 (e.g. 7000) should fail
        rb2 = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team_headers[2],
            json={"teamId": 2, "amount": 7000},
        )
        assert rb2.status_code == 400

    def test_skip_moves_player_to_end_with_retry_flag(self, api_client, admin_headers):
        r = api_client.post(f"{BASE_URL}/api/auctions", headers=admin_headers)
        sid = r.json()["sessionId"]

        before = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers).json()["state"]
        pool_before = list(before["playerPools"]["utr_3_0"])
        first_player = pool_before[0]
        assert len(pool_before) == 16

        rs = api_client.post(f"{BASE_URL}/api/auctions/{sid}/skip", headers=admin_headers)
        assert rs.status_code == 200, rs.text

        after = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers).json()["state"]
        pool_after = after["playerPools"]["utr_3_0"]
        assert len(pool_after) == 16, "skip must not lose the player"
        assert pool_after[-1]["id"] == first_player["id"], "skipped player goes to end"
        assert pool_after[-1].get("isRetry") is True
        assert pool_after[-1].get("retryCount", 0) == 1
        # head rotated to old index 1
        assert pool_after[0]["id"] == pool_before[1]["id"]
        assert after["currentBids"] == {}


# ===================== Reset restores initial state =====================
class TestReset:
    def test_reset_restores_initial(self, api_client, admin_headers, team_headers):
        r = api_client.post(f"{BASE_URL}/api/auctions", headers=admin_headers)
        sid = r.json()["sessionId"]

        # mutate: bid + finalize
        api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team_headers[1],
            json={"teamId": 1, "amount": 12000},
        )
        api_client.post(f"{BASE_URL}/api/auctions/{sid}/finalize", headers=admin_headers)

        rr = api_client.post(f"{BASE_URL}/api/auctions/{sid}/reset", headers=admin_headers)
        assert rr.status_code == 200

        state = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers).json()["state"]
        assert len(state["playerPools"]["utr_3_0"]) == 16
        for t in state["teams"]:
            assert len(t["players"]) == 1  # captains only
        assert state["currentBids"] == {}
        assert state["currentPoolIndex"] == 0
        assert state["currentPlayerIndex"] == 0
