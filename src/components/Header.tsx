import React, { useState, useEffect } from 'react';
import { Menu, Bell, User, HelpCircle, RefreshCw, Check, Trash2, ShieldAlert, Sparkles, AlertTriangle, BookOpen, ClipboardList, Info, X, LogOut, Settings, Database, Search, ExternalLink, Clock } from 'lucide-react';
import { UserAccount, Task, AppSettings, AppNotification } from '../types';
import { getNotificationsFromSupabase } from '../lib/data';
import { subscribeToTasks } from '../lib/tasks';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  currentTab: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  currentUser: UserAccount;
  settings?: AppSettings;
  onProfileClick: (readOnly?: boolean) => void;
  onLogout: () => void;
  setCurrentTab?: (tab: string) => void;
}

export default function Header({ currentTab, sidebarOpen, setSidebarOpen, currentUser, settings, onProfileClick, onLogout, setCurrentTab }: HeaderProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedSystemNotification, setSelectedSystemNotification] = useState<AppNotification | null>(null);

  // Load notifications from LocalStorage on mount
  useEffect(() => {
    const key = `notifications_${currentUser.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((n: any) => !n.id.startsWith("system-welcome-") && !n.id.startsWith("journal-sync-") && !n.id.startsWith("task-tip-") && localStorage.getItem(`notif_deleted_${currentUser.id}_${n.id}`) !== 'true');
        setNotifications(filtered);
        if (filtered.length !== parsed.length) localStorage.setItem(key, JSON.stringify(filtered));
      } catch (e) {
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
  }, [currentUser.id]);

  // Subscribe to real-time system notifications from Supabase
  useEffect(() => {
    const channel = supabase
      .channel('header-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_notifications' }, () => {
        loadSystemNotifs();
      })
      .subscribe();

    async function loadSystemNotifs() {
      const firestoreNotifs = await getNotificationsFromSupabase();
      const mapped: AppNotification[] = firestoreNotifs
        .filter(fn => {
          let isTarget = false;
          if (fn.targetAudience === 'all') isTarget = true;
          else if (fn.targetAudience === 'all_admins' && currentUser.role === 'admin') isTarget = true;
          else if (fn.targetAudience === 'custom_admins' && currentUser.role === 'admin' && fn.targetUserIds?.includes(currentUser.id)) isTarget = true;
          else if (fn.targetAudience === 'custom_users' && fn.targetUserIds?.includes(currentUser.id)) isTarget = true;
          
          if (!isTarget) return false;
          return localStorage.getItem(`notif_deleted_${currentUser.id}_${fn.id}`) !== 'true';
        })
        .map(fn => {
          const readKey = `notif_read_${currentUser.id}_${fn.id}`;
          const isRead = localStorage.getItem(readKey) === 'true';
          return {
            id: fn.id,
            title: fn.title,
            description: fn.description,
            timestamp: fn.timestamp,
            type: fn.type,
            unread: !isRead,
            actionUrl: fn.type === 'task' ? 'tasks' : (fn.type === 'journal' ? 'scientific_journals' : undefined),
            metadata: fn.metadata,
            senderName: fn.senderName
          };
        });

      setNotifications(prev => {
        const localOnly = prev.filter(n => n.id.startsWith('task-'));
        const combined = [...mapped, ...localOnly];
        combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return combined;
      });
    }

    loadSystemNotifs();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, currentUser.role]);


  useEffect(() => {
    const handleNotifChange = () => {
      const key = `notifications_${currentUser.id}`;
      const stored = localStorage.getItem(key);
      let localNotifs = [];
      if (stored) {
        try {
          localNotifs = JSON.parse(stored);
        } catch (e) {}
      }
      
      setNotifications(prev => {
        const systemNotifs = prev.filter(n => !n.id.startsWith('task-') && localStorage.getItem(`notif_deleted_${currentUser.id}_${n.id}`) !== 'true')
                                 .map(n => ({ ...n, unread: localStorage.getItem(`notif_read_${currentUser.id}_${n.id}`) !== 'true' }));
        const combined = [...systemNotifs, ...localNotifs];
        combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return combined;
      });
    };
    window.addEventListener('app_notifications_changed', handleNotifChange);
    return () => window.removeEventListener('app_notifications_changed', handleNotifChange);
  }, [currentUser.id]);

  // Subscribe to tasks to detect updates and generate notifications
  useEffect(() => {
    const unsubscribe = subscribeToTasks((tasks) => {
      setAllTasks(tasks);
      
      const key = `notifications_${currentUser.id}`;
      setNotifications(prev => {
        let updated = [...prev];
        let hasChanges = false;

        tasks.forEach(task => {
          if (task.isDeleted) return;

          // 1. Check for tasks expiring in 24 hours
          const deadline = new Date(task.deadline);
          const diffMs = deadline.getTime() - Date.now();
          const isUrgent = diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
          const isPending = task.status !== 'Completed' && task.status !== 'Cancelled';

          if (isUrgent && isPending) {
            const expId = `task-expiring-${task.id}-${currentUser.id}`;
            const exists = updated.some(n => n.id === expId);
            const isDeleted = localStorage.getItem(`notif_deleted_${currentUser.id}_${expId}`) === 'true';
            if (!exists && !isDeleted) {
              updated.unshift({
                id: expId,
                title: 'Hạn chót công việc sắp tới!',
                description: `Nhiệm vụ "${task.name}" sắp hết hạn trong vòng 24 giờ tới.`,
                timestamp: new Date().toISOString(),
                type: 'warning',
                unread: true,
                actionUrl: 'tasks',
                metadata: { taskId: task.id }
              });
              hasChanges = true;
            }
          }

          // 2. Check for tasks assigned to the current user
          const isAssignedToMe = task.assignedTo === currentUser.id;
          if (isAssignedToMe) {
            const assignId = `task-assigned-${task.id}-${currentUser.id}`;
            const exists = updated.some(n => n.id === assignId);
            const isDeleted = localStorage.getItem(`notif_deleted_${currentUser.id}_${assignId}`) === 'true';
            if (!exists && !isDeleted) {
              updated.unshift({
                id: assignId,
                title: 'Nhiệm vụ mới được giao',
                description: `Bạn đã được giao nhiệm vụ mới: "${task.name}".`,
                timestamp: new Date().toISOString(),
                type: 'task',
                unread: true,
                actionUrl: 'tasks',
                metadata: { taskId: task.id }
              });
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          // Keep only local notifications for localStorage sync
          const localOnly = updated.filter(n => n.id.startsWith('task-'));
          setTimeout(() => {
            localStorage.setItem(key, JSON.stringify(localOnly));
            window.dispatchEvent(new Event('app_notifications_changed'));
          }, 0);
          return updated;
        }
        return prev;
      });
    });

    return () => unsubscribe();
  }, [currentUser.id, currentUser.role]);

  const saveNotifications = (newNotifications: AppNotification[]) => {
    setNotifications(newNotifications);
    const key = `notifications_${currentUser.id}`;
    localStorage.setItem(key, JSON.stringify(newNotifications));
    window.dispatchEvent(new Event('app_notifications_changed'));
  };

  const handleMarkAsRead = (id: string) => {
    const readKey = `notif_read_${currentUser.id}_${id}`;
    localStorage.setItem(readKey, 'true');
    const updated = notifications.map(n => n.id === id ? { ...n, unread: false } : n);
    saveNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    notifications.forEach(n => {
      const readKey = `notif_read_${currentUser.id}_${n.id}`;
      localStorage.setItem(readKey, 'true');
    });
    const updated = notifications.map(n => ({ ...n, unread: false }));
    saveNotifications(updated);
  };

  const handleClearAll = () => {
    notifications.forEach(n => {
      localStorage.setItem(`notif_deleted_${currentUser.id}_${n.id}`, 'true');
    });
    saveNotifications([]);
  };

  const handleDeleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(`notif_deleted_${currentUser.id}_${id}`, 'true');
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  const handleNotificationClick = (n: AppNotification) => {
    handleMarkAsRead(n.id);
    setIsOpen(false);
    
    // Check if it's a task/warning notification
    if (n.type === 'task' || n.type === 'warning') {
      let taskId = '';
      if (n.metadata) {
        let metaObj = n.metadata;
        if (typeof n.metadata === 'string') {
          try {
            metaObj = JSON.parse(n.metadata);
          } catch (e) {
            console.error("Lỗi parse metadata:", e);
          }
        }
        if (metaObj && typeof metaObj === 'object') {
          taskId = metaObj.taskId || '';
        }
      }
      
      if (!taskId) {
        const suffix = `-${currentUser.id}`;
        if (n.id.startsWith('task-assigned-')) {
          let clean = n.id.slice('task-assigned-'.length);
          if (clean.endsWith(suffix)) {
            clean = clean.slice(0, -suffix.length);
          }
          taskId = clean;
        } else if (n.id.startsWith('task-expiring-')) {
          let clean = n.id.slice('task-expiring-'.length);
          if (clean.endsWith(suffix)) {
            clean = clean.slice(0, -suffix.length);
          }
          taskId = clean;
        }
      }
      
      if (taskId) {
        localStorage.setItem('auto_open_task_id', taskId);
        window.dispatchEvent(new CustomEvent('app_open_task', { detail: taskId }));
      }
      if (setCurrentTab) {
        setCurrentTab('tasks');
      }
    } 
    // Check if it's a journal notification
    else if (n.type === 'journal') {
      let journalId = '';
      if (n.metadata) {
        let metaObj = n.metadata;
        if (typeof n.metadata === 'string') {
          try {
            metaObj = JSON.parse(n.metadata);
          } catch (e) {
            console.error("Lỗi parse metadata:", e);
          }
        }
        if (metaObj && typeof metaObj === 'object') {
          journalId = metaObj.journalId || '';
        }
      }
      if (journalId) {
        localStorage.setItem('auto_open_journal_id', journalId);
        window.dispatchEvent(new CustomEvent('app_open_journal', { detail: journalId }));
      }
      if (setCurrentTab) {
        setCurrentTab('scientific_journals');
      }
    } 
    // For system/general notifications, show details modal
    else if (n.type === 'system' || n.type === 'info') {
      setSelectedSystemNotification(n);
    } 
    // Fallback redirect if any actionUrl is specified
    else if (n.actionUrl && setCurrentTab) {
      setCurrentTab(n.actionUrl);
    }
    // Fallback to show detail modal for any other type so the user can read the full text
    else {
      setSelectedSystemNotification(n);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (diffMs < 0) return 'Vừa xong';
      
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Vừa xong';
      
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr} giờ trước`;
      
      const diffDays = Math.floor(diffHr / 24);
      if (diffDays === 1) return 'Hôm qua';
      if (diffDays < 7) return `${diffDays} ngày trước`;
      
      return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
    } catch {
      return 'Vừa xong';
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Tổng quan hệ thống';
      case 'tasks': return 'Quản lý Dự án';
      case 'calculator': return 'Tính toán cỡ mẫu';
      case 'scientific_journals': return 'Quản lý điểm báo khoa học';
      case 'qualitative_analysis': return 'Phân tích định tính';
      case 'quantitative_analysis': return 'Phân tích số liệu định lượng';
      case 'portfolio_cms': return 'Quản trị Portfolio';
      case 'portfolio_website': return 'Trang Portfolio';
      case 'media_library': return 'Thư viện';
      case 'users': return 'Quản lý & Phân quyền';
      case 'notifications_admin': return 'Chức năng thông báo';
      case 'notifications': return 'Thông báo hệ thống';
      case 'settings': return 'Cấu hình hệ thống';
      case 'backup': return 'Backup dữ liệu';
      case 'website': return 'Tích hợp Website';
      case 'guide': return 'Hướng dẫn & Tài liệu';
      case 'public_search': return 'Tra cứu báo khoa học';
      default: return settings?.webAppTitle || 'Smart Research VN';
    }
  };

  const uniqueNotifications = Array.from(new Map<string, AppNotification>(notifications.map(n => [n.id, n])).values());
  const unreadCount = uniqueNotifications.filter(n => n.unread).length;
  const filteredNotifications = uniqueNotifications.filter(n => activeFilter === 'all' || n.unread);

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'task':
        return <ClipboardList className="w-4 h-4 text-emerald-600" />;
      case 'journal':
        return <BookOpen className="w-4 h-4 text-brand" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getBgForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'task':
        return 'bg-emerald-50 border border-emerald-100';
      case 'journal':
        return 'bg-brand/10 border border-brand/20';
      case 'warning':
        return 'bg-amber-50 border border-amber-100';
      default:
        return 'bg-blue-50 border border-blue-100';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setSidebarOpen(prev => !prev)}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
          title="Ẩn/Hiện Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 font-display leading-tight">
            {getTabTitle()}
          </h2>
          {currentTab === 'tasks' && (
            <p className="text-[10px] text-slate-400 hidden sm:block">
              {currentUser?.role === 'admin' ? 'Quyền Quản trị tối cao' : 'Thành viên Hệ thống'} • Cập nhật trực tiếp
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <a 
          href="/tracuu.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/70 text-xs font-semibold text-emerald-700 hover:text-emerald-800 border border-emerald-200/60 transition-all shadow-sm"
        >
          <span>Trang Tra Cứu</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <button 
          onClick={() => {
            localStorage.setItem('isBannerVisible', 'true');
            sessionStorage.setItem('isScientificBannerVisible', 'true');
            window.location.reload();
          }}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-brand-light/30 text-xs font-semibold text-slate-600 hover:text-brand border border-slate-200/60 transition-all"
        >
          <span>Làm mới</span>
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 hover:bg-slate-50 rounded-lg relative cursor-pointer transition-all ${isOpen ? 'bg-slate-50 text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white flex items-center justify-center animate-pulse" />
            )}
          </button>

          {/* Invisible Backdrop for outside click */}
          {isOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          )}

          {/* Dropdown Panel */}
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden z-50 flex flex-col max-h-[32rem]"
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">Thông báo</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full">
                        {unreadCount} mới
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {notifications.length > 0 && (
                      <>
                        <button 
                          onClick={handleMarkAllAsRead}
                          className="p-1.5 hover:bg-white text-slate-400 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="Đánh dấu tất cả là đã đọc"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={handleClearAll}
                          className="p-1.5 hover:bg-white text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Xóa tất cả thông báo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div className="px-4 py-2 border-b border-slate-100 flex gap-2 text-[11px] font-semibold text-slate-500">
                  <button 
                    onClick={() => setActiveFilter('all')}
                    className={`px-2.5 py-1 rounded-full cursor-pointer transition-colors ${activeFilter === 'all' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                  >
                    Tất cả
                  </button>
                  <button 
                    onClick={() => setActiveFilter('unread')}
                    className={`px-2.5 py-1 rounded-full cursor-pointer transition-colors ${activeFilter === 'unread' ? 'bg-rose-50 text-rose-600 font-bold' : 'hover:bg-slate-50'}`}
                  >
                    Chưa đọc ({unreadCount})
                  </button>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100/50 max-h-96">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((n) => (
                      <div 
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-4 flex gap-3 hover:bg-slate-50 transition-all cursor-pointer relative group ${n.unread ? 'bg-brand-light/10' : ''}`}
                      >
                        {/* Status Unread Dot Indicator */}
                        {n.unread && (
                          <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                        )}

                        {/* Icon */}
                        <div className={`p-2 rounded-xl h-9 w-9 shrink-0 flex items-center justify-center ${getBgForType(n.type)}`}>
                          {getIconForType(n.type)}
                        </div>

                        {/* Text details */}
                        <div className="space-y-1 pr-6 flex-1">
                          <h4 className={`text-xs leading-snug tracking-tight ${n.unread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                            {n.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {n.description}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {formatRelativeTime(n.timestamp)}
                          </span>
                        </div>

                        {/* Delete Single button */}
                        <button 
                          onClick={(e) => handleDeleteNotification(n.id, e)}
                          className="absolute bottom-4 right-4 p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
                          title="Xóa thông báo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center space-y-3">
                      <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-slate-700">Hộp thư trống</h5>
                        <p className="text-[10px] text-slate-400 max-w-[15rem] mx-auto leading-relaxed">
                          Bạn không có thông báo nào trong danh mục này.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Current user info */}
        <div className="relative">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`flex items-center gap-2 pl-2 border-l border-slate-100 p-1.5 rounded-xl cursor-pointer transition-all group ${isUserMenuOpen ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
            title="Tài khoản người dùng"
          >
            <div className="hidden sm:block text-right">
              <span className="block text-xs font-bold text-slate-700 group-hover:text-brand transition-colors">{currentUser.fullName}</span>
              <span className="block text-[9px] text-slate-400 -mt-0.5">{currentUser?.role === 'admin' ? 'Admin' : 'User'}</span>
            </div>
            {currentUser.avatarUrl ? (
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.fullName} 
                className="w-8 h-8 rounded-lg object-cover border border-brand/20 shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand-light text-brand flex items-center justify-center font-bold text-xs border border-brand/10">
                {currentUser.fullName?.substring(0, 1).toUpperCase()}
              </div>
            )}
          </button>

          {/* User Dropdown Menu */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 py-2"
                >
                  <div className="px-4 py-3 border-b border-slate-50 mb-1 flex items-center gap-3">
                    {currentUser.avatarUrl ? (
                      <img 
                        src={currentUser.avatarUrl} 
                        alt={currentUser.fullName} 
                        className="w-9 h-9 rounded-xl object-cover border border-slate-100 shadow-sm"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-brand-light text-brand flex items-center justify-center font-bold text-sm border border-brand/10">
                        {currentUser.fullName?.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{currentUser.fullName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      onProfileClick(false); // Edit mode for "Hồ sơ" to allow uploading avatar & editing
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-brand transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Hồ sơ</p>
                      <p className="text-[10px] text-slate-400">Xem và sửa thông tin cá nhân</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      onProfileClick(false); // Edit mode for "Cài đặt"
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-brand transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                      <Settings className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Cài đặt</p>
                      <p className="text-[10px] text-slate-400">Sửa thông tin cá nhân</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      if (confirm("Bạn có chắc muốn xoá bộ nhớ đệm (Cache)? Thao tác này sẽ xoá các cài đặt tạm thời và yêu cầu tải lại trang.")) {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.reload();
                      }
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                      <Database className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Xoá cache</p>
                      <p className="text-[10px] text-slate-400">Bộ nhớ đệm hệ thống</p>
                    </div>
                  </button>

                  <div className="border-t border-slate-50 mt-1 pt-1">
                    <button 
                      onClick={() => {
                        onLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                        <LogOut className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold">Đăng xuất</p>
                        <p className="text-[10px] text-rose-400">Thoát khỏi hệ thống</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hộp thoại đọc chi tiết thông báo hệ thống */}
      <AnimatePresence>
        {selectedSystemNotification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSystemNotification(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Card Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 z-10 flex flex-col max-h-[85vh]"
            >
              {/* Top accent bar matching the notification type */}
              <div className={`h-1.5 w-full ${
                selectedSystemNotification.type === 'warning' ? 'bg-amber-500' :
                selectedSystemNotification.type === 'error' ? 'bg-rose-500' :
                selectedSystemNotification.type === 'success' ? 'bg-emerald-500' :
                selectedSystemNotification.type === 'journal' ? 'bg-brand' :
                'bg-blue-500'
              }`} />

              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl flex items-center justify-center ${getBgForType(selectedSystemNotification.type)}`}>
                    {getIconForType(selectedSystemNotification.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      {selectedSystemNotification.type === 'system' ? 'Thông báo hệ thống' :
                       selectedSystemNotification.type === 'warning' ? 'Cảnh báo quan trọng' :
                       selectedSystemNotification.type === 'error' ? 'Lỗi hệ thống' :
                       selectedSystemNotification.type === 'success' ? 'Hoàn thành' :
                       selectedSystemNotification.type === 'journal' ? 'Điểm báo khoa học' :
                       selectedSystemNotification.type === 'task' ? 'Nhiệm vụ giao việc' : 'Thông báo'}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mt-0.5">
                      {selectedSystemNotification.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatRelativeTime(selectedSystemNotification.timestamp)} ({new Date(selectedSystemNotification.timestamp).toLocaleString('vi-VN')})</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSystemNotification(null)}
                  className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* Main Content */}
                <div className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80">
                  {selectedSystemNotification.description}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedSystemNotification(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                >
                  Đóng lại
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
