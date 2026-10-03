// Danh mục các loại bước của app Automatic. Tên, tham số và cách chạy bám theo các bước lõi của n8n
// (Manual Trigger, Schedule Trigger, HTTP Request, Edit Fields, If, Switch, Filter, Merge, Code, Wait,
// Date & Time, Sort, Limit, Remove Duplicates, Split Out, Aggregate, No Operation, Stop and Error)
// cùng vài bước riêng của EduGo.
import { DateTime, Duration } from 'luxon';
import type { ExecContext, Field, Item, NodeType } from './types';
import { evalGroup, newGroup } from './conditions';
import { describeRule, scheduleOutput, WEEKDAY_OPTIONS } from './schedule';
import { getPath, setPath, deletePath } from './expression';

const AsyncFunction = Object.getPrototypeOf(async function () { /* */ }).constructor as any;
const opt = (pairs: Array<[string, string]>) => pairs.map(([value, label]) => ({ value, label }));
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  if (signal?.aborted) return rej(new Error('Đã dừng lần chạy'));
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new Error('Đã dừng lần chạy')); }, { once: true });
});

function perItem(ctx: ExecContext, fn: (item: Item, i: number) => Item | Item[] | null | Promise<Item | Item[] | null>): Promise<Item[]> {
  return (async () => {
    const out: Item[] = [];
    for (let i = 0; i < ctx.items.length; i++) {
      if (ctx.signal?.aborted) throw new Error('Đã dừng lần chạy');
      const r = await fn(ctx.items[i], i);
      if (r == null) continue;
      if (Array.isArray(r)) out.push(...r); else out.push(r);
    }
    return out;
  })();
}

const clone = (o: any) => JSON.parse(JSON.stringify(o ?? {}));

function toNumber(v: any, field: string, loose = true): number {
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (Number.isNaN(n)) { if (loose) return 0; throw new Error(`Trường "${field}" cần là số, nhận được "${v}"`); }
  return n;
}

function parseDate(v: any, zone: string): DateTime {
  if (DateTime.isDateTime(v)) return v.setZone(zone);
  if (v instanceof Date) return DateTime.fromJSDate(v, { zone });
  if (typeof v === 'number') return DateTime.fromMillis(v > 1e12 ? v : v * 1000, { zone });
  const s = String(v ?? '').trim();
  let d = DateTime.fromISO(s, { zone });
  if (!d.isValid) d = DateTime.fromSQL(s, { zone });
  if (!d.isValid) d = DateTime.fromFormat(s, 'dd/MM/yyyy HH:mm', { zone });
  if (!d.isValid) d = DateTime.fromFormat(s, 'dd/MM/yyyy', { zone });
  if (!d.isValid) { const j = new Date(s); if (!isNaN(j.getTime())) d = DateTime.fromJSDate(j, { zone }); }
  if (!d.isValid) throw new Error(`Không đọc được ngày giờ "${s}"`);
  return d;
}

const zoneOf = (ctx: ExecContext) => ctx.workflow.settings?.timezone || 'Asia/Ho_Chi_Minh';

// ===================== BƯỚC KÍCH HOẠT =====================
const manualTrigger: NodeType = {
  type: 'manualTrigger', label: 'Chạy thủ công', desc: 'Bắt đầu quy trình khi bấm nút Chạy thử quy trình', icon: 'MousePointerClick', color: '#64748b',
  group: 'trigger', trigger: true, inputs: 0, outputs: 1, defaults: {},
  fields: [{ name: 'n', label: 'Bước này chạy khi bạn bấm "Chạy thử quy trình" trong trình soạn. Dùng để thử quy trình trước khi bật chạy theo lịch.', type: 'notice' }],
  execute: async () => [[{ json: {} }]],
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.manualworkflowtrigger/',
};

const RULE_FIELDS: Field[] = [
  { name: 'field', label: 'Khoảng chạy', type: 'options', default: 'days', noExpression: true, options: opt([['seconds', 'Giây'], ['minutes', 'Phút'], ['hours', 'Giờ'], ['days', 'Ngày'], ['weeks', 'Tuần'], ['months', 'Tháng'], ['cronExpression', 'Biểu thức cron']]) },
  { name: 'secondsInterval', label: 'Số giây giữa 2 lần chạy', type: 'number', default: 30, min: 1, show: p => p.field === 'seconds' },
  { name: 'minutesInterval', label: 'Số phút giữa 2 lần chạy', type: 'number', default: 5, min: 1, show: p => p.field === 'minutes' },
  { name: 'hoursInterval', label: 'Số giờ giữa 2 lần chạy', type: 'number', default: 1, min: 1, show: p => p.field === 'hours' },
  { name: 'daysInterval', label: 'Số ngày giữa 2 lần chạy', type: 'number', default: 1, min: 1, show: p => p.field === 'days' },
  { name: 'weeksInterval', label: 'Số tuần giữa 2 lần chạy', type: 'number', default: 1, min: 1, show: p => p.field === 'weeks' },
  { name: 'triggerAtDay', label: 'Chạy vào các thứ', type: 'multioptions', default: ['1'], options: WEEKDAY_OPTIONS, show: p => p.field === 'weeks' },
  { name: 'monthsInterval', label: 'Số tháng giữa 2 lần chạy', type: 'number', default: 1, min: 1, show: p => p.field === 'months' },
  { name: 'triggerAtDayOfMonth', label: 'Chạy vào ngày trong tháng', type: 'number', default: 1, min: 1, max: 31, show: p => p.field === 'months' },
  { name: 'triggerAtHour', label: 'Chạy lúc mấy giờ', type: 'options', default: '9', options: Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: `${String(i).padStart(2, '0')} giờ` })), show: p => ['days', 'weeks', 'months'].includes(p.field) },
  { name: 'triggerAtMinute', label: 'Chạy ở phút thứ', type: 'number', default: 0, min: 0, max: 59, show: p => ['hours', 'days', 'weeks', 'months'].includes(p.field) },
  { name: 'expression', label: 'Biểu thức cron', type: 'string', default: '0 9 * * 1-5', placeholder: '0 9 * * 1-5', hint: '5 trường (phút giờ ngày tháng thứ) hoặc 6 trường có thêm giây ở đầu. Ví dụ "0 9 * * 1-5" là 9 giờ sáng từ thứ 2 đến thứ 6.', show: p => p.field === 'cronExpression' },
];

const scheduleTrigger: NodeType = {
  type: 'scheduleTrigger', label: 'Lịch chạy', desc: 'Tự chạy quy trình theo giờ, ngày, tuần, tháng hoặc biểu thức cron', icon: 'Clock', color: '#0ea5e9',
  group: 'trigger', trigger: true, inputs: 0, outputs: 1,
  defaults: { rules: [{ field: 'days', daysInterval: 1, triggerAtHour: '9', triggerAtMinute: 0 }] },
  subtitle: p => (p.rules || []).map((r: any) => describeRule(r)).join(' · '),
  fields: [
    { name: 'n', label: 'Quy trình phải được bật (Đang chạy) thì lịch mới có hiệu lực. Lịch chạy khi EduGo đang mở trên ít nhất 1 trình duyệt đăng nhập tài khoản của bạn.', type: 'notice' },
    { name: 'rules', label: 'Quy tắc chạy', type: 'collection', addLabel: 'Thêm quy tắc', noExpression: true, default: [], fields: RULE_FIELDS },
  ],
  execute: async (ctx) => [[{ json: scheduleOutput(Date.now(), zoneOf(ctx)) }]],
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/',
};

