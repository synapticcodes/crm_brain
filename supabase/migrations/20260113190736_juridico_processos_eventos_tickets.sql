-- =====================================================
-- Migration: juridico_processos_eventos_tickets
-- Description: Create legal/juridico tables (processos, eventos, tickets, mensagens)
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- =====================================================
-- Table: brain.juridico_processos
-- Purpose: Registrar processos do cliente
-- =====================================================

CREATE TABLE brain.juridico_processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  tipo brain.legal_case_type NOT NULL,
  numero_cnj text,
  etapa brain.processo_etapa NOT NULL DEFAULT 'aberto',
  criado_por uuid REFERENCES brain.equipe(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.juridico_processos IS 'Legal cases - processes registered for customers';
COMMENT ON COLUMN brain.juridico_processos.tipo IS 'Case type: super_endividamento, rmc, cobranca';
COMMENT ON COLUMN brain.juridico_processos.numero_cnj IS 'CNJ process number';
COMMENT ON COLUMN brain.juridico_processos.etapa IS 'Stage: aberto, agendado, concluido, adiado, cancelado';

-- Indexes
CREATE INDEX idx_juridico_processos_cliente ON brain.juridico_processos(cliente_id);
CREATE INDEX idx_juridico_processos_tenancy_etapa ON brain.juridico_processos(tenancy_id, etapa);

-- RLS
ALTER TABLE brain.juridico_processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY juridico_processos_tenant_isolation ON brain.juridico_processos
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- Trigger
CREATE TRIGGER update_juridico_processos_updated_at
  BEFORE UPDATE ON brain.juridico_processos
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

-- =====================================================
-- Table: brain.juridico_eventos
-- Purpose: Linha do tempo jurídica
-- =====================================================

CREATE TABLE brain.juridico_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  processo_id uuid NOT NULL REFERENCES brain.juridico_processos(id) ON DELETE CASCADE,
  tipo brain.juridico_evento_tipo NOT NULL,
  status brain.evento_status NOT NULL DEFAULT 'aberto',
  quando timestamptz,
  criado_por uuid REFERENCES brain.equipe(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.juridico_eventos IS 'Legal timeline - provas, audiencias, decisoes, pendencias';
COMMENT ON COLUMN brain.juridico_eventos.tipo IS 'Event type: distribuicao, prova, pergunta, resposta, audiencia, etc.';
COMMENT ON COLUMN brain.juridico_eventos.quando IS 'When the event is scheduled or occurred';

-- Indexes
CREATE INDEX idx_juridico_eventos_processo ON brain.juridico_eventos(processo_id, created_at DESC);
CREATE INDEX idx_juridico_eventos_tenancy_quando ON brain.juridico_eventos(tenancy_id, quando);

-- RLS
ALTER TABLE brain.juridico_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY juridico_eventos_tenant_isolation ON brain.juridico_eventos
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Table: brain.juridico_tickets
-- Purpose: Sistema de tickets para comunicação legal (Session 03)
-- =====================================================

CREATE TABLE brain.juridico_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pendente', 'respondido')),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.juridico_tickets IS 'Legal tickets - ticket-like messaging for legal communication (Session 03)';
COMMENT ON COLUMN brain.juridico_tickets.status IS 'Ticket status: pendente (needs response), respondido (answered)';

-- Indexes
CREATE INDEX idx_juridico_tickets_tenant_status ON brain.juridico_tickets(tenancy_id, status, last_message_at DESC);
CREATE INDEX idx_juridico_tickets_cliente ON brain.juridico_tickets(cliente_id);

-- RLS
ALTER TABLE brain.juridico_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY juridico_tickets_tenant_isolation ON brain.juridico_tickets
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- Trigger
CREATE TRIGGER update_juridico_tickets_updated_at
  BEFORE UPDATE ON brain.juridico_tickets
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

-- =====================================================
-- Table: brain.juridico_ticket_mensagens
-- Purpose: Mensagens dos tickets jurídicos
-- =====================================================

CREATE TABLE brain.juridico_ticket_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES brain.juridico_tickets(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('equipe', 'juridico')),
  body text NOT NULL,
  created_by uuid REFERENCES brain.equipe(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.juridico_ticket_mensagens IS 'Legal ticket messages';
COMMENT ON COLUMN brain.juridico_ticket_mensagens.direction IS 'Message direction: equipe (from team) or juridico (from legal dept)';

-- Indexes
CREATE INDEX idx_juridico_ticket_msgs_ticket_time ON brain.juridico_ticket_mensagens(ticket_id, created_at ASC);

-- RLS
ALTER TABLE brain.juridico_ticket_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY juridico_ticket_mensagens_tenant_isolation ON brain.juridico_ticket_mensagens
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON brain.juridico_processos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.juridico_eventos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.juridico_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.juridico_ticket_mensagens TO authenticated;
