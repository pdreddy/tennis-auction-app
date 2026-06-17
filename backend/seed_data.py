"""Static auction configuration: players, teams, pools and caps.

Mirrors the logic of the original web app so behaviour is identical.
"""

TEAM_BUDGET = 100000
TEAM_SIZE = 7

# utr & price derived from category: cat1=6.0/$20k, cat2=5.5/$17.5k,
# cat3=5.0/$15k, cat4=4.5/$12.5k, cat5=4.0/$10k, cat6=3.5/$7.5k, cat7=3.0/$5k.
PLAYERS = [
    {"id": 1, "Name": "Dinkar Bhardwaj", "utr": 6.0, "price": 20000},
    {"id": 2, "Name": "Vinoth Duraisamy", "utr": 6.0, "price": 20000},
    {"id": 3, "Name": "Volkan Bal", "utr": 6.0, "price": 20000},
    {"id": 4, "Name": "Mohammad Azim", "utr": 6.0, "price": 20000},
    {"id": 5, "Name": "Prashant Janmatti", "utr": 5.5, "price": 17500},
    {"id": 6, "Name": "Prashanth Gourineni", "utr": 6.0, "price": 20000},
    {"id": 7, "Name": "Vamsi Atluri", "utr": 6.0, "price": 20000},
    {"id": 8, "Name": "Rajib Sarkar", "utr": 5.5, "price": 17500},
    {"id": 9, "Name": "Vinod Aripaka", "utr": 5.5, "price": 17500},
    {"id": 10, "Name": "Vivekvardhan Reddy Mereddy", "utr": 6.0, "price": 20000},
    {"id": 11, "Name": "Saket Raizada", "utr": 5.0, "price": 15000},
    {"id": 12, "Name": "Anand Krishnamurthy", "utr": 6.0, "price": 20000},
    {"id": 13, "Name": "Kalyan Kalidindi", "utr": 5.5, "price": 17500},
    {"id": 14, "Name": "Vipul Sud", "utr": 5.0, "price": 15000},
    {"id": 15, "Name": "Nagarjuna Saladi", "utr": 6.0, "price": 20000},
    {"id": 16, "Name": "Praveenkumar Vijayakumar", "utr": 5.5, "price": 17500},
    {"id": 17, "Name": "Jayesh Barai", "utr": 6.0, "price": 20000},
    {"id": 18, "Name": "Yogesh Dhadge", "utr": 6.0, "price": 20000},
    {"id": 19, "Name": "Dinesh Reddy Timmareddy", "utr": 5.5, "price": 17500},
    {"id": 20, "Name": "Boopesh Natarajan", "utr": 6.0, "price": 20000},
    {"id": 21, "Name": "Premkumar Balakrishnan", "utr": 5.5, "price": 17500},
    {"id": 22, "Name": "Rajasekhar Chintha", "utr": 5.5, "price": 17500},
    {"id": 23, "Name": "Rajasekhar Mangalampally", "utr": 6.0, "price": 20000},
    {"id": 24, "Name": "Tariq Hussain", "utr": 5.5, "price": 17500},
    {"id": 25, "Name": "Srinath Elitem", "utr": 5.0, "price": 15000},
    {"id": 26, "Name": "Hariprashanth Ganapathy", "utr": 5.0, "price": 15000},
    {"id": 27, "Name": "Rajesh Mishra", "utr": 6.0, "price": 20000},
    {"id": 28, "Name": "Manish Jangid", "utr": 6.0, "price": 20000},
    {"id": 29, "Name": "Hari Mothukuri", "utr": 5.5, "price": 17500},
    {"id": 30, "Name": "Kailas Magi", "utr": 5.5, "price": 17500},
    {"id": 31, "Name": "Janaki Ram Kantheti", "utr": 5.0, "price": 15000},
    {"id": 32, "Name": "Krishna Vennapusa", "utr": 5.0, "price": 15000},
    {"id": 33, "Name": "Satish Reddy Orugunta", "utr": 5.5, "price": 17500},
    {"id": 34, "Name": "Harsha Reddy", "utr": 6.0, "price": 20000},
    {"id": 35, "Name": "Koushik Venkatasubramanian", "utr": 4.5, "price": 12500},
    {"id": 36, "Name": "Anil Kunda", "utr": 5.5, "price": 17500},
    {"id": 37, "Name": "Veeresh Kurni", "utr": 4.5, "price": 12500},
    {"id": 38, "Name": "Vivek Tiku", "utr": 4.5, "price": 12500},
    {"id": 39, "Name": "Jaweed Ibrahim", "utr": 5.0, "price": 15000},
    {"id": 40, "Name": "Mahidhar Penigi", "utr": 5.0, "price": 15000},
    {"id": 41, "Name": "Kalyan Ghanta", "utr": 5.0, "price": 15000},
    {"id": 42, "Name": "Amol Patwardhan", "utr": 4.5, "price": 12500},
    {"id": 43, "Name": "Narayan Prasad", "utr": 5.0, "price": 15000},
    {"id": 44, "Name": "Ritesh Kumar", "utr": 5.5, "price": 17500},
    {"id": 45, "Name": "Rajasekhar Karru", "utr": 5.0, "price": 15000},
    {"id": 46, "Name": "Lloyd Prasana Kumar", "utr": 5.0, "price": 15000},
    {"id": 47, "Name": "Uma Vommi", "utr": 5.0, "price": 15000},
    {"id": 48, "Name": "Ninad Mahajan", "utr": 5.0, "price": 15000},
    {"id": 49, "Name": "Chandrakant Dharme", "utr": 5.0, "price": 15000},
    {"id": 50, "Name": "Chandu M", "utr": 4.0, "price": 10000},
    {"id": 51, "Name": "Sudhakara Nallapati", "utr": 5.5, "price": 17500},
    {"id": 52, "Name": "Biju Koshy", "utr": 4.5, "price": 12500},
    {"id": 53, "Name": "Rajasekhar Chejerla", "utr": 4.0, "price": 10000},
    {"id": 54, "Name": "Nikhil Katakam", "utr": 5.0, "price": 15000},
    {"id": 55, "Name": "Jitender Kumar", "utr": 4.5, "price": 12500},
    {"id": 56, "Name": "Mohamed Noufal", "utr": 4.5, "price": 12500},
    {"id": 57, "Name": "Samir Junnarkar", "utr": 3.5, "price": 7500},
    {"id": 58, "Name": "Raja R", "utr": 4.5, "price": 12500},
    {"id": 59, "Name": "Jay Sermadevi", "utr": 4.5, "price": 12500},
    {"id": 60, "Name": "Bharath Sunku", "utr": 4.5, "price": 12500},
    {"id": 61, "Name": "Prashanth Jayantha Kumar", "utr": 4.5, "price": 12500},
    {"id": 62, "Name": "Amit Gundewar", "utr": 3.5, "price": 7500},
    {"id": 63, "Name": "Bhaskar Boddireddy", "utr": 3.5, "price": 7500},
    {"id": 64, "Name": "Pratik Pitroda", "utr": 4.0, "price": 10000},
    {"id": 65, "Name": "Prashanth Pendli", "utr": 4.0, "price": 10000},
    {"id": 66, "Name": "Vivek Bihani", "utr": 4.0, "price": 10000},
    {"id": 67, "Name": "Mohan Koripuri", "utr": 4.0, "price": 10000},
    {"id": 68, "Name": "Srikant Tenni", "utr": 4.0, "price": 10000},
    {"id": 69, "Name": "Anshul Goyal", "utr": 4.0, "price": 10000},
    {"id": 70, "Name": "Naveenkumar Mohanram", "utr": 4.0, "price": 10000},
    {"id": 71, "Name": "Srinidhi Kulkarni", "utr": 4.5, "price": 12500},
    {"id": 72, "Name": "Vijay Gate", "utr": 4.5, "price": 12500},
    {"id": 73, "Name": "Vinod Punati", "utr": 4.0, "price": 10000},
    {"id": 74, "Name": "Tushar Tipatre", "utr": 4.0, "price": 10000},
    {"id": 75, "Name": "Satya Maddipati", "utr": 3.5, "price": 7500},
    {"id": 76, "Name": "Venky Dh", "utr": 4.5, "price": 12500},
    {"id": 77, "Name": "Sreekanth Bobbala", "utr": 4.0, "price": 10000},
    {"id": 78, "Name": "Malla Reddy Cheerke", "utr": 4.0, "price": 10000},
    {"id": 79, "Name": "Shailendra Patidar", "utr": 4.0, "price": 10000},
    {"id": 80, "Name": "Dineshkumar Kaliyaperumal", "utr": 3.5, "price": 7500},
    {"id": 81, "Name": "Venky Pantham", "utr": 3.0, "price": 5000},
    {"id": 82, "Name": "Sankara Lakshmanan", "utr": 4.0, "price": 10000},
    {"id": 83, "Name": "Sandeep Gengineri", "utr": 4.5, "price": 12500},
    {"id": 84, "Name": "Damodhara Palavali", "utr": 3.5, "price": 7500},
    {"id": 85, "Name": "Sashank T", "utr": 3.5, "price": 7500},
    {"id": 86, "Name": "Sidharth Behera", "utr": 4.0, "price": 10000},
    {"id": 87, "Name": "Nivas Nazeer", "utr": 3.0, "price": 5000},
    {"id": 88, "Name": "Karthik Ragunathan", "utr": 3.5, "price": 7500},
    {"id": 89, "Name": "Charan Macharla", "utr": 3.5, "price": 7500},
    {"id": 90, "Name": "Naseer Mohd", "utr": 3.5, "price": 7500},
    {"id": 91, "Name": "Venkat Thimmisetty", "utr": 3.5, "price": 7500},
    {"id": 92, "Name": "Mayur Patel", "utr": 3.0, "price": 5000},
    {"id": 93, "Name": "Arpit Rawat", "utr": 3.5, "price": 7500},
    {"id": 94, "Name": "Jitin Jaitly", "utr": 3.5, "price": 7500},
    {"id": 95, "Name": "Gopal Setty", "utr": 3.5, "price": 7500},
    {"id": 96, "Name": "Shiva Gundimeda", "utr": 3.5, "price": 7500},
    {"id": 97, "Name": "Joel Kodoru", "utr": 3.0, "price": 5000},
    {"id": 98, "Name": "Trinadh Cheepilla", "utr": 3.0, "price": 5000},
    {"id": 99, "Name": "Satish K", "utr": 3.5, "price": 7500},
    {"id": 100, "Name": "Avinash Terala", "utr": 3.0, "price": 5000},
    {"id": 101, "Name": "Sai Varun Polishetty", "utr": 3.0, "price": 5000},
    {"id": 102, "Name": "Asif Mohammed", "utr": 3.0, "price": 5000},
    {"id": 103, "Name": "Jagapathi Raju", "utr": 3.0, "price": 5000},
    {"id": 104, "Name": "Venice Robinson Amal Doss", "utr": 3.0, "price": 5000},
    {"id": 105, "Name": "Guru Bavirisetty", "utr": 4.5, "price": 12500},
    {"id": 106, "Name": "Raj Chava", "utr": 5.5, "price": 17500},
    {"id": 107, "Name": "Karthik Kumaresan", "utr": 3.0, "price": 5000},
    {"id": 108, "Name": "Abhishek Patel", "utr": 3.0, "price": 5000},
    {"id": 109, "Name": "Raghu Ram", "utr": 3.0, "price": 5000},
    {"id": 110, "Name": "Karthik Ram Senthilvel", "utr": 3.0, "price": 5000},
    {"id": 111, "Name": "Chandan Singh", "utr": 3.0, "price": 5000},
    {"id": 112, "Name": "Venu Sarvepalli", "utr": 3.0, "price": 5000},
]

