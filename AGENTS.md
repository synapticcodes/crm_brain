# AGENTS.md

> **Agent-oriented documentation for the BRAIN CRM Local MVP Project**
> This file provides canonical instructions for AI coding agents working on this codebase.
> Last updated: 2026-01-13

---

## Project Summary & Scope

**BRAIN** is a canonical administrative database schema for managing customers with signed contracts. This MVP runs **locally** using Supabase CLI (sandbox mode) and includes:

- **Postgres schema** (`brain`) with multi-tenant RLS
- **Admin frontend** (Vite + TypeScript + React)
- **Local BFF microservice** (Node.js/TypeScript) replacing Edge Functions
- **Local stack**: Postgres + PostgREST + GoTrue + Storage + Realtime + Inbucket (SMTP)

**Core entities**: Tenants, Team (equipe), Customers (clientes), Contracts, Payments, Documents, Legal Processes, Chat, Emails, Audit Logs, Call Records.

**Non-goals for MVP**: No production hosting, no real external integrations, no Edge Functions, no paid services.

---

## Prerequisites & Environment Setup

### Required Tools
- **Docker Desktop** (or Docker Engine) running
- **Supabase CLI** installed (`brew install supabase/tap/supabase` or equivalent)
- **Node.js 18+** and npm/pnpm
- **Git** for version control

### Initial Setup

1. **Clone repository** (when available):
   ```bash
   git clone <repo-url>
   cd supabase_local_crm_brain
   ```

2. **Initialize Supabase**:
   ```bash
   supabase init
   ```

3. **Configure exposed schemas** in `supabase/config.toml`:
   ```toml
   [api]
   schemas = ["public", "storage", "graphql_public", "brain"]
   ```

4. **Start Supabase local stack**:
   ```bash
   supabase start
   ```

5. **Check status and note keys**:
   ```bash
   supabase status
   ```
   Note the `anon key`, `service_role key`, and API URL.

6. **Reset database (apply migrations + seed)**:
   ```bash
   supabase db reset
   ```

7. **Generate TypeScript types** for frontend:
   ```bash
   supabase gen types typescript --local > apps/admin-frontend/src/types/database.ts
   ```

8. **Configure environment variables**:

   **Frontend** (`apps/admin-frontend/.env.local`):
   ```bash
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<YOUR_LOCAL_ANON_KEY>
   VITE_BFF_BASE_URL=http://127.0.0.1:8080
   ```

   **BFF** (`services/bff/.env`):
   ```bash
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_ROLE_KEY=<YOUR_LOCAL_SERVICE_ROLE_KEY>
   SMTP_HOST=127.0.0.1
   SMTP_PORT=54325
   SMTP_FROM=no-reply@local.test
   PORT=8080
   ```

9. **Install dependencies**:
   ```bash
   # Frontend
   cd apps/admin-frontend && npm install

   # BFF
   cd services/bff && npm install
   ```

---

## Build & Test Instructions

### Database Migrations

- **Create new migration**:
  ```bash
  supabase migration new <migration_name>
  ```

- **Apply migrations + seed**:
  ```bash
  supabase db reset
  ```

- **Migrations location**: `supabase/migrations/*.sql`
- **Seed data**: `supabase/seed.sql`

### Frontend Development

- **Start dev server**:
  ```bash
  cd apps/admin-frontend
  npm run dev
  ```

- **Build for production**:
  ```bash
  npm run build
  ```

- **Type-check**:
  ```bash
  npm run type-check
  ```

- **Regenerate types after schema changes**:
  ```bash
  supabase gen types typescript --local > src/types/database.ts
  ```

### BFF Microservice

- **Start BFF server**:
  ```bash
  cd services/bff
  npm run dev
  ```

- **Build**:
  ```bash
  npm run build
  ```

- **Lint**:
  ```bash
  npm run lint
  ```

### Testing Checklist (Manual for MVP)

**Security (RLS)**:
- [ ] User A cannot see tenant B customers
- [ ] Non-admin cannot access Team session
- [ ] Storage access is tenant-scoped

