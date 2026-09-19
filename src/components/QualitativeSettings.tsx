import { useState } from 'react';
import { AppSettings, UserAccount } from '../types';
import { saveDefaultSettingsToSupabase } from '../lib/data';
import { uploadImageToCloudinary } from '../lib/upload';
import { Image as ImageIcon } from 'lucide-react';
import React from 'react';
import { Shield } from 'lucide-react';

interface SettingsProps {
  settings?: AppSettings;
  onRefreshSettings?: () => Promise<void>;
  users: UserAccount[];
  currentUser: UserAccount;
  onSaveUser: (user: UserAccount) => Promise<void>;
  isUserAdmin: boolean;
}

export default function QualitativeSettings({ users, currentUser, onSaveUser, isUserAdmin, settings, onRefreshSettings }: SettingsProps) {
  const [isUploading, setIsUploading] = useState(false);
  
  const handleTogglePermission = async (user: UserAccount, field: keyof UserAccount) => {
    if (user.role === 'admin') return; // Admins always have all perms
    const updatedUser = { ...user, [field]: !user[field] };
    await onSaveUser(updatedUser);
  };

  if (!isUserAdmin) {
    return <div className="text-rose-500 text-sm p-6">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Banner Settings Removed */}

<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 text-left">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand" />
            <span>Phân quyền chuyên sâu Phân tích định tính</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Thiết lập các quyền thao tác cho từng người dùng thường trong hệ thống.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-extrabold text-slate-400 uppercase border-b border-slate-100 tracking-wider">
                <th className="py-3 px-4">Thành viên</th>
                <th className="py-3 px-4 text-center">Thêm mới</th>
                <th className="py-3 px-4 text-center">Chỉnh sửa</th>
                <th className="py-3 px-4 text-center">Xóa bỏ</th>
                <th className="py-3 px-4 text-center">Tải tệp/Nhập</th>
                <th className="py-3 px-4 text-center">Kết xuất/Xuất</th>
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
                        onClick={() => handleTogglePermission(user, 'canCreateQualitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canCreateQualitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canCreateQualitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canEditQualitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canEditQualitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canEditQualitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canDeleteQualitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canDeleteQualitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canDeleteQualitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canImportQualitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canImportQualitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canImportQualitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canExportQualitative')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canExportQualitative 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canExportQualitative ? 'Đã cho phép' : 'Chưa cấp'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        disabled={isUserAdminRole}
                        onClick={() => handleTogglePermission(user, 'canManageQualitativeSettings')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          isUserAdminRole || user.canManageQualitativeSettings 
                            ? 'bg-brand-light text-brand border border-brand/30' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {isUserAdminRole || user.canManageQualitativeSettings ? 'Đã cho phép' : 'Chưa cấp'}
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
