-- Replay module: one normalized copy of a finished run (Academy group,
-- Competition player, or a standalone Scenario/TFE run -- see
-- lib/replay/replayEngine.js's adapters), independent of the schema each
-- mode module (academy_runs/competition_runs) already has, so the Replay
-- Viewer/Compare/Export pages never need to know which mode produced a
-- run. Same column vocabulary and RLS model as the Academy/Competition
-- migrations -- see 202609070009_academy_module.sql's header for the
-- full rationale, not repeated here.

create extension if not exists pgcrypto;

-- One row per replay run. Uses: id, user_id, run_id (the ReplayRun's own
-- id, e.g. "academie-c1-g1"), metadata (source, scenario_id, ownerLabel,
-- status, totalCycles, scoreHistory, finalReport). cycle_index/
-- state_snapshot/decisions/events/kpis stay null at this level.
create table if not exists public.replay_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  run_id text not null,
  cycle_index integer,
  state_snapshot jsonb,
  decisions jsonb,
  events jsonb,
  kpis jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists replay_runs_user_run_id_key on public.replay_runs (user_id, run_id);

-- One row per cycle of a run: its full reconstructed state (from
-- runDailyCycle()'s own `nextState`) and the decisions that produced it.
-- Uses: id, user_id, run_id, cycle_index, state_snapshot, decisions.
create table if not exists public.replay_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  run_id text not null,
  cycle_index integer not null,
  state_snapshot jsonb,
  decisions jsonb not null default '{}'::jsonb,
  events jsonb,
  kpis jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists replay_cycles_run_cycle_key on public.replay_cycles (user_id, run_id, cycle_index);

-- One row per event that fired on a given cycle (a cycle with 3 events
-- gets 3 rows) -- lets a debrief query "every health inspection across
-- every run" without loading full cycle snapshots. Uses: id, user_id,
-- run_id, cycle_index, events.
create table if not exists public.replay_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  run_id text not null,
  cycle_index integer not null,
  state_snapshot jsonb,
  decisions jsonb,
  events jsonb not null default '{}'::jsonb,
  kpis jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- One row per cycle's normalized KPI set (see
-- lib/replay/replayKpis.js's kpisForCycle()) -- a lightweight table a
-- chart can query without ever touching state_snapshot. Uses: id,
-- user_id, run_id, cycle_index, kpis.
create table if not exists public.replay_kpis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  run_id text not null,
  cycle_index integer not null,
  state_snapshot jsonb,
  decisions jsonb,
  events jsonb,
  kpis jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists replay_kpis_run_cycle_key on public.replay_kpis (user_id, run_id, cycle_index);

create index if not exists replay_cycles_run_id_idx on public.replay_cycles (run_id);
create index if not exists replay_events_run_id_idx on public.replay_events (run_id);
create index if not exists replay_kpis_run_id_idx on public.replay_kpis (run_id);

do $$
declare
  t text;
begin
  foreach t in array array['replay_runs', 'replay_cycles', 'replay_events', 'replay_kpis']
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
