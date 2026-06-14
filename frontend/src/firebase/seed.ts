// Static auction config — mirrors backend/seed_data.py exactly.

export const TEAM_BUDGET = 100000;
export const TEAM_SIZE = 7;
export const TIMER_MS = 60_000;

export const POOL_ORDER = [
  "utr_5_5",
  "utr_5_25",
  "utr_5_0",
  "utr_4_5",
  "utr_4_0",
  "utr_3_5",
  "utr_3_0",
];

export function getUTRFromKey(key: string): number {
  return parseFloat(key.replace("utr_", "").replace("_", "."));
}

export type AuctionPlayer = {
  id: number;
  Name: string;
  utr: number;
  price: number;
};
export type AuctionTeamConfig = { id: number; name: string; captain: string };
export type AuctionConfig = {
  players: AuctionPlayer[];
  teams: AuctionTeamConfig[];
};

const PLAYERS: AuctionPlayer[] = [
  { id: 1, Name: "Satish Reddy Orugunta", utr: 5.5, price: 14000 },
  { id: 2, Name: "Rajasekhar Chintha", utr: 5.5, price: 14000 },
  { id: 3, Name: "Anil Kunda", utr: 5.5, price: 14000 },
  { id: 4, Name: "Krishna Vennapusa", utr: 5.5, price: 14000 },
  { id: 5, Name: "Nagarjuna Saladi", utr: 5.5, price: 14000 },
  { id: 6, Name: "Dinesh Reddy Timmareddy", utr: 5.5, price: 14000 },
  { id: 7, Name: "Sudhakara Nallapati", utr: 5.5, price: 14000 },
  { id: 8, Name: "Dinkar Bhardwaj", utr: 5.5, price: 14000 },
  { id: 9, Name: "Yogesh Dhadge", utr: 5.25, price: 13000 },
  { id: 10, Name: "Uma Vommi", utr: 5.25, price: 13000 },
  { id: 11, Name: "Manish Jangid", utr: 5.25, price: 13000 },
  { id: 12, Name: "Vinod Aripaka", utr: 5.25, price: 13000 },
  { id: 13, Name: "Narayan Prasad", utr: 5.25, price: 13000 },
  { id: 14, Name: "Chandrakant Dharme", utr: 5.0, price: 12000 },
  { id: 15, Name: "Rajasekhar Karru", utr: 5.0, price: 12000 },
  { id: 16, Name: "Hari Mothukuri", utr: 5.0, price: 12000 },
  { id: 17, Name: "Lloyd Prasana Kumar", utr: 5.0, price: 12000 },
  { id: 18, Name: "Ritesh Kumar", utr: 5.0, price: 12000 },
  { id: 19, Name: "Sandeep Gengineri", utr: 4.5, price: 10000 },
  { id: 20, Name: "Venky Dh", utr: 4.5, price: 10000 },
  { id: 21, Name: "Jitender Kumar", utr: 4.5, price: 10000 },
  { id: 22, Name: "Srinidhi Kulkarni", utr: 4.5, price: 10000 },
  { id: 23, Name: "Naveenkumar Mohanram", utr: 4.5, price: 10000 },
  { id: 24, Name: "Srikant Tenni", utr: 4.0, price: 8000 },
  { id: 25, Name: "Bhaskar Boddireddy", utr: 4.0, price: 8000 },
  { id: 26, Name: "Mohan Koripuri", utr: 4.0, price: 8000 },
  { id: 27, Name: "Anshul Goyal", utr: 4.0, price: 8000 },
  { id: 28, Name: "Jaweed Ibrahim", utr: 4.0, price: 8000 },
  { id: 29, Name: "Janaki Ram Kantheti", utr: 4.0, price: 8000 },
  { id: 30, Name: "Biju Koshy", utr: 4.0, price: 8000 },
  { id: 31, Name: "Damodhara Palavali", utr: 4.0, price: 8000 },
  { id: 32, Name: "Naseer Mohammad", utr: 4.0, price: 8000 },
  { id: 33, Name: "Trinadh Cheepilla", utr: 3.5, price: 6000 },
  { id: 34, Name: "Malla Reddy Cheerke", utr: 3.5, price: 6000 },
  { id: 35, Name: "Charan Macharla", utr: 3.5, price: 6000 },
  { id: 36, Name: "Mohamed Noufal", utr: 3.5, price: 6000 },
  { id: 37, Name: "Rajasekhar Chejerla", utr: 3.5, price: 6000 },
  { id: 38, Name: "Nivas Nazeer", utr: 3.0, price: 5000 },
  { id: 39, Name: "Venice Robinson Amal Doss", utr: 3.0, price: 5000 },
  { id: 40, Name: "Volkan Bal", utr: 3.0, price: 5000 },
  { id: 41, Name: "Premkumar Balakrishnan", utr: 3.0, price: 5000 },
  { id: 42, Name: "Guru Bavirisetty", utr: 3.0, price: 5000 },
  { id: 43, Name: "Sidharth Behera", utr: 3.0, price: 5000 },
  { id: 44, Name: "Sreekanth Bobbala", utr: 3.0, price: 5000 },
  { id: 45, Name: "Hariprashanth Ganapathy", utr: 3.0, price: 5000 },
  { id: 46, Name: "Prashanth Gourineni", utr: 3.0, price: 5000 },
  { id: 47, Name: "Amit Gundewar", utr: 3.0, price: 5000 },
  { id: 48, Name: "Jitin Jaitly", utr: 3.0, price: 5000 },
  { id: 49, Name: "Prashanth Jayantha Kumar", utr: 3.0, price: 5000 },
  { id: 50, Name: "Kalyan Kalidindi", utr: 3.0, price: 5000 },
  { id: 51, Name: "Dineshkumar Kaliyaperumal", utr: 3.0, price: 5000 },
  { id: 52, Name: "Joel Kodoru", utr: 3.0, price: 5000 },
  { id: 53, Name: "Anand Krishnamurthy", utr: 3.0, price: 5000 },
  { id: 54, Name: "Karthik Kumaresan", utr: 3.0, price: 5000 },
  { id: 55, Name: "Sankara Lakshmanan", utr: 3.0, price: 5000 },
  { id: 56, Name: "Chandu M", utr: 3.0, price: 5000 },
  { id: 57, Name: "Satya Maddipati", utr: 3.0, price: 5000 },
  { id: 58, Name: "Kailas Magi", utr: 3.0, price: 5000 },
  { id: 59, Name: "Ninad Mahajan", utr: 3.0, price: 5000 },
  { id: 60, Name: "Asif Mohammed", utr: 3.0, price: 5000 },
  { id: 61, Name: "Boopesh Natarajan", utr: 3.0, price: 5000 },
  { id: 62, Name: "Venky Pantham", utr: 3.0, price: 5000 },
  { id: 63, Name: "Abhishek Patel", utr: 3.0, price: 5000 },
  { id: 64, Name: "Mayur Patel", utr: 3.0, price: 5000 },
  { id: 65, Name: "Shailendra Patidar", utr: 3.0, price: 5000 },
  { id: 66, Name: "Prashanth Pendli", utr: 3.0, price: 5000 },
  { id: 67, Name: "Mahidhar Penigi", utr: 3.0, price: 5000 },
  { id: 68, Name: "Vinod Punati", utr: 3.0, price: 5000 },
  { id: 69, Name: "Addy R", utr: 3.0, price: 5000 },
  { id: 70, Name: "Raja R", utr: 3.0, price: 5000 },
  { id: 71, Name: "Karthik Ragunathan", utr: 3.0, price: 5000 },
  { id: 72, Name: "Saket Raizada", utr: 3.0, price: 5000 },
  { id: 73, Name: "Jagapathi Raju", utr: 3.0, price: 5000 },
  { id: 74, Name: "Arpit Rawat", utr: 3.0, price: 5000 },
  { id: 75, Name: "Rajib Sarkar", utr: 3.0, price: 5000 },
  { id: 76, Name: "Karthik Ram Senthilvel", utr: 3.0, price: 5000 },
  { id: 77, Name: "Gopal Setty", utr: 3.0, price: 5000 },
  { id: 78, Name: "Chandan Singh", utr: 3.0, price: 5000 },
  { id: 79, Name: "Vipul Sud", utr: 3.0, price: 5000 },
  { id: 80, Name: "Bharath Sunku", utr: 3.0, price: 5000 },
  { id: 81, Name: "Avinash Terala", utr: 3.0, price: 5000 },
  { id: 82, Name: "Vivek Tiku", utr: 3.0, price: 5000 },
  { id: 83, Name: "Tushar Tipatre", utr: 3.0, price: 5000 },
  { id: 84, Name: "Koushik Venkatasubramanian", utr: 3.0, price: 5000 },
  { id: 85, Name: "Venu Sarvepalli", utr: 3.0, price: 5000 },
  { id: 86, Name: "Vivek Bihani", utr: 3.0, price: 5000 },
  { id: 87, Name: "Jay Sermadevi", utr: 3.0, price: 5000 },
  { id: 88, Name: "Veeresh Kurni", utr: 3.0, price: 5000 },
  { id: 89, Name: "Srinath Elitem", utr: 3.0, price: 5000 },
  { id: 90, Name: "Prashant Janmatti", utr: 3.0, price: 5000 },
  { id: 91, Name: "Rajesh Mishra", utr: 3.0, price: 5000 },
  { id: 92, Name: "Samir Junnarkar", utr: 3.0, price: 5000 },
  { id: 93, Name: "Amol Patwardhan", utr: 3.0, price: 5000 },
  { id: 94, Name: "Shiva Kumar", utr: 3.0, price: 5000 },
  { id: 95, Name: "Harsha Beeram", utr: 3.0, price: 5000 },
  { id: 96, Name: "Raj Chava", utr: 3.0, price: 5000 },
  { id: 97, Name: "Vijay Gate", utr: 3.0, price: 5000 },
  { id: 98, Name: "Vinoth Duraisamy", utr: 3.0, price: 5000 },
];

