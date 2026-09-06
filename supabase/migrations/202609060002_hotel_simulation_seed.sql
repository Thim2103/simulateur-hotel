create extension if not exists pgcrypto;

-- Core PMS tables. The simple column names are kept in sync with the existing UI.
create table if not exists public.rooms (
  id bigint primary key,
  number text not null unique,
  type text not null check (type in ('standard', 'deluxe', 'suite', 'seminar', 'conference', 'familiale', 'Standard', 'Deluxe', 'Suite', 'Familiale')),
  price numeric(10,2) not null check (price >= 0),
  status text not null default 'libre' check (status in ('libre', 'occupée', 'maintenance', 'hors_service')),
  floor smallint check (floor is null or floor > 0),
  capacity smallint not null check (capacity > 0),
  amenities text[] not null default '{}',
  external_id text,
  housekeeping_status text not null default 'clean',
  maintenance_notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id bigint primary key,
  name text not null,
  email text not null unique,
  phone text not null,
  segment text not null check (segment in ('leisure', 'corporate', 'ota', 'groups', 'Loisirs', 'Corporate', 'OTA', 'Groupes')),
  company text not null default '',
  notes text not null default '',
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  nationality text not null default 'France',
  loyalty_level text not null default 'Standard' check (loyalty_level in ('Standard', 'Silver', 'Gold', 'Platinum')),
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id bigint primary key,
  client_id bigint references public.clients(id) on delete set null,
  room_id bigint references public.rooms(id) on delete set null,
  client_name text,
  client text,
  room text,
  room_type text,
  price numeric(10,2) not null default 0 check (price >= 0),
  notes text,
  channel text not null default 'direct' check (channel in ('direct', 'ota', 'corporate', 'agency')),
  source text not null default 'direct' check (source in ('direct', 'ota', 'corporate', 'agency')),
  segment text not null default 'leisure' check (segment in ('leisure', 'corporate', 'ota', 'groups', 'Loisirs', 'Corporate', 'OTA', 'Groupes')),
  status text not null default 'en attente' check (status in ('confirmée', 'en attente', 'annulée', 'booked', 'option')),
  arrival date not null,
  departure date not null,
  guests smallint not null default 1 check (guests > 0),
  client_email text not null default '',
  client_phone text not null default '',
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_dates_check check (departure > arrival),
  constraint reservations_client_name_check check (coalesce(client_name, client) is not null)
);

alter table public.reservations add column if not exists client_id bigint;
alter table public.reservations add column if not exists guests smallint not null default 1;
alter table public.reservations add column if not exists updated_at timestamptz not null default now();
alter table public.reservations add column if not exists source text not null default 'direct';
alter table public.reservations add column if not exists client_email text not null default '';
alter table public.reservations add column if not exists client_phone text not null default '';
alter table public.reservations add column if not exists external_id text;
alter table public.reservations add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.rooms add column if not exists floor smallint;
alter table public.rooms add column if not exists capacity smallint not null default 2;
alter table public.rooms add column if not exists amenities text[] not null default '{}';
alter table public.rooms add column if not exists external_id text;
alter table public.rooms add column if not exists housekeeping_status text not null default 'clean';
alter table public.rooms add column if not exists maintenance_notes text not null default '';
alter table public.rooms add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.clients add column if not exists nationality text not null default 'France';
alter table public.clients add column if not exists loyalty_level text not null default 'Standard';
alter table public.clients add column if not exists preferences jsonb not null default '{}'::jsonb;
alter table public.clients add column if not exists company text not null default '';
alter table public.clients add column if not exists notes text not null default '';
alter table public.clients add column if not exists external_id text;
alter table public.clients add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.reservations drop constraint if exists reservations_client_id_fkey;
alter table public.reservations add constraint reservations_client_id_fkey foreign key (client_id) references public.clients(id) on delete set null;

-- RM snapshots are separate from calculated UI values so historical simulations can be replayed.
create table if not exists public.rm_forecasts (
  id bigint primary key,
  forecast_date date not null unique,
  room_type text not null check (room_type in ('all', 'Standard', 'Deluxe', 'Suite', 'Familiale')),
  occupancy_rate numeric(5,2) not null check (occupancy_rate between 0 and 100),
  rooms_sold integer not null check (rooms_sold >= 0),
  adr numeric(10,2) not null check (adr >= 0),
  revpar numeric(10,2) not null check (revpar >= 0),
  demand_index numeric(5,2) not null check (demand_index between 0 and 100),
  source text not null default 'simulation',
  created_at timestamptz not null default now()
);

