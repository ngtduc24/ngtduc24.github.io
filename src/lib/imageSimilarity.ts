// Kiểm tra bài nộp giống nhau bằng "dấu vân tay hình ảnh" (perceptual hash), chạy ngay trên trình duyệt.
//
// Mỗi ảnh (và mỗi trang PDF) được thu nhỏ, chuyển xám rồi tạo 2 mã 64 bit:
// pHash (biến đổi DCT, bền với nén, đổi cỡ, chỉnh sáng, đổi màu nhẹ) và dHash (độ chênh sáng giữa
// các điểm kề nhau). Mỗi ảnh còn có thêm bản lật ngang và bản cắt bớt 10% viền, để bắt được bài
// chép rồi lật ảnh hay cắt viền. Hai ảnh càng ít bit khác nhau thì càng giống.
// Cách này nhận ra ảnh chép lại có chỉnh sửa, không nhận ra hai bài cùng ý tưởng nhưng vẽ khác nhau.

import { draftGet, draftSet } from './localDraft';

export interface Fingerprint { p: string; d: string; pf: string; df: string; pc: string; dc: string; h: number[] }
export interface ScanImage { key: string; studentId: string; label: string; url: string; thumb: string; fp?: Fingerprint }

const SIZE_P = 32;

// ---------------------------------------------------------------- tải ảnh
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không tải được ảnh'));
    img.src = src;
  });
}

// Ảnh trên Cloudinary: lấy bản thu nhỏ để quét nhanh, không tải ảnh gốc nặng.
export function cloudinaryThumb(url: string, width = 384, page?: number): string {
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  if (!m) return url;
  const t = [`w_${width}`, 'c_limit', 'q_70', 'f_jpg', page ? `pg_${page}` : ''].filter(Boolean).join(',');
  return `${m[1]}${t}/${m[2].replace(/\.pdf$/i, '.jpg')}`;
}

// ---------------------------------------------------------------- tạo mã
function grayPixels(src: CanvasImageSource, sw: number, sh: number, crop: number, flip: boolean, w: number, h: number): Float64Array {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  const cx = sw * crop, cy = sh * crop;
  if (flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, cx, cy, sw - 2 * cx, sh - 2 * cy, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const out = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  return out;
}

const COS: number[][] = (() => {
  const t: number[][] = [];
  for (let u = 0; u < 8; u++) { t[u] = []; for (let x = 0; x < SIZE_P; x++) t[u][x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SIZE_P)); }
  return t;
})();

function pHash(px: Float64Array): string {
  // DCT 2 chiều, chỉ cần 8x8 hệ số tần số thấp.
  const rows: number[][] = [];
  for (let y = 0; y < SIZE_P; y++) { rows[y] = []; for (let u = 0; u < 8; u++) { let s = 0; for (let x = 0; x < SIZE_P; x++) s += px[y * SIZE_P + x] * COS[u][x]; rows[y][u] = s; } }
  const coef: number[] = [];
  for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) { let s = 0; for (let y = 0; y < SIZE_P; y++) s += rows[y][u] * COS[v][y]; coef.push(s); }
  const ac = coef.slice(1);
  const med = [...ac].sort((a, b) => a - b)[Math.floor(ac.length / 2)];
  return coef.map((c, i) => (i === 0 ? '0' : c > med ? '1' : '0')).join('');
}
function dHash(px: Float64Array): string {
  let s = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s += px[y * 9 + x] > px[y * 9 + x + 1] ? '1' : '0';
  return s;
}

export function fingerprintOf(src: CanvasImageSource, sw: number, sh: number): Fingerprint {
  const p = (crop: number, flip: boolean) => pHash(grayPixels(src, sw, sh, crop, flip, SIZE_P, SIZE_P));
  const d = (crop: number, flip: boolean) => dHash(grayPixels(src, sw, sh, crop, flip, 9, 8));
  return { p: p(0, false), d: d(0, false), pf: p(0, true), df: d(0, true), pc: p(0.1, false), dc: d(0.1, false), h: colorHist(src, sw, sh) };
}