const TEAMS: AuctionTeamConfig[] = [
  { id: 1, name: "Team 1", captain: "Yogesh Dhadge" },
  { id: 2, name: "Team 2", captain: "Srikant Tenni" },
  { id: 3, name: "Team 3", captain: "Uma Vommi" },
  { id: 4, name: "Team 4", captain: "Narayan Prasad" },
  { id: 5, name: "Team 5", captain: "Manish Jangid" },
  { id: 6, name: "Team 6", captain: "Vinod Aripaka" },
  { id: 7, name: "Team 7", captain: "Satish Reddy Orugunta" },
  { id: 8, name: "Team 8", captain: "Anil Kunda" },
  { id: 9, name: "Team 9", captain: "Rajasekhar Chintha" },
  { id: 10, name: "Team 10", captain: "Krishna Vennapusa" },
  { id: 11, name: "Team 11", captain: "Nagarjuna Saladi" },
  { id: 12, name: "Team 12", captain: "Dinesh Reddy Timmareddy" },
  { id: 13, name: "Team 13", captain: "Sudhakara Nallapati" },
  { id: 14, name: "Team 14", captain: "Dinkar Bhardwaj" },
  { id: 15, name: "Team 15", captain: "Chandrakant Dharme" },
  { id: 16, name: "Team 16", captain: "Rajasekhar Karru" },
];

