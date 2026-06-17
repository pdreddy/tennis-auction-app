import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);

if (!scriptMatch) throw new Error('Could not find the inline React/Babel script in index.html.');

const script = scriptMatch[1];
const requiredSnippets = [
  'function Login({ onLogin })',
  'function ManagePins()',
  'function PoolViewer()',
  'function Lobby({ user, onJoin, onLogout })',
  'function Auction({ sid, user, onBack })',
  'function RosterCard({team})',
  'ReactDOM.createRoot(document.getElementById("root")).render(<App/>);',
  'onKeyDown={e => e.key==="Enter" && submit()}',
];

for (const snippet of requiredSnippets) {
  if (!script.includes(snippet)) throw new Error(`Missing expected app snippet: ${snippet}`);
}

const playerCount = (script.match(/Name:"/g) || []).length;
const teamCount = (script.match(/captain:"/g) || []).length;
if (playerCount !== 112) throw new Error(`Expected 112 players, found ${playerCount}.`);
if (teamCount !== 16) throw new Error(`Expected 16 teams, found ${teamCount}.`);

const opens = (html.match(/<[^/!][^>]*>/g) || []).length;
const closes = (html.match(/<\/[a-zA-Z][^>]*>/g) || []).length;
if (closes > opens) throw new Error('HTML closing tag count exceeds opening tag count.');

console.log('index.html validation passed.');
console.log(`Validated ${playerCount} players and ${teamCount} teams.`);
console.log('Use npm run dev, then open http://localhost:5173 to test in your IDE/browser.');