**Functional**:
- [ ] Login works; role gating works
- [ ] Customers Kanban loads; filters work
- [ ] Customer card shows details; timeline scroll works
- [ ] Document approve/reject updates Kanban lanes
- [ ] App Access Kanban transitions work
- [ ] Legal tickets: pending/answered logic works
- [ ] Chat receives realtime messages and notifications
- [ ] Email send via BFF is recorded; Inbucket shows the email
- [ ] Export chat transcript downloads as TXT
- [ ] Global logs list updates

---

## Key Code Style & Architecture Guidelines

### Database Schema (`brain`)

- **Multi-tenant isolation**: Every tenant-scoped table MUST have `tenancy_id uuid NOT NULL` with FK to `brain.tenants(id)`
- **Naming convention**: Portuguese identifiers (e.g., `clientes`, `equipe`, `contratos`) with English documentation
- **Enums**: Use `brain.<enum_name>` format; normalize to lowercase ASCII for stability (avoid accents like `cobrança`)
- **RLS enforcement**: Enable RLS on all tenant-scoped tables; use helper functions:
  ```sql
  brain.current_tenancy_id()
  brain.current_user_role()
  brain.is_admin()
  ```
- **Policy template**:
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

### Storage Strategy

- **Bucket**: `brain-private` (private)
- **Path convention**:
  - `tenants/{tenancy_id}/clientes/{cliente_id}/{arquivo_id}/{original_filename}`
  - `tenants/{tenancy_id}/threads/{thread_id}/{message_id}/{filename}`
  - `tenants/{tenancy_id}/calls/{ligacao_id}/{filename}`
- **Indexing**: Every upload MUST create a row in `brain.arquivos` with `tenancy_id`, `cliente_id`, `storage_path`, `mime_type`, `size_bytes`
- **RLS**: Enforce path prefix checks in `storage.objects` policies

### Frontend (`apps/admin-frontend`)

- **Tech stack**: Vite + TypeScript + React + `@supabase/supabase-js`
- **File references**: Use markdown link syntax for clickable paths:
  - Files: `[filename.ts](src/filename.ts)`
  - Lines: `[filename.ts:42](src/filename.ts#L42)`
  - Ranges: `[filename.ts:42-51](src/filename.ts#L42-L51)`
- **Supabase client**: Initialize in `src/lib/supabaseClient.ts` with anon key
- **BFF communication**: Use `src/lib/apiBff.ts` wrapper; send `Authorization: Bearer <supabase_access_token>` header
- **Access control**: Check user role from `brain.equipe` after login; gate routes/components based on `role` enum
- **Realtime subscriptions**: Subscribe to:
  - `brain.chat_mensagens` (Session 04)
  - `brain.juridico_ticket_mensagens` (Session 03, if implemented)
  - `brain.logs` (optional for Session 05)

### BFF Microservice (`services/bff`)

- **Framework**: Fastify or Express + TypeScript
- **Supabase admin client**: Use `@supabase/supabase-js` with **service_role key** (NEVER expose in frontend)
- **Auth validation**: Extract token from `Authorization: Bearer <token>`, validate with `supabase.auth.getUser()`, load `brain.equipe` to get `tenancy_id` + `role`
- **Endpoints** (MVP minimum):
  - `POST /admin/invite` (admin-only): Create Auth user + insert `brain.equipe` + log
  - `POST /admin/disable` (admin-only): Disable Auth user + update `brain.equipe` status + optional IP blacklist + log
  - `POST /mail/send` (role-based): Send SMTP email via Inbucket + insert `brain.emails_mensagens` + log
  - `GET /chat/:thread_id/export.txt`: Load messages + format TXT + return download
- **Error handling**: Return structured JSON errors; log to `brain.logs` on failures
- **Security**: No session persistence; stateless token validation per request

---

## Project Structure & Navigation Hints

