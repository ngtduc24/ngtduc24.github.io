import { createClient } from '@supabase/supabase-js';

const cleanEnvVar = (val: string | undefined | null) => {
  if (!val) return '';
  // Loại bỏ khoảng trắng và các loại dấu ngoặc kép dư thừa
  return val.trim().replace(/^["']|["']$/g, '');
};

let localUrl = '';
let localKey = '';
try {
  localUrl = localStorage.getItem('custom_supabase_url') || '';
  localKey = localStorage.getItem('custom_supabase_key') || '';
} catch (e) {}

let supabaseUrl = cleanEnvVar(localUrl || import.meta.env.VITE_SUPABASE_URL);
// Loại bỏ /rest/v1 hoặc dấu gạch chéo ở cuối nếu người dùng dán nhầm
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabaseAnonKey = cleanEnvVar(localKey || import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Cấu hình Supabase chưa hoàn thiện! Hãy kiểm tra URL và Key trong Cài đặt.');
}

// Sử dụng URL hợp lệ tối thiểu để tránh lỗi "Invalid path" khi chưa cấu hình
const finalUrl = (supabaseUrl && supabaseUrl.startsWith('http')) ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey);

// Secondary client for Auth admin operations
export const authAdminClient = createClient(finalUrl, finalKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});
