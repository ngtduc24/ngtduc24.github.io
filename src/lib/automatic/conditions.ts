// Bộ so sánh điều kiện dùng chung cho If, Filter, Switch, theo cách chia kiểu dữ liệu của n8n.
import { DateTime } from 'luxon';
import type { Condition, ConditionGroup } from './types';

export const OPERATORS: Record<string, Array<{ value: string; label: string; single?: boolean }>> = {
  string: [
    { value: 'exists', label: 'tồn tại', single: true }, { value: 'notExists', label: 'không tồn tại', single: true },
    { value: 'empty', label: 'rỗng', single: true }, { value: 'notEmpty', label: 'không rỗng', single: true },
    { value: 'equals', label: 'bằng' }, { value: 'notEquals', label: 'khác' },
    { value: 'contains', label: 'chứa' }, { value: 'notContains', label: 'không chứa' },
    { value: 'startsWith', label: 'bắt đầu bằng' }, { value: 'notStartsWith', label: 'không bắt đầu bằng' },
    { value: 'endsWith', label: 'kết thúc bằng' }, { value: 'notEndsWith', label: 'không kết thúc bằng' },
    { value: 'regex', label: 'khớp biểu thức chính quy' }, { value: 'notRegex', label: 'không khớp biểu thức chính quy' },
  ],
  number: [
    { value: 'exists', label: 'tồn tại', single: true }, { value: 'notExists', label: 'không tồn tại', single: true },
    { value: 'empty', label: 'rỗng', single: true }, { value: 'notEmpty', label: 'không rỗng', single: true },
    { value: 'equals', label: 'bằng' }, { value: 'notEquals', label: 'khác' },
    { value: 'gt', label: 'lớn hơn' }, { value: 'lt', label: 'nhỏ hơn' },
    { value: 'gte', label: 'lớn hơn hoặc bằng' }, { value: 'lte', label: 'nhỏ hơn hoặc bằng' },
  ],
  dateTime: [
    { value: 'exists', label: 'tồn tại', single: true }, { value: 'notExists', label: 'không tồn tại', single: true },
    { value: 'empty', label: 'rỗng', single: true }, { value: 'notEmpty', label: 'không rỗng', single: true },
    { value: 'equals', label: 'bằng' }, { value: 'notEquals', label: 'khác' },
    { value: 'after', label: 'sau' }, { value: 'before', label: 'trước' },
    { value: 'afterOrEquals', label: 'sau hoặc bằng' }, { value: 'beforeOrEquals', label: 'trước hoặc bằng' },
  ],
  boolean: [
    { value: 'exists', label: 'tồn tại', single: true }, { value: 'notExists', label: 'không tồn tại', single: true },
    { value: 'empty', label: 'rỗng', single: true }, { value: 'notEmpty', label: 'không rỗng', single: true },
    { value: 'true', label: 'là đúng', single: true }, { value: 'false', label: 'là sai', single: true },
    { value: 'equals', label: 'bằng' }, { value: 'notEquals', label: 'khác' },
  ],
  array: [
    { value: 'exists', label: 'tồn tại', single: true }, { value: 'notExists', label: 'không tồn tại', single: true },
    { value: 'empty', label: 'rỗng', single: true }, { value: 'notEmpty', label: 'không rỗng', single: true },
    { value: 'contains', label: 'chứa' }, { value: 'notContains', label: 'không chứa' },
    { value: 'lengthEquals', label: 'độ dài bằng' }, { value: 'lengthNotEquals', label: 'độ dài khác' },
    { value: 'lengthGt', label: 'độ dài lớn hơn' }, { value: 'lengthLt', label: 'độ dài nhỏ hơn' },
    { value: 'lengthGte', label: 'độ dài lớn hơn hoặc bằng' }, { value: 'lengthLte', label: 'độ dài nhỏ hơn hoặc bằng' },
  ],
  object: [
    { value: 'exists', label: 'tồn tại', single: true }, { value: 'notExists', label: 'không tồn tại', single: true },
    { value: 'empty', label: 'rỗng', single: true }, { value: 'notEmpty', label: 'không rỗng', single: true },
  ],
};

export const TYPE_LABELS: Record<string, string> = { string: 'Chuỗi', number: 'Số', dateTime: 'Ngày giờ', boolean: 'Đúng sai', array: 'Mảng', object: 'Đối tượng' };

export function isSingle(op: { type: string; operation: string }) {
  return !!OPERATORS[op.type]?.find(o => o.value === op.operation)?.single;
}

export function newCondition(): Condition {
  return { id: Math.random().toString(36).slice(2, 10), leftValue: '', operator: { type: 'string', operation: 'equals' }, rightValue: '' };
}
export function newGroup(): ConditionGroup { return { combinator: 'and', conditions: [newCondition()] }; }

