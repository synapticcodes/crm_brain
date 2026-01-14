# GEMINI.md — BRAIN CRM Local MVP

> **Context file for Gemini CLI**
> This is the complete context file for the BRAIN CRM Local MVP project. Gemini CLI loads context hierarchically (Global → Ancestors → Current → Children). Use `/memory show` to inspect what's loaded.

---

## How to Use This Context

### Context Loading
- **Gemini CLI** loads `.md` files automatically when you navigate directories
- **Hierarchy**: Global context → Ancestor directories → Current directory → Child directories
- **Commands**:
  - `/memory show` — View currently loaded context
  - `/memory refresh` — Reload context files
  - `/memory add <path>` — Explicitly add a file to context

### Ignoring Files
Create a `.geminiignore` file (same syntax as `.gitignore`) to exclude files/directories from context loading.

---

## Project Summary

**BRAIN CRM** is a local-first Supabase MVP for managing customers with signed contracts. It serves as the canonical administrative database with multi-tenant isolation, role-based access control, and comprehensive audit logging.

### Key Facts
- **Stack**: Supabase CLI (local Postgres + PostgREST + GoTrue + Storage + Realtime)
- **Multi-tenancy**: All tables have `tenancy_id` with Row Level Security (RLS)
- **BFF**: Local Node.js/TypeScript microservice (replaces Edge Functions) for privileged operations
- **Frontend**: Vite + TypeScript + React with 7 sessions (Login, Customers, App Access, Legal, Support, Logs, Team)
- **Database Language**: Portuguese identifiers (clientes, equipe, contratos) with English documentation
- **No Edge Functions**: Uses local BFF for auth admin, SMTP, file exports
- **Email**: Inbucket for local SMTP capture (http://localhost:54324)

### Architecture
```
Frontend (Vite+React)
    ↓ PostgREST + Realtime
Supabase Local (Postgres + GoTrue + Storage)
    ↓ privileged ops
BFF (Node.js/TypeScript)
    ↓ admin actions
Supabase Admin API + SMTP
```

---

## Quick Reference Commands

### Start Services
```bash
npx supabase start           # Start local Supabase stack
cd frontend && npm run dev   # Start frontend (port 5173)
cd bff && npm run dev        # Start BFF service (port 3000)
```

### Database Operations
```bash
npx supabase migration new <name>     # Create new migration
npx supabase db reset                 # Reset DB + apply migrations + seed
npx supabase db diff -f <name>        # Generate migration from schema changes
psql -h localhost -p 54322 -U postgres -d postgres  # Connect to local DB
```

### Testing
```bash
# RLS policies
psql -h localhost -p 54322 -U postgres -d postgres -c "SET ROLE authenticated; SET request.jwt.claims.sub TO '<user_uuid>'; SELECT * FROM brain.clientes;"

# Storage access
curl -H "Authorization: Bearer <anon_key>" http://localhost:54321/storage/v1/object/brain-private/<tenancy_id>/customers/<file>
```

---

## Repository Structure

### Project Root (/)
- **GEMINI.md** (this file) — Complete context for Gemini CLI
- **.geminiignore** — Exclude node_modules, .git, build outputs
- **supabase_brain.md** — Full specification blueprint (2284 lines)
- **AGENTS.md** — AI agent integration (agents.md standard)
- **CLAUDE.md** — Claude Code persistent context

### Supabase Directory (/supabase)
- **migrations/** — SQL migrations (numbered 20XX_*.sql)
- **seed.sql** — Seed data (run after migrations)
- **config.toml** — Supabase local config

### Frontend (/frontend)
- **src/sessions/** — 7 session components (Login, Customers, etc.)
- **src/lib/supabase.ts** — Supabase client singleton
- **src/types/** — TypeScript types matching DB schema

### BFF (/bff)
- **src/index.ts** — Express server entry point
- **src/routes/** — API endpoints (auth, export, smtp)
- **src/middleware/** — Auth, CORS, error handling

---

# Database Schema Reference

## Multi-Tenant Model

### Core Isolation Strategy
- **Every table** (except `auth.users`) MUST have a `tenancy_id UUID NOT NULL` column
- **Foreign keys** to `brain.tenancies(id)` with `ON DELETE CASCADE`
- **RLS policies** MUST filter by `tenancy_id = brain.current_tenancy_id()`
- **Helper functions**:
  ```sql
  brain.current_tenancy_id() → UUID
  brain.current_user_role() → TEXT
  brain.is_admin() → BOOLEAN
  ```

### Tenancy Table
```sql
CREATE TABLE brain.tenancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Core Tables (22 Total)

### 1. clientes (Customers)
```sql
CREATE TABLE brain.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES brain.tenancies(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  documento TEXT UNIQUE NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  contrato_assinado BOOLEAN DEFAULT FALSE,
  data_assinatura DATE,
  status brain.cliente_status DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clientes_tenancy ON brain.clientes(tenancy_id);
CREATE INDEX idx_clientes_status ON brain.clientes(status);
```

### 2. equipe (Team Members)
```sql
CREATE TABLE brain.equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES brain.tenancies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role brain.equipe_role NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_equipe_user_tenancy ON brain.equipe(user_id, tenancy_id);
```

### 3. contratos (Contracts)
```sql
CREATE TABLE brain.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES brain.tenancies(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  tipo_contrato brain.tipo_contrato NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor_total DECIMAL(15,2),
  status brain.contrato_status DEFAULT 'ativo',
  arquivo_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. acessos_aplicacoes (App Access)
```sql
CREATE TABLE brain.acessos_aplicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES brain.tenancies(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  aplicacao_id UUID NOT NULL REFERENCES brain.aplicacoes(id) ON DELETE CASCADE,
  login TEXT NOT NULL,
  senha_hash TEXT,
  url TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. documentos_legais (Legal Documents)
```sql
CREATE TABLE brain.documentos_legais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES brain.tenancies(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  tipo_documento brain.tipo_documento_legal NOT NULL,
  titulo TEXT NOT NULL,
  arquivo_storage_path TEXT NOT NULL,
  data_upload TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);
```

### 6. tickets_suporte (Support Tickets)
```sql
CREATE TABLE brain.tickets_suporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES brain.tenancies(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  prioridade brain.ticket_prioridade DEFAULT 'media',
  status brain.ticket_status DEFAULT 'aberto',
  categoria brain.ticket_categoria,
  atribuido_a UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolvido_at TIMESTAMPTZ
);
```

### 7. mensagens_chat (Chat Messages)
```sql
CREATE TABLE brain.mensagens_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES brain.tenancies(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES brain.tickets_suporte(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  tipo brain.mensagem_tipo DEFAULT 'texto',
  arquivo_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. logs_atividade (Activity Logs)
```sql
CREATE TABLE brain.logs_atividade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES brain.tenancies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  entidade brain.entidade_log NOT NULL,
  entidade_id UUID NOT NULL,
  acao brain.acao_log NOT NULL,
  detalhes JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_tenancy_entidade ON brain.logs_atividade(tenancy_id, entidade, entidade_id);
CREATE INDEX idx_logs_created_at ON brain.logs_atividade(created_at DESC);
```

### Other Tables (9-22)
- **aplicacoes**: Registry of third-party apps
- **tags_clientes**: Customer tags
- **tags**: Tag definitions
- **notificacoes**: User notifications
- **lembretes**: Reminders
- **historico_alteracoes**: Change history
- **relatorios_agendados**: Scheduled reports
- **configuracoes_email**: Email configs
- **integracao_logs**: Integration logs
- **auditoria_acessos**: Access audit trail

---

## Key Enums (20+ Total)

### Status Enums
```sql
CREATE TYPE brain.cliente_status AS ENUM ('ativo', 'inativo', 'suspenso', 'cancelado');
CREATE TYPE brain.contrato_status AS ENUM ('ativo', 'suspenso', 'cancelado', 'expirado');
CREATE TYPE brain.ticket_status AS ENUM ('aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado');
```

### Priority & Severity
```sql
CREATE TYPE brain.ticket_prioridade AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE brain.notificacao_prioridade AS ENUM ('baixa', 'normal', 'alta');
```

### Categories
```sql
CREATE TYPE brain.ticket_categoria AS ENUM ('tecnico', 'financeiro', 'suporte', 'outros');
CREATE TYPE brain.tipo_documento_legal AS ENUM ('contrato', 'termo', 'politica', 'outros');
CREATE TYPE brain.tipo_contrato AS ENUM ('servico', 'produto', 'licenca', 'outros');
```

### Actions & Types
```sql
CREATE TYPE brain.acao_log AS ENUM ('criar', 'atualizar', 'deletar', 'visualizar', 'exportar');
CREATE TYPE brain.entidade_log AS ENUM ('cliente', 'contrato', 'ticket', 'documento', 'equipe', 'outro');
CREATE TYPE brain.mensagem_tipo AS ENUM ('texto', 'arquivo', 'sistema');
CREATE TYPE brain.notificacao_tipo AS ENUM ('info', 'sucesso', 'aviso', 'erro');
```

### Roles
```sql
CREATE TYPE brain.equipe_role AS ENUM ('admin', 'gestor', 'atendente', 'visualizador');
```

---

## Key Views

### v_clientes_completo
```sql
CREATE VIEW brain.v_clientes_completo AS
SELECT
  c.*,
  COUNT(DISTINCT ct.id) AS total_contratos,
  COUNT(DISTINCT aa.id) AS total_acessos,
  COUNT(DISTINCT ts.id) AS total_tickets
FROM brain.clientes c
LEFT JOIN brain.contratos ct ON c.id = ct.cliente_id
LEFT JOIN brain.acessos_aplicacoes aa ON c.id = aa.cliente_id
LEFT JOIN brain.tickets_suporte ts ON c.id = ts.cliente_id
GROUP BY c.id;
```

### v_tickets_pendentes
```sql
CREATE VIEW brain.v_tickets_pendentes AS
SELECT
  ts.*,
  c.nome_completo AS cliente_nome,
  u.email AS atribuido_email
FROM brain.tickets_suporte ts
JOIN brain.clientes c ON ts.cliente_id = c.id
LEFT JOIN auth.users u ON ts.atribuido_a = u.id
WHERE ts.status IN ('aberto', 'em_andamento');
```

---

## Storage Strategy

### Bucket Configuration
- **Name**: `brain-private`
- **Public**: `FALSE`
- **Allowed MIME**: `image/*, application/pdf, application/vnd.*, text/*`
- **Max file size**: 10 MB (configurable)

### Path Convention
```
brain-private/
  {tenancy_id}/
    customers/
      {cliente_id}/
        {filename}
    contracts/
      {contrato_id}/
        {filename}
    legal/
      {documento_id}/
        {filename}
    tickets/
      {ticket_id}/
        {filename}
```

### RLS Policy Template
```sql
CREATE POLICY "Tenant isolation" ON storage.objects
FOR ALL USING (
  bucket_id = 'brain-private' AND
  (storage.foldername(name))[1] = brain.current_tenancy_id()::TEXT
);
```

---

## RLS Policy Templates

### Standard Read Policy
```sql
CREATE POLICY "Tenant members can read" ON brain.<table>
FOR SELECT USING (
  tenancy_id = brain.current_tenancy_id()
);
```

### Role-Based Write Policy
```sql
CREATE POLICY "Admin and gestor can insert" ON brain.<table>
FOR INSERT WITH CHECK (
  tenancy_id = brain.current_tenancy_id() AND
  brain.current_user_role() IN ('admin', 'gestor')
);
```

### Self-Update Policy
```sql
CREATE POLICY "Users can update own records" ON brain.<table>
FOR UPDATE USING (
  tenancy_id = brain.current_tenancy_id() AND
  user_id = auth.uid()
);
```

### Admin-Only Delete Policy
```sql
CREATE POLICY "Admin can delete" ON brain.<table>
FOR DELETE USING (
  tenancy_id = brain.current_tenancy_id() AND
  brain.is_admin()
);
```

---

## Database Functions

### Helper Functions
```sql
-- Get current tenant ID from JWT claim
CREATE FUNCTION brain.current_tenancy_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenancy_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$ LANGUAGE SQL STABLE;

-- Get current user role
CREATE FUNCTION brain.current_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM brain.equipe
  WHERE user_id = auth.uid()
    AND tenancy_id = brain.current_tenancy_id()
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Check if user is admin
CREATE FUNCTION brain.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM brain.equipe
    WHERE user_id = auth.uid()
      AND tenancy_id = brain.current_tenancy_id()
      AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE;
```

---

# Workflows & Procedures

## Workflow 1: Creating a New Migration

### Step 1: Create Migration File
```bash
npx supabase migration new <descriptive_name>
# Example: npx supabase migration new add_clientes_tags
```

### Step 2: Write SQL
Edit the generated file in `supabase/migrations/`:
```sql
-- Migration: add_clientes_tags
-- Description: Add tags support for customers

-- Create table
CREATE TABLE IF NOT EXISTS brain.tags_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES brain.tenancies(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES brain.clientes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES brain.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tags_clientes_tenancy ON brain.tags_clientes(tenancy_id);
CREATE INDEX idx_tags_clientes_cliente ON brain.tags_clientes(cliente_id);

-- Enable RLS
ALTER TABLE brain.tags_clientes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenant members can read tags" ON brain.tags_clientes
FOR SELECT USING (tenancy_id = brain.current_tenancy_id());

CREATE POLICY "Admin/gestor can manage tags" ON brain.tags_clientes
FOR ALL USING (
  tenancy_id = brain.current_tenancy_id() AND
  brain.current_user_role() IN ('admin', 'gestor')
);
```

### Step 3: Test Migration
```bash
npx supabase db reset  # Resets DB, applies all migrations, runs seed.sql
```

### Step 4: Verify
```bash
psql -h localhost -p 54322 -U postgres -d postgres
\dt brain.*  # List tables
\d brain.tags_clientes  # Describe table
```

---

## Workflow 2: Adding a New Enum

### Step 1: Create Migration
```bash
npx supabase migration new add_enum_<name>
```

### Step 2: Define Enum
```sql
-- Create enum
CREATE TYPE brain.ticket_prioridade AS ENUM ('baixa', 'media', 'alta', 'critica');

-- Use in table
ALTER TABLE brain.tickets_suporte
ADD COLUMN prioridade brain.ticket_prioridade DEFAULT 'media';
```

### Step 3: Update TypeScript Types
Edit `frontend/src/types/database.ts`:
```typescript
export type TicketPrioridade = 'baixa' | 'media' | 'alta' | 'critica';

export interface TicketSuporte {
  id: string;
  prioridade: TicketPrioridade;
  // ... other fields
}
```

---

## Workflow 3: Implementing a New Session

### Step 1: Create Component
Create `frontend/src/sessions/NewSession.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function NewSession() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setData(data);
  }

  return (
    <div>
      <h1>New Session</h1>
      {/* Render data */}
    </div>
  );
}
```

### Step 2: Add Route
Edit `frontend/src/App.tsx`:
```typescript
import NewSession from './sessions/NewSession';

