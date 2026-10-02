// Biểu thức kiểu n8n: phần nằm giữa {{ và }} là một biểu thức JavaScript, được tính với
// các biến $json, $input, $('Tên bước'), $node, $now, $today, $execution, $workflow, $itemIndex.
// Chuỗi chỉ gồm đúng 1 biểu thức thì trả về giá trị gốc (số, mảng, đối tượng), còn lại ghép thành chuỗi.
import { DateTime } from 'luxon';
import type { Item, NodeRun } from './types';

export interface ExprData {
  runData: Record<string, NodeRun>;
  items: Item[];                 // dữ liệu vào của bước đang chạy
  itemIndex: number;
  nodeName: string;
  workflow: { id: string; name: string; active: boolean };
  execution: { id: string; mode: string };
  timezone: string;
  nodeParams?: Record<string, any>;
}

const EXPR_RE = /\{\{([\s\S]*?)\}\}/g;

export function hasExpression(v: any): boolean {
  return typeof v === 'string' && v.includes('{{') && v.includes('}}');
}

function firstOutput(run?: NodeRun): Item[] {
  if (!run) return [];
  for (const o of run.output || []) if (o && o.length) return o;
  return run.output?.[0] || [];
}

// Trình truy cập dữ liệu của một bước khác: $('Tên').item, .first(), .last(), .all()
function nodeAccessor(d: ExprData, name: string) {
  const run = d.runData[name];
  if (!run) throw new Error(`Bước "${name}" chưa chạy nên chưa có dữ liệu. Hãy chạy bước đó trước.`);
  const out = firstOutput(run);
  const at = (i: number) => out[Math.min(Math.max(i, 0), Math.max(out.length - 1, 0))];
  const api = {
    get item() { return at(d.itemIndex); },
    first: (_branch?: number) => out[0],
    last: (_branch?: number) => out[out.length - 1],
    all: (branch?: number) => (branch != null ? run.output?.[branch] || [] : out),
    itemMatching: (i: number) => at(i),
    get json() { return at(d.itemIndex)?.json; },
    get params() { return (run as any).params || {}; },
    get isExecuted() { return true; },
  };
  return api;
}

export function buildContext(d: ExprData): Record<string, any> {
  const items = d.items || [];
  const cur = items[d.itemIndex] || items[0];
  const now = DateTime.now().setZone(d.timezone || 'Asia/Ho_Chi_Minh');
  const $ = (name: string) => nodeAccessor(d, name);
  const $node = new Proxy({}, { get: (_t, k: string) => { const a = nodeAccessor(d, k); return { json: a.json, data: a.json, parameter: a.params }; } });
  return {
    $json: cur?.json ?? {},
    $data: cur?.json ?? {},
    $binary: {},
    $input: {
      item: cur,
      all: () => items,
      first: () => items[0],
      last: () => items[items.length - 1],
      params: d.nodeParams || {},
    },
    $: $,
    $node,
    $items: (name?: string) => (name ? nodeAccessor(d, name).all() : items),
    $now: now,
    $today: now.startOf('day'),
    $execution: { id: d.execution.id, mode: d.execution.mode === 'manual' ? 'test' : 'production', resumeUrl: '' },
    $workflow: { id: d.workflow.id, name: d.workflow.name, active: d.workflow.active },
    $itemIndex: d.itemIndex,
    $runIndex: 0,
    $prevNode: { name: '' },
    $vars: {},
    $if: (c: any, a: any, b: any) => (c ? a : b),
    $ifEmpty: (v: any, def: any) => (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && v && !Array.isArray(v) && !Object.keys(v).length) ? def : v),
    $min: (...a: number[]) => Math.min(...a),
    $max: (...a: number[]) => Math.max(...a),
    DateTime,
  };
}

const fnCache = new Map<string, Function>();
function compile(code: string, keys: string[]): Function {
  const k = keys.join(',') + '|' + code;
  let f = fnCache.get(k);
  if (!f) {
    // eslint-disable-next-line no-new-func
    f = new Function(...keys, `"use strict"; return (${code});`);
    if (fnCache.size > 500) fnCache.clear();
    fnCache.set(k, f);
  }
  return f;
}

export function evalCode(code: string, ctx: Record<string, any>): any {
  const keys = Object.keys(ctx);
  try {
    return compile(code, keys)(...keys.map(k => ctx[k]));
  } catch (e: any) {
    throw new Error(`Lỗi biểu thức {{${code.trim()}}}: ${e?.message || e}`);
  }
}

function toText(v: any): string {
  if (v === undefined || v === null) return '';
  if (DateTime.isDateTime(v)) return v.toISO() || '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
  return String(v);
}

// Tính một chuỗi có biểu thức.
export function resolveString(s: string, ctx: Record<string, any>): any {
  if (!hasExpression(s)) return s;
  const trimmed = s.trim();
  const m = trimmed.match(/^\{\{([\s\S]*)\}\}$/);
  if (m && !m[1].includes('}}') && !m[1].includes('{{')) {
    const v = evalCode(m[1], ctx);
    return DateTime.isDateTime(v) ? v.toISO() : v;
  }
  return s.replace(EXPR_RE, (_all, code) => toText(evalCode(code, ctx)));
}

// Tính sâu trong đối tượng hoặc mảng tham số.
export function resolveDeep(v: any, ctx: Record<string, any>): any {
  if (typeof v === 'string') return resolveString(v, ctx);
  if (Array.isArray(v)) return v.map(x => resolveDeep(x, ctx));
  if (v && typeof v === 'object') {
    const o: Record<string, any> = {};
    for (const k of Object.keys(v)) o[k] = resolveDeep(v[k], ctx);
    return o;
  }
  return v;
}

// Xem trước kết quả của một biểu thức trong ô tham số (không ném lỗi).
export function previewExpression(s: any, d: ExprData): { ok: boolean; text: string } {
  try {
    const v = resolveDeep(s, buildContext(d));
    return { ok: true, text: typeof v === 'string' ? v : toText(v) };
  } catch (e: any) {
    return { ok: false, text: e?.message || String(e) };
  }
}

// Đọc giá trị theo đường dẫn "a.b[0].c"
export function getPath(obj: any, path: string): any {
  if (!path) return obj;
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) { if (cur == null) return undefined; cur = cur[p]; }
  return cur;
}

export function setPath(obj: any, path: string, value: any) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    cur = cur[p];
  }
  if (parts.length) cur[parts[parts.length - 1]] = value;
}

export function deletePath(obj: any, path: string) {
  const parts = path.split('.').filter(Boolean);
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) { if (cur == null) return; cur = cur[parts[i]]; }
  if (cur && parts.length) delete cur[parts[parts.length - 1]];
}

// Đường dẫn an toàn để chèn vào biểu thức: $json.ten hoặc $json["tên có dấu"]
export function jsonPathExpr(base: string, path: string[]): string {
  let s = base;
  for (const p of path) {
    if (/^\d+$/.test(p)) s += `[${p}]`;
    else if (/^[A-Za-z_$][\w$]*$/.test(p)) s += `.${p}`;
    else s += `[${JSON.stringify(p)}]`;
  }
  return s;
}
