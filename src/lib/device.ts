import { useEffect, useState } from 'react';

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
export const LAPTOP_ONLY = new Set<string>([
  'remier', 'quantitative_analysis', 'qualitative_analysis', 'edu_grade', 'ar_module', 'vr360',
  'utility_social_design', 'settings', 'permissions', 'users', 'notifications_admin',
]);
