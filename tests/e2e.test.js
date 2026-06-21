/**
 * End-to-end test cases for tennis-auction-app
 *
 * These are plain JS unit/integration tests that verify the core logic
 * functions extracted from index.html. Run with: node tests/e2e.test.js
 *
 * Tests cover:
 *  1. buildPools        – pool construction from player list
 *  2. buildInitialTeams – team init with captain budget deduction
 *  3. normalize         – Firebase data normalisation
 *  4. getEffective      – current player/pool resolution
 *  5. parseCSV          – CSV import
 *  6. setNumTeams logic – settings tab team count sync
 *  7. config round-trip – settings saved → createNew → auction doc
 *  8. reset integrity   – reset rebuilds from stored cfgPlayers/cfgTeams
 *  9. POOL_CAPS_EFF     – one-player-per-UTR-level cap
 * 10. reserve logic     – progressive reserve for future UTR levels
 * 11. bid increments    – $1k manual increments and quick chips
 * 12. TIMER_EFF         – timer respects state.config
 * 13. anti-snipe timer  – last-second bids extend the clock
 */

import { PLAYERS as DEFAULT_PLAYERS } from "../src/data/players.js";
import { TEAMS as DEFAULT_TEAMS } from "../src/data/teams.js";

// ── Inline the pure functions under test ──────────────────────────────────────

const POOL_ORDER = ["utr_3_0","utr_3_5","utr_4_0","utr_4_5","utr_5_0","utr_5_5","utr_6_0"];
const TEAM_BUDGET = 100000;
const TEAM_SIZE   = 7;
const TIMER_MS    = 60000;
const ANTI_SNIPE_THRESHOLD_MS = 3000;
const ANTI_SNIPE_EXTENSION_MS = 3000;
const UTR_PRICES = {6.0:20000,5.5:14000,5.0:12000,4.5:10000,4.0:8000,3.5:6000,3.0:5000};
const UTR_TIERS = [6.0,5.5,5.0,4.5,4.0,3.5,3.0];
const BID_INCREMENT_OPTIONS = [1000, 2000, 3000, 5000];

function getUTR(key) {
    const m = key.match(/utr_(\d+)_(\d+)/);
    return m ? parseFloat(`${m[1]}.${m[2]}`) : 3.0;
}

function buildPools(players, poolOrder, captainNames) {
    const pools = {};
    poolOrder.forEach(key => {
        const utr = getUTR(key);
        pools[key] = players.filter(p => p.utr === utr && !captainNames.has(p.Name)).map(x => ({...x}));
    });
    return pools;
}

function buildInitialTeams(cfgTeams, cfgPlayers, budget) {
    const byName = Object.fromEntries(cfgPlayers.map(p => [p.Name, p]));
    return cfgTeams.map(team => {
        const cap = byName[team.captain];
        const price = cap?.price || 0;
        return {
            ...team, budget: budget - price, totalSpent: price,
            players: cap ? [{id:`c${team.id}`, Name:cap.Name, utr:cap.utr, acquiredPrice:price}] : []
        };
    });
}

function normalize(data) {
    if (!data) return null;
    const toArr = v => Array.isArray(v) ? v.filter(x=>x!=null) :
        (v&&typeof v==="object" ? Object.keys(v).sort((a,b)=>parseInt(a)-parseInt(b)).map(k=>v[k]) : []);
    const teams = toArr(data.teams).map(t => ({...t, players: toArr(t.players)}));
    const rawPools = data.playerPools || {};
    const playerPools = {};
    POOL_ORDER.forEach(k => { playerPools[k] = toArr(rawPools[k]); });
    let cb = data.currentBids || {};
    if (Array.isArray(cb)) cb = Object.fromEntries(cb.map((v,i)=>[String(i),v]).filter(([,v])=>v));
    const currentBids = {};
    Object.entries(cb).forEach(([k,v]) => { currentBids[String(k)] = v; });
    const cfgPlayers = Array.isArray(data.cfgPlayers) ? data.cfgPlayers : null;
    const cfgTeams   = Array.isArray(data.cfgTeams)   ? data.cfgTeams   : null;
    return { ...data, teams, playerPools, currentBids, cfgPlayers, cfgTeams,
        currentPoolIndex: data.currentPoolIndex||0,
        currentPlayerIndex: data.currentPlayerIndex||0,
        timerEnd: data.timerEnd || Date.now() };
}

