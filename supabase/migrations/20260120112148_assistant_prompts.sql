create table if not exists brain.assistant_prompts (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null default brain.current_tenancy_id() references brain.tenants(id),
  assistant_key text not null,
  action text not null,
  label text not null,
  system_prompt text not null,
  user_template text not null,
  output_schema text not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  unique (tenancy_id, assistant_key, action)
);

alter table brain.assistant_prompts enable row level security;

create policy "tenant_read"
on brain.assistant_prompts
for select to authenticated
using (tenancy_id = brain.current_tenancy_id());

create policy "tenant_write"
on brain.assistant_prompts
for insert to authenticated
with check (tenancy_id = brain.current_tenancy_id());

create policy "tenant_update"
on brain.assistant_prompts
for update to authenticated
using (tenancy_id = brain.current_tenancy_id());

create policy "tenant_delete"
on brain.assistant_prompts
for delete to authenticated
using (tenancy_id = brain.current_tenancy_id());
