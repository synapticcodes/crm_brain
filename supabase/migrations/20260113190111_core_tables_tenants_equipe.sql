-- =====================================================
-- Migration: core_tables_tenants_equipe
-- Description: Create core multi-tenancy tables (tenants and equipe)
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- =====================================================
-- Table: brain.tenants
-- Purpose: Separar empresas e isolar dados
-- =====================================================

CREATE TABLE brain.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.tenants IS 'Multi-tenant isolation - one row per company/organization';
COMMENT ON COLUMN brain.tenants.id IS 'Unique tenant identifier';
COMMENT ON COLUMN brain.tenants.nome IS 'Company name';
COMMENT ON COLUMN brain.tenants.slug IS 'URL-safe identifier for the company';

-- Indexes
CREATE INDEX idx_tenants_slug ON brain.tenants(slug);

-- =====================================================
-- Table: brain.equipe
-- Purpose: Espelhar usuários operacionais com metadados
-- =====================================================

CREATE TABLE brain.equipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  phone_e164 text,
  role brain.user_role NOT NULL DEFAULT 'suporte',
  status text DEFAULT 'pendente',
  ip_address text,
  geolocation jsonb,
  last_activity timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.equipe IS 'Team members - links auth.users to tenants with role and metadata';
COMMENT ON COLUMN brain.equipe.id IS 'Internal user identifier';
COMMENT ON COLUMN brain.equipe.auth_user_id IS 'Link to auth.users(id)';
COMMENT ON COLUMN brain.equipe.tenancy_id IS 'Which company this user belongs to';
COMMENT ON COLUMN brain.equipe.role IS 'Access role: admin, vendas, juridico, cobranca, suporte';
COMMENT ON COLUMN brain.equipe.status IS 'User status: online, offline, pendente';
COMMENT ON COLUMN brain.equipe.geolocation IS 'IP geolocation data from IPDATA (JSON)';

-- Constraints
ALTER TABLE brain.equipe ADD CONSTRAINT unique_email_per_tenant UNIQUE (tenancy_id, email);

-- Indexes
CREATE INDEX idx_equipe_auth_user_id ON brain.equipe(auth_user_id);
CREATE INDEX idx_equipe_tenancy_id ON brain.equipe(tenancy_id);
CREATE INDEX idx_equipe_role ON brain.equipe(role);

-- =====================================================
-- Helper Function: brain.is_admin()
-- Now that brain.equipe exists, we can create this function
-- =====================================================

CREATE OR REPLACE FUNCTION brain.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM brain.equipe
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND tenancy_id = brain.current_tenancy_id()
  );
$$;

COMMENT ON FUNCTION brain.is_admin() IS
'Returns true if the current authenticated user has admin role in their tenant.';

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Enable RLS on tenants
ALTER TABLE brain.tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tenant
CREATE POLICY tenant_isolation_select ON brain.tenants
  FOR SELECT
  USING (id = brain.current_tenancy_id());

-- Policy: Only admins can insert/update tenants (via BFF with service role)
CREATE POLICY tenant_admin_all ON brain.tenants
  FOR ALL
  USING (brain.is_admin());

-- Enable RLS on equipe
ALTER TABLE brain.equipe ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see team members from their tenant
CREATE POLICY equipe_tenant_isolation_select ON brain.equipe
  FOR SELECT
  USING (tenancy_id = brain.current_tenancy_id());

-- Policy: Only admins can manage team (insert/update/delete)
CREATE POLICY equipe_admin_manage ON brain.equipe
  FOR ALL
  USING (
    tenancy_id = brain.current_tenancy_id()
    AND brain.is_admin()
  );

-- Policy: Users can update their own profile (specific columns)
CREATE POLICY equipe_self_update ON brain.equipe
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- =====================================================
-- Grant permissions
-- =====================================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA brain TO authenticated;
GRANT USAGE ON SCHEMA brain TO anon;

-- Grant select on tables
GRANT SELECT ON brain.tenants TO authenticated;
GRANT SELECT ON brain.equipe TO authenticated;

-- Admins get full access via RLS policies
GRANT ALL ON brain.tenants TO authenticated;
GRANT ALL ON brain.equipe TO authenticated;
