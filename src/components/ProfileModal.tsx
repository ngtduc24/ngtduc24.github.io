import React, { useState } from 'react';
import { X, Save, User, Mail, Shield, Calendar, Sparkles, Camera, RefreshCw, Upload } from 'lucide-react';
import { UserAccount } from '../types';
import { auth } from '../lib/firebase';
import { updatePassword } from 'firebase/auth';
import { uploadImageToCloudinary } from '../lib/upload';
import MediaSourcePicker from './MediaSourcePicker';

interface ProfileModalProps {
  user: UserAccount;
  onSaveProfile: (updatedUser: UserAccount) => Promise<void>;
  onClose: () => void;
  isReadOnly?: boolean;
}

export default function ProfileModal({ user, onSaveProfile, onClose, isReadOnly = false }: ProfileModalProps) {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [email, setEmail] = useState(user.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const avatarPresets = [
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Male Tech
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Female Pro
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Female Researcher
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Male Researcher
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Female Leader
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', // Male Leader
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    if (!fullName.trim() || !email.trim()) {
      setError('Vui lòng nhập đầy đủ Họ và Tên, Email.');
      setIsSubmitting(false);
      return;
    }

    if (password.trim() && password.trim().length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      setIsSubmitting(false);
      return;
    }

    // Update password in Firebase Auth if provided
    if (password.trim()) {
      try {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, password.trim());
        } else {
          setError('Không tìm thấy phiên đăng nhập Firebase Auth.');
          setIsSubmitting(false);
          return;
        }
      } catch (authErr: any) {
        console.error("Lỗi cập nhật mật khẩu Firebase Auth:", authErr);
        if (authErr.code === 'auth/requires-recent-login') {
          setError('Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại để cập nhật mật khẩu mới.');
        } else {
          setError('Lỗi cập nhật mật khẩu Auth: ' + (authErr.message || authErr));
        }
        setIsSubmitting(false);
        return;
      }
    }

    const updatedUser: UserAccount = {
      ...user,
      fullName: fullName.trim(),
      email: email.trim(),
      avatarUrl: avatarUrl.trim(),
    };

    // We explicitly remove password from the Firestore user profile for security
    if (updatedUser.password) {
      delete updatedUser.password;
    }

    try {
      await onSaveProfile(updatedUser);
      setSuccess('Cập nhật thông tin tài khoản thành công!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError('Lỗi cập nhật thông tin tài khoản.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn" id="profile-modal-root">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-brand to-indigo-900 px-6 py-5 text-white flex items-center justify-between relative">
          <div className="space-y-1">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>{isReadOnly ? 'Hồ Sơ Thành Viên' : 'Thông Tin Cá Nhân'}</span>
            </h3>
            <p className="text-[10px] text-white/80">{isReadOnly ? 'Xem chi tiết thông tin cá nhân của bạn' : 'Xem và cập nhật hồ sơ thành viên của bạn'}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh] scrollbar-none">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-semibold">
              {success}
            </div>
          )}

          {/* Avatar Section */}
          <div className="space-y-3 text-center">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">
              Ảnh đại diện (Avatar)
            </label>
            
            <div className="flex flex-col items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="relative">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="User Avatar" 
                    className="w-18 h-18 rounded-full object-cover border-4 border-white shadow-md"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-brand to-indigo-500 text-white font-black text-xl flex items-center justify-center border-4 border-white shadow-md">
                    {fullName?.substring(0, 2).toUpperCase()}
                  </div>
                )}
                
                {!isReadOnly && (
                  <MediaSourcePicker onSelect={setAvatarUrl} accept="image/*" resourceType="image" folder="users/avatars" category="Ảnh đại diện & bìa cá nhân" label="Chọn ảnh đại diện" compact disabled={isUploadingAvatar} className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand p-0 text-white shadow-sm hover:bg-brand-hover" />
                )}
              </div>

              {/* Presets List */}
              {!isReadOnly && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block">Chọn từ ảnh mẫu có sẵn:</span>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {avatarPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(preset)}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                          avatarUrl === preset ? 'border-brand scale-110 shadow-xs' : 'border-transparent hover:scale-105'
                        }`}
                      >
                        <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Profile Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Họ và Tên *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  readOnly={isReadOnly}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full border border-slate-200 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold transition-all ${
                    isReadOnly ? 'bg-slate-50 text-slate-600 cursor-default' : 'bg-slate-50 focus:bg-white focus:border-brand text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tên đăng nhập (Username)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="text-xs font-bold font-mono">@</span>
                </span>
                <input
                  type="text"
                  disabled
                  value={user.username}
                  className="w-full bg-slate-100 border border-slate-200 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Địa chỉ Email *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  readOnly={isReadOnly}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full border border-slate-200 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold transition-all ${
                    isReadOnly ? 'bg-slate-50 text-slate-600 cursor-default' : 'bg-slate-50 focus:bg-white focus:border-brand text-slate-800'
                  }`}
                />
              </div>
            </div>

            {!isReadOnly && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đổi mật khẩu (Bỏ trống nếu giữ nguyên)</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 transition-all"
                />
              </div>
            )}
          </div>

          {/* Account metadata info */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-500 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-brand" />
              <span>Vai trò: <strong className="text-brand uppercase">{user.role}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Ngày tạo: <strong className="text-slate-700">{user.createdAt || '10/07/2026'}</strong></span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-4.5 py-2.5 text-xs font-bold transition-all cursor-pointer rounded-xl ${
                isReadOnly ? 'bg-brand text-white hover:bg-brand-hover shadow-md shadow-brand/15' : 'bg-slate-150 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isReadOnly ? 'Đóng lại' : 'Hủy bỏ'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand/15"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu cập nhật'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
