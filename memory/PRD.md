# Tennis Player Auction — Mobile App (PRD)

## Original Problem Statement
Convert a real-time, Firebase-based "Tennis Player Auction" web app into a native Expo mobile app. Keep all auction rules identical; replace Firebase with the built-in FastAPI + MongoDB backend (live polling); add simple JWT login; clean dark sporty design.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor). JWT email/password auth (bcrypt + PyJWT). Auction state stored per session with optimistic concurrency (`version` field). Static config in `seed_data.py` (98 players, 14 teams, UTR pools + caps).
  - Routes (`/api`): `auth/register`, `auth/login`, `auth/me`, `config`, `POST auctions`, `GET auctions/{sid}`, `auctions/{sid}/bid|finalize|skip|reset`.
- **Frontend**: Expo Router (stack). Screens: `/login`, `/session`, `/auction/[id]`. Polls auction state every 1.5s; timer computed via server-time offset. Dark "Signal Orange / obsidian" theme, Barlow Condensed + DM Sans fonts.

## Core Rules (static)
14 teams · 98 players · $100k budget · 7-player rosters · captains pre-assigned & excluded from pools · UTR pools auctioned highest-first · unique-bid rule (no two teams same amount) · base + $1000 increments · budget reserve ($5k/remaining slot) · 60s timer · award to single highest bidder · skip-to-end · reset.

## Implemented (2026-06-11)
- JWT auth (register/login/logout, secure token storage). Seeded QA user `test@auction.com` / `Test1234`.

## Auth v2 — Team Code + PIN with roles (2026-06-14)
- Replaced email/password with **Team Code + 6-digit PIN**. 15 auto-seeded accounts: `ADMIN` (auctioneer) + `TEAM1..TEAM14` (captains). JWT carries `role` + `teamId`. PINs in `/app/memory/test_credentials.md`.
- **Captains** bid only for their own team (server 403 otherwise); UI shows own interactive bid card + read-only other teams.
- **Admin** is the only role that can Create / Finalize / Skip / Reset; UI shows read-only live-bids grid + admin controls.
- Verified: 24/24 backend tests (full authz matrix) + frontend role-based UI.
- Login screen (court background + gradient), Session setup (create/join 6-char ID + setup health check).
- Live auction: sticky context bar (player + high bid + 60s timer), pool progress bar, 14-team bidding grid, quick-bid chips, pin-your-team, winning/tied indicators, disabled-team strips, finalize/skip bottom bar, rosters bottom sheet, reset confirm modal, auction-complete summary.
- Real-time sync via polling; sync/connection pill. Haptics on key interactions.
- Verified: 22/22 backend tests + full frontend flow (bid → award → advance).

## Backlog
- **P1**: Convert FastAPI `on_event` → lifespan handlers; add `version` filter to `reset` for consistency.
- **P2**: Per-user team ownership (restrict bidding to your own team); auction history/export; sound alert on last 5s.
- **P2**: Editable player ratings/admin panel; share-sheet for Session ID.

## Next Tasks
Gather user feedback on the live bidding UX; consider P2 team-ownership model.
