// Auction rules and bid pricing configuration.
export const TEAM_BUDGET = 100000;
export const TEAM_SIZE   = 7;
export const TIMER_MS    = 60000;

export const POOL_ORDER = ["utr_6_0","utr_5_5","utr_5_0","utr_4_5","utr_4_0","utr_3_5","utr_3_0"];
export const getUTR = k => parseFloat(k.replace("utr_","").replace("_","."));
