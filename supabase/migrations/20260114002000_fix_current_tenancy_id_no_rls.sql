-- =====================================================
-- Migration: fix_current_tenancy_id_no_rls
-- Description: Avoid RLS recursion by using SECURITY DEFINER lookup for fallback tenant
-- Author: Codex
-- Date: 2026-01-14
-- =====================================================

CREATE OR REPLACE FUNCTION brain.first_tenancy_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = brain, public
SET row_security = off
AS $$
  SELECT id FROM brain.tenants ORDER BY created_at ASC LIMIT 1;
$$;

COMMENT ON FUNCTION brain.first_tenancy_id() IS
'Returns the first tenant id with row_security off for local dev fallback.';

CREATE OR REPLACE FUNCTION brain.current_tenancy_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'tenancy_id')::uuid,
    brain.first_tenancy_id(),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

COMMENT ON FUNCTION brain.current_tenancy_id() IS
'Returns the tenancy_id from JWT claims or first tenant via SECURITY DEFINER.';