// ===================== WEB =====================
const KV: Field[] = [
  { name: 'name', label: 'Tên', type: 'string', default: '' },
  { name: 'value', label: 'Giá trị', type: 'string', default: '' },
];

const httpRequest: NodeType = {
  type: 'httpRequest', label: 'Gọi HTTP', desc: 'Gửi yêu cầu tới một địa chỉ web hoặc API rồi lấy kết quả về', icon: 'Globe', color: '#7c3aed',
  group: 'web', inputs: 1, outputs: 1,
  subtitle: p => `${p.method || 'GET'} ${String(p.url || '').replace(/^https?:\/\//, '').slice(0, 40)}`,
  defaults: { method: 'GET', url: '', authentication: 'none', sendQuery: false, queryParameters: [], sendHeaders: false, headerParameters: [], sendBody: false, bodyContentType: 'json', specifyBody: 'keypair', bodyParameters: [], jsonBody: '{\n  "key": "value"\n}', rawBody: '', rawContentType: 'text/plain', responseFormat: 'autodetect', fullResponse: false, neverError: false, timeout: 30000, splitArray: true },
  fields: [
    { name: 'method', label: 'Phương thức', type: 'options', options: opt([['GET', 'GET'], ['POST', 'POST'], ['PUT', 'PUT'], ['PATCH', 'PATCH'], ['DELETE', 'DELETE'], ['HEAD', 'HEAD']]) },
    { name: 'url', label: 'Địa chỉ URL', type: 'string', placeholder: 'https://api.example.com/data', hint: 'Trình duyệt chỉ gọi được địa chỉ cho phép truy cập chéo nguồn (CORS).' },
    { name: 'authentication', label: 'Xác thực', type: 'options', options: opt([['none', 'Không'], ['bearer', 'Bearer token'], ['header', 'Header tự đặt'], ['basic', 'Tài khoản và mật khẩu (Basic)']]) },
    { name: 'bearerToken', label: 'Token', type: 'string', show: p => p.authentication === 'bearer', hint: 'Lưu trong quy trình, chỉ tài khoản của bạn đọc được.' },
    { name: 'headerAuthName', label: 'Tên header', type: 'string', placeholder: 'X-API-Key', show: p => p.authentication === 'header' },
    { name: 'headerAuthValue', label: 'Giá trị header', type: 'string', show: p => p.authentication === 'header' },
    { name: 'basicUser', label: 'Tên đăng nhập', type: 'string', show: p => p.authentication === 'basic' },
    { name: 'basicPassword', label: 'Mật khẩu', type: 'string', show: p => p.authentication === 'basic' },
    { name: 'sendQuery', label: 'Gửi tham số truy vấn', type: 'boolean' },
    { name: 'queryParameters', label: 'Tham số truy vấn', type: 'collection', fields: KV, addLabel: 'Thêm tham số', show: p => !!p.sendQuery },
    { name: 'sendHeaders', label: 'Gửi header', type: 'boolean' },
    { name: 'headerParameters', label: 'Header', type: 'collection', fields: KV, addLabel: 'Thêm header', show: p => !!p.sendHeaders },
    { name: 'sendBody', label: 'Gửi nội dung (body)', type: 'boolean', show: p => !['GET', 'HEAD'].includes(p.method) },
    { name: 'bodyContentType', label: 'Kiểu nội dung', type: 'options', options: opt([['json', 'JSON'], ['form-urlencoded', 'Form URL Encoded'], ['multipart-form-data', 'Form-Data'], ['raw', 'Văn bản thô']]), show: p => !!p.sendBody && !['GET', 'HEAD'].includes(p.method) },
    { name: 'specifyBody', label: 'Cách nhập nội dung', type: 'options', options: opt([['keypair', 'Theo từng trường'], ['json', 'Viết JSON']]), show: p => !!p.sendBody && p.bodyContentType === 'json' && !['GET', 'HEAD'].includes(p.method) },
    { name: 'bodyParameters', label: 'Các trường nội dung', type: 'collection', fields: KV, addLabel: 'Thêm trường', show: p => !!p.sendBody && !['GET', 'HEAD'].includes(p.method) && (p.bodyContentType !== 'json' || p.specifyBody !== 'json') && p.bodyContentType !== 'raw' },
    { name: 'jsonBody', label: 'JSON', type: 'json', show: p => !!p.sendBody && !['GET', 'HEAD'].includes(p.method) && p.bodyContentType === 'json' && p.specifyBody === 'json' },
    { name: 'rawContentType', label: 'Content-Type', type: 'string', show: p => !!p.sendBody && p.bodyContentType === 'raw' },
    { name: 'rawBody', label: 'Nội dung', type: 'text', show: p => !!p.sendBody && p.bodyContentType === 'raw' },
    { name: 'responseFormat', label: 'Kiểu kết quả trả về', type: 'options', options: opt([['autodetect', 'Tự nhận biết'], ['json', 'JSON'], ['text', 'Văn bản']]) },
    { name: 'splitArray', label: 'Kết quả là mảng thì tách mỗi phần tử thành 1 item', type: 'boolean' },
    { name: 'fullResponse', label: 'Lấy đầy đủ phản hồi (mã trạng thái, header)', type: 'boolean' },
    { name: 'neverError', label: 'Không báo lỗi khi mã trạng thái không phải 2xx', type: 'boolean' },
    { name: 'timeout', label: 'Thời gian chờ tối đa (ms)', type: 'number' },
  ],
  execute: async (ctx) => {
    const out: Item[] = [];
    for (let i = 0; i < ctx.items.length; i++) {
      const p = (k: string) => ctx.param(k, i);
      const method = String(p('method') || 'GET').toUpperCase();
      let url = String(p('url') || '').trim();
      if (!url) throw new Error('Chưa nhập địa chỉ URL');
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const u = new URL(url);
      if (p('sendQuery')) for (const r of p('queryParameters') || []) if (r.name) u.searchParams.append(r.name, r.value ?? '');
      const headers: Record<string, string> = {};
      if (p('sendHeaders')) for (const r of p('headerParameters') || []) if (r.name) headers[r.name] = String(r.value ?? '');
      const auth = p('authentication');
      if (auth === 'bearer') headers.Authorization = `Bearer ${p('bearerToken') || ''}`;
      if (auth === 'header' && p('headerAuthName')) headers[p('headerAuthName')] = String(p('headerAuthValue') ?? '');
      if (auth === 'basic') headers.Authorization = 'Basic ' + btoa(unescape(encodeURIComponent(`${p('basicUser') || ''}:${p('basicPassword') || ''}`)));
      let body: any;
      if (p('sendBody') && !['GET', 'HEAD'].includes(method)) {
        const ct = p('bodyContentType');
        const kv = (p('bodyParameters') || []).filter((r: any) => r.name);
        if (ct === 'json') {
          let obj: any;
          if (p('specifyBody') === 'json') {
            const jb = p('jsonBody');
            obj = typeof jb === 'string' ? (() => { try { return JSON.parse(jb); } catch { throw new Error('JSON trong nội dung không hợp lệ'); } })() : jb;
          } else { obj = {}; for (const r of kv) setPath(obj, r.name, r.value); }
          body = JSON.stringify(obj);
          headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        } else if (ct === 'form-urlencoded') {
          body = new URLSearchParams(kv.map((r: any) => [r.name, String(r.value ?? '')])).toString();
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else if (ct === 'multipart-form-data') {
          const fd = new FormData(); for (const r of kv) fd.append(r.name, String(r.value ?? '')); body = fd;
        } else {
          body = String(p('rawBody') ?? '');
          headers['Content-Type'] = p('rawContentType') || 'text/plain';
        }
      }
      const ac = new AbortController();
      const onAbort = () => ac.abort();
      ctx.signal?.addEventListener('abort', onAbort);
      const timer = setTimeout(() => ac.abort(), Math.max(1000, Number(p('timeout')) || 30000));
      let res: Response;
      try {
        res = await fetch(u.toString(), { method, headers, body, signal: ac.signal });
      } catch (e: any) {
        if (ac.signal.aborted && !ctx.signal?.aborted) throw new Error('Quá thời gian chờ phản hồi');
        throw new Error(`Không gọi được ${u.host}. Máy chủ có thể không cho trình duyệt truy cập chéo nguồn (CORS) hoặc mạng đang lỗi. (${e?.message || e})`);
      } finally { clearTimeout(timer); ctx.signal?.removeEventListener('abort', onAbort); }
      const text = method === 'HEAD' ? '' : await res.text();
      const fmt = p('responseFormat');
      let data: any = text;
      const looksJson = (res.headers.get('content-type') || '').includes('json') || /^\s*[[{]/.test(text);
      if (fmt === 'json' || (fmt === 'autodetect' && looksJson)) {
        try { data = text ? JSON.parse(text) : {}; } catch { if (fmt === 'json') throw new Error('Kết quả trả về không phải JSON'); }
      }
      if (!res.ok && !p('neverError')) {
        const msg = typeof data === 'object' ? (data?.message || data?.error?.message || data?.error || JSON.stringify(data).slice(0, 200)) : String(data).slice(0, 200);
        throw new Error(`Máy chủ trả mã ${res.status} ${res.statusText}. ${msg}`);
      }
      if (p('fullResponse')) {
        const h: Record<string, string> = {}; res.headers.forEach((v, k) => { h[k] = v; });
        out.push({ json: { body: data, headers: h, statusCode: res.status, statusMessage: res.statusText } });
      } else if (Array.isArray(data) && p('splitArray')) {
        for (const x of data) out.push({ json: x && typeof x === 'object' && !Array.isArray(x) ? x : { value: x } });
      } else if (data && typeof data === 'object' && !Array.isArray(data)) out.push({ json: data });
      else out.push({ json: { data } });
    }
    return [out];
  },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/',
};

// ===================== DỮ LIỆU =====================
const setNode: NodeType = {
  type: 'set', label: 'Sửa trường (Set)', desc: 'Thêm, sửa hoặc giữ lại các trường của mỗi item', icon: 'PenLine', color: '#2563eb',
  group: 'data', inputs: 1, outputs: 1,
  subtitle: p => (p.mode === 'raw' ? 'Viết JSON' : `${(p.assignments || []).length} trường`),
  defaults: { mode: 'manual', assignments: [], jsonOutput: '{\n  "ten_truong": "giá trị"\n}', includeOtherFields: false, dotNotation: true, ignoreConversionErrors: false },
  fields: [
    { name: 'mode', label: 'Cách nhập', type: 'options', noExpression: true, options: opt([['manual', 'Theo từng trường'], ['raw', 'Viết JSON']]) },
    { name: 'assignments', label: 'Các trường', type: 'collection', addLabel: 'Thêm trường', show: p => p.mode !== 'raw', fields: [
      { name: 'name', label: 'Tên trường', type: 'string', default: '' },
      { name: 'type', label: 'Kiểu', type: 'options', default: 'string', noExpression: true, options: opt([['string', 'Chuỗi'], ['number', 'Số'], ['boolean', 'Đúng sai'], ['array', 'Mảng'], ['object', 'Đối tượng']]) },
      { name: 'value', label: 'Giá trị', type: 'string', default: '' },
    ] },
    { name: 'jsonOutput', label: 'JSON', type: 'json', show: p => p.mode === 'raw' },
    { name: 'includeOtherFields', label: 'Giữ lại các trường khác của item vào', type: 'boolean' },
    { name: 'dotNotation', label: 'Hiểu dấu chấm trong tên là trường lồng (a.b)', type: 'boolean' },
    { name: 'ignoreConversionErrors', label: 'Bỏ qua lỗi chuyển kiểu', type: 'boolean' },
  ],
  execute: async (ctx) => [await perItem(ctx, (item, i) => {
    const base: any = ctx.param('includeOtherFields', i) ? clone(item.json) : {};
    const dot = ctx.param('dotNotation', i) !== false;
    const ign = !!ctx.param('ignoreConversionErrors', i);
    if (ctx.rawParam('mode') === 'raw') {
      let v = ctx.param('jsonOutput', i);
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch { throw new Error('JSON không hợp lệ'); } }
      return { json: { ...base, ...(v && typeof v === 'object' ? v : { value: v }) } };
    }
    for (const a of ctx.param('assignments', i) || []) {
      if (!a?.name) continue;
      let v: any = a.value;
      try {
        if (a.type === 'number') { if (typeof v !== 'number') { const n = Number(v); if (v === '' || Number.isNaN(n)) throw new Error(`"${a.name}" không phải là số`); v = n; } }
        else if (a.type === 'boolean') v = typeof v === 'boolean' ? v : ['true', '1', 'yes', 'có'].includes(String(v).toLowerCase());
        else if (a.type === 'array') { if (!Array.isArray(v)) { v = typeof v === 'string' ? JSON.parse(v) : [v]; if (!Array.isArray(v)) throw new Error(`"${a.name}" không phải là mảng`); } }
        else if (a.type === 'object') { if (typeof v !== 'object' || v === null) { v = JSON.parse(String(v)); } }
        else if (typeof v !== 'string') v = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
      } catch (e: any) { if (!ign) throw new Error(`Không chuyển được kiểu cho trường "${a.name}": ${e?.message || e}`); }
      if (dot) setPath(base, a.name, v); else base[a.name] = v;
    }
    return { json: base };
  })],
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/',
};

const CONDITION_FIELDS = (extra: Field[] = []): Field[] => [
  { name: 'conditions', label: 'Điều kiện', type: 'conditions', default: newGroup() },
  { name: 'ignoreCase', label: 'Không phân biệt chữ hoa chữ thường', type: 'boolean', default: false },
  { name: 'looseTypeValidation', label: 'Chuyển kiểu linh hoạt', type: 'boolean', default: true },
  ...extra,
];

const ifNode: NodeType = {
  type: 'if', label: 'Nếu (If)', desc: 'Chia dữ liệu thành 2 nhánh đúng và sai theo điều kiện', icon: 'GitBranch', color: '#16a34a',
  group: 'flow', inputs: 1, outputs: 2, outputNames: () => ['đúng', 'sai'],
  defaults: { conditions: newGroup(), ignoreCase: false, looseTypeValidation: true },
  fields: CONDITION_FIELDS(),
  execute: async (ctx) => {
    const t: Item[] = [], f: Item[] = [];
    ctx.items.forEach((item, i) => {
      const ok = evalGroup(ctx.param('conditions', i), { ignoreCase: ctx.param('ignoreCase', i), loose: ctx.param('looseTypeValidation', i) !== false });
      (ok ? t : f).push(item);
    });
    return [t, f];
  },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.if/',
};

const filterNode: NodeType = {
  type: 'filter', label: 'Lọc (Filter)', desc: 'Chỉ giữ các item thỏa điều kiện', icon: 'Filter', color: '#16a34a',
  group: 'flow', inputs: 1, outputs: 1,
  defaults: { conditions: newGroup(), ignoreCase: false, looseTypeValidation: true },
  fields: CONDITION_FIELDS(),
  execute: async (ctx) => [ctx.items.filter((_, i) => evalGroup(ctx.param('conditions', i), { ignoreCase: ctx.param('ignoreCase', i), loose: ctx.param('looseTypeValidation', i) !== false }))],
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.filter/',
};

const switchOutputs = (p: any) => (p.mode === 'expression' ? Math.max(1, Math.min(10, Number(p.numberOutputs) || 4)) : Math.max(1, (p.rules || []).length) + (p.fallbackOutput === 'extra' ? 1 : 0));
const switchNode: NodeType = {
  type: 'switch', label: 'Rẽ nhánh (Switch)', desc: 'Đưa mỗi item tới nhánh phù hợp theo nhiều quy tắc', icon: 'Split', color: '#16a34a',
  group: 'flow', inputs: 1, outputs: switchOutputs,
  outputNames: p => {
    if (p.mode === 'expression') return Array.from({ length: switchOutputs(p) }, (_, i) => String(i));
    const names = (p.rules || []).map((r: any, i: number) => (r.renameOutput && r.outputKey ? String(r.outputKey) : String(i)));
    if (!names.length) names.push('0');
    if (p.fallbackOutput === 'extra') names.push('khác');
    return names;
  },
  defaults: { mode: 'rules', rules: [{ conditions: newGroup(), renameOutput: false, outputKey: '' }], fallbackOutput: 'none', allMatchingOutputs: false, ignoreCase: false, numberOutputs: 4, output: '{{ 0 }}' },
  fields: [
    { name: 'mode', label: 'Cách chia', type: 'options', noExpression: true, options: opt([['rules', 'Theo quy tắc'], ['expression', 'Theo biểu thức']]) },
    { name: 'rules', label: 'Quy tắc', type: 'collection', addLabel: 'Thêm nhánh', show: p => p.mode !== 'expression', fields: [
      { name: 'conditions', label: 'Điều kiện', type: 'conditions', default: newGroup() },
      { name: 'renameOutput', label: 'Đặt tên nhánh', type: 'boolean', default: false },
      { name: 'outputKey', label: 'Tên nhánh', type: 'string', default: '', show: r => !!r.renameOutput },
    ] },
    { name: 'fallbackOutput', label: 'Item không khớp quy tắc nào', type: 'options', noExpression: true, show: p => p.mode !== 'expression', options: opt([['none', 'Bỏ đi'], ['extra', 'Đưa ra nhánh "khác"'], ['0', 'Đưa vào nhánh 0']]) },
    { name: 'allMatchingOutputs', label: 'Gửi tới mọi nhánh khớp (không dừng ở nhánh đầu)', type: 'boolean', show: p => p.mode !== 'expression' },
    { name: 'ignoreCase', label: 'Không phân biệt chữ hoa chữ thường', type: 'boolean', show: p => p.mode !== 'expression' },
    { name: 'numberOutputs', label: 'Số nhánh', type: 'number', min: 1, max: 10, noExpression: true, show: p => p.mode === 'expression' },
    { name: 'output', label: 'Số thứ tự nhánh (tính từ 0)', type: 'string', show: p => p.mode === 'expression', hint: 'Ví dụ {{ $json.diem >= 5 ? 0 : 1 }}' },
  ],
  execute: async (ctx) => {
    const p = { ...ctx.node.parameters };
    const n = switchOutputs({ ...switchNode.defaults, ...p });
    const outs: Item[][] = Array.from({ length: n }, () => []);
    ctx.items.forEach((item, i) => {
      if (ctx.rawParam('mode') === 'expression') {
        const k = Number(ctx.param('output', i));
        if (!Number.isInteger(k) || k < 0 || k >= n) throw new Error(`Biểu thức trả về nhánh ${k}, ngoài khoảng 0 đến ${n - 1}`);
        outs[k].push(item); return;
      }
      const rules = ctx.param('rules', i) || [];
      let hit = false;
      for (let r = 0; r < rules.length; r++) {
        if (evalGroup(rules[r].conditions, { ignoreCase: ctx.param('ignoreCase', i), loose: true })) {
          outs[r].push(item); hit = true;
          if (!ctx.param('allMatchingOutputs', i)) break;
        }
      }
      if (!hit) {
        const fb = ctx.rawParam('fallbackOutput');
        if (fb === 'extra') outs[n - 1].push(item);
        else if (fb !== 'none' && fb != null && outs[Number(fb)]) outs[Number(fb)].push(item);
      }
    });
    return outs;
  },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.switch/',
};

const mergeNode: NodeType = {
  type: 'merge', label: 'Gộp (Merge)', desc: 'Gộp dữ liệu từ 2 nhánh: nối tiếp, ghép theo vị trí, theo trường khớp hoặc chọn 1 nhánh', icon: 'Merge', color: '#0d9488',
  group: 'flow', inputs: 2, inputNames: ['Vào 1', 'Vào 2'], outputs: 1,
  subtitle: p => ({ append: 'Nối tiếp', combineByPosition: 'Ghép theo vị trí', combineByFields: 'Ghép theo trường khớp', combineAll: 'Ghép mọi cặp', chooseBranch: 'Chọn 1 nhánh' } as any)[p.mode] || '',
  defaults: { mode: 'append', field1: 'id', field2: 'id', joinMode: 'keepMatches', includeUnpaired: false, useDataOfInput: '1' },
  fields: [
    { name: 'mode', label: 'Cách gộp', type: 'options', noExpression: true, options: opt([['append', 'Nối tiếp (item nhánh 1 rồi tới nhánh 2)'], ['combineByPosition', 'Ghép theo vị trí'], ['combineByFields', 'Ghép theo trường khớp'], ['combineAll', 'Ghép mọi cặp'], ['chooseBranch', 'Chọn dữ liệu của 1 nhánh']]) },
    { name: 'field1', label: 'Trường so khớp ở Vào 1', type: 'string', noExpression: true, show: p => p.mode === 'combineByFields' },
    { name: 'field2', label: 'Trường so khớp ở Vào 2', type: 'string', noExpression: true, show: p => p.mode === 'combineByFields' },
    { name: 'joinMode', label: 'Kết quả giữ lại', type: 'options', noExpression: true, show: p => p.mode === 'combineByFields', options: opt([['keepMatches', 'Chỉ cặp khớp nhau'], ['keepNonMatches', 'Chỉ item không khớp'], ['keepEverything', 'Tất cả (khớp và không khớp)'], ['enrichInput1', 'Giữ toàn bộ Vào 1, bổ sung từ Vào 2'], ['enrichInput2', 'Giữ toàn bộ Vào 2, bổ sung từ Vào 1']]) },
    { name: 'includeUnpaired', label: 'Giữ cả item không có cặp', type: 'boolean', show: p => p.mode === 'combineByPosition' },
    { name: 'useDataOfInput', label: 'Lấy dữ liệu của', type: 'options', noExpression: true, show: p => p.mode === 'chooseBranch', options: opt([['1', 'Vào 1'], ['2', 'Vào 2']]) },
  ],
  execute: async (ctx) => {
    const a = ctx.inputs[0] || [], b = ctx.inputs[1] || [];
    const mode = ctx.rawParam('mode');
    if (mode === 'append') return [[...a, ...b]];
    if (mode === 'chooseBranch') return [ctx.rawParam('useDataOfInput') === '2' ? b : a];
    if (mode === 'combineAll') return [a.flatMap(x => b.map(y => ({ json: { ...x.json, ...y.json } })))];
    if (mode === 'combineByPosition') {
      const n = ctx.rawParam('includeUnpaired') ? Math.max(a.length, b.length) : Math.min(a.length, b.length);
      return [Array.from({ length: n }, (_, i) => ({ json: { ...(a[i]?.json || {}), ...(b[i]?.json || {}) } }))];
    }
    const f1 = String(ctx.rawParam('field1') || ''), f2 = String(ctx.rawParam('field2') || '');
    const key = (v: any) => (v == null ? '\u0000' : typeof v === 'object' ? JSON.stringify(v) : String(v));
    const idx = new Map<string, Item[]>();
    b.forEach(y => { const k = key(getPath(y.json, f2)); idx.set(k, [...(idx.get(k) || []), y]); });
    const usedB = new Set<Item>();
    const matched: Item[] = [], onlyA: Item[] = [];
    for (const x of a) {
      const ys = idx.get(key(getPath(x.json, f1))) || [];
      if (ys.length) ys.forEach(y => { usedB.add(y); matched.push({ json: { ...x.json, ...y.json } }); });
      else onlyA.push(x);
    }
    const onlyB = b.filter(y => !usedB.has(y));
    switch (ctx.rawParam('joinMode')) {
      case 'keepNonMatches': return [[...onlyA, ...onlyB]];
      case 'keepEverything': return [[...matched, ...onlyA, ...onlyB]];
      case 'enrichInput1': return [[...matched, ...onlyA]];
      case 'enrichInput2': {
        const ia = new Map<string, Item[]>();
        a.forEach(x => { const k = key(getPath(x.json, f1)); ia.set(k, [...(ia.get(k) || []), x]); });
        return [b.flatMap(y => { const xs = ia.get(key(getPath(y.json, f2))) || []; return xs.length ? xs.map(x => ({ json: { ...y.json, ...x.json } })) : [y]; })];
      }
      default: return [matched];
    }
  },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.merge/',
};

const DEFAULT_CODE_ALL = `// Chạy 1 lần cho toàn bộ item.
// $input.all() lấy mọi item vào, $('Tên bước').all() lấy dữ liệu của bước khác.
for (const item of $input.all()) {
  item.json.daXuLy = true;
}

return $input.all();`;
const DEFAULT_CODE_EACH = `// Chạy cho từng item. $json là dữ liệu của item đang xét.
$json.daXuLy = true;

return $input.item;`;

const codeNode: NodeType = {
  type: 'code', label: 'Mã JavaScript (Code)', desc: 'Viết JavaScript để xử lý dữ liệu theo ý muốn', icon: 'Code2', color: '#ea580c',
  group: 'data', inputs: 1, outputs: 1,
  subtitle: p => (p.mode === 'runOnceForEachItem' ? 'Cho từng item' : 'Cho toàn bộ item'),
  defaults: { mode: 'runOnceForAllItems', jsCode: DEFAULT_CODE_ALL },
  fields: [
    { name: 'mode', label: 'Cách chạy', type: 'options', noExpression: true, options: opt([['runOnceForAllItems', 'Chạy 1 lần cho toàn bộ item'], ['runOnceForEachItem', 'Chạy cho từng item']]) },
    { name: 'jsCode', label: 'Mã JavaScript', type: 'code', noExpression: true, rows: 16, hint: 'Dùng được await, $input, $json, $(\'Tên bước\'), $now, DateTime (Luxon), console.log. Kết quả trả về là mảng đối tượng hoặc mảng { json }.' },
  ],
  execute: async (ctx) => {
    const code = String(ctx.rawParam('jsCode') || '');
    const logs: string[] = [];
    const consoleProxy = { log: (...a: any[]) => { const s = a.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' '); logs.push(s); ctx.log(s); }, warn: (...a: any[]) => ctx.log('[cảnh báo] ' + a.join(' ')), error: (...a: any[]) => ctx.log('[lỗi] ' + a.join(' ')) };
    const run = async (c: Record<string, any>) => {
      const keys = [...Object.keys(c), 'console', 'items', 'item'];
      const vals = [...Object.values(c), consoleProxy, c.$input.all(), c.$input.item];
      try {
        const fn = new AsyncFunction(...keys, `"use strict";\n${code}`);
        return await fn(...vals);
      } catch (e: any) { throw new Error(`Lỗi trong mã: ${e?.message || e}`); }
    };
    if (ctx.rawParam('mode') === 'runOnceForEachItem') {
      const out: Item[] = [];
      for (let i = 0; i < ctx.items.length; i++) {
        const c = ctx.exprContext(i);
        const r = await run(c);
        if (r == null) continue;
        if (Array.isArray(r)) throw new Error('Chế độ "Chạy cho từng item" phải trả về 1 đối tượng, không phải mảng');
        out.push(r && typeof r === 'object' && 'json' in r ? r : { json: r });
      }
      return [out];
    }
    const r = await run(ctx.exprContext(0));
    if (r == null) return [[]];
    if (!Array.isArray(r) && typeof r !== 'object') throw new Error('Mã phải trả về mảng các đối tượng');
    return [Array.isArray(r) ? r : [r]];
  },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/',
};

const waitNode: NodeType = {
  type: 'wait', label: 'Chờ (Wait)', desc: 'Tạm dừng một khoảng thời gian hoặc tới một thời điểm rồi chạy tiếp', icon: 'Hourglass', color: '#ca8a04',
  group: 'flow', inputs: 1, outputs: 1,
  subtitle: p => (p.resume === 'specificTime' ? `Tới ${p.dateTime || ''}` : `${p.amount} ${({ seconds: 'giây', minutes: 'phút', hours: 'giờ', days: 'ngày' } as any)[p.unit] || ''}`),
  defaults: { resume: 'timeInterval', amount: 5, unit: 'seconds', dateTime: '' },
  fields: [
    { name: 'n', label: 'Trong lúc chờ, thẻ trình duyệt đang chạy quy trình phải mở. Nên chờ ngắn, chờ dài hãy tách thành quy trình chạy theo lịch.', type: 'notice' },
    { name: 'resume', label: 'Chạy tiếp khi', type: 'options', noExpression: true, options: opt([['timeInterval', 'Hết khoảng thời gian'], ['specificTime', 'Tới thời điểm cụ thể']]) },
    { name: 'amount', label: 'Thời lượng', type: 'number', show: p => p.resume !== 'specificTime' },
    { name: 'unit', label: 'Đơn vị', type: 'options', show: p => p.resume !== 'specificTime', options: opt([['seconds', 'Giây'], ['minutes', 'Phút'], ['hours', 'Giờ'], ['days', 'Ngày']]) },
    { name: 'dateTime', label: 'Thời điểm', type: 'datetime', show: p => p.resume === 'specificTime' },
  ],
  execute: async (ctx) => {
    let ms: number;
    if (ctx.param('resume') === 'specificTime') ms = parseDate(ctx.param('dateTime'), zoneOf(ctx)).toMillis() - Date.now();
    else ms = toNumber(ctx.param('amount'), 'Thời lượng') * ({ seconds: 1e3, minutes: 6e4, hours: 36e5, days: 864e5 } as any)[ctx.param('unit') || 'seconds'];
    if (ms > 0) await sleep(ms, ctx.signal);
    return [ctx.items];
  },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/',
};

const UNITS = opt([['years', 'Năm'], ['quarters', 'Quý'], ['months', 'Tháng'], ['weeks', 'Tuần'], ['days', 'Ngày'], ['hours', 'Giờ'], ['minutes', 'Phút'], ['seconds', 'Giây'], ['milliseconds', 'Mili giây']]);
const dateTimeNode: NodeType = {
  type: 'dateTime', label: 'Ngày giờ (Date & Time)', desc: 'Lấy giờ hiện tại, cộng trừ, định dạng, tính khoảng cách giữa 2 ngày', icon: 'CalendarClock', color: '#0891b2',
  group: 'data', inputs: 1, outputs: 1,
  subtitle: p => ({ getCurrentDate: 'Giờ hiện tại', addToDate: 'Cộng thời gian', subtractFromDate: 'Trừ thời gian', formatDate: 'Định dạng', getTimeBetweenDates: 'Khoảng cách 2 ngày', extractDate: 'Tách một phần' } as any)[p.operation] || '',
  defaults: { operation: 'getCurrentDate', includeTime: true, date: '{{ $json.timestamp }}', duration: 1, timeUnit: 'days', format: 'dd/MM/yyyy HH:mm', startDate: '', endDate: '', units: 'days', part: 'month', outputFieldName: 'ngayGio' },
  fields: [
    { name: 'operation', label: 'Thao tác', type: 'options', noExpression: true, options: opt([['getCurrentDate', 'Lấy ngày giờ hiện tại'], ['addToDate', 'Cộng thêm vào ngày'], ['subtractFromDate', 'Trừ bớt khỏi ngày'], ['formatDate', 'Định dạng ngày'], ['getTimeBetweenDates', 'Tính khoảng cách giữa 2 ngày'], ['extractDate', 'Tách một phần của ngày']]) },
    { name: 'includeTime', label: 'Kèm giờ phút', type: 'boolean', show: p => p.operation === 'getCurrentDate' },
    { name: 'date', label: 'Ngày', type: 'string', show: p => ['addToDate', 'subtractFromDate', 'formatDate', 'extractDate'].includes(p.operation) },
    { name: 'duration', label: 'Lượng thời gian', type: 'number', show: p => ['addToDate', 'subtractFromDate'].includes(p.operation) },
    { name: 'timeUnit', label: 'Đơn vị', type: 'options', options: UNITS, show: p => ['addToDate', 'subtractFromDate'].includes(p.operation) },
    { name: 'format', label: 'Định dạng', type: 'options', show: p => p.operation === 'formatDate', options: opt([['dd/MM/yyyy HH:mm', '03/10/2026 09:30'], ['dd/MM/yyyy', '03/10/2026'], ['yyyy-MM-dd', '2026-10-03'], ['HH:mm', '09:30'], ["cccc, dd/MM/yyyy", 'Thứ Bảy, 03/10/2026'], ['iso', 'ISO 8601'], ['unix', 'Unix (giây)'], ['unixMs', 'Unix (mili giây)']]), hint: 'Có thể gõ định dạng riêng theo ký hiệu của Luxon, ví dụ "HH:mm dd/MM".' },
    { name: 'startDate', label: 'Ngày bắt đầu', type: 'string', show: p => p.operation === 'getTimeBetweenDates' },
    { name: 'endDate', label: 'Ngày kết thúc', type: 'string', show: p => p.operation === 'getTimeBetweenDates' },
    { name: 'units', label: 'Tính theo', type: 'options', options: UNITS, show: p => p.operation === 'getTimeBetweenDates' },
    { name: 'part', label: 'Phần cần tách', type: 'options', show: p => p.operation === 'extractDate', options: opt([['year', 'Năm'], ['month', 'Tháng'], ['week', 'Tuần trong năm'], ['day', 'Ngày'], ['weekday', 'Thứ (1 là thứ 2, 7 là chủ nhật)'], ['hour', 'Giờ'], ['minute', 'Phút'], ['second', 'Giây']]) },
    { name: 'outputFieldName', label: 'Tên trường kết quả', type: 'string' },
  ],
  execute: async (ctx) => [await perItem(ctx, (item, i) => {
    const z = zoneOf(ctx);
    const out = clone(item.json);
    const op = ctx.rawParam('operation');
    const name = String(ctx.param('outputFieldName', i) || 'ngayGio');
    let v: any;
    if (op === 'getCurrentDate') { const n = DateTime.now().setZone(z); v = ctx.param('includeTime', i) === false ? n.toISODate() : n.toISO(); }
    else if (op === 'addToDate' || op === 'subtractFromDate') {
      const d = parseDate(ctx.param('date', i), z);
      const dur = Duration.fromObject({ [String(ctx.param('timeUnit', i) || 'days')]: toNumber(ctx.param('duration', i), 'Lượng thời gian') });
      v = (op === 'addToDate' ? d.plus(dur) : d.minus(dur)).toISO();
    } else if (op === 'formatDate') {
      const d = parseDate(ctx.param('date', i), z);
      const f = String(ctx.param('format', i) || 'dd/MM/yyyy');
      v = f === 'iso' ? d.toISO() : f === 'unix' ? Math.floor(d.toSeconds()) : f === 'unixMs' ? d.toMillis() : d.setLocale('vi').toFormat(f);
    } else if (op === 'getTimeBetweenDates') {
      const a = parseDate(ctx.param('startDate', i), z), b = parseDate(ctx.param('endDate', i), z);
      const u = String(ctx.param('units', i) || 'days');
      v = Math.round(b.diff(a, u as any).as(u as any) * 1000) / 1000;
    } else if (op === 'extractDate') {
      const d = parseDate(ctx.param('date', i), z);
      const part = String(ctx.param('part', i));
      v = part === 'week' ? d.weekNumber : (d as any)[part];
    }
    setPath(out, name, v);
    return { json: out };
  })],
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.datetime/',
};

const sortNode: NodeType = {
  type: 'sort', label: 'Sắp xếp (Sort)', desc: 'Sắp xếp item theo một hay nhiều trường', icon: 'ArrowUpDown', color: '#2563eb',
  group: 'data', inputs: 1, outputs: 1,
  defaults: { type: 'simple', sortFieldsUi: [{ fieldName: '', order: 'ascending' }] },
  fields: [
    { name: 'type', label: 'Kiểu sắp xếp', type: 'options', noExpression: true, options: opt([['simple', 'Theo trường'], ['random', 'Ngẫu nhiên']]) },
    { name: 'sortFieldsUi', label: 'Trường sắp xếp', type: 'collection', noExpression: true, addLabel: 'Thêm trường', show: p => p.type !== 'random', fields: [
      { name: 'fieldName', label: 'Tên trường', type: 'string', default: '' },
      { name: 'order', label: 'Thứ tự', type: 'options', default: 'ascending', options: opt([['ascending', 'Tăng dần'], ['descending', 'Giảm dần']]) },
    ] },
  ],
  execute: async (ctx) => {
    const items = [...ctx.items];
    if (ctx.rawParam('type') === 'random') { for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; } return [items]; }
    const fs = (ctx.rawParam('sortFieldsUi') || []).filter((f: any) => f.fieldName);
    const cmp = (x: any, y: any) => {
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      if (typeof x === 'number' && typeof y === 'number') return x - y;
      return String(x).localeCompare(String(y), 'vi', { numeric: true });
    };
    items.sort((a, b) => { for (const f of fs) { const c = cmp(getPath(a.json, f.fieldName), getPath(b.json, f.fieldName)); if (c) return f.order === 'descending' ? -c : c; } return 0; });
    return [items];
  },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.sort/',
};

