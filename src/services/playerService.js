import { supabase } from "../config/supabase.js";

export const playerService = {
  async list({ seasonYear, categoryId, includeInactive = false } = {}) {
    let query = supabase.from("players").select("*, categories(*)").order("rating_utr", { ascending: false }).order("display_name");
    if (seasonYear) query = query.eq("season_year", seasonYear);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async upsert(player) {
    const { data, error } = await supabase.from("players").upsert(player, { onConflict: "id" }).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from("players").update({ is_active: false }).eq("id", id);
    if (error) throw error;
  },
};
