# Tennis Auction frontend

This is the deployable browser app for Tennis Auction. It is an Expo Router / React Native Web application that talks directly to Firebase Realtime Database from TypeScript, so production does **not** need FastAPI, Python, or server functions.

## Run locally

```bash
yarn install
yarn web
```

## Build for Netlify

```bash
yarn build
```

Netlify uses the repository-level `netlify.toml`:

- base directory: `frontend`
- build command: `yarn install && yarn build`
- publish directory: `frontend/dist`
- SPA fallback: every route redirects to `/index.html`

## Optional Firebase override environment variables

The app includes these Firebase web defaults so it can run immediately in a browser. You can still override them in Netlify or in a local `.env` file:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDbO0eP52i4t3V94bEiDcl7WoKbSrrM9VA
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=koc2-20fb8.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://koc2-20fb8-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=koc2-20fb8
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=koc2-20fb8.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=317734341461
EXPO_PUBLIC_FIREBASE_APP_ID=1:317734341461:web:1bcad5a1792fac0e46bddc
```

## Firebase auction setup table

On first use, the app creates `auctionConfig/default` in Firebase Realtime Database. New auctions and resets load their team/captain/player setup from that table, so you can adjust future auction data in Firebase instead of changing hardcoded create-auction code and redeploying.
