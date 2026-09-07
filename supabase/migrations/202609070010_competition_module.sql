-- Competition module: matches -> registered players -> a global scenario
-- (shared seed) -> one sandboxed run per player -> automatic ranking (see
-- lib/competition/ and lib/scenario/). Same column vocabulary and RLS
-- model as 202609070009_academy_module.sql -- see that migration's header
-- comment for the full rationale; not repeated here.

create extension if not exists pgcrypto;

-- One row per competition an organizer creates. Uses: id, user_id,
-- metadata (name). class_id/group_id -> not used here; match_id/
-- player_id/scenario_id/run_state/reports/scoring/ranking stay null.
create table if not exists public.competition_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  match_id uuid,
  player_id uuid,
  scenario_id text,
  run_state jsonb,
  reports jsonb,
  scoring jsonb,
  ranking jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per player registered into a match. Uses: id, user_id,
-- match_id, metadata (name).
create table if not exists public.competition_players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  player_id uuid,
  scenario_id text,
  run_state jsonb,
  reports jsonb,
  scoring jsonb,
  ranking jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per player per match: the player's own sandboxed
-- ScenarioRunState (see lib/scenario/scenarioEngine.js,
-- lib/competition/competitionState.js's serializeRunState()). Uses: id,
-- user_id, match_id, player_id, scenario_id, run_state.
create table if not exists public.competition_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  player_id uuid not null references public.competition_players(id) on delete cascade,
  scenario_id text not null,
  run_state jsonb not null default '{}'::jsonb,
  reports jsonb,
  scoring jsonb,
  ranking jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competition_runs_player_id_key on public.competition_runs (player_id);

-- One row per player's final grade (see lib/scenario/scenarioEvaluation.js's
-- evaluateFinal()). Uses: id, user_id, match_id, player_id, scenario_id,
-- reports, scoring.
create table if not exists public.competition_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  player_id uuid references public.competition_players(id) on delete cascade,
  scenario_id text,
  run_state jsonb,
  reports jsonb not null default '{}'::jsonb,
  scoring jsonb not null default '{}'::jsonb,
  ranking jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per match's leaderboard snapshot (see
-- lib/competition/competitionRanking.js's rankPlayers()) -- kept separate
-- from competition_reports so the match-wide ranking survives independently
-- of any single player's own report. Uses: id, user_id, match_id, ranking.
create table if not exists public.competition_rankings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  match_id uuid not null references public.competition_matches(id) on delete cascade,
  player_id uuid,
  scenario_id text,
  run_state jsonb,
  reports jsonb,
  scoring jsonb,
  ranking jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competition_rankings_match_id_key on public.competition_rankings (match_id);

create index if not exists competition_players_match_id_idx on public.competition_players (match_id);
create index if not exists competition_runs_match_id_idx on public.competition_runs (match_id);
create index if not exists competition_reports_match_id_idx on public.competition_reports (match_id);

do $$
declare
  t text;
begin
  foreach t in array array['competition_matches', 'competition_players', 'competition_runs', 'competition_reports', 'competition_rankings']
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
