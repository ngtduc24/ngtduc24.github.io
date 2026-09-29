-- Tài nguyên thực hành đính kèm bài tập (tệp hoặc link để sinh viên tải về).
-- Mỗi phần tử: { id, name, url, kind: 'file' | 'link', size }
alter table public.edu_assignments add column if not exists resources jsonb not null default '[]'::jsonb;
alter table public.edu_assignment_bank add column if not exists resources jsonb not null default '[]'::jsonb;
notify pgrst, 'reload schema';

-- Link xem bài tập trong ngân hàng không cần MSSV
alter table public.edu_assignment_bank add column if not exists share_token text unique;
alter table public.edu_assignment_bank add column if not exists owner_name text;
notify pgrst, 'reload schema';
