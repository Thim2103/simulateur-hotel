-- TFE Solo mode: one current-run snapshot per user (tfe_state, see
-- lib/tfeRepository.js's getTfeState()/saveTfeState()), plus normalized
-- copies of the final report/score/forecast (tfe_report/tfe_score/
-- tfe_forecast) so each can be listed/queried without pulling the full
-- tfe_state.state jsonb blob. Same column vocabulary and RLS model as
-- every other module's migration -- see
-- 202609140001_housekeeping_module.sql's header for the full rationale,
-- not repeated here.
--
-- Scope note: a guest session (see lib/guest/) never reaches any of
-- these four tables -- lib/tfeRepository.js branches to localStorage
-- before ever calling assertSupabaseConfigured() for a guest, same as
-- every other guest-aware repository in this app. A TFE run is
-- self-contained (it embeds its own CareerState, see
-- lib/tfe/tfeState.js's header comment), so tfe_state alone is enough to
-- resume a run -- one row per user, overwritten as the player advances
-- month by month (not one row per run: this app has no "multiple saved
-- TFE runs" concept yet, matching every other module's own "one current
-- cycle per user" convention).

create extension if not exists pgcrypto;

-- The one row per user holding the full TfeState (see
-- lib/tfe/tfeState.js's createTfeState()) -- the current run's hotel
-- config, storyline, performance history, score, diagnostics and
-- (once completed) final report.
create table if not exists public.tfe_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb not null default '{}'::jsonb,
  hotel_config jsonb not null default '{}'::jsonb,
  storyline jsonb not null default '{}'::jsonb,
  performance jsonb not null default '[]'::jsonb,
  score jsonb not null default '{}'::jsonb,
  forecast jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '[]'::jsonb,
  report jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tfe_state_user_id_key on public.tfe_state (user_id);

-- The final report (see lib/tfe/tfeReport.js's generateTfeReport()) --
-- one row per user, written once the run reaches month 36.
create table if not exists public.tfe_report (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  report jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tfe_report_user_id_key on public.tfe_report (user_id);

-- The current TFE score (see lib/tfe/tfeScore.js's computeTfeScore()) --
-- one row per user, overwritten each month played.
create table if not exists public.tfe_score (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  score jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tfe_score_user_id_key on public.tfe_score (user_id);

-- The last generated 36-month forecast (see
-- lib/tfe/tfeForecast.js's generateTfeForecast()) -- one row per user,
-- overwritten each time a fresh forecast is computed.
create table if not exists public.tfe_forecast (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  forecast jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tfe_forecast_user_id_key on public.tfe_forecast (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['tfe_state', 'tfe_report', 'tfe_score', 'tfe_forecast']
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
