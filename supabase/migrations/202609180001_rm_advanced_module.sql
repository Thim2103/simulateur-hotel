-- Migration: RM Advanced module tables
-- Mirrors the shape of restaurant_advanced_state/restaurant_advanced_forecast
-- tables (202609170001_restaurant_advanced_module.sql), plus a dedicated
-- diagnostics table as requested for this module.
--
-- Three tables:
--   rm_advanced_state       : the full computed RmAdvancedState per user
--   rm_advanced_forecast    : the generated 30-day multi-scenario forecast
--                              (separate upsert path so the state table
--                              stays row-size-friendly)
--   rm_advanced_diagnostics : the current diagnostics list on its own row,
--                              so a future diagnostics-history view can
--                              query it without loading the full state blob
--
-- RLS: each user can only read and write their own rows.

-- ── rm_advanced_state ────────────────────────────────────────────────────
create table if not exists rm_advanced_state (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  state          jsonb,                  -- full RmAdvancedState blob
  compression    jsonb,
  displacement   jsonb,
  pickup_curves  jsonb,
  forecast       jsonb,
  ota_share      numeric(5,2),
  direct_share   numeric(5,2),
  diagnostics    jsonb,
  metadata       jsonb,
  updated_at     timestamptz not null default now(),

  constraint rm_advanced_state_user_id_key unique (user_id)
);

alter table rm_advanced_state enable row level security;

create policy "rm_advanced_state_select_own"
  on rm_advanced_state for select
  using (auth.uid() = user_id);

create policy "rm_advanced_state_insert_own"
  on rm_advanced_state for insert
  with check (auth.uid() = user_id);

create policy "rm_advanced_state_update_own"
  on rm_advanced_state for update
  using (auth.uid() = user_id);

-- ── rm_advanced_forecast ─────────────────────────────────────────────────
create table if not exists rm_advanced_forecast (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  forecast    jsonb,
  metadata    jsonb,
  updated_at  timestamptz not null default now(),

  constraint rm_advanced_forecast_user_id_key unique (user_id)
);

alter table rm_advanced_forecast enable row level security;

create policy "rm_advanced_forecast_select_own"
  on rm_advanced_forecast for select
  using (auth.uid() = user_id);

create policy "rm_advanced_forecast_insert_own"
  on rm_advanced_forecast for insert
  with check (auth.uid() = user_id);

create policy "rm_advanced_forecast_update_own"
  on rm_advanced_forecast for update
  using (auth.uid() = user_id);

-- ── rm_advanced_diagnostics ──────────────────────────────────────────────
create table if not exists rm_advanced_diagnostics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  diagnostics  jsonb,
  updated_at   timestamptz not null default now(),

  constraint rm_advanced_diagnostics_user_id_key unique (user_id)
);

alter table rm_advanced_diagnostics enable row level security;

create policy "rm_advanced_diagnostics_select_own"
  on rm_advanced_diagnostics for select
  using (auth.uid() = user_id);

create policy "rm_advanced_diagnostics_insert_own"
  on rm_advanced_diagnostics for insert
  with check (auth.uid() = user_id);

create policy "rm_advanced_diagnostics_update_own"
  on rm_advanced_diagnostics for update
  using (auth.uid() = user_id);
