# CLAUDE.md

**Project:** BRAIN CRM Local MVP
**Schema:** `brain` (Postgres schema inside Supabase local stack)
**Language:** English (100%)
**Last updated:** 2026-01-13

---

## Project Overview

BRAIN is a canonical administrative database schema for managing customers with signed contracts. This MVP runs locally using Supabase CLI in sandbox mode. The system includes:

- **Database:** Postgres schema `brain` with multi-tenant RLS
- **Frontend:** Vite + TypeScript + React admin interface
- **BFF:** Local Node.js/TypeScript microservice (replaces Edge Functions)
- **Stack:** Postgres + PostgREST + GoTrue + Storage + Realtime + Inbucket (local SMTP)

**Core domains:** Tenants, Team (equipe), Customers (clientes), Contracts, Payments, Documents, Legal Processes, Chat, Emails, Audit Logs, Call Records.

**Hard constraints:**
- No Supabase Edge Functions (use local BFF instead)
- No paid services for MVP
- Must run entirely locally with Supabase CLI + Docker

---

## Tech Stack

**Database:**
- PostgreSQL 15+ (via Supabase local)
- Schema: `brain`
- PostgREST for REST API
- Row Level Security (RLS) for multi-tenant isolation

**Frontend:**
- Vite + TypeScript + React
- `@supabase/supabase-js` (anon key)
- Realtime subscriptions for chat/notifications

**BFF Microservice:**
- Node.js 18+ + TypeScript
- Fastify or Express
- `@supabase/supabase-js` (service_role key)
- Nodemailer for SMTP

**Development:**
- Supabase CLI
- Docker Desktop
- pnpm or npm

---

## Directory Structure

```
repo/
├── supabase/
│   ├── config.toml              # schemas = ["public", "storage", "graphql_public", "brain"]
│   ├── migrations/              # DDL migrations (numbered)
│   │   ├── 0001_init.sql        # Core tables + enums
│   │   ├── 0002_rls.sql         # RLS policies + helper functions
│   │   ├── 0003_views.sql       # Views for Kanban/customer card
│   │   └── 0004_seed_helpers.sql
│   └── seed.sql                 # Deterministic test data
├── apps/
│   └── admin-frontend/          # Vite + React + TypeScript
│       ├── src/
│       │   ├── pages/           # Session 00-06 components
│       │   ├── components/      # Reusable UI
│       │   ├── lib/
│       │   │   ├── supabaseClient.ts  # Supabase client (anon key)
│       │   │   ├── apiBff.ts          # BFF API wrapper
│       │   │   └── accessControl.ts   # Role-based guards
│       │   └── types/
│       │       └── database.ts        # Generated types
│       ├── .env.local           # Frontend env vars
│       └── vite.config.ts
├── services/
│   └── bff/                     # BFF microservice
│       ├── src/
│       │   ├── index.ts         # Server entry
│       │   ├── auth.ts          # Token validation
│       │   ├── supabaseAdmin.ts # Supabase admin client
│       │   ├── mailer.ts        # SMTP sender
│       │   └── exportChat.ts    # Chat export logic
│       ├── .env                 # BFF env vars (service_role key)
│       ├── package.json
│       └── tsconfig.json
├── AGENTS.md                    # Agent-oriented docs
├── CLAUDE.md                    # This file
├── README.md                    # Human-oriented docs
└── supabase_brain.md            # Original blueprint
```

---

## Coding Standards

### Database (Schema `brain`)

**Naming:**
- Portuguese identifiers: `clientes`, `equipe`, `contratos`, `parcelas`
- English column documentation
- Enums: `brain.<enum_name>` format, lowercase ASCII (no accents)

**Multi-tenancy:**
- Every tenant-scoped table MUST have `tenancy_id uuid NOT NULL` with FK to `brain.tenants(id)`
- Enable RLS on all tenant-scoped tables
- Use helper functions: `brain.current_tenancy_id()`, `brain.current_user_role()`, `brain.is_admin()`

**Policy template:**
```sql
alter table brain.<table> enable row level security;

create policy "tenant_read"
on brain.<table>
for select to authenticated
using (tenancy_id = brain.current_tenancy_id());

create policy "tenant_write"
on brain.<table>
for insert to authenticated
with check (tenancy_id = brain.current_tenancy_id());
```

**Timestamps:**
- All tables MUST have `created_at timestamptz NOT NULL DEFAULT now()`
- Mutable tables SHOULD have `updated_at timestamptz NOT NULL DEFAULT now()`

**Indexes:**
- Always index FK columns
- Index `(tenancy_id, <query_column>)` for performance
- Unique constraints: `(tenancy_id, cpf)` on `brain.clientes`, `(tenancy_id, email)` on `brain.equipe`

### Storage

**Bucket:** `brain-private` (private)

