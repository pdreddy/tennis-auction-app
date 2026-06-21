import { createSign } from "node:crypto";

const DATA_KEY = process.env.VERCEL_DB_KEY || "tennis-auction-app:data";
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let firebaseAccessToken = null;
let firebaseTokenExpiresAt = 0;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function json(res, status, body) {
    res.statusCode = status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify(body));
}

function pathParts(req) {
    const raw = req.query?.path;
    const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return parts.flatMap(part => String(part).split("/")).filter(Boolean).map(decodeURIComponent);
}

function getAtPath(root, parts) {
    return parts.reduce((node, part) => node == null ? null : node[part], root);
}

function setAtPath(root, parts, value) {
    if (parts.length === 0) return value;
    const next = root && typeof root === "object" ? Array.isArray(root) ? [...root] : {...root} : {};
    let cursor = next;
    parts.slice(0, -1).forEach(part => {
        const current = cursor[part];
        cursor[part] = current && typeof current === "object" ? Array.isArray(current) ? [...current] : {...current} : {};
        cursor = cursor[part];
    });
    cursor[parts[parts.length - 1]] = value;
    return next;
}

function mergeAtPath(root, parts, value) {
    const current = getAtPath(root, parts);
    const merged = current && typeof current === "object" && !Array.isArray(current) && value && typeof value === "object" && !Array.isArray(value)
        ? {...current, ...value}
        : value;
    return setAtPath(root, parts, merged);
}

function applyFirebaseUpdate(root, updates) {
    return Object.entries(updates || {}).reduce((next, [path, value]) => {
        return setAtPath(next, String(path).split("/").filter(Boolean), value);
    }, root || {});
}

function hasSupabase() {
    return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(extra = {}) {
    return {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": "application/json",
        ...extra
    };
}

function supabaseRestUrl(path = "app_kv") {
    return `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`;
}

async function supabaseRequest(path, options = {}) {
    const response = await fetch(supabaseRestUrl(path), {
        ...options,
        headers: supabaseHeaders(options.headers || {})
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
        const message = Array.isArray(body) ? body.map(error => error.message).join(", ") : body?.message || body?.error || `Supabase request failed with ${response.status}`;
        const err = new Error(message);
        err.statusCode = response.status || 500;
        throw err;
    }
    return body;
}

async function supabaseReadRoot() {
    const rows = await supabaseRequest("app_kv?select=key,value");
    return Object.fromEntries((rows || []).map(row => [row.key, row.value]));
}

async function supabaseWriteRoot(root) {
    const rows = Object.entries(root || {}).map(([key, value]) => ({key, value}));
    if (!rows.length) return;
    await supabaseRequest("app_kv?on_conflict=key", {
        method: "POST",
        headers: {prefer: "resolution=merge-duplicates"},
        body: JSON.stringify(rows)
    });
}

async function command(...args) {
    if (!REST_URL || !REST_TOKEN) {
        const err = new Error("Missing Upstash Redis REST environment variables");
        err.statusCode = 500;
        throw err;
    }
    const response = await fetch(REST_URL, {
        method: "POST",
        headers: {
            authorization: `Bearer ${REST_TOKEN}`,
            "content-type": "application/json"
        },
        body: JSON.stringify(args)
    });
    const body = await response.json();
    if (!response.ok || body.error) {
        const err = new Error(body.error || `Redis request failed with ${response.status}`);
        err.statusCode = response.status || 500;
        throw err;
    }
    return body.result;
}

function base64url(value) {
    return Buffer.from(typeof value === "string" ? value : JSON.stringify(value))
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

function signFirebaseJwt(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = {alg: "RS256", typ: "JWT"};
    const claim = {
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
        aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600
    };
    const unsigned = `${base64url(header)}.${base64url(claim)}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(serviceAccount.private_key, "base64url");
    return `${unsigned}.${signature}`;
}

async function getFirebaseAccessToken() {
    if (!FIREBASE_SERVICE_ACCOUNT_JSON) return null;
    if (firebaseAccessToken && Date.now() < firebaseTokenExpiresAt - 60000) return firebaseAccessToken;
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
    const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {"content-type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: signFirebaseJwt(serviceAccount)
        })
    });
    const body = await response.json();
    if (!response.ok) {
        const err = new Error(body.error_description || body.error || `Firebase token request failed with ${response.status}`);
        err.statusCode = response.status || 500;
        throw err;
    }
    firebaseAccessToken = body.access_token;
    firebaseTokenExpiresAt = Date.now() + Number(body.expires_in || 3600) * 1000;
    return firebaseAccessToken;
}

function firebaseUrl() {
    return `${FIREBASE_DATABASE_URL.replace(/\/$/, "")}/.json`;
}

async function firebaseRequest(method, value) {
    if (!FIREBASE_DATABASE_URL) {
        const err = new Error("Missing database environment variables. Set Upstash Redis REST variables or FIREBASE_DATABASE_URL.");
        err.statusCode = 500;
        throw err;
    }
    const token = await getFirebaseAccessToken();
    const headers = {"content-type": "application/json"};
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(firebaseUrl(), {
        method,
        headers,
        body: value === undefined ? undefined : JSON.stringify(value)
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
        const err = new Error(body?.error || `Firebase request failed with ${response.status}`);
        err.statusCode = response.status || 500;
        throw err;
    }
    return body;
}

async function readRoot() {
    if (hasSupabase()) return await supabaseReadRoot();
    if (!REST_URL || !REST_TOKEN) return await firebaseRequest("GET") || {};
    const raw = await command("GET", DATA_KEY);
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    return JSON.parse(raw);
}

async function writeRoot(root) {
    if (hasSupabase()) {
        await supabaseWriteRoot(root || {});
        return;
    }
    if (!REST_URL || !REST_TOKEN) {
        await firebaseRequest("PUT", root || {});
        return;
    }
    await command("SET", DATA_KEY, JSON.stringify(root || {}));
}

async function readBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export default async function handler(req, res) {
    try {
        const parts = pathParts(req);
        if (req.method === "GET") {
            const root = await readRoot();
            return json(res, 200, {value: getAtPath(root, parts) ?? null});
        }
        if (req.method === "PUT") {
            const {value} = await readBody(req);
            const root = await readRoot();
            const next = setAtPath(root, parts, value);
            await writeRoot(next);
            return json(res, 200, {ok: true});
        }
        if (req.method === "PATCH") {
            const {value} = await readBody(req);
            const root = await readRoot();
            const next = parts.length === 0 ? applyFirebaseUpdate(root, value) : mergeAtPath(root, parts, value);
            await writeRoot(next);
            return json(res, 200, {ok: true});
        }
        res.setHeader("allow", "GET, PUT, PATCH");
        return json(res, 405, {error: "Method not allowed"});
    } catch (error) {
        return json(res, error.statusCode || 500, {error: error.message || "Database request failed"});
    }
}
