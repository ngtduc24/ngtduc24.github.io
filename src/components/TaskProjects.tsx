import { uploadImageToCloudinary } from '../lib/upload';
import MediaSourcePicker from './MediaSourcePicker';
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Search, BookOpen, Layers, X, Sparkles, CheckCircle2, PlayCircle, AlertCircle, XCircle, Coins, Wallet } from 'lucide-react';
import { useTasks } from './TaskContext';
import TaskForm from './TaskForm';
import TaskDetailModal from './TaskDetailModal';
import TaskRow from './TaskRow';
import ConfigSection from './ConfigSection';
import { Task, TaskStatus, UserAccount, AppSettings } from '../types';
import { saveTaskToSupabase, deleteTaskFromSupabase, addTaskHistory } from '../lib/tasks';
import { saveDefaultSettingsToSupabase, pushNotificationToSupabase } from '../lib/data';
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';

import { Sparkles as IconSparkles, BookOpen as IconBookOpen, FolderKanban as IconFolderKanban, BarChart3 as IconBarChart3, Star as IconStar, Rocket as IconRocket, ClipboardList as IconClipboardList, FileText as IconFileText, Users as IconUsers, Calendar as IconCalendar, Globe as IconGlobe, GraduationCap as IconGraduationCap } from 'lucide-react';

const BANNER_ICONS: Record<string, any> = {
  Sparkles: IconSparkles,
  BookOpen: IconBookOpen,
  FolderKanban: IconFolderKanban,
  BarChart3: IconBarChart3,
  Star: IconStar,
  Rocket: IconRocket,
  ClipboardList: IconClipboardList,
  FileText: IconFileText,
  Users: IconUsers,
  Calendar: IconCalendar,
  Globe: IconGlobe,
  GraduationCap: IconGraduationCap
};

