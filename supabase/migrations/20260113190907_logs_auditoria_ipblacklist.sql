-- =====================================================
-- Migration: logs_auditoria_ipblacklist
-- Description: Create audit logs and IP blacklist tables
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- =====================================================
-- Table: brain.logs
-- Purpose: Auditoria e timeline unificada
-- =====================================================

CREATE TABLE brain.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES brain.equipe(id),
  actor_email text,
  action text NOT NULL,
  stage text,
  details jsonb,
  cliente_id uuid REFERENCES brain.clientes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.logs IS 'Audit logs - unified timeline of all actions (Session 05: Global Logs)';
COMMENT ON COLUMN brain.logs.actor_user_id IS 'Team member who performed the action';
COMMENT ON COLUMN brain.logs.action IS 'Action performed (e.g., created_customer, approved_document, sent_email)';
COMMENT ON COLUMN brain.logs.stage IS 'Which session/stage: customers, legal, support, etc.';
COMMENT ON COLUMN brain.logs.details IS 'Additional action details (JSON)';
COMMENT ON COLUMN brain.logs.cliente_id IS 'Related customer, if any';

-- Indexes
CREATE INDEX idx_logs_tenancy_created ON brain.logs(tenancy_id, created_at DESC);
CREATE INDEX idx_logs_cliente_created ON brain.logs(cliente_id, created_at DESC);
CREATE INDEX idx_logs_actor ON brain.logs(actor_user_id, created_at DESC);
CREATE INDEX idx_logs_action ON brain.logs(tenancy_id, action);

-- RLS
ALTER TABLE brain.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY logs_tenant_isolation ON brain.logs
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Table: brain.ip_blacklist
-- Purpose: IP blocking for security (Session 06)
-- =====================================================

CREATE TABLE brain.ip_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  ip text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.ip_blacklist IS 'IP address blacklist for security (Session 06: Team Management)';
COMMENT ON COLUMN brain.ip_blacklist.ip IS 'Blocked IP address';
COMMENT ON COLUMN brain.ip_blacklist.reason IS 'Reason for blocking (e.g., user_terminated, suspicious_activity)';

-- Constraints
ALTER TABLE brain.ip_blacklist ADD CONSTRAINT unique_ip_per_tenant UNIQUE (tenancy_id, ip);

-- Indexes
CREATE INDEX idx_ip_blacklist_tenancy_ip ON brain.ip_blacklist(tenancy_id, ip);

-- RLS
ALTER TABLE brain.ip_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY ip_blacklist_tenant_isolation ON brain.ip_blacklist
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- Only admins can manage IP blacklist
CREATE POLICY ip_blacklist_admin_only ON brain.ip_blacklist
  FOR ALL
  USING (brain.is_admin());

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT, INSERT ON brain.logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.ip_blacklist TO authenticated;

-- =====================================================
-- Helper Function: Log action
-- =====================================================

CREATE OR REPLACE FUNCTION brain.log_action(
  p_action text,
  p_stage text DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_cliente_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_actor_id uuid;
  v_actor_email text;
BEGIN
  -- Get current user info
  v_actor_id := (SELECT id FROM brain.equipe WHERE auth_user_id = auth.uid() LIMIT 1);
  v_actor_email := (SELECT email FROM brain.equipe WHERE auth_user_id = auth.uid() LIMIT 1);

  -- Insert log
  INSERT INTO brain.logs (
    tenancy_id,
    actor_user_id,
    actor_email,
    action,
    stage,
    details,
    cliente_id
  ) VALUES (
    brain.current_tenancy_id(),
    v_actor_id,
    v_actor_email,
    p_action,
    p_stage,
    p_details,
    p_cliente_id
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION brain.log_action IS 'Helper function to easily log actions from application code or triggers';
