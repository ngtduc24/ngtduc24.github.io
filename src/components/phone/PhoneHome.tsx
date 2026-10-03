import React, { useEffect, useMemo, useState } from 'react';
import { Search, Bell, Eye, TrendingUp, ChevronRight, ClipboardList, CircleCheck, ScanLine, GraduationCap, Library, LayoutGrid, X, Sparkles, CalendarDays, Clock, Presentation, Plus, Hourglass, BellRing } from 'lucide-react';
import { usePhone, usePhoneModules, ModIcon, PhoneModule, phoneLabel } from './PhoneShell';
import { useTasks } from '../TaskContext';
import { phoneMode, phoneUi, PhoneUi, CTA_TARGETS } from '../../lib/device';
import type { AppSettings } from '../../types';
import { setCreateIntent } from '../../lib/phone';
import { todayTasks, loadPendingGrading, loadReminders, PendingGrading, Reminder, dismissedReminders, dismissReminder } from '../../lib/phoneHome';
import { useUsage, useScores, personalOrder, MIN_EVENTS, featuredPicks, noteShown, forgetDoc, isNewModule, DocVisit } from '../../lib/personalize';
import { MODULE_REGISTRY } from '../../lib/modules';
import { canUseModule } from '../../lib/moduleAccess';
import { openProfile } from '../../lib/people';

