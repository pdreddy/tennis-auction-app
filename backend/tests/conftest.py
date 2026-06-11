import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://player-bidding-8.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def seeded_token(api_client):
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "test@auction.com", "password": "Test1234"},
        timeout=15,
    )
    assert r.status_code == 200, f"Seed login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture
def auth_headers(seeded_token):
    return {"Authorization": f"Bearer {seeded_token}", "Content-Type": "application/json"}


@pytest.fixture
def fresh_session(api_client, auth_headers):
    r = api_client.post(f"{BASE_URL}/api/auctions", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()
