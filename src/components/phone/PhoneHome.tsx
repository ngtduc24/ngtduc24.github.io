import React, { useEffect, useMemo, useState } from 'react';
import { Search, Bell, ClipboardList, CircleCheck, GraduationCap, Library, X, Sparkles, CalendarDays, Clock, Presentation, Hourglass, BookOpen, MoreHorizontal, ChevronDown, Hand, ChevronLeft, Home } from 'lucide-react';
import { usePhone, usePhoneModules, ModIcon, PhoneModule, phoneLabel } from './PhoneShell';
import { useTasks } from '../TaskContext';
import { phoneMode, phoneUi, PhoneUi, CTA_TARGETS, PHONE_GRID_SKIP } from '../../lib/device';
import type { AppSettings } from '../../types';
import { setCreateIntent, markOpenExt } from '../../lib/phone';
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
const SKIP_GRID = PHONE_GRID_SKIP;
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

  // ===== 4 nút tròn trên đầu trang: admin chọn trong Cấu hình hệ thống, thiếu quyền thì lấy chức năng khác =====
  // Admin tắt cụm nút tròn: không hiện hàng nút, các chức năng đó trở về lưới phím tắt bên dưới.
  const actList = phoneUi(settings).actsOn === false ? [] : resolveActs(phoneUi(settings), id => can(id) && phoneMode(id, settings) !== 'laptop', id => { const m = find(id); return m ? phoneLabel(m) : undefined; });
  const actMods = actList.filter(a => a.id !== 'all_features');
  const acts: TopAct[] = actList.map(a => ({ key: a.id, label: a.label, icon: a.icon, run: () => open(a.id) }));
  const actIds = new Set(actMods.map(a => a.id));

  // ===== Lưới chức năng =====
  // 1. Thứ tự gốc do admin xếp ở Cấu hình hệ thống, mục Điện thoại (chưa xếp thì theo thứ tự người dùng đặt ở máy tính).
  // 2. Khi người dùng đã mở chức năng đủ nhiều lần, chức năng hay dùng được đẩy dần lên trước theo điểm thói quen
  //    (tần suất mở, lần mở càng gần điểm càng cao, cộng thêm nếu hay mở vào đúng khung giờ này).
  // 3. Chức năng admin khoá thì luôn đứng đúng vị trí admin xếp. Admin tắt tự xếp thì giữ nguyên thứ tự gốc.
  const ui = phoneUi(settings);
  const usage = useUsage(user.id);
  const scores = useScores(usage);
  const autoOn = ui.gridAuto !== false && usage.autoSort !== false;
  const enough = usage.ev.length >= MIN_EVENTS && autoOn;
  const gridHide = new Set(ui.gridHide || []);
  const gridBase = mods.filter(m => !SKIP_GRID.has(m.id) && !gridHide.has(m.id) && !actIds.has(m.id) && phoneMode(m.id, settings) !== 'laptop' && !(user.dashboardIconHidden || []).includes(m.id));
  const adminOrder = ui.gridOrder || [];
  const lockKey = (ui.gridLock || []).join('|');
  const order = useMemo(() => {
    const ids = gridBase.map(m => m.id);
    const ref = adminOrder.length ? adminOrder : ((user.dashboardIconOrder || []) as string[]);
    const base = [...ids].sort((a, b) => { const ia = ref.indexOf(a), ib = ref.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || ids.indexOf(a) - ids.indexOf(b); });
    if (!enough) return base;
    // Vị trí khoá tính theo thứ tự gốc sau khi đã bỏ chức năng người dùng không có quyền
    const locks: Record<string, number> = {};
    for (const id of ui.gridLock || []) { const i = base.indexOf(id); if (i >= 0) locks[id] = i; }
    const userPins: Record<string, number> = {};
    for (const [id, i] of Object.entries(usage.pins || {})) if (locks[id] === undefined && base.includes(id)) userPins[id] = i;
    return personalOrder(base, scores, adminOrder.length ? undefined : usage.order, { ...userPins, ...locks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridBase.map(m => m.id).join('|'), adminOrder.join('|'), lockKey, enough, scores, JSON.stringify(usage.pins || {})]);
  const grid = order.slice(0, 8).map(find).filter(Boolean) as PhoneModule[];

  // ===== Tính năng nổi bật =====
  const picks = useMemo(() => {
    const cands = mods.filter(m => !SKIP_GRID.has(m.id) && !gridHide.has(m.id) && phoneMode(m.id, settings) !== 'laptop').map(m => ({ id: m.id, label: m.label, group: MODULE_REGISTRY.find(r => r.id === m.id)?.group }));
    if (enough) return featuredPicks({ candidates: cands, rowIds: grid.map(m => m.id), scores, data: usage }).slice(0, 6);
    return cands.filter(c => !grid.some(g => g.id === c.id)).slice(0, 5).map(c => ({ id: c.id, reason: isNewModule(c.id) ? 'Chức năng mới trên EduGo' : 'Bạn có thể thử', kind: 'discover' as const }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enough, grid.map(m => m.id).join('|'), scores, mods]);
  useEffect(() => { if (enough) noteShown(user.id, picks.filter(p => p.kind === 'discover').map(p => p.id)); }, [picks, enough, user.id]);

  // ===== Tiếp tục =====
  const docs = (usage.docs || []).filter(d => find(d.tab)).slice(0, 5);
  const openDoc = (d: DocVisit) => open(d.tab, d.sub);

  const [expand, setExpand] = useState(false);
  const gridAll = order.map(find).filter(Boolean) as PhoneModule[];
  // Hiện 4 chức năng, bấm mũi tên hiện thêm 4 (tổng 8, admin xếp sẵn rồi tự đổi theo thói quen). Còn lại ở Tất cả chức năng.
  const gridShown = gridAll.slice(0, expand ? 8 : 4);

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
        {gridAll.length > 4 && (
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
          <div key={r.id} role="button" tabIndex={0} className="ph-remind" onClick={() => { if (r.kind === 'extension' && r.sub?.cid) markOpenExt(r.sub.cid); open(r.tab, r.sub); }}>
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
              <div className="body"><p>{m.desc}</p></div>
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
export function PhoneTop({ settings, ui: uiOverride, name, avatar, unread, acts, onProfile, onSearch, onBell, nav }: {
  settings?: AppSettings; ui?: PhoneUi; name?: string; avatar?: string; unread?: number; acts: TopAct[];
  onProfile?: () => void; onSearch?: () => void; onBell?: () => void;
  // Dùng trong chức năng (ví dụ Lớp học): thay lời chào bằng nút quay lại, tên chức năng và nút về Trang chủ.
  nav?: { title: string; onBack: () => void; onHome: () => void; right?: React.ReactNode };
}) {
  const ui = uiOverride || phoneUi(settings);
  const show = ui.bannerOn !== false;
  // Mặc định dùng màu hệ thống: ảnh banner máy tính thường sáng và nằm ngang nên lên điện thoại bị mờ chữ, lệch màu.
  const mode = ui.imageMode || 'art';
  const img = !show ? '' : mode === 'custom' ? ui.image : mode === 'desktop' ? settings?.dashboardBannerImage : '';
  const pos = mode === 'custom' ? ui.position : settings?.dashboardBannerPosition;
  const title = ui.title?.trim() || settings?.dashboardBannerTitle || 'Hôm nay bạn muốn làm gì?';
  const desc = ui.desc?.trim() || settings?.systemDescription || 'Bài giảng, lớp học, đề Quizz của bạn ở ngay đây';
  return (
    <div className={`ph-top ${img ? 'has-img' : ''}`} style={img ? { backgroundImage: `url(${img})`, backgroundPosition: pos || 'center' } : undefined}>
      {img && <div className="shade" />}
      {nav ? (
        <div className="hi nv">
          <button type="button" className="ib bk" onClick={nav.onBack} aria-label="Quay lại"><ChevronLeft /></button>
          <b className="nt">{nav.title}</b>
          {nav.right}
          <button type="button" className="ib" onClick={nav.onHome} aria-label="Về Trang chủ"><Home /></button>
        </div>
      ) : (
      <div className="hi">
        <button type="button" className="me" onClick={onProfile} aria-label="Mở trang cá nhân">
          <span className="lg">{avatar ? <img src={avatar} alt="" /> : initials(name || '')}</span>
          <span className="t"><span>Xin chào <Hand /></span><b>{name}</b></span>
        </button>
        <button type="button" className="ib" onClick={onSearch} aria-label="Tìm chức năng"><Search /></button>
        <button type="button" className="ib" onClick={onBell} aria-label="Thông báo"><Bell />{(unread || 0) > 0 && <span className="d" />}</button>
      </div>
      )}
      {show && (ui.titleOn !== false || ui.descOn !== false) && (
        <div className="ht">
          {ui.titleOn !== false && <b>{title}</b>}
          {ui.descOn !== false && <p>{desc}</p>}
        </div>
      )}
      {acts.length > 0 && (
        <div className={`acts ${show ? '' : 'tight'}`}>
          {acts.map(a => { const I = a.icon; return <button key={a.key} type="button" className="act" onClick={a.run}><span className="c"><I /></span>{a.label}</button>; })}
        </div>
      )}
    </div>
  );
}

// Danh sách nút tròn đầu Trang chủ: các ô admin chọn trước, sau đó tới danh sách mặc định để bù khi người dùng không có quyền.
const ACT_DEFAULTS: { id: string; label: string; icon: any }[] = [
  { id: 'edu', label: 'Lớp học', icon: GraduationCap }, { id: 'elearning', label: 'Giáo trình', icon: BookOpen },
  { id: 'edu_bank', label: 'Bài tập', icon: Library }, { id: 'slides', label: 'Bài giảng', icon: Presentation },
  { id: 'tasks', label: 'Công việc', icon: CalendarDays },
  { id: 'courses', label: 'Khoá học', icon: GraduationCap },
];
export function resolveActs(ui: PhoneUi, allowed: (id: string) => boolean, labelOf: (id: string) => string | undefined) {
  const n = ui.moreOn === false ? 4 : 3;
  const reg = (id: string) => MODULE_REGISTRY.find(m => m.id === id);
  const mk = (id: string, label?: string) => {
    const d = ACT_DEFAULTS.find(x => x.id === id);
    return { id, label: label?.trim() || d?.label || labelOf(id) || reg(id)?.label || id, icon: d?.icon || reg(id)?.icon || MoreHorizontal };
  };
  // Giữ đúng vị trí admin chọn. Ô để trống hoặc người dùng không có quyền thì lấy chức năng mặc định kế tiếp.
  const seen = new Set<string>();
  const slots: Array<{ id: string; label: string; icon: any } | null> = Array.from({ length: n }, (_, i) => {
    const a = ui.acts?.[i];
    if (a?.id && allowed(a.id) && !seen.has(a.id)) { seen.add(a.id); return mk(a.id, a.label); }
    return null;
  });
  const chosenIds = new Set((ui.acts || []).map(a => a?.id).filter(Boolean));
  const pool = ACT_DEFAULTS.filter(d => !chosenIds.has(d.id) && allowed(d.id) && !seen.has(d.id));
  const out = slots.map(x => x || (() => { const d = pool.shift(); if (!d) return null; seen.add(d.id); return mk(d.id); })()).filter(Boolean) as Array<{ id: string; label: string; icon: any }>;
  if (ui.moreOn !== false) out.push({ id: 'all_features', label: ui.moreLabel?.trim() || 'Khác', icon: MoreHorizontal });
  return out;
}
