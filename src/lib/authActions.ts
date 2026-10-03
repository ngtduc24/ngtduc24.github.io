import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { getUserById, USERS_TABLE, mapUserFromDB } from './data';
import { supabase } from './supabase';
import type { UserAccount } from '../types';

// Đăng nhập, đăng ký, quên mật khẩu dùng chung cho trang đăng nhập máy tính và màn chào điện thoại.
// Lỗi trả về bằng câu tiếng Việt để hiện ngay dưới ô nhập, không dùng hộp thông báo của trình duyệt.

export class AuthMessage extends Error {
  firebaseSetup?: boolean; // lỗi do Firebase chưa bật đăng nhập Email/Mật khẩu, trang máy tính hiện thêm hướng dẫn
}
const fail = (msg: string, setup = false) => { const e = new AuthMessage(msg); e.firebaseSetup = setup; return e; };

export async function loginWithPassword(users: UserAccount[], username: string, password: string): Promise<UserAccount> {
  const usernameClean = username.trim().toLowerCase();
  // Tìm email của người dùng nếu họ đăng nhập bằng tên người dùng
  let targetEmail = usernameClean;
  let targetUserMetadata = users.find(u => u.username.toLowerCase() === usernameClean || u.email.toLowerCase() === usernameClean);

  if (!targetUserMetadata) {
    try {
      // Tìm trong Firebase Firestore trước vì đây là database chính cho users
      const usersRef = collection(db, USERS_TABLE);
      const emailDocs = await getDocs(query(usersRef, where('email', '==', usernameClean)));
      if (!emailDocs.empty) {
        const d = emailDocs.docs[0];
        targetUserMetadata = mapUserFromDB({ id: d.id, ...d.data() }) as any;
      } else {
        const usernameDocs = await getDocs(query(usersRef, where('username', '==', usernameClean)));
        if (!usernameDocs.empty) {
          const d = usernameDocs.docs[0];
          targetUserMetadata = mapUserFromDB({ id: d.id, ...d.data() }) as any;
        }
      }
      // Không thấy trong Firebase thì thử tìm trong Supabase
      if (!targetUserMetadata) {
        const { data: sbUser, error: sbError } = await supabase
          .from('users')
          .select('*')
          .or(`username.ilike."${usernameClean}",email.ilike."${usernameClean}"`)
          .maybeSingle();
        if (sbUser && !sbError) {
          targetUserMetadata = {
            id: sbUser.id, username: sbUser.username, fullName: sbUser.full_name, email: sbUser.email,
            role: sbUser.role, permissions: sbUser.permissions || [], createdAt: sbUser.created_at,
          } as any;
        }
      }
    } catch (e) {
      console.warn('Lấy thông tin user thất bại:', e);
    }
  }

  if (targetUserMetadata) targetEmail = targetUserMetadata.email;
  else if (!usernameClean.includes('@')) throw fail('Tên đăng nhập không tồn tại trên hệ thống.');

  // Mọi tài khoản đều phải được xác thực nghiêm ngặt qua Firebase Authentication.
  try {
    const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
    // Quyền truy cập luôn lấy theo UID do Firebase Auth xác thực, không tin hồ sơ chỉ khớp username hay email.
    const profile = users.find(u => u.id === cred.user.uid) || await getUserById(cred.user.uid);
    const isIdMismatch = targetUserMetadata && targetUserMetadata.id !== cred.user.uid;
    const isEmailMatch = targetUserMetadata && targetUserMetadata.email.toLowerCase() === cred.user.email?.toLowerCase();
    if (!profile || (isIdMismatch && !isEmailMatch)) {
      await signOut(auth);
      throw fail('Tài khoản chưa được quản trị viên kích hoạt hoặc hồ sơ đăng nhập không đồng bộ.');
    }
    const { password: _pw, ...cleaned } = profile as any;
    return cleaned as UserAccount;
  } catch (err: any) {
    if (err instanceof AuthMessage) throw err;
    console.error('Lỗi xác thực Firebase Auth:', err?.code || err?.message);
    const code = err?.code || '';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') throw fail('Mật khẩu không chính xác.');
    if (code === 'auth/user-not-found') throw fail('Tài khoản không tồn tại hoặc chưa được kích hoạt.');
    if (code === 'auth/operation-not-allowed') throw fail(`Firebase project “${auth.app.options.projectId}” chưa bật đăng nhập Email/Mật khẩu. Quản trị viên cần bật phương thức này trong Firebase Console.`, true);
    if (code === 'auth/too-many-requests') throw fail('Tài khoản tạm thời bị giới hạn do đăng nhập sai nhiều lần. Vui lòng thử lại sau.');
    if (code === 'auth/network-request-failed') throw fail('Không thể kết nối Firebase Authentication. Vui lòng kiểm tra mạng.');
    throw fail('Tên đăng nhập hoặc mật khẩu không chính xác.');
  }
}

