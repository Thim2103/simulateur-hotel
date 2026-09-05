create extension if not exists pgcrypto;

create table if not exists public.restaurants (
  id uuid primary key,
  name text not null default 'Bistro Lyon',
  structure jsonb not null default '{}'::jsonb,
  marketing jsonb not null default '{}'::jsonb,
  esg jsonb not null default '{}'::jsonb,
  expansion jsonb not null default '{}'::jsonb,
  progression jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_finance (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  months text[] not null default '{}', revenue numeric[] not null default '{}', costs numeric[] not null default '{}',
  payroll numeric not null default 0, fixed_costs numeric not null default 0, rent numeric not null default 0, taxes numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_staff (
  id bigint primary key, restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null, role text not null, department text not null, salary numeric not null default 0, skills text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_menu_items (
  id bigint primary key, restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null, category text not null, cost numeric not null default 0 check (cost >= 0), price numeric not null default 0 check (price >= 0), sales numeric not null default 0 check (sales >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_operations (
  id bigint primary key, restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null, type text not null, status text not null, owner text, priority text, due_in text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.reservations add column if not exists client_name text;
alter table public.reservations add column if not exists client text;
alter table public.reservations add column if not exists room text;
alter table public.reservations add column if not exists status text not null default 'en attente';
alter table public.reservations add column if not exists arrival date;
alter table public.reservations add column if not exists departure date;
update public.reservations set client_name = coalesce(client_name, client) where client_name is null;
update public.reservations set client = coalesce(client, client_name) where client is null;
create index if not exists reservations_arrival_idx on public.reservations(arrival);

insert into public.restaurants (id, name, structure, marketing, esg, expansion, progression) values (
  '00000000-0000-0000-0000-000000000001', 'Bistro Lyon',
  '{"concept":"Bistro moderne & cuisine locale","location":"Lyon, France","capacity":92,"seats":92,"materials":["Bois clair","Acier corten","Carrelage anthracite","Verre trempe"],"equipment":["Four professionnel","Plancha","Frigo a marche","Machine a cafe","Systeme de caisse","Equipements de cuisine"]}',
  '{"budget":1800,"positioning":"Cuisine locale, service chaleureux","channels":[{"id":1,"name":"Reseaux sociaux","enabled":true,"budget":700,"reach":72},{"id":2,"name":"Partenariats locaux","enabled":true,"budget":500,"reach":58},{"id":3,"name":"Email fidelite","enabled":true,"budget":300,"reach":64}],"campaigns":[{"id":1,"name":"Menu de saison","objective":"Acquisition","status":"active","budget":900,"conversion":6}]}',
  '{"wasteReduction":35,"localSourcing":60,"energyEfficiency":40,"staffWellbeing":70,"certifications":[],"monthlyInvestment":900}',
  '{"establishments":[{"id":1,"name":"Bistro Lyon","city":"Lyon","capacity":92,"status":"active","manager":"Emma Lenoir"}],"pipeline":[],"availableCapital":120000}',
  '{"xp":0,"completedTutorials":[],"unlockedAchievements":[],"difficulty":"easy","cycles":0}'
) on conflict (id) do nothing;

insert into public.restaurant_finance (restaurant_id, months, revenue, costs, payroll, fixed_costs, rent, taxes) values
('00000000-0000-0000-0000-000000000001', '{Jan,Fev,Mars,Avr,Mai,Juin}', '{28000,31500,33250,35400,38900,41800}', '{17800,19150,19850,20500,22350,23950}', 9800, 6200, 4600, 20)
on conflict (restaurant_id) do nothing;

insert into public.restaurant_staff (id, restaurant_id, name, role, department, salary, skills) values
(1,'00000000-0000-0000-0000-000000000001','Emma Lenoir','Directrice','Management',4200,'{Leadership,"Service premium",Gestion}'),
(2,'00000000-0000-0000-0000-000000000001','Lucas Martin','Chef de cuisine','Cuisine',3600,'{Cuisine,Plategie,Qualite}'),
(3,'00000000-0000-0000-0000-000000000001','Sofia Petit','Sous-chef','Cuisine',2900,'{Preparation,Equipe,"Cuisine rapide"}'),
(4,'00000000-0000-0000-0000-000000000001','Noah Bernard','Serveur','Service',2300,'{Service,Accueil,"Suggestion menu"}'),
(5,'00000000-0000-0000-0000-000000000001','Claire Dubois','Serveuse','Service',2250,'{"Relation client","Wine pairing",Service}'),
(6,'00000000-0000-0000-0000-000000000001','Ibrahim Saleh','Bar manager','Bar',2700,'{Bar,Cocktails,"Gestion stock"}') on conflict (id) do nothing;

insert into public.restaurant_menu_items (id, restaurant_id, name, category, cost, price, sales) values
(1,'00000000-0000-0000-0000-000000000001','Burger Signature','Plat',11.5,19.5,26),(2,'00000000-0000-0000-0000-000000000001','Salade du Chef','Entree',6.2,12.5,18),(3,'00000000-0000-0000-0000-000000000001','Pasta Carbonara','Plat',9.8,17.5,22),(4,'00000000-0000-0000-0000-000000000001','Tartare de Boeuf','Plat',14.2,24,15),(5,'00000000-0000-0000-0000-000000000001','Moelleux au chocolat','Dessert',4.8,9,21),(6,'00000000-0000-0000-0000-000000000001','Limonade maison','Boisson',1.8,5.5,31),(7,'00000000-0000-0000-0000-000000000001','Cafe special','Boisson',1.4,4.8,28),(8,'00000000-0000-0000-0000-000000000001','Cocktail saison','Bar',5.7,12.5,19) on conflict (id) do nothing;

insert into public.restaurant_operations (id, restaurant_id, title, type, status, owner, priority, due_in) values
(1,'00000000-0000-0000-0000-000000000001','Nettoyage du service','cleaning','a faire','Equipe service','moyenne','2h'),
(2,'00000000-0000-0000-0000-000000000001','Maintenance du four','maintenance','planifiee','Cuisine','haute','1j'),
(3,'00000000-0000-0000-0000-000000000001','Reclamation client - bruit','complaint','ouverte','Manager','haute','30 min') on conflict (id) do nothing;

alter table public.restaurants enable row level security;
alter table public.restaurant_finance enable row level security;
alter table public.restaurant_staff enable row level security;
alter table public.restaurant_menu_items enable row level security;
alter table public.restaurant_operations enable row level security;
drop policy if exists "public restaurant read" on public.restaurants;
drop policy if exists "public restaurant write" on public.restaurants;
drop policy if exists "public finance access" on public.restaurant_finance;
drop policy if exists "public staff access" on public.restaurant_staff;
drop policy if exists "public menu access" on public.restaurant_menu_items;
drop policy if exists "public operations access" on public.restaurant_operations;
create policy "public restaurant read" on public.restaurants for select using (true);
create policy "public restaurant write" on public.restaurants for all using (true) with check (true);
create policy "public finance access" on public.restaurant_finance for all using (true) with check (true);
create policy "public staff access" on public.restaurant_staff for all using (true) with check (true);
create policy "public menu access" on public.restaurant_menu_items for all using (true) with check (true);
create policy "public operations access" on public.restaurant_operations for all using (true) with check (true);