export default function TaskProjects({ users, currentUser, settings, onRefreshSettings, onUpdateUser }: { users: UserAccount[], currentUser: UserAccount, settings: AppSettings, onRefreshSettings: () => void, onUpdateUser: (user: UserAccount) => Promise<void> }) {
  const [showBannerSettings, setShowBannerSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [bannerTitle, setBannerTitle] = useState(settings?.taskBannerTitle || '');
  const [bannerDesc, setBannerDesc] = useState(settings?.taskBannerDescription || '');
  const [bannerLabel, setBannerLabel] = useState(settings?.taskBannerLabel || '');
  const [bannerImg, setBannerImg] = useState(settings?.taskBannerImage || '');
  const [bannerIcon, setBannerIcon] = useState(settings?.taskBannerIcon || 'Sparkles');
  const ChipIcon = BANNER_ICONS[settings?.taskBannerIcon || ''] || BANNER_ICONS['Sparkles'];

  useEffect(() => {
    if (settings) {
      setBannerTitle(settings.taskBannerTitle || '');
      setBannerDesc(settings.taskBannerDescription || '');
      setBannerLabel(settings.taskBannerLabel || '');
      setBannerImg(settings.taskBannerImage || '');
      setBannerIcon(settings.taskBannerIcon || 'Sparkles');
    }
  }, [settings]);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveDefaultSettingsToSupabase({
        ...settings,
        taskBannerTitle: bannerTitle,
        taskBannerDescription: bannerDesc,
        taskBannerLabel: bannerLabel,
        taskBannerImage: bannerImg,
        taskBannerIcon: bannerIcon,
      });
      if (onRefreshSettings) await onRefreshSettings();
      setShowBannerSettings(false);
      addNotification("Đã lưu banner thành công!", "success");
    } catch (err) {
      addNotification("Có lỗi xảy ra", "error");
    }
  };
  
  const { tasks } = useTasks();
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const isUserAdmin = currentUser?.role === 'admin';

  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'add-task' | 'trash' | 'config' | 'permissions'>('list');
  const [newType, setNewType] = useState('');
  const [editingType, setEditingType] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Reset selection when tab, search, or status filter changes
  useEffect(() => {
    setSelectedTaskIds([]);
  }, [activeTab, search, statusFilter]);

  useEffect(() => {
    const checkAutoOpenTask = () => {
      const autoOpenTaskId = localStorage.getItem('auto_open_task_id');
      if (autoOpenTaskId && tasks.length > 0) {
        const foundTask = tasks.find(t => t.id === autoOpenTaskId);
        if (foundTask) {
          setViewingTask(foundTask);
          localStorage.removeItem('auto_open_task_id');
        }
      }
    };

    checkAutoOpenTask();

    const handleOpenTask = (e: Event) => {
      const taskId = (e as CustomEvent).detail;
      const foundTask = tasks.find(t => t.id === taskId);
      if (foundTask) {
        setViewingTask(foundTask);
        localStorage.removeItem('auto_open_task_id');
      }
    };

    window.addEventListener('app_open_task', handleOpenTask);
    return () => {
      window.removeEventListener('app_open_task', handleOpenTask);
    };
  }, [tasks]);
  
  const handleAddTaskType = async () => {
    if (!newType.trim()) return;
    
    let updatedTaskTypes = settings.taskTypes || [];
    
    if (editingType) {
      updatedTaskTypes = updatedTaskTypes.map(t => t === editingType ? newType.trim() : t);
      addNotification("Đã cập nhật loại công việc", "success");
    } else {
      updatedTaskTypes = [...updatedTaskTypes, newType.trim()];
      addNotification("Đã thêm loại công việc mới", "success");
    }

    const updatedSettings = { ...settings, taskTypes: updatedTaskTypes };
    await saveDefaultSettingsToSupabase(updatedSettings);
    onRefreshSettings();
    setNewType('');
    setEditingType(null);
  };

  const startEditTaskType = (type: string) => {
    setNewType(type);
    setEditingType(type);
  };

  const handleDeleteTaskType = async (typeToDelete: string) => {
    const updatedSettings = { ...settings, taskTypes: (settings.taskTypes || []).filter(t => t !== typeToDelete) };
    await saveDefaultSettingsToSupabase(updatedSettings);
    onRefreshSettings();
    addNotification("Đã xóa loại công việc", "info");
  };

  const handleToggleTaskPermission = async (user: UserAccount, field: 'canAssignTask' | 'canReceiveTask' | 'canRunPauseTask' | 'canCompleteTask' | 'canDeleteTask' | 'canCreateTask') => {
    if (user.role === 'admin') {
      addNotification('Không thể thay đổi quyền của Admin', 'error');
      return;
    }
    const updatedUser = { ...user, [field]: !user[field] };
    try {
      await onUpdateUser(updatedUser);
      addNotification(`Đã cập nhật quyền cho ${user.fullName}`, "success");
      
      // Gửi thông báo cho người dùng về việc thay đổi quyền
      const permissionNames: any = {
        canAssignTask: 'Giao nhiệm vụ',
        canReceiveTask: 'Nhận nhiệm vụ',
        canRunPauseTask: 'Bắt đầu/Tạm dừng nhiệm vụ',
        canCompleteTask: 'Hoàn thành nhiệm vụ',
        canDeleteTask: 'Xóa nhiệm vụ',
        canCreateTask: 'Tạo nhiệm vụ'
      };
      
      try {
        await pushNotificationToSupabase({
          title: 'Cập nhật quyền hạn',
          description: `Quyền "${permissionNames[field] || field}" của bạn đã được cập nhật thành ${updatedUser[field] ? 'CÓ' : 'KHÔNG'} bởi Admin.`,
          type: 'system',
          targetAudience: 'custom_users',
          targetUserIds: [user.id],
          senderId: currentUser.id,
          senderName: currentUser.fullName,
        });
      } catch (err) {}
    } catch (err) {
      addNotification('Lỗi kết nối Firebase: Không thể cập nhật quyền.', "error");
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isUserAdmin && activeTab === 'trash') {
      setActiveTab('list');
    }
  }, [isUserAdmin, activeTab]);

  const getProgress = (task: Task) => {
    if (task.status === 'Completed') return 100;
    if (task.status === 'Cancelled') return 0;
    if (task.status === 'Paused') return task.progress;
    
    const start = new Date(task.createdAt).getTime();
    const end = new Date(task.deadline).getTime();
    const now = currentTime.getTime();
    
    if (now >= end) return 100;
    if (now <= start) return 0;
    
    const autoProgress = ((now - start) / (end - start)) * 100;
    return Math.min(100, Math.max(task.progress, autoProgress));
  }

  const handleAction = async (task: Task, action: string) => {
    const isCreator = task.creatorId === currentUser.id;
    const isAssigned = task.assignedTo === currentUser.id;

    if ((action === 'delete' || action === 'permanent_delete') && !isUserAdmin && !currentUser?.canDeleteTask) {
        addNotification("Bạn không có quyền xoá công việc này.", "error");
        return;
    }
    if (action === 'cancel' && !isUserAdmin) {
        addNotification("Bạn không có quyền hủy công việc này.", "error");
        return;
    }
    if (action !== 'delete' && action !== 'restore' && action !== 'permanent_delete' && !isUserAdmin && !isCreator && !isAssigned) {
        addNotification("Bạn không có quyền thực hiện thao tác này.", "error");
        return;
    }
    const now = new Date().toISOString();
    let updatedTask = { ...task };

    switch (action) {
      case 'pause':
        updatedTask.status = 'Paused';
        updatedTask.lastPausedAt = now;
        updatedTask = addTaskHistory(updatedTask, 'Tạm dừng công việc', currentUser.id, currentUser.fullName);
        break;
      case 'run':
        if (task.lastPausedAt) {
          const pauseTime = new Date().getTime() - new Date(task.lastPausedAt).getTime();
          updatedTask.pauseDuration += pauseTime;
          const deadline = new Date(updatedTask.deadline);
          deadline.setMilliseconds(deadline.getMilliseconds() + pauseTime);
          updatedTask.deadline = deadline.toISOString();
        }
        updatedTask.status = 'In Progress';
        delete updatedTask.lastPausedAt;
        updatedTask = addTaskHistory(updatedTask, 'Bắt đầu/Tiếp tục công việc', currentUser.id, currentUser.fullName);
        break;
      case 'complete':
        updatedTask.status = 'Completed';
        updatedTask.progress = 100;
        updatedTask = addTaskHistory(updatedTask, 'Hoàn thành công việc', currentUser.id, currentUser.fullName);
        addNotification("Công việc đã hoàn thành!", "success");
        
        // Gửi thông báo hệ thống nếu người hoàn thành khác người tạo
        if (updatedTask.creatorId && updatedTask.creatorId !== currentUser.id) {
          try {
            await pushNotificationToSupabase({
              title: 'Công việc đã hoàn tất',
              description: `${currentUser.fullName} đã hoàn thành công việc: "${task.name}"`,
              type: 'task',
              targetAudience: 'custom_users',
              targetUserIds: [updatedTask.creatorId],
              senderId: currentUser.id,
              senderName: currentUser.fullName,
              metadata: { taskId: task.id }
            });
          } catch (err) {}
        }
        break;
      case 'cancel':
        updatedTask.status = 'Cancelled';
        updatedTask = addTaskHistory(updatedTask, 'Hủy bỏ công việc', currentUser.id, currentUser.fullName);
        break;
      case 'delete':
        confirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xoá công việc này không?', async () => {
          const deletedTask = addTaskHistory({ ...updatedTask, isDeleted: true }, 'Chuyển vào thùng rác', currentUser.id, currentUser.fullName);
          await saveTaskToSupabase(deletedTask);
          addNotification("Công việc đã được chuyển vào thùng rác.", "info");
        });
        return;
      case 'permanent_delete':
        confirm('Xác nhận xóa vĩnh viễn', 'Bạn có chắc chắn muốn xóa vĩnh viễn công việc này? Thao tác này không thể hoàn tác.', async () => {
          await deleteTaskFromSupabase(task.id);
          addNotification("Đã xóa vĩnh viễn công việc thành công.", "success");
        });
        return;
      case 'restore':
        confirm('Xác nhận khôi phục', 'Bạn có chắc chắn muốn khôi phục công việc này từ thùng rác?', async () => {
          const restoredTask = addTaskHistory({ ...updatedTask, isDeleted: false }, 'Khôi phục từ thùng rác', currentUser.id, currentUser.fullName);
          await saveTaskToSupabase(restoredTask);
          addNotification("Đã khôi phục công việc thành công.", "success");
        });
        return;
    }
    await saveTaskToSupabase(updatedTask);
    if (action !== 'delete' && action !== 'restore' && action !== 'permanent_delete') addNotification(`Công việc ${task.name} đã được cập nhật.`, "success");
  };

  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = sortedTasks.map(t => t.id);
    const allSelected = allFilteredIds.every(id => selectedTaskIds.includes(id));
    if (allSelected) {
      setSelectedTaskIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleDeleteSelected = async () => {
    const isTrash = activeTab === 'trash';
    const tasksToDelete = sortedTasks.filter(t => selectedTaskIds.includes(t.id));
    if (tasksToDelete.length === 0) {
      addNotification("Vui lòng chọn ít nhất một công việc để xoá.", "warning");
      return;
    }

    const title = isTrash ? 'Xác nhận xóa vĩnh viễn' : 'Xác nhận xóa';
    const message = isTrash 
      ? `Bạn có chắc chắn muốn xóa vĩnh viễn ${tasksToDelete.length} công việc đã chọn không? Thao tác này không thể hoàn tác.` 
      : `Bạn có chắc chắn muốn chuyển ${tasksToDelete.length} công việc đã chọn vào thùng rác không?`;

    confirm(title, message, async () => {
      try {
        if (isTrash) {
          for (const task of tasksToDelete) {
            await deleteTaskFromSupabase(task.id);
          }
          addNotification(`Đã xóa vĩnh viễn ${tasksToDelete.length} công việc thành công.`, "success");
        } else {
          for (const task of tasksToDelete) {
            const updatedTask = addTaskHistory({ ...task, isDeleted: true }, 'Chuyển vào thùng rác', currentUser.id, currentUser.fullName);
            await saveTaskToSupabase(updatedTask);
          }
          addNotification(`Đã chuyển ${tasksToDelete.length} công việc vào thùng rác thành công.`, "success");
        }
        setSelectedTaskIds([]);
      } catch (err) {
        addNotification("Có lỗi xảy ra khi thực hiện thao tác xóa hàng loạt.", "error");
      }
    });
  };

  const handleDeleteAll = async () => {
    const isTrash = activeTab === 'trash';
    if (sortedTasks.length === 0) {
      addNotification("Không có công việc nào để xoá.", "warning");
      return;
    }

    const title = isTrash ? 'Xác nhận dọn sạch thùng rác' : 'Xác nhận xóa tất cả';
    const message = isTrash
      ? `Bạn có chắc chắn muốn xóa vĩnh viễn TOÀN BỘ ${sortedTasks.length} công việc trong thùng rác không? Thao tác này không thể hoàn tác.`
      : `Bạn có chắc chắn muốn chuyển TOÀN BỘ ${sortedTasks.length} công việc hiện tại vào thùng rác không?`;

    confirm(title, message, async () => {
      try {
        if (isTrash) {
          for (const task of sortedTasks) {
            await deleteTaskFromSupabase(task.id);
          }
          addNotification(`Đã dọn sạch ${sortedTasks.length} công việc trong thùng rác.`, "success");
        } else {
          for (const task of sortedTasks) {
            const updatedTask = addTaskHistory({ ...task, isDeleted: true }, 'Chuyển vào thùng rác', currentUser.id, currentUser.fullName);
            await saveTaskToSupabase(updatedTask);
          }
          addNotification(`Đã chuyển toàn bộ ${sortedTasks.length} công việc vào thùng rác thành công.`, "success");
        }
        setSelectedTaskIds([]);
      } catch (err) {
        addNotification("Có lỗi xảy ra khi xóa toàn bộ.", "error");
      }
    });
  };

  const handleRestoreSelected = async () => {
    const tasksToRestore = sortedTasks.filter(t => selectedTaskIds.includes(t.id));
    if (tasksToRestore.length === 0) {
      addNotification("Vui lòng chọn ít nhất một công việc để khôi phục.", "warning");
      return;
    }

    confirm('Xác nhận khôi phục hàng loạt', `Bạn có chắc chắn muốn khôi phục ${tasksToRestore.length} công việc đã chọn từ thùng rác không?`, async () => {
      try {
        for (const task of tasksToRestore) {
          const updatedTask = addTaskHistory({ ...task, isDeleted: false }, 'Khôi phục từ thùng rác', currentUser.id, currentUser.fullName);
          await saveTaskToSupabase(updatedTask);
        }
        addNotification(`Đã khôi phục ${tasksToRestore.length} công việc thành công.`, "success");
        setSelectedTaskIds([]);
      } catch (err) {
        addNotification("Có lỗi xảy ra khi khôi phục công việc.", "error");
      }
    });
  };

  const filteredTasks = tasks.filter(task => {
    const isVisible = isUserAdmin || task.assignedTo === currentUser.id || task.creatorId === currentUser.id;
    if (!isVisible) return false;

    const matchesTab = activeTab === 'trash' ? task.isDeleted : !task.isDeleted;
    if (!matchesTab) return false;

    const matchesSearch = task.name.toLowerCase().includes(search.toLowerCase()) || 
                          task.description.toLowerCase().includes(search.toLowerCase()) ||
                          task.subtasks.some(s => s.title.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const order: Record<TaskStatus, number> = { 'In Progress': 0, 'Paused': 1, 'Completed': 2, 'Overdue': 3, 'Cancelled': 4 };
    if (a.status !== b.status) return order[a.status] - order[b.status];
    if (a.status === 'In Progress') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    return 0;
  });

  const completedCount = tasks.filter(t => !t.isDeleted && t.status === 'Completed').length;
  const runningCount = tasks.filter(t => !t.isDeleted && t.status === 'In Progress').length;
  const cancelledCount = tasks.filter(t => !t.isDeleted && t.status === 'Cancelled').length;
  const expiringCount = tasks.filter(t => {
    if (t.isDeleted) return false;
    if (t.status === 'Completed' || t.status === 'Cancelled') return false;
    const deadline = new Date(t.deadline);
    const diffMs = deadline.getTime() - currentTime.getTime();
    return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
  }).length;

  const totalExpectedIncome = tasks
    .filter(t => !t.isDeleted && t.status !== 'Cancelled' && t.hasIncome && t.income)
    .reduce((sum, t) => sum + (t.income || 0), 0);

  const totalCompletedIncome = tasks
    .filter(t => !t.isDeleted && t.status === 'Completed' && t.hasIncome && t.income)
    .reduce((sum, t) => sum + (t.income || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      {showBanner && (
        <div className="bg-brand rounded-3xl p-8 text-white relative overflow-hidden shadow-lg animate-fadeIn" style={{ ...(settings?.taskBannerImage ? { backgroundImage: `url(${settings.taskBannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) }}>
        {settings?.taskBannerImage && <div className="absolute inset-0 bg-black/40" />}
          {isUserAdmin && (
            <button onClick={() => setShowBannerSettings(true)} className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer">
              <Settings className="w-5 h-5" />
            </button>
          )}
          {/* Banner Settings Removed */}

          <div className="flex flex-col items-start gap-4">
            {/* Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs relative z-10">
              <ChipIcon className="w-3.5 h-3.5 text-brand-light" />
              <span>{settings?.taskBannerLabel || "Smart Research VN"}</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-1 relative z-10">
              <h1 className="text-3xl font-extrabold tracking-tight">{settings?.taskBannerTitle || "Hệ thống quản lý công việc"}</h1>
              <p className="text-xs text-white/90 opacity-90 max-w-lg">{settings?.taskBannerDescription || "Quản lý công việc"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Completed Tasks */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Task hoàn thành</span>
            <div className="text-2xl font-black text-slate-800 tracking-tight leading-none">{completedCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Công việc đã hoàn thành</span>
          </div>
          <div className="p-3.5 bg-brand-light rounded-2xl text-brand transition-colors">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Running Tasks */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Task đang chạy</span>
            <div className="text-2xl font-black text-slate-800 tracking-tight leading-none">{runningCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Công việc đang thực hiện</span>
          </div>
          <div className="p-3.5 bg-brand-light rounded-2xl text-brand transition-colors">
            <PlayCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Cancelled Tasks */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Task đã hủy</span>
            <div className="text-2xl font-black text-slate-800 tracking-tight leading-none">{cancelledCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Công việc đã bị hủy bỏ</span>
          </div>
          <div className="p-3.5 bg-brand-light rounded-2xl text-brand transition-colors">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Expiring Tasks */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Task sắp hết hạn</span>
            <div className="text-2xl font-black text-slate-800 tracking-tight leading-none">{expiringCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Có hạn trong vòng 24 giờ</span>
          </div>
          <div className="p-3.5 bg-brand-light rounded-2xl text-brand transition-colors">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 5: Income Statistics */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="space-y-1 w-full">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Thu nhập đã nhận</span>
            <div className="text-xl font-black text-slate-800 tracking-tight leading-none truncate max-w-[12rem]" title={`${totalCompletedIncome.toLocaleString()} VNĐ`}>
              {totalCompletedIncome.toLocaleString()} <span className="text-xs font-bold text-slate-500">đ</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium block truncate" title={`Dự kiến: ${totalExpectedIncome.toLocaleString()} đ`}>
              Dự kiến: {totalExpectedIncome.toLocaleString()} đ
            </span>
          </div>
          <div className="p-3.5 bg-purple-50 rounded-2xl text-purple-600 transition-colors">
            <Coins className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 p-1 bg-slate-100 rounded-xl w-fit max-w-full overflow-x-auto scrollbar-none">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'list' ? 'bg-white shadow-sm text-brand-hover' : 'text-slate-500'}`}
          >
            Danh sách
          </button>
          {(isUserAdmin || currentUser.canCreateTask) && (
            <button 
              onClick={() => setActiveTab('add-task')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'add-task' ? 'bg-white shadow-sm text-brand-hover' : 'text-slate-500'}`}
            >
              Thêm task
            </button>
          )}
          {isUserAdmin && (
            <button 
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'permissions' ? 'bg-white shadow-sm text-brand-hover' : 'text-slate-500'}`}
            >
              Phân quyền
            </button>
          )}
          <button 
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'config' ? 'bg-white shadow-sm text-brand-hover' : 'text-slate-500'} ${!(isUserAdmin || currentUser.canManageSettings) ? 'hidden' : ''}`}
          >
            Cài đặt
          </button>
          {isUserAdmin && (
            <button 
              onClick={() => setActiveTab('trash')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'trash' ? 'bg-white shadow-sm text-brand-hover' : 'text-slate-500'}`}
            >
              Thùng rác ({tasks.filter(t => t.isDeleted).length})
            </button>
          )}
      </div>

      {/* Actions & Filters */}
      {(activeTab === 'list' || activeTab === 'trash') && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          {/* Full-width Search */}
          <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm công việc..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-brand/20" />
          </div>
          
          {/* Filters & Actions Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700">
                  <option value="All">Tất cả trạng thái</option>
                  <option value="In Progress">Đang thực hiện</option>
                  <option value="Paused">Tạm dừng</option>
                  <option value="Completed">Hoàn thành</option>
                  <option value="Cancelled">Đã hủy</option>
              </select>
              {(isUserAdmin || currentUser.canCreateTask) && (
                <button onClick={() => setActiveTab('add-task')} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-colors">
                  <Plus className="w-4 h-4" /> Tạo task mới
                </button>
              )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {activeTab === 'add-task' && (isUserAdmin || currentUser.canCreateTask) && (
          <TaskForm 
            isInline={true}
            onClose={() => setActiveTab('list')} 
            onCreated={() => { 
              setActiveTab('list'); 
              addNotification("Tạo task mới thành công", "success"); 
            }} 
            users={users} 
            settings={settings} 
            currentUser={currentUser} 
          />
        )}

        {activeTab === 'permissions' && isUserAdmin && (
          <ConfigSection 
            users={users}
            currentUser={currentUser}
            settings={settings}
            onRefreshSettings={onRefreshSettings}
            onUpdateUser={onUpdateUser}
            isUserAdmin={isUserAdmin}
            handleToggleTaskPermission={handleToggleTaskPermission}
            onlyPermissions={true}
          />
        )}

        {activeTab === 'config' && (isUserAdmin || currentUser.canManageSettings) && (
          <ConfigSection 
            users={users}
            currentUser={currentUser}
            settings={settings}
            onRefreshSettings={onRefreshSettings}
            onUpdateUser={onUpdateUser}
            isUserAdmin={isUserAdmin}
            handleToggleTaskPermission={handleToggleTaskPermission}
            onlyPermissions={false}
          />
        )}

        {(activeTab === 'list' || activeTab === 'trash') && sortedTasks.length > 0 && (isUserAdmin || currentUser?.canDeleteTask) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="select-all-tasks"
                checked={sortedTasks.length > 0 && sortedTasks.every(t => selectedTaskIds.includes(t.id))}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded text-brand border-slate-300 focus:ring-brand cursor-pointer accent-brand"
              />
              <label htmlFor="select-all-tasks" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                {sortedTasks.every(t => selectedTaskIds.includes(t.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </label>
              <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                Đã chọn: {sortedTasks.filter(t => selectedTaskIds.includes(t.id)).length} / {sortedTasks.length}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {selectedTaskIds.length > 0 && (
                <>
                  {activeTab === 'trash' && (
                    <button
                      onClick={handleRestoreSelected}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Khôi phục mục đã chọn
                    </button>
                  )}
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Xoá mục đã chọn
                  </button>
                </>
              )}
              <button
                onClick={handleDeleteAll}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                {activeTab === 'trash' ? 'Dọn sạch thùng rác' : 'Xoá tất cả'}
              </button>
            </div>
          </div>
        )}

        {(activeTab === 'list' || activeTab === 'trash') && sortedTasks.map((task, index) => {
                const deadline = new Date(task.deadline);
                const isOverdue = deadline < currentTime && task.status !== 'Completed' && task.status !== 'Cancelled';
                const isWarning = deadline.getTime() - currentTime.getTime() < 15 * 60 * 1000 && deadline > currentTime && task.status !== 'Completed' && task.status !== 'Cancelled';
                
                return (
                    <TaskRow 
                    key={task.id + '-' + index}
                    task={task}
                    users={users}
                    currentUser={currentUser}
                    progress={getProgress(task)}
                    onAction={handleAction}
                    onView={setViewingTask}
                    onEdit={setEditingTask}
                    isOverdue={isOverdue}
                    isWarning={isWarning}
                    isOpen={openMenuTaskId === task.id}
                    onToggleMenu={() => setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id)}
                    isSelected={selectedTaskIds.includes(task.id)}
                    onToggleSelect={(isUserAdmin || currentUser?.canDeleteTask) ? () => toggleSelectTask(task.id) : undefined}
                    />
                );
            })
        }
      </div>
      
      {/* Banner Settings Removed */}

      {showBannerSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-sm font-extrabold text-slate-800">Cài đặt Banner Module Quản Lý</h2>
            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Biểu tượng</label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(BANNER_ICONS).map(([iconName, IconComp]) => (
                    <button key={iconName} type="button" onClick={() => setBannerIcon(iconName)} title={iconName} className={bannerIcon === iconName ? "p-2 rounded-lg border border-emerald-600 bg-emerald-50 text-emerald-700 flex items-center justify-center" : "p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"}>
                      <IconComp className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tiêu đề</label>
                <input type="text" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Nhãn phụ (Badge)</label>
                <input type="text" value={bannerLabel} onChange={e => setBannerLabel(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Mô tả</label>
                <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" rows={2}></textarea>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase flex justify-between items-center">
                  <span>Ảnh bìa (Tùy chọn)</span>
                  {bannerImg && (
                    <button type="button" onClick={() => setBannerImg('')} className="text-rose-500 hover:text-rose-600 text-[10px] flex items-center gap-1">
                      <X className="w-3 h-3" /> Xóa ảnh (Dùng màu nền)
                    </button>
                  )}
                </label>
                <MediaSourcePicker onSelect={setBannerImg} accept="image/*" resourceType="image" folder="module-banners/tasks" category="Ảnh dự án & công việc" label="Chọn ảnh bìa" disabled={isUploading} />
                {bannerImg && <img src={bannerImg} alt="Preview" className="h-16 rounded-xl object-cover mt-2" />}
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowBannerSettings(false)} className="px-4 py-2 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-100">Hủy</button>
                <button type="submit" disabled={isUploading} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-bold shadow-sm">{isUploading ? 'Đang tải...' : 'Lưu cài đặt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdding && <TaskForm onClose={() => setIsAdding(false)} onCreated={() => { setIsAdding(false); addNotification("Tạo task mới thành công", "success"); }} users={users} settings={settings} currentUser={currentUser} />}
      {editingTask && <TaskForm onClose={() => setEditingTask(null)} onCreated={() => setEditingTask(null)} users={users} taskToEdit={editingTask} settings={settings} currentUser={currentUser} />}
      {viewingTask && <TaskDetailModal task={viewingTask} onClose={() => setViewingTask(null)} onUpdate={() => {}} currentUser={currentUser} users={users} />}
    </div>
  );
}
