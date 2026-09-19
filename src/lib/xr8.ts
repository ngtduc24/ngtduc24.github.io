// Bộ nạp cho engine 8th Wall mã nguồn mở bản MIT, chỉ dùng phần Image Targets, phục vụ
// trình quét AR 2.0. Engine này bám ảnh ổn định hơn MindAR. Không cần app key, không ràng
// buộc thương mại vì là bản MIT. Phần A-Frame dùng bản 8frame của 8th Wall được lưu kèm.

const ENGINE_URL = 'https://cdn.jsdelivr.net/npm/@8thwall/engine@0.1.0/dist/xr.js';
const XREXTRAS_URL = 'https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1/dist/xrextras.js';
const LANDING_PAGE_URL = 'https://cdn.jsdelivr.net/npm/@8thwall/landing-page@1/dist/landing-page.js';
const EIGHTFRAME_URL = `${import.meta.env.BASE_URL}vendor/8frame-1.5.0.min.js`;

const LUMINANCE_HEIGHT = 640;

function injectScript(
  src: string,
  opts: { async?: boolean; attrs?: Record<string, string> } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-xr8src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute('data-loaded') === '1') resolve();
      else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Không tải được ' + src)));
      }
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-xr8src', src);
    if (opts.async) s.async = true;
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = () => {
      s.setAttribute('data-loaded', '1');
      resolve();
    };
    s.onerror = () => reject(new Error('Không tải được ' + src));
    document.head.appendChild(s);
  });
}

function waitFor(cond: () => boolean, timeoutMs: number, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (cond()) {
      resolve();
      return;
    }
    const started = Date.now();
    const iv = window.setInterval(() => {
      if (cond()) {
        window.clearInterval(iv);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        window.clearInterval(iv);
        reject(new Error('Hết thời gian chờ ' + label));
      }
    }, 100);
  });
}

// Nạp A-Frame 8frame trước để đăng ký môi trường, rồi xrextras đăng ký các thành phần A-Frame,
// engine nạp bất đồng bộ và tự phát sự kiện xrloaded, gán window.XR8.
export async function loadXR8Runtime(): Promise<void> {
  if (!(window as any).AFRAME) {
    await injectScript(EIGHTFRAME_URL);
    await waitFor(() => !!(window as any).AFRAME, 15000, 'A-Frame');
  }
  await injectScript(ENGINE_URL, { async: true, attrs: { 'data-preload-chunks': 'slam' } });
  // landing-page điều khiển luồng xin quyền camera và màn hình khởi động. Thiếu nó là một
  // nguyên nhân phổ biến khiến camera đen khi khởi động trên di động.
  await injectScript(LANDING_PAGE_URL);
  await injectScript(XREXTRAS_URL);
  await waitFor(() => !!(window as any).XR8, 20000, 'engine 8th Wall');
  await waitFor(() => !!(window as any).XRExtras, 20000, 'thư viện xrextras');
}

export interface ImageTargetJSON {
  imagePath: string;
  metadata: null;
  name: string;
  type: 'PLANAR';
  properties: {
    top: number;
    left: number;
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    isRotated: boolean;
  };
  resources: {
    originalImage: string;
    croppedImage: string;
    thumbnailImage: string;
    luminanceImage: string;
  };
  created: number;
  updated: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không tải được ảnh target: ' + url));
    img.src = url;
  });
}

// Tạo dữ liệu image target theo đúng định dạng công cụ image-target-cli của 8th Wall sinh ra,
// nhưng chạy hẳn trên trình duyệt. Ảnh luminance là ảnh xám cao 640, engine tự trích đặc trưng
// từ ảnh này lúc chạy. Nhờ vậy các AR target cũ tự dùng lại được, không cần tải lên lại.
export async function buildImageTargetData(imageUrl: string, name: string): Promise<ImageTargetJSON> {
  const img = await loadImage(imageUrl);
  const ow = img.naturalWidth || img.width;
  const oh = img.naturalHeight || img.height;

  let imagePath = imageUrl;
  try {
    const lh = LUMINANCE_HEIGHT;
    const lw = Math.max(1, Math.round(ow * (lh / oh)));
    const canvas = document.createElement('canvas');
    canvas.width = lw;
    canvas.height = lh;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      (ctx as any).imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, lw, lh);
      const imgData = ctx.getImageData(0, 0, lw, lh);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
        d[i] = g;
        d[i + 1] = g;
        d[i + 2] = g;
      }
      ctx.putImageData(imgData, 0, 0);
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), 'image/jpeg', 0.92),
      );
      if (blob) imagePath = URL.createObjectURL(blob);
    }
  } catch (e) {
    // Ảnh chặn đọc pixel do CORS. Lùi về dùng thẳng ảnh gốc, engine tự xử lý.
    console.warn('Không tạo được ảnh luminance, dùng ảnh gốc:', e);
    imagePath = imageUrl;
  }

  return {
    imagePath,
    metadata: null,
    name,
    type: 'PLANAR',
    properties: {
      top: 0,
      left: 0,
      width: ow,
      height: oh,
      originalWidth: ow,
      originalHeight: oh,
      isRotated: false,
    },
    resources: {
      originalImage: imageUrl,
      croppedImage: imageUrl,
      thumbnailImage: imageUrl,
      luminanceImage: imagePath,
    },
    created: Date.now(),
    updated: Date.now(),
  };
}
