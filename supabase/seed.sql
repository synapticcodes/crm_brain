-- =====================================================
-- Seed file for BRAIN CRM
-- Description: Seed data for local development
-- Author: Claude Code
-- Date: 2026-01-13
-- =====================================================

-- Disable RLS temporarily for seeding
SET session_replication_role = 'replica';

-- =====================================================
-- 1. Create Tenants
-- =====================================================

INSERT INTO brain.tenants (id, nome, slug, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'MeuNomeOK', 'meunomeok', now()),
  ('00000000-0000-0000-0000-000000000002', 'OutraEmpresa', 'outraempresa', now())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Create Auth User
-- =====================================================

-- Insert user into auth.users (Supabase Auth table)
-- Password: Montag10 (hashed with bcrypt)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'comercial@meunomeok.com',
  '$2b$12$qN42M3wX2Zuw5/Xv.o6XeeCsNCy2maXcsGfqHoPzYbzhv3eKCcm8y', -- Password: Montag10
  now(),
  null,
  '',
  null,
  '',
  null,
  '',
  '',
  null,
  null,
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Comercial"}',
  false,
  now(),
  now(),
  null,
  null,
  '',
  '',
  null,
  '',
  0,
  null,
  '',
  null,
  false,
  null
)
ON CONFLICT (id) DO NOTHING;

-- Additional users for team roles (same password: Montag10)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111112',
    'authenticated',
    'authenticated',
    'vendas@meunomeok.com',
    '$2b$12$qN42M3wX2Zuw5/Xv.o6XeeCsNCy2maXcsGfqHoPzYbzhv3eKCcm8y',
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Vendas"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111113',
    'authenticated',
    'authenticated',
    'juridico@meunomeok.com',
    '$2b$12$qN42M3wX2Zuw5/Xv.o6XeeCsNCy2maXcsGfqHoPzYbzhv3eKCcm8y',
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Juridico"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111114',
    'authenticated',
    'authenticated',
    'suporte@meunomeok.com',
    '$2b$12$qN42M3wX2Zuw5/Xv.o6XeeCsNCy2maXcsGfqHoPzYbzhv3eKCcm8y',
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Suporte"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111115',
    'authenticated',
    'authenticated',
    'cobranca@meunomeok.com',
    '$2b$12$qN42M3wX2Zuw5/Xv.o6XeeCsNCy2maXcsGfqHoPzYbzhv3eKCcm8y',
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Cobranca"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111201',
    'authenticated',
    'authenticated',
    'admin@outraempresa.com',
    '$2b$12$qN42M3wX2Zuw5/Xv.o6XeeCsNCy2maXcsGfqHoPzYbzhv3eKCcm8y',
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin OutraEmpresa"}',
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
  )
ON CONFLICT (id) DO NOTHING;

-- Insert identity
INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"comercial@meunomeok.com"}',
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111112',
    '{"sub":"11111111-1111-1111-1111-111111111112","email":"vendas@meunomeok.com"}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '11111111-1111-1111-1111-111111111113',
    '11111111-1111-1111-1111-111111111113',
    '11111111-1111-1111-1111-111111111113',
    '{"sub":"11111111-1111-1111-1111-111111111113","email":"juridico@meunomeok.com"}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '11111111-1111-1111-1111-111111111114',
    '11111111-1111-1111-1111-111111111114',
    '11111111-1111-1111-1111-111111111114',
    '{"sub":"11111111-1111-1111-1111-111111111114","email":"suporte@meunomeok.com"}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '11111111-1111-1111-1111-111111111115',
    '11111111-1111-1111-1111-111111111115',
    '11111111-1111-1111-1111-111111111115',
    '{"sub":"11111111-1111-1111-1111-111111111115","email":"cobranca@meunomeok.com"}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '11111111-1111-1111-1111-111111111201',
    '11111111-1111-1111-1111-111111111201',
    '11111111-1111-1111-1111-111111111201',
    '{"sub":"11111111-1111-1111-1111-111111111201","email":"admin@outraempresa.com"}',
    'email',
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. Create Team Member (brain.equipe)
-- =====================================================