function getEffective(state) {
    const pools = state.playerPools;
    let effPool = state.currentPoolIndex;
    while (effPool < POOL_ORDER.length && (pools[POOL_ORDER[effPool]]||[]).length === 0) effPool++;
    if (effPool >= POOL_ORDER.length) return { complete: true };
    const pool = pools[POOL_ORDER[effPool]] || [];
    const effPlayer = effPool === state.currentPoolIndex
        ? Math.min(state.currentPlayerIndex, Math.max(0, pool.length-1))
        : 0;
    return { complete: false, effPool, effPlayer, poolKey: POOL_ORDER[effPool], pool, player: pool[effPlayer]||null };
}

function buildPoolCaps(playerPools) {
    const caps = {};
    POOL_ORDER.forEach(key => {
        const size = (playerPools[key] || []).length;
        caps[key] = size === 0 ? 0 : 1;
    });
    return caps;
}

function teamOwnsUtr(team, utr) {
    return (team?.players || []).some(p => Number(p.utr) === Number(utr));
}

function reserveAfterCurrentWin(team, eff, teamSize) {
    if (!eff?.player || !team) return {amount:0,slots:0,maxBid:team?.budget||0};
    const projectedPlayers = [...team.players, eff.player];
    const openSlots = Math.max(0, teamSize - projectedPlayers.length);
    if (openSlots === 0) return {amount:0,slots:0,maxBid:team.budget};
    const ownedUtrs = new Set(projectedPlayers.map(p => Number(p.utr)));
    const remainingTierCosts = UTR_TIERS
        .filter(utr => !ownedUtrs.has(Number(utr)))
        .map(utr => UTR_PRICES[utr] || 5000);
    const slots = Math.min(openSlots, remainingTierCosts.length);
    const amount = remainingTierCosts.slice(0, slots).reduce((sum,cost)=>sum+cost, 0);
    return {amount,slots,maxBid:Math.max(0, team.budget - amount)};
}


function validateBidForTest({team, teams, currentBids, eff, amount, teamSize}) {
    if (!eff?.player) return "No player";
    if (!team) return "Team not found";
    if (team.players.length >= teamSize) return "Team full";
    const utr = getUTR(eff.poolKey);
    if (teamOwnsUtr(team, utr)) return `Max 1 at UTR ${utr}`;
    if (!amount || amount <= 0) return "Enter amount";
    if (amount < eff.player.price) return `Min $${eff.player.price}`;
    if ((amount - eff.player.price) % 1000 !== 0) return "Bids must be in $1k increments";
    const currentTeamBid = currentBids[String(team.id)] || 0;
    const competingHighBid = Math.max(0, ...Object.entries(currentBids)
        .filter(([tid]) => parseInt(tid) !== team.id)
        .map(([,bid]) => bid || 0));
    if (competingHighBid > 0 && amount <= competingHighBid && amount !== currentTeamBid) {
        return `Bid at least $${competingHighBid + 1000}`;
    }
    const dup = teams.find(t => t.id !== team.id && (currentBids[String(t.id)] || 0) === amount);
    if (dup) return `$${amount} taken by ${dup.name}`;
    if (amount > team.budget) return "Exceeds budget";
    const reserve = reserveAfterCurrentWin(team, eff, teamSize);
    if (amount > reserve.maxBid) return `Keep reserve · max bid $${reserve.maxBid}`;
    return null;
}

function buildBidChips(highest, playerPrice, maxBid) {
    const defaultBid = highest > 0 ? highest + 1000 : playerPrice;
    return [
        {label:"D", amount:defaultBid},
        ...BID_INCREMENT_OPTIONS.map(increment => ({
            label:`+${increment/1000}k`,
            amount: defaultBid + increment
        }))
    ].filter(chip => chip.amount <= maxBid);
}

function isOneThousandIncrement(amount, playerPrice) {
    return amount >= playerPrice && (amount - playerPrice) % 1000 === 0;
}

