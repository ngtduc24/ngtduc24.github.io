import { supabase } from './supabase';

// Cấu hình trang đầu (landing page) và quyền mặc định cho tài khoản tự đăng ký.
// Lưu ở bảng portfolio_settings theo khoá riêng, khách chưa đăng nhập cũng đọc được.

export interface LandingBanner {
  id: string;
  image: string;
  title: string;
  desc?: string;
  link?: string;
  // Kích thước ô trong lưới: thường, ngang rộng, cao, lớn (rộng và cao).
  size?: 'normal' | 'wide' | 'tall' | 'big';
}

export interface LandingConfig {
  heroBrand?: string;      // chữ lớn đầu trang, mặc định EduGo
  heroTitle?: string;
  heroDesc?: string;
  heroImage?: string;      // ảnh nền riêng của khối đầu trang, trống thì dùng ảnh đầu trang Thư viện
  heroPosition?: string;   // vị trí lấy ảnh nền: center, top, bottom
  heroOverlay?: number;    // độ phủ trắng lên ảnh nền, 0 đến 90 (%)
  heroHeight?: 'compact' | 'normal' | 'tall';
  registerText?: string;   // chữ nút đăng ký
  loginText?: string;      // chữ nút đăng nhập
  featuresTitle?: string;  // tiêu đề phần tiện ích
  featuresDesc?: string;   // mô tả phần tiện ích
  footerText?: string;     // dòng chữ chân trang
  banners: LandingBanner[];
  // Ứng dụng tài khoản tự đăng ký được dùng ngay, admin chọn trong Cấu hình hệ thống.
  defaultApps: string[];
}

const KEY = 'edugo_landing';
const CACHE = 'edugo_landing_cache';

export const EMPTY_LANDING: LandingConfig = { banners: [], defaultApps: [] };

const str = (x: any) => (typeof x === 'string' ? x : '');
const normalize = (v: any): LandingConfig => ({
  heroBrand: str(v?.heroBrand),
  heroTitle: str(v?.heroTitle),
  heroDesc: str(v?.heroDesc),
  heroImage: str(v?.heroImage),
  heroPosition: str(v?.heroPosition) || 'center',
  heroOverlay: typeof v?.heroOverlay === 'number' ? Math.max(0, Math.min(90, v.heroOverlay)) : 45,
  heroHeight: (['compact', 'normal', 'tall'].includes(v?.heroHeight) ? v.heroHeight : 'normal'),
  registerText: str(v?.registerText),
  loginText: str(v?.loginText),
  featuresTitle: str(v?.featuresTitle),
  featuresDesc: str(v?.featuresDesc),
  footerText: str(v?.footerText),
  banners: Array.isArray(v?.banners) ? v.banners.filter((b: any) => b && b.id) : [],
  defaultApps: Array.isArray(v?.defaultApps) ? v.defaultApps.filter((x: any) => typeof x === 'string') : [],
});

// Bản lưu trên máy để trang đầu hiện ngay, không chờ mạng.
export function getCachedLanding(): LandingConfig {
  try { const raw = localStorage.getItem(CACHE); if (raw) return normalize(JSON.parse(raw)); } catch { /* bỏ qua */ }
  return EMPTY_LANDING;
}

export async function getLandingConfig(): Promise<LandingConfig> {
  try {
    const { data, error } = await supabase.from('portfolio_settings').select('data').eq('key', KEY).maybeSingle();
    if (error) throw error;
    const cfg = normalize(data?.data || {});
    try { localStorage.setItem(CACHE, JSON.stringify(cfg)); } catch { /* bỏ qua */ }
    return cfg;
  } catch {
    return getCachedLanding();
  }
}

export async function saveLandingConfig(cfg: LandingConfig): Promise<void> {
  const clean = normalize(cfg);
  const { error } = await supabase.from('portfolio_settings').upsert({ key: KEY, data: clean });
  if (error) throw error;
  try { localStorage.setItem(CACHE, JSON.stringify(clean)); } catch { /* bỏ qua */ }
}

export const newBannerId = () => `bn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
