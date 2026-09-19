import { useState } from 'react';
import { AppSettings, UserAccount } from '../../types';
import { saveDefaultSettingsToSupabase } from '../../lib/data';
import { uploadImageToCloudinary } from '../../lib/upload';
import MediaSourcePicker from '../MediaSourcePicker';
import { Image as ImageIcon, Shield } from 'lucide-react';
import React from 'react';
import { useNotifications } from '../NotificationContext';

interface SettingsProps {
  settings?: AppSettings;
  onRefreshSettings?: () => Promise<void>;
  users: UserAccount[];
  currentUser: UserAccount;
  onSaveUser: (user: UserAccount) => Promise<void>;
  isUserAdmin: boolean;
}

export default function Settings({ users, currentUser, onSaveUser, isUserAdmin, settings, onRefreshSettings }: SettingsProps) {
  const { addNotification } = useNotifications();
  const [isUploading, setIsUploading] = useState(false);
  const [bannerTitle, setBannerTitle] = useState(settings?.quantBannerTitle || '');
  const [bannerDesc, setBannerDesc] = useState(settings?.quantBannerDescription || '');
  const [bannerLabel, setBannerLabel] = useState(settings?.quantBannerLabel || '');
  const [bannerImg, setBannerImg] = useState(settings?.quantBannerImage || '');
  
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const updated = {
        ...settings,
        quantBannerTitle: bannerTitle,
        quantBannerDescription: bannerDesc,
        quantBannerLabel: bannerLabel,
        quantBannerImage: bannerImg
      };
      await saveDefaultSettingsToSupabase(updated);
      if (onRefreshSettings) await onRefreshSettings();
      addNotification("Đã lưu cài đặt Banner!", "success");
    } catch(err) {
      console.error(err);
      addNotification("Lỗi lưu cài đặt!", "error");
    }
  };

  const handleTogglePermission = async (user: UserAccount, field: keyof UserAccount) => {
    if (user.role === 'admin') return; // Admins always have all perms
    const updatedUser = { ...user, [field]: !user[field] };
    await onSaveUser(updatedUser);
  };

  if (!isUserAdmin) {
    return <div className="text-rose-500 text-sm">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Banner Settings */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 text-left">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-brand" />
            <span>Cài đặt Banner Module Định Lượng</span>
          </h2>
        </div>
        <form onSubmit={handleSaveBanner} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Tiêu đề</label>
              <input type="text" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Nhãn phụ (Badge)</label>
              <input type="text" value={bannerLabel} onChange={e => setBannerLabel(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Mô tả</label>
            <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" rows={2}></textarea>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Ảnh bìa (Tùy chọn)</label>
            <div className="flex items-center gap-2">
              <MediaSourcePicker onSelect={setBannerImg} accept="image/*" resourceType="image" folder="module-banners/quantitative" label="Chọn ảnh bìa" disabled={isUploading} />
              {bannerImg && (
                <button type="button" onClick={() => setBannerImg('')} className="px-3 py-1 bg-rose-50 text-rose-500 rounded-lg text-xs font-bold">Xóa</button>
              )}
            </div>
            {isUploading && <p className="text-xs text-brand mt-1">Đang tải...</p>}
            {bannerImg && <img src={bannerImg} alt="Preview" className="h-16 rounded-xl object-cover mt-2" />}
          </div>
          <button type="submit" className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-bold">Lưu Cài Đặt Banner</button>
        </form>
      </div>

<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 text-left">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand" />
            <span>Phân quyền chuyên sâu Phân tích định lượng</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Thiết lập các quyền thao tác cho từng người dùng thường trong hệ thống.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-extrabold text-slate-400 uppercase border-b border-slate-100 tracking-wider">
                <th className="py-3 px-4">Thành viên</th>
                <th className="py-3 px-4 text-center">Thêm biến</th>
                <th className="py-3 px-4 text-center">Sửa biến</th>
                <th className="py-3 px-4 text-center">Xóa biến</th>
                <th className="py-3 px-4 text-center">Nhập dữ liệu</th>
                <th className="py-3 px-4 text-center">Phân tích/Xuất</th>
                <th className="py-3 px-4 text-center">Cài đặt</th>
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
                        onClick={() => handleTogglePermission(user, 'canCreateQuantitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canCreateQuantitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canCreateQuantitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canEditQuantitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canEditQuantitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canEditQuantitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canDeleteQuantitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canDeleteQuantitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canDeleteQuantitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canImportQuantitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canImportQuantitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canImportQuantitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canExportQuantitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canExportQuantitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canExportQuantitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canManageQuantitativeSettings')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canManageQuantitativeSettings 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canManageQuantitativeSettings ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
