// Cá nhân hoá Trang chủ theo thói quen của từng người (phương án 2):
//
// 1. Ghi nhật ký riêng của tài khoản: mỗi lần mở một chức năng (mã chức năng, thời điểm) và các tài liệu
//    vừa mở (bài giảng, giáo trình, đề trắc nghiệm, lớp học, quy trình Automatic) để làm mục Tiếp tục.
//    Lưu trên máy để hiện ngay, đồng bộ lên máy chủ ở khoá usage:<uid> chỉ chủ tài khoản đọc ghi được.
// 2. Điểm thói quen (tần suất kết hợp độ gần đây): mỗi lần mở có trọng số 2^(-tuổi / 7 ngày), cộng lại.
// 3. Hệ số thời điểm: so xác suất dùng chức năng ở khung giờ và thứ hiện tại với xác suất chung
//    (làm mượt để ít dữ liệu không bị lệch), giới hạn trong khoảng 0,5 đến 3.
//    Điểm cuối = điểm thói quen × hệ số thời điểm ^ 0,7.
// 4. Giữ ổn định: chỉ đổi chỗ 2 chức năng khi điểm sau cao hơn điểm trước trên 20%, chức năng đã ghim
//    giữ nguyên vị trí, tài khoản mới chưa đủ dữ liệu dùng thứ tự mặc định.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

export interface DocVisit { key: string; kind: string; id: string; title: string; tab: string; sub: Record<string, string>; at: number }
export interface UsageData {
  v: 1;
  ev: Array<[string, number]>;          // [mã chức năng, thời điểm tính bằng giây]
  docs: DocVisit[];
  autoSort: boolean;                    // tự sắp xếp hàng phím tắt theo thói quen
  pins: Record<string, number>;         // chức năng ghim cố định ở vị trí thứ n trên hàng phím tắt
  order?: string[];                     // thứ tự lần trước, dùng để giữ ổn định
  fpins?: string[];                     // thẻ Tính năng nổi bật người dùng ghim (theo thứ tự)
  fdis?: Record<string, number>;        // thẻ người dùng bỏ đi, không gợi ý lại trong 30 ngày
  shown?: Record<string, { n: number; d: number }>; // số ngày đã gợi ý mà chưa mở, để luân phiên gợi ý
}

const DAY = 86400;
const HALF_LIFE = 7 * DAY;              // điểm thói quen giảm còn 50% sau 7 ngày
const CTX_HALF_LIFE = 28 * DAY;         // thói quen theo giờ thay đổi chậm hơn
const MAX_EVENTS = 2000;
const MAX_AGE = 120 * DAY;
const DEDUPE_SEC = 120;                 // mở lại cùng chức năng trong 2 phút chỉ tính 1 lần
const MAX_DOCS = 12;
export const MIN_EVENTS = 8;            // dưới mức này coi như chưa đủ dữ liệu
const SWAP_MARGIN = 1.2;

const empty = (): UsageData => ({ v: 1, ev: [], docs: [], autoSort: true, pins: {} });
const cacheKey = (uid: string) => `edugo_usage_${uid}`;
const serverKey = (uid: string) => `usage:${uid}`;
const nowSec = () => Math.floor(Date.now() / 1000);

// ===== Kho dùng chung trong trang =====
let cur: { uid: string; data: UsageData } | null = null;
const subs = new Set<() => void>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pulledFor = '';

function prune(d: UsageData): UsageData {
  const cut = nowSec() - MAX_AGE;
  return { ...d, ev: d.ev.filter(e => e[1] > cut).slice(-MAX_EVENTS), docs: d.docs.slice(0, MAX_DOCS) };
}
function readCache(uid: string): UsageData {
  try { const raw = localStorage.getItem(cacheKey(uid)); if (raw) return { ...empty(), ...JSON.parse(raw) }; } catch { /* bỏ qua */ }
  return empty();
}
function writeCache(uid: string, d: UsageData) { try { localStorage.setItem(cacheKey(uid), JSON.stringify(d)); } catch { /* bỏ qua */ } }

