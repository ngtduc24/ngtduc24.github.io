import React, { useState, useEffect } from 'react';
import { uploadImageToCloudinary } from '../lib/upload';
import MediaSourcePicker from './MediaSourcePicker';
import { 
  Calculator,
  Settings, 
  Users, 
  Layers, 
  BookOpen, 
  ArrowUpRight, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Search,
  X,
  Database,
  Microscope
} from 'lucide-react';
import { 
  getStatsFromSupabase, 
  getJournalsFromSupabase,
  saveDefaultSettingsToSupabase
} from '../lib/data';
import { useTasks } from './TaskContext';
import { Task, UserAccount, AppSettings, ScientificJournal } from '../types';
import TaskRow from './TaskRow';
import TaskDetailModal from './TaskDetailModal';
import TaskForm from './TaskForm';
import TaskCompletionModal from './TaskCompletionModal';
import { saveTaskToSupabase, deleteTaskFromSupabase, addTaskHistory, isTaskRelevantToUser } from '../lib/tasks';
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';
import OnlineUsersPresence from './OnlineUsersPresence';

interface DashboardProps {
  onSwitchTab: (tab: string) => void;
  settings?: AppSettings;
  users: UserAccount[];
  currentUser: UserAccount;
  onRefreshSettings?: () => Promise<void>;
}

