import { createSign } from "node:crypto";
import { PLAYERS } from "../src/data/players.js";
import { TEAMS } from "../src/data/teams.js";
import DEFAULT_PINS from "../src/config/pins.json" with { type: "json" };
import { TEAM_BUDGET, TEAM_SIZE, TIMER_MS, ANTI_SNIPE_THRESHOLD_MS, ANTI_SNIPE_EXTENSION_MS } from "../src/data/settings.js";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const databaseUrl = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
const configPath = process.env.FIREBASE_CONFIG_PATH || "config";
const usersPath = process.env.FIREBASE_USERS_PATH || "users";
const auctionsPath = process.env.FIREBASE_AUCTIONS_PATH || "auctionsdata";
const seededAt = Date.now();

if (!serviceAccountJson) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON. Paste the service account JSON into an environment variable; do not commit it.");
}
if (!databaseUrl) {
    throw new Error("Missing FIREBASE_DATABASE_URL, for example https://<project-id>-default-rtdb.firebaseio.com");
}

const serviceAccount = JSON.parse(serviceAccountJson);
const base64url = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

function signJwt() {
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

async function getAccessToken() {
    const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {"content-type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: signJwt()
        })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error_description || body.error || `Token request failed with ${response.status}`);
    return body.access_token;
}

function pathUrl(path) {
    const cleanBase = databaseUrl.replace(/\/$/, "");
    const cleanPath = String(path || "").split("/").filter(Boolean).map(encodeURIComponent).join("/");
    return `${cleanBase}/${cleanPath}.json`;
}

async function put(path, value, token) {
    const response = await fetch(pathUrl(path), {
        method: "PUT",
        headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json"
        },
        body: JSON.stringify(value)
    });
    const bodyText = await response.text();
    if (!response.ok) throw new Error(`Failed to write ${path}: ${response.status} ${bodyText}`);
}

function buildUsers() {
    return Object.fromEntries([
        ["ADMIN", {code: "ADMIN", pin: DEFAULT_PINS.ADMIN, role: "admin", teamId: null, name: "Admin · Auctioneer"}],
        ...TEAMS.map(team => {
            const code = `TEAM${team.id}`;
            return [code, {
                code,
                pin: DEFAULT_PINS[code],
                role: "captain",
                teamId: team.id,
                name: `Team ${team.id} · ${team.captain}`
            }];
        })
    ]);
}

const seedConfig = {
    players: PLAYERS,
    teams: TEAMS,
    settings: {
        budget: TEAM_BUDGET,
        teamSize: TEAM_SIZE,
        timerMs: TIMER_MS,
        antiSnipeThresholdMs: ANTI_SNIPE_THRESHOLD_MS,
        antiSnipeExtensionMs: ANTI_SNIPE_EXTENSION_MS,
        playersPerGroup: 5
    },
    updatedAt: seededAt
};

const token = await getAccessToken();
await put(configPath, seedConfig, token);
await put(usersPath, buildUsers(), token);
await put(auctionsPath, {_initialized: true, seededAt}, token);

console.log(`Seeded Firebase Realtime Database paths: ${configPath}, ${usersPath}, ${auctionsPath}`);
console.log(`Players: ${PLAYERS.length}; teams: ${TEAMS.length}; users: ${Object.keys(buildUsers()).length}`);
