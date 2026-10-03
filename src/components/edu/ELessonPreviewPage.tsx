import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, FileText, CheckCircle2, ArrowLeft, Copy, ExternalLink, ShieldAlert, FileDown, Pencil, UserPlus } from 'lucide-react';
import { getMyRole, listCollaborators, Collaborator, MyRole } from '../../lib/collab';
import { setEduAuthContext } from '../../lib/edu';
import { getSeoMeta } from '../../lib/seoConfig';
import { useNotifications } from '../NotificationContext';
import LessonSharePanel from './LessonSharePanel';
import { ELLesson, ELSection, ELResource, getLesson, getSections, getResources, copyPublicLesson } from '../../lib/elearning';
import { exportLessonToPdf } from '../../lib/lessonPdf';
import { UserChip } from '../ui/People';
import SectionBar from './LessonSectionBar';

interface Props { lessonId: string; }

// Trang xem giáo trình ở chế độ riêng, có link riêng dạng ?elview=<id>.
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
  // Chủ sở hữu và người cộng tác: nút Sửa, nút Thêm người cạnh nút Tải PDF
  const [role, setRole] = useState<MyRole>(null);
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [collabTick, setCollabTick] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const { addNotification } = useNotifications();

  const me = (() => { try { return JSON.parse(localStorage.getItem('logged_in_user') || 'null'); } catch { return null; } })();
  const goBack = () => {
    // Luôn quay về trang Giáo trình cho chắc, không phụ thuộc lịch sử trình duyệt.
    try { localStorage.setItem('app_last_active_tab', 'elearning'); } catch {}
    window.location.href = `${window.location.origin}/?tab=e-learning`;
  };

  useEffect(() => {
    (async () => {
      try {
        const l = await getLesson(lessonId);
        const isPublic = l.is_public && l.status === 'published' && !l.deleted_at;
        const isOwner = !!me && me.id === l.owner_id;
        if (me?.id) setEduAuthContext(me.id, me.role === 'admin');
        const myRole: MyRole = isOwner ? 'owner' : me?.id ? await getMyRole('el_lesson', lessonId, l.owner_id).catch(() => null) : null;
        setRole(myRole);
        // Bản chưa công khai: chủ sở hữu và người được thêm vẫn xem được
        if (!isPublic && !myRole) { setDenied(true); setLoading(false); return; }
        const [s, r] = await Promise.all([getSections(lessonId), getResources(lessonId)]);
        setLesson(l); setSections(s); setResources(r);
      } catch { setDenied(true); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => { if (role === 'owner' || role === 'manage') listCollaborators('el_lesson', lessonId).then(setCollabs).catch(() => {}); }, [role, lessonId, collabTick]);

  // Khi chuyển sang phần nội dung khác (bấm Phần tiếp theo, Phần trước hoặc chọn ở mục lục),
  // tự động cuộn màn hình lên đầu trang cho dễ đọc từ đầu.
  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
  }, [active]);

  const doCopy = async () => {
    if (!me) { window.location.href = window.location.origin + '/'; return; }
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
        <h1 className="font-display text-lg font-bold text-slate-900">Không xem được giáo trình</h1>
        <p className="mt-1 text-xs text-slate-500">Giáo trình không tồn tại hoặc chưa được công khai.</p>
        <button onClick={goBack} className="mt-4 inline-block rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">Quay lại</button>
      </div>
    </div>
  );

  const cur = sections[active];
  const curRes = resources.filter(r => r.section_id === cur?.id);
  const canCopy = me && lesson.is_public && lesson.allow_copy && me.id !== lesson.owner_id;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85" style={{ borderTop: 'env(safe-area-inset-top) solid var(--color-brand-hover, #059669)' }}>
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <button onClick={goBack} title="Quay lại" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowLeft className="h-4 w-4" /></button>
          <div className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand sm:grid"><BookOpen className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <h1 title={lesson.title} className="line-clamp-2 font-display text-[14px] font-bold leading-snug text-slate-900 sm:text-base">{lesson.title}</h1>
            <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400"><span className="min-w-0 truncate">{lesson.owner_id ? <UserChip id={lesson.owner_id} name={lesson.author_label || lesson.owner_name} size={18} nameClass="text-xs font-semibold text-slate-600" /> : <span>{lesson.author_label || lesson.owner_name || 'Ẩn danh'}</span>}</span><span className="shrink-0"><span className={sections.length > 1 ? 'max-lg:hidden' : ''}>· {sections.length} phần</span>{lesson.is_public ? '' : ' · Bản nháp'}</span></p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {(role === 'owner' || role === 'manage') && (
              <div className="relative">
                <button data-share-toggle onClick={() => setShareOpen(v => !v)} title="Thêm người cùng xem, cùng chỉnh sửa" className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold sm:px-4 border border-slate-200 bg-white text-slate-600 hover:border-brand/30 hover:text-brand">
                  <UserPlus className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Thêm người</span>
                </button>
                {shareOpen && (
                  <LessonSharePanel lesson={lesson} title={lesson.title} currentUser={me} canManage isOwner={role === 'owner'}
                    canGoPublic={false} publicHint="Muốn công khai lên Thư viện, hãy mở trang Sửa và bật Xuất bản, Công khai lên thư viện."
                    collabs={collabs} onCollabsChange={() => setCollabTick(v => v + 1)}
                    onTogglePublic={async () => { addNotification('Hãy mở trang Sửa để đổi chế độ công khai.', 'info'); return false; }}
                    onPdf={() => { setShareOpen(false); exportLessonToPdf(lesson, sections, resources); }}
                    onPreview={() => setShareOpen(false)}
                    onClose={() => setShareOpen(false)} notify={(m, t) => addNotification(m, t)} />
                )}
              </div>
            )}
            {(role === 'owner' || role === 'manage' || role === 'edit') && (
              <a href={`${window.location.origin}/?tab=${getSeoMeta('elearning').slug}&sv=editor&lid=${encodeURIComponent(lesson.id)}`} title="Sửa giáo trình" className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold sm:px-4 bg-brand text-white hover:bg-brand-hover">
                <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Sửa</span>
              </a>
            )}
            <button onClick={() => exportLessonToPdf(lesson, sections, resources)} title="Tải toàn bộ giáo trình ra PDF" className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold sm:px-4 border border-slate-200 bg-white text-slate-600 hover:border-brand/30 hover:text-brand">
              <FileDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Tải PDF</span>
            </button>
            {canCopy && <button onClick={doCopy} disabled={copying || copied} title="Sao chép về kho của tôi" className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold sm:px-4 bg-brand text-white hover:bg-brand-hover disabled:opacity-60">{copying ? <Loader2 className="h-4 w-4 animate-spin sm:h-3.5 sm:w-3.5" /> : copied ? <CheckCircle2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> : <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5" />} <span className="hidden sm:inline">{copied ? 'Đã sao chép' : 'Sao chép về kho của tôi'}</span></button>}
          </div>
        </div>
        {sections.length > 1 && <SectionBar sections={sections} active={active} onPick={setActive} />}
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          {lesson.summary && <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">{lesson.summary}</p>}
          {cur ? (
            <>
              <h2 className="mb-3 font-display text-lg font-bold text-slate-900">{active + 1}. {cur.title}</h2>
              <div className="prose prose-sm max-w-none break-words text-slate-700 [overflow-wrap:anywhere] [&_a]:break-all" dangerouslySetInnerHTML={{ __html: cur.content || '<p class="text-slate-400">(Chưa có nội dung)</p>' }} />
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
          ) : <p className="py-16 text-center text-sm text-slate-400">Giáo trình chưa có nội dung.</p>}
        </div>

        <div className="h-fit rounded-3xl border border-slate-100 bg-white p-3 shadow-sm lg:sticky lg:top-[92px]">
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
