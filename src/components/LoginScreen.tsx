import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  Calculator,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { UserAccount } from '../types';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { saveUser, deleteUser } from '../lib/data';


interface LoginScreenProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onBackToPublic: () => void;
}

export default function LoginScreen({ users, onLoginSuccess, onBackToPublic }: LoginScreenProps) {
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

    const usernameClean = loginUsername.trim().toLowerCase();
    
    // 1. HARDCODED ADMIN FAILSAFE: Luôn luôn cho phép admin/123 đăng nhập ngay lập tức
    if (usernameClean === 'admin' && loginPassword === '123') {
      const adminProfile: UserAccount = {
        id: 'admin-id',
        username: 'admin',
        fullName: 'Quản trị viên',
        email: 'admin@gmail.com',
        role: 'admin',
        permissions: ['dashboard', 'calculator', 'website', 'users', 'scientific_journals'],
        createdAt: '10/07/2026'
      };
      // Thử đăng ký/đăng nhập ngầm trong Firebase Auth, nhưng không chặn đăng nhập nếu lỗi
      try {
        await createUserWithEmailAndPassword(auth, 'admin@gmail.com', '123');
      } catch (ae) {
        // Bỏ qua lỗi đăng ký ngầm
      }
      onLoginSuccess(adminProfile);
      setLoading(false);
      return;
    }

    // Tìm email của người dùng nếu họ đăng nhập bằng tên người dùng
    let targetEmail = usernameClean;
    const targetUserMetadata = users.find(u => 
      u.username.toLowerCase() === usernameClean || 
      u.email.toLowerCase() === usernameClean
    );
    
    if (targetUserMetadata) {
      targetEmail = targetUserMetadata.email;
    } else {
      if (!usernameClean.includes('@')) {
        setLoginError('Tên đăng nhập không tồn tại trên hệ thống.');
        setLoading(false);
        return;
      }
    }

    // Nếu thông tin người dùng trong Firestore có lưu mật khẩu thô và khớp với mật khẩu nhập vào:
    if (targetUserMetadata && targetUserMetadata.password && targetUserMetadata.password === loginPassword) {
      // Đây là tài khoản cũ chưa chuyển đổi. Thử chuyển đổi bảo mật sang Firebase Auth.
      try {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, targetEmail, loginPassword);
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
            // Tự động đăng ký trên Firebase Auth
            userCredential = await createUserWithEmailAndPassword(auth, targetEmail, loginPassword);
          } else {
            throw signInErr;
          }
        }

        // Đã đăng ký thành công trên Firebase Auth! Cập nhật Firestore loại bỏ trường password thô và đồng bộ UID
        const { password, ...cleanedUser } = targetUserMetadata;
        const oldId = cleanedUser.id;
        cleanedUser.id = userCredential.user.uid;
        
        await saveUser(cleanedUser);
        if (oldId !== cleanedUser.id) {
          await deleteUser(oldId);
        }
        
        onLoginSuccess(cleanedUser);
        setLoading(false);
        return;
      } catch (migrationError: any) {
        console.warn("⚠️ Không thể tự động chuyển đổi bảo mật sang Firebase Auth:", migrationError.message || migrationError);
        // PHƯƠNG ÁN DỰ PHÒNG: Đăng nhập thẳng bằng thông tin Firestore để không làm gián đoạn người dùng
        console.log("👉 Đăng nhập thành công bằng phương thức dự phòng Firestore.");
        const { password, ...cleanedUser } = targetUserMetadata;
        onLoginSuccess(cleanedUser);
        setLoading(false);
        return;
      }
    }

    // Đối với các tài khoản mới (hoặc khi người dùng nhập sai mật khẩu)
    // Thực hiện xác thực nghiêm ngặt qua Firebase Auth
    try {
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, loginPassword);
      
      if (targetUserMetadata) {
        const { password, ...cleanedUser } = targetUserMetadata;
        onLoginSuccess(cleanedUser);
      } else {
        const defaultProfile: UserAccount = {
          id: userCredential.user.uid,
          username: usernameClean,
          fullName: userCredential.user.displayName || usernameClean,
          email: targetEmail,
          role: 'user',
          permissions: ['dashboard', 'calculator'],
          createdAt: new Date().toLocaleDateString('vi-VN')
        };
        await saveUser(defaultProfile);
        onLoginSuccess(defaultProfile);
      }
    } catch (authError: any) {
      console.error("Lỗi xác thực Firebase Auth:", authError.code || authError.message);
      if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        setLoginError('Mật khẩu không chính xác.');
      } else if (authError.code === 'auth/user-not-found') {
        setLoginError('Tài khoản không tồn tại hoặc chưa được kích hoạt.');
      } else if (authError.code === 'auth/operation-not-allowed') {
        setLoginError('Lỗi hệ thống: Phương thức Email/Password chưa được kích hoạt trong Firebase Console.');
      } else {
        setLoginError('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 px-4 py-8 relative overflow-hidden" id="login-screen-wrapper">
      
      {/* Decorative ambient blurred shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      
      <div className="w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* Brand/Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand text-white shadow-lg shadow-brand/40 mb-3 animate-bounce-subtle">
            <Calculator className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-display">
            Smart Research VN
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Hỗ trợ tính toán cỡ mẫu chính xác & tra cứu báo khoa học thông minh.
          </p>
        </div>

        {/* Form area */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          
          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">Tên đăng nhập</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Nhập username của bạn"
                className="w-full bg-slate-950/40 border border-slate-700/80 focus:border-[#712cf9] focus:outline-none focus:bg-slate-950/20 text-white rounded-xl pl-10 pr-4 py-3 text-xs font-semibold transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">Mật khẩu</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showLoginPass ? 'text' : 'password'}
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/40 border border-slate-700/80 focus:border-[#712cf9] focus:outline-none focus:bg-slate-950/20 text-white rounded-xl pl-10 pr-10 py-3 text-xs font-semibold transition-all"
              />
              <button
                type="button"
                onClick={() => setShowLoginPass(!showLoginPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-brand hover:bg-brand-hover hover:shadow-lg hover:shadow-brand/20 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <span>Đang xử lý...</span>
                <Loader2 className="w-4 h-4 animate-spin" />
              </>
            ) : (
              <>
                <span>Xác nhận đăng nhập</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-4 border-t border-slate-700/60 text-center">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/tracuu.html';
              }}
              className="text-xs font-bold text-brand-hover hover:text-brand hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <span>Truy cập trang tra cứu công cộng</span>
            </button>
          </div>



        </form>

      </div>
    </div>
  );
}
