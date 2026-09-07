-- Remove invalid rows created before restaurant defaults were enforced.
delete from public.restaurants
where name is null;
