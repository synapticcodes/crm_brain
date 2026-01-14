# BRAIN CRM - Local MVP

Sistema CRM multi-tenant responsável por receber e consolidar dados de todos os outros CRMs.

## Arquitetura

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **BFF**: Node.js + TypeScript + Express
- **Backend**: Supabase Local (PostgreSQL + PostgREST + GoTrue + Storage + Realtime)
- **Schema**: `brain` com 22+ tabelas
- **Segurança**: Row Level Security (RLS) em todas as tabelas

## Estrutura do Projeto

```
.
├── frontend/          # Aplicação React (7 sessões de UI)
├── bff/              # Backend for Frontend (operações privilegiadas)
├── supabase/         # Configurações e migrations do Supabase
├── docs/             # Documentação adicional
└── README.md         # Este arquivo
```

## Pré-requisitos

- Node.js 18+
- Docker Desktop
- Supabase CLI (`npm install -g supabase`)

## Setup Inicial

### 1. Inicializar Supabase

```bash
supabase init
supabase start
```

### 2. Configurar Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Configurar BFF

```bash
cd bff
npm install
npm run dev
```

## Portas Utilizadas

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| Kong (API Gateway) | 54321 | Entry point para Supabase APIs |
| PostgreSQL | 54322 | Banco de dados direto |
| Realtime | 54323 | WebSocket subscriptions |
| Supabase Studio | 54323 | Admin UI |
| GoTrue | 54324 | Auth service |
| Inbucket Web | 54324 | Ver emails de teste |
| Inbucket SMTP | 54325 | SMTP local |
| BFF | 8080 | Microservice backend |
| Frontend | 5173 | Dev server Vite |

## Variáveis de Ambiente

### Frontend (.env.local)

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<obtido de 'supabase status'>
VITE_BFF_BASE_URL=http://127.0.0.1:8080
```

### BFF (.env)

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<obtido de 'supabase status'>
SMTP_HOST=127.0.0.1
SMTP_PORT=54325
PORT=8080
```

**⚠️ IMPORTANTE**: O `SUPABASE_SERVICE_ROLE_KEY` NUNCA deve ir para o frontend!

## Sessões de UI (7 telas)

1. **Session 00**: Login (autenticação)
2. **Session 01**: Customers Kanban (5 lanes: documentação pendente, enviada, em dia, provas, inadimplentes)
3. **Session 02**: App Access (gerenciar acesso mobile dos clientes)
4. **Session 03**: Legal Tickets (tickets jurídicos e processos)
5. **Session 04**: Support Chat/Email (comunicação com clientes)
6. **Session 05**: Global Logs (auditoria de ações)
7. **Session 06**: Team Management (gerenciar equipe e permissões)

## Multi-Tenancy

Todas as tabelas possuem coluna `tenancy_id` com RLS habilitado.

**Helper Functions**:
- `brain.current_tenancy_id()`: Retorna o tenant do usuário logado
- `brain.current_user_role()`: Retorna o role (admin, vendas, juridico, suporte)
- `brain.is_admin()`: Verifica se usuário é admin

## Storage

Bucket único: `brain-private`

**Path Convention**:
```
brain-private/
  {tenancy_id}/
    customers/{cliente_id}/{arquivo_id}/{filename}
    contracts/{contrato_id}/{arquivo_id}/{filename}
    legal/{processo_id}/{arquivo_id}/{filename}
    chat/{thread_id}/{mensagem_id}/{filename}
    calls/{ligacao_id}/{arquivo_id}/{filename}
```

## Comandos Úteis

```bash
# Verificar status do Supabase
supabase status

# Ver logs dos containers
supabase logs

# Resetar banco de dados (CUIDADO: apaga dados!)
supabase db reset

# Parar Supabase
supabase stop

# Acessar Studio (Admin UI)
# Abrir: http://127.0.0.1:54323
```

## Desenvolvimento

1. Certifique-se que Docker Desktop está rodando
2. Inicie o Supabase: `supabase start`
3. Em terminais separados:
   - Frontend: `cd frontend && npm run dev`
   - BFF: `cd bff && npm run dev`
4. Acesse: http://localhost:5173

## Documentação Técnica

- [supabase_brain.md](./supabase_brain.md): Especificação completa (22+ tabelas, enums, RLS policies)
- [Plano de Implementação](./.claude/plans/sunny-swinging-walrus.md): Architecture diagrams e task list

## Licença

Proprietary - Uso interno apenas
