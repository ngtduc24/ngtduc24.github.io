import React, { useRef } from 'react';
import { Calendar, X } from 'lucide-react';

// Chọn ngày giờ luôn hiển thị dạng dd/mm/yyyy và giờ 24h (00 đến 23), không phụ thuộc ngôn ngữ trình duyệt,
// không có AM, PM. Giá trị trao đổi là chuỗi giờ địa phương 'YYYY-MM-DDTHH:mm' (giống input datetime-local).

const pad = (n: number) => String(n).padStart(2, '0');

// ISO lưu trong cơ sở dữ liệu (UTC) đổi sang giờ địa phương để hiển thị, không bị lệch 7 tiếng.
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function localInputToIso(v?: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

export function Time24({ value, onChange, disabled, className }: { value: string; onChange: (v: string) => void; disabled?: boolean; className?: string }) {
  const [h, m] = (value || '').split(':');
  const sel = 'appearance-none bg-transparent text-center font-bold tabular-nums outline-none cursor-pointer disabled:cursor-not-allowed';
  return (
    <span className={`inline-flex items-center gap-0.5 ${className || ''}`}>
      <select aria-label="Giờ" disabled={disabled} value={h || ''} onChange={e => onChange(`${e.target.value}:${m || '00'}`)} className={sel}>
        {!h && <option value="">--</option>}
        {HOURS.map(x => <option key={x} value={x}>{x}</option>)}
      </select>
      <span className="font-bold text-slate-400">:</span>
      <select aria-label="Phút" disabled={disabled} value={m || ''} onChange={e => onChange(`${h || '00'}:${e.target.value}`)} className={sel}>
        {!m && <option value="">--</option>}
        {MINUTES.map(x => <option key={x} value={x}>{x}</option>)}
      </select>
    </span>
  );
}

export default function DateTime24({ value, onChange, disabled, clearable = true, defaultTime = '23:59', className }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; clearable?: boolean; defaultTime?: string; className?: string;
}) {
  const dateRef = useRef<HTMLInputElement>(null);
  const [date, time] = (value || '').split('T');
  const shown = date ? date.split('-').reverse().join('/') : '';

  const openPicker = () => {
    const el = dateRef.current as any;
    if (!el || disabled) return;
    try { el.showPicker?.(); } catch { el.focus(); }
  };

  return (
    <div className={`flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs transition-all focus-within:border-brand ${disabled ? 'opacity-60' : ''} ${className || ''}`}>
      <button type="button" onClick={openPicker} disabled={disabled} className="relative flex min-w-0 flex-1 items-center gap-2 text-left font-bold text-slate-800">
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
        <span className={`tabular-nums ${shown ? '' : 'font-medium text-slate-400'}`}>{shown || 'Chọn ngày'}</span>
        <input
          ref={dateRef}
          type="date"
          tabIndex={-1}
          value={date || ''}
          disabled={disabled}
          onChange={e => {
            const d = e.target.value;
            onChange(d ? `${d}T${time || defaultTime}` : '');
          }}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </button>
      <Time24 value={time || ''} disabled={disabled || !date} onChange={t => date && onChange(`${date}T${t}`)} className="shrink-0 text-slate-800" />
      {clearable && value && !disabled && (
        <button type="button" onClick={() => onChange('')} title="Bỏ thời hạn" className="shrink-0 rounded p-0.5 text-slate-400 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>
      )}
    </div>
  );
}
