// 8th Wall Engine mã nguồn mở (MIT, https://github.com/8thwall/8thwall). Từ 2026 Niantic Spatial
// đã mở mã phần khung engine kèm mô-đun Image Targets, phát hành trên npm @8thwall/engine và không
// còn cần app key hay máy chủ 8th Wall. Tệp này nạp engine từ CDN và tạo dữ liệu image target
// ngay trên trình duyệt theo đúng định dạng của công cụ @8thwall/image-target-cli.

const XR8_VERSION = '0.1.0';
const XR8_URL = `https://cdn.jsdelivr.net/npm/@8thwall/engine@${XR8_VERSION}/dist/xr.js`;

let xr8Promise: Promise<any> | null = null;

export function loadXR8(): Promise<any> {
  const w = window as any;
  if (w.XR8) return Promise.resolve(w.XR8);
  if (xr8Promise) return xr8Promise;
  xr8Promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-xr8os]`) as HTMLScriptElement | null;
    const onLoaded = () => resolve((window as any).XR8);
    window.addEventListener('xrloaded', onLoaded, { once: true });
    if (existing) return;
    const s = document.createElement('script');
    s.src = XR8_URL;
    s.async = true;
    s.crossOrigin = 'anonymous';
    // Mô-đun XrController (image targets) nằm trong chunk tên "slam" vì lý do tương thích ngược.
    s.setAttribute('data-preload-chunks', 'slam');
    s.setAttribute('data-xr8os', '1');
    s.onerror = () => { xr8Promise = null; reject(new Error('Không tải được 8th Wall Engine từ CDN. Kiểm tra kết nối mạng.')); };
    document.head.appendChild(s);
    // Phòng khi sự kiện xrloaded đã bắn trước khi ta lắng nghe.
    const poll = window.setInterval(() => { if ((window as any).XR8) { window.clearInterval(poll); resolve((window as any).XR8); } }, 200);
    window.setTimeout(() => window.clearInterval(poll), 60000);
  });
  return xr8Promise;
}

// Vùng cắt 3:4 (dọc) trên ảnh gốc, đơn vị điểm ảnh, theo đúng CropGeometry của image-target-cli.
export interface XR8Crop {
  top: number; left: number; width: number; height: number;
  isRotated: boolean; originalWidth: number; originalHeight: number;
}

export type CropAlign = 'start' | 'center' | 'end';

// Cắt mặc định của 8th Wall: khung 3:4 lớn nhất nằm trong ảnh, canh giữa (hoặc canh về 1 phía).
export function computeCrop(width: number, height: number, align: CropAlign = 'center'): XR8Crop {
  const pos = (space: number, size: number) => align === 'start' ? 0 : align === 'end' ? space - size : Math.round((space - size) / 2);
  if (width / 3 > height / 4) {
    const cw = Math.round((height * 3) / 4);
    return { left: pos(width, cw), top: 0, width: cw, height, isRotated: false, originalWidth: width, originalHeight: height };
  }
  const ch = Math.round((width * 4) / 3);
  return { left: 0, top: pos(height, ch), width, height: ch, isRotated: false, originalWidth: width, originalHeight: height };
}

export interface XR8TargetData {
  type: 'PLANAR';
  properties: XR8Crop;
  imagePath: string;
  metadata: null;
  name: string;
  resources: { originalImage: string; croppedImage: string; thumbnailImage: string; luminanceImage: string };
  created: number;
  updated: number;
}

function loadImage(source: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    if (typeof source === 'string' && !url.startsWith('blob:') && !url.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => { if (typeof source !== 'string') URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { if (typeof source !== 'string') URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh target (có thể bị chặn CORS).')); };
    img.src = url;
  });
}

// Tạo ảnh độ sáng (xám, cao 640) từ vùng cắt, đúng như image-target-cli xuất ra. Engine tự trích
// đặc trưng từ ảnh này lúc chạy nên chỉ cần ảnh xám và số liệu vùng cắt.
export async function buildLuminanceImage(source: string | File | Blob, align: CropAlign = 'center'): Promise<{ blob: Blob; crop: XR8Crop; previewUrl: string }> {
  const img = await loadImage(source);
  const W = img.naturalWidth, H = img.naturalHeight;
  const crop = computeCrop(W, H, align);
  const outH = 640, outW = Math.round((crop.width / crop.height) * outH);
  const c = document.createElement('canvas');
  c.width = outW; c.height = outH;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, crop.left, crop.top, crop.width, crop.height, 0, 0, outW, outH);
  const data = ctx.getImageData(0, 0, outW, outH);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(data, 0, 0);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Không xuất được ảnh xám'))), 'image/jpeg', 0.92));
  return { blob, crop, previewUrl: c.toDataURL('image/jpeg', 0.6) };
}

export function buildTargetData(name: string, luminanceUrl: string, crop: XR8Crop): XR8TargetData {
  const safe = (name || 'target').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return {
    type: 'PLANAR',
    properties: crop,
    imagePath: luminanceUrl,
    metadata: null,
    name: safe,
    resources: {
      originalImage: `${safe}_original.jpg`, croppedImage: `${safe}_cropped.jpg`,
      thumbnailImage: `${safe}_thumbnail.jpg`, luminanceImage: `${safe}_luminance.jpg`,
    },
    created: Date.now(),
    updated: Date.now(),
  };
}
