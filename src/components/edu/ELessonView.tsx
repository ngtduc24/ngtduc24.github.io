import React, { useState, useEffect, useRef } from 'react';
import { Loader2, GraduationCap, BookOpen, FileText, ChevronRight, CheckCircle2, ExternalLink, FileDown } from 'lucide-react';
import { elPublicLesson, elLogView } from '../../lib/elearning';
import { exportLessonToPdf } from '../../lib/lessonPdf';

interface Props { token: string; }

// Trang xem bài giảng của sinh viên. Nhập mã số sinh viên giống màn nộp bài,
// sau đó xem nội dung theo từng phần, cột điều hướng phần ở bên phải.
export default function ELessonView({ token }: Props) {
  const [phase, setPhase] = useState<'enter' | 'view'>('enter');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [active, setActive] = useState(0);
  const viewed = useRef<Set<string>>(new Set());
  const [, force] = useState(0);

  const open = async () => {
    if (!code.trim()) { setError('Vui lòng nhập mã số sinh viên.'); return; }
    setLoading(true); setError('');
    try {
      const r = await elPublicLesson(token, code.trim());
      setData(r); setPhase('view');
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('STUDENT_NOT_IN_CLASS')) setError('Mã số sinh viên không thuộc lớp được giao bài giảng.');
      else if (msg.includes('LESSON_NOT_FOUND')) setError('Không tìm thấy bài giảng hoặc liên kết đã bị tắt.');
      else setError('Lỗi kết nối: ' + msg);
    } finally { setLoading(false); }
  };

  const sections: any[] = data?.sections || [];
  const cur = sections[active];

  // Ghi nhận lượt xem phần đang mở.
  useEffect(() => {
    if (phase !== 'view' || !cur) return;
    if (viewed.current.has(cur.id)) return;
    viewed.current.add(cur.id);
    force(x => x + 1);
    elLogView(token, code.trim(), cur.id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, active]);

  if (phase === 'enter') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"><GraduationCap className="h-7 w-7" /></div>
            <h1 className="font-display text-xl font-bold text-slate-900">Xem bài giảng</h1>
            <p className="mt-1 text-xs text-slate-500">Nhập mã số sinh viên để truy cập nội dung bài giảng được giao.</p>
          </div>
          <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && open()} placeholder="Mã số sinh viên" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-bold outline-none focus:border-brand" />
          {error && <p className="mt-2 text-center text-xs font-semibold text-rose-500">{error}</p>}
          <button onClick={open} disabled={loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} Vào xem
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><BookOpen className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base font-bold text-slate-900 truncate">{data?.title}</h1>
            <p className="text-[11px] text-slate-400">{data?.student_name} · {sections.length} phần</p>
          </div>
          <button
            onClick={() => exportLessonToPdf(
              { title: data?.title, author_label: data?.author_label, owner_name: data?.owner_name } as any,
              sections.map((s: any) => ({ id: s.id, title: s.title, content: s.content })) as any,
              sections.flatMap((s: any) => (s.resources || []).map((r: any) => ({ section_id: s.id, url: r.url, title: r.title }))) as any
            )}
            title="Tải toàn bộ bài giảng ra PDF"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:border-brand/30 hover:text-brand"
          >
            <FileDown className="h-3.5 w-3.5" /> Tải PDF
          </button>
        </div>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          {cur ? (
            <>
              <h2 className="mb-3 font-display text-lg font-bold text-slate-900">{cur.title}</h2>
              <div className="prose prose-sm max-w-none break-words text-slate-700 [overflow-wrap:anywhere] [&_a]:break-all" dangerouslySetInnerHTML={{ __html: cur.content || '<p>(Chưa có nội dung)</p>' }} />
              {(cur.resources || []).length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-[10px] font-black uppercase text-slate-400">Tài nguyên</p>
                  <div className="space-y-1.5">
                    {(cur.resources || []).map((r: any, i: number) => (
                      <a key={i} href={r.url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand/30 hover:text-brand">
                        <FileText className="h-4 w-4 text-brand" /> <span className="min-w-0 flex-1 truncate">{r.title || 'Tài nguyên'}</span> <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-between">
                <button disabled={active === 0} onClick={() => setActive(a => Math.max(0, a - 1))} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40">Phần trước</button>
                <button disabled={active >= sections.length - 1} onClick={() => setActive(a => Math.min(sections.length - 1, a + 1))} className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-40">Phần tiếp theo</button>
              </div>
            </>
          ) : <p className="py-16 text-center text-sm text-slate-400">Bài giảng chưa có nội dung.</p>}
        </div>

        <div className="h-fit rounded-3xl border border-slate-100 bg-white p-3 shadow-sm lg:sticky lg:top-6">
          <p className="mb-2 px-2 text-[10px] font-black uppercase text-slate-400">Nội dung</p>
          <div className="space-y-1">
            {sections.map((s, i) => (
              <button key={s.id} onClick={() => setActive(i)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left ${i === active ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-50'}`}>
                {viewed.current.has(s.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" /> : <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-slate-300 text-[9px]">{i + 1}</span>}
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{s.title || `Phần ${i + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
