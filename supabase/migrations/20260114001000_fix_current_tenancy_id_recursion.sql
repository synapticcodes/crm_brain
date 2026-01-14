-- =====================================================
-- Migration: fix_current_tenancy_id_recursion
-- Description: Avoid recursion by removing brain.equipe lookup inside current_tenancy_id()
-- Author: Codex
-- Date: 2026-01-14
-- =====================================================

CREATE OR REPLACE FUNCTION brain.current_tenancy_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'tenancy_id')::uuid,
    (SELECT id FROM brain.tenants ORDER BY created_at ASC LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

COMMENT ON FUNCTION brain.current_tenancy_id() IS
'Returns the tenancy_id from JWT claims or first tenant as dev fallback (no equipe lookup).';
