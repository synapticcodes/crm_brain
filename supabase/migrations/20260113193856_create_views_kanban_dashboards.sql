-- =====================================================
-- Views for Kanban and Dashboards
-- Description: Materialized views for UI performance
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- =====================================================
-- 1. View: Customers Kanban Board
-- =====================================================
-- Purpose: Provide data for 5-column Kanban board
-- Columns: Documentação Pendente, Enviada, Em Dia, Provas, Inadimplentes

CREATE OR REPLACE VIEW brain.view_clientes_kanban AS
SELECT
  c.id AS cliente_id,
  c.tenancy_id,
  c.nome_completo,
  c.cpf,
  c.email,
  c.telefone_principal,
  c.status_pagamento,
  c.created_at,

  -- Determine Kanban lane based on business rules
  CASE
    -- Inadimplentes: customers with overdue payments
    WHEN EXISTS (
      SELECT 1 FROM brain.parcelas p
      JOIN brain.contratos ct ON ct.id = p.contrato_id
      WHERE ct.cliente_id = c.id
        AND p.tenancy_id = c.tenancy_id
        AND p.pago_em IS NULL
        AND p.vence_em < CURRENT_DATE
    ) THEN 'inadimplentes'

    -- Provas: customers with pending legal cases
    WHEN EXISTS (
      SELECT 1 FROM brain.juridico_processos jp
      WHERE jp.cliente_id = c.id
        AND jp.tenancy_id = c.tenancy_id
        AND jp.etapa IN ('aberto', 'agendado')
    ) THEN 'provas'

    -- Em Dia: customers with all payments up to date
    WHEN c.status_pagamento = 'em_dia' THEN 'em_dia'

    -- Documentação Enviada: customers with submitted but not approved docs
    WHEN EXISTS (
      SELECT 1 FROM brain.documentos_do_cliente doc
      WHERE doc.cliente_id = c.id
        AND doc.tenancy_id = c.tenancy_id
        AND doc.status = 'pendente'
    ) THEN 'documentacao_enviada'

    -- Documentação Pendente: default state for new customers
    ELSE 'documentacao_pendente'
  END AS kanban_lane,

  -- Count of pending documents
  (
    SELECT COUNT(*)
    FROM brain.documentos_do_cliente doc
    WHERE doc.cliente_id = c.id
      AND doc.tenancy_id = c.tenancy_id
      AND doc.status = 'pendente'
  ) AS documentos_pendentes,

  -- Count of overdue installments
  (
    SELECT COUNT(*)
    FROM brain.parcelas p
    JOIN brain.contratos ct ON ct.id = p.contrato_id
    WHERE ct.cliente_id = c.id
      AND p.tenancy_id = c.tenancy_id
      AND p.pago_em IS NULL
      AND p.vence_em < CURRENT_DATE
  ) AS parcelas_atrasadas,

  -- Latest contract value
  (
    SELECT ct.valor
    FROM brain.contratos ct
    WHERE ct.cliente_id = c.id
      AND ct.tenancy_id = c.tenancy_id
    ORDER BY ct.assinado_em DESC NULLS LAST
    LIMIT 1
  ) AS ultimo_contrato_valor,

  -- Salesperson name
  (
    SELECT e.full_name
    FROM brain.equipe e
    WHERE e.id = c.vendedor_id
  ) AS vendedor_nome

FROM brain.clientes c
WHERE c.tenancy_id = brain.current_tenancy_id();

-- Enable RLS on view
ALTER VIEW brain.view_clientes_kanban SET (security_invoker = true);

COMMENT ON VIEW brain.view_clientes_kanban IS 'Kanban board view with customers grouped by status lanes';

-- =====================================================
-- 2. View: Customer Full Details (for modal/card)
-- =====================================================

