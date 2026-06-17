# Firebase to Supabase Migration Plan

## Firebase inventory found in this repository

| Area | Firebase API/path | Current usage | Supabase replacement |
|---|---|---|---|
| SDK boot | `firebase.initializeApp(firebaseConfig)` | Browser CDN compat SDK initialized in `index.html`/`src/App.jsx`. | `createClient()` in `src/config/supabase.js`. |
| Realtime Database | `users/<code>` | PIN-based admin/captain login records. | `app_users` compatibility table short term; Supabase Auth `profiles` long term. |
| Realtime Database | `config` | Admin-managed players, teams, settings. | Relational `players`, `teams`, `categories`; `app_config` during transition. |
| Realtime Database | `auctions/<sessionId>` | Live auction state, bids, rosters, timers. | `auction_sessions.state` with Realtime initially; normalize into `bids` and `team_roster`. |
| Realtime Database | `.info/connected` | Live/offline indicator. | Supabase Realtime channel subscription state. |
| Firestore | none found | No Firestore imports or collections exist in this repo. | PostgreSQL schema still models requested domain entities. |
| Firebase Auth | none found | Auth is custom PIN data in Realtime Database. | Supabase Auth email/password, Google OAuth, reset flows via `authService.ts` equivalent JS module. |
| Firebase Storage | none found | No storage API usage found. | Supabase Storage via `storageService.js`; recommended buckets below. |
| Cloud Functions | none found | No functions directory or callable/function URLs found. | Use Postgres functions/Edge Functions only if needed. |
| Security Rules | none found | No `database.rules.json`, `firestore.rules`, or `storage.rules`. | RLS policies in `supabase/migrations/001_initial_schema.sql`. |
| Hosting | Firebase Hosting config not found | Express server, Vite, `netlify.toml`, PWA manifest. | Vercel/Netlify static hosting with Supabase env vars. |

## PostgreSQL model

Core normalized tables are `profiles`, `categories`, `players`, `teams`, `tournaments`, `registrations`, `auction_sessions`, `team_roster`, `bids`, and `matches`. This removes Firestore/Realtime-style nested duplication: team rosters become rows, bids become append-only rows, registrations have review state, and UTR categories are reusable by season.

Compatibility tables `app_config`, `app_users`, and JSON `auction_sessions.state` let the current PWA move to Supabase first without a risky all-at-once UI rewrite. After cutover, migrate screens incrementally to the normalized service methods.

## Storage buckets

Create these private buckets in Supabase Storage:

- `player-documents`: registration attachments and admin review evidence.
- `player-photos`: optional public/signed player photos.
- `tournament-assets`: logos, CSV imports, exported results.

Use `storageService.js` for uploads, signed URLs, public URLs, and deletes.

## Firebase API conversions

### Initialize app

Firebase:
```js
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
```
Supabase:
```js
import { supabase } from "./config/supabase.js";
```
Explanation: Supabase uses a single client for Auth, Postgres, Storage, and Realtime.

### Read once

Firebase:
```js
const snap = await db.ref("config").once("value");
const config = snap.val();
```
Supabase:
```js
const { data, error } = await supabase.from("app_config").select("data").eq("id", "default").single();
if (error) throw error;
const config = data.data;
```
Explanation: Realtime Database path reads become table selects. Normalized reads should use `playerService.list()` and `teamService.list()`.

### Write object

Firebase:
```js
await db.ref(`auctions/${sid}`).set(state);
```
Supabase:
```js
await supabase.from("auction_sessions").upsert({ session_id: sid, state });
```
Explanation: Session state is stored by unique `session_id` during compatibility mode.

### Multi-location update

Firebase:
```js
await db.ref().update({ "users/ADMIN": adminUser });
```
Supabase:
```js
await supabase.from("app_users").upsert([{ code: "ADMIN", ...adminUser }], { onConflict: "code" });
```
Explanation: Multi-path updates become batched upserts inside one table or an RPC transaction.

### Realtime listener

Firebase:
```js
db.ref(`auctions/${sid}`).on("value", snap => setState(snap.val()));
```
Supabase:
```js
const channel = supabase.channel(`auction:${sid}`)
  .on("postgres_changes", { event: "*", schema: "public", table: "auction_sessions", filter: `session_id=eq.${sid}` }, payload => setState(payload.new.state))
  .subscribe();
```
Explanation: Supabase Realtime streams Postgres changes. For high-volume bidding, prefer append-only `bids` subscriptions.

### Transaction

Firebase:
```js
ref.child("currentBids").transaction(cur => ({ ...cur, [teamId]: amount }));
```
Supabase:
```sql
create function place_bid(session uuid, team uuid, player uuid, amount int) returns void ...;
```
Explanation: Contended writes should move into a Postgres function that validates uniqueness, budget, and RLS atomically.


## First setup and viewing data

For a brand-new Supabase project, run the SQL migration first, then seed the compatibility login data with `scripts/bootstrap-supabase.mjs`. The current login screen still expects an `ADMIN` account and `TEAM<n>` captain accounts with 6-digit PINs while Supabase Auth rollout is completed.

```bash
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
ADMIN_PIN=123456 \
TEAM_PIN=123456 \
npm run supabase:bootstrap
```

After seeding, use Supabase Dashboard → Table Editor to view `app_config` and `app_users`. The browser app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; server-only scripts require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Browser extension messages such as `redirectionChainSiteScript.js` are unrelated to the app unless they persist in an incognito window with extensions disabled.

## Migration phases

1. **Database setup**: create Supabase project, run `supabase/migrations/001_initial_schema.sql`, enable Realtime on `auction_sessions`, `bids`, and `team_roster`, and create storage buckets.
2. **Data migration**: export Firebase Realtime Database JSON, then run `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-firebase-to-supabase.mjs export.json`.
3. **Authentication migration**: create Supabase Auth users for admins/captains, configure Google OAuth, populate `profiles`, then retire PINs after acceptance testing.
4. **Frontend conversion**: deploy this compatibility adapter first, then replace JSON session reads with `playerService`, `teamService`, `matchService`, and RPC-based bidding.
5. **Testing**: run unit/build tests, seed staging data, validate RLS with anon/authenticated/admin users, and load-test bid bursts.
6. **Production cutover**: freeze Firebase writes, export final JSON, run migration, smoke-test Supabase production, switch DNS/hosting env vars, monitor logs.

## Environment variables

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Deployment

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in site environment variables.

### Vercel

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Add the same public Supabase env vars.

## Rollback plan

Keep Firebase read/write access and the previous deployed bundle available until Supabase has passed production validation. If cutover fails, point hosting back to the previous deployment, unfreeze Firebase writes, and archive Supabase writes made during the failed window for reconciliation.
