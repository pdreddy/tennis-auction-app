"""
End-to-end tests for Tennis Auction API.

Strategy:
1. Stub out motor/pymongo before server.py is imported (system crypto lib is broken).
2. Replace server.db with an in-memory async mock.
3. Use httpx AsyncClient + ASGITransport to drive the FastAPI app.
"""

import os
import sys
import copy
import time
import types

# ------------------------------------------------------------------ path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# ------------------------------------------------------------------ env vars (before server import)
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/")
os.environ.setdefault("DB_NAME", "test_e2e")
os.environ.setdefault("JWT_SECRET", "e2e-test-secret")


# ------------------------------------------------------------------ stub motor / pymongo
class _FakeClient:
    def __init__(self, *a, **kw): pass
    def close(self): pass
    def __getitem__(self, name): return None


def _make_motor_stub():
    m = types.ModuleType("motor")
    ma = types.ModuleType("motor.motor_asyncio")
    ma.AsyncIOMotorClient = _FakeClient
    m.motor_asyncio = ma
    return m, ma


_motor_mod, _motor_async_mod = _make_motor_stub()
sys.modules.setdefault("motor", _motor_mod)
sys.modules.setdefault("motor.motor_asyncio", _motor_async_mod)


# ------------------------------------------------------------------ in-memory DB mock

class _Col:
    def __init__(self):
        self._docs: list[dict] = []

    async def find_one(self, q):
        for d in self._docs:
            if _match(d, q):
                return copy.deepcopy(d)
        return None

    async def insert_one(self, doc):
        self._docs.append(copy.deepcopy(doc))

    async def update_one(self, q, upd):
        for i, d in enumerate(self._docs):
            if _match(d, q):
                if "$set" in upd:
                    self._docs[i] = {**self._docs[i], **upd["$set"]}
                return _Res(1)
        return _Res(0)

    async def drop(self):
        self._docs.clear()

    async def create_index(self, *a, **kw):
        pass


class _Res:
    def __init__(self, n): self.matched_count = n


def _match(doc, q):
    return all(doc.get(k) == v for k, v in q.items())


class _DB:
    def __init__(self):
        self.users = _Col()
        self.auctions = _Col()


_mock_db = _DB()

# ------------------------------------------------------------------ import server (motor is already stubbed)
import server as srv

# Override the db object server.py created during module init
srv.db = _mock_db


# ------------------------------------------------------------------ pytest / anyio
import pytest

pytest_plugins = ("anyio",)


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def _reset():
    await _mock_db.users.drop()
    await _mock_db.auctions.drop()
    await srv.startup()


from httpx import AsyncClient, ASGITransport


