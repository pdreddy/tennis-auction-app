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

## Notes

The app still uses Firebase Realtime Database in the browser. Internet access is required for Firebase and the Firebase CDN scripts to load.

The app remains PWA-installable: `index.html` links `/manifest.json`, and the same manifest is kept in `public/manifest.json` so Vite copies it into `dist/` during production builds.