INSERT INTO brain.equipe (
  id,
  auth_user_id,
  tenancy_id,
  full_name,
  email,
  role,
  status,
  created_at
)
VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Comercial MeuNomeOK',
    'comercial@meunomeok.com',
    'admin',
    'online',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111112',
    '00000000-0000-0000-0000-000000000001',
    'Time Vendas',
    'vendas@meunomeok.com',
    'vendas',
    'online',
    now() - interval '2 days'
  ),
  (
    '22222222-2222-2222-2222-222222222224',
    '11111111-1111-1111-1111-111111111113',
    '00000000-0000-0000-0000-000000000001',
    'Time Juridico',
    'juridico@meunomeok.com',
    'juridico',
    'offline',
    now() - interval '3 days'
  ),
  (
    '22222222-2222-2222-2222-222222222225',
    '11111111-1111-1111-1111-111111111114',
    '00000000-0000-0000-0000-000000000001',
    'Time Suporte',
    'suporte@meunomeok.com',
    'suporte',
    'online',
    now() - interval '1 day'
  ),
  (
    '22222222-2222-2222-2222-222222222226',
    '11111111-1111-1111-1111-111111111115',
    '00000000-0000-0000-0000-000000000001',
    'Time Cobranca',
    'cobranca@meunomeok.com',
    'cobranca',
    'offline',
    now() - interval '5 days'
  ),
  (
    '22222222-2222-2222-2222-222222222227',
    '11111111-1111-1111-1111-111111111201',
    '00000000-0000-0000-0000-000000000002',
    'Admin OutraEmpresa',
    'admin@outraempresa.com',
    'admin',
    'online',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. Create Sample Customer
-- =====================================================

INSERT INTO brain.clientes (
  id,
  tenancy_id,
  fonte,
  nome_completo,
  email,
  telefone_principal,
  cpf,
  status_pagamento,
  vendedor_id,
  created_at
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000001',
  'crm',
  'João da Silva',
  'joao.silva@example.com',
  '11999887766',
  '12345678901',
  'em_dia',
  '22222222-2222-2222-2222-222222222222',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. Create Sample Contract
-- =====================================================

INSERT INTO brain.contratos (
  id,
  tenancy_id,
  cliente_id,
  servico,
  valor,
  metodo_pagamento,
  parcelas_qtd,
  assinado_em,
  finalidade,
  created_at
)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000001',
  '33333333-3333-3333-3333-333333333333',
  'Renegociação de Dívidas',
  1200.00,
  'pix',
  12,
  now(),
  'super_endividamento',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. Create Sample Log Entry
-- =====================================================

INSERT INTO brain.logs (
  id,
  tenancy_id,
  actor_user_id,
  actor_email,
  action,
  stage,
  details,
  cliente_id,
  created_at
)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'comercial@meunomeok.com',
  'customer_created',
  'customers',
  '{"customer_name":"João da Silva","cpf":"12345678901"}',
  '33333333-3333-3333-3333-333333333333',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Re-enable RLS
SET session_replication_role = 'origin';

-- =====================================================
-- 7. Create More Sample Customers (All Kanban Lanes)
-- =====================================================

-- Customer 2: Documentação Pendente
INSERT INTO brain.clientes (
  id, tenancy_id, fonte, nome_completo, email, telefone_principal, cpf, status_pagamento, vendedor_id, created_at
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000001',
  'crm',
  'Maria Santos',
  'maria.santos@example.com',
  '11988776655',
  '98765432100',
  'aguardando',
  '22222222-2222-2222-2222-222222222222',
  now() - interval '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- Customer 3: Documentação Enviada (has pending documents)
INSERT INTO brain.clientes (
  id, tenancy_id, fonte, nome_completo, email, telefone_principal, cpf, status_pagamento, vendedor_id, created_at
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '00000000-0000-0000-0000-000000000001',
  'crm',
  'Carlos Oliveira',
  'carlos.oliveira@example.com',
  '11977665544',
  '11122233344',
  'aguardando',
  '22222222-2222-2222-2222-222222222222',
  now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.documentos_do_cliente (
  id, tenancy_id, cliente_id, tipo, status, created_at
)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '00000000-0000-0000-0000-000000000001',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'rg_frente',
  'pendente',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Customer 4: Provas (has legal case)
INSERT INTO brain.clientes (
  id, tenancy_id, fonte, nome_completo, email, telefone_principal, cpf, status_pagamento, vendedor_id, created_at
)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '00000000-0000-0000-0000-000000000001',
  'crm',
  'Ana Paula Costa',
  'ana.costa@example.com',
  '11966554433',
  '22233344455',
  'aguardando',
  '22222222-2222-2222-2222-222222222222',
  now() - interval '3 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.juridico_processos (
  id, tenancy_id, cliente_id, tipo, etapa, created_at
)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '00000000-0000-0000-0000-000000000001',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'super_endividamento',
  'aberto',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Customer 5: Inadimplente (has overdue installments)
INSERT INTO brain.clientes (
  id, tenancy_id, fonte, nome_completo, email, telefone_principal, cpf, status_pagamento, vendedor_id, created_at
)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '00000000-0000-0000-0000-000000000001',
  'crm',
  'Roberto Lima',
  'roberto.lima@example.com',
  '11955443322',
  '33344455566',
  'inadimplente',
  '22222222-2222-2222-2222-222222222222',
  now() - interval '4 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.contratos (
  id, tenancy_id, cliente_id, servico, valor, metodo_pagamento, parcelas_qtd, assinado_em, finalidade, created_at
)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '00000000-0000-0000-0000-000000000001',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Renegociação de Dívidas',
  2400.00,
  'boleto',
  12,
  now() - interval '60 days',
  'super_endividamento',
  now() - interval '60 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.parcelas (
  id, tenancy_id, contrato_id, numero, vence_em, valor, created_at
)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '00000000-0000-0000-0000-000000000001',
  '77777777-7777-7777-7777-777777777777',
  1,
  now() - interval '30 days',
  200.00,
  now() - interval '60 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7.1 Create Tenant 2 Customers
-- =====================================================

INSERT INTO brain.clientes (
  id,
  tenancy_id,
  fonte,
  nome_completo,
  email,
  telefone_principal,
  cpf,
  status_pagamento,
  vendedor_id,
  created_at
)
VALUES
  (
    '12121212-1212-1212-1212-121212121212',
    '00000000-0000-0000-0000-000000000002',
    'manual',
    'Ana Ribeiro',
    'ana.ribeiro@outraempresa.com',
    '11912345678',
    '99988877766',
    'em_dia',
    '22222222-2222-2222-2222-222222222227',
    now() - interval '10 days'
  ),
  (
    '13131313-1313-1313-1313-131313131313',
    '00000000-0000-0000-0000-000000000002',
    'site',
    'Eduardo Maia',
    'eduardo.maia@outraempresa.com',
    '11923456789',
    '88877766655',
    'aguardando',
    '22222222-2222-2222-2222-222222222227',
    now() - interval '2 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.enderecos (
  id, tenancy_id, cliente_id, rua, numero, bairro, cidade, estado, cep, created_at
)
VALUES
  (
    'e1000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    '12121212-1212-1212-1212-121212121212',
    'Rua Nova',
    '45',
    'Centro',
    'Campinas',
    'SP',
    '13010000',
    now() - interval '9 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.logs (
  id, tenancy_id, actor_user_id, actor_email, action, stage, details, cliente_id, created_at
)
VALUES
  (
    '55555555-5555-5555-5555-555555555556',
    '00000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222227',
    'admin@outraempresa.com',
    'customer_created',
    'customers',
    '{"customer_name":"Ana Ribeiro","cpf":"99988877766"}',
    '12121212-1212-1212-1212-121212121212',
    now() - interval '10 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. Create Sample App Access Records (Session 02)
-- =====================================================

INSERT INTO brain.cliente_app (
  cliente_id, tenancy_id, app_status, app_liberado_em, app_ultimo_acesso, created_at
)
VALUES
  -- João da Silva: Active, frequent user
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    'liberado',
    now() - interval '30 days',
    now() - interval '1 hour',
    now() - interval '30 days'
  ),
  -- Maria Santos: Active, new user
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000001',
    'liberado',
    now() - interval '5 days',
    now() - interval '2 days',
    now() - interval '5 days'
  ),
  -- Carlos Oliveira: Blocked
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000001',
    'bloqueado',
    now() - interval '10 days',
    now() - interval '8 days',
    now() - interval '10 days'
  ),
  -- Ana Paula Costa: Active
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000001',
    'liberado',
    now() - interval '15 days',
    now() - interval '3 hours',
    now() - interval '15 days'
  ),
  -- Roberto Lima: Blocked (inadimplente)
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '00000000-0000-0000-0000-000000000001',
    'bloqueado',
    now() - interval '60 days',
    now() - interval '40 days',
    now() - interval '60 days'
  ),
  (
    '12121212-1212-1212-1212-121212121212',
    '00000000-0000-0000-0000-000000000002',
    'liberado',
    now() - interval '8 days',
    now() - interval '1 day',
    now() - interval '8 days'
  )
