import React, { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Smartphone, Trash2 } from 'lucide-react';
import MediaSourcePicker from '../MediaSourcePicker';
import { newBannerId, PhoneWelcomeConfig, PhoneWelcomeBanner, getLandingConfig, saveLandingConfig, LandingConfig } from '../../lib/landing';
import PhoneWelcome, { PW_ART, PW_COLORS, PW_DEFAULT_BANNERS, PW_TONES } from './PhoneWelcome';

// Cài đặt màn chào điện thoại khi chưa đăng nhập (Cấu hình hệ thống, mục Trang đầu). Có xem trước ngay bên phải.
const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand focus:bg-white';
const range = 'w-full accent-[var(--color-brand,#10b981)]';

export default function PhoneWelcomeSettings({ value, onChange }: { value: PhoneWelcomeConfig | undefined; onChange: (v: PhoneWelcomeConfig) => void }) {
  const c = value || {};
  const set = (patch: Partial<PhoneWelcomeConfig>) => onChange({ ...c, ...patch });
  const banners = c.banners || PW_DEFAULT_BANNERS;
  const setBanners = (list: PhoneWelcomeBanner[]) => set({ banners: list });
  const setB = (id: string, patch: Partial<PhoneWelcomeBanner>) => setBanners(banners.map(b => (b.id === id ? { ...b, ...patch } : b)));
  const moveB = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= banners.length) return; const l = [...banners]; [l[i], l[j]] = [l[j], l[i]]; setBanners(l); };
  const bg = c.bg || 'edugo';
  const sw = (on: boolean, fn: () => void, label: string) => (
    <button type="button" onClick={fn} aria-label={label} aria-pressed={on} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-slate-300'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
  const row = (title: string, sub: string, on: boolean, fn: () => void) => (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3">
      <div><p className="text-[13px] font-semibold text-slate-700">{title}</p><p className="text-[12px] text-slate-500">{sub}</p></div>
      {sw(on, fn, title)}
    </div>
  );

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800"><Smartphone className="h-4 w-4 text-brand" /> Màn chào trên điện thoại</h2>
        <p className="mt-1 text-[13px] text-slate-500">Màn đầu tiên khi mở EduGo bằng điện thoại mà chưa đăng nhập. Ô đăng nhập nằm ngay trên màn hình, bấm chữ đăng ký thì thẻ chuyển sang ô đăng ký tại chỗ.</p>
      </div>
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          {/* Nền */}
          <div className="space-y-2">
            <span className="text-[13px] font-semibold text-slate-600">Ảnh nền</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {Object.entries(PW_ART).map(([k, a]) => (
                <button key={k} type="button" onClick={() => set({ bg: k as any })}
                  className={`relative h-16 overflow-hidden rounded-xl border-2 ${bg === k ? 'border-brand ring-2 ring-brand/20' : 'border-transparent'}`} style={{ background: a.thumb(c.color || '#059669') }}>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 pb-1 pt-3 text-[10px] font-bold text-white">{a.name}</span>
                </button>
              ))}
              <button type="button" onClick={() => c.bgImage && set({ bg: 'image' })}
                className={`relative h-16 overflow-hidden rounded-xl border-2 bg-slate-100 bg-cover bg-center ${bg === 'image' ? 'border-brand ring-2 ring-brand/20' : 'border-dashed border-slate-300'}`}
                style={c.bgImage ? { backgroundImage: `url(${c.bgImage})` } : undefined}>
                <span className={`absolute inset-x-0 bottom-0 px-1 pb-1 pt-3 text-[10px] font-bold ${c.bgImage ? 'bg-gradient-to-t from-black/60 to-transparent text-white' : 'text-slate-500'}`}>Ảnh riêng</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MediaSourcePicker onSelect={url => set({ bgImage: url, bg: 'image' })} accept="image/*" resourceType="image" folder="system/landing" category="Ảnh cấu hình hệ thống" label={c.bgImage ? 'Đổi ảnh riêng' : 'Tải ảnh riêng (ảnh dọc)'} />
              {c.bgImage && <button type="button" onClick={() => set({ bgImage: '', bg: bg === 'image' ? 'edugo' : bg })} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Bỏ ảnh riêng</button>}
              {bg === 'image' && (
                <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold" value={c.bgPosition || 'center'} onChange={e => set({ bgPosition: e.target.value })}>
                  <option value="center">Căn giữa ảnh</option><option value="center top">Phần trên ảnh</option><option value="center bottom">Phần dưới ảnh</option>
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[13px] font-semibold text-slate-600">Độ tối phủ lên nền {c.shade ?? 20}%</span>
              <input type="range" min={0} max={70} value={c.shade ?? 20} onChange={e => set({ shade: Number(e.target.value) })} className={range} />
            </label>
            <div className="space-y-1.5">
              <span className="text-[13px] font-semibold text-slate-600">Màu chủ đạo</span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => set({ color: '' })} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${!c.color ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>Màu hệ thống</button>
                {PW_COLORS.map(col => (
                  <button key={col} type="button" onClick={() => set({ color: col })} aria-label={`Màu ${col}`}
                    className={`h-7 w-7 rounded-full border-[3px] border-white ${c.color === col ? 'ring-2 ring-slate-800' : 'ring-1 ring-slate-200'}`} style={{ background: col }} />
                ))}
              </div>
            </div>
          </div>

          {/* Lời chào */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[13px] font-semibold text-slate-600">Dòng chào nhỏ</span>
              <select className={inputCls} value={c.hiMode || 'auto'} onChange={e => set({ hiMode: e.target.value as any })}>
                <option value="auto">Tự đổi theo giờ (sáng, chiều, tối)</option><option value="fixed">Dùng câu cố định</option>
              </select>
            </label>
            {c.hiMode === 'fixed' && (
              <label className="space-y-1.5">
                <span className="text-[13px] font-semibold text-slate-600">Câu chào cố định</span>
                <input className={inputCls} value={c.hiFixed || ''} onChange={e => set({ hiFixed: e.target.value })} placeholder="Chào mừng bạn" />
              </label>
            )}
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[13px] font-semibold text-slate-600">Câu chào lớn</span>
              <input className={inputCls} value={c.hiBig || ''} onChange={e => set({ hiBig: e.target.value })} placeholder="Học, dạy và nghiên cứu trong một ứng dụng" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[13px] font-semibold text-slate-600">Tiêu đề thẻ đăng nhập</span>
              <input className={inputCls} value={c.cardTitle || ''} onChange={e => set({ cardTitle: e.target.value })} placeholder="Xin chào bạn" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[13px] font-semibold text-slate-600">Dòng phụ thẻ đăng nhập</span>
              <input className={inputCls} value={c.cardSub || ''} onChange={e => set({ cardSub: e.target.value })} placeholder="Đăng nhập để vào lớp học, bài giảng của bạn" />
            </label>
          </div>

          {/* Thẻ đăng nhập */}
          <div>
            {row('Cho phép tự đăng ký', 'Tắt khi trường chỉ cấp tài khoản, dòng mời đăng ký dưới nút Đăng nhập sẽ ẩn', c.allowRegister !== false, () => set({ allowRegister: c.allowRegister === false }))}
            {row('Thẻ đăng nhập kiểu kính mờ', 'Nền phía sau hiện nhoè qua thẻ như trên iPhone', c.glass !== false, () => set({ glass: c.glass === false }))}
            <div className={`grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 ${c.glass === false ? 'pointer-events-none opacity-40' : ''}`}>
              <label className="space-y-1.5">
                <span className="text-[13px] font-semibold text-slate-600">Độ đục của lớp kính {c.glassAlpha ?? 55}%</span>
                <input type="range" min={20} max={95} value={c.glassAlpha ?? 55} onChange={e => set({ glassAlpha: Number(e.target.value) })} className={range} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[13px] font-semibold text-slate-600">Độ nhoè nền phía sau {c.glassBlur ?? 18}px</span>
                <input type="range" min={0} max={40} value={c.glassBlur ?? 18} onChange={e => set({ glassBlur: Number(e.target.value) })} className={range} />
              </label>
            </div>
          </div>

          {/* Banner quảng cáo */}
          <div className="space-y-3">
            {row('Banner quảng cáo phía trên thẻ đăng nhập', 'Tự chuyển sau vài giây, người dùng vuốt được, bấm vào mở link', c.bannersOn !== false, () => set({ bannersOn: c.bannersOn === false }))}
            <div className={`space-y-3 ${c.bannersOn === false ? 'pointer-events-none opacity-40' : ''}`}>
              <label className="block space-y-1.5">
                <span className="text-[13px] font-semibold text-slate-600">Thời gian mỗi banner {c.bannerSec ?? 4} giây</span>
                <input type="range" min={3} max={10} value={c.bannerSec ?? 4} onChange={e => set({ bannerSec: Number(e.target.value) })} className={range} />
              </label>
              {banners.map((b, i) => (
                <div key={b.id} className={`space-y-2 rounded-2xl border border-slate-100 p-3 ${b.on === false ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-12 flex-1 items-center overflow-hidden rounded-xl bg-cover bg-center px-3 text-[12.5px] font-bold text-white"
                      style={b.image ? { backgroundImage: `linear-gradient(90deg,rgba(15,23,42,.6),rgba(15,23,42,.1)),url(${b.image})` } : { background: PW_TONES[(b.tone ?? 0) % PW_TONES.length] }}>
                      <span className="truncate">{b.title || 'Banner chưa có tiêu đề'}</span>
                    </div>
                    {sw(b.on !== false, () => setB(b.id, { on: b.on === false }), 'Bật tắt banner')}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input className={inputCls} value={b.title} onChange={e => setB(b.id, { title: e.target.value })} placeholder="Tiêu đề" />
                    <input className={inputCls} value={b.tag || ''} onChange={e => setB(b.id, { tag: e.target.value })} placeholder="Nhãn nhỏ, ví dụ Khoá học mới" />
                    <input className={`${inputCls} sm:col-span-2`} value={b.sub || ''} onChange={e => setB(b.id, { sub: e.target.value })} placeholder="Dòng mô tả ngắn" />
                    <input className={inputCls} value={b.link || ''} onChange={e => setB(b.id, { link: e.target.value.trim() })} placeholder="Link khi bấm, https://..." />
                    <input className={inputCls} value={b.btn || ''} onChange={e => setB(b.id, { btn: e.target.value })} placeholder="Chữ trên nút, ví dụ Xem ngay" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <MediaSourcePicker onSelect={url => setB(b.id, { image: url })} accept="image/*" resourceType="image" folder="system/landing" category="Ảnh cấu hình hệ thống" label={b.image ? 'Đổi ảnh banner' : 'Tải ảnh banner'} />
                    {b.image && <button type="button" onClick={() => setB(b.id, { image: '' })} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">Bỏ ảnh, dùng màu</button>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">{b.image ? 'Màu dự phòng khi ảnh lỗi' : 'Màu nền banner'}</span>
                    {PW_TONES.map((tn, k) => (
                      <button key={k} type="button" onClick={() => setB(b.id, { tone: k })} aria-label={`Dải màu ${k + 1}`}
                        className={`h-6 w-6 rounded-full ${(b.tone ?? 0) === k ? 'ring-2 ring-slate-800 ring-offset-1' : ''}`} style={{ background: tn }} />
                    ))}
                    <span className="ml-auto flex items-center gap-1">
                      <button type="button" title="Lên trên" onClick={() => moveB(i, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" title="Xuống dưới" onClick={() => moveB(i, 1)} disabled={i === banners.length - 1} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" title="Xoá banner" onClick={() => setBanners(banners.filter(x => x.id !== b.id))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setBanners([...banners, { id: newBannerId(), title: 'Banner mới', sub: 'Nội dung ngắn gọn cho banner', tag: 'Thông báo', tone: banners.length % PW_TONES.length, on: true }])}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand"><Plus className="h-4 w-4" /> Thêm banner</button>
                <button type="button" onClick={() => set({ banners: undefined })} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-500 hover:text-brand"><RotateCcw className="h-3.5 w-3.5" /> Dùng banner mặc định</button>
              </div>
            </div>
          </div>
        </div>

        {/* Xem trước */}
        <div className="ps-pv shrink-0 xl:sticky xl:top-4 xl:self-start">
          <p className="mb-2 text-[11px] font-bold text-slate-500">Xem trước</p>
          <div className="relative h-[700px] w-[340px] overflow-hidden rounded-[40px] border-[8px] border-slate-900 bg-slate-900 shadow-xl">
            <PhoneWelcome preview={c} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Dùng trong Cấu hình hệ thống, mục Giao diện trên điện thoại: tự tải cấu hình trang đầu, sửa phần màn chào, tự lưu sau 1 giây.
// Lưu cùng chỗ với trang đầu (bảng portfolio_settings) vì khách chưa đăng nhập cũng phải đọc được.
// Cấu hình màn chào (lưu cùng chỗ với trang đầu vì khách chưa đăng nhập cũng phải đọc được), tự lưu sau 1 giây.
export function useWelcomeConfig() {
  const [cfg, setCfg] = useState<LandingConfig | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<LandingConfig | null>(null);
  useEffect(() => { getLandingConfig().then(c => { latest.current = c; setCfg(c); }).catch(() => setCfg({ banners: [], defaultApps: [] })); }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const onChange = (phone: PhoneWelcomeConfig) => {
    const next = { ...(latest.current || cfg || { banners: [], defaultApps: [] }), phone }; latest.current = next; setCfg(next); setState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => { try { await saveLandingConfig(next); setState('saved'); } catch { setState('error'); } }, 900);
  };
  return { cfg, state, onChange };
}

export function PhoneWelcomeSettingsBox({ w }: { w: ReturnType<typeof useWelcomeConfig> }) {
  const { cfg, state, onChange } = w;
  if (!cfg) return <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Đang tải màn chào...</div>;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <a href="/?chao=1" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"><ExternalLink className="h-3.5 w-3.5" /> Mở xem thử toàn màn hình</a>
        <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold ${state === 'error' ? 'bg-rose-50 text-rose-600' : state === 'saving' ? 'bg-slate-100 text-slate-500' : 'bg-brand-light text-brand'}`}>
          {state === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</> : state === 'error' ? 'Chưa lưu được, thử lại' : <><Check className="h-3.5 w-3.5" /> Tự động lưu</>}
        </span>
      </div>
      <PhoneWelcomeSettings value={cfg.phone} onChange={onChange} />
    </div>
  );
}
