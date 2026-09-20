import {
  CalendarDays, BookOpen, LayoutGrid, Image as ImageIcon, BarChart3,
  GraduationCap, Library, CheckCircle2, ClipboardList, Clapperboard,
  Scan, LayoutTemplate, FolderKanban, Mail, Megaphone, Users, Shield, Settings, Sparkles
} from 'lucide-react';
import { AppSettings, ModuleOverride } from '../types';

// Danh sách chức năng chuẩn của hệ thống. Màn hình Cài đặt chức năng lặp theo danh sách này
// để admin đổi tên, mô tả, ảnh icon và bật tắt ẩn hiện. Các trang khác (Tổng quan, Tất cả
// tính năng) áp thông tin tùy chỉnh theo id để hiển thị thống nhất.
export interface ModuleDef {
  id: string;
  label: string;
  desc: string;
  icon: any;
  color: string;
  group: string;
}

export const MODULE_REGISTRY: ModuleDef[] = [
  { id: 'tasks', label: 'Quản lý công việc', desc: 'Tạo, theo dõi và quản lý công việc cá nhân, nhóm', icon: CalendarDays, color: 'rose', group: 'Quản lý và hệ thống' },
  { id: 'scientific_journals', label: 'Quản lý điểm báo khoa học', desc: 'Lưu trữ và phân loại điểm báo, bài viết', icon: BookOpen, color: 'orange', group: 'Nghiên cứu và phân tích' },
  { id: 'calculator', label: 'Tính cỡ mẫu nghiên cứu', desc: 'Hỗ trợ tính toán cỡ mẫu trong nghiên cứu', icon: LayoutGrid, color: 'violet', group: 'Nghiên cứu và phân tích' },
  { id: 'qualitative_analysis', label: 'Định tính', desc: 'Mã hóa, phân tích dữ liệu phỏng vấn, thảo luận nhóm', icon: ImageIcon, color: 'emerald', group: 'Nghiên cứu và phân tích' },
  { id: 'quantitative_analysis', label: 'Định lượng', desc: 'Phân tích thống kê, trực quan hóa dữ liệu', icon: BarChart3, color: 'blue', group: 'Nghiên cứu và phân tích' },
  { id: 'edu', label: 'Quản lý Giáo dục', desc: 'Quản lý lớp học, sinh viên, chương trình đào tạo', icon: GraduationCap, color: 'purple', group: 'Giảng dạy và nội dung' },
  { id: 'edu_bank', label: 'Ngân hàng bài tập', desc: 'Kho bài tập dùng lại và chia sẻ theo môn', icon: Library, color: 'amber', group: 'Giảng dạy và nội dung' },
  { id: 'edu_exam', label: 'Trắc nghiệm', desc: 'Tạo và chấm đề kiểm tra trắc nghiệm', icon: CheckCircle2, color: 'blue', group: 'Giảng dạy và nội dung' },
  { id: 'edu_grade', label: 'Nhập điểm', desc: 'Nhập điểm vào file .fg của phần mềm trường', icon: ClipboardList, color: 'emerald', group: 'Giảng dạy và nội dung' },
  { id: 'elearning', label: 'E-Learning', desc: 'Soạn, lưu trữ và chia sẻ bài giảng theo môn', icon: BookOpen, color: 'orange', group: 'Giảng dạy và nội dung' },
  { id: 'remier', label: 'Remier · Dựng phim', desc: 'Dựng video nhiều lớp trên trình duyệt', icon: Clapperboard, color: 'rose', group: 'Công cụ thiết kế' },
  { id: 'ar_module', label: 'Tạo AR', desc: 'Tạo điểm ảnh AR kèm mã QR để quét bằng điện thoại', icon: Scan, color: 'red', group: 'Công cụ thiết kế' },
  { id: 'utility_image_resize', label: 'Phóng to ảnh', desc: 'Phóng to và làm rõ chi tiết ảnh theo tỉ lệ tùy chọn', icon: ImageIcon, color: 'blue', group: 'Công cụ thiết kế' },
  { id: 'utility_social_design', label: 'Thiết kế ảnh', desc: 'Tạo nhanh ảnh cho bài báo, tin tức từ khung mẫu có sẵn', icon: LayoutTemplate, color: 'violet', group: 'Công cụ thiết kế' },
  { id: 'portfolio_cms', label: 'Quản trị Portfolio', desc: 'Lưu trữ và quản lý hồ sơ cá nhân, dự án', icon: FolderKanban, color: 'teal', group: 'Giảng dạy và nội dung' },
  { id: 'assistant', label: 'Trợ lý giáo dục', desc: 'Hỏi đáp kiến thức bài học từ bài giảng, câu hỏi và bài tập được chia sẻ công khai', icon: Sparkles, color: 'violet', group: 'Quản lý và hệ thống' },
  { id: 'notifications', label: 'Thông báo', desc: 'Xem thông báo, tài liệu và dữ liệu tham khảo', icon: Mail, color: 'amber', group: 'Quản lý và hệ thống' },
  { id: 'notifications_admin', label: 'Trung tâm thông báo', desc: 'Quản lý và phát thông báo tới người dùng', icon: Megaphone, color: 'orange', group: 'Quản lý và hệ thống' },
  { id: 'media_library', label: 'Thư viện', desc: 'Tài liệu, mẫu biểu, dữ liệu tham khảo', icon: Library, color: 'violet', group: 'Giảng dạy và nội dung' },
  { id: 'users', label: 'Quản lý người dùng', desc: 'Tạo, chỉnh sửa tài khoản trên hệ thống', icon: Users, color: 'indigo', group: 'Quản lý và hệ thống' },
  { id: 'permissions', label: 'Phân quyền người dùng', desc: 'Cấp quyền truy cập chức năng chi tiết', icon: Shield, color: 'teal', group: 'Quản lý và hệ thống' },
  { id: 'settings', label: 'Cấu hình hệ thống', desc: 'Quản trị hệ thống, phân quyền người dùng', icon: Settings, color: 'rose', group: 'Quản lý và hệ thống' },
];

// Lấy tùy chỉnh của một chức năng theo id từ cấu hình hệ thống.
export function getModuleOverride(id: string, settings?: AppSettings): ModuleOverride | undefined {
  return settings?.moduleOverrides?.[id];
}

// Chức năng có bị admin ẩn không. Chức năng bị ẩn thì không hiển thị và không truy cập được
// với mọi tài khoản, kể cả admin (admin chỉ bật lại trong màn hình Cài đặt chức năng).
export function isModuleHidden(id: string, settings?: AppSettings): boolean {
  return !!settings?.moduleOverrides?.[id]?.hidden;
}

// Gộp thông tin gốc với tùy chỉnh của admin để hiển thị.
export function resolveModuleMeta<T extends { id: string; label: string; desc: string }>(
  base: T,
  settings?: AppSettings
): T & { iconUrl?: string; hidden: boolean } {
  const ov = getModuleOverride(base.id, settings);
  return {
    ...base,
    label: ov?.label?.trim() || base.label,
    desc: ov?.desc?.trim() || base.desc,
    iconUrl: ov?.icon || undefined,
    hidden: !!ov?.hidden,
  };
}
