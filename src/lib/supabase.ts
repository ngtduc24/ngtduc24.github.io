import { createClient } from '@supabase/supabase-js';

const cleanEnvVar = (value: string | undefined | null) => {
  if (!value) return '';
  let cleaned = value.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  return cleaned;
};

let localUrl = localStorage.getItem('local_supabase_url');
let localKey = localStorage.getItem('local_supabase_key');

let supabaseUrl = cleanEnvVar(localUrl || import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnvVar(localKey || import.meta.env.VITE_SUPABASE_ANON_KEY);

if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.slice(0, -9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.slice(0, -8);
}

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

// Gắn Firebase ID token vào mọi truy vấn Supabase.
// Hệ thống xác thực người dùng bằng Firebase, còn Supabase được khai báo Firebase
// là nhà cung cấp xác thực bên thứ ba, nhờ vậy policy RLS mới phân biệt được
// khách vãng lai với tài khoản đã đăng nhập. Khi chưa đăng nhập thì trả về null
// và thư viện tự dùng khóa công khai, các trang công khai vẫn đọc dữ liệu bình thường.
// Dùng dynamic import để tránh phụ thuộc vòng giữa hai tệp khởi tạo.
const getFirebaseAccessToken = async (): Promise<string | null> => {
  try {
    const { auth } = await import('./firebase');
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.warn('Không lấy được Firebase ID token cho Supabase:', error);
    return null;
  }
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  { accessToken: getFirebaseAccessToken },
);
