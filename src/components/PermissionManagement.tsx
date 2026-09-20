import React, { useState, useEffect } from 'react';
import { Shield, Check, Loader2, Search, UserCircle } from 'lucide-react';
import { UserAccount } from '../types';
import { useNotifications } from './NotificationContext';

interface Props {
  currentUser: UserAccount;
  users: UserAccount[];
  onSaveUser: (user: UserAccount) => Promise<void> | void;
}

type Flag = keyof UserAccount;

interface ModuleDef {
  id: string;
  label: string;
  desc?: string;
  flags?: [Flag, string][];
  settings?: boolean;
}

// Danh sách chức năng và các quyền thao tác chi tiết, bám sát các module độc lập
// hiện có của hệ thống. Mục Tiện ích trước đây đã tách thành 3 module riêng là
// Tạo AR, Phóng to ảnh và Thiết kế ảnh nên phân quyền cho từng công cụ riêng.
const MODULES: ModuleDef[] = [
  { id: 'dashboard', label: 'Trang chủ / Tổng quan', desc: 'Truy cập trang tổng quan Dashboard' },
  { id: 'tasks', label: 'Quản lý công việc', flags: [['canCreateTask', 'Tạo'], ['canRunPauseTask', 'Chạy/Dừng'], ['canCompleteTask', 'Hoàn thành'], ['canDeleteTask', 'Xóa'], ['canAssignTask', 'Giao'], ['canReceiveTask', 'Nhận']] },
  { id: 'scientific_journals', label: 'Điểm báo khoa học', desc: 'Danh sách, thêm, nhập, công cụ AI, ngành loại, thùng rác, cài đặt', flags: [['canCreateJournal', 'Thêm thủ công'], ['canEditJournal', 'Sửa'], ['canDeleteJournal', 'Xóa & Thùng rác'], ['canImportJournal', 'Nhập Excel & Công cụ AI'], ['canManageJournalCats', 'Quản lý Ngành/Loại'], ['canManageJournalSettings', 'Cài đặt']] },
  { id: 'calculator', label: 'Tính cỡ mẫu nghiên cứu' },
  { id: 'qualitative_analysis', label: 'Phân tích định tính', flags: [['canCreateQualitative', 'Tạo'], ['canEditQualitative', 'Sửa'], ['canDeleteQualitative', 'Xóa'], ['canImportQualitative', 'Nhập'], ['canExportQualitative', 'Xuất'], ['canManageQualitativeSettings', 'Cấu hình']] },
  { id: 'quantitative_analysis', label: 'Phân tích định lượng', flags: [['canCreateQuantitative', 'Tạo'], ['canEditQuantitative', 'Sửa'], ['canDeleteQuantitative', 'Xóa'], ['canImportQuantitative', 'Nhập'], ['canExportQuantitative', 'Xuất'], ['canManageQuantitativeSettings', 'Cấu hình']] },
  { id: 'edu', label: 'Quản lý Giáo dục', desc: 'Trường, lớp, sinh viên, bài tập, bảng điểm', flags: [['canCreateEdu', 'Tạo lớp/trường'], ['canEditEdu', 'Sửa'], ['canDeleteEdu', 'Xóa'], ['canImportEdu', 'Nhập lớp/SV'], ['canExportEdu', 'Xuất bảng điểm'], ['canGradeImportEdu', 'Nhập điểm'], ['canGradeEdu', 'Chấm điểm']] },
  { id: 'elearning', label: 'E-Learning', desc: 'Soạn, lưu trữ và chia sẻ bài giảng theo môn', flags: [['canElearningPublic', 'Công khai kho chung'], ['canElearningAssign', 'Giao cho lớp']] },
  { id: 'ar_module', label: 'Tạo AR', desc: 'Tạo điểm ảnh AR kèm mã QR để quét bằng điện thoại' },
  { id: 'utility_image_resize', label: 'Phóng to ảnh', desc: 'Phóng to và làm rõ chi tiết ảnh theo tỉ lệ tùy chọn' },
  { id: 'utility_social_design', label: 'Thiết kế ảnh', desc: 'Tạo nhanh ảnh cho bài báo, tin tức từ khung mẫu có sẵn' },
  { id: 'media_library', label: 'Thư viện tài nguyên' },
  { id: 'portfolio_cms', label: 'Quản trị Portfolio', desc: 'Nội dung, dự án, khóa học, nghiên cứu, menu, hồ sơ', flags: [['canPortfolioContent', 'Thêm bài viết'], ['canPortfolioProjects', 'Dự án'], ['canPortfolioCourses', 'Khóa học'], ['canPortfolioResearch', 'Nghiên cứu'], ['canPortfolioNavigation', 'Menu chính'], ['canPortfolioProfile', 'Hồ sơ']] },
  { id: 'notifications', label: 'Trung tâm thông báo', desc: 'Quản lý và phát thông báo tới người dùng' },
  { id: 'settings', label: 'Cấu hình hệ thống', settings: true },
];

