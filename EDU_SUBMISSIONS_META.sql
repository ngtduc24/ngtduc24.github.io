-- Bài nộp cũ lưu tệp dạng base64 ngay trong cột files (mỗi bài 1 đến vài MB). Trang lớp học tải toàn bộ
-- bài nộp của lớp nên câu lệnh vượt statement timeout (3 giây cho anon) và tốn băng thông.
-- Cách xử lý: thêm cột files_meta do trigger tự tính, chứa đúng danh sách tệp nhưng chuỗi base64 được thay
-- bằng cờ inline = true và kích thước. Trang giảng viên đọc view edu_submissions_meta (chỉ cột nhẹ),
-- khi bấm xem 1 tệp inline mới gọi edu_submission_file_url để lấy đúng tệp đó.
-- Chạy trong Supabase SQL Editor (Run without RLS).

alter table public.edu_submissions add column if not exists files_meta jsonb;

create or replace function public.edu_submission_files_meta(p_files jsonb)
returns jsonb language sql immutable as $$
  select coalesce((
    select jsonb_agg(
      case when left(f->>'url', 5) = 'data:'
        then (f - 'url') || jsonb_build_object('url', '', 'inline', true, 'size', length(f->>'url'))
        else f end
      order by ord)
    from jsonb_array_elements(coalesce(p_files, '[]'::jsonb)) with ordinality as t(f, ord)
  ), '[]'::jsonb)
$$;

create or replace function public.edu_submissions_set_meta()
returns trigger language plpgsql as $$
begin
  new.files_meta := public.edu_submission_files_meta(new.files);
  return new;
end $$;

drop trigger if exists trg_edu_submissions_meta on public.edu_submissions;
create trigger trg_edu_submissions_meta
before insert or update of files on public.edu_submissions
for each row execute function public.edu_submissions_set_meta();

-- Tính 1 lần cho dữ liệu cũ.
update public.edu_submissions set files_meta = public.edu_submission_files_meta(files) where files_meta is null;

create or replace view public.edu_submissions_meta
with (security_invoker = true) as
select id, assignment_id, user_id, mssv, content, submitted_at, updated_at, first_submitted_at,
       coalesce(files_meta, '[]'::jsonb) as files
from public.edu_submissions;

grant select on public.edu_submissions_meta to anon, authenticated;

create or replace function public.edu_submission_file_url(p_submission uuid, p_index int)
returns text language sql stable security definer set search_path = public as $$
  select files->p_index->>'url' from public.edu_submissions where id = p_submission;
$$;

grant execute on function public.edu_submission_file_url(uuid, int) to anon, authenticated;
