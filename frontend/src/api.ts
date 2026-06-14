import { ref, get, set, update, runTransaction, onValue } from "firebase/database";
import { db } from "./firebase";
import {
  getAccounts,
  getInitialTeams,
  freshPools,
  configSummary,
  POOL_ORDER,
  POOL_CAPS,
  POOL_CAPS as _POOL_CAPS,
  TEAM_SIZE,
  TIMER_MS,
  getUTRFromKey,
} from "./firebase/seed";

// ─── Helpers ────────────────────────────────────────────────────────────────

function nowMs() {
  return Date.now();
}

function newSessionId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function toArray(v: any): any[] {
  if (Array.isArray(v)) return v.filter((x) => x != null);
  if (v && typeof v === "object") {
    const keys = Object.keys(v).sort((a, b) => parseInt(a) - parseInt(b));
    return keys.map((k) => v[k]);
  }
  return [];
}

function normalize(doc: any) {
  if (!doc) return null;
  const teams = toArray(doc.teams).map((t: any) => ({ ...t, players: toArray(t.players) }));
  const raw = doc.playerPools || {};
  const playerPools: Record<string, any[]> = {};
  for (const key of POOL_ORDER) playerPools[key] = toArray(raw[key]);

  let cb = doc.currentBids || {};
  if (Array.isArray(cb)) cb = Object.fromEntries(cb.map((v: any, i: number) => [String(i), v]).filter(([, v]) => v));
  const currentBids: Record<string, number> = {};
  for (const [k, v] of Object.entries(cb)) currentBids[String(k)] = v as number;

  return {
    ...doc,
    teams,
    playerPools,
    currentBids,
    currentPoolIndex: doc.currentPoolIndex ?? 0,
    currentPlayerIndex: doc.currentPlayerIndex ?? 0,
    version: doc.version ?? 0,
    timerEnd: doc.timerEnd ?? nowMs(),
  };
}

function effective(doc: any) {
  const pools = doc.playerPools;
  let effPool = doc.currentPoolIndex;
  while (effPool < POOL_ORDER.length && (pools[POOL_ORDER[effPool]] || []).length === 0) effPool++;
  if (effPool >= POOL_ORDER.length) return { effPool, effPlayer: 0, poolKey: null, player: null };
  const pool = pools[POOL_ORDER[effPool]] || [];
  const effPlayer = effPool === doc.currentPoolIndex
    ? Math.min(doc.currentPlayerIndex, Math.max(0, pool.length - 1))
    : 0;
  return { effPool, effPlayer, poolKey: POOL_ORDER[effPool], player: pool[effPlayer] ?? null };
}

function validateBid(doc: any, teamId: number, amount: number): string | null {
  const { poolKey, player } = effective(doc);
  if (!player) return "No player available";
  const team = doc.teams.find((t: any) => t.id === teamId);
  if (!team) return "Team not found";
  if (team.players.length >= TEAM_SIZE) return `Team full (${TEAM_SIZE}/${TEAM_SIZE})`;
  const utr = getUTRFromKey(poolKey!);
  const fromPool = team.players.slice(1).filter((p: any) => p.utr === utr).length;
  const cap = POOL_CAPS[poolKey!] ?? 0;
  if (fromPool >= cap) return `Max ${cap} from UTR ${utr}`;
  if (!amount || amount <= 0) return "Enter valid amount";
  if (amount < player.price) return `Min: $${player.price.toLocaleString()}`;
  if ((amount - player.price) % 1000 !== 0) return "Base + $1,000 increments";
  const duplicate = doc.teams.find(
    (t: any) => t.id !== teamId && (doc.currentBids[String(t.id)] ?? 0) === amount
  );
  if (duplicate) return `$${amount.toLocaleString()} taken by ${duplicate.name} — bid higher`;
  if (amount > team.budget) return "Exceeds budget";
  const remaining = TEAM_SIZE - team.players.length;
  const minNeeded = remaining > 1 ? (remaining - 1) * 5000 : 0;
  if (amount > team.budget - minNeeded) return `Need $${minNeeded.toLocaleString()} for ${remaining - 1} more`;
  return null;
}

function initialDoc(sid: string) {
  return {
    sessionId: sid,
    teams: getInitialTeams(),
    playerPools: freshPools(),
    currentPoolIndex: 0,
    currentPlayerIndex: 0,
    currentBids: {},
    timerEnd: nowMs() + TIMER_MS,
    version: 0,
    lastUpdate: nowMs(),
  };
}

// ─── Seeding ────────────────────────────────────────────────────────────────

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const snap = await get(ref(db, "users/ADMIN"));
    if (snap.exists()) return; // already seeded
    const updates: Record<string, any> = {};
    for (const acc of getAccounts()) {
      updates[`users/${acc.code}`] = {
        code: acc.code,
        pin: acc.pin,
        role: acc.role,
        teamId: acc.teamId,
        name: acc.name,
      };
    }
    await update(ref(db), updates);
  })();
  return seedPromise;
}

// ─── Real-time listener ─────────────────────────────────────────────────────

export function subscribeAuction(
  sid: string,
  onState: (state: any) => void,
  onError: () => void
): () => void {
  const unsubscribe = onValue(
    ref(db, `auctions/${sid}`),
    (snap) => {
      if (snap.exists()) onState(normalize(snap.val()));
      else onError();
    },
    () => onError()
  );
  return unsubscribe;
}

// ─── API surface (same interface as before) ──────────────────────────────────

