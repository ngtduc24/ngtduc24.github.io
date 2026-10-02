import React, { useState } from 'react';
import { Bell, Check, Trash2, ClipboardList, BookOpen, AlertTriangle, Info, X, Clock, Users, KeyRound } from 'lucide-react';
import { UserAccount, Task, AppSettings, AppNotification } from '../types';
import { isTaskRelevantToUser } from '../lib/tasks';
import { useMyNotifications, openNotificationTarget } from '../lib/notifications';
import { UserChip } from './ui/People';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationBellProps {
  currentUser: UserAccount;
  settings?: AppSettings;
  setCurrentTab?: (tab: string) => void;
  collapsed?: boolean;
}

/**
 * Chuông thông báo dùng trong thanh điều hướng bên trái. Toàn bộ logic tải và xử lý
 * thông báo được đưa vào đây để bỏ thanh header phía trên mà không mất chức năng.
 */
export default function NotificationBell({ currentUser, settings, setCurrentTab, collapsed }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [selectedSystemNotification, setSelectedSystemNotification] = useState<AppNotification | null>(null);
  // Danh sách, trạng thái đọc và xoá dùng chung, đồng bộ giữa các thiết bị.
  const notif = useMyNotifications(currentUser);
  const notifications = notif.items;
  const allTasks: Task[] = notif.tasks;
  const handleMarkAsRead = (id: string) => notif.markRead(id);
  const handleMarkAllAsRead = () => notif.markAllRead();
  const handleClearAll = () => notif.clearAll();
  const handleDeleteNotification = (id: string, e: React.MouseEvent) => { e.stopPropagation(); notif.remove(id); };

  const handleNotificationClick = (n: AppNotification) => {
    handleMarkAsRead(n.id);
    setIsOpen(false);
    // Thông báo cộng tác, cấp quyền ứng dụng: mở thẳng nơi liên quan.
    if (openNotificationTarget(n, setCurrentTab)) return;

    if (n.type === 'task' || n.type === 'warning') {
      let taskId = '';
      if (n.metadata) {
        let metaObj: any = n.metadata;
        if (typeof n.metadata === 'string') {
          try { metaObj = JSON.parse(n.metadata); } catch (e) {}
        }
        if (metaObj && typeof metaObj === 'object') taskId = metaObj.taskId || '';
      }
      if (!taskId) {
        const suffix = `-${currentUser.id}`;
        if (n.id.startsWith('task-assigned-')) {
          let clean = n.id.slice('task-assigned-'.length);
          if (clean.endsWith(suffix)) clean = clean.slice(0, -suffix.length);
          taskId = clean;
        } else if (n.id.startsWith('task-expiring-')) {
          let clean = n.id.slice('task-expiring-'.length);
          if (clean.endsWith(suffix)) clean = clean.slice(0, -suffix.length);
          taskId = clean;
        }
      }
      if (taskId) {
        const targetTask = allTasks.find(t => t.id === taskId);
        if (targetTask && !isTaskRelevantToUser(targetTask, currentUser)) {
          setSelectedSystemNotification({
            id: n.id,
            title: 'Không có quyền truy cập',
            description: 'Công việc này không được giao cho bạn hoặc không do bạn tạo. Bạn không có quyền xem chi tiết.',
            timestamp: new Date().toISOString(),
            type: 'warning',
            unread: false
          });
          return;
        }
        localStorage.setItem('auto_open_task_id', taskId);
        window.dispatchEvent(new CustomEvent('app_open_task', { detail: taskId }));
      }
      if (setCurrentTab) setCurrentTab('tasks');
    } else if (n.type === 'journal') {
      let journalId = '';
      if (n.metadata) {
        let metaObj: any = n.metadata;
        if (typeof n.metadata === 'string') {
          try { metaObj = JSON.parse(n.metadata); } catch (e) {}
        }
        if (metaObj && typeof metaObj === 'object') journalId = metaObj.journalId || '';
      }
      if (journalId) {
        localStorage.setItem('auto_open_journal_id', journalId);
        window.dispatchEvent(new CustomEvent('app_open_journal', { detail: journalId }));
      }
      if (setCurrentTab) setCurrentTab('scientific_journals');
    } else if (n.type === 'system' || n.type === 'info') {
      setSelectedSystemNotification(n);
    } else if (n.actionUrl && setCurrentTab) {
      setCurrentTab(n.actionUrl);
    } else {
      setSelectedSystemNotification(n);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
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

  const uniqueNotifications = Array.from(new Map<string, AppNotification>(notifications.map(n => [n.id, n])).values());
  const unreadCount = uniqueNotifications.filter(n => n.unread).length;
  const filteredNotifications = uniqueNotifications.filter(n => activeFilter === 'all' || n.unread);

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'task': return <ClipboardList className="w-4 h-4 text-brand" />;
      case 'journal': return <BookOpen className="w-4 h-4 text-brand" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'collab': return <Users className="w-4 h-4 text-violet-600" />;
      case 'access': return <KeyRound className="w-4 h-4 text-emerald-600" />;
      default: return <Info className="w-4 h-4 text-brand" />;
    }
  };

  const getBgForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'task': return 'bg-brand-light border border-brand-light';
      case 'journal': return 'bg-brand/10 border border-brand/20';
      case 'warning': return 'bg-amber-50 border border-amber-100';
      case 'collab': return 'bg-violet-50 border border-violet-100';
      case 'access': return 'bg-emerald-50 border border-emerald-100';
      default: return 'bg-brand-light border border-brand-light';
    }
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-label="Thông báo"
        className={`group relative flex w-full flex-col items-center gap-1 rounded-2xl py-2.5 transition-all ${isOpen ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-100 hover:text-brand'}`}
      >
        <span className="relative grid h-10 w-10 place-items-center rounded-xl">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white ring-2 ring-white">{unreadCount}</span>
          )}
        </span>
        {!collapsed && <span className="text-[10px] font-bold leading-none">Thông báo</span>}
      </button>

      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-0 left-full z-50 ml-3 flex max-h-[32rem] w-96 max-w-[calc(100vw-6rem)] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white text-left shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">Thông báo</span>
                {unreadCount > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">{unreadCount} mới</span>}
              </div>
              {notifications.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button onClick={handleMarkAllAsRead} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-brand" title="Đánh dấu tất cả là đã đọc"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={handleClearAll} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-rose-600" title="Xóa tất cả thông báo"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-b border-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-500">
              <button onClick={() => setActiveFilter('all')} className={`rounded-full px-2.5 py-1 transition-colors ${activeFilter === 'all' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>Tất cả</button>
              <button onClick={() => setActiveFilter('unread')} className={`rounded-full px-2.5 py-1 transition-colors ${activeFilter === 'unread' ? 'bg-rose-50 font-bold text-rose-600' : 'hover:bg-slate-50'}`}>Chưa đọc ({unreadCount})</button>
            </div>

            <div className="max-h-96 flex-1 divide-y divide-slate-100/50 overflow-y-auto">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map(n => (
                  <div key={n.id} onClick={() => handleNotificationClick(n)} className={`group relative flex cursor-pointer gap-3 p-4 transition-all hover:bg-slate-50 ${n.unread ? 'bg-brand-light/10' : ''}`}>
                    {n.unread && <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-rose-500" />}
                    {n.senderId && n.senderId.length > 8 ? <span className="relative shrink-0"><UserChip id={n.senderId} name={n.senderName} size={36} showName={false} /><span className={`absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full ring-2 ring-white ${getBgForType(n.type)} [&_svg]:h-2.5 [&_svg]:w-2.5`}>{getIconForType(n.type)}</span></span> : <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getBgForType(n.type)}`}>{getIconForType(n.type)}</div>}
                    <div className="flex-1 space-y-1 pr-6">
                      <h4 className={`text-xs leading-snug tracking-tight ${n.unread ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{n.title}</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500">{n.description}</p>
                      <span className="block text-[10px] font-medium text-slate-400">{formatRelativeTime(n.timestamp)}</span>
                    </div>
                    <button onClick={(e) => handleDeleteNotification(n.id, e)} className="absolute bottom-4 right-4 rounded-md p-1 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100" title="Xóa thông báo"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))
              ) : (
                <div className="space-y-3 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300"><Bell className="h-5 w-5" /></div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-slate-700">Hộp thư trống</h5>
                    <p className="mx-auto max-w-[15rem] text-[10px] leading-relaxed text-slate-400">Bạn không có thông báo nào trong danh mục này.</p>
                  </div>
                </div>
              )}
            </div>

            {setCurrentTab && (
              <button onClick={() => { setIsOpen(false); setCurrentTab('notifications'); }} className="border-t border-slate-100 py-3 text-center text-xs font-bold text-brand hover:bg-brand-light/40">Xem tất cả thông báo</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hộp thoại đọc chi tiết thông báo */}
      <AnimatePresence>
        {selectedSystemNotification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSystemNotification(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', duration: 0.3 }} className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-2xl">
              <div className={`h-1.5 w-full ${selectedSystemNotification.type === 'warning' ? 'bg-amber-500' : selectedSystemNotification.type === 'error' ? 'bg-rose-500' : selectedSystemNotification.type === 'success' ? 'bg-emerald-500' : 'bg-brand'}`} />
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center rounded-xl p-2.5 ${getBgForType(selectedSystemNotification.type)}`}>{getIconForType(selectedSystemNotification.type)}</div>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {selectedSystemNotification.type === 'system' ? 'Thông báo hệ thống' : selectedSystemNotification.type === 'warning' ? 'Cảnh báo quan trọng' : selectedSystemNotification.type === 'journal' ? 'Điểm báo khoa học' : selectedSystemNotification.type === 'task' ? 'Nhiệm vụ giao việc' : selectedSystemNotification.type === 'collab' ? 'Cộng tác' : selectedSystemNotification.type === 'access' ? 'Quyền sử dụng' : 'Thông báo'}
                    </span>
                    <h3 className="mt-0.5 text-sm font-extrabold tracking-tight text-slate-800">{selectedSystemNotification.title}</h3>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatRelativeTime(selectedSystemNotification.timestamp)} ({new Date(selectedSystemNotification.timestamp).toLocaleString('vi-VN')})</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedSystemNotification(null)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="whitespace-pre-wrap rounded-2xl border border-slate-100/80 bg-slate-50/50 p-5 text-xs font-semibold leading-relaxed text-slate-600">{selectedSystemNotification.description}</div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
                <button onClick={() => setSelectedSystemNotification(null)} className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-900">Đóng lại</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
