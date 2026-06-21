const env = import.meta.env || {};
const databaseProvider = env.VITE_DATABASE_PROVIDER || "firebase";
const apiBase = env.VITE_DATABASE_API_BASE || "/api/db";
const pollMs = Number(env.VITE_VERCEL_DB_POLL_MS || 1000);

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCO2SRwIwvqXJwqQNi3NfpDRFoE8DUyXj0",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "pdrdata-bcdc9.firebaseapp.com",
    databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://pdrdata-bcdc9-default-rtdb.firebaseio.com", // confirm region (may be ...<region>.firebasedatabase.app)
    projectId: env.VITE_FIREBASE_PROJECT_ID || "pdrdata-bcdc9",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "pdrdata-bcdc9.firebasestorage.app", // confirm; some projects use ...appspot.com
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "95091760805",
    appId: env.VITE_FIREBASE_APP_ID || "1:95091760805:web:d9232ada50b52e1903374c"
};



export const DATA_PATHS = {
    config: env.VITE_FIREBASE_CONFIG_PATH || "config",
    users: env.VITE_FIREBASE_USERS_PATH || "users",
    auctions: env.VITE_FIREBASE_AUCTIONS_PATH || "koc3auctionsdata",
    connected: ".info/connected"
};

function snapshot(value) {
    return {val: () => value};
}

function apiUrl(path) {
    const clean = String(path || "").split("/").filter(Boolean).map(encodeURIComponent).join("/");
    return clean ? `${apiBase}/${clean}` : apiBase;
}

async function apiRequest(path, options = {}) {
    const response = await fetch(apiUrl(path), {
        ...options,
        headers: {"content-type": "application/json", ...(options.headers || {})}
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `Database request failed with ${response.status}`);
    return body;
}

function vercelRef(path = "") {
    const timers = new Set();
    return {
        async once(event) {
            if (event !== "value") throw new Error(`Unsupported event: ${event}`);
            if (path === DATA_PATHS.connected) return snapshot(true);
            const {value} = await apiRequest(path);
            return snapshot(value);
        },
        child(childPath) {
            return vercelRef([path, childPath].filter(Boolean).join("/"));
        },
        async set(value) {
            await apiRequest(path, {method: "PUT", body: JSON.stringify({value})});
        },
        async update(value) {
            await apiRequest(path, {method: "PATCH", body: JSON.stringify({value})});
        },
        async transaction(updateFn, complete) {
            try {
                const {value} = await apiRequest(path);
                const next = updateFn(value);
                if (next === undefined) {
                    if (complete) complete(null, false, snapshot(value));
                    return;
                }
                await apiRequest(path, {method: "PUT", body: JSON.stringify({value: next})});
                if (complete) complete(null, true, snapshot(next));
            } catch (error) {
                if (complete) complete(error, false);
                else throw error;
            }
        },
        on(event, callback, errorCallback) {
            if (event !== "value") throw new Error(`Unsupported event: ${event}`);
            if (path === DATA_PATHS.connected) {
                callback(snapshot(true));
                return;
            }
            let lastValue;
            const poll = async () => {
                try {
                    const {value} = await apiRequest(path);
                    const serialized = JSON.stringify(value);
                    if (serialized !== lastValue) {
                        lastValue = serialized;
                        callback(snapshot(value));
                    }
                } catch (error) {
                    if (errorCallback) errorCallback(error);
                }
            };
            poll();
            const timer = setInterval(poll, pollMs);
            timers.add(timer);
        },
        off() {
            timers.forEach(clearInterval);
            timers.clear();
        }
    };
}

if (databaseProvider === "firebase") {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
}

export const db = databaseProvider === "firebase" ? firebase.database() : {ref: vercelRef};

export const configRef = () => db.ref(DATA_PATHS.config);
export const usersRef = () => db.ref(DATA_PATHS.users);
export const userRef = code => db.ref(`${DATA_PATHS.users}/${code}`);
export const auctionsRef = () => db.ref(DATA_PATHS.auctions);
export const auctionRef = sessionId => db.ref(`${DATA_PATHS.auctions}/${sessionId}`);
export const connectedRef = () => db.ref(DATA_PATHS.connected);
export const rootRef = () => db.ref();
