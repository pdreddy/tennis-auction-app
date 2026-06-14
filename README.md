# Tennis Auction — browser-only Netlify app

This repository now deploys the Tennis Auction UI as a **React/Expo web app** with no Python server required for production.

## Production architecture

- **Frontend:** Expo Router + React Native Web, exported as static files.
- **Realtime data:** Firebase Realtime Database, accessed directly from browser-side TypeScript in `frontend/src/api.ts`.
- **Hosting:** Netlify serves the static `frontend/dist` export.
- **No Python runtime:** the `backend/` folder is legacy/reference code and is not used by the Netlify build.

## Deploy to Netlify

1. Use the included `netlify.toml`; Netlify builds from `frontend/` and publishes `frontend/dist`.
2. Deploy as-is to use the built-in Firebase browser config.
3. Optionally override the Firebase project with the environment variables listed below.

### Optional Firebase override environment variables

```text
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDbO0eP52i4t3V94bEiDcl7WoKbSrrM9VA
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=koc2-20fb8.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://koc2-20fb8-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=koc2-20fb8
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=koc2-20fb8.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=317734341461
EXPO_PUBLIC_FIREBASE_APP_ID=1:317734341461:web:1bcad5a1792fac0e46bddc
```

These are Firebase web-app config values and are intentionally browser-readable. Protect writes with Firebase Realtime Database rules appropriate for your event.

## Firebase auction setup table

When the browser app starts, it seeds a reusable Firebase Realtime Database table at `auctionConfig/default` if it does not already exist. Creating or resetting an auction now reads teams, captains, player pools, and UTR caps from that Firebase table instead of rebuilding the auction session only from hardcoded arrays in the create flow. Edit `auctionConfig/default/teams` or `auctionConfig/default/players` in Firebase before creating a new auction to change the next session without redeploying.

## Local browser run

```bash
cd frontend
yarn install
yarn web
```

## Static production build

```bash
cd frontend
yarn build
```

The generated site is written to `frontend/dist`.
