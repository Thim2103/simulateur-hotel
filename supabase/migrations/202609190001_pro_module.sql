-- Migration: Professional Solo mode tables
-- Mirrors the shape of tfe_state/tfe_report/tfe_score/tfe_forecast
-- tables (202609150001_tfe_module.sql), plus a dedicated diagnostics
-- table as requested for this module.
--
-- Five tables:
--   pro_state       : the full computed ProState per user (self-contained,
--                      embeds its own CareerState -- see lib/pro/proState.js)
--   pro_report      : the final report, once the 24-month horizon is reached
--   pro_score       : the current professional score (global + normalized copy)
--   pro_forecast    : the generated 24-month multi-scenario forecast
--   pro_diagnostics : the current diagnostics list on its own row
--
-- pro_report/pro_score/pro_forecast/pro_diagnostics are normalized,
-- queryable copies of what pro_state.state already carries -- same "one
-- table per module concept" convention every other module's migration
-- already establishes.
--
-- RLS: each user can only read and write their own rows.

-- ── pro_state ────────────────────────────────────────────────────────────
create table if not exists pro_state (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  state         jsonb,                  -- full ProState blob
  hotel_config  jsonb,
  scenario      jsonb,                  -- { phases }
  crises        jsonb,
  opportunities jsonb,
  audits        jsonb,
  objectives    jsonb,
  missions      jsonb,
  performance   jsonb,
  score         jsonb,
  forecast      jsonb,
  diagnostics   jsonb,
  report        jsonb,
  metadata      jsonb,
  updated_at    timestamptz not null default now(),

  constraint pro_state_user_id_key unique (user_id)
);

alter table pro_state enable row level security;

create policy "pro_state_select_own"
  on pro_state for select
  using (auth.uid() = user_id);

create policy "pro_state_insert_own"
  on pro_state for insert
  with check (auth.uid() = user_id);

create policy "pro_state_update_own"
  on pro_state for update
  using (auth.uid() = user_id);

-- ── pro_report ───────────────────────────────────────────────────────────
create table if not exists pro_report (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  report      jsonb,
  metadata    jsonb,
  updated_at  timestamptz not null default now(),

  constraint pro_report_user_id_key unique (user_id)
);

alter table pro_report enable row level security;

create policy "pro_report_select_own"
  on pro_report for select
  using (auth.uid() = user_id);

create policy "pro_report_insert_own"
  on pro_report for insert
  with check (auth.uid() = user_id);

create policy "pro_report_update_own"
  on pro_report for update
  using (auth.uid() = user_id);

-- ── pro_score ────────────────────────────────────────────────────────────
create table if not exists pro_score (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  score       jsonb,
  updated_at  timestamptz not null default now(),

  constraint pro_score_user_id_key unique (user_id)
);

alter table pro_score enable row level security;

create policy "pro_score_select_own"
  on pro_score for select
  using (auth.uid() = user_id);

create policy "pro_score_insert_own"
  on pro_score for insert
  with check (auth.uid() = user_id);

create policy "pro_score_update_own"
  on pro_score for update
  using (auth.uid() = user_id);

-- ── pro_forecast ─────────────────────────────────────────────────────────
create table if not exists pro_forecast (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  forecast    jsonb,
  metadata    jsonb,
  updated_at  timestamptz not null default now(),

  constraint pro_forecast_user_id_key unique (user_id)
);

alter table pro_forecast enable row level security;

create policy "pro_forecast_select_own"
  on pro_forecast for select
  using (auth.uid() = user_id);

create policy "pro_forecast_insert_own"
  on pro_forecast for insert
  with check (auth.uid() = user_id);

create policy "pro_forecast_update_own"
  on pro_forecast for update
  using (auth.uid() = user_id);

-- ── pro_diagnostics ──────────────────────────────────────────────────────
create table if not exists pro_diagnostics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  diagnostics  jsonb,
  updated_at   timestamptz not null default now(),

  constraint pro_diagnostics_user_id_key unique (user_id)
);

alter table pro_diagnostics enable row level security;

create policy "pro_diagnostics_select_own"
  on pro_diagnostics for select
  using (auth.uid() = user_id);

create policy "pro_diagnostics_insert_own"
  on pro_diagnostics for insert
  with check (auth.uid() = user_id);

create policy "pro_diagnostics_update_own"
  on pro_diagnostics for update
  using (auth.uid() = user_id);