CREATE OR REPLACE VIEW brain.view_cliente_full AS
SELECT
  c.id AS cliente_id,
  c.tenancy_id,
  c.fonte,
  c.nome_completo,
  c.email,
  c.telefone_principal,
  c.telefone_secundario,
  c.cpf,
  c.rg,
  c.status_pagamento,
  c.vendedor_id,
  c.processo_super_endividamento,
  c.processo_rmc,
  c.contrato_assinado_em,
  c.created_at,
  c.updated_at,

  -- Vendedor info
  (
    SELECT jsonb_build_object(
      'id', e.id,
      'name', e.full_name,
      'email', e.email,
      'role', e.role
    )
    FROM brain.equipe e
    WHERE e.id = c.vendedor_id
  ) AS vendedor,

  -- Endereço
  (
    SELECT jsonb_build_object(
      'cep', endereco.cep,
      'rua', endereco.rua,
      'numero', endereco.numero,
      'complemento', endereco.complemento,
      'bairro', endereco.bairro,
      'cidade', endereco.cidade,
      'estado', endereco.estado
    )
    FROM brain.enderecos endereco
    WHERE endereco.cliente_id = c.id
      AND endereco.tenancy_id = c.tenancy_id
    LIMIT 1
  ) AS endereco,

  -- Perfil socioeconomico
  (
    SELECT jsonb_build_object(
      'data_nascimento', p.data_nascimento,
      'genero', p.genero,
      'profissão', p.profissão,
      'estado_civil', p.estado_civil,
      'situação', p.situação,
      'faixa_renda', p.faixa_renda,
      'dependentes', p.dependentes,
      'cadastro_inadimplencia', p.cadastro_inadimplencia,
      'credores_qtd', p.credores_qtd
    )
    FROM brain.perfil_do_cliente p
    WHERE p.cliente_id = c.id
      AND p.tenancy_id = c.tenancy_id
    LIMIT 1
  ) AS perfil,

  -- Contratos (array)
  (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ct.id,
        'servico', ct.servico,
        'valor', ct.valor,
        'metodo_pagamento', ct.metodo_pagamento,
        'parcelas_qtd', ct.parcelas_qtd,
        'assinado_em', ct.assinado_em,
        'finalidade', ct.finalidade,
        'implantado_em', ct.implantado_em
      ) ORDER BY ct.assinado_em DESC
    ), '[]'::jsonb)
    FROM brain.contratos ct
    WHERE ct.cliente_id = c.id
      AND ct.tenancy_id = c.tenancy_id
  ) AS contratos,

  -- Documentos (array)
  (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', doc.id,
        'tipo', doc.tipo,
        'status', doc.status,
        'verificado_em', doc.verificado_em,
        'verificado_por', doc.verificado_por,
        'motivo_recusa', doc.motivo_recusa,
        'attachment_id', doc.attachment_id
      ) ORDER BY doc.created_at DESC
    ), '[]'::jsonb)
    FROM brain.documentos_do_cliente doc
    WHERE doc.cliente_id = c.id
      AND doc.tenancy_id = c.tenancy_id
  ) AS documentos,

  -- Recent logs (last 10)
  (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'action', l.action,
        'stage', l.stage,
        'actor_email', l.actor_email,
        'details', l.details,
        'created_at', l.created_at
      ) ORDER BY l.created_at DESC
    ), '[]'::jsonb)
    FROM (
      SELECT * FROM brain.logs
      WHERE cliente_id = c.id
        AND tenancy_id = c.tenancy_id
      ORDER BY created_at DESC
      LIMIT 10
    ) l
  ) AS recent_logs,

  -- Payment summary
  (
    SELECT jsonb_build_object(
      'total_contracts', COUNT(DISTINCT ct.id),
      'total_installments', COUNT(p.id),
      'paid_installments', COUNT(p.id) FILTER (WHERE p.pago_em IS NOT NULL),
      'overdue_installments', COUNT(p.id) FILTER (WHERE p.pago_em IS NULL AND p.vence_em < CURRENT_DATE),
      'total_paid', COALESCE(SUM(pg.valor_liquido), 0),
      'total_due', COALESCE(SUM(p.valor) FILTER (WHERE p.pago_em IS NULL), 0)
    )
    FROM brain.contratos ct
    LEFT JOIN brain.parcelas p ON p.contrato_id = ct.id AND p.tenancy_id = ct.tenancy_id
    LEFT JOIN brain.pagamentos pg ON pg.parcela_id = p.id AND pg.tenancy_id = p.tenancy_id
    WHERE ct.cliente_id = c.id
      AND ct.tenancy_id = c.tenancy_id
  ) AS payment_summary