export default function DashboardOverview({ onSwitchTab, settings, users, currentUser, onRefreshSettings }: DashboardProps) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const { tasks } = useTasks();
  const [showBannerSettings, setShowBannerSettings] = useState(false);
  const [showDatabaseSettings, setShowDatabaseSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [bannerTitle, setBannerTitle] = useState(settings?.dashboardBannerTitle || '');
  const [bannerDesc, setBannerDesc] = useState(settings?.systemDescription || '');
  const [bannerImg, setBannerImg] = useState(settings?.dashboardBannerImage || '');
  const [dbConfig, setDbConfig] = useState(() => {
    const savedUrl = localStorage.getItem('custom_supabase_url');
    const savedKey = localStorage.getItem('custom_supabase_key');
    return {
      url: savedUrl || import.meta.env.VITE_SUPABASE_URL || '',
      key: savedKey || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    };
  });

  const handleSaveDbConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('custom_supabase_url', dbConfig.url);
    localStorage.setItem('custom_supabase_key', dbConfig.key);
    setShowDatabaseSettings(false);
    addNotification("Đã lưu cấu hình Supabase. Vui lòng tải lại trang để áp dụng cài đặt mới.", "success");
    setTimeout(() => window.location.reload(), 1500);
  };

  useEffect(() => {
    if (settings) {
      setBannerTitle(settings.dashboardBannerTitle || '');
      setBannerDesc(settings.systemDescription || '');
      setBannerImg(settings.dashboardBannerImage || '');
    }
  }, [settings]);

  useEffect(() => {
    if (showBannerSettings && settings) {
      setBannerTitle(settings.dashboardBannerTitle || '');
      setBannerDesc(settings.systemDescription || '');
      setBannerImg(settings.dashboardBannerImage || '');
    }
  }, [showBannerSettings, settings]);
  
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await saveDefaultSettingsToSupabase({
        ...settings,
        dashboardBannerTitle: bannerTitle,
        systemDescription: bannerDesc,
        dashboardBannerImage: bannerImg
      });
      if (onRefreshSettings) await onRefreshSettings();
      setIsBannerVisible(true);
      setShowBannerSettings(false);
      addNotification("Đã lưu cài đặt Banner!", "success");
    } catch(err) {
      addNotification("Lỗi lưu cấu hình: " + (err as Error).message, "error");
    }
  };

  const handleResetBanner = async () => {
    if (!settings) return;
    try {
      await saveDefaultSettingsToSupabase({
        ...settings,
        dashboardBannerTitle: "Hệ Thống Tính Toán Cỡ Mẫu Toàn Diện",
        systemDescription: "Hỗ trợ đắc lực cho các nhà nghiên cứu khoa học, sinh viên làm luận văn tốt nghiệp, và nghiên cứu viên khảo sát cộng đồng.",
        dashboardBannerImage: ""
      });
      if (onRefreshSettings) await onRefreshSettings();
      setBannerTitle("Hệ Thống Tính Toán Cỡ Mẫu Toàn Diện");
      setBannerDesc("Hỗ trợ đắc lực cho các nhà nghiên cứu khoa học, sinh viên làm luận văn tốt nghiệp, và nghiên cứu viên khảo sát cộng đồng.");
      setBannerImg("");
      setIsBannerVisible(true);
      setShowBannerSettings(false);
      addNotification("Đã khôi phục banner về mặc định và tự động bật lại!", "success");
    } catch(err) {
      addNotification("Lỗi làm mới: " + (err as Error).message, "error");
    }
  };
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(() => {
    const stored = localStorage.getItem('isBannerVisible');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [statsData, setStatsData] = useState<Record<string, number>>({
    calculator: 1420,
    journals: 845,
    public_search: 2578,
  });
  const [journals, setJournals] = useState<ScientificJournal[]>([]);
  const [journalsCount, setJournalsCount] = useState<number>(4);
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardSearch, setDashboardSearch] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('isBannerVisible', JSON.stringify(isBannerVisible));
  }, [isBannerVisible]);
  
  const filteredDashboardJournals = journals.filter(j => 
    j.name.toLowerCase().includes(dashboardSearch.toLowerCase()) || 
    (j.issn || "").toLowerCase().includes(dashboardSearch.toLowerCase()) || 
    (j.field || "").toLowerCase().includes(dashboardSearch.toLowerCase())
  );

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const stats = await getStatsFromSupabase();
        setStatsData(stats);
        
        const journalList = await getJournalsFromSupabase();
        setJournals(journalList);
        setJournalsCount(journalList.length);
      } catch (err) {
        console.error("Lỗi tải thông tin dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const disciplinesCount = new Set(journals.map(j => j.field?.trim()).filter(Boolean)).size || 12;

  const getProgress = (task: Task) => {
    if (task.status === 'Completed') return 100;
    if (task.status === 'Cancelled') return 0;
    if (task.status === 'Paused') return task.progress;
    
    const start = new Date(task.createdAt).getTime();
    const end = new Date(task.deadline).getTime();
    const now = currentTime.getTime();
    
    if (now >= end) return 100;
    if (now <= start) return 0;
    
    // Dynamic progress + existing progress
    const autoProgress = ((now - start) / (end - start)) * 100;
    return Math.min(100, Math.max(task.progress, autoProgress));
  }

  const handleAction = async (task: Task, action: 'pause' | 'run' | 'complete' | 'delete' | 'cancel') => {
    if (!currentUser) return;
    const isUserAdmin = currentUser?.role === 'admin';
    const isAssigned = task.assignedTo === currentUser.id || (task.assignedTo && task.assignedTo === currentUser.username);
    const isCreator = task.creatorId === currentUser.id || 
                      task.createdBy === currentUser.id || 
                      task.createdBy === currentUser.username ||
                      (currentUser.fullName && task.createdByName === currentUser.fullName);

    const isSelfTask = isCreator && !task.assignedTo;

    if (!isUserAdmin && !isAssigned && !isCreator) {
        addNotification("Bạn không có quyền thực hiện thao tác này trên công việc không thuộc về bạn.", "error");
        return;
    }
    if (task.status === 'Completed' && action !== 'delete') {
        addNotification("Công việc đã hoàn thành nên không thể thao tác thêm.", "error");
        return;
    }
    if ((action === 'complete' || action === 'run' || action === 'pause') && !isUserAdmin && !isAssigned && !isSelfTask) {
        addNotification("Chỉ người nhận việc mới thực hiện được thao tác này.", "error");
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
          // Extend deadline
          const deadline = new Date(updatedTask.deadline);
          deadline.setMilliseconds(deadline.getMilliseconds() + pauseTime);
          updatedTask.deadline = deadline.toISOString();
        }
        updatedTask.status = 'In Progress';
        delete updatedTask.lastPausedAt;
        updatedTask = addTaskHistory(updatedTask, 'Bắt đầu/Tiếp tục công việc', currentUser.id, currentUser.fullName);
        break;
      case 'complete':
        // Hoàn thành luôn phải đi kèm báo cáo nghiệm thu, giống trang Quản lý công việc.
        setTaskToComplete(task);
        return;
      case 'cancel':
        updatedTask.status = 'Cancelled';
        updatedTask = addTaskHistory(updatedTask, 'Hủy bỏ công việc', currentUser.id, currentUser.fullName);
        break;
      case 'delete':
        confirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xoá công việc này không?', async () => {
          const deletedTask = addTaskHistory({ ...updatedTask, isDeleted: true }, 'Chuyển vào thùng rác', currentUser.id, currentUser.fullName);
          try {
            await saveTaskToSupabase(deletedTask);
            addNotification("Đã xóa công việc", "success");
          } catch (err: any) {
            addNotification(err?.message || "Không xóa được công việc trên máy chủ.", "error");
          }
        });
        return;
    }
    try {
      await saveTaskToSupabase(updatedTask);
    } catch (err: any) {
      addNotification(err?.message || "Không lưu được thay đổi lên máy chủ.", "error");
    }
  };

  const isUserAdmin = currentUser?.role === 'admin';
  const userPermissions = currentUser?.permissions || [];

  // Kiểm tra quyền theo phân quyền của người dùng:
  const canAccessCalculator = isUserAdmin || userPermissions.includes('calculator');
  const canAccessJournals = isUserAdmin || userPermissions.includes('scientific_journals');
  const canAccessTasks = isUserAdmin || userPermissions.includes('tasks');

  // Lọc task theo quyền sở hữu:
  // - Admin: Xem toàn bộ task trong hệ thống
  // - User thường: Chỉ xem các task được giao, task nhận, hoặc task do chính user tạo
  const visibleTasks = tasks.filter(t => !t.isDeleted && isTaskRelevantToUser(t, currentUser));

  // Số lượng task hoàn thành: Admin đếm toàn hệ thống, User đếm trong phạm vi công việc của mình
  const completedTasksCount = (isUserAdmin ? tasks.filter(t => !t.isDeleted) : visibleTasks)
    .filter(t => t.status === 'Completed').length;

  const recentTasks = visibleTasks
    .filter(t => t.status !== 'Completed' && t.status !== 'Cancelled')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  // Stat data - Lọc động theo quyền của người dùng:
  // - Chỉ hiện 'Lượt tính mẫu' nếu user có quyền calculator
  // - Chỉ hiện 'Tạp chí lưu trữ', 'Ngành/Lĩnh vực', 'Tra cứu điểm báo' nếu user có quyền scientific_journals
  // - Chỉ hiện 'Task hoàn thành' nếu user có quyền tasks
  const stats = [
    ...(canAccessCalculator ? [{ 
      label: 'Lượt tính mẫu', 
      value: `${statsData.calculator} lượt`, 
      change: 'Thời gian thực', 
      icon: Calculator, 
      color: 'from-brand to-brand-hover', 
      shadow: 'shadow-brand/15' 
    }] : []),
    ...(canAccessJournals ? [
      { label: 'Tạp chí lưu trữ', value: `${journalsCount} tạp chí`, change: 'Dữ liệu chuẩn', icon: Layers, color: 'from-brand to-brand', shadow: 'shadow-brand/15' },
      { label: 'Ngành/Lĩnh vực', value: `${disciplinesCount} lĩnh vực`, change: 'Đa dạng hoá', icon: Microscope, color: 'from-brand to-brand', shadow: 'shadow-brand/15' },
      { label: 'Tra cứu điểm báo', value: `${statsData.public_search} lượt`, change: 'Cổng công cộng', icon: BookOpen, color: 'from-brand to-brand', shadow: 'shadow-brand/15' }
    ] : []),
    ...(canAccessTasks ? [{ 
      label: 'Task hoàn thành', 
      value: `${completedTasksCount} lượt`, 
      change: 'Hệ thống an toàn', 
      icon: CheckCircle2, 
      color: 'from-amber-500 to-orange-500', 
      shadow: 'shadow-amber-500/15' 
    }] : []),
  ];

  const getStatsGridClass = (count: number) => {
    if (count >= 5) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
    if (count === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-3';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    return 'grid-cols-1';
  };

  const quickCalculations = [
    { title: 'Phân tích SPSS (EFA & Hồi quy)', subtitle: 'Hoàng Trọng & Hair', link: 'calculator', badge: 'SPSS', count: '489 lượt' },
    { title: 'Taro Yamane', subtitle: 'Biết trước tổng thể dân số (N)', link: 'calculator', badge: 'Yamane', count: '512 lượt' },
    { title: 'Cochran', subtitle: 'Tổng thể dân số chưa xác định', link: 'calculator', badge: 'Cochran', count: '419 lượt' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      {isBannerVisible && (
        <div 
          className="bg-brand text-white rounded-2xl p-6 shadow-xl border border-brand flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
          style={{ 
            ...(settings?.dashboardBannerImage ? { backgroundImage: `url(${settings.dashboardBannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
          }}
        >
          {settings?.dashboardBannerImage && <div className="absolute inset-0 bg-black/40" />}
          
          <button
            onClick={() => setIsBannerVisible(false)}
            className={`absolute top-4 ${currentUser?.role === 'admin' ? 'right-14' : 'right-4'} p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer z-20`}
            title="Ẩn banner"
          >
            <X className="w-4 h-4" />
          </button>

          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => setShowBannerSettings(true)} 
              className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
              title="Cài đặt Banner"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
          <div className="relative z-10 space-y-1.5 flex-1 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-white" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/80">Chào mừng quay trở lại, {currentUser?.fullName}</span>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight font-display text-slate-50">{settings?.dashboardBannerTitle || "Hệ Thống Quản Lý Toàn Diện"}</h1>
              </div>
            </div>
            <p className="text-xs text-white/90 max-w-2xl leading-relaxed">{settings?.systemDescription || "Hệ thống hỗ trợ nghiên cứu khoa học, điều hành công việc và quản lý dữ liệu toàn diện."}</p>
          </div>
        </div>
      )}

      {/* Grid statistics - Tự động thích ứng theo số lượng quyền hạn */}
      {stats.length > 0 && (
        <div className={`grid ${getStatsGridClass(stats.length)} gap-4`}>
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div 
                key={i} 
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg ${stat.shadow}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-slate-800 font-display leading-none">{stat.value}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs">
                    <span className="text-brand font-bold">{stat.change}</span>
                    <span className="text-slate-400">tăng trưởng</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Danh sách thành viên đang trực tuyến - Dành riêng cho Quản trị viên (Admin) qua Supabase Realtime */}
      {isUserAdmin && (
        <OnlineUsersPresence currentUser={currentUser} />
      )}

      {/* Active Tasks - Chỉ hiển thị cho người dùng có quyền tasks */}
      {canAccessTasks && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-lg">Công việc cần thực hiện</h3>
            {isUserAdmin ? (
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-lg">
                Toàn hệ thống ({recentTasks.length})
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 bg-brand/10 text-brand rounded-lg">
                Của tôi ({recentTasks.length})
              </span>
            )}
          </div>
          {recentTasks.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">Hiện tại không có công việc nào cần thực hiện.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTasks.map((task, index) => {
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
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Action and guides - Chỉ hiển thị khi có ít nhất 1 trong 2 quyền */}
      {(canAccessJournals || canAccessCalculator) && (
        <div className={`grid gap-6 ${canAccessJournals && canAccessCalculator ? 'grid-cols-1 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          
          {/* Quick Search Card - Chỉ hiển thị khi có quyền scientific_journals */}
          {canAccessJournals && (
            <div className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between ${canAccessCalculator ? 'lg:col-span-2 xl:col-span-3' : 'col-span-1'}`}>
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 font-display text-base">Tìm kiếm nhanh bài báo khoa học</h3>
                    <p className="text-xs text-slate-400">Tra cứu nhanh điểm số tạp chí từ hệ thống cơ sở dữ liệu quốc gia</p>
                  </div>
                </div>

                {/* Search Input Box */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Nhập tên tạp chí, mã ISSN, lĩnh vực cần tìm..."
                    value={dashboardSearch}
                    onChange={(e) => setDashboardSearch(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none transition-all"
                  />
                </div>

                {/* Results */}
                <div className="space-y-2.5">
                  {dashboardSearch.trim() === "" ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nhập từ khóa phía trên để bắt đầu hiển thị danh sách tạp chí đề xuất nhanh.
                    </div>
                  ) : filteredDashboardJournals.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Không tìm thấy kết quả phù hợp.
                    </div>
                  ) : (
                    filteredDashboardJournals.slice(0, 3).map((j, idx) => (
                      <div 
                        key={j.id}
                        className="p-3 bg-slate-50 hover:bg-brand/10 border border-slate-150 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <h4 className="font-bold text-slate-800 line-clamp-1">{j.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">ISSN: {j.issn || "—"} • {j.field || "N/A"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold bg-brand-light text-brand px-2 py-0.5 rounded border border-brand-light/40">
                            Điểm: {j.score || "0"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* View all journals / navigate */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => onSwitchTab('scientific_journals')}
                  className="text-xs font-bold text-brand hover:text-brand-hover hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Truy cập Cổng Tra Cứu Tạp Chí Đầy Đủ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Shortcuts Panel - Chỉ hiển thị khi có quyền calculator */}
          {canAccessCalculator && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between col-span-1">
              <div>
                <h3 className="font-bold text-slate-800 font-display text-base border-b border-slate-100 pb-4 mb-4">
                  Phím tắt tính cỡ mẫu nhanh
                </h3>
                <div className="space-y-3">
                  {quickCalculations.map((calc, i) => (
                    <div 
                      key={i}
                      onClick={() => onSwitchTab(calc.link)}
                      className="p-3 bg-slate-50 hover:bg-brand-light/30 rounded-xl cursor-pointer flex items-center justify-between group transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-brand-light text-brand flex items-center justify-center font-bold text-xs shrink-0">
                          {i+1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-700 text-xs truncate group-hover:text-brand transition-colors">{calc.title}</h4>
                          <p className="text-[10px] text-slate-400 truncate">{calc.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded shrink-0">
                        {calc.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => onSwitchTab('calculator')}
                className="w-full mt-4 py-2.5 rounded-xl border border-brand/20 hover:bg-brand-light/50 text-brand font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-brand-light/30"
              >
                <span>Mở Trình Tính Toán Chi Tiết</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>
      )}

      {editingTask && <TaskForm onClose={() => setEditingTask(null)} onCreated={() => setEditingTask(null)} users={users} taskToEdit={editingTask} settings={settings!} currentUser={currentUser} />}
      {viewingTask && <TaskDetailModal task={viewingTask} onClose={() => setViewingTask(null)} onUpdate={() => {}} currentUser={currentUser} users={users} />}

      {taskToComplete && currentUser && (
        <TaskCompletionModal
          title={taskToComplete.name}
          itemType="task"
          initialReport={taskToComplete.completionReport}
          currentUser={currentUser}
          onClose={() => setTaskToComplete(null)}
          onSubmit={async (report) => {
            let updatedTask: Task = {
              ...taskToComplete,
              status: 'Completed',
              progress: 100,
              completionReport: report,
            };
            updatedTask = addTaskHistory(
              updatedTask,
              'Hoàn thành công việc & Báo cáo kết quả',
              currentUser.id,
              currentUser.fullName,
              'Đã nộp báo cáo hoàn thành công việc.'
            );
            try {
              await saveTaskToSupabase(updatedTask);
            } catch (err: any) {
              addNotification(err?.message || "Không lưu được báo cáo lên máy chủ. Công việc chưa được ghi nhận hoàn thành.", "error");
              return;
            }
            setTaskToComplete(null);
            addNotification("Đã ghi nhận báo cáo và hoàn thành công việc!", "success");
          }}
        />
      )}

      {showBannerSettings && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBannerSettings(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-7 space-y-6 text-left text-slate-800 animate-fadeIn relative">
            <button onClick={() => setShowBannerSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
            
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cài đặt Banner Tổng Quan</h2>
              <p className="text-xs text-slate-500 mt-1">Tùy chỉnh tiêu đề, mô tả và hình ảnh hiển thị tại trang chủ.</p>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiêu đề Banner</label>
                <input 
                  type="text" 
                  value={bannerTitle} 
                  onChange={e => setBannerTitle(e.target.value)} 
                  placeholder="Ví dụ: Hệ Thống Tính Toán Cỡ Mẫu Toàn Diện"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all" 
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mô tả hệ thống</label>
                <textarea 
                  value={bannerDesc} 
                  onChange={e => setBannerDesc(e.target.value)} 
                  placeholder="Mô tả ngắn gọn về mục đích của hệ thống..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all resize-none" 
                  rows={3}
                ></textarea>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ảnh bìa (Tùy chọn)</label>
                  {bannerImg && (
                    <button type="button" onClick={() => setBannerImg('')} className="text-rose-500 hover:text-rose-600 text-[10px] font-bold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg">
                      <X className="w-3 h-3" /> Xóa ảnh & dùng màu nền
                    </button>
                  )}
                </div>
                
                {bannerImg && <img src={bannerImg} alt="Preview" className="h-28 w-full rounded-2xl object-cover" />}
                <MediaSourcePicker onSelect={setBannerImg} accept="image/*" resourceType="image" folder="module-banners/dashboard" label={bannerImg ? 'Thay đổi ảnh' : 'Chọn ảnh bìa'} disabled={isUploading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-xs font-bold text-white hover:bg-brand-hover" />
              </div>

              <div className="flex gap-3 justify-between pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={handleResetBanner}
                  className="px-4 py-2.5 text-rose-600 border border-rose-200 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Làm mới mặc định
                </button>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowBannerSettings(false)} 
                    className="px-5 py-2.5 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUploading} 
                    className="px-8 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-extrabold shadow-lg shadow-brand/20 transition-all disabled:opacity-50"
                  >
                    {isUploading ? 'Đang xử lý...' : 'Lưu cài đặt'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDatabaseSettings && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDatabaseSettings(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-left text-slate-800 animate-fadeIn">
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><Database className="w-4 h-4"/> Cài đặt Cơ sở dữ liệu Supabase</h2>
            <form onSubmit={handleSaveDbConfig} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Project URL (https://xyz.supabase.co)</label>
                <input type="text" value={dbConfig.url} onChange={e => setDbConfig({...dbConfig, url: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Anon Key</label>
                <input type="text" value={dbConfig.key} onChange={e => setDbConfig({...dbConfig, key: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowDatabaseSettings(false)} className="px-4 py-2 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-100">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-bold shadow-sm">Lưu và tải lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
