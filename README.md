# Tennis Auction App

React single-page app for running a live tennis auction with either Firebase Realtime Database or an API-backed Upstash Redis database. This repo is ready to deploy to Netlify or Vercel.

## Local development

Install dependencies:

```bash
npm install
```

Create local Firebase environment settings:

```bash
cp .env.example .env.local
```

Keep `VITE_DATABASE_PROVIDER=firebase` for Firebase, or set `VITE_DATABASE_PROVIDER=vercel` and provide the Upstash Redis REST values through your hosting provider environment variables for the alternate API-backed database.

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

The app defaults to Firebase for full realtime updates. For an API-backed Upstash Redis path, set `VITE_DATABASE_PROVIDER=vercel` and provide Upstash Redis REST credentials. The API-backed provider stores the app state in Redis through `/api/db/*` serverless functions and polls for updates from the browser.

### Firebase provider

Use Firebase when you want native realtime subscriptions from Firebase Realtime Database. Configure the `VITE_FIREBASE_*` variables in `.env.local` for local development and in Vercel environment variables for production.

### API-backed Upstash Redis provider

Use this provider when you want the app data to live behind serverless functions instead of direct browser Firebase access. In Vercel:

1. Install an Upstash Redis integration from the Vercel Marketplace.
2. Add `VITE_DATABASE_PROVIDER=vercel`.
3. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as server-only environment variables.
4. Optionally change `VERCEL_DB_KEY` if multiple deployments should not share the same Redis document.
5. Redeploy the project.

The API-backed provider intentionally does not expose the Redis token to the browser. Browser code talks only to the local `/api/db/*` API route.

## Creating a completely new repository

Use these steps when you want this app to become a brand-new GitHub/Vercel project instead of keeping the current Git history:

```bash
# From the parent folder of this project
cp -R tennis-auction-app tennis-auction-app-new
cd tennis-auction-app-new
rm -rf .git node_modules dist .vercel
git init
git add .
git commit -m "Initial Vercel tennis auction app"
git branch -M main
git remote add origin <your-new-github-repo-url>
git push -u origin main
```

After pushing, import the new GitHub repository into Vercel and add either the Firebase or Vercel/Upstash environment variables from `.env.example` in the Vercel project settings.

## Deploying to Netlify

This repository is configured for Netlify with `netlify.toml`. Netlify runs `npm run build`, publishes the generated `dist/` directory, serves the database function from `netlify/functions`, rewrites `/api/db/*` to that function, and rewrites app routes back to `index.html` so the React single-page app works on direct refreshes.

To deploy from the Netlify dashboard:

1. Import this Git repository into Netlify.
2. Keep the build command as `npm run build` and the publish directory as `dist`.
3. Choose a database provider: keep Firebase variables, or set `VITE_DATABASE_PROVIDER=vercel` and add `UPSTASH_REDIS_REST_URL` plus `UPSTASH_REDIS_REST_TOKEN` as server-only environment variables.
4. Optionally set `NETLIFY_DB_KEY` if multiple deployments should not share the same Redis document.
5. Deploy.

To deploy from the Netlify CLI:

```bash
npm install -g netlify-cli
netlify deploy
netlify deploy --prod
```

When using Firebase, the browser connects directly to Firebase, so make sure the configured Firebase project allows your Netlify domain in any Firebase/Auth or database rules you use. When using the API-backed provider, the browser talks to `/api/db/*` and the Redis token remains server-side.

## Deploying to Vercel

This repository is configured for Vercel with `vercel.json`. Vercel runs `npm run build`, publishes the generated `dist/` directory, and rewrites app routes back to `index.html` so the React single-page app works on direct refreshes.

To deploy from the Vercel dashboard:

1. Import this Git repository into Vercel.
2. Keep the detected framework as **Vite**.
3. Confirm the build command is `npm run build` and the output directory is `dist`.
4. Choose a database provider: keep Firebase variables, or set `VITE_DATABASE_PROVIDER=vercel` and add the Upstash Redis REST variables.
5. Deploy.

To deploy from the Vercel CLI:

```bash
npm install -g vercel
vercel
vercel --prod
```

When using Firebase, the browser connects directly to Firebase, so make sure the configured Firebase project allows your Vercel domain in any Firebase/Auth or database rules you use. When using the Vercel provider, the browser talks to `/api/db/*` and the Redis token remains server-side.

## Tests

Run the plain Node.js logic tests:

```bash
npm test
```


## Maintaining auction data

Firebase settings, teams, players, and generated pool defaults are split into small files for easier updates:

- `src/config/firebase.js` — database provider selection, Firebase setup, Vercel API-backed adapter, editable `DATA_PATHS`, and helper functions for database references.
- `api/db/[...path].js` — Vercel serverless API route that stores and reads app state from Upstash Redis when `VITE_DATABASE_PROVIDER=vercel`.
- `netlify/functions/db.js` — Netlify serverless function that supports the same `/api/db/*` database API through `netlify.toml` redirects.
- `src/config/pins.json` — default 6-digit PINs for admin and team accounts; the admin PIN screen can load these and save them into Firebase.
- `src/data/teams.js` — team names and captains.
- `src/data/players.js` — player list, UTR values, and base prices.
- `src/data/settings.js` — budgets, timer, anti-snipe defaults, UTR price tiers, and pool order. Player categories map high-to-low as Cat 1 → UTR 6.0 through Cat 7 → UTR 3.0; auction bidding starts at UTR 3.0 and moves upward.
- `src/data/pools.js` — derived captain set, player pools, and default pool caps.

## Notes

The app can use Firebase Realtime Database in the browser or the Vercel/Upstash Redis provider through serverless API routes. Internet access is required for Firebase scripts or hosted database calls to load.

### Firebase setup and data paths

Database wiring lives in `src/config/firebase.js`. To point a new repo at a different Firebase project, set the `VITE_FIREBASE_*` values in `.env.local` for local development and in your host environment variables for production. To switch to the alternate API-backed database, set `VITE_DATABASE_PROVIDER=vercel` and configure the Upstash Redis variables from `.env.example`. To change where data is stored, set the optional path variables from `.env.example` or edit the `DATA_PATHS` defaults in `src/config/firebase.js`:

- `config` — saved auction configuration, players, teams, and settings.
- `users` — PIN login records. Defaults can be edited in `src/config/pins.json`, loaded in the admin PIN screen, then saved to this database path.
- `auctions` — live auction sessions.
- `connected` — Firebase connection status path; normally leave this as `.info/connected`.

Admin sign-in is separated from team sign-in on the login screen. Captains choose only team accounts; admins switch to **Admin Login** and enter the admin access code plus the admin PIN saved under `users/ADMIN`. The login screen accepts the matching bundled default in `src/config/pins.json` for initial setup, including `ADMIN` / `198198`, even before PINs have been saved to the database or if the saved admin PIN needs to be recovered.

The app remains PWA-installable: `index.html` links `/manifest.json`, and the same manifest is kept in `public/manifest.json` so Vite copies it into `dist/` during production builds.