TEAMS = [
    {"id": 1, "name": "Rally Royals", "captain": "Yogesh Dhadge"},
    {"id": 2, "name": "Karna's Crusaders", "captain": "Srikant Tenni"},
    {"id": 3, "name": "Spin Kings", "captain": "Uma Vommi"},
    {"id": 4, "name": "KOC Challengers", "captain": "Narayan Prasad"},
    {"id": 5, "name": "Rally Sqad", "captain": "Ritesh Kumar"},
    {"id": 6, "name": "POSH", "captain": "Vinod Aripaka"},
    {"id": 7, "name": "Chill Titans", "captain": "Satish Reddy Orugunta"},
    {"id": 8, "name": "Mega Lions", "captain": "Anil Kunda"},
    {"id": 9, "name": "Court Conquerers", "captain": "Rajasekhar Chintha"},
    {"id": 10, "name": "Royal Chill Badgers", "captain": "Janaki Ram Kantheti"},
    {"id": 11, "name": "Volley Vipers", "captain": "Kailas Magi"},
    {"id": 12, "name": "Dallas Chargers", "captain": "Vivekvardhan Reddy Mereddy"},
    {"id": 13, "name": "Baseline Bashers", "captain": "Sashank T"},
    {"id": 14, "name": "Deuce Devils", "captain": "Hari Mothukuri"},
    {"id": 15, "name": "Chill Super Kings", "captain": "Anand Krishnamurthy"},
    {"id": 16, "name": "Courtmasters", "captain": "Dinesh Reddy Timmareddy"},
]

