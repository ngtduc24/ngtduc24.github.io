import React, { useState } from 'react';
import {
  ChevronLeft, Heart, Share2, Play, CheckCircle2, Clock, Users, List, Award, BookOpen, Video, FileText, ClipboardCheck,
  GraduationCap, Search, X, Library, Bookmark, BookMarked, Loader2, LogOut, Settings2, Infinity as InfinityIcon,
} from 'lucide-react';
import { PortfolioCourse } from '../portfolioTypes';
import { toggleFavCourse } from '../../lib/personalize';
import { PhoneSeg, PhoneChips, PhoneChip, PhoneEmpty } from '../phone/PhoneKit';
import { Ctx, Slide, FlatLesson, Cover, Instructor, Chapters, LEVEL, money, priceOf, flatLessons, tone } from './PhoneCourses';
import { PROMO_TONES } from './CoursePromoSettings';
import './desktopCourses.css';

// Giao diện Khoá học trên máy tính theo bản mẫu đã duyệt (edugo-khoa-hoc.html): dùng chung dữ liệu, tiến độ,
// đăng ký, huỷ ghi danh, trình phát, ghi chú với giao diện điện thoại, chỉ khác cách bố trí.

/* ======================= Danh sách ======================= */
export function DeskList(props: {
  ctx: Ctx; published: PortfolioCourse[]; mine: PortfolioCourse[]; saved: PortfolioCourse[]; cats: string[];
  cont?: PortfolioCourse; contLesson?: FlatLesson; featured: PortfolioCourse[]; doneN: number; slides: Slide[];
  tab: 'all' | 'mine' | 'saved'; setTab: (t: 'all' | 'mine' | 'saved') => void; cat: string; setCat: (c: string) => void;
  q: string; setQ: (q: string) => void; list: PortfolioCourse[]; kw: string;
}) {
  const { ctx, published, mine, saved, cats, cont, contLesson, doneN, slides, tab, setTab, cat, setCat, q, setQ, list, kw } = props;
  const plain = tab === 'all' && !cat && !kw;
  const learning = mine.filter(c => (ctx.progressOf(c) ?? 0) < 100);
  return (
    <div className="dc">
      <section className="dc-hero">
        <div className="l">
          <small>EduGo Khoá học</small>
          <h1>Học kỹ năng mới,<br />theo nhịp của bạn</h1>
          <p>Khoá học do giảng viên EduGo biên soạn, học qua video, giáo án, file thực hành và Quizz ngay trong khoá.</p>
          <div className="st">
            <div><b>{published.length}</b><span>khoá đang mở</span></div>
            <div><b>{mine.length}</b><span>khoá bạn đang học</span></div>
            <div><b>{doneN}</b><span>khoá đã học xong</span></div>
          </div>
          <label className="sr"><Search /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm khoá học, chủ đề, giảng viên..." />{q && <button type="button" onClick={() => setQ('')} aria-label="Xoá tìm kiếm"><X /></button>}</label>
        </div>
        {cont ? (
          <div className="ct">
            <span className="lb"><Play />Đang học dở</span>
            <button type="button" className="cv" style={{ background: tone(cont.id) }} onClick={() => ctx.setView({ k: 'learn', id: cont.id, lesson: contLesson?.id })}>
              {cont.coverImage && <img src={cont.coverImage} alt="" />}<i><Play /></i>
            </button>
            <h4>{cont.title}</h4>
            <span className="sub">{contLesson ? `Bài ${contLesson.index + 1}. ${contLesson.title}` : 'Bắt đầu bài đầu tiên'}</span>
            <span className="bar"><i style={{ width: `${ctx.progressOf(cont) || 0}%` }} /></span>
            <span className="rw"><span>{ctx.progressOf(cont) || 0}% · {(ctx.enrOf(cont)?.completedLessons || []).length} trên {flatLessons(cont).length} bài</span>
              <button type="button" onClick={() => ctx.setView({ k: 'learn', id: cont.id, lesson: contLesson?.id })}>Học tiếp<Play /></button></span>
          </div>
        ) : slides[0] ? <PromoCard s={slides[0]} ctx={ctx} big /> : null}
      </section>

      {slides.length > (cont ? 0 : 1) && plain && (
        <div className="dc-promos">{slides.slice(cont ? 0 : 1, cont ? 3 : 4).map(s => <PromoCard key={s.p.id} s={s} ctx={ctx} />)}</div>
      )}

      <div className="pk-cls-sec dc-tabs">
        <PhoneSeg tabs={[
          { id: 'all', label: 'Tất cả khoá học', icon: Library, count: published.length },
          { id: 'mine', label: 'Khoá học của tôi', icon: BookOpen, count: mine.length },
          { id: 'saved', label: 'Đã lưu', icon: Bookmark, count: saved.length },
          ...(ctx.isAdmin && ctx.onManage ? [{ id: 'manage', label: 'Quản lý khoá học', icon: Settings2 }] : []),
        ]} active={tab} onTab={t => { if (t === 'manage') ctx.onManage?.(); else setTab(t as any); }} />
        <div className="pk-cls-panel dc-panel">
          {cats.length > 1 && (
            <PhoneChips>
              <PhoneChip on={!cat} onClick={() => setCat('')}>Tất cả</PhoneChip>
              {cats.map(x => <PhoneChip key={x} on={cat === x} onClick={() => setCat(x)}>{x}</PhoneChip>)}
            </PhoneChips>
          )}
          {plain && learning.length > 0 && <>
            <div className="dc-sec"><h3>Đang học <span>({learning.length})</span></h3><button type="button" onClick={() => setTab('mine')}>Xem khoá của tôi</button></div>
            <div className="dc-grid">{learning.slice(0, 4).map(c => <DeskCard key={c.id} c={c} ctx={ctx} />)}</div>
            <div className="dc-sec"><h3>Tất cả khoá học <span>({published.length})</span></h3></div>
          </>}
          {list.length === 0 ? (
            <PhoneEmpty icon={tab === 'saved' ? Bookmark : GraduationCap}
              title={kw || cat ? 'Không có khoá nào khớp' : tab === 'mine' ? 'Bạn chưa đăng ký khoá học nào' : tab === 'saved' ? 'Chưa lưu khoá học nào' : 'Chưa có khoá học nào được phát hành'}
              sub={tab === 'saved' && !kw && !cat ? 'Bấm hình trái tim ở trang khoá học để lưu lại xem sau.' : undefined} />
          ) : <div className="dc-grid">{list.map(c => <DeskCard key={c.id} c={c} ctx={ctx} />)}</div>}
        </div>
      </div>
    </div>
  );
}

