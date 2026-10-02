// Lịch chạy của bước Schedule Trigger theo tài liệu n8n: chạy theo khoảng giây, phút, giờ, ngày,
// tuần, tháng hoặc theo biểu thức cron (5 hoặc 6 trường, trường đầu là giây khi có 6 trường).
// Mỗi quy tắc được đổi thành biểu thức cron, kèm điều kiện cách quãng cho ngày, tuần, tháng.
import { DateTime } from 'luxon';

export interface ScheduleRule {
  field: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'cronExpression';
  secondsInterval?: number;
  minutesInterval?: number;
  hoursInterval?: number;
  daysInterval?: number;
  weeksInterval?: number;
  monthsInterval?: number;
  triggerAtMinute?: number;
  triggerAtHour?: number;
  triggerAtDay?: Array<string | number>;   // 0 = Chủ nhật ... 6 = Thứ bảy
  triggerAtDayOfMonth?: number;
  expression?: string;
}

interface CronSpec { sec: Set<number>; min: Set<number>; hour: Set<number>; dom: Set<number>; mon: Set<number>; dow: Set<number>; domStar: boolean; dowStar: boolean }

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function parseField(src: string, lo: number, hi: number, names?: string[], nameBase = 0): Set<number> {
  const out = new Set<number>();
  for (const part0 of src.split(',')) {
    let part = part0.trim().toUpperCase();
    if (!part) throw new Error('Trường cron bị trống');
    if (names) names.forEach((n, i) => { part = part.split(n).join(String(i + nameBase)); });
    let step = 1;
    const [range, stepStr] = part.split('/');
    if (stepStr !== undefined) { step = parseInt(stepStr, 10); if (!(step > 0)) throw new Error(`Bước nhảy không hợp lệ ở "${part0}"`); }
    let a = lo, b = hi;
    if (range === '*' || range === '?') { /* toàn bộ */ }
    else if (range.includes('-')) { const [x, y] = range.split('-'); a = parseInt(x, 10); b = parseInt(y, 10); }
    else { a = parseInt(range, 10); b = stepStr !== undefined ? hi : a; }
    if (isNaN(a) || isNaN(b) || a < lo || b > hi || a > b) throw new Error(`Giá trị "${part0}" nằm ngoài khoảng ${lo} đến ${hi}`);
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return out;
}

export function parseCron(expr: string): CronSpec {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5 && f.length !== 6) throw new Error('Biểu thức cron cần 5 hoặc 6 trường, ví dụ "0 9 * * 1-5"');
  const [s, m, h, dom, mon, dow] = f.length === 6 ? f : ['0', ...f];
  const dowSet = new Set([...parseField(dow, 0, 7, DAYS)].map(v => v % 7));
  return {
    sec: parseField(s, 0, 59), min: parseField(m, 0, 59), hour: parseField(h, 0, 23),
    dom: parseField(dom, 1, 31), mon: parseField(mon, 1, 12, MONTHS, 1), dow: dowSet,
    domStar: dom === '*' || dom === '?', dowStar: dow === '*' || dow === '?',
  };
}

const EPOCH = DateTime.fromISO('1970-01-05T00:00:00', { zone: 'UTC' }); // Thứ hai

interface Compiled { cron: CronSpec; dayEvery?: number; weekEvery?: number; monthEvery?: number }

function n(v: any, def: number) { const x = Number(v); return Number.isFinite(x) && x > 0 ? Math.floor(x) : def; }
function n0(v: any, def: number) { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.floor(x) : def; }

export function compileRule(r: ScheduleRule): Compiled {
  const minute = n0(r.triggerAtMinute, 0), hour = n0(r.triggerAtHour, 0);
  switch (r.field) {
    case 'seconds': return { cron: parseCron(`*/${n(r.secondsInterval, 30)} * * * * *`) };
    case 'minutes': return { cron: parseCron(`0 */${n(r.minutesInterval, 5)} * * * *`) };
    case 'hours': return { cron: parseCron(`0 ${minute} */${n(r.hoursInterval, 1)} * * *`) };
    case 'days': return { cron: parseCron(`0 ${minute} ${hour} * * *`), dayEvery: n(r.daysInterval, 1) };
    case 'weeks': {
      const days = (r.triggerAtDay && r.triggerAtDay.length ? r.triggerAtDay : [1]).map(d => Number(d)).join(',');
      return { cron: parseCron(`0 ${minute} ${hour} * * ${days}`), weekEvery: n(r.weeksInterval, 1) };
    }
    case 'months': return { cron: parseCron(`0 ${minute} ${hour} ${Math.min(31, n(r.triggerAtDayOfMonth, 1))} * *`), monthEvery: n(r.monthsInterval, 1) };
    case 'cronExpression': return { cron: parseCron(r.expression || '0 9 * * *') };
  }
  return { cron: parseCron('0 9 * * *') };
}

