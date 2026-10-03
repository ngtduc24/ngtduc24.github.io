import React, { useState } from 'react';
import { Home as HomeIcon, LayoutGrid, Plus, Bell, User, Presentation as PresIcon, QrCode as QrIcon, ImageIcon as ImgIcon, FileArchive } from 'lucide-react';
import { Eye, LogIn, CircleDot, PanelBottom } from 'lucide-react';
import { Smartphone, Monitor, EyeOff, Image as ImageIcon, RotateCcw, GraduationCap, BookOpen, Library, MoreHorizontal, GripVertical, ArrowUp, ArrowDown, Lock, Unlock, Sparkles } from 'lucide-react';
import type { AppSettings, ModuleOverride } from '../../types';
import { MODULE_REGISTRY } from '../../lib/modules';
import { phoneMode, phoneUi, PhoneUi, PhoneMode, PHONE_UI_KEY, CTA_TARGETS, NOTI_DEFAULT, PHONE_GRID_SKIP, phoneActIds, navGlassStyle, gridGlassVars } from '../../lib/device';
import { NotiBanner } from './PhoneNotifications';
import { PhoneWelcomeSettingsBox, useWelcomeConfig } from './PhoneWelcomeSettings';
import PhoneWelcome from './PhoneWelcome';
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

  // Chia mục: bên trái chọn từng phần cài đặt, bên phải 1 điện thoại xem trước cố định, đổi theo phần đang chọn
  // và theo mọi thay đổi. Mọi thay đổi tự lưu (cấu hình hệ thống tự lưu sau khi ngừng thao tác, màn chào tự lưu riêng).
  const [sec, setSec] = useState<PsSec>(() => { try { return (sessionStorage.getItem('ps_sec') as PsSec) || 'welcome'; } catch { return 'welcome'; } });
  const pickSec = (s2: PsSec) => { setSec(s2); try { sessionStorage.setItem('ps_sec', s2); } catch { /* bỏ qua */ } };
  const w = useWelcomeConfig();
  // Màn rộng: khung cài đặt vừa khít chiều cao còn lại của màn hình, đầu trang và các thanh chọn mục đứng yên,
  // chỉ phần cài đặt bên trái cuộn, điện thoại xem trước bên phải luôn thấy đủ.
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ h: number; k: number } | null>(null);
  React.useEffect(() => {
    const calc = () => {
      const el = boxRef.current; if (!el) return;
      if (!window.matchMedia('(min-width: 1280px)').matches) { setFit(null); return; }
      let sc: HTMLElement | null = el.parentElement;
      while (sc && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
      const scTop = sc ? sc.getBoundingClientRect().top + sc.scrollTop : 0;
      const top = el.getBoundingClientRect().top + (sc ? sc.scrollTop : window.scrollY) - scTop;
      const viewH = sc ? sc.clientHeight : window.innerHeight;
      const h = Math.max(420, viewH - top - 12);
      setFit({ h, k: Math.min(1, Math.max(0.6, (h - 26) / 720)) });
      if (sc) sc.scrollTop = 0; else window.scrollTo(0, 0);
    };
    calc();
    const t = window.setTimeout(calc, 300);
    window.addEventListener('resize', calc);
    return () => { window.clearTimeout(t); window.removeEventListener('resize', calc); };
  }, []);

  return (
    <div className="space-y-4">
      <style>{'.ps-pv{display:none!important}'}</style>
      <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 shadow-sm text-left">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2"><Smartphone className="w-4 h-4 text-brand" /> Giao diện trên điện thoại</h2>
        <p className="text-[13px] text-slate-500 mt-1">Chọn từng phần ở bên trái, điện thoại bên phải hiện ngay mọi thay đổi. Tất cả tự lưu, không cần bấm nút. Mục này chỉ hiện với quản trị viên trên máy tính.</p>
      </div>
      <div ref={boxRef} className="flex flex-col gap-5 xl:flex-row xl:items-stretch" style={fit ? { height: fit.h } : undefined}>
        <div className={`min-w-0 flex-1 ${fit ? 'flex flex-col gap-4 overflow-hidden' : 'space-y-4'}`}>
          <div className="flex shrink-0 flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1.5">
            {PS_SECS.map(x => { const I = x.icon; const on = sec === x.id; return (
              <button key={x.id} type="button" onClick={() => pickSec(x.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-all ${on ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <I className={`h-4 w-4 ${on ? 'text-brand' : ''}`} />{x.label}
              </button>
            ); })}
          </div>
          {/* Phần cài đặt cuộn riêng (cuộn chuột hoặc kéo), thanh chọn mục và đầu trang đứng yên */}
          <div className={fit ? 'min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-6 pr-1' : 'space-y-4'} style={fit ? { scrollbarWidth: 'thin' } : undefined}>
          {sec === 'welcome' && <PhoneWelcomeSettingsBox w={w} />}
      {/* Đầu Trang chủ điện thoại */}
      {sec === 'banner' && <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left">
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
          <div className="ps-pv shrink-0">
            <p className="mb-2 text-[11px] font-bold text-slate-500">Xem trước</p>
            <div className="ph w-[320px] overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-[#f3f6f9] shadow-xl">
              <PhoneTop settings={formState} ui={ui} name="Tên người dùng" unread={1}
                acts={resolveActs(ui, () => true, id => formState.moduleOverrides?.[id]?.label?.trim() || undefined).map(a => ({ key: a.id, label: a.label, icon: a.icon, run: () => {} }))} />
              <div className="ph-grid" style={{ marginBottom: 14 }}><p className="pb-4 text-center text-[11px] text-slate-400">Lưới chức năng</p></div>
            </div>
          </div>
        </div>
      </div>}

      {/* Băng giới thiệu ở trang Thông báo */}
      {sec === 'noti' && <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left">
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
          <div className="ps-pv shrink-0">
            <p className="mb-2 text-[11px] font-bold text-slate-500">Xem trước</p>
            <div className="ph w-[320px] overflow-hidden rounded-[28px] border-[6px] border-slate-900 bg-[#f3f6f9] shadow-xl">
              <div className="ph-head" style={{ paddingTop: 16 }}><h2>Thông báo</h2></div>
              {ui.notiOn === false ? <p className="bg-white p-4 text-center text-[11px] text-slate-400">Đang tắt băng giới thiệu</p> : <NotiBanner ui={ui} canOpen={() => true} onOpen={() => {}} />}
            </div>
          </div>
        </div>
      </div>}

      {sec === 'acts' && <ActsCard formState={formState} ui={ui} setUi={setUi} sw={sw} field={field} />}
      {sec === 'glass' && <GridGlassCard ui={ui} setUi={setUi} sw={sw} />}
      {sec === 'nav' && <NavGlassCard ui={ui} setUi={setUi} sw={sw} />}
      {sec === 'grid' && <GridOrderCard formState={formState} ui={ui} setUi={setUi} sw={sw} />}

      {/* Cách dùng từng chức năng */}
      {sec === 'modes' && <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left space-y-4">
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
      </div>}
          </div>
        </div>

        {/* Điện thoại xem trước, đứng yên bên phải, tự thu nhỏ cho vừa chiều cao màn hình */}
        <div className="shrink-0" style={fit ? { width: Math.round(350 * fit.k) } : undefined}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Xem trước · {PS_SECS.find(x => x.id === sec)?.label}</p>
          <div style={fit ? { transform: `scale(${fit.k})`, transformOrigin: 'top left', width: 350, height: 720 } : undefined}>
            <PsPreview sec={sec} formState={formState} ui={ui} welcome={w.cfg?.phone} />
          </div>
        </div>
      </div>
    </div>
  );
}

type PsSec = 'welcome' | 'banner' | 'acts' | 'grid' | 'glass' | 'nav' | 'noti' | 'modes';
const PS_SECS: { id: PsSec; label: string; icon: any }[] = [
  { id: 'welcome', label: 'Màn chào', icon: LogIn },
  { id: 'banner', label: 'Đầu Trang chủ', icon: ImageIcon },
  { id: 'acts', label: 'Nút tròn', icon: CircleDot },
  { id: 'grid', label: 'Lưới chức năng', icon: LayoutGrid },
  { id: 'glass', label: 'Kính lỏng', icon: Sparkles },
  { id: 'nav', label: 'Thanh menu dưới', icon: PanelBottom },
  { id: 'noti', label: 'Băng Thông báo', icon: Bell },
  { id: 'modes', label: 'Chức năng trên điện thoại', icon: Smartphone },
];

// Điện thoại xem trước dùng chung: dựng đúng các phần thật (màn chào, đầu Trang chủ, lưới, thanh menu, Thông báo)
// theo cấu hình đang sửa, nên thấy ngay mọi thay đổi.
function PsPreview({ sec, formState, ui, welcome }: { sec: PsSec; formState: AppSettings; ui: PhoneUi; welcome?: any }) {
  const ov = formState.moduleOverrides || {};
  const acts = ui.actsOn === false ? [] : resolveActs(ui, id => phoneMode(id, formState) === 'full' && !ov[id]?.hidden, id => ov[id]?.label?.trim() || undefined);
  const actIds = new Set(acts.map(a => a.id));
  const hide = new Set(ui.gridHide || []);
  const order = ui.gridOrder || [];
  const mods = MODULE_REGISTRY.filter(m => !PHONE_GRID_SKIP.has(m.id) && !actIds.has(m.id) && !hide.has(m.id) && !ov[m.id]?.hidden && phoneMode(m.id, formState) === 'full')
    .sort((a, b) => { const ia = order.indexOf(a.id), ib = order.indexOf(b.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); }).slice(0, 4);
  const gv = gridGlassVars(ui);
  const g = navGlassStyle(ui);
  const frame = 'ph relative h-[720px] w-[350px] overflow-hidden rounded-[44px] border-[9px] border-slate-900 bg-[#f3f6f9] shadow-2xl';
  if (sec === 'welcome') return <div className={frame}><PhoneWelcome preview={welcome || {}} /></div>;
  if (sec === 'noti') return (
    <div className={frame}>
      <div className="ph-head" style={{ paddingTop: 34 }}><h2>Thông báo</h2></div>
      {ui.notiOn === false ? <p className="bg-white p-4 text-center text-[11px] text-slate-400">Đang tắt băng giới thiệu</p> : <NotiBanner ui={ui} canOpen={() => true} onOpen={() => {}} />}
      <div className="space-y-2 p-3">
        {['Trần Minh Anh thêm bạn vào giáo trình', 'Bạn được thêm vào lớp K23', 'Hạn chót công việc sắp tới'].map(t => <div key={t} className="rounded-2xl bg-white px-3 py-3 text-[12px] font-semibold text-slate-600">{t}</div>)}
      </div>
    </div>
  );
  return (
    <div className={`${frame} ${gv.on ? 'ph-lg-demo' : ''}`} style={{ '--lg-a': gv.a, '--lg-b': gv.b } as React.CSSProperties}>
      <div className="h-full overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>
        <PhoneTop settings={formState} ui={ui} name="Tên người dùng" unread={1}
          acts={acts.map(a => ({ key: a.id, label: a.label, icon: a.icon, run: () => {} }))} />
        <div className="ph-grid">
          <div className="ph-apps">
            {mods.map(m => { const I = m.icon; return (
              <span key={m.id} className="ph-app"><span className="ph-ico" style={{ background: 'var(--ph-brand-light)', color: 'var(--ph-brand-hover)' }}><I className="h-6 w-6" /></span><span>{ov[m.id]?.label?.trim() || m.label}</span></span>
            ); })}
          </div>
          <span className="more" style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', marginBottom: -8, color: '#f59e0b' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg></span>
        </div>
        <div className="space-y-2 px-3 pt-4">
          {['Tiếp tục: Bài 5. Nhóm brush tạo khối', '38 bài nộp chờ chấm', 'Lời nhắc: họp khoa 14:00'].map(t => <div key={t} className="rounded-2xl bg-white px-3 py-3 text-[12px] font-semibold text-slate-600">{t}</div>)}
        </div>
      </div>
      <nav className={`ph-nav2 ${g.cls}`} style={{ ...(g.style as React.CSSProperties), position: 'absolute', left: 8, right: 8, bottom: 12, height: 70 }}>
        <span className="gl" aria-hidden />
        <span className="bg"><span className="l" /><svg viewBox="0 0 110 70" aria-hidden><path d="M0 0H10C18 0 20 4 22 10A36 36 0 0 0 88 10C90 4 92 0 100 0H110V70H0Z" /></svg><span className="r" /></span>
        <span className="it on"><HomeIcon />Trang chủ</span>
        <span className="it"><LayoutGrid />Chức năng</span>
        <span className="mid"><span className="b"><Plus /></span>Tạo mới</span>
        <span className="it"><Bell />Thông báo</span>
        <span className="it"><User />Cá nhân</span>
      </nav>
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
  const hidden = new Set(ui.gridHide || []);
  const ids = avail.map(m => m.id).filter(id => !hidden.has(id)).sort((a, b) => {
    const ia = saved.indexOf(a), ib = saved.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || avail.findIndex(m => m.id === a) - avail.findIndex(m => m.id === b);
  });
  const hiddenIds = avail.map(m => m.id).filter(id => hidden.has(id));
  // Ẩn khỏi Trang chủ điện thoại: không có trong lưới và mục nổi bật, vẫn mở được ở Tất cả chức năng.
  const toggleHide = (id: string) => {
    const next = new Set(hidden); if (next.has(id)) next.delete(id); else next.add(id);
    setUi({ gridOrder: ids, gridHide: [...next], gridLock: (ui.gridLock || []).filter(x => !next.has(x)) });
  };
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
          <p className="text-[12px] text-slate-500">Kéo thả hoặc bấm mũi tên để xếp thứ tự cho mọi người, bấm Ẩn để bỏ chức năng khỏi Trang chủ điện thoại (vẫn mở được ở Tất cả chức năng). 4 chức năng đầu hiện ngay dưới đầu trang, 4 chức năng tiếp theo hiện khi bấm mũi tên, phần còn lại nằm ở Tất cả chức năng. Chức năng đã nằm ở các nút tròn đầu trang thì không lặp lại trong lưới. Ai không có quyền dùng chức năng nào thì chức năng đó tự bỏ qua.</p>
        </div>
        {(saved.length > 0 || locks.size > 0 || hidden.size > 0) && (
          <button type="button" onClick={() => setUi({ gridOrder: [], gridLock: [], gridHide: [] })} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-500"><RotateCcw className="h-3 w-3" /> Về mặc định</button>
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
              {(i === 4 || i === 8) && <div className="flex items-center gap-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />{i === 4 ? 'Hiện khi bấm mũi tên' : 'Chỉ có ở Tất cả chức năng'}<span className="h-px flex-1 bg-slate-200" /></div>}
              <div draggable onDragStart={e => { setDrag(id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={e => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver(o => (o === i ? null : o))}
                onDrop={e => { e.preventDefault(); if (drag) move(ids.indexOf(drag), i); setDrag(null); setOver(null); }}
                onDragEnd={() => { setDrag(null); setOver(null); }}
                className={`flex items-center gap-3 rounded-xl border px-2 py-2 transition-colors ${over === i && drag && drag !== id ? 'border-brand bg-brand-light' : 'border-slate-100 bg-white'} ${drag === id ? 'opacity-40' : ''}`}>
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
                <span className={`w-5 shrink-0 text-center text-[11px] font-black ${i < 4 ? 'text-brand' : i < 8 ? 'text-amber-500' : 'text-slate-400'}`}>{i + 1}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">{name(id)}</span>
                <button type="button" onClick={() => toggleLock(id)} title={locked ? 'Đang khoá vị trí, bấm để mở khoá' : 'Khoá vị trí này, thói quen không đẩy đi'}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${locked ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                  {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{locked ? 'Cố định' : 'Khoá'}</span>
                </button>
                <button type="button" onClick={() => toggleHide(id)} title="Ẩn khỏi Trang chủ điện thoại, vẫn có trong Tất cả chức năng"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 hover:bg-slate-50 hover:text-rose-500">
                  <EyeOff className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ẩn</span>
                </button>
                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} title="Lên trên" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" disabled={i === ids.length - 1} onClick={() => move(i, i + 1)} title="Xuống dưới" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
            </React.Fragment>
          );
        })}
        {hiddenIds.length > 0 && <div className="flex items-center gap-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />Đang ẩn khỏi Trang chủ điện thoại ({hiddenIds.length})<span className="h-px flex-1 bg-slate-200" /></div>}
        {hiddenIds.map(id => {
          const m = MODULE_REGISTRY.find(x => x.id === id)!; const Icon = m.icon;
          return (
            <div key={id} className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-2 py-2 opacity-70">
              <span className="w-4" /><span className="w-5" />
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-500"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-500 line-through decoration-slate-300">{name(id)}</span>
              <button type="button" onClick={() => toggleHide(id)} title="Hiện lại trên Trang chủ điện thoại"
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-brand ring-1 ring-brand/30 hover:bg-brand-light">
                <Eye className="h-3.5 w-3.5" /> Hiện lại
              </button>
            </div>
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
        <div className="flex shrink-0 flex-col items-end gap-2">
          {sw(ui.actsOn !== false, () => setUi({ actsOn: ui.actsOn === false }), 'Bật tắt cụm nút tròn')}
          {(ui.acts?.some(a => a?.id) || ui.moreOn === false || ui.moreLabel) && (
            <button type="button" onClick={() => setUi({ acts: [], moreOn: true, moreLabel: '' })} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-500"><RotateCcw className="h-3 w-3" /> Về mặc định</button>
          )}
        </div>
      </div>
      {ui.actsOn === false && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">Đang tắt cụm nút tròn. Các chức năng của nút tròn đã chuyển về lưới phím tắt bên dưới đầu trang.</p>}
      <div className={`grid gap-3 sm:grid-cols-2 ${ui.actsOn === false ? 'pointer-events-none opacity-40' : ''}`}>
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

// Thanh menu dưới ở 4 màn chính trên điện thoại: kiểu kính mờ như iOS, admin chỉnh độ đục và độ nhoè, xem trước ngay.
function NavGlassCard({ ui, setUi, sw }: { ui: PhoneUi; setUi: (p: Partial<PhoneUi>) => void; sw: (on: boolean, fn: () => void, label: string) => React.ReactNode }) {
  const on = ui.navGlass !== false;
  const alpha = ui.navAlpha ?? 62;
  const blur = ui.navBlur ?? 20;
  const g = navGlassStyle(ui);
  const range = 'w-full accent-[var(--color-brand,#10b981)]';
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Thanh menu dưới (kính mờ)</h3>
              <p className="text-[12px] text-slate-500">Thanh Trang chủ, Chức năng, Tạo mới, Thông báo, Cá nhân. Bật kính mờ thì nội dung cuộn phía sau hiện mờ qua thanh như trên iPhone. Tắt thì thanh trắng đặc như trước.</p>
            </div>
            {sw(on, () => setUi({ navGlass: !on }), 'Bật tắt kính mờ')}
          </div>
          <div className={`space-y-4 ${on ? '' : 'pointer-events-none opacity-40'}`}>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-slate-500"><span>Độ đục của lớp kính</span><span className="text-slate-800">{alpha}%</span></div>
              <input type="range" min={10} max={95} value={alpha} onChange={e => setUi({ navAlpha: Number(e.target.value) })} className={range} />
              <p className="text-[10px] text-slate-400">Thấp thì thanh trong hơn, cao thì gần như trắng đặc.</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-slate-500"><span>Độ nhoè nền phía sau</span><span className="text-slate-800">{blur}px</span></div>
              <input type="range" min={0} max={40} value={blur} onChange={e => setUi({ navBlur: Number(e.target.value) })} className={range} />
              <p className="text-[10px] text-slate-400">Cao thì nội dung phía sau nhoè mạnh, chữ trên thanh dễ đọc hơn.</p>
            </div>
            <button type="button" onClick={() => setUi({ navAlpha: undefined, navBlur: undefined })} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-brand"><RotateCcw className="h-3 w-3" /> Về mức mặc định</button>
          </div>
        </div>
        <div className="ps-pv shrink-0">
          <p className="mb-2 text-[11px] font-bold text-slate-500">Xem trước</p>
          <div className="ph relative h-[230px] w-[372px] overflow-hidden rounded-[28px] border-[6px] border-slate-900 shadow-xl"
            style={{ background: 'linear-gradient(160deg,#f1f5f9 0%,#f1f5f9 30%,#fde68a 30%,#fb7185 55%,#818cf8 80%,#34d399 100%)' }}>
            <div className="space-y-2 p-3">
              {['Lời nhắc cho bạn', '38 bài nộp chờ chấm', 'Thiết kế đa truyền thông'].map((t, i) => (
                <div key={t} className="rounded-2xl bg-white/90 px-3 py-2 text-[12px] font-bold text-slate-700" style={{ marginLeft: i * 18 }}>{t}</div>
              ))}
            </div>
            <nav className={`ph-nav2 ${g.cls}`} style={{ ...(g.style as React.CSSProperties), position: 'absolute', left: 8, right: 8, bottom: 10, height: 70 }}>
              <span className="gl" aria-hidden />
              <span className="bg"><span className="l" /><svg viewBox="0 0 110 70" aria-hidden><path d="M0 0H10C18 0 20 4 22 10A36 36 0 0 0 88 10C90 4 92 0 100 0H110V70H0Z" /></svg><span className="r" /></span>
              <span className="it on"><HomeIcon />Trang chủ</span>
              <span className="it"><LayoutGrid />Chức năng</span>
              <span className="mid"><span className="b"><Plus /></span>Tạo mới</span>
              <span className="it"><Bell />Thông báo</span>
              <span className="it"><User />Cá nhân</span>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

// Kính lỏng (Liquid Glass kiểu iOS) cho mọi lưới chức năng trên điện thoại. Chỉnh 1 lưới mẫu, mọi lưới ở mọi màn đổi theo.
function GridGlassCard({ ui, setUi, sw }: { ui: PhoneUi; setUi: (p: Partial<PhoneUi>) => void; sw: (on: boolean, fn: () => void, label: string) => React.ReactNode }) {
  const v = gridGlassVars(ui);
  const alpha = ui.gridAlpha ?? 72;
  const blur = ui.gridBlur ?? 22;
  const range = 'w-full accent-[var(--color-brand,#10b981)]';
  const items = [
    { l: 'Bài giảng', I: PresIcon, bg: '#f5f3ff', fg: '#7c3aed' }, { l: 'Mã QR', I: QrIcon, bg: '#ecfdf5', fg: '#059669' },
    { l: 'Phóng to ảnh', I: ImgIcon, bg: '#eff6ff', fg: '#2563eb' }, { l: 'Nén file', I: FileArchive, bg: '#ecfdf5', fg: '#059669' },
  ];
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Lưới chức năng kiểu kính lỏng (Liquid Glass)</h3>
              <p className="text-[12px] text-slate-500">Chỉnh trên lưới mẫu bên phải, mọi lưới chức năng trên điện thoại đổi theo: Trang chủ, Lớp học, Tất cả chức năng và các lưới thao tác trong từng chức năng. Tắt thì lưới trở lại thẻ trắng đặc.</p>
            </div>
            {sw(v.on, () => setUi({ gridGlass: !v.on }), 'Bật tắt kính lỏng cho lưới chức năng')}
          </div>
          <div className={`space-y-4 ${v.on ? '' : 'pointer-events-none opacity-40'}`}>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-slate-500"><span>Độ đục của lớp kính</span><span className="text-slate-800">{alpha}%</span></div>
              <input type="range" min={20} max={95} value={alpha} onChange={e => setUi({ gridAlpha: Number(e.target.value) })} className={range} />
              <p className="text-[10px] text-slate-400">Thấp thì lưới trong như kính, cao thì gần như trắng đặc.</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-slate-500"><span>Độ nhoè nền phía sau</span><span className="text-slate-800">{blur}px</span></div>
              <input type="range" min={0} max={40} value={blur} onChange={e => setUi({ gridBlur: Number(e.target.value) })} className={range} />
            </div>
            <button type="button" onClick={() => setUi({ gridAlpha: undefined, gridBlur: undefined })} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-brand"><RotateCcw className="h-3 w-3" /> Về mức mặc định</button>
          </div>
        </div>
        <div className="ps-pv shrink-0">
          <p className="mb-2 text-[11px] font-bold text-slate-500">Lưới mẫu</p>
          <div className={`ph relative h-[230px] w-[372px] overflow-hidden rounded-[28px] border-[6px] border-slate-900 shadow-xl ${v.on ? 'ph-lg-demo' : ''}`}
            style={{ '--lg-a': v.a, '--lg-b': v.b, background: 'linear-gradient(180deg,var(--color-brand-hover,#059669) 0%,var(--color-brand,#10b981) 52%,#f1f5f9 52%)' } as React.CSSProperties}>
            <div style={{ position: 'absolute', right: -40, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.14)' }} />
            <div style={{ position: 'absolute', left: 30, top: 70, width: 90, height: 90, borderRadius: '50%', background: '#fbbf24', opacity: .8 }} />
            <div className="ph-grid" style={{ margin: '60px 14px 0' }}>
              <div className="ph-apps">
                {items.map(({ l, I, bg, fg }) => <span key={l} className="ph-app"><span className="ph-ico" style={{ background: bg, color: fg }}><I className="h-6 w-6" /></span><span>{l}</span></span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
