"""Comprehensive backend tests for Tennis Player Auction API."""
import os
import uuid
import requests
import pytest

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://player-bidding-8.preview.emergentagent.com"
).rstrip("/")


# ===================== Auth =====================
class TestAuth:
    def test_register_new_user(self, api_client):
        email = f"test_{uuid.uuid4().hex[:10]}@auction.com"
        r = api_client.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "Pass1234", "name": "QA"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["user"]["email"] == email

    def test_login_seeded_user(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@auction.com", "password": "Test1234"},
        )
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_invalid_password(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@auction.com", "password": "wrongpass"},
        )
        assert r.status_code == 401

    def test_auth_me_with_token(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "test@auction.com"

    def test_auth_me_missing_token(self, api_client):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in (401, 403)

    def test_auth_me_invalid_token(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer bogus.token.value"},
        )
        assert r.status_code == 401

    def test_protected_route_rejects_no_token(self, api_client):
        r = requests.post(f"{BASE_URL}/api/auctions")
        assert r.status_code in (401, 403)


# ===================== Config =====================
class TestConfig:
    def test_config_shape(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/config")
        assert r.status_code == 200
        c = r.json()
        assert c["teams"] == 14
        assert c["teamSize"] == 7
        assert c["budget"] == 100000
        assert c["totalPlayers"] == 98
        pools = {p["key"]: p for p in c["pools"]}
        # 5.5 (8 players) and 5.25 (6 players) are ALL captains => count 0 in pool
        assert pools["utr_5_5"]["count"] == 0
        assert pools["utr_5_25"]["count"] == 0
        # UTR 5.0 should have remaining players (5 players, none captains)
        assert pools["utr_5_0"]["count"] == 5
        # UTR 3.0 large filler pool, cap should be TEAM_SIZE-1 = 6
        assert pools["utr_3_0"]["cap"] == 6


# ===================== Auction lifecycle =====================
class TestAuctionLifecycle:
    def test_create_auction(self, fresh_session):
        s = fresh_session
        assert "sessionId" in s
        assert len(s["sessionId"]) == 6
        state = s["state"]
        assert len(state["teams"]) == 14
        # Each team has 1 captain pre-assigned and budget reduced
        for t in state["teams"]:
            assert len(t["players"]) == 1
            assert t["budget"] < 100000
            assert t["totalSpent"] > 0

    def test_first_effective_player_is_utr_5_0(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        state = fresh_session["state"]
        # pools 5_5 and 5_25 empty => first non-empty is 5_0
        assert len(state["playerPools"]["utr_5_5"]) == 0
        assert len(state["playerPools"]["utr_5_25"]) == 0
        first = state["playerPools"]["utr_5_0"][0]
        assert first["price"] == 12000

    def test_get_auction(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.get(f"{BASE_URL}/api/auctions/{sid}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["state"]["sessionId"] == sid

    def test_get_auction_not_found(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/auctions/ZZZZZZ", headers=auth_headers)
        assert r.status_code == 404


# ===================== Bidding =====================
class TestBidding:
    def test_valid_bid(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=auth_headers,
            json={"teamId": 1, "amount": 12000},
        )
        assert r.status_code == 200, r.text

    def test_bid_below_base(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=auth_headers,
            json={"teamId": 1, "amount": 11000},
        )
        assert r.status_code == 400
        assert "Min" in r.json()["detail"]

    def test_bid_bad_increment(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=auth_headers,
            json={"teamId": 1, "amount": 12500},
        )
        assert r.status_code == 400
        assert "increment" in r.json()["detail"].lower()

    def test_duplicate_bid_blocked(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r1 = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=auth_headers,
            json={"teamId": 1, "amount": 13000},
        )
        assert r1.status_code == 200, r1.text
        r2 = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=auth_headers,
            json={"teamId": 2, "amount": 13000},
        )
        assert r2.status_code == 400
        assert "taken" in r2.json()["detail"].lower()

    def test_bid_exceeds_budget(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=auth_headers,
            json={"teamId": 1, "amount": 999000},
        )
        assert r.status_code == 400

    def test_budget_reserve_rule(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        # Team has 6 slots left after captain => must reserve 5 * 5000 = 25000
        # Budget is 87000 (100000 - 13000 captain). max bid allowed = 87000-25000 = 62000
        # So 63000 should fail
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=auth_headers,
            json={"teamId": 1, "amount": 63000},
        )
        assert r.status_code == 400
        assert "Need" in r.json()["detail"] or "more" in r.json()["detail"]


# ===================== Finalize / Skip / Reset =====================
class TestFinalizeSkipReset:
    def test_finalize_awards_player(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        # Place a bid first
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=auth_headers,
            json={"teamId": 1, "amount": 12000},
        )
        assert r.status_code == 200

        before = api_client.get(
            f"{BASE_URL}/api/auctions/{sid}", headers=auth_headers
        ).json()["state"]
        team1_before = next(t for t in before["teams"] if t["id"] == 1)
        budget_before = team1_before["budget"]
        spent_before = team1_before["totalSpent"]
        pool_before = len(before["playerPools"]["utr_5_0"])

        rf = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/finalize", headers=auth_headers
        )
        assert rf.status_code == 200, rf.text

        after = api_client.get(
            f"{BASE_URL}/api/auctions/{sid}", headers=auth_headers
        ).json()["state"]
        team1_after = next(t for t in after["teams"] if t["id"] == 1)
        assert len(team1_after["players"]) == len(team1_before["players"]) + 1
        assert team1_after["budget"] == budget_before - 12000
        assert team1_after["totalSpent"] == spent_before + 12000
        assert len(after["playerPools"]["utr_5_0"]) == pool_before - 1
        assert after["currentBids"] == {}
        # Acquired price recorded
        last_player = team1_after["players"][-1]
        assert last_player["acquiredPrice"] == 12000

    def test_finalize_no_bids(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/finalize", headers=auth_headers
        )
        assert r.status_code == 400
        assert "No bids" in r.json()["detail"]

    def test_skip_moves_player_to_end(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        before = fresh_session["state"]
        pool_before = list(before["playerPools"]["utr_5_0"])
        original_first = pool_before[0]

        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/skip", headers=auth_headers
        )
        assert r.status_code == 200, r.text

        after = api_client.get(
            f"{BASE_URL}/api/auctions/{sid}", headers=auth_headers
        ).json()["state"]
        pool_after = after["playerPools"]["utr_5_0"]
        assert len(pool_after) == len(pool_before)  # same count, just reordered
        # Original first should be at end with isRetry
        last = pool_after[-1]
        assert last["id"] == original_first["id"]
        assert last.get("isRetry") is True
        assert last.get("retryCount", 0) == 1

    def test_reset_restores_initial_state(self, api_client, auth_headers, fresh_session):
        sid = fresh_session["sessionId"]
        # Make changes via bid + finalize
        api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=auth_headers,
            json={"teamId": 1, "amount": 12000},
        )
        api_client.post(f"{BASE_URL}/api/auctions/{sid}/finalize", headers=auth_headers)

        r = api_client.post(f"{BASE_URL}/api/auctions/{sid}/reset", headers=auth_headers)
        assert r.status_code == 200

        after = api_client.get(
            f"{BASE_URL}/api/auctions/{sid}", headers=auth_headers
        ).json()["state"]
        # All teams should have only captain
        for t in after["teams"]:
            assert len(t["players"]) == 1
        # UTR 5.0 pool full again
        assert len(after["playerPools"]["utr_5_0"]) == 5