```
repo/
  supabase/
    config.toml              # Add "brain" to schemas array
    migrations/              # DDL migrations (numbered)
      0001_init.sql          # Core tables + enums
      0002_rls.sql           # RLS policies + helper functions
      0003_views.sql         # Views for Kanban/full customer card
      0004_seed_helpers.sql  # Optional: seed utility functions
    seed.sql                 # Test data (deterministic)
  apps/
    admin-frontend/          # Vite + React + TypeScript
      src/
        pages/               # Session 00-06 components
        components/          # Reusable UI components
        lib/
          supabaseClient.ts  # Supabase client (anon key)
          apiBff.ts          # BFF API wrapper
          accessControl.ts   # Role-based guards
        types/
          database.ts        # Generated types (supabase gen types)
      .env.local             # Frontend env vars
      vite.config.ts
  services/
    bff/                     # BFF microservice
      src/
        index.ts             # Server entry point
        auth.ts              # Token validation + user context
        supabaseAdmin.ts     # Supabase client (service_role key)
        mailer.ts            # SMTP email sender
        exportChat.ts        # Chat transcript export logic
      .env                   # BFF env vars (service_role key)
      package.json
      tsconfig.json
  README.md                  # Human-oriented docs
  supabase_brain.md          # Original blueprint (reference)
  AGENTS.md                  # This file
```

### Key File Locations

- **Database types**: `apps/admin-frontend/src/types/database.ts` (auto-generated)
- **RLS helper functions**: `supabase/migrations/0002_rls.sql`
- **Kanban views**: `brain.view_clientes_kanban`, `brain.view_cliente_full` (defined in `0003_views.sql`)
- **Enums**: All in `brain` schema (see Section 8 of blueprint)

---

## Common Pitfalls & Do/Don't Rules

### DO

- **Always** enable RLS on new tenant-scoped tables
- **Always** add `tenancy_id` to tenant-scoped tables with FK constraint
- **Always** index `(tenancy_id, <query_column>)` for performance
- **Always** regenerate TypeScript types after schema changes
- **Always** validate user token in BFF before privileged operations
- **Always** insert audit records in `brain.logs` for critical actions
- **Always** use deterministic UUIDs in seed data for reproducibility
- **Always** enforce unique constraints: `(tenancy_id, cpf)` on `brain.clientes`, `(tenancy_id, email)` on `brain.equipe`, `(tenancy_id, protocolo)` on `brain.chat_threads`

### DON'T

- **Never** use Supabase Edge Functions (Option B uses local BFF instead)
- **Never** expose `service_role key` in frontend code or env vars
- **Never** skip RLS policies on tenant-scoped tables
- **Never** create tables without `created_at timestamptz default now()`
- **Never** use `find` or `ls` for file search in shell; prefer Glob/Grep tools
- **Never** commit `.env` or `.env.local` files
- **Never** use accented characters in enum values (e.g., use `cobranca` not `cobrança`)
- **Never** batch-complete todos; mark each as completed immediately after finishing

### Security

- **Service role key** MUST exist only in BFF `.env`
- **Storage paths** MUST start with `tenants/{tenancy_id}/` for RLS enforcement
- **Admin endpoints** (`/admin/*`) MUST verify `brain.is_admin()` returns true
- **IP blacklist**: On "fire" action, optionally insert user IP to `brain.ip_blacklist`

### Performance

- **Paginate timelines**: Use `limit` + `offset` or cursor-based pagination for `brain.logs` queries
- **Index foreign keys**: All FK columns should have indexes
- **Avoid N+1**: Use views (`brain.view_cliente_full`) or batch queries with joins

---

## PR / Commit / Release Workflow

### Commit Message Format

```
<type>(<scope>): <subject>

<optional body>

<optional footer>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`

**Scopes**: `db`, `frontend`, `bff`, `rls`, `storage`, `seed`

**Examples**:
```
feat(db): add brain.cliente_app table for app access Kanban
fix(rls): enforce tenancy_id in brain.arquivos policy
refactor(frontend): extract access control guards to lib/accessControl.ts
docs: update AGENTS.md with new BFF endpoint
```

### Migration Workflow

1. Create migration: `supabase migration new <name>`
2. Write DDL in `supabase/migrations/<timestamp>_<name>.sql`
3. Test locally: `supabase db reset`
4. Regenerate types: `supabase gen types typescript --local > apps/admin-frontend/src/types/database.ts`
5. Commit migration + generated types together

### Pull Request Checklist

- [ ] Migration runs cleanly with `supabase db reset`
- [ ] RLS policies tested (user cannot access other tenant data)
- [ ] TypeScript types regenerated if schema changed
- [ ] Frontend builds without errors (`npm run build`)
- [ ] BFF builds without errors (`npm run build` in `services/bff`)
- [ ] Manual testing checklist items passed (see Testing Checklist above)
- [ ] Audit logs inserted for privileged actions
- [ ] No hardcoded credentials or secrets

