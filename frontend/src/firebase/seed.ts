// Static auction config — mirrors backend/seed_data.py exactly.

export const TEAM_BUDGET = 100000;
export const TEAM_SIZE = 7;
export const TIMER_MS = 60_000;

export const POOL_ORDER = [
  "utr_3_0", "utr_3_5", "utr_4_0", "utr_4_5", "utr_5_0", "utr_5_5", "utr_6_0",
];

export function getUTRFromKey(key: string): number {
  return parseFloat(key.replace("utr_", "").replace("_", "."));
}

// utr & price derived from category: cat1=6.0/$20k, cat2=5.5/$17.5k,
// cat3=5.0/$15k, cat4=4.5/$12.5k, cat5=4.0/$10k, cat6=3.5/$7.5k, cat7=3.0/$5k.
const PLAYERS = [
  { id: 1, Name: "Dinkar Bhardwaj", utr: 6.0, price: 20000 },
  { id: 2, Name: "Vinoth Duraisamy", utr: 6.0, price: 20000 },
  { id: 3, Name: "Volkan Bal", utr: 6.0, price: 20000 },
  { id: 4, Name: "Mohammad Azim", utr: 6.0, price: 20000 },
  { id: 5, Name: "Prashant Janmatti", utr: 5.5, price: 17500 },
  { id: 6, Name: "Prashanth Gourineni", utr: 6.0, price: 20000 },
  { id: 7, Name: "Vamsi Atluri", utr: 6.0, price: 20000 },
  { id: 8, Name: "Rajib Sarkar", utr: 5.5, price: 17500 },
  { id: 9, Name: "Vinod Aripaka", utr: 5.5, price: 17500 },
  { id: 10, Name: "Vivekvardhan Reddy Mereddy", utr: 6.0, price: 20000 },
  { id: 11, Name: "Saket Raizada", utr: 5.0, price: 15000 },
  { id: 12, Name: "Anand Krishnamurthy", utr: 6.0, price: 20000 },
  { id: 13, Name: "Kalyan Kalidindi", utr: 5.5, price: 17500 },
  { id: 14, Name: "Vipul Sud", utr: 5.0, price: 15000 },
  { id: 15, Name: "Nagarjuna Saladi", utr: 6.0, price: 20000 },
  { id: 16, Name: "Praveenkumar Vijayakumar", utr: 5.5, price: 17500 },
  { id: 17, Name: "Jayesh Barai", utr: 6.0, price: 20000 },
  { id: 18, Name: "Yogesh Dhadge", utr: 6.0, price: 20000 },
  { id: 19, Name: "Dinesh Reddy Timmareddy", utr: 5.5, price: 17500 },
  { id: 20, Name: "Boopesh Natarajan", utr: 6.0, price: 20000 },
  { id: 21, Name: "Premkumar Balakrishnan", utr: 5.5, price: 17500 },
  { id: 22, Name: "Rajasekhar Chintha", utr: 5.5, price: 17500 },
  { id: 23, Name: "Rajasekhar Mangalampally", utr: 6.0, price: 20000 },
  { id: 24, Name: "Tariq Hussain", utr: 5.5, price: 17500 },
  { id: 25, Name: "Srinath Elitem", utr: 5.0, price: 15000 },
  { id: 26, Name: "Hariprashanth Ganapathy", utr: 5.0, price: 15000 },
  { id: 27, Name: "Rajesh Mishra", utr: 6.0, price: 20000 },
  { id: 28, Name: "Manish Jangid", utr: 6.0, price: 20000 },
  { id: 29, Name: "Hari Mothukuri", utr: 5.5, price: 17500 },
  { id: 30, Name: "Kailas Magi", utr: 5.5, price: 17500 },
  { id: 31, Name: "Janaki Ram Kantheti", utr: 5.0, price: 15000 },
  { id: 32, Name: "Krishna Vennapusa", utr: 5.0, price: 15000 },
  { id: 33, Name: "Satish Reddy Orugunta", utr: 5.5, price: 17500 },
  { id: 34, Name: "Harsha Reddy", utr: 6.0, price: 20000 },
  { id: 35, Name: "Koushik Venkatasubramanian", utr: 4.5, price: 12500 },
  { id: 36, Name: "Anil Kunda", utr: 5.5, price: 17500 },
  { id: 37, Name: "Veeresh Kurni", utr: 4.5, price: 12500 },
  { id: 38, Name: "Vivek Tiku", utr: 4.5, price: 12500 },
  { id: 39, Name: "Jaweed Ibrahim", utr: 5.0, price: 15000 },
  { id: 40, Name: "Mahidhar Penigi", utr: 5.0, price: 15000 },
  { id: 41, Name: "Kalyan Ghanta", utr: 5.0, price: 15000 },
  { id: 42, Name: "Amol Patwardhan", utr: 4.5, price: 12500 },
  { id: 43, Name: "Narayan Prasad", utr: 5.0, price: 15000 },
  { id: 44, Name: "Ritesh Kumar", utr: 5.5, price: 17500 },
  { id: 45, Name: "Rajasekhar Karru", utr: 5.0, price: 15000 },
  { id: 46, Name: "Lloyd Prasana Kumar", utr: 5.0, price: 15000 },
  { id: 47, Name: "Uma Vommi", utr: 5.0, price: 15000 },
  { id: 48, Name: "Ninad Mahajan", utr: 5.0, price: 15000 },
  { id: 49, Name: "Chandrakant Dharme", utr: 5.0, price: 15000 },
  { id: 50, Name: "Chandu M", utr: 4.0, price: 10000 },
  { id: 51, Name: "Sudhakara Nallapati", utr: 5.5, price: 17500 },
  { id: 52, Name: "Biju Koshy", utr: 4.5, price: 12500 },
  { id: 53, Name: "Rajasekhar Chejerla", utr: 4.0, price: 10000 },
  { id: 54, Name: "Nikhil Katakam", utr: 5.0, price: 15000 },
  { id: 55, Name: "Jitender Kumar", utr: 4.5, price: 12500 },
  { id: 56, Name: "Mohamed Noufal", utr: 4.5, price: 12500 },
  { id: 57, Name: "Samir Junnarkar", utr: 3.5, price: 7500 },
  { id: 58, Name: "Raja R", utr: 4.5, price: 12500 },
  { id: 59, Name: "Jay Sermadevi", utr: 4.5, price: 12500 },
  { id: 60, Name: "Bharath Sunku", utr: 4.5, price: 12500 },
  { id: 61, Name: "Prashanth Jayantha Kumar", utr: 4.5, price: 12500 },
  { id: 62, Name: "Amit Gundewar", utr: 3.5, price: 7500 },
  { id: 63, Name: "Bhaskar Boddireddy", utr: 3.5, price: 7500 },
  { id: 64, Name: "Pratik Pitroda", utr: 4.0, price: 10000 },
  { id: 65, Name: "Prashanth Pendli", utr: 4.0, price: 10000 },
  { id: 66, Name: "Vivek Bihani", utr: 4.0, price: 10000 },
  { id: 67, Name: "Mohan Koripuri", utr: 4.0, price: 10000 },
  { id: 68, Name: "Srikant Tenni", utr: 4.0, price: 10000 },
  { id: 69, Name: "Anshul Goyal", utr: 4.0, price: 10000 },
  { id: 70, Name: "Naveenkumar Mohanram", utr: 4.0, price: 10000 },
  { id: 71, Name: "Srinidhi Kulkarni", utr: 4.5, price: 12500 },
  { id: 72, Name: "Vijay Gate", utr: 4.5, price: 12500 },
  { id: 73, Name: "Vinod Punati", utr: 4.0, price: 10000 },
  { id: 74, Name: "Tushar Tipatre", utr: 4.0, price: 10000 },
  { id: 75, Name: "Satya Maddipati", utr: 3.5, price: 7500 },
  { id: 76, Name: "Venky Dh", utr: 4.5, price: 12500 },
  { id: 77, Name: "Sreekanth Bobbala", utr: 4.0, price: 10000 },
  { id: 78, Name: "Malla Reddy Cheerke", utr: 4.0, price: 10000 },
  { id: 79, Name: "Shailendra Patidar", utr: 4.0, price: 10000 },
  { id: 80, Name: "Dineshkumar Kaliyaperumal", utr: 3.5, price: 7500 },
  { id: 81, Name: "Venky Pantham", utr: 3.0, price: 5000 },
  { id: 82, Name: "Sankara Lakshmanan", utr: 4.0, price: 10000 },
  { id: 83, Name: "Sandeep Gengineri", utr: 4.5, price: 12500 },
  { id: 84, Name: "Damodhara Palavali", utr: 3.5, price: 7500 },
  { id: 85, Name: "Sashank T", utr: 3.5, price: 7500 },
  { id: 86, Name: "Sidharth Behera", utr: 4.0, price: 10000 },
  { id: 87, Name: "Nivas Nazeer", utr: 3.0, price: 5000 },
  { id: 88, Name: "Karthik Ragunathan", utr: 3.5, price: 7500 },
  { id: 89, Name: "Charan Macharla", utr: 3.5, price: 7500 },
  { id: 90, Name: "Naseer Mohd", utr: 3.5, price: 7500 },
  { id: 91, Name: "Venkat Thimmisetty", utr: 3.5, price: 7500 },
  { id: 92, Name: "Mayur Patel", utr: 3.0, price: 5000 },
  { id: 93, Name: "Arpit Rawat", utr: 3.5, price: 7500 },
  { id: 94, Name: "Jitin Jaitly", utr: 3.5, price: 7500 },
  { id: 95, Name: "Gopal Setty", utr: 3.5, price: 7500 },
  { id: 96, Name: "Shiva Gundimeda", utr: 3.5, price: 7500 },
  { id: 97, Name: "Joel Kodoru", utr: 3.0, price: 5000 },
  { id: 98, Name: "Trinadh Cheepilla", utr: 3.0, price: 5000 },
  { id: 99, Name: "Satish K", utr: 3.5, price: 7500 },
  { id: 100, Name: "Avinash Terala", utr: 3.0, price: 5000 },
  { id: 101, Name: "Sai Varun Polishetty", utr: 3.0, price: 5000 },
  { id: 102, Name: "Asif Mohammed", utr: 3.0, price: 5000 },
  { id: 103, Name: "Jagapathi Raju", utr: 3.0, price: 5000 },
  { id: 104, Name: "Venice Robinson Amal Doss", utr: 3.0, price: 5000 },
  { id: 105, Name: "Guru Bavirisetty", utr: 4.5, price: 12500 },
  { id: 106, Name: "Raj Chava", utr: 5.5, price: 17500 },
  { id: 107, Name: "Karthik Kumaresan", utr: 3.0, price: 5000 },
  { id: 108, Name: "Abhishek Patel", utr: 3.0, price: 5000 },
  { id: 109, Name: "Raghu Ram", utr: 3.0, price: 5000 },
  { id: 110, Name: "Karthik Ram Senthilvel", utr: 3.0, price: 5000 },
  { id: 111, Name: "Chandan Singh", utr: 3.0, price: 5000 },
  { id: 112, Name: "Venu Sarvepalli", utr: 3.0, price: 5000 },
];

