import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { firebaseConfig } from "./config/firebase.js";
import { TEAM_BUDGET, TEAM_SIZE, TIMER_MS, CFG_PATH, UTR_TIERS, UTR_PRICES, POOL_ORDER, getUTR } from "./data/settings.js";
import { PLAYERS, withPlayerMeta } from "./data/players.js";
import { TEAMS } from "./data/teams.js";
import { CAPTAIN_NAMES, PLAYER_POOLS } from "./data/pools.js";

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ─── Auth accounts ────────────────────────────────────────────────────────────
// PINs are stored in Firebase at users/<code>/pin — not hardcoded here.
const ACCOUNTS = [
    {code:"ADMIN",label:"Admin · Auctioneer",role:"admin",teamId:null},
    ...TEAMS.map(t => ({code:`TEAM${t.id}`,label:`Team ${t.id} · ${t.captain}`,role:"captain",teamId:t.id}))
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = n => (n||0).toLocaleString("en-US");
const fmtR = n => "$"+(n||0).toLocaleString("en-US");
const fmtRating = n => n == null ? "N/A" : Number(n).toFixed(2).replace(/\.?0+$/,"");
const actualUtr = p => `Actual ${fmtRating(p?.best)}`;
const actualUtrDetail = p => `${actualUtr(p)} · S ${fmtRating(p?.s)} · D ${fmtRating(p?.d)}`;
const toArr = v => Array.isArray(v) ? v.filter(x=>x!=null) : (v&&typeof v==="object" ? Object.keys(v).sort((a,b)=>parseInt(a)-parseInt(b)).map(k=>v[k]) : []);
const pref = (k,d) => { try { const v=localStorage.getItem(k); return v===null?d:JSON.parse(v); } catch(e){return d;} };
const savePref = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch(e){} };

function normalize(data) {
    if (!data) return null;
    const teams = toArr(data.teams).map(t => ({...t, players: toArr(t.players)}));
    const rawPools = data.playerPools || {};
    const playerPools = {};
    POOL_ORDER.forEach(k => { playerPools[k] = toArr(rawPools[k]).map(withPlayerMeta); });
    let cb = data.currentBids || {};
    if (Array.isArray(cb)) cb = Object.fromEntries(cb.map((v,i)=>[String(i),v]).filter(([,v])=>v));
    const currentBids = {};
    Object.entries(cb).forEach(([k,v]) => { currentBids[String(k)] = v; });
    const cfgPlayers = Array.isArray(data.cfgPlayers) ? data.cfgPlayers.map(withPlayerMeta) : null;
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

function getInitialTeams() {
    const byName = Object.fromEntries(PLAYERS.map(withPlayerMeta).map(p=>[p.Name,p]));
    return TEAMS.map(team => {
        const cap = byName[team.captain];
        const price = cap?.price||0;
        return { ...team, budget: TEAM_BUDGET-price, totalSpent: price,
            players: cap ? [{...cap,id:`c${team.id}`,Name:cap.Name,utr:cap.utr,acquiredPrice:price}] : [] };
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

const THIS_YEAR = new Date().getFullYear();
const SEASONS = Array.from({length:5}, (_,i) => THIS_YEAR + i);

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
        return withPlayerMeta({ id:Date.now()+i, Name:r[ni]||'', utr, price:pi>=0?parseInt(r[pi])||UTR_PRICES[utr]||5000:UTR_PRICES[utr]||5000 });
    }).filter(p=>p.Name);
}

function buildPools(players, poolOrder, captainNames) {
    const pools = {};
    poolOrder.forEach(key => {
        const utr = getUTR(key);
        pools[key] = players.map(withPlayerMeta).filter(p=>p.utr===utr && !captainNames.has(p.Name)).map(x=>({...x}));
    });
    return pools;
}

function buildInitialTeams(cfgTeams, cfgPlayers, budget) {
    const byName = Object.fromEntries(cfgPlayers.map(withPlayerMeta).map(p=>[p.Name,p]));
    return cfgTeams.map(team => {
        const cap = byName[team.captain];
        const price = cap?.price||0;
        return { ...team, budget:budget-price, totalSpent:price,
            players: cap?[{...cap,id:`c${team.id}`,Name:cap.Name,utr:cap.utr,acquiredPrice:price}]:[] };
    });
}

function SeasonBar({ selectedYear, onSelect }) {
    return (
        <div className="season-bar">
            {SEASONS.map(yr => (
                <div key={yr}
                    className={`season-pill${yr===selectedYear?" active":""}`}
                    onClick={()=>onSelect && onSelect(yr)}
                    style={{cursor:onSelect?"pointer":"default"}}>
                    <span className="s-label">SEASON</span>
                    {yr}
                </div>
            ))}
        </div>
    );
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function Login({ onLogin }) {
    const [account, setAccount] = useState(() => {
        const saved = pref("ta_last_account", null);
        return ACCOUNTS.find(a=>a.code===saved) || ACCOUNTS[0];
    });
    const [pin, setPin] = useState("");
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const lastLogin = pref("ta_last_login", null);

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
            savePref("ta_last_account", account.code);
            savePref("ta_last_login", { name: account.label, time: Date.now() });
            onLogin({ code:user.code, role:user.role, teamId:user.teamId, name:account.label });
        } catch(e) { setError("Error: " + e.message); setBusy(false); }
    };

    const formatTime = ts => {
        const d = new Date(ts);
        return d.toLocaleDateString()+' '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    };

    return (
        <div>
            <SeasonBar selectedYear={THIS_YEAR} />
            <div className="login-wrap">
                <div className="login-title">🎾 TENNIS AUCTION</div>
                <div className="login-sub">Live player draft · Real-time sync</div>

                {lastLogin && (
                    <div className="login-welcome">
                        👋 Welcome back, {lastLogin.name.split("·")[1]?.trim() || lastLogin.name}
                        <div className="login-timestamp">Last login: {formatTime(lastLogin.time)}</div>
                    </div>
                )}

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
                        onKeyPress={e => e.key==="Enter" && submit()} />
                </div>

                {error && <div className="login-error">{error}</div>}

                <button className="btn btn-primary" onClick={submit} disabled={busy || pin.length < 6} style={{marginTop:8}}>
                    {busy ? "Signing in…" : "Sign In"}
                </button>
            </div>
        </div>
    );
}