export const api = {
  login: async (code: string, pin: string) => {
    await ensureSeeded();
    const snap = await get(ref(db, `users/${code.trim().toUpperCase()}`));
    if (!snap.exists()) throw { status: 401, detail: "Invalid code or PIN" };
    const user = snap.val();
    if (user.pin !== pin) throw { status: 401, detail: "Invalid code or PIN" };
    return {
      token: user.code,
      user: { code: user.code, role: user.role, teamId: user.teamId, name: user.name },
    };
  },

  config: (_token: string) => Promise.resolve(configSummary()),

  createAuction: async (_token: string) => {
    let sid = newSessionId();
    while ((await get(ref(db, `auctions/${sid}`))).exists()) sid = newSessionId();
    await set(ref(db, `auctions/${sid}`), initialDoc(sid));
    return { sessionId: sid };
  },

  getAuction: async (sid: string, _token: string) => {
    const snap = await get(ref(db, `auctions/${sid}`));
    if (!snap.exists()) throw { status: 404, detail: `Session ${sid} not found` };
    return { serverNow: nowMs(), state: normalize(snap.val()) };
  },

  bid: async (sid: string, teamId: number, amount: number, _token: string) => {
    let txnError: string | null = null;
    await runTransaction(ref(db, `auctions/${sid}`), (doc) => {
      if (!doc) { txnError = "Session not found"; return; }
      const d = normalize(doc);
      if (d.timerEnd <= nowMs()) { txnError = "Time is up!"; return; }
      const err = validateBid(d, teamId, amount);
      if (err) { txnError = err; return; }
      d.currentBids[String(teamId)] = amount;
      d.version = (d.version || 0) + 1;
      d.lastUpdate = nowMs();
      return d;
    });
    if (txnError) throw { status: 400, detail: txnError };
    return { ok: true };
  },

  finalize: async (sid: string, _token: string) => {
    let txnError: string | null = null;
    await runTransaction(ref(db, `auctions/${sid}`), (doc) => {
      if (!doc) { txnError = "Session not found"; return; }
      const d = normalize(doc);
      const { effPool, effPlayer, poolKey, player } = effective(d);
      if (!player) { txnError = "No player available"; return; }

      const bids = Object.entries(d.currentBids)
        .map(([tid, b]) => ({ teamId: parseInt(tid), bid: b as number }))
        .filter((x) => x.bid > 0);
      if (!bids.length) { txnError = "No bids. Use Skip instead."; return; }
      const highest = Math.max(...bids.map((b) => b.bid));
      const winners = bids.filter((b) => b.bid === highest);
      if (winners.length > 1) {
        const names = winners.map((w) => d.teams.find((t: any) => t.id === w.teamId)?.name).join(", ");
        txnError = `Tie: ${names}. Place different bids.`;
        return;
      }

      const winId = winners[0].teamId;
      const winIdx = d.teams.findIndex((t: any) => t.id === winId);
      const win = d.teams[winIdx];
      if (win.players.length >= TEAM_SIZE) { txnError = `${win.name} is full`; return; }
      if (highest > win.budget) { txnError = `${win.name} cannot afford`; return; }

      d.teams[winIdx] = {
        ...win,
        players: [...win.players, { ...player, acquiredPrice: highest }],
        budget: win.budget - highest,
        totalSpent: win.totalSpent + highest,
      };

      const pool = [...d.playerPools[poolKey!]];
      pool.splice(effPlayer, 1);
      d.playerPools[poolKey!] = pool;

      let nextPool = effPool;
      let nextPlayer = effPlayer;
      if (effPlayer >= pool.length) { nextPool = effPool + 1; nextPlayer = 0; }

      d.currentPoolIndex = nextPool;
      d.currentPlayerIndex = nextPlayer;
      d.currentBids = {};
      d.timerEnd = nowMs() + TIMER_MS;
      d.version = (d.version || 0) + 1;
      d.lastUpdate = nowMs();
      return d;
    });
    if (txnError) throw { status: 400, detail: txnError };
    return { ok: true };
  },

  skip: async (sid: string, _token: string) => {
    let txnError: string | null = null;
    await runTransaction(ref(db, `auctions/${sid}`), (doc) => {
      if (!doc) { txnError = "Session not found"; return; }
      const d = normalize(doc);
      const { effPool, effPlayer, poolKey, player } = effective(d);
      if (!player) { txnError = "No player to skip"; return; }

      const pool = [...d.playerPools[poolKey!]];
      const moved = { ...pool[effPlayer], isRetry: true, retryCount: (pool[effPlayer].retryCount ?? 0) + 1 };
      pool.splice(effPlayer, 1);
      pool.push(moved);
      d.playerPools[poolKey!] = pool;

      let nextPool = effPool;
      let nextPlayer = effPlayer;
      if (effPlayer >= pool.length) { nextPool = effPool + 1; nextPlayer = 0; }

      d.currentPoolIndex = nextPool;
      d.currentPlayerIndex = nextPlayer;
      d.currentBids = {};
      d.timerEnd = nowMs() + TIMER_MS;
      d.version = (d.version || 0) + 1;
      d.lastUpdate = nowMs();
      return d;
    });
    if (txnError) throw { status: 400, detail: txnError };
    return { ok: true };
  },

  reset: async (sid: string, _token: string) => {
    await set(ref(db, `auctions/${sid}`), initialDoc(sid));
    return { ok: true };
  },
};
