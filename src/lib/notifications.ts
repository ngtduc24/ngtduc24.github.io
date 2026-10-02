import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { isNotificationForUser, subscribeToNotificationChanges } from './data';
import { subscribeToTasks, isTaskRelevantToUser } from './tasks';
import { getSeoMeta, writeSubRoute } from './seoConfig';
import type { AppNotification, Task, UserAccount } from '../types';

// Thông báo dùng chung cho chuông, trang Thông báo, số đếm trên thanh bên và trang Tổng quan.
// 1. Chỉ tải thông báo gửi tới đúng tài khoản (gửi chung, gửi admin nếu là admin, gửi đích danh),
//    không tải toàn bộ bảng về máy rồi mới lọc như trước.
// 2. Trạng thái đã đọc, đã xoá lưu trên máy chủ theo từng tài khoản (khoá notif_state:<uid> ở bảng
//    portfolio_settings), mọi thiết bị đăng nhập cùng tài khoản thấy giống nhau.
// 3. Nhắc việc (được giao, sắp hết hạn) có mã cố định theo công việc nên không bị trùng giữa các máy.

const T = 'system_notifications';
const STATE_TABLE = 'portfolio_settings';
const LIMIT = 200;

const mapRow = (n: any): AppNotification => ({
  id: n.id,
  title: n.title,
  description: n.description,
  type: n.type,
  targetAudience: n.target_audience,
  targetUserIds: n.target_user_ids,
  senderId: n.sender_id,
  senderName: n.sender_name,
  timestamp: n.timestamp,
  isRead: n.is_read,
  link: n.link,
  metadata: typeof n.metadata === 'string' ? (() => { try { return JSON.parse(n.metadata); } catch { return {}; } })() : n.metadata,
  priority: n.priority,
} as AppNotification);

// Thông báo gửi tới một tài khoản.
export async function fetchMyNotifications(user: Pick<UserAccount, 'id' | 'username' | 'role'>): Promise<AppNotification[]> {
  if (!user?.id) return [];
  const audiences = user.role === 'admin' ? ['all', 'all_admins'] : ['all'];
  const ids = [user.id, user.username].filter(Boolean) as string[];
  const queries = [
    supabase.from(T).select('*').in('target_audience', audiences).order('timestamp', { ascending: false }).limit(LIMIT),
    ...ids.map(id => supabase.from(T).select('*').filter('target_user_ids', 'cs', JSON.stringify([id])).order('timestamp', { ascending: false }).limit(LIMIT)),
  ];
  const res = await Promise.all(queries);
  const seen = new Map<string, AppNotification>();
  for (const r of res) {
    if (r.error) { console.warn('Lỗi tải thông báo:', r.error.message); continue; }
    for (const row of r.data || []) if (!seen.has(row.id)) seen.set(row.id, mapRow(row));
  }
  return [...seen.values()]
    .filter(n => isNotificationForUser(n, user))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Thông báo do một tài khoản gửi đi (trang Trung tâm thông báo của admin).
export async function fetchSentNotifications(senderId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase.from(T).select('*').eq('sender_id', senderId).order('timestamp', { ascending: false }).limit(LIMIT);
  if (error) throw error;
  return (data || []).map(mapRow);
}

// ===== Trạng thái đã đọc, đã xoá =====
type NState = { read: Record<string, number>; del: Record<string, number> };
const emptyState = (): NState => ({ read: {}, del: {} });
const cacheKey = (uid: string) => `notif_state_${uid}`;
const serverKey = (uid: string) => `notif_state:${uid}`;
const KEEP_MS = 180 * 24 * 3600 * 1000;

const prune = (s: NState): NState => {
  const cut = Date.now() - KEEP_MS;
  const keep = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).filter(([, t]) => t > cut).slice(-3000));
  return { read: keep(s.read || {}), del: keep(s.del || {}) };
};
const merge = (a: NState, b: NState): NState => ({
  read: { ...a.read, ...b.read },
  del: { ...a.del, ...b.del },
});

function readCache(uid: string): NState {
  try { const raw = localStorage.getItem(cacheKey(uid)); if (raw) return { ...emptyState(), ...JSON.parse(raw) }; } catch { /* bỏ qua */ }
  return emptyState();
}
function writeCache(uid: string, s: NState) {
  try { localStorage.setItem(cacheKey(uid), JSON.stringify(s)); } catch { /* bỏ qua */ }
}

