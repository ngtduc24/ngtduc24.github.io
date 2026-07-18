-- Gán quyền sở hữu AR target theo tài khoản
-- Mục tiêu: mỗi tài khoản chỉ thấy AR do chính mình tạo trong trang quản trị

-- 1. Thêm cột owner_id (lưu id tài khoản trong bảng users của app)
alter table public.ar_targets add column if not exists owner_id text;

-- 2. Tùy chọn, gán toàn bộ AR cũ đang trống chủ cho một tài khoản cụ thể
--    Thay YOUR_ACCOUNT_ID bằng id tài khoản của bạn trong bảng users
-- update public.ar_targets set owner_id = 'YOUR_ACCOUNT_ID' where owner_id is null;

-- Ghi chú bảo mật
-- App dùng Supabase ở chế độ anon với RLS mở, xác thực người dùng qua bảng users riêng,
-- nên lọc theo owner_id là ở phía giao diện. Đây là phân tách hiển thị cho tiện dùng cá nhân,
-- không phải rào chắn bảo mật tuyệt đối ở tầng cơ sở dữ liệu.
