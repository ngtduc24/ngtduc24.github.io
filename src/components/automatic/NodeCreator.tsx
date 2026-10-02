import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { NODE_TYPES, GROUPS } from '../../lib/automatic/nodes';
import type { NodeType } from '../../lib/automatic/types';
import { NodeIcon } from './shared';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export default function NodeCreator({ onPick, onClose, triggersOnly, hasTrigger }: { onPick: (t: NodeType) => void; onClose: () => void; triggersOnly?: boolean; hasTrigger: boolean }) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(triggersOnly ? 'trigger' : null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);

  const results = useMemo(() => {
    const k = norm(q.trim());
    if (!k) return [];
    return NODE_TYPES.filter(t => !(triggersOnly && !t.trigger)).filter(t => norm(`${t.label} ${t.desc} ${t.type}`).includes(k));
  }, [q, triggersOnly]);

  const [hi, setHi] = useState(0);
  useEffect(() => setHi(0), [q]);

  const item = (t: NodeType, i?: number) => (
    <button key={t.type} type="button" onClick={() => onPick(t)} onMouseEnter={() => i != null && setHi(i)}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 ${i != null && i === hi ? 'bg-slate-100' : ''}`}>
      <NodeIcon type={t} size={18} boxed />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-slate-800">{t.label}</span>
        <span className="block text-[12px] leading-4 text-slate-500">{t.desc}</span>
      </span>
    </button>
  );

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[400px] flex-col border-l border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex-1">
          <div className="text-[15px] font-bold text-slate-800">{triggersOnly || !hasTrigger ? 'Điều gì khởi động quy trình?' : 'Thêm bước tiếp theo'}</div>
          <div className="text-[12px] text-slate-500">{triggersOnly || !hasTrigger ? 'Chọn bước kích hoạt để bắt đầu' : 'Tìm hoặc chọn theo nhóm'}</div>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></button>
      </div>
      <div className="px-4 py-3">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-brand focus-within:bg-white">
          <Search size={16} className="text-slate-400" />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm bước, ví dụ HTTP, If, lịch..." className="flex-1 bg-transparent text-[13px] outline-none"
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(results.length - 1, h + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)); }
              if (e.key === 'Enter' && results[hi]) onPick(results[hi]);
            }} />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {q.trim() ? (
          results.length ? results.map((t, i) => item(t, i)) : <p className="p-6 text-center text-[13px] text-slate-500">Không tìm thấy bước phù hợp</p>
        ) : group ? (
          <>
            {!triggersOnly && <button type="button" onClick={() => setGroup(null)} className="mb-1 ml-2 text-[12px] font-semibold text-brand hover:underline">Tất cả nhóm</button>}
            <div className="px-3 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-400">{GROUPS.find(g => g.id === group)?.label}</div>
            {NODE_TYPES.filter(t => t.group === group).map(t => item(t))}
          </>
        ) : (
          GROUPS.map(g => (
            <button key={g.id} type="button" onClick={() => setGroup(g.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-100">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-slate-800">{g.label}</span>
                <span className="block text-[12px] text-slate-500">{g.desc}</span>
              </span>
              <span className="text-[11px] text-slate-400">{NODE_TYPES.filter(t => t.group === g.id).length}</span>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
