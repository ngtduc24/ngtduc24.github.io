import React, { useState } from 'react';
import { UserCircle, ShieldCheck, Bell as BellIcon, Camera, Check, X, Loader2, ArrowLeft } from 'lucide-react';
import { UserAccount } from '../types';
import { auth } from '../lib/firebase';
import { updatePassword } from 'firebase/auth';
import MediaSourcePicker from './MediaSourcePicker';

interface ProfilePageProps {
  user: UserAccount;
  onSaveProfile: (updatedUser: UserAccount) => Promise<void>;
  onBack?: () => void;
}

type Section = 'profile' | 'security' | 'notifications';

export default function ProfilePage({ user, onSaveProfile, onBack }: ProfilePageProps) {
  const [section, setSection] = useState<Section>('profile');
  const [fullName, setFullName] = useState(user.fullName || '');
  const [email, setEmail] = useState(user.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [editing, setEditing] = useState<'name' | 'email' | null>(null);
  const [draftName, setDraftName] = useState(fullName);
  const [draftEmail, setDraftEmail] = useState(email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const flash = (msg: string, ok = true) => {
    if (ok) { setSuccess(msg); setError(''); } else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 2600);
  };

  const persist = async (patch: Partial<UserAccount>) => {
    setSaving(true);
    const updated: UserAccount = { ...user, fullName, email, avatarUrl, ...patch };
    if (updated.password) delete updated.password;
    try {
      await onSaveProfile(updated);
      return true;
    } catch (e) {
      flash('Lỗi cập nhật thông tin tài khoản.', false);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveName = async () => {
    if (!draftName.trim()) { flash('Vui lòng nhập tên.', false); return; }
    const ok = await persist({ fullName: draftName.trim() });
    if (ok) { setFullName(draftName.trim()); setEditing(null); flash('Đã cập nhật tên.'); }
  };
  const saveEmail = async () => {
    if (!draftEmail.trim()) { flash('Vui lòng nhập email.', false); return; }
    const ok = await persist({ email: draftEmail.trim() });
    if (ok) { setEmail(draftEmail.trim()); setEditing(null); flash('Đã cập nhật email.'); }
  };
  const changeAvatar = async (url: string) => {
    setAvatarUrl(url);
    const ok = await persist({ avatarUrl: url });
    if (ok) flash('Đã cập nhật ảnh hồ sơ.');
  };
  const removeAvatar = async () => {
    setAvatarUrl('');
    const ok = await persist({ avatarUrl: '' });
    if (ok) flash('Đã xóa ảnh hồ sơ.');
  };

  const savePassword = async () => {
    if (password.trim().length < 6) { flash('Mật khẩu mới phải có ít nhất 6 ký tự.', false); return; }
    if (password !== confirmPassword) { flash('Mật khẩu xác nhận không khớp.', false); return; }
    setSaving(true);
    try {
      if (!auth.currentUser) { flash('Không tìm thấy phiên đăng nhập.', false); setSaving(false); return; }
      await updatePassword(auth.currentUser, password.trim());
      setPassword(''); setConfirmPassword('');
      flash('Đã đổi mật khẩu thành công.');
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') flash('Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại để đổi mật khẩu.', false);
      else flash('Lỗi đổi mật khẩu: ' + (err?.message || err), false);
    } finally {
      setSaving(false);
    }
  };

  const navItems: { id: Section; label: string; icon: any }[] = [
    { id: 'profile', label: 'Hồ sơ của bạn', icon: UserCircle },
    { id: 'security', label: 'Tài khoản và bảo mật', icon: ShieldCheck },
    { id: 'notifications', label: 'Tùy chọn thông báo', icon: BellIcon },
  ];

  const roleLabel = user.role === 'admin' ? 'Quản trị viên' : user.role === 'member' ? 'Học viên' : 'Thành viên';

  return (
    <div className="animate-fadeIn">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Cột điều hướng trong trang */}
        <aside className="lg:sticky lg:top-6 h-fit rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
          {onBack && (
            <button onClick={onBack} className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-brand">
              <ArrowLeft className="h-4 w-4" /> Về trang chủ
            </button>
          )}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Nội dung */}
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-slate-900">Hồ sơ của bạn</h1>
            <p className="mt-1 text-sm text-slate-500">Xem và cập nhật thông tin tài khoản của bạn.</p>
          </div>

          {(success || error) && (
            <div className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${success ? 'border-brand-light bg-brand-light text-brand' : 'border-rose-100 bg-rose-50 text-rose-600'}`}>
              {success || error}
            </div>
          )}

          {section === 'profile' && (
            <div className="space-y-5">
              <h2 className="text-lg font-black text-slate-800">Tài khoản của bạn</h2>
              <div className="divide-y divide-slate-100 rounded-3xl border border-slate-100 bg-white shadow-sm">
                {/* Ảnh hồ sơ */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-6">
                  <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={fullName} className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-700 text-xl font-black text-white">{fullName?.slice(0, 1).toUpperCase()}</div>
                    )}
                    <span className="text-sm font-bold text-slate-800">Ảnh hồ sơ</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {avatarUrl && (
                      <button onClick={removeAvatar} disabled={saving} className="text-sm font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-50">Xóa ảnh</button>
                    )}
                    <MediaSourcePicker
                      onSelect={changeAvatar}
                      accept="image/*"
                      resourceType="image"
                      folder="users/avatars"
                      category="Ảnh đại diện & bìa cá nhân"
                      label="Thay đổi ảnh"
                      icon={Camera}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand"
                    />
                  </div>
                </div>

                {/* Tên */}
                <div className="p-6">
                  {editing === 'name' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-800">Tên</label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input autoFocus value={draftName} onChange={e => setDraftName(e.target.value)} className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />
                        <button onClick={saveName} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lưu</button>
                        <button onClick={() => { setEditing(null); setDraftName(fullName); }} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" /> Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Tên</p>
                        <p className="mt-0.5 text-sm text-slate-500">{fullName || '(chưa đặt)'}</p>
                      </div>
                      <button onClick={() => { setDraftName(fullName); setEditing('name'); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand">Chỉnh sửa</button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="p-6">
                  {editing === 'email' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-800">Địa chỉ email</label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input autoFocus type="email" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />
                        <button onClick={saveEmail} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lưu</button>
                        <button onClick={() => { setEditing(null); setDraftEmail(email); }} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" /> Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Địa chỉ email</p>
                        <p className="mt-0.5 text-sm text-slate-500">{email || '(chưa đặt)'}</p>
                      </div>
                      <button onClick={() => { setDraftEmail(email); setEditing('email'); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand">Chỉnh sửa</button>
                    </div>
                  )}
                </div>

                {/* Tên đăng nhập (không đổi) */}
                <div className="flex items-center justify-between gap-4 p-6">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Tên đăng nhập</p>
                    <p className="mt-0.5 text-sm text-slate-500">@{user.username}</p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-400">Không thể thay đổi</span>
                </div>

                {/* Vai trò */}
                <div className="flex items-center justify-between gap-4 p-6">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Vai trò</p>
                    <p className="mt-0.5 text-sm text-slate-500">{roleLabel}</p>
                  </div>
                  <span className="rounded-lg bg-brand-light px-3 py-1 text-[11px] font-bold uppercase text-brand">{user.role}</span>
                </div>
              </div>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-5">
              <h2 className="text-lg font-black text-slate-800">Tài khoản và bảo mật</h2>
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">Đổi mật khẩu</p>
                  <p className="mt-0.5 text-xs text-slate-500">Nhập mật khẩu mới ít nhất 6 ký tự.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="Mật khẩu mới" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Xác nhận mật khẩu" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />
                </div>
                <button onClick={savePassword} disabled={saving || !password} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Cập nhật mật khẩu
                </button>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-5">
              <h2 className="text-lg font-black text-slate-800">Tùy chọn thông báo</h2>
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Thông báo của hệ thống được gửi tới bạn qua chuông thông báo ở thanh bên trái. Bạn có thể mở chuông để xem, đánh dấu đã đọc hoặc xóa thông báo.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
