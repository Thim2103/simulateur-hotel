-- Migration: Restaurant Advanced module tables
-- Mirrors the shape of clients_state/clients_forecast tables
-- (202609160001_clients_module.sql).
--
-- Two tables:
--   restaurant_advanced_state    : the full computed RestaurantAdvancedState per user
--   restaurant_advanced_forecast : the generated 30-day F&B forecast (separate
--                                  upsert path so the state table stays
--                                  row-size-friendly)
--
-- RLS: each user can only read and write their own rows.

-- ── restaurant_advanced_state ───────────────────────────────────────────
create table if not exists restaurant_advanced_state (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  state            jsonb,                  -- full RestaurantAdvancedState blob
  food_cost        jsonb,
  popularity       jsonb,
  profitability    jsonb,
  menu_engineering jsonb,
  diagnostics      jsonb,
  forecast         jsonb,
  metadata         jsonb,
  updated_at       timestamptz not null default now(),

  constraint restaurant_advanced_state_user_id_key unique (user_id)
);

alter table restaurant_advanced_state enable row level security;

create policy "restaurant_advanced_state_select_own"
  on restaurant_advanced_state for select
  using (auth.uid() = user_id);

create policy "restaurant_advanced_state_insert_own"
  on restaurant_advanced_state for insert
  with check (auth.uid() = user_id);

create policy "restaurant_advanced_state_update_own"
  on restaurant_advanced_state for update
  using (auth.uid() = user_id);

-- ── restaurant_advanced_forecast ────────────────────────────────────────
create table if not exists restaurant_advanced_forecast (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  forecast    jsonb,
  metadata    jsonb,
  updated_at  timestamptz not null default now(),

  constraint restaurant_advanced_forecast_user_id_key unique (user_id)
);

alter table restaurant_advanced_forecast enable row level security;

create policy "restaurant_advanced_forecast_select_own"
  on restaurant_advanced_forecast for select
  using (auth.uid() = user_id);

create policy "restaurant_advanced_forecast_insert_own"
  on restaurant_advanced_forecast for insert
  with check (auth.uid() = user_id);

create policy "restaurant_advanced_forecast_update_own"
  on restaurant_advanced_forecast for update
  using (auth.uid() = user_id);