// Tạo tài khoản mới: tài khoản Firebase, rồi hồ sơ vai trò người dùng thường, chưa có quyền riêng.
// Ứng dụng được dùng ngay là danh sách mặc định admin chọn trong Cấu hình hệ thống.
export async function registerAccount(nameRaw: string, emailRaw: string, pass: string, pass2?: string): Promise<UserAccount> {
  const name = nameRaw.trim();
  const email = emailRaw.trim().toLowerCase();
  if (name.length < 2) throw fail('Vui lòng nhập họ và tên.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Email chưa đúng định dạng.');
  if (pass.length < 6) throw fail('Mật khẩu cần ít nhất 6 ký tự.');
  if (pass2 !== undefined && pass !== pass2) throw fail('Hai lần nhập mật khẩu chưa khớp nhau.');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    try { await updateProfile(cred.user, { displayName: name }); } catch { /* bỏ qua */ }
    // Tên đăng nhập lấy theo phần trước @ của email, trùng thì thêm số phía sau.
    const base = (email.split('@')[0] || 'user').replace(/[^a-z0-9._-]/g, '').slice(0, 24) || 'user';
    let username = base;
    for (let i = 1; i < 50; i++) {
      const snap = await getDocs(query(collection(db, USERS_TABLE), where('username', '==', username)));
      if (snap.empty) break;
      username = `${base}${i + 1}`;
    }
    const profile = {
      id: cred.user.uid, username, full_name: name, email, role: 'user',
      permissions: [] as string[], self_registered: true, created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, USERS_TABLE, cred.user.uid), profile);
    return mapUserFromDB(profile);
  } catch (err: any) {
    if (err instanceof AuthMessage) throw err;
    const code = err?.code || '';
    if (code === 'auth/email-already-in-use') throw fail('Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác.');
    if (code === 'auth/weak-password') throw fail('Mật khẩu quá yếu, hãy dùng ít nhất 6 ký tự.');
    if (code === 'auth/invalid-email') throw fail('Email chưa đúng định dạng.');
    if (code === 'auth/operation-not-allowed') throw fail('Hệ thống chưa bật đăng ký bằng email. Vui lòng báo quản trị viên.');
    if (code === 'auth/network-request-failed') throw fail('Không kết nối được máy chủ. Vui lòng kiểm tra mạng.');
    throw fail('Không tạo được tài khoản. Vui lòng thử lại.');
  }
}

// Gửi thư đặt lại mật khẩu. Nhập tên đăng nhập thì tìm email tương ứng trước.
export async function sendResetMail(users: UserAccount[], input: string): Promise<string> {
  const v = input.trim().toLowerCase();
  if (!v) throw fail('Nhập email hoặc tên đăng nhập vào ô phía trên rồi bấm Quên mật khẩu.');
  let email = v;
  if (!v.includes('@')) {
    const u = users.find(x => x.username.toLowerCase() === v);
    if (u) email = u.email;
    else {
      try {
        const snap = await getDocs(query(collection(db, USERS_TABLE), where('username', '==', v)));
        if (!snap.empty) email = String((snap.docs[0].data() as any).email || '');
      } catch { /* bỏ qua */ }
    }
    if (!email.includes('@')) throw fail('Không tìm thấy tài khoản này, hãy nhập email đã đăng ký.');
  }
  try { await sendPasswordResetEmail(auth, email); }
  catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/invalid-email') throw fail('Email chưa đúng định dạng.');
    if (code === 'auth/network-request-failed') throw fail('Không kết nối được máy chủ. Vui lòng kiểm tra mạng.');
    if (code !== 'auth/user-not-found') throw fail('Chưa gửi được thư đặt lại mật khẩu. Vui lòng thử lại.');
  }
  // Không cho biết email có tài khoản hay không, tránh dò tài khoản.
  return `Nếu ${email} đã có tài khoản, thư đặt lại mật khẩu đã được gửi. Hãy mở hộp thư để đặt mật khẩu mới.`;
}
