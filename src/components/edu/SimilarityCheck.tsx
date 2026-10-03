import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ScanSearch, Loader2, AlertTriangle, ArrowLeftRight, FileWarning } from 'lucide-react';
import { EduSubmission, EduUser } from '../../types/edu';
import { resolveSubmissionFile } from '../../lib/edu';
import { cloudinaryThumb, pdfPageImages, fingerprintUrl, similarity, colorSimilarity, saveCache, pool, Fingerprint } from '../../lib/imageSimilarity';

// Quét các bài nộp của một bài tập, so ảnh từng cặp sinh viên và liệt kê các cặp giống nhau.

interface Img { studentId: string; label: string; thumb: string; big: string; fp?: Fingerprint }
interface FileSig { studentId: string; name: string; sig: string; url: string }
export interface PairResult { a: string; b: string; pct: number; shape: number; color: number; imgA?: Img; imgB?: Img; exactFile?: string }
export type SimilarityMap = Record<string, { pct: number; withId: string }>;

const isImage = (f: { name?: string; type?: string }) => /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name || '');
const isPdf = (f: { name?: string; type?: string }) => /pdf/i.test(f.type || '') || /\.pdf$/i.test(f.name || '');

export default function SimilarityCheck({ users, submissions, onClose, onResults }: {
  users: EduUser[]; submissions: EduSubmission[]; onClose: () => void; onResults: (m: SimilarityMap) => void;
}) {
  const [phase, setPhase] = useState<'scan' | 'done'>('scan');
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [pairs, setPairs] = useState<PairResult[]>([]);
  const [threshold, setThreshold] = useState(85);
  // Bố cục và màu: bắt bài chép y nguyên. Chỉ bố cục: bắt cả bài chép rồi đổi màu (đề cho sẵn ảnh mẫu thì nên dùng kiểu đầu).
  const [mode, setMode] = useState<'both' | 'shape'>('both');
  const [view, setView] = useState<PairResult | null>(null);
  const [stats, setStats] = useState({ students: 0, images: 0, skipped: 0 });
  const cancelled = useRef(false);
  const name = (id: string) => users.find(u => u.id === id);

  useEffect(() => {
    cancelled.current = false;
    (async () => {
      // 1. Gom ảnh của từng sinh viên (ảnh, trang PDF) và chữ ký của các tệp khác.
      const imgs: Img[] = [];
      const sigs: FileSig[] = [];
      const jobs: (() => Promise<void>)[] = [];
      let skipped = 0;
      const subs = submissions.filter(s => (s.files || []).length);
      subs.forEach(sub => {
        (sub.files || []).forEach((f, idx) => {
          jobs.push(async () => {
            let url = f.url;
            if (!url && f.inline) { try { url = (await resolveSubmissionFile(sub.id, f, idx)).url; } catch { /* bỏ qua */ } }
            if (!url) { skipped++; return; }
            if (isImage(f)) {
              imgs.push({ studentId: sub.userId, label: f.name, thumb: cloudinaryThumb(url), big: cloudinaryThumb(url, 1200) });
            } else if (isPdf(f)) {
              try {
                const pages = await pdfPageImages(url);
                pages.forEach(pg => {
                  const img: Img & { canvas?: HTMLCanvasElement } = { studentId: sub.userId, label: `${f.name} · trang ${pg.page}`, thumb: pg.thumb, big: /res\.cloudinary/.test(pg.thumb) ? pg.thumb.replace('w_384', 'w_1200') : pg.thumb };
                  (img as any).canvas = pg.canvas;
                  imgs.push(img);
                });
              } catch { skipped++; }
            } else if (/^https?:/.test(url)) {
              // Tệp khác (psd, ai, blend, zip...): so trùng y hệt bằng mã ETag của Cloudinary hoặc dung lượng tệp.
              try {
                const r = await fetch(url, { method: 'HEAD' });
                const etag = r.headers.get('etag');
                const len = Number(r.headers.get('content-length') || f.size || 0);
                const sig = etag ? `etag:${etag}` : len > 50 * 1024 ? `size:${len}:${(f.name.split('.').pop() || '').toLowerCase()}` : '';
                if (sig) sigs.push({ studentId: sub.userId, name: f.name, sig, url });
              } catch { skipped++; }
            }
          });
        });
      });
      setProgress({ done: 0, total: jobs.length, failed: 0 });
      let done = 0;
      await pool(jobs, 6, async job => { if (cancelled.current) return; await job(); done++; setProgress(p => ({ ...p, done })); });
      if (cancelled.current) return;

      // 2. Tạo dấu vân tay cho từng ảnh.
      setProgress({ done: 0, total: imgs.length, failed: 0 });
      let d2 = 0, failed = 0;
      await pool(imgs, 6, async img => {
        if (cancelled.current) return;
        try { img.fp = await fingerprintUrl(img.thumb.startsWith('data:') ? `${img.studentId}|${img.label}` : img.thumb, img.thumb, (img as any).canvas); }
        catch { failed++; }
        d2++; setProgress({ done: d2, total: imgs.length, failed });
      });
      await saveCache();
      if (cancelled.current) return;

      // 3. So từng cặp sinh viên: lấy cặp ảnh giống nhất giữa 2 người.
      const byStudent = new Map<string, Img[]>();
      imgs.filter(i => i.fp).forEach(i => { const a = byStudent.get(i.studentId) || []; a.push(i); byStudent.set(i.studentId, a); });
      const ids = Array.from(new Set([...byStudent.keys(), ...sigs.map(s => s.studentId)]));
      const out: PairResult[] = [];
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const A = byStudent.get(ids[i]) || [], B = byStudent.get(ids[j]) || [];
        let best: PairResult = { a: ids[i], b: ids[j], pct: 0, shape: 0, color: 0 };
        for (const x of A) for (const y of B) {
          const shape = similarity(x.fp!, y.fp!);
          if (shape > best.shape) best = { a: ids[i], b: ids[j], pct: shape, shape, color: colorSimilarity(x.fp!, y.fp!), imgA: x, imgB: y };
        }
        const sa = sigs.filter(s => s.studentId === ids[i]), sb = sigs.filter(s => s.studentId === ids[j]);
        const same = sa.find(x => sb.some(y => y.sig === x.sig));
        if (same) best = { ...best, pct: 100, shape: 100, color: 100, exactFile: same.name };
        if (best.shape >= 60) out.push(best);
      }
      out.sort((x, y) => y.pct - x.pct);
      setPairs(out);
      setStats({ students: ids.length, images: imgs.filter(i => i.fp).length, skipped: skipped + failed });
      setPhase('done');
    })();
    return () => { cancelled.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scored = useMemo(() => pairs.map(p => ({ ...p, pct: p.exactFile ? 100 : mode === 'shape' || p.color < 0 ? p.shape : Math.round(0.55 * p.shape + 0.45 * p.color) })).sort((x, y) => y.pct - x.pct), [pairs, mode]);
  const shown = useMemo(() => scored.filter(p => p.pct >= threshold), [scored, threshold]);
  useEffect(() => {
    if (phase !== 'done') return;
    const m: SimilarityMap = {};
    shown.forEach(p => {
      if (!m[p.a] || m[p.a].pct < p.pct) m[p.a] = { pct: p.pct, withId: p.b };
      if (!m[p.b] || m[p.b].pct < p.pct) m[p.b] = { pct: p.pct, withId: p.a };
    });
    onResults(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, phase]);

  const tone = (pct: number) => pct >= 95 ? 'bg-rose-600 text-white' : pct >= 90 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';

  // Gắn thẳng vào body để luôn nằm trên màn chấm bài của điện thoại (màn đó cũng gắn vào body).
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-sm sm:p-6">
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-light text-brand"><ScanSearch className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-slate-900">Kiểm tra bài nộp giống nhau</h3>
            <p className="text-xs text-slate-500">So ảnh và các trang PDF giữa từng cặp sinh viên trong bài tập này.</p>
          </div>
          <button onClick={onClose} title="Đóng" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        {phase === 'scan' ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="text-sm font-bold text-slate-700">Đang quét bài nộp {progress.done}/{progress.total}</p>
            <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
            <p className="text-xs text-slate-400">Lần quét sau của cùng bài sẽ nhanh hơn vì kết quả được lưu trên máy.</p>
          </div>
        ) : view ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
              <button onClick={() => setView(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">Quay lại danh sách</button>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${tone(view.pct)}`}>Giống {view.pct}%</span>
              <span className="text-xs text-slate-500">Bố cục {view.shape}% · {view.color < 0 ? 'ảnh không màu' : `Màu sắc ${view.color}%`}</span>
              {view.exactFile && <span className="text-xs font-semibold text-rose-600">Trùng y hệt tệp {view.exactFile}</span>}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-4 md:grid-cols-2">
              {[{ id: view.a, img: view.imgA }, { id: view.b, img: view.imgB }].map(side => (
                <div key={side.id} className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm font-black text-slate-800">{name(side.id)?.fullName}</p>
                  <p className="mb-2 truncate text-[11px] text-slate-500">{name(side.id)?.mssv}{side.img ? ` · ${side.img.label}` : ''}</p>
                  {side.img ? <img src={side.img.big} alt="" className="max-h-[60vh] w-full rounded-xl bg-white object-contain" /> : <div className="grid h-48 place-items-center text-xs text-slate-400">Không có ảnh để xem</div>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
              <span>Đã quét <b className="text-slate-800">{stats.images}</b> ảnh của <b className="text-slate-800">{stats.students}</b> sinh viên</span>
              {stats.skipped > 0 && <span className="inline-flex items-center gap-1 text-amber-600"><FileWarning className="h-3.5 w-3.5" /> {stats.skipped} tệp không đọc được</span>}
              <select value={mode} onChange={e => setMode(e.target.value as any)} className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-brand" title="Cách so">
                <option value="both">So bố cục và màu sắc</option>
                <option value="shape">Chỉ so bố cục (bắt cả bài đổi màu)</option>
              </select>
              <label className="inline-flex items-center gap-2 font-semibold text-slate-600">
                Ngưỡng giống từ {threshold}%
                <input type="range" min={70} max={100} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="accent-brand" />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {shown.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm font-bold text-slate-600">Không có cặp bài nào giống nhau từ {threshold}% trở lên</p>
                  <p className="mt-1 text-xs text-slate-400">Kéo ngưỡng xuống thấp hơn để xem các cặp hơi giống.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shown.map((p, i) => (
                    <button key={i} onClick={() => setView(p)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2.5 text-left transition-colors hover:border-brand/40 hover:bg-brand-light/30">
                      <span className={`w-16 shrink-0 rounded-lg py-1.5 text-center text-sm font-black ${tone(p.pct)}`}>{p.pct}%</span>
                      {p.imgA && <img src={p.imgA.thumb} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-slate-100 object-cover" />}
                      <ArrowLeftRight className="h-4 w-4 shrink-0 text-slate-300" />
                      {p.imgB && <img src={p.imgB.thumb} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-slate-100 object-cover" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-slate-800">{name(p.a)?.fullName} <span className="font-normal text-slate-400">và</span> {name(p.b)?.fullName}</p>
                        <p className="truncate text-[11px] text-slate-500">{name(p.a)?.mssv} · {name(p.b)?.mssv} · bố cục {p.shape}% · {p.color < 0 ? 'ảnh không màu' : `màu ${p.color}%`}{p.exactFile ? ` · trùng y hệt tệp ${p.exactFile}` : ''}</p>
                      </div>
                      {p.pct >= 95 && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-4 text-[11px] leading-relaxed text-slate-400">Kết quả chỉ để giảng viên xem xét thêm. Đề cho sẵn ảnh mẫu (ví dụ tô màu lại một đôi giày) thì bố cục các bài luôn giống nhau, nên dùng kiểu so bố cục và màu sắc để tìm bài tô màu giống nhau.</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
