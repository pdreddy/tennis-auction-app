import { CATEGORY_UTR, UTR_PRICES } from "./settings.js";

export const RAW_PLAYERS = [
    {
        "name": "Dinkar Bhardwaj",
        "best": 6.97,
        "cat": 1,
        "s": 6.97,
        "d": 6.44
    },
    {
        "name": "Vinoth Duraisamy",
        "best": 6.71,
        "cat": 1,
        "s": 6.71,
        "d": 6.11
    },
    {
        "name": "Volkan Bal",
        "best": 6.48,
        "cat": 1,
        "s": 6.48,
        "d": 6.01
    },
    {
        "name": "Mohammad Azim",
        "best": 6.31,
        "cat": 1,
        "s": 6.31,
        "d": 5.82
    },
    {
        "name": "Prashant Janmatti",
        "best": 6.28,
        "cat": 2,
        "s": null,
        "d": 6.28
    },
    {
        "name": "Prashanth Gourineni",
        "best": 6.18,
        "cat": 1,
        "s": 5.9,
        "d": 6.18
    },
    {
        "name": "Vamsi Atluri",
        "best": 6.14,
        "cat": 1,
        "s": 5.14,
        "d": 6.14
    },
    {
        "name": "Rajib Sarkar",
        "best": 6.06,
        "cat": 2,
        "s": 4.89,
        "d": 6.06
    },
    {
        "name": "Vinod Aripaka",
        "best": 6.03,
        "cat": 2,
        "s": 4.4,
        "d": 6.03
    },
    {
        "name": "Vivekvardhan Reddy Mereddy",
        "best": 5.98,
        "cat": 1,
        "s": 5.98,
        "d": 5.31
    },
    {
        "name": "Saket Raizada",
        "best": 5.98,
        "cat": 3,
        "s": 5.98,
        "d": 5.53
    },
    {
        "name": "Anand Krishnamurthy",
        "best": 5.96,
        "cat": 1,
        "s": 5.02,
        "d": 5.96
    },
    {
        "name": "Kalyan Kalidindi",
        "best": 5.94,
        "cat": 2,
        "s": null,
        "d": 5.94
    },
    {
        "name": "Vipul Sud",
        "best": 5.92,
        "cat": 3,
        "s": null,
        "d": 5.92
    },
    {
        "name": "Vinod Marakoosham",
        "best": 6.14,
        "cat": 1,
        "s": 6.1,
        "d": 6.14
    },
    {
        "name": "Praveenkumar Vijayakumar",
        "best": 5.9,
        "cat": 2,
        "s": null,
        "d": 5.9
    },
    {
        "name": "Jayesh Barai",
        "best": 5.89,
        "cat": 1,
        "s": 5.78,
        "d": 5.89
    },
    {
        "name": "Yogesh Dhadge",
        "best": 5.89,
        "cat": 1,
        "s": 5.21,
        "d": 5.89
    },
    {
        "name": "Dinesh Reddy Timmareddy",
        "best": 5.88,
        "cat": 1,
        "s": 5.13,
        "d": 5.88
    },
    {
        "name": "Boopesh Natarajan",
        "best": 5.87,
        "cat": 1,
        "s": 5.62,
        "d": 5.87
    },
    {
        "name": "Premkumar Balakrishnan",
        "best": 5.86,
        "cat": 2,
        "s": 4.76,
        "d": 5.86
    },
    {
        "name": "Rajasekhar Chintha",
        "best": 5.82,
        "cat": 2,
        "s": 4.45,
        "d": 5.82
    },
    {
        "name": "Rajasekhar Mangalampally",
        "best": 5.81,
        "cat": 2,
        "s": 5.81,
        "d": 5.35
    },
    {
        "name": "Tariq Hussain",
        "best": 5.74,
        "cat": 2,
        "s": null,
        "d": 5.74
    },
    {
        "name": "Srinath Elitem",
        "best": 5.72,
        "cat": 3,
        "s": null,
        "d": 5.72
    },
    {
        "name": "Hariprashanth Ganapathy",
        "best": 5.7,
        "cat": 3,
        "s": 4.8,
        "d": 5.7
    },
    {
        "name": "Rajesh Mishra",
        "best": 5.69,
        "cat": 1,
        "s": 5.69,
        "d": 5.48
    },
    {
        "name": "Manish Jangid",
        "best": 5.68,
        "cat": 1,
        "s": 5.25,
        "d": 5.68
    },
    {
        "name": "Hari Mothukuri",
        "best": 5.62,
        "cat": 2,
        "s": 4.43,
        "d": 5.62
    },
    {
        "name": "Kailas Magi",
        "best": 5.58,
        "cat": 2,
        "s": 4.47,
        "d": 5.58
    },
    {
        "name": "Janaki Ram Kantheti",
        "best": 5.56,
        "cat": 3,
        "s": 3.71,
        "d": 5.56
    },
    {
        "name": "Krishna Vennapusa",
        "best": 5.54,
        "cat": 3,
        "s": 4.76,
        "d": 5.54
    },
    {
        "name": "Satish Reddy Orugunta",
        "best": 5.52,
        "cat": 2,
        "s": 4.83,
        "d": 5.52
    },
    {
        "name": "Harsha Reddy",
        "best": 5.52,
        "cat": 1,
        "s": 5.29,
        "d": 5.52
    },
    {
        "name": "Koushik Venkatasubramanian",
        "best": 5.46,
        "cat": 4,
        "s": null,
        "d": 5.46
    },
    {
        "name": "Anil Kunda",
        "best": 5.4,
        "cat": 2,
        "s": null,
        "d": 5.4
    },
    {
        "name": "Veeresh Kurni",
        "best": 5.39,
        "cat": 4,
        "s": null,
        "d": 5.39
    },
    {
        "name": "Vivek Tiku",
        "best": 5.38,
        "cat": 4,
        "s": 1.82,
        "d": 5.38
    },
    {
        "name": "Jaweed Ibrahim",
        "best": 5.34,
        "cat": 3,
        "s": 4.36,
        "d": 5.34
    },
    {
        "name": "Mahidhar Penigi",
        "best": 5.34,
        "cat": 3,
        "s": 5.34,
        "d": 4.48
    },
    {
        "name": "Kalyan Ghanta",
        "best": 5.33,
        "cat": 3,
        "s": 5,
        "d": 5.33
    },
    {
        "name": "Amol Patwardhan",
        "best": 5.32,
        "cat": 4,
        "s": null,
        "d": 5.32
    },
    {
        "name": "Narayan Prasad",
        "best": 5.28,
        "cat": 3,
        "s": 4.7,
        "d": 5.28
    },
    {
        "name": "Ritesh Kumar",
        "best": 5.26,
        "cat": 2,
        "s": 4.1,
        "d": 5.26
    },
    {
        "name": "Rajasekhar Karru",
        "best": 5.25,
        "cat": 3,
        "s": 4.37,
        "d": 5.25
    },
    {
        "name": "Lloyd Prasana Kumar",
        "best": 5.24,
        "cat": 3,
        "s": null,
        "d": 5.24
    },
    {
        "name": "Uma Vommi",
        "best": 5.2,
        "cat": 3,
        "s": 5.2,
        "d": 4.77
    },
    {
        "name": "Ninad Mahajan",
        "best": 5.2,
        "cat": 3,
        "s": 4.39,
        "d": 5.2
    },
    {
        "name": "Chandrakant Dharme",
        "best": 5.19,
        "cat": 3,
        "s": 5.19,
        "d": 5.03
    },
    {
        "name": "Chandu M",
        "best": 5.14,
        "cat": 5,
        "s": 4.1,
        "d": 5.14
    },
    {
        "name": "Sudhakara Nallapati",
        "best": 5.13,
        "cat": 2,
        "s": 4.45,
        "d": 5.13
    },
    {
        "name": "Biju Koshy",
        "best": 5.12,
        "cat": 4,
        "s": 4,
        "d": 5.12
    },
    {
        "name": "Rajasekhar Chejerla",
        "best": 5.11,
        "cat": 5,
        "s": 3.18,
        "d": 5.11
    },
    {
        "name": "Nikhil Katakam",
        "best": 5.1,
        "cat": 3,
        "s": 5.1,
        "d": 4.86
    },
    {
        "name": "Jitender Kumar",
        "best": 5.1,
        "cat": 4,
        "s": 4.08,
        "d": 5.1
    },
    {
        "name": "Mohamed Noufal",
        "best": 5.1,
        "cat": 4,
        "s": 4.14,
        "d": 5.1
    },
    {
        "name": "Samir Junnarkar",
        "best": 5.08,
        "cat": 6,
        "s": 2.93,
        "d": 5.08
    },
    {
        "name": "Raja R",
        "best": 5.05,
        "cat": 4,
        "s": null,
        "d": 5.05
    },
    {
        "name": "Jay Sermadevi",
        "best": 4.98,
        "cat": 4,
        "s": 4.98,
        "d": null
    },
    {
        "name": "Bharath Sunku",
        "best": 4.97,
        "cat": 4,
        "s": 4.27,
        "d": 4.97
    },
    {
        "name": "Prashanth Jayantha Kumar",
        "best": 4.93,
        "cat": 4,
        "s": 4.93,
        "d": 3.7
    },
    {
        "name": "Amit Gundewar",
        "best": 4.9,
        "cat": 6,
        "s": 3.4,
        "d": 4.9
    },
    {
        "name": "Bhaskar Boddireddy",
        "best": 4.87,
        "cat": 6,
        "s": 3.84,
        "d": 4.87
    },
    {
        "name": "Pratik Pitroda",
        "best": 4.85,
        "cat": 5,
        "s": 3.6,
        "d": 4.85
    },
    {
        "name": "Prashanth Pendli",
        "best": 4.81,
        "cat": 5,
        "s": 4.79,
        "d": 4.81
    },
    {
        "name": "Vivek Bihani",
        "best": 4.8,
        "cat": 5,
        "s": 4.41,
        "d": 4.8
    },
    {
        "name": "Mohan Koripuri",
        "best": 4.76,
        "cat": 5,
        "s": 3.8,
        "d": 4.76
    },
    {
        "name": "Srikant Tenni",
        "best": 4.76,
        "cat": 5,
        "s": null,
        "d": 4.76
    },
    {
        "name": "Anshul Goyal",
        "best": 4.75,
        "cat": 5,
        "s": 4.63,
        "d": 4.75
    },
    {
        "name": "Naveenkumar Mohanram",
        "best": 4.7,
        "cat": 5,
        "s": 3.88,
        "d": 4.7
    },
    {
        "name": "Srinidhi Kulkarni",
        "best": 4.69,
        "cat": 4,
        "s": 4.69,
        "d": null
    },
    {
        "name": "Vijay Gate",
        "best": 4.68,
        "cat": 4,
        "s": 4.68,
        "d": 4.48
    },
    {
        "name": "Vinod Punati",
        "best": 4.67,
        "cat": 5,
        "s": 4.27,
        "d": 4.67
    },
    {
        "name": "Tushar Tipatre",
        "best": 4.65,
        "cat": 5,
        "s": null,
        "d": 4.65
    },
    {
        "name": "Satya Maddipati",
        "best": 4.6,
        "cat": 6,
        "s": 3.52,
        "d": 4.6
    },
    {
        "name": "Venky Dh",
        "best": 4.58,
        "cat": 4,
        "s": 4.49,
        "d": 4.58
    },
    {
        "name": "Sreekanth Bobbala",
        "best": 4.56,
        "cat": 5,
        "s": 3.66,
        "d": 4.56
    },
    {
        "name": "Malla Reddy Cheerke",
        "best": 4.49,
        "cat": 6,
        "s": 4.49,
        "d": 3.99
    },
    {
        "name": "Shailendra Patidar",
        "best": 4.47,
        "cat": 5,
        "s": 3.65,
        "d": 4.47
    },
    {
        "name": "Dineshkumar Kaliyaperumal",
        "best": 4.47,
        "cat": 6,
        "s": null,
        "d": 4.47
    },
    {
        "name": "Venky Pantham",
        "best": 4.45,
        "cat": 7,
        "s": 2.99,
        "d": 4.45
    },
    {
        "name": "Sankara Lakshmanan",
        "best": 4.44,
        "cat": 5,
        "s": 4.18,
        "d": 4.44
    },
    {
        "name": "Sandeep Gengineri",
        "best": 4.34,
        "cat": 4,
        "s": 4.34,
        "d": 4.13
    },
    {
        "name": "Damodhara Palavali",
        "best": 4.26,
        "cat": 6,
        "s": 3.58,
        "d": 4.26
    },
    {
        "name": "Sashank T",
        "best": 4.22,
        "cat": 5,
        "s": 3.64,
        "d": 4.22
    },
    {
        "name": "Sidharth Behera",
        "best": 4.19,
        "cat": 5,
        "s": 4.19,
        "d": null
    },
    {
        "name": "Nivas Nazeer",
        "best": 4.14,
        "cat": 7,
        "s": 2.02,
        "d": 4.14
    },
    {
        "name": "Karthik Ragunathan",
        "best": 4.14,
        "cat": 6,
        "s": 3.33,
        "d": 4.14
    },
    {
        "name": "Charan Macharla",
        "best": 4.03,
        "cat": 6,
        "s": null,
        "d": 4.03
    },
    {
        "name": "Naseer Mohd",
        "best": 3.97,
        "cat": 6,
        "s": null,
        "d": 3.97
    },
    {
        "name": "Venkat Thimmisetty",
        "best": 3.95,
        "cat": 6,
        "s": 3.74,
        "d": 3.95
    },
    {
        "name": "Mayur Patel",
        "best": 3.94,
        "cat": 7,
        "s": null,
        "d": 3.94
    },
    {
        "name": "Arpit Rawat",
        "best": 3.94,
        "cat": 6,
        "s": 3.94,
        "d": null
    },
    {
        "name": "Jitin Jaitly",
        "best": 3.82,
        "cat": 6,
        "s": 3.47,
        "d": 3.82
    },
    {
        "name": "Gopal Setty",
        "best": 3.78,
        "cat": 6,
        "s": 3.78,
        "d": 3.78
    },
    {
        "name": "Shiva Gundimeda",
        "best": 3.74,
        "cat": 6,
        "s": 3.2,
        "d": 3.74
    },
    {
        "name": "Joel Kodoru",
        "best": 3.62,
        "cat": 7,
        "s": 2,
        "d": 3.62
    },
    {
        "name": "Trinadh Cheepilla",
        "best": 3.42,
        "cat": 7,
        "s": 2.93,
        "d": 3.42
    },
    {
        "name": "Satish K",
        "best": 3.38,
        "cat": 6,
        "s": null,
        "d": 3.38
    },
    {
        "name": "Avinash Terala",
        "best": 3.35,
        "cat": 7,
        "s": 3.21,
        "d": 3.35
    },
    {
        "name": "Sai Varun Polishetty",
        "best": 2.94,
        "cat": 7,
        "s": 2.94,
        "d": null
    },
    {
        "name": "Asif Mohammed",
        "best": 2.8,
        "cat": 7,
        "s": 2.8,
        "d": null
    },
    {
        "name": "Jagapathi Raju",
        "best": 2.67,
        "cat": 7,
        "s": 2.67,
        "d": null
    },
    {
        "name": "Venice Robinson Amal Doss",
        "best": 2.38,
        "cat": 7,
        "s": 2.25,
        "d": 2.38
    },
    {
        "name": "Guru Bavirisetty",
        "best": null,
        "cat": 4,
        "s": null,
        "d": null
    },
    {
        "name": "Raj Chava",
        "best": null,
        "cat": 2,
        "s": null,
        "d": null
    },
    {
        "name": "Karthik Kumaresan",
        "best": null,
        "cat": 7,
        "s": null,
        "d": null
    },
    {
        "name": "Abhishek Patel",
        "best": null,
        "cat": 7,
        "s": null,
        "d": null
    },
    {
        "name": "Raghu Ram",
        "best": null,
        "cat": 7,
        "s": null,
        "d": null
    },
    {
        "name": "Karthik Ram Senthilvel",
        "best": null,
        "cat": 7,
        "s": null,
        "d": null
    },
    {
        "name": "Chandan Singh",
        "best": null,
        "cat": 7,
        "s": null,
        "d": null
    },
    {
        "name": "Venu Sarvepalli",
        "best": null,
        "cat": 7,
        "s": null,
        "d": null
    }
];

