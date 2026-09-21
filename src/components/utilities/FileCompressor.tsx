import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileDown, Loader2, X, Image as ImageIcon, FileText, CheckCircle2, Info } from 'lucide-react';

// Công cụ giảm dung lượng file chạy hoàn toàn trên trình duyệt, không gửi file lên máy chủ nên
// không tốn băng thông. Ảnh JPG PNG WEBP nén lại bằng canvas, PDF dựng lại từng trang thành ảnh
// nén rồi ghép lại. Ưu tiên giữ chất lượng ở mức tốt, chỉ giảm phần dữ liệu thừa.

type Preset = 'high' | 'balanced' | 'small';
type OutFmt = 'auto' | 'jpg' | 'png' | 'webp';

interface Job {
  id: string;
  file: File;
  name: string;
  kind: 'image' | 'pdf';
  originalSize: number;
  status: 'pending' | 'processing' | 'done' | 'skipped' | 'error';
  resultBlob?: Blob;
  resultSize?: number;
  outName?: string;
  note?: string;
}

const PRESETS: Record<Preset, { label: string; desc: string; imgQuality: number; imgMaxSide: number; pdfScale: number; pdfQuality: number }> = {
  high: { label: 'Chất lượng cao', desc: 'Giảm nhẹ, giữ chất lượng gần như nguyên bản', imgQuality: 0.92, imgMaxSide: 4000, pdfScale: 2.0, pdfQuality: 0.85 },
  balanced: { label: 'Cân bằng', desc: 'Giảm nhiều mà mắt thường khó nhận ra khác biệt', imgQuality: 0.82, imgMaxSide: 3000, pdfScale: 1.5, pdfQuality: 0.72 },
  small: { label: 'Nhẹ nhất', desc: 'Giảm tối đa, phù hợp gửi qua mạng, chất lượng vẫn dùng tốt', imgQuality: 0.7, imgMaxSide: 2200, pdfScale: 1.2, pdfQuality: 0.6 },
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(b => resolve(b), type, quality));
}

// Nén ảnh: vẽ lại lên canvas, thu nhỏ nếu quá lớn, rồi mã hóa lại theo định dạng và chất lượng chọn.
async function compressImage(file: File, preset: Preset, outFmt: OutFmt): Promise<{ blob: Blob; ext: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const p = PRESETS[preset];
    const longest = Math.max(img.width, img.height);
    const scale = longest > p.imgMaxSide ? p.imgMaxSide / longest : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không tạo được canvas');

    // Chọn định dạng đầu ra. Tự động: ảnh png hoặc webp giữ định dạng có nền trong suốt, ảnh jpg giữ jpg.
    let mime = 'image/jpeg';
    let ext = 'jpg';
    const src = file.type;
    if (outFmt === 'jpg') { mime = 'image/jpeg'; ext = 'jpg'; }
    else if (outFmt === 'png') { mime = 'image/png'; ext = 'png'; }
    else if (outFmt === 'webp') { mime = 'image/webp'; ext = 'webp'; }
    else {
      // auto
      if (src === 'image/png' || src === 'image/webp') { mime = 'image/webp'; ext = 'webp'; }
      else { mime = 'image/jpeg'; ext = 'jpg'; }
    }

    // Định dạng jpeg không có kênh trong suốt nên tô nền trắng trước để tránh vùng đen.
    if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let blob = await canvasToBlob(canvas, mime, PRESETS[preset].imgQuality);
    // Một số trình duyệt cũ không hỗ trợ webp khi xuất, lùi về jpeg.
    if (!blob && mime === 'image/webp') { mime = 'image/jpeg'; ext = 'jpg'; blob = await canvasToBlob(canvas, mime, PRESETS[preset].imgQuality); }
    if (!blob) throw new Error('Không nén được ảnh');
    return { blob, ext };
  } finally {
    URL.revokeObjectURL(url);
  }
}

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

