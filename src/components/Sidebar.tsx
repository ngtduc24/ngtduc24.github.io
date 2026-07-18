import React from 'react';
import {
  Calculator,
  LayoutDashboard,
  BookOpen,
  X,
  Settings,
  Users,
  ClipboardList,
  LogOut,
  Shield,
  Bell,
  FolderKanban,
  Image,
  PanelLeftOpen,
  PanelLeftClose,
  Scan
} from 'lucide-react';
import { UserAccount, AppSettings } from '../types';
import { useConfirmation } from './ConfirmationContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentUser: UserAccount;
  onLogout: () => void;
  settings?: AppSettings;
  unreadCount?: number;
  dbConnected?: boolean | null;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  sidebarOpen,
  setSidebarOpen,
  currentUser,
  onLogout,
  settings,
  unreadCount = 0
}: SidebarProps) {
  const { confirm } = useConfirmation();
  const localOpacity = Number(localStorage.getItem('sidebar_opacity'));
  const sidebarOpacity = Math.max(0.55, Math.min(1, settings?.sidebarOpacity ?? (Number.isFinite(localOpacity) && localOpacity > 0 ? localOpacity : 0.92)));

  const primaryItems = [
    { id: 'dashboard', label: 'Tổng quan Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Quản lý Công việc', icon: ClipboardList },
    { id: 'scientific_journals', label: 'Quản lý điểm báo khoa học', icon: BookOpen },
    { id: 'calculator', label: 'Tính Cỡ Mẫu Nghiên Cứu', icon: Calculator },
    { id: 'qualitative_analysis', label: 'Phân tích định tính', icon: FolderKanban },
    { id: 'quantitative_analysis', label: 'Phân tích số liệu định lượng', icon: Calculator },
    { id: 'ar_module', label: 'Tạo AR', icon: Scan },
    { id: 'portfolio_cms', label: 'Quản trị Portfolio', icon: Shield },
    { id: 'notifications', label: 'Thông báo', icon: Bell }
  ].filter(item => item.id === 'notifications' || currentUser.role === 'admin' || currentUser.permissions.includes(item.id));

  const adminItems = [
    ...(currentUser.role === 'admin' ? [{ id: 'users', label: 'Quản lý & Phân quyền', icon: Users }] : []),
    ...(currentUser.role === 'admin' || currentUser.permissions.includes('notifications') ? [{ id: 'notifications_admin', label: 'Chức năng thông báo', icon: Bell }] : []),
    ...(currentUser.role === 'admin' || currentUser.permissions.includes('media_library') ? [{ id: 'media_library', label: 'Thư viện', icon: Image }] : []),
    ...(currentUser.role === 'admin' || currentUser.permissions.includes('settings') ? [{ id: 'settings', label: 'Cấu hình hệ thống', icon: Settings }] : [])
  ];

  const navigate = (id: string) => {
    setCurrentTab(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const renderItem = (item: { id: string; label: string; icon: React.ElementType }) => {
    const Icon = item.icon;
    const active = currentTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => navigate(item.id)}
        aria-label={item.label}
        title={!sidebarOpen ? item.label : undefined}
        className={`group relative flex h-11 w-full items-center rounded-xl transition-all duration-200 ${sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} ${active ? 'bg-brand/25 text-white shadow-[0_0_24px_rgba(16,185,129,.2)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
      >
        <span className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all ${active ? 'bg-brand text-white shadow-lg shadow-brand/40 animate-[pulse_2s_ease-in-out_infinite]' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'}`}>
          <Icon className="h-4.5 w-4.5" />
          {item.id === 'notifications' && unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white">{unreadCount}</span>}
        </span>
        {sidebarOpen && <span className="min-w-0 flex-1 truncate text-left text-xs font-semibold">{item.label}</span>}
        {!sidebarOpen && <span className="pointer-events-none absolute left-full z-[80] ml-3 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-bold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">{item.label}</span>}
      </button>
    );
  };

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 z-45 bg-slate-900/40 backdrop-blur-xs md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside
        id="sidebar"
        style={{ backgroundColor: `rgba(15, 23, 42, ${sidebarOpacity})`, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-visible text-white shadow-2xl transition-all duration-300 md:static md:h-screen ${sidebarOpen ? 'translate-x-0 md:w-72' : '-translate-x-full pointer-events-none md:w-20 md:translate-x-0 md:pointer-events-auto'}`}
      >
        <div className={`relative shrink-0 border-b border-white/10 ${sidebarOpen ? 'p-4' : 'px-3 py-4'}`}>
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white/20 bg-brand text-sm font-black text-white shadow-lg shadow-brand/20">
              {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="h-full w-full object-cover" /> : currentUser.fullName?.slice(0, 2).toUpperCase()}
            </div>
            {sidebarOpen && <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{currentUser.fullName}</p><p className="truncate text-[10px] font-semibold text-brand">{currentUser.role === 'admin' ? 'Quản trị viên' : currentUser.role === 'member' ? 'Học viên' : 'Thành viên'}</p></div>}
            {sidebarOpen && <button type="button" onClick={() => setSidebarOpen(false)} className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white md:grid" title="Thu gọn sidebar" aria-label="Thu gọn sidebar"><PanelLeftClose className="h-4 w-4" /></button>}
            <button type="button" onClick={() => setSidebarOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-slate-300 md:hidden" aria-label="Đóng sidebar"><X className="h-4 w-4" /></button>
          </div>
          {!sidebarOpen && <button type="button" onClick={() => setSidebarOpen(true)} className="absolute -right-3 top-1/2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-slate-800 text-white shadow-lg hover:bg-brand md:grid" aria-label="Mở đầy đủ sidebar"><PanelLeftOpen className="h-3.5 w-3.5" /></button>}
        </div>

        <nav className={`scrollbar-none flex-1 space-y-1.5 overflow-y-auto overflow-x-visible ${sidebarOpen ? 'p-4' : 'px-3 py-4'}`}>
          {sidebarOpen && <p className="mb-2 px-3 text-left text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Menu chức năng</p>}
          {primaryItems.map(renderItem)}
          {!!adminItems.length && <div className="my-3 border-t border-white/10 pt-3">{sidebarOpen && <p className="mb-2 px-3 text-left text-[9px] font-black uppercase tracking-[.18em] text-slate-500">Quản trị hệ thống</p>}{adminItems.map(renderItem)}</div>}
        </nav>

        <div className={`shrink-0 border-t border-white/10 ${sidebarOpen ? 'p-4' : 'p-3'}`}>
          <button
            type="button"
            onClick={() => confirm('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', onLogout)}
            aria-label="Đăng xuất tài khoản"
            title={!sidebarOpen ? 'Đăng xuất tài khoản' : undefined}
            className={`group relative flex w-full items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-300 ${sidebarOpen ? 'gap-3 px-3 py-2.5' : 'h-11 justify-center'}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10">
              {settings?.webAppIcon ? <img src={settings.webAppIcon} alt="Logo hệ thống" className="h-5 w-5 object-contain" /> : <Calculator className="h-4 w-4 text-brand" aria-label="Logo hệ thống" />}
            </span>
            {sidebarOpen && <><span className="min-w-0 flex-1 truncate text-left text-xs font-bold">Đăng xuất</span><LogOut className="h-4 w-4" /></>}
            {!sidebarOpen && <span className="pointer-events-none absolute left-full z-[80] ml-3 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-bold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">Đăng xuất tài khoản</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
