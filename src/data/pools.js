import { TEAM_SIZE, POOL_ORDER, getUTR } from "./settings.js";
import { PLAYERS } from "./players.js";
import { TEAMS } from "./teams.js";

export const CAPTAIN_NAMES = new Set(TEAMS.map(t => t.captain));

export const PLAYER_POOLS = {};
POOL_ORDER.forEach(key => {
    const utr = getUTR(key);
    PLAYER_POOLS[key] = PLAYERS.filter(p => p.utr === utr && !CAPTAIN_NAMES.has(p.Name));
});

export const POOL_CAPS = {};
POOL_ORDER.forEach(key => {
    const size = PLAYER_POOLS[key].length;
    POOL_CAPS[key] = size === 0 ? 0 : size <= TEAMS.length ? 1 : TEAM_SIZE - 1;
});
