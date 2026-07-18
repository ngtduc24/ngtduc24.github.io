import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Lock, 
  Eye, 
  EyeOff,
  UserCheck,
  Settings,
  Info,
  Edit3
} from 'lucide-react';

import { AppSettings, UserAccount } from '../types';
import { saveDefaultSettingsToSupabase } from '../lib/data';
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';
import { auth } from '../lib/firebase';
import { deleteUser as deleteAuthUser } from 'firebase/auth';
import { uploadImageToCloudinary } from '../lib/upload';
import MediaSourcePicker from './MediaSourcePicker';
import { Image as ImageIcon } from 'lucide-react';

const ADMIN_PERMISSIONS = ['dashboard', 'calculator', 'scientific_journals', 'tasks', 'qualitative_analysis', 'quantitative_analysis', 'ar_module', 'media_library', 'portfolio_cms', 'settings', 'notifications', 'users'];
const MEMBER_PERMISSIONS = ['portfolio_courses'];

interface UserManagementProps {
  settings?: AppSettings;
  onRefreshSettings?: () => Promise<void>;
  currentUser: UserAccount;
  users: UserAccount[];
  onSaveUser: (user: UserAccount) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export default function UserManagement({ currentUser, users, onSaveUser, onDeleteUser, settings, onRefreshSettings }: UserManagementProps) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [showBannerSettings, setShowBannerSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [bannerTitle, setBannerTitle] = useState(settings?.userBannerTitle || '');
  const [bannerDesc, setBannerDesc] = useState(settings?.userBannerDescription || '');
  const [bannerLabel, setBannerLabel] = useState(settings?.userBannerLabel || '');
  const [bannerImg, setBannerImg] = useState(settings?.userBannerImage || '');

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await saveDefaultSettingsToSupabase({
        ...settings,
        userBannerTitle: bannerTitle,
        userBannerDescription: bannerDesc,
        userBannerLabel: bannerLabel,
        userBannerImage: bannerImg
      });
      if (onRefreshSettings) await onRefreshSettings();
      setShowBannerSettings(false);
      addNotification("Đã lưu cài đặt Banner!", "success");
    } catch(err) {
      addNotification("Lỗi lưu cài đặt!", "error");
    }
  };
  const [isAdding, setIsAdding] = useState(false);
  
  // New User Form States
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserAccount['role']>('user');
  const [newPermissions, setNewPermissions] = useState<string[]>(['dashboard', 'calculator']);
  const [formError, setFormError] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit User States
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserAccount['role']>('user');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editCanManageSettings, setEditCanManageSettings] = useState(false);

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editFullName.trim() || !editEmail.trim()) {
      addNotification('Vui lòng điền đầy đủ Họ và Tên, Email.', "error");
      return;
    }

    const updatedUser: UserAccount = {
      ...editingUser,
      fullName: editFullName.trim(),
      email: editEmail.trim(),
      role: editRole,
      permissions: editRole === 'admin'
        ? ADMIN_PERMISSIONS
        : editRole === 'member' ? MEMBER_PERMISSIONS : editPermissions,
      canAssignTask: editRole === 'admin' ? true : (editingUser.canAssignTask || false),
      canReceiveTask: editRole === 'admin' ? true : (editingUser.canReceiveTask || false),
      canRunPauseTask: editRole === 'admin' ? true : (editingUser.canRunPauseTask || false),
      canCompleteTask: editRole === 'admin' ? true : (editingUser.canCompleteTask || false),
      canDeleteTask: editRole === 'admin' ? true : (editingUser.canDeleteTask || false),
      canCreateTask: editRole === 'admin' ? true : (editingUser.canCreateTask || false),
      canManageSettings: editRole === 'admin' ? true : editCanManageSettings,
      canCreateJournal: editRole === 'admin' ? true : (editingUser.canCreateJournal || false),
      canEditJournal: editRole === 'admin' ? true : (editingUser.canEditJournal || false),
      canDeleteJournal: editRole === 'admin' ? true : (editingUser.canDeleteJournal || false),
      canImportJournal: editRole === 'admin' ? true : (editingUser.canImportJournal || false),
      canManageJournalCats: editRole === 'admin' ? true : (editingUser.canManageJournalCats || false),
      canManageJournalSettings: editRole === 'admin' ? true : (editingUser.canManageJournalSettings || false),
      canCreateQualitative: editRole === 'admin' ? true : (editingUser.canCreateQualitative || false),
      canEditQualitative: editRole === 'admin' ? true : (editingUser.canEditQualitative || false),
      canDeleteQualitative: editRole === 'admin' ? true : (editingUser.canDeleteQualitative || false),
      canImportQualitative: editRole === 'admin' ? true : (editingUser.canImportQualitative || false),
      canExportQualitative: editRole === 'admin' ? true : (editingUser.canExportQualitative || false),
      canManageQualitativeSettings: editRole === 'admin' ? true : (editingUser.canManageQualitativeSettings || false),
      canCreateQuantitative: editRole === 'admin' ? true : (editingUser.canCreateQuantitative || false),
      canEditQuantitative: editRole === 'admin' ? true : (editingUser.canEditQuantitative || false),
      canDeleteQuantitative: editRole === 'admin' ? true : (editingUser.canDeleteQuantitative || false),
      canImportQuantitative: editRole === 'admin' ? true : (editingUser.canImportQuantitative || false),
      canExportQuantitative: editRole === 'admin' ? true : (editingUser.canExportQuantitative || false),
      canManageQuantitativeSettings: editRole === 'admin' ? true : (editingUser.canManageQuantitativeSettings || false),
    };

    if (editRole === 'member') {
      Object.assign(updatedUser, {
        canAssignTask: false,
        canReceiveTask: false,
        canRunPauseTask: false,
        canCompleteTask: false,
        canDeleteTask: false,
        canCreateTask: false,
        canManageSettings: false,
        canCreateJournal: false,
        canEditJournal: false,
        canDeleteJournal: false,
        canImportJournal: false,
        canManageJournalCats: false,
        canManageJournalSettings: false,
        canCreateQualitative: false,
        canEditQualitative: false,
        canDeleteQualitative: false,
        canImportQualitative: false,
        canExportQualitative: false,
        canManageQualitativeSettings: false,
        canCreateQuantitative: false,
        canEditQuantitative: false,
        canDeleteQuantitative: false,
        canImportQuantitative: false,
        canExportQuantitative: false,
        canManageQuantitativeSettings: false
      });
    }

    // Password is managed securely by Firebase Auth, we don't save it to Firestore.

    try {
      await onSaveUser(updatedUser);
      setEditingUser(null);
    } catch (err) {
      addNotification('Lỗi khi cập nhật tài khoản.', "error");
    }
  };

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Available feature permissions that can be toggled by Admin
  const availablePermissions = [
    { id: 'dashboard', label: 'Tổng quan Dashboard' },
    { id: 'calculator', label: 'Tính Cỡ Mẫu Nghiên Cứu' },
    { id: 'scientific_journals', label: 'Quản lý điểm báo khoa học' },
    { id: 'tasks', label: 'Dự án & Công việc' },
    { id: 'qualitative_analysis', label: 'Phân tích định tính' },
    { id: 'quantitative_analysis', label: 'Phân tích định lượng' },
    { id: 'ar_module', label: 'Tạo AR' },
    { id: 'media_library', label: 'Thư viện' },
    { id: 'portfolio_cms', label: 'Quản trị Portfolio' },
    { id: 'settings', label: 'Cấu hình hệ thống' },
    { id: 'notifications', label: 'Thông báo' },
  ];

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newUsername.trim() || !newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (newPassword.trim().length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    // Check if username or email already exists
    const exists = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase().trim() || u.email.toLowerCase() === newEmail.toLowerCase().trim());
    if (exists) {
      setFormError('Tên đăng nhập hoặc email đã tồn tại trong hệ thống.');
      return;
    }

    const normalizedEmail = newEmail.trim().toLowerCase();
    let newUserIdToken = '';
    setIsCreatingUser(true);

    try {
      // 1. Create the user in Firebase Auth first using REST API to prevent state conflicts
      let authUserId = '';
      try {
        const apiKey = auth.app.options.apiKey || import.meta.env.VITE_FIREBASE_API_KEY;
        if (!apiKey) throw new Error("Thiếu API Key để tạo user");

        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password: newPassword, returnSecureToken: true })
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw data.error;
        }
        
        authUserId = data.localId;
        newUserIdToken = data.idToken;
      } catch (authErr: any) {
        console.error("Lỗi đăng ký Firebase Auth:", authErr);
        const code = authErr.message || authErr.code;
        if (code?.includes('EMAIL_EXISTS')) {
          setFormError('Email đã được đăng ký sử dụng bởi một tài khoản khác trong hệ thống.');
        } else if (code?.includes('INVALID_EMAIL')) {
          setFormError('Định dạng email không hợp lệ.');
        } else if (code?.includes('WEAK_PASSWORD')) {
          setFormError('Mật khẩu quá yếu. Vui lòng nhập ít nhất 6 ký tự.');
        } else if (code?.includes('OPERATION_NOT_ALLOWED')) {
          setFormError(`Firebase project chưa bật đăng nhập Email/Password.`);
        } else if (code?.includes('auth/network-request-failed')) {
          setFormError('Không thể kết nối Firebase Authentication. Vui lòng kiểm tra mạng rồi thử lại.');
        } else {
          setFormError('Không thể tạo tài khoản trên Firebase Authentication. Vui lòng kiểm tra cấu hình xác thực.');
        }
        return;
      }

      if (!authUserId) {
        throw new Error('Đăng ký tài khoản thành công nhưng không lấy được ID. Vui lòng kiểm tra lại cấu hình.');
      }

      // 2. Create the metadata record in users table WITHOUT the password field
      const newUser: UserAccount = {
        id: authUserId, // Store the UUID
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        email: normalizedEmail,
        role: newRole,
        permissions: newRole === 'admin' ? ADMIN_PERMISSIONS : newRole === 'member' ? MEMBER_PERMISSIONS : newPermissions,
        canAssignTask: newRole === 'admin',
        canReceiveTask: newRole === 'admin',
        canRunPauseTask: newRole === 'admin',
        canCompleteTask: newRole === 'admin',
        canDeleteTask: newRole === 'admin',
        canCreateTask: newRole === 'admin',
        canManageSettings: newRole === 'admin',
        canCreateJournal: newRole === 'admin',
        canEditJournal: newRole === 'admin',
        canDeleteJournal: newRole === 'admin',
        canImportJournal: newRole === 'admin',
        canManageJournalCats: newRole === 'admin',
        canManageJournalSettings: newRole === 'admin',
        canCreateQualitative: newRole === 'admin',
        canEditQualitative: newRole === 'admin',
        canDeleteQualitative: newRole === 'admin',
        canImportQualitative: newRole === 'admin',
        canExportQualitative: newRole === 'admin',
        canManageQualitativeSettings: newRole === 'admin',
        canCreateQuantitative: newRole === 'admin',
        canEditQuantitative: newRole === 'admin',
        canDeleteQuantitative: newRole === 'admin',
        canImportQuantitative: newRole === 'admin',
        canExportQuantitative: newRole === 'admin',
        canManageQuantitativeSettings: newRole === 'admin',
        createdAt: new Date().toLocaleDateString('vi-VN'),
      };

      await onSaveUser(newUser);

      // Reset Form
      setNewUsername('');
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setNewPermissions(['dashboard', 'calculator']);
      setIsAdding(false);
      addNotification('Đã tạo tài khoản người dùng thành công và thiết lập bảo mật qua Firebase Auth.', 'success');
    } catch (err: any) {
      if (newUserIdToken) {
        try {
          const apiKey = auth.app.options.apiKey || import.meta.env.VITE_FIREBASE_API_KEY;
          await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: newUserIdToken })
          });
        } catch (rollbackError) {
          console.error('Không thể thu hồi tài khoản Auth sau khi lưu hồ sơ thất bại:', rollbackError);
        }
      }
      setFormError(err.message || 'Lỗi kết nối cơ sở dữ liệu: Không thể lưu tài khoản.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        addNotification('Cảnh báo bảo mật: Không thể xoá tài khoản Admin này. Hệ thống yêu cầu phải có ít nhất một tài khoản Admin tồn tại để quản trị.', "error");
        return;
      }
    }

    if (userId === currentUser.id) {
      addNotification('Bạn không thể tự xoá tài khoản của chính mình khi đang đăng nhập.', "error");
      return;
    }

    confirm('Xác nhận xóa tài khoản', `Bạn có chắc chắn muốn xoá tài khoản "${userToDelete.username}" không?`, async () => {
      try {
        await onDeleteUser(userId);
      } catch (err) {
        addNotification('Lỗi kết nối Firebase: Không thể xoá tài khoản.', "error");
      }
    });
  };

  const handleTogglePermission = async (user: UserAccount, permId: string) => {
    // If the target user is Admin, they always have all permissions
    if (user.role === 'admin' || user.role === 'member') return;

    let updatedPerms = [...user.permissions];
    if (updatedPerms.includes(permId)) {
      // Must keep at least dashboard or some permission
      updatedPerms = updatedPerms.filter(p => p !== permId);
    } else {
      updatedPerms.push(permId);
    }

    const updatedUser = { ...user, permissions: updatedPerms };
    try {
      await onSaveUser(updatedUser);
    } catch (err) {
      addNotification('Lỗi kết nối Firebase: Không thể cập nhật quyền.', "error");
    }
  };

  const handleToggleRole = async (user: UserAccount) => {
    if (user.id === currentUser.id) {
      addNotification('Bạn không thể tự thay đổi vai trò của chính mình.', "error");
      return;
    }

    if (user.role === 'member') {
      addNotification('Để thay đổi tài khoản Member, hãy dùng nút Chỉnh sửa và chọn vai trò phù hợp.', 'info');
      return;
    }

    // Constraint check: if turning the last admin into user
    if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        addNotification('Không thể thay đổi quyền Admin này. Hệ thống yêu cầu phải có ít nhất một Admin.', "error");
        return;
      }
    }

    const targetRole: UserAccount['role'] = user.role === 'admin' ? 'user' : 'admin';
    const updatedUser: UserAccount = { 
      ...user, 
      role: targetRole,
      permissions: targetRole === 'admin' 
        ? ADMIN_PERMISSIONS
        : ['dashboard', 'calculator'] 
    };

    try {
      await onSaveUser(updatedUser);
    } catch (err) {
      addNotification('Lỗi kết nối Firebase: Không thể thay đổi vai trò.', "error");
    }
  };


  const handlePermissionCheckbox = (permId: string) => {
    if (newPermissions.includes(permId)) {
      setNewPermissions(newPermissions.filter(p => p !== permId));
    } else {
      setNewPermissions([...newPermissions, permId]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      <div 
        className="bg-brand text-white rounded-2xl p-6 shadow-xl border border-brand flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
        style={{ 
          ...(settings?.userBannerImage ? { backgroundImage: `url(${settings.userBannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
        }}
      >
        {settings?.userBannerImage && <div className="absolute inset-0 bg-black/40" />}
        
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
            <Shield className="w-6 h-6 text-white" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/80">{settings?.userBannerLabel || "Phân quyền Bảo mật"}</span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight font-display text-slate-50">{settings?.userBannerTitle || "Quản lý Thành viên & Phân quyền"}</h1>
            </div>
          </div>
          <p className="text-xs text-white/90 max-w-2xl leading-relaxed">{settings?.userBannerDescription || "Tạo tài khoản, quản lý vai trò Admin/User và kích hoạt/vô hiệu hóa các chức năng cụ thể cho từng thành viên."}</p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all self-start sm:self-center relative z-10 ${
            isAdding 
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20' 
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {isAdding ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          <span>{isAdding ? 'Hủy bỏ' : 'Thêm tài khoản mới'}</span>
        </button>
      </div>

      {/* Add User Expandable Panel */}
      
      {showBannerSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 text-left">
            <h2 className="text-sm font-extrabold text-slate-800">Cài đặt Banner Quản Lý Thành Viên</h2>
            <form onSubmit={handleSaveBanner} className="space-y-4">
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
                <div className="flex items-center gap-2">
                  <MediaSourcePicker onSelect={setBannerImg} accept="image/*" resourceType="image" folder="module-banners/users" category="Ảnh đại diện & bìa cá nhân" label="Chọn ảnh bìa" disabled={isUploading} />
                  {bannerImg && <button type="button" onClick={() => setBannerImg('')} className="px-3 py-1 bg-rose-50 text-rose-500 rounded-lg text-xs font-bold">Xóa</button>}
                </div>
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

      {isAdding && (
        <div className="bg-white rounded-2xl border border-brand/20 p-6 shadow-md shadow-brand/5 animate-fadeIn">
          <h4 className="font-bold text-slate-800 font-display text-base mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="w-5 h-5 text-brand" />
            <span>Đăng ký tài khoản thành viên mới</span>
          </h4>

          <form onSubmit={handleAddUser} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Tên đăng nhập (Username) *</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="ví dụ: nguyenvan_a"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-xs text-slate-800 font-medium transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Họ và Tên *</label>
                <input 
                  type="text" 
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="ví dụ: Nguyễn Văn A"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-xs text-slate-800 font-medium transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Địa chỉ Email *</label>
                <input 
                  type="email" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ví dụ: vana@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-xs text-slate-800 font-medium transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Mật khẩu khởi tạo *</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu bí mật"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand focus:outline-none rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-800 font-medium transition-all"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Vai trò tài khoản:</span>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="newRole" 
                    checked={newRole === 'member'}
                    onChange={() => setNewRole('member')}
                    className="accent-brand"
                  />
                  <span>Member (Học viên)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="newRole"
                    checked={newRole === 'user'} 
                    onChange={() => setNewRole('user')}
                    className="accent-brand"
                  />
                  <span>User (Người dùng thường)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="newRole" 
                    checked={newRole === 'admin'} 
                    onChange={() => setNewRole('admin')}
                    className="accent-brand"
                  />
                  <span>Admin (Toàn quyền)</span>
                </label>
              </div>

              {/* Show permission selection only for regular User */}
              {newRole === 'user' ? (
                <div className="space-y-2 border-t border-slate-200/60 pt-3 animate-fadeIn">
                  <span className="text-xs font-bold text-slate-600 block mb-1">Cấp các quyền truy cập ban đầu:</span>
                  <div className="flex flex-wrap gap-4">
                    {availablePermissions.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newPermissions.includes(p.id)}
                          onChange={() => handlePermissionCheckbox(p.id)}
                          className="w-4 h-4 accent-brand rounded"
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : newRole === 'member' ? (
                <p className="text-[11px] text-emerald-700 font-medium border-t border-slate-200/60 pt-3 animate-fadeIn">
                  Member chỉ được xem Portfolio, tham gia và học các khóa học online; không được truy cập trang quản trị.
                </p>
              ) : (
                <p className="text-[11px] text-brand font-medium italic border-t border-slate-200/60 pt-3 animate-fadeIn">
                  * Ghi chú: Tài khoản có quyền Admin sẽ mặc định được cấp phép truy cập tất cả mọi chức năng, bao gồm cả quyền Quản trị phân quyền thành viên.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                disabled={isCreatingUser}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit"
                disabled={isCreatingUser}
                className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-md shadow-brand/10 cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingUser ? 'Đang tạo tài khoản...' : 'Lưu tài khoản'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Database List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-sm font-display flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <span>Danh sách tài khoản hệ thống ({users.length})</span>
          </h4>
          <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>Tối thiểu cần có 1 Admin</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/30">
                <th className="py-3 px-4">Thành viên / Username</th>
                <th className="py-3 px-4">Thông tin liên hệ</th>
                <th className="py-3 px-4">Quyền vai trò</th>
                <th className="py-3 px-4">Chức năng được phép sử dụng (Permissions)</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {users.map((user) => {
                const isAdmin = user.role === 'admin';
                const isMember = user.role === 'member';
                const isMe = user.id === currentUser.id;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/40 transition-colors">
                    
                    {/* Username & Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isAdmin 
                            ? 'bg-gradient-to-tr from-brand to-brand-hover text-white shadow-xs' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.fullName?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{user.fullName}</span>
                            {isMe && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-sm">
                                Bạn
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">@{user.username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Email / Created Date */}
                    <td className="py-3 px-4">
                      <p className="text-slate-600 font-medium">{user.email}</p>
                      <span className="text-[9px] text-slate-400">Ngày tạo: {user.createdAt}</span>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <button 
                        onClick={() => handleToggleRole(user)}
                        disabled={isMe || isMember}
                        title={isMe ? 'Bạn không thể tự thay đổi vai trò của mình' : isMember ? 'Dùng nút Chỉnh sửa để đổi vai trò Member' : 'Bấm để chuyển đổi vai trò'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                          isAdmin 
                            ? 'bg-brand-light text-brand border-brand/20' 
                            : isMember ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/60'
                        } disabled:opacity-75 disabled:cursor-not-allowed`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>{isAdmin ? 'ADMIN' : isMember ? 'MEMBER' : 'USER'}</span>
                      </button>
                    </td>

                    {/* Permissions list */}
                    <td className="py-3 px-4">
                      {isAdmin ? (
                        <span className="text-[10px] text-brand font-bold bg-brand-light px-2 py-1 rounded-md">
                          Toàn quyền hệ thống (Full Access)
                        </span>
                      ) : isMember ? (
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md">
                          Chỉ xem và học khóa học online
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {availablePermissions.map(p => {
                            const isGranted = user.permissions.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                onClick={() => handleTogglePermission(user, p.id)}
                                className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                  isGranted 
                                    ? 'bg-brand-light text-brand border-brand/20 hover:bg-brand-light/80' 
                                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100/60'
                                }`}
                                title="Bấm để kích hoạt hoặc hủy kích hoạt quyền này"
                              >
                                {isGranted ? '✓ ' : '✗ '}
                                {p.label}
                              </button>
                            );
                          })}
                          
                          {/* Task Specific Permissions */}
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 px-1">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditFullName(user.fullName || '');
                            setEditEmail(user.email || '');
                            setEditPassword('');
                            setEditRole(user.role);
                            setEditPermissions(user.permissions || []);
                            setEditCanManageSettings(!!user.canManageSettings);
                            setIsAdding(false);
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand-light rounded-lg cursor-pointer transition-all"
                          title="Chỉnh sửa thông tin & quyền"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isMe}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                          title={isMe ? 'Không thể tự xoá tài khoản của bạn' : 'Xoá tài khoản này'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-brand to-brand-hover px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-white/50" />
                <span>Chỉnh sửa tài khoản: {editingUser.username}</span>
              </h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Vai trò</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserAccount['role'])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer"
                >
                  <option value="user">Người dùng thường (User)</option>
                  <option value="member">Học viên khóa học (Member)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

                      {editRole === 'user' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Quyền hạn truy cập</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {availablePermissions.map(p => {
                      const isChecked = editPermissions.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditPermissions(editPermissions.filter(id => id !== p.id));
                              } else {
                                setEditPermissions([...editPermissions, p.id]);
                              }
                            }}
                            className="rounded text-brand focus:ring-brand/20 cursor-pointer"
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={editCanManageSettings}
                        onChange={(e) => setEditCanManageSettings(e.target.checked)}
                        className="rounded text-brand focus:ring-brand/20 cursor-pointer"
                      />
                      <span>Quản lý cài đặt</span>
                    </label>
                    
                  </div>
                </div>
                      )}
              {editRole === 'member' && <p className="rounded-xl bg-blue-50 p-3 text-[11px] font-semibold text-blue-700">Member chỉ được xem Portfolio, ghi danh và học các khóa học online.</p>}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-brand/20"
                >
                  Cập nhật tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
