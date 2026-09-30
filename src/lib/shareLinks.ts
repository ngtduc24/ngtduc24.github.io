// Link chia sẻ dạng đường dẫn gọn /<thư mục>/<mã>/ cho mọi trang công khai.
//
// Zalo, Facebook, Messenger chỉ đọc HTML tĩnh, không chạy JavaScript, nên mỗi nội dung chia sẻ
// có một trang tĩnh riêng (scripts/prerender-share.mjs sinh lúc build) chứa tên, mô tả, ảnh bìa.
// Trang tĩnh đó chuyển người xem vào ứng dụng bằng địa chỉ dạng ?tham_số=mã, rồi ứng dụng đổi
// thanh địa chỉ về lại dạng gọn. Nhờ vậy ai chép link ở đâu (nút sao chép hay thanh địa chỉ)
// cũng được link có khung xem trước.

export const SHARE_FOLDERS = {
  bt: 'bt',       // bài tập trong ngân hàng
  elview: 'bg',   // bài giảng E-Learning công khai
  elesson: 'hl',  // bài giảng giao cho lớp (sinh viên nhập MSSV)
  quiz: 'tn',     // đề trắc nghiệm
  vr: 'vr',       // VR 360
  ar: 'ar',       // AR
  edu: 'nb',      // link nộp bài tập của lớp (tracuu.html)
} as const;
export type ShareKind = keyof typeof SHARE_FOLDERS;

const ID_RE = '([A-Za-z0-9_-]{1,120})';

export function prettyShareUrl(kind: ShareKind, id: string): string {
  return `${window.location.origin}/${SHARE_FOLDERS[kind]}/${encodeURIComponent(id)}/`;
}

// Đọc mã của trang công khai từ ?tham_số=mã hoặc từ đường dẫn gọn /<thư mục>/<mã>/.
export function publicParam(kind: ShareKind): string | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search).get(kind);
  if (q) return q;
  const m = window.location.pathname.match(new RegExp(`^/${SHARE_FOLDERS[kind]}/${ID_RE}/?$`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Đổi thanh địa chỉ ?tham_số=mã về dạng gọn. Chỉ đổi khi địa chỉ không kèm tham số nào khác
// (ví dụ link làm trắc nghiệm của học viên khoá học có thêm learner, name thì giữ nguyên).
export function normalizeShareAddress(kinds: ShareKind[] = Object.keys(SHARE_FOLDERS) as ShareKind[]) {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams(window.location.search);
  const keys = Array.from(sp.keys());
  if (keys.length !== 1) return;
  const kind = kinds.find(k => k === keys[0]);
  if (!kind) return;
  const id = sp.get(kind) || '';
  if (!new RegExp(`^${ID_RE}$`).test(id)) return;
  try { window.history.replaceState(window.history.state, '', `/${SHARE_FOLDERS[kind]}/${encodeURIComponent(id)}/${window.location.hash}`); } catch { /* bỏ qua */ }
}