function PromoCard({ s, ctx, big }: { s: Slide; ctx: Ctx; big?: boolean }) {
  const { p, c } = s;
  const enr = !!ctx.enrOf(c);
  const pr = priceOf(c);
  const img = p.image || c.coverImage;
  const [busy, setBusy] = useState(false);
  return (
    <div className={`dc-promo ${big ? 'big' : ''}`} role="button" tabIndex={0} style={{ background: PROMO_TONES[(p.tone ?? 0) % PROMO_TONES.length] }} onClick={() => ctx.setView({ k: 'detail', id: c.id })}>
      {img && <img src={img} alt="" />}
      <span className="sh" />
      <span className="tx">
        {p.tag && <em>{p.tag}</em>}
        <b>{p.title?.trim() || c.title}</b>
        {(p.sub?.trim() || c.briefDescription) && <span className="s">{p.sub?.trim() || c.briefDescription}</span>}
        <span className="ft">
          <button type="button" disabled={busy} onClick={async e => {
            e.stopPropagation();
            if (enr) { ctx.setView({ k: 'learn', id: c.id }); return; }
            setBusy(true); try { await ctx.onEnroll(c); } finally { setBusy(false); }
          }}>{busy ? <Loader2 className="spin" /> : enr ? <Play /> : <BookMarked />}{enr ? 'Vào học' : (p.btn?.trim() || 'Đăng ký ngay')}</button>
          {!enr && <span className="pr">{money(pr.now)}{pr.old > 0 && <s>{money(pr.old)}</s>}</span>}
        </span>
      </span>
    </div>
  );
}

