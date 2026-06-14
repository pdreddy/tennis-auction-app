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

# All 14 captain PINs (mirrors /app/memory/test_credentials.md)
TEAM_PINS = {
    1: "481027", 2: "635914", 3: "217658", 4: "859302", 5: "374186",
    6: "196540", 7: "742839", 8: "503271", 9: "618495", 10: "285063",
    11: "947612", 12: "360728", 13: "814359", 14: "572046",
}


def _login(s, code, pin):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"code": code, "pin": pin}, timeout=15)
    assert r.status_code == 200, f"login {code} failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def team_headers(api_client):
    """Return {1: hdrs, 2: hdrs, ...} for all 14 captains."""
    return {
        tid: {
            "Authorization": f"Bearer {_login(api_client, f'TEAM{tid}', pin)}",
            "Content-Type": "application/json",
        }
        for tid, pin in TEAM_PINS.items()
    }


# ===================== Firebase create + initial-state shape =====================
class TestInitialState:
    def test_create_session_has_14_teams_with_captains_and_pools(self, api_client, fresh_session, admin_headers):
        sid = fresh_session["sessionId"]
        assert len(sid) == 6

        r = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers)
        assert r.status_code == 200
        state = r.json()["state"]

        # 14 teams, each with exactly the captain pre-assigned
        assert len(state["teams"]) == 14
        for t in state["teams"]:
            assert len(t["players"]) == 1, f"team {t['id']} should start with only captain"
            cap = t["players"][0]
            assert cap["Name"] == t["captain"]
            assert "acquiredPrice" in cap
            # budget reduced by captain price
            assert t["budget"] == 100000 - cap["acquiredPrice"]
            assert t["totalSpent"] == cap["acquiredPrice"]

        # 5.5 and 5.25 pools are fully consumed by captains => empty
        assert state["playerPools"]["utr_5_5"] == []
        assert state["playerPools"]["utr_5_25"] == []
        assert len(state["playerPools"]["utr_5_0"]) == 5

        # First current player must come from UTR 5.0 (since 5.5/5.25 empty)
        assert state["currentPoolIndex"] == 0  # raw index; effective skips empties

    def test_first_player_is_utr_5_base_12000(self, api_client, fresh_session, admin_headers, team_headers):
        sid = fresh_session["sessionId"]
        # 12000 succeeds → confirms base price 12000 (UTR 5.0)
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team_headers[1],
            json={"teamId": 1, "amount": 12000},
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
    def test_drain_pool_5_0_then_cross_into_pool_4_5(self, api_client, admin_headers, team_headers):
        """Award all 5 UTR-5.0 players to 5 different teams, then verify pool transition
        to UTR 4.5 — exercises Firebase array normalization across many writes."""
        r = api_client.post(f"{BASE_URL}/api/auctions", headers=admin_headers)
        sid = r.json()["sessionId"]

        awarded_names = []
        for tid in range(1, 6):  # 5 distinct teams (cap=1 per team for utr_5_0)
            # capture player BEFORE bidding
            state = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers).json()["state"]
            pool = state["playerPools"]["utr_5_0"]
            assert pool, f"pool 5.0 unexpectedly empty before iter {tid}"
            current_player = pool[0]

            rb = api_client.post(
                f"{BASE_URL}/api/auctions/{sid}/bid",
                headers=team_headers[tid],
                json={"teamId": tid, "amount": 12000},
            )
            assert rb.status_code == 200, f"bid tid={tid} failed: {rb.text}"

            rf = api_client.post(f"{BASE_URL}/api/auctions/{sid}/finalize", headers=admin_headers)
            assert rf.status_code == 200, f"finalize iter={tid} failed: {rf.text}"
            awarded_names.append(current_player["Name"])

        # Verify pool 5.0 fully drained and arrays normalized cleanly
        state = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers).json()["state"]
        assert state["playerPools"]["utr_5_0"] == [], "pool 5.0 should be empty"
        assert len(state["playerPools"]["utr_4_5"]) == 5, "pool 4.5 untouched (5 players)"

        # Teams 1-5 each have 2 players, $12k spent on top of captain price
        for tid in range(1, 6):
            t = next(x for x in state["teams"] if x["id"] == tid)
            assert len(t["players"]) == 2, f"team {tid} should have captain + 1 acquired"
            assert t["players"][-1]["acquiredPrice"] == 12000
            assert t["players"][-1]["Name"] == awarded_names[tid - 1]

        # currentPoolIndex must have advanced past empty 5.0 (=> 3, since 0,1 empty too)
        # raw index may be 3 (server increments past last awarded position),
        # but effective player must be from utr_4_5 — verify by placing a bid at $10k
        rb = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team_headers[6],
            json={"teamId": 6, "amount": 10000},  # UTR 4.5 base
        )
        assert rb.status_code == 200, f"first 4.5-pool bid failed: {rb.text}"
        # below-base for 4.5 (e.g. 9000) should fail
        rb2 = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team_headers[7],
            json={"teamId": 7, "amount": 9000},
        )
        assert rb2.status_code == 400

    def test_skip_moves_player_to_end_with_retry_flag(self, api_client, admin_headers):
        r = api_client.post(f"{BASE_URL}/api/auctions", headers=admin_headers)
        sid = r.json()["sessionId"]

        before = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers).json()["state"]
        pool_before = list(before["playerPools"]["utr_5_0"])
        first_player = pool_before[0]
        assert len(pool_before) == 5

        rs = api_client.post(f"{BASE_URL}/api/auctions/{sid}/skip", headers=admin_headers)
        assert rs.status_code == 200, rs.text

        after = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers).json()["state"]
        pool_after = after["playerPools"]["utr_5_0"]
        assert len(pool_after) == 5, "skip must not lose the player"
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
        assert len(state["playerPools"]["utr_5_0"]) == 5
        for t in state["teams"]:
            assert len(t["players"]) == 1  # captains only
        assert state["currentBids"] == {}
        assert state["currentPoolIndex"] == 0
        assert state["currentPlayerIndex"] == 0