// Gộp dữ liệu 2 nơi: nhật ký lấy hợp của 2 bên, tài liệu lấy lần mở mới nhất, tuỳ chọn lấy bên mới hơn.
function merge(a: UsageData, b: UsageData): UsageData {
  const seen = new Set<string>();
  const ev = [...a.ev, ...b.ev].filter(e => { const k = e[0] + '@' + e[1]; if (seen.has(k)) return false; seen.add(k); return true; }).sort((x, y) => x[1] - y[1]);
  const docs = new Map<string, DocVisit>();
  [...a.docs, ...b.docs].forEach(d => { const o = docs.get(d.key); if (!o || o.at < d.at) docs.set(d.key, d); });
  return prune({ ...a, ...b, ev, docs: [...docs.values()].sort((x, y) => y.at - x.at), pins: { ...a.pins, ...b.pins } });
}

function load(uid: string): UsageData {
  if (!cur || cur.uid !== uid) cur = { uid, data: prune(readCache(uid)) };
  if (pulledFor !== uid) {
    pulledFor = uid;
    // Lấy bản trên máy chủ (thiết bị khác) rồi gộp. Chưa chạy SQL thì máy chủ từ chối, chỉ dùng bản trên máy.
    supabase.from('portfolio_settings').select('data').eq('key', serverKey(uid)).maybeSingle().then(({ data, error }) => {
      if (error || !data?.data || !cur || cur.uid !== uid) return;
      cur.data = merge(cur.data, { ...empty(), ...(data.data as any) });
      writeCache(uid, cur.data);
      subs.forEach(f => f());
    }, () => {});
  }
  return cur.data;
}

function update(uid: string, fn: (d: UsageData) => UsageData) {
  const d = fn(load(uid));
  cur = { uid, data: prune(d) };
  writeCache(uid, cur.data);
  subs.forEach(f => f());
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    if (!cur || cur.uid !== uid) return;
    supabase.from('portfolio_settings').upsert({ key: serverKey(uid), data: cur.data }).then(() => {}, () => {});
  }, 15000);
}

// Đẩy ngay khi đóng thẻ để không mất các lần mở gần nhất
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (pushTimer && cur) { clearTimeout(pushTimer); pushTimer = null; supabase.from('portfolio_settings').upsert({ key: serverKey(cur.uid), data: cur.data }).then(() => {}, () => {}); }
  });
}

// ===== Ghi nhật ký =====
export function trackModule(uid: string | undefined | null, moduleId: string) {
  if (!uid || !moduleId) return;
  const t = nowSec();
  const d = load(uid);
  const last = [...d.ev].reverse().find(e => e[0] === moduleId);
  if (last && t - last[1] < DEDUPE_SEC) return;
  update(uid, x => {
    const shown = { ...(x.shown || {}) }; delete shown[moduleId];
    return { ...x, ev: [...x.ev, [moduleId, t]], shown };
  });
}

let currentUid = '';
export function setUsageUser(uid: string | null | undefined) { currentUid = uid || ''; }

// Ghi tài liệu vừa mở cho mục Tiếp tục. tab là chức năng chứa tài liệu, sub là tham số mở thẳng tài liệu.
export function trackDoc(doc: { kind: string; id: string; title: string; tab: string; sub: Record<string, string> }) {
  const uid = currentUid;
  if (!uid || !doc.id) return;
  const key = `${doc.kind}:${doc.id}`;
  const at = nowSec();
  update(uid, x => ({ ...x, docs: [{ ...doc, key, title: (doc.title || '').slice(0, 120) || 'Không tên', at }, ...x.docs.filter(d => d.key !== key)].slice(0, MAX_DOCS) }));
}
export function forgetDoc(uid: string, key: string) { update(uid, x => ({ ...x, docs: x.docs.filter(d => d.key !== key) })); }
export function setAutoSort(uid: string, on: boolean) { update(uid, x => ({ ...x, autoSort: on })); }
export function setPins(uid: string, pins: Record<string, number>) { update(uid, x => ({ ...x, pins })); }
export function rememberOrder(uid: string, order: string[]) {
  const d = load(uid);
  if (d.order && d.order.join('|') === order.join('|')) return;
  update(uid, x => ({ ...x, order }));
}

