-- ============================================================
-- HOÀN TÁC KHẨN CẤP CHO SECURITY_RLS.sql
-- Chỉ dùng khi sau khi bật RLS mà trang web hỏng nặng và bạn cần khôi phục ngay
-- để tiếp tục công việc. Lưu ý chạy file này đưa cơ sở dữ liệu trở lại trạng thái
-- ai cũng đọc ghi được, nên chỉ nên dùng tạm rồi báo lại để sửa đúng policy.
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> 'app_admins'
  loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end;
$$;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
