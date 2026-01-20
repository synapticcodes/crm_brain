-- =====================================================
-- Migration: chat_assistant_embeddings
-- Description: Add summaries and embeddings for chat assistant
-- Author: Codex
-- Date: 2026-01-17
-- =====================================================

create extension if not exists vector;

alter table brain.chat_threads
  add column if not exists summary_short text,
  add column if not exists summary_long text,
  add column if not exists decision_log jsonb not null default '[]'::jsonb;

create table if not exists brain.chat_embeddings (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references brain.tenants(id) on delete cascade,
  thread_id uuid not null references brain.chat_threads(id) on delete cascade,
  message_id uuid not null references brain.chat_mensagens(id) on delete cascade,
  role text not null default 'message',
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (message_id)
);

create index if not exists idx_chat_embeddings_tenant_thread
  on brain.chat_embeddings (tenancy_id, thread_id, created_at desc);

create index if not exists idx_chat_embeddings_embedding
  on brain.chat_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table brain.chat_embeddings enable row level security;

create policy chat_embeddings_tenant_isolation on brain.chat_embeddings
  for all
  using (tenancy_id = brain.current_tenancy_id());

create or replace function brain.match_chat_embeddings(
  query_embedding vector(1536),
  match_count int,
  filter_tenancy uuid,
  filter_thread uuid
)
returns table (
  message_id uuid,
  content text,
  created_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    e.message_id,
    e.content,
    e.created_at,
    1 - (e.embedding <=> query_embedding) as similarity
  from brain.chat_embeddings e
  where e.tenancy_id = filter_tenancy
    and (filter_thread is null or e.thread_id = filter_thread)
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function brain.match_chat_embeddings(vector(1536), int, uuid, uuid) to authenticated;
