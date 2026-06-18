# Tennis Auction App

React single-page app for running a live tennis auction backed by Firebase Realtime Database. This repo is ready to push as a fresh Vercel-hosted project.

## Local development

Install dependencies:

```bash
npm install
```

Create local Firebase environment settings:

```bash
cp .env.example .env.local
```

Fill in the `VITE_FIREBASE_*` values in `.env.local` if you want to use a Firebase project other than the checked-in defaults.

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

After pushing, import the new GitHub repository into Vercel and add the Firebase environment variables from `.env.example` in the Vercel project settings.

## Deploying to Vercel

This repository is configured for Vercel with `vercel.json`. Vercel runs `npm run build`, publishes the generated `dist/` directory, and rewrites app routes back to `index.html` so the React single-page app works on direct refreshes.

To deploy from the Vercel dashboard:

1. Import this Git repository into Vercel.
2. Keep the detected framework as **Vite**.
3. Confirm the build command is `npm run build` and the output directory is `dist`.
4. Add the Firebase `VITE_FIREBASE_*` environment variables from `.env.example` if you are using a new Firebase project.
5. Deploy.

To deploy from the Vercel CLI:

```bash
npm install -g vercel
vercel
vercel --prod
```

The app still connects to Firebase directly from the browser, so make sure the configured Firebase project allows your Vercel domain in any Firebase/Auth or database rules you use.

## Tests

Run the plain Node.js logic tests:

```bash
npm test
```


## Maintaining auction data

Firebase settings, teams, players, and generated pool defaults are split into small files for easier updates:

- `src/config/firebase.js` — all Firebase setup in one place: Vite environment variable support, Realtime Database initialization, editable `DATA_PATHS`, and helper functions for database references.
- `src/config/pins.json` — default 6-digit PINs for admin and team accounts; the admin PIN screen can load these and save them into Firebase.
- `src/data/teams.js` — team names and captains.
- `src/data/players.js` — player list, UTR values, and base prices.
- `src/data/settings.js` — budgets, timer, UTR price tiers, and pool order. Player categories map high-to-low as Cat 1 → UTR 6.0 through Cat 7 → UTR 3.0; auction bidding starts at UTR 3.0 and moves upward.
- `src/data/pools.js` — derived captain set, player pools, and default pool caps.

## Notes

The app still uses Firebase Realtime Database in the browser. Internet access is required for Firebase and the Firebase CDN scripts to load.

### Firebase setup and data paths

All Firebase wiring now lives in `src/config/firebase.js`. To point a new repo at a different Firebase project, set the `VITE_FIREBASE_*` values in `.env.local` for local development and in Vercel project environment variables for production. To change where data is stored in Realtime Database, set the optional path variables from `.env.example` or edit the `DATA_PATHS` defaults in `src/config/firebase.js`:

- `config` — saved auction configuration, players, teams, and settings.
- `users` — PIN login records. Defaults can be edited in `src/config/pins.json`, loaded in the admin PIN screen, then saved to this database path.
- `auctions` — live auction sessions.
- `connected` — Firebase connection status path; normally leave this as `.info/connected`.

Admin sign-in is separated from team sign-in on the login screen. Captains choose only team accounts; admins switch to **Admin Login** and enter the admin access code plus the admin PIN saved under `users/ADMIN`.

The app remains PWA-installable: `index.html` links `/manifest.json`, and the same manifest is kept in `public/manifest.json` so Vite copies it into `dist/` during production builds.
