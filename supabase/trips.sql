-- Trips: while a trip is active, card expenses in its currency go to its category.
-- Run in the Supabase SQL editor (same project as payee_overrides).

CREATE TABLE IF NOT EXISTS trips (
  id                      SERIAL PRIMARY KEY,
  name                    VARCHAR(255) NOT NULL,
  currency                CHAR(3) NOT NULL,
  start_date              DATE NOT NULL,
  end_date                DATE NOT NULL,
  category_id             UUID NOT NULL,
  category_name           VARCHAR(255),
  excluded_max_categories TEXT[] NOT NULL DEFAULT '{אופנה}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trips_updated ON trips;
CREATE TRIGGER trg_trips_updated
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
