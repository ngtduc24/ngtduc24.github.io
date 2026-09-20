import React, { useState } from 'react';
import {
  Search, ArrowLeft, ArrowRight, LayoutGrid,
  CalendarDays, BookOpen, LayoutTemplate, Image as ImageIcon, BarChart3,
  GraduationCap, Scan, FolderKanban, Mail, Users, Settings, Library, Megaphone, Shield, CheckCircle2, ClipboardList, Clapperboard, Sparkles
} from 'lucide-react';
import { UserAccount, AppSettings } from '../types';
import { isModuleHidden, resolveModuleMeta } from '../lib/modules';

interface AllFeaturesProps {
  currentUser: UserAccount;
  settings?: AppSettings;
  onSwitchTab: (tab: string) => void;
  onBack: () => void;
}

const COLORS: Record<string, { bg: string; text: string }> = {
  rose: { bg: 'bg-rose-100', text: 'text-rose-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-500' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  red: { bg: 'bg-red-100', text: 'text-red-500' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-500' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-500' },
};

interface FeatureItem {
  id: string;
  label: string;
  desc: string;
  icon: any;
  color: string;
  group: string;
}

// Toàn bộ chức năng, chia theo nhóm để hiển thị dạng danh mục giống trang kho ứng dụng.
const ALL_FEATURES: FeatureItem[] = [
  { id: 'calculator', label: 'Tính cỡ mẫu nghiên cứu', desc: 'Hỗ trợ tính toán cỡ mẫu trong nghiên cứu', icon: LayoutGrid, color: 'violet', group: 'Nghiên cứu và phân tích' },
  { id: 'qualitative_analysis', label: 'Định tính', desc: 'Mã hóa, phân tích dữ liệu phỏng vấn, thảo luận nhóm', icon: ImageIcon, color: 'emerald', group: 'Nghiên cứu và phân tích' },
  { id: 'quantitative_analysis', label: 'Định lượng', desc: 'Phân tích thống kê, trực quan hóa dữ liệu', icon: BarChart3, color: 'blue', group: 'Nghiên cứu và phân tích' },
  { id: 'scientific_journals', label: 'Quản lý điểm báo khoa học', desc: 'Lưu trữ và phân loại điểm báo, bài viết', icon: BookOpen, color: 'orange', group: 'Nghiên cứu và phân tích' },

  { id: 'edu', label: 'Quản lý Giáo dục', desc: 'Quản lý lớp học, sinh viên, chương trình đào tạo', icon: GraduationCap, color: 'purple', group: 'Giảng dạy và nội dung' },
  { id: 'edu_bank', label: 'Ngân hàng bài tập', desc: 'Kho bài tập dùng lại và chia sẻ theo môn', icon: Library, color: 'amber', group: 'Giảng dạy và nội dung' },
  { id: 'edu_exam', label: 'Trắc nghiệm', desc: 'Tạo và chấm đề kiểm tra trắc nghiệm', icon: CheckCircle2, color: 'blue', group: 'Giảng dạy và nội dung' },
  { id: 'edu_grade', label: 'Nhập điểm', desc: 'Nhập điểm vào file .fg của phần mềm trường', icon: ClipboardList, color: 'emerald', group: 'Giảng dạy và nội dung' },
  { id: 'elearning', label: 'E-Learning', desc: 'Soạn, lưu trữ, chia sẻ và giao bài giảng theo môn', icon: BookOpen, color: 'orange', group: 'Giảng dạy và nội dung' },
  { id: 'remier', label: 'Remier · Dựng phim', desc: 'Dựng video nhiều lớp ngay trên trình duyệt', icon: Clapperboard, color: 'rose', group: 'Công cụ thiết kế' },
  { id: 'portfolio_cms', label: 'Quản trị Portfolio', desc: 'Lưu trữ và quản lý hồ sơ cá nhân, dự án', icon: FolderKanban, color: 'teal', group: 'Giảng dạy và nội dung' },
  { id: 'media_library', label: 'Thư viện', desc: 'Tài liệu, mẫu biểu, dữ liệu tham khảo', icon: Library, color: 'violet', group: 'Giảng dạy và nội dung' },

  { id: 'ar_module', label: 'Tạo AR', desc: 'Tạo điểm ảnh AR kèm mã QR để quét bằng điện thoại', icon: Scan, color: 'red', group: 'Công cụ thiết kế' },
  { id: 'utility_image_resize', label: 'Phóng to ảnh', desc: 'Phóng to và làm rõ chi tiết ảnh theo tỉ lệ tùy chọn', icon: ImageIcon, color: 'blue', group: 'Công cụ thiết kế' },
  { id: 'utility_social_design', label: 'Thiết kế ảnh', desc: 'Tạo nhanh ảnh cho bài báo, tin tức từ khung mẫu có sẵn', icon: LayoutTemplate, color: 'violet', group: 'Công cụ thiết kế' },

  { id: 'tasks', label: 'Quản lý công việc', desc: 'Tạo, theo dõi và quản lý công việc cá nhân/nhóm', icon: CalendarDays, color: 'rose', group: 'Quản lý và hệ thống' },
  { id: 'assistant', label: 'Trợ lý ảo', desc: 'Hỏi đáp và hướng dẫn dùng hệ thống, tìm bài giảng và câu hỏi', icon: Sparkles, color: 'violet', group: 'Quản lý và hệ thống' },
  { id: 'notifications', label: 'Thông báo', desc: 'Xem thông báo, tài liệu và dữ liệu tham khảo', icon: Mail, color: 'amber', group: 'Quản lý và hệ thống' },
  { id: 'notifications_admin', label: 'Trung tâm thông báo', desc: 'Quản lý và phát thông báo tới người dùng', icon: Megaphone, color: 'orange', group: 'Quản lý và hệ thống' },
  { id: 'users', label: 'Quản lý người dùng', desc: 'Tạo, chỉnh sửa tài khoản admin, thành viên, học viên', icon: Users, color: 'indigo', group: 'Quản lý và hệ thống' },
  { id: 'permissions', label: 'Phân quyền người dùng', desc: 'Cấp quyền truy cập chức năng và quyền thao tác chi tiết', icon: Shield, color: 'teal', group: 'Quản lý và hệ thống' },
  { id: 'settings', label: 'Cấu hình hệ thống', desc: 'Cài đặt và cấu hình hệ thống', icon: Settings, color: 'rose', group: 'Quản lý và hệ thống' },
];

export default function AllFeatures({ currentUser, settings, onSwitchTab, onBack }: AllFeaturesProps) {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('Tất cả');

  const isUserAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions || [];
  const can = (id: string) => {
    if (isUserAdmin) return true;
    if (id === 'notifications') return true;
    if (id === 'notifications_admin') return perms.includes('notifications');
    if (id === 'ar_module') return perms.includes('ar_module') || perms.includes('utilities');
    if (id === 'utility_image_resize') return perms.includes('utility_image_resize') || perms.includes('utilities');
    if (id === 'utility_social_design') return perms.includes('utility_social_design') || perms.includes('utilities');
    if (id === 'edu_bank') return perms.includes('edu') && !!currentUser?.canCreateEdu;
    if (id === 'edu_exam') return perms.includes('edu') && !!currentUser?.canGradeEdu;
    if (id === 'edu_grade') return perms.includes('edu') && !!currentUser?.canGradeImportEdu;
    if (id === 'assistant') return true;
    if (id === 'users' || id === 'permissions') return false;
    return perms.includes(id);
  };

  const visible = ALL_FEATURES
    .filter(f => can(f.id))
    .filter(f => !isModuleHidden(f.id, settings))
    .map(f => resolveModuleMeta(f, settings));
  const groups = ['Tất cả', ...Array.from(new Set(visible.map(f => f.group)))];
  const q = search.trim().toLowerCase();
  const filtered = visible.filter(f =>
    (activeGroup === 'Tất cả' || f.group === activeGroup) &&
    (!q || f.label.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q))
  );

  const renderGroups = activeGroup === 'Tất cả'
    ? Array.from(new Set(filtered.map(f => f.group)))
    : [activeGroup];

  const hasBg = !!settings?.dashboardBannerImage;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero đầu trang */}
      <div
        className="relative overflow-hidden rounded-3xl border border-slate-100 shadow-sm"
        style={hasBg
          ? { backgroundImage: `url(${settings!.dashboardBannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: 'linear-gradient(135deg, var(--color-brand-light, #eef2ff) 0%, #ffffff 60%, var(--color-brand-light, #f5f3ff) 100%)' }}
      >
        {hasBg && <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px]" />}
        <div className="relative z-10 px-6 py-8 md:px-10 space-y-4">
          <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl bg-white/80 hover:bg-white text-slate-600 hover:text-brand px-3 py-2 text-xs font-bold shadow-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
          </button>
          <div className="space-y-1.5">
            <span className="inline-block rounded-full bg-brand/10 text-brand text-[10px] font-black uppercase tracking-wider px-3 py-1">Kho tính năng</span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight font-display text-slate-900">Tất cả tính năng trên hệ thống</h1>
            <p className="text-sm text-slate-500 font-medium max-w-2xl">Duyệt toàn bộ công cụ phục vụ giảng dạy, nghiên cứu và thiết kế. Chọn một nhóm hoặc tìm kiếm để truy cập nhanh.</p>
          </div>

          {/* Ô tìm kiếm */}
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 w-full max-w-2xl">
            <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm tính năng..."
              className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 py-2.5"
            />
          </div>

          {/* Nhóm danh mục */}
          <div className="flex flex-wrap gap-2">
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${activeGroup === g ? 'bg-brand text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Danh sách tính năng theo nhóm */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <p className="text-sm text-slate-400 font-medium">Không tìm thấy tính năng phù hợp.</p>
        </div>
      ) : (
        renderGroups.map(group => {
          const items = filtered.filter(f => f.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-3">
              <h2 className="text-lg font-black text-slate-900 font-display">{group}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(m => {
                  const Icon = m.icon; const c = COLORS[m.color];
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        if (m.id === 'edu_bank' || m.id === 'edu_exam' || m.id === 'edu_grade') {
                          const map: Record<string, string> = { edu_bank: 'assignment_bank', edu_exam: 'exam_bank', edu_grade: 'grade_entry' };
                          try { localStorage.setItem('edu_initial_view', map[m.id]); } catch {}
                          onSwitchTab('edu');
                        } else onSwitchTab(m.id);
                      }}
                      className="group text-left bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-brand/30 transition-all p-4 flex items-start gap-3"
                    >
                      <span className={`w-11 h-11 rounded-xl ${c.bg} ${c.text} grid place-items-center shrink-0 overflow-hidden`}>{(m as any).iconUrl ? <img src={(m as any).iconUrl} alt="" className="w-full h-full object-cover" /> : <Icon className="w-5 h-5" />}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[13px] font-black text-slate-800 leading-tight group-hover:text-brand transition-colors">{m.label}</h3>
                        <p className="text-[11px] text-slate-400 font-medium leading-snug mt-1 line-clamp-2">{m.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
