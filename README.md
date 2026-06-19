# Tennis Auction App

React single-page app for running a live tennis auction with Firebase Realtime Database or an API-backed Upstash Redis database. This repo is ready to deploy on Netlify and still keeps the Vercel API route for existing deployments.

## Local development

Install dependencies:

```bash
npm install
```

Create local Firebase environment settings:

```bash
cp .env.example .env.local
```

Keep `VITE_DATABASE_PROVIDER=netlify` for the Netlify-hosted Upstash database function, or set `VITE_DATABASE_PROVIDER=firebase` and provide the Firebase variables if you want direct Firebase Realtime Database access. Existing Vercel deployments can continue using `VITE_DATABASE_PROVIDER=vercel`.

Start the React/Vite dev server:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:5173
```

## Production build

Build the app locally before deploying:

```bash
npm run build
```

Preview the generated `dist/` folder locally with Vite:

```bash
npm run start
```

Open:

```text
http://localhost:3000
```

## Anti-snipe bidding

The auction includes an anti-snipe extension to prevent a team from winning only because it bid in the final second. By default, if a valid bid is placed with fewer than 3 seconds remaining, the timer is extended so 3 seconds remain. Admins can adjust or disable this in the setup settings by changing **Anti-Snipe Window** or **Anti-Snipe Extension**.

## Database options

The app defaults to the Netlify-friendly API-backed provider for new deployments. Set `VITE_DATABASE_PROVIDER=netlify` and connect an Upstash Redis database, or explicitly set `VITE_DATABASE_PROVIDER=firebase` when you have Firebase Realtime Database environment variables configured. The API-backed provider stores the app state in Redis through `/api/db/*` serverless functions and polls for updates from the browser.

### Firebase provider

Use Firebase when you want native realtime subscriptions from Firebase Realtime Database. Only select this provider after setting your Firebase environment variables; otherwise use `netlify` so the app does not try to initialize Firebase with a blank database URL. Configure the `VITE_FIREBASE_*` variables in `.env.local` for local development and in your hosting provider environment variables for production.

### Netlify / Upstash Redis provider

Use this provider when you want the app data to live behind Netlify Functions instead of direct browser Firebase access. In Netlify:

1. Create or connect an Upstash Redis database and copy its REST URL and REST token.
2. Add `VITE_DATABASE_PROVIDER=netlify`.
3. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as server-only environment variables. If you are using Firebase Realtime Database with public rules instead of Upstash, set `FIREBASE_DATABASE_URL` on Netlify and leave the Upstash variables blank.
4. Optionally change `NETLIFY_DB_KEY` if multiple deployments should not share the same Redis document.
5. Redeploy the project.

The Netlify provider intentionally does not expose the Redis token to the browser. Browser code talks only to the local `/api/db/*` route, which `netlify.toml` rewrites to `/.netlify/functions/db/*`. Existing Vercel deployments can use the same Redis variables with `VITE_DATABASE_PROVIDER=vercel`.

## Creating a completely new repository

Use these steps when you want this app to become a brand-new GitHub/Vercel project instead of keeping the current Git history:

```bash
# From the parent folder of this project
cp -R tennis-auction-app tennis-auction-app-new
cd tennis-auction-app-new
rm -rf .git node_modules dist .vercel
git init
git add .
git commit -m "Initial Netlify tennis auction app"
git branch -M main
git remote add origin <your-new-github-repo-url>
git push -u origin main
```

After pushing, import the new GitHub repository into Netlify and add either the Firebase or Netlify/Upstash environment variables from `.env.example` in the Netlify site settings.

## Deploying to Netlify

This repository is configured for Netlify with `netlify.toml`. Netlify runs `npm run build`, publishes the generated `dist/` directory, serves the database function from `netlify/functions`, and rewrites app routes back to `index.html` so the React single-page app works on direct refreshes.

To deploy from the Netlify dashboard:

1. Import this Git repository into Netlify.
2. Keep the detected framework as **Vite**.
3. Confirm the build command is `npm run build` and the publish directory is `dist`.
4. Choose a database provider: keep `VITE_DATABASE_PROVIDER=netlify` and add the Upstash Redis REST variables, or set `VITE_DATABASE_PROVIDER=firebase` with all Firebase variables.
5. Deploy.

When using Firebase, the browser connects directly to Firebase, so make sure the configured Firebase project allows your Netlify domain in any Firebase/Auth or database rules you use. When using the Netlify provider, the browser talks to `/api/db/*` and the Redis token remains server-side.

## Tests

Run the plain Node.js logic tests:

```bash
npm test
```


## Maintaining auction data

Firebase settings, teams, players, and generated pool defaults are split into small files for easier updates:

- `src/config/firebase.js` — database provider selection, Firebase setup, API-backed adapter, editable `DATA_PATHS`, and helper functions for database references.
- `netlify/functions/db.js` — Netlify Function that stores and reads app state from Upstash Redis when `VITE_DATABASE_PROVIDER=netlify`.
- `api/db/[...path].js` — Vercel serverless API route that stores and reads app state from Upstash Redis when `VITE_DATABASE_PROVIDER=vercel`.
- `src/config/pins.json` — default 6-digit PINs for admin and team accounts; the admin PIN screen can load these and save them into Firebase.
- `src/data/teams.js` — team names and captains.
- `src/data/players.js` — player list, UTR values, and base prices.
- `src/data/settings.js` — budgets, timer, anti-snipe defaults, UTR price tiers, and pool order. Player categories map high-to-low as Cat 1 → UTR 6.0 through Cat 7 → UTR 3.0; auction bidding starts at UTR 3.0 and moves upward.
- `src/data/pools.js` — derived captain set, player pools, and default pool caps.

## Notes

The app can use Firebase Realtime Database in the browser or the Netlify/Vercel Upstash Redis provider through serverless API routes. Internet access is required for Firebase scripts or hosted database calls to load.


### Tables / keys required for a new database

The Redis-backed provider stores everything in one JSON document under `NETLIFY_DB_KEY` (default `tennis-auction-app:data`), so you do not need SQL tables. Inside that document, or in Firebase paths if you use Firebase, the app needs these top-level collections:

- `config` — saved auction configuration, players, teams, and settings. The app can insert this after setup.
- `users` — admin and team PIN records. You can insert defaults from `src/config/pins.json` using the admin PIN screen.
- `auctionsdata` — live auction sessions. The app creates session rows/objects as auctions start and progress.

If you choose a SQL database later, create equivalent tables named `config`, `users`, and `auctionsdata`, or map those concepts in your API layer.


### Seeding Firebase Realtime Database

If you use Firebase instead of Netlify/Upstash, create these Realtime Database paths before the auction starts: `config`, `users`, and `auctionsdata`. This repository includes a seed script that writes the current player list, teams, settings, default PIN users, and an initialized auction collection marker so all required paths are visible in Firebase. The running app now reads auction players only from the database `config.players` path; it does not fall back to the bundled player catalog in the UI when that path is empty. In Admin Config, upload either CSV or JSON player data, then click **Save All**; the save writes `config.players` and also initializes missing `users` records and `auctionsdata._initialized` automatically.

If your Realtime Database rules are temporarily public (`.read`/`.write` set to `true`), you can seed with only `FIREBASE_DATABASE_URL`. For locked-down rules, pass a service account through an environment variable. Do not commit a Firebase service account JSON file, and rotate the key if it has been exposed. Example:

```bash
export FIREBASE_DATABASE_URL="https://pdrdata-bcdc9-default-rtdb.firebaseio.com"
# Optional when rules are not public:
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
npm run seed:firebase
```

Optional path overrides are available with `FIREBASE_CONFIG_PATH`, `FIREBASE_USERS_PATH`, and `FIREBASE_AUCTIONS_PATH`. Firebase may hide empty objects in the console, so the script writes `auctionsdata._initialized` to make that required path visible before the first auction session is created.

### Firebase setup and data paths

Database wiring lives in `src/config/firebase.js`. To point a new repo at a different Firebase project, set the `VITE_FIREBASE_*` values in `.env.local` for local development and in your hosting provider environment variables for production. To switch to the alternate Netlify database, set `VITE_DATABASE_PROVIDER=netlify` and configure the Upstash Redis variables from `.env.example`. To change where data is stored, set the optional path variables from `.env.example` or edit the `DATA_PATHS` defaults in `src/config/firebase.js`:

- `config` — saved auction configuration, players, teams, and settings.
- `users` — PIN login records. Defaults can be edited in `src/config/pins.json`, loaded in the admin PIN screen, then saved to this database path.
- `auctions` — live auction sessions.
- `connected` — Firebase connection status path; normally leave this as `.info/connected`.

Admin sign-in is separated from team sign-in on the login screen. Captains choose only team accounts; admins switch to **Admin Login** and enter the admin access code plus the admin PIN saved under `users/ADMIN`.

The app remains PWA-installable: `index.html` links `/manifest.json`, and the same manifest is kept in `public/manifest.json` so Vite copies it into `dist/` during production builds.
