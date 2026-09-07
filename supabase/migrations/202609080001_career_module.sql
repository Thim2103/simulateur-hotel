-- Solo/Career module: one career per user (career_state is the
-- authoritative snapshot -- see lib/career/careerRepository.js), plus
-- normalized tables for missions/objectives/storyline/events/skills/
-- rewards so a future debrief/analytics pass can query one slice without
-- loading the whole state. Same column vocabulary and RLS model as the
-- Academy/Competition/Replay/Analytics migrations -- see
-- 202609070009_academy_module.sql's header for the full rationale, not
-- repeated here.
--
-- Scope note: this migration creates all 7 tables the module was
-- specified with, but lib/career/careerRepository.js currently only
-- reads/writes career_state (the single JSON snapshot is self-sufficient
-- for gameplay); the other 6 exist as a normalized audit trail a future
-- pass can start writing into without another migration.

create extension if not exists pgcrypto;

-- The one row per user holding the full CareerState (see
-- lib/career/careerState.js's createCareerState()). Uses: id, user_id,
-- state (playerId/day/status/hotel), progression, missions, objectives,
-- storyline, skills, rewards, metadata -- every column genuinely used.
create table if not exists public.career_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb not null default '{}'::jsonb,
  progression jsonb not null default '{}'::jsonb,
  missions jsonb not null default '[]'::jsonb,
  objectives jsonb not null default '[]'::jsonb,
  storyline jsonb not null default '{}'::jsonb,
  skills jsonb not null default '{}'::jsonb,
  rewards jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists career_state_user_id_key on public.career_state (user_id);

-- One row per mission instance (audit trail: accepted/completed dates) --
-- see lib/career/careerMissions.js.
create table if not exists public.career_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb,
  progression jsonb,
  missions jsonb not null default '{}'::jsonb,
  objectives jsonb,
  storyline jsonb,
  skills jsonb,
  rewards jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- One row per always-on objective's evaluation history -- see
-- lib/career/careerObjectives.js.
create table if not exists public.career_objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb,
  progression jsonb,
  missions jsonb,
  objectives jsonb not null default '{}'::jsonb,
  storyline jsonb,
  skills jsonb,
  rewards jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- One row per resolved story choice -- see
-- lib/career/careerStoryline.js's resolveStoryChoice().
create table if not exists public.career_storyline (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb,
  progression jsonb,
  missions jsonb,
  objectives jsonb,
  storyline jsonb not null default '{}'::jsonb,
  skills jsonb,
  rewards jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- One row per narrative event definition/eligibility rolled -- see
-- lib/career/careerEvents.js.
create table if not exists public.career_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb,
  progression jsonb,
  missions jsonb,
  objectives jsonb,
  storyline jsonb,
  skills jsonb,
  rewards jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- One row per skill-point change -- see lib/career/careerSkills.js's
-- updateSkill().
create table if not exists public.career_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb,
  progression jsonb,
  missions jsonb,
  objectives jsonb,
  storyline jsonb,
  skills jsonb not null default '{}'::jsonb,
  rewards jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- One row per reward granted/claimed -- see lib/career/careerRewards.js.
create table if not exists public.career_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb,
  progression jsonb,
  missions jsonb,
  objectives jsonb,
  storyline jsonb,
  skills jsonb,
  rewards jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['career_state', 'career_missions', 'career_objectives', 'career_storyline', 'career_events', 'career_skills', 'career_rewards']
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
