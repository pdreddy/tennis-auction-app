import { firebaseConfig } from "./config/firebase.js";
import { TEAM_BUDGET, TEAM_SIZE, TIMER_MS, POOL_ORDER, getUTR } from "./config/auction.js";
import { PLAYERS } from "./config/players.js";
import { TEAMS } from "./config/teams.js";

const { useState, useEffect, useRef } = React;

// ─── Firebase ────────────────────────────────────────────────────────────────
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ─── Static data ─────────────────────────────────────────────────────────────
const CAPTAIN_NAMES = new Set(TEAMS.map(t => t.captain));

const PLAYER_POOLS = {};
POOL_ORDER.forEach(key => {
    const utr = getUTR(key);
    PLAYER_POOLS[key] = PLAYERS.filter(p => p.utr === utr && !CAPTAIN_NAMES.has(p.Name));
});

const POOL_CAPS = {};
POOL_ORDER.forEach(key => {
    const size = PLAYER_POOLS[key].length;
    POOL_CAPS[key] = size === 0 ? 0 : size <= TEAMS.length ? 1 : TEAM_SIZE - 1;
});

// ─── Auth accounts ────────────────────────────────────────────────────────────
// PINs are stored in Firebase at users/<code>/pin — not hardcoded here.
const ACCOUNTS = [
    {code:"ADMIN",label:"Admin · Auctioneer",role:"admin",teamId:null},
    ...TEAMS.map(t => ({code:`TEAM${t.id}`,label:`Team ${t.id} · ${t.captain}`,role:"captain",teamId:t.id}))
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = n => (n||0).toLocaleString();
const toArr = v => Array.isArray(v) ? v.filter(x=>x!=null) : (v&&typeof v==="object" ? Object.keys(v).sort((a,b)=>parseInt(a)-parseInt(b)).map(k=>v[k]) : []);
const pref = (k,d) => { try { const v=localStorage.getItem(k); return v===null?d:JSON.parse(v); } catch(e){return d;} };
const savePref = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch(e){} };

