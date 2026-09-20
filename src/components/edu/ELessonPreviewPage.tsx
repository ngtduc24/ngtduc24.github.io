import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, FileText, CheckCircle2, ArrowLeft, Copy, ExternalLink, ShieldAlert } from 'lucide-react';
import { ELLesson, ELSection, ELResource, getLesson, getSections, getResources, copyPublicLesson } from '../../lib/elearning';

interface Props { lessonId: string; }

// Trang xem bài giảng ở chế độ riêng, có link riêng dạng ?elview=<id>.
// Ai cũng xem được bài đã công khai. Chủ sở hữu hoặc admin xem được cả bản nháp.
export default function ELessonPreviewPage({ lessonId }: Props) {
  const [lesson, setLesson] = useState<ELLesson | null>(null);
  const [sections, setSections] = useState<ELSection[]>([]);
  const [resources, setResources] = useState<ELResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [active, setActive] = useState(0);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const me = (() => { try { return JSON.parse(localStorage.getItem('logged_in_user') || 'null'); } catch { return null; } })();
  const goBack = () => {
    // Luôn quay về trang E-Learning cho chắc, không phụ thuộc lịch sử trình duyệt.
    try { localStorage.setItem('app_last_active_tab', 'elearning'); } catch {}
    window.location.href = `${window.location.origin}${window.location.pathname}?tab=e-learning`;
  };

  useEffect(() => {
    (async () => {
      try {
        const l = await getLesson(lessonId);
        const isPublic = l.is_public && l.status === 'published' && !l.deleted_at;
        const isOwner = me && (me.id === l.owner_id || me.role === 'admin');
        if (!isPublic && !isOwner) { setDenied(true); setLoading(false); return; }
        const [s, r] = await Promise.all([getSections(lessonId), getResources(lessonId)]);
        setLesson(l); setSections(s); setResources(r);
      } catch { setDenied(true); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Khi chuyển sang phần nội dung khác (bấm Phần tiếp theo, Phần trước hoặc chọn ở mục lục),
  // tự động cuộn màn hình lên đầu trang cho dễ đọc từ đầu.
  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
  }, [active]);

  const doCopy = async () => {
    if (!me) { window.location.href = window.location.origin + window.location.pathname; return; }
    setCopying(true);
    try { await copyPublicLesson(lessonId, me.fullName); setCopied(true); }
    catch { /* bỏ qua */ }
    finally { setCopying(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;
  if (denied || !lesson) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500"><ShieldAlert className="h-6 w-6" /></div>
        <h1 className="font-display text-lg font-bold text-slate-900">Không xem được bài giảng</h1>
        <p className="mt-1 text-xs text-slate-500">Bài giảng không tồn tại hoặc chưa được công khai.</p>
        <button onClick={goBack} className="mt-4 inline-block rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">Quay lại</button>
      </div>
    </div>
  );

  const cur = sections[active];
  const curRes = resources.filter(r => r.section_id === cur?.id);
  const canCopy = me && lesson.is_public && lesson.allow_copy && me.id !== lesson.owner_id;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowLeft className="h-4 w-4" /></button>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><BookOpen className="h-5 w-5" /></div>
            <div>
              <h1 className="font-display text-base font-bold text-slate-900">{lesson.title}</h1>
              <p className="text-[11px] text-slate-400">{lesson.author_label || lesson.owner_name || 'Ẩn danh'} · {sections.length} phần{lesson.is_public ? '' : ' · Bản nháp'}</p>
            </div>
          </div>
          {canCopy && <button onClick={doCopy} disabled={copying || copied} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-[11px] font-bold text-white hover:bg-brand-hover disabled:opacity-60">{copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Đã sao chép' : 'Sao chép về kho của tôi'}</button>}
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          {lesson.summary && <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">{lesson.summary}</p>}
          {cur ? (
            <>
              <h2 className="mb-3 font-display text-lg font-bold text-slate-900">{active + 1}. {cur.title}</h2>
              <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: cur.content || '<p class="text-slate-400">(Chưa có nội dung)</p>' }} />
              {curRes.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-[10px] font-black uppercase text-slate-400">Tài nguyên</p>
                  <div className="space-y-1.5">
                    {curRes.map(r => (
                      <a key={r.id} href={r.url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand/30 hover:text-brand">
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
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${i === active ? 'bg-brand text-white' : 'border border-slate-300'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{s.title || `Phần ${i + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
