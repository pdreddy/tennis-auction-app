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

## Deploying to Vercel

This repository is configured for Vercel with `vercel.json`. Vercel runs `npm run build`, publishes the generated `dist/` directory, and rewrites app routes back to `index.html` so the React single-page app works on direct refreshes.

To deploy from the Vercel dashboard:

1. Import this Git repository into Vercel.
2. Keep the detected framework as **Vite**.
3. Confirm the build command is `npm run build` and the output directory is `dist`.
4. Deploy.

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

- `src/config/firebase.js` — all Firebase setup in one place: project credentials, Realtime Database initialization, editable `DATA_PATHS`, and helper functions for database references.
- `src/config/pins.json` — default 6-digit PINs for admin and team accounts; the admin PIN screen can load these and save them into Firebase.
- `src/data/teams.js` — team names and captains.
- `src/data/players.js` — player list, UTR values, and base prices.
- `src/data/settings.js` — budgets, timer, UTR price tiers, and pool order. Player categories map high-to-low as Cat 1 → UTR 6.0 through Cat 7 → UTR 3.0; auction bidding starts at UTR 3.0 and moves upward.
- `src/data/pools.js` — derived captain set, player pools, and default pool caps.

## Notes

The app still uses Firebase Realtime Database in the browser. Internet access is required for Firebase and the Firebase CDN scripts to load.

### Firebase setup and data paths

All Firebase wiring now lives in `src/config/firebase.js`. To point the app at a different Firebase project, edit the `firebaseConfig` object in that file. To change where data is stored in Realtime Database, edit the `DATA_PATHS` object in the same file:

- `config` — saved auction configuration, players, teams, and settings.
- `users` — PIN login records. Defaults can be edited in `src/config/pins.json`, loaded in the admin PIN screen, then saved to this database path.
- `auctions` — live auction sessions.
- `connected` — Firebase connection status path; normally leave this as `.info/connected`.

Admin sign-in is separated from team sign-in on the login screen. Captains choose only team accounts; admins switch to **Admin Login** and enter the admin access code plus the admin PIN saved under `users/ADMIN`.

The app remains PWA-installable: `index.html` links `/manifest.json`, and the same manifest is kept in `public/manifest.json` so Vite copies it into `dist/` during production builds.
