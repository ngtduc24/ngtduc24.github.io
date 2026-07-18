import React from 'react';
import { X, Shield } from 'lucide-react';
import { AppSettings, UserAccount } from '../types';
import { saveDefaultSettingsToSupabase } from '../lib/data';
import { useNotifications } from './NotificationContext';

export default function ConfigSection({ users, currentUser, settings, onRefreshSettings, onUpdateUser, isUserAdmin, handleToggleTaskPermission, onlyPermissions }: { 
    users: UserAccount[], 
    currentUser: UserAccount, 
    settings: AppSettings, 
    onRefreshSettings: () => void, 
    onUpdateUser: (user: UserAccount) => Promise<void>,
    isUserAdmin: boolean,
    handleToggleTaskPermission: (user: UserAccount, field: any) => Promise<void>,
    onlyPermissions?: boolean
}) {
  const { addNotification } = useNotifications();
  const [newType, setNewType] = React.useState('');
  const [editingType, setEditingType] = React.useState<string | null>(null);

  const [taskBannerTitle, setTaskBannerTitle] = React.useState(settings.taskBannerTitle || "");
  const [taskBannerDescription, setTaskBannerDescription] = React.useState(settings.taskBannerDescription || "");

  React.useEffect(() => {
    if (settings.taskBannerTitle) setTaskBannerTitle(settings.taskBannerTitle);
    if (settings.taskBannerDescription) setTaskBannerDescription(settings.taskBannerDescription);
  }, [settings]);

  const handleSaveBanners = async () => {
    const updatedSettings = {
      ...settings,
      taskBannerTitle: taskBannerTitle.trim(),
      taskBannerDescription: taskBannerDescription.trim(),
    };
    try {
      await saveDefaultSettingsToSupabase(updatedSettings);
      onRefreshSettings();
      addNotification("Đã lưu cấu hình banner thành công!", "success");
    } catch (error) {
      addNotification("Có lỗi xảy ra khi lưu cấu hình", "error");
    }
  };

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

  return (
    <div className="space-y-6">
      {!onlyPermissions && (
        <>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold">Quản lý loại công việc</h2>
            <div className="flex gap-2">
              <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)} placeholder={editingType ? "Sửa loại..." : "Tên loại mới..."} className="flex-1 px-4 py-2 border rounded-xl text-xs"/>
              <button onClick={handleAddTaskType} className="bg-brand text-white px-4 py-2 rounded-xl text-xs font-bold">{editingType ? "Cập nhật" : "Thêm"}</button>
              {editingType && <button onClick={() => {setEditingType(null); setNewType('');}} className="bg-slate-300 text-white px-4 py-2 rounded-xl text-xs font-bold">Hủy</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              {(settings.taskTypes || []).map((t, i) => (
                <span key={i} className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-700">
                  <span onClick={() => startEditTaskType(t)} className="cursor-pointer hover:text-brand-hover">{t}</span>
                  <button onClick={() => handleDeleteTaskType(t)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-sm font-bold">Cấu hình Banner các Module</h2>
            
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700">Module Quản lý công việc</h3>
              <input type="text" value={taskBannerTitle} onChange={(e) => setTaskBannerTitle(e.target.value)} placeholder="Tiêu đề banner..." className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs" />
              <textarea value={taskBannerDescription} onChange={(e) => setTaskBannerDescription(e.target.value)} placeholder="Mô tả banner..." className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-xs" rows={2} />
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSaveBanners} 
                className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
              >
                Lưu cấu hình tất cả banner
              </button>
            </div>
          </div>
        </>
      )}

      {(isUserAdmin && (onlyPermissions === undefined || onlyPermissions === true)) && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 text-left">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand" />
              <span>Phân quyền chuyên sâu quản lý công việc</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Thiết lập các quyền thao tác cho từng người dùng thường trong hệ thống.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-extrabold text-slate-400 uppercase border-b border-slate-100 tracking-wider">
                  <th className="py-3 px-4">Thành viên</th>
                  <th className="py-3 px-4 text-center">Giao việc</th>
                  <th className="py-3 px-4 text-center">Nhận việc</th>
                  <th className="py-3 px-4 text-center">Bắt/Dừng</th>
                  <th className="py-3 px-4 text-center">Hoàn thành</th>
                  <th className="py-3 px-4 text-center">Xóa việc</th>
                  <th className="py-3 px-4 text-center">Tạo Task</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map(user => {
                  const isUserAdminRole = user.role === 'admin';
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-xs shrink-0 border border-brand/20">
                            {user.fullName?.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{user.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">@{user.username || user.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isUserAdminRole}
                          onClick={() => handleToggleTaskPermission(user, 'canAssignTask')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isUserAdminRole || user.canAssignTask 
                              ? 'bg-brand-light text-brand border border-brand/30' 
                              : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          {isUserAdminRole || user.canAssignTask ? 'Đã cho phép' : 'Chưa cấp'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isUserAdminRole}
                          onClick={() => handleToggleTaskPermission(user, 'canReceiveTask')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isUserAdminRole || user.canReceiveTask 
                              ? 'bg-brand-light text-brand border border-brand/30' 
                              : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          {isUserAdminRole || user.canReceiveTask ? 'Đã cho phép' : 'Chưa cấp'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isUserAdminRole}
                          onClick={() => handleToggleTaskPermission(user, 'canRunPauseTask')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isUserAdminRole || user.canRunPauseTask 
                              ? 'bg-brand-light text-brand border border-brand/30' 
                              : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          {isUserAdminRole || user.canRunPauseTask ? 'Đã cho phép' : 'Chưa cấp'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isUserAdminRole}
                          onClick={() => handleToggleTaskPermission(user, 'canCompleteTask')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isUserAdminRole || user.canCompleteTask 
                              ? 'bg-brand-light text-brand border border-brand/30' 
                              : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          {isUserAdminRole || user.canCompleteTask ? 'Đã cho phép' : 'Chưa cấp'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isUserAdminRole}
                          onClick={() => handleToggleTaskPermission(user, 'canDeleteTask')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isUserAdminRole || user.canDeleteTask 
                              ? 'bg-brand-light text-brand border border-brand/30' 
                              : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          {isUserAdminRole || user.canDeleteTask ? 'Đã cho phép' : 'Chưa cấp'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isUserAdminRole}
                          onClick={() => handleToggleTaskPermission(user, 'canCreateTask')}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isUserAdminRole || user.canCreateTask 
                              ? 'bg-brand-light text-brand border border-brand/30' 
                              : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          {isUserAdminRole || user.canCreateTask ? 'Đã cho phép' : 'Chưa cấp'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
