#!/usr/bin/env node
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const REQUIRED_PATHS = ["config", "users"];
const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL || "https://koc2-20fb8-default-rtdb.firebaseio.com";
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;
const TARGET_SERVICE_ACCOUNT_JSON = process.env.TARGET_SERVICE_ACCOUNT_JSON;
const SOURCE_SERVICE_ACCOUNT_JSON = process.env.SOURCE_SERVICE_ACCOUNT_JSON;
const DRY_RUN = process.env.DRY_RUN !== "false";

function parseServiceAccount(raw, name) {
  if (!raw) throw new Error(`${name} is required`);
  try { return JSON.parse(raw); }
  catch (error) { throw new Error(`${name} must be valid JSON: ${error.message}`); }
}

function app(name, databaseURL, serviceAccountJson) {
  const options = { databaseURL };
  if (serviceAccountJson) options.credential = cert(parseServiceAccount(serviceAccountJson, `${name.toUpperCase()}_SERVICE_ACCOUNT_JSON`));
  return getApps().find(existing => existing.name === name) || initializeApp(options, name);
}

async function readRequiredData(sourceDb) {
  const entries = await Promise.all(REQUIRED_PATHS.map(async path => [path, (await sourceDb.ref(path).get()).val()]));
  return Object.fromEntries(entries.filter(([, value]) => value !== null && value !== undefined));
}

async function main() {
  if (!TARGET_DATABASE_URL) throw new Error("TARGET_DATABASE_URL is required, for example https://pdrdata-bcdc9-default-rtdb.firebaseio.com");
  if (!TARGET_SERVICE_ACCOUNT_JSON) throw new Error("TARGET_SERVICE_ACCOUNT_JSON is required. Do not commit service account JSON; pass it as an environment variable.");

  const sourceDb = getDatabase(app("source", SOURCE_DATABASE_URL, SOURCE_SERVICE_ACCOUNT_JSON));
  const targetDb = getDatabase(app("target", TARGET_DATABASE_URL, TARGET_SERVICE_ACCOUNT_JSON));
  const data = await readRequiredData(sourceDb);
  const missing = REQUIRED_PATHS.filter(path => !(path in data));

  console.log(`Source: ${SOURCE_DATABASE_URL}`);
  console.log(`Target: ${TARGET_DATABASE_URL}`);
  console.log(`Required paths: ${REQUIRED_PATHS.join(", ")}`);
  if (missing.length) console.warn(`Missing in source and not copied: ${missing.join(", ")}`);

  if (DRY_RUN) {
    console.log("Dry run only. Set DRY_RUN=false to write to the target database.");
    for (const [path, value] of Object.entries(data)) {
      const count = value && typeof value === "object" ? Object.keys(value).length : 1;
      console.log(`Would copy ${path} (${count} top-level item${count === 1 ? "" : "s"})`);
    }
    return;
  }

  await targetDb.ref().update(data);
  console.log(`Copied ${Object.keys(data).join(", ")} to target database.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
