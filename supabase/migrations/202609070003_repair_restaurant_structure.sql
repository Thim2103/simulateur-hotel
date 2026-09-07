-- Restore the required structure shape for restaurants created before defaults were enforced.
update public.restaurants
set structure = '{"floors":1,"sections":["main"],"capacity":40,"layout":"standard"}'::jsonb
where id = '00000000-0000-0000-0000-000000000001'
  and (structure is null or structure->'sections' is null);
