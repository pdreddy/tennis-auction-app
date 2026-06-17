#!/usr/bin/env node
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [,, exportPath] = process.argv;
if (!exportPath) {
  console.error("Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-firebase-to-supabase.mjs firebase-export.json");
  process.exit(1);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const data = JSON.parse(fs.readFileSync(exportPath, "utf8"));

const upsert = async (table, rows, opts = {}) => {
  if (!rows || (Array.isArray(rows) && rows.length === 0)) return;
  const { error } = await supabase.from(table).upsert(rows, opts);
  if (error) throw new Error(`${table}: ${error.message}`);
};

await upsert("app_config", [{ id: "default", data: data.config || {} }], { onConflict: "id" });
await upsert("app_users", Object.entries(data.users || {}).map(([code, user]) => ({ code, ...user })), { onConflict: "code" });
await upsert("auction_sessions", Object.entries(data.auctions || {}).map(([session_id, state]) => ({ session_id, season_year: new Date().getFullYear(), state })), { onConflict: "session_id" });

const cfg = data.config || {};
const season = new Date().getFullYear();
const categories = [...new Set((cfg.players || []).map(p => Number(p.utr || 3)))].map((utr, index) => ({
  season_year: season,
  name: `UTR ${utr.toFixed(1)}`,
  utr_min: utr,
  utr_max: utr,
  base_price: cfg.players?.find(p => Number(p.utr || 3) === utr)?.price || 5000,
  sort_order: index,
}));
await upsert("categories", categories, { onConflict: "season_year,name" });
const { data: dbCategories, error: catError } = await supabase.from("categories").select("id,name").eq("season_year", season);
if (catError) throw catError;
const categoryByName = Object.fromEntries(dbCategories.map(c => [c.name, c.id]));

await upsert("players", (cfg.players || []).map(p => ({
  season_year: season,
  display_name: p.Name,
  category_id: categoryByName[`UTR ${Number(p.utr || 3).toFixed(1)}`],
  rating_utr: p.utr || 3,
  singles_utr: p.s || null,
  doubles_utr: p.d || null,
  base_price: p.price || 5000,
  is_captain: (cfg.teams || []).some(t => t.captain === p.Name),
  metadata: p,
})), { onConflict: "id" });

await upsert("teams", (cfg.teams || []).map(t => ({ season_year: season, name: t.name || `Team ${t.id}`, budget: cfg.settings?.budget || 80000 })), { onConflict: "season_year,name" });
console.log("Migration complete.");