export const DEFAULT_AUCTION_CONFIG: AuctionConfig = {
  players: PLAYERS,
  teams: TEAMS,
};

function configPlayers(config: AuctionConfig = DEFAULT_AUCTION_CONFIG) {
  return config.players ?? [];
}

function configTeams(config: AuctionConfig = DEFAULT_AUCTION_CONFIG) {
  return config.teams ?? [];
}

function captainNames(config: AuctionConfig = DEFAULT_AUCTION_CONFIG) {
  return new Set(configTeams(config).map((t) => t.captain));
}

const ADMIN_PIN = "731902";
const TEAM_PINS: Record<number, string> = {
  1: "481027",
  2: "635914",
  3: "217658",
  4: "859302",
  5: "374186",
  6: "196540",
  7: "742839",
  8: "503271",
  9: "618495",
  10: "285063",
  11: "947612",
  12: "360728",
  13: "814359",
  14: "572046",
  15: "639021",
  16: "184756",
};

// Build pools grouped by UTR, captains excluded.
export function buildPlayerPools(
  config: AuctionConfig = DEFAULT_AUCTION_CONFIG,
) {
  const captains = captainNames(config);
  const pools: Record<string, AuctionPlayer[]> = {};
  for (const key of POOL_ORDER) {
    const utr = getUTRFromKey(key);
    pools[key] = configPlayers(config).filter(
      (p) => p.utr === utr && !captains.has(p.Name),
    );
  }
  return pools;
}

