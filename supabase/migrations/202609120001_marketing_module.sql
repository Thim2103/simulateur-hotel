-- Marketing module: one current-cycle snapshot per user (marketing_state,
-- see lib/marketingRepository.js's getMarketingState()/
-- saveMarketingState()), normalized per-campaign/per-channel tables
-- (marketing_campaigns/marketing_channels), and the last generated
-- 30-day forecast (marketing_forecast). Same column vocabulary and RLS
-- model as every other module's migration -- see
-- 202609100001_finance_module.sql's header for the full rationale, not
-- repeated here.
--
-- Scope note: a guest session (see lib/guest/) never reaches any of
-- these four tables -- lib/marketingRepository.js branches to
-- localStorage before ever calling assertSupabaseConfigured() for a
-- guest, same as every other guest-aware repository in this app.

create extension if not exists pgcrypto;

-- The one row per user holding the full MarketingState (see
-- lib/marketing/marketingState.js's createMarketingState()) -- the
-- current cycle's budget, ROI, conversion, segments, reputation,
-- positioning, channels, campaigns, forecast and diagnostics.
create table if not exists public.marketing_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  state jsonb not null default '{}'::jsonb,
  budget jsonb not null default '{}'::jsonb,
  roi jsonb not null default '{}'::jsonb,
  conversion jsonb not null default '{}'::jsonb,
  reputation numeric not null default 0,
  segments jsonb not null default '{}'::jsonb,
  channels jsonb not null default '[]'::jsonb,
  campaigns jsonb not null default '[]'::jsonb,
  forecast jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists marketing_state_user_id_key on public.marketing_state (user_id);

-- One row per campaign (see lib/marketing/marketingCampaigns.js) --
-- normalized so a future "all my campaigns across cycles" view doesn't
-- need to parse marketing_state's own jsonb column.
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  campaign_id text not null,
  name text not null default '',
  objective text not null default '',
  status text not null default 'draft',
  budget numeric not null default 0,
  conversion numeric not null default 0,
  roi numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists marketing_campaigns_user_campaign_key on public.marketing_campaigns (user_id, campaign_id);

-- One row per channel (see lib/marketing/marketingChannels.js).
create table if not exists public.marketing_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  channel_id text not null,
  name text not null default '',
  enabled boolean not null default true,
  budget numeric not null default 0,
  reach numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists marketing_channels_user_channel_key on public.marketing_channels (user_id, channel_id);

-- The last generated 30-day marketing forecast (see
-- lib/marketing/marketingForecast.js's generateMarketingForecast()) --
-- one row per user, overwritten each time a fresh forecast is computed.
create table if not exists public.marketing_forecast (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  forecast jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists marketing_forecast_user_id_key on public.marketing_forecast (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['marketing_state', 'marketing_campaigns', 'marketing_channels', 'marketing_forecast']
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