@pytest.fixture
async def client():
    await _reset()
    async with AsyncClient(
        transport=ASGITransport(app=srv.app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
async def token(client):
    r = await client.post(
        "/api/auth/login",
        json={"email": "test@auction.com", "password": "Test1234"},
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
async def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def session(client, auth):
    r = await client.post("/api/auctions", headers=auth)
    assert r.status_code == 200, r.text
    return r.json()


# ==================================================================
# ------------------------------------------------------------------ Auth
class TestAuth:
    @pytest.mark.anyio
    async def test_register_new_user(self, client):
        r = await client.post(
            "/api/auth/register",
            json={"email": "new@test.com", "password": "Pass1234", "name": "New"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == "new@test.com"

    @pytest.mark.anyio
    async def test_register_duplicate_email(self, client):
        body = {"email": "dup@test.com", "password": "Pass1234", "name": "A"}
        await client.post("/api/auth/register", json=body)
        r = await client.post("/api/auth/register", json=body)
        assert r.status_code == 400

    @pytest.mark.anyio
    async def test_login_seeded_user(self, client):
        r = await client.post(
            "/api/auth/login",
            json={"email": "test@auction.com", "password": "Test1234"},
        )
        assert r.status_code == 200
        assert "token" in r.json()

    @pytest.mark.anyio
    async def test_login_wrong_password(self, client):
        r = await client.post(
            "/api/auth/login",
            json={"email": "test@auction.com", "password": "badpass"},
        )
        assert r.status_code == 401

    @pytest.mark.anyio
    async def test_login_unknown_email(self, client):
        r = await client.post(
            "/api/auth/login",
            json={"email": "ghost@test.com", "password": "Pass1234"},
        )
        assert r.status_code == 401

    @pytest.mark.anyio
    async def test_me_valid_token(self, client, auth):
        r = await client.get("/api/auth/me", headers=auth)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "test@auction.com"

    @pytest.mark.anyio
    async def test_me_no_token(self, client):
        r = await client.get("/api/auth/me")
        assert r.status_code in (401, 403)

    @pytest.mark.anyio
    async def test_me_invalid_token(self, client):
        r = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer bad.token.here"},
        )
        assert r.status_code == 401

    @pytest.mark.anyio
    async def test_create_auction_no_token(self, client):
        r = await client.post("/api/auctions")
        assert r.status_code in (401, 403)


# ------------------------------------------------------------------ Config
class TestConfig:
    @pytest.mark.anyio
    async def test_config_shape(self, client):
        r = await client.get("/api/config")
        assert r.status_code == 200
        c = r.json()
        assert c["teams"] == 14
        assert c["teamSize"] == 7
        assert c["budget"] == 100_000
        assert c["totalPlayers"] == 98
        pools = {p["key"]: p for p in c["pools"]}
        assert pools["utr_5_5"]["count"] == 0      # all 8 are captains
        assert pools["utr_5_25"]["count"] == 0     # all 5 are captains
        assert pools["utr_5_0"]["count"] == 5
        assert pools["utr_3_0"]["cap"] == 6


# ------------------------------------------------------------------ Auction lifecycle
class TestAuctionLifecycle:
    @pytest.mark.anyio
    async def test_create_auction_structure(self, session):
        assert len(session["sessionId"]) == 6
        state = session["state"]
        assert len(state["teams"]) == 14
        for t in state["teams"]:
            assert len(t["players"]) == 1
            assert t["budget"] < 100_000
            assert t["totalSpent"] > 0

    @pytest.mark.anyio
    async def test_first_pool_is_utr_5_0(self, session):
        state = session["state"]
        assert state["playerPools"]["utr_5_5"] == []
        assert state["playerPools"]["utr_5_25"] == []
        assert len(state["playerPools"]["utr_5_0"]) == 5

    @pytest.mark.anyio
    async def test_get_auction(self, client, auth, session):
        sid = session["sessionId"]
        r = await client.get(f"/api/auctions/{sid}", headers=auth)
        assert r.status_code == 200
        assert "state" in r.json()
        assert "serverNow" in r.json()

    @pytest.mark.anyio
    async def test_get_auction_not_found(self, client, auth):
        r = await client.get("/api/auctions/ZZZZZZ", headers=auth)
        assert r.status_code == 404


# ------------------------------------------------------------------ Bidding
class TestBidding:
    @pytest.mark.anyio
    async def test_valid_bid(self, client, auth, session):
        sid = session["sessionId"]
        r = await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12000},
        )
        assert r.status_code == 200

    @pytest.mark.anyio
    async def test_bid_reflects_in_state(self, client, auth, session):
        sid = session["sessionId"]
        await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12000},
        )
        state = (await client.get(f"/api/auctions/{sid}", headers=auth)).json()["state"]
        assert state["currentBids"].get("1") == 12000

    @pytest.mark.anyio
    async def test_bid_below_base_rejected(self, client, auth, session):
        sid = session["sessionId"]
        r = await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 5000},
        )
        assert r.status_code == 400
        assert "Min" in r.json()["detail"]

    @pytest.mark.anyio
    async def test_bid_bad_increment_rejected(self, client, auth, session):
        sid = session["sessionId"]
        r = await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12500},
        )
        assert r.status_code == 400
        assert "increment" in r.json()["detail"].lower()

    @pytest.mark.anyio
    async def test_duplicate_bid_blocked(self, client, auth, session):
        sid = session["sessionId"]
        await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12000},
        )
        r = await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 2, "amount": 12000},
        )
        assert r.status_code == 400
        assert "taken" in r.json()["detail"].lower()

    @pytest.mark.anyio
    async def test_bid_exceeds_budget_rejected(self, client, auth, session):
        sid = session["sessionId"]
        state = session["state"]
        team = state["teams"][0]
        over = team["budget"] + 5000
        r = await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": team["id"], "amount": over},
        )
        assert r.status_code == 400

    @pytest.mark.anyio
    async def test_budget_reserve_rule(self, client, auth, session):
        """Cannot bid so high that reserve for remaining slots is violated."""
        sid = session["sessionId"]
        state = session["state"]
        team = state["teams"][0]
        budget = team["budget"]
        base = 12_000
        # 6 more slots; keep 5 × $5,000 = $25,000
        max_allowed = budget - 25_000
        if max_allowed < base:
            pytest.skip("Team budget too low for reserve test")
        # One $1k increment above max_allowed (rounded to valid value from base)
        violating = ((max_allowed - base) // 1000 + 1) * 1000 + base
        r = await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": team["id"], "amount": violating},
        )
        assert r.status_code == 400


