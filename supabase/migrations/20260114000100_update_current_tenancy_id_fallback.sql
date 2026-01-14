-- =====================================================
-- Migration: update_current_tenancy_id_fallback
-- Description: Add equipe/first-tenant fallback for local dev when JWT claims are missing
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
    (SELECT tenancy_id FROM brain.equipe WHERE auth_user_id = auth.uid() LIMIT 1),
    (SELECT id FROM brain.tenants ORDER BY created_at ASC LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

COMMENT ON FUNCTION brain.current_tenancy_id() IS
'Returns the tenancy_id from JWT claims, equipe lookup, or first tenant as dev fallback.';