const limitNode: NodeType = {
  type: 'limit', label: 'Giới hạn (Limit)', desc: 'Chỉ giữ một số item đầu hoặc cuối', icon: 'ListEnd', color: '#2563eb',
  group: 'data', inputs: 1, outputs: 1, subtitle: p => `${p.keep === 'lastItems' ? 'Cuối' : 'Đầu'} ${p.maxItems}`,
  defaults: { maxItems: 1, keep: 'firstItems' },
  fields: [
    { name: 'maxItems', label: 'Số item tối đa', type: 'number', min: 1 },
    { name: 'keep', label: 'Giữ', type: 'options', options: opt([['firstItems', 'Các item đầu'], ['lastItems', 'Các item cuối']]) },
  ],
  execute: async (ctx) => { const n = Math.max(0, Math.floor(toNumber(ctx.param('maxItems'), 'Số item'))); return [ctx.param('keep') === 'lastItems' ? (n ? ctx.items.slice(-n) : []) : ctx.items.slice(0, n)]; },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.limit/',
};

const dedupeNode: NodeType = {
  type: 'removeDuplicates', label: 'Bỏ trùng lặp', desc: 'Bỏ các item giống nhau', icon: 'CopyMinus', color: '#2563eb',
  group: 'data', inputs: 1, outputs: 1,
  defaults: { compare: 'allFields', fieldsToCompare: '', fieldsToExclude: '' },
  fields: [
    { name: 'compare', label: 'So sánh theo', type: 'options', noExpression: true, options: opt([['allFields', 'Tất cả các trường'], ['selectedFields', 'Các trường được chọn'], ['allFieldsExcept', 'Tất cả trừ các trường']]) },
    { name: 'fieldsToCompare', label: 'Các trường so sánh (cách nhau dấu phẩy)', type: 'string', noExpression: true, show: p => p.compare === 'selectedFields' },
    { name: 'fieldsToExclude', label: 'Các trường bỏ qua (cách nhau dấu phẩy)', type: 'string', noExpression: true, show: p => p.compare === 'allFieldsExcept' },
  ],
  execute: async (ctx) => {
    const mode = ctx.rawParam('compare');
    const list = (s: string) => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
    const seen = new Set<string>();
    return [ctx.items.filter(it => {
      let o: any = it.json;
      if (mode === 'selectedFields') o = list(ctx.rawParam('fieldsToCompare')).map(f => getPath(it.json, f));
      else if (mode === 'allFieldsExcept') { o = clone(it.json); list(ctx.rawParam('fieldsToExclude')).forEach(f => deletePath(o, f)); }
      const k = JSON.stringify(o);
      if (seen.has(k)) return false; seen.add(k); return true;
    })];
  },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.removeduplicates/',
};

