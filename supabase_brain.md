# supabase_brain.md
> **Project Blueprint (Local MVP Sandbox) — Supabase + Admin Frontend + Local BFF Microservice (Option B)**  
> **Language:** English (100%)  
> **Last updated:** 2026-01-13  
> **Status:** MVP blueprint for local simulation (Supabase CLI sandbox).  
> **Primary schema:** `brain` (Postgres schema inside Supabase local stack)

---

<!-- ===================================================================== -->
<!-- =====================  LLM / AGENT CONSUMPTION NOTES  ================= -->
<!-- ===================================================================== -->

## LLM Consumption Notes

This document is intentionally **highly structured** and includes explicit **delimiters** to make it easy for LLM agents to:
- understand context and goals,
- generate migrations / SQL,
- generate frontend data-access layers,
- implement a local BFF microservice,
- maintain strict multi-tenant isolation (RLS),
- run the full stack locally with Supabase CLI.

**Do not remove the section delimiters.**

**Conventions used:**
- **MUST** = required for MVP correctness
- **SHOULD** = strongly recommended
- **MAY** = optional / future-proofing
- Code identifiers (table names, columns, enums) match the schema naming (Portuguese identifiers in DB; English explanations).

---

# SECTION 0 — Executive Summary

## 0.1 What is “BRAIN”?

`brain` is a **canonical administrative database schema** where the company’s internal teams (admin, sales, legal, billing, support) can **view and manage customers** who already have **signed contracts**, plus their:
- contact data,
- payment and contract status,
- uploaded documents and attachments,
- legal processes & events,
- customer communications (chat + email),
- call records (telephony mirror),
- immutable audit logs.

This MVP runs **locally** using **Supabase CLI** (“sandbox mode”), using:
- Postgres + PostgREST + Auth + Storage + Realtime,
- an **admin frontend** to view and manage data,
- a **local BFF microservice** (Option B) to replace Supabase Edge Functions (no Edge Functions in this project).

## 0.2 Why Option B (Local BFF) instead of Edge Functions?

We intentionally do **not** use Supabase Edge Functions.  
Instead, we run a **small local microservice** (BFF) that performs:
- privileged **Auth admin** actions (inviting / disabling users),
- outbound email sending (SMTP → local Inbucket),
- exporting chat transcripts to TXT,
- other privileged workflows requiring secrets.

This keeps the MVP free, local, and secure **without putting secrets in the browser**.

---

# SECTION 1 — Goals, Non-Goals, and Constraints

## 1.1 Goals (MVP)

1) Run the full stack **locally** with Supabase CLI:
   - create and query the `brain` schema tables/views/enums,
   - use Storage buckets locally for attachments,
   - use Realtime for chat + notifications.

2) Deliver an Admin UI with these main areas:
- Session 00: Login
- Session 01: Customers (Kanban + Customer Card + timeline)
- Session 02: App Access (Kanban)
- Session 03: Legal “ticket-like” messaging
- Session 04: Support/Communications (Chat + Emails)
- Session 05: Global Logs (audit list)
- Session 06: Team Management (invite/disable, online/offline)

3) Enforce **multi-tenant isolation** using `tenancy_id` + RLS.

4) Provide a project skeleton that is easily upgraded into production later.

## 1.2 Non-Goals (MVP)

- No production hosting.
- No real external integrations (Tenex / Heart / IPData) required for MVP; we simulate with seed data.
- No search-engine indexing: in local MVP it is not relevant, but the production blueprint includes “noindex” requirements.

## 1.3 Hard Constraints

- **No Supabase Edge Functions**.
- **No paid services** for MVP.
- Must be able to run with:
  - Supabase CLI + Docker,
  - a local frontend (Vite),
  - a local microservice (BFF).

---

# SECTION 2 — System Architecture

## 2.1 Component Diagram (Logical)

```
┌───────────────────────────┐
│     Admin Frontend (Vite) │
│  - Supabase JS client     │
│  - Realtime subscriptions │
│  - Upload to Storage      │
└───────────────┬───────────┘
                │ (anon key + user access token)
                ▼
┌──────────────────────────────────────────────┐
│              Supabase Local Stack            │
│  - Postgres (schema: brain)                  │
│  - PostgREST (REST API over tables/views)    │
│  - GoTrue (Auth)                             │
│  - Storage (buckets)                         │
│  - Realtime (chat/notifications)             │
│  - Studio (admin UI)                         │
│  - Inbucket (local email capture)            │
└──────────────────────────────────────────────┘
                ▲
                │ (service role key; never in browser)
                │
┌───────────────┴───────────────┐
│      Local BFF Microservice     │
│  - Auth admin actions           │
│  - SMTP email send (to Inbucket)│
│  - Export chat transcript TXT   │
│  - Other privileged workflows   │
└─────────────────────────────────┘
```

## 2.2 Data Ownership

- `brain` is the authoritative schema for this MVP.
- “Core/original systems” (Tenex, Heart, Lungs) are **simulated** via:
  - seed SQL,
  - optional stub schemas/views (only if needed).

---

# SECTION 3 — Repository / Folder Structure

Recommended repository layout:

```
repo/
  supabase/
    config.toml
    migrations/
      0001_init.sql
      0002_rls.sql
      0003_views.sql
      0004_seed_helpers.sql
    seed.sql
  apps/
    admin-frontend/
      src/
        pages/
        components/
        lib/
          supabaseClient.ts
          apiBff.ts
          accessControl.ts
        types/
          database.ts   # generated by `supabase gen types typescript --local`
      .env.local
      vite.config.ts
  services/
    bff/
      src/
        index.ts
        auth.ts
        supabaseAdmin.ts
        mailer.ts
        exportChat.ts
      .env
      package.json
      tsconfig.json
  README.md
  supabase_brain.md   <-- this file
```

---

# SECTION 4 — Local Development: Supabase CLI

## 4.1 Prerequisites

- Docker Desktop (or Docker Engine) running
- Supabase CLI installed
- Node.js + npm/pnpm

## 4.2 Initialize and Start Supabase locally

```bash
supabase init
supabase start
supabase status
```

## 4.3 Expose the `brain` schema via REST API

**MUST:** add `brain` to exposed schemas, otherwise PostgREST won’t serve it.

Edit: `supabase/config.toml`

```toml
[api]
schemas = ["public", "storage", "graphql_public", "brain"]
```

Restart:

```bash
supabase stop
supabase start
```

## 4.4 Migrations and Seed

- Place DDL migrations in `supabase/migrations/*.sql`
- Place test data in `supabase/seed.sql`
- Reset DB + re-apply migrations + re-seed:

```bash
supabase db reset
```

## 4.5 Generate TypeScript types for the frontend

```bash
supabase gen types typescript --local > apps/admin-frontend/src/types/database.ts
```

---

# SECTION 5 — Environment Variables

## 5.1 Frontend (.env.local)

Example:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=YOUR_LOCAL_ANON_KEY
VITE_BFF_BASE_URL=http://127.0.0.1:8080
```

## 5.2 BFF (.env)

Example:

```bash
# Supabase local
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=YOUR_LOCAL_SERVICE_ROLE_KEY

# SMTP (local Inbucket)
SMTP_HOST=127.0.0.1
SMTP_PORT=54325
SMTP_FROM=no-reply@local.test

