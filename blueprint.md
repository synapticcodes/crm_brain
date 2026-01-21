# BRAIN CRM Blueprint (Atualizado)

Documento consolidado do produto apos as ultimas modificacoes:
- Roles apenas: admin e administrativo.
- Contrato nao e enviado/gerado pelo sistema; e um documento anexado no card do cliente.
- Stack final: Supabase Cloud, BFF Railway, Frontend Netlify, SMTP AWS SES, pagamentos TENEX, assinatura Autentique.

---

## 1) Visao Geral

O BRAIN CRM e um sistema multi-tenant para administrar clientes com documentos, financeiro, juridico, chat/email e logs. A separacao de dados e feita por tenancy_id em todas as tabelas relevantes (RLS).

Objetivo: migrar o MVP de mocks para um produto real e robusto, com integracoes externas e operacao segura.

---

## 2) Stack Final (Definido)

- Banco/Auth/Storage/Realtime: Supabase Cloud
- BFF (Backend for Frontend): Railway
- Frontend: Netlify
- Email transacional: AWS SES (SMTP)
- Pagamentos: TENEX (gateway proprio)
- Assinatura digital: Autentique
- OCR: nao utilizado (validacao humana dos documentos)
- Observabilidade: Sentry + OpenTelemetry + logs centralizados
- WAF e rate limit: Cloudflare
- Secrets: Doppler / AWS Secrets / Vault

---

## 3) Funcionalidades

- Login, logout, refresh, reset de senha.
- Multi-tenant completo (DB, Storage, Realtime).
- Clientes: Kanban, filtros, card completo, timeline.
- Documentos: upload, validacao manual, aprovado/rejeitado.
- App Access: pendente/liberado/bloqueado com motivo.
- Juridico: tickets, mensagens e status.
- Suporte: chat realtime, email (SES), export TXT.
- Logs: auditoria de eventos e filtros.
- Assistentes (IA): resumo, sugestao, busca semantica (admin).
- Equipe: convites, desativacao, status (admin).

---

## 4) Requisitos Funcionais Criticos

- Auth carrega role real de brain.equipe.
- RLS garante isolamento total por tenant.
- Todas as acoes criticas geram log em brain.logs.
- Upload cria registro em brain.arquivos.
- Emails via SES registram status e tratam bounce/complaint.
- Chat e juridico com Realtime funcional.
- Export de chat gera TXT cronologico.
- Contrato e documento anexado no card do cliente (sem envio pelo sistema).
- Prompts e Equipe sao admin-only (frontend + BFF).

---

## 5) Roles e Permissoes

### Admin
- Acesso total a todas as telas e acoes.
- Pode acessar Prompts e Equipe.
- Pode convidar/desativar usuarios e alterar roles.
- Pode usar assistentes e gerenciar prompts.
- Nao pode acessar dados de outro tenant.

### Administrativo
- Acesso operacional completo (clientes, documentos, juridico, suporte, logs, app access).
- Pode enviar emails e responder chat.
- Nao acessa Prompts.
- Nao acessa Equipe.
- Nao pode acessar dados de outro tenant.

---

## 6) Rotas do Frontend (React)

- /login
- /customers
- /app-access
- /legal
- /support
- /logs
- /prompts (admin only)
- /team (admin only)
- /meu-perfil
- /profile (redirect para /meu-perfil)

---

## 7) Rotas do BFF (Express)

Rotas atuais (verificam token Supabase):
- GET /health
- POST /admin/invite (admin only)
- POST /admin/disable (admin only)
- POST /mail/send
- GET /chat/:thread_id/export.txt
- POST /chat/assist
- POST /email/assist
- POST /team/assist (admin only)
- POST /prompts/preview (admin only)

Rotas futuras recomendadas:
- POST /webhooks/ses (bounce, complaint, delivery)
- POST /webhooks/tenex (pagamentos, chargeback)
- POST /webhooks/autentique (assinatura completa)

---

## 8) Onde Fica o Que (Codigo)

- Frontend: frontend/
  - src/pages (telas)
  - src/lib (stores, api, supabase client)
  - src/components (UI)
- BFF: bff/
  - src/index.ts (rotas)
  - src/auth.ts (validacao token e role)
  - src/mailer.ts (SMTP)
- Supabase: supabase/
  - migrations (DDL + RLS)
  - seed.sql (dados locais)

---

## 9) Banco de Dados e Entidades Principais

Tabelas principais:
- brain.tenants
- brain.equipe
- brain.clientes
- brain.documentos_do_cliente
- brain.arquivos
- brain.chat_threads, brain.chat_mensagens
- brain.emails_mensagens
- brain.logs
- brain.juridico_tickets, brain.juridico_ticket_mensagens
- brain.cliente_app

Nota sobre contratos:
- O contrato assinado e tratado como documento anexado do cliente.
- O sistema nao gera nem envia contratos.
- Se a tabela brain.contratos for usada, e apenas para referencia financeira.

---

## 10) Storage (Supabase)

Bucket: brain-private

Path convention:
- tenants/{tenancy_id}/clientes/{cliente_id}/{arquivo_id}/{original_filename}
- tenants/{tenancy_id}/threads/{thread_id}/{message_id}/{filename}
- tenants/{tenancy_id}/calls/{ligacao_id}/{filename}
- tenants/{tenancy_id}/legal/{processo_id}/{filename}

Contrato assinado deve ser anexado como documento do cliente (path clientes).

---

## 11) Integracoes Externas e Tipo de Acesso

### AWS SES (SMTP)
- Acesso: SMTP (host/porta/user/pass).
- Necessario: SPF/DKIM/DMARC e conta fora do sandbox.
- Webhooks: SNS/SQS para bounce/complaint.

### TENEX (Pagamentos)
- Acesso: API REST + webhooks.
- Necessario: chaves e assinatura de webhook.
- Eventos: pagamento confirmado, falhado, chargeback.

### Autentique (Assinatura)
- Acesso: API REST + webhooks.
- Necessario: token de API.
- Eventos: assinatura concluida.

### LLM (Assistentes)
- Acesso: API REST (OpenAI/Azure/Anthropic).
- Necessario: chave e controle de custo.

### Observabilidade
- Sentry + OpenTelemetry (ingestao de erros e traces).
- Logs centralizados (ELK/Datadog/CloudWatch).

### WAF e Rate Limit
- Cloudflare para protecao e regras.

---

## 12) Variaveis de Ambiente (Resumo)

Frontend (Netlify):
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_BFF_BASE_URL

BFF (Railway):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SMTP_HOST (SES)
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM
- OPENAI_API_KEY (se usar IA)
- TENEX_API_KEY / TENEX_WEBHOOK_SECRET
- AUTENTIQUE_API_KEY

---

## 13) Checklist de Migracao do Mock para Real

- Trocar mocks por queries reais do Supabase nas telas.
- Implementar Realtime real em chat/juridico.
- Ativar envio de email via SES.
- Implementar webhooks SES/TENEX/Autentique no BFF.
- Garantir logs em brain.logs para acoes criticas.
- Validar RLS multi-tenant em producao.