**Path convention:**
- `tenants/{tenancy_id}/clientes/{cliente_id}/{arquivo_id}/{original_filename}`
- `tenants/{tenancy_id}/threads/{thread_id}/{message_id}/{filename}`
- `tenants/{tenancy_id}/calls/{ligacao_id}/{filename}`

**Indexing:** Every upload MUST create a row in `brain.arquivos` with `tenancy_id`, `cliente_id`, `storage_path`, `mime_type`, `size_bytes`.

### Frontend

**File references:** Use markdown link syntax:
- Files: `[filename.ts](src/filename.ts)`
- Lines: `[filename.ts:42](src/filename.ts#L42)`
- Ranges: `[filename.ts:42-51](src/filename.ts#L42-L51)`

**Supabase client:** Initialize in `src/lib/supabaseClient.ts` with anon key.

**BFF communication:** Send `Authorization: Bearer <supabase_access_token>` header via `src/lib/apiBff.ts`.

**Access control:** Load `brain.equipe` after login; gate routes/components based on `role` enum.

### BFF

**Auth:** Extract token from `Authorization: Bearer <token>`, validate with `supabase.auth.getUser()`, load `brain.equipe` to get `tenancy_id` + `role`.

**Service role key:** NEVER expose in frontend; only in BFF `.env`.

**Endpoints (MVP minimum):**
- `POST /admin/invite` (admin-only)
- `POST /admin/disable` (admin-only)
- `POST /mail/send` (role-based)
- `GET /chat/:thread_id/export.txt`

---

## Common Commands

### Supabase

**Initialize:**
```bash
supabase init
```

**Start local stack:**
```bash
supabase start
```

**Stop:**
```bash
supabase stop
```

**Reset database (apply migrations + seed):**
```bash
supabase db reset
```

**Generate TypeScript types:**
```bash
supabase gen types typescript --local > apps/admin-frontend/src/types/database.ts
```

**Create new migration:**
```bash
supabase migration new <migration_name>
```

**Check status:**
```bash
supabase status
```

### Frontend

**Install deps:**
```bash
cd apps/admin-frontend && npm install
```

**Dev server:**
```bash
npm run dev
```

**Build:**
```bash
npm run build
```

**Type-check:**
```bash
npm run type-check
```

### BFF

**Install deps:**
```bash
cd services/bff && npm install
```

**Dev server:**
```bash
npm run dev
```

**Build:**
```bash
npm run build
```

**Lint:**
```bash
npm run lint
```

---

## Workflows

### New Migration Workflow

1. Create migration: `supabase migration new <name>`
2. Write DDL in `supabase/migrations/<timestamp>_<name>.sql`
3. Test locally: `supabase db reset`
4. Regenerate types: `supabase gen types typescript --local > apps/admin-frontend/src/types/database.ts`
5. Commit migration + generated types together

### Adding a New Table

1. Define table in migration with `created_at` and `updated_at` timestamps
2. Add `tenancy_id uuid NOT NULL` with FK to `brain.tenants(id)` if tenant-scoped
3. Enable RLS: `alter table brain.<table> enable row level security;`
4. Create policies using template above
5. Add indexes for FKs and query patterns
6. Update `0003_views.sql` if table affects Kanban/card views
7. Run `supabase db reset` and regenerate types

### Committing Changes

**Format:**
```
<type>(<scope>): <subject>

<optional body>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`
**Scopes:** `db`, `frontend`, `bff`, `rls`, `storage`, `seed`

**Examples:**
```
feat(db): add brain.cliente_app table for app access Kanban
fix(rls): enforce tenancy_id in brain.arquivos policy
refactor(frontend): extract access control guards to lib/accessControl.ts
```

---

## Architectural Notes

### Multi-Tenant Isolation

**Core rule:** An authenticated user can only access rows where:
```
row.tenancy_id == (select tenancy_id from brain.equipe where auth_user_id = auth.uid())
```

**Helper functions (defined in `0002_rls.sql`):**
```sql
brain.current_tenancy_id() → uuid
brain.current_user_role() → text
brain.is_admin() → boolean
```

### Session Structure (Frontend)

- **Session 00:** Login (email/password via Supabase Auth)
- **Session 01:** Customers Kanban + Customer Card + Timeline (`brain.view_clientes_kanban`, `brain.view_cliente_full`)
- **Session 02:** App Access Kanban (`brain.cliente_app`: pendente/liberado/bloqueado)
- **Session 03:** Legal Tickets (`brain.juridico_tickets` + `brain.juridico_ticket_mensagens`)
- **Session 04:** Support Chat + Emails (`brain.chat_threads`, `brain.chat_mensagens`, `brain.emails_mensagens`)
- **Session 05:** Global Logs (`brain.logs`)
- **Session 06:** Team Management (admin-only: invite/disable via BFF)

### BFF Responsibilities

The BFF replaces Edge Functions and handles:
1. Privileged Auth admin actions (invite/disable users)
2. Outbound email via SMTP (local Inbucket)
3. Chat transcript export to TXT
4. Any privileged workflow requiring service_role key