# ------------------------------------------------------------------ Finalize / Skip / Reset
class TestFinalizeSkipReset:
    @pytest.mark.anyio
    async def test_finalize_awards_player(self, client, auth, session):
        sid = session["sessionId"]
        await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12000},
        )
        r = await client.post(f"/api/auctions/{sid}/finalize", headers=auth)
        assert r.status_code == 200

        state = (await client.get(f"/api/auctions/{sid}", headers=auth)).json()["state"]
        t1 = next(t for t in state["teams"] if t["id"] == 1)
        assert len(t1["players"]) == 2
        assert t1["players"][1]["acquiredPrice"] == 12000

    @pytest.mark.anyio
    async def test_finalize_no_bids_rejected(self, client, auth, session):
        sid = session["sessionId"]
        r = await client.post(f"/api/auctions/{sid}/finalize", headers=auth)
        assert r.status_code == 400
        assert "skip" in r.json()["detail"].lower()

    @pytest.mark.anyio
    async def test_finalize_clears_bids_and_resets_timer(self, client, auth, session):
        sid = session["sessionId"]
        await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12000},
        )
        await client.post(f"/api/auctions/{sid}/finalize", headers=auth)
        state = (await client.get(f"/api/auctions/{sid}", headers=auth)).json()["state"]
        assert state["currentBids"] == {}
        assert state["timerEnd"] > int(time.time() * 1000)

    @pytest.mark.anyio
    async def test_higher_bid_wins(self, client, auth, session):
        sid = session["sessionId"]
        await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12000},
        )
        await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 2, "amount": 13000},
        )
        await client.post(f"/api/auctions/{sid}/finalize", headers=auth)

        state = (await client.get(f"/api/auctions/{sid}", headers=auth)).json()["state"]
        t2 = next(t for t in state["teams"] if t["id"] == 2)
        assert t2["players"][1]["acquiredPrice"] == 13000
        t1 = next(t for t in state["teams"] if t["id"] == 1)
        assert len(t1["players"]) == 1   # didn't win

    @pytest.mark.anyio
    async def test_skip_moves_player_to_end(self, client, auth, session):
        sid = session["sessionId"]
        first = session["state"]["playerPools"]["utr_5_0"][0]["Name"]

        r = await client.post(f"/api/auctions/{sid}/skip", headers=auth)
        assert r.status_code == 200

        state = (await client.get(f"/api/auctions/{sid}", headers=auth)).json()["state"]
        pool = state["playerPools"]["utr_5_0"]
        assert pool[-1]["Name"] == first
        assert pool[-1]["isRetry"] is True
        assert pool[-1]["retryCount"] == 1

    @pytest.mark.anyio
    async def test_skip_increments_retry_count(self, client, auth, session):
        sid = session["sessionId"]
        first = session["state"]["playerPools"]["utr_5_0"][0]["Name"]

        # Two full rotations through 5 players = 10 skips.
        for _ in range(10):
            await client.post(f"/api/auctions/{sid}/skip", headers=auth)

        state = (await client.get(f"/api/auctions/{sid}", headers=auth)).json()["state"]
        pool = state["playerPools"]["utr_5_0"]
        p = next((x for x in pool if x["Name"] == first), None)
        assert p is not None
        assert p.get("retryCount", 0) >= 2

    @pytest.mark.anyio
    async def test_reset_restores_initial_state(self, client, auth, session):
        sid = session["sessionId"]
        await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12000},
        )
        await client.post(f"/api/auctions/{sid}/finalize", headers=auth)

        r = await client.post(f"/api/auctions/{sid}/reset", headers=auth)
        assert r.status_code == 200

        state = (await client.get(f"/api/auctions/{sid}", headers=auth)).json()["state"]
        for t in state["teams"]:
            assert len(t["players"]) == 1
        assert state["currentPoolIndex"] == 0
        assert state["currentBids"] == {}
        assert len(state["playerPools"]["utr_5_0"]) == 5


# ------------------------------------------------------------------ Pool progression
class TestPoolProgression:
    @pytest.mark.anyio
    async def test_pool_empties_after_all_sold(self, client, auth, session):
        sid = session["sessionId"]
        for i in range(5):
            await client.post(
                f"/api/auctions/{sid}/bid",
                headers=auth,
                json={"teamId": i + 1, "amount": 12000},
            )
            r = await client.post(f"/api/auctions/{sid}/finalize", headers=auth)
            assert r.status_code == 200, f"finalize {i}: {r.text}"

        state = (await client.get(f"/api/auctions/{sid}", headers=auth)).json()["state"]
        assert state["playerPools"]["utr_5_0"] == []

    @pytest.mark.anyio
    async def test_team_cannot_exceed_pool_cap(self, client, auth, session):
        """UTR-5.0 pool has 5 players and 14 teams → cap = 1 per team."""
        sid = session["sessionId"]
        # Give team 1 a UTR-5.0 player.
        await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12000},
        )
        await client.post(f"/api/auctions/{sid}/finalize", headers=auth)
        # Skip 4 more until a second UTR-5.0 player is up — but we only
        # have 4 left (we sold 1). Team 1 tries to bid again.
        for _ in range(3):
            await client.post(
                f"/api/auctions/{sid}/bid",
                headers=auth,
                json={"teamId": 2, "amount": 12000},
            )
            await client.post(f"/api/auctions/{sid}/finalize", headers=auth)
        # Now try team 1 bidding on another UTR 5.0.
        r = await client.post(
            f"/api/auctions/{sid}/bid",
            headers=auth,
            json={"teamId": 1, "amount": 12000},
        )
        assert r.status_code == 400
        assert "max" in r.json()["detail"].lower()
