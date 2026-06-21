const env = import.meta.env || {};
const databaseProvider = env.VITE_DATABASE_PROVIDER || (env.VITE_FIREBASE_DATABASE_URL ? "firebase" : "netlify");
const apiBase = env.VITE_DATABASE_API_BASE || "/api/db";
const pollMs = Number(env.VITE_DATABASE_POLL_MS || env.VITE_VERCEL_DB_POLL_MS || 1000);

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
    databaseURL: env.VITE_FIREBASE_DATABASE_URL || "",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.VITE_FIREBASE_APP_ID || ""
};

export const DATA_PATHS = {
    config: env.VITE_FIREBASE_CONFIG_PATH || "config",
    users: env.VITE_FIREBASE_USERS_PATH || "users",
    auctions: env.VITE_FIREBASE_AUCTIONS_PATH || "auctionsdata",
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

function apiBackedRef(path = "") {
    const timers = new Set();
    return {
        async once(event) {
            if (event !== "value") throw new Error(`Unsupported event: ${event}`);
            if (path === DATA_PATHS.connected) return snapshot(true);
            const {value} = await apiRequest(path);
            return snapshot(value);
        },
        child(childPath) {
            return apiBackedRef([path, childPath].filter(Boolean).join("/"));
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

function missingFirebaseConfig() {
    return !firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId;
}

function createFirebaseDatabase() {
    if (missingFirebaseConfig()) {
        throw new Error("Firebase provider selected but VITE_FIREBASE_API_KEY, VITE_FIREBASE_DATABASE_URL, or VITE_FIREBASE_PROJECT_ID is missing. Set VITE_DATABASE_PROVIDER=netlify for Netlify/Upstash deployments or provide your Firebase environment variables.");
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    return firebase.database();
}

export const db = databaseProvider === "firebase" ? createFirebaseDatabase() : {ref: apiBackedRef};

export const configRef = () => db.ref(DATA_PATHS.config);
export const usersRef = () => db.ref(DATA_PATHS.users);
export const userRef = code => db.ref(`${DATA_PATHS.users}/${code}`);
export const auctionsRef = () => db.ref(DATA_PATHS.auctions);
export const auctionRef = sessionId => db.ref(`${DATA_PATHS.auctions}/${sessionId}`);
export const connectedRef = () => db.ref(DATA_PATHS.connected);
export const rootRef = () => db.ref();
