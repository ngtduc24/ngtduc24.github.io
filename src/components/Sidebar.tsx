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

  const primaryItems = [
    { id: 'dashboard', label: 'Thư viện', icon: Home },
    { id: 'stats', label: 'Thống kê', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ].filter(item => {
    if (item.id === 'settings') return currentUser.role === 'admin' || currentUser.permissions.includes('settings');
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
        className={`group flex w-full flex-col items-center gap-1 rounded-2xl py-2.5 transition-all ${active ? 'text-brand' : 'text-slate-500 hover:text-brand'}`}
      >
        <span className={`grid h-10 w-10 place-items-center rounded-xl transition-all ${active ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'bg-transparent group-hover:bg-slate-100'}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-[10px] font-bold leading-none">{item.label}</span>
      </a>
    );
  };

  return (
    <aside
      id="sidebar"
      className="relative z-40 flex h-screen w-20 shrink-0 flex-col items-center border-r border-slate-200 bg-white py-4"
    >
      {/* Nhóm chức năng chính, dồn xuống giữa cột */}
      <nav className="flex w-full flex-1 flex-col items-center justify-center gap-1.5 px-2">
        {primaryItems.map(renderItem)}
      </nav>

      {/* Đáy cột: chuông thông báo, trang cá nhân, đăng xuất */}
      <div className="mt-auto flex w-full flex-col items-center gap-1 border-t border-slate-100 px-2 pt-3">
        <NotificationBell currentUser={currentUser} settings={settings} setCurrentTab={setCurrentTab} />

        <button
          type="button"
          onClick={() => onOpenProfile && onOpenProfile()}
          aria-label="Trang cá nhân"
          className="group flex w-full flex-col items-center gap-1 rounded-2xl py-2.5 text-slate-500 transition hover:text-brand"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl transition group-hover:bg-slate-100">
            <UserCircle className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-bold leading-none">Cá nhân</span>
        </button>

        <button
          type="button"
          onClick={() => confirm('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', onLogout)}
          aria-label="Đăng xuất tài khoản"
          className="group flex w-full flex-col items-center gap-1 rounded-2xl py-2.5 text-slate-500 transition hover:text-rose-500"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl transition group-hover:bg-rose-50">
            <LogOut className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-bold leading-none">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
