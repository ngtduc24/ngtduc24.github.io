-- ============================================================
-- BẬT LẠI ROW LEVEL SECURITY CHO TOÀN BỘ SUPABASE
-- Chạy toàn bộ file này trong Supabase Dashboard, mục SQL Editor, rồi nhấn RUN.
--
-- Vì sao cần chạy. Khóa anon của Supabase nằm công khai trong file JavaScript của
-- trang web, đây là thiết kế bình thường của Supabase nhưng chỉ an toàn khi RLS bật.
-- Hai file SUPABASE_SCHEMA.sql và PORTFOLIO_SUPABASE_SCHEMA.sql đang tắt RLS trên
-- mọi bảng, nghĩa là bất kỳ ai mở trang web cũng đọc, sửa và xóa được toàn bộ dữ liệu.
--
-- Cách xác thực. Ứng dụng đăng nhập bằng Firebase và đã khai báo Firebase là nhà
-- cung cấp xác thực bên thứ ba cho Supabase, xem src/lib/supabase.ts. Do đó trong
-- policy ta đọc thông tin người dùng từ auth.jwt(). Lưu ý không dùng auth.uid()
-- vì hàm đó ép kiểu sang uuid, trong khi uid của Firebase không phải uuid.
--
-- BƯỚC BẮT BUỘC. Ở mục 1 bên dưới, thay email trong bảng app_admins bằng đúng
-- email tài khoản quản trị của bạn. Nếu bỏ qua bước này, sẽ không ai ghi được dữ liệu.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Danh sách tài khoản quản trị
-- ------------------------------------------------------------
create table if not exists public.app_admins (
  email text primary key,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.app_admins enable row level security;
-- Cố ý không tạo policy nào cho bảng này. Không có policy nghĩa là anon và
-- authenticated không đọc cũng không ghi được. Chỉ service_role và SQL Editor
-- mới thao tác được, đó là điều ta muốn.
revoke all on table public.app_admins from anon, authenticated;

-- THAY EMAIL DƯỚI ĐÂY bằng email quản trị thật của bạn.
insert into public.app_admins (email, note)
values ('ngtduc24@gmail.com', 'Tai khoan quan tri chinh')
on conflict (email) do nothing;

-- ------------------------------------------------------------
-- 2. Hàm trợ giúp
-- ------------------------------------------------------------
create or replace function public.jwt_uid()
returns text language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

create or replace function public.jwt_email()
returns text language sql stable as $$
  select lower(nullif(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_signed_in()
returns boolean language sql stable as $$
  select public.jwt_uid() is not null;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_admins a
    where lower(a.email) = public.jwt_email()
  );
$$;

grant execute on function public.jwt_uid, public.jwt_email,
  public.is_signed_in, public.is_admin to anon, authenticated;

-- ------------------------------------------------------------
-- 3. Khuôn mẫu policy dùng chung
--    public_read  đọc công khai, ghi chỉ dành cho quản trị
--    member_read  chỉ tài khoản đã đăng nhập mới đọc, ghi dành cho quản trị
--    member_rw    tài khoản đã đăng nhập đọc và ghi, dùng cho dữ liệu cộng tác
-- ------------------------------------------------------------
create or replace function public.apply_policy(target regclass, mode text)
returns void language plpgsql as $$
declare
  t text := target::text;
  base text := replace(replace(t, 'public.', ''), '"', '');
begin
  execute format('alter table %s enable row level security', t);

  execute format('drop policy if exists %I on %s', base || '_read', t);
  execute format('drop policy if exists %I on %s', base || '_write', t);
  execute format('drop policy if exists %I on %s', base || '_public_read', t);
  execute format('drop policy if exists %I on %s', base || '_app_write', t);

  if mode = 'public_read' then
    execute format('create policy %I on %s for select to anon, authenticated using (true)', base || '_read', t);
    execute format('create policy %I on %s for all to authenticated using (public.is_admin()) with check (public.is_admin())', base || '_write', t);
  elsif mode = 'member_read' then
    execute format('create policy %I on %s for select to authenticated using (public.is_signed_in())', base || '_read', t);
    execute format('create policy %I on %s for all to authenticated using (public.is_admin()) with check (public.is_admin())', base || '_write', t);
  elsif mode = 'member_rw' then
    execute format('create policy %I on %s for select to authenticated using (public.is_signed_in())', base || '_read', t);
    execute format('create policy %I on %s for all to authenticated using (public.is_signed_in()) with check (public.is_signed_in())', base || '_write', t);
  else
    raise exception 'Che do policy khong hop le: %', mode;
  end if;

  execute format('revoke all on table %s from anon', t);
  execute format('grant select on table %s to anon', t);
  execute format('grant select, insert, update, delete on table %s to authenticated', t);
end;
$$;

-- ------------------------------------------------------------
-- 4. Áp policy cho từng bảng
-- ------------------------------------------------------------
do $$
declare
  r record;
  public_tables text[] := array[
    'app_settings',
    'journal_fields', 'journal_types', 'scientific_journals',
    'portfolio_settings', 'portfolio_education', 'portfolio_experience',
    'portfolio_skills', 'portfolio_projects', 'portfolio_courses',
    'portfolio_course_chapters', 'portfolio_course_lessons',
    'portfolio_research', 'portfolio_lectures'
  ];
  member_read_tables text[] := array[
    'system_notifications', 'portfolio_course_students', 'media_library'
  ];
  member_rw_tables text[] := array[
    'tasks', 'qda_projects', 'qda_documents', 'qda_codes',
    'qda_annotations', 'qda_memos'
  ];
  name text;
begin
  foreach name in array public_tables loop
    if to_regclass('public.' || name) is not null then
      perform public.apply_policy(('public.' || name)::regclass, 'public_read');
    end if;
  end loop;

  foreach name in array member_read_tables loop
    if to_regclass('public.' || name) is not null then
      perform public.apply_policy(('public.' || name)::regclass, 'member_read');
    end if;
  end loop;

  foreach name in array member_rw_tables loop
    if to_regclass('public.' || name) is not null then
      perform public.apply_policy(('public.' || name)::regclass, 'member_rw');
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 5. Bảng đếm lượt xem. Khách vãng lai cần tăng số đếm nên được phép ghi,
--    nhưng bảng này chỉ chứa con số thống kê, không có dữ liệu cá nhân.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.app_stats') is not null then
    execute 'alter table public.app_stats enable row level security';
    execute 'drop policy if exists app_stats_read on public.app_stats';
    execute 'drop policy if exists app_stats_write on public.app_stats';
    execute 'create policy app_stats_read on public.app_stats for select to anon, authenticated using (true)';
    execute 'create policy app_stats_write on public.app_stats for all to anon, authenticated using (true) with check (true)';
    execute 'grant select, insert, update on table public.app_stats to anon, authenticated';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 6. Bảng users. Ứng dụng thật sự lưu người dùng trên Firestore, bảng này chỉ là
--    bản sao cũ nhưng vẫn chứa email, vai trò và cột mật khẩu, nên khóa chặt.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.users') is not null then
    execute 'alter table public.users drop column if exists password';
    execute 'alter table public.users enable row level security';
    execute 'drop policy if exists users_read on public.users';
    execute 'drop policy if exists users_write on public.users';
    execute 'drop policy if exists users_self_read on public.users';
    -- Người dùng chỉ đọc được đúng dòng của chính mình, quản trị đọc và ghi tất cả.
    execute 'create policy users_self_read on public.users for select to authenticated using (id = public.jwt_uid() or public.is_admin())';
    execute 'create policy users_write on public.users for all to authenticated using (public.is_admin()) with check (public.is_admin())';
    execute 'revoke all on table public.users from anon';
    execute 'grant select, insert, update, delete on table public.users to authenticated';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 7. Bảng AR. Trước đây policy để using (true) cho cả anon nên ai cũng sửa xóa được.
--    Nay khách chỉ đọc, còn ghi thì phải đăng nhập và chỉ động vào bản ghi của mình.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.ar_targets') is not null then
    execute 'alter table public.ar_targets add column if not exists owner_id text';
    execute 'alter table public.ar_targets enable row level security';
    execute 'drop policy if exists ar_targets_public_read on public.ar_targets';
    execute 'drop policy if exists ar_targets_app_write on public.ar_targets';
    execute 'drop policy if exists ar_targets_read on public.ar_targets';
    execute 'drop policy if exists ar_targets_insert on public.ar_targets';
    execute 'drop policy if exists ar_targets_update on public.ar_targets';
    execute 'drop policy if exists ar_targets_delete on public.ar_targets';
    execute 'create policy ar_targets_read on public.ar_targets for select to anon, authenticated using (true)';
    execute 'create policy ar_targets_insert on public.ar_targets for insert to authenticated with check (public.is_signed_in() and (owner_id = public.jwt_uid() or public.is_admin()))';
    execute 'create policy ar_targets_update on public.ar_targets for update to authenticated using (owner_id = public.jwt_uid() or public.is_admin()) with check (owner_id = public.jwt_uid() or public.is_admin())';
    execute 'create policy ar_targets_delete on public.ar_targets for delete to authenticated using (owner_id = public.jwt_uid() or public.is_admin())';
    execute 'revoke all on table public.ar_targets from anon';
    execute 'grant select on table public.ar_targets to anon';
    execute 'grant select, insert, update, delete on table public.ar_targets to authenticated';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 8. Kho tệp AR. Trước đây ai cũng ghi đè và xóa được mọi tệp trong bucket.
-- ------------------------------------------------------------
drop policy if exists "AR Assets public read" on storage.objects;
drop policy if exists "AR Assets app write" on storage.objects;
drop policy if exists "ar_assets_read" on storage.objects;
drop policy if exists "ar_assets_insert" on storage.objects;
drop policy if exists "ar_assets_update" on storage.objects;
drop policy if exists "ar_assets_delete" on storage.objects;

create policy "ar_assets_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'ar_assets');
create policy "ar_assets_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'ar_assets' and public.is_signed_in());
create policy "ar_assets_update" on storage.objects
  for update to authenticated using (bucket_id = 'ar_assets' and public.is_admin());
create policy "ar_assets_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'ar_assets' and public.is_admin());

-- ------------------------------------------------------------
-- 9. Kiểm tra lại sau khi chạy. Cột rowsecurity phải là true ở mọi dòng.
-- ------------------------------------------------------------
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by rowsecurity, tablename;