const splitOutNode: NodeType = {
  type: 'splitOut', label: 'Tách mảng (Split Out)', desc: 'Tách một trường dạng mảng thành nhiều item', icon: 'Ungroup', color: '#2563eb',
  group: 'data', inputs: 1, outputs: 1, subtitle: p => p.fieldToSplitOut || '',
  defaults: { fieldToSplitOut: '', include: 'noOtherFields', destinationFieldName: '' },
  fields: [
    { name: 'fieldToSplitOut', label: 'Trường cần tách', type: 'string', noExpression: true, placeholder: 'items' },
    { name: 'include', label: 'Giữ kèm', type: 'options', noExpression: true, options: opt([['noOtherFields', 'Không giữ trường khác'], ['allOtherFields', 'Giữ mọi trường khác']]) },
    { name: 'destinationFieldName', label: 'Tên trường mới (để trống nếu giữ nguyên)', type: 'string', noExpression: true },
  ],
  execute: async (ctx) => [await perItem(ctx, item => {
    const f = String(ctx.rawParam('fieldToSplitOut') || '');
    const arr = getPath(item.json, f);
    if (arr === undefined) throw new Error(`Item không có trường "${f}"`);
    const list = Array.isArray(arr) ? arr : [arr];
    const dest = ctx.rawParam('destinationFieldName') || f.split('.').pop();
    return list.map(v => {
      if (ctx.rawParam('include') === 'allOtherFields') { const o = clone(item.json); deletePath(o, f); o[dest] = v; return { json: o }; }
      return { json: v && typeof v === 'object' && !Array.isArray(v) && !ctx.rawParam('destinationFieldName') ? v : { [dest]: v } };
    });
  })],
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitout/',
};

