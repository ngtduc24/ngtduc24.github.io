-- =====================================================================
-- Migration sửa bảng ar_targets cho khớp với mã nguồn ứng dụng
-- Chạy toàn bộ file này một lần trong SQL Editor của Supabase
-- An toàn khi chạy lại nhiều lần
-- =====================================================================

create extension if not exists pgcrypto;

-- 1. Bổ sung các cột mà mã nguồn đang sử dụng nhưng schema cũ chưa có
alter table public.ar_targets add column if not exists active boolean;
alter table public.ar_targets add column if not exists owner_id text;
alter table public.ar_targets add column if not exists description text;
alter table public.ar_targets add column if not exists thumbnail_url text;
alter table public.ar_targets add column if not exists mind_file_url text;

-- 2. Chuyển dữ liệu từ cột status cũ sang cột active, rồi nới lỏng ràng buộc của status
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ar_targets' and column_name = 'status'
  ) then
    update public.ar_targets
       set active = coalesce(active, status = 'active')
     where active is null;

    execute 'alter table public.ar_targets alter column status drop not null';
  end if;
end $$;

update public.ar_targets set active = true where active is null;
alter table public.ar_targets alter column active set default true;
alter table public.ar_targets alter column active set not null;

-- 3. Cho phép cột id tự sinh giá trị, tránh lỗi null value khi ứng dụng insert không kèm id
do $$
declare
  id_type text;
begin
  select data_type into id_type
    from information_schema.columns
   where table_schema = 'public' and table_name = 'ar_targets' and column_name = 'id';

  if id_type = 'text' or id_type = 'character varying' then
    execute 'alter table public.ar_targets alter column id set default gen_random_uuid()::text';
  elsif id_type = 'uuid' then
    execute 'alter table public.ar_targets alter column id set default gen_random_uuid()';
  end if;
end $$;

-- 4. Nới ràng buộc not null cho các cột nội dung, tránh chặn bản ghi cũ hoặc bản nháp
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='ar_targets'
               and column_name='content_url' and is_nullable='NO') then
    execute 'alter table public.ar_targets alter column content_url drop not null';
  end if;
end $$;

-- 5. Chỉ mục phục vụ truy vấn danh sách theo tài khoản
create index if not exists ar_targets_owner_id_idx on public.ar_targets (owner_id);
create index if not exists ar_targets_active_idx on public.ar_targets (active);

-- 6. Gán chủ sở hữu cho các AR target cũ đang trống, thay YOUR_ACCOUNT_ID bằng id tài khoản của bạn
-- update public.ar_targets set owner_id = 'YOUR_ACCOUNT_ID' where owner_id is null;

-- =====================================================================
-- Ghi chú bảo mật, chưa xử lý trong lần sửa này theo yêu cầu giới hạn phạm vi
-- Policy ar_targets_app_write và policy storage AR Assets app write hiện cho phép
-- bất kỳ ai có anon key, vốn nằm công khai trong bundle JavaScript, sửa hoặc xóa
-- mọi bản ghi và mọi tệp trong bucket ar_assets. Nên siết lại khi có điều kiện.
-- =====================================================================