export function buildPoolCaps(config: AuctionConfig = DEFAULT_AUCTION_CONFIG) {
  const pools = buildPlayerPools(config);
  const caps: Record<string, number> = {};
  for (const key of POOL_ORDER) {
    const size = pools[key].length;
    caps[key] =
      size === 0 ? 0 : size <= configTeams(config).length ? 1 : TEAM_SIZE - 1;
  }
  return caps;
}

export const PLAYER_POOLS = buildPlayerPools();
export const POOL_CAPS = buildPoolCaps();

export function freshPools(config: AuctionConfig = DEFAULT_AUCTION_CONFIG) {
  const sourcePools = buildPlayerPools(config);
  const pools: Record<string, any[]> = {};
  for (const key of POOL_ORDER) {
    pools[key] = sourcePools[key].map((p) => ({ ...p }));
  }
  return pools;
}

export function getInitialTeams(
  config: AuctionConfig = DEFAULT_AUCTION_CONFIG,
) {
  const byName: Record<string, AuctionPlayer> = {};
  for (const p of configPlayers(config)) byName[p.Name] = p;

  return configTeams(config).map((team) => {
    const cap = byName[team.captain];
    const captainPrice = cap?.price ?? 0;
    const players = cap
      ? [
          {
            id: `c${team.id}`,
            Name: cap.Name,
            utr: cap.utr,
            acquiredPrice: captainPrice,
          },
        ]
      : [];
    return {
      id: team.id,
      name: team.name,
      captain: team.captain,
      players,
      budget: TEAM_BUDGET - captainPrice,
      totalSpent: captainPrice,
    };
  });
}

export function getAccounts() {
  const accounts: any[] = [
    {
      code: "ADMIN",
      pin: ADMIN_PIN,
      role: "admin",
      teamId: null,
      name: "Auctioneer",
    },
  ];
  for (const team of TEAMS) {
    accounts.push({
      code: `TEAM${team.id}`,
      pin: TEAM_PINS[team.id],
      role: "captain",
      teamId: team.id,
      name: team.captain,
    });
  }
  return accounts;
}

export function configSummary(config: AuctionConfig = DEFAULT_AUCTION_CONFIG) {
  const playerPools = buildPlayerPools(config);
  const poolCaps = buildPoolCaps(config);
  const pools = POOL_ORDER.map((key) => ({
    key,
    utr: getUTRFromKey(key),
    count: playerPools[key].length,
    cap: poolCaps[key],
  }));
  const poolPlayers = POOL_ORDER.reduce(
    (sum, key) => sum + playerPools[key].length,
    0,
  );
  return {
    teams: configTeams(config).length,
    teamSize: TEAM_SIZE,
    budget: TEAM_BUDGET,
    totalPlayers: configPlayers(config).length,
    poolPlayers,
    pools,
  };
}