export function useUsage(uid: string | undefined | null): UsageData {
  const [, setTick] = useState(0);
  useEffect(() => { const f = () => setTick(t => t + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return uid ? load(uid) : empty();
}

// ===== Tính điểm =====
const hourBucket = (h: number) => Math.floor(h / 3);       // 8 khung 3 giờ
function localParts(sec: number, zone: string): { b: number; wd: number } {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date(sec * 1000));
    const h = Number(f.find(p => p.type === 'hour')?.value || 0);
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(f.find(p => p.type === 'weekday')?.value || 'Sun');
    return { b: hourBucket(h % 24), wd };
  } catch { const d = new Date(sec * 1000); return { b: hourBucket(d.getHours()), wd: d.getDay() }; }
}

export interface ModuleScore { id: string; habit: number; lift: number; score: number; reason: string }

export function scoreModules(ev: Array<[string, number]>, now = nowSec(), zone = 'Asia/Ho_Chi_Minh'): Record<string, ModuleScore> {
  const habit: Record<string, number> = {};
  const base: Record<string, number> = {};
  const ctx: Record<string, number> = {};
  let baseTotal = 0, ctxTotal = 0;
  const here = localParts(now, zone);
  for (const [m, t] of ev) {
    const age = Math.max(0, now - t);
    habit[m] = (habit[m] || 0) + Math.pow(2, -age / HALF_LIFE);
    const w = Math.pow(2, -age / CTX_HALF_LIFE);
    base[m] = (base[m] || 0) + w; baseTotal += w;
    const p = localParts(t, zone);
    // Cùng khung giờ tính đủ, khung giờ liền kề tính một nửa, cùng thứ trong tuần cộng thêm một nửa
    const db = Math.min(Math.abs(p.b - here.b), 8 - Math.abs(p.b - here.b));
    const cw = (db === 0 ? 1 : db === 1 ? 0.5 : 0) + (p.wd === here.wd ? 0.5 : 0);
    if (cw > 0) { ctx[m] = (ctx[m] || 0) + w * cw; ctxTotal += w * cw; }
  }
  const K = 3; // độ mượt: ít dữ liệu thì hệ số thời điểm gần 1
  const out: Record<string, ModuleScore> = {};
  for (const m of Object.keys(habit)) {
    const pBase = baseTotal ? base[m] / baseTotal : 0;
    const pCtx = (((ctx[m] || 0) + K * pBase) / (ctxTotal + K)) || pBase;
    const lift = pBase ? Math.min(3, Math.max(0.5, pCtx / pBase)) : 1;
    out[m] = { id: m, habit: habit[m], lift, score: habit[m] * Math.pow(lift, 0.7), reason: '' };
  }
  const slot = ['đêm khuya', 'rạng sáng', 'sáng sớm', 'buổi sáng', 'buổi trưa', 'buổi chiều', 'buổi tối', 'tối muộn'][here.b];
  const day = ['Chủ nhật', 'thứ 2', 'thứ 3', 'thứ 4', 'thứ 5', 'thứ 6', 'thứ 7'][here.wd];
  for (const s of Object.values(out)) s.reason = s.lift >= 1.3 ? `Bạn hay dùng vào ${slot} ${day}` : s.habit >= 3 ? 'Bạn dùng thường xuyên' : 'Bạn dùng gần đây';
  return out;
}

// Sắp xếp có giữ ổn định: bắt đầu từ thứ tự lần trước, chỉ đổi chỗ khi điểm chênh trên 20%.
// Chức năng ghim đặt đúng vị trí đã ghim, các vị trí còn lại xếp theo điểm.
export function personalOrder(ids: string[], scores: Record<string, ModuleScore>, prev: string[] | undefined, pins: Record<string, number>): string[] {
  const sc = (id: string) => scores[id]?.score || 0;
  const free = ids.filter(id => pins[id] === undefined);
  // Thứ tự khởi đầu: theo lần trước, mục mới thêm theo điểm rồi theo thứ tự mặc định
  const prevIdx = new Map((prev || []).map((id, i) => [id, i]));
  let list = [...free].sort((a, b) => {
    const pa = prevIdx.get(a), pb = prevIdx.get(b);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return sc(b) - sc(a) || ids.indexOf(a) - ids.indexOf(b);
  });
  // Đổi chỗ kiểu nổi bọt có ngưỡng, lặp tới khi không còn đổi
  for (let pass = 0; pass < list.length; pass++) {
    let moved = false;
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      if (sc(b) > Math.max(sc(a) * SWAP_MARGIN, sc(a) + 0.05)) { list[i - 1] = b; list[i] = a; moved = true; }
    }
    if (!moved) break;
  }
  // Chèn chức năng ghim vào đúng vị trí
  const pinned = ids.filter(id => pins[id] !== undefined).sort((a, b) => pins[a] - pins[b]);
  for (const id of pinned) list.splice(Math.min(pins[id], list.length), 0, id);
  list = list.filter((id, i) => list.indexOf(id) === i);
  return list;
}

