-- Academy module: classes -> groups -> a scenario assignment -> one
-- sandboxed run per group (see lib/academy/ and lib/scenario/). Every
-- table carries the full column vocabulary the module was specified with
-- (id, user_id, class_id/group_id, scenario_id, run_state, reports,
-- scoring, metadata) even where a given table only uses a subset of it --
-- see the comment on each table for which columns actually apply.
--
-- Auth/RLS model: identical to 202609070006_rls_user_scoping.sql --
-- user_id defaults to auth.uid() (this simulator's anonymous-session
-- model), and a signed-in user (the teacher) only ever sees/writes their
-- own rows. There is no legacy data to claim for this module.

create extension if not exists pgcrypto;

-- One row per class a teacher creates. Uses: id, user_id, metadata (name,
-- tags, ...). class_id/group_id/scenario_id/run_state/reports/scoring do
-- not apply at this level and stay null.
create table if not exists public.academy_classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  class_id uuid,
  group_id uuid,
  scenario_id text,
  run_state jsonb,
  reports jsonb,
  scoring jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per group within a class. Uses: id, user_id, class_id, metadata
-- (name, member_names, ...).
create table if not exists public.academy_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  class_id uuid not null references public.academy_classes(id) on delete cascade,
  group_id uuid,
  scenario_id text,
  run_state jsonb,
  reports jsonb,
  scoring jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per scenario assignment to a class. Uses: id, user_id,
-- class_id, scenario_id, metadata (the full Scenario object, due date).
create table if not exists public.academy_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  class_id uuid not null references public.academy_classes(id) on delete cascade,
  group_id uuid,
  scenario_id text not null,
  run_state jsonb,
  reports jsonb,
  scoring jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per group per assignment: the group's own sandboxed
-- ScenarioRunState (see lib/scenario/scenarioEngine.js,
-- lib/academy/academyState.js's serializeRunState()). Uses: id, user_id,
-- class_id, group_id, scenario_id, run_state.
create table if not exists public.academy_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  class_id uuid not null references public.academy_classes(id) on delete cascade,
  group_id uuid not null references public.academy_groups(id) on delete cascade,
  scenario_id text not null,
  run_state jsonb not null default '{}'::jsonb,
  reports jsonb,
  scoring jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists academy_runs_group_id_key on public.academy_runs (group_id);

-- One row per group's final grade, plus the class-wide final report the
-- teacher reads (see lib/academy/academyEvaluation.js). Uses: id,
-- user_id, class_id, group_id, scenario_id, reports, scoring.
create table if not exists public.academy_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  class_id uuid not null references public.academy_classes(id) on delete cascade,
  group_id uuid references public.academy_groups(id) on delete cascade,
  scenario_id text,
  run_state jsonb,
  reports jsonb not null default '{}'::jsonb,
  scoring jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_groups_class_id_idx on public.academy_groups (class_id);
create index if not exists academy_assignments_class_id_idx on public.academy_assignments (class_id);
create index if not exists academy_runs_class_id_idx on public.academy_runs (class_id);
create index if not exists academy_reports_class_id_idx on public.academy_reports (class_id);

do $$
declare
  t text;
begin
  foreach t in array array['academy_classes', 'academy_groups', 'academy_assignments', 'academy_runs', 'academy_reports']
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