CAPTAIN_NAMES = {t["captain"] for t in TEAMS}

# ----------------------------- Login accounts -----------------------------
# One admin (auctioneer) + 16 team captains, each with a 6-digit PIN.
ADMIN_PIN = "731902"
TEAM_PINS = {
    1: "481027", 2: "635914", 3: "217658", 4: "859302", 5: "374186",
    6: "196540", 7: "742839", 8: "503271", 9: "618495", 10: "285063",
    11: "947612", 12: "360728", 13: "814359", 14: "572046", 15: "639021",
    16: "184756",
}


def get_accounts():
    accounts = [
        {"code": "ADMIN", "pin": ADMIN_PIN, "role": "admin", "teamId": None, "name": "Auctioneer"}
    ]
    for t in TEAMS:
        accounts.append(
            {
                "code": f"TEAM{t['id']}",
                "pin": TEAM_PINS[t["id"]],
                "role": "captain",
                "teamId": t["id"],
                "name": t["captain"],
            }
        )
    return accounts

POOL_ORDER = ["utr_3_0", "utr_3_5", "utr_4_0", "utr_4_5", "utr_5_0", "utr_5_5", "utr_6_0"]


def get_utr_from_key(key: str) -> float:
    return float(key.replace("utr_", "").replace("_", "."))