ON CONFLICT (cliente_id) DO NOTHING;

-- =====================================================
-- 9. Create Sample Legal Tickets (Session 03)
-- =====================================================

INSERT INTO brain.juridico_tickets (
  id, tenancy_id, cliente_id, status, last_message_at, created_at
)
VALUES
  -- Ticket 1: Pendente
  (
    '88888881-8888-8888-8888-888888888881',
    '00000000-0000-0000-0000-000000000001',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'pendente',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  -- Ticket 2: Respondido
  (
    '88888882-8888-8888-8888-888888888882',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'respondido',
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  -- Ticket 3: Pendente
  (
    '88888883-8888-8888-8888-888888888883',
    '00000000-0000-0000-0000-000000000001',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'pendente',
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  -- Ticket 4: Respondido
  (
    '88888884-8888-8888-8888-888888888884',
    '00000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'respondido',
    now() - interval '10 days',
    now() - interval '10 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Add messages to tickets
INSERT INTO brain.juridico_ticket_mensagens (
  id, tenancy_id, ticket_id, direction, body, created_at
)
VALUES
  -- Messages for ticket 1
  (
    '99998881-9999-9999-9999-999999999881',
    '00000000-0000-0000-0000-000000000001',
    '88888881-8888-8888-8888-888888888881',
    'juridico',
    'Olá, preciso de ajuda com a documentação do processo de super endividamento.',
    now() - interval '2 days'
  ),
  -- Messages for ticket 2
  (
    '99998882-9999-9999-9999-999999999882',
    '00000000-0000-0000-0000-000000000001',
    '88888882-8888-8888-8888-888888888882',
    'equipe',
    'Mudei de endereço e preciso atualizar no processo.',
    now() - interval '5 days'
  ),
  (
    '99998883-9999-9999-9999-999999999883',
    '00000000-0000-0000-0000-000000000001',
    '88888882-8888-8888-8888-888888888882',
    'juridico',
    'Entendido, já atualizamos seu endereço.',
    now() - interval '5 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 10. Create Sample Chat Threads (Session 04)
-- =====================================================

INSERT INTO brain.chat_threads (
  id, tenancy_id, cliente_id, protocolo, status, created_at, updated_at
)
VALUES
  -- Thread 1: Aberto
  (
    '77777771-7777-7777-7777-777777777771',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'CHAT-2026-001',
    'aberto',
    now() - interval '30 minutes',
    now() - interval '5 minutes'
  ),
  -- Thread 2: Em atendimento
  (
    '77777772-7777-7777-7777-777777777772',
    '00000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'CHAT-2026-002',
    'em_atendimento',
    now() - interval '2 hours',
    now() - interval '15 minutes'
  ),
  -- Thread 3: Resolvido
  (
    '77777773-7777-7777-7777-777777777773',
    '00000000-0000-0000-0000-000000000001',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'CHAT-2026-003',
    'resolvido',
    now() - interval '1 day',
    now() - interval '12 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- Add some messages to threads
INSERT INTO brain.chat_mensagens (
  id, tenancy_id, thread_id, direction, body, created_at
)
VALUES
  -- Messages for thread 1
  (
    '66666661-6666-6666-6666-666666666661',
    '00000000-0000-0000-0000-000000000001',
    '77777771-7777-7777-7777-777777777771',
    'cliente',
    'Olá, preciso de ajuda com meu contrato',
    now() - interval '30 minutes'
  ),
  (
    '66666662-6666-6666-6666-666666666662',
    '00000000-0000-0000-0000-000000000001',
    '77777771-7777-7777-7777-777777777771',
    'equipe',
    'Olá! Como posso ajudar?',
    now() - interval '25 minutes'
  ),
  (
    '66666663-6666-6666-6666-666666666663',
    '00000000-0000-0000-0000-000000000001',
    '77777771-7777-7777-7777-777777777771',
    'cliente',
    'Quero saber sobre o status do meu pagamento',
    now() - interval '5 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 11. Create Sample Email Messages (Session 04)
-- =====================================================

INSERT INTO brain.emails_mensagens (
  id, tenancy_id, cliente_id, direction, from_address, to_address, subject, body_text, status, created_at
)
VALUES
  -- Email 1: From equipe to customer
  (
    '55555551-5555-5555-5555-555555555551',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'equipe',
    'contato@meunomeok.com',
    'joao.silva@example.com',
    'Confirmação de Contrato',
    'Prezado João da Silva, seu contrato foi aprovado e está disponível para assinatura.',
    'enviado',
    now() - interval '3 days'
  ),
  -- Email 2: From customer to equipe
  (
    '55555552-5555-5555-5555-555555555552',
    '00000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cliente',
    'maria.santos@example.com',
    'contato@meunomeok.com',
    'Dúvida sobre documentação',
    'Olá, gostaria de saber quais documentos ainda faltam enviar.',
    'enviado',
    now() - interval '1 day'
  ),
  -- Email 3: Pending from equipe
  (
    '55555553-5555-5555-5555-555555555553',
    '00000000-0000-0000-0000-000000000001',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'equipe',
    'contato@meunomeok.com',
    'ana.costa@example.com',
    'Lembrete de Audiência',
    'Prezada Ana Paula Costa, lembramos que sua audiência está marcada para a próxima semana.',
    'pendente',
    now() - interval '2 hours'
  ),
  -- Email 4: Failed from equipe
  (
    '55555554-5555-5555-5555-555555555554',
    '00000000-0000-0000-0000-000000000001',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'equipe',
    'contato@meunomeok.com',
    'roberto.lima@example.com',
    'Cobrança de Parcela Atrasada',
    'Prezado Roberto Lima, identificamos que há parcelas em atraso.',
    'erro',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 12. Create Addresses, Profiles, and Expenses
-- =====================================================

INSERT INTO brain.enderecos (
  id, tenancy_id, cliente_id, rua, numero, complemento, bairro, cidade, estado, cep, created_at
)
VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'Rua das Palmeiras',
    '120',
    'Apto 32',
    'Centro',
    'Sao Paulo',
    'SP',
    '01001000',
    now() - interval '20 days'
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Av Brasil',
    '455',
    null,
    'Jardins',
    'Sao Paulo',
    'SP',
    '01414000',
    now() - interval '6 days'
  ),
  (
    'e1000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Rua do Porto',
    '88',
    'Casa',
    'Vila Nova',
    'Santos',
    'SP',
    '11010000',
    now() - interval '40 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.perfil_do_cliente (
  cliente_id,
  tenancy_id,
  data_nascimento,
  genero,
  "profissão",
  estado_civil,
  "situação",
  vulnerabilidades,
  escolaridade,
  dependentes,
  dependentes_qtd,
  faixa_renda,
  faixa_familiar,
  cadastro_inadimplencia,
  possui_casa_propria,
  possui_financiamento_veiculo,
  credores_qtd,
  comprometimento_mensal,
  created_at
)
VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    '1988-04-12',
    'masculino',
    'Analista',
    'casado',
    'empregado',
    'baixa_renda',
    'superior_completo',
    true,
    2,
    'de_3a5sm',
    'de_3a5sm',
    false,
    true,
    false,
    5,
    1850.00,
    now() - interval '20 days'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000001',
    '1992-11-02',
    'feminino',
    'Assistente',
    'solteiro',
    'empregado',
    'outro',
    'medio_completo',
    false,
    0,
    'de_2a3sm',
    'de_2a3sm',
    false,
    false,
    false,
    2,
    900.00,
    now() - interval '6 days'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '00000000-0000-0000-0000-000000000001',
    '1975-07-18',
    'masculino',
    'Autonomo',
    'divorciado',
    'autonomo',
    'desempregado_longo_prazo',
    'fundamental_completo',
    true,
    1,
    'ate_1sm',
    'ate_1sm',
    true,
    false,
    true,
    8,
    1200.00,
    now() - interval '40 days'
  )
ON CONFLICT (cliente_id) DO NOTHING;

INSERT INTO brain.despesas_do_cliente (
  cliente_id,
  tenancy_id,
  agua,
  luz,
  telefone,
  internet,
  moradia,
  alimentacao,
  plano_saude,
  medicamentos,
  impostos,
  transporte,
  outras,
  created_at
)
VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    80.00,
    150.00,
    110.00,
    120.00,
    900.00,
    650.00,
    280.00,
    90.00,
    120.00,
    220.00,
    60.00,
    now() - interval '20 days'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000001',
    60.00,
    120.00,
    90.00,
    100.00,
    780.00,
    500.00,
    0.00,
    30.00,
    80.00,
    180.00,
    40.00,
    now() - interval '6 days'
  )
ON CONFLICT (cliente_id) DO NOTHING;

-- =====================================================
-- 13. Create Files and Document Attachments
-- =====================================================

INSERT INTO brain.arquivos (
  id, tenancy_id, cliente_id, uploaded_by, storage_path, mime_type, size_bytes, created_at
)
VALUES
  (
    '91000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222223',
    'tenants/00000000-0000-0000-0000-000000000001/clientes/33333333-3333-3333-3333-333333333333/91000000-0000-0000-0000-000000000001/rg-frente.jpg',
    'image/jpeg',
    184320,
    now() - interval '15 days'
  ),
  (
    '91000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222223',
    'tenants/00000000-0000-0000-0000-000000000001/clientes/33333333-3333-3333-3333-333333333333/91000000-0000-0000-0000-000000000002/contrato.pdf',
    'application/pdf',
    524288,
    now() - interval '12 days'
  ),
  (
    '91000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222225',
    'tenants/00000000-0000-0000-0000-000000000001/clientes/33333333-3333-3333-3333-333333333333/91000000-0000-0000-0000-000000000003/audio-confirmacao.mp3',
    'audio/mpeg',
    7340032,
    now() - interval '12 days'
  ),
  (
    '91000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '22222222-2222-2222-2222-222222222224',
    'tenants/00000000-0000-0000-0000-000000000001/clientes/cccccccc-cccc-cccc-cccc-cccccccccccc/91000000-0000-0000-0000-000000000004/relatorio-provas.pdf',
    'application/pdf',
    312000,
    now() - interval '5 days'
  ),
  (
    '91000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222225',
    'tenants/00000000-0000-0000-0000-000000000001/calls/99990000-0000-0000-0000-000000000001/chamada-joao.mp3',
    'audio/mpeg',
    2048000,
    now() - interval '2 hours'
  ),
  (
    '92000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '12121212-1212-1212-1212-121212121212',
    '22222222-2222-2222-2222-222222222227',
    'tenants/00000000-0000-0000-0000-000000000002/clientes/12121212-1212-1212-1212-121212121212/92000000-0000-0000-0000-000000000001/rg-frente.jpg',
    'image/jpeg',
    144000,
    now() - interval '3 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.documentos_do_cliente (
  id, tenancy_id, cliente_id, tipo, status, attachment_id, verificado_por, verificado_em, motivo_recusa, created_at
)
VALUES
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddde',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'rg_frente',
    'aprovado',
    '91000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222225',
    now() - interval '12 days',
    null,
    now() - interval '12 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddf',
    '00000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'comprovante',
    'rejeitado',
    null,
    '22222222-2222-2222-2222-222222222225',
    now() - interval '3 days',
    'Documento ilegivel',
    now() - interval '4 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddee',
    '00000000-0000-0000-0000-000000000002',
    '12121212-1212-1212-1212-121212121212',
    'rg_frente',
    'enviado',
    '92000000-0000-0000-0000-000000000001',
    null,
    null,
    null,
    now() - interval '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 14. Create Additional Contracts, Installments, and Payments
-- =====================================================

INSERT INTO brain.contratos (
  id, tenancy_id, cliente_id, servico, valor, metodo_pagamento, parcelas_qtd, assinado_em,
  finalidade, contrato_anexo_id, audio_anexo_id, created_at
)
VALUES
  (
    '44444444-4444-4444-4444-444444444445',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'Assessoria Financeira',
    1800.00,
    'cartao',
    6,
    now() - interval '12 days',
    'consultoria',
    '91000000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000003',
    now() - interval '12 days'
  ),
  (
    '44444444-4444-4444-4444-444444444446',
    '00000000-0000-0000-0000-000000000002',
    '12121212-1212-1212-1212-121212121212',
    'Renegociacao de Dividas',
    1500.00,
    'boleto',
    3,
    now() - interval '10 days',
    'super_endividamento',
    null,
    null,
    now() - interval '10 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.parcelas (
  id, tenancy_id, contrato_id, numero, vence_em, valor, pago_em, created_at
)
VALUES
  (
    '88888888-8888-8888-8888-888888888889',
    '00000000-0000-0000-0000-000000000001',
    '44444444-4444-4444-4444-444444444445',
    1,
    CURRENT_DATE - interval '5 days',
    300.00,
    now() - interval '4 days',
    now() - interval '12 days'
  ),
  (
    '88888888-8888-8888-8888-888888888890',
    '00000000-0000-0000-0000-000000000001',
    '44444444-4444-4444-4444-444444444445',
    2,
    CURRENT_DATE + interval '25 days',
    300.00,
    null,
    now() - interval '12 days'
  ),
  (
    '88888888-8888-8888-8888-888888888891',
    '00000000-0000-0000-0000-000000000002',
    '44444444-4444-4444-4444-444444444446',
    1,
    CURRENT_DATE - interval '2 days',
    500.00,
    now() - interval '1 day',
    now() - interval '10 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.pagamentos (
  id,
  tenancy_id,
  contrato_id,
  parcela_id,
  status_tx,
  valor_bruto,
  tarifas,
  juros_desconto,
  valor_liquido,
  metodo,
  payload_externo,
  last_webhook_em,
  created_at,
  confirmado_em
)
VALUES
  (
    '99999999-9999-9999-9999-999999999991',
    '00000000-0000-0000-0000-000000000001',
    '44444444-4444-4444-4444-444444444445',
    '88888888-8888-8888-8888-888888888889',
    'confirmado',
    300.00,
    12.00,
    0.00,
    288.00,
    'cartao',
    '{"gateway":"stripe","transaction_id":"txn_joao_001"}',
    now() - interval '4 days',
    now() - interval '5 days',
    now() - interval '4 days'
  ),
  (
    '99999999-9999-9999-9999-999999999992',
    '00000000-0000-0000-0000-000000000002',
    '44444444-4444-4444-4444-444444444446',
    '88888888-8888-8888-8888-888888888891',
    'confirmado',
    500.00,
    0.00,
    0.00,
    500.00,
    'boleto',
    '{"gateway":"cielo","transaction_id":"txn_outra_001"}',
    now() - interval '1 day',
    now() - interval '2 days',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 15. Create Email Templates
-- =====================================================

INSERT INTO brain.emails_templates (
  id, tenancy_id, name, subject, body_text, created_by, created_at
)
VALUES
  (
    '77770000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Boas-vindas',
    'Bem-vindo ao BRAIN',
    'Ola, seja bem-vindo. Estamos iniciando seu atendimento.',
    '22222222-2222-2222-2222-222222222225',
    now() - interval '7 days'
  ),
  (
    '77770000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Cobranca amigavel',
    'Lembrete de vencimento',
    'Identificamos uma parcela proxima do vencimento.',
    '22222222-2222-2222-2222-222222222226',
    now() - interval '4 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 16. Create Legal Events and Call Records
-- =====================================================

INSERT INTO brain.juridico_eventos (
  id, tenancy_id, processo_id, tipo, status, quando, criado_por, created_at
)
VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef',
    '00000000-0000-0000-0000-000000000001',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'prova',
    'agendado',
    now() + interval '5 days',
    '22222222-2222-2222-2222-222222222224',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO brain.ligacoes (
  id,
  tenancy_id,
  cliente_id,
  processo_id,
  contexto_negocio,
  resultado_negocio,
  contrato_id,
  agente_user_id,
  direction,
  provider,
  provider_call_id,
  thread_key,
  numero_origem_e164,
  numero_destino_e164,
  status,
  resultado,
  duracao_segundos,
  gravacao_arquivo_id,
  observacoes,
  iniciado_em,
  encerrado_em,
  created_at
)
VALUES
  (
    '99990000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    null,
    'Vendas',
    'Retorno inicial',
    '44444444-4444-4444-4444-444444444445',
    '22222222-2222-2222-2222-222222222225',
    'equipe',
    'twilio',
    'tw-0001',
    'call-joao-001',
    '+5511990000111',
    '+5511999887766',
    'completada',
    'atendeu_cliente',
    420,
    '91000000-0000-0000-0000-000000000005',
    'Cliente confirmou interesse.',
    now() - interval '3 hours',
    now() - interval '2 hours 53 minutes',
    now() - interval '3 hours'
  ),
  (
    '99990000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '12121212-1212-1212-1212-121212121212',
    null,
    'suporte',
    'Atualizacao cadastral',
    '44444444-4444-4444-4444-444444444446',
    '22222222-2222-2222-2222-222222222227',
    'equipe',
    'twilio',
    'tw-2001',
    'call-ana-001',
    '+5511980000123',
    '+5511987654321',
    'completada',
    'atendeu_cliente',
    180,
    null,
    'Orientacoes de app.',
    now() - interval '1 day',
    now() - interval '1 day' + interval '3 minutes',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 17. Create IP Blacklist Entries
-- =====================================================

INSERT INTO brain.ip_blacklist (
  id, tenancy_id, ip, reason, created_at
)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000001',
    '203.0.113.10',
    'user_terminated',
    now() - interval '10 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Seed data inserted successfully!' AS message;
SELECT 'Login: comercial@meunomeok.com' AS user_email;
SELECT 'Login: vendas@meunomeok.com' AS user_email;
SELECT 'Login: juridico@meunomeok.com' AS user_email;
SELECT 'Login: suporte@meunomeok.com' AS user_email;
SELECT 'Login: cobranca@meunomeok.com' AS user_email;
SELECT 'Login: admin@outraempresa.com' AS user_email;
SELECT 'Password: Montag10' AS user_password;
SELECT '7 customers created across 2 tenants' AS kanban_status;
SELECT '6 app access records created' AS app_access_status;
SELECT '4 legal tickets created' AS legal_tickets_status;
SELECT '3 chat threads with messages created' AS chat_status;
SELECT '4 email messages created' AS email_status;