const normalizeName = name => (name || "").trim().toLowerCase();
const withoutUndefined = obj => Object.fromEntries(Object.entries(obj).filter(([,value]) => value !== undefined));
const toPlayer = (player, index) => {
    const utr = CATEGORY_UTR[player.cat] || 3.0;
    return {
        id: index + 1,
        Name: player.name,
        utr,
        price: UTR_PRICES[utr] || 5000,
        cat: player.cat,
        group: `UTR ${utr.toFixed(1)}`,
        best: player.best,
        s: player.s,
        d: player.d
    };
};

export const PLAYERS = RAW_PLAYERS.map(toPlayer);
export const PLAYER_BY_NAME = new Map(PLAYERS.map(player => [normalizeName(player.Name), player]));

export function withPlayerMeta(player) {
    if (!player) return player;
    const name = player.Name || player.name || "";
    const catalogPlayer = PLAYER_BY_NAME.get(normalizeName(name));
    if (!catalogPlayer) return withoutUndefined({...player, Name: name});
    return withoutUndefined({
        ...player,
        ...catalogPlayer,
        id: player.id ?? catalogPlayer.id,
        Name: catalogPlayer.Name,
        acquiredPrice: player.acquiredPrice,
        isRetry: player.isRetry,
        retryCount: player.retryCount
    });
}
