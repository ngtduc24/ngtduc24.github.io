-- Cộng tác: chủ sở hữu thêm người khác vào bài giảng, bài tập, câu hỏi, đề trắc nghiệm,
-- lớp, trường, dự án định tính, định lượng, với quyền hạn rõ ràng.
-- Cùng mô hình với các bảng EDU: owner_id, user_id là Firebase uid dạng TEXT, tắt RLS, lọc ở phía web.
-- Chạy 1 lần trong Supabase SQL Editor.

create table if not exists collaborators (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,          -- el_lesson, bank_item, quiz, quiz_question, edu_class, edu_school, qda_project, quant_project
  resource_id text not null,
  resource_title text,
  owner_id text not null,               -- chủ sở hữu tài nguyên
  user_id text not null,                -- người được thêm
  user_name text,
  user_email text,
  role text not null default 'view',    -- view, edit, manage (với lớp, trường dùng thêm perms)
  perms jsonb not null default '{}'::jsonb,
  added_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_type, resource_id, user_id)
);

create index if not exists collaborators_user_idx on collaborators (user_id, resource_type);
create index if not exists collaborators_resource_idx on collaborators (resource_type, resource_id);

alter table collaborators disable row level security;
grant select, insert, update, delete on collaborators to anon, authenticated;
