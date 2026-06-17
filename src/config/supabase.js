import { createClient } from "@supabase/supabase-js";

const readRuntimeConfig = () => {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("ta_supabase_config") || "{}") || {};
  } catch (_error) {
    return {};
  }
};

const runtimeConfig = readRuntimeConfig();
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || runtimeConfig.supabaseUrl;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeConfig.supabasePublishableKey;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabasePublishableKey);

export function saveRuntimeSupabaseConfig({ supabaseUrl, supabasePublishableKey }) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("ta_supabase_config", JSON.stringify({ supabaseUrl, supabasePublishableKey }));
}

export function clearRuntimeSupabaseConfig() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem("ta_supabase_config");
}

if (!hasSupabaseEnv) {
  // Keep the app bootable enough to show a useful error in development.
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables.");
}

export const supabase = createClient(supabaseUrl || "http://localhost:54321", supabasePublishableKey || "missing-publishable-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
