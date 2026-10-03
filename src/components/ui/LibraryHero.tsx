import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, Edit3, Loader2, Plus, RotateCcw, Search, Settings2, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CloudinaryUploadField from '../cms/CloudinaryUploadField';
import { usePhoneMaybe } from '../phone/PhoneShell';
import { PhoneExt, PhoneSearch, PhoneSeg, PhoneChips, PhoneChip, PhoneSheet, PhoneMenuSheet, PhoneMenuItem } from '../phone/PhoneKit';
import { askText } from './Dialogs';

// Nội dung đầu trang do quản trị chỉnh (tiêu đề, mô tả, ảnh nền), lưu chung trên máy chủ để mọi tài khoản đều thấy.
export interface HeroConfig { title?: string; subtitle?: string; image?: string; position?: string }
const heroKey = (k: string) => `edugo_hero:${k}`;
const heroCacheKey = (k: string) => `edugo_hero_cache:${k}`;
const readHeroCache = (k?: string): HeroConfig => { if (!k) return {}; try { return JSON.parse(localStorage.getItem(heroCacheKey(k)) || '{}'); } catch { return {}; } };

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
  // Khoá lưu nội dung đầu trang dùng chung (ví dụ 'assignment_bank', 'elearning') và quyền chỉnh (quản trị).
  configKey?: string;
  canEditBanner?: boolean;
  // Chỉ dùng trên điện thoại: chip trạng thái (Đang soạn, Đã xuất bản...) và các thao tác phụ gom vào nút ba chấm.
  phoneStatus?: { chips: Array<{ id: string; label: string }>; active: string; onChange: (id: string) => void };
  phoneMenu?: PhoneMenuItem[];
}

