import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Image as ImageIcon, LayoutGrid, Loader2, Plus, Trash2, UserPlus, Type } from 'lucide-react';
import MediaSourcePicker from './MediaSourcePicker';
import { MODULE_REGISTRY } from '../lib/modules';
import { getLandingConfig, saveLandingConfig, newBannerId, LandingBanner, LandingConfig, EMPTY_LANDING } from '../lib/landing';
import { setDefaultApps } from '../lib/moduleAccess';

// Cài đặt trang đầu EduGo: nội dung giới thiệu, lưới banner, ứng dụng mặc định cho tài khoản tự đăng ký.
// Thay đổi tự lưu sau khi ngừng gõ 1 giây, giống các mục cài đặt khác.

const ADMIN_ONLY = new Set(['users', 'permissions', 'settings', 'notifications', 'notifications_admin']);
const SIZES: { id: NonNullable<LandingBanner['size']>; label: string }[] = [
  { id: 'normal', label: 'Ô thường' },
  { id: 'wide', label: 'Ngang rộng' },
  { id: 'tall', label: 'Dọc cao' },
  { id: 'big', label: 'Ô lớn' },
];

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand focus:bg-white';

export default function LandingSettings() {
  const [cfg, setCfg] = useState<LandingConfig>(EMPTY_LANDING);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { getLandingConfig().then(c => { setCfg(c); setLoaded(true); }); }, []);

  const update = (next: LandingConfig) => {
    setCfg(next);
    setState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { await saveLandingConfig(next); setDefaultApps(next.defaultApps); setState('saved'); }
      catch { setState('error'); }
    }, 900);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const setBanner = (id: string, patch: Partial<LandingBanner>) => update({ ...cfg, banners: cfg.banners.map(b => (b.id === id ? { ...b, ...patch } : b)) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= cfg.banners.length) return;
    const list = [...cfg.banners]; [list[i], list[j]] = [list[j], list[i]];
    update({ ...cfg, banners: list });
  };
  const toggleApp = (id: string) => {
    const set = new Set(cfg.defaultApps);
    if (set.has(id)) set.delete(id); else set.add(id);
    update({ ...cfg, defaultApps: Array.from(set) });
  };

  const apps = MODULE_REGISTRY.filter(m => !ADMIN_ONLY.has(m.id));

  if (!loaded) return <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Đang tải...</div>;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold ${state === 'error' ? 'bg-rose-50 text-rose-600' : state === 'saving' ? 'bg-slate-100 text-slate-500' : 'bg-brand-light text-brand'}`}>
          {state === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</> : state === 'error' ? 'Chưa lưu được, thử lại' : <><Check className="h-3.5 w-3.5" /> Tự động lưu</>}
        </span>
      </div>

      {/* Nội dung giới thiệu */}
      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800"><Type className="h-4 w-4 text-brand" /> Khối giới thiệu đầu trang</h2>
        <p className="text-[13px] text-slate-500">Ảnh nền dùng chung với ảnh đầu trang Thư viện. Để trống thì dùng câu mặc định.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[13px] font-semibold text-slate-600">Câu giới thiệu chính</span>
            <input value={cfg.heroTitle || ''} onChange={e => update({ ...cfg, heroTitle: e.target.value })} placeholder="Nền tảng học tập và làm việc trực tuyến" className={inputCls} />
          </label>
          <label className="space-y-1.5">
            <span className="text-[13px] font-semibold text-slate-600">Mô tả ngắn</span>
            <input value={cfg.heroDesc || ''} onChange={e => update({ ...cfg, heroDesc: e.target.value })} placeholder="Quản lý lớp học, bài tập, trắc nghiệm..." className={inputCls} />
          </label>
        </div>
      </div>

      {/* Lưới banner */}
      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800"><LayoutGrid className="h-4 w-4 text-brand" /> Banner quảng cáo</h2>
            <p className="mt-1 text-[13px] text-slate-500">Hiện thành lưới bo góc ở trang đầu, theo đúng thứ tự dưới đây. Chọn kích thước ô để lưới đẹp mắt hơn.</p>
          </div>
          <button type="button" onClick={() => update({ ...cfg, banners: [...cfg.banners, { id: newBannerId(), image: '', title: 'Banner mới', size: 'normal' }] })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">
            <Plus className="h-4 w-4" /> Thêm banner
          </button>
        </div>
        {cfg.banners.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-500">Chưa có banner nào. Bấm Thêm banner để bắt đầu.</p>
        ) : (
          <div className="space-y-3">
            {cfg.banners.map((b, i) => (
              <div key={b.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 md:flex-row">
                <div className="w-full shrink-0 space-y-2 md:w-56">
                  <div className="aspect-video overflow-hidden rounded-xl bg-slate-100">
                    {b.image ? <img src={b.image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-400"><ImageIcon className="h-6 w-6" /></div>}
                  </div>
                  <MediaSourcePicker onSelect={url => setBanner(b.id, { image: url })} accept="image/*" resourceType="image" folder="system/landing" category="Ảnh cấu hình hệ thống" label={b.image ? 'Đổi ảnh' : 'Chọn ảnh'} />
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[13px] font-semibold text-slate-600">Tiêu đề</span>
                    <input value={b.title} onChange={e => setBanner(b.id, { title: e.target.value })} className={inputCls} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[13px] font-semibold text-slate-600">Đường link khi bấm</span>
                    <input value={b.link || ''} onChange={e => setBanner(b.id, { link: e.target.value.trim() })} placeholder="https://..." className={inputCls} />
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-[13px] font-semibold text-slate-600">Mô tả ngắn</span>
                    <input value={b.desc || ''} onChange={e => setBanner(b.id, { desc: e.target.value })} className={inputCls} />
                  </label>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <span className="text-[13px] font-semibold text-slate-600">Kích thước</span>
                    {SIZES.map(sz => (
                      <button key={sz.id} type="button" onClick={() => setBanner(b.id, { size: sz.id })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${(b.size || 'normal') === sz.id ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{sz.label}</button>
                    ))}
                    <span className="ml-auto flex items-center gap-1">
                      <button type="button" title="Lên trên" onClick={() => move(i, -1)} disabled={i === 0} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" title="Xuống dưới" onClick={() => move(i, 1)} disabled={i === cfg.banners.length - 1} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" title="Xoá banner" onClick={() => update({ ...cfg, banners: cfg.banners.filter(x => x.id !== b.id) })} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ứng dụng mặc định cho tài khoản mới */}
      <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800"><UserPlus className="h-4 w-4 text-brand" /> Ứng dụng cho tài khoản tự đăng ký</h2>
          <p className="mt-1 text-[13px] text-slate-500">Người tự đăng ký ở trang đầu được dùng ngay các ứng dụng đang bật. Muốn chỉnh riêng một người thì vào Phân quyền người dùng.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map(m => {
            const on = cfg.defaultApps.includes(m.id);
            return (
              <button key={m.id} type="button" onClick={() => toggleApp(m.id)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? 'border-brand/40 bg-brand-light' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="min-w-0 truncate text-sm font-semibold text-slate-700">{m.label}</span>
                <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
