"use strict";
const { useState, useEffect, useRef } = React;
// ─── Firebase ────────────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyDbO0eP52i4t3V94bEiDcl7WoKbSrrM9VA",
    authDomain: "koc2-20fb8.firebaseapp.com",
    databaseURL: "https://koc2-20fb8-default-rtdb.firebaseio.com",
    projectId: "koc2-20fb8",
    storageBucket: "koc2-20fb8.firebasestorage.app",
    messagingSenderId: "317734341461",
    appId: "1:317734341461:web:1bcad5a1792fac0e46bddc"
};
if (!firebase.apps.length)
    firebase.initializeApp(firebaseConfig);
const db = firebase.database();
// ─── Static data ─────────────────────────────────────────────────────────────
const TEAM_BUDGET = 100000;
const TEAM_SIZE = 7;
const TIMER_MS = 60000;
const POOL_ORDER = ["utr_6_0", "utr_5_5", "utr_5_0", "utr_4_5", "utr_4_0", "utr_3_5", "utr_3_0"];
const getUTR = k => parseFloat(k.replace("utr_", "").replace("_", "."));
const PLAYERS = [
    // ── UTR 6.0 · 16 players · ₹20,000 ──────────────────────────────────────
    { id: 1, Name: "Satish Reddy Orugunta", utr: 6.0, price: 20000 },
    { id: 2, Name: "Rajasekhar Chintha", utr: 6.0, price: 20000 },
    { id: 3, Name: "Anil Kunda", utr: 6.0, price: 20000 },
    { id: 4, Name: "Krishna Vennapusa", utr: 6.0, price: 20000 },
    { id: 5, Name: "Nagarjuna Saladi", utr: 6.0, price: 20000 },
    { id: 6, Name: "Dinesh Reddy Timmareddy", utr: 6.0, price: 20000 },
    { id: 7, Name: "Sudhakara Nallapati", utr: 6.0, price: 20000 },
    { id: 8, Name: "Dinkar Bhardwaj", utr: 6.0, price: 20000 },
    { id: 9, Name: "Yogesh Dhadge", utr: 6.0, price: 20000 },
    { id: 10, Name: "Uma Vommi", utr: 6.0, price: 20000 },
    { id: 11, Name: "Manish Jangid", utr: 6.0, price: 20000 },
    { id: 12, Name: "Vinod Aripaka", utr: 6.0, price: 20000 },
    { id: 13, Name: "Narayan Prasad", utr: 6.0, price: 20000 },
    { id: 14, Name: "Chandrakant Dharme", utr: 6.0, price: 20000 },
    { id: 15, Name: "Rajasekhar Karru", utr: 6.0, price: 20000 },
    { id: 16, Name: "Hari Mothukuri", utr: 6.0, price: 20000 },
    // ── UTR 5.5 · 16 players · ₹14,000 ──────────────────────────────────────
    { id: 17, Name: "Lloyd Prasana Kumar", utr: 5.5, price: 14000 },
    { id: 18, Name: "Ritesh Kumar", utr: 5.5, price: 14000 },
    { id: 19, Name: "Sandeep Gengineri", utr: 5.5, price: 14000 },
    { id: 20, Name: "Venky Dh", utr: 5.5, price: 14000 },
    { id: 21, Name: "Jitender Kumar", utr: 5.5, price: 14000 },
    { id: 22, Name: "Srinidhi Kulkarni", utr: 5.5, price: 14000 },
    { id: 23, Name: "Naveenkumar Mohanram", utr: 5.5, price: 14000 },
    { id: 24, Name: "Srikant Tenni", utr: 5.5, price: 14000 },
    { id: 53, Name: "Anand Krishnamoorthy", utr: 5.5, price: 14000 },
    { id: 58, Name: "Magi Kailas", utr: 5.5, price: 14000 },
    { id: 99, Name: "Vivek Reddy", utr: 5.5, price: 14000 },
    { id: 100, Name: "Sashank T", utr: 5.5, price: 14000 },
    { id: 101, Name: "Venkat Thimmisetty", utr: 5.5, price: 14000 },
    { id: 106, Name: "Satish K", utr: 5.5, price: 14000 },
    { id: 111, Name: "Vamsi Atluri", utr: 5.5, price: 14000 },
    { id: 102, Name: "Nikhil Katakam", utr: 5.5, price: 14000 },
    // ── UTR 5.0 · 16 players · ₹12,000 ──────────────────────────────────────
    { id: 25, Name: "Bhaskar Boddireddy", utr: 5.0, price: 12000 },
    { id: 26, Name: "Mohan Koripuri", utr: 5.0, price: 12000 },
    { id: 27, Name: "Anshul Goyal", utr: 5.0, price: 12000 },
    { id: 28, Name: "Jaweed Ibrahim", utr: 5.0, price: 12000 },
    { id: 29, Name: "Janaki Ram Kantheti", utr: 5.0, price: 12000 },
    { id: 30, Name: "Biju Koshy", utr: 5.0, price: 12000 },
    { id: 31, Name: "Damodhara Palavali", utr: 5.0, price: 12000 },
    { id: 32, Name: "Naseer Mohammad", utr: 5.0, price: 12000 },
    { id: 33, Name: "Trinadh Cheepilla", utr: 5.0, price: 12000 },
    { id: 34, Name: "Malla Reddy Cheerke", utr: 5.0, price: 12000 },
    { id: 35, Name: "Charan Macharla", utr: 5.0, price: 12000 },
    { id: 36, Name: "Mohamed Noufal", utr: 5.0, price: 12000 },
    { id: 37, Name: "Rajasekhar Chejerla", utr: 5.0, price: 12000 },
    { id: 107, Name: "Praveen Vijay Kumar", utr: 5.0, price: 12000 },
    { id: 110, Name: "Tarun Chicholi", utr: 5.0, price: 12000 },
    { id: 113, Name: "Sai Varun Polisetty", utr: 5.0, price: 12000 },
    // ── UTR 4.5 · 16 players · ₹10,000 ──────────────────────────────────────
    { id: 38, Name: "Nivas Nazeer", utr: 4.5, price: 10000 },
    { id: 39, Name: "Venice Robinson Amal Doss", utr: 4.5, price: 10000 },
    { id: 40, Name: "Volkan Bal", utr: 4.5, price: 10000 },
    { id: 41, Name: "Premkumar Balakrishnan", utr: 4.5, price: 10000 },
    { id: 42, Name: "Guru Bavirisetty", utr: 4.5, price: 10000 },
    { id: 43, Name: "Sidharth Behera", utr: 4.5, price: 10000 },
    { id: 44, Name: "Sreekanth Bobbala", utr: 4.5, price: 10000 },
    { id: 45, Name: "Hariprashanth Ganapathy", utr: 4.5, price: 10000 },
    { id: 46, Name: "Prashanth Gourineni", utr: 4.5, price: 10000 },
    { id: 47, Name: "Amit Gundewar", utr: 4.5, price: 10000 },
    { id: 48, Name: "Jitin Jaitly", utr: 4.5, price: 10000 },
    { id: 49, Name: "Prashanth Jayantha Kumar", utr: 4.5, price: 10000 },
    { id: 50, Name: "Kalyan Kalidindi", utr: 4.5, price: 10000 },
    { id: 51, Name: "Dineshkumar Kaliyaperumal", utr: 4.5, price: 10000 },
    { id: 52, Name: "Joel Kodoru", utr: 4.5, price: 10000 },
    { id: 54, Name: "Karthik Kumaresan", utr: 4.5, price: 10000 },
    // ── UTR 4.0 · 16 players · ₹8,000 ───────────────────────────────────────
    { id: 55, Name: "Sankara Lakshmanan", utr: 4.0, price: 8000 },
    { id: 56, Name: "Chandu M", utr: 4.0, price: 8000 },
    { id: 57, Name: "Satya Maddipati", utr: 4.0, price: 8000 },
    { id: 59, Name: "Ninad Mahajan", utr: 4.0, price: 8000 },
    { id: 60, Name: "Asif Mohammed", utr: 4.0, price: 8000 },
    { id: 61, Name: "Boopesh Natarajan", utr: 4.0, price: 8000 },
    { id: 62, Name: "Venky Pantham", utr: 4.0, price: 8000 },
    { id: 63, Name: "Abhishek Patel", utr: 4.0, price: 8000 },
    { id: 64, Name: "Mayur Patel", utr: 4.0, price: 8000 },
    { id: 65, Name: "Shailendra Patidar", utr: 4.0, price: 8000 },
    { id: 66, Name: "Prashanth Pendli", utr: 4.0, price: 8000 },
    { id: 67, Name: "Mahidhar Penigi", utr: 4.0, price: 8000 },
    { id: 68, Name: "Vinod Punati", utr: 4.0, price: 8000 },
    { id: 69, Name: "Addy R", utr: 4.0, price: 8000 },
    { id: 70, Name: "Raja R", utr: 4.0, price: 8000 },
    { id: 71, Name: "Karthik Ragunathan", utr: 4.0, price: 8000 },
    // ── UTR 3.5 · 16 players · ₹6,000 ───────────────────────────────────────
    { id: 72, Name: "Saket Raizada", utr: 3.5, price: 6000 },
    { id: 73, Name: "Jagapathi Raju", utr: 3.5, price: 6000 },
    { id: 74, Name: "Arpit Rawat", utr: 3.5, price: 6000 },
    { id: 75, Name: "Rajib Sarkar", utr: 3.5, price: 6000 },
    { id: 76, Name: "Karthik Ram Senthilvel", utr: 3.5, price: 6000 },
    { id: 77, Name: "Gopal Setty", utr: 3.5, price: 6000 },
    { id: 78, Name: "Chandan Singh", utr: 3.5, price: 6000 },
    { id: 79, Name: "Vipul Sud", utr: 3.5, price: 6000 },
    { id: 80, Name: "Bharath Sunku", utr: 3.5, price: 6000 },
    { id: 81, Name: "Avinash Terala", utr: 3.5, price: 6000 },
    { id: 82, Name: "Vivek Tiku", utr: 3.5, price: 6000 },
    { id: 83, Name: "Tushar Tipatre", utr: 3.5, price: 6000 },
    { id: 84, Name: "Koushik Venkatasubramanian", utr: 3.5, price: 6000 },
    { id: 85, Name: "Venu Sarvepalli", utr: 3.5, price: 6000 },
    { id: 86, Name: "Vivek Bihani", utr: 3.5, price: 6000 },
    { id: 87, Name: "Jay Sermadevi", utr: 3.5, price: 6000 },
    // ── UTR 3.0 · 16 players · ₹5,000 ───────────────────────────────────────
    { id: 88, Name: "Veeresh Kurni", utr: 3.0, price: 5000 },
    { id: 89, Name: "Srinath Elitem", utr: 3.0, price: 5000 },
    { id: 90, Name: "Prashant Janmatti", utr: 3.0, price: 5000 },
    { id: 91, Name: "Rajesh Mishra", utr: 3.0, price: 5000 },
    { id: 92, Name: "Samir Junnarkar", utr: 3.0, price: 5000 },
    { id: 93, Name: "Amol Patwardhan", utr: 3.0, price: 5000 },
    { id: 94, Name: "Shiva Kumar", utr: 3.0, price: 5000 },
    { id: 95, Name: "Harsha Beeram", utr: 3.0, price: 5000 },
    { id: 96, Name: "Raj Chava", utr: 3.0, price: 5000 },
    { id: 97, Name: "Vijay Gate", utr: 3.0, price: 5000 },
    { id: 98, Name: "Vinoth Duraisamy", utr: 3.0, price: 5000 },
    { id: 103, Name: "Azim", utr: 3.0, price: 5000 },
    { id: 104, Name: "Raja M", utr: 3.0, price: 5000 },
    { id: 105, Name: "Jayesh", utr: 3.0, price: 5000 },
    { id: 109, Name: "Raghu G", utr: 3.0, price: 5000 },
    { id: 112, Name: "Kalyan Ghanta", utr: 3.0, price: 5000 },
];
const TEAMS = [
    { id: 1, name: "Rally Royals 👑", captain: "Yogesh Dhadge" },
    { id: 2, name: "Karna's Crusaders ⚔️", captain: "Srikant Tenni" },
    { id: 3, name: "Spin Kings 🎾👑", captain: "Uma Vommi" },
    { id: 4, name: "KOC Challengers 🏆", captain: "Narayan Prasad" },
    { id: 5, name: "Rally Squad 🎾", captain: "Ritesh Kumar" },
    { id: 6, name: "POSH 😎", captain: "Vinod Aripaka" },
    { id: 7, name: "Chill Titans ❄️⚔️", captain: "Satish Reddy Orugunta" },
    { id: 8, name: "Mega Lions 🦁", captain: "Anil Kunda" },
    { id: 9, name: "Court Conquerors 🏹", captain: "Rajasekhar Chintha" },
    { id: 10, name: "Royal Chill Badgers 🦡", captain: "Krishna Vennapusa" },
    { id: 11, name: "Volly Vipers 🐍", captain: "Magi Kailas" },
    { id: 12, name: "Dallas Chargers ⚡", captain: "Vivek Reddy" },
    { id: 13, name: "Grand Slam Gladiators 🏛️⚔️", captain: "Sashank T" },
    { id: 14, name: "Deuce Devils 😈", captain: "Hari Mothukuri" },
    { id: 15, name: "Chill Super Kings 👑❄️", captain: "Anand Krishnamoorthy" },
    { id: 16, name: "Smash Masters 💥🎾", captain: "Dinkar Bhardwaj" },
];
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
    { code: "ADMIN", label: "Admin · Auctioneer", role: "admin", teamId: null },
    ...TEAMS.map(t => ({ code: `TEAM${t.id}`, label: `Team ${t.id} · ${t.captain}`, role: "captain", teamId: t.id }))
];
// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = n => (n || 0).toLocaleString();
const toArr = v => Array.isArray(v) ? v.filter(x => x != null) : (v && typeof v === "object" ? Object.keys(v).sort((a, b) => parseInt(a) - parseInt(b)).map(k => v[k]) : []);
const pref = (k, d) => { try {
    const v = localStorage.getItem(k);
    return v === null ? d : JSON.parse(v);
}
catch (e) {
    return d;
} };
const savePref = (k, v) => { try {
    localStorage.setItem(k, JSON.stringify(v));
}
catch (e) { } };
function normalize(data) {
    if (!data)
        return null;
    const teams = toArr(data.teams).map(t => ({ ...t, players: toArr(t.players) }));
    const rawPools = data.playerPools || {};
    const playerPools = {};
    POOL_ORDER.forEach(k => { playerPools[k] = toArr(rawPools[k]); });
    let cb = data.currentBids || {};
    if (Array.isArray(cb))
        cb = Object.fromEntries(cb.map((v, i) => [String(i), v]).filter(([, v]) => v));
    const currentBids = {};
    Object.entries(cb).forEach(([k, v]) => { currentBids[String(k)] = v; });
    return { ...data, teams, playerPools, currentBids,
        currentPoolIndex: data.currentPoolIndex || 0,
        currentPlayerIndex: data.currentPlayerIndex || 0,
        timerEnd: data.timerEnd || Date.now() };
}
function getEffective(state) {
    const pools = state.playerPools;
    let effPool = state.currentPoolIndex;
    while (effPool < POOL_ORDER.length && (pools[POOL_ORDER[effPool]] || []).length === 0)
        effPool++;
    if (effPool >= POOL_ORDER.length)
        return { complete: true };
    const pool = pools[POOL_ORDER[effPool]] || [];
    const effPlayer = effPool === state.currentPoolIndex
        ? Math.min(state.currentPlayerIndex, Math.max(0, pool.length - 1))
        : 0;
    return { complete: false, effPool, effPlayer, poolKey: POOL_ORDER[effPool], pool, player: pool[effPlayer] || null };
}
function getInitialTeams() {
    const byName = Object.fromEntries(PLAYERS.map(p => [p.Name, p]));
    return TEAMS.map(team => {
        const cap = byName[team.captain];
        const price = cap?.price || 0;
        return { ...team, budget: TEAM_BUDGET - price, totalSpent: price,
            players: cap ? [{ id: `c${team.id}`, Name: cap.Name, utr: cap.utr, acquiredPrice: price }] : [] };
    });
}
function freshPools() {
    const p = {};
    POOL_ORDER.forEach(k => { p[k] = PLAYER_POOLS[k].map(x => ({ ...x })); });
    return p;
}
function initialDoc(sid) {
    return { sessionId: sid, teams: getInitialTeams(), playerPools: freshPools(),
        currentPoolIndex: 0, currentPlayerIndex: 0, currentBids: {},
        timerEnd: Date.now() + TIMER_MS, lastUpdate: Date.now() };
}
// ─── Login screen ─────────────────────────────────────────────────────────────
function Login({ onLogin }) {
    const [account, setAccount] = useState(ACCOUNTS[0]);
    const [pin, setPin] = useState("");
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        setError(null);
        if (pin.length < 6) {
            setError("Enter your 6-digit PIN");
            return;
        }
        setBusy(true);
        try {
            const snap = await db.ref(`users/${account.code}`).once("value");
            const user = snap.val();
            if (!user || !user.pin) {
                setError("Account not set up yet. Ask the admin to configure PINs.");
                setBusy(false);
                return;
            }
            if (user.pin !== pin) {
                setError("Wrong PIN");
                setBusy(false);
                return;
            }
            onLogin({ code: user.code, role: user.role, teamId: user.teamId, name: account.label });
        }
        catch (e) {
            setError("Error: " + e.message);
            setBusy(false);
        }
    };
    return (React.createElement("div", { className: "login-wrap" },
        React.createElement("div", { className: "login-title" }, "\uD83C\uDFBE TENNIS AUCTION"),
        React.createElement("div", { className: "login-sub" }, "Live player draft \u00B7 Real-time sync"),
        React.createElement("div", { className: "field-wrap" },
            React.createElement("div", { className: "field-label" }, "ACCOUNT"),
            React.createElement("select", { value: account.code, onChange: e => setAccount(ACCOUNTS.find(a => a.code === e.target.value)) }, ACCOUNTS.map(a => React.createElement("option", { key: a.code, value: a.code }, a.label)))),
        React.createElement("div", { className: "field-wrap" },
            React.createElement("div", { className: "field-label" }, "6-DIGIT PIN"),
            React.createElement("input", { type: "password", value: pin, maxLength: 6, inputMode: "numeric", placeholder: "\u25CF \u25CF \u25CF \u25CF \u25CF \u25CF", style: { letterSpacing: 8, textAlign: "center", fontSize: 20 }, onChange: e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6)), onKeyDown: e => e.key === "Enter" && submit() })),
        error && React.createElement("div", { className: "login-error" }, error),
        React.createElement("button", { className: "btn btn-primary", onClick: submit, disabled: busy || pin.length < 6, style: { marginTop: 8 } }, busy ? "Signing in…" : "Sign In")));
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
        }).catch(e => setMsg({ code: "ALL", text: `Could not load PINs: ${e.message}`, ok: false }));
    }, []);
    const save = async (account) => {
        const pin = pins[account.code] || "";
        if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
            setMsg({ code: account.code, text: "Must be 6 digits", ok: false });
            return;
        }
        setSaving(account.code);
        try {
            await db.ref(`users/${account.code}`).set({
                code: account.code,
                pin,
                role: account.role,
                teamId: account.teamId || null,
                name: account.label
            });
            setMsg({ code: account.code, text: "Saved", ok: true });
            setTimeout(() => setMsg(null), 2000);
        }
        catch (e) {
            setMsg({ code: account.code, text: `Save failed: ${e.message}`, ok: false });
        }
        finally {
            setSaving(null);
        }
    };
    const saveAll = async () => {
        const invalid = ACCOUNTS.find(a => { const p = pins[a.code] || ""; return p.length !== 6 || !/^\d{6}$/.test(p); });
        if (invalid) {
            setMsg({ code: "ALL", text: `Invalid PIN for ${invalid.label}`, ok: false });
            return;
        }
        setSaving("ALL");
        const updates = {};
        ACCOUNTS.forEach(a => {
            updates[`users/${a.code}`] = { code: a.code, pin: pins[a.code], role: a.role, teamId: a.teamId || null, name: a.label };
        });
        try {
            await db.ref().update(updates);
            setMsg({ code: "ALL", text: "All PINs saved", ok: true });
            setTimeout(() => setMsg(null), 2000);
        }
        catch (e) {
            setMsg({ code: "ALL", text: `Save failed: ${e.message}`, ok: false });
        }
        finally {
            setSaving(null);
        }
    };
    return (React.createElement("div", { className: "card", style: { marginTop: 16 } },
        React.createElement("div", { className: "card-title" }, "Manage PINs"),
        React.createElement("div", { className: "card-sub" }, "Set or update 6-digit PINs for each account. Changes take effect immediately."),
        React.createElement("div", { style: { maxHeight: 320, overflowY: "auto", marginTop: 10 } }, ACCOUNTS.map(a => (React.createElement("div", { key: a.code, style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
            React.createElement("div", { style: { flex: 1, fontSize: 12, color: "#ccc", minWidth: 160 } }, a.label),
            React.createElement("input", { type: "password", maxLength: 6, inputMode: "numeric", placeholder: "\u25CF \u25CF \u25CF \u25CF \u25CF \u25CF", value: pins[a.code] || "", style: { width: 110, letterSpacing: 4, textAlign: "center", padding: "6px 8px", background: "#1a1f2e", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 14 }, onChange: e => setPins(p => ({ ...p, [a.code]: e.target.value.replace(/\D/g, "").slice(0, 6) })) }),
            React.createElement("button", { className: "btn btn-neutral", style: { width: "auto", padding: "6px 12px", fontSize: 12 }, onClick: () => save(a), disabled: saving === a.code || saving === "ALL" }, saving === a.code ? "…" : "Save"),
            msg && msg.code === a.code && React.createElement("span", { style: { fontSize: 11, color: msg.ok ? "#4caf50" : "#f44" } }, msg.text))))),
        React.createElement("button", { className: "btn btn-primary", style: { marginTop: 12 }, onClick: saveAll, disabled: !!saving }, saving === "ALL" ? "Saving all…" : "Save All PINs"),
        msg && msg.code === "ALL" && React.createElement("div", { style: { marginTop: 6, fontSize: 12, color: msg.ok ? "#4caf50" : "#f44" } }, msg.text)));
}
// ─── Pool Viewer (admin) ──────────────────────────────────────────────────────
const UTR_COLORS = {
    6.0: { bg: "rgba(232,184,75,.15)", border: "rgba(232,184,75,.4)", text: "#e8b84b" },
    5.5: { bg: "rgba(155,135,245,.15)", border: "rgba(155,135,245,.4)", text: "#9b87f5" },
    5.0: { bg: "rgba(74,144,217,.15)", border: "rgba(74,144,217,.4)", text: "#4a90d9" },
    4.5: { bg: "rgba(0,212,168,.15)", border: "rgba(0,212,168,.4)", text: "#00d4a8" },
    4.0: { bg: "rgba(30,201,122,.15)", border: "rgba(30,201,122,.4)", text: "#1ec97a" },
    3.5: { bg: "rgba(224,92,110,.15)", border: "rgba(224,92,110,.4)", text: "#e05c6e" },
    3.0: { bg: "rgba(90,114,153,.15)", border: "rgba(90,114,153,.4)", text: "#5a7299" },
};
const POOL_LABELS = {
    6.0: "Elite · UTR 6.0", 5.5: "Advanced · UTR 5.5", 5.0: "Strong · UTR 5.0",
    4.5: "Int-Adv · UTR 4.5", 4.0: "Intermediate · UTR 4.0",
    3.5: "Developing · UTR 3.5", 3.0: "Beginner · UTR 3.0",
};
function fmtR(n) { return "₹" + n.toLocaleString("en-IN"); }
function PoolViewer() {
    const [open, setOpen] = useState({});
    const toggle = k => setOpen(o => ({ ...o, [k]: !o[k] }));
    const totalPlayers = POOL_ORDER.reduce((s, k) => s + PLAYER_POOLS[k].length, 0);
    return (React.createElement("div", { className: "card", style: { padding: "18px" } },
        React.createElement("div", { className: "card-title", style: { marginBottom: 4 } }, "\uD83C\uDFBE Auction Pools"),
        React.createElement("div", { className: "card-sub", style: { marginBottom: 14 } },
            totalPlayers,
            " players across ",
            POOL_ORDER.filter(k => PLAYER_POOLS[k].length > 0).length,
            " pools \u00B7 auction runs highest UTR first"),
        POOL_ORDER.map(key => {
            const utr = getUTR(key);
            const players = PLAYER_POOLS[key];
            if (!players || players.length === 0)
                return null;
            const col = UTR_COLORS[utr] || UTR_COLORS[3.0];
            const isOpen = !!open[key];
            return (React.createElement("div", { key: key, className: "pool-section" },
                React.createElement("div", { className: `pool-header${isOpen ? " open" : ""}`, style: { background: `linear-gradient(135deg,${col.bg},var(--surface3))` }, onClick: () => toggle(key) },
                    React.createElement("div", { className: "pool-header-left" },
                        React.createElement("span", { className: "pool-utr-badge", style: { background: col.bg, border: `1px solid ${col.border}`, color: col.text } },
                            "UTR ",
                            utr.toFixed(1)),
                        React.createElement("div", null,
                            React.createElement("div", { className: "pool-header-title" }, POOL_LABELS[utr]),
                            React.createElement("div", { className: "pool-header-meta" },
                                players.length,
                                " players \u00B7 base ",
                                fmtR(players[0]?.price || 0)))),
                    React.createElement("span", { className: `pool-chevron${isOpen ? " open" : ""}` }, "\u25BC")),
                isOpen && (React.createElement("div", { className: "pool-body" }, players.map((p, i) => {
                    const isCap = CAPTAIN_NAMES.has(p.Name);
                    return (React.createElement("div", { key: p.id, className: "pool-player-row" },
                        React.createElement("span", { className: "pool-player-num" }, i + 1),
                        React.createElement("span", { className: "pool-player-name" }, p.Name),
                        isCap && React.createElement("span", { className: "pool-player-cap" }, "CAPTAIN"),
                        React.createElement("span", { className: "pool-player-price" }, fmtR(p.price))));
                })))));
        })));
}
// ─── Session lobby ────────────────────────────────────────────────────────────
function Lobby({ user, onJoin, onLogout }) {
    const [joinId, setJoinId] = useState("");
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState(null);
    const createNew = async () => {
        setCreating(true);
        setError(null);
        try {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let sid = "";
            let exists = true;
            for (let tries = 0; tries < 5 && exists; tries++) {
                sid = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                exists = (await db.ref(`auctions/${sid}`).once("value")).exists();
            }
            if (exists)
                throw new Error("Could not find an unused session ID. Try again.");
            await db.ref(`auctions/${sid}`).set(initialDoc(sid));
            onJoin(sid);
        }
        catch (e) {
            setError(`Could not create auction: ${e.message}`);
        }
        finally {
            setCreating(false);
        }
    };
    const joinExisting = async () => {
        const id = joinId.trim().toUpperCase();
        if (!id) {
            setError("Enter a session ID");
            return;
        }
        setJoining(true);
        setError(null);
        try {
            const snap = await db.ref(`auctions/${id}`).once("value");
            if (!snap.exists()) {
                setError(`Session ${id} not found`);
                return;
            }
            onJoin(id);
        }
        catch (e) {
            setError(`Could not join auction: ${e.message}`);
        }
        finally {
            setJoining(false);
        }
    };
    const poolPlayers = POOL_ORDER.reduce((s, k) => s + PLAYER_POOLS[k].length, 0);
    return (React.createElement("div", { className: "setup-wrap" },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 } },
            React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 11, color: "#888" } }, "Signed in as"),
                React.createElement("div", { style: { fontWeight: 700, color: "#fff" } }, user.name)),
            React.createElement("button", { className: "btn btn-neutral", style: { width: "auto", padding: "8px 16px", fontSize: 13 }, onClick: onLogout }, "Log out")),
        error && React.createElement("div", { className: "error-banner" }, error),
        user.role === "admin" ? (React.createElement(React.Fragment, null,
            React.createElement("div", { className: "card" },
                React.createElement("div", { className: "card-title" }, "Start new auction"),
                React.createElement("div", { className: "card-sub" }, "Creates a fresh session. Share the 6-letter ID with all captains."),
                React.createElement("button", { className: "btn btn-primary", onClick: createNew, disabled: creating }, creating ? "Creating…" : "Create New Auction")),
            React.createElement(ManagePins, null),
            React.createElement(PoolViewer, null))) : (React.createElement("div", { className: "card", style: { borderColor: "#4f9eff", background: "#0f1420" } },
            React.createElement("div", { className: "card-title" },
                "\uD83D\uDC4B Hi, ",
                user.name.split("·")[1]?.trim()),
            React.createElement("div", { className: "card-sub" }, "Ask the Auctioneer for the Session ID, then join below."))),
        React.createElement("div", { className: "or-row" },
            React.createElement("div", { className: "line" }),
            React.createElement("span", null, "OR JOIN EXISTING"),
            React.createElement("div", { className: "line" })),
        React.createElement("div", { className: "card" },
            React.createElement("input", { className: "code-input", type: "text", placeholder: "ABC123", maxLength: 6, value: joinId, onChange: e => setJoinId(e.target.value.toUpperCase()), onKeyDown: e => e.key === "Enter" && joinExisting() }),
            React.createElement("button", { className: "btn btn-neutral", style: { marginTop: 10 }, onClick: joinExisting, disabled: joining || !joinId.trim() }, joining ? "Joining…" : "Join Auction")),
        React.createElement("div", { className: "health-panel" },
            React.createElement("div", { style: { fontWeight: 700, color: "#aaa", marginBottom: 6 } }, "Setup check"),
            React.createElement("div", { className: "health-row" },
                React.createElement("span", null, "Teams"),
                React.createElement("span", { className: TEAMS.length === 16 ? "health-ok" : "health-bad" },
                    TEAMS.length,
                    " / 16")),
            React.createElement("div", { className: "health-row" },
                React.createElement("span", null, "Pool players"),
                React.createElement("span", null, poolPlayers)),
            React.createElement("div", { className: "health-row" },
                React.createElement("span", null, "Total players"),
                React.createElement("span", null, PLAYERS.length)),
            POOL_ORDER.map(key => {
                const c = PLAYER_POOLS[key].length;
                return React.createElement("div", { className: "health-row", key: key },
                    React.createElement("span", null,
                        "UTR ",
                        getUTR(key)),
                    React.createElement("span", { style: { color: "#666" } }, c === 0 ? "auto-skipped" : `${c} players · max ${POOL_CAPS[key]}/team`));
            }))));
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
    const [showRosters, setShowRosters] = useState(() => pref("ta_rosters", true));
    const [pinnedTeam, setPinnedTeam] = useState(() => pref("ta_pin", null));
    const auctionRef = useRef(db.ref(`auctions/${sid}`));
    // Real-time listener
    useEffect(() => {
        const connRef = db.ref(".info/connected");
        connRef.on("value", s => setConnected(s.val() === true));
        auctionRef.current.on("value", snap => {
            if (snap.exists()) {
                setState(normalize(snap.val()));
                setConnected(true);
            }
            else
                setConnected(false);
        });
        return () => { connRef.off(); auctionRef.current.off(); };
    }, [sid]);
    // Timer
    useEffect(() => {
        if (!state?.timerEnd)
            return;
        const iv = setInterval(() => setTimeLeft(Math.max(0, Math.floor((state.timerEnd - Date.now()) / 1000))), 200);
        return () => clearInterval(iv);
    }, [state?.timerEnd]);
    const fbUpdate = updates => auctionRef.current.update({ ...updates, lastUpdate: Date.now() });
    const toggleRosters = () => { const n = !showRosters; setShowRosters(n); savePref("ta_rosters", n); };
    const togglePin = id => { const n = pinnedTeam === id ? null : id; setPinnedTeam(n); savePref("ta_pin", n); };
    const placeBid = (teamId, amount) => {
        const n = parseInt(amount) || 0;
        if (!eff?.player)
            return;
        const err = validateBid(teamId, n);
        if (err) {
            setBidErrors(p => ({ ...p, [teamId]: err }));
            return;
        }
        if (timeLeft === 0) {
            setBidErrors(p => ({ ...p, [teamId]: "Time is up!" }));
            return;
        }
        setBidErrors(p => ({ ...p, [teamId]: null }));
        auctionRef.current.child("currentBids").transaction(cur => {
            const bids = cur || {};
            const taken = Object.entries(bids).some(([tid, b]) => parseInt(tid) !== teamId && b === n);
            if (taken)
                return; // abort
            return { ...bids, [teamId]: n };
        }, (err, committed) => {
            if (!committed)
                setBidErrors(p => ({ ...p, [teamId]: "Amount taken — bid higher" }));
            else {
                setBidInputs(p => ({ ...p, [teamId]: "" }));
                auctionRef.current.update({ lastUpdate: Date.now() });
            }
        });
    };
    const validateBid = (teamId, amount) => {
        if (!eff?.player)
            return "No player";
        const team = state.teams.find(t => t.id === teamId);
        if (!team)
            return "Team not found";
        if (team.players.length >= TEAM_SIZE)
            return `Team full`;
        const utr = getUTR(eff.poolKey);
        const fromPool = team.players.slice(1).filter(p => p.utr === utr).length;
        if (fromPool >= (POOL_CAPS[eff.poolKey] || 0))
            return `Max ${POOL_CAPS[eff.poolKey]} at UTR ${utr}`;
        if (!amount || amount <= 0)
            return "Enter amount";
        if (amount < eff.player.price)
            return `Min $${fmt(eff.player.price)}`;
        if ((amount - eff.player.price) % 1000 !== 0)
            return "Base + $1k increments";
        const dup = state.teams.find(t => t.id !== teamId && (state.currentBids[String(t.id)] || 0) === amount);
        if (dup)
            return `$${fmt(amount)} taken by ${dup.name}`;
        if (amount > team.budget)
            return "Exceeds budget";
        const rem = TEAM_SIZE - team.players.length;
        const minNeeded = rem > 1 ? (rem - 1) * 5000 : 0;
        if (amount > team.budget - minNeeded)
            return `Need $${fmt(minNeeded)} for ${rem - 1} more`;
        return null;
    };
    const finalize = () => {
        if (!eff?.player)
            return;
        const bids = Object.entries(state.currentBids).map(([tid, b]) => ({ teamId: parseInt(tid), bid: b })).filter(x => x.bid > 0);
        if (!bids.length) {
            setActionError("No bids — use Skip");
            return;
        }
        const highest = Math.max(...bids.map(b => b.bid));
        const winners = bids.filter(b => b.bid === highest);
        if (winners.length > 1) {
            setActionError(`Tie between ${winners.map(w => state.teams.find(t => t.id === w.teamId)?.name).join(", ")} — place different bids`);
            return;
        }
        const winId = winners[0].teamId;
        const teams = state.teams.map(t => {
            if (t.id !== winId)
                return t;
            return { ...t, players: [...t.players, { ...eff.player, acquiredPrice: highest }], budget: t.budget - highest, totalSpent: t.totalSpent + highest };
        });
        const pools = { ...state.playerPools };
        const pool = [...pools[eff.poolKey]];
        pool.splice(eff.effPlayer, 1);
        pools[eff.poolKey] = pool;
        let nextPool = eff.effPool, nextPlayer = eff.effPlayer;
        if (eff.effPlayer >= pool.length) {
            nextPool = eff.effPool + 1;
            nextPlayer = 0;
        }
        fbUpdate({ teams, playerPools: pools, currentPoolIndex: nextPool, currentPlayerIndex: nextPlayer, currentBids: {}, timerEnd: Date.now() + TIMER_MS });
        setBidInputs({});
        setBidErrors({});
        setActionError(null);
    };
    const skip = () => {
        if (!eff?.player)
            return;
        const pools = { ...state.playerPools };
        const pool = [...pools[eff.poolKey]];
        const [skipped] = pool.splice(eff.effPlayer, 1);
        const hasLaterPlayersInPool = eff.effPlayer < pool.length;
        if (hasLaterPlayersInPool) {
            pool.push({ ...skipped, isRetry: true, retryCount: (skipped.retryCount || 0) + 1 });
        }
        pools[eff.poolKey] = pool;
        let nextPool = eff.effPool, nextPlayer = eff.effPlayer;
        if (eff.effPlayer >= pool.length) {
            nextPool = eff.effPool + 1;
            nextPlayer = 0;
        }
        fbUpdate({ playerPools: pools, currentPoolIndex: nextPool, currentPlayerIndex: nextPlayer, currentBids: {}, timerEnd: Date.now() + TIMER_MS });
        setBidInputs({});
        setBidErrors({});
        setActionError(null);
    };
    const reset = () => {
        auctionRef.current.set(initialDoc(sid));
        setBidInputs({});
        setBidErrors({});
        setActionError(null);
        setResetOpen(false);
    };
    if (!state)
        return React.createElement("div", { style: { textAlign: "center", padding: 40, color: "#888" } },
            "Loading auction ",
            sid,
            "\u2026");
    const eff = getEffective(state);
    const isAdmin = user.role === "admin";
    const myTeamId = user.teamId;
    // Auction complete
    if (eff.complete || !eff.player) {
        return (React.createElement("div", null,
            React.createElement("div", { className: "top-bar" },
                React.createElement("h1", null, "\uD83C\uDFBE TENNIS AUCTION"),
                React.createElement("div", { className: "sync-dot" },
                    React.createElement("div", { className: `dot ${connected ? "dot-green" : "dot-red"}` }),
                    connected ? "Live" : "Offline")),
            React.createElement("div", { className: "complete-banner" },
                "\uD83C\uDFC6 Auction Complete \u00B7 Session ",
                sid),
            isAdmin && React.createElement("div", { style: { textAlign: "center", marginBottom: 12 } },
                React.createElement("button", { className: "btn btn-danger", style: { width: "auto", padding: "10px 24px" }, onClick: () => setResetOpen(true) }, "Reset Auction")),
            React.createElement("div", { className: "rosters-grid" }, state.teams.map(t => React.createElement(RosterCard, { key: t.id, team: t }))),
            resetOpen && React.createElement(ResetModal, { onCancel: () => setResetOpen(false), onConfirm: reset })));
    }
    const bids = Object.entries(state.currentBids).map(([tid, b]) => ({ teamId: parseInt(tid), bid: b })).filter(x => x.bid > 0);
    const highest = bids.length ? Math.max(...bids.map(b => b.bid)) : 0;
    const winners = bids.filter(b => b.bid === highest);
    const hasBids = bids.length > 0;
    const warn = timeLeft <= 10;
    const pct = Math.min(100, Math.round(((eff.effPool + (eff.effPlayer / Math.max(1, eff.pool.length))) / POOL_ORDER.length) * 100));
    const teamStatusFor = team => {
        const teamBid = state.currentBids[String(team.id)] || 0;
        const isWin = teamBid > 0 && teamBid === highest && winners.length === 1;
        const isTie = teamBid > 0 && teamBid === highest && winners.length > 1;
        return { teamBid, isWin, isTie };
    };
    const sortedTeams = [...state.teams].map(t => {
        const isDisabled = t.players.length >= TEAM_SIZE || t.budget < eff.player.price ||
            (t.players.slice(1).filter(p => p.utr === getUTR(eff.poolKey)).length >= (POOL_CAPS[eff.poolKey] || 0));
        return { ...t, isDisabled, isPinned: pinnedTeam === t.id };
    }).sort((a, b) => {
        if (a.isPinned !== b.isPinned)
            return a.isPinned ? -1 : 1;
        if (!isAdmin && a.id === myTeamId)
            return -1;
        if (!isAdmin && b.id === myTeamId)
            return 1;
        if (a.isDisabled !== b.isDisabled)
            return a.isDisabled ? 1 : -1;
        return 0;
    });
    return (React.createElement("div", null,
        React.createElement("div", { className: "top-bar" },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                React.createElement("button", { onClick: onBack, className: "session-back" }, "\u2039"),
                React.createElement("div", null,
                    React.createElement("div", { className: "session-label" }, "Session"),
                    React.createElement("div", { className: "session-id" }, sid))),
            React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
                React.createElement("div", { className: "sync-dot" },
                    React.createElement("div", { className: `dot ${connected ? "dot-green" : "dot-red"}` }),
                    connected ? "Live" : "Offline"),
                isAdmin && React.createElement("button", { className: "btn btn-danger", style: { width: "auto", padding: "7px 14px", fontSize: 12, borderRadius: 8 }, onClick: () => setResetOpen(true) }, "Reset"))),
        React.createElement("div", { className: "progress-wrap" },
            React.createElement("div", { className: "progress-track" },
                React.createElement("div", { className: "progress-fill", style: { width: pct + "%" } })),
            React.createElement("div", { className: "progress-text" },
                "UTR ",
                getUTR(eff.poolKey),
                " pool \u00B7 ",
                pct,
                "% complete \u00B7 ",
                state.teams.length,
                " teams")),
        React.createElement("div", { className: `sticky-bar`, style: warn ? { borderColor: "rgba(255,77,106,.7)" } : {} },
            React.createElement("div", { className: "sb-left" },
                React.createElement("div", { className: "sb-player" },
                    eff.player.Name,
                    eff.player.isRetry && React.createElement("span", { className: "sb-retry" },
                        " \u00B7 Retry #",
                        eff.player.retryCount)),
                React.createElement("div", { className: "sb-meta" },
                    "UTR ",
                    eff.player.utr,
                    " \u00B7 base $",
                    fmt(eff.player.price),
                    " \u00B7 ",
                    eff.effPlayer + 1,
                    "/",
                    eff.pool.length,
                    " in pool"),
                highest > 0 && React.createElement("div", { className: "sb-high" },
                    "High $",
                    fmt(highest),
                    winners.length === 1 ? " · " + state.teams.find(t => t.id === winners[0].teamId)?.name : winners.length > 1 ? " · TIE" : "")),
            React.createElement("div", { className: `sb-timer ${warn ? "warn" : ""}` },
                timeLeft,
                "s")),
        actionError && React.createElement("div", { className: "error-banner", onClick: () => setActionError(null) },
            actionError,
            " \u2715"),
        isAdmin && (React.createElement("div", { className: "admin-bar" },
            React.createElement("button", { className: "btn btn-neutral", onClick: skip }, "Skip"),
            React.createElement("button", { className: `btn ${hasBids && winners.length === 1 ? "btn-success" : "btn-neutral"}`, disabled: !hasBids || winners.length !== 1, onClick: finalize }, !hasBids ? "No Bids" : winners.length > 1 ? `Tie (${winners.length})` : `Award → ${state.teams.find(t => t.id === winners[0].teamId)?.name}`))),
        React.createElement("div", { className: "bidding-grid" }, sortedTeams.map(team => {
            const { teamBid, isWin, isTie } = teamStatusFor(team);
            const isMyTeam = !isAdmin && team.id === myTeamId;
            if (team.isDisabled && !isMyTeam) {
                const reason = team.players.length >= TEAM_SIZE ? "Full" : team.budget < eff.player.price ? "Low budget" : `UTR cap`;
                return (React.createElement("div", { key: team.id, className: "bid-card disabled-card" },
                    React.createElement("span", { className: "disabled-team-name" },
                        team.name,
                        " \u00B7 ",
                        team.players.length,
                        "/",
                        TEAM_SIZE),
                    React.createElement("span", { className: "disabled-reason" }, reason)));
            }
            const anchor = highest > 0 ? highest + 1000 : eff.player.price;
            const chips = [anchor, anchor + 1000, anchor + 2000].filter(v => v <= team.budget);
            return (React.createElement("div", { key: team.id, className: `bid-card ${isWin ? "winning" : ""} ${isTie ? "tied" : ""} ${team.isPinned ? "pinned" : ""}` },
                React.createElement("div", { className: "bid-card-head" },
                    React.createElement("div", { className: "bid-team-info" },
                        React.createElement("div", { className: "team-name" },
                            team.name,
                            isMyTeam && React.createElement("span", { className: "team-you-tag" }, "YOU")),
                        React.createElement("div", { className: "team-captain" },
                            "\u2B50 ",
                            team.captain),
                        React.createElement("div", { className: "team-budget-row" },
                            React.createElement("span", { className: "team-budget-pill team-budget-left" },
                                "$",
                                fmt(team.budget)),
                            React.createElement("span", { className: "team-slots" },
                                team.players.length,
                                "/",
                                TEAM_SIZE,
                                " players"))),
                    React.createElement("button", { className: `pin-btn ${team.isPinned ? "pinned" : ""}`, onClick: () => togglePin(team.id), title: "Pin team" }, "\uD83D\uDCCC")),
                (isAdmin || isMyTeam) && (React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "bid-divider" }),
                    React.createElement("div", { className: "bid-input-wrap" },
                        React.createElement("input", { type: "number", inputMode: "numeric", className: "bid-input", placeholder: `Min $${fmt(eff.player.price)}`, value: bidInputs[team.id] || "", disabled: timeLeft === 0, onChange: e => { setBidInputs(p => ({ ...p, [team.id]: e.target.value })); setBidErrors(p => ({ ...p, [team.id]: null })); }, onKeyDown: e => e.key === "Enter" && bidInputs[team.id] && placeBid(team.id, bidInputs[team.id]) }),
                        React.createElement("div", { className: "quick-chips" }, chips.map(v => React.createElement("button", { key: v, className: "chip", disabled: timeLeft === 0, onClick: () => { setBidInputs(p => ({ ...p, [team.id]: String(v) })); setBidErrors(p => ({ ...p, [team.id]: null })); } },
                            "$",
                            v / 1000,
                            "k"))),
                        bidErrors[team.id] && React.createElement("div", { className: "bid-error" }, bidErrors[team.id]),
                        React.createElement("button", { className: "btn btn-primary place-bid-btn", disabled: !bidInputs[team.id] || timeLeft === 0, onClick: () => placeBid(team.id, bidInputs[team.id]) }, "Place Bid")))),
                React.createElement("div", { className: "bid-footer" },
                    React.createElement("div", { className: "bid-status" }, teamBid > 0 ? `Current bid: $${fmt(teamBid)}` : ""),
                    isWin && React.createElement("span", { className: "bid-win-badge" }, "WINNING"),
                    isTie && React.createElement("span", { className: "bid-tie-badge" }, "TIED"))));
        })),
        React.createElement("div", { className: "pool-viewer" },
            React.createElement("div", { className: "pool-viewer-title" },
                "Current pool \u00B7 UTR ",
                getUTR(eff.poolKey)),
            React.createElement("div", { className: "pool-grid" }, eff.pool.map((p, i) => (React.createElement("div", { key: p.id || i, className: `pool-chip ${i === eff.effPlayer ? "active" : ""} ${p.isRetry ? "retry" : ""}`, title: p.Name },
                i === eff.effPlayer ? "▶ " : "",
                p.Name.length > 18 ? p.Name.slice(0, 16) + "…" : p.Name,
                p.isRetry && ` (R${p.retryCount})`))))),
        React.createElement("button", { className: "section-toggle", onClick: toggleRosters },
            React.createElement("span", null,
                "Team rosters \u00B7 ",
                state.teams.length,
                " teams"),
            React.createElement("span", null, showRosters ? "Hide ▲" : "Show ▼")),
        showRosters && (React.createElement("div", { className: "rosters-grid" }, state.teams.map(t => React.createElement(RosterCard, { key: t.id, team: t })))),
        resetOpen && React.createElement(ResetModal, { onCancel: () => setResetOpen(false), onConfirm: reset })));
}
function utrClass(utr) {
    if (utr >= 5.5)
        return "utr-55";
    if (utr >= 5.25)
        return "utr-52";
    if (utr >= 5.0)
        return "utr-50";
    if (utr >= 4.5)
        return "utr-45";
    if (utr >= 4.0)
        return "utr-40";
    if (utr >= 3.5)
        return "utr-35";
    return "utr-30";
}
function RosterCard({ team }) {
    const cap = team.players[0];
    const rest = team.players.slice(1);
    const filled = team.players.length;
    const fillPct = Math.round((filled / TEAM_SIZE) * 100);
    return (React.createElement("div", { className: "roster-card" },
        React.createElement("div", { className: "roster-name" },
            team.name,
            React.createElement("span", { style: { fontSize: 10, fontWeight: 600, color: "var(--muted)", marginLeft: 6 } },
                filled,
                "/",
                TEAM_SIZE)),
        React.createElement("div", { className: "roster-budget" },
            React.createElement("span", { className: "roster-spent" },
                "-$",
                fmt(team.totalSpent)),
            React.createElement("span", { className: "roster-left" },
                "$",
                fmt(team.budget),
                " left")),
        React.createElement("div", { style: { height: 3, background: "var(--border)", borderRadius: 99, marginBottom: 8, overflow: "hidden" } },
            React.createElement("div", { style: { height: "100%", width: `${fillPct}%`, borderRadius: 99,
                    background: `linear-gradient(90deg,var(--blue),var(--purple))`, transition: "width .4s" } })),
        cap && (React.createElement("div", { className: "roster-captain-row" },
            React.createElement("span", { className: "roster-captain-star" }, "\u2B50"),
            React.createElement("span", { className: "roster-captain-name" }, cap.Name),
            React.createElement("span", { className: `roster-player-utr ${utrClass(cap.utr)}` }, cap.utr))),
        rest.map((p, i) => (React.createElement("div", { key: p.id, className: "roster-player" },
            React.createElement("span", { className: "roster-player-num" }, i + 2),
            React.createElement("span", { className: "roster-player-name" }, p.Name),
            React.createElement("span", { className: `roster-player-utr ${utrClass(p.utr)}` }, p.utr),
            React.createElement("span", { className: "roster-player-price" },
                "$",
                fmt(p.acquiredPrice))))),
        Array.from({ length: TEAM_SIZE - filled }).map((_, i) => (React.createElement("div", { key: `empty-${i}`, className: "roster-player", style: { opacity: .25 } },
            React.createElement("span", { className: "roster-player-num" }, filled + i + 1),
            React.createElement("span", { className: "roster-player-name", style: { fontStyle: "italic", color: "var(--muted2)" } }, "\u2014 open slot \u2014"))))));
}
function ResetModal({ onCancel, onConfirm }) {
    return (React.createElement("div", { className: "modal-overlay" },
        React.createElement("div", { className: "modal-card" },
            React.createElement("div", { className: "modal-title" }, "Reset auction?"),
            React.createElement("div", { className: "modal-body" }, "Clears all bids and rosters. This cannot be undone."),
            React.createElement("div", { className: "modal-btns" },
                React.createElement("button", { className: "btn btn-neutral", onClick: onCancel }, "Cancel"),
                React.createElement("button", { className: "btn btn-danger", onClick: onConfirm }, "Reset")))));
}
// ─── Root app ─────────────────────────────────────────────────────────────────
function App() {
    const [user, setUser] = useState(() => pref("ta_user", null));
    const [sessionId, setSessionId] = useState(null);
    const handleLogin = u => { setUser(u); savePref("ta_user", u); };
    const handleLogout = () => { setUser(null); savePref("ta_user", null); setSessionId(null); };
    if (!user)
        return React.createElement(Login, { onLogin: handleLogin });
    if (!sessionId)
        return React.createElement(Lobby, { user: user, onJoin: setSessionId, onLogout: handleLogout });
    return React.createElement(Auction, { sid: sessionId, user: user, onBack: () => setSessionId(null) });
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App, null));
