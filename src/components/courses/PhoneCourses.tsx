import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronDown, Home, Heart, Share2, Play, Lock, CheckCircle2, Clock, Users, List, Award, BookOpen,
  Video, FileText, ClipboardCheck, Download, PenLine, Presentation, GraduationCap, X, Search, Library, Trash2, Copy,
  Loader2, Bookmark, BookMarked, LogOut,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { PortfolioCourse, CourseLesson, CourseStudent, PortfolioCoursesSettings } from '../portfolioTypes';
import { PROMO_TONES } from './CoursePromoSettings';
import { saveCourseStudent, deleteCourseStudentDoc, LEGACY_OWNER } from '../../lib/portfolioData';
import { usePerson } from '../../lib/people';
import { getSections as getELSections, getResources as getELResources, ELSection, ELResource } from '../../lib/elearning';
import { sanitizeHtml, isSafeUrl } from '../../lib/sanitizeHtml';
import { readSubRoute, writeSubRoute } from '../../lib/seoConfig';
import { trackDoc, toggleFavCourse, useUsage } from '../../lib/personalize';
import { phoneUi } from '../../lib/device';
import { usePhoneMaybe, usePhoneBack } from '../phone/PhoneShell';
import { PhoneTop } from '../phone/PhoneHome';
import { PhoneSeg, PhoneChips, PhoneChip, PhoneEmpty } from '../phone/PhoneKit';
import CoursePlayer, { PlayerApi } from './CoursePlayer';
import { useConfirmation } from '../ConfirmationContext';
import { notice, copyText } from '../ui/Dialogs';
import './phoneCourses.css';

// Khoá học trên điện thoại theo bản mẫu đã duyệt: danh sách (Học tiếp, Nổi bật, thẻ Tất cả, Của tôi, Đã lưu),
// trang khoá học (ảnh bìa, thông số, Tổng quan, Nội dung, Tài liệu, nút Ghi danh cố định ở đáy)
// và màn học bài (video, Bài giảng, Nội dung khoá, Tài liệu, Ghi chú theo mốc thời gian, nút Hoàn thành ở đáy).

type View = { k: 'list' } | { k: 'detail'; id: string } | { k: 'learn'; id: string; lesson?: string };
type FlatLesson = CourseLesson & { chapterTitle: string; chapterIndex: number; index: number };

