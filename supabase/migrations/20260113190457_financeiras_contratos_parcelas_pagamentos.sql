-- =====================================================
-- Migration: financeiras_contratos_parcelas_pagamentos
-- Description: Create financial tables (contratos, parcelas, pagamentos)
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- Note: Table brain.arquivos will be created in next migration
-- We'll create contratos without foreign key first, then add it later

-- =====================================================
-- Table: brain.contratos
-- Purpose: Registrar cada serviço/contrato do cliente
-- =====================================================

CREATE TABLE brain.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  servico text NOT NULL,
  valor numeric(12,2) NOT NULL,
  metodo_pagamento brain.payment_method NOT NULL,
  parcelas_qtd integer DEFAULT 1,
  assinado_em timestamptz,
  implantado_em timestamptz,
  contrato_anexo_id uuid,  -- FK to brain.arquivos (added later)
  audio_anexo_id uuid,     -- FK to brain.arquivos (added later)
  finalidade brain.contract_finalidade,
  origem_schema text,
  origem_entidade text,
  origem_id uuid,
  origem_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.contratos IS 'Contracts - each service contracted by customer';
COMMENT ON COLUMN brain.contratos.contrato_anexo_id IS 'Signed contract file (FK to brain.arquivos)';
COMMENT ON COLUMN brain.contratos.audio_anexo_id IS 'Confirmation audio file (FK to brain.arquivos)';
COMMENT ON COLUMN brain.contratos.origem_metadata IS 'Source system metadata (JSON snapshot)';

-- Indexes
CREATE INDEX idx_contratos_cliente ON brain.contratos(cliente_id);
CREATE INDEX idx_contratos_tenancy_created ON brain.contratos(tenancy_id, created_at DESC);
CREATE INDEX idx_contratos_origem ON brain.contratos(tenancy_id, origem_schema, origem_entidade, origem_id);

-- RLS
ALTER TABLE brain.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY contratos_tenant_isolation ON brain.contratos
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- Trigger
CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON brain.contratos
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

-- =====================================================
-- Table: brain.parcelas
-- Purpose: Grade de cobrança e base para status de pagamento
-- =====================================================

CREATE TABLE brain.parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES brain.contratos(id) ON DELETE CASCADE,
  numero integer NOT NULL,
  vence_em date NOT NULL,
  valor numeric(12,2) NOT NULL,
  link_pagamento text,
  pago_em timestamptz,
  cancelada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.parcelas IS 'Payment installments - billing schedule';
COMMENT ON COLUMN brain.parcelas.numero IS 'Installment number (1, 2, 3...)';
COMMENT ON COLUMN brain.parcelas.link_pagamento IS 'Payment link URL';

-- Constraints
ALTER TABLE brain.parcelas ADD CONSTRAINT unique_parcela_numero UNIQUE (contrato_id, numero);

-- Indexes
CREATE INDEX idx_parcelas_contrato_vence ON brain.parcelas(contrato_id, vence_em);
CREATE INDEX idx_parcelas_tenancy_vence ON brain.parcelas(tenancy_id, vence_em);

-- RLS
ALTER TABLE brain.parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY parcelas_tenant_isolation ON brain.parcelas
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- Trigger
CREATE TRIGGER update_parcelas_updated_at
  BEFORE UPDATE ON brain.parcelas
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

-- =====================================================
-- Table: brain.pagamentos
-- Purpose: Histórico de transações por parcela
-- =====================================================

CREATE TABLE brain.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  contrato_id uuid NOT NULL REFERENCES brain.contratos(id) ON DELETE CASCADE,
  parcela_id uuid NOT NULL REFERENCES brain.parcelas(id) ON DELETE CASCADE,
  status_tx brain.payment_tx_status NOT NULL DEFAULT 'pendente',
  valor_bruto numeric(12,2) NOT NULL,
  tarifas numeric(12,2) DEFAULT 0,
  juros_desconto numeric(12,2) DEFAULT 0,
  valor_liquido numeric(12,2),
  metodo brain.payment_method,
  payload_externo jsonb,
  last_webhook_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmado_em timestamptz
);

COMMENT ON TABLE brain.pagamentos IS 'Payment transactions - attempts, confirmations, errors, refunds';
COMMENT ON COLUMN brain.pagamentos.status_tx IS 'Transaction status: pendente, autorizado, confirmado, falhado, estornado';
COMMENT ON COLUMN brain.pagamentos.payload_externo IS 'External payment provider data (JSON)';

-- Indexes
CREATE INDEX idx_pagamentos_parcela_confirmado ON brain.pagamentos(parcela_id, confirmado_em);
CREATE INDEX idx_pagamentos_tenancy_created ON brain.pagamentos(tenancy_id, created_at DESC);
CREATE INDEX idx_pagamentos_status ON brain.pagamentos(status_tx);

-- RLS
ALTER TABLE brain.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY pagamentos_tenant_isolation ON brain.pagamentos
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON brain.contratos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.parcelas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.pagamentos TO authenticated;