// Hàng Gợi ý lúc này: chức năng hợp nhất với khung giờ hiện tại, ưu tiên hệ số thời điểm cao.
export function suggestNow(ids: string[], scores: Record<string, ModuleScore>, n = 3): ModuleScore[] {
  return ids.map(id => scores[id]).filter(Boolean)
    .filter(s => s.habit > 0.3)
    .sort((a, b) => b.lift * Math.sqrt(b.habit) - a.lift * Math.sqrt(a.habit))
    .slice(0, n);
}

export function useScores(data: UsageData) {
  // Tính lại khi nhật ký thay đổi, còn trong lúc đang xem trang thì giữ nguyên
  return useMemo(() => scoreModules(data.ev), [data.ev.length, data.ev[data.ev.length - 1]?.[1]]);
}

// ===== Tính năng nổi bật =====
// Hàng phím tắt đã lo các chức năng dùng nhiều nhất, nên Tính năng nổi bật bổ sung chứ không lặp lại:
// 1. Ghim: thẻ người dùng tự thêm hoặc kéo vào vị trí, luôn đứng đầu.
// 2. Khám phá: chức năng chưa từng mở. Điểm = 0,2 + mức yêu thích nhóm chức năng (tỉ lệ điểm thói quen của
//    các chức năng cùng nhóm) + 0,5 nếu là chức năng mới. Gợi ý nhiều ngày mà không mở thì điểm giảm
//    còn 70% mỗi ngày để nhường chỗ chức năng khác.
// 3. Hay dùng: điểm thói quen cao nhưng không nằm trên hàng phím tắt (vì hàng chỉ có 12 ô hoặc đã ẩn).
// Chức năng đã có trên hàng phím tắt không lặp lại ở đây, trừ khi không đủ thẻ.
// 4. Quay lại: từng mở từ 3 lần nhưng hơn 14 ngày nay chưa mở.
// Bốn nhóm được xếp xen kẽ để vừa tiện vừa giúp biết thêm chức năng. Thẻ bị bỏ thì 30 ngày không gợi ý lại.
const NEW_MODULES: Record<string, string> = { automatic: '2026-10-03' };
export const isNewModule = (id: string) => { const d = NEW_MODULES[id]; return !!d && Date.now() - new Date(d).getTime() < 60 * DAY * 1000; };

export interface FeaturedPick { id: string; reason: string; kind: 'pin' | 'discover' | 'frequent' | 'return' }

