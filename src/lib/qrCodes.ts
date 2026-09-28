// Tạo mã QR cá nhân.
//
// Mã QR được dựng ngay trên trình duyệt bằng thư viện qrcode (không gửi link cho dịch vụ bên ngoài).
// Danh sách mã lưu ở Supabase, bảng private_items (kind = 'qr', xem PRIVATE_ITEMS.sql), qua Edge
// Function private-items: xác thực đăng nhập Firebase, chỉ trả dữ liệu đúng chủ, mã hoá trước khi lưu.
// Quản trị viên và người dùng khác không xem được mã QR của người khác.
import QRCode from 'qrcode';
import { auth } from './firebase';

export type QrLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrData {
  title: string;
  url: string;
  note: string;
  fg: string;       // màu mã
  bg: string;       // màu nền
  level: QrLevel;   // mức sửa lỗi
  margin: number;   // viền trắng (số ô)
}

export interface QrItem { id: string; data: QrData; createdAt?: number; updatedAt?: number }

export const emptyQr = (): QrData => ({ title: '', url: '', note: '', fg: '#000000', bg: '#ffffff', level: 'M', margin: 2 });

async function call(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  try { await (auth as any).authStateReady?.(); } catch { /* bỏ qua */ }
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.');
  const token = await user.getIdToken();
  const base = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const r = await fetch(`${base}/functions/v1/private-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: 'qr', action, ...payload }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Lỗi máy chủ (${r.status})`);
  return j;
}

const ms = (v: any) => (v ? Date.parse(v) : undefined);
const norm = (d: any): QrData => ({ ...emptyQr(), ...(d || {}) });

export async function listQrs(): Promise<QrItem[]> {
  const j = await call('list');
  return (j.items || []).map((x: any) => ({ id: x.id, data: norm(x.data), createdAt: ms(x.createdAt), updatedAt: ms(x.updatedAt) }));
}
export async function createQr(data: QrData): Promise<QrItem> {
  const j = await call('create', { data });
  return { id: j.id, data, createdAt: ms(j.createdAt), updatedAt: ms(j.updatedAt) };
}
export async function updateQr(id: string, data: QrData): Promise<number | undefined> {
  const j = await call('update', { id, data });
  return ms(j.updatedAt);
}
export async function deleteQr(id: string): Promise<void> { await call('delete', { id }); }

// Chuẩn hoá link: thiếu giao thức thì thêm https://
export function normalizeUrl(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  return 'https://' + s;
}
export function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(normalizeUrl(raw));
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.hostname.includes('.') || u.hostname === 'localhost';
    return true; // mailto:, tel:, zalo:... vẫn tạo QR được
  } catch { return false; }
}

const opts = (d: QrData, width: number) => ({ errorCorrectionLevel: d.level, margin: d.margin, width, color: { dark: d.fg, light: d.bg } });

export function qrDataUrl(d: QrData, width = 512): Promise<string> {
  return QRCode.toDataURL(normalizeUrl(d.url) || ' ', opts(d, width));
}
export function qrSvg(d: QrData, width = 512): Promise<string> {
  return QRCode.toString(normalizeUrl(d.url) || ' ', { ...opts(d, width), type: 'svg' });
}

function fileBase(d: QrData): string {
  const n = (d.title || 'ma_qr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return 'QR_' + n.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function download(href: string, name: string) {
  const a = document.createElement('a'); a.href = href; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}
export async function downloadPng(d: QrData, width = 1024) { download(await qrDataUrl(d, width), fileBase(d) + '.png'); }
export async function downloadSvg(d: QrData) {
  const url = URL.createObjectURL(new Blob([await qrSvg(d)], { type: 'image/svg+xml' }));
  download(url, fileBase(d) + '.svg');
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
// Chép ảnh QR vào bộ nhớ tạm để dán vào Word, Zalo, slide.
export async function copyPng(d: QrData): Promise<boolean> {
  try {
    const blob = await (await fetch(await qrDataUrl(d, 768))).blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch { return false; }
}
