-- Replace the fully-public anon policies ("using (true)") with real,
-- per-user row level security. Every table in scope gets a `user_id` column
-- (default auth.uid()) and is scoped so a signed-in user only ever sees or
-- writes their own rows.
--
-- Auth model: this simulator has no login screen. Every browser session
-- transparently calls supabase.auth.signInAnonymously() once (see
-- src/lib/supabase.js), which issues a JWT with role `authenticated` and a
-- stable per-browser user id -- so "authenticated" below includes anonymous
-- sessions, not just real accounts.
--
-- IMPORTANT (manual, one-time project setting): "Anonymous sign-ins" must be
-- enabled for this project -- Authentication -> Sign In / Providers ->
-- Anonymous Sign-Ins -- in the Supabase dashboard. This migration cannot
-- flip that toggle by itself. Until it is enabled, signInAnonymously() fails
-- and the app falls back to its existing offline/mock data path
-- (see safeLoad() in restaurantRepository.js / hotelRepository.js).
--
-- Legacy data note: rows created before this migration (the pre-auth seed
-- data, including the fixed ids 00000000-0000-0000-0000-000000000001 and
-- ...002) have user_id = NULL. A plain SQL migration has no authenticated
-- session to assign that data to (auth.uid() is NULL outside of a real
-- PostgREST request), so it cannot "copy the fixed id into a new row with
-- user_id = auth.uid()" as literally worded. Instead:
--   - SELECT/UPDATE policies also allow not-yet-claimed rows (user_id is
--     null) to be visible/claimable by any signed-in user;
--   - the repositories (hotelRepository.js, restaurantRepository.js,
--     pmsRepository.js) claim that legacy data for the first signed-in user
--     who loads the simulator, by running `update ... set user_id = <me>
--     where user_id is null`. Once claimed, the row is private again.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- hotels: no tracked migration ever created this table (it was set up by
-- hand, or never existed on some projects). Create it from scratch with the
-- shape hotelRepository.js already reads/writes, user_id included.
-- ---------------------------------------------------------------------------
-- user_id is added below (with the rest of the tables in scope) so it
-- consistently gets its `default auth.uid()`.
create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  structure jsonb not null default '{}'::jsonb,
  finance jsonb not null default '{}'::jsonb,
  marketing jsonb not null default '{}'::jsonb,
  esg jsonb not null default '{}'::jsonb,
  expansion jsonb not null default '{}'::jsonb,
  progression jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_id column on every table in scope (nullable: legacy rows stay
-- unclaimed until an authenticated session adopts them at runtime).
-- ---------------------------------------------------------------------------
alter table public.hotels add column if not exists user_id uuid default auth.uid();
alter table public.rooms add column if not exists user_id uuid default auth.uid();
alter table public.clients add column if not exists user_id uuid default auth.uid();
alter table public.reservations add column if not exists user_id uuid default auth.uid();
alter table public.restaurants add column if not exists user_id uuid default auth.uid();
alter table public.restaurant_finance add column if not exists user_id uuid default auth.uid();
alter table public.restaurant_staff add column if not exists user_id uuid default auth.uid();
alter table public.restaurant_menu_items add column if not exists user_id uuid default auth.uid();
alter table public.restaurant_operations add column if not exists user_id uuid default auth.uid();

-- ---------------------------------------------------------------------------
-- Pre-existing bug fix (required for the unique(user_id) constraint below):
-- saveRestaurantState() upserted restaurant_finance without an onConflict
-- target, so every autosave inserted a brand new row instead of updating the
-- existing one -- this project's restaurant_finance table already has 7 rows
-- for a single restaurant. Keep only the most recent one before a single
-- user can own exactly one finance row.
-- ---------------------------------------------------------------------------
delete from public.restaurant_finance rf
where rf.id not in (
  select distinct on (restaurant_id) id
  from public.restaurant_finance
  order by restaurant_id, day desc nulls last, created_at desc
);

-- One hotel / one restaurant / one finance record per user (mono-tenant
-- model: this simulator gives each signed-in user exactly one of each).
create unique index if not exists hotels_user_id_key on public.hotels (user_id);
create unique index if not exists restaurants_user_id_key on public.restaurants (user_id);
create unique index if not exists restaurant_finance_user_id_key on public.restaurant_finance (user_id);

-- ---------------------------------------------------------------------------
-- Drop every pre-existing policy on these tables (the ad-hoc "allow_read" /
-- "allow_write" / "public ... access" anon policies, tracked or not) before
-- recreating a per-user authenticated model.
-- ---------------------------------------------------------------------------
do $$
declare
  rec record;
begin
  for rec in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in (
        'hotels', 'rooms', 'clients', 'reservations', 'restaurants',
        'restaurant_finance', 'restaurant_staff', 'restaurant_menu_items',
        'restaurant_operations'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Enable RLS + per-user CRUD policies for every table in scope.
-- SELECT/UPDATE also allow not-yet-claimed legacy rows (user_id is null) so
-- the app's one-time claim step can adopt them; WITH CHECK always pins the
-- row to the caller once written, so a user can never leave a row unowned or
-- reassign it to someone else.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'hotels', 'rooms', 'clients', 'reservations', 'restaurants',
    'restaurant_finance', 'restaurant_staff', 'restaurant_menu_items',
    'restaurant_operations'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "select_own_or_unclaimed" on public.%I for select to authenticated using (user_id = auth.uid() or user_id is null)',
      t
    );
    execute format(
      'create policy "insert_own" on public.%I for insert to authenticated with check (user_id = auth.uid())',
      t
    );
    execute format(
      'create policy "update_own_or_claim" on public.%I for update to authenticated using (user_id = auth.uid() or user_id is null) with check (user_id = auth.uid())',
      t
    );
    execute format(
      'create policy "delete_own" on public.%I for delete to authenticated using (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