function toDate(v: any): DateTime | null {
  if (v == null || v === '') return null;
  if (DateTime.isDateTime(v)) return v;
  if (v instanceof Date) return DateTime.fromJSDate(v);
  if (typeof v === 'number') return DateTime.fromMillis(v);
  const d = DateTime.fromISO(String(v));
  if (d.isValid) return d;
  const j = new Date(String(v));
  return isNaN(j.getTime()) ? null : DateTime.fromJSDate(j);
}

function isEmptyVal(v: any) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && !DateTime.isDateTime(v) && Object.keys(v).length === 0);
}

export function evalCondition(c: Condition, opts: { ignoreCase?: boolean; loose?: boolean }): boolean {
  const { type, operation } = c.operator;
  let l = c.leftValue, r = c.rightValue;
  switch (operation) {
    case 'exists': return l !== undefined && l !== null;
    case 'notExists': return l === undefined || l === null;
    case 'empty': return isEmptyVal(l);
    case 'notEmpty': return !isEmptyVal(l);
  }
  if (type === 'string') {
    l = l == null ? '' : typeof l === 'object' ? JSON.stringify(l) : String(l);
    r = r == null ? '' : String(r);
    if (opts.ignoreCase && !operation.toLowerCase().includes('regex')) { l = l.toLowerCase(); r = r.toLowerCase(); }
    switch (operation) {
      case 'equals': return l === r;
      case 'notEquals': return l !== r;
      case 'contains': return l.includes(r);
      case 'notContains': return !l.includes(r);
      case 'startsWith': return l.startsWith(r);
      case 'notStartsWith': return !l.startsWith(r);
      case 'endsWith': return l.endsWith(r);
      case 'notEndsWith': return !l.endsWith(r);
      case 'regex': case 'notRegex': {
        const m = String(r).match(/^\/(.*)\/([gimsuy]*)$/);
        const re = m ? new RegExp(m[1], m[2] + (opts.ignoreCase && !m[2].includes('i') ? 'i' : '')) : new RegExp(r, opts.ignoreCase ? 'i' : '');
        return operation === 'regex' ? re.test(l) : !re.test(l);
      }
    }
  }
  if (type === 'number') {
    const a = Number(l), b = Number(r);
    if (!opts.loose && (typeof l !== 'number' && isNaN(a))) throw new Error(`Giá trị trái "${l}" không phải là số. Hãy bật "Chuyển kiểu linh hoạt" hoặc đổi kiểu so sánh.`);
    switch (operation) {
      case 'equals': return a === b;
      case 'notEquals': return a !== b;
      case 'gt': return a > b;
      case 'lt': return a < b;
      case 'gte': return a >= b;
      case 'lte': return a <= b;
    }
  }
  if (type === 'dateTime') {
    const a = toDate(l), b = toDate(r);
    if (!a || !b) throw new Error(`Không đọc được ngày giờ từ "${!a ? l : r}"`);
    const x = a.toMillis(), y = b.toMillis();
    switch (operation) {
      case 'equals': return x === y;
      case 'notEquals': return x !== y;
      case 'after': return x > y;
      case 'before': return x < y;
      case 'afterOrEquals': return x >= y;
      case 'beforeOrEquals': return x <= y;
    }
  }
  if (type === 'boolean') {
    const toB = (v: any) => (typeof v === 'string' ? ['true', '1', 'yes', 'có', 'đúng'].includes(v.trim().toLowerCase()) : !!v);
    switch (operation) {
      case 'true': return toB(l) === true;
      case 'false': return toB(l) === false;
      case 'equals': return toB(l) === toB(r);
      case 'notEquals': return toB(l) !== toB(r);
    }
  }
  if (type === 'array') {
    let arr = l;
    if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch { /* giữ nguyên */ } }
    if (!Array.isArray(arr)) throw new Error('Giá trị trái không phải là mảng');
    const len = arr.length, nr = Number(r);
    const has = arr.some((x: any) => (opts.ignoreCase && typeof x === 'string' && typeof r === 'string' ? x.toLowerCase() === r.toLowerCase() : x == r));
    switch (operation) {
      case 'contains': return has;
      case 'notContains': return !has;
      case 'lengthEquals': return len === nr;
      case 'lengthNotEquals': return len !== nr;
      case 'lengthGt': return len > nr;
      case 'lengthLt': return len < nr;
      case 'lengthGte': return len >= nr;
      case 'lengthLte': return len <= nr;
    }
  }
  throw new Error(`Phép so sánh "${operation}" chưa được hỗ trợ cho kiểu ${type}`);
}

export function evalGroup(g: ConditionGroup | undefined, opts: { ignoreCase?: boolean; loose?: boolean }): boolean {
  const list = g?.conditions || [];
  if (!list.length) return true;
  return g!.combinator === 'or' ? list.some(c => evalCondition(c, opts)) : list.every(c => evalCondition(c, opts));
}
