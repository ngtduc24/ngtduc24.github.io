import React from 'react';
import {
  Settings,
  LogOut,
  Home,
  BarChart3,
  UserCircle
} from 'lucide-react';
import { UserAccount, AppSettings } from '../types';
import { useConfirmation } from './ConfirmationContext';
import { getTabUrl } from '../lib/seoConfig';
import NotificationBell from './NotificationBell';
import { useSidebarTools } from '../lib/sidebarTools';
import { usePerson } from '../lib/people';
import { AvatarImg } from './ui/People';
import { openProfile } from '../lib/people';
import { Camera, ChevronRight, Trash2 } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: UserAccount;
  onLogout: () => void;
  onOpenProfile?: () => void;
  settings?: AppSettings;
}

/**
 * Thanh điều hướng bên trái dạng cột hẹp theo ảnh mẫu. Mỗi mục là biểu tượng kèm nhãn
 * xếp dọc, các nút được dồn xuống giữa và dưới cột. Chuông thông báo và tài khoản nằm
 * ở đáy, thay cho thanh header phía trên đã bỏ.
 */
export default function Sidebar({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  onOpenProfile,
  settings
}: SidebarProps) {
  const { confirm } = useConfirmation();
  const tools = useSidebarTools();
  // Ảnh đại diện của tài khoản đang đăng nhập (đồng bộ với hồ sơ, đổi ảnh là cập nhật ngay).
  const me = usePerson(currentUser.id, currentUser.fullName);
  const myAvatar = currentUser.avatarUrl ? { ...(me || { id: currentUser.id, name: currentUser.fullName }), avatar: currentUser.avatarUrl } as any : me;
  const compact = tools !== null;

  const primaryItems = [
    { id: 'dashboard', label: 'Thư viện', icon: Home },
    { id: 'stats', label: 'Thống kê', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ].filter(item => {
    if (item.id === 'settings') return currentUser.role === 'admin' || currentUser.permissions.includes('settings');
    if (item.id === 'stats') return currentUser.role === 'admin'; // Thống kê chỉ dành cho quản trị viên
    return true;
  });

  const renderItem = (item: { id: string; label: string; icon: any }) => {
    const Icon = item.icon;
    const active = currentTab === item.id;
    const href = getTabUrl(item.id);
    return (
      <a
        key={item.id}
        href={href}
        onClick={(e) => {
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
            e.preventDefault();
            setCurrentTab(item.id);
          }
        }}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={`group flex w-full flex-col items-center gap-1 rounded-2xl ${compact ? 'py-1.5' : 'py-2.5'} transition-all ${active && !compact ? 'text-brand' : 'text-slate-500 hover:text-brand'}`}
      >
        <span className={`grid ${compact ? 'h-9 w-9' : 'h-10 w-10'} place-items-center rounded-xl transition-all ${active && !compact ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'bg-transparent group-hover:bg-slate-100'}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-[10px] font-bold leading-none">{item.label}</span>
      </a>
    );
  };

  // Nút công cụ của màn hình đang mở (ví dụ khung thiết kế Bài giảng), nằm trên cùng.
  const renderTool = (t: NonNullable<typeof tools>[number]) => {
    const Icon = t.icon;
    return (
      <button key={t.id} type="button" onClick={t.onClick} aria-label={t.label} aria-pressed={!!t.active}
        className={`group flex w-full flex-col items-center gap-0.5 rounded-2xl py-1 transition-all ${t.active ? 'text-brand' : 'text-slate-500 hover:text-brand'}`}>
        <span className={`grid h-9 w-9 place-items-center rounded-xl transition-all ${t.active ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'bg-transparent group-hover:bg-slate-100'}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-center text-[10px] font-bold leading-tight">{t.label}</span>
      </button>
    );
  };

  return (
    <aside
      id="sidebar"
      className={`relative ${compact ? 'z-[130] overflow-y-auto py-2' : 'z-40 overflow-y-auto py-4'} flex h-[100dvh] w-20 shrink-0 flex-col items-center border-r border-slate-200 bg-white`}
    >
      {compact ? (
        <nav className="flex w-full flex-col items-center gap-1 px-2">{tools!.map(renderTool)}</nav>
      ) : (
        /* Nhóm chức năng chính, dồn xuống giữa cột */
        <nav className="flex w-full flex-1 flex-col items-center justify-center gap-1.5 px-2">
          {primaryItems.map(renderItem)}
        </nav>
      )}

      {/* Đáy cột: (khi có công cụ riêng thì thêm các mục chung), chuông thông báo, trang cá nhân, đăng xuất */}
      <div className={`mt-auto flex w-full flex-col items-center ${compact ? 'gap-0 pt-2' : 'gap-1 pt-3'} border-t border-slate-100 px-2`}>
        {compact && primaryItems.map(renderItem)}
        <NotificationBell currentUser={currentUser} settings={settings} setCurrentTab={setCurrentTab} />

        <AccountMenu currentUser={currentUser} avatar={myAvatar} compact={compact} active={currentTab === 'profile' || currentTab === 'user_profile'}
          onSettings={() => onOpenProfile && onOpenProfile()} onLogout={() => confirm('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', onLogout)} />
      </div>
    </aside>
  );
}

// Nút ảnh đại diện ở đáy thanh bên trái: bấm mở menu tài khoản (giống Canva).
// Trang cá nhân: hồ sơ công khai (ảnh bìa, ảnh đại diện, nội dung đã tạo). Cài đặt: sửa thông tin, mật khẩu, mục Đã xoá.
function AccountMenu({ currentUser, avatar, compact, active, onSettings, onLogout }: { currentUser: UserAccount; avatar: any; compact: boolean; active: boolean; onSettings: () => void; onLogout: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const d = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', d); document.addEventListener('touchstart', d); window.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', d); document.removeEventListener('touchstart', d); window.removeEventListener('keydown', k); };
  }, [open]);
  const go = (fn: () => void) => { setOpen(false); fn(); };
  const myPage = () => openProfile(currentUser.id);
  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50';
  return (
    <div ref={ref} className="relative mt-1 w-full">
      <button type="button" onClick={() => setOpen(v => !v)} aria-label="Tài khoản" aria-expanded={open}
        className="mx-auto grid place-items-center rounded-full p-1 transition hover:bg-slate-100">
        <span className={`grid place-items-center rounded-full ring-2 ${open || active ? 'ring-brand' : 'ring-transparent'}`}>
          {avatar ? <AvatarImg person={avatar} size={compact ? 36 : 40} /> : <UserCircle className="h-8 w-8 text-slate-500" />}
        </span>
      </button>
      {open && (
        <div className="fixed bottom-3 left-[88px] z-[300] w-[320px] max-w-[calc(100vw-100px)] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-500">Tài khoản</p>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
            <button type="button" onClick={() => go(onSettings)} title="Đổi ảnh đại diện, ảnh bìa" className="relative shrink-0">
              {avatar ? <AvatarImg person={avatar} size={56} /> : <UserCircle className="h-14 w-14 text-slate-400" />}
              <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-white text-slate-600 shadow ring-1 ring-slate-200"><Camera className="h-3.5 w-3.5" /></span>
            </button>
            <button type="button" onClick={() => go(myPage)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <span className="min-w-0 flex-1"><span className="block truncate text-base font-bold text-slate-900">{currentUser.fullName || currentUser.username}</span><span className="block truncate text-xs text-slate-500">{currentUser.email}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </div>
          <div className="my-1 border-t border-slate-100" />
          <button type="button" onClick={() => go(myPage)} className={item}><UserCircle className="h-5 w-5 text-slate-500" /> Trang cá nhân</button>
          <button type="button" onClick={() => go(onSettings)} className={item}><Settings className="h-5 w-5 text-slate-500" /> Cài đặt tài khoản</button>
          <button type="button" onClick={() => go(() => { try { sessionStorage.setItem('open_hint:profile', 'trash'); } catch { /* bỏ qua */ } onSettings(); })} className={item}><Trash2 className="h-5 w-5 text-slate-500" /> Đã xoá</button>
          <div className="my-1 border-t border-slate-100" />
          <button type="button" onClick={() => go(onLogout)} className={`${item} hover:text-rose-600`}><LogOut className="h-5 w-5 text-slate-500" /> Đăng xuất</button>
        </div>
      )}
    </div>
  );
}