function DeskCard({ c, ctx }: { c: PortfolioCourse; ctx: Ctx }) {
  const pr = ctx.progressOf(c);
  const p = priceOf(c);
  const [busy, setBusy] = useState(false);
  const n = flatLessons(c).length || c.lessonsCount || 0;
  return (
    <div className="dc-card" role="button" tabIndex={0} onClick={() => ctx.setView({ k: 'detail', id: c.id })}>
      <Cover c={c} className="cv">
        <span className="tg"><span>{LEVEL[c.level] || 'Cơ bản'}</span>{c.hasCertificate && <span className="c"><Award />Chứng chỉ</span>}</span>
      </Cover>
      <span className="bd">
        <span className="cat">{c.category || 'Khoá học'}</span>
        <b>{c.title}</b>
        <span className="ins">{c.creatorName || c.instructor}</span>
        <span className="mt"><span><List />{n} bài</span>{c.duration && <span><Clock />{c.duration}</span>}<span><Users />{c.studentsCount || 0}</span></span>
        <span className="ft">
          {pr === 100 ? <span className="ok"><CheckCircle2 />Đã học xong</span>
            : pr !== null ? <span className="cx-pg"><span className="t"><span>Đã học</span><b>{pr}%</b></span><span className="bar"><i style={{ width: `${pr}%` }} /></span></span>
            : <>
              <span className="pr"><b className={p.now ? '' : 'free'}>{money(p.now)}</b>{p.old > 0 && <s>{money(p.old)}</s>}</span>
              <button type="button" disabled={busy} onClick={async e => { e.stopPropagation(); setBusy(true); try { await ctx.onEnroll(c); } finally { setBusy(false); } }}>
                {busy ? <Loader2 className="spin" /> : null}Đăng ký</button>
            </>}
        </span>
      </span>
    </div>
  );
}

/* ======================= Trang khoá học ======================= */
export function DeskDetail(props: {
  c: PortfolioCourse; ctx: Ctx; lessons: FlatLesson[]; enr?: any; learn: boolean; pr: number | null; p: { now: number; old: number; off: number };
  fav: boolean; done: string[]; share: () => void; leave: () => void; leaving: boolean;
  tabsEl: React.ReactNode; panel: React.ReactNode; introEl: React.ReactNode; startBtn: (cls: string) => React.ReactNode; setIntro: (v: boolean) => void;
}) {
  const { c, ctx, lessons, enr, learn, pr, p, fav, done, share, leave, leaving, tabsEl, panel, introEl, startBtn, setIntro } = props;
  const quizN = lessons.filter(l => l.quizSlug).length;
  const videoN = lessons.filter(l => l.videoUrl).length;
  const elN = lessons.filter(l => l.elLessonId).length;
  return (
    <div className="dc dc-d">
      <div className="dc-dl">
        <section className="dc-dhero">
          <div className="crumb"><button type="button" onClick={() => ctx.setView({ k: 'list' })}><ChevronLeft />Khoá học</button>{c.category && <span>{c.category}</span>}</div>
          <span className="cat">{[c.category, LEVEL[c.level]].filter(Boolean).join(' · ')}</span>
          <h1>{c.title}</h1>
          {c.briefDescription && <p>{c.briefDescription}</p>}
          <div className="chips">
            <span><List />{lessons.length || c.lessonsCount || 0} bài học</span>
            {c.duration && <span><Clock />{c.duration}</span>}
            <span><Users />{c.studentsCount || 0} học viên</span>
            {c.hasCertificate && <span><Award />Có chứng chỉ</span>}
          </div>
          <div className="dc-ins"><Instructor c={c} /></div>
        </section>
        <div className="pk-cls-sec dc-tabs">
          {tabsEl}
          <div className="pk-cls-panel cx-panel dc-panel">{panel}</div>
        </div>
      </div>

      <aside className="dc-buy">
        <button type="button" className="vid" style={{ background: tone(c.id) }} onClick={() => c.introVideo && setIntro(true)} disabled={!c.introVideo}>
          {c.coverImage ? <img src={c.coverImage} alt="" /> : <GraduationCap className="art" />}
          {c.introVideo && <><i><Play /></i><small>Xem video giới thiệu</small></>}
        </button>
        <div className="in">
          {enr ? (
            <span className="cx-pg"><span className="t"><span>Tiến độ của bạn · {done.filter(id => lessons.some(l => l.id === id)).length} trên {lessons.length} bài</span><b>{pr ?? 0}%</b></span><span className="bar"><i style={{ width: `${pr ?? 0}%` }} /></span></span>
          ) : (
            <div className="pr"><b className={p.now ? '' : 'free'}>{money(p.now)}</b>{p.old > 0 && <><s>{money(p.old)}</s><em>Giảm {p.off}%</em></>}</div>
          )}
          {enr && learn ? startBtn('dc-big') : <>
            <button type="button" className="dc-big" disabled={ctx.registering} onClick={() => ctx.onEnroll(c)}>{ctx.registering ? <Loader2 className="spin" /> : <BookMarked />}Đăng ký khoá học</button>
            {learn && <button type="button" className="dc-gh" onClick={() => ctx.setView({ k: 'learn', id: c.id, lesson: lessons[0]?.id })} disabled={!lessons.length}><Play />Xem trước (admin)</button>}
          </>}
          <div className="row">
            <button type="button" className={`dc-gh ${fav ? 'on' : ''}`} onClick={() => toggleFavCourse(ctx.user.id, c.id)}><Heart />{fav ? 'Đã lưu' : 'Lưu khoá'}</button>
            <button type="button" className="dc-gh" onClick={share}><Share2 />Chia sẻ</button>
          </div>
          {enr && (
            <div className="enr"><span><CheckCircle2 />Đã ghi danh{enr.registrationDate ? ` từ ${new Date(enr.registrationDate).toLocaleDateString('vi-VN')}` : ''}</span>
              <button type="button" disabled={leaving} onClick={leave}>{leaving ? <Loader2 className="spin" /> : <LogOut />}Huỷ ghi danh</button></div>
          )}
          <div className="inc"><b>Khoá học gồm</b>
            <span><Video />{lessons.length} bài học{videoN ? `, ${videoN} bài có video` : ''}</span>
            {elN > 0 && <span><BookOpen />{elN} giáo án đọc kèm</span>}
            {quizN > 0 && <span><ClipboardCheck />{quizN} bài Quizz</span>}
            {(c.documents || []).filter(d => d.url).length > 0 && <span><FileText />Tài liệu tải về</span>}
            <span><InfinityIcon />Học không giới hạn thời gian</span>
            {c.hasCertificate && <span><Award />Chứng chỉ khi hoàn thành</span>}
          </div>
        </div>
      </aside>
      {introEl}
    </div>
  );
}

