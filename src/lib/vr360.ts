// Mô-đun VR 360: dữ liệu dự án trên Supabase (mỗi người chỉ thấy dự án của mình, ảnh lưu
// trên Cloudinary) và các thuật toán ghép ảnh thành ảnh toàn cảnh equirectangular chạy
// hoàn toàn trên trình duyệt.
import { supabase } from './supabase';
import { getEduCtx } from './edu';
import { uploadMediaToCloudinary } from './upload';

export const VR_TABLE = 'vr_tours';

export type VRSourceType = 'cubemap' | 'grid' | 'equirect';

export interface VRTour {
  id: string;
  owner_id: string;
  owner_name?: string | null;
  title: string;
  description?: string | null;
  image_url: string;
  thumb_url?: string | null;
  source_type: VRSourceType;
  width?: number | null;
  height?: number | null;
  is_active: boolean;
  view_count?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ------------------------------ Dữ liệu ------------------------------

export async function getMyTours(): Promise<VRTour[]> {
  const ctx = getEduCtx();
  let query = supabase.from(VR_TABLE).select('*').order('created_at', { ascending: false });
  // Người dùng thường chỉ thấy dự án của chính mình, quản trị viên thấy tất cả.
  if (!ctx.isAdmin && ctx.userId) query = query.eq('owner_id', ctx.userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as VRTour[];
}

// Trang xem công khai: ai có link cũng xem được, chỉ chặn khi dự án bị tắt.
export async function getTourById(id: string): Promise<VRTour | null> {
  const { data, error } = await supabase.from(VR_TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as VRTour) || null;
}

export async function saveTour(t: Partial<VRTour>): Promise<VRTour> {
  const ctx = getEduCtx();
  const payload: any = {
    title: t.title?.trim() || 'Không gian 360',
    description: t.description ?? null,
    image_url: t.image_url,
    thumb_url: t.thumb_url ?? null,
    source_type: t.source_type || 'equirect',
    width: t.width ?? null,
    height: t.height ?? null,
    is_active: t.is_active ?? true,
    updated_at: new Date().toISOString(),
  };
  let data: any, error: any;
  if (t.id) {
    ({ data, error } = await supabase.from(VR_TABLE).update(payload).eq('id', t.id).select('*').single());
  } else {
    payload.owner_id = t.owner_id || ctx.userId;
    payload.owner_name = t.owner_name ?? null;
    ({ data, error } = await supabase.from(VR_TABLE).insert(payload).select('*').single());
  }
  if (error) throw error;
  return data as VRTour;
}

export async function deleteTour(id: string): Promise<void> {
  const { error } = await supabase.from(VR_TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function bumpTourView(id: string): Promise<void> {
  try {
    const { data } = await supabase.from(VR_TABLE).select('view_count').eq('id', id).maybeSingle();
    await supabase.from(VR_TABLE).update({ view_count: ((data as any)?.view_count || 0) + 1 }).eq('id', id);
  } catch { /* không quan trọng */ }
}

// Đưa ảnh 360 lên Cloudinary, trả về URL ảnh gốc và URL thu nhỏ (dùng transformation của Cloudinary).
export async function uploadPanorama(blob: Blob, ownerId: string): Promise<{ url: string; thumb: string }> {
  const file = new File([blob], `vr360_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
  const url = await uploadMediaToCloudinary(file, { resourceType: 'image', folder: `vr360/${ownerId}`, category: 'VR 360' });
  const thumb = /res\.cloudinary\.com\/.+\/upload\//.test(url) ? url.replace('/upload/', '/upload/w_800,q_auto,f_auto/') : url;
  return { url, thumb };
}

export function buildTourLink(id: string): string {
  return `${window.location.origin}${window.location.pathname}?vr=${id}`;
}

// ------------------------------ Xử lý ảnh ------------------------------

export function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

// Đưa ảnh vào canvas rồi lấy ImageData, thu nhỏ nếu cạnh dài vượt maxSide để tiết kiệm bộ nhớ.
export function imageToData(img: HTMLImageElement, maxSide = 2048): ImageData {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// Lấy màu tại tọa độ thực (nội suy song tuyến), ghi vào out[0..2].
function sampleBilinear(src: ImageData, x: number, y: number, out: Float32Array) {
  const w = src.width, h = src.height, d = src.data;
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4, i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  out[0] = d[i00] * w00 + d[i10] * w10 + d[i01] * w01 + d[i11] * w11;
  out[1] = d[i00 + 1] * w00 + d[i10 + 1] * w10 + d[i01 + 1] * w01 + d[i11 + 1] * w11;
  out[2] = d[i00 + 2] * w00 + d[i10 + 2] * w10 + d[i01 + 2] * w01 + d[i11 + 2] * w11;
}

export type ProgressFn = (percent: number) => void;

// Nhường quyền cho trình duyệt vẽ lại giữa các lát xử lý để thanh tiến trình không bị đứng.
const yieldFrame = () => new Promise<void>(r => setTimeout(r, 0));

export interface CubeFaces {
  front: ImageData; back: ImageData; left: ImageData; right: ImageData; top: ImageData; bottom: ImageData;
}

// Ghép 6 mặt khối thành ảnh equirectangular. Hệ trục: +Z là hướng trước, +X bên phải, +Y lên trên.
// Kinh độ 0 (tâm ảnh) nhìn về phía trước, tăng dần sang phải.
export async function cubemapToEquirect(faces: CubeFaces, outWidth = 4096, onProgress?: ProgressFn): Promise<HTMLCanvasElement> {
  const W = outWidth, H = Math.round(outWidth / 2);
  const out = new ImageData(W, H);
  const o = out.data;
  const px = new Float32Array(3);
  const rows = 64;
  for (let r = 0; r < H; r++) {
    const lat = Math.PI / 2 - ((r + 0.5) / H) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let c = 0; c < W; c++) {
      const lon = ((c + 0.5) / W) * 2 * Math.PI - Math.PI;
      const x = Math.sin(lon) * cl, y = sl, z = Math.cos(lon) * cl;
      const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
      let face: ImageData, u: number, v: number;
      if (ax >= ay && ax >= az) {
        if (x > 0) { face = faces.right; u = -z / ax; v = -y / ax; }
        else { face = faces.left; u = z / ax; v = -y / ax; }
      } else if (ay >= ax && ay >= az) {
        if (y > 0) { face = faces.top; u = x / ay; v = z / ay; }
        else { face = faces.bottom; u = x / ay; v = -z / ay; }
      } else {
        if (z > 0) { face = faces.front; u = x / az; v = -y / az; }
        else { face = faces.back; u = -x / az; v = -y / az; }
      }
      const fx = ((u + 1) / 2) * (face.width - 1);
      const fy = ((v + 1) / 2) * (face.height - 1);
      sampleBilinear(face, fx, fy, px);
      const i = (r * W + c) * 4;
      o[i] = px[0]; o[i + 1] = px[1]; o[i + 2] = px[2]; o[i + 3] = 255;
    }
    if (r % rows === 0) { onProgress?.(Math.round((r / H) * 100)); await yieldFrame(); }
  }
  onProgress?.(100);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.getContext('2d')!.putImageData(out, 0, 0);
  return canvas;
}

export interface GridImage {
  data: ImageData;
  yawDeg: number;   // góc quay ngang của máy khi chụp, 0 là hướng trước, tăng sang phải
  pitchDeg: number; // góc ngẩng, dương là ngẩng lên
  rollDeg?: number;
}

export interface GridOptions {
  hfovDeg: number;     // góc nhìn ngang của ống kính khi chụp ảnh
  outWidth?: number;
  feather?: number;    // độ mềm mép ghép, 0..1 phần bề rộng ảnh
}

// Ghép nhiều ảnh chụp theo lưới (mỗi ảnh biết góc quay ngang và góc ngẩng) thành ảnh
// equirectangular. Mỗi ảnh được coi là một camera lỗ kim có góc nhìn ngang hfov; điểm trên
// mặt cầu được chiếu ngược về từng ảnh, vùng chồng lấn được trộn theo trọng số mềm theo
// khoảng cách tới mép ảnh nên đường ghép không lộ vết.
export async function gridToEquirect(images: GridImage[], opts: GridOptions, onProgress?: ProgressFn): Promise<HTMLCanvasElement> {
  const W = opts.outWidth || 4096, H = Math.round(W / 2);
  const feather = opts.feather ?? 0.25;
  const out = new ImageData(W, H);
  const o = out.data;
  const px = new Float32Array(3);
  const hfov = (opts.hfovDeg * Math.PI) / 180;

  // Tiền tính hệ trục của từng máy ảnh trong hệ thế giới: F hướng nhìn, R bên phải, U lên trên.
  const cams = images.map(im => {
    const yaw = (im.yawDeg * Math.PI) / 180, pitch = (im.pitchDeg * Math.PI) / 180, roll = ((im.rollDeg || 0) * Math.PI) / 180;
    const F = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const R0 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    // U = F × R0
    const U0 = [F[1] * R0[2] - F[2] * R0[1], F[2] * R0[0] - F[0] * R0[2], F[0] * R0[1] - F[1] * R0[0]];
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const R = [R0[0] * cr + U0[0] * sr, R0[1] * cr + U0[1] * sr, R0[2] * cr + U0[2] * sr];
    const U = [U0[0] * cr - R0[0] * sr, U0[1] * cr - R0[1] * sr, U0[2] * cr - R0[2] * sr];
    const f = (im.data.width / 2) / Math.tan(hfov / 2);
    const diag = Math.hypot(im.data.width / 2, im.data.height / 2);
    const cosLimit = Math.cos(Math.atan(diag / f) + 0.02);
    return { im, f, fx: F[0], fy: F[1], fz: F[2], cosLimit, rx: R, ry: U };
  });

  const acc = new Float32Array(3);
  for (let r = 0; r < H; r++) {
    const lat = Math.PI / 2 - ((r + 0.5) / H) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let c = 0; c < W; c++) {
      const lon = ((c + 0.5) / W) * 2 * Math.PI - Math.PI;
      const dx = Math.sin(lon) * cl, dy = sl, dz = Math.cos(lon) * cl;
      let wsum = 0; acc[0] = 0; acc[1] = 0; acc[2] = 0;
      for (let k = 0; k < cams.length; k++) {
        const cam = cams[k];
        const dot = dx * cam.fx + dy * cam.fy + dz * cam.fz;
        if (dot < cam.cosLimit) continue;
        // Tọa độ trong hệ máy ảnh: chiếu d lên trục phải, lên, nhìn.
        const lx = dx * cam.rx[0] + dy * cam.rx[1] + dz * cam.rx[2];
        const ly = dx * cam.ry[0] + dy * cam.ry[1] + dz * cam.ry[2];
        const lz = dot;
        if (lz <= 0) continue;
        const iw = cam.im.data.width, ih = cam.im.data.height;
        const ix = cam.f * (lx / lz) + iw / 2;
        const iy = -cam.f * (ly / lz) + ih / 2;
        if (ix < 0 || iy < 0 || ix > iw - 1 || iy > ih - 1) continue;
        // Trọng số mềm: giảm dần khi tới gần mép để trộn mượt vùng chồng lấn.
        const ex = Math.min(ix, iw - 1 - ix) / (iw * feather);
        const ey = Math.min(iy, ih - 1 - iy) / (ih * feather);
        const wgt = Math.max(0.001, Math.min(1, ex) * Math.min(1, ey));
        sampleBilinear(cam.im.data, ix, iy, px);
        acc[0] += px[0] * wgt; acc[1] += px[1] * wgt; acc[2] += px[2] * wgt; wsum += wgt;
      }
      const i = (r * W + c) * 4;
      if (wsum > 0) { o[i] = acc[0] / wsum; o[i + 1] = acc[1] / wsum; o[i + 2] = acc[2] / wsum; o[i + 3] = 255; }
      else { o[i] = 24; o[i + 1] = 24; o[i + 2] = 28; o[i + 3] = 255; }
    }
    if (r % 32 === 0) { onProgress?.(Math.round((r / H) * 100)); await yieldFrame(); }
  }
  onProgress?.(100);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.getContext('2d')!.putImageData(out, 0, 0);
  return canvas;
}

// Chuẩn hóa ảnh 360 có sẵn: đưa về tỉ lệ 2:1, giới hạn bề rộng để nhẹ khi tải lên.
export function equirectToCanvas(img: HTMLImageElement, maxWidth = 6144): HTMLCanvasElement {
  const W = Math.min(maxWidth, img.naturalWidth);
  const H = Math.round(W / 2);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d')!.drawImage(img, 0, 0, W, H);
  return c;
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Không xuất được ảnh'))), 'image/jpeg', quality);
  });
}

// Gợi ý góc ngẩng cho từng hàng theo số hàng của lưới chụp.
export function defaultRowPitches(rows: number): number[] {
  if (rows <= 1) return [0];
  if (rows === 2) return [30, -30];
  if (rows === 3) return [50, 0, -50];
  if (rows === 4) return [65, 22, -22, -65];
  const step = 150 / (rows - 1);
  return Array.from({ length: rows }, (_, i) => Math.round(75 - i * step));
}
