import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileUp, Loader2, X, AlertTriangle } from 'lucide-react';
import { importPptx, PptxResult } from '../../lib/pptxImport';
import { uploadMediaToCloudinary } from '../../lib/upload';

// Hộp nhập tệp PowerPoint: chọn tệp .pptx, đọc từng trang, tải ảnh lên kho, báo tiến độ.
export default function PptxImportDialog({ title, onClose, onResult, initialFile }: { title: string; onClose: () => void; onResult: (r: PptxResult) => Promise<void> | void; initialFile?: File | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<'pick' | 'read' | 'done' | 'error'>('pick');
  const [slidesDone, setSlidesDone] = useState({ n: 0, t: 0 });
  const [imgs, setImgs] = useState({ n: 0, t: 0 });
  const [msg, setMsg] = useState('');
  const [skipped, setSkipped] = useState<Record<string, number>>({});
  const [drag, setDrag] = useState(false);

  // Tệp kéo thả sẵn thì đọc ngay.
  React.useEffect(() => { if (initialFile) run(initialFile); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const run = async (file?: File | null) => {
    if (!file) return;
    if (/\.ppt$/i.test(file.name) || (!/\.pptx$/i.test(file.name) && !/presentationml/.test(file.type))) {
      setStage('error');
      setMsg('Chỉ đọc được tệp .pptx. Tệp .ppt đời cũ hãy mở bằng PowerPoint rồi chọn Lưu thành (Save As) dạng .pptx.');
      return;
    }
    setStage('read');
    try {
      const r = await importPptx(file, {
        upload: async (blob, name) => {
          try { const av = /^(video|audio)\//.test(blob.type); return await uploadMediaToCloudinary(new File([blob], name, { type: blob.type }), { resourceType: av ? 'video' : 'image', folder: 'slides/pptx', category: 'Bài giảng' } as any); }
          catch { return null; }
        },
        onProgress: (n, t) => setSlidesDone({ n, t }),
        onImages: (n, t) => setImgs({ n, t }),
      });
      if (!r.slides.length) throw new Error('Tệp không có trang nào.');
      setSkipped(r.skipped);
      await onResult(r);
      setStage('done');
      if (!Object.keys(r.skipped).length) onClose();
    } catch (e: any) {
      setStage('error');
      setMsg(e?.message || 'Chưa đọc được tệp này.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget && stage !== 'read') onClose(); }}>
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-slate-800">{title}</p>
          {stage !== 'read' && <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
        </div>
        {stage === 'pick' && (
          <label onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); run(e.dataTransfer.files?.[0]); }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center ${drag ? 'border-brand bg-brand-light' : 'border-slate-200 hover:border-brand'}`}>
            <FileUp className="h-10 w-10 text-brand" />
            <span className="text-sm font-semibold text-slate-700">Chọn hoặc kéo thả tệp PowerPoint (.pptx)</span>
            <span className="text-xs text-slate-500">Chữ (giữ màu, cỡ, đậm từng đoạn), hình, ảnh, bảng, nền, video, âm thanh, ghi chú được đổi thành nội dung sửa được. Ảnh, video tự tải lên kho của bạn.</span>
            <input ref={fileRef} type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" hidden onChange={e => run(e.target.files?.[0])} />
          </label>
        )}
        {stage === 'read' && (
          <div className="space-y-3 py-2">
            <p className="flex items-center gap-2 text-sm text-slate-700"><Loader2 className="h-4 w-4 animate-spin text-brand" /> Đang đọc trang {slidesDone.n} / {slidesDone.t || '...'}</p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand transition-all" style={{ width: `${slidesDone.t ? (slidesDone.n / slidesDone.t) * 100 : 5}%` }} /></div>
            {imgs.t > 0 && <p className="text-xs text-slate-500">Đã tải lên {imgs.n} / {imgs.t} ảnh, video, âm thanh</p>}
            <p className="text-[11px] text-slate-400">Tệp nhiều ảnh hoặc có video có thể mất vài phút, vui lòng không đóng trang.</p>
          </div>
        )}
        {stage === 'done' && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-emerald-700">Đã nhập xong.</p>
            <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Một số nội dung chưa chuyển được và đã bỏ qua: {Object.entries(skipped).map(([k, v]) => `${v} ${k}`).join(', ')}. Bạn có thể chụp ảnh phần đó rồi chèn lại.</span>
            </div>
            <button onClick={onClose} className="w-full rounded-xl bg-brand py-2 text-sm font-semibold text-white">Đóng</button>
          </div>
        )}
        {stage === 'error' && (
          <div className="space-y-3">
            <p className="flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertTriangle className="h-4 w-4 shrink-0" />{msg}</p>
            <button onClick={() => { setStage('pick'); setMsg(''); }} className="w-full rounded-xl border border-slate-200 py-2 text-sm">Chọn tệp khác</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
