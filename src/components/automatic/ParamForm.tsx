import React, { createContext, useContext, useMemo, useRef } from 'react';
import { Plus, Trash2, Info, GripVertical } from 'lucide-react';
import type { Condition, ConditionGroup, Field } from '../../lib/automatic/types';
import { hasExpression, previewExpression, ExprData } from '../../lib/automatic/expression';
import { OPERATORS, TYPE_LABELS, isSingle, newCondition } from '../../lib/automatic/conditions';
import { Toggle } from './shared';

// Ngữ cảnh để xem trước biểu thức và chèn trường được chọn từ bảng dữ liệu vào ô đang nhập
interface FormCtx { expr: ExprData | null; register: (el: HTMLInputElement | HTMLTextAreaElement, set: (v: string) => void) => void }
const Ctx = createContext<FormCtx>({ expr: null, register: () => {} });

export function useInsertTarget() {
  const last = useRef<{ el: HTMLInputElement | HTMLTextAreaElement; set: (v: string) => void } | null>(null);
  const register = (el: HTMLInputElement | HTMLTextAreaElement, set: (v: string) => void) => { last.current = { el, set }; };
  const insert = (text: string) => {
    const t = last.current;
    if (!t || !document.body.contains(t.el)) return false;
    const el = t.el;
    const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? el.value.length;
    const v = el.value.slice(0, a) + text + el.value.slice(b);
    t.set(v);
    requestAnimationFrame(() => { try { el.focus(); el.setSelectionRange(a + text.length, a + text.length); } catch { /* bỏ qua */ } });
    return true;
  };
  return { register, insert };
}

