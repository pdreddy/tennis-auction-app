-- Supabase migration for Tennis Auction App.
create extension if not exists pgcrypto;

create type app_role as enum ('admin','captain','player','reviewer');
create type registration_status as enum ('draft','submitted','under_review','approved','rejected','waitlisted');
create type match_status as enum ('scheduled','in_progress','completed','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role app_role not null default 'player',
  team_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  season_year int not null,
  name text not null,
  utr_min numeric(4,2),
  utr_max numeric(4,2),
  base_price int not null default 5000,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_year, name)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  season_year int not null,
  display_name text not null,
  email text,
  category_id uuid references public.categories(id),
  rating_utr numeric(4,2) not null default 3.00,
  singles_utr numeric(4,2),
  doubles_utr numeric(4,2),
  best_utr numeric(4,2) generated always as (greatest(coalesce(singles_utr, rating_utr), coalesce(doubles_utr, rating_utr), rating_utr)) stored,
  base_price int not null default 5000,
  is_captain boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  season_year int not null,
  name text not null,
  captain_player_id uuid references public.players(id),
  budget int not null default 80000,
  total_spent int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_year, name)
);
alter table public.profiles add constraint profiles_team_id_fkey foreign key (team_id) references public.teams(id);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  season_year int not null,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status registration_status not null default 'submitted',
  reviewer_id uuid references auth.users(id),
  review_notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, player_id)
);

create table public.auction_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  season_year int,
  tournament_id uuid references public.tournaments(id),
  state jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_roster (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id),
  auction_session_id uuid references public.auction_sessions(id) on delete set null,
  acquired_price int not null default 0,
  roster_slot int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, player_id)
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_session_id uuid not null references public.auction_sessions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.players(id),
  amount int not null check (amount > 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_a_id uuid references public.teams(id),
  team_b_id uuid references public.teams(id),
  team_a_score int,
  team_b_score int,
  winner_team_id uuid references public.teams(id),
  status match_status not null default 'scheduled',
  played_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility tables used by the converted app while legacy Firebase-shaped state is phased out.
create table public.app_config (id text primary key default 'default', data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.app_users (code text primary key, pin text, role app_role not null, team_id int, name text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create index players_season_category_idx on public.players(season_year, category_id);
create index players_utr_idx on public.players(rating_utr desc);
create index teams_season_idx on public.teams(season_year);
create index registrations_status_idx on public.registrations(tournament_id, status);
create index bids_session_amount_idx on public.bids(auction_session_id, amount desc);
create index auction_sessions_state_gin_idx on public.auction_sessions using gin(state);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['profiles','categories','players','teams','tournaments','registrations','auction_sessions','team_roster','matches','app_config','app_users'] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;
create or replace function public.is_team_captain(team uuid) returns boolean language sql stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'captain' and team_id = team)
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.players enable row level security;
alter table public.teams enable row level security;
alter table public.tournaments enable row level security;
alter table public.registrations enable row level security;
alter table public.auction_sessions enable row level security;
alter table public.team_roster enable row level security;
alter table public.bids enable row level security;
alter table public.matches enable row level security;
alter table public.app_config enable row level security;
alter table public.app_users enable row level security;

create policy "profiles read self or admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles update self or admin" on public.profiles for update using (id = auth.uid() or public.is_admin());
create policy "public read categories" on public.categories for select using (true);
create policy "admin write categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "public read players" on public.players for select using (is_active or public.is_admin());
create policy "admin write players" on public.players for all using (public.is_admin()) with check (public.is_admin());
create policy "public read teams" on public.teams for select using (true);
create policy "admin write teams" on public.teams for all using (public.is_admin()) with check (public.is_admin());
create policy "public read tournaments" on public.tournaments for select using (true);
create policy "admin write tournaments" on public.tournaments for all using (public.is_admin()) with check (public.is_admin());
create policy "registration owner/admin read" on public.registrations for select using (public.is_admin() or exists(select 1 from public.players p where p.id = player_id and p.email = (select email from auth.users where id = auth.uid())));
create policy "registration owner create" on public.registrations for insert with check (auth.uid() is not null);
create policy "admin review registrations" on public.registrations for update using (public.is_admin()) with check (public.is_admin());
create policy "auction read authenticated" on public.auction_sessions for select using (auth.uid() is not null);
create policy "auction admin write" on public.auction_sessions for all using (public.is_admin()) with check (public.is_admin());
create policy "roster read public" on public.team_roster for select using (true);
create policy "roster admin write" on public.team_roster for all using (public.is_admin()) with check (public.is_admin());
create policy "bids read session" on public.bids for select using (auth.uid() is not null);
create policy "captains insert own bids" on public.bids for insert with check (public.is_admin() or public.is_team_captain(team_id));
create policy "matches read public" on public.matches for select using (true);
create policy "matches admin write" on public.matches for all using (public.is_admin()) with check (public.is_admin());
create policy "compat config read" on public.app_config for select using (auth.uid() is not null or true);
create policy "compat config admin write" on public.app_config for all using (public.is_admin()) with check (public.is_admin());
create policy "compat users read" on public.app_users for select using (true);
create policy "compat users admin write" on public.app_users for all using (public.is_admin() or auth.uid() is null) with check (public.is_admin() or auth.uid() is null);