export function featuredPicks(o: {
  candidates: Array<{ id: string; group?: string; label: string }>;
  rowIds: string[];
  scores: Record<string, ModuleScore>;
  data: UsageData;
  n?: number;
}): FeaturedPick[] {
  const n = o.n ?? 10;
  const now = nowSec();
  const ids = new Set(o.candidates.map(c => c.id));
  const byId = new Map(o.candidates.map(c => [c.id, c]));
  const dis = o.data.fdis || {};
  const dismissed = (id: string) => !!dis[id] && now - dis[id] < 30 * DAY;
  const count: Record<string, number> = {}, last: Record<string, number> = {};
  for (const [m, t] of o.data.ev) { count[m] = (count[m] || 0) + 1; last[m] = Math.max(last[m] || 0, t); }
  const habit = (id: string) => o.scores[id]?.habit || 0;
  // Mức yêu thích theo nhóm chức năng
  const groupHabit: Record<string, number> = {}; let totalHabit = 0;
  const topInGroup: Record<string, { id: string; h: number }> = {};
  for (const c of o.candidates) {
    const h = habit(c.id); if (!h) continue;
    const g = c.group || ''; groupHabit[g] = (groupHabit[g] || 0) + h; totalHabit += h;
    if (!topInGroup[g] || topInGroup[g].h < h) topInGroup[g] = { id: c.id, h };
  }
  const pins = (o.data.fpins || []).filter(id => ids.has(id));
  const taken = new Set(pins);
  const row = new Set(o.rowIds);

  const discover = o.candidates.filter(c => !count[c.id] && !row.has(c.id) && !taken.has(c.id) && !dismissed(c.id)).map(c => {
    const aff = totalHabit ? (groupHabit[c.group || ''] || 0) / totalHabit : 0;
    const fresh = isNewModule(c.id);
    const fatigue = Math.pow(0.7, o.data.shown?.[c.id]?.n || 0);
    const top = topInGroup[c.group || ''];
    const reason = fresh ? 'Chức năng mới' : top ? `Gần với ${byId.get(top.id)?.label || 'chức năng'} bạn hay dùng` : 'Bạn chưa thử';
    return { id: c.id, s: (0.2 + aff + (fresh ? 0.5 : 0)) * fatigue, reason };
  }).sort((a, b) => b.s - a.s);
  const frequent = o.candidates.filter(c => !row.has(c.id) && habit(c.id) >= 0.5 && !taken.has(c.id) && !dismissed(c.id))
    .map(c => ({ id: c.id, s: o.scores[c.id]?.score || 0, reason: 'Bạn hay dùng' })).sort((a, b) => b.s - a.s);
  const back = o.candidates.filter(c => !row.has(c.id) && (count[c.id] || 0) >= 3 && now - (last[c.id] || 0) > 14 * DAY && !taken.has(c.id) && !dismissed(c.id))
    .map(c => ({ id: c.id, s: count[c.id], reason: `Lâu chưa mở, từng dùng ${count[c.id]} lần` })).sort((a, b) => b.s - a.s);

  const out: FeaturedPick[] = pins.map(id => ({ id, reason: 'Bạn đã ghim', kind: 'pin' as const }));
  const queues: Array<[FeaturedPick['kind'], Array<{ id: string; reason: string }>]> = [['discover', discover], ['frequent', frequent], ['return', back]];
  let progressed = true;
  while (out.length < n && progressed) {
    progressed = false;
    for (const [kind, q] of queues) {
      while (q.length && taken.has(q[0].id)) q.shift();
      const it = q.shift();
      if (!it || out.length >= n) continue;
      taken.add(it.id); out.push({ id: it.id, reason: it.reason, kind }); progressed = true;
    }
  }
  // Còn thiếu thì lấy thêm theo điểm thói quen rồi theo thứ tự mặc định
  for (const c of [...o.candidates].sort((a, b) => Number(row.has(a.id)) - Number(row.has(b.id)) || habit(b.id) - habit(a.id))) {
    if (out.length >= n) break;
    if (!taken.has(c.id) && !dismissed(c.id)) { taken.add(c.id); out.push({ id: c.id, reason: habit(c.id) ? 'Bạn hay dùng' : 'Bạn chưa thử', kind: habit(c.id) ? 'frequent' : 'discover' }); }
  }
  return out;
}

// Ghi nhận các thẻ khám phá đã gợi ý hôm nay (mỗi thẻ tính 1 lần mỗi ngày)
export function noteShown(uid: string, ids: string[]) {
  const d = load(uid);
  const today = Math.floor(nowSec() / DAY);
  const need = ids.filter(id => (d.shown?.[id]?.d ?? -1) !== today);
  if (!need.length) return;
  update(uid, x => {
    const shown = { ...(x.shown || {}) };
    for (const id of need) shown[id] = { n: (shown[id]?.n || 0) + 1, d: today };
    return { ...x, shown };
  });
}
export function setFeaturedPins(uid: string, pins: string[]) { update(uid, x => ({ ...x, fpins: pins })); }
export function dismissFeatured(uid: string, id: string) { update(uid, x => ({ ...x, fpins: (x.fpins || []).filter(p => p !== id), fdis: { ...(x.fdis || {}), [id]: nowSec() } })); }
export function undismissFeatured(uid: string, id: string) { update(uid, x => { const f = { ...(x.fdis || {}) }; delete f[id]; return { ...x, fdis: f }; }); }
