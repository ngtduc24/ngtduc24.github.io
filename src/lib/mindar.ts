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

// Tệp mindar-image.prod.js là một ES module thuần, chỉ dài vài trăm byte và import tiếp các chunk khác.
// Thẻ script thường không thực thi được nó, trình duyệt báo lỗi cú pháp nhưng vẫn phát sự kiện load,
// nên window.MINDAR không bao giờ được gán. Phải nạp bằng dynamic import mới lấy được Compiler.
export async function loadMindARCompiler(): Promise<any> {
  const existing = (window as any).MINDAR?.IMAGE?.Compiler;
  if (existing) return existing;

  const moduleUrl = COMPILER_URL;
  let mod: any = null;
  try {
    mod = await import(/* @vite-ignore */ moduleUrl);
  } catch (err) {
    console.error('Lỗi nạp module MindAR:', err);
    throw new Error('Không tải được bộ biên dịch MindAR. Kiểm tra kết nối mạng hoặc CDN.');
  }

  const Compiler = mod?.Compiler || (window as any).MINDAR?.IMAGE?.Compiler;
  if (!Compiler) throw new Error('Bộ biên dịch MindAR không khả dụng sau khi tải.');
  return Compiler;
}

// Lớp Controller là lõi nhận diện và bám ảnh của MindAR, không phụ thuộc three.js hay A-Frame.
// Trình quét tự dựng scene bằng three.js của hệ thống rồi nhận ma trận vị trí target từ Controller,
// nhờ vậy dùng chung code nạp mô hình, chất liệu, ánh sáng với studio thiết kế nên khớp tuyệt đối.
export async function loadMindARController(): Promise<any> {
  const existing = (window as any).MINDAR?.IMAGE?.Controller;
  if (existing) return existing;
  let mod: any = null;
  try {
    mod = await import(/* @vite-ignore */ COMPILER_URL);
  } catch (err) {
    console.error('Lỗi nạp module MindAR:', err);
    throw new Error('Không tải được thư viện nhận diện MindAR. Kiểm tra kết nối mạng hoặc CDN.');
  }
  const Controller = mod?.Controller || (window as any).MINDAR?.IMAGE?.Controller;
  if (!Controller) throw new Error('Bộ nhận diện MindAR không khả dụng sau khi tải.');
  return Controller;
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

// Đánh giá chất lượng ảnh target dựa trên số điểm đặc trưng MindAR trích được.
// Số đo đối chiếu: ảnh nhiều chi tiết cho khoảng 340 điểm khớp và 57 điểm bám,
// poster nền chuyển sắc chỉ có chữ ở góc cho khoảng 66 điểm khớp và 9 điểm bám,
// ảnh loại sau bám rất kém, vật thể rung và nhảy vị trí.
export interface TargetQuality {
  trackingPoints: number;
  matchingPoints: number;
  level: 'good' | 'fair' | 'poor';
  message: string;
}

function gradeQuality(trackingPoints: number, matchingPoints: number): TargetQuality {
  let level: TargetQuality['level'] = 'poor';
  if (trackingPoints >= 40 && matchingPoints >= 220) level = 'good';
  else if (trackingPoints >= 22 && matchingPoints >= 120) level = 'fair';
  const message = level === 'good'
    ? 'Ảnh target tốt, nhiều chi tiết để bám, vật thể sẽ đứng vững khi quét.'
    : level === 'fair'
      ? 'Ảnh target ở mức trung bình, vẫn quét được nhưng có thể rung nhẹ. Nên thêm chi tiết, hoa văn hoặc ảnh chụp thật để bám chắc hơn.'
      : 'Ảnh target kém, quá ít chi tiết để bám (nền trơn, chuyển sắc, chữ ít). Vật thể sẽ rung, nhảy vị trí và phóng to nhỏ khi quét. Hãy dùng ảnh có nhiều chi tiết, tương phản cao, phủ kín toàn khung.';
  return { trackingPoints, matchingPoints, level, message };
}

// Biên dịch ảnh target thành dữ liệu .mind kèm đánh giá chất lượng. Nên gọi một lần lúc tạo
// AR target rồi lưu tệp kết quả lên storage, tránh biên dịch lại trên điện thoại mỗi lần quét.
export async function compileImageToMind(
  source: string | File,
  onProgress?: (percent: number) => void,
): Promise<{ blob: Blob; quality: TargetQuality }> {
  const Compiler = await loadMindARCompiler();
  const compiler = new Compiler();
  const img = await loadImageElement(source);

  const data = await compiler.compileImageTargets([img], (progress: number) => {
    if (onProgress) onProgress(Math.max(0, Math.min(100, Math.round(progress))));
  });

  let trackingPoints = 0, matchingPoints = 0;
  try {
    const d = data?.[0];
    (d?.trackingData || []).forEach((t: any) => { trackingPoints = Math.max(trackingPoints, (t.points || []).length); });
    (d?.matchingData || []).forEach((k: any) => { matchingPoints = Math.max(matchingPoints, (k.maximaPoints?.length || 0) + (k.minimaPoints?.length || 0)); });
  } catch { /* không có số liệu thì coi như chưa đánh giá */ }

  const buffer = await compiler.exportData();
  return { blob: new Blob([buffer], { type: 'application/octet-stream' }), quality: gradeQuality(trackingPoints, matchingPoints) };
}

export async function compileImageToMindBlob(
  source: string | File,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  return (await compileImageToMind(source, onProgress)).blob;
}