function dayOk(c: Compiled, t: DateTime): boolean {
  const cr = c.cron;
  if (!cr.mon.has(t.month)) return false;
  const dow = t.weekday % 7;
  const domHit = cr.dom.has(t.day), dowHit = cr.dow.has(dow);
  // Quy ước cron: khi cả ngày trong tháng và thứ đều bị giới hạn thì chỉ cần khớp 1 trong 2.
  const ok = cr.domStar && cr.dowStar ? true : cr.domStar ? dowHit : cr.dowStar ? domHit : (domHit || dowHit);
  if (!ok) return false;
  const localDay = DateTime.fromObject({ year: t.year, month: t.month, day: t.day }, { zone: 'UTC' });
  if (c.dayEvery && c.dayEvery > 1 && Math.floor(localDay.diff(EPOCH, 'days').days) % c.dayEvery !== 0) return false;
  if (c.weekEvery && c.weekEvery > 1 && Math.floor(localDay.diff(EPOCH, 'days').days / 7) % c.weekEvery !== 0) return false;
  if (c.monthEvery && c.monthEvery > 1 && ((t.year * 12 + t.month - 1) % c.monthEvery) !== 0) return false;
  return true;
}

export function matches(c: Compiled, t: DateTime): boolean {
  return c.cron.sec.has(t.second) && c.cron.min.has(t.minute) && c.cron.hour.has(t.hour) && dayOk(c, t);
}

// Các mốc đến hạn trong khoảng (from, to], tính theo từng giây, dùng cho nhịp kiểm tra định kỳ.
export function dueBetween(rules: ScheduleRule[], fromMs: number, toMs: number, zone: string): number[] {
  const compiled = rules.map(r => { try { return compileRule(r); } catch { return null; } }).filter(Boolean) as Compiled[];
  const out: number[] = [];
  const start = Math.floor(fromMs / 1000) + 1, end = Math.floor(toMs / 1000);
  for (let s = Math.max(start, end - 600); s <= end; s++) {
    const t = DateTime.fromSeconds(s, { zone });
    if (compiled.some(c => matches(c, t))) out.push(s * 1000);
  }
  return out;
}

// Lần chạy kế tiếp sau thời điểm from (tìm theo ngày, giờ, phút, giây để chạy nhanh).
export function nextRun(rules: ScheduleRule[], from: DateTime): DateTime | null {
  let best: DateTime | null = null;
  for (const r of rules) {
    let c: Compiled;
    try { c = compileRule(r); } catch { continue; }
    const t = nextFor(c, from);
    if (t && (!best || t < best)) best = t;
  }
  return best;
}

function nextFor(c: Compiled, from: DateTime): DateTime | null {
  const hours = [...c.cron.hour].sort((a, b) => a - b), mins = [...c.cron.min].sort((a, b) => a - b), secs = [...c.cron.sec].sort((a, b) => a - b);
  let day = from.startOf('day');
  for (let i = 0; i < 800; i++, day = day.plus({ days: 1 })) {
    if (!dayOk(c, day)) continue;
    for (const h of hours) for (const m of mins) for (const s of secs) {
      const t = day.set({ hour: h, minute: m, second: s, millisecond: 0 });
      if (t > from && t.hour === h) return t;
    }
  }
  return null;
}

const WEEKDAY_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
export const WEEKDAY_OPTIONS = WEEKDAY_VI.map((l, i) => ({ value: String(i), label: l }));

// Mô tả ngắn một quy tắc để hiện dưới tên bước
export function describeRule(r: ScheduleRule): string {
  const hh = String(n0(r.triggerAtHour, 0)).padStart(2, '0'), mm = String(n0(r.triggerAtMinute, 0)).padStart(2, '0');
  switch (r.field) {
    case 'seconds': return `Mỗi ${n(r.secondsInterval, 30)} giây`;
    case 'minutes': return `Mỗi ${n(r.minutesInterval, 5)} phút`;
    case 'hours': return `Mỗi ${n(r.hoursInterval, 1)} giờ, phút ${mm}`;
    case 'days': return `${n(r.daysInterval, 1) > 1 ? `Mỗi ${n(r.daysInterval, 1)} ngày` : 'Hằng ngày'} lúc ${hh}:${mm}`;
    case 'weeks': return `${n(r.weeksInterval, 1) > 1 ? `Mỗi ${n(r.weeksInterval, 1)} tuần` : 'Hằng tuần'} ${(r.triggerAtDay || [1]).map(d => WEEKDAY_VI[Number(d)]).join(', ')} lúc ${hh}:${mm}`;
    case 'months': return `${n(r.monthsInterval, 1) > 1 ? `Mỗi ${n(r.monthsInterval, 1)} tháng` : 'Hằng tháng'} ngày ${n(r.triggerAtDayOfMonth, 1)} lúc ${hh}:${mm}`;
    case 'cronExpression': return `Cron ${r.expression || ''}`;
  }
  return '';
}

// Dữ liệu ra của Schedule Trigger, giữ đúng các khoá như n8n
export function scheduleOutput(ms: number, zone: string): Record<string, any> {
  const t = DateTime.fromMillis(ms, { zone });
  const en = t.setLocale('en-US');
  const ord = (d: number) => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
  return {
    timestamp: t.toISO(),
    'Readable date': `${en.toFormat('MMMM')} ${ord(t.day)} ${t.year}, ${en.toFormat('h:mm:ss a').toLowerCase()}`,
    'Readable time': en.toFormat('h:mm:ss a').toLowerCase(),
    'Day of week': en.toFormat('cccc'),
    Year: t.toFormat('yyyy'),
    Month: en.toFormat('MMMM'),
    'Day of month': t.toFormat('dd'),
    Hour: t.toFormat('HH'),
    Minute: t.toFormat('mm'),
    Second: t.toFormat('ss'),
    Timezone: `${zone} (UTC${t.toFormat('ZZ')})`,
  };
}
