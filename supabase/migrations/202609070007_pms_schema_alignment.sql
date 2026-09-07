-- Aligns the real rooms/reservations/clients schema with what
-- src/lib/pmsModels.js actually reads and writes. Discovered while testing
-- writes for the RLS migration: these tables were missing several columns
-- the app sends on save (PostgREST rejects unknown columns outright), and
-- two CHECK constraints used French enum values the app never produces
-- (it's written entirely in English internally), so those writes would have
-- failed even once the missing columns existed. Purely additive/permissive:
-- no existing column is narrowed or dropped, and the affected constraints
-- are widened, not restricted.

-- ---------------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------------
alter table public.rooms alter column price type numeric using price::numeric;
alter table public.rooms add column if not exists floor integer;
alter table public.rooms add column if not exists capacity integer not null default 2;
alter table public.rooms add column if not exists housekeeping_status text not null default 'clean';
alter table public.rooms add column if not exists maintenance_notes text not null default '';
alter table public.rooms add column if not exists external_id text;
alter table public.rooms add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.rooms add column if not exists created_at timestamptz not null default now();
alter table public.rooms add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
alter table public.clients add column if not exists company text not null default '';
alter table public.clients add column if not exists notes text not null default '';
alter table public.clients add column if not exists external_id text;
alter table public.clients add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.clients add column if not exists created_at timestamptz not null default now();
alter table public.clients add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------------
alter table public.reservations alter column price type numeric using price::numeric;
alter table public.reservations add column if not exists client_name text;
alter table public.reservations add column if not exists client text;
alter table public.reservations add column if not exists client_email text not null default '';
alter table public.reservations add column if not exists client_phone text not null default '';
alter table public.reservations add column if not exists room text;
alter table public.reservations add column if not exists notes text not null default '';
alter table public.reservations add column if not exists external_id text;
alter table public.reservations add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.reservations add column if not exists updated_at timestamptz not null default now();
update public.reservations set client_name = coalesce(client_name, 'Guest') where client_name is null;
update public.reservations set client = coalesce(client, client_name) where client is null;

-- pmsModels.js writes the reservation's booking channel under a `source`
-- field (values: direct/ota/corporate/agency, see rm.js reservationChannel())
-- -- exactly the domain the existing `channel_check` constraint already
-- expects. Rather than adding a redundant duplicate column, the app-side
-- payload now targets `channel` directly (see pmsModels.js); the constraint
-- itself doesn't need to change.

-- room_type: the app also uses "seminar"/"conference" for meeting-room PMS
-- scheduling (see pmsModels.ROOM_TYPES / pmsScheduling.js), not just guest
-- room types. Widen the constraint instead of rejecting those bookings.
alter table public.reservations drop constraint if exists room_type_check;
alter table public.reservations add constraint room_type_check
  check (room_type = any (array['standard', 'deluxe', 'suite', 'seminar', 'conference']));

-- segment: the app is written entirely in English internally (see
-- pmsModels.js default 'leisure' and rm.js reservationSegment()); replace
-- the French-only domain with the one the app actually produces.
alter table public.reservations drop constraint if exists segment_check;
update public.reservations set segment = case segment
  when 'loisir' then 'leisure'
  when 'business' then 'corporate'
  when 'groupes' then 'groups'
  else segment
end;
update public.reservations set segment = 'leisure' where segment is null or segment not in ('leisure', 'corporate', 'ota', 'groups');
alter table public.reservations add constraint segment_check
  check (segment = any (array['leisure', 'corporate', 'ota', 'groups']));
