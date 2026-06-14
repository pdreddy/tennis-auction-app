from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import time
import random
import string
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt

import seed_data as seed
import firebase_db as fb

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Initialise the Firebase Realtime Database admin client at import time so it is
# ready for the very first request (fails fast if the credential is bad).
fb.init()

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
TOKEN_EXPIRE_DAYS = 30
TIMER_MS = 60000

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ----------------------------- Firebase helpers -----------------------------
async def fb_get(path: str):
    return await asyncio.to_thread(lambda: fb.ref(path).get())


async def fb_set(path: str, value):
    return await asyncio.to_thread(lambda: fb.ref(path).set(value))


def to_list(v):
    """Firebase stores arrays as index-keyed objects / drops empties — normalize back to a list."""
    if isinstance(v, list):
        return [x for x in v if x is not None]
    if isinstance(v, dict):
        try:
            return [v[k] for k in sorted(v.keys(), key=lambda x: int(x))]
        except (ValueError, TypeError):
            return list(v.values())
    return []


def normalize(doc):
    """Coerce a raw Firebase auction node into the canonical shape the app expects."""
    if not doc:
        return None
    doc = dict(doc)
    doc["teams"] = [
        {**t, "players": to_list(t.get("players"))} for t in to_list(doc.get("teams"))
    ]
    pools = doc.get("playerPools") or {}
    doc["playerPools"] = {k: to_list(pools.get(k)) for k in seed.POOL_ORDER}
    cb = doc.get("currentBids") or {}
    if isinstance(cb, list):
        cb = {str(i): v for i, v in enumerate(cb) if v}
    doc["currentBids"] = {str(k): v for k, v in cb.items()}
    doc["currentPoolIndex"] = doc.get("currentPoolIndex", 0)
    doc["currentPlayerIndex"] = doc.get("currentPlayerIndex", 0)
    doc["version"] = doc.get("version", 0)
    doc["timerEnd"] = doc.get("timerEnd", now_ms())
    return doc


async def run_txn(sid: str, mutate):
    """Atomic compare-and-set on the whole auction node.

    `mutate(doc) -> (new_doc, error_detail)`. On error the node is left unchanged
    and the error is surfaced; concurrent writers are serialised by RTDB.
    """
    holder = {}

    def txn(current):
        if current is None:
            holder["error"] = (404, "Session not found")
            return None
        doc = normalize(current)
        new_doc, err = mutate(doc)
        if err is not None:
            holder["error"] = (400, err)
            return current  # commit unchanged → reject
        holder["ok"] = True
        return new_doc

    await asyncio.to_thread(lambda: fb.ref(f"auctions/{sid}").transaction(txn))
    return holder


# ----------------------------- Auth helpers -----------------------------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user: dict) -> str:
    payload = {
        "sub": user["code"],
        "role": user["role"],
        "teamId": user["teamId"],
        "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    cred_err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
    )
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        code = payload.get("sub")
    except jwt.PyJWTError:
        raise cred_err
    if not code:
        raise cred_err
    user = await fb_get(f"users/{code}")
    if not user:
        raise cred_err
    return {
        "code": user["code"],
        "role": user["role"],
        "teamId": user.get("teamId"),
        "name": user.get("name", ""),
    }


async def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin (auctioneer) only")
    return user


# ----------------------------- Models -----------------------------
class LoginReq(BaseModel):
    code: str
    pin: str


class BidReq(BaseModel):
    teamId: int
    amount: int


# ----------------------------- Auction logic -----------------------------
def now_ms() -> int:
    return int(time.time() * 1000)


def new_session_id() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def initial_doc(sid: str) -> dict:
    return {
        "sessionId": sid,
        "teams": seed.get_initial_teams(),
        "playerPools": seed.fresh_pools(),
        "currentPoolIndex": 0,
        "currentPlayerIndex": 0,
        "currentBids": {},
        "timerEnd": now_ms() + TIMER_MS,
        "version": 0,
        "lastUpdate": now_ms(),
    }


