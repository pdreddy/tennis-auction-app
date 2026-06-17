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

## Firebase migration and security

The app stores required runtime data in these Realtime Database paths:

- `config` — players, teams, and auction settings.
- `users` — account metadata and PINs needed for sign-in.

Live `auctions` sessions are intentionally not part of the required migration set because they are temporary event state. To copy only the required paths from the current Firebase Realtime Database to another Firebase project, pass service account JSON through environment variables instead of committing key files:

```bash
TARGET_DATABASE_URL="https://pdrdata-bcdc9-default-rtdb.firebaseio.com" \
TARGET_SERVICE_ACCOUNT_JSON="$(cat ./target-service-account.json)" \
npm run firebase:migrate:required
```

The migration runs as a dry run by default. After confirming the source, target, and path counts, run the same command with `DRY_RUN=false` to write to the target database:

```bash
DRY_RUN=false \
TARGET_DATABASE_URL="https://pdrdata-bcdc9-default-rtdb.firebaseio.com" \
TARGET_SERVICE_ACCOUNT_JSON="$(cat ./target-service-account.json)" \
npm run firebase:migrate:required
```

If the source database no longer allows unauthenticated reads, also provide `SOURCE_SERVICE_ACCOUNT_JSON` for the current Firebase project.

Security rules for the target database are in `firebase/database.rules.json`. They deny default access and are designed for authenticated users with an `accountCode` auth token claim. Do not deploy these rules until the client sign-in flow issues Firebase Auth custom tokens, otherwise the browser app will be denied by the database. Any service account private key shared in chat, email, or source control should be treated as compromised and rotated in Google Cloud IAM before production use.
