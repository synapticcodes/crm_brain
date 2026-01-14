-- =====================================================
-- Grant Permissions on Brain Schema for service_role
-- Description: Allow BFF service role access
-- Date: 2026-01-13
-- =====================================================

CREATE SCHEMA IF NOT EXISTS brain;

GRANT USAGE ON SCHEMA brain TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA brain TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA brain TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA brain
GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA brain
GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