---

## Security, Compliance & Dependency Rules

### Security Principles

- **Multi-tenant isolation**: Enforced via RLS; `tenancy_id` is the canonical boundary
- **Auth flow**: Frontend uses anon key + user JWT; BFF validates JWT + loads `brain.equipe`
- **Storage access**: RLS on `storage.objects` checks path prefix matches user's `tenancy_id`
- **Admin actions**: Require `brain.is_admin() = true` in policies or BFF auth checks
- **Audit trail**: Insert into `brain.logs` with `actor_user_id`, `actor_email`, `action`, `stage`, `details`, `cliente_id`, `created_at`

### Dependency Management

- **Supabase CLI**: Keep updated (`brew upgrade supabase/tap/supabase`)
- **Node.js**: Use LTS version (18+)
- **Frontend deps**: Avoid unnecessary packages; prefer Supabase SDK utilities
- **BFF deps**: Minimize external SMTP libraries; use built-in Node.js `nodemailer` or similar

### Compliance Notes (Production)

- **No indexing**: Add `robots.txt` disallow + `X-Robots-Tag: noindex, nofollow` headers
- **LGPD/GDPR**: Ensure customer data deletion workflows (not MVP scope)
- **Data retention**: Define policies for `brain.logs`, `brain.chat_mensagens`, `brain.emails_mensagens` (not MVP scope)

---

## Session-Specific Agent Instructions

### Session 00: Login

- **Tables**: `auth.users`, `brain.equipe`
- **Flow**: User logs in via `supabase.auth.signInWithPassword()` → query `brain.equipe` by `auth_user_id = auth.uid()` → store `tenancy_id`, `role`, `full_name` in frontend state
- **Role gating**: Redirect based on `role` (admin sees Session 06; others restricted)

### Session 01: Customers (Main Kanban)

- **View**: `brain.view_clientes_kanban`
- **Lanes**: `documentacao_pendente`, `documentacao_enviada`, `em_dia`, `provas`, `inadimplentes` (enum `brain.cliente_kanban_lane`)
- **Customer card**: Load `brain.view_cliente_full` or join `brain.clientes` + `brain.enderecos` + `brain.perfil_do_cliente` + `brain.despesas_do_cliente` + `brain.documentos_do_cliente`
- **Timeline**: Paginated query on `brain.logs` filtered by `cliente_id`, sorted by `created_at DESC`

### Session 02: App Access (Kanban)

- **Table**: `brain.cliente_app` (recommended) or add columns to `brain.clientes`
- **Lanes**: `pendente`, `liberado`, `bloqueado`
- **Actions**: Admin can update `status`, set `bloqueado_em`, `bloqueio_motivo`, `liberado_em`

### Session 03: Legal (Ticket-like)

- **Tables**: `brain.juridico_tickets`, `brain.juridico_ticket_mensagens`
- **Columns**: `pendente`, `respondido`
- **Realtime**: Subscribe to `brain.juridico_ticket_mensagens` for toast + sound notifications
- **Permissions**: Legal team (`role = 'juridico'`) can respond; other roles read-only

### Session 04: Support (Chat + Emails)

**Chat**:
- **Tables**: `brain.chat_threads`, `brain.chat_mensagens`
- **Realtime**: Subscribe to `brain.chat_mensagens` for live updates
- **Export**: Call BFF `GET /chat/:thread_id/export.txt`

**Emails**:
- **Tables**: `brain.emails_templates`, `brain.emails_mensagens`
- **Send flow**: Frontend → BFF `POST /mail/send` → SMTP (Inbucket) → insert `brain.emails_mensagens` + `brain.logs`
- **Inbucket UI**: Check `http://127.0.0.1:54324` for received emails

### Session 05: Logs

- **Table**: `brain.logs`
- **Columns**: `actor_user_id`, `actor_email`, `action`, `stage`, `details` (jsonb), `cliente_id`, `created_at`
- **Filters**: By tenant, by date range, by action type, by customer
- **Pagination**: Use `limit` + `offset` or cursor-based

### Session 06: Team Management

