import { useEffect, useState } from 'react';
import type { AppSettings } from '../types';

// Nhận biết điện thoại để dùng giao diện riêng: màn hẹp dưới 768px và màn cảm ứng (ngón tay).
// iPad và máy tính bảng rộng hơn 768px vẫn dùng giao diện máy tính.
// Người dùng có thể tự chọn giao diện máy tính ngay trên điện thoại, lưu ở máy này (khoá edugo_ui).
const QUERY = '(max-width: 767px) and (pointer: coarse)';
const PREF_KEY = 'edugo_ui';

type Pref = 'auto' | 'desktop';

function readPref(): Pref {
  try { return localStorage.getItem(PREF_KEY) === 'desktop' ? 'desktop' : 'auto'; } catch { return 'auto'; }
}

function matchPhone(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

const listeners = new Set<() => void>();

export function setUiPreference(p: Pref) {
  try { if (p === 'desktop') localStorage.setItem(PREF_KEY, 'desktop'); else localStorage.removeItem(PREF_KEY); } catch { /* bỏ qua */ }
  listeners.forEach(fn => fn());
}

// Máy này là điện thoại (dù đang chọn giao diện nào).
export function useIsPhoneDevice(): boolean {
  const [v, setV] = useState(matchPhone);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const on = () => setV(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);
  return v;
}

// Đang dùng giao diện điện thoại.
export function useIsPhone(): boolean {
  const device = useIsPhoneDevice();
  const [pref, setPref] = useState<Pref>(readPref);
  useEffect(() => {
    const fn = () => setPref(readPref());
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return device && pref !== 'desktop';
}

// Chức năng cần màn hình lớn, chuột và bàn phím. Trên điện thoại được làm mờ và đề nghị gửi sang máy tính.
// Mặc định khi admin chưa chọn trong Cấu hình hệ thống, mục Cài đặt chức năng.
export const LAPTOP_ONLY = new Set<string>([
  'remier', 'quantitative_analysis', 'qualitative_analysis', 'edu_grade', 'ar_module', 'vr360',
  'utility_social_design', 'settings', 'permissions', 'users', 'notifications_admin',
]);

// Cách dùng trên điện thoại của 1 chức năng: dùng đầy đủ, chỉ dùng trên máy tính (làm mờ, gửi sang máy tính) hoặc ẩn trên điện thoại.
export type PhoneMode = 'full' | 'laptop' | 'hidden';
export function phoneMode(id: string, settings?: AppSettings): PhoneMode {
  const v = settings?.moduleOverrides?.[id]?.phone;
  if (v === 'full' || v === 'laptop' || v === 'hidden') return v;
  return LAPTOP_ONLY.has(id) ? 'laptop' : 'full';
}
export const PHONE_MODE_LABEL: Record<PhoneMode, string> = { full: 'Điện thoại: dùng đầy đủ', laptop: 'Điện thoại: chỉ dùng trên máy tính', hidden: 'Điện thoại: ẩn' };

// ===== Cài đặt giao diện điện thoại do admin chỉnh (Cấu hình hệ thống, mục Điện thoại) =====
// Lưu chung trong cột module_overrides dưới khoá riêng __phone_ui nên không cần thêm cột mới.
export interface PhoneUi {
  bannerOn?: boolean;          // hiện băng chào đầu Trang chủ, mặc định bật
  // Thanh menu dưới kiểu kính mờ như iOS: bật tắt, độ đục của lớp trắng (0 đến 100), độ nhoè nền phía sau (px)
  navGlass?: boolean;          // mặc định bật
  navAlpha?: number;           // mặc định 62
  navBlur?: number;            // mặc định 20
  // Mọi lưới chức năng trên điện thoại (Trang chủ, Lớp học, Tất cả chức năng...) kiểu kính lỏng như iOS: chỉnh 1 chỗ, mọi lưới đổi theo
  gridGlass?: boolean;         // mặc định bật
  gridAlpha?: number;          // độ đục lớp kính, mặc định 72
  gridBlur?: number;           // độ nhoè nền phía sau, mặc định 22
  title?: string;
  desc?: string;
  titleOn?: boolean;           // hiện tiêu đề, mặc định bật
  descOn?: boolean;            // hiện mô tả, mặc định bật
  imageMode?: 'desktop' | 'custom' | 'art'; // ảnh nền Trang chủ máy tính, ảnh riêng, hay hình minh hoạ
  image?: string;
  position?: string;
  ctaOn?: boolean;             // hiện nút trên băng chào, mặc định bật
  ctaLabel?: string;
  ctaTarget?: string;          // create:<chức năng> mở thẳng màn tạo mới, open:<chức năng> mở chức năng
  // Băng giới thiệu ở trang Thông báo
  notiOn?: boolean;            // mặc định bật
  notiTitle?: string;
  notiBtn?: string;
  notiTarget?: string;         // id chức năng mở khi bấm, mặc định automatic
  notiImage?: string;          // ảnh nhỏ bên phải thay cho biểu tượng chức năng
  // Lưới chức năng ở Trang chủ điện thoại
  gridOrder?: string[];        // thứ tự admin xếp sẵn, 8 ô đầu hiện ngay
  gridLock?: string[];         // chức năng giữ cố định đúng vị trí admin xếp, không bị thói quen đẩy đi
  gridHide?: string[];         // chức năng admin ẩn khỏi Trang chủ điện thoại (vẫn có trong Tất cả chức năng)
  gridAuto?: boolean;          // tự xếp theo thói quen sử dụng, mặc định bật
  // Nút tròn trên đầu Trang chủ: admin chọn chức năng và tên cho từng ô
  acts?: Array<{ id: string; label?: string }>;
  moreOn?: boolean;            // ô cuối là nút Khác mở Tất cả chức năng, mặc định bật
  moreLabel?: string;
}
// Chức năng không đưa vào lưới Trang chủ điện thoại (đã có chỗ riêng hoặc chỉ dành cho quản trị).
export const PHONE_GRID_SKIP = new Set(['notifications', 'notifications_admin', 'users', 'permissions', 'settings']);
// 3 nút tròn trên đầu Trang chủ ưu tiên các chức năng này, nên lưới không lặp lại chúng.
export const PHONE_ACT_IDS = ['edu', 'elearning', 'edu_bank'];
// Chức năng đang nằm ở các nút tròn theo cấu hình admin (chưa chọn thì dùng mặc định).
export function phoneActIds(ui: PhoneUi): string[] {
  const n = ui.moreOn === false ? 4 : 3;
  const chosen = new Set((ui.acts || []).map(a => a?.id).filter(Boolean) as string[]);
  const pool = [...PHONE_ACT_IDS, 'slides', 'tasks', 'courses'].filter(id => !chosen.has(id));
  return Array.from({ length: n }, (_, i) => ui.acts?.[i]?.id || pool.shift() || '').filter(Boolean);
}
export const NOTI_DEFAULT = { title: 'Thử Automatic: tự gửi nhắc việc sắp đến hạn mỗi sáng', btn: 'Dùng mẫu có sẵn', target: 'automatic' };
export const PHONE_UI_KEY = '__phone_ui';
export function phoneUi(settings?: AppSettings): PhoneUi {
  return ((settings?.moduleOverrides as any)?.[PHONE_UI_KEY] || {}) as PhoneUi;
}
export const CTA_TARGETS: { value: string; label: string; need: string }[] = [
  { value: 'create:slides', label: 'Soạn bài giảng mới', need: 'slides' },
  { value: 'create:elearning', label: 'Tạo giáo trình mới', need: 'elearning' },
  { value: 'create:tasks', label: 'Tạo công việc', need: 'tasks' },
  { value: 'open:edu', label: 'Mở Lớp học', need: 'edu' },
  { value: 'open:courses', label: 'Mở Khoá học', need: 'courses' },
  { value: 'open:all_features', label: 'Xem tất cả chức năng', need: 'all_features' },
];

// Giá trị kính mờ của thanh menu dưới, gom 1 chỗ để Thanh dưới và phần Xem trước trong cài đặt dùng chung.
export function navGlassStyle(ui: PhoneUi): { cls: string; style: Record<string, string> } {
  if (ui.navGlass === false) return { cls: '', style: {} };
  const a = Math.min(100, Math.max(0, ui.navAlpha ?? 62));
  const b = Math.min(40, Math.max(0, ui.navBlur ?? 20));
  return { cls: 'glass', style: { '--gl-a': String(a / 100), '--gl-b': `${b}px` } };
}

// Biến CSS cho kính lỏng của lưới chức năng: gắn lên thẻ html để mọi lưới ở mọi màn cùng đổi theo 1 cài đặt.
export function gridGlassVars(ui: PhoneUi): { on: boolean; a: string; b: string } {
  const a = Math.min(100, Math.max(20, ui.gridAlpha ?? 72));
  const b = Math.min(40, Math.max(0, ui.gridBlur ?? 22));
  return { on: ui.gridGlass !== false, a: String(a / 100), b: `${b}px` };
}
