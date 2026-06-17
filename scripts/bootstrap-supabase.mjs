#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { PLAYERS } from "../src/data/players.js";
import { TEAMS } from "../src/data/teams.js";
import { TEAM_BUDGET, TEAM_SIZE, TIMER_MS } from "../src/data/settings.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPin = process.env.ADMIN_PIN;
const teamPin = process.env.TEAM_PIN;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local or export them in your shell.");
  process.exit(1);
}
if (!adminPin || !/^\d{6}$/.test(adminPin) || !teamPin || !/^\d{6}$/.test(teamPin)) {
  console.error("Missing ADMIN_PIN or TEAM_PIN. Both must be 6 digits for the current compatibility login screen.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const missingSchemaHint = table => [
  `${table}: table not found in Supabase schema cache.`,
  "Run the SQL in supabase/migrations/001_initial_schema.sql in your Supabase project first,",
  "or run `supabase db push`, then rerun this bootstrap command.",
].join(" ");

const upsert = async (table, rows, opts = {}) => {
  const { error } = await supabase.from(table).upsert(rows, opts);
  if (!error) return;
  const message = String(error.message || "");
  if (error.code === "PGRST205" || message.includes("schema cache") || message.includes("Could not find the table")) {
    throw new Error(missingSchemaHint(table));
  }
  throw new Error(`${table}: ${error.message}`);
};

const users = [
  { code: "ADMIN", pin: adminPin, role: "admin", team_id: null, name: "Admin · Auctioneer" },
  ...TEAMS.map(team => ({
    code: `TEAM${team.id}`,
    pin: teamPin,
    role: "captain",
    team_id: team.id,
    name: `Team ${team.id} · ${team.captain}`,
  })),
];

const config = {
  players: PLAYERS,
  teams: TEAMS,
  settings: { budget: TEAM_BUDGET, teamSize: TEAM_SIZE, timerMs: TIMER_MS, playersPerGroup: 5 },
  updatedAt: Date.now(),
};

await upsert("app_config", [{ id: "default", data: config }], { onConflict: "id" });
await upsert("app_users", users, { onConflict: "code" });

console.log(`Seeded app_config, ADMIN, and ${TEAMS.length} team accounts.`);
console.log("Open the app, choose ADMIN, and use the ADMIN_PIN you provided.");
