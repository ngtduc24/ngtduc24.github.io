import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Tìm kiếm và chia trang dùng chung cho các danh sách E-Learning, trắc nghiệm.
// Bỏ dấu tiếng Việt, chữ thường để tìm kiếm
export const fold = (v: string) => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

// Chia trang phía máy, nhớ số bài mỗi trang theo từng danh sách, về trang 1 khi đổi bộ lọc
export function usePaging(total: number, key: string, def: number, resetOn: unknown[]) {
  const [size, setSizeState] = useState<number>(() => { try { return Number(localStorage.getItem(key)) || def; } catch { return def; } });
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(total / size));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, resetOn);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const setSize = (n: number) => { setSizeState(n); setPage(1); try { localStorage.setItem(key, String(n)); } catch { /* bỏ qua */ } };
  const cur = Math.min(page, pages);
  return { page: cur, pages, size, setSize, setPage, from: (cur - 1) * size, to: cur * size };
}
export type Paging = ReturnType<typeof usePaging>;

export function Pager({ pg, total, unit, sizes }: { pg: Paging; total: number; unit: string; sizes: number[] }) {
  const go = (p: number) => { pg.setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  // Dãy số trang gọn: 1 … 4 5 6 … 20
  const nums: (number | '…')[] = [];
  for (let p = 1; p <= pg.pages; p++) {
    if (p === 1 || p === pg.pages || Math.abs(p - pg.page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const btn = 'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-bold transition-colors';
  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm sm:flex-row">
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span>Hiển thị {total ? pg.from + 1 : 0} đến {Math.min(pg.to, total)} trong {total} {unit}</span>
        <select value={pg.size} onChange={e => pg.setSize(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold outline-none focus:border-brand">
          {sizes.map(n => <option key={n} value={n}>{n} / trang</option>)}
        </select>
      </div>
      {pg.pages > 1 && (
        <div className="flex items-center gap-1">
          <button disabled={pg.page <= 1} onClick={() => go(pg.page - 1)} title="Trang trước" className={`${btn} text-slate-500 hover:bg-slate-100 disabled:opacity-30`}><ChevronLeft className="h-4 w-4" /></button>
          {nums.map((n, i) => n === '…'
            ? <span key={'e' + i} className="px-1 text-xs text-slate-400">…</span>
            : <button key={n} onClick={() => go(n)} className={`${btn} ${n === pg.page ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{n}</button>)}
          <button disabled={pg.page >= pg.pages} onClick={() => go(pg.page + 1)} title="Trang sau" className={`${btn} text-slate-500 hover:bg-slate-100 disabled:opacity-30`}><ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

