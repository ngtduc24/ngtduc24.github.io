# 🎨 Portfolio — Designer

Portfolio cá nhân chạy trên GitHub Pages với trang Admin quản lý nội dung.

## 📁 Cấu trúc

```
portfolio/
├── index.html              # Trang portfolio chính (public)
├── admin/
│   └── index.html          # Trang admin (đăng nhập bằng GitHub Token)
├── data/
│   └── content.json        # File dữ liệu nội dung
└── .github/
    └── workflows/
        └── deploy.yml      # Auto-deploy GitHub Actions
```

## 🚀 Hướng dẫn deploy

### Bước 1: Tạo GitHub Repo
1. Vào [github.com](https://github.com) → **New repository**
2. Đặt tên repo (ví dụ: `portfolio`)
3. Public, không cần README
4. Upload toàn bộ file này lên repo

### Bước 2: Bật GitHub Pages
1. Vào repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**, Folder: **/ (root)**
4. Save

Portfolio sẽ live tại: `https://[username].github.io/[repo-name]/`

### Bước 3: Tạo GitHub Token
1. Vào [github.com/settings/tokens](https://github.com/settings/tokens)
2. **Generate new token (classic)**
3. Chọn quyền: **repo** (Full control)
4. Copy token → dùng để đăng nhập Admin

### Bước 4: Đăng nhập Admin
1. Vào `https://[username].github.io/[repo]/admin/`
2. Nhập GitHub username, tên repo, và token
3. Bắt đầu thêm nội dung!

## ✨ Tính năng

- **Portfolio**: Hiển thị dự án, bài blog, giới thiệu bản thân
- **Admin**: Quản lý nội dung không cần code
- **GitHub API**: Lưu nội dung trực tiếp vào repo
- **Auto-deploy**: Mỗi lần lưu → GitHub Pages tự cập nhật

## 🔐 Bảo mật
- Token chỉ lưu trong `localStorage` của trình duyệt bạn
- Không có server, không có database, hoàn toàn tĩnh
- Admin page không có bảo vệ IP (ai có link đều thấy UI) nhưng cần token để thực sự thay đổi dữ liệu