const aggregateNode: NodeType = {
  type: 'aggregate', label: 'Gom nhóm (Aggregate)', desc: 'Gom nhiều item thành 1 item chứa mảng', icon: 'Group', color: '#2563eb',
  group: 'data', inputs: 1, outputs: 1,
  defaults: { aggregate: 'aggregateAllItemData', destinationFieldName: 'data', fieldsToAggregate: [{ fieldToAggregate: '', outputFieldName: '' }] },
  fields: [
    { name: 'aggregate', label: 'Gom', type: 'options', noExpression: true, options: opt([['aggregateAllItemData', 'Toàn bộ dữ liệu item'], ['aggregateIndividualFields', 'Từng trường riêng']]) },
    { name: 'destinationFieldName', label: 'Tên trường kết quả', type: 'string', noExpression: true, show: p => p.aggregate !== 'aggregateIndividualFields' },
    { name: 'fieldsToAggregate', label: 'Các trường', type: 'collection', noExpression: true, addLabel: 'Thêm trường', show: p => p.aggregate === 'aggregateIndividualFields', fields: [
      { name: 'fieldToAggregate', label: 'Trường', type: 'string', default: '' },
      { name: 'outputFieldName', label: 'Tên mới (không bắt buộc)', type: 'string', default: '' },
    ] },
  ],
  execute: async (ctx) => {
    if (ctx.rawParam('aggregate') === 'aggregateIndividualFields') {
      const o: any = {};
      for (const f of ctx.rawParam('fieldsToAggregate') || []) {
        if (!f.fieldToAggregate) continue;
        o[f.outputFieldName || f.fieldToAggregate] = ctx.items.map(it => getPath(it.json, f.fieldToAggregate)).filter(v => v !== undefined);
      }
      return [[{ json: o }]];
    }
    return [[{ json: { [ctx.rawParam('destinationFieldName') || 'data']: ctx.items.map(it => it.json) } }]];
  },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.aggregate/',
};

