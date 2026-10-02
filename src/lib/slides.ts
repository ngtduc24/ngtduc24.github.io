import { supabase } from './supabase';
import { getEduCtx } from './edu';

// Bài giảng trình chiếu (giống Google Slides, Canva).
// Mỗi bài giảng lưu ở bảng portfolio_settings với khoá deck:<chủ>:<mã>, không cần tạo bảng mới.
// Link chia sẻ công khai: khoá deck_share:<mã chia sẻ> trỏ về khoá bài giảng.
// Người cộng tác dùng bảng collaborators (loại slide_deck) với 3 mức Xem, Chỉnh sửa, Quản lý.

export const SLIDE_W = 1280;
export const SLIDE_H = 720;

export type ShapeKind = 'rect' | 'round' | 'ellipse' | 'triangle' | 'diamond' | 'star' | 'line' | 'arrow' | 'pentagon' | 'hexagon';

export interface SlideEl {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number; y: number; w: number; h: number;
  rot?: number;
  opacity?: number;
  locked?: boolean;
  // Chữ
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  list?: boolean;
  bg?: string;
  // Ảnh
  src?: string;
  fit?: 'cover' | 'contain';
  radius?: number;
  // Hình
  shape?: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface SlideBg { color?: string; gradient?: string; image?: string }
export interface Slide { id: string; bg: SlideBg; els: SlideEl[]; notes?: string }

export interface Deck {
  id: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  deletedAt?: string | null;
  shareToken?: string | null;
  shareOn?: boolean;
}

export interface DeckSummary {
  id: string; ownerId: string; ownerName?: string; title: string; updatedAt: string; first?: Slide; count: number;
  role?: 'owner' | 'view' | 'edit' | 'manage';
}

const T = 'portfolio_settings';
const me = () => getEduCtx().userId;
export const deckKey = (owner: string, id: string) => `deck:${owner}:${id}`;
export const uid = (p = 'e') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ===== Mẫu trang =====
export const DEFAULT_FONT = 'Be Vietnam Pro';

export function textEl(p: Partial<SlideEl>): SlideEl {
  return { id: uid(), type: 'text', x: 120, y: 120, w: 1040, h: 80, text: 'Nhập nội dung', fontFamily: DEFAULT_FONT, fontSize: 32, color: '#1e293b', align: 'left', lineHeight: 1.3, ...p };
}

export type LayoutId = 'title' | 'title_content' | 'two_cols' | 'section' | 'image_left' | 'blank' | 'quote' | 'big_number';
export const LAYOUTS: Array<{ id: LayoutId; label: string }> = [
  { id: 'title', label: 'Trang bìa' },
  { id: 'title_content', label: 'Tiêu đề và nội dung' },
  { id: 'two_cols', label: 'Hai cột' },
  { id: 'image_left', label: 'Ảnh và chữ' },
  { id: 'section', label: 'Mở đầu chương' },
  { id: 'quote', label: 'Trích dẫn' },
  { id: 'big_number', label: 'Con số nổi bật' },
  { id: 'blank', label: 'Trang trống' },
];

export function makeSlide(layout: LayoutId = 'title_content', bg: SlideBg = { color: '#ffffff' }): Slide {
  const s: Slide = { id: uid('s'), bg, els: [] };
  const H = (t: string, p: Partial<SlideEl> = {}) => textEl({ text: t, fontSize: 56, bold: true, color: '#0f172a', ...p });
  switch (layout) {
    case 'title':
      s.els = [H('Tên bài giảng', { x: 120, y: 250, w: 1040, h: 90, fontSize: 72, align: 'center' }),
        textEl({ text: 'Giảng viên, môn học, ngày giảng', x: 240, y: 370, w: 800, h: 50, fontSize: 28, color: '#475569', align: 'center' })];
      break;
    case 'title_content':
      s.els = [H('Tiêu đề trang', { x: 80, y: 60, w: 1120, h: 80, fontSize: 48 }),
        textEl({ text: 'Ý thứ nhất\nÝ thứ hai\nÝ thứ ba', list: true, x: 80, y: 170, w: 1120, h: 400, fontSize: 30, lineHeight: 1.6 })];
      break;
    case 'two_cols':
      s.els = [H('Tiêu đề trang', { x: 80, y: 60, w: 1120, h: 80, fontSize: 48 }),
        textEl({ text: 'Cột trái\nNội dung', list: true, x: 80, y: 180, w: 540, h: 380, fontSize: 28, lineHeight: 1.6 }),
        textEl({ text: 'Cột phải\nNội dung', list: true, x: 660, y: 180, w: 540, h: 380, fontSize: 28, lineHeight: 1.6 })];
      break;
    case 'image_left':
      s.els = [{ id: uid(), type: 'shape', shape: 'rect', x: 0, y: 0, w: 600, h: 720, fill: '#e2e8f0' },
        textEl({ text: 'Bấm Tải lên hoặc Thư viện để thay ảnh', x: 60, y: 330, w: 480, h: 60, fontSize: 22, color: '#64748b', align: 'center' }),
        H('Tiêu đề', { x: 660, y: 160, w: 560, h: 80, fontSize: 48 }),
        textEl({ text: 'Mô tả ngắn cho hình ảnh bên trái.', x: 660, y: 270, w: 560, h: 200, fontSize: 28, lineHeight: 1.5 })];
      break;
    case 'section':
      s.bg = { gradient: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#db2777 100%)' };
      s.els = [textEl({ text: 'Chương 1', x: 120, y: 240, w: 1040, h: 50, fontSize: 30, color: '#e0e7ff', align: 'center' }),
        H('Tên chương', { x: 120, y: 300, w: 1040, h: 100, fontSize: 80, color: '#ffffff', align: 'center' })];
      break;
    case 'quote':
      s.els = [textEl({ text: '"', x: 100, y: 80, w: 200, h: 200, fontSize: 200, color: '#c7d2fe', fontFamily: 'Playfair Display' }),
        textEl({ text: 'Câu trích dẫn hay câu nói đáng nhớ đặt ở đây.', x: 200, y: 260, w: 880, h: 160, fontSize: 44, italic: true, align: 'center', fontFamily: 'Playfair Display', lineHeight: 1.4 }),
        textEl({ text: 'Tên tác giả', x: 200, y: 460, w: 880, h: 50, fontSize: 26, color: '#64748b', align: 'center' })];
      break;
    case 'big_number':
      s.els = [H('85%', { x: 120, y: 200, w: 1040, h: 200, fontSize: 180, color: '#4f46e5', align: 'center' }),
        textEl({ text: 'Giải thích ngắn cho con số', x: 240, y: 430, w: 800, h: 60, fontSize: 32, color: '#475569', align: 'center' })];
      break;
    default:
      break;
  }
  return s;
}

export const BG_SWATCHES = ['#ffffff', '#f8fafc', '#f1f5f9', '#0f172a', '#1e293b', '#fef3c7', '#fee2e2', '#dcfce7', '#dbeafe', '#ede9fe', '#fce7f3', '#ecfeff'];
export const GRADIENTS = [
  'linear-gradient(135deg,#f97316 0%,#fbcfe8 45%,#bae6fd 100%)',
  'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#db2777 100%)',
  'linear-gradient(135deg,#0ea5e9 0%,#22d3ee 50%,#a7f3d0 100%)',
  'linear-gradient(135deg,#10b981 0%,#84cc16 100%)',
  'linear-gradient(135deg,#0f172a 0%,#334155 100%)',
  'linear-gradient(135deg,#fde68a 0%,#fca5a5 100%)',
  'linear-gradient(160deg,#ffffff 0%,#e0e7ff 100%)',
  'linear-gradient(160deg,#fff7ed 0%,#ffedd5 50%,#fed7aa 100%)',
];

// ===== Đọc ghi =====
function fromRow(key: string, d: any): Deck {
  const [, owner, id] = key.split(':');
  return {
    id, ownerId: d.ownerId || owner, ownerName: d.ownerName, title: d.title || 'Bài giảng không tên',
    slides: Array.isArray(d.slides) && d.slides.length ? d.slides : [makeSlide('title')],
    createdAt: d.createdAt || new Date().toISOString(), updatedAt: d.updatedAt || new Date().toISOString(), updatedBy: d.updatedBy,
    deletedAt: d.deletedAt || null, shareToken: d.shareToken || null, shareOn: !!d.shareOn,
  };
}
const toData = (d: Deck) => ({
  ownerId: d.ownerId, ownerName: d.ownerName || '', title: d.title, slides: d.slides, createdAt: d.createdAt,
  updatedAt: d.updatedAt, updatedBy: d.updatedBy || '', deletedAt: d.deletedAt || null, shareToken: d.shareToken || null, shareOn: !!d.shareOn,
});

// Danh sách bài giảng của mình (chỉ lấy trang đầu để vẽ ảnh thu nhỏ).
export async function listMyDecks(): Promise<DeckSummary[]> {
  const owner = me();
  if (!owner) return [];
  const { data, error } = await supabase.from(T)
    .select('key, title:data->>title, updatedAt:data->>updatedAt, deletedAt:data->>deletedAt, first:data->slides->0, count:data->slides')
    .like('key', `deck:${owner}:%`);
  if (error) throw error;
  return (data || []).filter((r: any) => !r.deletedAt).map((r: any) => ({
    id: String(r.key).split(':')[2], ownerId: owner, title: r.title || 'Bài giảng không tên', updatedAt: r.updatedAt || '',
    first: r.first || undefined, count: Array.isArray(r.count) ? r.count.length : 0, role: 'owner' as const,
  })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// Bài giảng người khác thêm mình vào cộng tác.
export async function listSharedDecks(): Promise<DeckSummary[]> {
  const { getMyShares } = await import('./collab');
  const shares = await getMyShares('slide_deck' as any);
  if (!shares.length) return [];
  const keys = shares.map(s => deckKey(s.ownerId, s.resourceId));
  const { data, error } = await supabase.from(T)
    .select('key, title:data->>title, updatedAt:data->>updatedAt, deletedAt:data->>deletedAt, ownerName:data->>ownerName, first:data->slides->0, count:data->slides')
    .in('key', keys);
  if (error) throw error;
  const roleOf = new Map(shares.map(s => [s.resourceId, s.role]));
  return (data || []).filter((r: any) => !r.deletedAt).map((r: any) => {
    const [, owner, id] = String(r.key).split(':');
    return { id, ownerId: owner, ownerName: r.ownerName || '', title: r.title || 'Bài giảng không tên', updatedAt: r.updatedAt || '', first: r.first || undefined, count: Array.isArray(r.count) ? r.count.length : 0, role: roleOf.get(id) as any };
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDeck(ownerId: string, id: string): Promise<Deck | null> {
  const { data, error } = await supabase.from(T).select('key,data').eq('key', deckKey(ownerId, id)).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data.key, data.data || {}) : null;
}

// Tìm chủ của bài giảng theo mã (khi chỉ có mã trên địa chỉ trang).
export async function findDeckOwner(id: string): Promise<string | null> {
  const owner = me();
  if (owner) {
    const { data } = await supabase.from(T).select('key').eq('key', deckKey(owner, id)).maybeSingle();
    if (data) return owner;
  }
  const { data: c } = await supabase.from('collaborators').select('owner_id').eq('resource_type', 'slide_deck').eq('resource_id', id).limit(1);
  return c?.[0]?.owner_id || null;
}

export async function getDeckUpdatedAt(ownerId: string, id: string): Promise<string | null> {
  const { data } = await supabase.from(T).select('u:data->>updatedAt, by:data->>updatedBy').eq('key', deckKey(ownerId, id)).maybeSingle();
  return (data as any)?.u ? `${(data as any).u}|${(data as any).by || ''}` : null;
}

export async function saveDeck(d: Deck): Promise<Deck> {
  const next = { ...d, updatedAt: new Date().toISOString(), updatedBy: me() || '' };
  const { error } = await supabase.from(T).upsert({ key: deckKey(d.ownerId, d.id), data: toData(next) });
  if (error) throw error;
  if (next.shareOn && next.shareToken) {
    await supabase.from(T).upsert({ key: `deck_share:${next.shareToken}`, data: { key: deckKey(d.ownerId, d.id) } });
  }
  return next;
}

export async function createDeck(title: string, ownerName?: string, slides?: Slide[]): Promise<Deck> {
  const owner = me();
  if (!owner) throw new Error('Bạn cần đăng nhập.');
  const now = new Date().toISOString();
  const d: Deck = { id: uid('d'), ownerId: owner, ownerName, title: title || 'Bài giảng không tên', slides: slides || [makeSlide('title')], createdAt: now, updatedAt: now };
  return saveDeck(d);
}

export async function duplicateDeck(src: Deck, ownerName?: string): Promise<Deck> {
  const copy = JSON.parse(JSON.stringify(src.slides)) as Slide[];
  copy.forEach(s => { s.id = uid('s'); s.els.forEach(e => { e.id = uid(); }); });
  return createDeck(`${src.title} (bản sao)`, ownerName, copy);
}

// Xoá: chuyển vào mục Đã xoá ở trang Cá nhân (giữ 30 ngày).
export async function softDeleteDeck(d: Deck): Promise<void> {
  if (d.ownerId !== me()) throw new Error('Chỉ chủ bài giảng mới xoá được.');
  await saveDeck({ ...d, deletedAt: new Date().toISOString(), shareOn: false });
  if (d.shareToken) await supabase.from(T).delete().eq('key', `deck_share:${d.shareToken}`);
}
export async function listTrashDecks(): Promise<Array<{ id: string; title: string; deletedAt: string }>> {
  const owner = me();
  if (!owner) return [];
  const { data } = await supabase.from(T).select('key, title:data->>title, deletedAt:data->>deletedAt').like('key', `deck:${owner}:%`);
  return (data || []).filter((r: any) => r.deletedAt).map((r: any) => ({ id: String(r.key).split(':')[2], title: r.title || 'Bài giảng', deletedAt: r.deletedAt }));
}
export async function restoreDeck(id: string): Promise<void> {
  const owner = me();
  if (!owner) return;
  const d = await getDeck(owner, id);
  if (d) await saveDeck({ ...d, deletedAt: null });
}
export async function purgeDeck(id: string): Promise<void> {
  const owner = me();
  if (!owner) return;
  await supabase.from(T).delete().eq('key', deckKey(owner, id));
  await supabase.from('collaborators').delete().eq('resource_type', 'slide_deck').eq('resource_id', id);
}

// Bật tắt link xem công khai.
export async function setDeckShare(d: Deck, on: boolean): Promise<Deck> {
  const token = d.shareToken || Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const next = await saveDeck({ ...d, shareToken: token, shareOn: on });
  if (!on) await supabase.from(T).delete().eq('key', `deck_share:${token}`);
  return next;
}
export async function getDeckByShareToken(token: string): Promise<Deck | null> {
  const { data } = await supabase.from(T).select('data').eq('key', `deck_share:${token}`).maybeSingle();
  const key = (data?.data as any)?.key as string | undefined;
  if (!key) return null;
  const { data: row } = await supabase.from(T).select('key,data').eq('key', key).maybeSingle();
  if (!row) return null;
  const d = fromRow(row.key, row.data || {});
  return d.shareOn && !d.deletedAt ? d : null;
}
export const deckShareUrl = (token: string) => `${window.location.origin}/?deck=${encodeURIComponent(token)}`;
