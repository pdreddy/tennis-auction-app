const DATA_KEY = process.env.VERCEL_DB_KEY || process.env.NETLIFY_DB_KEY || "tennis-auction-app:data";
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store"
        },
        body: JSON.stringify(body)
    };
}

function pathParts(event) {
    const raw = event.path.replace(/^\/\.netlify\/functions\/db\/?/, "");
    return raw.split("/").filter(Boolean).map(decodeURIComponent);
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

async function readRoot() {
    const raw = await command("GET", DATA_KEY);
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    return JSON.parse(raw);
}

async function writeRoot(root) {
    await command("SET", DATA_KEY, JSON.stringify(root || {}));
}

function readBody(event) {
    if (!event.body) return {};
    const body = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    return JSON.parse(body);
}

export async function handler(event) {
    try {
        const parts = pathParts(event);
        if (event.httpMethod === "GET") {
            const root = await readRoot();
            return json(200, {value: getAtPath(root, parts) ?? null});
        }
        if (event.httpMethod === "PUT") {
            const {value} = readBody(event);
            const root = await readRoot();
            const next = setAtPath(root, parts, value);
            await writeRoot(next);
            return json(200, {ok: true});
        }
        if (event.httpMethod === "PATCH") {
            const {value} = readBody(event);
            const root = await readRoot();
            const next = parts.length === 0 ? applyFirebaseUpdate(root, value) : mergeAtPath(root, parts, value);
            await writeRoot(next);
            return json(200, {ok: true});
        }
        return {
            ...json(405, {error: "Method not allowed"}),
            headers: {allow: "GET, PUT, PATCH", "content-type": "application/json; charset=utf-8", "cache-control": "no-store"}
        };
    } catch (error) {
        return json(error.statusCode || 500, {error: error.message || "Database request failed"});
    }
}
