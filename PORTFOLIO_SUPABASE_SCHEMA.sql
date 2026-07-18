-- ============================================================
-- SMART RESEARCH VN - PORTFOLIO CMS / SUPABASE
-- Chạy toàn bộ file trong Supabase Dashboard > SQL Editor.
-- Dữ liệu chi tiết được giữ trong JSONB để tương thích trực tiếp
-- với các kiểu dữ liệu TypeScript hiện tại; các cột thường lọc
-- được tách riêng và đánh index.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.portfolio_settings (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.portfolio_education (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.portfolio_experience (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.portfolio_skills (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  category text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.portfolio_projects (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  slug text,
  category text,
  status text not null default 'draft',
  publish_date date,
  is_featured boolean not null default false,
  is_pinned boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists portfolio_projects_slug_uidx
  on public.portfolio_projects (slug) where slug is not null and slug <> '';
create index if not exists portfolio_projects_status_idx on public.portfolio_projects (status);
create index if not exists portfolio_projects_category_idx on public.portfolio_projects (category);

create table if not exists public.portfolio_courses (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  category text,
  status text not null default 'draft',
  publish_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists portfolio_courses_status_idx on public.portfolio_courses (status);

create table if not exists public.portfolio_course_chapters (
  id text primary key,
  course_id text not null,
  data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists portfolio_chapters_course_idx on public.portfolio_course_chapters (course_id, sort_order);

create table if not exists public.portfolio_course_lessons (
  id text primary key,
  course_id text not null,
  chapter_id text,
  data jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists portfolio_lessons_course_idx on public.portfolio_course_lessons (course_id, sort_order);
create index if not exists portfolio_lessons_chapter_idx on public.portfolio_course_lessons (chapter_id, sort_order);

create table if not exists public.portfolio_course_students (
  id text primary key,
  course_id text,
  data jsonb not null default '{}'::jsonb,
  payment_status text not null default 'pending',
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists portfolio_students_course_idx on public.portfolio_course_students (course_id);

create table if not exists public.portfolio_research (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  research_type text,
  field text,
  publish_year integer,
  is_featured boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists portfolio_research_year_idx on public.portfolio_research (publish_year desc);
create index if not exists portfolio_research_type_idx on public.portfolio_research (research_type);

create table if not exists public.portfolio_lectures (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  subject text,
  document_type text,
  status text not null default 'draft',
  publish_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists portfolio_lectures_status_idx on public.portfolio_lectures (status);
create index if not exists portfolio_lectures_subject_idx on public.portfolio_lectures (subject);

-- Danh mục media dùng chung với module Thư viện. Nội dung tệp nằm trên
-- Cloudinary; Supabase chỉ lưu metadata và URL để tái sử dụng toàn hệ thống.
create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  public_id text unique,
  url text not null,
  resource_type text not null default 'image',
  format text,
  bytes bigint,
  width integer,
  height integer,
  duration numeric,
  folder text,
  original_filename text,
  source_module text not null default 'shared_library',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists media_library_type_idx on public.media_library (resource_type, created_at desc);

