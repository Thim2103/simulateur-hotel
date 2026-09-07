-- Compatibility migration for the requested Luxury Palace simulation seed.
-- Extends the existing aggregate restaurant tables without dropping current data.

alter table public.restaurants add column if not exists concept text not null default '';
alter table public.restaurants add column if not exists location text not null default '';
alter table public.restaurants add column if not exists capacity integer not null default 0 check (capacity >= 0);
alter table public.restaurants add column if not exists opening_hours text not null default '';

alter table public.restaurant_staff add column if not exists skill_level numeric(5,2) not null default 0 check (skill_level between 0 and 100);
alter table public.restaurant_staff add column if not exists productivity numeric(5,2) not null default 0 check (productivity between 0 and 100);
alter table public.restaurant_staff add column if not exists satisfaction numeric(5,2) not null default 0 check (satisfaction between 0 and 100);
alter table public.restaurant_staff add column if not exists experience_years numeric(5,2) not null default 0 check (experience_years >= 0);

alter table public.restaurant_menu_items add column if not exists popularity numeric(5,2) not null default 0 check (popularity between 0 and 100);
alter table public.restaurant_menu_items add column if not exists preparation_time integer not null default 0 check (preparation_time >= 0);

alter table public.restaurant_finance add column if not exists day date not null default current_date;
alter table public.restaurant_finance add column if not exists energy_cost numeric(12,2) not null default 0 check (energy_cost >= 0);
alter table public.restaurant_finance add column if not exists waste numeric(12,2) not null default 0 check (waste >= 0);

alter table public.restaurant_operations add column if not exists day date not null default current_date;
alter table public.restaurant_operations add column if not exists customers_served integer not null default 0 check (customers_served >= 0);
alter table public.restaurant_operations add column if not exists average_wait_time numeric(8,2) not null default 0 check (average_wait_time >= 0);
alter table public.restaurant_operations add column if not exists service_quality numeric(5,2) not null default 0 check (service_quality between 0 and 100);
alter table public.restaurant_operations add column if not exists kitchen_efficiency numeric(5,2) not null default 0 check (kitchen_efficiency between 0 and 100);
alter table public.restaurant_operations add column if not exists incidents integer not null default 0 check (incidents >= 0);
alter table public.restaurant_operations add column if not exists complaints integer not null default 0 check (complaints >= 0);
alter table public.restaurant_operations add column if not exists compliments integer not null default 0 check (compliments >= 0);

update public.restaurants
set name = 'Luxury Palace',
    concept = 'Fusion créative',
    location = 'Bruxelles',
    capacity = 40,
    opening_hours = '12:00-14:30, 18:00-22:00'
where id = '00000000-0000-0000-0000-000000000001';

insert into public.restaurant_staff (
  id, name, role, department, salary, skills, skill_level, productivity, satisfaction, experience_years, restaurant_id
)
values
  (2001, 'Chef Royal', 'Chef', 'Cuisine', 3500, '{Cuisine,Leadership}', 88, 82, 92, 14, '00000000-0000-0000-0000-000000000001'),
  (2002, 'Sophie', 'Serveuse', 'Service', 2200, '{Service,Accueil}', 72, 78, 87, 4, '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  department = excluded.department,
  salary = excluded.salary,
  skills = excluded.skills,
  skill_level = excluded.skill_level,
  productivity = excluded.productivity,
  satisfaction = excluded.satisfaction,
  experience_years = excluded.experience_years,
  restaurant_id = excluded.restaurant_id,
  updated_at = now();

insert into public.restaurant_menu_items (
  id, name, category, cost, price, sales, popularity, preparation_time, restaurant_id
)
values
  (2001, 'Tataki de saumon impérial', 'plat', 7.2, 22, 0, 85, 12, '00000000-0000-0000-0000-000000000001'),
  (2002, 'Mousse au chocolat royale', 'dessert', 1.5, 8, 0, 92, 5, '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  cost = excluded.cost,
  price = excluded.price,
  popularity = excluded.popularity,
  preparation_time = excluded.preparation_time,
  restaurant_id = excluded.restaurant_id,
  updated_at = now();

insert into public.restaurant_finance (
  restaurant_id, day, months, revenue, costs, taxes, payroll, fixed_costs, rent, energy_cost, waste
)
values (
  '00000000-0000-0000-0000-000000000001', current_date,
  array[to_char(current_date, 'Mon')], array[950], array[480], 110, 0, 0, 0, 35, 18
)
on conflict (restaurant_id) do update set
  day = excluded.day,
  months = excluded.months,
  revenue = excluded.revenue,
  costs = excluded.costs,
  taxes = excluded.taxes,
  energy_cost = excluded.energy_cost,
  waste = excluded.waste,
  updated_at = now();

insert into public.restaurant_operations (
  id, day, title, type, status, owner, priority, due_in,
  customers_served, average_wait_time, service_quality, kitchen_efficiency,
  incidents, complaints, compliments, restaurant_id
)
values (
  2001, current_date, 'Service du jour', 'service', 'en cours', 'Chef Royal', 'haute', 'aujourd''hui',
  52, 11, 80, 74, 1, 1, 12, '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do update set
  day = excluded.day,
  title = excluded.title,
  type = excluded.type,
  status = excluded.status,
  owner = excluded.owner,
  priority = excluded.priority,
  due_in = excluded.due_in,
  customers_served = excluded.customers_served,
  average_wait_time = excluded.average_wait_time,
  service_quality = excluded.service_quality,
  kitchen_efficiency = excluded.kitchen_efficiency,
  incidents = excluded.incidents,
  complaints = excluded.complaints,
  compliments = excluded.compliments,
  restaurant_id = excluded.restaurant_id,
  updated_at = now();

create index if not exists restaurant_finance_day_idx on public.restaurant_finance(restaurant_id, day);
create index if not exists restaurant_operations_day_idx on public.restaurant_operations(restaurant_id, day);