export function FormProvider({ expr, register, children }: { expr: ExprData | null; register: FormCtx['register']; children: React.ReactNode }) {
  const v = useMemo(() => ({ expr, register }), [expr, register]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15';

function Preview({ value }: { value: any }) {
  const { expr } = useContext(Ctx);
  if (!hasExpression(value)) return null;
  if (!expr) return <div className="mt-1 text-[11px] text-slate-400">Chạy các bước trước để xem kết quả biểu thức</div>;
  const r = previewExpression(value, expr);
  return (
    <div className={`mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-md px-2 py-1 font-mono text-[11px] ${r.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
      {r.ok ? (r.text === '' ? '(rỗng)' : r.text) : r.text}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, multiline, rows = 3, mono, noExpr }: { value: any; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number; mono?: boolean; noExpr?: boolean }) {
  const { register } = useContext(Ctx);
  const v = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const isExpr = !noExpr && hasExpression(v);
  const cls = `${inputCls} ${mono || isExpr ? 'font-mono text-[12px]' : ''} ${isExpr ? 'border-emerald-300 bg-emerald-50/40 pr-8' : ''}`;
  const common = {
    value: v, placeholder,
    onFocus: (e: React.FocusEvent<any>) => register(e.target, onChange),
    onChange: (e: React.ChangeEvent<any>) => onChange(e.target.value),
    onDrop: (e: React.DragEvent<any>) => {
      const t = e.dataTransfer.getData('text/plain');
      if (!t) return;
      e.preventDefault();
      const el = e.target as HTMLInputElement;
      const pos = el.selectionStart ?? el.value.length;
      onChange(el.value.slice(0, pos) + t + el.value.slice(pos));
    },
    spellCheck: false,
  };
  return (
    <div className="relative">
      {multiline || v.includes('\n') ? <textarea {...common} rows={rows} className={cls + ' resize-y leading-5'} /> : <input {...common} className={cls} />}
      {isExpr && <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-emerald-600 px-1 text-[10px] font-bold italic text-white">fx</span>}
      {!noExpr && <Preview value={v} />}
    </div>
  );
}

function CodeInput({ value, onChange, rows = 14 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value ?? ''} rows={rows} spellCheck={false}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const el = e.currentTarget, a = el.selectionStart, b = el.selectionEnd;
          const nv = el.value.slice(0, a) + '  ' + el.value.slice(b);
          onChange(nv);
          requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
        }
      }}
      className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-[12px] leading-5 text-emerald-100 outline-none focus:border-brand"
    />
  );
}

export function ParamForm({ fields, values, onChange, defaults }: { fields: Field[]; values: Record<string, any>; onChange: (next: Record<string, any>) => void; defaults?: Record<string, any> }) {
  const merged = { ...(defaults || {}), ...values };
  const set = (k: string, v: any) => onChange({ ...values, [k]: v });
  return (
    <div className="space-y-4">
      {fields.filter(f => !f.show || f.show(merged)).map(f => (
        <FieldRow key={f.name} f={f} value={merged[f.name] !== undefined ? merged[f.name] : f.default} onChange={v => set(f.name, v)} />
      ))}
    </div>
  );
}

function FieldRow({ f, value, onChange }: { f: Field; value: any; onChange: (v: any) => void }) {
  if (f.type === 'notice') {
    return <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[12px] leading-5 text-amber-800"><Info size={15} className="mt-0.5 shrink-0" />{f.label}</div>;
  }
  if (f.type === 'boolean') {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-slate-700">{f.label}</span>
        <Toggle on={!!value} onChange={onChange} size="sm" />
      </label>
    );
  }
  return (
    <div>
      <div className="mb-1 text-[12px] font-semibold text-slate-600">{f.label}</div>
      <Control f={f} value={value} onChange={onChange} />
      {f.hint && <p className="mt-1 text-[11px] leading-4 text-slate-400">{f.hint}</p>}
    </div>
  );
}

function Control({ f, value, onChange }: { f: Field; value: any; onChange: (v: any) => void }) {
  switch (f.type) {
    case 'string': return <TextInput value={value} onChange={onChange} placeholder={f.placeholder} noExpr={f.noExpression} />;
    case 'text': return <TextInput value={value} onChange={onChange} placeholder={f.placeholder} multiline rows={f.rows || 4} noExpr={f.noExpression} />;
    case 'json': return <TextInput value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)} onChange={onChange} multiline rows={f.rows || 8} mono />;
    case 'code': return <CodeInput value={value} onChange={onChange} rows={f.rows} />;
    case 'datetime': return (
      <div className="space-y-1.5">
        <TextInput value={value} onChange={onChange} placeholder="2026-10-03T09:00 hoặc biểu thức" />
        <input type="datetime-local" className={inputCls} onChange={e => e.target.value && onChange(e.target.value)} />
      </div>
    );
    case 'number': return (
      <TextInput value={value} placeholder={f.placeholder} onChange={v => { const t = v.trim(); onChange(t !== '' && !hasExpression(t) && !isNaN(Number(t)) ? Number(t) : v); }} noExpr={f.noExpression} />
    );
    case 'options': return (
      <select value={value == null ? '' : String(value)} onChange={e => onChange(e.target.value)} className={inputCls}>
        {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        {value != null && value !== '' && !(f.options || []).some(o => o.value === String(value)) && <option value={String(value)}>{String(value)}</option>}
      </select>
    );
    case 'multioptions': {
      const arr: string[] = Array.isArray(value) ? value.map(String) : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {(f.options || []).map(o => {
            const on = arr.includes(o.value);
            return <button key={o.value} type="button" onClick={() => onChange(on ? arr.filter(x => x !== o.value) : [...arr, o.value])} className={`h-8 rounded-lg border px-2.5 text-[12px] font-semibold ${on ? 'border-brand bg-brand-light text-brand' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{o.label}</button>;
          })}
        </div>
      );
    }
    case 'collection': return <CollectionInput f={f} value={value} onChange={onChange} />;
    case 'conditions': return <ConditionsInput value={value} onChange={onChange} />;
  }
  return null;
}

