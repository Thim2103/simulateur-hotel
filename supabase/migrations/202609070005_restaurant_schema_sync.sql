-- Forward-only compatibility migration for the restaurant simulation contract.
-- JSONB fields on restaurants remain the canonical write path for older installs.

create table if not exists public.restaurant_structure (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  concept text not null default '', location text not null default '',
  capacity integer not null default 0, seats integer not null default 0,
  materials text[] not null default '{}', equipment text[] not null default '{}',
  floors integer not null default 1, sections text[] not null default '{main}',
  layout text not null default 'standard', opening_hours text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_progression (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  xp integer not null default 0, completed_tutorials text[] not null default '{}',
  unlocked_achievements text[] not null default '{}', difficulty text not null default 'easy',
  cycles integer not null default 0, updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_marketing (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  budget numeric(12,2) not null default 0, positioning text not null default '',
  channels jsonb not null default '[]'::jsonb, campaigns jsonb not null default '[]'::jsonb,
  roi numeric(12,2) not null default 0, visibility numeric(5,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_esg (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  waste_reduction numeric(5,2) not null default 0, local_sourcing numeric(5,2) not null default 0,
  energy_efficiency numeric(5,2) not null default 0, staff_wellbeing numeric(5,2) not null default 0,
  certifications text[] not null default '{}', monthly_investment numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.restaurants add column if not exists concept text not null default '';
alter table public.restaurants add column if not exists location text not null default '';
alter table public.restaurants add column if not exists capacity integer not null default 0;
alter table public.restaurants add column if not exists opening_hours text not null default '';
alter table public.restaurants add column if not exists structure jsonb not null default '{}'::jsonb;
alter table public.restaurants add column if not exists marketing jsonb not null default '{}'::jsonb;
alter table public.restaurants add column if not exists esg jsonb not null default '{}'::jsonb;
alter table public.restaurants add column if not exists progression jsonb not null default '{}'::jsonb;

alter table public.restaurant_finance add column if not exists day date not null default current_date;
alter table public.restaurant_finance add column if not exists months jsonb not null default '{}'::jsonb;
alter table public.restaurant_finance add column if not exists energy_cost numeric(12,2) not null default 0;
alter table public.restaurant_finance add column if not exists waste numeric(12,2) not null default 0;

-- This repair preserves every text[] value. Other incompatible types are reported by the frontend.
do $$
declare months_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into months_type
    from pg_attribute a join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'restaurant_finance'
     and a.attname = 'months' and not a.attisdropped;
  if months_type = 'text[]' then
    alter table public.restaurant_finance alter column months type jsonb using to_jsonb(months);
  end if;
end $$;

insert into public.restaurant_structure (restaurant_id, concept, location, capacity, seats, materials, equipment)
select id, coalesce(concept, ''), coalesce(location, ''), coalesce(capacity, 0),
       coalesce((structure->>'seats')::integer, coalesce(capacity, 0)),
       coalesce(array(select jsonb_array_elements_text(structure->'materials')), '{}'),
       coalesce(array(select jsonb_array_elements_text(structure->'equipment')), '{}')
  from public.restaurants where id = '00000000-0000-0000-0000-000000000001'
on conflict (restaurant_id) do nothing;

alter table public.restaurant_structure enable row level security;
alter table public.restaurant_progression enable row level security;
alter table public.restaurant_marketing enable row level security;
alter table public.restaurant_esg enable row level security;
drop policy if exists "public restaurant structure access" on public.restaurant_structure;
drop policy if exists "public restaurant progression access" on public.restaurant_progression;
drop policy if exists "public restaurant marketing access" on public.restaurant_marketing;
drop policy if exists "public restaurant esg access" on public.restaurant_esg;
create policy "public restaurant structure access" on public.restaurant_structure for all using (true) with check (true);
create policy "public restaurant progression access" on public.restaurant_progression for all using (true) with check (true);
create policy "public restaurant marketing access" on public.restaurant_marketing for all using (true) with check (true);
create policy "public restaurant esg access" on public.restaurant_esg for all using (true) with check (true);