def effective(doc: dict):
    """Return (eff_pool_idx, eff_player_idx, pool_key, player)."""
    pools = doc["playerPools"]
    eff_pool = doc["currentPoolIndex"]
    while eff_pool < len(seed.POOL_ORDER) and len(pools.get(seed.POOL_ORDER[eff_pool], [])) == 0:
        eff_pool += 1
    if eff_pool >= len(seed.POOL_ORDER):
        return eff_pool, 0, None, None
    pool = pools[seed.POOL_ORDER[eff_pool]]
    if eff_pool == doc["currentPoolIndex"]:
        eff_player = min(doc["currentPlayerIndex"], max(0, len(pool) - 1))
    else:
        eff_player = 0
    player = pool[eff_player] if pool else None
    return eff_pool, eff_player, seed.POOL_ORDER[eff_pool], player


def count_from_pool(team: dict, utr: float) -> int:
    return len([p for p in team["players"][1:] if p["utr"] == utr])


def pool_cap_reached(team: dict, pool_key: str) -> bool:
    return count_from_pool(team, seed.get_utr_from_key(pool_key)) >= seed.POOL_CAPS.get(pool_key, 0)


def validate_bid(doc: dict, team_id: int, amount: int):
    _, _, pool_key, player = effective(doc)
    team = next((t for t in doc["teams"] if t["id"] == team_id), None)
    if not team:
        return "Team not found"
    if len(team["players"]) >= seed.TEAM_SIZE:
        return f"Team full ({seed.TEAM_SIZE}/{seed.TEAM_SIZE})"
    if pool_cap_reached(team, pool_key):
        return f"Max {seed.POOL_CAPS[pool_key]} from UTR {seed.get_utr_from_key(pool_key)}"
    if not player:
        return "No player"
    if not amount or amount <= 0:
        return "Enter valid amount"
    if amount < player["price"]:
        return f"Min: ${player['price']:,}"
    if (amount - player["price"]) % 1000 != 0:
        return "Base + $1,000 increments"
    dup = next(
        (t for t in doc["teams"] if t["id"] != team_id and doc["currentBids"].get(str(t["id"]), 0) == amount),
        None,
    )
    if dup:
        return f"${amount:,} taken by {dup['name']} — bid higher"
    if amount > team["budget"]:
        return "Exceeds budget"
    remaining = seed.TEAM_SIZE - len(team["players"])
    min_needed = (remaining - 1) * 5000 if remaining > 1 else 0
    if amount > team["budget"] - min_needed:
        return f"Need ${min_needed:,} for {remaining - 1} more"
    return None


def winning_bids(doc: dict):
    bids = [
        (int(tid), b)
        for tid, b in doc["currentBids"].items()
        if b and b > 0
    ]
    if not bids:
        return [], 0
    highest = max(b for _, b in bids)
    winners = [tid for tid, b in bids if b == highest]
    return winners, highest


# ----------------------------- Mutations (run inside a transaction) -----------------------------
def mutate_bid(doc, team_id, amount):
    if doc["timerEnd"] <= now_ms():
        return None, "Time is up!"
    err = validate_bid(doc, team_id, amount)
    if err:
        return None, err
    doc["currentBids"][str(team_id)] = amount
    doc["version"] = doc.get("version", 0) + 1
    doc["lastUpdate"] = now_ms()
    return doc, None


def mutate_finalize(doc):
    eff_pool, eff_player, pool_key, player = effective(doc)
    if not player:
        return None, "No player available"
    winners, highest = winning_bids(doc)
    if not winners:
        return None, "No bids. Use Skip instead."
    if len(winners) > 1:
        names = ", ".join(next(t["name"] for t in doc["teams"] if t["id"] == w) for w in winners)
        return None, f"Tie: {names}. Place different bids."

    win_id = winners[0]
    teams = doc["teams"]
    idx = next(i for i, t in enumerate(teams) if t["id"] == win_id)
    win = teams[idx]
    if len(win["players"]) >= seed.TEAM_SIZE:
        return None, f"{win['name']} is full"
    if highest > win["budget"]:
        return None, f"{win['name']} cannot afford"

    win["players"] = list(win["players"]) + [{**player, "acquiredPrice": highest}]
    win["budget"] = win["budget"] - highest
    win["totalSpent"] = win["totalSpent"] + highest

    cur = doc["playerPools"][pool_key]
    cur.pop(eff_player)
    next_pool, next_player = eff_pool, eff_player
    if eff_player >= len(cur):
        next_pool, next_player = eff_pool + 1, 0

    doc["currentPoolIndex"] = next_pool
    doc["currentPlayerIndex"] = next_player
    doc["currentBids"] = {}
    doc["timerEnd"] = now_ms() + TIMER_MS
    doc["version"] = doc.get("version", 0) + 1
    doc["lastUpdate"] = now_ms()
    return doc, None


