// Nạp thư viện MindAR và A-Frame từ CDN jsdelivr, dùng chung cho module tạo AR và trình quét AR.
// Trước đây bộ biên dịch được nạp bằng dynamic import từ esm.sh, cách đó trả về bundle UMD
// nên biến Compiler thường không tồn tại và tính năng phụ thuộc hoàn toàn vào một dịch vụ bên thứ ba.

const MINDAR_VERSION = '1.2.5';
const AFRAME_VERSION = '1.5.0';
const AFRAME_EXTRAS_VERSION = '7.2.0';

const COMPILER_URL = `https://cdn.jsdelivr.net/npm/mind-ar@${MINDAR_VERSION}/dist/mindar-image.prod.js`;
const AFRAME_URL = `https://aframe.io/releases/${AFRAME_VERSION}/aframe.min.js`;
const MINDAR_AFRAME_URL = `https://cdn.jsdelivr.net/npm/mind-ar@${MINDAR_VERSION}/dist/mindar-image-aframe.prod.js`;
const AFRAME_EXTRAS_URL = `https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@${AFRAME_EXTRAS_VERSION}/dist/aframe-extras.min.js`;

const pending = new Map<string, Promise<void>>();

function loadScript(src: string, errorMessage: string): Promise<void> {
  const cached = pending.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      pending.delete(src);
      script.remove();
      reject(new Error(errorMessage));
    });
    document.head.appendChild(script);
  });

  pending.set(src, promise);
  return promise;
}

// Bộ biên dịch phải được nạp trước bản dựng dành cho A-Frame, vì cả hai cùng ghi vào window.MINDAR.
export async function loadMindARCompiler(): Promise<any> {
  const existing = (window as any).MINDAR?.IMAGE?.Compiler;
  if (existing) return existing;

  await loadScript(COMPILER_URL, 'Không tải được bộ biên dịch MindAR. Kiểm tra kết nối mạng hoặc CDN.');

  const Compiler = (window as any).MINDAR?.IMAGE?.Compiler;
  if (!Compiler) throw new Error('Bộ biên dịch MindAR không khả dụng sau khi tải.');
  return Compiler;
}

export async function loadAFrameRuntime(needsAnimationMixer = false): Promise<void> {
  await loadScript(AFRAME_URL, 'Không tải được thư viện A-Frame. Kiểm tra kết nối mạng hoặc CDN.');
  await loadScript(MINDAR_AFRAME_URL, 'Không tải được thư viện MindAR. Kiểm tra kết nối mạng hoặc CDN.');
  if (needsAnimationMixer) {
    await loadScript(AFRAME_EXTRAS_URL, 'Không tải được A-Frame Extras. Kiểm tra kết nối mạng hoặc CDN.');
  }
}

function loadImageElement(source: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);
    if (typeof source === 'string') img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Không đọc được ảnh target. Ảnh có thể bị hỏng hoặc bị chặn CORS.'));
    };
    img.src = objectUrl || (source as string);
  });
}

// Biên dịch ảnh target thành dữ liệu .mind. Nên gọi một lần lúc tạo AR target
// rồi lưu tệp kết quả lên storage, tránh biên dịch lại trên điện thoại mỗi lần quét.
export async function compileImageToMindBlob(
  source: string | File,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const Compiler = await loadMindARCompiler();
  const compiler = new Compiler();
  const img = await loadImageElement(source);

  await compiler.compileImageTargets([img], (progress: number) => {
    if (onProgress) onProgress(Math.max(0, Math.min(100, Math.round(progress))));
  });

  const buffer = await compiler.exportData();
  return new Blob([buffer], { type: 'application/octet-stream' });
}
