-- =====================================================
-- Migration: create_contrato_templates
-- Description: Add contrato templates for service presets
-- Date: 2026-01-15
-- =====================================================

create table if not exists brain.contrato_templates (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references brain.tenants(id) on delete cascade,
  produto text not null,
  servico text not null,
  metodo_pagamento text not null,
  parcelas_min integer not null default 1,
  parcelas_max integer not null default 1,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contrato_templates_parcelas_chk check (parcelas_min > 0 and parcelas_max >= parcelas_min)
);

create index if not exists idx_contrato_templates_tenancy on brain.contrato_templates (tenancy_id, ativo);

alter table brain.contrato_templates enable row level security;

create policy contrato_templates_tenant_isolation on brain.contrato_templates
  for all
  using (tenancy_id = brain.current_tenancy_id());

create trigger update_contrato_templates_updated_at
  before update on brain.contrato_templates
  for each row
  execute function brain.update_updated_at_column();

grant select, insert, update, delete on brain.contrato_templates to authenticated;