def mutate_skip(doc):
    eff_pool, eff_player, pool_key, player = effective(doc)
    if not player:
        return None, "No player to skip"
    cur = doc["playerPools"][pool_key]
    moved = dict(cur[eff_player])
    moved["isRetry"] = True
    moved["retryCount"] = moved.get("retryCount", 0) + 1
    cur.pop(eff_player)
    cur.append(moved)
    next_pool, next_player = eff_pool, eff_player
    if eff_player >= len(cur):
        next_pool, next_player = eff_pool + 1, 0
    doc["currentPoolIndex"] = next_pool
    doc["currentPlayerIndex"] = next_player
    doc["currentBids"] = {}
    doc["timerEnd"] = now_ms() + TIMER_MS
    doc["version"] = doc.get("version", 0) + 1
    doc["lastUpdate"] = now_ms()
    return doc, None


# ----------------------------- Auth routes -----------------------------
@api_router.post("/auth/login")
async def login(req: LoginReq):
    code = req.code.strip().upper()
    user = await fb_get(f"users/{code}")
    if not user or not verify_pw(req.pin, user["hashed_pin"]):
        raise HTTPException(status_code=401, detail="Invalid code or PIN")
    pub = {
        "code": user["code"],
        "role": user["role"],
        "teamId": user.get("teamId"),
        "name": user.get("name", ""),
    }
    return {"token": create_token(pub), "user": pub}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": user}


# ----------------------------- Config route -----------------------------
@api_router.get("/config")
async def config():
    return seed.config_summary()


# ----------------------------- Auction routes -----------------------------
@api_router.post("/auctions")
async def create_auction(user=Depends(require_admin)):
    sid = new_session_id()
    while await fb_get(f"auctions/{sid}"):
        sid = new_session_id()
    doc = initial_doc(sid)
    await fb_set(f"auctions/{sid}", doc)
    return {"sessionId": sid, "serverNow": now_ms(), "state": doc}


@api_router.get("/auctions/{sid}")
async def get_auction(sid: str, user=Depends(get_current_user)):
    doc = normalize(await fb_get(f"auctions/{sid}"))
    if not doc:
        raise HTTPException(status_code=404, detail=f"Session {sid} not found")
    return {"serverNow": now_ms(), "state": doc}


@api_router.post("/auctions/{sid}/bid")
async def place_bid(sid: str, req: BidReq, user=Depends(get_current_user)):
    if user["role"] != "captain" or user["teamId"] != req.teamId:
        raise HTTPException(status_code=403, detail="You can only bid for your own team")
    holder = await run_txn(sid, lambda d: mutate_bid(d, req.teamId, req.amount))
    if "error" in holder:
        raise HTTPException(status_code=holder["error"][0], detail=holder["error"][1])
    return {"ok": True}


@api_router.post("/auctions/{sid}/finalize")
async def finalize(sid: str, user=Depends(require_admin)):
    holder = await run_txn(sid, mutate_finalize)
    if "error" in holder:
        raise HTTPException(status_code=holder["error"][0], detail=holder["error"][1])
    return {"ok": True}


@api_router.post("/auctions/{sid}/skip")
async def skip(sid: str, user=Depends(require_admin)):
    holder = await run_txn(sid, mutate_skip)
    if "error" in holder:
        raise HTTPException(status_code=holder["error"][0], detail=holder["error"][1])
    return {"ok": True}


@api_router.post("/auctions/{sid}/reset")
async def reset(sid: str, user=Depends(require_admin)):
    existing = await fb_get(f"auctions/{sid}")
    if not existing:
        raise HTTPException(status_code=404, detail="Session not found")
    await fb_set(f"auctions/{sid}", initial_doc(sid))
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    fb.init()
    # Seed accounts: always upsert admin so PIN changes take effect immediately;
    # only create team accounts if they don't exist yet.
    for acc in seed.get_accounts():
        payload = {
            "code": acc["code"],
            "hashed_pin": hash_pw(acc["pin"]),
            "role": acc["role"],
            "teamId": acc["teamId"],
            "name": acc["name"],
        }
        if acc["role"] == "admin":
            await fb_set(f"users/{acc['code']}", payload)
        else:
            existing = await fb_get(f"users/{acc['code']}")
            if not existing:
                await fb_set(f"users/{acc['code']}", payload)
