-- =====================================================
-- Grant Permissions on Brain Schema and Views
-- Description: Grant access to authenticated users
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA brain TO authenticated, anon;

-- Grant SELECT on all views
GRANT SELECT ON brain.view_clientes_kanban TO authenticated, anon;
GRANT SELECT ON brain.view_cliente_full TO authenticated, anon;
GRANT SELECT ON brain.view_dashboard_stats TO authenticated, anon;

-- Grant SELECT on all existing tables in brain schema to authenticated role
-- This allows the views to work properly since they reference these tables
GRANT SELECT ON ALL TABLES IN SCHEMA brain TO authenticated;

-- Success message
SELECT 'Permissions granted successfully!' AS message;
