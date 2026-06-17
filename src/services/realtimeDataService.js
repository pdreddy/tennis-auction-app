import { supabase } from "../config/supabase.js";

const getAtPath = (obj, parts) => parts.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
const setAtPath = (obj, parts, value) => {
  if (!parts.length) return value;
  const copy = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cur = copy;
  parts.slice(0, -1).forEach(part => {
    cur[part] = Array.isArray(cur[part]) ? [...cur[part]] : { ...(cur[part] || {}) };
    cur = cur[part];
  });
  cur[parts.at(-1)] = value;
  return copy;
};

class Snapshot {
  constructor(value) { this.value = value; }
  val() { return this.value; }
  exists() { return this.value !== null && this.value !== undefined; }
}

class Ref {
  constructor(path = "") { this.path = path.replace(/^\/+|\/+$/g, ""); this.channel = null; }
  child(childPath) { return new Ref([this.path, childPath].filter(Boolean).join("/")); }

  async once() { return new Snapshot(await readPath(this.path)); }
  async set(value) { await writePath(this.path, value, false); }
  async update(updates) {
    if (!this.path) return Promise.all(Object.entries(updates).map(([path, value]) => writePath(path, value, false)));
    const current = (await readPath(this.path)) || {};
    await writePath(this.path, { ...current, ...updates }, false);
  }
  async transaction(updater, done) {
    try {
      const current = await readPath(this.path);
      const next = updater(current);
      if (next === undefined) return done?.(null, false, new Snapshot(current));
      await writePath(this.path, next, false);
      done?.(null, true, new Snapshot(next));
    } catch (error) { done?.(error, false, null); }
  }
  on(_event, callback, errorCallback) {
    readPath(this.path).then(value => callback(new Snapshot(value))).catch(errorCallback);
    this.channel = subscribePath(this.path, value => callback(new Snapshot(value)), errorCallback);
  }
  off() { if (this.channel) supabase.removeChannel(this.channel); this.channel = null; }
}

async function readPath(path) {
  const [root, id, ...rest] = path.split("/").filter(Boolean);
  if (path === ".info/connected") return true;
  if (root === "config") {
    const { data, error } = await supabase.from("app_config").select("data").eq("id", "default").maybeSingle();
    if (error) throw error;
    return getAtPath(data?.data ?? null, [id, ...rest].filter(Boolean));
  }
  if (root === "users") {
    const query = supabase.from("app_users").select("*");
    const { data, error } = id ? await query.eq("code", id).maybeSingle() : await query;
    if (error) throw error;
    if (!id) return Object.fromEntries((data || []).map(u => [u.code, u]));
    return getAtPath(data ?? null, rest);
  }
  if (root === "auctions") {
    const { data, error } = await supabase.from("auction_sessions").select("state").eq("session_id", id).maybeSingle();
    if (error) throw error;
    return getAtPath(data?.state ?? null, rest);
  }
  return null;
}

async function writePath(path, value) {
  const [root, id, ...rest] = path.split("/").filter(Boolean);
  if (root === "config") {
    const current = rest.length || id ? ((await readPath("config")) || {}) : value;
    const data = rest.length || id ? setAtPath(current, [id, ...rest].filter(Boolean), value) : value;
    const { error } = await supabase.from("app_config").upsert({ id: "default", data, updated_at: new Date().toISOString() });
    if (error) throw error;
    return;
  }
  if (root === "users") {
    const row = rest.length ? setAtPath((await readPath(`users/${id}`)) || {}, rest, value) : value;
    const { error } = await supabase.from("app_users").upsert({ ...row, code: id || row.code, updated_at: new Date().toISOString() });
    if (error) throw error;
    return;
  }
  if (root === "auctions") {
    const state = rest.length ? setAtPath((await readPath(`auctions/${id}`)) || {}, rest, value) : value;
    const { error } = await supabase.from("auction_sessions").upsert({ session_id: id, state, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}

function subscribePath(path, onValue, onError) {
  const [root, id] = path.split("/").filter(Boolean);
  const table = root === "config" ? "app_config" : root === "users" ? "app_users" : root === "auctions" ? "auction_sessions" : null;
  if (!table) return null;
  return supabase.channel(`realtime:${path}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, async payload => {
      try {
        if (!id || payload.new?.session_id === id || payload.new?.code === id || payload.new?.id === "default") onValue(await readPath(path));
      } catch (error) { onError?.(error); }
    })
    .subscribe();
}

export const realtimeDataService = { ref: path => new Ref(path) };