# Server
PORT=8080
```

**Security rule:** The service role key MUST exist only in the BFF.

---

# SECTION 6 — Database Specification (Schema `brain`)

## 6.1 Multi-Tenant Model

**Every row that belongs to a tenant MUST have `tenancy_id uuid`.**  
RLS policies enforce that users can only access rows for their own tenant.

### Core tenant table

- `brain.tenants` — tenants (companies)

---

## 6.2 Tables (Authoritative Logical Model)

> **Delimiter format:**  
> `BEGIN_TABLE: brain.<name>` and `END_TABLE`  
> These blocks are intended for LLM parsing.



<!-- ======================= BEGIN_TABLE: brain.tenants ======================= -->
## Table: `brain.tenants`

**Purpose:** Separar empresas e isolar dados

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `` | Identificador único (uuid) do tenant |
| `nome` | `text` | Nome da empresa |
| `slug` | `text` | Indentificador do domínio da empresa |
| `created_at` | `timestamptz` | Quando foi criado o tenant |

### Foreign Keys
_None._


### Enum Usage
_None._


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.tenants ======================== -->


<!-- ======================= BEGIN_TABLE: brain.equipe ======================= -->
## Table: `brain.equipe`

**Purpose:** Espelhar usuários operacionais com metadados usados no APP

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Indentificador interno do usuário |
| `auth_user_id` | `uuid` | vínculo com auth.users |
| `tenancy_id` | `uuid` | A qual empresa pertence |
| `full_name` | `text` | Nome completo do usuário |
| `email` | `text` | Login único por tenant |
| `phone` | `text` | telefone |
| `phone_e164` | `text` | telefone no formato E.164 |
| `role` | `enum brain.user_role` | perfil de acesso |
| `status` | `text` | online, offline, pendente |
| `ip_address` | `text` | IP coletado no primeiro login via IPDATA |
| `geolocation` | `jsonb` | dados de localização via IPDATA |
| `last_activity` | `timestamptz` | última atividade para presença em tempo real |
| `created_at` | `timestamptz` | Quando o usuário foi criado |
| `updated_at` | `timestamptz` | Última modificação |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `auth_user_id` | `auth.users(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `role` | `brain.user_role` |


### MVP Constraints (Recommended)
- **UNIQUE** `(tenancy_id, email)`.
- **INDEX** `(auth_user_id)`.

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.equipe ======================== -->


<!-- ======================= BEGIN_TABLE: brain.clientes ======================= -->
## Table: `brain.clientes`

**Purpose:** Base única de clientes com contrato assinado, pivô de todas as sessões.

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador interno do cliente |
| `tenancy_id` | `uuid` | empresa dona do cliente |
| `fonte` | `enum` | Origem do cadastro CRM/Importação/Site/Manual |
| `nome_completo` | `text` | Nome completo do cliente |
| `email` | `text` | Email do cliente |
| `telefone_principal` | `text` | Telefone do cliente |
| `telefone_secundario` | `text` | Outro telefone do cliente |
| `cpf` | `char(11)` | Identificador externo principal único por tenant |
| `rg` | `text` | Documento complementar |
| `id_credilly` | `text` | chave de integração |
| `id_turing` | `text` | Chave de integração |
| `status_pagamento` | `enum brain.payment_status` | Aguardando, em_dia, inadimplente, cancelado |
| `processo_super_endividamento` | `boolean` | flag jurídica |
| `processo_rmc` | `boolean` | Flag jurídica |
| `contrato_assinado_em` | `timestamptz` | Data de ingresso |
| `tenex_cadastrado_em` | `timestamptz` | Data de cadastro no tenex |
| `vendedor_id` | `uuid` | Responsável comercial |
| `created_at` | `timestamptz` | Quando foi criado |
| `updated_at` | `timestamptz` | Quando foi atualizado |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `vendedor_id` | `brain.equipe(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `status_pagamento` | `brain.payment_status` |
| `fonte` | `brain.fonte_cadastro` |


### MVP Constraints (Recommended)
- **UNIQUE** `(tenancy_id, cpf)` — external identity per tenant.
- **INDEX** `(tenancy_id, created_at DESC)` for Kanban filters.
- **INDEX** `(tenancy_id, nome_completo)` for search.
- **INDEX** `(tenancy_id, telefone_principal)` for search.

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.clientes ======================== -->


<!-- ======================= BEGIN_TABLE: brain.enderecos ======================= -->
## Table: `brain.enderecos`

**Purpose:** Armazenar endereços dos clientes para cobrança e processos

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador do endereço |
| `tenancy_id` | `uuid` | empresa dona do cliente |
| `cliente_id` | `uuid` | id do cliente |
| `rua` | `text` | rua do cliente |
| `numero` | `text` | numero da rua do cliente |
| `complemento` | `text` | ponto de referência |
| `bairro` | `text` | bairro do cliente |
| `cidade` | `text` | cidade do cliente |
| `estado` | `char(2)` | estado do cliente |
| `cep` | `char(8)` | cep do cliente |
| `created_at` | `timestamptz` | quando foi criado |
| `updated_at` | `timestamptz` | última modificação |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |


### Enum Usage
_None._


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.enderecos ======================== -->


<!-- ======================= BEGIN_TABLE: brain.contratos ======================= -->
## Table: `brain.contratos`

**Purpose:** Registrar cada serviço, contrato do cliente e seus anexos

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador do contrato |
| `tenancy_id` | `uuid` | empresa dona do cliente |
| `cliente_id` | `uuid` | id do cliente |
| `servico` | `text` | Nome do serviço contratado |
| `valor` | `numeric(12,2)` | Valor total do contrato |
| `metodo_pagamento` | `enum brain.payment_method` | PIX, boleto, cartão, etc. |
| `parcelas_qtd` | `integer` | Quantidade de parcelas |
| `assinado_em` | `timestamptz` | Quando assinou |
| `implantado_em` | `timestamptz` | Quando foi implantado no tenex |
| `contrato_anexo_id` | `uuid; ref. brain.arquivos` | arquivo do contrato assinado |
| `audio_anexo_id` | `uuid; ref. brain.arquivos` | arquivo do áudio de confirmação |
| `finalidade` | `enum brain.contract_finalidade` | categoria do contrato |
| `origem_schema` | `text` | qual schema originou ex.: kidneys, heart, lungs |
| `origem_entidade` | `text` | qual objeto originou ex.: acordos, deals, tickets |
| `origem_id` | `uuid` | id do registro de origem ex.: kidneys.acordos.id |
| `origem_metadata` | `jsonb` | metadados adicionais da origem ex.: snapshot de condições |
| `created_at` | `timestamptz` | criado em |
| `updated_at` | `timestamptz` | ultima modificação |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |
| `contrato_anexo_id` | `brain.arquivos(id)` |
| `audio_anexo_id` | `brain.arquivos(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `metodo_pagamento` | `brain.payment_method` |
| `finalidade` | `brain.contract_finalidade` |


### MVP Constraints (Recommended)
- Consider **UNIQUE** `(tenancy_id, origem_schema, origem_entidade, origem_id)` if you do idempotent sync from external sources.
- **INDEX** `(cliente_id)`.

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.contratos ======================== -->


<!-- ======================= BEGIN_TABLE: brain.parcelas ======================= -->
## Table: `brain.parcelas`

**Purpose:** Grade de cobrança e base para status de pagamento

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador da parcela |
| `tenancy_id` | `uuid` | empresa dona do cliente |
| `contrato_id` | `uuid` | parcela de qual contrato |
| `numero` | `integer` | numero da parcela |
| `vence_em` | `date` | data de vencimento |
| `valor` | `numeric(12,2)` | valor da parcela |
| `link_pagamento` | `text` | url para cobrança |
| `pago_em` | `timestamptz` | quando quitou |
| `cancelada_em` | `timestamptz` |  |
| `created_at` | `timestamptz` | quando foi criado |
| `updated_at` | `timestamptz` | ultima modificação |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `contrato_id` | `brain.contratos(id)` |


### Enum Usage
_None._


### MVP Constraints (Recommended)
- **UNIQUE** `(contrato_id, numero)`.
- **INDEX** `(contrato_id, vence_em)`.

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.parcelas ======================== -->


<!-- ======================= BEGIN_TABLE: brain.pagamentos ======================= -->
## Table: `brain.pagamentos`

**Purpose:** Histórico de transações por parcela (tentativa, confirmação, erros, estorno). A parcela vira ordem de cobrança, os pagamentos mostram como e quando ela foi quitada.

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | identificador único do pagamento, usado para rastreio |
| `tenancy_id` | `uuid` | empresa responsável ao receber o pagamento |
| `contrato_id` | `uuid` | qual contrato pertence este pagamento |
| `parcela_id` | `uuid` | qual parcela pertence ao pagamento |
| `status_tx` | `enum brain.payment_tx_status` | pendente, autorizado, confirmado, falhado, estornado |
| `valor_bruto` | `numeric(12,2)` | valor que o cliente deveria pagar naquela tentativa |
| `tarifas` | `numeric(12,2)` | taxas do provedor de pagamentos |
| `juros_desconto` | `numeric(12,2)` | multa/desconto acrescidos no pagamento |
| `valor_liquido` | `numeric(12,2)` | quanto entrou de fato na conta |
| `metodo` | `enum brain.payment_method` | meio de pagamento que foi feito o pagamento |
| `payload_externo` | `jsonb` | dados que vieram do pagamento |
| `last_webhook_em` | `timestamptz` | horário que recebeu o webhook do pagamento |
| `created_at` | `timestamptz` | criado em |
| `confirmado_em` | `timestamptz` |  |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `contrato_id` | `brain.contratos(id)` |
| `parcela_id` | `brain.parcelas(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `status_tx` | `brain.payment_tx_status` |
| `metodo` | `brain.payment_method` |


### MVP Constraints (Recommended)
- **INDEX** `(parcela_id, confirmado_em)`.
- **INDEX** `(tenancy_id, created_at DESC)`.

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.pagamentos ======================== -->


<!-- ======================= BEGIN_TABLE: brain.perfil_do_cliente ======================= -->
## Table: `brain.perfil_do_cliente`

**Purpose:** Dados pessoais e socioeconômicos enviados pelo app

### Columns
| Column | Type | Description |
|---|---|---|
| `cliente_id` | `uuid` | id do cliente |
| `tenancy_id` | `uuid` | empresa dona do cliente |
| `data_nascimento` | `date` | quando nasceu |
| `genero` | `text` | feminino ou masculino |
| `profissão` | `text` | o que faz |
| `estado_civil` | `enum` | solteiro, casado, etc. |
| `situação` | `enum` | empregado, afastado, etc. |
| `vulnerabilidades` | `enum` | idoso, pcd, etc. |
| `escolaridade` | `enum` | nível educacional |
| `dependentes` | `boolean` | se tem ou não |
| `dependentes_qtd` | `integer` | quantidade de dependentes |
| `faixa_renda` | `enum` | faixa de renda mensal |
| `faixa_familiar` | `enum` | faixa de renda mensal familiar |
| `cadastro_inadimplencia` | `boolean` | se está no serasa |
| `possui_casa_propria` | `boolean` | se tem casa |
| `possui_financiamento_veiculo` | `boolean` | se tem veiculo |
| `credores_qtd` | `integer` | quantidade de credores |
| `comprometimento_mensal` | `numeric(12,2)` | porcentagem do endividamento |
| `created_at` | `timestamptz` | quando foi criado |
| `updated_at` | `timestamptz` | quando foi modificado |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `estado_civil` | `brain.estado_civil` |
| `situação` | `brain.situacao_ocupacional` |
| `vulnerabilidades` | `brain.vulnerabilidade` |
| `escolaridade` | `brain.escolaridade` |
| `faixa_renda` | `brain.faixa_renda` |
| `faixa_familiar` | `brain.faixa_renda_familiar` |


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.perfil_do_cliente ======================== -->


<!-- ======================= BEGIN_TABLE: brain.despesas_do_cliente ======================= -->
## Table: `brain.despesas_do_cliente`

**Purpose:** Detalhar despesas para o processo de super endividamento

### Columns
| Column | Type | Description |
|---|---|---|
| `cliente_id` | `uuid` | id do cliente |
| `tenancy_id` | `uuid` | empresa dona do cliente |
| `agua` | `numeric(12,2)` | despesas mensais |
| `luz` | `numeric(12,2)` | despesas mensais |
| `telefone` | `numeric(12,2)` | despesas mensais |
| `internet` | `numeric(12,2)` | despesas mensais |
| `moradia` | `numeric(12,2)` | despesas mensais |
| `alimentacao` | `numeric(12,2)` | despesas mensais |
| `plano_saude` | `numeric(12,2)` | despesas mensais |
| `medicamentos` | `numeric(12,2)` | despesas mensais |
| `impostos` | `numeric(12,2)` | despesas mensais |
| `transporte` | `numeric(12,2)` | despesas mensais |
| `outras` | `numeric(12,2)` | despesas mensais |
| `created_at` | `timestamptz` | quando foi criado |
| `updated_at` | `timestamptz` | quando foi modificado |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |


### Enum Usage
_None._


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.despesas_do_cliente ======================== -->


<!-- ======================= BEGIN_TABLE: brain.arquivos ======================= -->
## Table: `brain.arquivos`

**Purpose:** Índice de arquivos no Storage (PDF,JPG,DOCX,PNG,MPG,OGG)

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador do arquivo |
| `tenancy_id` | `uuid` | empresa dona do arquivo |
| `cliente_id` | `uuid` | responsável pelo arquivo |
| `uploaded_by` | `uuid` | quem subiu usuario ou cliente |
| `storage_path` | `text` | caminho no bucket |
| `mime_type` | `text` | metadados do arquivo |
| `size_bytes` | `bigint` | tamanho do arquivo |
| `created_at` | `timestamptz` | quando foi criado |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |
| `uploaded_by` | `brain.equipe(id)` |


### Enum Usage
_None._


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- This table indexes objects stored in Supabase Storage (bucket + path).
- Store tenant and customer context so RLS can be enforced.

<!-- ======================== END_TABLE: brain.arquivos ======================== -->


<!-- ======================= BEGIN_TABLE: brain.documentos_do_cliente ======================= -->
## Table: `brain.documentos_do_cliente`

**Purpose:** Controlar exigências documentais e status para o kanban enviado pelo APP

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | identificador |
| `tenancy_id` | `uuid` | empresa dona do documento |
| `cliente_id` | `uuid` | cliente relacionado |
| `tipo` | `enum` | rg_frente, rg_verso, cnh, comprovante, contracheque, extrato, registrato, assinatura, audio, contrato, etc. |
| `status` | `enum` | pendente, enviado, aprovado, rejeitado |
| `attachment_id` | `uuid` | arquivo correspondente |
| `verificado_por` | `uuid` | quem analisou |
| `verificado_em` | `timestamptz` | quando foi analisado |
| `motivo_recusa` | `text` | justificativa quando recusado |
| `created_at` | `timestamptz` | quando foi criado |
| `updated_at` | `timestamptz` | última modificação |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |
| `attachment_id` | `brain.arquivos(id)` |
| `verificado_por` | `brain.equipe(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `tipo` | `brain.doc_tipo` |
| `status` | `brain.doc_status` |


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- Recommended: if you want only one row per document type, enforce **UNIQUE** `(cliente_id, tipo)`.
- If you want history, allow multiple rows and add an `is_active` flag.

<!-- ======================== END_TABLE: brain.documentos_do_cliente ======================== -->


<!-- ======================= BEGIN_TABLE: brain.juridico_processos ======================= -->
## Table: `brain.juridico_processos`

**Purpose:** Registrar processos do cliente e sua etapa pelo CRM Lungs jurídico

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador do processo |
| `tenancy_id` | `uuid` | Empresa dona do processo |
| `cliente_id` | `uuid` | cliente relacionado |
| `tipo` | `enum brain.legal_case_type` | super_endividamento, rmc, cobranca |
| `numero_cnj` | `text` | numero do processo |
| `etapa` | `enum` | aberto, agendado, concluido, adiado, cancelado |
| `criado_por` | `uuid` | advogado |
| `created_at` | `timestamptz` | criado em |
| `updated_at` | `timestamptz` | última modificação |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |
| `criado_por` | `brain.equipe(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `tipo` | `brain.legal_case_type` |
| `etapa` | `brain.processo_etapa` |


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.juridico_processos ======================== -->


<!-- ======================= BEGIN_TABLE: brain.juridico_eventos ======================= -->
## Table: `brain.juridico_eventos`

**Purpose:** Linha do tempo jurídica (provas, audências, decisões, pendências) pelo CRM Lungs jurídico

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador do evento |
| `tenancy_id` | `uuid` | empresa dona do processo |
| `processo_id` | `uuid` | id do processo relacionado |
| `tipo` | `enum` | distribuicao, prova, pergunta, resposta, audiencia, adiamento, cancelamento, decisao, documento_pendente, sentenca, transito_julgado, outro |
| `status` | `enum` | aberto, agendado, concluido, adiado, cancelado |
| `quando` | `timestamptz` |  |
| `criado_por` | `uuid` | autor |
| `created_at` | `timestamptz` | criado em |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `processo_id` | `brain.juridico_processos(id)` |
| `criado_por` | `brain.equipe(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `tipo` | `brain.juridico_evento_tipo` |
| `status` | `brain.evento_status` |


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.juridico_eventos ======================== -->


<!-- ======================= BEGIN_TABLE: brain.chat_threads ======================= -->
## Table: `brain.chat_threads`

**Purpose:** Abrir e fechar protocolos de chat por canal com histórico infinito

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador da conversa |
| `tenancy_id` | `uuid` | empresa dona |
| `cliente_id` | `uuid` | cliente relacionado |
| `protocolo` | `text` | código visível para suporte |
| `canal` | `text` | app |
| `status` | `text` | Aberto ou fechado |
| `iniciado_por` | `text` | cliente ou usuário |
| `created_at` | `timestamptz` | Criado em |
| `updated_at` | `timestamptz` | Última modificação |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |


### Enum Usage
_None._


### MVP Constraints (Recommended)
- **UNIQUE** `(tenancy_id, protocolo)`.
- **INDEX** `(cliente_id, updated_at DESC)`.

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.chat_threads ======================== -->


<!-- ======================= BEGIN_TABLE: brain.chat_mensagens ======================= -->
## Table: `brain.chat_mensagens`

**Purpose:** Mensagens do chat, incluindo voz, imagens, recibos de entrega, visualização.

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador da mensagem |
| `tenancy_id` | `uuid` | empresa dona |
| `thread_id` | `uuid` | qual id da conversa |
| `direction` | `enum brain.chat_direction` | cliente ou equipe |
| `from_name` | `text` | quem enviou |
| `to_name` | `text` | quem recebeu |
| `body` | `text` | texto da mensagem |
| `audio_path` | `text` | anexo do áudio recebido no storage |
| `media_path` | `text` | anexo de mídia recebida no storage |
| `delivered_at` | `timestamptz` | entregue em |
| `seen_at` | `timestamptz` | visualizou em |
| `created_at` | `timestamptz` | criado em |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `thread_id` | `brain.chat_threads(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `direction` | `brain.chat_direction` |


### MVP Constraints (Recommended)
- **INDEX** `(thread_id, created_at)` for chat scrolling.

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.chat_mensagens ======================== -->


<!-- ======================= BEGIN_TABLE: brain.emails_templates ======================= -->
## Table: `brain.emails_templates`

**Purpose:** Modelos de email prontos para uso

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador |
| `tenancy_id` | `uuid` | empresa dona |
| `name` | `text` | Nome do template |
| `subject` | `text` | Assunto |
| `body_html` | `text` | corpo em html |
| `body_text` | `text` | conteúdo do template |
| `created_by` | `uuid` | criado por |
| `created_at` | `timestamptz` | criado em |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `created_by` | `brain.equipe(id)` |


### Enum Usage
_None._


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.emails_templates ======================== -->


<!-- ======================= BEGIN_TABLE: brain.emails_mensagens ======================= -->
## Table: `brain.emails_mensagens`

**Purpose:** Caixa de enviados, recebidos com status

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador |
| `tenancy_id` | `uuid` | Empresa dona |
| `cliente_id` | `uuid` | Cliente relacionado |
| `thread_key` | `text` | qual email que é |
| `direction` | `enum brain.chat_direction` | cliente ou equipe |
| `from_address` | `text` | Qual email enviou |
| `to_address` | `text` | Qual email receberá |
| `bcc_addresses` | `text` | Quais emails receberão |
| `subject` | `text` | Assunto do email |
| `body_html` | `text` | Corpo em html |
| `body_text` | `text` | Conteúdo do email |
| `status` | `text` | Enviado, erro, recebido |
| `error_msg` | `text` | Motivo do erro |
| `created_at` | `timestamptz` | Criado em |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `direction` | `brain.chat_direction` |


### MVP Constraints (Recommended)
- (Add indexes/constraints based on query patterns.)

### Notes
- In the MVP, emails can be sent through the local BFF to local SMTP (Inbucket) and recorded here.

<!-- ======================== END_TABLE: brain.emails_mensagens ======================== -->


<!-- ======================= BEGIN_TABLE: brain.logs ======================= -->
## Table: `brain.logs`

**Purpose:** Auditoria e timeline unificada das ações:

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Identificador do log |
| `tenancy_id` | `uuid` | empresa dona |
| `actor_user_id` | `uuid` | Qual o id de quem realizou a ação |
| `actor_email` | `text` | quem realizou a ação |
| `action` | `text` | O que foi feito |
| `stage` | `text` | Qual sessão |
| `details` | `jsonb` | o que houve |
| `cliente_id` | `uuid` | Relação com o cliente afetado, se houver |
| `created_at` | `timestamptz` | Quando ocorreu |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `actor_user_id` | `brain.equipe(id)` |
| `cliente_id` | `brain.clientes(id)` |


### Enum Usage
_None._


### MVP Constraints (Recommended)
- **INDEX** `(tenancy_id, created_at DESC)` for global logs.
- **INDEX** `(cliente_id, created_at DESC)` for customer timeline.

### Notes
- (No additional notes.)

<!-- ======================== END_TABLE: brain.logs ======================== -->


<!-- ======================= BEGIN_TABLE: brain.ligacoes ======================= -->
## Table: `brain.ligacoes`

**Purpose:** serve para registrar qualquer chamada telefônica (ativa ou receptiva) relacionada ao ecossistema, com metadados suficientes para analytics, compliance e UI.

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | identificador da ligação |
| `tenancy_id` | `uuid` | empresa/tenant dona do registro |
| `cliente_id` | `uuid` | cliente relacionado |
| `processo_id` | `uuid` | processo jurídico relacionado, se houver |
| `contexto_negocio` | `enum brain.contexto_negocio, nullable` | domínio da chamada |
| `resultado_negocio` | `text, nullable` | rótulo de negócio da área de origem |
| `contrato_id` | `uuid` | contrato financeiro relacionado, se houver |
| `agente_user_id` | `uuid` | usuário interno que originou/atendeu |
| `direction` | `enum brain.chat_direction: cliente | equipe` | quem originou a chamada |
| `provider` | `text` | provedor de telefonia |
| `provider_call_id` | `text` | id único no provedor |
| `thread_key` | `text` | chave de conversa/ramal/número usado para agrupar histórico |
| `numero_origem_e164` | `text` | número de origem no formato E.164 |
| `numero_destino_e164` | `text` | número de destino no formato E.164 |
| `status` | `enum brain.call_status` | estágio técnico da chamada |
| `resultado` | `enum brain.call_result` | desfecho de contato |
| `duracao_segundos` | `integer` | duração efetiva da chamada |
| `gravacao_arquivo_id` | `uuid` | arquivo da gravação em brain.arquivos, se houver |
| `observacoes` | `text` | notas operacionais do atendente |
| `iniciado_em` | `timestamptz` | início da chamada |
| `encerrado_em` | `timestamptz` | término da chamada |
| `created_at` | `timestamptz` | quando o registro foi criado |

### Foreign Keys
| Column | References |
|---|---|
| `tenancy_id` | `brain.tenants(id)` |
| `cliente_id` | `brain.clientes(id)` |
| `processo_id` | `brain.juridico_processos(id)` |
| `contrato_id` | `brain.contratos(id)` |
| `agente_user_id` | `brain.equipe(id)` |
| `gravacao_arquivo_id` | `brain.arquivos(id)` |


### Enum Usage
| Column | Enum |
|---|---|
| `direction` | `brain.chat_direction` |
| `status` | `brain.call_status` |
| `resultado` | `brain.call_result` |


### MVP Constraints (Recommended)
- **UNIQUE** `(tenancy_id, provider, provider_call_id)` (idempotent telephony mirror).
- **INDEX** `(tenancy_id, provider, provider_call_id)`.
- **INDEX** `(iniciado_em)` and **INDEX** `(encerrado_em)` for time analysis.

### Notes
- The BRAIN receives consolidated call records (not raw webhooks).
- Always upsert using the canonical natural key.

<!-- ======================== END_TABLE: brain.ligacoes ======================== -->


---

## 6.3 Recommended Additional Tables for UI Completeness (MVP Extensions)

These tables are **not explicitly listed** in the provided `brain` table list, but they map directly to the UI requirements:
- Session 02: App access Kanban (pending / allowed / blocked)
- Session 03: Legal “ticket-like” messaging system
- Session 06: IP blacklist on “fire” action

You can implement them either as:
- **Option 1:** Add these new tables (recommended; cleaner),
- **Option 2:** Overload existing tables with extra columns (faster, but less clean).

### Extension A — App Access status

**Option 1 (recommended):** `brain.cliente_app`

```sql
-- one row per customer
create table if not exists brain.cliente_app (
  cliente_id uuid primary key references brain.clientes(id) on delete cascade,
  tenancy_id uuid not null references brain.tenants(id),
  status text not null check (status in ('pendente','liberado','bloqueado')),
  bloqueado_em timestamptz,
  bloqueio_motivo text,
  liberado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cliente_app_tenant_status
  on brain.cliente_app (tenancy_id, status);
```

**Option 2 (fast):** add `app_status`, `app_bloqueado_em`, `app_bloqueio_motivo`, `app_liberado_em` to `brain.clientes`.

### Extension B — Legal tickets (Session 03)

```sql
create table if not exists brain.juridico_tickets (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references brain.tenants(id),
  cliente_id uuid not null references brain.clientes(id),
  status text not null check (status in ('pendente','respondido')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brain.juridico_ticket_mensagens (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references brain.tenants(id),
  ticket_id uuid not null references brain.juridico_tickets(id) on delete cascade,
  direction text not null check (direction in ('equipe','juridico')),
  body text not null,
  created_by uuid references brain.equipe(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_juridico_tickets_tenant_status
  on brain.juridico_tickets (tenancy_id, status, last_message_at desc);
create index if not exists idx_juridico_ticket_msgs_ticket_time
  on brain.juridico_ticket_mensagens (ticket_id, created_at asc);
```

### Extension C — IP blacklist (Session 06)

```sql
create table if not exists brain.ip_blacklist (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references brain.tenants(id),
  ip text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (tenancy_id, ip)
);
```

---

# SECTION 7 — Views (Authoritative List)

> Views are used to serve the Kanban boards and “customer full card”.



<!-- ======================= BEGIN_VIEW: brain.view_clientes_kanban ======================= -->
## View: `brain.view_clientes_kanban`

**Purpose:** (not specified)

### Columns
| Column | Type | Description |
|---|---|---|
| `tenancy_id` | `uuid` |  |
| `cliente_id` | `uuid` |  |
| `nome_completo` | `text` |  |
| `cpf` | `char(11)` |  |
| `telefone` | `text` |  |
| `email` | `text` |  |
| `kanban_lane` | `enum` | documentacao_pendente | documentacao_enviada | em_dia | provas | inadimplentes |

### Usage in the Frontend
- Used by **Session 01 (Customers)** to render the main Kanban board.
- The column `kanban_lane` drives the lane assignment.

<!-- ======================== END_VIEW: brain.view_clientes_kanban ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_kidneys_cobrancas ======================= -->
## View: `brain.view_kidneys_cobrancas`

**Purpose:** serve para visão central das cobranças (cards do Kanban de cobrança) com contexto do cliente e do dono.

### Columns
| Column | Type | Description |
|---|---|---|
| `tenancy_id` | `uuid` |  |
| `cobranca_id` | `uuid` |  |
| `cliente_id` | `uuid` |  |
| `cliente_nome` | `text` |  |
| `processo_id` | `uuid` |  |
| `status_kanban` | `enum kidneys.kanban_cobranca` |  |
| `prioridade` | `enum kidneys.prioridade` |  |
| `owner_user_id` | `uuid` |  |
| `owner_user_name` | `text` |  |
| `origem_schema` | `text` |  |
| `origem_lungs_coluna` | `text` |  |
| `origem_view_ou_regra` | `text` |  |
| `valor_minimo_sugerido` | `numeric(12,2)` |  |
| `valor_negociado` | `numeric(12,2)` |  |
| `desconto_percentual` | `numeric(5,2)` |  |
| `ultima_comunicacao_em` | `timestamptz` |  |
| `proxima_acao_em` | `timestamptz` |  |
| `proxima_acao_nota` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

### Usage in the Frontend
- (Define per UI need.)

<!-- ======================== END_VIEW: brain.view_kidneys_cobrancas ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_kidneys_mensagens ======================= -->
## View: `brain.view_kidneys_mensagens`

**Purpose:** serve para o log canônico de conversas de cobrança (WhatsApp, SMS, e-mail) com resumo suficiente para BI/auditoria.

### Columns
| Column | Type | Description |
|---|---|---|
| `tenancy_id` | `uuid` |  |
| `mensagem_id` | `uuid` |  |
| `cobranca_id` | `uuid` |  |
| `cliente_id` | `uuid` |  |
| `cliente_nome` | `text` |  |
| `canal` | `enum kidneys.message_channel` |  |
| `direction` | `enum brain.chat_direction` |  |
| `author_user_id` | `uuid` |  |
| `author_user_name` | `text` |  |
| `sender_address` | `text` |  |
| `recipient_address` | `text` |  |
| `thread_key` | `text` |  |
| `provider` | `text` |  |
| `provider_msg_id` | `text` |  |
| `status` | `enum kidneys.message_status` |  |
| `subject` | `text` |  |
| `body_text` | `text` |  |
| `body_html_presente` | `boolean` |  |
| `attachment_count` | `integer` |  |
| `bloqueado_por_optout` | `boolean` |  |
| `bloqueio_motivo` | `text` |  |
| `enviado_em` | `timestamptz` |  |
| `entregue_em` | `timestamptz` |  |
| `lido_em` | `timestamptz` |  |
| `recebido_em` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

### Usage in the Frontend
- (Define per UI need.)

<!-- ======================== END_VIEW: brain.view_kidneys_mensagens ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_ kidneys_provider_events ======================= -->
## View: `brain.view_ kidneys_provider_events`

**Purpose:** serve para forense e rastreabilidade dos webhooks (brutos) recebidos dos provedores, correlacionados à mensagem.

### Columns
| Column | Type | Description |
|---|---|---|
| `tenancy_id` | `uuid` |  |
| `event_id` | `uuid` |  |
| `canal` | `enum kidneys.message_channel` |  |
| `provider` | `text` |  |
| `provider_event` | `text` |  |
| `provider_msg_id` | `text` |  |
| `mensagem_id` | `uuid` |  |
| `mensagem_status_atual` | `enum kidneys.message_status` |  |
| `thread_key` | `text` |  |
| `ocorreu_em` | `timestamptz` |  |
| `recebido_em` | `timestamptz` |  |
| `payload_bruto` | `jsonb` |  |
| `observacoes` | `text` |  |

### Usage in the Frontend
- (Define per UI need.)

<!-- ======================== END_VIEW: brain.view_ kidneys_provider_events ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_kidneys_ligacoes ======================= -->
## View: `brain.view_kidneys_ligacoes`

**Purpose:** serve para listar ligações do BRAIN que estejam vinculadas a cards de cobrança no KIDNEYS.

### Columns
| Column | Type | Description |
|---|---|---|
| `tenancy_id` | `uuid` |  |
| `cobranca_id` | `uuid` |  |
| `ligacao_id` | `uuid` |  |
| `cliente_id` | `uuid` |  |
| `cliente_nome` | `text` |  |
| `agente_user_id` | `uuid` |  |
| `agente_display_name` | `text` |  |
| `direction` | `enum brain.chat_direction` |  |
| `numero_origem_e164` | `text` |  |
| `numero_destino_e164` | `text` |  |
| `provider` | `text` |  |
| `provider_call_id` | `text` |  |
| `status` | `enum brain.call_status` |  |
| `gravacao_arquivo_id` | `uuid` |  |
| `observado_em` | `timestamptz` |  |
| `iniciado_em` | `timestamptz` |  |
| `encerrado_em` | `timestamptz` |  |
| `vinculo_id` | `uuid` |  |
| `vinculado_por_user_id` | `uuid` |  |
| `vinculado_por_display_name` | `text` |  |
| `vinculo_origin` | `text` |  |
| `vinculado_em` | `timestamptz` |  |

### Usage in the Frontend
- (Define per UI need.)

<!-- ======================== END_VIEW: brain.view_kidneys_ligacoes ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_kidneys_acordos ======================= -->
## View: `brain.view_kidneys_acordos`

**Purpose:** serve para acompanhar acordos de cobrança e seu vínculo financeiro no BRAIN.

### Columns
| Column | Type | Description |
|---|---|---|
| `tenancy_id` | `uuid` |  |
| `acordo_id` | `uuid` |  |
| `cobranca_id` | `uuid` |  |
| `cliente_id` | `uuid` |  |
| `status` | `enum kidneys.acordo_status` |  |
| `metodo_pagamento` | `enum brain.payment_method` |  |
| `entrada_valor` | `numeric(12,2)` |  |
| `parcelas_qtd` | `integer` |  |
| `valor_total` | `numeric(12,2)` |  |
| `desconto_percentual` | `numeric(5,2)` |  |
| `assinado_em` | `timestamptz` |  |
| `contrato_id` | `uuid` |  |
| `contrato_criado_em` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

### Usage in the Frontend
- (Define per UI need.)

<!-- ======================== END_VIEW: brain.view_kidneys_acordos ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_kidneys_promessas_pagamentos ======================= -->
## View: `brain.view_kidneys_promessas_pagamentos`

**Purpose:** serve para BI das promessas de pagamento (PTP) por cliente/cobrança.

### Columns
| Column | Type | Description |
|---|---|---|
| `tenancy_id` | `uuid` |  |
| `promessa_id` | `uuid` |  |
| `cobranca_id` | `uuid` |  |
| `cliente_id` | `uuid` |  |
| `valor_prometido` | `numeric(12,2)` |  |
| `vence_em` | `date` |  |
| `status` | `text ou enum kidneys.ptp_status` |  |
| `cumprida_em` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

### Usage in the Frontend
- (Define per UI need.)

<!-- ======================== END_VIEW: brain.view_kidneys_promessas_pagamentos ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_cliente_full ======================= -->
## View: `brain.view_cliente_full`

**Purpose:** composição única cliente + endereço + perfil + despesas + documentos + financeiro.

### Columns
| Column | Type | Description |
|---|---|---|
| `tenancy_id` | `uuid` |  |
| `cliente_id` | `uuid` |  |
| `despesas` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

### Usage in the Frontend
- Used when opening a customer card to load the complete dataset.
- Recommended: keep timelines paginated via separate queries/RPC for performance.

<!-- ======================== END_VIEW: brain.view_cliente_full ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_pagamentos_confirmados ======================= -->
## View: `brain.view_pagamentos_confirmados`

**Purpose:** dataset para telas do app e BI.

### Columns
| Column | Type | Description |
|---|---|---|
| `cliente_id` | `uuid` |  |
| `parcela_id` | `uuid` |  |
| `parcela_numero` | `integer` |  |
| `confirmado_em` | `timestamptz` |  |
| `metodo_pagamento` | `enum brain.payment_method` |  |
| `valor_liquido` | `numeric(12,2)` |  |

### Usage in the Frontend
- Used for BI/app screens: confirmed payments dataset.

<!-- ======================== END_VIEW: brain.view_pagamentos_confirmados ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_inadimplencia_2plus ======================= -->
## View: `brain.view_inadimplencia_2plus`

**Purpose:** identifica clientes com 2+ parcelas vencidas.

### Columns
| Column | Type | Description |
|---|---|---|
| `tenancy_id` | `uuid` |  |
| `cliente_id` | `uuid` |  |
| `qtd_vencidas` | `integer` |  |
| `valor_total_em_atraso` | `numeric(12,2)` |  |
| `ultima_vencida_em` | `date` |  |

### Usage in the Frontend
- Used to identify customers with 2+ overdue installments.

<!-- ======================== END_VIEW: brain.view_inadimplencia_2plus ======================== -->


<!-- ======================= BEGIN_VIEW: brain.view_comissoes ======================= -->
## View: `brain.view_comissoes`

**Purpose:** visão detalhada das comissões de vendedores por contrato, cliente e períodos de referência (assinatura e primeiro pagamento), usada para BI e relatórios de performance comercial.

### Columns
| Column | Type | Description |
|---|---|---|
| `id` | `mesmo id de heart.comissoes.id) (uuid, not null` | id da comissão |
| `tenancy_id` | `uuid, not null` | empresa dona do registro |
| `comissao_status` | `heart.comissao_status: prevista, paga, cancelada` | status da comissão |
| `base_calculo` | `numeric` | valor efetivo da primeira parcela que gerou a comissão |
| `percentual` | `numeric` | percentual de comissão aplicado ao vendedor |
| `valor_comissao` | `base_calculo × percentual) (numeric` | valor final da comissão |
| `competencia_assinatura` | `date` | mês de referência da assinatura do contrato |
| `competencia_pagamento` | `date` | mês de referência do primeiro pagamento do contrato |
| `deal_id` | `uuid` | negócio/venda de origem no HEART |
| `contrato_id` | `uuid` | contrato correspondente no BRAIN |
| `cliente_id` | `uuid` | cliente associado ao contrato |
| `vendedor_id` | `uuid` | vendedor/closer responsável pela venda |
| `cliente_nome` | `text` | nome do cliente |
| `vendedor_nome` | `text` | nome do vendedor |
| `servico` | `text` | nome/tipo do serviço contratado |
| `data_assinatura` | `timestamp/date` | data em que o contrato foi assinado |
| `data_primeiro_pagamento` | `timestamp/date` | data em que o primeiro pagamento foi registrado |
| `primeira_parcela_numero` | `normalmente 1) (integer` | número da parcela que gerou a comissão |
| `primeira_parcela_valor` | `planejado/original) no contrato (numeric` | valor da primeira parcela |
| `primeira_parcela_pago_em` | `timestamp/date` | data em que a primeira parcela foi paga |
| `created_at` | `timestamptz` | data/hora de criação do registro no BRAIN |
| `updated_at` | `timestamptz` | data/hora da última atualização da visão/materialização |

### Usage in the Frontend
- Used for sales performance reports.

<!-- ======================== END_VIEW: brain.view_comissoes ======================== -->


## 7.1 Cross-Schema Views (Kidneys/Heart) — Optional for MVP

The blueprint references some views that depend on external schemas (`kidneys`, `heart`).
For the MVP you have two strategies:

- **Strategy 1 (recommended for speed):** Do not implement them; implement only the `brain.*` views required by the Admin UI.
- **Strategy 2 (future-proof):** Create stub schemas/tables/views so the SQL compiles and you can simulate cross-system joins.

---

# SECTION 8 — Enums (Authoritative List)

> These are the enum values defined for the `brain` schema.  
> Keep them stable because the frontend will depend on them.



<!-- ======================= BEGIN_ENUM: brain.user_role ======================= -->
## Enum: `brain.user_role`

**Values:**

- `admin`
- `vendas`
- `juridico`
- `cobranca`
- `suporte`

<!-- ======================== END_ENUM: brain.user_role ======================== -->


<!-- ======================= BEGIN_ENUM: brain.payment_status ======================= -->
## Enum: `brain.payment_status`

**Values:**

- `aguardando`
- `em_dia`
- `inadimplente`
- `cancelado`

<!-- ======================== END_ENUM: brain.payment_status ======================== -->


<!-- ======================= BEGIN_ENUM: brain.payment_method ======================= -->
## Enum: `brain.payment_method`

**Values:**

- `pix`
- `boleto`
- `cartao`
- `debito_automatico`
- `transferencia`

<!-- ======================== END_ENUM: brain.payment_method ======================== -->


<!-- ======================= BEGIN_ENUM: brain.payment_tx_status ======================= -->
## Enum: `brain.payment_tx_status`

**Values:**

- `pendente`
- `autorizado`
- `confirmado`
- `falhado`
- `estornado`

<!-- ======================== END_ENUM: brain.payment_tx_status ======================== -->


<!-- ======================= BEGIN_ENUM: brain.legal_case_type ======================= -->
## Enum: `brain.legal_case_type`

**Values:**

- `super_endividamento`
- `rmc`
- `cobranca`

<!-- ======================== END_ENUM: brain.legal_case_type ======================== -->


<!-- ======================= BEGIN_ENUM: brain.chat_direction ======================= -->
## Enum: `brain.chat_direction`

**Values:**

- `cliente`
- `equipe`

<!-- ======================== END_ENUM: brain.chat_direction ======================== -->


<!-- ======================= BEGIN_ENUM: brain.call_status ======================= -->
## Enum: `brain.call_status`

**Values:**

- `iniciado`
- `tocando`
- `em_andamento`
- `completada`
- `falhou`
- `cancelado`

<!-- ======================== END_ENUM: brain.call_status ======================== -->


<!-- ======================= BEGIN_ENUM: brain.call_result ======================= -->
## Enum: `brain.call_result`

**Values:**

- `sem_resposta`
- `ocupado`
- `numero_invalido`
- `atendeu_cliente`
- `atendeu_terceiro`
- `recusou`
- `prometeu_pagar`
- `solicitou_boleto`
- `solicitou_pausa`
- `outro`

<!-- ======================== END_ENUM: brain.call_result ======================== -->


<!-- ======================= BEGIN_ENUM: brain.fonte_cadastro ======================= -->
## Enum: `brain.fonte_cadastro`

**Values:**

- `crm`
- `importacao`
- `site`
- `manual`

<!-- ======================== END_ENUM: brain.fonte_cadastro ======================== -->


<!-- ======================= BEGIN_ENUM: brain.contract_finalidade ======================= -->
## Enum: `brain.contract_finalidade`

**Values:**

- `super_endividamento`
- `rmc`
- `cobranca`
- `consultoria`
- `outro`

<!-- ======================== END_ENUM: brain.contract_finalidade ======================== -->


<!-- ======================= BEGIN_ENUM: brain.doc_tipo ======================= -->
## Enum: `brain.doc_tipo`

**Values:**

- `rg_frente`
- `rg_verso`
- `cnh`
- `comprovante`
- `contracheque`
- `extrato`
- `registrato`
- `assinatura`
- `audio`
- `contrato`

<!-- ======================== END_ENUM: brain.doc_tipo ======================== -->


<!-- ======================= BEGIN_ENUM: brain.doc_status ======================= -->
## Enum: `brain.doc_status`

**Values:**

- `pendente`
- `enviado`
- `aprovado`
- `rejeitado`

<!-- ======================== END_ENUM: brain.doc_status ======================== -->


<!-- ======================= BEGIN_ENUM: brain.processo_etapa ======================= -->
## Enum: `brain.processo_etapa`

**Values:**

- `aberto`
- `agendado`
- `concluido`
- `adiado`
- `cancelado`

<!-- ======================== END_ENUM: brain.processo_etapa ======================== -->


<!-- ======================= BEGIN_ENUM: brain.juridico_evento_tipo ======================= -->
## Enum: `brain.juridico_evento_tipo`

**Values:**

- `distribuicao`
- `prova`
- `pergunta`
- `resposta`
- `audiencia`
- `adiamento`
- `cancelamento`
- `decisao`
- `documento_pendente`
- `sentença`
- `transito_julgado`
- `outro`

**Note:** Some values include accents/case. For production stability, consider normalizing enum values to lowercase ASCII (e.g., `cobranca` instead of `cobrança`).

<!-- ======================== END_ENUM: brain.juridico_evento_tipo ======================== -->


<!-- ======================= BEGIN_ENUM: brain.evento_status ======================= -->
## Enum: `brain.evento_status`

**Values:**

- `aberto`
- `agendado`
- `confirmado`
- `adiado`
- `cancelado`
- `concluido`

<!-- ======================== END_ENUM: brain.evento_status ======================== -->


<!-- ======================= BEGIN_ENUM: brain.estado_civil ======================= -->
## Enum: `brain.estado_civil`

**Values:**

- `solteiro`
- `casado`
- `divorciado`
- `separado`
- `viuvo`
- `uniao_estavel`
- `outro`

<!-- ======================== END_ENUM: brain.estado_civil ======================== -->


<!-- ======================= BEGIN_ENUM: brain.situacao_ocupacional ======================= -->
## Enum: `brain.situacao_ocupacional`

**Values:**

- `empregado`
- `autonomo`
- `servidor_publico`
- `aposentado`
- `afastado`
- `desempregado`
- `estudante`
- `outro`

<!-- ======================== END_ENUM: brain.situacao_ocupacional ======================== -->


<!-- ======================= BEGIN_ENUM: brain.vulnerabilidade ======================= -->
## Enum: `brain.vulnerabilidade`

**Values:**

- `idoso`
- `pcd`
- `gestante`
- `desempregado_longo_prazo`
- `mae_solo`
- `baixa_renda`
- `doenca_grave`
- `outro`

<!-- ======================== END_ENUM: brain.vulnerabilidade ======================== -->


<!-- ======================= BEGIN_ENUM: brain.escolaridade ======================= -->
## Enum: `brain.escolaridade`

**Values:**

- `fundamental_incompleto`
- `fundamental_completo`
- `medio_incompleto`
- `medio_completo`
- `superior_incompleto`
- `superior_completo`
- `pos_graduacao`
- `mestrado`
- `doutorado`

<!-- ======================== END_ENUM: brain.escolaridade ======================== -->


<!-- ======================= BEGIN_ENUM: brain.faixa_renda ======================= -->
## Enum: `brain.faixa_renda`

**Values:**

- `ate_1sm`
- `de_1a2sm`
- `de_2a3sm`
- `de_3a5sm`
- `de_5a10sm`
- `acima_10sm`

<!-- ======================== END_ENUM: brain.faixa_renda ======================== -->


<!-- ======================= BEGIN_ENUM: brain.faixa_renda_familiar ======================= -->
## Enum: `brain.faixa_renda_familiar`

**Values:**

- `ate_1sm`
- `de_1a2sm`
- `de_2a3sm`
- `de_3a5sm`
- `de_5a10sm`
- `acima_10sm`

<!-- ======================== END_ENUM: brain.faixa_renda_familiar ======================== -->


<!-- ======================= BEGIN_ENUM: brain.cliente_kanban_lane ======================= -->
## Enum: `brain.cliente_kanban_lane`

**Values:**

- `documentacao_pendente`
- `documentacao_enviada`
- `em_dia`
- `provas`
- `inadimplentes`

<!-- ======================== END_ENUM: brain.cliente_kanban_lane ======================== -->


<!-- ======================= BEGIN_ENUM: brain.contexto_negocio ======================= -->
## Enum: `brain.contexto_negocio`

**Values:**

- `Vendas`
- `cobrança`
- `suporte`
- `outro`

**Note:** Some values include accents/case. For production stability, consider normalizing enum values to lowercase ASCII (e.g., `cobranca` instead of `cobrança`).

<!-- ======================== END_ENUM: brain.contexto_negocio ======================== -->


---

# SECTION 9 — Storage (Buckets, Paths, and Policies)

## 9.1 Storage Principles

- Use Supabase Storage **locally** (CLI) exactly like production.
- **Do not** rely on Docker internal paths.
- Every uploaded object MUST be indexed in `brain.arquivos` with:
  - `tenancy_id`,
  - optional `cliente_id`,
  - `storage_path`,
  - metadata (mime, size).

## 9.2 Bucket Strategy (MVP)

You can implement one bucket or multiple. Recommended:

- Bucket `brain-private` (private) for everything in MVP.
  - Path convention:
    - `tenants/{tenancy_id}/clientes/{cliente_id}/{arquivo_id}/{original_filename}`
    - `tenants/{tenancy_id}/threads/{thread_id}/{message_id}/{filename}`
    - `tenants/{tenancy_id}/calls/{ligacao_id}/{filename}`

Alternative: split buckets (`clientes`, `chat`, `calls`) later.

## 9.3 Storage Access Control

**MUST:** enforce that users can only read/write objects for their `tenancy_id`.

Approach:
1) Put `tenancy_id` as the **first path segment**.
2) Use RLS on `storage.objects` to enforce path prefixes.

Example policy idea (adjust to your naming):

```sql
-- PSEUDO: check that object name starts with "tenants/<tenant_id>/"
-- Implementation depends on your exact path rules.
```

---

# SECTION 10 — Security Model (Auth, RLS, Roles)

## 10.1 Roles

Enum: `brain.user_role` includes:
- admin
- vendas (sales)
- juridico (legal)
- cobranca (billing/collections)
- suporte (support)

## 10.2 Core RLS Rule (Tenant Isolation)

**Rule:** an authenticated user can only access rows where:

`row.tenancy_id == (select tenancy_id from brain.equipe where auth_user_id = auth.uid())`

### Recommended helper functions

```sql
create or replace function brain.current_tenancy_id()
returns uuid
language sql stable as $$
  select e.tenancy_id
  from brain.equipe e
  where e.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function brain.current_user_role()
returns text
language sql stable as $$
  select e.role::text
  from brain.equipe e
  where e.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function brain.is_admin()
returns boolean
language sql stable as $$
  select brain.current_user_role() = 'admin'
$$;
```

## 10.3 Policy Template (Apply to most tables)

```sql
alter table brain.<table> enable row level security;

create policy "tenant_read"
on brain.<table>
for select
to authenticated
using (tenancy_id = brain.current_tenancy_id());

create policy "tenant_write"
on brain.<table>
for insert
to authenticated
with check (tenancy_id = brain.current_tenancy_id());
```

Then add role-based restrictions where needed (e.g., team management).

## 10.4 Team Management Policies (Admin-only)

For `brain.equipe`:
- Admin can select/insert/update
- Non-admin can select **only themselves** (or just enough to know role/name/status)

---

# SECTION 11 — Local BFF Microservice (Option B)

## 11.1 BFF Responsibilities (MVP)

The BFF replaces Edge Functions and MUST handle privileged operations:

1) **Invite/create users** in Supabase Auth (admin API).
2) **Disable/fire users** (Auth admin + blacklist).
3) **Send emails** via SMTP (local Inbucket), then store the record in `brain.emails_mensagens`.
4) **Export chat transcript** to a TXT file for download.

## 11.2 Security Between Frontend and BFF

Even locally, follow good patterns:

- Frontend sends `Authorization: Bearer <supabase_access_token>`
- BFF validates token by calling Supabase Auth (`getUser`).
- BFF loads `brain.equipe` for that user to check:
  - `tenancy_id`,
  - `role`,
  - status.

Then BFF authorizes each endpoint.

## 11.3 Minimal Endpoints (Spec)

> Delimiter format: `BEGIN_BFF_ENDPOINT` / `END_BFF_ENDPOINT`

### Endpoint: Invite user (Admin only)

<!-- BEGIN_BFF_ENDPOINT: POST /admin/invite -->
- Method: `POST`
- Path: `/admin/invite`
- Auth: `Authorization: Bearer <token>` (MUST be admin)
- Body JSON:
  ```json
  {
    "tenancy_id": "uuid",
    "full_name": "Jane Doe",
    "email": "jane@company.com",
    "role": "vendas"
  }
  ```
- Actions:
  1) Create Auth user (invite / create) using **service role**
  2) Insert row into `brain.equipe` with:
     - `tenancy_id`,
     - `auth_user_id`,
     - `full_name`,
     - `email`,
     - `role`,
     - initial `status = 'pendente'`
  3) Insert audit record in `brain.logs`
- Response:
  ```json
  { "ok": true, "auth_user_id": "uuid", "equipe_id": "uuid" }
  ```
<!-- END_BFF_ENDPOINT -->

### Endpoint: Disable user (Admin only)

<!-- BEGIN_BFF_ENDPOINT: POST /admin/disable -->
- Method: `POST`
- Path: `/admin/disable`
- Body JSON:
  ```json
  { "auth_user_id": "uuid", "reason": "terminated" }
  ```
- Actions:
  - disable user in Auth
  - update `brain.equipe` status
  - optional: insert IP to `brain.ip_blacklist`
  - log in `brain.logs`
<!-- END_BFF_ENDPOINT -->

### Endpoint: Send email (Role-based)

<!-- BEGIN_BFF_ENDPOINT: POST /mail/send -->
- Method: `POST`
- Path: `/mail/send`
- Body JSON:
  ```json
  {
    "cliente_id": "uuid",
    "to": "customer@email.com",
    "subject": "Subject",
    "body_text": "Plain text",
    "body_html": "<p>HTML</p>"
  }
  ```
- Actions:
  - send via SMTP (Inbucket in local)
  - insert into `brain.emails_mensagens`
  - insert into `brain.logs`
<!-- END_BFF_ENDPOINT -->

### Endpoint: Export chat transcript TXT

<!-- BEGIN_BFF_ENDPOINT: GET /chat/:thread_id/export.txt -->
- Method: `GET`
- Path: `/chat/{thread_id}/export.txt`
- Action:
  - load messages from `brain.chat_mensagens`
  - format into TXT
  - return as downloadable `text/plain`
<!-- END_BFF_ENDPOINT -->

## 11.4 Implementation Notes (Node.js)

- Use Fastify or Express.
- Use `@supabase/supabase-js` with the **service role key**.
- Do NOT persist sessions in the BFF.

---

# SECTION 12 — Frontend (Vite Admin UI)

## 12.1 Tech Stack

- Vite + TypeScript
- UI framework of your choice (React recommended)
- `@supabase/supabase-js`
- Realtime subscriptions for:
  - `brain.chat_mensagens`
  - `brain.juridico_ticket_mensagens` (if implemented)
  - `brain.logs` (optional)

## 12.2 Sessions and Data Mapping

### Session 00 — Login

- Use email/password login.
- After login, query:
  - `brain.equipe` by `auth_user_id = auth.uid()`
- Use `role` + `tenancy_id` to gate routes.

### Session 01 — Customers (Main Kanban)

- Load Kanban board from `brain.view_clientes_kanban`
- Open customer card:
  - load from `brain.view_cliente_full` (or individual tables)
- Timeline:
  - `brain.logs` filtered by `cliente_id` with infinite scroll
- Document review:
  - update `brain.documentos_do_cliente` status
  - store attachments in Storage + `brain.arquivos`

### Session 02 — App Access (Kanban)

- Use `brain.cliente_app` (recommended) or `brain.clientes.app_status`
- Lanes:
  - pending / allowed / blocked
- Allow manual override (fallback).

### Session 03 — Legal (Ticket-like)

- Use `brain.juridico_tickets` + `brain.juridico_ticket_mensagens`
- Kanban columns:
  - Pending
  - Answered
- Show toast + sound notification on legal replies.

### Session 04 — Support (Chat + Emails)

Chat:
- Left pane: threads (`brain.chat_threads`)
- Main pane: messages (`brain.chat_mensagens`)
- Export TXT via BFF endpoint.

Emails:
- Templates: `brain.emails_templates`
- Messages log: `brain.emails_mensagens`
- Send email via BFF endpoint (`/mail/send`)
- Record result in logs & show toast.

### Session 05 — Logs

- Show global list from `brain.logs`:
  - columns: Action, Responsible, Description, Timestamp

### Session 06 — Team

- Admin-only.
- List from `brain.equipe` (with online/offline/pendente)
- Invite via BFF (`/admin/invite`)
- Disable/fire via BFF (`/admin/disable`)
- Optional: store IP + geo data on first login (MVP can mock).

---

# SECTION 13 — Seed Data Strategy (Local MVP)

## 13.1 What to Seed

- 1–2 tenants
- 5–50 customers per tenant
- Contracts, installments, payments
- Some documents with status variations
- Some chats + messages
- Some legal processes/events (optional)
- Some logs

## 13.2 Deterministic Seed

Make seed deterministic so the UI always has:
- customers in each Kanban lane
- at least one customer with 2+ overdue installments
- at least one customer with pending docs
- at least one customer with a legal ticket

---

# SECTION 14 — Testing Checklist (Manual)

## 14.1 Security (RLS)

- [ ] User A cannot see tenant B customers.
- [ ] Non-admin cannot access Team session.
- [ ] Storage access is tenant-scoped.

## 14.2 Functional

- [ ] Login works; role gating works.
- [ ] Customers Kanban loads; filters work.
- [ ] Customer card shows details; timeline scroll works.
- [ ] Document approve/reject updates Kanban lanes.
- [ ] App Access Kanban transitions work.
- [ ] Legal tickets: pending/answered logic works.
- [ ] Chat receives realtime messages and notifications.
- [ ] Email send via BFF is recorded; Inbucket shows the email.
- [ ] Export chat transcript downloads as TXT.
- [ ] Global logs list updates.

---

# SECTION 15 — Production Migration Notes (Future)

When moving from local MVP to production:

- Replace local Supabase URL/keys with production project keys.
- Deploy the BFF microservice to a real host, or later replace BFF endpoints with:
  - Supabase Edge Functions (if desired), or
  - a backend API in your infrastructure.
- Keep table names/enums stable.
- Ensure:
  - `robots.txt` disallows indexing
  - add `X-Robots-Tag: noindex, nofollow`
  - require Auth for all pages

---

# END OF FILE
