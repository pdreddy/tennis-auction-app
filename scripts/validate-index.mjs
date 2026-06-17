import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
const bundle = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const firebaseConfig = fs.readFileSync(new URL('../src/config/firebase.js', import.meta.url), 'utf8');
const auctionConfig = fs.readFileSync(new URL('../src/config/auction.js', import.meta.url), 'utf8');
const playersConfig = fs.readFileSync(new URL('../src/config/players.js', import.meta.url), 'utf8');
const teamsConfig = fs.readFileSync(new URL('../src/config/teams.js', import.meta.url), 'utf8');

if (html.includes('@babel/standalone') || html.includes('type="text/babel"')) {
  throw new Error('index.html must not load or use the in-browser Babel transformer. Run npm run build instead.');
}

if (!html.includes('<script type="module" src="/src/app.js"></script>')) {
  throw new Error('index.html must load the precompiled module at /src/app.js.');
}

const requiredSourceSnippets = [
  'import { firebaseConfig } from "./config/firebase.js";',
  'import { TEAM_BUDGET, TEAM_SIZE, TIMER_MS, POOL_ORDER, getUTR } from "./config/auction.js";',
  'import { PLAYERS } from "./config/players.js";',
  'import { TEAMS } from "./config/teams.js";',
  'function Login({ onLogin })',
  'function ManagePins()',
  'function PoolViewer()',
  'function Lobby({ user, onJoin, onLogout })',
  'function Auction({ sid, user, onBack })',
  'function RosterCard({team})',
  'onKeyDown={e => e.key==="Enter" && submit()}',
];

for (const snippet of requiredSourceSnippets) {
  if (!source.includes(snippet)) throw new Error(`Missing expected app source snippet: ${snippet}`);
}

const playerCount = (playersConfig.match(/Name:"/g) || []).length;
const teamCount = (teamsConfig.match(/captain:"/g) || []).length;
if (playerCount !== 112) throw new Error(`Expected 112 players, found ${playerCount}.`);
if (teamCount !== 16) throw new Error(`Expected 16 teams, found ${teamCount}.`);

for (const [name, text, snippet] of [
  ['firebase config', firebaseConfig, 'export const firebaseConfig'],
  ['auction config', auctionConfig, 'export const TEAM_BUDGET'],
  ['players config', playersConfig, 'export const PLAYERS'],
  ['teams config', teamsConfig, 'export const TEAMS'],
]) {
  if (!text.includes(snippet)) throw new Error(`Missing ${snippet} in ${name}.`);
}

if (!bundle.includes('React.createElement')) {
  throw new Error('src/app.js does not look precompiled; expected React.createElement calls.');
}

console.log('Config-driven React app validation passed.');
console.log('index.html loads src/app.js as a browser module without in-browser Babel.');
console.log(`Validated ${playerCount} players and ${teamCount} teams from config files.`);
console.log('Use npm run dev, then open http://localhost:5173 to test in your IDE/browser.');