// Chuyển quyền gộp cũ 'utilities' thành 3 quyền độc lập một lần khi mở tài khoản.
// Chỉ 'utilities' mới là quyền gộp cũ. 'ar_module' nay là quyền riêng của công cụ
// Tạo AR, KHÔNG mở rộng, để 3 công cụ bật/tắt hoàn toàn độc lập nhau khi tải lại.
const migrate = (perms?: string[]): string[] => {
  const set = new Set(perms || []);
  if (set.has('utilities')) {
    set.delete('utilities');
    set.add('ar_module');
    set.add('utility_image_resize');
    set.add('utility_social_design');
  }
  return Array.from(set);
};

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (b: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${on ? 'bg-brand' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export default function PermissionManagement({ currentUser, users, onSaveUser }: Props) {
  const { addNotification } = useNotifications();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<UserAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const editable = users.filter(u => u.role !== 'admin');
  const filtered = editable.filter(u => !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()));

  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    const u = users.find(x => x.id === selectedId);
    setDraft(u ? { ...u, permissions: migrate(u.permissions) } : null);
  }, [selectedId, users]);

  const isMember = draft?.role === 'member';

  // Lưu ngay khi bật/tắt một công tắc, không cần bấm nút lưu.
  const autoSave = async (next: UserAccount) => {
    setDraft(next);
    setSaving(true);
    try { await onSaveUser(next); setSavedAt(Date.now()); }
    catch (e: any) { addNotification('Lỗi lưu phân quyền: ' + (e.message || e), 'error'); }
    finally { setSaving(false); }
  };

  const moduleOn = (id: string) => !!draft && draft.permissions.includes(id);
  const toggleModule = (id: string, on: boolean) => {
    if (!draft) return;
    const set = new Set(draft.permissions);
    if (on) set.add(id); else set.delete(id);
    const next: UserAccount = { ...draft, permissions: Array.from(set) };
    if (id === 'settings') next.canManageSettings = on;
    autoSave(next);
  };
  const flagOn = (f: Flag) => !!draft && !!draft[f];
  const toggleFlag = (f: Flag, on: boolean) => {
    if (!draft) return;
    autoSave({ ...draft, [f]: on } as UserAccount);
  };

  const recentlySaved = savedAt > 0 && Date.now() - savedAt < 4000;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Shield className="h-7 w-7" /></div>
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">Phân quyền người dùng</h1>
          <p className="text-xs font-medium text-slate-500">Chọn một tài khoản rồi bật/tắt quyền truy cập từng chức năng và quyền thao tác chi tiết. Mỗi công tắc có hiệu lực ngay, không cần bấm lưu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        {/* Danh sách tài khoản */}
        <div className="h-fit rounded-3xl border border-slate-100 bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tài khoản..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand" />
          </div>
          <div className="max-h-[520px] space-y-1 overflow-y-auto">
            {filtered.length === 0 ? <p className="py-6 text-center text-xs text-slate-400">Không có tài khoản phù hợp.</p> :
              filtered.map(u => (
                <button key={u.id} onClick={() => setSelectedId(u.id)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${selectedId === u.id ? 'bg-brand-light text-brand' : 'hover:bg-slate-50'}`}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-500">{u.avatarUrl ? <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserCircle className="h-4.5 w-4.5" />}</span>
                  <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-slate-800">{u.fullName || u.username}</span><span className="block truncate text-[10px] text-slate-400">@{u.username} · {u.role === 'member' ? 'Học viên' : 'Thành viên'}</span></span>
                </button>
              ))}
          </div>
        </div>

        {/* Ma trận phân quyền */}
        <div className="space-y-4">
          {!draft ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">Chọn một tài khoản ở danh sách bên trái để phân quyền.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div>
                  <p className="text-sm font-black text-slate-800">{draft.fullName || draft.username}</p>
                  <p className="text-[11px] text-slate-400">@{draft.username} · {isMember ? 'Học viên' : 'Thành viên'}</p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold ${saving ? 'bg-slate-100 text-slate-500' : recentlySaved ? 'bg-brand-light text-brand' : 'bg-slate-50 text-slate-400'}`}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</> : recentlySaved ? <><Check className="h-4 w-4" /> Đã lưu</> : <><Check className="h-4 w-4" /> Tự động lưu</>}
                </span>
              </div>

              {isMember && <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700">Tài khoản học viên chỉ dùng trang Portfolio, không cần phân quyền chức năng quản trị.</p>}

              <div className="divide-y divide-slate-100 rounded-3xl border border-slate-100 bg-white shadow-sm">
                {MODULES.map(m => {
                  const on = moduleOn(m.id);
                  return (
                    <div key={m.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-800">{m.label}</p>
                          {m.desc && <p className="text-[11px] text-slate-400">{m.desc}</p>}
                        </div>
                        <Toggle on={on} onChange={b => toggleModule(m.id, b)} disabled={isMember} />
                      </div>
                      {m.flags && on && !isMember && (
                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3">
                          {m.flags.map(([f, label]) => (
                            <label key={String(f)} className="flex items-center gap-2">
                              <Toggle on={flagOn(f)} onChange={b => toggleFlag(f, b)} />
                              <span className="text-[11px] font-semibold text-slate-600">{label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
