import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, CheckCheck, ClipboardList, Users, GraduationCap, Info, AlertTriangle, Shield, Workflow, BookOpen, Bell, Trash2, Monitor } from 'lucide-react';
import { usePhone, usePhoneModules } from './PhoneShell';
import { phoneUi, NOTI_DEFAULT, PhoneUi } from '../../lib/device';
import { MODULE_REGISTRY } from '../../lib/modules';
import type { AppSettings } from '../../types';
import { useMyNotifications, openNotificationTarget } from '../../lib/notifications';
import { isTaskRelevantToUser } from '../../lib/tasks';
import { notifCategory, NotifCategory, NOTIF_CATEGORY_LABEL } from '../../lib/phone';
import type { AppNotification } from '../../types';

const ICON: Record<NotifCategory, any> = { task: ClipboardList, collab: Users, class: GraduationCap, system: Info };
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

  const items = useMemo(() => Array.from(new Map(notif.items.map(n => [n.id, n])).values()), [notif.items]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, task: 0, collab: 0, class: 0, system: 0 };
    items.forEach(n => { if (n.unread) { c.all++; c[notifCategory(n)]++; } });
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
        {(['all', 'task', 'collab', 'class', 'system'] as const).map(k => (
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
              {gi === 0 && counts.all > 0 && <button type="button" className="lnk" onClick={() => notif.markAllRead()}><CheckCheck />Đọc hết</button>}
            </div>
            {g.items.map(n => { const I = iconFor(n); const a = action(n); return (
              <button key={n.id} type="button" className="ph-noti" onClick={() => tap(n)}>
                <span className="ic"><I />{n.unread && <span className="u" />}</span>
                <span className="m"><b className={n.unread ? '' : 'read'}>{n.title}</b><p>{n.description}</p><em>{when(n.timestamp)}{n.senderName && n.senderId !== user.id ? ` · ${n.senderName}` : ''}</em></span>
                {a && <span className={`r ${a.w ? 'w' : ''}`}>{a.t}</span>}
              </button>
            ); })}
          </div>
        );
      })}

      {detail && (
        <div className="ph ph-scrim" onClick={() => setDetail(null)}>
          <div className="ph-sheet" onClick={e => e.stopPropagation()}>
            <div className="grab" />
            <h3>{detail.title}</h3>
            <p className="s">{when(detail.timestamp)}{detail.senderName ? ` · ${detail.senderName}` : ''}</p>
            <div style={{ marginTop: 14, background: '#f8fafc', borderRadius: 16, padding: 14, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--ph-text)' }}>{detail.description}</div>
            <button type="button" className="ph-btn" style={{ width: '100%', marginTop: 16 }} onClick={() => setDetail(null)}>Đóng</button>
            <button type="button" className="ph-btn ghost" style={{ width: '100%', marginTop: 10, color: 'var(--ph-rose)', borderColor: '#fecdd3' }} onClick={() => { notif.remove(detail.id); setDetail(null); }}><Trash2 size={18} />Xoá thông báo</button>
          </div>
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
