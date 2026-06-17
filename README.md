# Tennis Auction App

React/Vite PWA for running a live tennis auction. The backend has been migrated from Firebase Realtime Database to Supabase (PostgreSQL, Auth, Storage, Realtime, and RLS).

## Local development

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Start the React/Vite dev server:

```bash
npm run dev
```

Open the app at `http://localhost:5173`.


## First-time Supabase account and data setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in the values from your Supabase project settings:

```bash
cp .env.example .env.local
```

3. Run the database migration:

```bash
supabase db push
```

4. Seed the initial compatibility login accounts and default auction configuration:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
ADMIN_PIN=123456 \
TEAM_PIN=123456 \
npm run supabase:bootstrap
```

5. Start the app and sign in with account `ADMIN` using the `ADMIN_PIN` you provided:

```bash
npm run dev
```

Open `http://localhost:5173`. If you see the Supabase configuration screen, paste your project URL and publishable key there for this device, or set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`/your hosting provider and restart or redeploy.

To see the seeded data, open Supabase Dashboard → Table Editor and inspect `app_config`, `app_users`, `players`, `teams`, and `auction_sessions`.

## Supabase setup

Run the SQL migration in your Supabase SQL editor or with the Supabase CLI:

```bash
supabase db push
```

The migration creates normalized tables for profiles, players, teams, categories, tournaments, registrations, bids, rosters, matches, storage-oriented metadata, and compatibility tables used by the converted PWA.



### Troubleshooting: `zsh: command not found: supabase`

The Supabase CLI is not installed on your Mac. You have three options:

1. **No CLI required:** open Supabase Dashboard → SQL Editor, paste the full contents of `supabase/migrations/001_initial_schema.sql`, and run it. This is the quickest way to create `app_users` and the other tables.
2. **Run with npx:** if you have Node.js 20 or newer, run:

```bash
npx supabase db push
```

3. **Install the CLI with Homebrew:**

```bash
brew install supabase
supabase db push
```

After the migration succeeds, run the bootstrap command again to seed the `ADMIN` and `TEAM<n>` PIN accounts.

### Troubleshooting: `public.app_users` not found

If you see `Could not find the table 'public.app_users' in the schema cache`, the Supabase database schema has not been installed in the project your app is connected to, or Supabase needs a schema cache refresh. Run the SQL migration first:

```bash
supabase db push
```

Or open Supabase Dashboard → SQL Editor, paste the contents of `supabase/migrations/001_initial_schema.sql`, and run it. Then rerun `npm run supabase:bootstrap` and refresh the app.

## Firebase data migration

Export Firebase Realtime Database as JSON, then run:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
node scripts/migrate-firebase-to-supabase.mjs firebase-export.json
```

## Production build

```bash
npm run build
npm run start
```

Open `http://localhost:3000`.

## Tests

```bash
npm test
```

## Important files

- `src/config/supabase.js` — Supabase client configuration.
- `src/services/realtimeDataService.js` — compatibility adapter that replaces Firebase Realtime Database calls with Supabase table operations and Realtime subscriptions.
- `src/services/authService.js` — Supabase Auth email/password, Google OAuth, password reset, session, and sign-out helpers.
- `src/services/playerService.js`, `teamService.js`, `matchService.js`, `storageService.js` — reusable domain services.
- `supabase/migrations/001_initial_schema.sql` — PostgreSQL schema, indexes, triggers, and RLS policies.
- `scripts/migrate-firebase-to-supabase.mjs` — Firebase JSON to Supabase migration script.
- `docs/supabase-migration-plan.md` — full inventory, API conversion examples, deployment, rollback, and phase plan.
