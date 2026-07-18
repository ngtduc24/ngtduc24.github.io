import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  Trash2, 
  CheckCheck, 
  ClipboardList, 
  BookOpen, 
  AlertTriangle, 
  Info, 
  Clock, 
  ChevronRight,
  Sparkles,
  Inbox,
  Shield,
  Send,
  X
} from 'lucide-react';
import { UserAccount, Task, AppSettings, AppNotification } from '../types';
import { getNotificationsFromSupabase, subscribeToNotifications } from '../lib/data';
import { subscribeToTasks } from '../lib/tasks';
import { useConfirmation } from './ConfirmationContext';

interface UserNotificationsProps {
  currentUser: UserAccount;
  settings?: AppSettings;
  setCurrentTab: (tab: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function UserNotifications({ currentUser, settings, setCurrentTab, onUnreadCountChange }: UserNotificationsProps) {
  const { confirm } = useConfirmation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'task' | 'system'>('all');
  const [selectedSystemNotification, setSelectedSystemNotification] = useState<AppNotification | null>(null);

  // Load from LocalStorage & Subscribe
  useEffect(() => {
    const key = `notifications_${currentUser.id}`;
    const stored = localStorage.getItem(key);
    let initialNotifs: AppNotification[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        initialNotifs = parsed.filter((n: any) => !n.id.startsWith("system-welcome-") && !n.id.startsWith("journal-sync-") && !n.id.startsWith("task-tip-") && localStorage.getItem(`notif_deleted_${currentUser.id}_${n.id}`) !== 'true');
        if (initialNotifs.length !== parsed.length) localStorage.setItem(key, JSON.stringify(initialNotifs));
      } catch (e) {
        initialNotifs = [];
      }
    } else {
      initialNotifs = [];
      localStorage.setItem(key, JSON.stringify(initialNotifs));
    }
    setNotifications(initialNotifs);

    // Subscribe to Firestore System Notifications
    const unsubscribeNotifs = subscribeToNotifications((firestoreNotifs) => {
      const mapped: AppNotification[] = firestoreNotifs
        .filter(fn => {
          // Filter by audience
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
        const systemIds = new Set(mapped.map(n => n.id));
        const combined = [...mapped, ...localOnly.filter(n => !systemIds.has(n.id))];
        combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return combined;
      });
    });

  
  // Subscribe to tasks for assignments and deadlines
    const unsubscribeTasks = subscribeToTasks((tasks) => {
      setNotifications(prev => {
        let updated = [...prev];
        let hasChanges = false;

        tasks.forEach(task => {
          if (task.isDeleted) return;

          // Deadline within 24h
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

          // Assigned to current user
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

    return () => {
      unsubscribeNotifs();
      unsubscribeTasks();
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

  const saveAndSync = (newNotifications: AppNotification[]) => {
    setNotifications(newNotifications);
    const key = `notifications_${currentUser.id}`;
    localStorage.setItem(key, JSON.stringify(newNotifications));
    window.dispatchEvent(new Event('app_notifications_changed'));
  };

  const handleMarkAsRead = (id: string) => {
    const readKey = `notif_read_${currentUser.id}_${id}`;
    localStorage.setItem(readKey, 'true');
    const updated = notifications.map(n => n.id === id ? { ...n, unread: false } : n);
    saveAndSync(updated);
  };

  const handleDeleteNotification = (id: string) => {
    localStorage.setItem(`notif_deleted_${currentUser.id}_${id}`, 'true');
    const updated = notifications.filter(n => n.id !== id);
    saveAndSync(updated);
  };

  const handleMarkAllRead = () => {
    notifications.forEach(n => {
      const readKey = `notif_read_${currentUser.id}_${n.id}`;
      localStorage.setItem(readKey, 'true');
    });
    const updated = notifications.map(n => ({ ...n, unread: false }));
    saveAndSync(updated);
  };

  const handleClearAll = () => {
    confirm('Xác nhận xóa toàn bộ thông báo', 'Bạn có chắc chắn muốn xóa toàn bộ thông báo không?', () => {
      notifications.forEach(n => {
        localStorage.setItem(`notif_deleted_${currentUser.id}_${n.id}`, 'true');
      });
      saveAndSync([]);
    });
  };

  const handleNotificationClick = (n: AppNotification) => {
    handleMarkAsRead(n.id);
    
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
      setCurrentTab('tasks');
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
      setCurrentTab('scientific_journals');
    } 
    // For system/general notifications, show details modal
    else if (n.type === 'system' || n.type === 'info') {
      setSelectedSystemNotification(n);
    } 
    // Fallback redirect if any actionUrl is specified
    else if (n.actionUrl) {
      setCurrentTab(n.actionUrl);
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
      
      return date.toLocaleDateString('vi-VN', { 
        day: 'numeric', 
        month: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Vừa xong';
    }
  };

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'task':
        return <ClipboardList className="w-5 h-5 text-rose-600" />;
      case 'journal':
        return <BookOpen className="w-5 h-5 text-purple-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBgForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'task':
        return 'bg-rose-50 border border-rose-100';
      case 'journal':
        return 'bg-purple-50 border border-purple-100';
      case 'warning':
        return 'bg-amber-50 border border-amber-100';
      default:
        return 'bg-blue-50 border border-blue-100';
    }
  };

  const uniqueNotifications = Array.from(new Map<string, AppNotification>(notifications.map(n => [n.id, n])).values());

  const filteredNotifs = uniqueNotifications.filter(n => {
    // Type Filter
    if (activeFilter === 'unread' && !n.unread) return false;
    if (activeFilter === 'task' && n.type !== 'task' && n.type !== 'warning') return false;
    if (activeFilter === 'system' && n.type !== 'system' && n.type !== 'journal') return false;

    // Search filter
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                          n.description.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const unreadCount = uniqueNotifications.filter(n => n.unread).length;
  const taskCount = uniqueNotifications.filter(n => n.type === 'task' || n.type === 'warning').length;
  const systemCount = uniqueNotifications.filter(n => n.type === 'system' || n.type === 'journal').length;

  // Sync back to parent state immediately
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {(currentUser.role === 'admin' || currentUser.permissions.includes('notifications')) && (
        <div className="bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/20 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-fadeIn">
          <div className="flex gap-3.5 items-start">
            <div className="p-3 bg-brand/10 text-brand rounded-2xl shrink-0 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Khu vực quản trị thông báo</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                Bạn có đặc quyền soạn thảo và phát thông báo trực tiếp, thời gian thực đến các thành viên trong hệ thống.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setCurrentTab('notifications_admin')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Phát thông báo mới</span>
          </button>
        </div>
      )}

      {/* Upper Status Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Tổng số thông báo</span>
            <div className="text-2xl font-black text-slate-800 tracking-tight leading-none">{notifications.length}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Tất cả thông báo nhận được</span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-600">
            <Inbox className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Thông báo chưa đọc</span>
            <div className="text-2xl font-black text-rose-600 tracking-tight leading-none">{unreadCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Cần xử lý hoặc xem ngay</span>
          </div>
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600">
            <Bell className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Về công việc</span>
            <div className="text-2xl font-black text-blue-600 tracking-tight leading-none">{taskCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Nhiệm vụ, deadline, phân công</span>
          </div>
          <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Về hệ thống</span>
            <div className="text-2xl font-black text-purple-600 tracking-tight leading-none">{systemCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Thông báo chung & Tạp chí</span>
          </div>
          <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-2xl text-purple-600">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar & Search */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Tìm kiếm nội dung thông báo..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand/20" 
          />
        </div>

        {/* Filters and Actions Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full">
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeFilter === 'all' ? 'bg-white shadow-xs text-brand' : 'text-slate-500'}`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setActiveFilter('unread')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeFilter === 'unread' ? 'bg-white shadow-xs text-brand' : 'text-slate-500'}`}
            >
              Chưa đọc ({unreadCount})
            </button>
            <button 
              onClick={() => setActiveFilter('task')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeFilter === 'task' ? 'bg-white shadow-xs text-brand' : 'text-slate-500'}`}
            >
              Công việc
            </button>
            <button 
              onClick={() => setActiveFilter('system')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeFilter === 'system' ? 'bg-white shadow-xs text-brand' : 'text-slate-500'}`}
            >
              Hệ thống
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={handleMarkAllRead} 
              disabled={unreadCount === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 transition-all cursor-pointer disabled:opacity-40"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>Đã đọc tất cả</span>
            </button>
            <button 
              onClick={handleClearAll} 
              disabled={notifications.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 border border-rose-100 bg-rose-50/50 hover:bg-rose-50 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 transition-all cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa toàn bộ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length > 0 ? (
          filteredNotifs.map((n, index) => (
            <div 
              key={n.id + '-' + index}
              onClick={() => handleNotificationClick(n)}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between cursor-pointer group hover:shadow-xs relative ${
                n.unread 
                  ? 'border-brand-light/70 bg-brand-light/5' 
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Unread dot */}
              {n.unread && (
                <span className="absolute top-5 left-5 w-2 h-2 bg-rose-500 rounded-full" />
              )}

              <div className={`flex gap-3.5 items-start ${n.unread ? 'pl-4' : ''}`}>
                {/* Icon wrapper */}
                <div className={`p-3 rounded-2xl shrink-0 flex items-center justify-center ${getBgForType(n.type)}`}>
                  {getIconForType(n.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-sm leading-tight tracking-tight ${n.unread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                      {n.title}
                    </h3>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      n.type === 'task' || n.type === 'warning' 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100/60' 
                        : (n.type === 'journal' ? 'bg-purple-50 text-purple-600 border border-purple-100/60' : 'bg-blue-50 text-blue-600 border border-blue-100/60')
                    }`}>
                      {n.type === 'warning' ? 'Cảnh báo' : (n.type === 'task' ? 'Công việc' : (n.type === 'journal' ? 'Tạp chí' : 'Hệ thống'))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    {n.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold pt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatRelativeTime(n.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Action and delete buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto justify-end">
                {n.actionUrl && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(n);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-brand-light/30 text-slate-600 hover:text-brand border border-slate-200/60 hover:border-brand/20 rounded-xl text-[11px] font-bold transition-all"
                  >
                    <span>Xem ngay</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNotification(n.id);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100/50"
                  title="Xóa thông báo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto border border-slate-100">
              <Bell className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-slate-700">Không tìm thấy thông báo nào</h4>
              <p className="text-xs text-slate-400 max-w-[20rem] mx-auto leading-relaxed">
                {search.trim() !== '' 
                  ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chuyển bộ lọc khác.' 
                  : 'Bạn chưa nhận được thông báo nào trong danh mục này.'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedSystemNotification && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn" id="system-notif-modal">
          <div className="absolute inset-0" onClick={() => setSelectedSystemNotification(null)} />
          <div className="bg-white rounded-3xl w-full max-w-lg relative overflow-hidden shadow-2xl z-10 animate-scaleUp flex flex-col p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Thông báo hệ thống</span>
                  <h4 className="text-sm font-black text-slate-800 font-display">Chi tiết thông báo</h4>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSystemNotification(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {selectedSystemNotification.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatRelativeTime(selectedSystemNotification.timestamp)}</span>
                  </span>
                  {selectedSystemNotification.senderName && (
                    <span className="bg-slate-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-600">
                      Người gửi: {selectedSystemNotification.senderName}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100/50 rounded-2xl p-4 min-h-[120px] max-h-[300px] overflow-y-auto">
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedSystemNotification.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSystemNotification(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