// Biểu đồ màu 4x4x4 ô (64 ô), dùng để phân biệt bài cùng ảnh mẫu nhưng tô màu khác nhau.
function colorHist(src: CanvasImageSource, sw: number, sh: number): number[] {
  const w = 48, h = Math.max(1, Math.round((48 * sh) / Math.max(1, sw)));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, sw, sh, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const bins = new Array(64).fill(0);
  for (let i = 0; i < d.length; i += 4) bins[(d[i] >> 6) * 16 + (d[i + 1] >> 6) * 4 + (d[i + 2] >> 6)]++;
  const total = w * h;
  return bins.map(v => Math.round((v / total) * 1000) / 1000);
}
export function colorSimilarity(a: Fingerprint, b: Fingerprint): number {
  if (!a.h || !b.h) return 0;
  let s = 0; for (let i = 0; i < 64; i++) s += Math.min(a.h[i], b.h[i]);
  return Math.round(Math.min(1, s) * 100);
}

const ham = (a: string, b: string) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
// Độ giống 0 đến 100%: lấy cách so khớp nhất giữa bản gốc, bản lật và bản cắt viền.
// Độ giống về bố cục, hình khối (không xét màu).
export function similarity(a: Fingerprint, b: Fingerprint): number {
  const pairs: [string, string, string, string][] = [
    [a.p, b.p, a.d, b.d], [a.pf, b.p, a.df, b.d], [a.p, b.pf, a.d, b.df],
    [a.pc, b.p, a.dc, b.d], [a.p, b.pc, a.d, b.dc], [a.pc, b.pc, a.dc, b.dc],
  ];
  let best = 0;
  for (const [p1, p2, d1, d2] of pairs) {
    // pHash có 63 bit dùng được (bỏ hệ số DC), dHash 64 bit. pHash nặng hơn vì bền hơn.
    const sp = 1 - ham(p1, p2) / 63;
    const sd = 1 - ham(d1, d2) / 64;
    best = Math.max(best, 0.65 * sp + 0.35 * sd);
  }
  // Hai ảnh khác hẳn nhau thường chỉ giống khoảng 50 đến 65%, ảnh chép lại có chỉnh sửa thường trên 85%.
  return Math.round(best * 100);
}

// ---------------------------------------------------------------- PDF
let pdfjsPromise: Promise<any> | null = null;
async function loadPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjsLib: any = await import('pdfjs-dist');
      const workerMod: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerMod.default;
      return pdfjsLib;
    })();
  }
  return pdfjsPromise;
}

const MAX_PDF_PAGES = 8;

// Tách PDF thành ảnh từng trang. PDF trên Cloudinary (loại image) lấy thẳng ảnh trang đã thu nhỏ,
// PDF khác thì tải về và dựng trang bằng pdf.js.
export async function pdfPageImages(url: string): Promise<{ thumb: string; canvas?: HTMLCanvasElement; page: number }[]> {
  if (/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)) {
    const out: { thumb: string; page: number }[] = [];
    for (let pg = 1; pg <= MAX_PDF_PAGES; pg++) {
      const thumb = cloudinaryThumb(url, 384, pg);
      try { await loadImg(thumb); out.push({ thumb, page: pg }); } catch { break; }
    }
    if (out.length) return out;
  }
  const pdfjsLib = await loadPdfjs();
  const pdf = await pdfjsLib.getDocument({ url, withCredentials: false }).promise;
  const out: { thumb: string; canvas: HTMLCanvasElement; page: number }[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, MAX_PDF_PAGES); i++) {
    const page = await pdf.getPage(i);
    const vp0 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(1, 384 / vp0.width) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    out.push({ thumb: canvas.toDataURL('image/jpeg', 0.7), canvas, page: i });
  }
  return out;
}

// ---------------------------------------------------------------- quét có lưu đệm
const CACHE_KEY = 'img_fp_cache_v2';
let memCache: Record<string, Fingerprint> | null = null;
async function cache(): Promise<Record<string, Fingerprint>> {
  if (!memCache) memCache = (await draftGet<Record<string, Fingerprint>>(CACHE_KEY)) || {};
  return memCache;
}
export async function saveCache() { if (memCache) await draftSet(CACHE_KEY, memCache); }

export async function fingerprintUrl(cacheKey: string, thumb: string, canvas?: HTMLCanvasElement): Promise<Fingerprint> {
  const c = await cache();
  if (c[cacheKey]) return c[cacheKey];
  let fp: Fingerprint;
  if (canvas) fp = fingerprintOf(canvas, canvas.width, canvas.height);
  else { const img = await loadImg(thumb); fp = fingerprintOf(img, img.naturalWidth, img.naturalHeight); }
  c[cacheKey] = fp;
  return fp;
}

// Chạy song song có giới hạn số việc cùng lúc.
export async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i); }
  });
  await Promise.all(workers);
}