const LEVEL: Record<string, string> = { basic: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' };
const TONES = [
  'linear-gradient(135deg,#7c3aed,#c026d3)', 'linear-gradient(135deg,#ea580c,#f59e0b)', 'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#059669,#14b8a6)', 'linear-gradient(135deg,#2563eb,#0ea5e9)', 'linear-gradient(135deg,#e11d48,#f97316)',
];
const tone = (id: string) => TONES[Array.from(id).reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length];
const money = (v: number) => (v > 0 ? `${v.toLocaleString('vi-VN')}đ` : 'Miễn phí');

export function flatLessons(c: PortfolioCourse): FlatLesson[] {
  const out: FlatLesson[] = [];
  (c.chapters || []).forEach((ch, ci) => (ch.lessons || []).forEach(l => out.push({ ...l, chapterId: l.chapterId || ch.id, chapterTitle: ch.title, chapterIndex: ci, index: out.length })));
  return out;
}
function priceOf(c: PortfolioCourse) {
  const now = Date.now();
  const saleOn = c.salePrice > 0 && c.salePrice < c.price
    && (!c.saleStartDate || new Date(c.saleStartDate).getTime() <= now)
    && (!c.saleEndDate || new Date(c.saleEndDate).getTime() + 86400e3 > now);
  return { now: saleOn ? c.salePrice : c.price, old: saleOn ? c.price : 0, off: saleOn ? Math.round((1 - c.salePrice / c.price) * 100) : 0 };
}
const lessonLen = (l: CourseLesson) => {
  const v = String(l.videoDuration || l.duration || '').trim();
  if (!v) return '';
  return /^\d+$/.test(v) ? `${v} phút` : v;
};
const lessonKind = (l: CourseLesson) => (l.videoUrl ? 'v' : l.elLessonId ? 'e' : 'd');

function Cover({ c, className, children }: { c: PortfolioCourse; className: string; children?: React.ReactNode }) {
  return (
    <span className={className} style={{ background: tone(c.id) }}>
      {c.coverImage ? <img src={c.coverImage} alt="" loading="lazy" /> : <GraduationCap className="art" />}
      {children}
    </span>
  );
}

export default function PhoneCourses({ user, courses, loading, onEnroll, registering, onUpdateCourse, settings }: {
  user: UserAccount; courses: PortfolioCourse[]; loading: boolean; settings?: PortfolioCoursesSettings | null;
  onEnroll: (c: PortfolioCourse) => Promise<void> | void; registering: boolean; onUpdateCourse: (c: PortfolioCourse) => void;
}) {
  const isAdmin = user.role === 'admin';
  const usage = useUsage(user.id);
  const favs = usage.favCourses || [];

  // Mở thẳng 1 khoá hoặc 1 bài học từ đường dẫn (mục Tiếp tục ở Trang chủ, link chia sẻ ?course=).
  const [view, setView] = useState<View>(() => {
    const r = readSubRoute();
    const shared = new URLSearchParams(window.location.search).get('course');
    if (r.crs && r.crl) return { k: 'learn', id: r.crs, lesson: r.crl };
    if (r.crs || shared) return { k: 'detail', id: (r.crs || shared)! };
    return { k: 'list' };
  });
  useEffect(() => {
    writeSubRoute({ crs: view.k === 'list' ? null : view.id, crl: view.k === 'learn' ? (view.lesson || null) : null });
  }, [view]);
  useEffect(() => () => { writeSubRoute({ crs: null, crl: null }); }, []);
  useEffect(() => {
    document.documentElement.classList.add('ph-own-head');
    return () => document.documentElement.classList.remove('ph-own-head');
  }, []);
  usePhoneBack(view.k === 'list' ? null : () => setView(v => (v.k === 'learn' ? { k: 'detail', id: v.id } : { k: 'list' })));
  useEffect(() => { document.querySelector('.ph-main')?.scrollTo({ top: 0 }); window.scrollTo({ top: 0 }); }, [view.k, view.k !== 'list' ? view.id : '']);

  const enrOf = (c: PortfolioCourse) => (c.students || []).find(s => s.accountId === user.id || (!!user.email && (s.studentEmail === user.email || s.email === user.email)));
  const canLearn = (c: PortfolioCourse) => isAdmin || enrOf(c)?.paymentStatus === 'paid';
  const progressOf = (c: PortfolioCourse) => {
    const e = enrOf(c); if (!e) return null;
    const ids = flatLessons(c).map(l => l.id);
    if (!ids.length) return e.progress || 0;
    const done = (e.completedLessons || []).filter(id => ids.includes(id)).length;
    return Math.round(done / ids.length * 100);
  };

  const course = view.k !== 'list' ? courses.find(c => c.id === view.id) : undefined;
  useEffect(() => {
    if (course) trackDoc({ kind: 'course', id: course.id, title: course.title, tab: 'courses', sub: { crs: course.id } });
  }, [course?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !courses.length) return <div className="cx-load"><Loader2 className="spin" /> Đang tải khoá học...</div>;
  if (view.k !== 'list' && !course) {
    return loading ? <div className="cx-load"><Loader2 className="spin" /> Đang tải khoá học...</div>
      : <div className="cx-load"><PhoneEmpty icon={GraduationCap} title="Không tìm thấy khoá học" sub="Khoá học có thể đã bị ẩn hoặc xoá." action={<button type="button" className="cx-btn" onClick={() => setView({ k: 'list' })}>Về danh sách khoá học</button>} /></div>;
  }

  const ctx = { user, isAdmin, enrOf, canLearn, progressOf, favs, onEnroll, registering, onUpdateCourse, setView, settings };
  if (view.k === 'detail' && course) return <CourseDetail c={course} ctx={ctx} />;
  if (view.k === 'learn' && course) return <CourseLearn key={course.id} c={course} startLesson={view.lesson} ctx={ctx} />;
  return <CourseList courses={courses} ctx={ctx} />;
}

type Ctx = {
  user: UserAccount; isAdmin: boolean; favs: string[];
  enrOf: (c: PortfolioCourse) => CourseStudent | undefined; canLearn: (c: PortfolioCourse) => boolean; progressOf: (c: PortfolioCourse) => number | null;
  onEnroll: (c: PortfolioCourse) => Promise<void> | void; registering: boolean; onUpdateCourse: (c: PortfolioCourse) => void;
  setView: (v: View) => void; settings?: PortfolioCoursesSettings | null;
};

/* ======================= Danh sách ======================= */
function CourseList({ courses, ctx }: { courses: PortfolioCourse[]; ctx: Ctx }) {
  const phone = usePhoneMaybe()!;
  const [tab, setTab] = useState<'all' | 'mine' | 'saved'>('all');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const published = courses.filter(c => c.status === 'published' || (ctx.isAdmin && !!ctx.enrOf(c)));
  const mine = published.filter(c => !!ctx.enrOf(c));
  const saved = published.filter(c => ctx.favs.includes(c.id));
  const cats = Array.from(new Set(published.map(c => c.category).filter(Boolean)));

  // Thẻ Học tiếp: khoá đã ghi danh chưa học xong, học gần nhất đứng trước.
  const cont = mine
    .filter(c => (ctx.progressOf(c) ?? 0) < 100)
    .sort((a, b) => new Date(ctx.enrOf(b)?.lastAt || ctx.enrOf(b)?.registrationDate || 0).getTime() - new Date(ctx.enrOf(a)?.lastAt || ctx.enrOf(a)?.registrationDate || 0).getTime())[0];
  const contLesson = cont ? (() => {
    const ls = flatLessons(cont); const e = ctx.enrOf(cont);
    return ls.find(l => l.id === e?.lastLessonId) || ls.find(l => !(e?.completedLessons || []).includes(l.id)) || ls[0];
  })() : undefined;
  const featured = published.filter(c => !ctx.enrOf(c)).sort((a, b) => (b.studentsCount || 0) - (a.studentsCount || 0)).slice(0, 6);
  const doneN = mine.filter(c => ctx.progressOf(c) === 100).length;
  // Banner quảng cáo: banner admin đặt (bỏ banner ẩn, khoá chưa phát hành), chưa đặt thì tự lấy khoá nổi bật nếu admin cho phép.
  const promo = ctx.settings?.promo;
  const slides: Slide[] = promo?.on === false ? [] : (() => {
    const set = (promo?.items || []).filter(x => !x.hidden).map(x => ({ p: x, c: published.find(c => c.id === x.courseId) })).filter(x => !!x.c) as Slide[];
    if (set.length || promo?.auto === false) return set;
    return featured.slice(0, 3).map((c, i) => ({ p: { id: `auto_${c.id}`, courseId: c.id, tone: i, tag: 'Nổi bật' }, c }));
  })();

  const base = tab === 'mine' ? mine : tab === 'saved' ? saved : published;
  const kw = q.trim().toLowerCase();
  const list = base
    .filter(c => !cat || c.category === cat)
    .filter(c => !kw || [c.title, c.category, c.instructor, c.briefDescription].some(x => (x || '').toLowerCase().includes(kw)));

  const ui = { ...phoneUi(phone.settings), title: 'Học kỹ năng mới, theo nhịp của bạn', desc: `${published.length} khoá đang mở · bạn đang học ${mine.length} khoá`, titleOn: true, descOn: true };
  return (
    <div className="cx">
      <div style={{ margin: '-12px -12px 0' }}>
        <PhoneTop settings={phone.settings} ui={ui} acts={[]} nav={{ title: 'Khoá học', onBack: () => phone.open('dashboard'), onHome: () => phone.open('dashboard') }} />
        {slides.length > 0 ? <PromoBanner slides={slides} ctx={ctx} /> : (
          <div className="ph-grid cx-cont">
            {cont ? <button type="button" className="cx-contc" onClick={() => ctx.setView({ k: 'learn', id: cont!.id, lesson: contLesson?.id })}>
              <Cover c={cont!} className="cv"><i><Play /></i></Cover>
              <span className="m">
                <small>Học tiếp</small>
                <b>{cont!.title}</b>
                <span className="s">{contLesson?.title || 'Bắt đầu bài đầu tiên'}</span>
                <span className="bar"><i style={{ width: `${ctx.progressOf(cont!) || 0}%` }} /></span>
              </span>
            </button> : (
              <div className="cx-stats">
                <div><b>{published.length}</b><span>khoá đang mở</span></div>
                <div><b>{mine.length}</b><span>khoá đang học</span></div>
                <div><b>{doneN}</b><span>đã học xong</span></div>
              </div>
            )}
          </div>
        )}
      </div>

      {slides.length > 0 && cont && <div className="cx-contbox"><button type="button" className="cx-contc" onClick={() => ctx.setView({ k: 'learn', id: cont!.id, lesson: contLesson?.id })}>
              <Cover c={cont!} className="cv"><i><Play /></i></Cover>
              <span className="m">
                <small>Học tiếp</small>
                <b>{cont!.title}</b>
                <span className="s">{contLesson?.title || 'Bắt đầu bài đầu tiên'}</span>
                <span className="bar"><i style={{ width: `${ctx.progressOf(cont!) || 0}%` }} /></span>
              </span>
            </button></div>}

      {featured.length > 0 && tab === 'all' && !kw && !cat && <>
        <div className="ph-sec"><h3>Nổi bật</h3></div>
        <div className="ph-hscroll cx-feats">
          {featured.map(c => { const p = priceOf(c); return (
            <button key={c.id} type="button" className="cx-feat" onClick={() => ctx.setView({ k: 'detail', id: c.id })}>
              <Cover c={c} className="cv"><em>{money(p.now)}</em></Cover>
              <span className="bd"><b>{c.title}</b>
                <span className="cx-meta"><span><List />{flatLessons(c).length || c.lessonsCount || 0} bài</span><span><Users />{c.studentsCount || 0}</span></span></span>
            </button>
          ); })}
        </div>
      </>}

      <div className="pk-cls-sec">
        <PhoneSeg tabs={[
          { id: 'all', label: 'Tất cả', icon: Library, count: published.length },
          { id: 'mine', label: 'Của tôi', icon: BookOpen, count: mine.length },
          { id: 'saved', label: 'Đã lưu', icon: Bookmark, count: saved.length },
        ]} active={tab} onTab={t => setTab(t as any)} />
        <div className="pk-cls-panel">
          <div className="pk-srch">
            <Search /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm khoá học, chủ đề, giảng viên..." enterKeyHint="search" />
            {q && <button type="button" className="clr" aria-label="Xoá tìm kiếm" onClick={() => setQ('')}><X /></button>}
          </div>
          {cats.length > 1 && (
            <PhoneChips>
              <PhoneChip on={!cat} onClick={() => setCat('')}>Tất cả</PhoneChip>
              {cats.map(x => <PhoneChip key={x} on={cat === x} onClick={() => setCat(x)}>{x}</PhoneChip>)}
            </PhoneChips>
          )}
          <div className="cx-list">
            {list.length === 0 ? (
              <PhoneEmpty icon={tab === 'saved' ? Bookmark : GraduationCap}
                title={kw || cat ? 'Không có khoá nào khớp' : tab === 'mine' ? 'Bạn chưa ghi danh khoá học nào' : tab === 'saved' ? 'Chưa lưu khoá học nào' : 'Chưa có khoá học nào được phát hành'}
                sub={tab === 'saved' && !kw && !cat ? 'Bấm hình trái tim ở trang khoá học để lưu lại xem sau.' : undefined} />
            ) : list.map(c => <CourseRow key={c.id} c={c} ctx={ctx} />)}
          </div>
        </div>
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

type Slide = { p: import('../portfolioTypes').CoursePromo; c: PortfolioCourse };

// Banner quảng cáo khoá học: vuốt ngang, tự chuyển sau 5 giây, nút Đăng ký ghi danh ngay, đã ghi danh thì thành Vào học.
function PromoBanner({ slides, ctx }: { slides: Slide[]; ctx: Ctx }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const hold = useRef(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = window.setInterval(() => {
      if (Date.now() - hold.current < 6000) return;
      const el = ref.current; if (!el) return;
      const n = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length;
      el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => window.clearInterval(t);
  }, [slides.length]);
  const [busy, setBusy] = useState('');
  return (
    <div className="cx-promo">
      <div className="trk ph-hscroll" data-no-pull ref={ref}
        onScroll={e => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); }}
        onTouchStart={() => { hold.current = Date.now(); }}>
        {slides.map(({ p, c }) => {
          const enr = !!ctx.enrOf(c);
          const pr = priceOf(c);
          const img = p.image || c.coverImage;
          return (
            <div key={p.id} className="sl" role="button" tabIndex={0} style={{ background: PROMO_TONES[(p.tone ?? 0) % PROMO_TONES.length] }}
              onClick={() => ctx.setView({ k: 'detail', id: c.id })}>
              {img && <img src={img} alt="" />}
              <span className="sh" />
              <span className="tx">
                {p.tag && <em>{p.tag}</em>}
                <b>{p.title?.trim() || c.title}</b>
                {(p.sub?.trim() || c.briefDescription) && <span className="s">{p.sub?.trim() || c.briefDescription}</span>}
                <span className="ft">
                  <button type="button" disabled={!!busy} onClick={async e => {
                    e.stopPropagation();
                    if (enr) { ctx.setView({ k: 'learn', id: c.id }); return; }
                    setBusy(c.id); try { await ctx.onEnroll(c); } finally { setBusy(''); }
                  }}>{busy === c.id ? <Loader2 className="spin" /> : enr ? <Play /> : <BookMarked />}{enr ? 'Vào học' : (p.btn?.trim() || 'Đăng ký ngay')}</button>
                  {!enr && <span className="pr">{money(pr.now)}{pr.old > 0 && <s>{money(pr.old)}</s>}</span>}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      {slides.length > 1 && <div className="dots">{slides.map((s2, k) => <i key={s2.p.id} className={k === i ? 'on' : ''} />)}</div>}
    </div>
  );
}

function CourseRow({ c, ctx }: { c: PortfolioCourse; ctx: Ctx }) {
  const pr = ctx.progressOf(c);
  const p = priceOf(c);
  return (
    <button type="button" className="cx-row" onClick={() => ctx.setView({ k: 'detail', id: c.id })}>
      <Cover c={c} className="cv"><em>{LEVEL[c.level] || 'Cơ bản'}</em></Cover>
      <span className="m">
        <span className="cat">{c.category || 'Khoá học'}</span>
        <b>{c.title}</b>
        <span className="cx-meta"><span><List />{flatLessons(c).length || c.lessonsCount || 0} bài</span>{c.duration && <span><Clock />{c.duration}</span>}</span>
        <span className="ft">
          {pr === 100 ? <span className="okb"><CheckCircle2 />Đã học xong</span>
            : pr !== null ? <span className="cx-pg"><span className="t"><span>Đã học</span><b>{pr}%</b></span><span className="bar"><i style={{ width: `${pr}%` }} /></span></span>
            : <span className="pr"><b className={p.now ? '' : 'free'}>{money(p.now)}</b>{p.old > 0 && <s>{money(p.old)}</s>}</span>}
        </span>
      </span>
    </button>
  );
}

/* ======================= Trang khoá học ======================= */
function CourseDetail({ c, ctx }: { c: PortfolioCourse; ctx: Ctx }) {
  const [tab, setTab] = useState<'over' | 'cont' | 'doc'>('over');
  const [intro, setIntro] = useState(false);
  const lessons = useMemo(() => flatLessons(c), [c]);
  const enr = ctx.enrOf(c);
  const learn = ctx.canLearn(c);
  const pr = ctx.progressOf(c);
  const p = priceOf(c);
  const fav = ctx.favs.includes(c.id);
  const done = enr?.completedLessons || [];
  const next = lessons.find(l => l.id === enr?.lastLessonId && !done.includes(l.id)) || lessons.find(l => !done.includes(l.id));
  const outcomes = (c.learningOutcomes?.length ? c.learningOutcomes : c.objectives || []).filter(Boolean);

  const share = async () => {
    const url = `${window.location.origin}/c/${c.id}/`;
    const nav = navigator as any;
    if (nav.share) { try { await nav.share({ title: c.title, url }); return; } catch { /* người dùng đóng bảng chia sẻ */ return; } }
    if (await copyText(url)) notice('Đã sao chép link khoá học.', 'info'); else notice('Không sao chép được link, hãy thử lại.');
  };
  const openLesson = (l: FlatLesson) => {
    if (!learn && !(l.allowPreview || l.isFreePreview)) { notice('Đăng ký khoá học để mở bài này.', 'info'); return; }
    ctx.setView({ k: 'learn', id: c.id, lesson: l.id });
  };
  const { confirm } = useConfirmation();
  const [leaving, setLeaving] = useState(false);
  // Huỷ ghi danh: xoá dòng ghi danh của chính mình (tiến độ, ghi chú của khoá này cũng mất), có hộp xác nhận trong trang.
  const leave = async () => {
    if (!enr) return;
    const ok = await confirm({ title: 'Huỷ ghi danh khoá học', message: `Bạn sẽ rời khoá "${c.title}". Tiến độ và ghi chú của khoá này sẽ bị xoá, muốn học lại thì ghi danh lại từ đầu.`, confirmText: 'Huỷ ghi danh', cancelText: 'Giữ lại' });
    if (!ok) return;
    setLeaving(true);
    const done2 = await deleteCourseStudentDoc(enr.id).catch(() => false);
    setLeaving(false);
    if (!done2) { notice('Chưa huỷ được ghi danh, vui lòng thử lại.'); return; }
    ctx.onUpdateCourse({ ...c, studentsCount: Math.max(0, (c.studentsCount || 1) - 1), students: (c.students || []).filter(s => s.id !== enr.id) });
    notice('Đã huỷ ghi danh khoá học.', 'info');
  };

  return (
    <div className="cx cx-d">
      <div className="cx-hero" style={{ background: tone(c.id) }}>
        {c.coverImage ? <img src={c.coverImage} alt="" /> : <GraduationCap className="art" />}
        <span className="shade" />
        <div className="tb">
          <button type="button" aria-label="Quay lại" onClick={() => ctx.setView({ k: 'list' })}><ChevronLeft /></button>
          <span>
            <button type="button" aria-label={fav ? 'Bỏ lưu' : 'Lưu khoá học'} className={fav ? 'on' : ''} onClick={() => toggleFavCourse(ctx.user.id, c.id)}><Heart /></button>
            <button type="button" aria-label="Chia sẻ" onClick={share}><Share2 /></button>
          </span>
        </div>
        {c.introVideo && <button type="button" className="pl" aria-label="Xem video giới thiệu" onClick={() => setIntro(true)}><Play /></button>}
        <div className="tx"><small>{[c.category, LEVEL[c.level]].filter(Boolean).join(' · ')}</small><h2>{c.title}</h2></div>
      </div>

      <div className="cx-sheet">
        <div className="cx-stat">
          <div><List /><b>{lessons.length || c.lessonsCount || 0}</b><span>bài học</span></div>
          <div><Clock /><b>{c.duration || 'Tự do'}</b><span>thời lượng</span></div>
          <div><Users /><b>{c.studentsCount || 0}</b><span>học viên</span></div>
          <div><Award /><b>{c.hasCertificate ? 'Có' : 'Không'}</b><span>chứng chỉ</span></div>
        </div>
        <Instructor c={c} />
        {pr !== null && (
          <div className="cx-box"><span className="cx-pg"><span className="t"><span>Tiến độ của bạn · {done.filter(id => lessons.some(l => l.id === id)).length} trên {lessons.length} bài</span><b>{pr}%</b></span><span className="bar"><i style={{ width: `${pr}%` }} /></span></span>
            <div className="cx-enr"><span><CheckCircle2 />Đã ghi danh{enr?.registrationDate ? ` từ ${new Date(enr.registrationDate).toLocaleDateString('vi-VN')}` : ''}</span>
              <button type="button" disabled={leaving} onClick={leave}>{leaving ? <Loader2 className="spin" /> : <LogOut />}Huỷ ghi danh</button></div>
          </div>
        )}

        <div className="cx-seg">
          <button type="button" className={tab === 'over' ? 'on' : ''} onClick={() => setTab('over')}>Tổng quan</button>
          <button type="button" className={tab === 'cont' ? 'on' : ''} onClick={() => setTab('cont')}>Nội dung</button>
          <button type="button" className={tab === 'doc' ? 'on' : ''} onClick={() => setTab('doc')}>Tài liệu</button>
        </div>

        {tab === 'over' && <>
          {(c.detailedDescription || c.briefDescription) && <div className="cx-box"><h4>Giới thiệu</h4><div className="cx-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.detailedDescription || c.briefDescription) }} /></div>}
          {outcomes.length > 0 && <div className="cx-box"><h4>Bạn sẽ học được</h4><div className="cx-learn">{outcomes.map((x, i) => <div key={i}><CheckCircle2 />{x}</div>)}</div></div>}
          {(c.targetStudents || []).filter(Boolean).length > 0 && <div className="cx-box"><h4>Khoá học dành cho</h4><ul className="cx-dots">{c.targetStudents.filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          {(c.requirements || []).filter(Boolean).length > 0 && <div className="cx-box"><h4>Yêu cầu</h4><ul className="cx-dots">{c.requirements.filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        </>}
        {tab === 'cont' && (
          <div className="cx-box"><h4>{(c.chapters || []).length} chương · {lessons.length} bài</h4>
            {lessons.length === 0 ? <p className="cx-mut">Khoá học chưa có bài học.</p> : <Chapters c={c} lessons={lessons} learn={learn} done={done} onOpen={openLesson} />}
          </div>
        )}
        {tab === 'doc' && (
          <div className="cx-box"><h4>Tài liệu khoá học</h4>
            {(c.documents || []).filter(d => d.url).length === 0 ? <p className="cx-mut">Khoá học chưa có tài liệu đính kèm.</p>
              : c.documents.filter(d => d.url).map((d, i) => <ResRow key={i} title={d.name || 'Tài liệu'} url={d.url} locked={!learn} />)}
          </div>
        )}
      </div>

      <div className="cx-bot">
        {enr && learn ? (
          <button type="button" className="cx-big" onClick={() => ctx.setView({ k: 'learn', id: c.id, lesson: next?.id })} disabled={!lessons.length}>
            <Play />{!done.length ? 'Bắt đầu học' : pr === 100 ? 'Xem lại khoá học' : `Học tiếp bài ${(next?.index ?? 0) + 1}`}
          </button>
        ) : <>
          {learn
            ? <button type="button" className="cx-ghost" onClick={() => ctx.setView({ k: 'learn', id: c.id, lesson: lessons[0]?.id })} disabled={!lessons.length}><Play />Xem trước</button>
            : <span className="pr"><b className={p.now ? '' : 'free'}>{money(p.now)}</b>{p.old > 0 && <s>{money(p.old)}</s>}</span>}
          <button type="button" className="cx-big" disabled={ctx.registering} onClick={() => ctx.onEnroll(c)}>
            {ctx.registering ? <Loader2 className="spin" /> : <BookMarked />}Đăng ký khoá học
          </button>
        </>}
      </div>

      {intro && (
        <div className="cx-intro" data-no-pull onClick={() => setIntro(false)}>
          <button type="button" className="x" aria-label="Đóng"><X /></button>
          <div className="fr" onClick={e => e.stopPropagation()}>
            <CoursePlayer src={c.introVideo} poster={c.coverImage || undefined} autoPlay />
          </div>
        </div>
      )}
    </div>
  );
}

// Giảng viên: tên và ảnh theo tài khoản tạo khoá (khoá cũ chưa ghi người tạo thì lấy chủ trang), không có thì dùng tên nhập tay.
function Instructor({ c }: { c: PortfolioCourse }) {
  const uid = c.creatorId || (c as any).ownerId || LEGACY_OWNER;
  const p = usePerson(uid, c.creatorName || c.instructor);
  const name = (p?.name && p.name !== 'Người dùng' ? p.name : '') || c.creatorName || c.instructor;
  if (!name) return null;
  return (
    <div className="cx-ins">
      <i>{p?.avatar ? <img src={p.avatar} alt="" /> : name.trim().split(/\s+/).pop()?.[0] || 'G'}</i>
      <span><b>{name}</b><span>{p?.username ? `@${p.username} · ` : ''}Giảng viên khoá học</span></span>
    </div>
  );
}

function Chapters({ c, lessons, learn, done, onOpen, current }: { c: PortfolioCourse; lessons: FlatLesson[]; learn: boolean; done: string[]; onOpen: (l: FlatLesson) => void; current?: string }) {
  const curCh = lessons.find(l => l.id === current)?.chapterIndex ?? 0;
  const [open, setOpen] = useState<number[]>([curCh]);
  return <>{(c.chapters || []).map((ch, ci) => {
    const ls = lessons.filter(l => l.chapterIndex === ci);
    const on = open.includes(ci);
    return (
      <div key={ch.id || ci} className={`cx-ch ${on ? 'op' : ''}`}>
        <button type="button" className="h" onClick={() => setOpen(o => (on ? o.filter(x => x !== ci) : [...o, ci]))}>
          <span className="n">{ci + 1}</span><b>{ch.title || `Chương ${ci + 1}`}</b><span>{ls.filter(l => done.includes(l.id)).length}/{ls.length}</span><ChevronDown className="cv" />
        </button>
        {on && ls.map(l => {
          const k = lessonKind(l);
          const pv = !learn && (l.allowPreview || l.isFreePreview);
          const lock = !learn && !pv;
          const isDone = done.includes(l.id);
          return (
            <button key={l.id} type="button" className={`cx-les ${l.id === current ? 'cur' : ''} ${lock ? 'lk' : ''}`} onClick={() => onOpen(l)}>
              <span className={`ic ${k}`}>{k === 'v' ? <Video /> : k === 'e' ? <Presentation /> : <FileText />}</span>
              <span className="m"><b>Bài {l.index + 1}. {l.title}</b><small>{[k === 'v' ? 'Video' : k === 'e' ? 'Bài giảng' : 'Bài đọc', lessonLen(l), l.quizSlug ? 'có Quizz' : ''].filter(Boolean).join(' · ')}</small></span>
              {lock ? <Lock className="end" /> : pv ? <span className="pv">Học thử</span> : isDone ? <CheckCircle2 className="end ok" /> : null}
            </button>
          );
        })}
      </div>
    );
  })}</>;
}

function ResRow({ title, url, sub, locked }: { title: string; url: string; sub?: string; locked?: boolean }) {
  const safe = isSafeUrl(url);
  return (
    <div className="cx-res">
      <span className="ic"><FileText /></span>
      <b>{title}{sub && <small>{sub}</small>}</b>
      {locked ? <Lock className="lk" /> : safe ? <a href={url} target="_blank" rel="noreferrer" aria-label={`Mở ${title}`}><Download /></a> : null}
    </div>
  );
}

/* ======================= Học bài ======================= */
type Note = { id: string; text: string; timestamp: string; color?: string; sec?: number };
const fmtSec = (s: number) => { const t = Math.max(0, Math.floor(s)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

function CourseLearn({ c, startLesson, ctx }: { c: PortfolioCourse; startLesson?: string; ctx: Ctx }) {
  const lessons = useMemo(() => flatLessons(c), [c]);
  const enr0 = ctx.enrOf(c);
  const [enr, setEnr] = useState<CourseStudent | undefined>(enr0);
  useEffect(() => { if (enr0) setEnr(e => (e && e.id === enr0.id ? { ...enr0, ...e } : enr0)); }, [enr0?.id, enr0?.paymentStatus]); // eslint-disable-line react-hooks/exhaustive-deps
  const learn = ctx.canLearn(c);
  const [localDone, setLocalDone] = useState<string[]>([]);
  const done = Array.from(new Set([...(enr?.completedLessons || []), ...localDone]));
  const first = lessons.find(l => l.id === startLesson) || lessons.find(l => l.id === enr?.lastLessonId) || lessons.find(l => !done.includes(l.id)) || lessons[0];
  const [curId, setCurId] = useState(first?.id || '');
  const cur = lessons.find(l => l.id === curId) || lessons[0];
  const [tab, setTab] = useState<'list' | 'doc' | 'quiz' | 'note'>('list');
  const bodyRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  // Đổi thẻ thì kéo thẻ đang chọn vào giữa hàng thẻ (hàng thẻ cuộn ngang).
  useEffect(() => { const el = tabsRef.current?.querySelector('.on') as HTMLElement | null; el?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [tab]);
  const player = useRef<PlayerApi>(null);
  const locked = !!cur && !learn && !(cur.allowPreview || cur.isFreePreview);

  // Ghi dòng ghi danh (tiến độ, bài đang học, ghi chú) xuống máy chủ và báo cho danh sách cập nhật theo.
  const persist = (next: CourseStudent) => {
    setEnr(next);
    saveCourseStudent(next).catch(() => notice('Chưa lưu được tiến độ, hãy kiểm tra mạng.'));
    ctx.onUpdateCourse({ ...c, students: (c.students || []).map(s => (s.id === next.id ? next : s)) });
  };
  const pct = (ids: string[]) => (lessons.length ? Math.round(ids.filter(id => lessons.some(l => l.id === id)).length / lessons.length * 100) : 0);
  const progress = pct(done);

  // Nhớ bài đang học để lần sau bấm Học tiếp mở đúng bài.
  useEffect(() => {
    if (!cur) return;
    ctx.setView({ k: 'learn', id: c.id, lesson: cur.id });
    if (enr && learn && enr.lastLessonId !== cur.id) persist({ ...enr, lastLessonId: cur.id, lastAt: new Date().toISOString() });
    bodyRef.current?.scrollTo({ top: 0 });
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const markDone = (id: string) => {
    if (!learn || done.includes(id)) return;
    const ids = [...done, id];
    if (!enr) { setLocalDone(ids); return; }
    const pr = pct(ids);
    persist({ ...enr, completedLessons: ids, progress: pr, ...(pr === 100 && !enr.completionDate ? { completionDate: new Date().toISOString() } : {}), lastLessonId: id, lastAt: new Date().toISOString() });
  };
  const go = (l?: FlatLesson) => { if (!l) return; if (!learn && !(l.allowPreview || l.isFreePreview)) { notice('Đăng ký khoá học để mở bài này.', 'info'); return; } setCurId(l.id); };
  const nextL = cur ? lessons[cur.index + 1] : undefined;
  const prevL = cur ? lessons[cur.index - 1] : undefined;
  const finish = () => {
    if (!cur) return;
    markDone(cur.id);
    if (nextL) go(nextL);
    else { notice('Chúc mừng bạn đã học xong khoá học.', 'info'); ctx.setView({ k: 'detail', id: c.id }); }
  };

  // Bài giảng E-Learning gắn với bài học
  const [secs, setSecs] = useState<ELSection[]>([]);
  const [elRes, setElRes] = useState<ELResource[]>([]);
  const [elLoading, setElLoading] = useState(false);
  useEffect(() => {
    let off = false;
    setSecs([]); setElRes([]);
    if (!cur?.elLessonId || locked) return;
    setElLoading(true);
    Promise.all([getELSections(cur.elLessonId), getELResources(cur.elLessonId)])
      .then(([s, r]) => { if (!off) { setSecs(s); setElRes(r); } })
      .catch(() => {})
      .finally(() => { if (!off) setElLoading(false); });
    return () => { off = true; };
  }, [cur?.elLessonId, locked]);

  // Ghi chú theo mốc thời gian video, lưu trong dòng ghi danh (chỉ chủ tài khoản đọc được).
  const notes: Note[] = (cur && enr?.lessonNotes?.[cur.id]) || [];
  const [draft, setDraft] = useState('');
  const nowSec = (): number | undefined => { try { const t = player.current?.time(); return typeof t === 'number' && t > 0 ? t : undefined; } catch { return undefined; } };
  const seek = (s: number) => { player.current?.seek(s); };
  const saveNotes = (list: Note[]) => { if (enr && cur) persist({ ...enr, lessonNotes: { ...(enr.lessonNotes || {}), [cur.id]: list } }); };
  const addNote = () => {
    const text = draft.trim(); if (!text || !cur) return;
    const sec = nowSec();
    const d = new Date();
    saveNotes([{ id: `note_${Date.now()}`, text, timestamp: `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN')}`, ...(sec !== undefined ? { sec: Math.floor(sec) } : {}) }, ...notes]);
    setDraft('');
  };

  const quizUrl = cur?.quizSlug ? `/?quiz=${encodeURIComponent(cur.quizSlug)}&learner=${encodeURIComponent(ctx.user.id)}&name=${encodeURIComponent(ctx.user.fullName || ctx.user.username || '')}&course=${encodeURIComponent(c.id)}&lesson=${encodeURIComponent(cur.id)}` : '';
  const docs: Array<{ title: string; url: string; sub?: string }> = cur ? [
    ...(cur.resources || []).filter(r => r.url).map(r => ({ title: r.name || 'Tài liệu', url: r.url })),
    ...(cur.practiceFileUrl ? [{ title: 'File thực hành', url: cur.practiceFileUrl, sub: 'Tải về để làm theo bài' }] : []),
    ...elRes.filter(r => r.url).map(r => ({ title: r.title || 'Tài nguyên giáo án', url: r.url as string, sub: 'Tài nguyên của giáo án' })),
  ] : [];
  const docN = docs.length + (cur?.elLessonId ? 1 : 0);

  if (!cur) return (
    <div className="cx-lp" data-no-pull><div className="cx-lp-top"><button type="button" className="bk" onClick={() => ctx.setView({ k: 'detail', id: c.id })}><ChevronLeft /></button></div>
      <div className="cx-lp-body"><PhoneEmpty icon={BookOpen} title="Khoá học chưa có bài học" /></div></div>
  );

  return (
    <div className="cx-lp" data-no-pull>
      <div className="cx-lp-top">
        <div className="pl">
          {locked ? (
            <div className="lock"><Lock /><b>Bài học đã khoá</b><span>Đăng ký khoá học để học bài này</span>
              <button type="button" disabled={ctx.registering} onClick={() => ctx.onEnroll(c)}>{ctx.registering ? <Loader2 className="spin" /> : <BookMarked />}Đăng ký khoá học</button></div>
          ) : cur.videoUrl ? <CoursePlayer key={cur.id} ref={player} src={cur.videoUrl} onFinish={() => markDone(cur.id)} />
            : (
              <div className="read"><BookOpen /><b>Bài đọc</b><span>Bài này không có video, xem nội dung ở thẻ Bài giảng bên dưới.</span></div>
            )}
        </div>
        <button type="button" className="bk" aria-label="Quay lại trang khoá học" onClick={() => ctx.setView({ k: 'detail', id: c.id })}><ChevronLeft /></button>
      </div>

      <div className="cx-lp-body" ref={bodyRef}>
        {!enr && (
          <div className="cx-prev"><span><b>Bạn đang xem trước</b>Đăng ký khoá học để lưu tiến độ, ghi chú và mở toàn bộ bài học.</span>
            <button type="button" disabled={ctx.registering} onClick={() => ctx.onEnroll(c)}>{ctx.registering ? <Loader2 className="spin" /> : 'Đăng ký'}</button></div>
        )}
        <div className="cx-lt">
          <small>Bài {cur.index + 1} · Chương {cur.chapterIndex + 1}</small>
          <h3>{cur.title}</h3>
          <span className="cx-pg"><span className="t"><span>Khoá học · {done.filter(id => lessons.some(l => l.id === id)).length} trên {lessons.length} bài</span><b>{progress}%</b></span><span className="bar"><i style={{ width: `${progress}%` }} /></span></span>
        </div>
        <div className="cx-ltabs" data-no-pull ref={tabsRef}>
          <button type="button" className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}><List />Nội dung khoá</button>
          <button type="button" className={tab === 'doc' ? 'on' : ''} onClick={() => setTab('doc')}><FileText />Tài liệu{docN ? ` (${docN})` : ''}</button>
          <button type="button" className={tab === 'quiz' ? 'on' : ''} onClick={() => setTab('quiz')}><ClipboardCheck />Quizz{cur.quizSlug ? ' (1)' : ''}</button>
          {enr && <button type="button" className={tab === 'note' ? 'on' : ''} onClick={() => setTab('note')}><PenLine />Ghi chú{notes.length ? ` (${notes.length})` : ''}</button>}
        </div>

        {tab === 'list' && <div className="cx-pad"><div className="cx-box"><Chapters c={c} lessons={lessons} learn={learn} done={done} current={cur.id} onOpen={go} /></div></div>}
        {tab === 'doc' && <div className="cx-pad">
          {locked ? <div className="cx-box"><p className="cx-mut">Đăng ký khoá học để xem tài liệu của bài này.</p></div> : <>
            {/* Giáo án gắn từ kho Giáo trình (E-Learning): đọc ngay trong bài, hoặc mở toàn màn hình */}
            {cur.elLessonId && (
              <div className="cx-box cx-ga">
                <div className="hd"><span className="ic"><BookOpen /></span><span className="m"><small>Giáo án</small><b>{cur.elLessonTitle || 'Giáo án của bài'}</b></span>
                  <a href={`/?elview=${encodeURIComponent(cur.elLessonId)}`} target="_blank" rel="noreferrer">Mở</a></div>
                {elLoading ? <p className="cx-mut"><Loader2 className="spin" /> Đang tải giáo án...</p>
                  : secs.length === 0 ? <p className="cx-mut">Giáo án chưa có nội dung.</p>
                  : secs.map((sec, i) => (
                    <details key={sec.id} className="cx-sec" open={i === 0}>
                      <summary><span className="no">{i + 1}</span>{sec.title || `Phần ${i + 1}`}</summary>
                      <div className="cx-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(sec.content || '') || '<p>(Chưa có nội dung)</p>' }} />
                    </details>
                  ))}
              </div>
            )}
            {(cur.textContent || cur.content || cur.description) && <div className="cx-box"><h4>Nội dung bài học</h4><div className="cx-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(cur.textContent || cur.content || cur.description || '') }} /></div>}
            <div className="cx-box"><h4>Tệp đính kèm</h4>
              {docs.length === 0 ? <p className="cx-mut">Bài này chưa có tệp đính kèm.</p> : docs.map((d, i) => <ResRow key={i} title={d.title} url={d.url} sub={d.sub} />)}</div>
          </>}
        </div>}
        {tab === 'quiz' && <div className="cx-pad">
          {cur.quizSlug ? (
            <div className="cx-quiz"><span className="ic"><ClipboardCheck /></span><span className="m"><b>{cur.quizTitle || 'Kiểm tra sau bài học'}</b><span>Quizz gắn từ kho Quizz, làm bài để ôn lại kiến thức của bài</span></span>
              {learn && quizUrl ? <a href={quizUrl} target="_blank" rel="noreferrer">Làm bài</a> : <Lock className="lk" />}</div>
          ) : <div className="cx-box"><p className="cx-mut">Bài này chưa gắn Quizz.</p></div>}
        </div>}
        {tab === 'note' && enr && <div className="cx-pad">
          <div className="cx-box"><h4>Ghi chú của bạn</h4>
            <p className="cx-mut">Ghi chú gắn với mốc thời gian của video lúc bạn bấm Lưu, chỉ mình bạn xem được.</p>
            <textarea className="cx-ta" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Nhập ghi chú cho bài này..." rows={3} />
            <button type="button" className="cx-btn" disabled={!draft.trim()} onClick={addNote}><PenLine />Lưu ghi chú</button>
          </div>
          {notes.map(n => (
            <div key={n.id} className="cx-note">
              {typeof n.sec === 'number' && <button type="button" className="tm" onClick={() => seek(n.sec!)}><Play />{fmtSec(n.sec)}</button>}
              <p>{n.text}</p>
              <div className="ft"><span>{n.timestamp}</span>
                <button type="button" aria-label="Sao chép" onClick={async () => { if (await copyText(n.text)) notice('Đã sao chép ghi chú.', 'info'); }}><Copy /></button>
                <button type="button" aria-label="Xoá ghi chú" onClick={() => saveNotes(notes.filter(x => x.id !== n.id))}><Trash2 /></button></div>
            </div>
          ))}
        </div>}
        <div style={{ height: 110 }} />
      </div>

      <div className="cx-lbot">
        <button type="button" className="pv" aria-label="Bài trước" disabled={!prevL} onClick={() => go(prevL)}><ChevronLeft /></button>
        {learn ? (
          <button type="button" className="nx" onClick={finish}>
            <CheckCircle2 />{done.includes(cur.id) ? (nextL ? `Sang bài ${nextL.index + 1}` : 'Về trang khoá học') : nextL ? `Hoàn thành, sang bài ${nextL.index + 1}` : 'Hoàn thành khoá học'}
          </button>
        ) : (
          <button type="button" className="nx" disabled={ctx.registering} onClick={() => ctx.onEnroll(c)}>{ctx.registering ? <Loader2 className="spin" /> : <BookMarked />}Đăng ký khoá học</button>
        )}
      </div>
    </div>
  );
}

