# Bật tải lên có ký cho Cloudinary (Signed Upload)

Mục tiêu. Chỉ tài khoản đã đăng nhập trong app mới tải tệp lên được. Người lạ không lấy được chữ ký nên không tải lên được. API Secret của Cloudinary luôn nằm ở phía máy chủ, không lộ ra trình duyệt.

Cơ chế. Trình duyệt xin một chữ ký từ Supabase Edge Function tên sign-upload. Hàm này kiểm tra token đăng nhập Firebase, nếu hợp lệ mới ký và trả về chữ ký. Sau đó trình duyệt tải thẳng lên Cloudinary kèm chữ ký đó.

## 1. Cài Supabase CLI

macOS dùng Homebrew.

    brew install supabase/tap/supabase

Kiểm tra.

    supabase --version

## 2. Đăng nhập và liên kết dự án

    supabase login
    supabase link --project-ref <PROJECT_REF>

PROJECT_REF là phần đầu của URL Supabase. Ví dụ URL là https://abcxyz123.supabase.co thì PROJECT_REF là abcxyz123.

## 3. Khai báo secret cho hàm

Lấy API Key và API Secret trong Cloudinary tại Settings rồi API Keys.

    supabase secrets set \
      CLOUDINARY_CLOUD_NAME=ten_cloud_cua_ban \
      CLOUDINARY_API_KEY=api_key_cua_ban \
      CLOUDINARY_API_SECRET=api_secret_cua_ban \
      FIREBASE_PROJECT_ID=andynguyen-9c4cd

Lưu ý. API Secret chỉ đặt ở đây, tuyệt đối không đưa vào GitHub hay vào code trình duyệt.

## 4. Triển khai hàm

    supabase functions deploy sign-upload --no-verify-jwt

Cờ --no-verify-jwt để Supabase không bắt token riêng của Supabase, vì hàm tự kiểm tra token Firebase bên trong.

## 5. Tắt Unsigned và build lại

Sau khi hàm chạy, trong Cloudinary bạn có thể xóa hoặc chuyển preset Unsigned sang Signed. Trên GitHub bạn có thể xóa secret VITE_CLOUDINARY_UPLOAD_PRESET vì không còn dùng. Giữ lại VITE_SUPABASE_URL vì client dùng nó để gọi hàm ký. Sau đó chạy lại workflow deploy để build bản mới.

## 6. Kiểm tra

Đăng nhập vào app rồi thử tải một ảnh. Nếu tải được là xong. Đăng xuất rồi thử, hệ thống phải báo cần đăng nhập.