function normalize(data) {
    if (!data) return null;
    const teams = toArr(data.teams).map(t => ({...t, players: toArr(t.players)}));
    const rawPools = data.playerPools || {};
    const playerPools = {};
    POOL_ORDER.forEach(k => { playerPools[k] = toArr(rawPools[k]); });
    let cb = data.currentBids || {};
    if (Array.isArray(cb)) cb = Object.fromEntries(cb.map((v,i)=>[String(i),v]).filter(([,v])=>v));
    const currentBids = {};
    Object.entries(cb).forEach(([k,v]) => { currentBids[String(k)] = v; });
    return { ...data, teams, playerPools, currentBids,
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

function getInitialTeams() {
    const byName = Object.fromEntries(PLAYERS.map(p=>[p.Name,p]));
    return TEAMS.map(team => {
        const cap = byName[team.captain];
        const price = cap?.price||0;
        return { ...team, budget: TEAM_BUDGET-price, totalSpent: price,
            players: cap ? [{id:`c${team.id}`,Name:cap.Name,utr:cap.utr,acquiredPrice:price}] : [] };
    });
}

function freshPools() {
    const p = {};
    POOL_ORDER.forEach(k => { p[k] = PLAYER_POOLS[k].map(x=>({...x})); });
    return p;
}

function initialDoc(sid) {
    return { sessionId:sid, teams:getInitialTeams(), playerPools:freshPools(),
        currentPoolIndex:0, currentPlayerIndex:0, currentBids:{},
        timerEnd: Date.now()+TIMER_MS, lastUpdate: Date.now() };
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function Login({ onLogin }) {
    const [account, setAccount] = useState(ACCOUNTS[0]);
    const [pin, setPin] = useState("");
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setError(null);
        if (pin.length < 6) { setError("Enter your 6-digit PIN"); return; }
        setBusy(true);
        try {
            const snap = await db.ref(`users/${account.code}`).once("value");
            const user = snap.val();
            if (!user || !user.pin) {
                setError("Account not set up yet. Ask the admin to configure PINs.");
                setBusy(false);
                return;
            }
            if (user.pin !== pin) { setError("Wrong PIN"); setBusy(false); return; }
            onLogin({ code:user.code, role:user.role, teamId:user.teamId, name:account.label });
        } catch(e) {
            setError("Error: " + e.message);
            setBusy(false);
        }
    };

    return (
        <div className="login-wrap">
            <div className="login-title">🎾 TENNIS AUCTION</div>
            <div className="login-sub">Live player draft · Real-time sync</div>

            <div className="field-wrap">
                <div className="field-label">ACCOUNT</div>
                <select value={account.code} onChange={e => setAccount(ACCOUNTS.find(a=>a.code===e.target.value))}>
                    {ACCOUNTS.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
                </select>
            </div>

            <div className="field-wrap">
                <div className="field-label">6-DIGIT PIN</div>
                <input type="password" value={pin} maxLength={6} inputMode="numeric"
                    placeholder="● ● ● ● ● ●"
                    style={{letterSpacing:8,textAlign:"center",fontSize:20}}
                    onChange={e => setPin(e.target.value.replace(/\D/g,"").slice(0,6))}
                    onKeyDown={e => e.key==="Enter" && submit()} />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button className="btn btn-primary" onClick={submit} disabled={busy || pin.length < 6} style={{marginTop:8}}>
                {busy ? "Signing in…" : "Sign In"}
            </button>
        </div>
    );
}

// ─── Manage PINs (admin only) ─────────────────────────────────────────────────
function ManagePins() {
    const [pins, setPins] = useState({});
    const [saving, setSaving] = useState(null);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        db.ref("users").once("value").then(snap => {
            const data = snap.val() || {};
            const initial = {};
            ACCOUNTS.forEach(a => { initial[a.code] = (data[a.code] && data[a.code].pin) || ""; });
            setPins(initial);
        }).catch(e => setMsg({code:"ALL",text:`Could not load PINs: ${e.message}`,ok:false}));
    }, []);

    const save = async (account) => {
        const pin = pins[account.code] || "";
        if (pin.length !== 6 || !/^\d{6}$/.test(pin)) { setMsg({code:account.code,text:"Must be 6 digits",ok:false}); return; }
        setSaving(account.code);
        try {
            await db.ref(`users/${account.code}`).set({
                code: account.code,
                pin,
                role: account.role,
                teamId: account.teamId || null,
                name: account.label
            });
            setMsg({code:account.code,text:"Saved",ok:true});
            setTimeout(() => setMsg(null), 2000);
        } catch(e) {
            setMsg({code:account.code,text:`Save failed: ${e.message}`,ok:false});
        } finally {
            setSaving(null);
        }
    };

    const saveAll = async () => {
        const invalid = ACCOUNTS.find(a => { const p = pins[a.code]||""; return p.length!==6||!/^\d{6}$/.test(p); });
        if (invalid) { setMsg({code:"ALL",text:`Invalid PIN for ${invalid.label}`,ok:false}); return; }
        setSaving("ALL");
        const updates = {};
        ACCOUNTS.forEach(a => {
            updates[`users/${a.code}`] = {code:a.code,pin:pins[a.code],role:a.role,teamId:a.teamId||null,name:a.label};
        });
        try {
            await db.ref().update(updates);
            setMsg({code:"ALL",text:"All PINs saved",ok:true});
            setTimeout(() => setMsg(null), 2000);
        } catch(e) {
            setMsg({code:"ALL",text:`Save failed: ${e.message}`,ok:false});
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="card" style={{marginTop:16}}>
            <div className="card-title">Manage PINs</div>
            <div className="card-sub">Set or update 6-digit PINs for each account. Changes take effect immediately.</div>
            <div style={{maxHeight:320,overflowY:"auto",marginTop:10}}>
                {ACCOUNTS.map(a => (
                    <div key={a.code} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <div style={{flex:1,fontSize:12,color:"#ccc",minWidth:160}}>{a.label}</div>
                        <input
                            type="password"
                            maxLength={6}
                            inputMode="numeric"
                            placeholder="● ● ● ● ● ●"
                            value={pins[a.code]||""}
                            style={{width:110,letterSpacing:4,textAlign:"center",padding:"6px 8px",background:"#1a1f2e",border:"1px solid #333",borderRadius:6,color:"#fff",fontSize:14}}
                            onChange={e => setPins(p => ({...p,[a.code]:e.target.value.replace(/\D/g,"").slice(0,6)}))}
                        />
                        <button
                            className="btn btn-neutral"
                            style={{width:"auto",padding:"6px 12px",fontSize:12}}
                            onClick={() => save(a)}
                            disabled={saving===a.code||saving==="ALL"}
                        >{saving===a.code?"…":"Save"}</button>
                        {msg && msg.code===a.code && <span style={{fontSize:11,color:msg.ok?"#4caf50":"#f44"}}>{msg.text}</span>}
                    </div>
                ))}
            </div>
            <button className="btn btn-primary" style={{marginTop:12}} onClick={saveAll} disabled={!!saving}>
                {saving==="ALL" ? "Saving all…" : "Save All PINs"}
            </button>
            {msg && msg.code==="ALL" && <div style={{marginTop:6,fontSize:12,color:msg.ok?"#4caf50":"#f44"}}>{msg.text}</div>}
        </div>
    );
}

// ─── Pool Viewer (admin) ──────────────────────────────────────────────────────
const UTR_COLORS = {
    6.0: {bg:"rgba(232,184,75,.15)",  border:"rgba(232,184,75,.4)",  text:"#e8b84b"},
    5.5: {bg:"rgba(155,135,245,.15)", border:"rgba(155,135,245,.4)", text:"#9b87f5"},
    5.0: {bg:"rgba(74,144,217,.15)",  border:"rgba(74,144,217,.4)",  text:"#4a90d9"},
    4.5: {bg:"rgba(0,212,168,.15)",   border:"rgba(0,212,168,.4)",   text:"#00d4a8"},
    4.0: {bg:"rgba(30,201,122,.15)",  border:"rgba(30,201,122,.4)",  text:"#1ec97a"},
    3.5: {bg:"rgba(224,92,110,.15)",  border:"rgba(224,92,110,.4)",  text:"#e05c6e"},
    3.0: {bg:"rgba(90,114,153,.15)",  border:"rgba(90,114,153,.4)",  text:"#5a7299"},
};
const POOL_LABELS = {
    6.0:"Elite · UTR 6.0", 5.5:"Advanced · UTR 5.5", 5.0:"Strong · UTR 5.0",
    4.5:"Int-Adv · UTR 4.5", 4.0:"Intermediate · UTR 4.0",
    3.5:"Developing · UTR 3.5", 3.0:"Beginner · UTR 3.0",
};
function fmtR(n){ return "$"+(n||0).toLocaleString(); }

function PoolViewer() {
    const [open, setOpen] = useState({});
    const toggle = k => setOpen(o => ({...o,[k]:!o[k]}));

    const totalPlayers = POOL_ORDER.reduce((s,k)=>s+PLAYER_POOLS[k].length,0);

    return (
        <div className="card" style={{padding:"18px"}}>
            <div className="card-title" style={{marginBottom:4}}>🎾 Auction Pools</div>
            <div className="card-sub" style={{marginBottom:14}}>
                {totalPlayers} players across {POOL_ORDER.filter(k=>PLAYER_POOLS[k].length>0).length} pools · auction runs highest UTR first
            </div>
            {POOL_ORDER.map(key => {
                const utr = getUTR(key);
                const players = PLAYER_POOLS[key];
                if (!players || players.length === 0) return null;
                const col = UTR_COLORS[utr] || UTR_COLORS[3.0];
                const isOpen = !!open[key];
                return (
                    <div key={key} className="pool-section">
                        <div className={`pool-header${isOpen?" open":""}`}
                            style={{background:`linear-gradient(135deg,${col.bg},var(--surface3))`}}
                            onClick={()=>toggle(key)}>
                            <div className="pool-header-left">
                                <span className="pool-utr-badge"
                                    style={{background:col.bg,border:`1px solid ${col.border}`,color:col.text}}>
                                    UTR {utr.toFixed(1)}
                                </span>
                                <div>
                                    <div className="pool-header-title">{POOL_LABELS[utr]}</div>
                                    <div className="pool-header-meta">{players.length} players · base {fmtR(players[0]?.price||0)}</div>
                                </div>
                            </div>
                            <span className={`pool-chevron${isOpen?" open":""}`}>▼</span>
                        </div>
                        {isOpen && (
                            <div className="pool-body">
                                {players.map((p,i) => {
                                    const isCap = CAPTAIN_NAMES.has(p.Name);
                                    return (
                                        <div key={p.id} className="pool-player-row">
                                            <span className="pool-player-num">{i+1}</span>
                                            <span className="pool-player-name">{p.Name}</span>
                                            {isCap && <span className="pool-player-cap">CAPTAIN</span>}
                                            <span className="pool-player-price">{fmtR(p.price)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Session lobby ────────────────────────────────────────────────────────────
function Lobby({ user, onJoin, onLogout }) {
    const [joinId, setJoinId] = useState("");
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState(null);

    const createNew = async () => {
        setCreating(true); setError(null);
        try {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let sid = "";
            let exists = true;
            for (let tries = 0; tries < 5 && exists; tries++) {
                sid = Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
                exists = (await db.ref(`auctions/${sid}`).once("value")).exists();
            }
            if (exists) throw new Error("Could not find an unused session ID. Try again.");
            await db.ref(`auctions/${sid}`).set(initialDoc(sid));
            onJoin(sid);
        } catch(e) {
            setError(`Could not create auction: ${e.message}`);
        } finally {
            setCreating(false);
        }
    };

    const joinExisting = async () => {
        const id = joinId.trim().toUpperCase();
        if (!id) { setError("Enter a session ID"); return; }
        setJoining(true); setError(null);
        try {
            const snap = await db.ref(`auctions/${id}`).once("value");
            if (!snap.exists()) { setError(`Session ${id} not found`); return; }
            onJoin(id);
        } catch(e) {
            setError(`Could not join auction: ${e.message}`);
        } finally {
            setJoining(false);
        }
    };

    const poolPlayers = POOL_ORDER.reduce((s,k)=>s+PLAYER_POOLS[k].length,0);

    return (
        <div className="setup-wrap">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <div>
                    <div style={{fontSize:11,color:"#888"}}>Signed in as</div>
                    <div style={{fontWeight:700,color:"#fff"}}>{user.name}</div>
                </div>
                <button className="btn btn-neutral" style={{width:"auto",padding:"8px 16px",fontSize:13}} onClick={onLogout}>Log out</button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {user.role === "admin" ? (
                <>
                <div className="card">
                    <div className="card-title">Start new auction</div>
                    <div className="card-sub">Creates a fresh session. Share the 6-letter ID with all captains.</div>
                    <button className="btn btn-primary" onClick={createNew} disabled={creating}>
                        {creating ? "Creating…" : "Create New Auction"}
                    </button>
                </div>
                <ManagePins />
                <PoolViewer />
                </>
            ) : (
                <div className="card" style={{borderColor:"#4f9eff",background:"#0f1420"}}>
                    <div className="card-title">👋 Hi, {user.name.split("·")[1]?.trim()}</div>
                    <div className="card-sub">Ask the Auctioneer for the Session ID, then join below.</div>
                </div>
            )}

            <div className="or-row"><div className="line"/><span>OR JOIN EXISTING</span><div className="line"/></div>

            <div className="card">
                <input className="code-input" type="text" placeholder="ABC123" maxLength={6}
                    value={joinId} onChange={e=>setJoinId(e.target.value.toUpperCase())}
                    onKeyDown={e=>e.key==="Enter"&&joinExisting()} />
                <button className="btn btn-neutral" style={{marginTop:10}} onClick={joinExisting} disabled={joining||!joinId.trim()}>
                    {joining ? "Joining…" : "Join Auction"}
                </button>
            </div>

            <div className="health-panel">
                <div style={{fontWeight:700,color:"#aaa",marginBottom:6}}>Setup check</div>
                <div className="health-row"><span>Teams</span><span className={TEAMS.length===16?"health-ok":"health-bad"}>{TEAMS.length} / 16</span></div>
                <div className="health-row"><span>Pool players</span><span>{poolPlayers}</span></div>
                <div className="health-row"><span>Total players</span><span>{PLAYERS.length}</span></div>
                {POOL_ORDER.map(key => {
                    const c = PLAYER_POOLS[key].length;
                    return <div className="health-row" key={key}>
                        <span>UTR {getUTR(key)}</span>
                        <span style={{color:"#666"}}>{c===0?"auto-skipped":`${c} players · max ${POOL_CAPS[key]}/team`}</span>
                    </div>;
                })}
            </div>
        </div>
    );
}

// ─── Main auction screen ──────────────────────────────────────────────────────
function Auction({ sid, user, onBack }) {
    const [state, setState] = useState(null);
    const [connected, setConnected] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [bidInputs, setBidInputs] = useState({});
    const [bidErrors, setBidErrors] = useState({});
    const [actionError, setActionError] = useState(null);
    const [resetOpen, setResetOpen] = useState(false);
    const [showRosters, setShowRosters] = useState(() => pref("ta_rosters",true));
    const [pinnedTeam, setPinnedTeam] = useState(() => pref("ta_pin",null));
    const auctionRef = useRef(db.ref(`auctions/${sid}`));

    // Real-time listener
    useEffect(() => {
        const connRef = db.ref(".info/connected");
        connRef.on("value", s => setConnected(s.val()===true));
        auctionRef.current.on("value", snap => {
            if (snap.exists()) { setState(normalize(snap.val())); setConnected(true); }
            else setConnected(false);
        });
        return () => { connRef.off(); auctionRef.current.off(); };
    }, [sid]);

    // Timer
    useEffect(() => {
        if (!state?.timerEnd) return;
        const iv = setInterval(() => setTimeLeft(Math.max(0, Math.floor((state.timerEnd - Date.now())/1000))), 200);
        return () => clearInterval(iv);
    }, [state?.timerEnd]);

    const fbUpdate = updates => auctionRef.current.update({...updates, lastUpdate: Date.now()});
    const toggleRosters = () => { const n=!showRosters; setShowRosters(n); savePref("ta_rosters",n); };
    const togglePin = id => { const n=pinnedTeam===id?null:id; setPinnedTeam(n); savePref("ta_pin",n); };

    const placeBid = (teamId, amount) => {
        const n = parseInt(amount)||0;
        if (!eff?.player) return;
        const err = validateBid(teamId, n);
        if (err) { setBidErrors(p=>({...p,[teamId]:err})); return; }
        if (timeLeft===0) { setBidErrors(p=>({...p,[teamId]:"Time is up!"})); return; }
        setBidErrors(p=>({...p,[teamId]:null}));
        auctionRef.current.child("currentBids").transaction(cur => {
            const bids = cur||{};
            const taken = Object.entries(bids).some(([tid,b])=>parseInt(tid)!==teamId && b===n);
            if (taken) return; // abort
            return {...bids,[teamId]:n};
        }, (err,committed) => {
            if (!committed) setBidErrors(p=>({...p,[teamId]:"Amount taken — bid higher"}));
            else { setBidInputs(p=>({...p,[teamId]:""})); auctionRef.current.update({lastUpdate:Date.now()}); }
        });
    };

    const validateBid = (teamId, amount) => {
        if (!eff?.player) return "No player";
        const team = state.teams.find(t=>t.id===teamId);
        if (!team) return "Team not found";
        if (team.players.length >= TEAM_SIZE) return `Team full`;
        const utr = getUTR(eff.poolKey);
        const fromPool = team.players.slice(1).filter(p=>p.utr===utr).length;
        if (fromPool >= (POOL_CAPS[eff.poolKey]||0)) return `Max ${POOL_CAPS[eff.poolKey]} at UTR ${utr}`;
        if (!amount||amount<=0) return "Enter amount";
        if (amount < eff.player.price) return `Min $${fmt(eff.player.price)}`;
        if ((amount - eff.player.price)%1000!==0) return "Base + $1k increments";
        const dup = state.teams.find(t=>t.id!==teamId&&(state.currentBids[String(t.id)]||0)===amount);
        if (dup) return `$${fmt(amount)} taken by ${dup.name}`;
        if (amount > team.budget) return "Exceeds budget";
        const rem = TEAM_SIZE - team.players.length;
        const minNeeded = rem>1?(rem-1)*5000:0;
        if (amount > team.budget-minNeeded) return `Need $${fmt(minNeeded)} for ${rem-1} more`;
        return null;
    };

    const finalize = () => {
        if (!eff?.player) return;
        const bids = Object.entries(state.currentBids).map(([tid,b])=>({teamId:parseInt(tid),bid:b})).filter(x=>x.bid>0);
        if (!bids.length) { setActionError("No bids — use Skip"); return; }
        const highest = Math.max(...bids.map(b=>b.bid));
        const winners = bids.filter(b=>b.bid===highest);
        if (winners.length>1) { setActionError(`Tie between ${winners.map(w=>state.teams.find(t=>t.id===w.teamId)?.name).join(", ")} — place different bids`); return; }
        const winId = winners[0].teamId;
        const teams = state.teams.map(t => {
            if (t.id!==winId) return t;
            return {...t, players:[...t.players,{...eff.player,acquiredPrice:highest}], budget:t.budget-highest, totalSpent:t.totalSpent+highest};
        });
        const pools = {...state.playerPools};
        const pool = [...pools[eff.poolKey]];
        pool.splice(eff.effPlayer,1);
        pools[eff.poolKey] = pool;
        let nextPool=eff.effPool, nextPlayer=eff.effPlayer;
        if (eff.effPlayer>=pool.length) { nextPool=eff.effPool+1; nextPlayer=0; }
        fbUpdate({teams,playerPools:pools,currentPoolIndex:nextPool,currentPlayerIndex:nextPlayer,currentBids:{},timerEnd:Date.now()+TIMER_MS});
        setBidInputs({}); setBidErrors({}); setActionError(null);
    };

    const skip = () => {
        if (!eff?.player) return;
        const pools = {...state.playerPools};
        const pool = [...pools[eff.poolKey]];
        const [skipped] = pool.splice(eff.effPlayer,1);
        const hasLaterPlayersInPool = eff.effPlayer < pool.length;
        if (hasLaterPlayersInPool) {
            pool.push({...skipped,isRetry:true,retryCount:(skipped.retryCount||0)+1});
        }
        pools[eff.poolKey] = pool;
        let nextPool=eff.effPool, nextPlayer=eff.effPlayer;
        if (eff.effPlayer>=pool.length) { nextPool=eff.effPool+1; nextPlayer=0; }
        fbUpdate({playerPools:pools,currentPoolIndex:nextPool,currentPlayerIndex:nextPlayer,currentBids:{},timerEnd:Date.now()+TIMER_MS});
        setBidInputs({}); setBidErrors({}); setActionError(null);
    };

    const reset = () => {
        auctionRef.current.set(initialDoc(sid));
        setBidInputs({}); setBidErrors({}); setActionError(null); setResetOpen(false);
    };

    if (!state) return <div style={{textAlign:"center",padding:40,color:"#888"}}>Loading auction {sid}…</div>;

    const eff = getEffective(state);
    const isAdmin = user.role === "admin";
    const myTeamId = user.teamId;

    // Auction complete
    if (eff.complete || !eff.player) {
        return (
            <div>
                <div className="top-bar">
                    <h1>🎾 TENNIS AUCTION</h1>
                    <div className="sync-dot"><div className={`dot ${connected?"dot-green":"dot-red"}`}/>{connected?"Live":"Offline"}</div>
                </div>
                <div className="complete-banner">🏆 Auction Complete · Session {sid}</div>
                {isAdmin && <div style={{textAlign:"center",marginBottom:12}}>
                    <button className="btn btn-danger" style={{width:"auto",padding:"10px 24px"}} onClick={()=>setResetOpen(true)}>Reset Auction</button>
                </div>}
                <div className="rosters-grid">
                    {state.teams.map(t => <RosterCard key={t.id} team={t}/>)}
                </div>
                {resetOpen && <ResetModal onCancel={()=>setResetOpen(false)} onConfirm={reset}/>}
            </div>
        );
    }

    const bids = Object.entries(state.currentBids).map(([tid,b])=>({teamId:parseInt(tid),bid:b})).filter(x=>x.bid>0);
    const highest = bids.length ? Math.max(...bids.map(b=>b.bid)) : 0;
    const winners = bids.filter(b=>b.bid===highest);
    const hasBids = bids.length>0;
    const warn = timeLeft<=10;
    const pct = Math.min(100,Math.round(((eff.effPool+(eff.effPlayer/Math.max(1,eff.pool.length)))/POOL_ORDER.length)*100));

    const teamStatusFor = team => {
        const teamBid = state.currentBids[String(team.id)]||0;
        const isWin = teamBid>0&&teamBid===highest&&winners.length===1;
        const isTie = teamBid>0&&teamBid===highest&&winners.length>1;
        return {teamBid,isWin,isTie};
    };

    const sortedTeams = [...state.teams].map(t => {
        const isDisabled = t.players.length>=TEAM_SIZE || t.budget<eff.player.price ||
            (t.players.slice(1).filter(p=>p.utr===getUTR(eff.poolKey)).length >= (POOL_CAPS[eff.poolKey]||0));
        return {...t,isDisabled,isPinned:pinnedTeam===t.id};
    }).sort((a,b) => {
        if (a.isPinned!==b.isPinned) return a.isPinned?-1:1;
        if (!isAdmin && a.id===myTeamId) return -1;
        if (!isAdmin && b.id===myTeamId) return 1;
        if (a.isDisabled!==b.isDisabled) return a.isDisabled?1:-1;
        return 0;
    });

    return (
        <div>
            <div className="top-bar">
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <button onClick={onBack} className="session-back">‹</button>
                    <div>
                        <div className="session-label">Session</div>
                        <div className="session-id">{sid}</div>
                    </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div className="sync-dot"><div className={`dot ${connected?"dot-green":"dot-red"}`}/>{connected?"Live":"Offline"}</div>
                    {isAdmin && <button className="btn btn-danger" style={{width:"auto",padding:"7px 14px",fontSize:12,borderRadius:8}} onClick={()=>setResetOpen(true)}>Reset</button>}
                </div>
            </div>

            <div className="progress-wrap">
                <div className="progress-track"><div className="progress-fill" style={{width:pct+"%"}}/></div>
                <div className="progress-text">UTR {getUTR(eff.poolKey)} pool · {pct}% complete · {state.teams.length} teams</div>
            </div>

            <div className={`sticky-bar`} style={warn?{borderColor:"rgba(255,77,106,.7)"}:{}}>
                <div className="sb-left">
                    <div className="sb-player">{eff.player.Name}{eff.player.isRetry&&<span className="sb-retry"> · Retry #{eff.player.retryCount}</span>}</div>
                    <div className="sb-meta">UTR {eff.player.utr} · base ${fmt(eff.player.price)} · {eff.effPlayer+1}/{eff.pool.length} in pool</div>
                    {highest>0 && <div className="sb-high">High ${fmt(highest)}{winners.length===1?" · "+state.teams.find(t=>t.id===winners[0].teamId)?.name:winners.length>1?" · TIE":""}</div>}
                </div>
                <div className={`sb-timer ${warn?"warn":""}`}>{timeLeft}s</div>
            </div>

            {actionError && <div className="error-banner" onClick={()=>setActionError(null)}>{actionError} ✕</div>}

            {isAdmin && (
                <div className="admin-bar">
                    <button className="btn btn-neutral" onClick={skip}>Skip</button>
                    <button className={`btn ${hasBids&&winners.length===1?"btn-success":"btn-neutral"}`}
                        disabled={!hasBids||winners.length!==1} onClick={finalize}>
                        {!hasBids ? "No Bids" : winners.length>1 ? `Tie (${winners.length})` : `Award → ${state.teams.find(t=>t.id===winners[0].teamId)?.name}`}
                    </button>
                </div>
            )}

            <div className="bidding-grid">
                {sortedTeams.map(team => {
                    const {teamBid,isWin,isTie} = teamStatusFor(team);
                    const isMyTeam = !isAdmin && team.id===myTeamId;

                    if (team.isDisabled && !isMyTeam) {
                        const reason = team.players.length>=TEAM_SIZE?"Full":team.budget<eff.player.price?"Low budget":`UTR cap`;
                        return (
                            <div key={team.id} className="bid-card disabled-card">
                                <span className="disabled-team-name">{team.name} · {team.players.length}/{TEAM_SIZE}</span>
                                <span className="disabled-reason">{reason}</span>
                            </div>
                        );
                    }

                    const anchor = highest>0?highest+1000:eff.player.price;
                    const chips = [anchor,anchor+1000,anchor+2000].filter(v=>v<=team.budget);

                    return (
                        <div key={team.id} className={`bid-card ${isWin?"winning":""} ${isTie?"tied":""} ${team.isPinned?"pinned":""}`}>
                            <div className="bid-card-head">
                                <div className="bid-team-info">
                                    <div className="team-name">
                                        {team.name}
                                        {isMyTeam && <span className="team-you-tag">YOU</span>}
                                    </div>
                                    <div className="team-captain">⭐ {team.captain}</div>
                                    <div className="team-budget-row">
                                        <span className="team-budget-pill team-budget-left">${fmt(team.budget)}</span>
                                        <span className="team-slots">{team.players.length}/{TEAM_SIZE} players</span>
                                    </div>
                                </div>
                                <button className={`pin-btn ${team.isPinned?"pinned":""}`} onClick={()=>togglePin(team.id)} title="Pin team">📌</button>
                            </div>

                            {(isAdmin || isMyTeam) && (<>
                                <div className="bid-divider"/>
                                <div className="bid-input-wrap">
                                    <input type="number" inputMode="numeric" className="bid-input"
                                        placeholder={`Min $${fmt(eff.player.price)}`}
                                        value={bidInputs[team.id]||""}
                                        disabled={timeLeft===0}
                                        onChange={e=>{setBidInputs(p=>({...p,[team.id]:e.target.value}));setBidErrors(p=>({...p,[team.id]:null}));}}
                                        onKeyDown={e=>e.key==="Enter"&&bidInputs[team.id]&&placeBid(team.id,bidInputs[team.id])}
                                    />
                                    <div className="quick-chips">
                                        {chips.map(v=><button key={v} className="chip" disabled={timeLeft===0} onClick={()=>{setBidInputs(p=>({...p,[team.id]:String(v)}));setBidErrors(p=>({...p,[team.id]:null}));}}>
                                            ${v/1000}k
                                        </button>)}
                                    </div>
                                    {bidErrors[team.id] && <div className="bid-error">{bidErrors[team.id]}</div>}
                                    <button className="btn btn-primary place-bid-btn"
                                        disabled={!bidInputs[team.id]||timeLeft===0}
                                        onClick={()=>placeBid(team.id,bidInputs[team.id])}>
                                        Place Bid
                                    </button>
                                </div>
                            </>)}

                            <div className="bid-footer">
                                <div className="bid-status">{teamBid>0?`Current bid: $${fmt(teamBid)}`:""}</div>
                                {isWin && <span className="bid-win-badge">WINNING</span>}
                                {isTie && <span className="bid-tie-badge">TIED</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pool-viewer">
                <div className="pool-viewer-title">Current pool · UTR {getUTR(eff.poolKey)}</div>
                <div className="pool-grid">
                    {eff.pool.map((p,i)=>(
                        <div key={p.id||i} className={`pool-chip ${i===eff.effPlayer?"active":""} ${p.isRetry?"retry":""}`} title={p.Name}>
                            {i===eff.effPlayer?"▶ ":""}{p.Name.length>18?p.Name.slice(0,16)+"…":p.Name}
                            {p.isRetry&&` (R${p.retryCount})`}
                        </div>
                    ))}
                </div>
            </div>

            <button className="section-toggle" onClick={toggleRosters}>
                <span>Team rosters · {state.teams.length} teams</span>
                <span>{showRosters?"Hide ▲":"Show ▼"}</span>
            </button>
            {showRosters && (
                <div className="rosters-grid">
                    {state.teams.map(t=><RosterCard key={t.id} team={t}/>)}
                </div>
            )}

            {resetOpen && <ResetModal onCancel={()=>setResetOpen(false)} onConfirm={reset}/>}
        </div>
    );
}

function utrClass(utr) {
    if (utr>=5.5) return "utr-55";
    if (utr>=5.25) return "utr-52";
    if (utr>=5.0) return "utr-50";
    if (utr>=4.5) return "utr-45";
    if (utr>=4.0) return "utr-40";
    if (utr>=3.5) return "utr-35";
    return "utr-30";
}

function RosterCard({team}) {
    const cap = team.players[0];
    const rest = team.players.slice(1);
    const filled = team.players.length;
    const fillPct = Math.round((filled / TEAM_SIZE) * 100);
    return (
        <div className="roster-card">
            <div className="roster-name">
                {team.name}
                <span style={{fontSize:10,fontWeight:600,color:"var(--muted)",marginLeft:6}}>
                    {filled}/{TEAM_SIZE}
                </span>
            </div>
            <div className="roster-budget">
                <span className="roster-spent">-${fmt(team.totalSpent)}</span>
                <span className="roster-left">${fmt(team.budget)} left</span>
            </div>
            <div style={{height:3,background:"var(--border)",borderRadius:99,marginBottom:8,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${fillPct}%`,borderRadius:99,
                    background:`linear-gradient(90deg,var(--blue),var(--purple))`,transition:"width .4s"}}/>
            </div>
            {cap && (
                <div className="roster-captain-row">
                    <span className="roster-captain-star">⭐</span>
                    <span className="roster-captain-name">{cap.Name}</span>
                    <span className={`roster-player-utr ${utrClass(cap.utr)}`}>{cap.utr}</span>
                </div>
            )}
            {rest.map((p,i)=>(
                <div key={p.id} className="roster-player">
                    <span className="roster-player-num">{i+2}</span>
                    <span className="roster-player-name">{p.Name}</span>
                    <span className={`roster-player-utr ${utrClass(p.utr)}`}>{p.utr}</span>
                    <span className="roster-player-price">${fmt(p.acquiredPrice)}</span>
                </div>
            ))}
            {Array.from({length: TEAM_SIZE - filled}).map((_,i)=>(
                <div key={`empty-${i}`} className="roster-player" style={{opacity:.25}}>
                    <span className="roster-player-num">{filled+i+1}</span>
                    <span className="roster-player-name" style={{fontStyle:"italic",color:"var(--muted2)"}}>— open slot —</span>
                </div>
            ))}
        </div>
    );
}

function ResetModal({onCancel,onConfirm}) {
    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-title">Reset auction?</div>
                <div className="modal-body">Clears all bids and rosters. This cannot be undone.</div>
                <div className="modal-btns">
                    <button className="btn btn-neutral" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-danger" onClick={onConfirm}>Reset</button>
                </div>
            </div>
        </div>
    );
}

// ─── Root app ─────────────────────────────────────────────────────────────────
function App() {
    const [user, setUser] = useState(() => pref("ta_user", null));
    const [sessionId, setSessionId] = useState(null);

    const handleLogin = u => { setUser(u); savePref("ta_user",u); };
    const handleLogout = () => { setUser(null); savePref("ta_user",null); setSessionId(null); };

    if (!user) return <Login onLogin={handleLogin}/>;
    if (!sessionId) return <Lobby user={user} onJoin={setSessionId} onLogout={handleLogout}/>;
    return <Auction sid={sessionId} user={user} onBack={()=>setSessionId(null)}/>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