// Nén PDF: dựng từng trang thành ảnh nén rồi ghép lại thành PDF mới. Cách này giảm mạnh với PDF nhiều
// ảnh hoặc bản quét. PDF chủ yếu là chữ có thể không giảm được, khi đó giữ lại bản gốc.
async function compressPdf(file: File, preset: Preset): Promise<{ blob: Blob } | null> {
  const p = PRESETS[preset];
  const pdfjsLib = await loadPdfjs();
  const { jsPDF } = await import('jspdf');
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let doc: any = null;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vpPt = page.getViewport({ scale: 1 });
    const vpPx = page.getViewport({ scale: p.pdfScale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vpPx.width);
    canvas.height = Math.ceil(vpPx.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Không tạo được canvas');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vpPx }).promise;
    const imgData = canvas.toDataURL('image/jpeg', p.pdfQuality);
    const ptW = vpPt.width, ptH = vpPt.height;
    const orientation = ptW > ptH ? 'l' : 'p';
    if (i === 1) doc = new jsPDF({ unit: 'pt', format: [ptW, ptH], orientation });
    else doc.addPage([ptW, ptH], orientation);
    doc.addImage(imgData, 'JPEG', 0, 0, ptW, ptH);
    canvas.width = 0; canvas.height = 0;
  }
  if (!doc) return null;
  const blob = doc.output('blob');
  return { blob };
}

export default function FileCompressor() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [preset, setPreset] = useState<Preset>('balanced');
  const [outFmt, setOutFmt] = useState<OutFmt>('auto');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processJob = useCallback(async (job: Job, curPreset: Preset, curOut: OutFmt) => {
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing', note: undefined } : j));
    try {
      if (job.kind === 'image') {
        const { blob, ext } = await compressImage(job.file, curPreset, curOut);
        const base = job.name.replace(/\.[^.]+$/, '');
        const outName = `${base}-nen.${ext}`;
        if (blob.size >= job.originalSize) {
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'skipped', resultBlob: job.file, resultSize: job.originalSize, outName: job.name, note: 'Ảnh đã tối ưu sẵn, giữ nguyên bản gốc để không làm nặng thêm' } : j));
          return;
        }
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done', resultBlob: blob, resultSize: blob.size, outName } : j));
      } else {
        const res = await compressPdf(job.file, curPreset);
        const base = job.name.replace(/\.[^.]+$/, '');
        const outName = `${base}-nen.pdf`;
        if (!res || res.blob.size >= job.originalSize) {
          setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'skipped', resultBlob: job.file, resultSize: job.originalSize, outName: job.name, note: 'PDF chủ yếu là chữ hoặc đã tối ưu sẵn, giữ nguyên bản gốc' } : j));
          return;
        }
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'done', resultBlob: res.blob, resultSize: res.blob.size, outName } : j));
      }
    } catch (e) {
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'error', note: (e as Error).message || 'Lỗi khi nén' } : j));
    }
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const newJobs: Job[] = [];
    for (const file of arr) {
      const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isImage && !isPdf) continue;
      newJobs.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        file, name: file.name, kind: isPdf ? 'pdf' : 'image', originalSize: file.size, status: 'pending',
      });
    }
    if (newJobs.length === 0) return;
    setJobs(prev => [...prev, ...newJobs]);
    newJobs.forEach(j => processJob(j, preset, outFmt));
  }, [preset, outFmt, processJob]);

  const reprocessAll = (nextPreset: Preset, nextOut: OutFmt) => {
    jobs.forEach(j => processJob(j, nextPreset, nextOut));
  };

  const download = (job: Job) => {
    if (!job.resultBlob) return;
    const url = URL.createObjectURL(job.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = job.outName || job.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadAll = () => {
    jobs.filter(j => j.resultBlob).forEach((j, i) => setTimeout(() => download(j), i * 300));
  };

  const remove = (id: string) => setJobs(prev => prev.filter(j => j.id !== id));
  const clearAll = () => setJobs([]);

  const doneJobs = jobs.filter(j => j.status === 'done');
  const totalOriginal = jobs.reduce((s, j) => s + j.originalSize, 0);
  const totalResult = jobs.reduce((s, j) => s + (j.resultSize ?? j.originalSize), 0);
  const savedPct = totalOriginal > 0 ? Math.round((1 - totalResult / totalOriginal) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Tùy chọn mức nén và định dạng */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Mức nén</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(PRESETS) as Preset[]).map(k => (
              <button
                key={k}
                onClick={() => { setPreset(k); if (jobs.length) reprocessAll(k, outFmt); }}
                className={`rounded-2xl border p-3 text-left transition ${preset === k ? 'border-brand bg-brand-light' : 'border-slate-200 bg-white hover:border-brand/30'}`}
              >
                <span className={`block text-xs font-black ${preset === k ? 'text-brand' : 'text-slate-700'}`}>{PRESETS[k].label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">{PRESETS[k].desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Định dạng ảnh đầu ra</span>
          <select
            value={outFmt}
            onChange={e => { const v = e.target.value as OutFmt; setOutFmt(v); if (jobs.length) reprocessAll(preset, v); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand"
          >
            <option value="auto">Tự động (khuyên dùng)</option>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WEBP</option>
          </select>
          <span className="text-[10px] text-slate-400">Chỉ áp dụng cho ảnh, PDF luôn giữ định dạng PDF</span>
        </div>
      </div>

      {/* Khu vực tải file */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-10 text-center transition ${dragging ? 'border-brand bg-brand-light' : 'border-slate-200 bg-white hover:border-brand/40'}`}
      >
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><Upload className="h-6 w-6" /></div>
        <p className="text-sm font-bold text-slate-700">Kéo thả hoặc bấm để chọn file</p>
        <p className="text-xs text-slate-400">Hỗ trợ PDF, JPG, PNG, WEBP. File được xử lý ngay trên máy bạn, không gửi lên máy chủ.</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="hidden" onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {/* Tổng kết */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-slate-500">Gốc <b className="text-slate-800">{fmtSize(totalOriginal)}</b></span>
            <span className="font-semibold text-slate-500">Sau nén <b className="text-brand">{fmtSize(totalResult)}</b></span>
            {savedPct > 0 && <span className="rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-600">Giảm {savedPct}%</span>}
          </div>
          <div className="flex items-center gap-2">
            {doneJobs.length > 0 && (
              <button onClick={downloadAll} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover">
                <FileDown className="h-4 w-4" /> Tải tất cả ({doneJobs.length})
              </button>
            )}
            <button onClick={clearAll} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">Xóa hết</button>
          </div>
        </div>
      )}

      {/* Danh sách file */}
      <div className="space-y-2">
        {jobs.map(job => {
          const pct = job.resultSize != null && job.originalSize > 0 ? Math.round((1 - job.resultSize / job.originalSize) * 100) : 0;
          return (
            <div key={job.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${job.kind === 'pdf' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                {job.kind === 'pdf' ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">{job.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-400">{fmtSize(job.originalSize)}</span>
                  {job.status === 'processing' && <span className="inline-flex items-center gap-1 font-semibold text-slate-500"><Loader2 className="h-3 w-3 animate-spin" /> Đang nén...</span>}
                  {job.status === 'done' && (
                    <>
                      <span className="text-slate-300">→</span>
                      <span className="font-bold text-brand">{fmtSize(job.resultSize || 0)}</span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-600">Giảm {pct}%</span>
                    </>
                  )}
                  {job.status === 'skipped' && <span className="inline-flex items-center gap-1 font-medium text-amber-600"><Info className="h-3 w-3" /> {job.note}</span>}
                  {job.status === 'error' && <span className="font-medium text-rose-500">Lỗi: {job.note}</span>}
                </div>
              </div>
              {(job.status === 'done' || job.status === 'skipped') && job.resultBlob && (
                <button onClick={() => download(job)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-light px-3 py-2 text-[11px] font-bold text-brand hover:bg-brand/15">
                  <FileDown className="h-4 w-4" /> Tải
                </button>
              )}
              {job.status === 'done' && <CheckCircle2 className="hidden h-4 w-4 shrink-0 text-emerald-500 sm:block" />}
              <button onClick={() => remove(job.id)} className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