create table if not exists public.rm_kpis (
  id bigint primary key,
  period_start date not null unique,
  occupancy_rate numeric(5,2) not null check (occupancy_rate between 0 and 100),
  adr numeric(10,2) not null check (adr >= 0),
  revpar numeric(10,2) not null check (revpar >= 0),
  room_revenue numeric(12,2) not null check (room_revenue >= 0),
  cancellations integer not null default 0 check (cancellations >= 0),
  pickup integer not null default 0 check (pickup >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.restaurant_finance_periods (
  id bigint primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  period_start date not null,
  revenue numeric(12,2) not null check (revenue >= 0),
  food_cost numeric(12,2) not null check (food_cost >= 0),
  payroll numeric(12,2) not null check (payroll >= 0),
  operating_costs numeric(12,2) not null check (operating_costs >= 0),
  covers integer not null check (covers >= 0),
  created_at timestamptz not null default now(),
  unique (restaurant_id, period_start)
);

create table if not exists public.restaurant_esg_metrics (
  id bigint primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  period_start date not null,
  food_waste_kg numeric(10,2) not null check (food_waste_kg >= 0),
  recycled_pct numeric(5,2) not null check (recycled_pct between 0 and 100),
  local_sourcing_pct numeric(5,2) not null check (local_sourcing_pct between 0 and 100),
  energy_kwh numeric(10,2) not null check (energy_kwh >= 0),
  water_liters numeric(10,2) not null check (water_liters >= 0),
  staff_wellbeing_score numeric(5,2) not null check (staff_wellbeing_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (restaurant_id, period_start)
);

create index if not exists rooms_status_idx on public.rooms(status);
create index if not exists reservations_arrival_departure_idx on public.reservations(arrival, departure);
create index if not exists reservations_room_idx on public.reservations(room_id);
create index if not exists reservations_client_idx on public.reservations(client_id);
create index if not exists reservations_segment_channel_idx on public.reservations(segment, channel);
create index if not exists rm_forecasts_date_idx on public.rm_forecasts(forecast_date);
create index if not exists restaurant_finance_periods_date_idx on public.restaurant_finance_periods(restaurant_id, period_start);
create index if not exists restaurant_esg_metrics_date_idx on public.restaurant_esg_metrics(restaurant_id, period_start);

-- Deterministic PMS seed: 30 rooms, 30 clients and 40 reservations.
insert into public.rooms (id, number, type, price, status, floor, capacity, amenities)
select room_id, room_number, room_type, room_price,
  case when room_id in (6, 17, 28) then 'maintenance' when room_id % 4 = 0 then 'occupée' else 'libre' end,
  ((room_id - 1) / 10) + 1, room_capacity, room_amenities
from (
  select g as room_id,
    ((g / 100)::int + 1)::text || lpad((g % 100)::text, 2, '0') as room_number,
    (array['standard','standard','deluxe','deluxe','suite','familiale'])[1 + ((g - 1) % 6)] as room_type,
    (array[109,109,149,149,229,189])[1 + ((g - 1) % 6)]::numeric as room_price,
    (array[1,2,2,3,4,4])[1 + ((g - 1) % 6)] as room_capacity,
    (array['{Wi-Fi,TV,Climatisation}','{Wi-Fi,TV,Vue cour}','{Wi-Fi,TV,Minibar}','{Wi-Fi,TV,Balcon}','{Wi-Fi,TV,Minibar,Baignoire}','{Wi-Fi,TV,Canape,Kitchenette}']) [1 + ((g - 1) % 6)]::text[] as room_amenities
  from generate_series(1, 30) as series(g)
) seed
on conflict (id) do nothing;

insert into public.clients (id, name, email, phone, segment, nationality, loyalty_level, preferences)
select g,
  (array['Camille Moreau','Julien Bernard','Nathalie Roy','Thomas Garcia','Adele Fournier','Marc Lefevre','Ines Mercier','Paul Girard','Sophie Lambert','Hugo Bonnet','Claire Renaud','Antoine Perrin','Louise Faure','Romain Chevalier','Manon Gauthier','Louis Blanchard','Eva Muller','Mathieu Robin','Chloe Masson','Benoit Henry','Laura Dupont','Eric Renard','Sarah Petit','Nicolas Marchand','Alice Noel','Olivier Legrand','Maya Colin','Victor Barre','Emma Fontaine','Yanis Brun'])[g],
  'client' || lpad(g::text, 2, '0') || '@exemple.fr',
  '+33 6 00 00 ' || lpad(g::text, 2, '0'),
  (array['Loisirs','Corporate','OTA','Loisirs','Groupes'])[1 + ((g - 1) % 5)],
  (array['France','Belgique','Suisse','Espagne','Italie'])[1 + ((g - 1) % 5)],
  (array['Standard','Silver','Gold','Standard','Platinum'])[1 + ((g - 1) % 5)],
  jsonb_build_object('breakfast', g % 3 <> 0, 'late_checkout', g % 4 = 0)
from generate_series(1, 30) as series(g)
on conflict (id) do nothing;

insert into public.reservations (id, client_id, room_id, client_name, client, room, room_type, price, notes, channel, source, segment, status, arrival, departure, guests, client_email, client_phone, created_at)
select 1000 + g, client_id, room_id, client_name, client_name, room_number, room_type, room_price,
  case when g % 7 = 0 then 'Arrivee tardive' when g % 5 = 0 then 'Lit bebe demande' else null end,
  channel, channel, segment, status, arrival, arrival + ((g % 4) + 1), 1 + (g % 3),
  'client' || lpad(client_id::text, 2, '0') || '@exemple.fr', '+33 6 00 00 ' || lpad(client_id::text, 2, '0'),
  arrival - ((g % 18) + 4) * interval '1 day'
from (
  select g, 1 + ((g - 1) % 30) as client_id, 1 + ((g * 7 - 1) % 30) as room_id,
    ('Client ' || lpad((1 + ((g - 1) % 30))::text, 2, '0')) as client_name,
    (((1 + ((g * 7 - 1) % 30)) / 100)::int + 1)::text || lpad(((1 + ((g * 7 - 1) % 30)) % 100)::text, 2, '0') as room_number,
    (array['standard','standard','deluxe','deluxe','suite','familiale'])[1 + (((g * 7 - 1) % 30) % 6)] as room_type,
    (array[109,109,149,149,229,189])[1 + (((g * 7 - 1) % 30) % 6)]::numeric + (g % 3) * 5 as room_price,
    (array['direct','ota','corporate','agency'])[1 + ((g - 1) % 4)] as channel,
    (array['leisure','ota','corporate','groups'])[1 + ((g - 1) % 4)] as segment,
    (array['confirmée','confirmée','en attente','confirmée','annulée'])[1 + ((g - 1) % 5)] as status,
    date '2026-09-01' + ((g * 2) % 75) as arrival
  from generate_series(1, 40) as series(g)
) seed
on conflict (id) do nothing;

update public.reservations r
set client_name = coalesce(r.client_name, c.name), client = coalesce(r.client, c.name),
    room = coalesce(r.room, rm.number), room_type = coalesce(r.room_type, rm.type)
from public.clients c, public.rooms rm
where r.client_id = c.id and r.room_id = rm.id
  and (r.client_name is null or r.client is null or r.room is null or r.room_type is null);

-- Additional Restaurant records keep the existing JSON state contract while exposing historical rows.
insert into public.restaurant_staff (id, restaurant_id, name, role, department, salary, skills)
select 100 + g, '00000000-0000-0000-0000-000000000001',
  (array['Mila Rousseau','Arthur Vidal','Lea Caron','Theo Rey','Jeanne Colin','Gabriel Picard','Nina Aubert','Maxime Lacroix','Anais Rolland','Baptiste Meunier','Lina Perrot','Simon Tessier','Elise Humbert','Nathan Dumas','Romane Leclerc','Youssef Benali','Lola Guillon','Axel Boucher','Margot Paris','Samuel Olivier'])[g],
  (array['Commis','Chef de partie','Serveur','Serveuse','Plongeur'])[1 + ((g - 1) % 5)],
  (array['Cuisine','Cuisine','Service','Service','Logistique'])[1 + ((g - 1) % 5)],
  1750 + ((g * 83) % 1100),
  (array['Preparation','Dressage','Accueil','Service','Hygiene'])[1 + ((g - 1) % 5)]::text[]
from generate_series(1, 20) as series(g)
on conflict (id) do nothing;

insert into public.restaurant_menu_items (id, restaurant_id, name, category, cost, price, sales)
select 100 + g, '00000000-0000-0000-0000-000000000001',
  (array['Veloute de courge','Oeuf parfait','Truite du Vercors','Quenelle lyonnaise','Poulet fermier','Risotto aux champignons','Entrecote maturée','Poisson du marche','Ravioles du Dauphine','Assiette de fromages','Tarte aux pralines','Panna cotta','Salade de fruits','Cheesecake maison','Espresso','The vert','Jus de pomme local','Eau petillante','Mocktail verger','Vin rouge Cotes-du-Rhone','Vin blanc Macon','Biere artisanale','Kir maison','Menu enfant','Supplement cafe'])[g],
  (array['Entree','Entree','Plat','Plat','Plat','Plat','Plat','Plat','Plat','Fromage','Dessert','Dessert','Dessert','Dessert','Boisson','Boisson','Boisson','Boisson','Bar','Bar','Bar','Bar','Bar','Menu','Supplement'])[g],
  round((1.2 + (g % 8) * 1.15)::numeric, 2), round((5.5 + (g % 10) * 2.1)::numeric, 2), 8 + ((g * 11) % 34)
from generate_series(1, 25) as series(g)
on conflict (id) do nothing;

insert into public.restaurant_operations (id, restaurant_id, title, type, status, owner, priority, due_in)
select 100 + g, '00000000-0000-0000-0000-000000000001',
  (array['Verifier la chambre froide','Former au tri des dechets','Revoir le plan de salle','Commander les produits locaux','Controler la hotte','Inventaire boissons','Mettre a jour les allergenes','Brief equipe du soir','Nettoyage terrasse','Renouveler contrat linge','Tester caisse tactile','Traiter avis client','Calibrer machine a cafe','Planifier maintenance lave-vaisselle','Reception fournisseur','Controle temperatures','Prepararer menu automne','Audit HACCP','Remplacer ampoules cuisine','Ranger reserve seche','Recruter extra week-end','Negocier emballages','Suivi reservation groupe','Bilan satisfaction client'])[g],
  (array['maintenance','training','service','purchasing','cleaning','inventory','compliance','service'])[1 + ((g - 1) % 8)],
  (array['a faire','planifiee','en cours','terminee'])[1 + ((g - 1) % 4)],
  (array['Cuisine','Manager','Equipe service','Achats'])[1 + ((g - 1) % 4)],
  (array['basse','moyenne','haute'])[1 + ((g - 1) % 3)],
  (g % 6 + 1)::text || 'j'
from generate_series(1, 24) as series(g)
on conflict (id) do nothing;

insert into public.restaurant_finance_periods (id, restaurant_id, period_start, revenue, food_cost, payroll, operating_costs, covers)
select 1000 + g, '00000000-0000-0000-0000-000000000001', date '2024-10-01' + (g - 1) * interval '1 month',
  35200 + g * 615, 7600 + g * 95, 11800 + g * 120, 5100 + g * 48, 1120 + g * 18
from generate_series(1, 24) as series(g)
on conflict (id) do nothing;

insert into public.restaurant_esg_metrics (id, restaurant_id, period_start, food_waste_kg, recycled_pct, local_sourcing_pct, energy_kwh, water_liters, staff_wellbeing_score)
select 1000 + g, '00000000-0000-0000-0000-000000000001', date '2024-10-01' + (g - 1) * interval '1 month',
  172 - g * 2.1, 42 + g * 1.4, 52 + g * 1.1, 12800 - g * 90, 44800 - g * 230, 68 + (g % 12)
from generate_series(1, 24) as series(g)
on conflict (id) do nothing;

insert into public.rm_forecasts (id, forecast_date, room_type, occupancy_rate, rooms_sold, adr, revpar, demand_index)
select 1000 + g, date '2026-09-01' + (g - 1),
  'all', round((61 + (g % 15) + (g % 3) * 0.25)::numeric, 2), 18 + (g % 12), 128 + (g % 9) * 3, round((78 + (g % 18))::numeric, 2), 64 + (g % 26)
from generate_series(1, 30) as series(g)
on conflict (id) do nothing;

insert into public.rm_kpis (id, period_start, occupancy_rate, adr, revpar, room_revenue, cancellations, pickup)
select 1000 + g, date '2024-10-01' + (g - 1) * interval '1 month',
  round((67 + (g % 11) * 1.2)::numeric, 2), 118 + (g % 8) * 4, round((79 + (g % 13) * 2.1)::numeric, 2),
  72000 + g * 1850, 2 + (g % 7), 38 + (g % 22)
from generate_series(1, 24) as series(g)
on conflict (id) do nothing;

-- Public read/write policies match the current anonymous Supabase client used by the simulator.
alter table public.rooms enable row level security;
alter table public.clients enable row level security;
alter table public.reservations enable row level security;
alter table public.rm_forecasts enable row level security;
alter table public.rm_kpis enable row level security;
alter table public.restaurant_finance_periods enable row level security;
alter table public.restaurant_esg_metrics enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['rooms','clients','reservations','rm_forecasts','rm_kpis','restaurant_finance_periods','restaurant_esg_metrics'] loop
    execute format('drop policy if exists "public %s access" on public.%I', table_name, table_name);
    execute format('create policy "public %s access" on public.%I for all using (true) with check (true)', table_name, table_name);
  end loop;
end $$;