FROM brain.clientes c
WHERE c.tenancy_id = brain.current_tenancy_id();

-- Enable RLS on view
ALTER VIEW brain.view_cliente_full SET (security_invoker = true);

COMMENT ON VIEW brain.view_cliente_full IS 'Complete customer details with all related data for modal/detail view';

-- =====================================================
-- 3. View: Dashboard Summary Stats
-- =====================================================

CREATE OR REPLACE VIEW brain.view_dashboard_stats AS
SELECT
  -- Total customers
  COUNT(DISTINCT c.id) AS total_customers,

  -- Customers by payment status
  COUNT(DISTINCT c.id) FILTER (WHERE c.status_pagamento = 'em_dia') AS customers_em_dia,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status_pagamento = 'aguardando') AS customers_aguardando,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status_pagamento = 'inadimplente') AS customers_inadimplentes,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status_pagamento = 'cancelado') AS customers_cancelados,

  -- Kanban lane distribution
  COUNT(*) FILTER (WHERE vk.kanban_lane = 'documentacao_pendente') AS lane_doc_pendente,
  COUNT(*) FILTER (WHERE vk.kanban_lane = 'documentacao_enviada') AS lane_doc_enviada,
  COUNT(*) FILTER (WHERE vk.kanban_lane = 'em_dia') AS lane_em_dia,
  COUNT(*) FILTER (WHERE vk.kanban_lane = 'provas') AS lane_provas,
  COUNT(*) FILTER (WHERE vk.kanban_lane = 'inadimplentes') AS lane_inadimplentes,

  -- Financial summary
  COUNT(DISTINCT ct.id) AS total_contracts,
  COALESCE(SUM(ct.valor), 0) AS total_contract_value,
  COALESCE(SUM(pg.valor_liquido), 0) AS total_received,
  COALESCE(SUM(p.valor) FILTER (WHERE p.pago_em IS NULL), 0) AS total_pending,
  COALESCE(SUM(p.valor) FILTER (WHERE p.pago_em IS NULL AND p.vence_em < CURRENT_DATE), 0) AS total_overdue,

  -- Activity counts
  COUNT(DISTINCT jp.id) AS active_legal_cases,
  COUNT(DISTINCT ct_tickets.id) AS open_legal_tickets,
  COUNT(DISTINCT chat.id) AS active_chats

FROM brain.clientes c
LEFT JOIN brain.view_clientes_kanban vk ON vk.cliente_id = c.id
LEFT JOIN brain.contratos ct ON ct.cliente_id = c.id AND ct.tenancy_id = c.tenancy_id
LEFT JOIN brain.parcelas p ON p.contrato_id = ct.id AND p.tenancy_id = ct.tenancy_id
LEFT JOIN brain.pagamentos pg ON pg.parcela_id = p.id AND pg.tenancy_id = p.tenancy_id
LEFT JOIN brain.juridico_processos jp ON jp.cliente_id = c.id AND jp.tenancy_id = c.tenancy_id
LEFT JOIN brain.juridico_tickets ct_tickets ON ct_tickets.cliente_id = c.id AND ct_tickets.tenancy_id = c.tenancy_id AND ct_tickets.status != 'resolvido'
LEFT JOIN brain.chat_threads chat ON chat.cliente_id = c.id AND chat.tenancy_id = c.tenancy_id AND chat.status = 'ativo'
WHERE c.tenancy_id = brain.current_tenancy_id();

-- Enable RLS on view
ALTER VIEW brain.view_dashboard_stats SET (security_invoker = true);

COMMENT ON VIEW brain.view_dashboard_stats IS 'Dashboard statistics and KPIs for the tenant';

-- Success message
SELECT 'Views created successfully!' AS message;
