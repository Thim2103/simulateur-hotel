-- Staff (RH) module: one current-cycle snapshot per user (staff_state,
-- see lib/staffRepository.js's getStaffState()/saveStaffState()), plus
-- the last generated 30-day forecast (staff_forecast, see
-- saveStaffForecast()). Same column vocabulary and RLS model as every
-- other module's migration -- see 202609100001_finance_module.sql's
-- header for the full rationale, not repeated here.
--
-- Scope note: a guest session (see lib/guest/) never reaches either of
-- these tables -- lib/staffRepository.js branches to localStorage before
-- ever calling assertSupabaseConfigured() for a guest, same as every
-- other guest-aware repository in this app. Not to be confused with
-- lib/staffMulti/ (multi-site chain HR), which has no Supabase table of
-- its own (chain state is computed on demand from the chain's hotels).

create extension if not exists pgcrypto;

-- The one row per user holding the full StaffState (see
-- lib/staff/staffState.js's createStaffState()) -- the current cycle's
-- headcount, moral, productivity, absenteeism, overload (surcharge),
-- turnover, payroll and diagnostics.
create table if not exists public.staff_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb not null default '{}'::jsonb,
  moral numeric not null default 0,
  productivity numeric not null default 0,
  absenteeism numeric not null default 0,
  overload numeric not null default 0,
  turnover jsonb not null default '{}'::jsonb,
  payroll jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '[]'::jsonb,
  forecast jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_state_user_id_key on public.staff_state (user_id);

-- The last generated 30-day HR forecast (see lib/staff/staffForecast.js's
-- generateStaffForecast()) -- one row per user, overwritten each time a
-- fresh forecast is computed.
create table if not exists public.staff_forecast (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  forecast jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_forecast_user_id_key on public.staff_forecast (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['staff_state', 'staff_forecast']
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