const TEAMS = [
  { id: 1, name: "Rally Royals", captain: "Yogesh Dhadge" },
  { id: 2, name: "Karna's Crusaders", captain: "Srikant Tenni" },
  { id: 3, name: "Spin Kings", captain: "Uma Vommi" },
  { id: 4, name: "KOC Challengers", captain: "Narayan Prasad" },
  { id: 5, name: "Rally Sqad", captain: "Ritesh Kumar" },
  { id: 6, name: "POSH", captain: "Vinod Aripaka" },
  { id: 7, name: "Chill Titans", captain: "Satish Reddy Orugunta" },
  { id: 8, name: "Mega Lions", captain: "Anil Kunda" },
  { id: 9, name: "Court Conquerers", captain: "Rajasekhar Chintha" },
  { id: 10, name: "Royal Chill Badgers", captain: "Janaki Ram Kantheti" },
  { id: 11, name: "Volley Vipers", captain: "Kailas Magi" },
  { id: 12, name: "Dallas Chargers", captain: "Vivekvardhan Reddy Mereddy" },
  { id: 13, name: "Baseline Bashers", captain: "Sashank T" },
  { id: 14, name: "Deuce Devils", captain: "Hari Mothukuri" },
  { id: 15, name: "Chill Super Kings", captain: "Anand Krishnamurthy" },
  { id: 16, name: "Courtmasters", captain: "Dinesh Reddy Timmareddy" },
];

