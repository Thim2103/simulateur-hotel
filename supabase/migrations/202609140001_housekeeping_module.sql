-- Housekeeping module: one current-cycle snapshot per user
-- (housekeeping_state, see lib/housekeepingRepository.js's
-- getHousekeepingState()/saveHousekeepingState()), and the last
-- generated 30-day forecast (housekeeping_forecast). Same column
-- vocabulary and RLS model as every other module's migration -- see
-- 202609130001_esg_module.sql's header for the full rationale, not
-- repeated here.
--
-- Scope note: a guest session (see lib/guest/) never reaches either of
-- these two tables -- lib/housekeepingRepository.js branches to
-- localStorage before ever calling assertSupabaseConfigured() for a
-- guest, same as every other guest-aware repository in this app.

create extension if not exists pgcrypto;

-- The one row per user holding the full HousekeepingState (see
-- lib/housekeeping/housekeepingState.js's createHousekeepingState()) --
-- the current cycle's workload, productivity, cleaning time, overload,
-- understaffing, quality and diagnostics.
create table if not exists public.housekeeping_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb not null default '{}'::jsonb,
  workload jsonb not null default '{}'::jsonb,
  productivity numeric not null default 0,
  cleaning_time jsonb not null default '{}'::jsonb,
  overload numeric not null default 0,
  understaffing jsonb not null default '{}'::jsonb,
  quality numeric not null default 0,
  forecast jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists housekeeping_state_user_id_key on public.housekeeping_state (user_id);

-- The last generated 30-day HK forecast (see
-- lib/housekeeping/housekeepingForecast.js's
-- generateHousekeepingForecast()) -- one row per user, overwritten each
-- time a fresh forecast is computed.
create table if not exists public.housekeeping_forecast (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  forecast jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists housekeeping_forecast_user_id_key on public.housekeeping_forecast (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['housekeeping_state', 'housekeeping_forecast']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "select_own" on public.%I', t);
    execute format('drop policy if exists "insert_own" on public.%I', t);
    execute format('drop policy if exists "update_own" on public.%I', t);
    execute format('drop policy if exists "delete_own" on public.%I', t);

    execute format('create policy "select_own" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "insert_own" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "update_own" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "delete_own" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;