// ─── Admin Config (Players · Teams · Settings) ───────────────────────────────
function AdminConfig() {
    const [tab, setTab]         = useState("players");
    const [players, setPlayers] = useState(PLAYERS.map(p=>({...p})));
    const [teams, setTeams]     = useState(TEAMS.map(t=>({...t})));
    const [settings, setSettings] = useState({budget:TEAM_BUDGET,teamSize:TEAM_SIZE,timerMs:TIMER_MS,playersPerGroup:5});
    const [saving, setSaving]   = useState(false);
    const [status, setStatus]   = useState(null);
    const [drag, setDrag]       = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        db.ref(CFG_PATH).once("value").then(snap => {
            const d = snap.val();
            if (!d) return;
            if (Array.isArray(d.players) && d.players.length) setPlayers(d.players.map(withPlayerMeta));
            if (Array.isArray(d.teams)   && d.teams.length)   setTeams(d.teams);
            if (d.settings) setSettings(s=>({...s,...d.settings}));
        });
    }, []);

    const handleFile = file => {
        if (!file || !file.name.match(/\.(csv|txt)$/i)) { setStatus({ok:false,text:"Please upload a .csv file"}); return; }
        const reader = new FileReader();
        reader.onload = e => {
            const parsed = parseCSV(e.target.result);
            if (!parsed.length) { setStatus({ok:false,text:"No players found — check CSV has a Name column"}); return; }
            setPlayers(parsed);
            setStatus({ok:true,text:`Imported ${parsed.length} players`});
        };
        reader.readAsText(file);
    };

    const addPlayer = () => setPlayers(ps=>[...ps,{id:Date.now(),Name:"",utr:3.0,price:5000}]);
    const updPlayer = (id,f,v) => setPlayers(ps=>ps.map(p=>p.id===id?{...p,[f]:v}:p));
    const delPlayer = id => setPlayers(ps=>ps.filter(p=>p.id!==id));

    const addTeam = () => { const nid=Math.max(0,...teams.map(t=>t.id))+1; setTeams(ts=>[...ts,{id:nid,name:`Team ${nid}`,captain:""}]); };
    const updTeam = (id,f,v) => setTeams(ts=>ts.map(t=>t.id===id?{...t,[f]:v}:t));
    const delTeam = id => setTeams(ts=>ts.filter(t=>t.id!==id));

    const setNumTeams = n => {
        const count = Math.max(1, Math.min(32, parseInt(n)||1));
        setTeams(ts => {
            if (count > ts.length) {
                const extra = [];
                for (let i=ts.length; i<count; i++) {
                    const nid = Math.max(0,...ts.map(t=>t.id),...extra.map(t=>t.id))+1;
                    extra.push({id:nid, name:`Team ${nid}`, captain:""});
                }
                return [...ts, ...extra];
            }
            return ts.slice(0, count);
        });
    };

    const saveAll = async () => {
        setSaving(true); setStatus(null);
        const vp = players.filter(p=>p.Name.trim());
        const vt = teams.filter(t=>t.name.trim());
        if (!vp.length) { setStatus({ok:false,text:"Add at least one player"}); setSaving(false); return; }
        if (!vt.length) { setStatus({ok:false,text:"Add at least one team"}); setSaving(false); return; }
        const norm = vp.map(p=>({...p,price:p.price||UTR_PRICES[p.utr]||5000}));
        try {
            await db.ref(CFG_PATH).set({players:norm,teams:vt,settings,updatedAt:Date.now()});
            setStatus({ok:true,text:`✓ Saved — ${norm.length} players · ${vt.length} teams · ${fmtR(settings.budget)} budget`});
        } catch(e) { setStatus({ok:false,text:"Save failed: "+e.message}); }
        setSaving(false);
    };

    const playerNames = players.map(p=>p.Name).filter(Boolean);

    return (
        <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"18px 18px 0"}}>
                <div className="card-title" style={{marginBottom:12}}>⚙️ Auction Configuration</div>
                <div className="cfg-tabs">
                    {[["players",`👥 Players (${players.filter(p=>p.Name).length})`],["teams",`🏆 Teams (${teams.length})`],["settings","⚙️ Settings"]].map(([k,l])=>(
                        <button key={k} className={`cfg-tab${tab===k?" active":""}`} onClick={()=>setTab(k)}>{l}</button>
                    ))}
                </div>
            </div>
            <div style={{padding:"0 18px 18px"}}>

                {tab==="players" && (
                    <div className="cfg-tab-panel">
                        <div className={`import-zone${drag?" drag":""}`}
                            onDragOver={e=>{e.preventDefault();setDrag(true)}}
                            onDragLeave={()=>setDrag(false)}
                            onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0])}}
                            onClick={()=>fileRef.current?.click()}>
                            <div className="import-zone-icon">📄</div>
                            <div className="import-zone-text">Drop CSV or click to import players</div>
                            <div className="import-zone-sub">Columns: Name, UTR, Price (Price auto-fills from UTR if omitted)</div>
                        </div>
                        <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                            <span style={{fontSize:12,color:"var(--text3)"}}>{players.filter(p=>p.Name).length} players</span>
                            <button className="btn btn-secondary" style={{width:"auto",padding:"5px 12px",fontSize:11}} onClick={addPlayer}>+ Add Player</button>
                        </div>
                        <div className="ptable-wrap">
                            <table className="ptable">
                                <thead><tr><th>#</th><th>Name</th><th>UTR</th><th>Price</th><th></th></tr></thead>
                                <tbody>
                                    {players.map((p,i)=>(
                                        <tr key={p.id}>
                                            <td style={{color:"var(--text4)",width:24,fontSize:10}}>{i+1}</td>
                                            <td><input value={p.Name} onChange={e=>updPlayer(p.id,"Name",e.target.value)} placeholder="Player name" /></td>
                                            <td style={{width:72}}>
                                                <select value={p.utr} onChange={e=>{const u=parseFloat(e.target.value);updPlayer(p.id,"utr",u);updPlayer(p.id,"price",UTR_PRICES[u]||5000);}}>
                                                    {UTR_TIERS.map(u=><option key={u} value={u}>{u.toFixed(1)}</option>)}
                                                </select>
                                            </td>
                                            <td style={{width:80}}><input type="number" step={500} value={p.price} onChange={e=>updPlayer(p.id,"price",parseInt(e.target.value)||0)} /></td>
                                            <td style={{width:28}}><button className="team-cfg-del" onClick={()=>delPlayer(p.id)}>✕</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab==="teams" && (
                    <div className="cfg-tab-panel">
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                            <span style={{fontSize:12,color:"var(--text3)"}}>{teams.length} teams · {teams.length*settings.teamSize} total slots</span>
                            <button className="btn btn-secondary" style={{width:"auto",padding:"5px 12px",fontSize:11}} onClick={addTeam}>+ Add Team</button>
                        </div>
                        <div style={{border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",maxHeight:360,overflowY:"auto"}}>
                            {teams.map((t,i)=>(
                                <div key={t.id} className="team-cfg-row">
                                    <div className="team-cfg-num">{i+1}</div>
                                    <div className="team-cfg-inputs">
                                        <input value={t.name} onChange={e=>updTeam(t.id,"name",e.target.value)} placeholder="Team name" />
                                        <select value={t.captain} onChange={e=>updTeam(t.id,"captain",e.target.value)}
                                            style={{flex:1,background:"var(--surface3)",border:"1px solid var(--border2)",borderRadius:8,color:t.captain?"var(--text)":"var(--text4)",padding:"7px 10px",fontSize:12,outline:"none"}}>
                                            <option value="">— Captain —</option>
                                            {playerNames.map(n=><option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>
                                    <button className="team-cfg-del" onClick={()=>delTeam(t.id)}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab==="settings" && (
                    <div className="cfg-tab-panel">
                        <div style={{border:"1px solid var(--border)",borderRadius:10,padding:"0 14px"}}>
                            <div className="setting-row">
                                <div><div className="setting-label">Number of Teams</div><div className="setting-desc">How many teams participate in the auction</div></div>
                                <div className="setting-control">
                                    <input type="number" min={1} max={32} step={1}
                                        value={teams.length}
                                        onChange={e=>setNumTeams(e.target.value)} />
                                    <div style={{fontSize:10,color:"var(--text4)",textAlign:"center",marginTop:2}}>teams</div>
                                </div>
                            </div>
                            {[
                                {key:"teamSize",  label:"Players per Team",   desc:"Total roster size per team including the captain",    suffix:" players",min:3,     max:30, step:1},
                                {key:"playersPerGroup", label:"Players per Group", desc:"How many players are divided into each auction group", suffix:" players", min:1, max:50, step:1},
                                {key:"budget",   label:"Budget per Team",    desc:"Starting coins each team gets to spend",     suffix:"$",      min:5000,  step:5000},
                                {key:"timerMs",   label:"Bid Timer (sec)",    desc:"Countdown per player during auction",        suffix:"s",      min:10,    max:600,step:5, scale:1000},
                            ].map(({key,label,desc,suffix,min,max,step,scale})=>(
                                <div key={key} className="setting-row">
                                    <div><div className="setting-label">{label}</div><div className="setting-desc">{desc}</div></div>
                                    <div className="setting-control">
                                        <input type="number" min={min} max={max} step={step}
                                            value={scale?Math.round(settings[key]/scale):(settings[key]!=null?settings[key]:min)}
                                            onChange={e=>{const v=parseInt(e.target.value)||min;setSettings(s=>({...s,[key]:scale?v*scale:v}));}} />
                                        <div style={{fontSize:10,color:"var(--text4)",textAlign:"center",marginTop:2}}>{suffix}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{marginTop:12,padding:"10px 14px",background:"var(--surface3)",borderRadius:10,fontSize:12,color:"var(--text3)"}}>
                            <strong style={{color:"var(--text)"}}>Summary: </strong>
                            {teams.length} teams × {settings.teamSize} players = {teams.length*settings.teamSize} total slots
                            {settings.playersPerGroup ? ` · ${settings.playersPerGroup} players/group` : ""}
                            {" "}· {fmtR(settings.budget)} budget · {Math.round(settings.timerMs/1000)}s timer
                        </div>
                    </div>
                )}

                {status && <div className={`cfg-status ${status.ok?"ok":"err"}`}>{status.text}</div>}
                <button className="btn btn-primary" style={{marginTop:12}} onClick={saveAll} disabled={saving}>
                    {saving?"Saving…":"💾 Save Configuration"}
                </button>
            </div>
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
        });
    }, []);

    const save = async (account) => {
        const pin = pins[account.code] || "";
        if (pin.length !== 6 || !/^\d{6}$/.test(pin)) { setMsg({code:account.code,text:"Must be 6 digits",ok:false}); return; }
        setSaving(account.code);
        await db.ref(`users/${account.code}`).set({
            code: account.code,
            pin,
            role: account.role,
            teamId: account.teamId || null,
            name: account.label
        });
        setSaving(null);
        setMsg({code:account.code,text:"Saved",ok:true});
        setTimeout(() => setMsg(null), 2000);
    };

    const saveAll = async () => {
        const invalid = ACCOUNTS.find(a => { const p = pins[a.code]||""; return p.length!==6||!/^\d{6}$/.test(p); });
        if (invalid) { setMsg({code:"ALL",text:`Invalid PIN for ${invalid.label}`,ok:false}); return; }
        setSaving("ALL");
        const updates = {};
        ACCOUNTS.forEach(a => {
            updates[`users/${a.code}`] = {code:a.code,pin:pins[a.code],role:a.role,teamId:a.teamId||null,name:a.label};
        });
        await db.ref().update(updates);
        setSaving(null);
        setMsg({code:"ALL",text:"All PINs saved",ok:true});
        setTimeout(() => setMsg(null), 2000);
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
function PoolViewer() {
    const [open, setOpen] = useState({});
    const [pools, setPools] = useState(PLAYER_POOLS);
    const [captainNames, setCaptainNames] = useState(CAPTAIN_NAMES);
    const toggle = k => setOpen(o => ({...o,[k]:!o[k]}));

    useEffect(() => {
        db.ref(CFG_PATH).once("value").then(snap => {
            const d = snap.val();
            if (!d) return;
            const cfgPlayers = Array.isArray(d.players) && d.players.length ? d.players.map(withPlayerMeta) : PLAYERS;
            const cfgTeams   = Array.isArray(d.teams)   && d.teams.length   ? d.teams   : TEAMS;
            const capNames   = new Set(cfgTeams.map(t=>t.captain));
            setCaptainNames(capNames);
            setPools(buildPools(cfgPlayers, POOL_ORDER, capNames));
        });
    }, []);

    const totalPlayers = POOL_ORDER.reduce((s,k)=>s+(pools[k]||[]).length, 0);

    return (
        <div className="card" style={{padding:"18px"}}>
            <div className="card-title" style={{marginBottom:4}}>🎾 Auction Pools</div>
            <div className="card-sub" style={{marginBottom:14}}>
                {totalPlayers} players across {POOL_ORDER.filter(k=>(pools[k]||[]).length>0).length} pools · auction runs highest UTR first
            </div>
            {POOL_ORDER.map(key => {
                const utr = getUTR(key);
                const players = pools[key] || [];
                if (!players.length) return null;
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
                                    <div className="pool-header-meta">{players.length} players · base {fmtR(players[0]?.price||0)} · {actualUtr(players[0])}</div>
                                </div>
                            </div>
                            <span className={`pool-chevron${isOpen?" open":""}`}>▼</span>
                        </div>
                        {isOpen && (
                            <div className="pool-body">
                                {players.map((p,i) => {
                                    const isCap = captainNames.has(p.Name);
                                    return (
                                        <div key={p.id} className="pool-player-row">
                                            <span className="pool-player-num">{i+1}</span>
                                            <span className="pool-player-name">{p.Name}</span>
                                            {isCap && <span className="pool-player-cap">CAPTAIN</span>}
                                            <span style={{fontSize:11,color:"var(--text3)",marginLeft:8}}>{actualUtrDetail(p)}</span>
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
function Lobby({ user, onJoin, onLogout, selectedYear, onYearSelect }) {
    const [joinId, setJoinId] = useState("");
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [sessionHistory, setSessionHistory] = useState(() => pref("ta_sessions", []));

    const removeSession = id => {
        const updated = sessionHistory.filter(s => s.id !== id);
        savePref("ta_sessions", updated);
        setSessionHistory(updated);
    };
    const clearAllSessions = () => {
        savePref("ta_sessions", []);
        setSessionHistory([]);
    };

    const saveSession = (sid) => {
        const existing = pref("ta_sessions", []);
        const updated = [
            { id:sid, year:selectedYear||THIS_YEAR, ts:Date.now() },
            ...existing.filter(s=>s.id!==sid)
        ].slice(0,5);
        savePref("ta_sessions", updated);
        savePref("ta_last_session", sid);
    };

    const createNew = async () => {
        setCreating(true); setError(null);
        try {
            const cfgSnap = await db.ref(CFG_PATH).once("value");
            const cfg = cfgSnap.val();
            const cfgPlayers = (cfg?.players?.length ? cfg.players.map(withPlayerMeta) : PLAYERS);
            const cfgTeams   = (cfg?.teams?.length   ? cfg.teams   : TEAMS);
            const budget          = cfg?.settings?.budget          || TEAM_BUDGET;
            const teamSize        = cfg?.settings?.teamSize        || TEAM_SIZE;
            const timerMs         = cfg?.settings?.timerMs         || TIMER_MS;
            const playersPerGroup = cfg?.settings?.playersPerGroup || 5;
            const capNames   = new Set(cfgTeams.map(t=>t.captain));
            const pools      = buildPools(cfgPlayers, POOL_ORDER, capNames);
            const initTeams  = buildInitialTeams(cfgTeams, cfgPlayers, budget);
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            const sid = Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
            await db.ref(`auctions/${sid}`).set({
                sessionId:sid, teams:initTeams, playerPools:pools,
                currentPoolIndex:0, currentPlayerIndex:0, currentBids:{},
                timerEnd:Date.now()+timerMs, lastUpdate:Date.now(),
                config:{budget,teamSize,timerMs,playersPerGroup},
                cfgPlayers, cfgTeams
            });
            saveSession(sid);
            onJoin(sid);
        } catch(e) { setError("Failed to create: "+e.message); setCreating(false); }
    };

    const joinExisting = async (id) => {
        const sid = (id || joinId).trim().toUpperCase();
        if (!sid) { setError("Enter a session ID"); return; }
        setJoining(true); setError(null);
        const snap = await db.ref(`auctions/${sid}`).once("value");
        if (!snap.exists()) { setError(`Session ${sid} not found`); setJoining(false); return; }
        saveSession(sid);
        onJoin(sid);
    };

    const confirmLogout = () => setShowLogoutConfirm(true);

    const formatAge = ts => {
        const s = Math.floor((Date.now()-ts)/1000);
        if (s<60) return "just now";
        const m = Math.floor(s/60); if (m<60) return `${m}m ago`;
        const h = Math.floor(m/60); if (h<24) return `${h}h ago`;
        return `${Math.floor(h/24)}d ago`;
    };

    return (
        <div>
            <SeasonBar selectedYear={selectedYear||THIS_YEAR} onSelect={onYearSelect} />
            <div className="setup-wrap">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                    <div>
                        <div style={{fontSize:11,color:"#888"}}>Signed in as</div>
                        <div style={{fontWeight:700,color:"#fff"}}>{user.name}</div>
                        {pref("ta_last_login",null) && (
                            <div style={{fontSize:10,color:"var(--text4)"}}>
                                Since {new Date(pref("ta_last_login",{time:Date.now()}).time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                            </div>
                        )}
                    </div>
                    <button className="btn btn-neutral" style={{width:"auto",padding:"8px 16px",fontSize:13}} onClick={confirmLogout}>Log out</button>
                </div>

                {error && <div className="error-banner">{error}</div>}

                {user.role === "admin" ? (
                    <>
                    <div className="card">
                        <div className="card-title">Start new auction</div>
                        <div className="card-sub">Creates a fresh session for <strong style={{color:"var(--gold)"}}>Season {selectedYear||THIS_YEAR}</strong>. Share the 6-letter ID with all captains.</div>
                        <button className="btn btn-primary" onClick={createNew} disabled={creating}>
                            {creating ? "Creating…" : `Create ${selectedYear||THIS_YEAR} Auction`}
                        </button>
                    </div>
                    <AdminConfig />
                    <ManagePins />
                    </>
                ) : (
                    <div className="card" style={{borderColor:"#4f9eff",background:"#0f1420"}}>
                        <div className="card-title">👋 Hi, {user.name.split("·")[1]?.trim()}</div>
                        <div className="card-sub">Ask the Auctioneer for the Session ID, then join below.</div>
                    </div>
                )}

                {sessionHistory.length > 0 && (
                    <div className="card">
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                            <div className="session-hist-title" style={{marginBottom:0}}>🕐 Recent Sessions</div>
                            <button onClick={clearAllSessions}
                                style={{background:"none",border:"none",color:"var(--text4)",fontSize:11,cursor:"pointer",padding:"2px 6px"}}>
                                Clear all
                            </button>
                        </div>
                        {sessionHistory.map(s => (
                            <div key={s.id} className="session-hist-card">
                                <div>
                                    <div className="session-hist-id">{s.id}</div>
                                    <div className="session-hist-meta">Season {s.year||THIS_YEAR} · {formatAge(s.ts)}</div>
                                </div>
                                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                    <button className="btn btn-neutral session-hist-btn" onClick={()=>joinExisting(s.id)}>
                                        Rejoin
                                    </button>
                                    <button onClick={()=>removeSession(s.id)}
                                        style={{background:"none",border:"1px solid var(--border2)",borderRadius:6,color:"var(--text4)",fontSize:13,cursor:"pointer",padding:"5px 8px",lineHeight:1}}>
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="or-row"><div className="line"/><span>OR JOIN EXISTING</span><div className="line"/></div>

                <div className="card">
                    <input className="code-input" type="text" placeholder="ABC123" maxLength={6}
                        value={joinId} onChange={e=>setJoinId(e.target.value.toUpperCase())}
                        onKeyPress={e=>e.key==="Enter" && joinExisting()}
                        style={{marginBottom:14}} />
                    <button className="btn btn-secondary" onClick={()=>joinExisting()} disabled={joining||joinId.length<6}>
                        {joining ? "Joining…" : "Join Session"}
                    </button>
                </div>

                {showLogoutConfirm && (
                    <div className="logout-overlay">
                        <div className="logout-dialog">
                            <h3>Sign out?</h3>
                            <p>You'll need your PIN to sign back in. Any active auction will remain open for others.</p>
                            <div className="btn-row">
                                <button className="btn btn-danger" style={{flex:1}} onClick={onLogout}>Sign Out</button>
                                <button className="btn btn-neutral" style={{flex:1}} onClick={()=>setShowLogoutConfirm(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main auction screen ──────────────────────────────────────────────────────
function Auction({ sid, user, onBack }) {
    const [state, setState] = useState(null);
    const [connected, setConnected] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [bidInputs, setBidInputs] = useState({});
    const [bidErrors, setBidErrors] = useState({});
    const [actionError, setActionError] = useState(null);
    const [resetOpen, setResetOpen] = useState(false);
    const [showRosters, setShowRosters] = useState(() => pref("ta_rosters",true));
    const [showUpcoming, setShowUpcoming] = useState(true);
    const [pinnedTeam, setPinnedTeam] = useState(() => pref("ta_pin",null));
    const auctionRef = useRef(db.ref(`auctions/${sid}`));

    // Real-time listener
    useEffect(() => {
        const connRef = db.ref(".info/connected");
        connRef.on("value", s => setConnected(s.val()===true));
        const handleAuctionValue = snap => {
            if (snap.exists()) {
                setState(normalize(snap.val()));
                setLoadError(null);
                setConnected(true);
            } else {
                setState(null);
                setConnected(false);
                setLoadError(`Session ${sid} was not found or has been removed.`);
            }
        };
        const handleAuctionError = err => {
            setState(null);
            setConnected(false);
            setLoadError(`Could not load session ${sid}: ${err.message}`);
        };
        auctionRef.current.on("value", handleAuctionValue, handleAuctionError);
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

    if (!state) return (
        <div className="setup-wrap">
            <div className="card" style={{textAlign:"center"}}>
                <div className="card-title">{loadError ? "Unable to load auction" : `Loading auction ${sid}…`}</div>
                <div className={`card-sub${loadError ? " boot-error" : ""}`} style={{marginBottom:16}}>
                    {loadError || "Connecting to the live auction data. This usually takes a moment."}
                </div>
                {!loadError && <div className="boot-spinner" />}
                {loadError && <button className="btn btn-neutral" onClick={onBack}>Back to lobby</button>}
            </div>
        </div>
    );

    const TEAM_SIZE_EFF = state.config?.teamSize || TEAM_SIZE;
    const TIMER_EFF = state.config?.timerMs || TIMER_MS;
    const eff = getEffective(state);
    const POOL_CAPS_EFF = {};
    POOL_ORDER.forEach(key => {
        const size = (state.playerPools[key] || []).length;
        POOL_CAPS_EFF[key] = size === 0 ? 0 : 1;
    });
    const isAdmin = user.role === "admin";
    const myTeamId = user.teamId;

    const reserveAfterCurrentWin = team => {
        if (!eff?.player || !team) return {amount:0,slots:0,maxBid:team?.budget||0};
        const projectedPlayers = [...team.players, eff.player];
        const openSlots = Math.max(0, TEAM_SIZE_EFF - projectedPlayers.length);
        if (openSlots === 0) return {amount:0,slots:0,maxBid:team.budget};

        const ownedUtrs = new Set(projectedPlayers.map(p=>p.utr));
        const costs = [];
        POOL_ORDER.slice(eff.effPool + 1).forEach(poolKey => {
            const utr = getUTR(poolKey);
            if (!ownedUtrs.has(utr)) costs.push(UTR_PRICES[utr] || 5000);
        });

        const slots = Math.min(openSlots, costs.length);
        const amount = costs.slice(0, slots).reduce((sum,cost)=>sum+cost, 0);
        return {amount,slots,maxBid:Math.max(0, team.budget - amount)};
    };

    const validateBid = (teamId, amount) => {
        if (!eff?.player) return "No player";
        const team = state.teams.find(t=>t.id===teamId);
        if (!team) return "Team not found";
        if (team.players.length >= TEAM_SIZE_EFF) return `Team full`;
        const utr = getUTR(eff.poolKey);
        const fromPool = team.players.slice(1).filter(p=>p.utr===utr).length;
        if (fromPool >= (POOL_CAPS_EFF[eff.poolKey]||0)) return `Max ${POOL_CAPS_EFF[eff.poolKey]} at UTR ${utr}`;
        if (!amount||amount<=0) return "Enter amount";
        if (amount < eff.player.price) return `Min ${fmtR(eff.player.price)}`;
        if ((amount - eff.player.price)%1000!==0) return "Base + $1k increments";
        const dup = state.teams.find(t=>t.id!==teamId&&(state.currentBids[String(t.id)]||0)===amount);
        if (dup) return `${fmtR(amount)} taken by ${dup.name}`;
        if (amount > team.budget) return "Exceeds budget";
        const reserve = reserveAfterCurrentWin(team);
        if (amount > reserve.maxBid) {
            return `Keep ${fmtR(reserve.amount)} for ${reserve.slots} remaining base-price player${reserve.slots===1?"":"s"} · max bid ${fmtR(reserve.maxBid)}`;
        }
        return null;
    };

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
            if (taken) return;
            return {...bids,[teamId]:n};
        }, (err,committed) => {
            if (!committed) setBidErrors(p=>({...p,[teamId]:"Amount taken — bid higher"}));
            else { setBidInputs(p=>({...p,[teamId]:""})); auctionRef.current.update({lastUpdate:Date.now()}); }
        });
    };

    const finalize = () => {
        if (!eff?.player) return;
        const bids = Object.entries(state.currentBids).map(([tid,b])=>({teamId:parseInt(tid),bid:b})).filter(x=>x.bid>0);
        if (!bids.length) { setActionError("No bids — use Skip"); return; }
        const highest = Math.max(...bids.map(b=>b.bid));
        const winners = bids.filter(b=>b.bid===highest);
        if (winners.length>1) { setActionError(`Tie between ${winners.map(w=>state.teams.find(t=>t.id===w.teamId)?.name).join(", ")} — place different bids`); return; }
        const winId = winners[0].teamId;
        const winErr = validateBid(winId, highest);
        if (winErr) { setActionError(winErr); return; }
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
        fbUpdate({teams,playerPools:pools,currentPoolIndex:nextPool,currentPlayerIndex:nextPlayer,currentBids:{},timerEnd:Date.now()+TIMER_EFF});
        setBidInputs({}); setBidErrors({}); setActionError(null);
    };

    const skip = () => {
        if (!eff?.player) return;
        const pools = {...state.playerPools};
        const pool = [...pools[eff.poolKey]];
        const moved = {...pool[eff.effPlayer],isRetry:true,retryCount:(pool[eff.effPlayer].retryCount||0)+1};
        pool.splice(eff.effPlayer,1); pool.push(moved);
        pools[eff.poolKey] = pool;
        let nextPool=eff.effPool, nextPlayer=eff.effPlayer;
        if (eff.effPlayer>=pool.length) { nextPool=eff.effPool+1; nextPlayer=0; }
        fbUpdate({playerPools:pools,currentPoolIndex:nextPool,currentPlayerIndex:nextPlayer,currentBids:{},timerEnd:Date.now()+TIMER_EFF});
        setBidInputs({}); setBidErrors({}); setActionError(null);
    };

    const selectNextPool = poolKey => {
        const nextPool = POOL_ORDER.indexOf(poolKey);
        if (nextPool < 0) return;
        fbUpdate({currentPoolIndex:nextPool,currentPlayerIndex:0,currentBids:{},timerEnd:Date.now()+TIMER_EFF});
        setBidInputs({}); setBidErrors({}); setActionError(null);
    };

    const reset = () => {
        const cfgPlayers = state.cfgPlayers ? state.cfgPlayers.map(withPlayerMeta) : PLAYERS;
        const cfgTeams   = state.cfgTeams   || TEAMS;
        const budget     = state.config?.budget  || TEAM_BUDGET;
        const capNames   = new Set(cfgTeams.map(t=>t.captain));
        const pools      = buildPools(cfgPlayers, POOL_ORDER, capNames);
        const initTeams  = buildInitialTeams(cfgTeams, cfgPlayers, budget);
        const doc = {
            sessionId: sid,
            teams: initTeams, playerPools: pools,
            currentPoolIndex:0, currentPlayerIndex:0, currentBids:{},
            timerEnd: Date.now()+TIMER_EFF, lastUpdate: Date.now(),
            config: state.config || {budget:TEAM_BUDGET, teamSize:TEAM_SIZE, timerMs:TIMER_MS},
            cfgPlayers, cfgTeams
        };
        auctionRef.current.set(doc);
        setBidInputs({}); setBidErrors({}); setActionError(null); setResetOpen(false);
    };

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
                    {state.teams.map(t => <RosterCard key={t.id} team={t} teamSize={TEAM_SIZE_EFF}/>)}
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
        const reserve = reserveAfterCurrentWin(t);
        const isDisabled = t.players.length>=TEAM_SIZE_EFF || t.budget<eff.player.price || reserve.maxBid<eff.player.price ||
            (t.players.slice(1).filter(p=>p.utr===getUTR(eff.poolKey)).length >= (POOL_CAPS_EFF[eff.poolKey]||0));
        return {...t,isDisabled,isPinned:pinnedTeam===t.id,reserve};
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

            <div style={{margin:"0 12px 10px",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden"}}>
                <div onClick={()=>setShowUpcoming(v=>!v)}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                        padding:"9px 14px",cursor:"pointer",background:"var(--surface2)",userSelect:"none"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--text2)"}}>
                        📋 Pool Queue · Tier UTR {eff.player.utr} · {actualUtrDetail(eff.player)} · {eff.pool.length} remaining
                    </div>
                    <span style={{fontSize:10,color:"var(--text4)"}}>{showUpcoming?"▲":"▼"}</span>
                </div>
                {showUpcoming && (
                    <div style={{maxHeight:180,overflowY:"auto"}}>
                        {eff.pool.map((p,i) => (
                            <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 14px",
                                borderTop:"1px solid var(--border)",
                                background:i===eff.effPlayer?"var(--surface3)":"transparent"}}>
                                <span style={{fontSize:11,color:"var(--text4)",minWidth:18}}>{i+1}</span>
                                <span style={{flex:1,fontSize:13,fontWeight:i===eff.effPlayer?700:400,
                                    color:i===eff.effPlayer?"var(--text)":"var(--text2)"}}>
                                    {p.Name}
                                    {i===eff.effPlayer && <span style={{marginLeft:6,fontSize:10,color:"var(--gold)",fontWeight:600}}>← NOW</span>}
                                    {p.isRetry && <span style={{marginLeft:4,fontSize:10,color:"var(--muted)"}}>retry</span>}
                                </span>
                                <span style={{fontSize:11,color:"var(--text3)"}}>Tier {p.utr} · {actualUtrDetail(p)}</span>
                                <span style={{fontSize:11,color:"var(--text4)"}}>{fmtR(p.price)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={`sticky-bar`} style={warn?{borderColor:"rgba(255,77,106,.7)"}:{}}>
                <div className="sb-left">
                    <div className="sb-player">{eff.player.Name}{eff.player.isRetry&&<span className="sb-retry"> · Retry #{eff.player.retryCount}</span>}</div>
                    <div className="sb-meta">Tier UTR {eff.player.utr} · {actualUtrDetail(eff.player)} · base {fmtR(eff.player.price)} · {eff.effPlayer+1}/{eff.pool.length} in pool</div>
                    {highest>0 && <div className="sb-high">High {fmtR(highest)}{winners.length===1?" · "+state.teams.find(t=>t.id===winners[0].teamId)?.name:winners.length>1?" · TIE":""}</div>}
                </div>
                <div className={`sb-timer ${warn?"warn":""}`}>{timeLeft}s</div>
            </div>

            {actionError && <div className="error-banner" onClick={()=>setActionError(null)}>{actionError} ✕</div>}

            {isAdmin && (
                <div className="admin-bar">
                    <select
                        value={eff.poolKey}
                        onChange={e=>selectNextPool(e.target.value)}
                        style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text)",padding:"9px 12px",fontSize:12,outline:"none"}}
                        title="Select the pool to bid next"
                    >
                        {POOL_ORDER.map(key => {
                            const count = (state.playerPools[key] || []).length;
                            const utr = getUTR(key);
                            return <option key={key} value={key} disabled={count===0}>Bid UTR {utr.toFixed(1)} next · {count} left</option>;
                        })}
                    </select>
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
                        const reason = team.players.length>=TEAM_SIZE_EFF?"Full":team.budget<eff.player.price?"Low budget":team.reserve?.maxBid<eff.player.price?`Reserve ${fmtR(team.reserve.amount)}`:`UTR cap`;
                        return (
                            <div key={team.id} className="bid-card disabled-card">
                                <span className="disabled-team-name">{team.name} · {team.players.length}/{TEAM_SIZE_EFF}</span>
                                <span className="disabled-reason">{reason}</span>
                            </div>
                        );
                    }

                    const anchor = highest>0?highest+1000:eff.player.price;
                    const maxBid = team.reserve?.maxBid ?? team.budget;
                    const chips = [anchor,anchor+1000,anchor+2000].filter(v=>v<=maxBid);

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
                                        <span className="team-budget-pill team-budget-left">{fmtR(team.budget)}</span>
                                        <span className="team-slots">{team.players.length}/{TEAM_SIZE_EFF} players</span>
                                    </div>
                                    {team.reserve?.slots>0 && <div className="team-captain">Reserve {fmtR(team.reserve.amount)} for {team.reserve.slots} base slot{team.reserve.slots===1?"":"s"}</div>}
                                </div>
                                <button className={`pin-btn ${team.isPinned?"pinned":""}`} onClick={()=>togglePin(team.id)} title="Pin team">📌</button>
                            </div>

                            {(isAdmin || isMyTeam) && (<>
                                <div className="bid-divider"/>
                                <div className="bid-input-wrap">
                                    <input type="number" inputMode="numeric" className="bid-input"
                                        placeholder={`Min ${fmtR(eff.player.price)}`}
                                        value={bidInputs[team.id]||""}
                                        disabled={timeLeft===0}
                                        onChange={e=>{setBidInputs(p=>({...p,[team.id]:e.target.value}));setBidErrors(p=>({...p,[team.id]:null}));}}
                                        onKeyPress={e=>e.key==="Enter"&&bidInputs[team.id]&&placeBid(team.id,bidInputs[team.id])}
                                    />
                                    <div className="quick-chips">
                                        {chips.map(v=><button key={v} className="chip" disabled={timeLeft===0} onClick={()=>{setBidInputs(p=>({...p,[team.id]:String(v)}));setBidErrors(p=>({...p,[team.id]:null}));}}>
                                            ${v>=1000?`${v/1000}k`:v}
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
                                <div className="bid-status">{teamBid>0?`Current bid: ${fmtR(teamBid)}`:""}</div>
                                {isWin && <span className="bid-win-badge">WINNING</span>}
                                {isTie && <span className="bid-tie-badge">TIED</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button className="section-toggle" onClick={toggleRosters}>
                <span>Team rosters · {state.teams.length} teams</span>
                <span>{showRosters?"Hide ▲":"Show ▼"}</span>
            </button>
            {showRosters && (
                <div className="rosters-grid">
                    {state.teams.map(t=><RosterCard key={t.id} team={t} teamSize={TEAM_SIZE_EFF}/>)}
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

function RosterCard({team, teamSize}) {
    const cap = team.players[0];
    const rest = team.players.slice(1);
    const filled = team.players.length;
    const fillPct = Math.round((filled / teamSize) * 100);
    return (
        <div className="roster-card">
            <div className="roster-name">
                {team.name}
                <span style={{fontSize:10,fontWeight:600,color:"var(--muted)",marginLeft:6}}>
                    {filled}/{teamSize}
                </span>
            </div>
            <div className="roster-budget">
                <span className="roster-spent">-{fmtR(team.totalSpent)}</span>
                <span className="roster-left">{fmtR(team.budget)} left</span>
            </div>
            <div style={{height:3,background:"var(--border)",borderRadius:99,marginBottom:8,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${fillPct}%`,borderRadius:99,
                    background:`linear-gradient(90deg,var(--blue),var(--purple))`,transition:"width .4s"}}/>
            </div>
            {cap && (
                <div className="roster-captain-row">
                    <span className="roster-captain-star">⭐</span>
                    <span className="roster-captain-name">{cap.Name}</span>
                    <span className={`roster-player-utr ${utrClass(cap.utr)}`} title={actualUtrDetail(cap)}>{cap.utr}/{fmtRating(cap.best)}</span>
                </div>
            )}
            {rest.map((p,i)=>(
                <div key={p.id} className="roster-player">
                    <span className="roster-player-num">{i+2}</span>
                    <span className="roster-player-name">{p.Name}</span>
                    <span className={`roster-player-utr ${utrClass(p.utr)}`} title={actualUtrDetail(p)}>{p.utr}/{fmtRating(p.best)}</span>
                    <span className="roster-player-price">{fmtR(p.acquiredPrice)}</span>
                </div>
            ))}
            {Array.from({length: teamSize - filled}).map((_,i)=>(
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
const IDLE_MS = 180 * 60 * 1000; // 180 minutes
const IDLE_WARN_MS = 175 * 60 * 1000; // warn at 175 min

function App() {
    const [user, setUser] = useState(() => pref("ta_user", null));
    const [sessionId, setSessionId] = useState(() => null);
    const [selectedYear, setSelectedYear] = useState(THIS_YEAR);
    const [idleWarning, setIdleWarning] = useState(false);
    const idleRef = useRef(null);
    const warnRef = useRef(null);

    const resetIdle = useCallback(() => {
        clearTimeout(idleRef.current);
        clearTimeout(warnRef.current);
        setIdleWarning(false);
        if (user) {
            warnRef.current = setTimeout(() => setIdleWarning(true), IDLE_WARN_MS);
            idleRef.current = setTimeout(() => handleLogout(), IDLE_MS);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const events = ["mousemove","keydown","click","touchstart","scroll"];
        events.forEach(e => window.addEventListener(e, resetIdle, {passive:true}));
        resetIdle();
        return () => {
            events.forEach(e => window.removeEventListener(e, resetIdle));
            clearTimeout(idleRef.current);
            clearTimeout(warnRef.current);
        };
    }, [user, resetIdle]);

    const handleLogin = u => { setUser(u); savePref("ta_user",u); };
    const handleLogout = () => {
        setUser(null); savePref("ta_user",null);
        setSessionId(null); setIdleWarning(false);
        clearTimeout(idleRef.current); clearTimeout(warnRef.current);
    };
    const handleJoin = sid => { setSessionId(sid); savePref("ta_last_session", sid); };

    return (
        <div>
            {idleWarning && user && (
                <div className="idle-banner">
                    <span>⚠️ You'll be signed out in 5 minutes due to inactivity</span>
                    <button onClick={resetIdle}>Stay Signed In</button>
                </div>
            )}
            {!user
                ? <Login onLogin={handleLogin}/>
                : !sessionId
                    ? <Lobby user={user} onJoin={handleJoin} onLogout={handleLogout}
                        selectedYear={selectedYear} onYearSelect={setSelectedYear}/>
                    : <Auction sid={sessionId} user={user} onBack={()=>setSessionId(null)}/>
            }
        </div>
    );
}

createRoot(document.getElementById("root")).render(<App/>);
