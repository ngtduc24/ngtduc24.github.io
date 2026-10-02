-- Tách dữ liệu theo từng người dùng (10/2026)
-- Môn học, phân tích định tính và thư viện tệp nay là dữ liệu riêng của từng tài khoản.

-- 1. Môn học cũ chưa có chủ: gán cho tài khoản quản trị đã tạo ra chúng.
update edu_subjects set owner_id = 'QDaOMwea6MV3XkFnv9uguv4M0Zr1' where owner_id is null;
create index if not exists edu_subjects_owner_idx on edu_subjects(owner_id);

-- 2. Phân tích định tính: thêm chủ sở hữu cho mọi bảng, ghi chú gắn với dự án, mã gắn với bộ từ điển mã.
alter table qda_projects add column if not exists owner_id text;
alter table qda_documents add column if not exists owner_id text;
alter table qda_codes add column if not exists owner_id text;
alter table qda_codes add column if not exists codebook_id text;
alter table qda_annotations add column if not exists owner_id text;
alter table qda_memos add column if not exists owner_id text;
alter table qda_memos add column if not exists project_id text;
create index if not exists qda_projects_owner_idx on qda_projects(owner_id);
create index if not exists qda_documents_owner_idx on qda_documents(owner_id, project_id);
create index if not exists qda_codes_owner_idx on qda_codes(owner_id, project_id);
create index if not exists qda_annotations_owner_idx on qda_annotations(owner_id);
create index if not exists qda_memos_owner_idx on qda_memos(owner_id, project_id);

-- 3. Thư viện tệp của từng người (thay cho Firestore uploaded_images).
create table if not exists media_items (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  owner_name text,
  url text not null,
  public_id text,
  type text,
  format text,
  bytes bigint default 0,
  width int,
  height int,
  duration real,
  category text,
  original_filename text,
  created_at timestamptz not null default now()
);
create index if not exists media_items_owner_idx on media_items(owner_id, created_at desc);
alter table media_items disable row level security;
grant select, insert, update, delete on media_items to anon, authenticated;

notify pgrst, 'reload schema';
