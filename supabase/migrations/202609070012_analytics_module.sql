-- Analytics module: one persisted analysis per run (see
-- lib/analytics/analyticsEngine.js's analyzeRun()), one row per cycle for
-- the diagnostics/recommendations anchored to it, and one row per
-- generated final/group/competition report. Same column vocabulary and
-- RLS model as the Academy/Competition/Replay migrations -- see
-- 202609070009_academy_module.sql's header for the full rationale, not
-- repeated here.

create extension if not exists pgcrypto;

-- One row per analyzed run. Uses: id, user_id, run_id (the same id as
-- replay_runs.run_id, since Analytics always analyzes a ReplayRun),
-- diagnostics, recommendations, kpis, metadata (source, ownerLabel).
-- cycle_index stays null at this level.
create table if not exists public.analytics_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  run_id text not null,
  cycle_index integer,
  diagnostics jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  kpis jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_runs_user_run_id_key on public.analytics_runs (user_id, run_id);

-- One row per cycle's own diagnostics/KPIs -- lets a chart or a debrief
-- query one cycle's analysis without loading the whole run. Uses: id,
-- user_id, run_id, cycle_index, diagnostics, kpis.
create table if not exists public.analytics_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  run_id text not null,
  cycle_index integer not null,
  diagnostics jsonb not null default '[]'::jsonb,
  recommendations jsonb,
  kpis jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists analytics_cycles_run_cycle_key on public.analytics_cycles (user_id, run_id, cycle_index);

-- One row per generated report -- a single run's final report, or a
-- class-/match-wide comparison report (see analyticsReports.js's
-- buildFinalReport()/buildGroupComparisonReport()/buildCompetitionReport()).
-- For a multi-run report, run_id holds a synthetic id (e.g. the class or
-- match id) rather than a single replay run's id. Uses: id, user_id,
-- run_id, diagnostics, recommendations, kpis, metadata (report type,
-- ranking, generatedAt).
create table if not exists public.analytics_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  run_id text not null,
  cycle_index integer,
  diagnostics jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  kpis jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analytics_cycles_run_id_idx on public.analytics_cycles (run_id);
create index if not exists analytics_reports_run_id_idx on public.analytics_reports (run_id);

do $$
declare
  t text;
begin
  foreach t in array array['analytics_runs', 'analytics_cycles', 'analytics_reports']
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
