import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Image as ImageIcon, Loader2, Smartphone } from 'lucide-react';
import { PortfolioCourse, CoursePromo, CoursePromoSettings } from '../portfolioTypes';
import { uploadImageToCloudinary } from '../../lib/upload';

export const PROMO_TONES = [
  'linear-gradient(135deg,#065f46,#10b981)', 'linear-gradient(135deg,#7c3aed,#c026d3)', 'linear-gradient(135deg,#ea580c,#f59e0b)',
  'linear-gradient(135deg,#1d4ed8,#0ea5e9)', 'linear-gradient(135deg,#be123c,#f97316)', 'linear-gradient(135deg,#0f172a,#334155)',
];

// Cài đặt banner quảng cáo khoá học ở đầu trang Khoá học trên điện thoại (nằm trong Cài đặt trang Khoá học).
// Mỗi banner gắn với 1 khoá: ảnh riêng hoặc ảnh bìa khoá, nhãn, tiêu đề, mô tả, chữ trên nút Đăng ký.
export default function CoursePromoSettingsBox({ value, courses, onChange }: {
  value?: CoursePromoSettings; courses: PortfolioCourse[]; onChange: (v: CoursePromoSettings) => void;
}) {
  const v: CoursePromoSettings = { on: true, auto: true, items: [], ...(value || {}) };
  const items = v.items || [];
  const set = (patch: Partial<CoursePromoSettings>) => onChange({ ...v, ...patch });
  const setItem = (id: string, patch: Partial<CoursePromo>) => set({ items: items.map(x => (x.id === id ? { ...x, ...patch } : x)) });
  const move = (i: number, d: number) => { const a = [...items]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set({ items: a }); };
  const published = courses.filter(c => c.status === 'published');
  const add = () => set({ items: [...items, { id: `pr_${Date.now()}`, courseId: published[0]?.id || courses[0]?.id || '', tone: items.length % PROMO_TONES.length }] });
  const [busy, setBusy] = useState('');

  const upload = (id: string, file?: File) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = async () => {
      setBusy(id);
      try { const url = await uploadImageToCloudinary(String(r.result), 'Khoá học'); setItem(id, { image: url }); }
      finally { setBusy(''); }
    };
    r.readAsDataURL(file);
  };

  const sw = (on: boolean, flip: () => void) => (
    <button type="button" onClick={flip} className="relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors" style={{ backgroundColor: on ? '#10b981' : '#cbd5e1' }}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
  const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-black text-slate-900"><Smartphone className="h-4 w-4 text-brand" /> Banner quảng cáo khoá học trên điện thoại</h4>
          <p className="mt-1 text-xs font-medium text-slate-500">Hiện ở đầu trang Khoá học trên điện thoại, vuốt ngang để xem các banner, có nút Đăng ký ngay trên banner.</p>
        </div>
        <label className="flex items-center gap-3 text-sm font-bold text-slate-700">Hiện banner {sw(v.on !== false, () => set({ on: v.on === false }))}</label>
      </div>

      {v.on !== false && <>
        <label className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
          <span><span className="block text-sm font-bold text-slate-700">Tự chọn khoá nổi bật khi chưa thêm banner</span>
            <span className="block text-xs text-slate-500">Lấy 3 khoá nhiều học viên nhất mà người xem chưa đăng ký.</span></span>
          {sw(v.auto !== false, () => set({ auto: v.auto === false }))}
        </label>

        <div className="mt-5 space-y-4">
          {items.map((it, i) => {
            const c = courses.find(x => x.id === it.courseId);
            const img = it.image || c?.coverImage;
            return (
              <div key={it.id} className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[220px_1fr] ${it.hidden ? 'border-dashed border-slate-200 opacity-60' : 'border-slate-100'}`}>
                {/* Xem trước banner */}
                <div className="relative h-[124px] overflow-hidden rounded-2xl text-white" style={{ background: PROMO_TONES[(it.tone ?? 0) % PROMO_TONES.length] }}>
                  {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  <span className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
                  <span className="relative block p-3">
                    {it.tag && <span className="inline-block rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase text-slate-900">{it.tag}</span>}
                    <b className="mt-1 line-clamp-2 block text-[13px] leading-tight">{it.title || c?.title || 'Chọn khoá học'}</b>
                    <span className="mt-0.5 line-clamp-1 block text-[10px] opacity-90">{it.sub || c?.briefDescription}</span>
                    <span className="mt-2 inline-block rounded-lg bg-white px-2.5 py-1 text-[10px] font-black text-emerald-700">{it.btn || 'Đăng ký ngay'}</span>
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={it.courseId} onChange={e => setItem(it.id, { courseId: e.target.value })} className={`${input} min-w-0 flex-1`}>
                      {courses.map(x => <option key={x.id} value={x.id}>{x.title}{x.status !== 'published' ? ' (chưa phát hành)' : ''}</option>)}
                    </select>
                    <button type="button" title="Lên" onClick={() => move(i, -1)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" title="Xuống" onClick={() => move(i, 1)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" title={it.hidden ? 'Hiện' : 'Ẩn'} onClick={() => setItem(it.id, { hidden: !it.hidden })} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200">{it.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    <button type="button" title="Xoá banner" onClick={() => set({ items: items.filter(x => x.id !== it.id) })} className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={it.tag || ''} onChange={e => setItem(it.id, { tag: e.target.value })} placeholder="Nhãn nhỏ, ví dụ Mới, Ưu đãi" className={input} />
                    <input value={it.btn || ''} onChange={e => setItem(it.id, { btn: e.target.value })} placeholder="Chữ trên nút (mặc định Đăng ký ngay)" className={input} />
                    <input value={it.title || ''} onChange={e => setItem(it.id, { title: e.target.value })} placeholder="Tiêu đề (để trống dùng tên khoá)" className={`${input} sm:col-span-2`} />
                    <input value={it.sub || ''} onChange={e => setItem(it.id, { sub: e.target.value })} placeholder="Mô tả ngắn (để trống dùng mô tả của khoá)" className={`${input} sm:col-span-2`} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-light px-3 py-2 text-xs font-bold text-brand-hover hover:opacity-90">
                      {busy === it.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}Tải ảnh banner
                      <input type="file" accept="image/*" className="hidden" onChange={e => { upload(it.id, e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    {it.image && <button type="button" onClick={() => setItem(it.id, { image: '' })} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">Dùng ảnh bìa khoá</button>}
                    <span className="ml-1 text-xs font-semibold text-slate-400">Màu nền</span>
                    {PROMO_TONES.map((t, k) => (
                      <button key={k} type="button" onClick={() => setItem(it.id, { tone: k })} className={`h-6 w-6 rounded-full ring-offset-2 ${(it.tone ?? 0) === k ? 'ring-2 ring-slate-800' : ''}`} style={{ background: t }} aria-label={`Màu ${k + 1}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">Ảnh nên nằm ngang, tỉ lệ khoảng 2:1, chữ nằm bên trái nên tránh đặt chi tiết quan trọng ở đó.</p>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={add} disabled={!courses.length} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-brand hover:text-brand disabled:opacity-50">
            <Plus className="h-4 w-4" /> Thêm banner
          </button>
        </div>
      </>}
    </div>
  );
}
