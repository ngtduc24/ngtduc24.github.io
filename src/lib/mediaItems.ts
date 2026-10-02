import { db, auth } from './firebase';
import { supabase } from './supabase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Thư viện tệp đã tải lên (ảnh, video) của từng người. Mỗi người chỉ thấy tệp do chính mình tải,
// giống kho ảnh của một tài khoản mạng xã hội. Bản ghi mới lưu ở bảng Supabase media_items,
// bản ghi cũ trước đây nằm ở Firestore uploaded_images vẫn được đọc theo đúng người tải.

export const MEDIA_TABLE = 'media_items';
export const MEDIA_CHANGED_EVENT = 'media_items_changed';

export interface MediaItem {
  id: string;
  source: 'sb' | 'fs';
  url: string;
  type: 'image' | 'video' | 'raw' | string;
  bytes: number;
  category: string;
  originalFilename: string | null;
  createdAt: string | null;
  uploaderName: string;
}

export interface MediaRecordInput {
  url: string;
  publicId?: string | null;
  type?: string | null;
  format?: string | null;
  bytes?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  category?: string | null;
  originalFilename?: string | null;
}

const uid = () => auth.currentUser?.uid || null;
// Firebase khôi phục phiên đăng nhập bất đồng bộ sau khi tải trang, chờ xong rồi mới đọc uid.
const readyUid = async () => {
  try { await auth.authStateReady(); } catch { /* bỏ qua */ }
  return uid();
};

// Ghi một tệp vừa tải lên vào thư viện của người đang đăng nhập. Người chưa đăng nhập
// (ví dụ sinh viên nộp bài qua link) thì không ghi gì.
export async function recordMedia(m: MediaRecordInput): Promise<void> {
  const owner = await readyUid();
  if (!owner || !m.url || m.url.startsWith('data:')) return;
  const u = auth.currentUser;
  const { error } = await supabase.from(MEDIA_TABLE).insert({
    owner_id: owner,
    owner_name: u?.displayName || u?.email?.split('@')[0] || null,
    url: m.url,
    public_id: m.publicId || null,
    type: m.type || 'image',
    format: m.format || null,
    bytes: m.bytes || 0,
    width: m.width || null,
    height: m.height || null,
    duration: m.duration || null,
    category: m.category || 'Chung',
    original_filename: m.originalFilename || null,
  });
  if (error) { console.warn('Không ghi được tệp vào thư viện:', error.message); return; }
  try { window.dispatchEvent(new Event(MEDIA_CHANGED_EVENT)); } catch { /* bỏ qua */ }
}

const detectType = (url: string, t?: string) => {
  if (t && t !== 'auto') return t;
  const u = (url || '').toLowerCase();
  return u.includes('/video/upload/') || /\.(mp4|webm|mov|avi)(\?|$)/.test(u) ? 'video' : 'image';
};

// Danh sách tệp của chính người đang đăng nhập, mới nhất trước.
export async function listMyMedia(): Promise<MediaItem[]> {
  const owner = await readyUid();
  if (!owner) return [];
  const out = new Map<string, MediaItem>();
  const [sb, fs] = await Promise.allSettled([
    supabase.from(MEDIA_TABLE).select('*').eq('owner_id', owner).order('created_at', { ascending: false }),
    getDocs(query(collection(db, 'uploaded_images'), where('uploaderId', '==', owner))),
  ]);
  if (sb.status === 'fulfilled' && !sb.value.error) {
    (sb.value.data || []).forEach((r: any) => {
      if (!r.url || out.has(r.url)) return;
      out.set(r.url, { id: r.id, source: 'sb', url: r.url, type: detectType(r.url, r.type), bytes: Number(r.bytes) || 0, category: r.category || 'Chung', originalFilename: r.original_filename, createdAt: r.created_at, uploaderName: r.owner_name || '' });
    });
  }
  if (fs.status === 'fulfilled') {
    fs.value.docs.forEach(d => {
      const v = d.data() as any;
      if (!v.url || out.has(v.url)) return;
      out.set(v.url, { id: d.id, source: 'fs', url: v.url, type: detectType(v.url, v.type), bytes: Number(v.bytes) || 0, category: v.category || 'Chung', originalFilename: v.originalFilename || null, createdAt: v.uploadedAt?.toDate?.()?.toISOString?.() || null, uploaderName: v.uploaderName || '' });
    });
  }
  return Array.from(out.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

// Xoá hẳn tệp trên Cloudinary (giải phóng dung lượng) qua Edge Function media-delete.
// Hàm chỉ xoá tệp do chính người gọi tải lên. Trả về các link đã xoá được.
export async function destroyMedia(urls: string[]): Promise<{ deleted: string[]; skipped: string[] }> {
  const list = Array.from(new Set(urls.filter(u => /^https?:\/\/res\.cloudinary\.com\//.test(u || ''))));
  const out = { deleted: [] as string[], skipped: [] as string[] };
  if (!list.length) return out;
  try { await auth.authStateReady(); } catch { /* bỏ qua */ }
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.');
  const base = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  for (let i = 0; i < list.length; i += 100) {
    const token = await user.getIdToken();
    const r = await fetch(`${base}/functions/v1/media-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ urls: list.slice(i, i + 100) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || `Lỗi máy chủ (${r.status})`);
    out.deleted.push(...(j.deleted || []));
    out.skipped.push(...(j.skipped || []));
  }
  try { window.dispatchEvent(new Event(MEDIA_CHANGED_EVENT)); } catch { /* bỏ qua */ }
  return out;
}

export async function deleteMyMedia(item: MediaItem): Promise<void> {
  const owner = await readyUid();
  if (!owner) return;
  // Ưu tiên xoá hẳn tệp trên Cloudinary, hàm sẽ dọn luôn bản ghi.
  try {
    const r = await destroyMedia([item.url]);
    if (r.deleted.includes(item.url)) return;
  } catch (e) {
    console.warn('Chưa xoá được tệp trên Cloudinary, chỉ xoá bản ghi:', e);
  }
  if (item.source === 'sb') {
    const { error } = await supabase.from(MEDIA_TABLE).delete().eq('id', item.id).eq('owner_id', owner);
    if (error) throw error;
  } else {
    await deleteDoc(doc(db, 'uploaded_images', item.id));
  }
  try { window.dispatchEvent(new Event(MEDIA_CHANGED_EVENT)); } catch { /* bỏ qua */ }
}
