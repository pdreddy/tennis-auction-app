"""Backend tests for Tennis Player Auction with code+PIN + role auth (Jan 2026)."""
import os
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://player-bidding-8.preview.emergentagent.com"
).rstrip("/")


# ===================== Auth (code + PIN) =====================
class TestAuth:
    def test_admin_login(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"code": "ADMIN", "pin": "731902"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "token" in d
        assert d["user"]["code"] == "ADMIN"
        assert d["user"]["role"] == "admin"
        assert d["user"]["teamId"] is None

    def test_team1_login(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"code": "TEAM1", "pin": "481027"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["role"] == "captain"
        assert d["user"]["teamId"] == 1

    def test_wrong_pin_returns_401(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"code": "TEAM1", "pin": "000000"})
        assert r.status_code == 401

    def test_unknown_code_returns_401(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"code": "NOPE", "pin": "731902"})
        assert r.status_code == 401

    def test_code_is_case_insensitive(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"code": "team2", "pin": "635914"})
        assert r.status_code == 200
        assert r.json()["user"]["teamId"] == 2

    def test_me_admin(self, api_client, admin_headers):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["code"] == "ADMIN" and u["role"] == "admin"

    def test_me_captain(self, api_client, team1_headers):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=team1_headers)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["role"] == "captain" and u["teamId"] == 1

    def test_me_invalid_token(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer bad"})
        assert r.status_code == 401


# ===================== Config =====================
class TestConfig:
    def test_config_shape(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/config")
        assert r.status_code == 200
        c = r.json()
        assert c["teams"] == 14 and c["teamSize"] == 7
        assert c["budget"] == 100000 and c["totalPlayers"] == 98
        pools = {p["key"]: p for p in c["pools"]}
        assert pools["utr_5_5"]["count"] == 0
        assert pools["utr_5_25"]["count"] == 0
        assert pools["utr_5_0"]["count"] == 5
        assert pools["utr_3_0"]["cap"] == 6


# ===================== Authorization =====================
class TestAuthorization:
    def test_captain_cannot_create_auction(self, api_client, team1_headers):
        r = api_client.post(f"{BASE_URL}/api/auctions", headers=team1_headers)
        assert r.status_code == 403

    def test_admin_can_create_auction(self, fresh_session):
        assert "sessionId" in fresh_session
        assert len(fresh_session["sessionId"]) == 6

    def test_captain_can_bid_own_team(self, api_client, team1_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team1_headers,
            json={"teamId": 1, "amount": 12000},
        )
        assert r.status_code == 200, r.text

    def test_captain_cannot_bid_other_team(self, api_client, team1_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team1_headers,
            json={"teamId": 2, "amount": 12000},
        )
        assert r.status_code == 403

    def test_admin_cannot_bid(self, api_client, admin_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=admin_headers,
            json={"teamId": 1, "amount": 12000},
        )
        assert r.status_code == 403

    def test_captain_cannot_finalize(self, api_client, team1_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(f"{BASE_URL}/api/auctions/{sid}/finalize", headers=team1_headers)
        assert r.status_code == 403

    def test_captain_cannot_skip(self, api_client, team1_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(f"{BASE_URL}/api/auctions/{sid}/skip", headers=team1_headers)
        assert r.status_code == 403

    def test_captain_cannot_reset(self, api_client, team1_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(f"{BASE_URL}/api/auctions/{sid}/reset", headers=team1_headers)
        assert r.status_code == 403

    def test_admin_can_skip(self, api_client, admin_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(f"{BASE_URL}/api/auctions/{sid}/skip", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_can_reset(self, api_client, admin_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(f"{BASE_URL}/api/auctions/{sid}/reset", headers=admin_headers)
        assert r.status_code == 200


# ===================== Bidding rules =====================
class TestBidding:
    def test_bid_below_base(self, api_client, team1_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team1_headers,
            json={"teamId": 1, "amount": 11000},
        )
        assert r.status_code == 400 and "Min" in r.json()["detail"]

    def test_bid_bad_increment(self, api_client, team1_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team1_headers,
            json={"teamId": 1, "amount": 12500},
        )
        assert r.status_code == 400 and "increment" in r.json()["detail"].lower()

    def test_unique_bid_rule(self, api_client, team1_headers, team2_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r1 = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team1_headers,
            json={"teamId": 1, "amount": 13000},
        )
        assert r1.status_code == 200
        r2 = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team2_headers,
            json={"teamId": 2, "amount": 13000},
        )
        assert r2.status_code == 400 and "taken" in r2.json()["detail"].lower()

    def test_budget_reserve_rule(self, api_client, team1_headers, fresh_session):
        sid = fresh_session["sessionId"]
        r = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team1_headers,
            json={"teamId": 1, "amount": 63000},
        )
        assert r.status_code == 400


# ===================== Full bid+award flow =====================
class TestFullFlow:
    def test_full_flow_admin_creates_team1_bids_admin_finalizes(
        self, api_client, admin_headers, team1_headers
    ):
        # Admin creates
        r = api_client.post(f"{BASE_URL}/api/auctions", headers=admin_headers)
        assert r.status_code == 200
        sid = r.json()["sessionId"]

        before = api_client.get(
            f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers
        ).json()["state"]
        t1_before = next(t for t in before["teams"] if t["id"] == 1)
        pool_before = len(before["playerPools"]["utr_5_0"])

        # Captain TEAM1 bids
        rb = api_client.post(
            f"{BASE_URL}/api/auctions/{sid}/bid",
            headers=team1_headers,
            json={"teamId": 1, "amount": 12000},
        )
        assert rb.status_code == 200

        # Admin sees the bid via polling
        polled = api_client.get(
            f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers
        ).json()["state"]
        assert polled["currentBids"].get("1") == 12000

        # Admin finalizes
        rf = api_client.post(f"{BASE_URL}/api/auctions/{sid}/finalize", headers=admin_headers)
        assert rf.status_code == 200, rf.text

        after = api_client.get(
            f"{BASE_URL}/api/auctions/{sid}", headers=admin_headers
        ).json()["state"]
        t1_after = next(t for t in after["teams"] if t["id"] == 1)
        assert len(t1_after["players"]) == len(t1_before["players"]) + 1
        assert t1_after["budget"] == t1_before["budget"] - 12000
        assert t1_after["totalSpent"] == t1_before["totalSpent"] + 12000
        assert len(after["playerPools"]["utr_5_0"]) == pool_before - 1
        assert after["currentBids"] == {}
        assert t1_after["players"][-1]["acquiredPrice"] == 12000
