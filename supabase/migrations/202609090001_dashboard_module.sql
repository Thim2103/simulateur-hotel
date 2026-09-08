-- Dashboard module: one row per user holding the general Dashboard's own
-- preferences (see lib/dashboard/dashboardRepository.js). The KPIs,
-- notifications, insights and quick actions themselves are NOT the
-- source of truth stored here -- they're recomputed on every load from
-- CareerState (see lib/dashboard/dashboardEngine.js's
-- buildDashboardState()), which is already persisted by the Career
-- module (career_state, see 202609080001_career_module.sql). Storing a
-- derived snapshot here would just go stale the moment the player plays
-- another day; the kpis/notifications/insights/quick_actions columns
-- exist (as the spec asked for) but are only ever written as empty
-- placeholders -- see the repository's saveDashboardPreferences().
--
-- Auth/RLS model: identical to every other module's -- see
-- 202609070009_academy_module.sql's header for the full rationale.

create extension if not exists pgcrypto;

create table if not exists public.dashboard_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kpis jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  insights jsonb not null default '{}'::jsonb,
  quick_actions jsonb not null default '[]'::jsonb,
  view_mode text not null default 'casual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dashboard_state_user_id_key on public.dashboard_state (user_id);

alter table public.dashboard_state enable row level security;

drop policy if exists "select_own" on public.dashboard_state;
drop policy if exists "insert_own" on public.dashboard_state;
drop policy if exists "update_own" on public.dashboard_state;
drop policy if exists "delete_own" on public.dashboard_state;

create policy "select_own" on public.dashboard_state for select to authenticated using (user_id = auth.uid());
create policy "insert_own" on public.dashboard_state for insert to authenticated with check (user_id = auth.uid());
create policy "update_own" on public.dashboard_state for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete_own" on public.dashboard_state for delete to authenticated using (user_id = auth.uid());
