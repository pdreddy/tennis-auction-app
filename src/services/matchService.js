import { supabase } from "../config/supabase.js";

export const matchService = {
  async list(tournamentId) {
    const { data, error } = await supabase.from("matches").select("*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)").eq("tournament_id", tournamentId).order("played_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async recordResult(matchId, result) {
    const { data, error } = await supabase.from("matches").update({ ...result, status: "completed" }).eq("id", matchId).select().single();
    if (error) throw error;
    return data;
  },
};
