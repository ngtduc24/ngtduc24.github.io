import React, { useEffect, useMemo, useState } from 'react';
import { Search, Bell, ClipboardList, CircleCheck, GraduationCap, Library, X, Sparkles, CalendarDays, Clock, Presentation, Hourglass, BookOpen, MoreHorizontal, ChevronDown, Hand } from 'lucide-react';
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
  const grid = order.slice(0, 8).map(find).filter(Boolean) as PhoneModule[];

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

  // ===== 4 nút tròn trên đầu trang: Lớp học, Giáo trình, Bài tập, Khác (thiếu quyền thì lấy chức năng khác) =====
  const ACT_CANDIDATES: { id: string; label: string; icon: any }[] = [
    { id: 'edu', label: 'Lớp học', icon: GraduationCap }, { id: 'elearning', label: 'Giáo trình', icon: BookOpen },
    { id: 'edu_bank', label: 'Bài tập', icon: Library }, { id: 'slides', label: 'Bài giảng', icon: Presentation },
    { id: 'edu_exam', label: 'Trắc nghiệm', icon: CircleCheck }, { id: 'tasks', label: 'Công việc', icon: CalendarDays },
    { id: 'courses', label: 'Khoá học', icon: GraduationCap },
  ];
  const actMods = ACT_CANDIDATES.filter(a => can(a.id) && phoneMode(a.id, settings) !== 'laptop').slice(0, 3);
  const acts: TopAct[] = [
    ...actMods.map(a => ({ key: a.id, label: a.label, icon: a.icon, run: () => open(a.id) })),
    { key: 'more', label: 'Khác', icon: MoreHorizontal, run: () => open('all_features') },
  ];
  const actIds = new Set(actMods.map(a => a.id));
  const [expand, setExpand] = useState(false);
  const gridAll = (order.map(find).filter(Boolean) as PhoneModule[]).filter(m => !actIds.has(m.id));
  const gridShown = gridAll.slice(0, expand ? 16 : 8);

  return (
    <div>
      {/* Đầu trang: nền màu hệ thống hoặc ảnh admin chọn (đổi theo mùa), lời chào, tiêu đề, mô tả, 4 nút tròn */}
      <PhoneTop settings={settings} name={user.fullName || user.username} avatar={user.avatarUrl} unread={unread}
        acts={acts} onProfile={() => openProfile(user.id)} onBell={() => open('notifications')}
        onSearch={() => { try { sessionStorage.setItem('open_hint:phone_search', '1'); } catch { /* bỏ qua */ } open('all_features'); }} />

      {/* Lưới chức năng màu, thẻ trắng đè lên đầu trang */}
      <div className="ph-grid">
        <div className="ph-apps">
          {gridShown.map(m => { const c = tone(m.color); return (
            <button key={m.id} type="button" className="ph-app" onClick={() => open(m.id)}>
              {isNewModule(m.id) ? <span className="tag hot">Mới</span> : m.beta ? <span className="tag">Thử</span> : null}
              <span className="ph-ico" style={{ background: c.bg, color: c.fg }}><ModIcon m={m} /></span><span>{phoneLabel(m)}</span>
            </button>
          ); })}
        </div>
        {gridAll.length > 8 && (
          <button type="button" className="more" aria-label={expand ? 'Thu gọn' : 'Xem thêm chức năng'} onClick={() => setExpand(v => !v)}>
            <ChevronDown style={{ transform: expand ? 'rotate(180deg)' : undefined }} />
          </button>
        )}
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

// Màu biểu tượng theo màu của từng chức năng (giống Trang chủ máy tính).
const TONES: Record<string, { bg: string; fg: string }> = {
  rose: { bg: '#fff1f2', fg: '#e11d48' }, orange: { bg: '#fff7ed', fg: '#ea580c' }, violet: { bg: '#f5f3ff', fg: '#7c3aed' },
  emerald: { bg: '#ecfdf5', fg: '#059669' }, blue: { bg: '#eff6ff', fg: '#2563eb' }, purple: { bg: '#faf5ff', fg: '#9333ea' },
  red: { bg: '#fef2f2', fg: '#dc2626' }, teal: { bg: '#f0fdfa', fg: '#0d9488' }, amber: { bg: '#fefce8', fg: '#ca8a04' }, indigo: { bg: '#eef2ff', fg: '#4f46e5' },
};
export const tone = (c?: string) => TONES[c || ''] || TONES.emerald;

export interface TopAct { key: string; label: string; icon: any; run: () => void }

// Đầu Trang chủ điện thoại. Dùng chung cho Trang chủ và khung xem trước trong Cấu hình hệ thống.
export function PhoneTop({ settings, ui: uiOverride, name, avatar, unread, acts, onProfile, onSearch, onBell }: {
  settings?: AppSettings; ui?: PhoneUi; name: string; avatar?: string; unread: number; acts: TopAct[];
  onProfile?: () => void; onSearch?: () => void; onBell?: () => void;
}) {
  const ui = uiOverride || phoneUi(settings);
  const show = ui.bannerOn !== false;
  const mode = ui.imageMode || 'desktop';
  const img = !show ? '' : mode === 'custom' ? ui.image : mode === 'desktop' ? settings?.dashboardBannerImage : '';
  const pos = mode === 'custom' ? ui.position : settings?.dashboardBannerPosition;
  const title = ui.title?.trim() || settings?.dashboardBannerTitle || 'Hôm nay bạn muốn làm gì?';
  const desc = ui.desc?.trim() || settings?.systemDescription || 'Bài giảng, lớp học, đề trắc nghiệm của bạn ở ngay đây';
  return (
    <div className={`ph-top ${img ? 'has-img' : ''}`} style={img ? { backgroundImage: `url(${img})`, backgroundPosition: pos || 'center' } : undefined}>
      {img && <div className="shade" />}
      <div className="hi">
        <button type="button" className="me" onClick={onProfile} aria-label="Mở trang cá nhân">
          <span className="lg">{avatar ? <img src={avatar} alt="" /> : initials(name)}</span>
          <span className="t"><span>Xin chào <Hand /></span><b>{name}</b></span>
        </button>
        <button type="button" className="ib" onClick={onSearch} aria-label="Tìm chức năng"><Search /></button>
        <button type="button" className="ib" onClick={onBell} aria-label="Thông báo"><Bell />{unread > 0 && <span className="d" />}</button>
      </div>
      {show && (ui.titleOn !== false || ui.descOn !== false) && (
        <div className="ht">
          {ui.titleOn !== false && <b>{title}</b>}
          {ui.descOn !== false && <p>{desc}</p>}
        </div>
      )}
      <div className={`acts ${show ? '' : 'tight'}`}>
        {acts.map(a => { const I = a.icon; return <button key={a.key} type="button" className="act" onClick={a.run}><span className="c"><I /></span>{a.label}</button>; })}
      </div>
    </div>
  );
}
