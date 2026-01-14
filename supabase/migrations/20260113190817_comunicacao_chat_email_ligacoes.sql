-- =====================================================
-- Migration: comunicacao_chat_email_ligacoes
-- Description: Create communication tables (chat, email, telephony)
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- =====================================================
-- Table: brain.chat_threads
-- Purpose: Abrir e fechar protocolos de chat
-- =====================================================

CREATE TABLE brain.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  protocolo text NOT NULL,
  canal text DEFAULT 'app',
  status text DEFAULT 'aberto',
  iniciado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.chat_threads IS 'Chat conversations/threads - infinite history with protocol numbers';
COMMENT ON COLUMN brain.chat_threads.protocolo IS 'Visible protocol number for support (unique per tenant)';
COMMENT ON COLUMN brain.chat_threads.canal IS 'Communication channel: app, web, whatsapp, etc.';
COMMENT ON COLUMN brain.chat_threads.status IS 'Thread status: aberto, fechado';

-- Constraints
ALTER TABLE brain.chat_threads ADD CONSTRAINT unique_protocolo_per_tenant UNIQUE (tenancy_id, protocolo);

-- Indexes
CREATE INDEX idx_chat_threads_cliente_updated ON brain.chat_threads(cliente_id, updated_at DESC);
CREATE INDEX idx_chat_threads_tenancy_status ON brain.chat_threads(tenancy_id, status);

-- RLS
ALTER TABLE brain.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_threads_tenant_isolation ON brain.chat_threads
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- Trigger
CREATE TRIGGER update_chat_threads_updated_at
  BEFORE UPDATE ON brain.chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

-- =====================================================
-- Table: brain.chat_mensagens
-- Purpose: Mensagens do chat com áudio, imagens, recibos
-- =====================================================

CREATE TABLE brain.chat_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES brain.chat_threads(id) ON DELETE CASCADE,
  direction brain.chat_direction NOT NULL,
  from_name text,
  to_name text,
  body text,
  audio_path text,
  media_path text,
  delivered_at timestamptz,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.chat_mensagens IS 'Chat messages - text, voice, images with delivery receipts';
COMMENT ON COLUMN brain.chat_mensagens.direction IS 'Message direction: cliente or equipe';
COMMENT ON COLUMN brain.chat_mensagens.audio_path IS 'Audio file path in Storage';
COMMENT ON COLUMN brain.chat_mensagens.media_path IS 'Media file path in Storage';

-- Indexes
CREATE INDEX idx_chat_mensagens_thread_time ON brain.chat_mensagens(thread_id, created_at ASC);
CREATE INDEX idx_chat_mensagens_tenancy ON brain.chat_mensagens(tenancy_id, created_at DESC);

-- RLS
ALTER TABLE brain.chat_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_mensagens_tenant_isolation ON brain.chat_mensagens
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Table: brain.emails_templates
-- Purpose: Modelos de email prontos
-- =====================================================

CREATE TABLE brain.emails_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text,
  body_html text,
  body_text text,
  created_by uuid REFERENCES brain.equipe(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.emails_templates IS 'Email templates - reusable email templates for communication';

-- Indexes
CREATE INDEX idx_emails_templates_tenancy ON brain.emails_templates(tenancy_id);

-- RLS
ALTER TABLE brain.emails_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY emails_templates_tenant_isolation ON brain.emails_templates
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Table: brain.emails_mensagens
-- Purpose: Caixa de enviados e recebidos
-- =====================================================

CREATE TABLE brain.emails_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES brain.clientes(id) ON DELETE CASCADE,
  thread_key text,
  direction brain.chat_direction NOT NULL,
  from_address text,
  to_address text,
  bcc_addresses text,
  subject text,
  body_html text,
  body_text text,
  status text DEFAULT 'pendente',
  error_msg text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.emails_mensagens IS 'Email inbox/outbox - sent and received emails with status';
COMMENT ON COLUMN brain.emails_mensagens.status IS 'Email status: pendente, enviado, erro, recebido';

-- Indexes
CREATE INDEX idx_emails_mensagens_cliente ON brain.emails_mensagens(cliente_id, created_at DESC);
CREATE INDEX idx_emails_mensagens_tenancy ON brain.emails_mensagens(tenancy_id, created_at DESC);

-- RLS
ALTER TABLE brain.emails_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY emails_mensagens_tenant_isolation ON brain.emails_mensagens
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Table: brain.ligacoes
-- Purpose: Registrar chamadas telefônicas
-- =====================================================

CREATE TABLE brain.ligacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES brain.clientes(id) ON DELETE CASCADE,
  processo_id uuid REFERENCES brain.juridico_processos(id),
  contexto_negocio brain.contexto_negocio,
  resultado_negocio text,
  contrato_id uuid REFERENCES brain.contratos(id),
  agente_user_id uuid REFERENCES brain.equipe(id),
  direction brain.chat_direction NOT NULL,
  provider text,
  provider_call_id text,
  thread_key text,
  numero_origem_e164 text,
  numero_destino_e164 text,
  status brain.call_status DEFAULT 'iniciado',
  resultado brain.call_result,
  duracao_segundos integer,
  gravacao_arquivo_id uuid REFERENCES brain.arquivos(id),
  observacoes text,
  iniciado_em timestamptz,
  encerrado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.ligacoes IS 'Telephony call records - inbound and outbound calls with recordings';
COMMENT ON COLUMN brain.ligacoes.contexto_negocio IS 'Business context: Vendas, cobrança, suporte, outro';
COMMENT ON COLUMN brain.ligacoes.provider_call_id IS 'Unique ID from telephony provider';
COMMENT ON COLUMN brain.ligacoes.numero_origem_e164 IS 'Origin phone number in E.164 format';
COMMENT ON COLUMN brain.ligacoes.numero_destino_e164 IS 'Destination phone number in E.164 format';

-- Constraints
CREATE UNIQUE INDEX unique_ligacao_provider ON brain.ligacoes(tenancy_id, provider, provider_call_id)
  WHERE provider IS NOT NULL AND provider_call_id IS NOT NULL;

-- Indexes
CREATE INDEX idx_ligacoes_cliente ON brain.ligacoes(cliente_id, iniciado_em DESC);
CREATE INDEX idx_ligacoes_tenancy_iniciado ON brain.ligacoes(tenancy_id, iniciado_em DESC);
CREATE INDEX idx_ligacoes_provider ON brain.ligacoes(tenancy_id, provider, provider_call_id);

-- RLS
ALTER TABLE brain.ligacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY ligacoes_tenant_isolation ON brain.ligacoes
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON brain.chat_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.chat_mensagens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.emails_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.emails_mensagens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.ligacoes TO authenticated;