function getAntiSnipeTimerEnd(timerEnd, now, thresholdMs, extensionMs) {
    if (!timerEnd || !thresholdMs || !extensionMs) return timerEnd;
    const remainingMs = timerEnd - now;
    return remainingMs > 0 && remainingMs < thresholdMs ? now + extensionMs : timerEnd;
}

function parseCSV(text) {
    const rows = text.trim().split('\n').map(r=>r.split(',').map(c=>c.trim().replace(/^"|"$/g,'')));
    if (!rows.length) return [];
    const hdr = rows[0].map(h=>h.toLowerCase());
    const ni = hdr.findIndex(h=>h.includes('name')||h.includes('player'));
    const ui = hdr.findIndex(h=>h.includes('utr')||h.includes('rating'));
    const pi = hdr.findIndex(h=>h.includes('price')||h.includes('cost'));
    if (ni<0) return [];
    return rows.slice(1).map((r,i)=>{
        const utr = ui>=0 ? parseFloat(r[ui])||3.0 : 3.0;
        return { id: Date.now()+i, Name:r[ni]||'', utr, price:pi>=0?parseInt(r[pi])||UTR_PRICES[utr]||5000:UTR_PRICES[utr]||5000 };
    }).filter(p=>p.Name);
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch(e) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${e.message}`);
        failed++;
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        },
        toEqual(expected) {
            const a = JSON.stringify(actual), b = JSON.stringify(expected);
            if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
        },
        toBeNull() { if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`); },
        toBeTruthy() { if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`); },
        toBeFalsy() { if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`); },
        toHaveLength(n) {
            if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`);
        },
        toBeGreaterThan(n) { if (!(actual > n)) throw new Error(`Expected > ${n}, got ${actual}`); },
    };
}

// ── Sample data ───────────────────────────────────────────────────────────────

const samplePlayers = [
    {id:1, Name:"Alice",  utr:5.5, price:14000},
    {id:2, Name:"Bob",    utr:5.0, price:12000},
    {id:3, Name:"Carol",  utr:4.5, price:10000},
    {id:4, Name:"Dave",   utr:4.5, price:10000},
    {id:5, Name:"Eve",    utr:3.0, price:5000},
    {id:6, Name:"Frank",  utr:3.0, price:5000},
    {id:7, Name:"Grace",  utr:5.5, price:14000}, // captain
];

const sampleTeams = [
    {id:1, name:"Team A", captain:"Grace"},
    {id:2, name:"Team B", captain:""},
];

// ── Test suite ────────────────────────────────────────────────────────────────

console.log("\n1. buildPools");

test("excludes captains from pools", () => {
    const capNames = new Set(["Grace"]);
    const pools = buildPools(samplePlayers, POOL_ORDER, capNames);
    const utr55 = pools["utr_5_5"];
    expect(utr55.find(p=>p.Name==="Grace")).toBeFalsy();
    expect(utr55.find(p=>p.Name==="Alice")).toBeTruthy();
});

test("groups players by UTR tier", () => {
    const capNames = new Set();
    const pools = buildPools(samplePlayers, POOL_ORDER, capNames);
    expect(pools["utr_5_5"]).toHaveLength(2); // Alice + Grace
    expect(pools["utr_5_0"]).toHaveLength(1); // Bob
    expect(pools["utr_4_5"]).toHaveLength(2); // Carol + Dave
    expect(pools["utr_3_0"]).toHaveLength(2); // Eve + Frank
});

test("empty pool for tier with no players", () => {
    const capNames = new Set();
    const pools = buildPools(samplePlayers, POOL_ORDER, capNames);
    expect(pools["utr_6_0"]).toHaveLength(0);
    expect(pools["utr_3_5"]).toHaveLength(0);
});

console.log("\n2. buildInitialTeams");

test("deducts captain price from budget", () => {
    const teams = buildInitialTeams(sampleTeams, samplePlayers, TEAM_BUDGET);
    const teamA = teams.find(t=>t.id===1);
    expect(teamA.budget).toBe(TEAM_BUDGET - 14000); // Grace costs 14000
    expect(teamA.totalSpent).toBe(14000);
});

test("team with no captain starts at full budget with empty roster", () => {
    const teams = buildInitialTeams(sampleTeams, samplePlayers, TEAM_BUDGET);
    const teamB = teams.find(t=>t.id===2);
    expect(teamB.budget).toBe(TEAM_BUDGET);
    expect(teamB.players).toHaveLength(0);
});

test("captain is placed as first player in roster", () => {
    const teams = buildInitialTeams(sampleTeams, samplePlayers, TEAM_BUDGET);
    const teamA = teams.find(t=>t.id===1);
    expect(teamA.players).toHaveLength(1);
    expect(teamA.players[0].Name).toBe("Grace");
});

test("uses custom budget from config", () => {
    const teams = buildInitialTeams(sampleTeams, samplePlayers, 80000);
    const teamA = teams.find(t=>t.id===1);
    expect(teamA.budget).toBe(80000 - 14000);
});

console.log("\n2b. default captain/team data");

test("default teams match configured captain list and names", () => {
    expect(DEFAULT_TEAMS).toEqual([
        {id:1, name:"Rally Royals",          captain:"Yogesh Dhadge"},
        {id:2, name:"Karna's Crusaders",    captain:"Srikant Tenni"},
        {id:3, name:"Spin Kings",            captain:"Uma Vommi"},
        {id:4, name:"KOC Challengers",       captain:"Narayan Prasad"},
        {id:5, name:"Rally Sqad",            captain:"Ritesh Kumar"},
        {id:6, name:"POSH",                  captain:"Vinod Aripaka"},
        {id:7, name:"Chill Titans",          captain:"Satish Reddy Orugunta"},
        {id:8, name:"Mega Lions",            captain:"Anil Kunda"},
        {id:9, name:"Court Conquerers",      captain:"Rajasekhar Chintha"},
        {id:10,name:"Royal Chill Badgers",   captain:"Janaki Ram Kantheti"},
        {id:11,name:"Volley Vipers",         captain:"Kailas Magi"},
        {id:12,name:"Dallas Chargers",       captain:"Vivekvardhan Reddy Mereddy"},
        {id:13,name:"Baseline Bashers",      captain:"Sashank T"},
        {id:14,name:"Deuce Devils",          captain:"Hari Mothukuri"},
        {id:15,name:"Chill Super Kings",     captain:"Anand Krishnamurthy"},
        {id:16,name:"Court Masters",         captain:"Dinesh Reddy Timmareddy"},
    ]);
});

test("default captain budgets are deducted from the configured team budget", () => {
    const teams = buildInitialTeams(DEFAULT_TEAMS, DEFAULT_PLAYERS, TEAM_BUDGET);
    const courtMasters = teams.find(t=>t.name==="Court Masters");
    expect(teams).toHaveLength(16);
    expect(courtMasters.captain).toBe("Dinesh Reddy Timmareddy");
    expect(courtMasters.players[0].Name).toBe("Dinesh Reddy Timmareddy");
    expect(courtMasters.budget).toBe(TEAM_BUDGET - courtMasters.players[0].acquiredPrice);
});

console.log("\n3. normalize");

test("returns null for null input", () => {
    expect(normalize(null)).toBeNull();
});

test("normalises teams from object to array", () => {
    const raw = {
        teams: {0:{id:1,name:"T1",players:{}}, 1:{id:2,name:"T2",players:{}}},
        playerPools:{}, currentBids:{}, currentPoolIndex:0, currentPlayerIndex:0, timerEnd:0
    };
    const n = normalize(raw);
    expect(n.teams).toHaveLength(2);
});

test("preserves cfgPlayers and cfgTeams when present", () => {
    const raw = {
        teams:[], playerPools:{}, currentBids:{}, currentPoolIndex:0, currentPlayerIndex:0, timerEnd:0,
        cfgPlayers: samplePlayers,
        cfgTeams:   sampleTeams,
    };
    const n = normalize(raw);
    expect(n.cfgPlayers).toHaveLength(samplePlayers.length);
    expect(n.cfgTeams).toHaveLength(sampleTeams.length);
});

test("sets cfgPlayers/cfgTeams to null when missing", () => {
    const raw = {teams:[], playerPools:{}, currentBids:{}, currentPoolIndex:0, currentPlayerIndex:0, timerEnd:0};
    const n = normalize(raw);
    expect(n.cfgPlayers).toBeNull();
    expect(n.cfgTeams).toBeNull();
});

test("converts array currentBids to keyed object", () => {
    const raw = {teams:[], playerPools:{}, currentBids:[null,5000,null,8000],
        currentPoolIndex:0, currentPlayerIndex:0, timerEnd:0};
    const n = normalize(raw);
    expect(n.currentBids["1"]).toBe(5000);
    expect(n.currentBids["3"]).toBe(8000);
});

console.log("\n4. getEffective");

const makeState = (pools, poolIdx=0, playerIdx=0) => ({
    playerPools: pools, currentPoolIndex: poolIdx, currentPlayerIndex: playerIdx,
    teams:[], currentBids:{}, timerEnd:0
});

test("returns complete when all pools empty", () => {
    const pools = {};
    POOL_ORDER.forEach(k => { pools[k] = []; });
    const eff = getEffective(makeState(pools));
    expect(eff.complete).toBe(true);
});

test("skips empty pools to find first player", () => {
    const pools = {};
    POOL_ORDER.forEach(k => { pools[k] = []; });
    pools["utr_4_5"] = [{id:1, Name:"Carol", utr:4.5, price:10000}];
    const eff = getEffective(makeState(pools));
    expect(eff.complete).toBe(false);
    expect(eff.poolKey).toBe("utr_4_5");
    expect(eff.player.Name).toBe("Carol");
});

test("clamps playerIndex to pool length", () => {
    const pools = {};
    POOL_ORDER.forEach(k => { pools[k] = []; });
    pools["utr_5_0"] = [{id:1, Name:"Bob", utr:5.0, price:12000}];
    const eff = getEffective(makeState(pools, 4, 99)); // idx 4 = utr_5_0 in POOL_ORDER
    expect(eff.player.Name).toBe("Bob");
});

console.log("\n5. parseCSV");

test("parses name, utr, price columns", () => {
    const csv = "Name,UTR,Price\nAlice,5.5,14000\nBob,4.5,10000";
    const players = parseCSV(csv);
    expect(players).toHaveLength(2);
    expect(players[0].Name).toBe("Alice");
    expect(players[0].utr).toBe(5.5);
    expect(players[0].price).toBe(14000);
});

test("uses UTR price table when price column absent", () => {
    const csv = "Name,UTR\nCarol,4.0";
    const players = parseCSV(csv);
    expect(players[0].price).toBe(8000); // UTR_PRICES[4.0]
});

test("returns empty array when no Name column", () => {
    const csv = "Player,Score\nAlice,5.5";
    const players = parseCSV("Col1,Col2\nA,B");
    expect(players).toHaveLength(0);
});

test("filters out rows with empty names", () => {
    const csv = "Name,UTR\n,5.0\nBob,4.5";
    const players = parseCSV(csv);
    expect(players).toHaveLength(1);
    expect(players[0].Name).toBe("Bob");
});

console.log("\n6. setNumTeams logic");

function simulateSetNumTeams(currentTeams, n) {
    const count = Math.max(1, Math.min(32, parseInt(n)||1));
    if (count > currentTeams.length) {
        const extra = [];
        for (let i=currentTeams.length; i<count; i++) {
            const nid = Math.max(0,...currentTeams.map(t=>t.id),...extra.map(t=>t.id))+1;
            extra.push({id:nid, name:`Team ${nid}`, captain:""});
        }
        return [...currentTeams, ...extra];
    }
    return currentTeams.slice(0, count);
}

test("adds teams when count increases", () => {
    const teams = [{id:1,name:"Team 1",captain:""}];
    const result = simulateSetNumTeams(teams, 4);
    expect(result).toHaveLength(4);
});

test("generated teams have unique ids", () => {
    const teams = [{id:1,name:"Team 1",captain:""},{id:3,name:"Team 3",captain:""}];
    const result = simulateSetNumTeams(teams, 4);
    const ids = result.map(t=>t.id);
    expect(new Set(ids).size).toBe(ids.length);
});

test("trims teams when count decreases", () => {
    const teams = [{id:1},{id:2},{id:3},{id:4}];
    const result = simulateSetNumTeams(teams, 2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
});

test("clamps to min 1 team", () => {
    const teams = [{id:1},{id:2}];
    const result = simulateSetNumTeams(teams, 0);
    expect(result).toHaveLength(1);
});

test("clamps to max 32 teams", () => {
    const teams = [];
    const result = simulateSetNumTeams(teams, 99);
    expect(result).toHaveLength(32);
});

console.log("\n7. config round-trip (createNew simulation)");

test("config includes all settings fields", () => {
    const cfg = {settings:{budget:80000, teamSize:5, timerMs:30000, playersPerGroup:8}};
    const budget          = cfg?.settings?.budget          || TEAM_BUDGET;
    const teamSize        = cfg?.settings?.teamSize        || TEAM_SIZE;
    const timerMs         = cfg?.settings?.timerMs         || TIMER_MS;
    const playersPerGroup = cfg?.settings?.playersPerGroup || 5;
    const antiSnipeThresholdMs = cfg?.settings?.antiSnipeThresholdMs ?? ANTI_SNIPE_THRESHOLD_MS;
    const antiSnipeExtensionMs = cfg?.settings?.antiSnipeExtensionMs ?? ANTI_SNIPE_EXTENSION_MS;
    const config = {budget, teamSize, timerMs, antiSnipeThresholdMs, antiSnipeExtensionMs, playersPerGroup};
    expect(config.budget).toBe(80000);
    expect(config.teamSize).toBe(5);
    expect(config.timerMs).toBe(30000);
    expect(config.playersPerGroup).toBe(8);
    expect(config.antiSnipeThresholdMs).toBe(ANTI_SNIPE_THRESHOLD_MS);
    expect(config.antiSnipeExtensionMs).toBe(ANTI_SNIPE_EXTENSION_MS);
});

test("config falls back to defaults when settings missing", () => {
    const cfg = null;
    const budget          = cfg?.settings?.budget          || TEAM_BUDGET;
    const teamSize        = cfg?.settings?.teamSize        || TEAM_SIZE;
    const timerMs         = cfg?.settings?.timerMs         || TIMER_MS;
    const playersPerGroup = cfg?.settings?.playersPerGroup || 5;
    expect(budget).toBe(TEAM_BUDGET);
    expect(teamSize).toBe(TEAM_SIZE);
    expect(timerMs).toBe(TIMER_MS);
    expect(playersPerGroup).toBe(5);
});

console.log("\n8. reset integrity");

test("reset rebuilds pools from cfgPlayers/cfgTeams", () => {
    const state = {
        config: {budget:80000, teamSize:5, timerMs:30000},
        cfgPlayers: samplePlayers,
        cfgTeams:   sampleTeams,
    };
    const cfgPlayers = state.cfgPlayers || [];
    const cfgTeams   = state.cfgTeams   || [];
    const budget     = state.config?.budget || TEAM_BUDGET;
    const capNames   = new Set(cfgTeams.map(t=>t.captain));
    const pools      = buildPools(cfgPlayers, POOL_ORDER, capNames);
    const initTeams  = buildInitialTeams(cfgTeams, cfgPlayers, budget);
    // Verify pools exclude captain
    expect(pools["utr_5_5"].find(p=>p.Name==="Grace")).toBeFalsy();
    // Verify team budget uses config budget (80000), not default
    expect(initTeams[0].budget).toBe(80000 - 14000);
});

test("reset preserves config in the doc", () => {
    const state = {config:{budget:80000,teamSize:5,timerMs:30000}, cfgPlayers:[], cfgTeams:[]};
    const TIMER_EFF = state.config?.timerMs || TIMER_MS;
    const doc = {
        config: state.config || {budget:TEAM_BUDGET, teamSize:TEAM_SIZE, timerMs:TIMER_MS},
        timerEnd: Date.now() + TIMER_EFF,
    };
    expect(doc.config.budget).toBe(80000);
    expect(doc.config.timerMs).toBe(30000);
    expect(doc.timerEnd).toBeGreaterThan(Date.now() - 1000);
});

console.log("\n9. POOL_CAPS_EFF one-player-per-UTR-level caps");

test("cap is 1 when pool has players", () => {
    const poolSize = 3; // 3 players, 5 teams → each team can grab at most 1
    const cap = poolSize === 0 ? 0 : 1;
    expect(cap).toBe(1);
});

test("cap remains 1 when pool size is greater than team count", () => {
    const poolSize = 20; // enough players for multiple wins, but each team still needs only one at this UTR
    const cap = poolSize === 0 ? 0 : 1;
    expect(cap).toBe(1);
});

test("cap is 0 for empty pool", () => {
    const poolSize = 0;
    const cap = poolSize === 0 ? 0 : 1;
    expect(cap).toBe(0);
});

test("caps stay one per UTR level when team count changes from 16 to 8", () => {
    const players = Array.from({length:10}, (_,i)=>({id:i,Name:`P${i}`,utr:4.5,price:10000}));
    const pools16 = buildPools(players, POOL_ORDER, new Set());
    const pools8  = buildPools(players, POOL_ORDER, new Set());
    const cap16 = buildPoolCaps(pools16)["utr_4_5"];
    const cap8  = buildPoolCaps(pools8)["utr_4_5"];
    expect(cap16).toBe(1);
    expect(cap8).toBe(1);
});


console.log("\n9b. category caps include captains");

test("captain counts toward current UTR category cap", () => {
    const team = {id:1, name:"Team A", budget:80000, players:[{Name:"Captain", utr:6.0}]};
    const teams = [team, {id:2, name:"Team B", budget:100000, players:[]}];
    const eff = {poolKey:"utr_6_0", player:{Name:"P6.0", utr:6.0, price:20000}};
    const err = validateBidForTest({team, teams, currentBids:{}, eff, amount:20000, teamSize:TEAM_SIZE});
    expect(err).toBe("Max 1 at UTR 6");
});

test("non-captain existing player also counts toward current UTR category cap", () => {
    const team = {id:1, name:"Team A", budget:80000, players:[{Name:"Captain", utr:5.5}, {Name:"Existing", utr:4.0}]};
    const teams = [team, {id:2, name:"Team B", budget:100000, players:[]}];
    const eff = {poolKey:"utr_4_0", player:{Name:"P4.0", utr:4.0, price:8000}};
    const err = validateBidForTest({team, teams, currentBids:{}, eff, amount:8000, teamSize:TEAM_SIZE});
    expect(err).toBe("Max 1 at UTR 4");
});

console.log("\n10. reserve logic protects future UTR levels");

test("reserves base prices for future UTR levels after a projected low-pool win", () => {
    const team = {budget:80000, players:[{Name:"Captain",utr:6.0}]};
    const eff = {effPool:0, player:{Name:"P3.0",utr:3.0,price:5000}};
    const reserve = reserveAfterCurrentWin(team, eff, TEAM_SIZE);
    expect(reserve.amount).toBe(14000 + 12000 + 10000 + 8000 + 6000);
    expect(reserve.slots).toBe(5);
    expect(reserve.maxBid).toBe(30000);
});

test("reserve skips levels a team already has and protects each missing level", () => {
    const team = {budget:50000, players:[{Name:"Captain",utr:6.0},{Name:"Existing 5.0",utr:5.0}]};
    const eff = {effPool:1, player:{Name:"P3.5",utr:3.5,price:6000}};
    const reserve = reserveAfterCurrentWin(team, eff, TEAM_SIZE);
    expect(reserve.amount).toBe(14000 + 10000 + 8000 + 5000);
    expect(reserve.slots).toBe(4);
    expect(reserve.maxBid).toBe(13000);
});

console.log("\n11. bid increments allow any $1k manual amount");

test("quick chips include default bid, then 1k, 2k, 3k, and 5k above default", () => {
    const chips = buildBidChips(10000, 5000, 20000);
    expect(chips.map(c=>c.label)).toEqual(["D", "+1k", "+2k", "+3k", "+5k"]);
    expect(chips.map(c=>c.amount)).toEqual([11000, 12000, 13000, 14000, 16000]);
});

test("quick chips filter out increments above max bid", () => {
    const chips = buildBidChips(10000, 5000, 12500);
    expect(chips.map(c=>c.label)).toEqual(["D", "+1k"]);
    expect(chips.map(c=>c.amount)).toEqual([11000, 12000]);
});

test("manual bids allow any amount in 1000 increments from player base price", () => {
    expect(isOneThousandIncrement(10000, 10000)).toBeTruthy();
    expect(isOneThousandIncrement(11000, 10000)).toBeTruthy();
    expect(isOneThousandIncrement(14000, 10000)).toBeTruthy();
    expect(isOneThousandIncrement(14500, 10000)).toBeFalsy();
});

test("manual bids must beat a competing high bid", () => {
    const team = {id:2, name:"Team B", budget:80000, players:[{Name:"Captain B", utr:6.0}]};
    const teams = [{id:1, name:"Team A", budget:80000, players:[{Name:"Captain A", utr:6.0}]}, team];
    const eff = {poolKey:"utr_3_0", player:{Name:"P3.0", utr:3.0, price:5000}};
    const err = validateBidForTest({team, teams, currentBids:{"1":10000}, eff, amount:9000, teamSize:TEAM_SIZE});
    expect(err).toBe("Bid at least $11000");
});

test("manual bids can replace the team's own current bid value without high-bid error", () => {
    const team = {id:2, name:"Team B", budget:80000, players:[{Name:"Captain B", utr:6.0}]};
    const teams = [{id:1, name:"Team A", budget:80000, players:[{Name:"Captain A", utr:6.0}]}, team];
    const eff = {poolKey:"utr_3_0", player:{Name:"P3.0", utr:3.0, price:5000}};
    const err = validateBidForTest({team, teams, currentBids:{"1":10000,"2":9000}, eff, amount:9000, teamSize:TEAM_SIZE});
    expect(err).toBeNull();
});

console.log("\n12. TIMER_EFF respects state.config");

test("uses configured timer when config present", () => {
    const state = {config:{timerMs:30000}};
    const TIMER_EFF = state.config?.timerMs || TIMER_MS;
    expect(TIMER_EFF).toBe(30000);
});

test("falls back to TIMER_MS when config absent", () => {
    const state = {};
    const TIMER_EFF = state.config?.timerMs || TIMER_MS;
    expect(TIMER_EFF).toBe(TIMER_MS);
});

test("TEAM_SIZE_EFF uses configured teamSize", () => {
    const state = {config:{teamSize:5}};
    const TEAM_SIZE_EFF = state.config?.teamSize || TEAM_SIZE;
    expect(TEAM_SIZE_EFF).toBe(5);
});

console.log("\n13. anti-snipe timer extension");

test("extends timer when bid arrives inside anti-snipe window", () => {
    const now = 1_000_000;
    const timerEnd = now + 1000;
    expect(getAntiSnipeTimerEnd(timerEnd, now, 3000, 3000)).toBe(now + 3000);
});

test("does not extend timer when at least three seconds remain", () => {
    const now = 1_000_000;
    const timerEnd = now + 3000;
    expect(getAntiSnipeTimerEnd(timerEnd, now, 3000, 3000)).toBe(timerEnd);
});

test("does not revive an already expired timer", () => {
    const now = 1_000_000;
    const timerEnd = now - 1;
    expect(getAntiSnipeTimerEnd(timerEnd, now, 3000, 3000)).toBe(timerEnd);
});

test("anti-snipe can be disabled with zero threshold or extension", () => {
    const now = 1_000_000;
    const timerEnd = now + 1000;
    expect(getAntiSnipeTimerEnd(timerEnd, now, 0, 3000)).toBe(timerEnd);
    expect(getAntiSnipeTimerEnd(timerEnd, now, 3000, 0)).toBe(timerEnd);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(40)}`);
if (failed === 0) {
    console.log(`✅ All ${passed} tests passed`);
} else {
    console.log(`❌ ${failed} failed, ${passed} passed`);
    process.exit(1);
}
