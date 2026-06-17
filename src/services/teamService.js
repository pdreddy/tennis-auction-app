import { supabase } from "../config/supabase.js";

export const teamService = {
  async list(seasonYear) {
    const { data, error } = await supabase.from("teams").select("*, captain:players!teams_captain_player_id_fkey(*), roster:team_roster(*, player:players(*))").eq("season_year", seasonYear).order("name");
    if (error) throw error;
    return data;
  },

  async upsert(team) {
    const { data, error } = await supabase.from("teams").upsert(team, { onConflict: "id" }).select().single();
    if (error) throw error;
    return data;
  },

  async addRosterPlayer(rosterRow) {
    const { data, error } = await supabase.from("team_roster").insert(rosterRow).select().single();
    if (error) throw error;
    return data;
  },
};