function CollectionInput({ f, value, onChange }: { f: Field; value: any; onChange: (v: any) => void }) {
  const rows: any[] = Array.isArray(value) ? value : [];
  const sub = f.fields || [];
  const defaults = Object.fromEntries(sub.map(s => [s.name, s.default]));
  const inline = sub.length <= 3 && sub.every(s => ['string', 'options', 'number'].includes(s.type));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="group relative rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 pr-9">
          {inline ? (
            <div className="grid gap-2" style={{ gridTemplateColumns: sub.map(s => (s.type === 'options' ? 'minmax(90px,0.7fr)' : 'minmax(0,1fr)')).join(' ') }}>
              {sub.filter(s => !s.show || s.show({ ...defaults, ...r })).map(s => (
                <div key={s.name} className="min-w-0">
                  <div className="mb-0.5 text-[11px] font-semibold text-slate-500">{s.label}</div>
                  <Control f={s} value={r[s.name] !== undefined ? r[s.name] : s.default} onChange={v => onChange(rows.map((x, j) => (j === i ? { ...x, [s.name]: v } : x)))} />
                </div>
              ))}
            </div>
          ) : (
            <ParamForm fields={sub} values={r} defaults={defaults} onChange={nv => onChange(rows.map((x, j) => (j === i ? nv : x)))} />
          )}
          <div className="absolute right-1.5 top-1.5 flex flex-col gap-1">
            <button type="button" title="Xoá dòng" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
            {i > 0 && <button type="button" title="Đưa lên trên" onClick={() => { const n = [...rows]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100"><GripVertical size={14} /></button>}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, JSON.parse(JSON.stringify(defaults))])} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-[13px] font-semibold text-slate-600 hover:border-brand hover:text-brand">
        <Plus size={15} />{f.addLabel || 'Thêm'}
      </button>
    </div>
  );
}

function ConditionsInput({ value, onChange }: { value: ConditionGroup | undefined; onChange: (v: ConditionGroup) => void }) {
  const g: ConditionGroup = value && Array.isArray(value.conditions) ? value : { combinator: 'and', conditions: [] };
  const upd = (i: number, c: Partial<Condition>) => onChange({ ...g, conditions: g.conditions.map((x, j) => (j === i ? { ...x, ...c } : x)) });
  return (
    <div className="space-y-2">
      {g.conditions.map((c, i) => {
        const single = isSingle(c.operator);
        return (
          <div key={c.id || i}>
            {i > 0 && (
              <div className="my-1 flex justify-center">
                <select value={g.combinator} onChange={e => onChange({ ...g, combinator: e.target.value as any })} className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-bold uppercase text-slate-600">
                  <option value="and">VÀ</option><option value="or">HOẶC</option>
                </select>
              </div>
            )}
            <div className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 pr-9">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2"><TextInput value={c.leftValue} onChange={v => upd(i, { leftValue: v })} placeholder="Giá trị 1, kéo trường vào đây" /></div>
                <select
                  value={`${c.operator.type}:${c.operator.operation}`}
                  onChange={e => { const [type, operation] = e.target.value.split(':'); upd(i, { operator: { type, operation } }); }}
                  className={inputCls}
                >
                  {Object.entries(OPERATORS).map(([t, ops]) => (
                    <optgroup key={t} label={TYPE_LABELS[t]}>
                      {ops.map(o => <option key={o.value} value={`${t}:${o.value}`}>{TYPE_LABELS[t]}: {o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                {!single ? <TextInput value={c.rightValue} onChange={v => upd(i, { rightValue: v })} placeholder="Giá trị 2" /> : <div className="self-center text-[12px] text-slate-400">Không cần giá trị 2</div>}
              </div>
              <button type="button" title="Xoá điều kiện" onClick={() => onChange({ ...g, conditions: g.conditions.filter((_, j) => j !== i) })} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={() => onChange({ ...g, conditions: [...g.conditions, newCondition()] })} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-[13px] font-semibold text-slate-600 hover:border-brand hover:text-brand">
        <Plus size={15} />Thêm điều kiện
      </button>
    </div>
  );
}
