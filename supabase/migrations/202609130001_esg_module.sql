-- ESG module: one current-cycle snapshot per user (esg_state, see
-- lib/esgRepository.js's getEsgState()/saveEsgState()), a normalized
-- per-certification table (esg_certifications), and the last generated
-- 30-day forecast (esg_forecast). Same column vocabulary and RLS model
-- as every other module's migration -- see
-- 202609120001_marketing_module.sql's header for the full rationale,
-- not repeated here.
--
-- Scope note: a guest session (see lib/guest/) never reaches any of
-- these three tables -- lib/esgRepository.js branches to localStorage
-- before ever calling assertSupabaseConfigured() for a guest, same as
-- every other guest-aware repository in this app.

create extension if not exists pgcrypto;

-- The one row per user holding the full EsgState (see
-- lib/esg/esgState.js's createEsgState()) -- the current cycle's
-- energy/water/waste/CO2, score, certifications and diagnostics.
create table if not exists public.esg_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb not null default '{}'::jsonb,
  energy numeric not null default 0,
  water numeric not null default 0,
  waste numeric not null default 0,
  co2 numeric not null default 0,
  score numeric not null default 0,
  certifications jsonb not null default '[]'::jsonb,
  forecast jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists esg_state_user_id_key on public.esg_state (user_id);

-- One row per certification obtained (see lib/esg/esgCertifications.js)
-- -- an audit trail of when each certification was earned, independent
-- of the current esg_state.state.certifications snapshot.
create table if not exists public.esg_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  certification_id text not null,
  name text not null default '',
  obtained_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists esg_certifications_user_certification_key on public.esg_certifications (user_id, certification_id);

-- The last generated 30-day ESG forecast (see lib/esg/esgForecast.js's
-- generateEsgForecast()) -- one row per user, overwritten each time a
-- fresh forecast is computed.
create table if not exists public.esg_forecast (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  forecast jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists esg_forecast_user_id_key on public.esg_forecast (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['esg_state', 'esg_certifications', 'esg_forecast']
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