// Gom trạng thái cũ lưu rời từng khoá trên trình duyệt (notif_read_<uid>_<id>, notif_deleted_<uid>_<id>),
// chuyển vào bộ trạng thái mới rồi xoá khoá cũ.
function takeLegacy(uid: string): NState {
  const s = emptyState();
  try {
    const now = Date.now();
    const rm: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      const r = `notif_read_${uid}_`, d = `notif_deleted_${uid}_`;
      if (k.startsWith(r)) { s.read[k.slice(r.length)] = now; rm.push(k); }
      else if (k.startsWith(d)) { s.del[k.slice(d.length)] = now; rm.push(k); }
    }
    rm.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem(`notifications_${uid}`); // danh sách cũ lưu cả thông báo trên máy, không dùng nữa
  } catch { /* bỏ qua */ }
  return s;
}

async function pullServer(uid: string): Promise<NState | null> {
  const { data, error } = await supabase.from(STATE_TABLE).select('data').eq('key', serverKey(uid)).maybeSingle();
  if (error) return null;
  return { ...emptyState(), ...(data?.data || {}) };
}
async function pushServer(uid: string, s: NState) {
  await supabase.from(STATE_TABLE).upsert({ key: serverKey(uid), data: s });
}

// ===== Kho dùng chung cho một tài khoản =====
type Snapshot = { items: AppNotification[]; unread: number; tasks: Task[]; ready: boolean };
interface Store {
  uid: string;
  user: UserAccount;
  server: AppNotification[];
  tasks: Task[];
  state: NState;
  ready: boolean;
  listeners: Set<(s: Snapshot) => void>;
  stop: () => void;
  saveTimer?: ReturnType<typeof setTimeout>;
}
let store: Store | null = null;

function taskNotifs(user: UserAccount, tasks: Task[]): AppNotification[] {
  const out: AppNotification[] = [];
  const now = Date.now();
  for (const task of tasks) {
    if (task.isDeleted || !isTaskRelevantToUser(task, user)) continue;
    const pending = task.status !== 'Completed' && task.status !== 'Cancelled';
    const dl = task.deadline ? new Date(task.deadline).getTime() : NaN;
    if (pending && dl > now && dl - now <= 24 * 3600 * 1000) {
      out.push({
        id: `task-expiring-${task.id}-${user.id}`, title: 'Hạn chót công việc sắp tới',
        description: `Nhiệm vụ "${task.name}" sắp hết hạn trong vòng 24 giờ tới.`,
        timestamp: new Date(dl - 24 * 3600 * 1000).toISOString(), type: 'warning', actionUrl: 'tasks', metadata: { taskId: task.id },
      });
    }
    const mine = task.assignedTo === user.id || (!!task.assignedTo && !!user.username && task.assignedTo === user.username);
    if (mine && task.createdBy !== user.id) {
      out.push({
        id: `task-assigned-${task.id}-${user.id}`, title: 'Nhiệm vụ mới được giao',
        description: `Bạn đã được giao nhiệm vụ mới: "${task.name}".`,
        timestamp: task.createdAt || task.startDate || new Date(0).toISOString(), type: 'task', actionUrl: 'tasks', metadata: { taskId: task.id },
      });
    }
  }
  return out;
}

