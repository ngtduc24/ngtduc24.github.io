import React, { useState } from 'react';
import { ArrowLeft, Check, Edit3, Plus, Search, Trash2, X } from 'lucide-react';

// Đầu trang kiểu kho mẫu (giống trang Mẫu của Canva): câu hỏi lớn, khung tìm kiếm lớn ở giữa,
// hàng thẻ phân loại theo môn học ngay dưới khung tìm kiếm. Dùng chung cho Ngân hàng bài tập và E-Learning.

export interface HeroChip {
  id: string;
  label: string;
  count?: number;
  onRename?: (name: string) => void | Promise<void>;
  onDelete?: () => void;
}

interface LibraryHeroProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backTitle?: string;
  tabs?: Array<{ id: string; label: string; icon?: React.ReactNode }>;
  activeTab?: string;
  onTab?: (id: string) => void;
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  chips: HeroChip[];
  activeChip: string;
  onChip: (id: string) => void;
  onAddChip?: (name: string) => void | Promise<void>;
  actions?: React.ReactNode;
}

export default function LibraryHero(p: LibraryHeroProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const submitAdd = async () => {
    const n = newName.trim();
    if (n && p.onAddChip) await p.onAddChip(n);
    setNewName(''); setAdding(false);
  };
  const submitRename = async (chip: HeroChip) => {
    const n = renameValue.trim();
    if (n && n !== chip.label && chip.onRename) await chip.onRename(n);
    setRenaming(null);
  };

  const chipBase = 'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors';
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100 px-4 pb-7 pt-6 sm:px-8 sm:pb-9"
      style={{ background: 'linear-gradient(135deg, var(--color-brand-light, #ecfdf5) 0%, #f0f9ff 45%, #f5f3ff 100%)' }}>
      {/* Hàng trên: quay lại và nút thao tác */}
      <div className="flex items-center justify-between gap-3">
        {p.onBack ? (
          <button type="button" onClick={p.onBack} title={p.backTitle || 'Quay lại'} aria-label={p.backTitle || 'Quay lại'}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : <span />}
        {p.actions && <div className="flex flex-wrap items-center justify-end gap-2">{p.actions}</div>}
      </div>

      <div className="mx-auto mt-2 max-w-4xl text-center">
        <h1 className="bg-gradient-to-r from-brand via-teal-500 to-sky-600 bg-clip-text pb-1 text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl">{p.title}</h1>
        {p.subtitle && <p className="mt-2 text-sm text-slate-500 sm:text-base">{p.subtitle}</p>}

        {p.tabs && p.tabs.length > 1 && (
          <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
            {p.tabs.map(t => {
              const on = p.activeTab === t.id;
              return (
                <button key={t.id} type="button" onClick={() => p.onTab?.(t.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${on ? 'border-brand/40 bg-white text-brand shadow-sm' : 'border-white/60 bg-white/60 text-slate-600 hover:bg-white'}`}>
                  {t.icon}{t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Khung tìm kiếm lớn */}
        <div className="relative mx-auto mt-5 max-w-3xl">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input value={p.search} onChange={e => p.onSearch(e.target.value)} placeholder={p.placeholder || 'Tìm kiếm...'}
            className="h-14 w-full rounded-2xl border-2 border-brand/30 bg-white pl-14 pr-12 text-base text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:shadow-lg focus:shadow-brand/10" />
          {p.search && (
            <button type="button" onClick={() => p.onSearch('')} aria-label="Xoá tìm kiếm" title="Xoá tìm kiếm"
              className="absolute right-4 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Thẻ phân loại theo môn học */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {p.activeChip && (
            <button type="button" onClick={() => p.onChip('')} aria-label="Bỏ lọc môn" title="Bỏ lọc môn"
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-slate-300">
              <X className="h-4 w-4" />
            </button>
          )}
          {p.chips.map(c => {
            const on = p.activeChip === c.id;
            if (renaming !== null && renaming === c.id) {
              return (
                <span key={c.id} className={`${chipBase} border-brand bg-white pr-1.5`}>
                  <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitRename(c); if (e.key === 'Escape') setRenaming(null); }}
                    onBlur={() => submitRename(c)} className="w-32 bg-transparent text-sm font-semibold text-slate-800 outline-none" />
                  <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => submitRename(c)} className="grid h-7 w-7 place-items-center rounded-full bg-brand text-white"><Check className="h-3.5 w-3.5" /></button>
                </span>
              );
            }
            return (
              <span key={c.id || 'all'} className={`${chipBase} ${on ? 'border-brand/50 bg-brand-light text-brand' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'} ${on && (c.onRename || c.onDelete) ? 'pr-1.5' : ''}`}>
                <button type="button" onClick={() => p.onChip(c.id)} className="inline-flex items-center gap-2">
                  <span className="max-w-[180px] truncate">{c.label}</span>
                  {typeof c.count === 'number' && <span className={`text-xs ${on ? 'text-brand/70' : 'text-slate-400'}`}>{c.count}</span>}
                </button>
                {on && c.onRename && (
                  <button type="button" onClick={() => { setRenaming(c.id); setRenameValue(c.label); }} title="Sửa tên môn" aria-label="Sửa tên môn"
                    className="grid h-7 w-7 place-items-center rounded-full text-brand/70 hover:bg-white hover:text-brand"><Edit3 className="h-3.5 w-3.5" /></button>
                )}
                {on && c.onDelete && (
                  <button type="button" onClick={c.onDelete} title="Xoá môn" aria-label="Xoá môn"
                    className="grid h-7 w-7 place-items-center rounded-full text-brand/70 hover:bg-white hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </span>
            );
          })}
          {p.onAddChip && (adding ? (
            <span className={`${chipBase} border-brand bg-white pr-1.5`}>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tên môn mới"
                onKeyDown={e => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
                className="w-32 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400" />
              <button type="button" onClick={submitAdd} className="grid h-7 w-7 place-items-center rounded-full bg-brand text-white"><Check className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => { setAdding(false); setNewName(''); }} className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>
            </span>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className={`${chipBase} border-dashed border-slate-300 bg-white/70 text-slate-500 hover:border-brand/50 hover:text-brand`}>
              <Plus className="h-4 w-4" /> Môn mới
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// Nút đổi chế độ xem lưới, danh sách dùng chung.
export function ViewToggle({ mode, onChange, gridIcon, listIcon }: { mode: 'grid' | 'table'; onChange: (m: 'grid' | 'table') => void; gridIcon: React.ReactNode; listIcon: React.ReactNode }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      <button type="button" onClick={() => onChange('grid')} title="Dạng lưới" aria-label="Dạng lưới" className={`rounded-lg p-1.5 ${mode === 'grid' ? 'bg-white text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{gridIcon}</button>
      <button type="button" onClick={() => onChange('table')} title="Dạng danh sách" aria-label="Dạng danh sách" className={`rounded-lg p-1.5 ${mode === 'table' ? 'bg-white text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{listIcon}</button>
    </div>
  );
}
