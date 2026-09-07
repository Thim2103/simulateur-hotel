-- Adds the two tables lib/restaurant/restaurantEngine.js's report can be
-- persisted into: a log of the restaurant-relevant events it resolved each
-- cycle (restaurant_events -- see lib/restaurant/restaurantEvents.js) and a
-- daily snapshot of its RM/demand sync (restaurant_rm -- see
-- lib/restaurant/restaurantRM.js). Neither is read by the app yet (the
-- engine currently returns this data in-memory, in RestaurantReport, for
-- the same cycle only); these tables exist so a future replay/analytics
-- pass (see the Hospitality Lab roadmap's M-17/M-18) has somewhere to
-- persist history without another schema change.
--
-- Same per-user RLS model as 202609070006_rls_user_scoping.sql: user_id
-- defaults to auth.uid(), and a signed-in user only ever sees/writes their
-- own rows. There is no legacy data to claim for these two tables (they
-- did not exist before this migration), so -- unlike the earlier
-- migration -- SELECT/UPDATE do not need the "or user_id is null" carve-out.

create extension if not exists pgcrypto;

create table if not exists public.restaurant_events (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  day date,
  event_id text not null,
  category text not null,
  severity text not null default 'medium',
  message text,
  complaints_delta numeric not null default 0,
  maintenance_delta numeric not null default 0,
  demand_delta numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_events_restaurant_id_idx on public.restaurant_events (restaurant_id);
create index if not exists restaurant_events_user_id_idx on public.restaurant_events (user_id);

create table if not exists public.restaurant_rm (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  day date,
  hotel_occupancy_percent numeric not null default 0,
  demand_boost numeric not null default 0,
  recommended_focus text,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_rm_restaurant_id_idx on public.restaurant_rm (restaurant_id);
create index if not exists restaurant_rm_user_id_idx on public.restaurant_rm (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['restaurant_events', 'restaurant_rm']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "select_own_or_unclaimed" on public.%I', t);
    execute format('drop policy if exists "insert_own" on public.%I', t);
    execute format('drop policy if exists "update_own_or_claim" on public.%I', t);
    execute format('drop policy if exists "delete_own" on public.%I', t);

    execute format(
      'create policy "select_own" on public.%I for select to authenticated using (user_id = auth.uid())',
      t
    );
    execute format(
      'create policy "insert_own" on public.%I for insert to authenticated with check (user_id = auth.uid())',
      t
    );
    execute format(
      'create policy "update_own" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
    execute format(
      'create policy "delete_own" on public.%I for delete to authenticated using (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
