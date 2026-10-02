import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { UserAccount } from '../types';

// Danh bạ công khai dùng chung: họ tên, tên đăng nhập, ảnh đại diện, ảnh bìa của mọi tài khoản.
// Đọc từ khoá profile:<uid> ở bảng portfolio_settings (mỗi người tự cập nhật khi đăng nhập, đổi ảnh),
// nên ai cũng thấy đúng ảnh và tên mới nhất của người khác, giống trang cá nhân mạng xã hội.
// Chỉ có thông tin công khai, không có email hay dữ liệu riêng.

export interface Person {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  avatarPos?: string;
  cover?: string;
  coverPos?: string;
  role?: string;
}

const cache = new Map<string, Person>();
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;
let loadedAt = 0;

const toPerson = (id: string, d: any): Person => ({
  id, name: d?.fullName || '', username: d?.username || '', avatar: d?.avatarUrl || '', avatarPos: d?.avatarPosition || '',
  cover: d?.coverImage || '', coverPos: d?.coverImagePosition || '', role: d?.role || '',
});
const emit = () => listeners.forEach(l => l());

export function loadPeople(force = false): Promise<void> {
  if (loading && !force) return loading;
  if (!force && Date.now() - loadedAt < 60000 && cache.size) return Promise.resolve();
  loading = (async () => {
    try {
      const { data } = await supabase.from('portfolio_settings').select('key,data').like('key', 'profile:%');
      (data || []).forEach((r: any) => {
        const id = String(r.key).slice('profile:'.length);
        const p = toPerson(id, r.data);
        const old = cache.get(id);
        cache.set(id, { ...p, name: p.name || old?.name || '' , username: p.username || old?.username });
      });
      loadedAt = Date.now();
      emit();
    } catch { /* bỏ qua */ } finally { loading = null; }
  })();
  return loading;
}

// Bổ sung tên đã biết từ chỗ khác (ví dụ tên chủ bài lưu kèm nội dung) khi danh bạ chưa có.
export function rememberName(id: string, name?: string | null) {
  if (!id || !name) return;
  const p = cache.get(id);
  if (!p) { cache.set(id, { id, name }); return; }
  if (!p.name) cache.set(id, { ...p, name });
}
// Nạp từ danh sách tài khoản đầy đủ (chỉ admin đọc được) để có tên những người chưa đăng nhập lại.
export function rememberUsers(users: UserAccount[]) {
  let changed = false;
  for (const u of users) {
    const p = cache.get(u.id);
    const next: Person = { id: u.id, name: p?.name || u.fullName || '', username: p?.username || u.username, avatar: p?.avatar || u.avatarUrl, avatarPos: p?.avatarPos || u.avatarPosition, cover: p?.cover || u.coverImage, coverPos: p?.coverPos || u.coverImagePosition, role: p?.role || u.role };
    if (JSON.stringify(p) !== JSON.stringify(next)) { cache.set(u.id, next); changed = true; }
  }
  if (changed) emit();
}
// Cập nhật ngay người đang đăng nhập (đổi ảnh xong thấy liền).
export function rememberMe(u: UserAccount) {
  cache.set(u.id, { id: u.id, name: u.fullName || '', username: u.username, avatar: u.avatarUrl, avatarPos: u.avatarPosition, cover: u.coverImage, coverPos: u.coverImagePosition, role: u.role });
  emit();
}

export function getAllPeople(): Person[] { return [...cache.values()]; }

export function getPerson(id?: string | null, fallbackName?: string | null): Person | null {
  if (!id) return fallbackName ? { id: '', name: fallbackName } : null;
  const p = cache.get(id);
  if (p) return p.name ? p : { ...p, name: fallbackName || p.name || 'Người dùng' };
  return { id, name: fallbackName || 'Người dùng' };
}

export function usePerson(id?: string | null, fallbackName?: string | null): Person | null {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(v => v + 1);
    listeners.add(l);
    loadPeople();
    return () => { listeners.delete(l); };
  }, []);
  return getPerson(id, fallbackName);
}
export function usePeopleVersion() {
  const [v, setV] = useState(0);
  useEffect(() => { const l = () => setV(x => x + 1); listeners.add(l); loadPeople(); return () => { listeners.delete(l); }; }, []);
  return v;
}

// Mở trang cá nhân của một người (App lắng nghe sự kiện này).
export function openProfile(uid: string) {
  if (!uid) return;
  const ev = new CustomEvent('app_open_profile', { detail: uid, cancelable: true });
  window.dispatchEvent(ev);
  // Trang đứng riêng (xem giáo trình, link chia sẻ...) không có khung ứng dụng thì mở hẳn trang cá nhân.
  if (!ev.defaultPrevented) window.location.href = `${window.location.origin}/?tab=nguoi-dung&uid=${encodeURIComponent(uid)}`;
}

// Màu nền chữ cái đầu cố định theo từng người.
const TONES = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#84cc16'];
export function toneOf(id: string) { let h = 0; for (const c of id || 'x') h = (h * 31 + c.charCodeAt(0)) >>> 0; return TONES[h % TONES.length]; }
export function initials(name: string) {
  const parts = (name || '?').trim().split(/\s+/);
  return (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][0] || '?').toUpperCase();
}
