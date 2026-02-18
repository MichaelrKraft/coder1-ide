-- Add type column to checkpoints table (manual | auto)
-- This migration is idempotent: if schema.sql was already applied with the type
-- column included, the migration runner will catch the "duplicate column name"
-- error and mark this migration as applied without crashing.
ALTER TABLE checkpoints ADD COLUMN type TEXT DEFAULT 'manual';
