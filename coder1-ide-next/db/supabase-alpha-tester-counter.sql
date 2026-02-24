-- Alpha Tester Counter Table for Supabase
-- Run this once in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xeomjefoxeqfjidzwhpv/sql/new

-- Table for atomic counter
CREATE TABLE IF NOT EXISTS alpha_tester_counter (
  id TEXT PRIMARY KEY DEFAULT 'global',
  n INTEGER NOT NULL DEFAULT 0
);

-- Insert initial row (idempotent)
INSERT INTO alpha_tester_counter (id, n) VALUES ('global', 0)
ON CONFLICT (id) DO NOTHING;

-- RPC function for atomic increment and return
-- Usage: SELECT * FROM increment_alpha_tester_counter();
CREATE OR REPLACE FUNCTION increment_alpha_tester_counter()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_value INTEGER;
BEGIN
  UPDATE alpha_tester_counter
  SET n = n + 1
  WHERE id = 'global'
  RETURNING n INTO new_value;

  RETURN new_value;
END;
$$;
