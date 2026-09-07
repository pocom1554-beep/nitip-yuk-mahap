ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS map_link text NOT NULL DEFAULT '';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origin_store text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS origin_lat double precision,
  ADD COLUMN IF NOT EXISTS origin_lng double precision,
  ADD COLUMN IF NOT EXISTS route_duration_min integer NOT NULL DEFAULT 0;