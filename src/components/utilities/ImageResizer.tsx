import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Image as ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react';

/**
 * Công cụ chỉnh kích thước ảnh hàng loạt.
 *
 * Toàn bộ việc xử lý diễn ra ngay trên máy người dùng bằng thẻ canvas, ảnh không
 * được gửi lên bất kỳ máy chủ nào. Nhờ vậy công cụ chạy được cả khi mạng yếu và
 * không phát sinh chi phí lưu trữ, cũng không lo lộ tư liệu chưa công bố.
 */

type ResizeMode = 'width' | 'height' | 'percent' | 'fit';
type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';

interface SourceImage {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

interface ResultImage {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
}

const FORMAT_LABELS: Array<{ value: OutputFormat; label: string; extension: string; hint: string }> = [
  { value: 'image/jpeg', label: 'JPEG', extension: 'jpg', hint: 'Dung lượng nhẹ, hợp với ảnh chụp và ảnh bìa bài giảng.' },
  { value: 'image/webp', label: 'WebP', extension: 'webp', hint: 'Nhẹ hơn JPEG ở cùng chất lượng, hợp để đưa lên web.' },
  { value: 'image/png', label: 'PNG', extension: 'png', hint: 'Giữ được nền trong suốt, hợp với logo và hình đồ họa.' }
];

const QUICK_SIZES = [3840, 1920, 1280, 800];

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const changeExtension = (name: string, extension: string) => {
  const base = name.replace(/\.[^.]+$/, '') || 'anh';
  return `${base}.${extension}`;
};

/** Đọc ảnh và tôn trọng thông tin xoay ảnh do máy chụp ghi lại. */
async function loadDrawable(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
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

/** Thu nhỏ dần từng nửa một để ảnh không bị vỡ hạt khi giảm kích thước nhiều lần. */
function drawScaled(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  let currentWidth = sourceWidth;
  let currentHeight = sourceHeight;
  let canvas = document.createElement('canvas');
  canvas.width = currentWidth;
  canvas.height = currentHeight;
  let context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh');
  context.drawImage(source, 0, 0, currentWidth, currentHeight);

  while (currentWidth / 2 > targetWidth && currentHeight / 2 > targetHeight) {
    const nextWidth = Math.max(targetWidth, Math.floor(currentWidth / 2));
    const nextHeight = Math.max(targetHeight, Math.floor(currentHeight / 2));
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextWidth;
    stepCanvas.height = nextHeight;
    const stepContext = stepCanvas.getContext('2d');
    if (!stepContext) break;
    stepContext.imageSmoothingEnabled = true;
    stepContext.imageSmoothingQuality = 'high';
    stepContext.drawImage(canvas, 0, 0, nextWidth, nextHeight);
    canvas = stepCanvas;
    context = stepContext;
    currentWidth = nextWidth;
    currentHeight = nextHeight;
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalContext = finalCanvas.getContext('2d');
  if (!finalContext) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh');
  finalContext.imageSmoothingEnabled = true;
  finalContext.imageSmoothingQuality = 'high';
  finalContext.drawImage(canvas, 0, 0, targetWidth, targetHeight);
  return finalCanvas;
}

export default function ImageResizer() {
  const [sources, setSources] = useState<SourceImage[]>([]);
  const [results, setResults] = useState<ResultImage[]>([]);
  const [mode, setMode] = useState<ResizeMode>('width');
  const [targetWidth, setTargetWidth] = useState(1920);
  const [targetHeight, setTargetHeight] = useState(1080);
  const [percent, setPercent] = useState(50);
  const [format, setFormat] = useState<OutputFormat>('image/jpeg');
  const [quality, setQuality] = useState(85);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourcesRef = useRef<SourceImage[]>([]);
  const resultsRef = useRef<ResultImage[]>([]);
  sourcesRef.current = sources;
  resultsRef.current = results;

  // Thu hồi các địa chỉ tạm khi rời khỏi chức năng để trình duyệt không giữ bộ nhớ.
  useEffect(
    () => () => {
      sourcesRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl));
      resultsRef.current.forEach(item => URL.revokeObjectURL(item.url));
    },
    []
  );

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
    if (!files.length) {
      setError('Chỉ nhận tệp ảnh, ví dụ JPG, PNG, WebP hoặc GIF.');
      return;
    }
    setError('');

    const loaded: SourceImage[] = [];
    for (const file of files) {
      try {
        const drawable = await loadDrawable(file);
        drawable.release();
        loaded.push({
          id: `${file.name}_${file.size}_${loaded.length}_${sourcesRef.current.length}`,
          file,
          previewUrl: URL.createObjectURL(file),
          width: drawable.width,
          height: drawable.height
        });
      } catch {
        setError(`Không đọc được tệp ${file.name}, có thể tệp bị hỏng.`);
      }
    }
    if (loaded.length) setSources(prev => [...prev, ...loaded]);
  }, []);

  const removeSource = (id: string) => {
    setSources(prev => {
      const target = prev.find(item => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(item => item.id !== id);
    });
  };

  const clearAll = () => {
    sources.forEach(item => URL.revokeObjectURL(item.previewUrl));
    results.forEach(item => URL.revokeObjectURL(item.url));
    setSources([]);
    setResults([]);
    setError('');
  };

  /** Tính kích thước đích cho một ảnh theo cách thu phóng đang chọn. */
  const computeTarget = (width: number, height: number) => {
    if (mode === 'percent') {
      const ratio = Math.max(1, Math.min(400, percent)) / 100;
      return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
    }
    if (mode === 'width') {
      const nextWidth = Math.max(1, targetWidth);
      return { width: nextWidth, height: Math.max(1, Math.round((height / width) * nextWidth)) };
    }
    if (mode === 'height') {
      const nextHeight = Math.max(1, targetHeight);
      return { width: Math.max(1, Math.round((width / height) * nextHeight)), height: nextHeight };
    }
    // Chế độ vừa khung, ảnh được thu nhỏ để nằm trọn trong khung mà không méo hình.
    const ratio = Math.min(Math.max(1, targetWidth) / width, Math.max(1, targetHeight) / height);
    return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
  };

  const handleProcess = async () => {
    if (!sources.length || processing) return;
    setProcessing(true);
    setError('');
    results.forEach(item => URL.revokeObjectURL(item.url));
    setResults([]);

    const extension = FORMAT_LABELS.find(item => item.value === format)?.extension || 'jpg';
    const produced: ResultImage[] = [];

    for (const item of sources) {
      let drawable: Awaited<ReturnType<typeof loadDrawable>> | null = null;
      try {
        drawable = await loadDrawable(item.file);
        const target = computeTarget(drawable.width, drawable.height);
        const canvas = drawScaled(drawable.source, drawable.width, drawable.height, target.width, target.height);

        // Ảnh JPEG không có nền trong suốt, nếu ảnh gốc trong suốt thì phải lót nền
        // trắng, nếu không phần trong suốt sẽ chuyển thành màu đen.
        if (format === 'image/jpeg') {
          const context = canvas.getContext('2d');
          if (context) {
            context.globalCompositeOperation = 'destination-over';
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.globalCompositeOperation = 'source-over';
          }
        }

        const blob = await new Promise<Blob | null>(resolve =>
          canvas.toBlob(resolve, format, format === 'image/png' ? undefined : quality / 100)
        );
        if (!blob) throw new Error('Không tạo được ảnh kết quả');

        produced.push({
          id: item.id,
          name: changeExtension(item.file.name, extension),
          url: URL.createObjectURL(blob),
          width: target.width,
          height: target.height,
          bytes: blob.size,
          originalBytes: item.file.size
        });
      } catch {
        setError(`Không xử lý được tệp ${item.file.name}.`);
      } finally {
        drawable?.release();
      }
    }

    setResults(produced);
    setProcessing(false);
  };

  const downloadOne = (result: ResultImage) => {
    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = async () => {
    for (const result of results) {
      downloadOne(result);
      // Nhiều trình duyệt chặn khi tải liên tiếp quá nhanh nên cần giãn cách một chút.
      await new Promise(resolve => window.setTimeout(resolve, 350));
    }
  };

  const totalOriginal = results.reduce((sum, item) => sum + item.originalBytes, 0);
  const totalResult = results.reduce((sum, item) => sum + item.bytes, 0);
  const savedPercent = totalOriginal > 0 ? Math.round((1 - totalResult / totalOriginal) * 100) : 0;

  return (
    <div className="space-y-5">
      <div
        onDragOver={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-brand bg-brand/5' : 'border-slate-200 bg-slate-50/60'
        }`}
      >
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-sm">
          <Upload className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-bold text-slate-700">Kéo thả ảnh vào đây</p>
        <p className="mt-1 text-xs text-slate-500">Nhận nhiều ảnh cùng lúc. Ảnh được xử lý ngay trên máy, không tải lên máy chủ.</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
        >
          <ImageIcon className="h-4 w-4" /> Chọn ảnh từ máy
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={event => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sources.length > 0 && (
        <>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Cách thu phóng</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { value: 'width' as ResizeMode, label: 'Theo chiều rộng' },
                { value: 'height' as ResizeMode, label: 'Theo chiều cao' },
                { value: 'fit' as ResizeMode, label: 'Vừa trong khung' },
                { value: 'percent' as ResizeMode, label: 'Theo phần trăm' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                    mode === option.value ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(mode === 'width' || mode === 'fit') && (
                <label className="block">
                  <span className="text-[11px] font-bold text-slate-500">Chiều rộng tối đa (điểm ảnh)</span>
                  <input
                    type="number"
                    min={1}
                    value={targetWidth}
                    onChange={event => setTargetWidth(Number(event.target.value) || 1)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
                  />
                </label>
              )}
              {(mode === 'height' || mode === 'fit') && (
                <label className="block">
                  <span className="text-[11px] font-bold text-slate-500">Chiều cao tối đa (điểm ảnh)</span>
                  <input
                    type="number"
                    min={1}
                    value={targetHeight}
                    onChange={event => setTargetHeight(Number(event.target.value) || 1)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
                  />
                </label>
              )}
              {mode === 'percent' && (
                <label className="block">
                  <span className="text-[11px] font-bold text-slate-500">Tỷ lệ so với ảnh gốc ({percent}%)</span>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    value={percent}
                    onChange={event => setPercent(Number(event.target.value))}
                    className="mt-3 w-full accent-brand"
                  />
                </label>
              )}
            </div>

            {mode !== 'percent' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">Chọn nhanh</span>
                {QUICK_SIZES.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => (mode === 'height' ? setTargetHeight(size) : setTargetWidth(size))}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200"
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Định dạng lưu</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {FORMAT_LABELS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormat(option.value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      format === option.value ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-xs font-black text-slate-800">{option.label}</span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{option.hint}</span>
                  </button>
                ))}
              </div>

              {format !== 'image/png' && (
                <label className="mt-4 block">
                  <span className="text-[11px] font-bold text-slate-500">Chất lượng ảnh ({quality}%)</span>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    value={quality}
                    onChange={event => setQuality(Number(event.target.value))}
                    className="mt-3 w-full accent-brand"
                  />
                  <span className="mt-1 block text-[10px] text-slate-400">
                    Khoảng 80 đến 90 phần trăm là mức cân bằng tốt giữa độ nét và dung lượng.
                  </span>
                </label>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {processing ? 'Đang xử lý' : `Chỉnh kích thước ${sources.length} ảnh`}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                <Trash2 className="h-4 w-4" /> Xóa danh sách
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Ảnh đã chọn ({sources.length})</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map(item => {
                const target = computeTarget(item.width, item.height);
                return (
                  <div key={item.id} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <img src={item.previewUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-700">{item.file.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {item.width} nhân {item.height}, {formatBytes(item.file.size)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-brand">
                        Sẽ thành {target.width} nhân {target.height}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSource(item.id)}
                      className="h-7 w-7 shrink-0 rounded-lg bg-slate-100 text-slate-500 transition hover:bg-rose-100 hover:text-rose-600"
                    >
                      <X className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {results.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Kết quả ({results.length} ảnh)</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600">
                Tổng dung lượng từ {formatBytes(totalOriginal)} còn {formatBytes(totalResult)}
                {savedPercent > 0 ? `, giảm ${savedPercent} phần trăm` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={downloadAll}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" /> Tải tất cả
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(result => (
              <div key={result.id} className="flex gap-3 rounded-xl border border-emerald-100 bg-white p-3">
                <img src={result.url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-700">{result.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {result.width} nhân {result.height}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-emerald-600">
                    {formatBytes(result.originalBytes)} còn {formatBytes(result.bytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadOne(result)}
                  className="h-7 w-7 shrink-0 rounded-lg bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200"
                >
                  <Download className="mx-auto h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
