const DATA_KEY = process.env.VERCEL_DB_KEY || "tennis-auction-app:data";
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

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
