-- Kho dữ liệu cá nhân cho các ứng dụng riêng tư (hiện có: Tạo mã QR, kind = 'qr').
-- Bật RLS và không có policy: khoá công khai của web không đọc, không ghi được. Chỉ Edge Function
-- private-items (service role) truy cập, sau khi xác thực token Firebase và lọc đúng chủ dữ liệu.
-- Cột payload là nội dung đã mã hoá AES-GCM.
create table if not exists public.private_items (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  kind text not null,
  payload text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists private_items_owner_idx on public.private_items (owner_id, kind, updated_at desc);
alter table public.private_items enable row level security;
revoke all on public.private_items from anon, authenticated;
