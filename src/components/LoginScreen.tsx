import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldAlert,
  Mail,
  UserPlus,
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { UserAccount } from '../types';
import { Button, IconButton, Input, Field, Card } from './ui';
import { auth } from '../lib/firebase';
import { loginWithPassword, registerAccount } from '../lib/authActions';


interface LoginScreenProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onBackToPublic: () => void;
  initialMode?: 'login' | 'register';
}

export default function LoginScreen({ users, onLoginSuccess, onBackToPublic, initialMode = 'login' }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  // Đăng ký
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [regError, setRegError] = useState('');

  // Tạo tài khoản mới (xử lý chung ở lib/authActions)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setLoading(true);
    try { onLoginSuccess(await registerAccount(regName, regEmail, regPass, regPass2)); }
    catch (err: any) { setRegError(err?.message || 'Không tạo được tài khoản. Vui lòng thử lại.'); }
    setLoading(false);
  };
  // Login Form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Visibility toggles
  const [showLoginPass, setShowLoginPass] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try { onLoginSuccess(await loginWithPassword(users, loginUsername, loginPassword)); }
    catch (err: any) { setLoginError(err?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.'); }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] w-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-8 relative overflow-x-hidden overflow-y-auto" id="login-screen-wrapper">
      {/* Nền sáng cùng bộ màu với phần bên trong, điểm nhấn màu thương hiệu rất nhạt */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <Card padding="none" className="w-full max-w-md my-auto p-6 sm:p-8 shadow-xl relative z-10 shrink-0 animate-fadeIn">
        <button type="button" onClick={onBackToPublic} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-brand">
          <ArrowLeft size={16} /> Về trang chủ
        </button>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-light text-brand mb-3">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">{mode === 'login' ? 'Đăng nhập EduGo' : 'Tạo tài khoản EduGo'}</h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-xs mx-auto">{mode === 'login' ? 'Nền tảng học tập và làm việc trực tuyến.' : 'Miễn phí, chỉ cần email và mật khẩu.'}</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          {(['login', 'register'] as const).map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setLoginError(''); setRegError(''); }}
              className={`rounded-xl py-2 text-[13px] font-semibold transition-all ${mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          ))}
        </div>

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {regError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[13px] font-medium flex items-start gap-2.5" role="alert">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" /><span>{regError}</span>
              </div>
            )}
            <Field label="Họ và tên">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input type="text" required value={regName} onChange={e => setRegName(e.target.value)} autoComplete="name" placeholder="Ví dụ Nguyễn Văn An" className="pl-9" />
              </div>
            </Field>
            <Field label="Email">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} autoComplete="email" placeholder="ban@email.com" className="pl-9" />
              </div>
            </Field>
            <Field label="Mật khẩu">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input type={showLoginPass ? 'text' : 'password'} required value={regPass} onChange={e => setRegPass(e.target.value)} autoComplete="new-password" placeholder="Ít nhất 6 ký tự" className="pl-9 pr-11" />
                <IconButton label={showLoginPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} size="sm" variant="ghost" onClick={() => setShowLoginPass(!showLoginPass)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </IconButton>
              </div>
            </Field>
            <Field label="Nhập lại mật khẩu">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input type={showLoginPass ? 'text' : 'password'} required value={regPass2} onChange={e => setRegPass2(e.target.value)} autoComplete="new-password" placeholder="Nhập lại mật khẩu" className="pl-9" />
              </div>
            </Field>
            <Button type="submit" full loading={loading} iconRight={<UserPlus size={16} />} className="mt-1">
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </Button>
          </form>
        )}

        {mode === 'login' && (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[13px] font-medium flex flex-col gap-2.5 animate-shake" role="alert">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
              {loginError.includes('Email/Mật khẩu') && (
                <div className="mt-1 p-3 bg-white rounded-xl text-slate-600 text-xs leading-relaxed border border-slate-200 space-y-2 font-normal">
                  <p className="font-semibold text-amber-700">Hướng dẫn kích hoạt nhanh</p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Mở <a href={`https://console.firebase.google.com/project/${auth.app.options.projectId}/authentication/providers`} target="_blank" rel="noreferrer" className="text-brand hover:underline font-semibold">trang Authentication của Firebase Console</a></li>
                    <li>Bấm <span className="font-semibold text-slate-800">Add new provider</span> rồi chọn <span className="font-semibold text-slate-800">Email/Password</span></li>
                    <li>Bật dòng Email/Password sang <span className="font-semibold text-brand">Enable</span> và bấm Save</li>
                    <li>Quay lại ứng dụng này và đăng nhập lại</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <Field label="Email hoặc tên đăng nhập">
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input type="text" required value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} autoComplete="username" placeholder="Nhập email hoặc tên đăng nhập" className="pl-9" />
            </div>
          </Field>

          <Field label="Mật khẩu">
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input type={showLoginPass ? 'text' : 'password'} required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" placeholder="Nhập mật khẩu" className="pl-9 pr-11" />
              <IconButton label={showLoginPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} size="sm" variant="ghost" onClick={() => setShowLoginPass(!showLoginPass)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400">
                {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </IconButton>
            </div>
          </Field>

          <Button type="submit" full loading={loading} iconRight={<LogIn size={16} />} className="mt-1">
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </Button>

        </form>
        )}
      </Card>
    </div>
  );
}