export function HeroEditor({ cfg, defaults, onClose, onSave }: { cfg: HeroConfig; defaults: { title: string; subtitle?: string }; onClose: () => void; onSave: (c: HeroConfig) => Promise<boolean> }) {
  const [v, setV] = useState<HeroConfig>(cfg);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async (c: HeroConfig) => { setBusy(true); setErr(''); const ok = await onSave(c); setBusy(false); if (ok) onClose(); else setErr('Chưa lưu được, vui lòng thử lại.'); };
  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand focus:bg-white';
  return createPortal(
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-slate-800">Chỉnh đầu trang</p>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500">Thay đổi hiện cho mọi tài khoản sau khi tải lại trang. Để trống ô nào thì dùng nội dung mặc định.</p>
        <label className="block space-y-1"><span className="text-[13px] font-semibold text-slate-600">Tiêu đề</span><input value={v.title || ''} onChange={e => setV({ ...v, title: e.target.value })} placeholder={defaults.title} className={field} /></label>
        <label className="block space-y-1"><span className="text-[13px] font-semibold text-slate-600">Mô tả</span><input value={v.subtitle || ''} onChange={e => setV({ ...v, subtitle: e.target.value })} placeholder={defaults.subtitle} className={field} /></label>
        <CloudinaryUploadField label="Ảnh nền" value={v.image || ''} onChange={image => setV({ ...v, image })} accept="image/*" resourceType="image" folder="module-banners/library" hint="Ảnh ngang, nên dùng ảnh sáng để chữ dễ đọc." compact />
        {v.image && (
          <label className="block space-y-1"><span className="text-[13px] font-semibold text-slate-600">Vị trí ảnh</span>
            <select value={v.position || 'center'} onChange={e => setV({ ...v, position: e.target.value })} className={field}>
              <option value="center">Giữa</option><option value="top">Trên</option><option value="bottom">Dưới</option><option value="left">Trái</option><option value="right">Phải</option>
            </select>
          </label>
        )}
        {err && <p className="text-[13px] font-semibold text-rose-600">{err}</p>}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button type="button" disabled={busy} onClick={() => save({})} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-slate-500 hover:bg-slate-100"><RotateCcw className="h-4 w-4" /> Về mặc định</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-xl bg-slate-100 px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-200">Huỷ</button>
            <button type="button" disabled={busy} onClick={() => save(v)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lưu</button>
          </div>
        </div>
      </div>
    </div>, document.body);
}

// Đọc và lưu nội dung đầu trang dùng chung theo khoá (tiêu đề, mô tả, ảnh nền do quản trị đặt).
export function useHeroConfig(configKey?: string): [HeroConfig, (c: HeroConfig) => Promise<boolean>] {
  const [cfg, setCfg] = useState<HeroConfig>(() => readHeroCache(configKey));
  useEffect(() => {
    if (!configKey) return;
    supabase.from('portfolio_settings').select('data').eq('key', heroKey(configKey)).maybeSingle().then(({ data }) => {
      const c = (data?.data as HeroConfig) || {};
      setCfg(c);
      try { localStorage.setItem(heroCacheKey(configKey), JSON.stringify(c)); } catch { /* bỏ qua */ }
    }, () => {});
  }, [configKey]);
  const save = async (c: HeroConfig) => {
    if (!configKey) return false;
    const clean: HeroConfig = { title: c.title?.trim() || undefined, subtitle: c.subtitle?.trim() || undefined, image: c.image || undefined, position: c.image ? (c.position || 'center') : undefined };
    const { error } = await supabase.from('portfolio_settings').upsert({ key: heroKey(configKey), data: { ...clean, updatedAt: new Date().toISOString() } });
    if (error) return false;
    setCfg(clean);
    try { localStorage.setItem(heroCacheKey(configKey), JSON.stringify(clean)); } catch { /* bỏ qua */ }
    return true;
  };
  return [cfg, save];
}

export default function LibraryHero(p: LibraryHeroProps) {
  const phone = usePhoneMaybe();
  if (phone) return <LibraryHeroPhone {...p} />;
  return <LibraryHeroDesktop {...p} />;
}

// Điện thoại: nền màu nối liền thanh trên, ô tìm, nhóm Của tôi, Được chia sẻ, Thư viện, dải chip lọc cuộn ngang.
const shortTab = (l: string) => (/của tôi/i.test(l) ? 'Của tôi' : /^được chia sẻ/i.test(l) ? 'Được chia sẻ' : l);
const tabRank = (l: string) => (/của tôi/i.test(l) ? 0 : /chia sẻ/i.test(l) ? 1 : 2);
function LibraryHeroPhone(p: LibraryHeroProps) {
  const [subjOpen, setSubjOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = (p.tabs || []).slice().sort((a, b) => tabRank(a.label) - tabRank(b.label)).map(t => ({ id: t.id, label: shortTab(t.label) }));
  const menu = (p.phoneMenu || []).filter(i => !i.hidden);
  const subj = p.chips.find(c => c.id === p.activeChip && c.id);
  const addSubject = async () => {
    if (!p.onAddChip) return;
    const v = await askText({ title: 'Thêm môn học', placeholder: 'Tên môn mới' } as any);
    if (v && v.trim()) await p.onAddChip(v.trim());
  };
  return (
    <>
      <PhoneExt head>
        <PhoneSearch value={p.search} onChange={p.onSearch} placeholder={p.placeholder}
          right={menu.length ? <button type="button" className="rb" aria-label="Thêm thao tác" onClick={() => setMenuOpen(true)}><MoreHorizontalIcon /></button> : undefined} />
        {tabs.length > 1 && <PhoneSeg tabs={tabs} active={p.activeTab || ''} onTab={id => p.onTab?.(id)} />}
      </PhoneExt>
      {(p.phoneStatus || p.chips.length > 0 || p.onAddChip) && <PhoneChips>
        {p.phoneStatus ? (
          <>
            {p.chips.length > 0 && <PhoneChip caret on={!!subj} onClick={() => setSubjOpen(true)}>{subj ? subj.label : 'Môn học'}</PhoneChip>}
            {p.phoneStatus.chips.map(c => <PhoneChip key={c.id || 'all'} on={p.phoneStatus!.active === c.id} onClick={() => p.phoneStatus!.onChange(c.id)}>{c.label}</PhoneChip>)}
          </>
        ) : (
          <>
            {p.chips.map(c => <PhoneChip key={c.id || 'all'} on={p.activeChip === c.id} count={c.count} onClick={() => p.onChip(c.id)}>{c.label}</PhoneChip>)}
            {p.onAddChip && <PhoneChip onClick={addSubject}>+ Môn mới</PhoneChip>}
          </>
        )}
      </PhoneChips>}
      {subjOpen && (
        <PhoneSheet title="Lọc theo môn học" onClose={() => setSubjOpen(false)}
          footer={p.onAddChip ? <button type="button" className="ph-btn ghost" onClick={() => { setSubjOpen(false); addSubject(); }}><Plus size={18} />Thêm môn học</button> : undefined}>
          <div className="pk-pick">
            {p.chips.map(c => (
              <button key={c.id || 'all'} type="button" className={c.id === p.activeChip ? 'on' : ''} onClick={() => { p.onChip(c.id); setSubjOpen(false); }}>
                <span>{c.label}</span>{typeof c.count === 'number' && <em>{c.count}</em>}
              </button>
            ))}
          </div>
        </PhoneSheet>
      )}
      {menuOpen && <PhoneMenuSheet title="Thao tác" items={menu} onClose={() => setMenuOpen(false)} />}
    </>
  );
}
function MoreHorizontalIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
}

function LibraryHeroDesktop(p: LibraryHeroProps) {
  const [cfg, saveCfg] = useHeroConfig(p.configKey);
  const [editingHero, setEditingHero] = useState(false);
  const title = cfg.title || p.title;
  const subtitle = cfg.subtitle || p.subtitle;
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
      style={cfg.image
        ? { backgroundImage: `url(${cfg.image})`, backgroundSize: 'cover', backgroundPosition: cfg.position || 'center' }
        : { background: 'linear-gradient(135deg, var(--color-brand-light, #ecfdf5) 0%, #f0f9ff 45%, #f5f3ff 100%)' }}>
      {cfg.image && <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-white/55 to-white/70" />}
      <div className="relative">
      {/* Hàng trên: quay lại và nút thao tác */}
      <div className="flex items-center justify-between gap-3">
        {p.onBack ? (
          <button type="button" onClick={p.onBack} title={p.backTitle || 'Quay lại'} aria-label={p.backTitle || 'Quay lại'}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : <span />}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {p.actions}
          {p.canEditBanner && p.configKey && (
            <button type="button" onClick={() => setEditingHero(true)} title="Chỉnh đầu trang (mọi tài khoản đều thấy)" aria-label="Chỉnh đầu trang"
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 text-slate-600 shadow-sm hover:bg-white hover:text-brand"><Settings2 className="h-4 w-4" /></button>
          )}
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-4xl text-center">
        <h1 className="bg-gradient-to-r from-brand via-teal-500 to-sky-600 bg-clip-text pb-1 text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-slate-600 sm:text-base">{subtitle}</p>}

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
      </div>
      {editingHero && <HeroEditor cfg={cfg} defaults={{ title: p.title, subtitle: p.subtitle }} onClose={() => setEditingHero(false)} onSave={saveCfg} />}
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