- **Table**: `brain.equipe`
- **Admin-only**: Check `brain.is_admin() = true` in policy
- **Invite**: Call BFF `POST /admin/invite` → creates Auth user + inserts `brain.equipe` + logs
- **Disable/Fire**: Call BFF `POST /admin/disable` → disables Auth user + updates `brain.equipe.status` + optional IP blacklist
- **Presence**: Use `last_activity timestamptz` + `status` (`online`, `offline`, `pendente`) for real-time presence (MVP can mock)

---

## Additional Tables & Extensions (MVP Optional)

### Extension A: App Access

**Recommended**:
```sql
create table brain.cliente_app (
  cliente_id uuid primary key references brain.clientes(id) on delete cascade,
  tenancy_id uuid not null references brain.tenants(id),
  status text not null check (status in ('pendente','liberado','bloqueado')),
  bloqueado_em timestamptz,
  bloqueio_motivo text,
  liberado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_cliente_app_tenant_status on brain.cliente_app (tenancy_id, status);
```

### Extension B: Legal Tickets

```sql
create table brain.juridico_tickets (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references brain.tenants(id),
  cliente_id uuid not null references brain.clientes(id),
  status text not null check (status in ('pendente','respondido')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table brain.juridico_ticket_mensagens (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references brain.tenants(id),
  ticket_id uuid not null references brain.juridico_tickets(id) on delete cascade,
  direction text not null check (direction in ('equipe','juridico')),
  body text not null,
  created_by uuid references brain.equipe(id),
  created_at timestamptz not null default now()
);

create index idx_juridico_tickets_tenant_status on brain.juridico_tickets (tenancy_id, status, last_message_at desc);
create index idx_juridico_ticket_msgs_ticket_time on brain.juridico_ticket_mensagens (ticket_id, created_at asc);
```

### Extension C: IP Blacklist

```sql
create table brain.ip_blacklist (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references brain.tenants(id),
  ip text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (tenancy_id, ip)
);
```

---

## Cross-Schema Views (Kidneys/Heart) — Future

The blueprint references external schemas (`kidneys`, `heart`) for collection workflows and sales commissions. For MVP:

- **Strategy 1 (recommended)**: Ignore cross-schema views; implement only `brain.*` views
- **Strategy 2 (future-proof)**: Create stub schemas with minimal tables so views compile

---

## Seed Data Best Practices

- **Deterministic UUIDs**: Use consistent UUID generation (e.g., `gen_random_uuid()` seeded with fixed values or hardcoded UUIDs) so frontend tests are reproducible
- **Coverage**: Seed at least one customer in each Kanban lane, one with 2+ overdue installments, one with pending docs, one with legal ticket
- **Tenants**: Seed 1-2 tenants; assign 5-50 customers per tenant
- **Users**: Seed admin + vendas + juridico + suporte roles per tenant
- **Passwords**: Use known test passwords for local login (e.g., `test123`)

---

## Troubleshooting

### Supabase won't start
- Check Docker is running: `docker ps`
- Stop and restart: `supabase stop && supabase start`
- Check logs: `supabase logs`

### RLS policy blocks legitimate access
- Verify `brain.current_tenancy_id()` returns correct UUID: `select brain.current_tenancy_id();`
- Check `brain.equipe.auth_user_id` matches `auth.uid()`
- Test policy with `set local role authenticated; set local request.jwt.claims.sub = '<user_uuid>';`

### TypeScript errors after schema change
- Regenerate types: `supabase gen types typescript --local > apps/admin-frontend/src/types/database.ts`
- Restart TypeScript server in IDE

### BFF returns 401 Unauthorized
- Verify `Authorization: Bearer <token>` header is sent from frontend
- Check token validity: `supabase.auth.getUser()` should succeed
- Ensure BFF `.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Inbucket not capturing emails
- Check Inbucket UI: `http://127.0.0.1:54324`
- Verify SMTP settings in BFF `.env`: `SMTP_HOST=127.0.0.1`, `SMTP_PORT=54325`
- Check BFF logs for SMTP connection errors

---

## Contact & Escalation

For MVP-specific questions or blockers:
- Review `supabase_brain.md` (original blueprint)
- Check Supabase CLI docs: https://supabase.com/docs/guides/cli
- Check AGENTS.md format spec: https://agents.md/

---

**END OF AGENTS.md**