const CAPTAIN_NAMES = new Set(TEAMS.map((t) => t.captain));

const ADMIN_PIN = "731902";
const TEAM_PINS: Record<number, string> = {
  1: "481027", 2: "635914", 3: "217658", 4: "859302", 5: "374186",
  6: "196540", 7: "742839", 8: "503271", 9: "618495", 10: "285063",
  11: "947612", 12: "360728", 13: "814359", 14: "572046", 15: "639021",
  16: "184756",
};

// Build pools grouped by UTR, captains excluded.
export const PLAYER_POOLS: Record<string, typeof PLAYERS[0][]> = {};
for (const key of POOL_ORDER) {
  const utr = getUTRFromKey(key);
  PLAYER_POOLS[key] = PLAYERS.filter((p) => p.utr === utr && !CAPTAIN_NAMES.has(p.Name));
}

// Per-team cap for each pool.
export const POOL_CAPS: Record<string, number> = {};
for (const key of POOL_ORDER) {
  const size = PLAYER_POOLS[key].length;
  POOL_CAPS[key] = size === 0 ? 0 : size <= TEAMS.length ? 1 : TEAM_SIZE - 1;
}

export function freshPools() {
  const pools: Record<string, any[]> = {};
  for (const key of POOL_ORDER) {
    pools[key] = PLAYER_POOLS[key].map((p) => ({ ...p }));
  }
  return pools;
}

export function getInitialTeams() {
  const byName: Record<string, typeof PLAYERS[0]> = {};
  for (const p of PLAYERS) byName[p.Name] = p;

  return TEAMS.map((team) => {
    const cap = byName[team.captain];
    const captainPrice = cap?.price ?? 0;
    const players = cap
      ? [{ id: `c${team.id}`, Name: cap.Name, utr: cap.utr, acquiredPrice: captainPrice }]
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
    { code: "ADMIN", pin: ADMIN_PIN, role: "admin", teamId: null, name: "Auctioneer" },
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

export function configSummary() {
  const pools = POOL_ORDER.map((key) => ({
    key,
    utr: getUTRFromKey(key),
    count: PLAYER_POOLS[key].length,
    cap: POOL_CAPS[key],
  }));
  const poolPlayers = POOL_ORDER.reduce((s, k) => s + PLAYER_POOLS[k].length, 0);
  return {
    teams: TEAMS.length,
    teamSize: TEAM_SIZE,
    budget: TEAM_BUDGET,
    totalPlayers: PLAYERS.length,
    poolPlayers,
    pools,
  };
}
