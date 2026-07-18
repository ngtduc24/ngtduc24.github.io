Lỗi này xảy ra do cơ chế hoạt động của Supabase.

Khi bạn tạo tài khoản mới, hệ thống thực hiện 2 bước:
1. Tạo tài khoản trong **Supabase Authentication** (đây là nơi quản lý đăng nhập, mật khẩu).
2. Lưu thông tin quyền hạn (role, permissions) vào bảng `users` trong **Database**.

Tài khoản của bạn đã được tạo thành công ở bước 1 (nên bạn thấy nó xuất hiện trong ảnh chụp màn hình Authentication). Tuy nhiên, nó bị lỗi ở bước 2 vì **Supabase vẫn đang lưu cache (bộ nhớ tạm) cấu trúc bảng cũ**, dẫn đến việc từ chối lưu dữ liệu vào bảng `users`. Do không lưu được vào Database, ứng dụng web không thể tải được tài khoản này lên danh sách.

**ĐỂ KHẮC PHỤC TRIỆT ĐỂ, BẠN CHỈ CẦN LÀM 1 THAO TÁC SAU:**

1. Mở trang quản trị Supabase của bạn.
2. Nhìn sang cột Menu bên trái, bấm vào **SQL Editor**.
3. Dán dòng lệnh này vào khung soạn thảo và bấm nút **RUN**:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

*Hoặc cách khác:*
Vào mục **Project Settings** (biểu tượng bánh răng) -> Chọn **API** -> Lướt xuống tìm và bấm vào nút **Reload PostgREST**.

Sau khi thực hiện 1 trong 2 cách trên, bạn quay lại web và thử tạo tài khoản mới. Mọi thứ sẽ hoạt động bình thường và tài khoản sẽ hiển thị ngay lập tức!
