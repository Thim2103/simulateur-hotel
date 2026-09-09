-- Migration: Clients module tables
-- Mirrors the shape of housekeeping_state/esg_state tables
-- (202609130001_housekeeping_module.sql / 202609120001_esg_module.sql).
--
-- Four tables:
--   clients_state    : the full computed ClientsState per user
--   clients_forecast : the generated 30-day forecast (separate upsert
--                      path so the state table stays row-size-friendly)
--
-- RLS: each user can only read and write their own rows.

-- ── clients_state ────────────────────────────────────────────────────────
create table if not exists clients_state (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  state       jsonb,                  -- full ClientsState blob
  satisfaction numeric(5,2),
  loyalty     numeric(5,2),
  segments    jsonb,
  reviews     jsonb,
  complaints  jsonb,
  forecast    jsonb,
  diagnostics jsonb,
  metadata    jsonb,
  updated_at  timestamptz not null default now(),

  constraint clients_state_user_id_key unique (user_id)
);

alter table clients_state enable row level security;

create policy "clients_state_select_own"
  on clients_state for select
  using (auth.uid() = user_id);

create policy "clients_state_insert_own"
  on clients_state for insert
  with check (auth.uid() = user_id);

create policy "clients_state_update_own"
  on clients_state for update
  using (auth.uid() = user_id);

-- ── clients_forecast ─────────────────────────────────────────────────────
create table if not exists clients_forecast (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  forecast    jsonb,
  metadata    jsonb,
  updated_at  timestamptz not null default now(),

  constraint clients_forecast_user_id_key unique (user_id)
);

alter table clients_forecast enable row level security;

create policy "clients_forecast_select_own"
  on clients_forecast for select
  using (auth.uid() = user_id);

create policy "clients_forecast_insert_own"
  on clients_forecast for insert
  with check (auth.uid() = user_id);

create policy "clients_forecast_update_own"
  on clients_forecast for update
  using (auth.uid() = user_id);
