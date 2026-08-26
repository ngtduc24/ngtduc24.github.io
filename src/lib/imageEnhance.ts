/**
 * Các hàm xử lý ảnh dùng chung cho công cụ phóng to ảnh.
 *
 * Toàn bộ phần này chạy bằng thẻ canvas ngay trên máy người dùng, không gửi ảnh đi đâu.
 */

/** Đọc ảnh và tôn trọng thông tin xoay ảnh do máy chụp ghi lại. */
export async function loadDrawable(
  file: Blob
): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Trình duyệt cũ không hỗ trợ thì quay về cách đọc thông thường bên dưới.
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () =>
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release: () => URL.revokeObjectURL(objectUrl)
      });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không đọc được tệp ảnh'));
    };
    image.src = objectUrl;
  });
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

/**
 * Thay đổi kích thước ảnh theo từng chặng thay vì kéo một lần duy nhất.
 *
 * Khi thu nhỏ, kéo thẳng từ ảnh rất lớn xuống rất nhỏ sẽ làm mất chi tiết và sinh răng
 * cưa, nên đi từng nửa một. Khi phóng to cũng vậy, nhân dần từng chặng khoảng hai lần
 * cho ảnh mượt hơn hẳn so với việc kéo thẳng tới đích.
 */
export function resampleStepwise(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  let current = makeCanvas(sourceWidth, sourceHeight);
  current.context.drawImage(source, 0, 0, current.canvas.width, current.canvas.height);

  // Thu nhỏ dần từng nửa
  while (current.canvas.width / 2 > targetWidth && current.canvas.height / 2 > targetHeight) {
    const next = makeCanvas(
      Math.max(targetWidth, Math.floor(current.canvas.width / 2)),
      Math.max(targetHeight, Math.floor(current.canvas.height / 2))
    );
    next.context.drawImage(current.canvas, 0, 0, next.canvas.width, next.canvas.height);
    current = next;
  }

  // Phóng to dần từng chặng gấp đôi
  while (current.canvas.width * 2 < targetWidth && current.canvas.height * 2 < targetHeight) {
    const next = makeCanvas(
      Math.min(targetWidth, current.canvas.width * 2),
      Math.min(targetHeight, current.canvas.height * 2)
    );
    next.context.drawImage(current.canvas, 0, 0, next.canvas.width, next.canvas.height);
    current = next;
  }

  const final = makeCanvas(targetWidth, targetHeight);
  final.context.drawImage(current.canvas, 0, 0, final.canvas.width, final.canvas.height);
  return final.canvas;
}

/**
 * Bộ lọc làm nét theo nguyên lý unsharp mask, đúng cách mà các phần mềm ảnh chuyên
 * nghiệp vẫn dùng. Ý tưởng là tạo một bản sao bị làm mờ, rồi lấy ảnh gốc trừ đi bản mờ
 * để tìm ra phần đường nét, sau đó cộng phần đường nét đó trở lại ảnh gốc.
 *
 * Phóng to ảnh luôn làm biên mềm đi, bước này bù lại đúng chỗ đó nên ảnh trông rõ hơn.
 * Cần lưu ý là nó chỉ làm nổi bật chi tiết vốn đã có, không tạo ra chi tiết mới.
 *
 * amount tính theo phần trăm, 0 nghĩa là không làm nét.
 */
export function unsharpMask(canvas: HTMLCanvasElement, amount: number, radius = 1.2): HTMLCanvasElement {
  if (amount <= 0) return canvas;

  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const width = canvas.width;
  const height = canvas.height;

  // Bản mờ được tạo bằng bộ lọc sẵn có của trình duyệt nên rất nhanh.
  const blurred = makeCanvas(width, height);
  blurred.context.filter = `blur(${radius}px)`;
  blurred.context.drawImage(canvas, 0, 0);
  blurred.context.filter = 'none';

  let original: ImageData;
  let blur: ImageData;
  try {
    original = context.getImageData(0, 0, width, height);
    blur = blurred.context.getImageData(0, 0, width, height);
  } catch {
    // Một số trường hợp ảnh khác nguồn gốc sẽ chặn việc đọc điểm ảnh, khi đó bỏ qua
    // bước làm nét thay vì để cả quá trình thất bại.
    return canvas;
  }

  const strength = amount / 100;
  const a = original.data;
  const b = blur.data;

  for (let i = 0; i < a.length; i += 4) {
    // Bỏ qua kênh trong suốt để không làm hỏng phần nền trong suốt của ảnh PNG.
    a[i] = clamp(a[i] + strength * (a[i] - b[i]));
    a[i + 1] = clamp(a[i + 1] + strength * (a[i + 1] - b[i + 1]));
    a[i + 2] = clamp(a[i + 2] + strength * (a[i + 2] - b[i + 2]));
  }

  context.putImageData(original, 0, 0);
  return canvas;
}

function clamp(value: number) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** Lót nền trắng cho ảnh khi lưu sang JPEG, vì JPEG không có nền trong suốt. */
export function flattenForJpeg(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.globalCompositeOperation = 'destination-over';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'source-over';
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve =>
    canvas.toBlob(resolve, mimeType, mimeType === 'image/png' ? undefined : quality)
  );
}

/** Các tỷ lệ khung hình mà Gemini chấp nhận cho ảnh trả về. */
const GEMINI_RATIOS: Array<{ label: string; value: number }> = [
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '5:4', value: 5 / 4 },
  { label: '4:5', value: 4 / 5 },
  { label: '21:9', value: 21 / 9 }
];

/**
 * Gemini chỉ trả ảnh theo một số tỷ lệ khung hình định sẵn, không nhận kích thước tùy ý.
 * Hàm này chọn tỷ lệ gần với ảnh gốc nhất để phần ảnh bị kéo giãn là ít nhất.
 */
export function nearestGeminiRatio(width: number, height: number): string {
  const ratio = width / height;
  let best = GEMINI_RATIOS[0];
  let bestGap = Math.abs(Math.log(ratio / best.value));
  for (const candidate of GEMINI_RATIOS) {
    const gap = Math.abs(Math.log(ratio / candidate.value));
    if (gap < bestGap) {
      best = candidate;
      bestGap = gap;
    }
  }
  return best.label;
}

/** Chọn mức phân giải Gemini vừa đủ so với kích thước đích, để không tốn hạn mức thừa. */
export function chooseGeminiSize(targetWidth: number, targetHeight: number): string {
  const longest = Math.max(targetWidth, targetHeight);
  if (longest <= 1024) return '1K';
  if (longest <= 2048) return '2K';
  return '4K';
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Không đọc được dữ liệu ảnh'));
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}
