# Tennis Auction App

React single-page app for running a live tennis auction backed by Firebase Realtime Database.

## Local development

Install dependencies:

```bash
npm install
```

Start the React/Vite dev server:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:5173
```

## Express production-style local server

Build the app, then serve the generated `dist/` folder with Express:

```bash
npm run build
npm run start
```

Open:

```text
http://localhost:3000
```

## Tests

Run the plain Node.js logic tests:

```bash
npm test
```


## Maintaining auction data

Firebase settings, teams, players, and generated pool defaults are split into small files for easier updates:

- `src/config/firebase.js` — Firebase project configuration.
- `src/data/teams.js` — team names and captains.
- `src/data/players.js` — player list, UTR values, and base prices.
- `src/data/settings.js` — budgets, timer, UTR price tiers, and pool order. Player categories map high-to-low as Cat 1 → UTR 6.0 through Cat 7 → UTR 3.0; auction bidding starts at UTR 3.0 and moves upward.
- `src/data/pools.js` — derived captain set, player pools, and default pool caps.

## Notes

The app still uses Firebase Realtime Database in the browser. Internet access is required for Firebase and the Firebase CDN scripts to load.

The app remains PWA-installable: `index.html` links `/manifest.json`, and the same manifest is kept in `public/manifest.json` so Vite copies it into `dist/` during production builds.
