-- Lý lịch khoa học cá nhân. Bảng BẬT RLS và KHÔNG có policy nào, nên khoá anon và authenticated
-- (khoá công khai nằm trong mã web) không đọc, không ghi được. Chỉ Edge Function scientific-cv dùng
-- service role mới truy cập, và hàm này chỉ trả hồ sơ đúng chủ sau khi xác thực token Firebase.
-- Cột payload là nội dung đã mã hoá AES-GCM bằng khoá bí mật CV_ENC_KEY của hàm, nên xem bảng trong
-- dashboard cũng chỉ thấy chuỗi mã hoá.
create table if not exists public.scientific_cvs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null default 'Lý lịch khoa học',
  payload text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scientific_cvs_owner_idx on public.scientific_cvs (owner_id, updated_at desc);
alter table public.scientific_cvs enable row level security;
revoke all on public.scientific_cvs from anon, authenticated;
