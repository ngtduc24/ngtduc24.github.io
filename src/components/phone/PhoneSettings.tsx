import React, { useState } from 'react';
import { Smartphone, Monitor, EyeOff, Image as ImageIcon, RotateCcw, GraduationCap, BookOpen, Library, MoreHorizontal, GripVertical, ArrowUp, ArrowDown, Lock, Unlock, Sparkles } from 'lucide-react';
import type { AppSettings, ModuleOverride } from '../../types';
import { MODULE_REGISTRY } from '../../lib/modules';
import { phoneMode, phoneUi, PhoneUi, PhoneMode, PHONE_UI_KEY, CTA_TARGETS, NOTI_DEFAULT, PHONE_GRID_SKIP, phoneActIds } from '../../lib/device';
import { NotiBanner } from './PhoneNotifications';
import MediaSourcePicker from '../MediaSourcePicker';
import { PhoneTop, resolveActs } from './PhoneHome';
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
  const mode = ui.imageMode || 'art';
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
        <p className="text-[13px] text-slate-500 mt-1">Chỉnh đầu Trang chủ, băng giới thiệu ở trang Thông báo và cách dùng từng chức năng khi mọi người mở EduGo bằng điện thoại. Mục này chỉ hiện với quản trị viên trên máy tính. Thay đổi được lưu tự động như các mục khác.</p>
      </div>

      {/* Đầu Trang chủ điện thoại */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Đầu Trang chủ (ảnh nền theo mùa, tiêu đề, mô tả)</h3>
                <p className="text-[12px] text-slate-500">Vùng màu phía sau lời chào và 4 nút tròn. Tắt thì đầu trang thu gọn, chỉ còn lời chào và 4 nút tròn trên nền màu hệ thống.</p>
              </div>
              {sw(ui.bannerOn !== false, () => setUi({ bannerOn: ui.bannerOn === false }), 'Bật tắt ảnh nền, tiêu đề, mô tả')}
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
                <textarea rows={2} className={`${field} resize-none ${ui.descOn === false ? 'opacity-40' : ''}`} value={ui.desc ?? ''} onChange={e => setUi({ desc: e.target.value })} placeholder={formState.systemDescription || 'Bài giảng, lớp học, đề Quizz của bạn ở ngay đây.'} />
                <p className="text-[10px] text-slate-400">Để trống thì dùng tiêu đề và mô tả của Trang chủ máy tính.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">Ảnh nền</label>
                <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 w-max">
                  {([['custom', 'Ảnh riêng (theo mùa)'], ['desktop', 'Như Trang chủ máy tính'], ['art', 'Màu hệ thống']] as const).map(([v, l]) => (
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
            </div>
          </div>

          {/* Xem trước trên khung điện thoại */}
          <div className="shrink-0">
            <p className="mb-2 text-[11px] font-bold text-slate-500">Xem trước</p>
            <div className="ph w-[320px] overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-[#f3f6f9] shadow-xl">
              <PhoneTop settings={formState} ui={ui} name="Tên người dùng" unread={1}
                acts={resolveActs(ui, () => true, id => formState.moduleOverrides?.[id]?.label?.trim() || undefined).map(a => ({ key: a.id, label: a.label, icon: a.icon, run: () => {} }))} />
              <div className="ph-grid" style={{ marginBottom: 14 }}><p className="pb-4 text-center text-[11px] text-slate-400">Lưới chức năng</p></div>
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

      {/* 4 nút tròn đầu Trang chủ */}
      <ActsCard formState={formState} ui={ui} setUi={setUi} sw={sw} field={field} />

      {/* Lưới chức năng ở Trang chủ điện thoại */}
      <GridOrderCard formState={formState} ui={ui} setUi={setUi} sw={sw} />

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

// Admin xếp thứ tự lưới chức năng ở Trang chủ điện thoại, khoá vị trí, bật tắt tự xếp theo thói quen.
function GridOrderCard({ formState, ui, setUi, sw }: {
  formState: AppSettings; ui: PhoneUi; setUi: (p: Partial<PhoneUi>) => void;
  sw: (on: boolean, fn: () => void, label: string) => React.ReactNode;
}) {
  const ov = formState.moduleOverrides || {};
  const actIds = phoneActIds(ui);
  const avail = MODULE_REGISTRY.filter(m => !PHONE_GRID_SKIP.has(m.id) && !actIds.includes(m.id) && !ov[m.id]?.hidden && phoneMode(m.id, formState) === 'full');
  const saved = ui.gridOrder || [];
  const ids = avail.map(m => m.id).sort((a, b) => {
    const ia = saved.indexOf(a), ib = saved.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || avail.findIndex(m => m.id === a) - avail.findIndex(m => m.id === b);
  });
  const locks = new Set(ui.gridLock || []);
  const auto = ui.gridAuto !== false;
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids]; const [x] = next.splice(from, 1); next.splice(to, 0, x);
    setUi({ gridOrder: next });
  };
  const toggleLock = (id: string) => {
    const next = new Set(locks); if (next.has(id)) next.delete(id); else next.add(id);
    setUi({ gridOrder: ids, gridLock: [...next] });
  };
  const name = (id: string) => ov[id]?.label?.trim() || MODULE_REGISTRY.find(m => m.id === id)?.label || id;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Lưới chức năng ở Trang chủ</h3>
          <p className="text-[12px] text-slate-500">Kéo thả hoặc bấm mũi tên để xếp thứ tự cho mọi người. 8 chức năng đầu hiện ngay dưới đầu trang, phần còn lại hiện khi bấm mũi tên xem thêm. Chức năng đã nằm ở các nút tròn đầu trang thì không lặp lại trong lưới. Ai không có quyền dùng chức năng nào thì chức năng đó tự bỏ qua.</p>
        </div>
        {(saved.length > 0 || locks.size > 0) && (
          <button type="button" onClick={() => setUi({ gridOrder: [], gridLock: [] })} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-500"><RotateCcw className="h-3 w-3" /> Về mặc định</button>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <div>
            <p className="text-[13px] font-bold text-slate-700">Tự xếp theo thói quen của từng người</p>
            <p className="text-[12px] text-slate-500">{auto
              ? 'Bật. Lúc đầu ai cũng thấy thứ tự bên dưới. Khi một người đã mở các chức năng từ 8 lần trở lên, hệ thống đưa chức năng người đó hay dùng lên trước, dựa vào số lần mở, lần mở gần đây và khung giờ hay dùng. Chức năng có khoá luôn đứng đúng vị trí bạn xếp.'
              : 'Tắt. Mọi người luôn thấy đúng thứ tự bên dưới, không thay đổi theo thói quen.'}</p>
          </div>
        </div>
        {sw(auto, () => setUi({ gridAuto: !auto }), 'Bật tắt tự xếp theo thói quen')}
      </div>

      <div className="space-y-1.5">
        {ids.map((id, i) => {
          const m = MODULE_REGISTRY.find(x => x.id === id)!; const Icon = m.icon; const locked = locks.has(id);
          return (
            <React.Fragment key={id}>
              {i === 8 && <div className="flex items-center gap-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />Hiện khi bấm xem thêm<span className="h-px flex-1 bg-slate-200" /></div>}
              <div draggable onDragStart={e => { setDrag(id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={e => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver(o => (o === i ? null : o))}
                onDrop={e => { e.preventDefault(); if (drag) move(ids.indexOf(drag), i); setDrag(null); setOver(null); }}
                onDragEnd={() => { setDrag(null); setOver(null); }}
                className={`flex items-center gap-3 rounded-xl border px-2 py-2 transition-colors ${over === i && drag && drag !== id ? 'border-brand bg-brand-light' : 'border-slate-100 bg-white'} ${drag === id ? 'opacity-40' : ''}`}>
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
                <span className={`w-5 shrink-0 text-center text-[11px] font-black ${i < 8 ? 'text-brand' : 'text-slate-400'}`}>{i + 1}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">{name(id)}</span>
                <button type="button" onClick={() => toggleLock(id)} title={locked ? 'Đang khoá vị trí, bấm để mở khoá' : 'Khoá vị trí này, thói quen không đẩy đi'}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${locked ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                  {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{locked ? 'Cố định' : 'Khoá'}</span>
                </button>
                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} title="Lên trên" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={i === ids.length - 1} onClick={() => move(i, i + 1)} title="Xuống dưới" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Admin chọn chức năng và tên cho các nút tròn đầu Trang chủ điện thoại. Người dùng không có quyền chức năng nào
// thì ô đó tự lấy chức năng mặc định kế tiếp (Lớp học, Giáo trình, Bài tập, Bài giảng...).
function ActsCard({ formState, ui, setUi, sw, field }: {
  formState: AppSettings; ui: PhoneUi; setUi: (p: Partial<PhoneUi>) => void;
  sw: (on: boolean, fn: () => void, label: string) => React.ReactNode; field: string;
}) {
  const moreOn = ui.moreOn !== false;
  const n = moreOn ? 3 : 4;
  const def = resolveActs({ moreOn: ui.moreOn, acts: ui.acts }, () => true, () => undefined).filter(a => a.id !== 'all_features');
  const cur = Array.from({ length: n }, (_, i) => ui.acts?.[i] || { id: '' });
  const ov = formState.moduleOverrides || {};
  const opts = MODULE_REGISTRY.filter(m => !PHONE_GRID_SKIP.has(m.id) && !ov[m.id]?.hidden);
  const setSlot = (i: number, patch: { id?: string; label?: string }) => {
    const next = Array.from({ length: n }, (_, k) => ({ ...(ui.acts?.[k] || { id: '' }) }));
    next[i] = { ...next[i], ...patch };
    setUi({ acts: next });
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Nút tròn đầu Trang chủ</h3>
          <p className="text-[12px] text-slate-500">Chọn chức năng và đặt tên ngắn cho từng nút. Để trống ô nào thì dùng mặc định. Ai không có quyền dùng chức năng đã chọn thì nút đó tự đổi sang chức năng khác người đó dùng được.</p>
        </div>
        {(ui.acts?.some(a => a?.id) || ui.moreOn === false || ui.moreLabel) && (
          <button type="button" onClick={() => setUi({ acts: [], moreOn: true, moreLabel: '' })} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-500"><RotateCcw className="h-3 w-3" /> Về mặc định</button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cur.map((a, i) => (
          <div key={i} className="space-y-1.5 rounded-xl border border-slate-100 p-3">
            <label className="text-[11px] font-bold text-slate-500">Nút {i + 1}</label>
            <select className={field} value={a.id || ''} onChange={e => setSlot(i, { id: e.target.value })}>
              <option value="">Mặc định ({def[i]?.label || 'tự chọn'})</option>
              {opts.map(m => <option key={m.id} value={m.id}>{ov[m.id]?.label?.trim() || m.label}</option>)}
            </select>
            <input className={field} value={a.label || ''} disabled={!a.id} onChange={e => setSlot(i, { label: e.target.value })} placeholder={a.id ? 'Tên hiện dưới nút, để trống thì dùng tên chức năng' : 'Chọn chức năng trước'} maxLength={14} />
          </div>
        ))}
      </div>
      <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[13px] font-bold text-slate-700">Nút cuối là Khác (mở Tất cả chức năng)</p>
          <p className="text-[12px] text-slate-500">{moreOn ? 'Bật. Có 3 nút chức năng và nút cuối mở danh sách tất cả chức năng.' : 'Tắt. Cả 4 nút đều là chức năng bạn chọn.'}</p>
          {moreOn && <input className={field} value={ui.moreLabel || ''} onChange={e => setUi({ moreLabel: e.target.value })} placeholder="Tên nút, mặc định là Khác" maxLength={14} />}
        </div>
        {sw(moreOn, () => setUi({ moreOn: !moreOn }), 'Bật tắt nút Khác')}
      </div>
    </div>
  );
}
