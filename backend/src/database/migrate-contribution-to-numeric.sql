-- Migrate guild_members.contribution from BIGINT to NUMERIC
-- This allows PostgreSQL to return strings instead of BigInt, preventing serialization errors

ALTER TABLE guild_members 
ALTER COLUMN contribution TYPE NUMERIC USING contribution::text::numeric;



