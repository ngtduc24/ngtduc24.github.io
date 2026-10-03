import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Thanh chọn phần nằm trong header cố định, chỉ hiện trên màn hình nhỏ (điện thoại, máy tính bảng dọc)
// vì ở màn hình lớn đã có cột mục lục bên phải. Cho phép sang phần trước, phần sau và mở mục lục.
export default function LessonSectionBar({ sections, active, onPick }: {
  sections: { id: string; title?: string | null }[];
  active: number;
  onPick: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    const el = listRef.current?.querySelector('[data-on="1"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'center' });
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const pick = (i: number) => { onPick(i); setOpen(false); };
  const cur = sections[active];

  return (
    <div ref={ref} className="relative border-t border-slate-100 lg:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-1.5 px-3 py-1.5">
        <button disabled={active === 0} onClick={() => pick(Math.max(0, active - 1))} title="Phần trước" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={() => setOpen(v => !v)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
          <span className="shrink-0 rounded-md bg-brand-light px-1.5 py-0.5 text-[10px] font-black text-brand">{active + 1}/{sections.length}</span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-700">{cur?.title || `Phần ${active + 1}`}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button disabled={active >= sections.length - 1} onClick={() => pick(Math.min(sections.length - 1, active + 1))} title="Phần tiếp theo" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
      </div>
      {open && (
        <div ref={listRef} className="absolute inset-x-0 top-full max-h-[60vh] overflow-y-auto overscroll-contain border-b border-slate-100 bg-white px-3 py-2 shadow-lg">
          {sections.map((s, i) => (
            <button key={s.id} data-on={i === active ? '1' : '0'} onClick={() => pick(i)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left ${i === active ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${i === active ? 'bg-brand text-white' : 'border border-slate-300'}`}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{s.title || `Phần ${i + 1}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
