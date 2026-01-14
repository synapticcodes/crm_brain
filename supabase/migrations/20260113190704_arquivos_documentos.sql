-- =====================================================
-- Migration: arquivos_documentos
-- Description: Create file storage index and document tracking tables
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- =====================================================
-- Table: brain.arquivos
-- Purpose: Índice de arquivos no Storage
-- =====================================================

CREATE TABLE brain.arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES brain.clientes(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES brain.equipe(id),
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.arquivos IS 'Storage file index - tracks all files uploaded to Supabase Storage bucket';
COMMENT ON COLUMN brain.arquivos.storage_path IS 'Path in Storage bucket (e.g., {tenancy_id}/customers/{cliente_id}/{arquivo_id}/{filename})';
COMMENT ON COLUMN brain.arquivos.uploaded_by IS 'Team member who uploaded (NULL if uploaded by customer via app)';

-- Indexes
CREATE INDEX idx_arquivos_tenancy ON brain.arquivos(tenancy_id);
CREATE INDEX idx_arquivos_cliente ON brain.arquivos(cliente_id);
CREATE INDEX idx_arquivos_storage_path ON brain.arquivos(storage_path);

-- RLS
ALTER TABLE brain.arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY arquivos_tenant_isolation ON brain.arquivos
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Table: brain.documentos_do_cliente
-- Purpose: Controlar exigências documentais e status
-- =====================================================

CREATE TABLE brain.documentos_do_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  tipo brain.doc_tipo NOT NULL,
  status brain.doc_status NOT NULL DEFAULT 'pendente',
  attachment_id uuid REFERENCES brain.arquivos(id),
  verificado_por uuid REFERENCES brain.equipe(id),
  verificado_em timestamptz,
  motivo_recusa text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.documentos_do_cliente IS 'Document requirements tracking - controls Kanban lane transitions';
COMMENT ON COLUMN brain.documentos_do_cliente.tipo IS 'Document type: rg_frente, rg_verso, cnh, comprovante, contracheque, extrato, etc.';
COMMENT ON COLUMN brain.documentos_do_cliente.status IS 'Document status: pendente, enviado, aprovado, rejeitado';

-- Indexes
CREATE INDEX idx_documentos_cliente ON brain.documentos_do_cliente(cliente_id);
CREATE INDEX idx_documentos_tenancy_status ON brain.documentos_do_cliente(tenancy_id, status);
CREATE INDEX idx_documentos_tipo ON brain.documentos_do_cliente(tipo);

-- RLS
ALTER TABLE brain.documentos_do_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY documentos_tenant_isolation ON brain.documentos_do_cliente
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- Trigger
CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON brain.documentos_do_cliente
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

-- =====================================================
-- Table: brain.cliente_app
-- Purpose: Controle de acesso ao app mobile do cliente
-- =====================================================

CREATE TABLE brain.cliente_app (
  cliente_id uuid PRIMARY KEY REFERENCES brain.clientes(id) ON DELETE CASCADE,
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  app_user_id uuid,
  app_status text DEFAULT 'pendente',
  app_liberado_em timestamptz,
  app_bloqueado_em timestamptz,
  app_ultimo_acesso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.cliente_app IS 'Customer mobile app access control (Session 02: App Access Kanban)';
COMMENT ON COLUMN brain.cliente_app.app_user_id IS 'Link to customer auth user in app';
COMMENT ON COLUMN brain.cliente_app.app_status IS 'App access status: pendente, liberado, bloqueado';

-- Indexes
CREATE INDEX idx_cliente_app_tenancy ON brain.cliente_app(tenancy_id);
CREATE INDEX idx_cliente_app_status ON brain.cliente_app(tenancy_id, app_status);

-- RLS
ALTER TABLE brain.cliente_app ENABLE ROW LEVEL SECURITY;

CREATE POLICY cliente_app_tenant_isolation ON brain.cliente_app
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- Trigger
CREATE TRIGGER update_cliente_app_updated_at
  BEFORE UPDATE ON brain.cliente_app
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

-- =====================================================
-- Now add foreign keys to brain.contratos
-- =====================================================

ALTER TABLE brain.contratos
  ADD CONSTRAINT fk_contratos_contrato_anexo
  FOREIGN KEY (contrato_anexo_id)
  REFERENCES brain.arquivos(id)
  ON DELETE SET NULL;

ALTER TABLE brain.contratos
  ADD CONSTRAINT fk_contratos_audio_anexo
  FOREIGN KEY (audio_anexo_id)
  REFERENCES brain.arquivos(id)
  ON DELETE SET NULL;

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON brain.arquivos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.documentos_do_cliente TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.cliente_app TO authenticated;
