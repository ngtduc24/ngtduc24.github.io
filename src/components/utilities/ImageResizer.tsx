import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Image as ImageIcon, Loader2, Sparkles, Trash2, Upload, Wand2, X } from 'lucide-react';
import { auth } from '../../lib/firebase';
import {
  base64ToBlob,
  blobToBase64,
  canvasToBlob,
  chooseGeminiSize,
  flattenForJpeg,
  loadDrawable,
  nearestGeminiRatio,
  resampleStepwise,
  unsharpMask
} from '../../lib/imageEnhance';

/**
 * Công cụ phóng to ảnh.
 *
 * Người dùng chọn mức phóng to theo phần trăm, ảnh được nhân kích thước theo đúng tỷ lệ
 * đó và làm rõ chi tiết theo một trong hai cách.
 *
 * Cách thứ nhất chạy ngay trên máy, dùng phép nội suy nhiều chặng cộng bộ lọc làm nét.
 * Cách này miễn phí, tức thì, và quan trọng nhất là nó tuyệt đối không bịa thêm chi tiết.
 *
 * Cách thứ hai gửi ảnh sang Gemini để vẽ lại ở độ phân giải cao hơn. Cách này khôi phục
 * được chi tiết mà phép nội suy không thể tạo ra, nhưng bản chất Gemini là mô hình sinh
 * ảnh nên nó vẽ lại chứ không phóng to thuần túy, các chi tiết rất nhỏ có thể lệch so với
 * bản gốc. Giao diện có ghi rõ cảnh báo này ngay tại chỗ chọn.
 */

type EnhanceMode = 'local' | 'ai';
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
  usedAi: boolean;
}

const FORMATS: Array<{ value: OutputFormat; label: string; extension: string; hint: string }> = [
  { value: 'image/jpeg', label: 'JPEG', extension: 'jpg', hint: 'Dung lượng nhẹ, hợp với ảnh chụp và ảnh bìa bài giảng.' },
  { value: 'image/png', label: 'PNG', extension: 'png', hint: 'Không nén mất dữ liệu, giữ được nền trong suốt.' },
  { value: 'image/webp', label: 'WebP', extension: 'webp', hint: 'Nhẹ hơn JPEG ở cùng chất lượng, hợp để đưa lên web.' }
];

const SCALE_PRESETS = [150, 200, 300, 400];

// Ảnh quá lớn sau khi phóng to sẽ làm trình duyệt hết bộ nhớ, nên chặn lại từ đầu.
const MAX_OUTPUT_PIXELS = 40_000_000;

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const changeExtension = (name: string, extension: string) => {
  const base = name.replace(/\.[^.]+$/, '') || 'anh';
  return `${base}_x${extension === 'jpg' ? '' : ''}.${extension}`.replace('_x.', '.');
};