const noOpNode: NodeType = {
  type: 'noOp', label: 'Không làm gì', desc: 'Cho dữ liệu đi qua, dùng để đánh dấu hoặc gom nhánh cho dễ nhìn', icon: 'ArrowRight', color: '#94a3b8',
  group: 'util', inputs: 1, outputs: 1, defaults: {}, fields: [],
  execute: async (ctx) => [ctx.items],
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.noop/',
};

const stopNode: NodeType = {
  type: 'stopAndError', label: 'Dừng và báo lỗi', desc: 'Dừng quy trình và ghi lỗi do bạn đặt', icon: 'OctagonX', color: '#dc2626',
  group: 'util', inputs: 1, outputs: 0, defaults: { errorMessage: 'Quy trình dừng có chủ ý' },
  fields: [{ name: 'errorMessage', label: 'Nội dung lỗi', type: 'string' }],
  execute: async (ctx) => { throw new Error(String(ctx.param('errorMessage', 0) || 'Quy trình dừng có chủ ý')); },
  docs: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.stopanderror/',
};

// ===================== EDUGO =====================
const notifyNode: NodeType = {
  type: 'edugoNotify', label: 'Gửi thông báo EduGo', desc: 'Gửi thông báo vào chuông thông báo của EduGo', icon: 'Bell', color: '#f59e0b',
  group: 'edugo', inputs: 1, outputs: 1, subtitle: p => String(p.title || '').slice(0, 40),
  defaults: { to: 'me', userIds: '', title: 'Thông báo tự động', message: '', type: 'info', link: '' },
  fields: [
    { name: 'to', label: 'Gửi tới', type: 'options', noExpression: true, options: opt([['me', 'Chính tôi'], ['users', 'Người dùng theo mã']]) },
    { name: 'userIds', label: 'Mã người dùng (cách nhau dấu phẩy)', type: 'string', show: p => p.to === 'users' },
    { name: 'title', label: 'Tiêu đề', type: 'string' },
    { name: 'message', label: 'Nội dung', type: 'text' },
    { name: 'type', label: 'Loại', type: 'options', options: opt([['info', 'Thông tin'], ['success', 'Thành công'], ['warning', 'Cảnh báo'], ['error', 'Lỗi']]) },
    { name: 'link', label: 'Đường dẫn khi bấm vào (không bắt buộc)', type: 'string' },
  ],
  execute: async (ctx) => {
    const { pushNotificationToSupabase } = await import('../data');
    return [await perItem(ctx, async (item, i) => {
      const ids = ctx.rawParam('to') === 'users' ? String(ctx.param('userIds', i) || '').split(',').map(s => s.trim()).filter(Boolean) : [ctx.user.id];
      if (!ids.length) throw new Error('Chưa có người nhận');
      const id = await pushNotificationToSupabase({
        title: String(ctx.param('title', i) || 'Thông báo tự động'), description: String(ctx.param('message', i) || ''),
        type: ctx.param('type', i) || 'info', targetAudience: 'custom_users', targetUserIds: ids,
        senderId: ctx.user.id, senderName: ctx.user.fullName || 'Automatic', link: String(ctx.param('link', i) || ''),
        metadata: { source: 'automatic', workflowId: ctx.workflow.id, executionId: ctx.executionId },
      });
      return { json: { ...item.json, notificationId: id, sentTo: ids } };
    })];
  },
};

