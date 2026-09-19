import React from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

export interface PortfolioListFilter {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export default function PortfolioListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  selectedCount,
  resultCount,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onCreate,
  createLabel
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters: PortfolioListFilter[];
  selectedCount: number;
  resultCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onCreate: () => void;
  createLabel: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
      <label className="relative block">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input value={searchValue} onChange={event => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10" />
      </label>

      <div className="my-5 h-px bg-slate-100" />

      <div className="flex flex-wrap gap-3">
        {filters.map(filter => (
          <label key={filter.label} className="flex min-w-[210px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-400">{filter.label}:</span>
            <select value={filter.value} onChange={event => filter.onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none">
              {filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
      </div>

      <div className="my-5 h-px bg-slate-100" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!selectedCount} onClick={onDeleteSelected} className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500 disabled:opacity-45"><Trash2 className="h-4 w-4" /> Xóa đã chọn ({selectedCount})</button>
          <button type="button" onClick={onSelectAll} className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700">Chọn tất cả</button>
          <button type="button" onClick={onClearSelection} className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700">Bỏ chọn</button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <strong className="text-xs text-slate-500">{resultCount.toLocaleString('vi-VN')} kết quả</strong>
          <button type="button" onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-brand-hover"><Plus className="h-4 w-4" /> {createLabel}</button>
        </div>
      </div>
    </div>
  );
}
