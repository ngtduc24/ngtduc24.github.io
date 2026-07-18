import { uploadImageToCloudinary } from '../lib/upload';
import MediaSourcePicker from './MediaSourcePicker';
import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Users, 
  Trash2, 
  AlertTriangle, 
  Info, 
  Shield, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  UserCheck, 
  Activity,
  AlertCircle,
  Settings,
  Save,
  Loader2,
  Inbox,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';
import { 
  pushNotificationToSupabase, 
  deleteNotificationFromSupabase, 
  saveDefaultSettingsToSupabase,
  getNotificationsFromSupabase,
  subscribeToNotifications
} from '../lib/data';
import { AppSettings, UserAccount, AppNotification } from '../types';

interface AdminNotificationsProps {
  currentUser: UserAccount;
  users: UserAccount[];
  settings?: AppSettings;
  onRefreshSettings?: () => void;
  onBackToInbox?: () => void;
}

export default function AdminNotifications({ currentUser, users, settings, onRefreshSettings, onBackToInbox }: AdminNotificationsProps) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [sentNotifications, setSentNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Active form or settings panel tab: 'form' | 'settings'
  const [activeLeftTab, setActiveLeftTab] = useState<'form' | 'settings'>('form');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AppNotification['type']>('system');
  const [priority, setPriority] = useState<AppNotification['priority']>('normal');
  const [targetAudience, setTargetAudience] = useState<AppNotification['targetAudience']>('all_admins');
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Banner Settings State
  const [bannerTitle, setBannerTitle] = useState(settings?.notificationBannerTitle || 'Chức năng thông báo');
  const [bannerDesc, setBannerDesc] = useState(settings?.notificationBannerDescription || 'Thiết lập và phát thông báo hệ thống trực tiếp đến toàn bộ thành viên hoặc các quản trị viên chỉ định trong thời gian thực.');
  const [bannerText, setBannerText] = useState(settings?.notificationBannerText || 'Quản Trị Hệ Thống');
  const [bannerImg, setBannerImg] = useState(settings?.notificationBannerImage || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showBannerSettings, setShowBannerSettings] = useState(false);

  // Sync banner settings when settings prop updates
  useEffect(() => {
    if (settings) {
      setBannerTitle(settings.notificationBannerTitle || 'Chức năng thông báo');
      setBannerDesc(settings.notificationBannerDescription || 'Thiết lập và phát thông báo hệ thống trực tiếp đến toàn bộ thành viên hoặc các quản trị viên chỉ định trong thời gian thực.');
      setBannerText(settings.notificationBannerText || 'Quản Trị Hệ Thống');
      setBannerImg(settings.notificationBannerImage || '');
    }
  }, [settings]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Filter list of administrators
  const adminUsers = users.filter(u => u.role === 'admin');

  // Filtered users for specific member search selector
  const filteredSearchUsers = users.filter(u => {
    const query = userSearchQuery.toLowerCase();
    return u.fullName.toLowerCase().includes(query) || 
           u.username.toLowerCase().includes(query) ||
           u.role.toLowerCase().includes(query);
  });

  // Real-time listener for sent notifications
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = subscribeToNotifications((notifications) => {
      setSentNotifications(notifications);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      addNotification('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!', 'error');
      return;
    }

    if (targetAudience === 'custom_admins' && selectedAdminIds.length === 0) {
      addNotification('Vui lòng chọn ít nhất một quản trị viên nhận thông báo!', 'error');
      return;
    }

    if (targetAudience === 'custom_users' && selectedUserIds.length === 0) {
      addNotification('Vui lòng chọn ít nhất một thành viên nhận thông báo!', 'error');
      return;
    }

    try {
      setIsSending(true);
      await pushNotificationToSupabase({
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        targetAudience,
        targetUserIds: 
          targetAudience === 'custom_admins' 
            ? selectedAdminIds 
            : targetAudience === 'custom_users'
              ? selectedUserIds
              : undefined,
        senderId: currentUser.id,
        senderName: currentUser.fullName
      });

      addNotification('Gửi thông báo thành công!', 'success');
      
      // Reset form
      setTitle('');
      setDescription('');
      setType('system');
      setPriority('normal');
      setTargetAudience('all_admins');
      setSelectedAdminIds([]);
      setSelectedUserIds([]);
      setUserSearchQuery('');
    } catch (error) {
      addNotification('Gửi thông báo thất bại. Vui lòng thử lại!', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleAdminSelect = (adminId: string) => {
    setSelectedAdminIds(prev => 
      prev.includes(adminId) 
        ? prev.filter(id => id !== adminId) 
        : [...prev, adminId]
    );
  };

  const handleSelectAllAdmins = () => {
    if (selectedAdminIds.length === adminUsers.length) {
      setSelectedAdminIds([]);
    } else {
      setSelectedAdminIds(adminUsers.map(u => u.id));
    }
  };

  const handleToggleUserSelect = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === filteredSearchUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredSearchUsers.map(u => u.id));
    }
  };

  const handleDelete = async (id: string) => {
    confirm('Xác nhận thu hồi thông báo', 'Bạn có chắc chắn muốn thu hồi (xóa) thông báo này không? Người dùng sẽ không thể nhìn thấy thông báo này nữa.', async () => {
      try {
        await deleteNotificationFromSupabase(id);
        addNotification('Thu hồi thông báo thành công!', 'success');
      } catch (error) {
        addNotification('Không thể thu hồi thông báo!', 'error');
      }
    });
  };

  const handleSaveBannerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !bannerDesc.trim() || !bannerText.trim()) {
      addNotification('Vui lòng điền đầy đủ tiêu đề, mô tả và chữ hiển thị của banner!', 'error');
      return;
    }

    try {
      setIsSavingSettings(true);
      const updatedSettings = {
        ...settings,
        notificationBannerTitle: bannerTitle.trim(),
        notificationBannerDescription: bannerDesc.trim(),
        notificationBannerText: bannerText.trim(),
        notificationBannerImage: bannerImg
      } as AppSettings;

      await saveDefaultSettingsToSupabase(updatedSettings);
      addNotification('Lưu cài đặt banner thông báo thành công!', 'success');
      if (onRefreshSettings) {
        onRefreshSettings();
      }
    } catch (error) {
      addNotification('Không thể lưu cài đặt banner thông báo!', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filtered sent notifications list
  const filteredNotifications = sentNotifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.senderName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || n.type === filterType;
    const matchesPriority = filterPriority === 'all' || n.priority === filterPriority;
    return matchesSearch && matchesType && matchesPriority;
  });

  // Calculate statistics
  const totalSent = sentNotifications.length;
  const highPriorityCount = sentNotifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length;
  const allAudienceCount = sentNotifications.filter(n => n.targetAudience === 'all').length;
  const adminAudienceCount = sentNotifications.filter(n => n.targetAudience === 'all_admins' || n.targetAudience === 'custom_admins').length;

  return (
    <div id="admin-notifications-section" className="space-y-6 pb-12 animate-fadeIn text-left">
      {/* Header Banner */}
      <div 
        className="bg-brand text-white rounded-2xl p-6 shadow-xl border border-brand flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
        style={{ 
          ...(bannerImg ? { backgroundImage: `url(${bannerImg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
        }}
      >
        {bannerImg && <div className="absolute inset-0 bg-black/40" />}
        
        <div className="relative z-10 space-y-1.5 flex-1 text-left">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-white" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/80">{bannerText}</span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight font-display text-slate-50">{bannerTitle}</h1>
            </div>
          </div>
          <p className="text-xs text-white/90 max-w-2xl leading-relaxed">{bannerDesc}</p>
        </div>

        <button 
          onClick={() => setShowBannerSettings(true)} 
          className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
          title="Cài đặt Banner"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 self-stretch md:self-auto shrink-0 justify-end relative z-10">
          {onBackToInbox && (
            <button
              onClick={onBackToInbox}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10 shrink-0 cursor-pointer shadow-lg shadow-black/10"
            >
              <Inbox className="w-4 h-4" />
              <span>Hộp thư cá nhân</span>
            </button>
          )}
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shrink-0 hidden sm:block backdrop-blur-md">
            <Bell className="w-8 h-8 text-white animate-pulse" />
          </div>
        </div>
      </div>

      {showBannerSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-left animate-fadeIn text-slate-800">
            <h2 className="text-sm font-extrabold text-slate-800">Cài đặt Banner Module Thông báo</h2>
            <form onSubmit={handleSaveBannerSettings} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tiêu đề</label>
                <input type="text" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Nhãn phụ (Badge)</label>
                <input type="text" value={bannerText} onChange={e => setBannerText(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
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
                <MediaSourcePicker onSelect={setBannerImg} accept="image/*" resourceType="image" folder="module-banners/notifications" label="Chọn ảnh bìa" />
                {bannerImg && <img src={bannerImg} alt="Preview" className="h-16 rounded-xl object-cover mt-2" />}
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowBannerSettings(false)} className="px-4 py-2 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-100">Hủy</button>
                <button type="submit" disabled={isSavingSettings} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-bold shadow-sm">{isSavingSettings ? 'Đang lưu...' : 'Lưu cài đặt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Tổng thông báo đã phát</span>
            <div className="text-2xl font-black text-slate-800 tracking-tight leading-none">{totalSent}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Từ trước đến nay</span>
          </div>
          <div className="p-3.5 bg-brand-light rounded-2xl text-brand">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Thông báo khẩn cấp</span>
            <div className="text-2xl font-black text-rose-600 tracking-tight leading-none">{highPriorityCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Ưu tiên cao/Khẩn cấp</span>
          </div>
          <div className="p-3.5 bg-rose-50 rounded-2xl text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Gửi tất cả thành viên</span>
            <div className="text-2xl font-black text-emerald-600 tracking-tight leading-none">{allAudienceCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Thông báo công cộng</span>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Gửi nhóm Quản trị viên</span>
            <div className="text-2xl font-black text-brand tracking-tight leading-none">{adminAudienceCount}</div>
            <span className="text-[11px] text-slate-400 font-medium block">Thông báo nội bộ</span>
          </div>
          <div className="p-3.5 bg-brand-light rounded-2xl text-brand">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create Notification Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
            {/* Tab Selection */}
            <div className="flex border-b border-slate-100 pb-1.5 gap-4">
              <button
                type="button"
                onClick={() => setActiveLeftTab('form')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all relative cursor-pointer ${
                  activeLeftTab === 'form'
                    ? 'text-brand font-extrabold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Soạn thông báo</span>
                {activeLeftTab === 'form' && (
                  <motion.div layoutId="activeLeftTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setActiveLeftTab('settings')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all relative cursor-pointer ${
                  activeLeftTab === 'settings'
                    ? 'text-brand font-extrabold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Cài đặt riêng</span>
                {activeLeftTab === 'settings' && (
                  <motion.div layoutId="activeLeftTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
                )}
              </button>
            </div>

            {activeLeftTab === 'form' ? (
              <form onSubmit={handleSend} className="space-y-5">
                {/* Target Audience */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    Đối tượng nhận <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setTargetAudience('all_admins')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        targetAudience === 'all_admins'
                          ? 'border-brand bg-brand-light text-brand shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-brand shrink-0" />
                      <div>
                        <p className="font-bold">Tất cả Admin</p>
                        <p className="text-[10px] text-slate-400 font-medium">Toàn bộ tài khoản có vai trò Quản trị viên</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetAudience('custom_admins')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        targetAudience === 'custom_admins'
                          ? 'border-brand bg-brand-light text-brand shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-brand shrink-0" />
                      <div>
                        <p className="font-bold">Các Admin chỉ định</p>
                        <p className="text-[10px] text-slate-400 font-medium">Chỉ những tài khoản Admin được chọn cụ thể</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetAudience('custom_users')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        targetAudience === 'custom_users'
                          ? 'border-brand bg-brand-light text-brand shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                      }`}
                    >
                      <Users className="w-4 h-4 text-brand shrink-0" />
                      <div>
                        <p className="font-bold">Các thành viên chỉ định</p>
                        <p className="text-[10px] text-slate-400 font-medium">Chỉ những tài khoản thành viên/admin được chọn cụ thể</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetAudience('all')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        targetAudience === 'all'
                          ? 'border-brand bg-brand-light text-brand shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                      }`}
                    >
                      <Users className="w-4 h-4 text-brand shrink-0" />
                      <div>
                        <p className="font-bold">Tất cả thành viên</p>
                        <p className="text-[10px] text-slate-400 font-medium">Gửi tới mọi người dùng trong hệ thống</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Custom Admin Selector if "custom_admins" is selected */}
                <AnimatePresence>
                  {targetAudience === 'custom_admins' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2.5 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Chọn quản trị viên nhận ({selectedAdminIds.length})
                        </label>
                        <button
                          type="button"
                          onClick={isSending ? undefined : handleSelectAllAdmins}
                          className="text-[10px] font-bold text-brand hover:text-brand-hover transition-colors cursor-pointer"
                        >
                          {selectedAdminIds.length === adminUsers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                      </div>
                      <div className="border border-slate-150 rounded-2xl max-h-48 overflow-y-auto p-2 bg-slate-50/50 space-y-1">
                        {adminUsers.map(admin => (
                          <label
                            key={admin.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white border transition-all ${
                              selectedAdminIds.includes(admin.id)
                                ? 'border-brand/30 bg-white shadow-xs'
                                : 'border-transparent text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold text-xs shrink-0">
                                {admin.fullName?.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-slate-700 truncate">{admin.fullName}</p>
                                <p className="text-[10px] text-slate-400 truncate">@{admin.username}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedAdminIds.includes(admin.id)}
                              onChange={() => handleToggleAdminSelect(admin.id)}
                              className="w-4 h-4 rounded-sm text-brand focus:ring-brand border-slate-300"
                            />
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Custom User Selector if "custom_users" is selected */}
                <AnimatePresence>
                  {targetAudience === 'custom_users' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2.5 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Chọn thành viên nhận ({selectedUserIds.length})
                        </label>
                        <button
                          type="button"
                          onClick={isSending ? undefined : handleSelectAllUsers}
                          className="text-[10px] font-bold text-brand hover:text-brand-hover transition-colors cursor-pointer"
                        >
                          {selectedUserIds.length === filteredSearchUsers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả kết quả'}
                        </button>
                      </div>

                      {/* Search inside user selector */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Tìm theo tên, username, vai trò..."
                          className="w-full pl-9 pr-3 py-1.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand rounded-xl text-xs bg-white text-slate-700 font-medium"
                        />
                      </div>

                      <div className="border border-slate-150 rounded-2xl max-h-48 overflow-y-auto p-2 bg-slate-50/50 space-y-1">
                        {filteredSearchUsers.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-4 font-medium">Không tìm thấy thành viên nào</p>
                        ) : (
                          filteredSearchUsers.map(user => (
                            <label
                              key={user.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer hover:bg-white border transition-all ${
                                selectedUserIds.includes(user.id)
                                  ? 'border-brand/30 bg-white shadow-xs'
                                  : 'border-transparent text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold text-xs shrink-0">
                                  {user.fullName?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-slate-700 truncate">{user.fullName}</p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    @{user.username} • <span className="font-semibold text-brand">{user.role === 'admin' ? 'Admin' : 'Thành viên'}</span>
                                  </p>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedUserIds.includes(user.id)}
                                onChange={() => handleToggleUserSelect(user.id)}
                                className="w-4 h-4 rounded-sm text-brand focus:ring-brand border-slate-300"
                              />
                            </label>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                    Tiêu đề thông báo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Bảo trì hệ thống định kỳ..."
                    className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand rounded-xl text-xs bg-white text-slate-800 font-medium"
                  />
                </div>

                {/* Type & Priority in two columns */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                      Phân loại
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as AppNotification['type'])}
                      className="w-full px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand rounded-xl text-xs bg-white text-slate-700 font-bold"
                    >
                      <option value="system">Hệ thống</option>
                      <option value="warning">Cảnh báo</option>
                      <option value="task">Công việc</option>
                      <option value="journal">Báo khoa học</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                      Mức độ ưu tiên
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as AppNotification['priority'])}
                      className="w-full px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand rounded-xl text-xs bg-white text-slate-700 font-bold"
                    >
                      <option value="low">Thấp</option>
                      <option value="normal">Trung bình</option>
                      <option value="high">Cao (Khẩn cấp)</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                    Nội dung chi tiết <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập nội dung thông báo đầy đủ tại đây..."
                    rows={4}
                    className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand rounded-xl text-xs bg-white text-slate-800 font-medium"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSending ? 'Đang phát thông báo...' : 'Phát thông báo ngay'}</span>
                </button>
              
                {/* Banner Image */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                    <span>Ảnh bìa Banner (Tùy chọn)</span>
                    {bannerImg && (
                      <button type="button" onClick={() => setBannerImg('')} className="text-rose-500 hover:text-rose-600 text-[10px] flex items-center gap-1">
                        <X className="w-3 h-3" /> Xóa ảnh (Dùng màu nền)
                      </button>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <MediaSourcePicker onSelect={setBannerImg} accept="image/*" resourceType="image" folder="module-banners/notifications" label="Chọn ảnh bìa" />
                    {bannerImg && (
                      <button type="button" onClick={() => setBannerImg('')} className="px-3 py-1 bg-rose-50 text-rose-500 rounded-lg text-xs font-bold">Xóa</button>
                    )}
                  </div>
                  {bannerImg && <img src={bannerImg} alt="Preview" className="h-16 rounded-xl object-cover mt-2" />}
                </div>

              </form>
            ) : (
              <form onSubmit={handleSaveBannerSettings} className="space-y-5">
                <div className="space-y-1">
                  <div className="w-1.5 h-6 bg-brand rounded-full inline-block mr-2 align-middle" />
                  <span className="text-sm font-bold text-slate-800 tracking-tight align-middle">Cấu hình Banner thông báo</span>
                </div>
                
                {/* Badge text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                    Nhãn phụ Banner (Badge) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                    placeholder="Ví dụ: QUẢN TRỊ HỆ THỐNG"
                    className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand rounded-xl text-xs bg-white text-slate-800 font-medium"
                  />
                </div>

                {/* Banner Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                    Tiêu đề Banner <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    placeholder="Nhập tiêu đề hiển thị trên banner..."
                    className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand rounded-xl text-xs bg-white text-slate-800 font-medium"
                  />
                </div>

                {/* Banner Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                    Mô tả Banner <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={bannerDesc}
                    onChange={(e) => setBannerDesc(e.target.value)}
                    placeholder="Nhập mô tả hiển thị ngắn dưới tiêu đề..."
                    rows={4}
                    className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand rounded-xl text-xs bg-white text-slate-800 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu cài đặt...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Lưu cấu hình Banner</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Sent Notification History */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-brand rounded-full" />
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Lịch sử thông báo đã gửi</h2>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg">
                Tìm thấy {filteredNotifications.length} kết quả
              </span>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {/* Search */}
              <div className="relative sm:col-span-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm nội dung..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              {/* Filter Type */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
                >
                  <option value="all">Mọi loại hình</option>
                  <option value="system">Hệ thống</option>
                  <option value="warning">Cảnh báo</option>
                  <option value="task">Công việc</option>
                  <option value="journal">Báo khoa học</option>
                </select>
              </div>

              {/* Filter Priority */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
                >
                  <option value="all">Mọi độ ưu tiên</option>
                  <option value="low">Độ ưu tiên: Thấp</option>
                  <option value="normal">Độ ưu tiên: Vừa</option>
                  <option value="high">Độ ưu tiên: Cao</option>
                  <option value="urgent">Độ ưu tiên: Khẩn cấp</option>
                </select>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-medium">Đang tải lịch sử thông báo...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl space-y-2">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-400">Không tìm thấy thông báo nào phù hợp</p>
                <p className="text-[10px] text-slate-400/80 font-medium">Bạn có thể tạo và gửi thông báo mới ở cột bên trái.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-1">
                {filteredNotifications.map((notif) => {
                  // Badges configuration
                  let typeLabel = 'Hệ thống';
                  let typeClass = 'bg-blue-50 text-blue-600 border-blue-100';
                  if (notif.type === 'warning') {
                    typeLabel = 'Cảnh báo';
                    typeClass = 'bg-amber-50 text-amber-600 border-amber-100';
                  } else if (notif.type === 'task') {
                    typeLabel = 'Công việc';
                    typeClass = 'bg-rose-50 text-rose-600 border-rose-100';
                  } else if (notif.type === 'journal') {
                    typeLabel = 'Báo khoa học';
                    typeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                  }

                  let priorityLabel = 'Ưu tiên thấp';
                  let priorityClass = 'bg-slate-50 text-slate-500 border-slate-100';
                  if (notif.priority === 'normal') {
                    priorityLabel = 'Ưu tiên vừa';
                    priorityClass = 'bg-brand-light text-brand border-brand/10';
                  } else if (notif.priority === 'high' || notif.priority === 'urgent') {
                    priorityLabel = 'Khẩn cấp';
                    priorityClass = 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse';
                  }

                  let audienceLabel = 'Toàn bộ Admin';
                  if (notif.targetAudience === 'custom_admins') {
                    audienceLabel = `Admin chỉ định (${notif.targetUserIds?.length || 0})`;
                  } else if (notif.targetAudience === 'custom_users') {
                    audienceLabel = `Thành viên chỉ định (${notif.targetUserIds?.length || 0})`;
                  } else if (notif.targetAudience === 'all') {
                    audienceLabel = 'Tất cả thành viên';
                  }

                  return (
                    <div 
                      key={notif.id}
                      className="p-4 bg-slate-50/40 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xs transition-all duration-300 flex items-start gap-4"
                    >
                      {/* Icon type indicator */}
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        notif.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                        notif.type === 'task' ? 'bg-rose-50 text-rose-600' :
                        notif.type === 'journal' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <Bell className="w-5 h-5" />
                      </div>

                      {/* Content block */}
                      <div className="flex-1 space-y-1.5 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Badges */}
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${typeClass}`}>
                            {typeLabel}
                          </span>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${priorityClass}`}>
                            {priorityLabel}
                          </span>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 bg-brand-light text-brand border border-brand/10 rounded-full">
                            {audienceLabel}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-tight">
                          {notif.title}
                        </h3>
                        
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                          {notif.description}
                        </p>

                        {/* Footer context */}
                        <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400 font-semibold border-t border-slate-100/60 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(notif.timestamp).toLocaleString('vi-VN')}
                          </span>
                          <span>•</span>
                          <span>Người gửi: <strong className="text-slate-600">{notif.senderName}</strong></span>
                        </div>
                      </div>

                      {/* Recall / Delete button */}
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0 cursor-pointer"
                        title="Thu hồi thông báo này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
