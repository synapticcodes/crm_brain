-- =====================================================
-- Migration: clientes_enderecos_perfil
-- Description: Create customer tables (clientes, enderecos, perfil_do_cliente, despesas_do_cliente)
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- =====================================================
-- Table: brain.clientes
-- Purpose: Base única de clientes com contrato assinado
-- =====================================================

CREATE TABLE brain.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  fonte brain.fonte_cadastro DEFAULT 'crm',
  nome_completo text NOT NULL,
  email text,
  telefone_principal text,
  telefone_secundario text,
  cpf char(11) NOT NULL,
  rg text,
  id_credilly text,
  id_turing text,
  status_pagamento brain.payment_status DEFAULT 'aguardando',
  processo_super_endividamento boolean DEFAULT false,
  processo_rmc boolean DEFAULT false,
  contrato_assinado_em timestamptz,
  tenex_cadastrado_em timestamptz,
  vendedor_id uuid REFERENCES brain.equipe(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.clientes IS 'Main customer table - pivot for all sessions';
COMMENT ON COLUMN brain.clientes.cpf IS 'External unique identifier (CPF - 11 digits)';
COMMENT ON COLUMN brain.clientes.status_pagamento IS 'Payment status: aguardando, em_dia, inadimplente, cancelado';

-- Constraints
ALTER TABLE brain.clientes ADD CONSTRAINT unique_cpf_per_tenant UNIQUE (tenancy_id, cpf);

-- Indexes
CREATE INDEX idx_clientes_tenancy_created ON brain.clientes(tenancy_id, created_at DESC);
CREATE INDEX idx_clientes_tenancy_nome ON brain.clientes(tenancy_id, nome_completo);
CREATE INDEX idx_clientes_tenancy_telefone ON brain.clientes(tenancy_id, telefone_principal);
CREATE INDEX idx_clientes_status_pagamento ON brain.clientes(tenancy_id, status_pagamento);
CREATE INDEX idx_clientes_vendedor ON brain.clientes(vendedor_id);

-- RLS
ALTER TABLE brain.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clientes_tenant_isolation ON brain.clientes
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Table: brain.enderecos
-- Purpose: Armazenar endereços dos clientes
-- =====================================================

CREATE TABLE brain.enderecos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado char(2),
  cep char(8),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.enderecos IS 'Customer addresses for billing and legal processes';

-- Indexes
CREATE INDEX idx_enderecos_cliente ON brain.enderecos(cliente_id);

-- RLS
ALTER TABLE brain.enderecos ENABLE ROW LEVEL SECURITY;

CREATE POLICY enderecos_tenant_isolation ON brain.enderecos
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Table: brain.perfil_do_cliente
-- Purpose: Dados pessoais e socioeconômicos
-- =====================================================

CREATE TABLE brain.perfil_do_cliente (
  cliente_id uuid PRIMARY KEY REFERENCES brain.clientes(id) ON DELETE CASCADE,
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  data_nascimento date,
  genero text,
  profissão text,
  estado_civil brain.estado_civil,
  situação brain.situacao_ocupacional,
  vulnerabilidades brain.vulnerabilidade,
  escolaridade brain.escolaridade,
  dependentes boolean,
  dependentes_qtd integer,
  faixa_renda brain.faixa_renda,
  faixa_familiar brain.faixa_renda_familiar,
  cadastro_inadimplencia boolean,
  possui_casa_propria boolean,
  possui_financiamento_veiculo boolean,
  credores_qtd integer,
  comprometimento_mensal numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.perfil_do_cliente IS 'Socioeconomic profile data collected from customer app';

-- Indexes
CREATE INDEX idx_perfil_tenancy ON brain.perfil_do_cliente(tenancy_id);

-- RLS
ALTER TABLE brain.perfil_do_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY perfil_tenant_isolation ON brain.perfil_do_cliente
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Table: brain.despesas_do_cliente
-- Purpose: Detalhar despesas mensais
-- =====================================================

CREATE TABLE brain.despesas_do_cliente (
  cliente_id uuid PRIMARY KEY REFERENCES brain.clientes(id) ON DELETE CASCADE,
  tenancy_id uuid NOT NULL REFERENCES brain.tenants(id) ON DELETE CASCADE,
  agua numeric(12,2),
  luz numeric(12,2),
  telefone numeric(12,2),
  internet numeric(12,2),
  moradia numeric(12,2),
  alimentacao numeric(12,2),
  plano_saude numeric(12,2),
  medicamentos numeric(12,2),
  impostos numeric(12,2),
  transporte numeric(12,2),
  outras numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE brain.despesas_do_cliente IS 'Monthly expense breakdown for debt analysis';

-- Indexes
CREATE INDEX idx_despesas_tenancy ON brain.despesas_do_cliente(tenancy_id);

-- RLS
ALTER TABLE brain.despesas_do_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY despesas_tenant_isolation ON brain.despesas_do_cliente
  FOR ALL
  USING (tenancy_id = brain.current_tenancy_id());

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON brain.clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.enderecos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.perfil_do_cliente TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brain.despesas_do_cliente TO authenticated;

-- =====================================================
-- Trigger: Update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION brain.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON brain.clientes
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

CREATE TRIGGER update_enderecos_updated_at
  BEFORE UPDATE ON brain.enderecos
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

CREATE TRIGGER update_perfil_updated_at
  BEFORE UPDATE ON brain.perfil_do_cliente
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();

CREATE TRIGGER update_despesas_updated_at
  BEFORE UPDATE ON brain.despesas_do_cliente
  FOR EACH ROW
  EXECUTE FUNCTION brain.update_updated_at_column();
