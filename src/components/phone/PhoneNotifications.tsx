import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, SlidersHorizontal, CheckCheck, ClipboardList, Users, GraduationCap, Info, AlertTriangle, Shield, Workflow, BookOpen, Bell, Trash2, Monitor, CheckSquare, Square, CheckCircle2, X, ChevronLeft, CalendarClock } from 'lucide-react';
import { usePhone, usePhoneModules } from './PhoneShell';
import { phoneUi, NOTI_DEFAULT, PhoneUi } from '../../lib/device';
import { MODULE_REGISTRY } from '../../lib/modules';
import type { AppSettings } from '../../types';
import { useMyNotifications, openNotificationTarget, deleteNotificationsForMe } from '../../lib/notifications';
import { isTaskRelevantToUser } from '../../lib/tasks';
import { notifCategory, NotifCategory, NOTIF_CATEGORY_LABEL } from '../../lib/phone';
import type { AppNotification } from '../../types';

const ICON: Record<NotifCategory, any> = { approval: CalendarClock, task: ClipboardList, collab: Users, class: GraduationCap, system: Info };
const iconFor = (n: AppNotification) => {
  if (n.metadata?.handoff) return Monitor;
  if (n.type === 'warning') return AlertTriangle;
  if (n.type === 'access') return Shield;
  if (n.type === 'journal') return BookOpen;
  if (n.metadata?.workflowId || /automatic/i.test(n.senderName || '')) return Workflow;
  return ICON[notifCategory(n)];
};
const hhmm = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dayKey = (iso: string) => {
  const d = new Date(iso); const now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  if (diff <= 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  if (diff < 7) return 'Tuần này';
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
};
const fullWhen = (iso: string) => { const d = new Date(iso); return `${hhmm(d)} ${['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
const when = (iso: string) => { const d = new Date(iso); const k = dayKey(iso); return k === 'Hôm nay' || k === 'Hôm qua' ? hhmm(d) : `${d.getDate()}/${d.getMonth() + 1} ${hhmm(d)}`; };

// Thông báo trên điện thoại: đầu trang màu hệ thống, ô tìm kiếm có nút lọc chưa đọc,
// thẻ phân loại Tất cả, Công việc, Cộng tác, Lớp học, Hệ thống, danh sách chia theo ngày.
export default function PhoneNotifications() {
  const { user, settings, open } = usePhone();
  const mods = usePhoneModules(user, settings);
  const notif = useMyNotifications(user);
  const [cat, setCat] = useState<'all' | NotifCategory>('all');
  const [q, setQ] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [detail, setDetail] = useState<AppNotification | null>(null);

  // ===== Xoá thông báo =====
  // Vuốt sang trái để xoá 1 thông báo, hoặc bấm Chọn để xoá nhiều thông báo cùng lúc.
  // Xoá xong có 5 giây để Hoàn tác, hết 5 giây mới xoá hẳn khỏi danh sách của mình (người khác không bị ảnh hưởng).
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<{ ids: string[]; timer: number } | null>(null);
  const undoRef = useRef(undo); undoRef.current = undo;
  const commit = (ids: string[]) => { if (ids.length) deleteNotificationsForMe(ids); };
  const removeIds = (ids: string[]) => {
    if (!ids.length) return;
    if (undoRef.current) { window.clearTimeout(undoRef.current.timer); commit(undoRef.current.ids); }
    setHidden(h => { const n = new Set(h); ids.forEach(id => n.add(id)); return n; });
    const timer = window.setTimeout(() => { commit(ids); setUndo(u => (u && u.timer === timer ? null : u)); }, 5000);
    setUndo({ ids, timer });
  };
  const doUndo = () => {
    if (!undo) return;
    window.clearTimeout(undo.timer);
    setHidden(h => { const n = new Set(h); undo.ids.forEach(id => n.delete(id)); return n; });
    setUndo(null);
  };
  // Rời trang Thông báo khi còn đang chờ Hoàn tác thì xoá luôn.
  useEffect(() => () => { const u = undoRef.current; if (u) { window.clearTimeout(u.timer); commit(u.ids); } }, []);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const togglePick = (id: string) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const stopPick = () => { setPicking(false); setPicked(new Set()); };
  useEffect(() => {
    document.documentElement.classList.toggle('ph-immersive', picking);
    return () => document.documentElement.classList.remove('ph-immersive');
  }, [picking]);

  const items = useMemo(() => Array.from(new Map(notif.items.map(n => [n.id, n])).values()).filter(n => !hidden.has(n.id)), [notif.items, hidden]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, approval: 0, task: 0, collab: 0, class: 0, system: 0 };
    items.forEach(n => { const k = notifCategory(n); if (n.unread) { c.all++; if (k !== 'approval') c[k]++; } if (k === 'approval') c.approval++; });
    return c;
  }, [items]);
  const list = items.filter(n => (cat === 'all' || notifCategory(n) === cat) && (!unreadOnly || n.unread)
    && (!q.trim() || `${n.title} ${n.description}`.toLowerCase().includes(q.trim().toLowerCase())));
  const groups: { k: string; items: AppNotification[] }[] = [];
  list.forEach(n => { const k = dayKey(n.timestamp); const g = groups.find(x => x.k === k); if (g) g.items.push(n); else groups.push({ k, items: [n] }); });

  const go = (tab: string) => open(tab);
  const tap = (n: AppNotification) => {
    notif.markRead(n.id);
    if (openNotificationTarget(n, go)) return;
    const meta: any = n.metadata || {};
    if (n.type === 'task' || n.type === 'warning') {
      let taskId = meta.taskId || '';
      if (!taskId) { const m = n.id.match(/^task-(?:assigned|expiring)-(.+)-[^-]+$/); if (m) taskId = m[1]; }
      const task = notif.tasks.find(t => t.id === taskId);
      if (taskId && (!task || isTaskRelevantToUser(task, user))) {
        localStorage.setItem('auto_open_task_id', taskId);
        window.dispatchEvent(new CustomEvent('app_open_task', { detail: taskId }));
      }
      go('tasks'); return;
    }
    if (n.type === 'journal') {
      if (meta.journalId) { localStorage.setItem('auto_open_journal_id', meta.journalId); window.dispatchEvent(new CustomEvent('app_open_journal', { detail: meta.journalId })); }
      go('scientific_journals'); return;
    }
    if (n.actionUrl && n.type !== 'system' && n.type !== 'info') { go(n.actionUrl); return; }
    setDetail(n);
  };
  const action = (n: AppNotification) => {
    const meta: any = n.metadata || {};
    if (meta.handoff) return { t: 'Mở', w: false };
    if (n.type === 'warning') return { t: 'Sắp hạn', w: true };
    if (n.type === 'task') return { t: 'Xem', w: false };
    if (meta.collabType && !meta.removed) return { t: 'Mở', w: false };
    if (n.type === 'access') return { t: 'Dùng thử', w: false };
    return null;
  };

  return (
    <div>
      <div className="ph-head">
        <h2>Thông báo</h2>
        <div className="ph-search">
          <Search /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm thông báo" />
          <button type="button" className="fl" aria-label="Chỉ hiện chưa đọc" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(v => !v)} style={unreadOnly ? { color: 'var(--ph-rose)' } : undefined}><SlidersHorizontal size={20} /></button>
        </div>
      </div>

      <NotiBanner settings={settings} canOpen={id => mods.some(m => m.id === id)} onOpen={open} />

      <div className="ph-tabs" style={{ position: 'sticky', top: 0, zIndex: 4 }}>
        {(['all', 'approval', 'task', 'collab', 'class', 'system'] as const).map(k => (
          <button key={k} type="button" className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>
            {k === 'all' ? 'Tất cả' : NOTIF_CATEGORY_LABEL[k]}{counts[k] > 0 && <span className="c">{counts[k] > 99 ? '99+' : counts[k]}</span>}
          </button>
        ))}
      </div>

      {!notif.ready && !items.length ? <div className="ph-empty">Đang tải thông báo...</div> : !groups.length ? (
        <div className="ph-empty"><Bell />{q || unreadOnly ? 'Không có thông báo nào khớp.' : 'Chưa có thông báo nào trong mục này.'}</div>
      ) : groups.map((g, gi) => {
        const unread = g.items.filter(n => n.unread).length;
        return (
          <div key={g.k}>
            <div className="ph-day">
              <div><b>{g.k}</b><p>{unread ? `${unread} chưa đọc · ` : ''}{g.items.length} thông báo</p></div>
              {gi === 0 && (
                <span className="acts">
                  {counts.all > 0 && !picking && <button type="button" className="lnk" onClick={() => notif.markAllRead()}><CheckCheck />Đọc hết</button>}
                  <button type="button" className="lnk" onClick={() => (picking ? stopPick() : setPicking(true))}>{picking ? <><X />Xong</> : <><CheckSquare />Chọn</>}</button>
                </span>
              )}
            </div>
            {g.items.map(n => { const I = iconFor(n); const a = action(n); const on = picked.has(n.id); return (
              <SwipeRow key={n.id} disabled={picking} onDelete={() => removeIds([n.id])}>
                <button type="button" className={`ph-noti ${on ? 'pk' : ''}`} onClick={() => (picking ? togglePick(n.id) : tap(n))}>
                  {picking && <span className={`ck ${on ? 'on' : ''}`}>{on ? <CheckCircle2 /> : <Square />}</span>}
                  <span className="ic"><I />{n.unread && <span className="u" />}</span>
                  <span className="m"><b className={n.unread ? '' : 'read'}>{n.title}</b><p>{n.description}</p><em>{when(n.timestamp)}{n.senderName && n.senderId !== user.id ? ` · ${n.senderName}` : ''}</em></span>
                  {a && !picking && <span className={`r ${a.w ? 'w' : ''}`}>{a.t}</span>}
                </button>
              </SwipeRow>
            ); })}
          </div>
        );
      })}

      {detail && createPortal(
        // Xem chi tiết thông báo trên màn riêng phủ kín, không bị thanh dưới che. Có nút quay lại ở góc trên trái.
        <div className="ph ph-detail fixed inset-0" role="dialog" aria-label={detail.title}>
          <header className="ph-appbar">
            <button type="button" className="bk" onClick={() => setDetail(null)} aria-label="Quay lại danh sách thông báo"><ChevronLeft /></button>
            <h1>Chi tiết thông báo</h1>
            <button type="button" className="hm" onClick={() => { removeIds([detail.id]); setDetail(null); }} aria-label="Xoá thông báo"><Trash2 /></button>
          </header>
          <div className="bd">
            <div className="hd">
              <span className="ic">{(() => { const I = iconFor(detail); return <I />; })()}</span>
              <div>
                <span className="cat">{NOTIF_CATEGORY_LABEL[notifCategory(detail)]}</span>
                <h2>{detail.title}</h2>
                <p>{fullWhen(detail.timestamp)}{detail.senderName ? ` · ${detail.senderName}` : ''}</p>
              </div>
            </div>
            <div className="ct">{detail.description}</div>
          </div>
          <div className="ft">
            <button type="button" className="ph-btn ghost del" onClick={() => { removeIds([detail.id]); setDetail(null); }}><Trash2 size={18} />Xoá</button>
            <button type="button" className="ph-btn" onClick={() => setDetail(null)}>Xong</button>
          </div>
        </div>, document.body)}

      {!picking && items.length > 0 && !undo && <p className="ph-hint">Vuốt thông báo sang trái để xoá</p>}

      {picking && (
        <div className="ph-pickbar">
          <button type="button" className="all" onClick={() => setPicked(p => (p.size === list.length ? new Set() : new Set(list.map(n => n.id))))}>
            {picked.size === list.length && list.length > 0 ? <CheckSquare /> : <Square />}{picked.size === list.length && list.length > 0 ? 'Bỏ chọn' : 'Chọn tất cả'}
          </button>
          <button type="button" className="rd" onClick={() => setPicked(new Set(list.filter(n => !n.unread).map(n => n.id)))}>Chọn đã đọc</button>
          <button type="button" className="del" disabled={!picked.size} onClick={() => { removeIds([...picked]); stopPick(); }}><Trash2 />Xoá{picked.size ? ` (${picked.size})` : ''}</button>
        </div>
      )}

      {undo && (
        <div className="ph-toast">
          <span>Đã xoá {undo.ids.length} thông báo</span>
          <button type="button" onClick={doUndo}>Hoàn tác</button>
        </div>
      )}
    </div>
  );
}

// Băng giới thiệu đầu danh sách thông báo. Admin chỉnh trong Cấu hình hệ thống, mục Điện thoại.
// Người không có quyền dùng chức năng được giới thiệu thì không thấy băng này.
export function NotiBanner({ settings, ui: uiOverride, canOpen, onOpen }: { settings?: AppSettings; ui?: PhoneUi; canOpen: (id: string) => boolean; onOpen: (id: string) => void }) {
  const ui = uiOverride || phoneUi(settings);
  const target = ui.notiTarget || NOTI_DEFAULT.target;
  if (ui.notiOn === false || !canOpen(target)) return null;
  const Icon = MODULE_REGISTRY.find(m => m.id === target)?.icon || Workflow;
  return (
    <div style={{ background: '#fff', paddingBottom: 10 }}>
      <button type="button" className="ph-banner" onClick={() => onOpen(target)}>
        <b>{ui.notiTitle?.trim() || NOTI_DEFAULT.title}</b>
        {(ui.notiBtn ?? NOTI_DEFAULT.btn).trim() && <span>{(ui.notiBtn ?? NOTI_DEFAULT.btn).trim()}</span>}
        {ui.notiImage ? <img src={ui.notiImage} alt="" className="pic" /> : <Icon />}
      </button>
    </div>
  );
}

// Vuốt sang trái để hiện nút Xoá, vuốt hẳn quá nửa hàng thì xoá luôn. Chỉ bắt khi kéo ngang rõ ràng,
// kéo dọc vẫn cuộn danh sách và kéo xuống tải lại như thường.
function SwipeRow({ children, onDelete, disabled }: { children: React.ReactNode; onDelete: () => void; disabled?: boolean }) {
  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState(false);
  const st = useRef<{ x: number; y: number; base: number; dir: 'h' | 'v' | null } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const OPEN = -88;
  useEffect(() => { if (disabled) setDx(0); }, [disabled]);
  // Chạm ra ngoài hàng đang mở thì đóng lại
  useEffect(() => {
    if (dx === 0) return;
    const close = (e: Event) => { if (wrap.current && !wrap.current.contains(e.target as Node)) { setAnim(true); setDx(0); } };
    document.addEventListener('touchstart', close, { passive: true });
    return () => document.removeEventListener('touchstart', close);
  }, [dx === 0]);
  const start = (e: React.TouchEvent) => {
    if (disabled || e.touches.length !== 1) return;
    st.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, base: dx, dir: null }; setAnim(false);
  };
  const move = (e: React.TouchEvent) => {
    const s = st.current; if (!s) return;
    const mx = e.touches[0].clientX - s.x, my = e.touches[0].clientY - s.y;
    if (!s.dir) { if (Math.abs(mx) < 8 && Math.abs(my) < 8) return; s.dir = Math.abs(mx) > Math.abs(my) ? 'h' : 'v'; }
    if (s.dir !== 'h') return;
    setDx(Math.min(0, s.base + mx));
  };
  const end = () => {
    const s = st.current; st.current = null; if (!s || s.dir !== 'h') return;
    const w = wrap.current?.offsetWidth || 360;
    setAnim(true);
    if (dx < -w * 0.5) { setDx(-w); window.setTimeout(onDelete, 180); }
    else setDx(dx < OPEN / 2 ? OPEN : 0);
  };
  return (
    <div ref={wrap} className="ph-swipe" onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}
      onClickCapture={e => { if (dx !== 0 && !(e.target as HTMLElement).closest('.del')) { e.stopPropagation(); e.preventDefault(); setAnim(true); setDx(0); } }}>
      <button type="button" className="del" style={{ width: Math.max(88, -dx) }} onClick={e => { e.stopPropagation(); setAnim(true); setDx(-(wrap.current?.offsetWidth || 360)); window.setTimeout(onDelete, 180); }}><Trash2 />Xoá</button>
      <div className="fg" style={{ transform: `translateX(${dx}px)`, transition: anim ? 'transform .2s ease-out' : 'none' }}>{children}</div>
    </div>
  );
}