const taskNode: NodeType = {
  type: 'edugoTask', label: 'Tạo công việc EduGo', desc: 'Tạo một công việc mới trong Quản lý công việc', icon: 'ListTodo', color: '#e11d48',
  group: 'edugo', inputs: 1, outputs: 1, subtitle: p => String(p.name || '').slice(0, 40),
  defaults: { name: '', description: '', tag: 'Work', deadline: '{{ $now.plus({ days: 1 }).toISO() }}', priority: 'Medium' },
  fields: [
    { name: 'name', label: 'Tên công việc', type: 'string' },
    { name: 'description', label: 'Mô tả', type: 'text' },
    { name: 'tag', label: 'Nhãn', type: 'string' },
    { name: 'deadline', label: 'Hạn chót', type: 'string', hint: 'Ngày giờ dạng ISO hoặc biểu thức, ví dụ {{ $now.plus({ days: 3 }).toISO() }}' },
    { name: 'priority', label: 'Mức ưu tiên', type: 'options', options: opt([['Low', 'Thấp'], ['Medium', 'Trung bình'], ['High', 'Cao'], ['Urgent', 'Khẩn']]) },
  ],
  execute: async (ctx) => {
    const { saveTaskToSupabase, addTaskHistory } = await import('../tasks');
    const v4 = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `t${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
    return [await perItem(ctx, async (item, i) => {
      const name = String(ctx.param('name', i) || '').trim();
      if (!name) throw new Error('Chưa nhập tên công việc');
      const dl = parseDate(ctx.param('deadline', i) || DateTime.now().plus({ days: 1 }).toISO(), zoneOf(ctx));
      let task: any = {
        id: v4(), createdAt: new Date().toISOString(), status: 'In Progress', progress: 0, pauseDuration: 0, isDeleted: false,
        name, description: String(ctx.param('description', i) || ''), tag: String(ctx.param('tag', i) || 'Work'),
        deadline: dl.toUTC().toISO(), priority: ctx.param('priority', i) || 'Medium', subtasks: [], fileNames: [], creatorId: ctx.user.id,
      };
      task = addTaskHistory(task, 'Tạo công việc', ctx.user.id, ctx.user.fullName || 'Automatic', `Tạo tự động bởi quy trình "${ctx.workflow.name}"`);
      await saveTaskToSupabase(task);
      return { json: { ...item.json, taskId: task.id, taskName: name, deadline: task.deadline } };
    })];
  },
};

const readNode: NodeType = {
  type: 'edugoRead', label: 'Đọc dữ liệu EduGo', desc: 'Lấy danh sách công việc, lớp học, đề Quizz, giáo trình, bài giảng của bạn', icon: 'Database', color: '#7c3aed',
  group: 'edugo', inputs: 1, outputs: 1,
  subtitle: p => ({ tasks: 'Công việc', classes: 'Lớp học', quizzes: 'Đề Quizz', lessons: 'Giáo trình', decks: 'Bài giảng' } as any)[p.resource] || '',
  defaults: { resource: 'tasks', limit: 100 },
  fields: [
    { name: 'resource', label: 'Dữ liệu', type: 'options', noExpression: true, options: opt([['tasks', 'Công việc'], ['classes', 'Lớp học'], ['quizzes', 'Đề Quizz'], ['lessons', 'Giáo trình'], ['decks', 'Bài giảng']]) },
    { name: 'limit', label: 'Số dòng tối đa', type: 'number', min: 1 },
  ],
  execute: async (ctx) => {
    const r = ctx.rawParam('resource');
    let rows: any[] = [];
    if (r === 'tasks') rows = (await (await import('../tasks')).getTasksFromSupabase()).filter((t: any) => !t.isDeleted).map((t: any) => ({ id: t.id, name: t.name, description: t.description, status: t.status, priority: t.priority, tag: t.tag, deadline: t.deadline, progress: t.progress, assignedTo: t.assignedTo, creatorId: t.creatorId, createdAt: t.createdAt }));
    else if (r === 'classes') rows = (await (await import('../edu')).getClasses()) as any[];
    else if (r === 'quizzes') rows = (await (await import('../quiz')).getQuizzes()) as any[];
    else if (r === 'lessons') rows = (await (await import('../elearning')).getMyLessons()).map((l: any) => { const { content, ...rest } = l; return rest; });
    else if (r === 'decks') rows = (await (await import('../slides')).listMyDecks()) as any[];
    const n = Math.max(1, Number(ctx.param('limit', 0)) || 100);
    return [rows.slice(0, n).map(json => ({ json: JSON.parse(JSON.stringify(json)) }))];
  },
};

export const NODE_TYPES: NodeType[] = [
  manualTrigger, scheduleTrigger,
  httpRequest,
  setNode, codeNode, dateTimeNode, sortNode, limitNode, dedupeNode, splitOutNode, aggregateNode,
  ifNode, filterNode, switchNode, mergeNode, waitNode,
  notifyNode, taskNode, readNode,
  noOpNode, stopNode,
];

const MAP = new Map(NODE_TYPES.map(t => [t.type, t]));
export function getNodeType(type: string): NodeType | undefined { return MAP.get(type); }

export const GROUPS: Array<{ id: NodeType['group']; label: string; desc: string }> = [
  { id: 'trigger', label: 'Bước kích hoạt', desc: 'Điều gì làm quy trình bắt đầu chạy' },
  { id: 'data', label: 'Biến đổi dữ liệu', desc: 'Sửa, tính toán, sắp xếp, gom và tách dữ liệu' },
  { id: 'flow', label: 'Điều hướng', desc: 'Rẽ nhánh, lọc, gộp, chờ' },
  { id: 'web', label: 'Kết nối web', desc: 'Gọi API, lấy dữ liệu từ trang web khác' },
  { id: 'edugo', label: 'EduGo', desc: 'Thông báo, công việc và dữ liệu trong EduGo' },
  { id: 'util', label: 'Tiện ích', desc: 'Đánh dấu, dừng quy trình' },
];