### Realtime Subscriptions

**Frontend should subscribe to:**
- `brain.chat_mensagens` (Session 04: Chat)
- `brain.juridico_ticket_mensagens` (Session 03: Legal, if implemented)
- `brain.logs` (Session 05: Global Logs, optional)

---

## Known Gotchas & Pitfalls

### DO

- Always enable RLS on new tenant-scoped tables
- Always add `tenancy_id` to tenant-scoped tables with FK constraint
- Always index `(tenancy_id, <query_column>)` for performance
- Always regenerate TypeScript types after schema changes
- Always validate user token in BFF before privileged operations
- Always insert audit records in `brain.logs` for critical actions
- Always use deterministic UUIDs in seed data for reproducibility

### DON'T

- Never use Supabase Edge Functions (use local BFF instead)
- Never expose `service_role key` in frontend code or env vars
- Never skip RLS policies on tenant-scoped tables
- Never create tables without `created_at timestamptz default now()`
- Never commit `.env` or `.env.local` files
- Never use accented characters in enum values (use `cobranca` not `cobrança`)
- Never batch-complete todos; mark each completed immediately after finishing

### Security

- **Service role key** MUST exist only in BFF `.env`
- **Storage paths** MUST start with `tenants/{tenancy_id}/` for RLS enforcement
- **Admin endpoints** (`/admin/*`) MUST verify `brain.is_admin()` returns true
- **IP blacklist:** On "fire" action, optionally insert user IP to `brain.ip_blacklist`

### Performance

- Paginate timelines: Use `limit` + `offset` or cursor-based pagination for `brain.logs` queries
- Index foreign keys: All FK columns should have indexes
- Avoid N+1: Use views (`brain.view_cliente_full`) or batch queries with joins

### Supabase CLI

- Must edit `supabase/config.toml` to add `"brain"` to `[api] schemas` array
- Must restart Supabase after config changes: `supabase stop && supabase start`
- Inbucket UI (local SMTP): `http://127.0.0.1:54324`
- Supabase Studio (admin UI): `http://127.0.0.1:54323`

---

## Environment Variables

### Frontend (`.env.local`)

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<YOUR_LOCAL_ANON_KEY>
VITE_BFF_BASE_URL=http://127.0.0.1:8080
```

### BFF (`.env`)

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<YOUR_LOCAL_SERVICE_ROLE_KEY>
SMTP_HOST=127.0.0.1
SMTP_PORT=54325
SMTP_FROM=no-reply@local.test
PORT=8080
```

**CRITICAL:** Never commit `.env` files. The service_role key MUST exist only in BFF.

---

## Key Enums

**User roles:** `admin`, `vendas`, `juridico`, `cobranca`, `suporte`
**Payment status:** `aguardando`, `em_dia`, `inadimplente`, `cancelado`
**Payment method:** `pix`, `boleto`, `cartao`, `debito_automatico`, `transferencia`
**Payment tx status:** `pendente`, `autorizado`, `confirmado`, `falhado`, `estornado`
**Legal case type:** `super_endividamento`, `rmc`, `cobranca`
**Chat direction:** `cliente`, `equipe`
**Call status:** `iniciado`, `tocando`, `em_andamento`, `completada`, `falhou`, `cancelado`
**Call result:** `sem_resposta`, `ocupado`, `numero_invalido`, `atendeu_cliente`, `atendeu_terceiro`, `recusou`, `prometeu_pagar`, `solicitou_boleto`, `solicitou_pausa`, `outro`
**Document types:** `rg_frente`, `rg_verso`, `cnh`, `comprovante`, `contracheque`, `extrato`, `registrato`, `assinatura`, `audio`, `contrato`
**Document status:** `pendente`, `enviado`, `aprovado`, `rejeitado`
**Kanban lanes:** `documentacao_pendente`, `documentacao_enviada`, `em_dia`, `provas`, `inadimplentes`

---

## Troubleshooting

**Supabase won't start:**
- Check Docker: `docker ps`
- Restart: `supabase stop && supabase start`
- Logs: `supabase logs`

**RLS blocks legitimate access:**
- Verify `brain.current_tenancy_id()`: `select brain.current_tenancy_id();`
- Check `brain.equipe.auth_user_id` matches `auth.uid()`

**TypeScript errors after schema change:**
- Regenerate types: `supabase gen types typescript --local > apps/admin-frontend/src/types/database.ts`
- Restart TypeScript server in IDE

**BFF returns 401:**
- Verify `Authorization: Bearer <token>` header
- Check token validity: `supabase.auth.getUser()` should succeed
- Ensure BFF `.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

**Inbucket not capturing emails:**
- Check UI: `http://127.0.0.1:54324`
- Verify SMTP settings in BFF `.env`: `SMTP_HOST=127.0.0.1`, `SMTP_PORT=54325`

---

**END OF CLAUDE.md**
