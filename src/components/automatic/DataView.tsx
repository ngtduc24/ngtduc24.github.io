import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Hash, Type, ToggleLeft, Braces, List, Calendar, CircleSlash } from 'lucide-react';
import type { Item } from '../../lib/automatic/types';
import { jsonPathExpr } from '../../lib/automatic/expression';

export type ViewMode = 'schema' | 'table' | 'json';

// Gọi khi chạm vào một trường trên iPad (không kéo thả được): chèn biểu thức vào ô tham số đang chọn
export type InsertFn = (expr: string) => void;

const MAX_ROWS = 100;

function typeIcon(v: any) {
  if (v === null || v === undefined) return <CircleSlash size={12} className="text-slate-400" />;
  if (Array.isArray(v)) return <List size={12} className="text-violet-500" />;
  if (typeof v === 'number') return <Hash size={12} className="text-blue-500" />;
  if (typeof v === 'boolean') return <ToggleLeft size={12} className="text-emerald-500" />;
  if (typeof v === 'object') return <Braces size={12} className="text-amber-500" />;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return <Calendar size={12} className="text-cyan-600" />;
  return <Type size={12} className="text-slate-500" />;
}

function short(v: any, n = 80) {
  if (v === undefined) return '';
  if (v === null) return 'null';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function DataView({ items, mode, base, onInsert, emptyText }: { items: Item[]; mode: ViewMode; base: string; onInsert?: InsertFn; emptyText?: string }) {
  if (!items.length) return <div className="p-6 text-center text-[13px] text-slate-500">{emptyText || 'Không có item nào'}</div>;
  if (mode === 'json') return <JsonView items={items} />;
  if (mode === 'table') return <TableView items={items} base={base} onInsert={onInsert} />;
  return <SchemaView items={items} base={base} onInsert={onInsert} />;
}

function dragProps(expr: string, onInsert?: InsertFn) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', expr); e.dataTransfer.effectAllowed = 'copy'; },
    onClick: () => onInsert?.(expr),
    title: `Kéo vào ô tham số hoặc bấm để chèn ${expr}`,
  };
}

function JsonView({ items }: { items: Item[] }) {
  const text = useMemo(() => JSON.stringify(items.slice(0, MAX_ROWS).map(i => i.json), null, 2), [items]);
  return (
    <div>
      <pre className="whitespace-pre-wrap break-words p-3 font-mono text-[12px] leading-5 text-slate-700">{text}</pre>
      {items.length > MAX_ROWS && <p className="px-3 pb-3 text-[12px] text-slate-500">Đang hiện {MAX_ROWS}/{items.length} item</p>}
    </div>
  );
}

function TableView({ items, base, onInsert }: { items: Item[]; base: string; onInsert?: InsertFn }) {
  const cols = useMemo(() => {
    const s = new Set<string>();
    items.slice(0, 50).forEach(i => Object.keys(i.json || {}).forEach(k => s.add(k)));
    return [...s].slice(0, 40);
  }, [items]);
  return (
    <div className="overflow-auto">
      <table className="min-w-full border-collapse text-[12px]">
        <thead className="sticky top-0 bg-slate-50">
          <tr>
            <th className="border-b border-r border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-400">#</th>
            {cols.map(c => (
              <th key={c} className="cursor-grab border-b border-r border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-700 hover:bg-brand-light" {...dragProps(`{{ ${jsonPathExpr(base, [c])} }}`, onInsert)}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.slice(0, MAX_ROWS).map((it, r) => (
            <tr key={r} className="odd:bg-white even:bg-slate-50/60">
              <td className="border-b border-r border-slate-100 px-2 py-1 text-slate-400">{r}</td>
              {cols.map(c => <td key={c} className="max-w-[260px] truncate border-b border-r border-slate-100 px-2 py-1 text-slate-700" title={short(it.json?.[c], 500)}>{short(it.json?.[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > MAX_ROWS && <p className="p-2 text-[12px] text-slate-500">Đang hiện {MAX_ROWS}/{items.length} item</p>}
    </div>
  );
}

function SchemaView({ items, base, onInsert }: { items: Item[]; base: string; onInsert?: InsertFn }) {
  // Gộp khoá của nhiều item để thấy đủ các trường
  const sample = useMemo(() => {
    const merged: any = {};
    for (const it of items.slice(0, 20)) for (const [k, v] of Object.entries(it.json || {})) if (!(k in merged)) merged[k] = v;
    return merged;
  }, [items]);
  return (
    <div className="p-2">
      <SchemaNode value={sample} path={[]} base={base} onInsert={onInsert} depth={0} />
      <p className="px-2 pt-2 text-[12px] text-slate-400">{items.length} item. Kéo trường vào ô tham số, trên iPad thì bấm vào trường để chèn.</p>
    </div>
  );
}

function SchemaNode({ value, path, base, onInsert, depth }: { value: any; path: string[]; base: string; onInsert?: InsertFn; depth: number }) {
  const entries = Array.isArray(value) ? value.slice(0, 1).map((v, i) => [String(i), v] as [string, any]) : Object.entries(value || {});
  return (
    <div className={depth ? 'ml-4 border-l border-slate-200 pl-2' : ''}>
      {entries.map(([k, v]) => <SchemaRow key={k} k={k} v={v} path={[...path, k]} base={base} onInsert={onInsert} depth={depth} isIndex={Array.isArray(value)} />)}
    </div>
  );
}

function SchemaRow({ k, v, path, base, onInsert, depth, isIndex }: { k: string; v: any; path: string[]; base: string; onInsert?: InsertFn; depth: number; isIndex: boolean }) {
  const [open, setOpen] = useState(depth < 1);
  const nested = v && typeof v === 'object' && (Array.isArray(v) ? v.length : Object.keys(v).length);
  const expr = `{{ ${jsonPathExpr(base, path)} }}`;
  return (
    <div>
      <div className="group flex items-center gap-1 py-0.5">
        {nested ? <button type="button" onClick={() => setOpen(o => !o)} className="grid h-5 w-5 place-items-center text-slate-400 hover:text-slate-700">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button> : <span className="w-5" />}
        <span className="inline-flex cursor-grab items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] font-medium text-slate-700 hover:border-brand hover:bg-brand-light" {...dragProps(expr, onInsert)}>
          {typeIcon(v)}{isIndex ? `[${k}]` : k}
        </span>
        {!nested && <span className="min-w-0 truncate text-[12px] text-slate-500">{short(v, 60)}</span>}
        {Array.isArray(v) && <span className="text-[11px] text-slate-400">{v.length} phần tử</span>}
      </div>
      {nested && open ? <SchemaNode value={v} path={path} base={base} onInsert={onInsert} depth={depth + 1} /> : null}
    </div>
  );
}

export function ViewSwitch({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const b = (m: ViewMode, l: string) => (
    <button type="button" onClick={() => onChange(m)} className={`h-7 rounded-md px-2.5 text-[12px] font-semibold ${mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
  );
  return <div className="inline-flex rounded-lg bg-slate-100 p-0.5">{b('schema', 'Cấu trúc')}{b('table', 'Bảng')}{b('json', 'JSON')}</div>;
}
