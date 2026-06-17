#!/usr/bin/env node
import crypto from "node:crypto";

const REQUIRED_PATHS = ["config", "users"];
const SOURCE_DATABASE_URL = trimTrailingSlash(process.env.SOURCE_DATABASE_URL || "https://koc2-20fb8-default-rtdb.firebaseio.com");
const TARGET_DATABASE_URL = trimTrailingSlash(process.env.TARGET_DATABASE_URL || "https://pdrdata-bcdc9-default-rtdb.firebaseio.com");
const TARGET_SERVICE_ACCOUNT_JSON = process.env.TARGET_SERVICE_ACCOUNT_JSON;
const SOURCE_ACCESS_TOKEN = process.env.SOURCE_ACCESS_TOKEN;
const DRY_RUN = process.env.DRY_RUN !== "false";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function parseServiceAccount(raw) {
  if (!raw) {
    throw new Error("TARGET_SERVICE_ACCOUNT_JSON is required. Pass it as an environment variable; do not commit service account JSON.");
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`TARGET_SERVICE_ACCOUNT_JSON must be valid JSON: ${error.message}`);
  }
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsignedJwt = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsignedJwt).sign(serviceAccount.private_key, "base64url");
  const assertion = `${unsignedJwt}.${signature}`;
  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion });
  const response = await fetch(claim.aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Could not obtain Google access token: ${response.status} ${await response.text()}`);
  }

  const token = await response.json();
  return token.access_token;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function pathUrl(databaseUrl, path, accessToken) {
  const url = new URL(`${databaseUrl}/${path}.json`);
  if (accessToken) url.searchParams.set("access_token", accessToken);
  return url;
}

async function readRequiredData() {
  const entries = await Promise.all(REQUIRED_PATHS.map(async path => {
    const value = await requestJson(pathUrl(SOURCE_DATABASE_URL, path, SOURCE_ACCESS_TOKEN));
    return [path, value];
  }));
  return Object.fromEntries(entries.filter(([, value]) => value !== null && value !== undefined));
}

async function writeRequiredData(data, targetAccessToken) {
  await Promise.all(Object.entries(data).map(([path, value]) => requestJson(pathUrl(TARGET_DATABASE_URL, path, targetAccessToken), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  })));
}

async function main() {
  const serviceAccount = parseServiceAccount(TARGET_SERVICE_ACCOUNT_JSON);
  const targetAccessToken = await getAccessToken(serviceAccount);
  const data = await readRequiredData();
  const missing = REQUIRED_PATHS.filter(path => !(path in data));

  console.log(`Source: ${SOURCE_DATABASE_URL}`);
  console.log(`Target: ${TARGET_DATABASE_URL}`);
  console.log(`Required paths: ${REQUIRED_PATHS.join(", ")}`);
  if (missing.length) console.warn(`Missing in source and not copied: ${missing.join(", ")}`);

  for (const [path, value] of Object.entries(data)) {
    const count = value && typeof value === "object" ? Object.keys(value).length : 1;
    console.log(`${DRY_RUN ? "Would copy" : "Copying"} ${path} (${count} top-level item${count === 1 ? "" : "s"})`);
  }

  if (DRY_RUN) {
    console.log("Dry run only. Set DRY_RUN=false to write to the target database.");
    return;
  }

  await writeRequiredData(data, targetAccessToken);
  console.log(`Copied ${Object.keys(data).join(", ")} to target database.`);
}

main().catch(error => {
  console.error(error.cause ? `${error.message}: ${error.cause.message}` : error.message);
  process.exitCode = 1;
});
