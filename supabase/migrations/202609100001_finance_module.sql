-- Finance module: one current-cycle snapshot per user (finance_state, see
-- lib/financeRepository.js's getFinanceState()/saveFinanceState()), plus
-- an append-only history of every cycle played (finance_reports, see
-- appendFinanceReport()) and the last generated forecast
-- (finance_forecast, see saveFinanceForecast()). Same column vocabulary
-- and RLS model as every other module's migration -- see
-- 202609070009_academy_module.sql's header for the full rationale, not
-- repeated here.
--
-- Scope note: a guest session (see lib/guest/) never reaches any of
-- these three tables -- lib/financeRepository.js branches to
-- localStorage before ever calling assertSupabaseConfigured() for a
-- guest, same as every other guest-aware repository in this app.

create extension if not exists pgcrypto;

-- The one row per user holding the full FinanceState (see
-- lib/finance/financeState.js's createFinanceState()) -- the current
-- cycle's income statement, balance sheet, cash-flow, ratios, forecast
-- and diagnostics.
create table if not exists public.finance_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb not null default '{}'::jsonb,
  revenues jsonb not null default '{}'::jsonb,
  expenses jsonb not null default '{}'::jsonb,
  gop numeric not null default 0,
  ebitda numeric not null default 0,
  cashflow jsonb not null default '{}'::jsonb,
  ratios jsonb not null default '{}'::jsonb,
  forecast jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists finance_state_user_id_key on public.finance_state (user_id);

-- One row per finance cycle played (see lib/finance/financeEngine.js's
-- runFinanceCycle(), and financeRepository.js's appendFinanceReport()) --
-- an audit trail a future "Finance Replay" viewer can list without
-- replaying the whole career, the same shape finance_state's own columns
-- use.
create table if not exists public.finance_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  revenues jsonb not null default '{}'::jsonb,
  expenses jsonb not null default '{}'::jsonb,
  gop numeric not null default 0,
  ebitda numeric not null default 0,
  cashflow jsonb not null default '{}'::jsonb,
  ratios jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- The last generated 30-day forecast (see lib/finance/financeForecast.js's
-- generateFinancialForecast()) -- one row per user, overwritten each time
-- a fresh forecast is computed.
create table if not exists public.finance_forecast (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  forecast jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists finance_forecast_user_id_key on public.finance_forecast (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['finance_state', 'finance_reports', 'finance_forecast']
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