function snapshot(s: Store): Snapshot {
  const all = [...s.server, ...taskNotifs(s.user, s.tasks)];
  const seen = new Set<string>();
  const items = all
    .filter(n => { if (seen.has(n.id) || s.state.del[n.id]) return false; seen.add(n.id); return true; })
    .map(n => ({ ...n, unread: !s.state.read[n.id] }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return { items, unread: items.filter(n => n.unread).length, tasks: s.tasks, ready: s.ready };
}
function emit(s: Store) {
  const snap = snapshot(s);
  s.listeners.forEach(l => l(snap));
  window.dispatchEvent(new Event('app_notifications_changed'));
}

async function reloadServer(s: Store) {
  try { s.server = await fetchMyNotifications(s.user); s.ready = true; if (store === s) emit(s); } catch { /* giữ bản cũ */ }
}
async function reloadState(s: Store) {
  const remote = await pullServer(s.uid);
  if (!remote || store !== s) return;
  s.state = prune(merge(remote, s.state));
  writeCache(s.uid, s.state);
  emit(s);
}

function ensureStore(user: UserAccount): Store {
  if (store && store.uid === user.id) { store.user = user; return store; }
  if (store) store.stop();
  const s: Store = {
    uid: user.id, user, server: [], tasks: [], ready: false, listeners: new Set(), stop: () => {},
    state: prune(merge(readCache(user.id), takeLegacy(user.id))),
  };
  store = s;
  writeCache(s.uid, s.state);
  // Lần đầu: gộp trạng thái trên máy chủ với trạng thái trên máy, ghi lại nếu máy có thêm.
  pullServer(s.uid).then(remote => {
    if (store !== s) return;
    const merged = prune(merge(remote || emptyState(), s.state));
    const changed = JSON.stringify(merged) !== JSON.stringify(remote || emptyState());
    s.state = merged; writeCache(s.uid, merged); emit(s);
    if (changed) pushServer(s.uid, merged).catch(() => {});
  });
  // Chờ phiên đăng nhập Firebase sẵn sàng rồi mới tải, nếu không máy chủ coi là khách và trả về rỗng.
  // Mỗi lần phiên đăng nhập đổi (khôi phục xong, làm mới token) thì tải lại.
  let unAuth = () => {};
  import('./firebase').then(async ({ auth }) => {
    await auth.authStateReady();
    if (store !== s) return;
    reloadServer(s);
    const { onAuthStateChanged } = await import('firebase/auth');
    unAuth = onAuthStateChanged(auth, u => { if (u && store === s) reloadServer(s); });
  }).catch(() => reloadServer(s));
  // Dự phòng khi kênh thời gian thực bị ngắt: 60 giây tải lại 1 lần lúc trang đang mở.
  const poll = setInterval(() => { if (document.visibilityState === 'visible') reloadServer(s); }, 60000);
  const unNotif = subscribeToNotificationChanges(() => reloadServer(s));
  const unTasks = subscribeToTasks(tasks => { s.tasks = tasks; if (store === s) emit(s); });
  // Quay lại cửa sổ thì đồng bộ trạng thái đọc từ thiết bị khác.
  const onFocus = () => { reloadState(s); reloadServer(s); };
  window.addEventListener('focus', onFocus);
  s.stop = () => { unNotif(); unTasks(); unAuth(); clearInterval(poll); window.removeEventListener('focus', onFocus); if (s.saveTimer) clearTimeout(s.saveTimer); };
  return s;
}

function scheduleSave(s: Store) {
  if (s.saveTimer) clearTimeout(s.saveTimer);
  s.saveTimer = setTimeout(async () => {
    // Đọc bản mới nhất trên máy chủ rồi gộp, tránh ghi đè thao tác từ máy khác.
    const remote = await pullServer(s.uid);
    s.state = prune(merge(remote || emptyState(), s.state));
    writeCache(s.uid, s.state);
    pushServer(s.uid, s.state).catch(() => {});
  }, 800);
}

function mark(kind: 'read' | 'del', ids: string[]) {
  const s = store;
  if (!s || !ids.length) return;
  const now = Date.now();
  ids.forEach(id => { s.state[kind][id] = now; if (kind === 'del') s.state.read[id] = now; });
  writeCache(s.uid, s.state);
  emit(s);
  scheduleSave(s);
}
export const markNotificationsRead = (ids: string[]) => mark('read', ids);
export const deleteNotificationsForMe = (ids: string[]) => mark('del', ids);

// Hook dùng trong giao diện.
export function useMyNotifications(user: UserAccount | null | undefined) {
  const [snap, setSnap] = useState<Snapshot>({ items: [], unread: 0, tasks: [], ready: false });
  useEffect(() => {
    if (!user?.id) return;
    const s = ensureStore(user);
    const l = (x: Snapshot) => setSnap(x);
    s.listeners.add(l);
    setSnap(snapshot(s));
    return () => { s.listeners.delete(l); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);
  return {
    ...snap,
    markRead: (id: string) => markNotificationsRead([id]),
    markAllRead: () => markNotificationsRead(snap.items.filter(n => n.unread).map(n => n.id)),
    remove: (id: string) => deleteNotificationsForMe([id]),
    clearAll: () => deleteNotificationsForMe(snap.items.map(n => n.id)),
  };
}

// Đăng xuất thì ngừng lắng nghe.
export function resetNotificationStore() { if (store) { store.stop(); store = null; } }

// ===== Mở nơi liên quan khi bấm vào thông báo =====
// Tài nguyên cộng tác: chức năng cần mở và tham số màn hình con.
const COLLAB_ROUTES: Record<string, (id: string) => { tab: string; sub?: Record<string, string>; hint?: string }> = {
  el_lesson: () => ({ tab: 'elearning', hint: 'shared' }),
  bank_item: id => ({ tab: 'edu_bank', sub: { bid: id }, hint: 'collab' }),
  quiz: id => ({ tab: 'edu_exam', sub: { qv: 'detail', qid: id }, hint: 'collab' }),
  quiz_question: () => ({ tab: 'edu_question_bank', hint: 'collab' }),
  edu_class: id => ({ tab: 'edu', sub: { sv: 'class_detail', cid: id } }),
  edu_school: () => ({ tab: 'edu' }),
  qda_project: id => ({ tab: 'qualitative_analysis', hint: id }),
  slide_deck: id => ({ tab: 'slides', sub: { sid: id }, hint: 'shared' }),
  quant_project: id => ({ tab: 'quantitative_analysis', hint: id }),
};

// Gợi ý mở cho chức năng đích (ví dụ mở sẵn mục Được chia sẻ với tôi), dùng 1 lần.
export function takeOpenHint(key: string): string | null {
  try { const v = sessionStorage.getItem(`open_hint:${key}`); if (v) sessionStorage.removeItem(`open_hint:${key}`); return v; } catch { return null; }
}
function setOpenHint(key: string, v: string) { try { sessionStorage.setItem(`open_hint:${key}`, v); } catch { /* bỏ qua */ } }

function goTo(tab: string, setCurrentTab: (t: string) => void, sub?: Record<string, string>) {
  const cur = new URLSearchParams(window.location.search).get('tab');
  const slug = getSeoMeta(tab).slug;
  if (cur === slug) {
    // Đang ở đúng chức năng: tải lại theo địa chỉ mới để mở đúng màn hình con.
    const url = new URL(window.location.href);
    Object.entries(sub || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    window.location.assign(url.toString());
    return;
  }
  if (sub) writeSubRoute(sub);
  setCurrentTab(tab);
}

// Trả về true nếu đã chuyển tới nơi liên quan, false nếu chỉ nên mở khung đọc nội dung.
export function openNotificationTarget(n: AppNotification, setCurrentTab?: (t: string) => void): boolean {
  if (!setCurrentTab) return false;
  const meta: any = n.metadata || {};
  if (meta.collabType && meta.resourceId && COLLAB_ROUTES[meta.collabType]) {
    if (meta.removed) return false;
    const r = COLLAB_ROUTES[meta.collabType](meta.resourceId);
    if (r.hint) setOpenHint(meta.collabType, r.hint);
    goTo(r.tab, setCurrentTab, r.sub);
    return true;
  }
  if (meta.appId && n.type === 'access') {
    setCurrentTab(meta.appId);
    return true;
  }
  return false;
}

// ===== Báo khi admin cấp hoặc thu hồi quyền dùng ứng dụng =====
// Mỗi lần bật tắt 1 công tắc là 1 lần lưu, nên gom các thay đổi trong vài giây thành 1 thông báo.
const accessQueue = new Map<string, { added: Set<string>; removed: Set<string>; timer: ReturnType<typeof setTimeout>; sender: { id: string; name?: string } }>();

export async function notifyAppAccessChange(prev: UserAccount | undefined, next: UserAccount, sender: UserAccount | null | undefined) {
  if (!prev || !sender || sender.id === next.id) return;
  const [{ MODULE_REGISTRY }, { canUseModule }, { pushNotificationToSupabase }] = await Promise.all([
    import('./modules'), import('./moduleAccess'), import('./data'),
  ]);
  const ALWAYS = new Set(['dashboard', 'notifications', 'profile', 'all_features', 'portfolio_website', 'courses']);
  const ids = MODULE_REGISTRY.map(m => m.id).filter(id => !ALWAYS.has(id));
  const added = ids.filter(id => !canUseModule(prev, id) && canUseModule(next, id));
  const removed = ids.filter(id => canUseModule(prev, id) && !canUseModule(next, id));
  if (!added.length && !removed.length) return;
  const q = accessQueue.get(next.id) || { added: new Set<string>(), removed: new Set<string>(), timer: undefined as any, sender: { id: sender.id, name: sender.fullName } };
  added.forEach(id => { if (q.removed.has(id)) q.removed.delete(id); else q.added.add(id); });
  removed.forEach(id => { if (q.added.has(id)) q.added.delete(id); else q.removed.add(id); });
  if (q.timer) clearTimeout(q.timer);
  q.timer = setTimeout(() => {
    accessQueue.delete(next.id);
    if (!q.added.size && !q.removed.size) return;
    const label = (id: string) => MODULE_REGISTRY.find(m => m.id === id)?.label || id;
    const a = [...q.added].map(label), r = [...q.removed].map(label);
    const title = a.length ? `Bạn được cấp quyền dùng ${a.length === 1 ? a[0] : `${a.length} ứng dụng`}` : 'Quyền sử dụng ứng dụng đã thay đổi';
    const parts: string[] = [];
    if (a.length) parts.push(`Từ giờ bạn dùng được ${a.join(', ')}.`);
    if (r.length) parts.push(`Bạn không còn quyền dùng ${r.join(', ')}.`);
    pushNotificationToSupabase({
      title, description: parts.join(' '), type: 'access',
      targetAudience: 'custom_users', targetUserIds: [next.id],
      senderId: q.sender.id, senderName: q.sender.name,
      metadata: { appId: [...q.added][0] || null, added: [...q.added], removed: [...q.removed] },
    } as any).catch(() => {});
  }, 4000);
  accessQueue.set(next.id, q);
}
