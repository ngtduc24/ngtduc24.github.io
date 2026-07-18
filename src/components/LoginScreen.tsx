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
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getUserById, USERS_TABLE, mapUserFromDB } from '../lib/data';
import { supabase } from '../lib/supabase';


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
    
    // Tìm email của người dùng nếu họ đăng nhập bằng tên người dùng
    let targetEmail = usernameClean;
    let targetUserMetadata = users.find(u => 
      u.username.toLowerCase() === usernameClean || 
      u.email.toLowerCase() === usernameClean
    );
    
    if (!targetUserMetadata) {
      try {
        
        
        // Cố gắng tìm trong Firebase Firestore trước vì đây là database chính cho users
        const usersRef = collection(db, USERS_TABLE);
        const emailQuery = query(usersRef, where("email", "==", usernameClean));
        const emailDocs = await getDocs(emailQuery);
        
        if (!emailDocs.empty) {
          const docData = emailDocs.docs[0];
          targetUserMetadata = mapUserFromDB({ id: docData.id, ...docData.data() }) as any;
        } else {
          const usernameQuery = query(usersRef, where("username", "==", usernameClean));
          const usernameDocs = await getDocs(usernameQuery);
          if (!usernameDocs.empty) {
            const docData = usernameDocs.docs[0];
            targetUserMetadata = mapUserFromDB({ id: docData.id, ...docData.data() }) as any;
          }
        }
        
        // Nếu vẫn không tìm thấy trong Firebase, thử tìm fallback trong Supabase
        if (!targetUserMetadata) {
          const { data: sbUser, error: sbError } = await supabase
            .from('users')
            .select('*')
            .or(`username.ilike."${usernameClean}",email.ilike."${usernameClean}"`)
            .maybeSingle();
          if (sbUser && !sbError) {
            targetUserMetadata = {
              id: sbUser.id,
              username: sbUser.username,
              fullName: sbUser.full_name,
              email: sbUser.email,
              role: sbUser.role,
              permissions: sbUser.permissions || [],
              createdAt: sbUser.created_at,
            } as any;
          }
        }
      } catch (e) {
        console.warn("Lấy thông tin user thất bại:", e);
      }
    }

    if (targetUserMetadata) {
      targetEmail = targetUserMetadata.email;
    } else {
      if (!usernameClean.includes('@')) {
        setLoginError('Tên đăng nhập không tồn tại trên hệ thống.');
        setLoading(false);
        return;
      }
    }

    // Mọi tài khoản đều phải được xác thực nghiêm ngặt qua Firebase Authentication.
    try {
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, loginPassword);

      // Quyền truy cập luôn được lấy theo UID do Firebase Auth xác thực,
      // không tin hồ sơ chỉ khớp username/email để tránh nhận nhầm vai trò.
      const authenticatedProfile = users.find(user => user.id === userCredential.user.uid)
        || await getUserById(userCredential.user.uid);
      
      const isIdMismatch = targetUserMetadata && targetUserMetadata.id !== userCredential.user.uid;
      const isEmailMatch = targetUserMetadata && targetUserMetadata.email.toLowerCase() === userCredential.user.email?.toLowerCase();
      
      if (!authenticatedProfile || (isIdMismatch && !isEmailMatch)) {
        await signOut(auth);
        setLoginError('Tài khoản chưa được quản trị viên kích hoạt hoặc hồ sơ đăng nhập không đồng bộ.');
        setLoading(false);
        return;
      }

      const { password, ...cleanedUser } = authenticatedProfile;
      onLoginSuccess(cleanedUser);
    } catch (authError: any) {
      console.error("Lỗi xác thực Firebase Auth:", authError.code || authError.message);
      if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        setLoginError('Mật khẩu không chính xác.');
      } else if (authError.code === 'auth/user-not-found') {
        setLoginError('Tài khoản không tồn tại hoặc chưa được kích hoạt.');
      } else if (authError.code === 'auth/operation-not-allowed') {
        setLoginError(`Firebase project “${auth.app.options.projectId}” chưa bật đăng nhập Email/Mật khẩu. Quản trị viên cần bật phương thức này trong Firebase Console.`);
      } else if (authError.code === 'auth/too-many-requests') {
        setLoginError('Tài khoản tạm thời bị giới hạn do đăng nhập sai nhiều lần. Vui lòng thử lại sau.');
      } else if (authError.code === 'auth/network-request-failed') {
        setLoginError('Không thể kết nối Firebase Authentication. Vui lòng kiểm tra mạng.');
      } else {
        setLoginError('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] w-screen flex flex-col items-center justify-center bg-slate-900 px-4 py-8 relative overflow-x-hidden overflow-y-auto" id="login-screen-wrapper">
      
      {/* Decorative ambient blurred shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
      
      <div className="w-full max-w-md my-auto bg-slate-800 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 shrink-0">
        
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
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-semibold flex flex-col gap-2.5 animate-shake">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
              {loginError.includes('Email/Mật khẩu') && (
                <div className="mt-1 p-3 bg-slate-900/80 rounded-xl text-slate-300 text-[11px] leading-relaxed border border-slate-700/60 space-y-2 font-normal">
                  <p className="font-bold text-amber-400 flex items-center gap-1">
                    <span>💡 Hướng dẫn kích hoạt cực nhanh:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                    <li>
                      Click để mở: <a 
                        href={`https://console.firebase.google.com/project/${auth.app.options.projectId}/authentication/providers`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[#9d4edd] hover:text-[#b5179e] hover:underline font-bold transition-colors"
                      >
                        Firebase Console Auth Page
                      </a>
                    </li>
                    <li>Nhấn nút <span className="font-semibold text-white">"Add new provider"</span> (Thêm nhà cung cấp mới)</li>
                    <li>Chọn <span className="font-semibold text-white">"Email/Password"</span> (Email/Mật khẩu)</li>
                    <li>Bật dòng <span className="font-semibold text-white">"Email/Password"</span> đầu tiên sang trạng thái <span className="font-semibold text-emerald-400">Enable</span></li>
                    <li>Nhấn <span className="font-semibold text-white">"Save"</span> (Lưu) để hoàn tất</li>
                    <li>Quay lại ứng dụng này và thực hiện đăng nhập!</li>
                  </ol>
                </div>
              )}
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
                autoComplete="username"
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
                autoComplete="current-password"
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
