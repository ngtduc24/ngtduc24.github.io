-- =====================================================================================
-- APP AUTOMATIC (tự động hoá quy trình, cách làm theo n8n)
-- Chạy toàn bộ tệp trong Supabase > SQL Editor > Run. Chạy lại nhiều lần vẫn an toàn.
-- Cần chạy sau RLS_2026_10.sql (dùng hàm public.rls_uid()).
-- =====================================================================================

create table if not exists public.automatic_workflows (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null default 'Quy trình mới',
  nodes jsonb not null default '[]'::jsonb,
  connections jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  last_slot text,                       -- mốc lịch đã chạy gần nhất (chống chạy trùng giữa nhiều máy)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists automatic_workflows_owner_idx on public.automatic_workflows (owner_id);

create table if not exists public.automatic_executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automatic_workflows(id) on delete cascade,
  owner_id text not null,
  mode text not null default 'manual',  -- manual: chạy thử, schedule: chạy theo lịch
  status text not null default 'running', -- running, success, error
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  error text
);
create index if not exists automatic_executions_wf_idx on public.automatic_executions (workflow_id, started_at desc);

alter table public.automatic_workflows enable row level security;
alter table public.automatic_executions enable row level security;
grant select, insert, update, delete on public.automatic_workflows to anon, authenticated;
grant select, insert, update, delete on public.automatic_executions to anon, authenticated;

drop policy if exists aw_all on public.automatic_workflows;
create policy aw_all on public.automatic_workflows for all to anon, authenticated
  using (public.rls_uid() is not null and owner_id = public.rls_uid())
  with check (public.rls_uid() is not null and owner_id = public.rls_uid());

drop policy if exists ax_all on public.automatic_executions;
create policy ax_all on public.automatic_executions for all to anon, authenticated
  using (public.rls_uid() is not null and owner_id = public.rls_uid())
  with check (public.rls_uid() is not null and owner_id = public.rls_uid());

notify pgrst, 'reload schema';
