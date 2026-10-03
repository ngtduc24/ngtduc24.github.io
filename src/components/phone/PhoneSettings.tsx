import React from 'react';
import { Smartphone, Monitor, EyeOff, Image as ImageIcon, RotateCcw } from 'lucide-react';
import type { AppSettings, ModuleOverride } from '../../types';
import { MODULE_REGISTRY } from '../../lib/modules';
import { phoneMode, phoneUi, PhoneUi, PhoneMode, PHONE_UI_KEY, CTA_TARGETS, NOTI_DEFAULT } from '../../lib/device';
import { NotiBanner } from './PhoneNotifications';
import MediaSourcePicker from '../MediaSourcePicker';
import { PhoneHero } from './PhoneHome';
import './phone.css';

// Cấu hình hệ thống, mục Điện thoại (chỉ admin, chỉ trên máy tính): băng chào đầu Trang chủ điện thoại
// và cách dùng từng chức năng trên điện thoại. Lưu cùng nút Lưu của trang cấu hình.
export default function PhoneSettings({ formState, setFormState, updateOverride }: {
  formState: AppSettings;
  setFormState: React.Dispatch<React.SetStateAction<AppSettings>>;
  updateOverride: (id: string, patch: Partial<ModuleOverride>) => void;
}) {
  const ui = phoneUi(formState);
  const setUi = (patch: Partial<PhoneUi>) => setFormState(prev => {
    const ov: any = { ...(prev.moduleOverrides || {}) };
    ov[PHONE_UI_KEY] = { ...(ov[PHONE_UI_KEY] || {}), ...patch };
    return { ...prev, moduleOverrides: ov };
  });
  const mode = ui.imageMode || 'desktop';
  const sw = (on: boolean, fn: () => void, label: string) => (
    <button type="button" onClick={fn} aria-label={label} aria-pressed={on}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-slate-300'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
  const field = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand';
  const MODES: { v: PhoneMode; label: string; icon: any; cls: string }[] = [
    { v: 'full', label: 'Dùng đầy đủ', icon: Smartphone, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    { v: 'laptop', label: 'Chỉ trên máy tính', icon: Monitor, cls: 'bg-slate-100 text-slate-700 ring-slate-300' },
    { v: 'hidden', label: 'Ẩn trên điện thoại', icon: EyeOff, cls: 'bg-rose-50 text-rose-600 ring-rose-200' },
  ];
  const groups = [...new Set(MODULE_REGISTRY.map(m => m.group))];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2"><Smartphone className="w-4 h-4 text-brand" /> Giao diện trên điện thoại</h2>
        <p className="text-[13px] text-slate-500 mt-1">Chỉnh băng chào đầu Trang chủ, băng giới thiệu ở trang Thông báo và cách dùng từng chức năng khi mọi người mở EduGo bằng điện thoại. Mục này chỉ hiện với quản trị viên trên máy tính. Thay đổi được lưu tự động như các mục khác.</p>
      </div>

      {/* Băng chào đầu Trang chủ */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Băng chào đầu Trang chủ</h3>
                <p className="text-[12px] text-slate-500">Tắt thì Trang chủ điện thoại bắt đầu ngay từ lời chào và 2 thẻ tóm tắt.</p>
              </div>
              {sw(ui.bannerOn !== false, () => setUi({ bannerOn: ui.bannerOn === false }), 'Bật tắt băng chào')}
            </div>
            <div className={`space-y-4 ${ui.bannerOn === false ? 'pointer-events-none opacity-40' : ''}`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] font-bold text-slate-500">Tiêu đề {ui.titleOn === false && <span className="font-semibold text-rose-500">(đang ẩn)</span>}</label>
                  {sw(ui.titleOn !== false, () => setUi({ titleOn: ui.titleOn === false }), 'Bật tắt tiêu đề')}
                </div>
                <input className={`${field} ${ui.titleOn === false ? 'opacity-40' : ''}`} value={ui.title ?? ''} onChange={e => setUi({ title: e.target.value })} placeholder={formState.dashboardBannerTitle || 'Hôm nay bạn muốn làm gì?'} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] font-bold text-slate-500">Mô tả ngắn {ui.descOn === false && <span className="font-semibold text-rose-500">(đang ẩn)</span>}</label>
                  {sw(ui.descOn !== false, () => setUi({ descOn: ui.descOn === false }), 'Bật tắt mô tả')}
                </div>
                <textarea rows={2} className={`${field} resize-none ${ui.descOn === false ? 'opacity-40' : ''}`} value={ui.desc ?? ''} onChange={e => setUi({ desc: e.target.value })} placeholder={formState.systemDescription || 'Bài giảng, lớp học, đề trắc nghiệm của bạn ở ngay đây.'} />
                <p className="text-[10px] text-slate-400">Để trống thì dùng tiêu đề và mô tả của Trang chủ máy tính.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">Ảnh nền</label>
                <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 w-max">
                  {([['desktop', 'Như Trang chủ máy tính'], ['custom', 'Ảnh riêng'], ['art', 'Hình minh hoạ']] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setUi({ imageMode: v })}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${mode === v ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>{l}</button>
                  ))}
                </div>
                {mode === 'custom' && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {ui.image ? <img src={ui.image} alt="" className="h-14 w-24 rounded-lg object-cover border border-slate-200" /> : <span className="grid h-14 w-24 place-items-center rounded-lg border border-dashed border-slate-300 text-slate-400"><ImageIcon className="h-5 w-5" /></span>}
                    <MediaSourcePicker onSelect={url => setUi({ image: url })} accept="image/*" resourceType="image" folder="system/phone" category="Ảnh cấu hình hệ thống" label="Tải/chọn ảnh"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-hover" />
                    {ui.image && <button type="button" onClick={() => setUi({ image: '' })} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-500"><RotateCcw className="h-3 w-3" /> Bỏ ảnh</button>}
                    <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold" value={ui.position || 'center'} onChange={e => setUi({ position: e.target.value })}>
                      <option value="center">Căn giữa ảnh</option><option value="center top">Phần trên ảnh</option><option value="center bottom">Phần dưới ảnh</option><option value="left center">Bên trái ảnh</option><option value="right center">Bên phải ảnh</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-4">
                <div>
                  <h4 className="text-[13px] font-bold text-slate-800">Nút trên băng chào</h4>
                  <p className="text-[11px] text-slate-500">Người không có quyền dùng chức năng đã chọn sẽ thấy nút Xem tất cả chức năng.</p>
                </div>
                {sw(ui.ctaOn !== false, () => setUi({ ctaOn: ui.ctaOn === false }), 'Bật tắt nút trên băng chào')}
              </div>
              <div className={`grid gap-3 sm:grid-cols-2 ${ui.ctaOn === false ? 'pointer-events-none opacity-40' : ''}`}>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Bấm nút sẽ</label>
                  <select className={field} value={ui.ctaTarget || 'create:slides'} onChange={e => setUi({ ctaTarget: e.target.value })}>
                    {CTA_TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Chữ trên nút</label>
                  <input className={field} value={ui.ctaLabel ?? ''} onChange={e => setUi({ ctaLabel: e.target.value })} placeholder={CTA_TARGETS.find(t => t.value === (ui.ctaTarget || 'create:slides'))?.label} />
                </div>
              </div>
            </div>
          </div>

          {/* Xem trước trên khung điện thoại */}
          <div className="shrink-0">
            <p className="mb-2 text-[11px] font-bold text-slate-500">Xem trước</p>
            <div className="ph w-[320px] overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-[#f3f6f9] shadow-xl">
              <PhoneHero settings={formState} ui={ui} can={() => true} onCta={() => {}} />
              <div className="ph-hello" style={{ paddingBottom: 14 }}>
                <span className="ph-avatar">A</span>
                <div className="txt">Chào buổi sáng<b>Tên người dùng</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Băng giới thiệu ở trang Thông báo */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Băng giới thiệu ở trang Thông báo</h3>
                <p className="text-[12px] text-slate-500">Nằm ngay dưới ô tìm thông báo. Bấm vào băng là mở chức năng đã chọn. Ai không có quyền dùng chức năng đó thì không thấy băng.</p>
              </div>
              {sw(ui.notiOn !== false, () => setUi({ notiOn: ui.notiOn === false }), 'Bật tắt băng giới thiệu')}
            </div>
            <div className={`space-y-4 ${ui.notiOn === false ? 'pointer-events-none opacity-40' : ''}`}>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">Nội dung</label>
                <textarea rows={2} className={`${field} resize-none`} value={ui.notiTitle ?? ''} onChange={e => setUi({ notiTitle: e.target.value })} placeholder={NOTI_DEFAULT.title} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Bấm vào sẽ mở</label>
                  <select className={field} value={ui.notiTarget || NOTI_DEFAULT.target} onChange={e => setUi({ notiTarget: e.target.value })}>
                    {MODULE_REGISTRY.map(m => <option key={m.id} value={m.id}>{formState.moduleOverrides?.[m.id]?.label?.trim() || m.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Chữ trên nhãn nhỏ</label>
                  <input className={field} value={ui.notiBtn ?? ''} onChange={e => setUi({ notiBtn: e.target.value })} placeholder={NOTI_DEFAULT.btn} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">Ảnh bên phải</label>
                <div className="flex flex-wrap items-center gap-3">
                  {ui.notiImage ? <img src={ui.notiImage} alt="" className="h-14 w-14 rounded-lg object-cover border border-slate-200" /> : <span className="text-[11px] text-slate-400">Đang dùng biểu tượng của chức năng</span>}
                  <MediaSourcePicker onSelect={url => setUi({ notiImage: url })} accept="image/*" resourceType="image" folder="system/phone" category="Ảnh cấu hình hệ thống" label="Tải/chọn ảnh"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-hover" />
                  {ui.notiImage && <button type="button" onClick={() => setUi({ notiImage: '' })} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-500"><RotateCcw className="h-3 w-3" /> Dùng biểu tượng</button>}
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <p className="mb-2 text-[11px] font-bold text-slate-500">Xem trước</p>
            <div className="ph w-[320px] overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-[#f3f6f9] shadow-xl">
              <div className="ph-head" style={{ paddingTop: 16 }}><h2>Thông báo</h2></div>
              {ui.notiOn === false ? <p className="bg-white p-4 text-center text-[11px] text-slate-400">Đang tắt băng giới thiệu</p> : <NotiBanner ui={ui} canOpen={() => true} onOpen={() => {}} />}
            </div>
          </div>
        </div>
      </div>

      {/* Cách dùng từng chức năng */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Chức năng trên điện thoại</h3>
          <p className="text-[12px] text-slate-500">Dùng đầy đủ là mở bình thường. Chỉ trên máy tính là làm mờ trong danh sách, bấm vào sẽ đề nghị gửi đường link sang máy tính, người dùng vẫn chọn mở trên điện thoại được. Ẩn trên điện thoại là không hiện ở Trang chủ, Tất cả chức năng và nút Tạo mới khi dùng điện thoại.</p>
        </div>
        {groups.map(g => (
          <div key={g} className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{g}</p>
            {MODULE_REGISTRY.filter(m => m.group === g).map(m => {
              const pm = phoneMode(m.id, formState); const Icon = m.icon;
              const hiddenAll = !!formState.moduleOverrides?.[m.id]?.hidden;
              return (
                <div key={m.id} className={`flex flex-col gap-2 rounded-xl border border-slate-100 px-3 py-2.5 sm:flex-row sm:items-center ${hiddenAll ? 'opacity-50' : ''}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Icon className="h-4 w-4" /></span>
                    <span className="truncate text-[13px] font-bold text-slate-700">{formState.moduleOverrides?.[m.id]?.label?.trim() || m.label}</span>
                    {hiddenAll && <span className="text-[10px] font-bold text-rose-500">Đang ẩn trên mọi thiết bị</span>}
                  </div>
                  <div className="flex gap-1">
                    {MODES.map(x => { const I = x.icon; const on = pm === x.v; return (
                      <button key={x.v} type="button" onClick={() => updateOverride(m.id, { phone: x.v })}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all ${on ? `${x.cls} ring-1` : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                        <I className="h-3.5 w-3.5" />{x.label}
                      </button>
                    ); })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
