# Netlify deployment

This repository is ready to deploy the Expo web frontend on Netlify.

## Deploy from Git

1. Push this repository to your Git provider.
2. In Netlify, choose **Add new site** > **Import an existing project**.
3. Select the repository. Netlify reads `netlify.toml` from the repository root and uses:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
4. Add the required frontend environment variable in **Site configuration** > **Environment variables**:
   - `EXPO_PUBLIC_BACKEND_URL` = the HTTPS URL for the running backend API, without a trailing `/api` path.
5. Deploy the site.

## Backend note

Netlify will host the static web frontend. The FastAPI backend in `backend/` still needs to run on a server that supports Python web services, such as Render, Railway, Fly.io, or another API host. Point `EXPO_PUBLIC_BACKEND_URL` at that backend before building the Netlify site.

## Local production build check

From the repository root, run:

```bash
cd frontend
npm run build
```

The static web output is written to `frontend/dist`.
