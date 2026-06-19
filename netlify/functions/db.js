const DATA_KEY = process.env.NETLIFY_DB_KEY || process.env.VERCEL_DB_KEY || "tennis-auction-app:data";
const REST_URL = process.env.NETLIFY_BLOBS_REDIS_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.NETLIFY_BLOBS_REDIS_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;

function response(statusCode, body, headers = {}) {
    return {
        statusCode,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            ...headers
        },
        body: JSON.stringify(body)
    };
}

function pathParts(event) {
    const splat = event.pathParameters?.splat;
    if (splat) return String(splat).split("/").filter(Boolean).map(decodeURIComponent);

    const url = event.rawUrl ? new URL(event.rawUrl) : null;
    const pathname = url?.pathname || event.path || "";
    const rawPath = pathname
        .replace(/^\/api\/db\/?/, "")
        .replace(/^\/\.netlify\/functions\/db\/?/, "");
    return rawPath.split("/").filter(Boolean).map(decodeURIComponent);
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

async function command(...args) {
    if (!REST_URL || !REST_TOKEN) {
        const err = new Error("Missing Upstash Redis REST environment variables");
        err.statusCode = 500;
        throw err;
    }
    const redisResponse = await fetch(REST_URL, {
        method: "POST",
        headers: {
            authorization: `Bearer ${REST_TOKEN}`,
            "content-type": "application/json"
        },
        body: JSON.stringify(args)
    });
    const body = await redisResponse.json();
    if (!redisResponse.ok || body.error) {
        const err = new Error(body.error || `Redis request failed with ${redisResponse.status}`);
        err.statusCode = redisResponse.status || 500;
        throw err;
    }
    return body.result;
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
    const response = await fetch(firebaseUrl(), {
        method,
        headers: {"content-type": "application/json"},
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
    if (!REST_URL || !REST_TOKEN) return await firebaseRequest("GET") || {};
    const raw = await command("GET", DATA_KEY);
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    return JSON.parse(raw);
}

async function writeRoot(root) {
    if (!REST_URL || !REST_TOKEN) {
        await firebaseRequest("PUT", root || {});
        return;
    }
    await command("SET", DATA_KEY, JSON.stringify(root || {}));
}

export async function handler(event) {
    try {
        const parts = pathParts(event);
        if (event.httpMethod === "GET") {
            const root = await readRoot();
            return response(200, {value: getAtPath(root, parts) ?? null});
        }
        if (event.httpMethod === "PUT") {
            const {value} = event.body ? JSON.parse(event.body) : {};
            const root = await readRoot();
            const next = setAtPath(root, parts, value);
            await writeRoot(next);
            return response(200, {ok: true});
        }
        if (event.httpMethod === "PATCH") {
            const {value} = event.body ? JSON.parse(event.body) : {};
            const root = await readRoot();
            const next = parts.length === 0 ? applyFirebaseUpdate(root, value) : mergeAtPath(root, parts, value);
            await writeRoot(next);
            return response(200, {ok: true});
        }
        return response(405, {error: "Method not allowed"}, {allow: "GET, PUT, PATCH"});
    } catch (error) {
        return response(error.statusCode || 500, {error: error.message || "Database request failed"});
    }
}
