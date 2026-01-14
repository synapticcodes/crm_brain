-- =====================================================
-- Migration: init_brain_schema
-- Description: Initialize brain schema with enums and helper functions
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- Create brain schema
CREATE SCHEMA IF NOT EXISTS brain;

-- =====================================================
-- SECTION: Type Definitions (ENUMs)
-- =====================================================

-- User role enum
CREATE TYPE brain.user_role AS ENUM (
  'admin',
  'vendas',
  'juridico',
  'cobranca',
  'suporte'
);

-- Payment status enum
CREATE TYPE brain.payment_status AS ENUM (
  'aguardando',
  'em_dia',
  'inadimplente',
  'cancelado'
);

-- Payment method enum
CREATE TYPE brain.payment_method AS ENUM (
  'pix',
  'boleto',
  'cartao',
  'debito_automatico',
  'transferencia'
);

-- Payment transaction status enum
CREATE TYPE brain.payment_tx_status AS ENUM (
  'pendente',
  'autorizado',
  'confirmado',
  'falhado',
  'estornado'
);

-- Legal case type enum
CREATE TYPE brain.legal_case_type AS ENUM (
  'super_endividamento',
  'rmc',
  'cobranca'
);

-- Chat direction enum
CREATE TYPE brain.chat_direction AS ENUM (
  'cliente',
  'equipe'
);

-- Call status enum
CREATE TYPE brain.call_status AS ENUM (
  'iniciado',
  'tocando',
  'em_andamento',
  'completada',
  'falhou',
  'cancelado'
);

-- Call result enum
CREATE TYPE brain.call_result AS ENUM (
  'sem_resposta',
  'ocupado',
  'numero_invalido',
  'atendeu_cliente',
  'atendeu_terceiro',
  'recusou',
  'prometeu_pagar',
  'solicitou_boleto',
  'solicitou_pausa',
  'outro'
);

-- Fonte de cadastro enum
CREATE TYPE brain.fonte_cadastro AS ENUM (
  'crm',
  'importacao',
  'site',
  'manual'
);

-- Contract finalidade enum
CREATE TYPE brain.contract_finalidade AS ENUM (
  'super_endividamento',
  'rmc',
  'cobranca',
  'consultoria',
  'outro'
);

-- Document type enum
CREATE TYPE brain.doc_tipo AS ENUM (
  'rg_frente',
  'rg_verso',
  'cnh',
  'comprovante',
  'contracheque',
  'extrato',
  'registrato',
  'assinatura',
  'audio',
  'contrato'
);

-- Document status enum
CREATE TYPE brain.doc_status AS ENUM (
  'pendente',
  'enviado',
  'aprovado',
  'rejeitado'
);

-- Processo etapa enum
CREATE TYPE brain.processo_etapa AS ENUM (
  'aberto',
  'agendado',
  'concluido',
  'adiado',
  'cancelado'
);

-- Juridico evento tipo enum
CREATE TYPE brain.juridico_evento_tipo AS ENUM (
  'distribuicao',
  'prova',
  'pergunta',
  'resposta',
  'audiencia',
  'adiamento',
  'cancelamento',
  'decisao',
  'documento_pendente',
  'sentença',
  'transito_julgado',
  'outro'
);

-- Evento status enum
CREATE TYPE brain.evento_status AS ENUM (
  'aberto',
  'agendado',
  'confirmado',
  'adiado',
  'cancelado',
  'concluido'
);

-- Estado civil enum
CREATE TYPE brain.estado_civil AS ENUM (
  'solteiro',
  'casado',
  'divorciado',
  'separado',
  'viuvo',
  'uniao_estavel',
  'outro'
);

-- Situacao ocupacional enum
CREATE TYPE brain.situacao_ocupacional AS ENUM (
  'empregado',
  'autonomo',
  'servidor_publico',
  'aposentado',
  'afastado',
  'desempregado',
  'estudante',
  'outro'
);

-- Vulnerabilidade enum
CREATE TYPE brain.vulnerabilidade AS ENUM (
  'idoso',
  'pcd',
  'gestante',
  'desempregado_longo_prazo',
  'mae_solo',
  'baixa_renda',
  'doenca_grave',
  'outro'
);

-- Escolaridade enum
CREATE TYPE brain.escolaridade AS ENUM (
  'fundamental_incompleto',
  'fundamental_completo',
  'medio_incompleto',
  'medio_completo',
  'superior_incompleto',
  'superior_completo',
  'pos_graduacao',
  'mestrado',
  'doutorado'
);

-- Faixa renda enum
CREATE TYPE brain.faixa_renda AS ENUM (
  'ate_1sm',
  'de_1a2sm',
  'de_2a3sm',
  'de_3a5sm',
  'de_5a10sm',
  'acima_10sm'
);

-- Faixa renda familiar enum (same values as faixa_renda)
CREATE TYPE brain.faixa_renda_familiar AS ENUM (
  'ate_1sm',
  'de_1a2sm',
  'de_2a3sm',
  'de_3a5sm',
  'de_5a10sm',
  'acima_10sm'
);

-- Cliente kanban lane enum
CREATE TYPE brain.cliente_kanban_lane AS ENUM (
  'documentacao_pendente',
  'documentacao_enviada',
  'em_dia',
  'provas',
  'inadimplentes'
);

-- Contexto negocio enum
CREATE TYPE brain.contexto_negocio AS ENUM (
  'Vendas',
  'cobrança',
  'suporte',
  'outro'
);

-- =====================================================
-- SECTION: Helper Functions for RLS
-- =====================================================

-- Function: Get current tenant ID from JWT claims
CREATE OR REPLACE FUNCTION brain.current_tenancy_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'tenancy_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

COMMENT ON FUNCTION brain.current_tenancy_id() IS
'Returns the tenancy_id from JWT claims. Used in RLS policies for multi-tenant isolation.';

-- Function: Get current user role from JWT claims
CREATE OR REPLACE FUNCTION brain.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role',
    'anonymous'
  );
$$;

COMMENT ON FUNCTION brain.current_user_role() IS
'Returns the role from JWT claims (admin, vendas, juridico, cobranca, suporte).';

-- Note: brain.is_admin() will be created after brain.equipe table exists (next migration)

-- Function: Get current auth user ID
CREATE OR REPLACE FUNCTION brain.current_auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION brain.current_auth_uid() IS
'Wrapper for auth.uid() for consistency in RLS policies.';

-- =====================================================
-- SECTION: Comments
-- =====================================================

COMMENT ON SCHEMA brain IS 'Main schema for BRAIN CRM - multi-tenant customer management system';
