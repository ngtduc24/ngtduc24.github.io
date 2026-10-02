-- =====================================================================================
-- APP AUTOMATIC (tự động hoá quy trình, cách làm theo n8n) VÀ THÓI QUEN SỬ DỤNG Ở TRANG CHỦ
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

-- =====================================================================================
-- THÓI QUEN SỬ DỤNG (Trang chủ tự sắp xếp theo thói quen, mục Tiếp tục, Gợi ý lúc này)
-- Khoá usage:<uid> trong bảng portfolio_settings chỉ chủ tài khoản đọc và ghi được.
-- Hai hàm dưới giữ nguyên nội dung trong RLS_2026_10.sql, chỉ thêm 1 dòng cho khoá usage:
-- =====================================================================================
create or replace function public.ps_can_read(p_key text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare u text := public.rls_uid();
begin
  if p_key like 'notif_state:%' then return u is not null and p_key = 'notif_state:' || u; end if;
  if p_key like 'usage:%' then return u is not null and p_key = 'usage:' || u; end if;
  if p_key like 'trash:%' then return u is not null and p_key like 'trash:' || u || ':%'; end if;
  if p_key like 'deck:%' then
    return u is not null and (split_part(p_key, ':', 2) = u or public.collab_role('slide_deck', split_part(p_key, ':', 3)) is not null);
  end if;
  if p_key like 'quant:%' then
    return u is not null and (split_part(p_key, ':', 2) = u or public.collab_role('quant_project', split_part(p_key, ':', 3)) is not null);
  end if;
  return true;
end $$;

create or replace function public.ps_can_write(p_key text, p_data jsonb) returns boolean language plpgsql stable security definer set search_path = public as $$
declare u text := public.rls_uid(); pre text;
begin
  if u is null then return false; end if;
  if p_key like 'notif_state:%' then return p_key = 'notif_state:' || u; end if;
  if p_key like 'usage:%' then return p_key = 'usage:' || u; end if;
  if p_key like 'trash:%' then return p_key like 'trash:' || u || ':%'; end if;
  if p_key like 'profile:%' then return p_key = 'profile:' || u; end if;
  if p_key like 'site_owner:%' then return p_key = 'site_owner:' || u; end if;
  if p_key like 'site:%' then return coalesce(p_data->>'owner', '') = u; end if;
  if p_key like 'deck:%' then
    return split_part(p_key, ':', 2) = u or public.collab_role('slide_deck', split_part(p_key, ':', 3)) in ('edit', 'manage');
  end if;
  if p_key like 'quant:%' then
    return split_part(p_key, ':', 2) = u or public.collab_role('quant_project', split_part(p_key, ':', 3)) in ('edit', 'manage');
  end if;
  if p_key like 'deck_share:%' then
    return coalesce(p_data->>'key', '') like 'deck:%' and (split_part(p_data->>'key', ':', 2) = u or public.collab_role('slide_deck', split_part(p_data->>'key', ':', 3)) in ('edit', 'manage'));
  end if;
  if p_key like 'edugo_%' then return true; end if;
  -- Khoá dạng <uid>:<tên> là trang web riêng của người đó.
  if position(':' in p_key) > 0 then
    pre := split_part(p_key, ':', 1);
    return pre = u;
  end if;
  -- Khoá không tiền tố là trang web cũ của quản trị viên chính.
  return public.is_top_admin();
end $$;

notify pgrst, 'reload schema';