const greet = () => { const h = new Date().getHours(); return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'; };
const ago = (sec: number) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - sec);
  if (s < 60) return 'vừa xong'; if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`; if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(sec * 1000).toLocaleDateString('vi-VN');
};
const initials = (name: string) => (name || '?').trim().split(/\s+/).pop()!.charAt(0).toUpperCase();
const SKIP_GRID = new Set(['notifications', 'notifications_admin', 'users', 'permissions', 'settings']);
const FEAT_BG = [
  'linear-gradient(135deg, var(--ph-brand-hover), color-mix(in srgb, var(--ph-brand) 70%, white))',
  'linear-gradient(135deg, var(--ph-brand-deep), var(--ph-brand))',
  'linear-gradient(135deg, #475569, #64748b)',
];
const KIND_LABEL: Record<string, string> = { pin: 'Bạn đã ghim', discover: 'Nên thử', frequent: 'Hay dùng', return: 'Lâu chưa mở' };
const REMIND_ICON: Record<Reminder['kind'], any> = { grading: ClipboardList, task: CalendarDays, quiz: Clock, extension: Hourglass };

export default function PhoneHome() {
  const { user, settings, unread, open, openScan } = usePhone();
  const mods = usePhoneModules(user, settings);
  const { tasks } = useTasks();
  const can = (id: string) => mods.some(m => m.id === id);
  const find = (id: string) => mods.find(m => m.id === id);

  // ===== Thẻ tóm tắt =====
  const t = useMemo(() => todayTasks(tasks, user), [tasks, user]);
  const PKEY = `ph_pending_${user.id}`;
  const [pending, setPending] = useState<PendingGrading | null>(() => { try { return JSON.parse(sessionStorage.getItem(PKEY) || 'null'); } catch { return null; } });
  useEffect(() => {
    if (!canUseModule(user, 'edu')) return;
    let on = true;
    loadPendingGrading().then(p => { if (!on) return; setPending(p); try { sessionStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* bỏ qua */ } }).catch(() => {});
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // ===== Lời nhắc =====
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [off, setOff] = useState(() => dismissedReminders(user.id));
  const taskKey = tasks.map(x => `${x.id}:${x.status}:${x.deadline || x.endDate || ''}`).join('|');
  useEffect(() => {
    let on = true;
    loadReminders(user, tasks, pending, can).then(r => { if (on) setReminders(r); }).catch(() => {});
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, taskKey, pending?.total]);
  const shownReminders = reminders.filter(r => !off.has(r.id)).slice(0, 3);

  // ===== Chức năng của bạn: theo thói quen, giống Trang chủ máy tính =====
  const usage = useUsage(user.id);
  const scores = useScores(usage);
  const enough = usage.ev.length >= MIN_EVENTS && usage.autoSort !== false;
  const gridBase = mods.filter(m => !SKIP_GRID.has(m.id) && phoneMode(m.id, settings) !== 'laptop' && !(user.dashboardIconHidden || []).includes(m.id));
  const order = useMemo(() => {
    const ids = gridBase.map(m => m.id);
    if (enough) return personalOrder(ids, scores, usage.order, usage.pins || {});
    const saved = (user.dashboardIconOrder || []) as string[];
    return [...ids].sort((a, b) => { const ia = saved.indexOf(a), ib = saved.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridBase.map(m => m.id).join('|'), enough, scores, JSON.stringify(usage.pins || {})]);
  const grid = order.slice(0, 7).map(find).filter(Boolean) as PhoneModule[];

  // ===== Tính năng nổi bật =====
  const picks = useMemo(() => {
    const cands = mods.filter(m => !SKIP_GRID.has(m.id) && phoneMode(m.id, settings) !== 'laptop').map(m => ({ id: m.id, label: m.label, group: MODULE_REGISTRY.find(r => r.id === m.id)?.group }));
    if (enough) return featuredPicks({ candidates: cands, rowIds: grid.map(m => m.id), scores, data: usage }).slice(0, 6);
    return cands.filter(c => !grid.some(g => g.id === c.id)).slice(0, 5).map(c => ({ id: c.id, reason: isNewModule(c.id) ? 'Chức năng mới trên EduGo' : 'Bạn có thể thử', kind: 'discover' as const }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enough, grid.map(m => m.id).join('|'), scores, mods]);
  useEffect(() => { if (enough) noteShown(user.id, picks.filter(p => p.kind === 'discover').map(p => p.id)); }, [picks, enough, user.id]);

  // ===== Tiếp tục =====
  const docs = (usage.docs || []).filter(d => find(d.tab)).slice(0, 5);
  const openDoc = (d: DocVisit) => open(d.tab, d.sub);

  // ===== Lối tắt nhanh (4 ô) =====
  const quick: { label: string; icon: any; run: () => void }[] = [];
  if (can('edu_exam')) quick.push({ label: 'Giao đề', icon: CircleCheck, run: () => open('edu_exam') });
  quick.push({ label: 'Quét QR', icon: ScanLine, run: openScan });
  if (can('edu')) quick.push({ label: 'Lớp học', icon: GraduationCap, run: () => open('edu') });
  if (can('edu_question_bank')) quick.push({ label: 'Thư viện', icon: Library, run: () => open('edu_question_bank') });
  if (can('tasks')) quick.push({ label: 'Công việc', icon: CalendarDays, run: () => open('tasks') });
  if (can('slides')) quick.push({ label: 'Bài giảng', icon: Presentation, run: () => open('slides') });
  if (can('courses')) quick.push({ label: 'Khoá học', icon: GraduationCap, run: () => open('courses') });

  const showGrading = canUseModule(user, 'edu');
  const firstPending = pending?.classes[0];

  return (
    <div>
      {/* Băng chào đầu trang, admin chỉnh trong Cấu hình hệ thống, mục Điện thoại */}
      <PhoneHero settings={settings} can={can} onTap={() => openProfile(user.id)} onCta={(target) => {
        const [kind, id] = target.split(':');
        if (kind === 'create') setCreateIntent(id);
        open(id);
      }} />

      {/* Lời chào, tìm kiếm, chuông */}
      <div className="ph-hello">
        {/* Bấm ảnh đại diện hoặc tên để mở Trang cá nhân */}
        <button type="button" className="me" aria-label="Mở trang cá nhân" onClick={() => openProfile(user.id)}>
          <span className="ph-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.fullName)}</span>
          <span className="txt">{greet()}<b>{user.fullName || user.username}</b></span>
        </button>
        <button type="button" className="ph-round" aria-label="Tìm chức năng" onClick={() => { try { sessionStorage.setItem('open_hint:phone_search', '1'); } catch { /* bỏ qua */ } open('all_features'); }}><Search /></button>
        <button type="button" className="ph-round" aria-label="Thông báo" onClick={() => open('notifications')}><Bell />{unread > 0 && <span className="ph-badge">{unread > 9 ? '9+' : unread}</span>}</button>
      </div>

      {/* 2 thẻ tóm tắt */}
      <div className="ph-sum">
        <button type="button" className="ph-sumc a" onClick={() => open(can('tasks') ? 'tasks' : 'all_features')}>
          <div className="top">
            <div className="lb">Việc hôm nay <Eye size={15} /></div>
            <div className="val">{t.today}<small>việc</small></div>
            <div className="sub">{t.overdue ? `${t.overdue} việc đã quá hạn` : `${t.open} việc đang làm`}</div>
            <svg className="spark" viewBox="0 0 120 52"><path d="M0 46 18 40 34 42 52 30 68 34 84 18 102 22 120 4" stroke="rgba(255,255,255,.55)" strokeWidth="2.5" fill="none" /><path d="M0 46 18 40 34 42 52 30 68 34 84 18 102 22 120 4V52H0Z" fill="rgba(255,255,255,.12)" /></svg>
          </div>
          <div className="bot"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp />Xem công việc</span><ChevronRight /></div>
        </button>
        {showGrading ? (
          <button type="button" className="ph-sumc b" onClick={() => firstPending ? open('edu', { sv: 'grading', cid: firstPending.classId, aid: firstPending.assignmentId }) : open('edu')}>
            <div className="top">
              <div className="lb">Bài nộp mới</div>
              <div className="val">{pending ? pending.total : '…'}</div>
              <div className="sub">{firstPending ? firstPending.className : 'Chưa có bài chờ chấm'}</div>
              <div className="coin"><ClipboardList /></div>
            </div>
            <div className="bot"><span>Chờ chấm</span><ChevronRight /></div>
          </button>
        ) : (
          <button type="button" className="ph-sumc b" onClick={() => open('notifications')}>
            <div className="top">
              <div className="lb">Thông báo mới</div>
              <div className="val">{unread}</div>
              <div className="coin"><BellRing /></div>
            </div>
            <div className="bot"><span>Chưa đọc</span><ChevronRight /></div>
          </button>
        )}
      </div>

      {/* Dải lối tắt */}
      <div className="ph-card ph-quick">
        {quick.slice(0, 4).map(q => { const I = q.icon; return <button key={q.label} type="button" className="q" onClick={q.run}><I />{q.label}</button>; })}
      </div>

      {/* Chức năng của bạn */}
      <div className="ph-sec"><h3>Chức năng của bạn</h3><button type="button" className="lnk" onClick={() => open('all_features')}>Tất cả</button></div>
      <div className="ph-apps" style={{ padding: '0 12px' }}>
        {grid.map(m => (
          <button key={m.id} type="button" className="ph-app" onClick={() => open(m.id)}>
            {isNewModule(m.id) ? <span className="tag">Mới</span> : m.beta ? <span className="tag">Thử</span> : null}
            <span className="ph-tile"><ModIcon m={m} /></span><span>{phoneLabel(m)}</span>
          </button>
        ))}
        <button type="button" className="ph-app" onClick={() => open('all_features')}><span className="ph-tile"><LayoutGrid /></span><span>Tất cả</span></button>
      </div>

      {/* Tiếp tục */}
      {docs.length > 0 && <>
        <div className="ph-sec"><h3>Tiếp tục <span className="n">({docs.length})</span></h3></div>
        <div className="ph-hscroll">
          {docs.map(d => { const m = find(d.tab)!; return (
            <div key={d.key} className="ph-cont">
              <div className="head"><span className="ic"><ModIcon m={m} /></span>{phoneLabel(m)}
                <button type="button" className="x" aria-label="Bỏ khỏi danh sách" onClick={() => forgetDoc(user.id, d.key)}><X /></button></div>
              <div className="in"><div className="m"><b>{d.title}</b><small>{ago(d.at)}</small></div><button type="button" className="ph-btn ghost sm" onClick={() => openDoc(d)}>Mở tiếp</button></div>
            </div>
          ); })}
        </div>
      </>}

      {/* Lời nhắc */}
      {shownReminders.length > 0 && <>
        <div className="ph-sec"><h3>Lời nhắc cho bạn <span className="n">({shownReminders.length})</span></h3></div>
        {shownReminders.map(r => { const I = REMIND_ICON[r.kind]; return (
          <div key={r.id} role="button" tabIndex={0} className="ph-remind" onClick={() => open(r.tab, r.sub)}>
            <b>{r.title}</b><p>{r.detail}</p>
            <button type="button" className="x" aria-label="Ẩn lời nhắc" onClick={e => { e.stopPropagation(); dismissReminder(user.id, r.id); setOff(dismissedReminders(user.id)); }}><X /></button>
            <span className="pic"><I /></span>
          </div>
        ); })}
      </>}

      {/* Tính năng nổi bật */}
      {picks.length > 0 && <>
        <div className="ph-sec"><h3>Tính năng nổi bật</h3><button type="button" className="lnk" onClick={() => open('all_features')}>Xem tất cả</button></div>
        <div className="ph-hscroll" style={{ paddingBottom: 20 }}>
          {picks.map((p, i) => { const m = find(p.id); if (!m) return null; const I = m.icon; return (
            <button key={p.id} type="button" className="ph-feat" onClick={() => open(m.id)}>
              <div className="img" style={{ background: FEAT_BG[i % FEAT_BG.length] }}>
                <span className="k">{isNewModule(m.id) ? 'Chức năng mới' : KIND_LABEL[p.kind]}</span>
                <div className="big">{m.label}</div>
                <I />
              </div>
              <div className="body"><p>{m.desc}</p><div className={`why ${p.kind === 'discover' ? 'd' : ''}`}><Sparkles />{p.reason}</div></div>
            </button>
          ); })}
        </div>
      </>}
    </div>
  );
}

// Băng chào đầu Trang chủ điện thoại. Dùng chung cho Trang chủ và khung xem trước trong Cấu hình hệ thống.
export function PhoneHero({ settings, can, onCta, onTap, ui: uiOverride }: { settings?: AppSettings; can: (id: string) => boolean; onCta: (target: string) => void; onTap?: () => void; ui?: PhoneUi }) {
  const ui = uiOverride || phoneUi(settings);
  if (ui.bannerOn === false) return <div style={{ height: 'calc(8px + env(safe-area-inset-top))' }} />;
  const mode = ui.imageMode || 'desktop';
  const img = mode === 'custom' ? ui.image : mode === 'desktop' ? settings?.dashboardBannerImage : '';
  const pos = mode === 'custom' ? ui.position : settings?.dashboardBannerPosition;
  const target = ui.ctaTarget || 'create:slides';
  const t = CTA_TARGETS.find(x => x.value === target);
  const ok = !t || t.need === 'all_features' || can(t.need);
  const label = ui.ctaLabel?.trim() || t?.label || 'Soạn bài giảng mới';
  return (
    <div className={`ph-hero ${img ? '' : 'plain'}`} style={{ ...(img ? { backgroundImage: `url(${img})`, backgroundPosition: pos || 'center' } : {}), cursor: onTap ? 'pointer' : undefined }}
      onClick={onTap} role={onTap ? 'button' : undefined} aria-label={onTap ? 'Mở trang cá nhân' : undefined}>
      {img && <div className="shade" />}
      {!img && <HeroArt />}
      <div className="in">
        <div className="t1">{ui.title?.trim() || settings?.dashboardBannerTitle || 'Hôm nay bạn muốn làm gì?'}</div>
        <div className="t2">{ui.desc?.trim() || settings?.systemDescription || 'Bài giảng, lớp học, đề trắc nghiệm của bạn ở ngay đây.'}</div>
        {ui.ctaOn !== false && (ok
          ? <button type="button" className="cta" onClick={e => { e.stopPropagation(); onCta(target); }}>{target.startsWith('create:') && <Plus size={15} />}{label}</button>
          : <button type="button" className="cta" onClick={e => { e.stopPropagation(); onCta('open:all_features'); }}>Xem tất cả chức năng</button>)}
      </div>
    </div>
  );
}

function HeroArt() {
  return (
    <svg className="art" viewBox="0 0 200 200" aria-hidden>
      <circle cx="120" cy="100" r="78" fill="var(--ph-brand)" opacity=".18" />
      <rect x="58" y="62" width="112" height="78" rx="10" fill="#fff" />
      <rect x="68" y="74" width="60" height="8" rx="4" fill="var(--ph-brand)" />
      <rect x="68" y="90" width="88" height="6" rx="3" fill="var(--ph-brand-soft)" />
      <rect x="68" y="102" width="74" height="6" rx="3" fill="var(--ph-brand-soft)" />
      <rect x="68" y="116" width="40" height="14" rx="7" fill="var(--ph-brand-hover)" />
      <path d="M150 40 182 54 150 68 118 54Z" fill="var(--ph-brand-deep)" />
      <path d="M132 62v14c10 6 26 6 36 0V62" fill="var(--ph-brand-deep)" opacity=".85" />
      <path d="M182 54v20" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="182" cy="77" r="4" fill="#f59e0b" />
      <circle cx="46" cy="150" r="12" fill="#fff" /><path d="m41 150 4 4 7-8" stroke="var(--ph-brand)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
