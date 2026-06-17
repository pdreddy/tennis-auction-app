import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
const bundle = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

if (html.includes('@babel/standalone') || html.includes('type="text/babel"')) {
  throw new Error('index.html must not load or use the in-browser Babel transformer. Run npm run build instead.');
}

if (!html.includes('<script src="/app.js"></script>')) {
  throw new Error('index.html must load the precompiled app.js bundle.');
}

if (/^\s*import\s/m.test(bundle)) {
  throw new Error('app.js contains an import statement; it must be browser-ready classic JavaScript.');
}

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
  if (!source.includes(snippet)) throw new Error(`Missing expected app source snippet: ${snippet}`);
}

const playerCount = (source.match(/Name:"/g) || []).length;
const teamCount = (source.match(/captain:"/g) || []).length;
if (playerCount !== 112) throw new Error(`Expected 112 players, found ${playerCount}.`);
if (teamCount !== 16) throw new Error(`Expected 16 teams, found ${teamCount}.`);

if (!bundle.includes('React.createElement')) {
  throw new Error('app.js does not look precompiled; expected React.createElement calls.');
}

console.log('Precompiled React app validation passed.');
console.log('index.html loads app.js without in-browser Babel.');
console.log(`Validated ${playerCount} players and ${teamCount} teams.`);
console.log('Use npm run dev, then open http://localhost:5173 to test in your IDE/browser.');
