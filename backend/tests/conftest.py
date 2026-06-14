import os
import pytest
import requests

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://player-bidding-8.preview.emergentagent.com").rstrip("/")

ADMIN = {"code": "ADMIN", "pin": "731902"}
TEAM1 = {"code": "TEAM1", "pin": "481027"}
TEAM2 = {"code": "TEAM2", "pin": "635914"}


def _login(s, body):
    r = s.post(f"{BASE_URL}/api/auth/login", json=body, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api_client):
    return _login(api_client, ADMIN)


@pytest.fixture(scope="session")
def team1_token(api_client):
    return _login(api_client, TEAM1)


@pytest.fixture(scope="session")
def team2_token(api_client):
    return _login(api_client, TEAM2)


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def team1_headers(team1_token):
    return {"Authorization": f"Bearer {team1_token}", "Content-Type": "application/json"}


@pytest.fixture
def team2_headers(team2_token):
    return {"Authorization": f"Bearer {team2_token}", "Content-Type": "application/json"}


@pytest.fixture
def fresh_session(api_client, admin_headers):
    r = api_client.post(f"{BASE_URL}/api/auctions", headers=admin_headers, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()
