-- Replace the legacy text[] months column with the JSON object contract used by the frontend.
alter table public.restaurant_finance drop column if exists months;
alter table public.restaurant_finance add column months jsonb not null default '{"jan":0,"feb":0,"mar":0,"apr":0,"may":0,"jun":0,"jul":0,"aug":0,"sep":0,"oct":0,"nov":0,"dec":0}'::jsonb;