/* ======================= Học bài ======================= */
export function DeskLearn(props: {
  c: PortfolioCourse; ctx: Ctx; cur: FlatLesson; lessons: FlatLesson[]; learn: boolean; done: string[]; progress: number; enr?: any;
  prevL?: FlatLesson; nextL?: FlatLesson; go: (l?: FlatLesson) => void;
  playerEl: React.ReactNode; tabsEl: React.ReactNode; panel: React.ReactNode; finishEl: React.ReactNode; bodyRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { c, ctx, cur, lessons, learn, done, progress, enr, prevL, go, playerEl, tabsEl, panel, finishEl, bodyRef } = props;
  const r = 16, circ = 2 * Math.PI * r;
  const doneN = done.filter(id => lessons.some(l => l.id === id)).length;
  return (
    <div className="dc dc-learn">
      <header className="dc-lh">
        <button type="button" className="bk" aria-label="Về trang khoá học" onClick={() => ctx.setView({ k: 'detail', id: c.id })}><ChevronLeft /></button>
        <span className="t"><b>{c.title}</b><span>Chương {cur.chapterIndex + 1} · {cur.chapterTitle}</span></span>
        <span className="pg"><b>{doneN} trên {lessons.length} bài</b>Tiến độ khoá học</span>
        <span className="ring"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="4" /><circle cx="20" cy="20" r={r} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - progress / 100)} /></svg><b>{progress}%</b></span>
      </header>
      <div className="dc-lb">
        <main className="dc-lm" ref={bodyRef as any}>
          <div className="cx-lp-top dc-pl"><div className="pl">{playerEl}</div></div>
          {!enr && (
            <div className="cx-prev dc-prev"><span><b>Bạn đang xem trước</b>Đăng ký khoá học để lưu tiến độ, ghi chú và mở toàn bộ bài học.</span>
              <button type="button" disabled={ctx.registering} onClick={() => ctx.onEnroll(c)}>{ctx.registering ? <Loader2 className="spin" /> : 'Đăng ký'}</button></div>
          )}
          <div className="dc-lt">
            <span className="m"><small>Bài {cur.index + 1} · Chương {cur.chapterIndex + 1}</small><h2>{cur.title}</h2></span>
            <span className="nav">
              <button type="button" className="pv" disabled={!prevL} onClick={() => go(prevL)}><ChevronLeft />Bài trước</button>
              <span className="cx-lbot dc-fin">{finishEl}</span>
            </span>
          </div>
          <div className="pk-cls-sec dc-tabs">
            {tabsEl}
            <div className="pk-cls-panel cx-panel dc-panel">{panel}</div>
          </div>
        </main>
        <aside className="dc-lo">
          <div className="hd"><b>Nội dung khoá học</b>
            <span className="cx-pg"><span className="t"><span>Đã xong {doneN} trên {lessons.length} bài</span><b>{progress}%</b></span><span className="bar"><i style={{ width: `${progress}%` }} /></span></span></div>
          <div className="bd"><Chapters c={c} lessons={lessons} learn={learn} done={done} current={cur.id} onOpen={go} /></div>
        </aside>
      </div>
    </div>
  );
}