// Add to routes
<Route path="/new-session" element={<NewSession />} />
```

---

## Workflow 4: Adding a BFF Endpoint

### Step 1: Create Route Handler
Create `bff/src/routes/newFeature.ts`:
```typescript
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.post('/new-feature', async (req, res) => {
  try {
    const { param1, param2 } = req.body;

    // Validate input
    if (!param1) {
      return res.status(400).json({ error: 'param1 is required' });
    }

    // Perform privileged operation
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .insert({ param1, param2 });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Step 2: Register Route
Edit `bff/src/index.ts`:
```typescript
import newFeatureRouter from './routes/newFeature';

app.use('/api/new-feature', newFeatureRouter);
```

---

## Workflow 5: Setting Up Realtime Subscriptions

### Step 1: Enable Realtime on Table
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE brain.mensagens_chat;
```

### Step 2: Subscribe in Frontend
```typescript
useEffect(() => {
  const channel = supabase
    .channel('chat-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'brain',
        table: 'mensagens_chat',
        filter: `ticket_id=eq.${ticketId}`
      },
      (payload) => {
        console.log('New message:', payload.new);
        setMessages(prev => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [ticketId]);
```

---

## Workflow 6: Testing RLS Policies

### Step 1: Connect as Test User
```bash
psql -h localhost -p 54322 -U postgres -d postgres
```

### Step 2: Set JWT Claims
```sql
-- Set user context
SET ROLE authenticated;
SET request.jwt.claims.sub TO '<user_uuid>';
SET request.jwt.claims.tenancy_id TO '<tenancy_uuid>';
```

### Step 3: Test Queries
```sql
-- Should return only tenant's data
SELECT * FROM brain.clientes;

-- Should fail if user is not admin
DELETE FROM brain.clientes WHERE id = '<some_id>';
```

### Step 4: Reset
```sql
RESET ROLE;
```

---

## Workflow 7: Git Commit Messages

### Standard Format
```
<type>(<scope>): <subject>

<body>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **refactor**: Code refactoring
- **docs**: Documentation only
- **test**: Adding tests
- **chore**: Build/config changes

### Examples
```bash
# Feature
git commit -m "feat(clientes): add tags support for customer categorization"

# Bug fix
git commit -m "fix(rls): correct tenancy_id filter in tickets policy"

# Migration
git commit -m "feat(db): add tags_clientes table and RLS policies"
```

---

# Coding & Architecture Standards

## Database Standards

### Table Naming
- **MUST** use Portuguese nouns in plural (e.g., `clientes`, `contratos`, `equipe`)
- **MUST** use snake_case for all identifiers
- **MUST** prefix all tables with `brain.` schema
- **MUST NOT** use abbreviations (use `documentos_legais`, not `docs_leg`)

### Column Naming
- **MUST** use Portuguese for column names (e.g., `nome_completo`, `data_assinatura`)
- **MUST** include `tenancy_id UUID NOT NULL` on every table (except `auth.users`)
- **MUST** use `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` for primary keys
- **MUST** use `created_at TIMESTAMPTZ DEFAULT NOW()` for creation timestamp
- **MUST** use `updated_at TIMESTAMPTZ DEFAULT NOW()` for update timestamp (if needed)
- **SHOULD** use `ativo BOOLEAN DEFAULT TRUE` for soft deletes

### Enum Standards
- **MUST** use Portuguese values (e.g., `'ativo'`, `'inativo'`)
- **MUST** use snake_case for enum values
- **MUST** prefix enum types with `brain.` (e.g., `brain.cliente_status`)
- **SHOULD** include a catch-all value like `'outros'` when appropriate

### Foreign Key Standards
- **MUST** use `ON DELETE CASCADE` for hard dependencies
- **MUST** use `ON DELETE SET NULL` for optional references
- **MUST** create indexes on foreign key columns
- **SHOULD** name foreign keys descriptively (e.g., `cliente_id`, not `id_cliente`)

### Index Standards
- **MUST** create indexes on `tenancy_id` for all multi-tenant tables
- **MUST** create indexes on foreign keys
- **SHOULD** create composite indexes for common query patterns
- **MUST** use prefix `idx_` for index names (e.g., `idx_clientes_tenancy`)

### RLS Standards
- **MUST** enable RLS on all tables: `ALTER TABLE brain.* ENABLE ROW LEVEL SECURITY;`
- **MUST** create at least one SELECT policy (read access)
- **MUST** filter by `tenancy_id = brain.current_tenancy_id()` in all policies
- **SHOULD** create separate policies for different operations (SELECT, INSERT, UPDATE, DELETE)
- **SHOULD** use role-based policies: `brain.current_user_role() IN ('admin', 'gestor')`
- **MUST NOT** use `USING (true)` or skip tenancy checks

### Migration Standards
- **MUST** include descriptive comment at top of migration file
- **MUST** be idempotent (use `IF NOT EXISTS`, `IF EXISTS`)
- **MUST** include rollback instructions in comments
- **SHOULD** group related changes (table + indexes + RLS) in single migration
- **MUST NOT** edit existing migrations after they've been applied

---

## Storage Standards

### Bucket Configuration
- **MUST** use `brain-private` bucket for all tenant data
- **MUST** set `public: false` for sensitive data
- **MUST** configure allowed MIME types explicitly
- **SHOULD** set max file size limits (default: 10 MB)

### Path Convention
- **MUST** use tenant-scoped paths: `{tenancy_id}/{category}/{entity_id}/{filename}`
- **MUST** use lowercase for category names (e.g., `customers`, `contracts`, `legal`)
- **SHOULD** include entity ID for traceability
- **MUST NOT** allow user-controlled path traversal

### Storage RLS
- **MUST** create RLS policies on `storage.objects` table
- **MUST** filter by `bucket_id = 'brain-private'`
- **MUST** verify first path segment matches `brain.current_tenancy_id()::TEXT`
- **MUST** use `storage.foldername(name)` helper for path extraction

---

## Frontend Standards

### Project Structure
```
frontend/
├── src/
│   ├── sessions/          # 7 session components
│   ├── components/        # Reusable UI components
│   ├── lib/
│   │   └── supabase.ts   # Supabase client singleton
│   ├── types/
│   │   └── database.ts   # TypeScript types for DB schema
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
```

### TypeScript Standards
- **MUST** use strict mode (`"strict": true` in tsconfig.json)
- **MUST** define interfaces for all database entities
- **MUST** use TypeScript enums or union types for database enums
- **MUST NOT** use `any` type (use `unknown` if type is truly unknown)

### Supabase Client Standards
- **MUST** use singleton pattern for Supabase client
- **MUST** include proper type annotations for queries
- **SHOULD** use `.select('*')` with explicit column selection for clarity
- **MUST** handle errors explicitly (don't ignore `error` in response)

### React Standards
- **MUST** use functional components with hooks
- **MUST** use `useEffect` for data fetching with proper dependencies
- **SHOULD** use `useState` for local state, Context API for shared state
- **SHOULD** implement loading and error states
- **MUST NOT** fetch data in render function

### Realtime Standards
- **MUST** clean up subscriptions in `useEffect` return function
- **MUST** filter subscriptions by relevant entity ID (e.g., `ticket_id=eq.${ticketId}`)
- **SHOULD** use channel names that describe the subscription purpose
- **MUST** handle reconnection scenarios

---

## BFF Standards

### Project Structure
```
bff/
├── src/
│   ├── index.ts           # Express server entry point
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   └── utils/            # Utility functions
```

### API Standards
- **MUST** use RESTful conventions (GET, POST, PUT, DELETE)
- **MUST** validate all input parameters
- **MUST** return JSON responses with consistent structure
- **MUST** use HTTP status codes correctly (200, 400, 401, 403, 500)
- **SHOULD** implement rate limiting for public endpoints

### Authentication Standards
- **MUST** verify JWT tokens using Supabase secret
- **MUST** extract `tenancy_id` from JWT claims
- **MUST** reject requests without valid JWT (except public endpoints)
- **MUST NOT** trust client-provided `tenancy_id` parameter

### Supabase Admin Client Standards
- **MUST** use Service Role key for admin operations
- **MUST** validate tenancy before performing operations
- **SHOULD** use `.rpc()` for complex database operations
- **MUST NOT** expose Service Role key to frontend

---

## General Standards

### Security Standards
- **MUST** validate all user input
- **MUST** sanitize data before inserting into database
- **MUST** use parameterized queries (Supabase client does this automatically)
- **MUST NOT** trust client-provided IDs without verification
- **MUST NOT** expose sensitive data in error messages

### Performance Standards
- **SHOULD** use indexes for frequently queried columns
- **SHOULD** limit query results with `.limit()` for large tables
- **SHOULD** use pagination for long lists
- **MUST NOT** perform N+1 queries (use `.select()` with relations)

---

# Do / Don't Checklist

## Database: DO

- ✅ **DO** include `tenancy_id UUID NOT NULL` on every table (except `auth.users`)
- ✅ **DO** create foreign key to `brain.tenancies(id) ON DELETE CASCADE` for `tenancy_id`
- ✅ **DO** enable RLS on all tables: `ALTER TABLE brain.* ENABLE ROW LEVEL SECURITY;`
- ✅ **DO** filter by `tenancy_id = brain.current_tenancy_id()` in all RLS policies
- ✅ **DO** create indexes on `tenancy_id` and foreign key columns
- ✅ **DO** use Portuguese identifiers (clientes, contratos, equipe)
- ✅ **DO** use snake_case for all identifiers
- ✅ **DO** use `UUID` for primary keys with `gen_random_uuid()` default
- ✅ **DO** use `TIMESTAMPTZ` for timestamps (not `TIMESTAMP`)
- ✅ **DO** use `IF NOT EXISTS` / `IF EXISTS` for idempotent migrations
- ✅ **DO** grant explicit permissions: `GRANT SELECT ON brain.* TO authenticated;`
- ✅ **DO** use descriptive enum values (e.g., `'ativo'`, `'inativo'`, `'suspenso'`)
- ✅ **DO** create separate RLS policies for SELECT, INSERT, UPDATE, DELETE
- ✅ **DO** use `ON DELETE CASCADE` for hard dependencies
- ✅ **DO** use `ON DELETE SET NULL` for optional references

---

## Database: DON'T

- ❌ **DON'T** create tables without `tenancy_id` column
- ❌ **DON'T** skip RLS policies (every table must have at least one SELECT policy)
- ❌ **DON'T** use `USING (true)` in RLS policies (always filter by tenancy)
- ❌ **DON'T** use abbreviations (use `documentos_legais`, not `docs_leg`)
- ❌ **DON'T** use camelCase or PascalCase in database identifiers
- ❌ **DON'T** use `SERIAL` or `BIGSERIAL` for primary keys (use `UUID`)
- ❌ **DON'T** forget to create indexes on frequently queried columns
- ❌ **DON'T** edit existing migrations after they've been applied
- ❌ **DON'T** use `TIMESTAMP` without timezone (use `TIMESTAMPTZ`)
- ❌ **DON'T** create foreign keys without indexes
- ❌ **DON'T** forget to grant permissions to `authenticated` role

---

## Storage: DO

- ✅ **DO** use `brain-private` bucket for all tenant data
- ✅ **DO** use tenant-scoped paths: `{tenancy_id}/{category}/{entity_id}/{filename}`
- ✅ **DO** create RLS policies on `storage.objects` table
- ✅ **DO** verify first path segment matches tenant ID: `(storage.foldername(name))[1] = brain.current_tenancy_id()::TEXT`
- ✅ **DO** set `public: false` for sensitive data
- ✅ **DO** configure allowed MIME types explicitly
- ✅ **DO** set max file size limits

---

## Storage: DON'T

- ❌ **DON'T** use public bucket for tenant data
- ❌ **DON'T** allow user-controlled path traversal
- ❌ **DON'T** skip RLS policies on `storage.objects`
- ❌ **DON'T** trust client-provided paths without validation
- ❌ **DON'T** store files without tenant ID in path

---

## Frontend: DO

- ✅ **DO** use singleton pattern for Supabase client
- ✅ **DO** handle errors explicitly (check `error` in response)
- ✅ **DO** implement loading and error states
- ✅ **DO** clean up Realtime subscriptions in `useEffect` return
- ✅ **DO** use TypeScript strict mode
- ✅ **DO** define interfaces for all database entities
- ✅ **DO** use functional components with hooks
- ✅ **DO** filter Realtime subscriptions by entity ID
- ✅ **DO** display user-friendly error messages
- ✅ **DO** use `.select()` with explicit column selection

---

## Frontend: DON'T

- ❌ **DON'T** create multiple Supabase client instances
- ❌ **DON'T** ignore `error` property in Supabase responses
- ❌ **DON'T** fetch data in render function
- ❌ **DON'T** forget to add dependencies to `useEffect`
- ❌ **DON'T** use `any` type (use `unknown` if needed)
- ❌ **DON'T** expose technical error details to users
- ❌ **DON'T** forget to unsubscribe from Realtime channels
- ❌ **DON'T** trust client-provided IDs without verification

---

## BFF: DO

- ✅ **DO** verify JWT tokens for all non-public endpoints
- ✅ **DO** extract `tenancy_id` from JWT claims (not request body)
- ✅ **DO** validate all input parameters
- ✅ **DO** use Service Role key for admin operations
- ✅ **DO** return consistent JSON structure
- ✅ **DO** use HTTP status codes correctly (200, 400, 401, 403, 500)
- ✅ **DO** catch all errors in route handlers
- ✅ **DO** log errors with context (user ID, tenancy ID, operation)
- ✅ **DO** use try/catch blocks in async handlers
- ✅ **DO** validate tenancy before performing operations

---

## BFF: DON'T

- ❌ **DON'T** trust client-provided `tenancy_id` parameter
- ❌ **DON'T** expose Service Role key to frontend
- ❌ **DON'T** skip input validation
- ❌ **DON'T** return internal error details to clients
- ❌ **DON'T** send emails to real addresses in development
- ❌ **DON'T** skip JWT verification (except for public endpoints)
- ❌ **DON'T** perform operations without validating tenancy

---

## Security: MUST

- 🔒 **MUST** validate all user input
- 🔒 **MUST** sanitize data before inserting into database
- 🔒 **MUST** use parameterized queries (Supabase does this automatically)
- 🔒 **MUST** verify tenancy_id in all operations
- 🔒 **MUST** check user role for privileged operations
- 🔒 **MUST** use HTTPS in production
- 🔒 **MUST** keep Service Role key secret (never expose to client)
- 🔒 **MUST** implement rate limiting for public endpoints
- 🔒 **MUST** use RLS policies on all tables

---

## Security: MUST NOT

- 🔒 **MUST NOT** trust client-provided IDs without verification
- 🔒 **MUST NOT** expose sensitive data in error messages
- 🔒 **MUST NOT** commit `.env` or secrets to git
- 🔒 **MUST NOT** use `USING (true)` in RLS policies
- 🔒 **MUST NOT** skip input validation
- 🔒 **MUST NOT** allow SQL injection (use Supabase client)
- 🔒 **MUST NOT** expose Service Role key to frontend

---

## Performance: SHOULD

- ⚡ **SHOULD** use indexes for frequently queried columns
- ⚡ **SHOULD** limit query results with `.limit()` for large tables
- ⚡ **SHOULD** use pagination for long lists
- ⚡ **SHOULD** use composite indexes for common query patterns
- ⚡ **SHOULD** cache frequently accessed data
- ⚡ **SHOULD** use `.select()` with relations to avoid N+1 queries
- ⚡ **SHOULD** minimize Realtime subscriptions
- ⚡ **SHOULD** use database views for complex queries

---

## Common Pitfalls

### Pitfall 1: Forgetting tenancy_id
```sql
-- ❌ BAD: No tenancy_id filter
CREATE POLICY "..." ON brain.clientes
FOR SELECT USING (true);

-- ✅ GOOD: Filter by tenancy_id
CREATE POLICY "..." ON brain.clientes
FOR SELECT USING (tenancy_id = brain.current_tenancy_id());
```

### Pitfall 2: Trusting Client Data
```typescript
// ❌ BAD: Trust client-provided tenancy_id
const { tenancy_id } = req.body;
const { data } = await supabase.from('clientes').select().eq('tenancy_id', tenancy_id);

// ✅ GOOD: Extract from JWT
const tenancy_id = req.user.tenancy_id;
const { data } = await supabase.from('clientes').select().eq('tenancy_id', tenancy_id);
```

### Pitfall 3: N+1 Queries
```typescript
// ❌ BAD: N+1 queries
const { data: tickets } = await supabase.from('tickets_suporte').select('*');
for (const ticket of tickets) {
  const { data: customer } = await supabase.from('clientes').select('*').eq('id', ticket.cliente_id).single();
}

// ✅ GOOD: Single query with relation
const { data: tickets } = await supabase
  .from('tickets_suporte')
  .select('*, clientes(*)');
```

### Pitfall 4: Missing Indexes
```sql
-- ❌ BAD: No index on foreign key
CREATE TABLE brain.contratos (
  cliente_id UUID REFERENCES brain.clientes(id)
);

-- ✅ GOOD: Index on foreign key
CREATE TABLE brain.contratos (
  cliente_id UUID REFERENCES brain.clientes(id)
);
CREATE INDEX idx_contratos_cliente ON brain.contratos(cliente_id);
```

### Pitfall 5: Exposing Service Role Key
```typescript
// ❌ BAD: Service Role key in frontend
const supabase = createClient(url, serviceRoleKey);

// ✅ GOOD: Anon key in frontend, Service Role in BFF
const supabase = createClient(url, anonKey);
```

---

## Quick Reference Card

| Operation | Good Practice | Bad Practice |
|-----------|---------------|--------------|
| **Database table** | Include `tenancy_id`, enable RLS | Skip `tenancy_id` or RLS |
| **RLS policy** | Filter by `brain.current_tenancy_id()` | Use `USING (true)` |
| **Storage path** | `{tenancy_id}/{category}/{id}/{file}` | No tenant ID in path |
| **BFF auth** | Extract from JWT claims | Trust request body |
| **Supabase client** | Singleton pattern | Multiple instances |
| **Realtime** | Filter by entity ID, clean up | No filter, no cleanup |
| **Error handling** | User-friendly messages, log details | Expose internal errors |
| **Migrations** | Idempotent, descriptive | Edit after applying |

---

## Getting Help

- **Blueprint**: See `supabase_brain.md` for full specification (2284 lines)
- **AGENTS.md**: For AI agent integration using agents.md standard
- **CLAUDE.md**: For Claude Code persistent context
- **Supabase Docs**: https://supabase.com/docs
- **PostgREST Docs**: https://postgrest.org/en/stable/
- **Inbucket**: http://localhost:54324 (local email capture)

---

**Last Updated**: 2026-01-13
**Blueprint Source**: `supabase_brain.md`
**Context Format**: Gemini CLI single-file
