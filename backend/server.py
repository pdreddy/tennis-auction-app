from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import time
import random
import string
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt

import seed_data as seed

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
TOKEN_EXPIRE_DAYS = 30
TIMER_MS = 60000

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ----------------------------- Auth helpers -----------------------------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(sub: str) -> str:
    payload = {
        "sub": sub,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    cred_err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
    )
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        email = payload.get("sub")
    except jwt.PyJWTError:
        raise cred_err
    if not email:
        raise cred_err
    user = await db.users.find_one({"email": email})
    if not user:
        raise cred_err
    return {"email": user["email"], "name": user.get("name", "")}


# ----------------------------- Models -----------------------------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = ""


class LoginReq(BaseModel):
    email: EmailStr
    password: str


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


def strip(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def commit(sid: str, version: int, updates: dict) -> bool:
    updates["version"] = version + 1
    updates["lastUpdate"] = now_ms()
    res = await db.auctions.update_one(
        {"sessionId": sid, "version": version}, {"$set": updates}
    )
    return res.matched_count == 1


# ----------------------------- Auth routes -----------------------------
@api_router.post("/auth/register")
async def register(req: RegisterReq):
    email = req.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    await db.users.insert_one(
        {"email": email, "hashed_password": hash_pw(req.password), "name": req.name}
    )
    token = create_token(email)
    return {"token": token, "user": {"email": email, "name": req.name}}


@api_router.post("/auth/login")
async def login(req: LoginReq):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(email)
    return {"token": token, "user": {"email": email, "name": user.get("name", "")}}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": user}


# ----------------------------- Config route -----------------------------
@api_router.get("/config")
async def config():
    return seed.config_summary()


# ----------------------------- Auction routes -----------------------------
@api_router.post("/auctions")
async def create_auction(user=Depends(get_current_user)):
    sid = new_session_id()
    while await db.auctions.find_one({"sessionId": sid}):
        sid = new_session_id()
    doc = initial_doc(sid)
    await db.auctions.insert_one(dict(doc))
    return {"sessionId": sid, "serverNow": now_ms(), "state": strip(doc)}


@api_router.get("/auctions/{sid}")
async def get_auction(sid: str, user=Depends(get_current_user)):
    doc = await db.auctions.find_one({"sessionId": sid})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Session {sid} not found")
    return {"serverNow": now_ms(), "state": strip(doc)}


@api_router.post("/auctions/{sid}/bid")
async def place_bid(sid: str, req: BidReq, user=Depends(get_current_user)):
    doc = await db.auctions.find_one({"sessionId": sid})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    if doc["timerEnd"] <= now_ms():
        raise HTTPException(status_code=400, detail="Time is up!")
    err = validate_bid(doc, req.teamId, req.amount)
    if err:
        raise HTTPException(status_code=400, detail=err)
    bids = dict(doc["currentBids"])
    bids[str(req.teamId)] = req.amount
    ok = await commit(sid, doc["version"], {"currentBids": bids})
    if not ok:
        raise HTTPException(status_code=409, detail="Bid conflict — please retry")
    return {"ok": True}


@api_router.post("/auctions/{sid}/finalize")
async def finalize(sid: str, user=Depends(get_current_user)):
    doc = await db.auctions.find_one({"sessionId": sid})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    eff_pool, eff_player, pool_key, player = effective(doc)
    if not player:
        raise HTTPException(status_code=400, detail="No player available")
    winners, highest = winning_bids(doc)
    if not winners:
        raise HTTPException(status_code=400, detail="No bids. Use Skip instead.")
    if len(winners) > 1:
        names = ", ".join(
            next(t["name"] for t in doc["teams"] if t["id"] == w) for w in winners
        )
        raise HTTPException(status_code=400, detail=f"Tie: {names}. Place different bids.")

    win_id = winners[0]
    teams = [dict(t) for t in doc["teams"]]
    idx = next(i for i, t in enumerate(teams) if t["id"] == win_id)
    win = teams[idx]
    if len(win["players"]) >= seed.TEAM_SIZE:
        raise HTTPException(status_code=400, detail=f"{win['name']} is full")
    if highest > win["budget"]:
        raise HTTPException(status_code=400, detail=f"{win['name']} cannot afford")

    acquired = dict(player)
    acquired["acquiredPrice"] = highest
    win = dict(win)
    win["players"] = list(win["players"]) + [acquired]
    win["budget"] = win["budget"] - highest
    win["totalSpent"] = win["totalSpent"] + highest
    teams[idx] = win

    pools = {k: list(v) for k, v in doc["playerPools"].items()}
    cur = list(pools[pool_key])
    cur.pop(eff_player)
    pools[pool_key] = cur

    next_pool, next_player = eff_pool, eff_player
    if eff_player >= len(cur):
        next_pool, next_player = eff_pool + 1, 0

    ok = await commit(
        sid,
        doc["version"],
        {
            "teams": teams,
            "playerPools": pools,
            "currentPoolIndex": next_pool,
            "currentPlayerIndex": next_player,
            "currentBids": {},
            "timerEnd": now_ms() + TIMER_MS,
        },
    )
    if not ok:
        raise HTTPException(status_code=409, detail="Conflict — please retry")
    return {"ok": True}


@api_router.post("/auctions/{sid}/skip")
async def skip(sid: str, user=Depends(get_current_user)):
    doc = await db.auctions.find_one({"sessionId": sid})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    eff_pool, eff_player, pool_key, player = effective(doc)
    if not player:
        raise HTTPException(status_code=400, detail="No player to skip")

    pools = {k: list(v) for k, v in doc["playerPools"].items()}
    cur = list(pools[pool_key])
    moved = dict(cur[eff_player])
    moved["isRetry"] = True
    moved["retryCount"] = moved.get("retryCount", 0) + 1
    cur.pop(eff_player)
    cur.append(moved)
    pools[pool_key] = cur

    next_pool, next_player = eff_pool, eff_player
    if eff_player >= len(cur):
        next_pool, next_player = eff_pool + 1, 0

    ok = await commit(
        sid,
        doc["version"],
        {
            "playerPools": pools,
            "currentPoolIndex": next_pool,
            "currentPlayerIndex": next_player,
            "currentBids": {},
            "timerEnd": now_ms() + TIMER_MS,
        },
    )
    if not ok:
        raise HTTPException(status_code=409, detail="Conflict — please retry")
    return {"ok": True}


@api_router.post("/auctions/{sid}/reset")
async def reset(sid: str, user=Depends(get_current_user)):
    doc = await db.auctions.find_one({"sessionId": sid})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    fresh = initial_doc(sid)
    fresh["version"] = doc["version"] + 1
    await db.auctions.update_one({"sessionId": sid}, {"$set": fresh})
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
    await db.users.create_index("email", unique=True)
    await db.auctions.create_index("sessionId", unique=True)
    # Seed a test account for QA.
    if not await db.users.find_one({"email": "test@auction.com"}):
        await db.users.insert_one(
            {
                "email": "test@auction.com",
                "hashed_password": hash_pw("Test1234"),
                "name": "Test User",
            }
        )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