export default function ImageResizer() {
  const [sources, setSources] = useState<SourceImage[]>([]);
  const [results, setResults] = useState<ResultImage[]>([]);
  const [scale, setScale] = useState(200);
  const [mode, setMode] = useState<EnhanceMode>('local');
  const [sharpen, setSharpen] = useState(60);
  const [format, setFormat] = useState<OutputFormat>('image/jpeg');
  const [quality, setQuality] = useState(90);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourcesRef = useRef<SourceImage[]>([]);
  const resultsRef = useRef<ResultImage[]>([]);
  sourcesRef.current = sources;
  resultsRef.current = results;

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
    setProgress('');
  };

  const targetOf = (width: number, height: number) => ({
    width: Math.max(1, Math.round((width * scale) / 100)),
    height: Math.max(1, Math.round((height * scale) / 100))
  });

  /** Gửi ảnh sang Gemini thông qua hàm trên Supabase, khóa API không nằm ở trình duyệt. */
  const enhanceWithGemini = async (file: File, targetWidth: number, targetHeight: number): Promise<Blob | null> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
    if (!supabaseUrl) throw new Error('Chưa cấu hình địa chỉ Supabase.');

    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (!idToken) throw new Error('Bạn cần đăng nhập để dùng chế độ làm nét bằng AI.');

    const imageBase64 = await blobToBase64(file);
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/gemini-enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        imageBase64,
        mimeType: file.type || 'image/jpeg',
        imageSize: chooseGeminiSize(targetWidth, targetHeight),
        aspectRatio: nearestGeminiRatio(targetWidth, targetHeight)
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data) {
      throw new Error(payload?.error || 'Gemini không xử lý được ảnh này.');
    }
    return base64ToBlob(payload.data, payload.mimeType || 'image/png');
  };

  const handleProcess = async () => {
    if (!sources.length || processing) return;

    const tooBig = sources.find(item => {
      const target = targetOf(item.width, item.height);
      return target.width * target.height > MAX_OUTPUT_PIXELS;
    });
    if (tooBig) {
      setError(`Ảnh ${tooBig.file.name} sau khi phóng to sẽ quá lớn và có thể làm treo trình duyệt. Vui lòng giảm mức phóng to xuống.`);
      return;
    }

    setProcessing(true);
    setError('');
    results.forEach(item => URL.revokeObjectURL(item.url));
    setResults([]);

    const extension = FORMATS.find(item => item.value === format)?.extension || 'jpg';
    const produced: ResultImage[] = [];

    for (let index = 0; index < sources.length; index += 1) {
      const item = sources[index];
      let drawable: Awaited<ReturnType<typeof loadDrawable>> | null = null;
      let usedAi = false;

      try {
        const target = targetOf(item.width, item.height);
        let workingBlob: Blob = item.file;

        if (mode === 'ai') {
          setProgress(`Đang nhờ Gemini làm rõ ảnh ${index + 1} trên ${sources.length}, việc này mất vài giây`);
          try {
            const enhanced = await enhanceWithGemini(item.file, target.width, target.height);
            if (enhanced) {
              workingBlob = enhanced;
              usedAi = true;
            }
          } catch (aiError: any) {
            // Gemini hỏng thì vẫn phóng to bằng cách tại chỗ để người dùng có kết quả,
            // đồng thời báo rõ lý do chứ không im lặng.
            setError(aiError?.message || 'Không dùng được AI, hệ thống đã chuyển sang làm nét tại chỗ.');
          }
        } else {
          setProgress(`Đang xử lý ảnh ${index + 1} trên ${sources.length}`);
        }

        drawable = await loadDrawable(workingBlob);
        let canvas = resampleStepwise(drawable.source, drawable.width, drawable.height, target.width, target.height);

        // Ảnh do Gemini vẽ lại đã sắc nét sẵn, làm nét thêm nữa dễ bị rỗ, nên giảm bớt.
        const appliedSharpen = usedAi ? Math.round(sharpen / 3) : sharpen;
        canvas = unsharpMask(canvas, appliedSharpen);

        if (format === 'image/jpeg') flattenForJpeg(canvas);

        const blob = await canvasToBlob(canvas, format, quality / 100);
        if (!blob) throw new Error('Không tạo được ảnh kết quả');

        produced.push({
          id: item.id,
          name: changeExtension(item.file.name, extension),
          url: URL.createObjectURL(blob),
          width: target.width,
          height: target.height,
          bytes: blob.size,
          originalBytes: item.file.size,
          usedAi
        });
      } catch (processError: any) {
        setError(processError?.message || `Không xử lý được tệp ${item.file.name}.`);
      } finally {
        drawable?.release();
      }
    }

    setResults(produced);
    setProgress('');
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
      await new Promise(resolve => window.setTimeout(resolve, 350));
    }
  };

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
        <p className="mt-1 text-xs text-slate-500">Nhận nhiều ảnh cùng lúc.</p>
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
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sources.length > 0 && (
        <>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Mức phóng to</p>
              <p className="text-2xl font-black text-brand">{scale}%</p>
            </div>

            <input
              type="range"
              min={50}
              max={400}
              step={10}
              value={scale}
              onChange={event => setScale(Number(event.target.value))}
              className="mt-3 w-full accent-brand"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>50% thu nhỏ một nửa</span>
              <span>100% giữ nguyên</span>
              <span>400% gấp bốn</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">Chọn nhanh</span>
              {SCALE_PRESETS.map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScale(value)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                    scale === value ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Cách làm rõ chi tiết</p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode('local')}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === 'local' ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-black text-slate-800">
                    <Wand2 className="h-4 w-4 text-brand" /> Làm nét tại chỗ
                  </span>
                  <span className="mt-1.5 block text-[10px] leading-relaxed text-slate-500">
                    Nội suy nhiều chặng kèm bộ lọc làm nét, chạy ngay trên máy, miễn phí và tức thì.
                    Chỉ làm nổi bật chi tiết vốn có, không bao giờ bịa thêm chi tiết không có thật.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === 'ai' ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-black text-slate-800">
                    <Sparkles className="h-4 w-4 text-brand" /> Nhờ AI Gemini làm rõ
                  </span>
                  <span className="mt-1.5 block text-[10px] leading-relaxed text-slate-500">
                    Gemini dựng lại ảnh ở độ phân giải cao hơn, khôi phục được chi tiết mà cách trên
                    không tạo ra được. Cần đăng nhập, mất vài giây mỗi ảnh.
                  </span>
                </button>
              </div>

              {mode === 'ai' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-semibold leading-relaxed text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Gemini là mô hình sinh ảnh nên nó vẽ lại ảnh chứ không phóng to thuần túy. Chữ nhỏ,
                    con số, biểu đồ và nét mặt có thể sai lệch so với bản gốc. Với tư liệu nghiên cứu,
                    ảnh chụp tài liệu hoặc bất cứ thứ gì dùng làm bằng chứng, nên chọn cách làm nét tại
                    chỗ và luôn đối chiếu lại với ảnh gốc trước khi dùng.
                  </span>
                </div>
              )}

              <label className="mt-4 block">
                <span className="text-[11px] font-bold text-slate-500">Độ làm nét ({sharpen}%)</span>
                <input
                  type="range"
                  min={0}
                  max={150}
                  value={sharpen}
                  onChange={event => setSharpen(Number(event.target.value))}
                  className="mt-2 w-full accent-brand"
                />
                <span className="mt-1 block text-[10px] text-slate-400">
                  Khoảng 50 đến 80 phần trăm là vừa. Đẩy quá cao ảnh sẽ bị rỗ và viền trắng quanh các cạnh.
                </span>
              </label>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Định dạng lưu</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {FORMATS.map(option => (
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
                    min={40}
                    max={100}
                    value={quality}
                    onChange={event => setQuality(Number(event.target.value))}
                    className="mt-2 w-full accent-brand"
                  />
                  <span className="mt-1 block text-[10px] text-slate-400">
                    Ảnh đã phóng to nên để từ 90 phần trăm trở lên cho khỏi phí công làm nét.
                  </span>
                </label>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'ai' ? <Sparkles className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                {processing ? 'Đang xử lý' : `Phóng to ${sources.length} ảnh lên ${scale}%`}
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" /> Xóa danh sách
              </button>
              {progress && <span className="text-[11px] font-bold text-slate-500">{progress}</span>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Ảnh đã chọn ({sources.length})</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map(item => {
                const target = targetOf(item.width, item.height);
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
                Đã phóng to lên {scale} phần trăm{results.some(item => item.usedAi) ? ', có dùng Gemini làm rõ chi tiết' : ''}
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
                    {result.width} nhân {result.height}, {formatBytes(result.bytes)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-emerald-600">
                    {result.usedAi ? 'Có dùng Gemini' : 'Làm nét tại chỗ'}
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