# Build pools grouped by UTR, captains removed.
PLAYER_POOLS = {}
for _key in POOL_ORDER:
    _utr = get_utr_from_key(_key)
    PLAYER_POOLS[_key] = [
        dict(p) for p in PLAYERS if p["utr"] == _utr and p["Name"] not in CAPTAIN_NAMES
    ]

# Per-team cap for each pool.
POOL_CAPS = {}
for _key in POOL_ORDER:
    _size = len(PLAYER_POOLS[_key])
    POOL_CAPS[_key] = 0 if _size == 0 else (1 if _size <= len(TEAMS) else TEAM_SIZE - 1)


def get_initial_teams():
    """Build the starting team list with captains pre-assigned."""
    by_name = {p["Name"]: p for p in PLAYERS}
    teams = []
    for team in TEAMS:
        cap = by_name.get(team["captain"])
        captain_price = cap["price"] if cap else 0
        players = []
        if cap:
            players.append(
                {
                    "id": "c" + str(team["id"]),
                    "Name": cap["Name"],
                    "utr": cap["utr"],
                    "acquiredPrice": captain_price,
                }
            )
        teams.append(
            {
                "id": team["id"],
                "name": team["name"],
                "captain": team["captain"],
                "players": players,
                "budget": TEAM_BUDGET - captain_price,
                "totalSpent": captain_price,
            }
        )
    return teams


def fresh_pools():
    return {k: [dict(p) for p in v] for k, v in PLAYER_POOLS.items()}


def config_summary():
    pools = []
    for key in POOL_ORDER:
        pools.append(
            {
                "key": key,
                "utr": get_utr_from_key(key),
                "count": len(PLAYER_POOLS[key]),
                "cap": POOL_CAPS[key],
            }
        )
    total_pool_players = sum(len(PLAYER_POOLS[k]) for k in POOL_ORDER)
    return {
        "teams": len(TEAMS),
        "teamSize": TEAM_SIZE,
        "budget": TEAM_BUDGET,
        "totalPlayers": len(PLAYERS),
        "poolPlayers": total_pool_players,
        "pools": pools,
    }
