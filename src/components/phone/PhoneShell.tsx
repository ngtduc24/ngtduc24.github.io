import React, { createContext, useContext, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { RefreshCw, ChevronLeft, Home, Bell, Plus, LayoutGrid, User, Monitor, Send, CheckCircle2, Loader2, Presentation, BookOpen, CircleCheck, CalendarDays, QrCode, Workflow, ScanLine, Library } from 'lucide-react';
import type { AppSettings, UserAccount } from '../../types';
import { MODULE_REGISTRY, isModuleHidden, resolveModuleMeta, ModuleDef } from '../../lib/modules';
import { canUseModule } from '../../lib/moduleAccess';
import { phoneMode, phoneUi, navGlassStyle, gridGlassVars } from '../../lib/device';
import { setCreateIntent, sendToComputer } from '../../lib/phone';
import { writeSubRoute } from '../../lib/seoConfig';
import { useSidebarTools } from '../../lib/sidebarTools';
import './phone.css';

const QrScanner = lazy(() => import('./QrScanner'));

export type PhoneModule = ModuleDef & { iconUrl?: string; hidden: boolean; beta: boolean };

// Danh sách chức năng tài khoản này được dùng, đã áp tên, mô tả, ảnh icon do admin tuỳ chỉnh.
export function usePhoneModules(user: UserAccount, settings?: AppSettings): PhoneModule[] {
  return useMemo(() => MODULE_REGISTRY
    .filter(m => canUseModule(user, m.id) && !isModuleHidden(m.id, settings) && phoneMode(m.id, settings) !== 'hidden')
    .map(m => resolveModuleMeta(m, settings)), [user, settings]);
}

interface PhoneApi {
  user: UserAccount;
  settings?: AppSettings;
  tab: string;
  unread: number;
  // Mở chức năng (kèm màn hình con). Chức năng chỉ dùng trên máy tính thì hỏi trước.
  open: (id: string, sub?: Record<string, string>) => void;
  openCreate: () => void;
  openScan: () => void;
  // Tên màn đang mở và nút quay lại, cho các chức năng tự vẽ đầu trang riêng (gộp thanh trên vào khối màu của chức năng).
  title: string;
  back: () => void;
}
const Ctx = createContext<PhoneApi | null>(null);
export const usePhone = () => useContext(Ctx)!;
// Dùng trong các chức năng: có giá trị khi đang ở giao diện điện thoại, ngoài ra là null.
export const usePhoneMaybe = () => useContext(Ctx);
// Màn con trong một chức năng (ví dụ trang chi tiết lớp) đăng ký việc nút quay lại trên thanh trên
// đưa về màn trước trong chức năng đó, thay vì rời hẳn chức năng.
let backOverride: (() => void) | null = null;
export function usePhoneBack(fn?: (() => void) | null) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => {
    if (!fn) return;
    const h = () => ref.current?.();
    backOverride = h;
    return () => { if (backOverride === h) backOverride = null; };
  }, [!!fn]); // eslint-disable-line react-hooks/exhaustive-deps
}

// Lưới nút biểu tượng cho các chức năng trên điện thoại (thay dãy nút chữ dài), giống thẻ nhóm ở Tất cả chức năng.
export interface PhoneAction { key: string; label: string; icon: any; onClick: () => void; laptop?: boolean; primary?: boolean }
export function PhoneActionGrid({ title, items }: { title?: string; items: PhoneAction[] }) {
  if (!items.length) return null;
  return (
    <div className="ph-box" style={{ margin: 0 }}>
      {title && <h4>{title}</h4>}
      <div className="ph-apps">
        {items.map(a => { const I = a.icon; return (
          <button key={a.key} type="button" className={`ph-app ${a.laptop ? 'dim' : ''}`} onClick={a.onClick}>
            {a.laptop && <span className="lap"><Monitor /></span>}
            <span className="ph-tile" style={a.primary ? { background: 'var(--ph-brand)', color: '#fff', borderColor: 'transparent' } : undefined}><I /></span>
            <span>{a.label}</span>
          </button>
        ); })}
      </div>
    </div>
  );
}

// Tên ngắn cho ô chức năng trên điện thoại (admin đã đổi tên thì giữ tên admin đặt).
const SHORT_LABEL: Record<string, string> = {
  tasks: 'Công việc', scientific_journals: 'Điểm báo', calculator: 'Tính cỡ mẫu', edu: 'Lớp học', edu_bank: 'Bài tập',
  remier: 'Remier', qr_codes: 'Mã QR', utility_image_resize: 'Phóng to ảnh',
  utility_file_compress: 'Nén file', notifications_admin: 'Phát thông báo', users: 'Người dùng', permissions: 'Phân quyền',
  settings: 'Cấu hình', assistant: 'Trợ lý', scientific_cv: 'Lý lịch KH',
};
export function phoneLabel(m: { id: string; label: string }) {
  const base = MODULE_REGISTRY.find(r => r.id === m.id)?.label;
  return base === m.label && SHORT_LABEL[m.id] ? SHORT_LABEL[m.id] : m.label;
}

// Biểu tượng chức năng: ảnh admin đặt, không có thì dùng biểu tượng mặc định.
export function ModIcon({ m, className }: { m: { icon: any; iconUrl?: string }; className?: string }) {
  if (m.iconUrl) return <img src={m.iconUrl} alt="" className={className} />;
  const I = m.icon; return <I className={className} />;
}

interface Props {
  user: UserAccount;
  settings?: AppSettings;
  tab: string;
  setTab: (t: string) => void;
  unread: number;
  children: React.ReactNode;
  // Màn riêng của điện thoại (Trang chủ, Chức năng, Thông báo, Tài khoản) tự dàn trang, màn khác có lề.
  bare: boolean;
}

export default function PhoneShell({ user, settings, tab, setTab, unread, children, bare }: Props) {
  const mods = usePhoneModules(user, settings);
  const tools = useSidebarTools();
  const [sheet, setSheet] = useState<null | 'create' | { id: string; sub?: Record<string, string> }>(null);
  const [scan, setScan] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('is-phone');
    // Cố định màn hình như ứng dụng: không phóng to khi bấm vào ô nhập, không chụm 2 ngón để thu phóng trang.
    const meta = document.querySelector('meta[name="viewport"]');
    const before = meta?.getAttribute('content') || '';
    meta?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop);
    document.addEventListener('gesturechange', stop);
    return () => {
      document.documentElement.classList.remove('is-phone');
      if (meta) meta.setAttribute('content', before);
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('gesturechange', stop);
    };
  }, []);
  // Chức năng mở hộp thoại hay cửa sổ phủ kín màn hình (cắt ảnh, xem tệp, xác nhận...) thì ẩn thanh dưới,
  // tránh thanh dưới đè lên nút Xong, Lưu của hộp thoại.
  useEffect(() => {
    const check = () => {
      const has = !!document.querySelector('#main-content .fixed.inset-0, body > .fixed.inset-0, body > div:not(#root) > .fixed.inset-0');
      document.documentElement.classList.toggle('ph-overlay', has);
    };
    const mo = new MutationObserver(() => check());
    mo.observe(document.body, { childList: true, subtree: true });
    check();
    return () => { mo.disconnect(); document.documentElement.classList.remove('ph-overlay'); };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('ph-has-tools', !!tools);
    return () => { document.documentElement.classList.remove('ph-has-tools'); };
  }, [tools]);

  // Ngăn xếp các màn đã mở trong phiên này, để nút quay lại ở góc trên trái biết có màn trước hay không.
  const stack = useRef<string[]>([]);
  useEffect(() => {
    const st = stack.current;
    if (st.length > 1 && st[st.length - 2] === tab) st.pop();
    else if (st[st.length - 1] !== tab) st.push(tab);
  }, [tab]);
  const back = () => {
    if (backOverride) { backOverride(); return; }
    if (stack.current.length > 1) window.history.back();
    else go('dashboard');
  };

  // Vùng tai thỏ (thanh trạng thái): tô màu hệ thống cho liền với đầu trang. Màn có đầu trang màu thì để trong suốt,
  // cuộn xuống mới hiện dải màu để chữ giờ, pin không đè lên nội dung.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = (e: Event) => { const t = e.target as HTMLElement; if (t && t.id === 'main-content') setScrolled(t.scrollTop > 8); };
    document.addEventListener('scroll', onScroll, true);
    setScrolled(false);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, [tab]);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const c = (css.getPropertyValue('--color-brand-hover') || '').trim() || '#059669';
    let m = document.querySelector('meta[name="theme-color"]');
    const before = m?.getAttribute('content') ?? null;
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); document.head.appendChild(m); }
    m.setAttribute('content', c);
    // Safari trên iPhone chỉ đo lại màu vùng tai thỏ khi trang đổi nền hoặc cuộn: vào ứng dụng từ màn chào
    // thì gán lại nền trang và nhích cuộn 1 điểm để thanh trạng thái lấy đúng màu hệ thống, không giữ màu tối cũ.
    const h = document.documentElement;
    h.style.backgroundColor = c; document.body.style.backgroundColor = c;
    const t = window.setTimeout(() => { try { window.scrollTo(0, 1); window.scrollTo(0, 0); } catch { /* bỏ qua */ } }, 60);
    return () => { window.clearTimeout(t); h.style.backgroundColor = ''; document.body.style.backgroundColor = ''; if (before === null) m?.remove(); else m?.setAttribute('content', before); };
  }, [settings]);

  const go = (id: string, sub?: Record<string, string>) => {
    if (sub) writeSubRoute(sub);
    setTab(id);
  };
  const glass = navGlassStyle(phoneUi(settings));
  // Kính lỏng cho mọi lưới chức năng: 1 cài đặt của admin, gắn biến lên html để lưới ở mọi màn cùng đổi theo.
  const gg = gridGlassVars(phoneUi(settings));
  useEffect(() => {
    const h = document.documentElement;
    h.classList.toggle('ph-lg', gg.on); h.style.setProperty('--lg-a', gg.a); h.style.setProperty('--lg-b', gg.b);
    return () => { h.classList.remove('ph-lg'); h.style.removeProperty('--lg-a'); h.style.removeProperty('--lg-b'); };
  }, [gg.on, gg.a, gg.b]);
  const curMod = mods.find(m => m.id === tab);
  const title = curMod ? phoneLabel(curMod) : (tab === 'profile' || tab === 'user_profile') ? 'Trang cá nhân' : (tab === 'edu_exam' ? 'Quizz' : MODULE_REGISTRY.find(m => m.id === tab)?.label || 'EduGo');
  const api: PhoneApi = {
    user, settings, tab, unread, title, back,
    open: (id, sub) => { if (phoneMode(id, settings) === 'laptop') setSheet({ id, sub }); else go(id, sub); },
    openCreate: () => setSheet('create'),
    openScan: () => setScan(true),
  };


  const item = (id: string, label: string, Icon: any, on: boolean, badge?: number) => (
    <button type="button" className={`it ${on ? 'on' : ''}`} onClick={() => go(id)} aria-current={on ? 'page' : undefined}>
      <Icon />{label}
      {!!badge && <span className="dot">{badge > 9 ? '9+' : badge}</span>}
    </button>
  );

  return (
    <Ctx.Provider value={api}>
      <div className={`ph ph-root ${bare ? '' : 'ph-in'}`} id="app-root">
        <div className={`ph-sbar ${scrolled || tab === 'all_features' ? 'on' : ''}`} aria-hidden />
        {bare ? null : (
            // Trong chức năng: thanh trên có nút quay lại màn trước, ẩn thanh menu dưới cho rộng chỗ thao tác.
            <header className="ph-appbar">
              <button type="button" className="bk" onClick={back} aria-label="Quay lại màn trước"><ChevronLeft /></button>
              <h1>{title}</h1>
              <button type="button" className="hm" onClick={() => go('dashboard')} aria-label="Về Trang chủ"><Home /></button>
            </header>
          )}
        <PullRefresh className={`ph-main ${bare ? '' : 'ph-mod'} ${tools ? 'ph-tools' : ''}`} disabled={!!tools}>{children}</PullRefresh>

        {tools ? (
          // Màn soạn có công cụ riêng (ví dụ khung thiết kế Bài giảng): thay thanh dưới bằng dải công cụ cuộn ngang.
          <nav className="ph-toolbar">
            {tools.map(t => { const I = t.icon; return <button key={t.id} type="button" className={t.active ? 'on' : ''} onClick={t.onClick}><I />{t.label}</button>; })}
          </nav>
        ) : bare && (
          <nav className={`ph-nav2 ${glass.cls}`} style={glass.style as React.CSSProperties}>
            <span className="gl" aria-hidden />
            <span className="bg"><span className="l" /><svg viewBox="0 0 110 70" aria-hidden><path d="M0 0H10C18 0 20 4 22 10A36 36 0 0 0 88 10C90 4 92 0 100 0H110V70H0Z" /></svg><span className="r" /></span>
            {item('dashboard', 'Trang chủ', Home, tab === 'dashboard')}
            {item('all_features', 'Chức năng', LayoutGrid, tab === 'all_features')}
            <button type="button" className="mid" onClick={() => setSheet('create')}><span className="b"><Plus /></span>Tạo mới</button>
            {item('notifications', 'Thông báo', Bell, tab === 'notifications', unread)}
            {item('me', 'Cá nhân', User, tab === 'me' || tab === 'profile' || tab === 'user_profile')}
          </nav>
        )}

        {sheet === 'create' && <CreateSheet mods={mods} onClose={() => setSheet(null)} onPick={(id, create) => { setSheet(null); if (id === '__scan') { setScan(true); return; } if (create) setCreateIntent(id); api.open(id); }} />}
        {sheet && sheet !== 'create' && (
          <LaptopSheet user={user} mod={mods.find(m => m.id === sheet.id)} id={sheet.id} sub={sheet.sub}
            onClose={() => setSheet(null)} onOpenAnyway={() => { const s = sheet; setSheet(null); go(s.id, s.sub); }} />
        )}
        {scan && <Suspense fallback={null}><QrScanner onClose={() => setScan(false)} /></Suspense>}
      </div>
    </Ctx.Provider>
  );
}

// Bảng Tạo mới: chỉ hiện thứ tài khoản được dùng. Mục có create = true thì mở thẳng màn tạo mới.
const CREATE_ITEMS: { id: string; label: string; icon: any; create: boolean }[] = [
  { id: 'slides', label: 'Bài giảng', icon: Presentation, create: true },
  { id: 'elearning', label: 'Giáo trình', icon: BookOpen, create: true },
  { id: 'tasks', label: 'Công việc', icon: CalendarDays, create: true },
  { id: 'qr_codes', label: 'Mã QR', icon: QrCode, create: true },
  { id: 'automatic', label: 'Quy trình', icon: Workflow, create: true },
];

function CreateSheet({ mods, onClose, onPick }: { mods: PhoneModule[]; onClose: () => void; onPick: (id: string, create: boolean) => void }) {
  const has = new Set(mods.map(m => m.id));
  const list = CREATE_ITEMS.filter(i => has.has(i.id));
  return (
    <div className="ph ph-scrim" onClick={onClose}>
      <div className="ph-sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="Tạo mới">
        <div className="grab" />
        <h3>Tạo mới</h3>
        <p className="s">Chọn thứ bạn muốn tạo. Những thứ soạn lâu nên làm tiếp trên máy tính, điện thoại vẫn mở xem và chia sẻ được.</p>
        <div className="ph-apps">
          {list.map(i => { const I = i.icon; return (
            <button key={i.id} type="button" className="ph-app" onClick={() => onPick(i.id, i.create)}>
              <span className="ph-tile"><I /></span><span>{i.label}</span>
            </button>
          ); })}
          <button type="button" className="ph-app" onClick={() => onPick('__scan', false)}>
            <span className="ph-tile"><ScanLine /></span><span>Quét mã QR</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Chức năng cần máy tính: gửi đường link vào thông báo của chính mình, hoặc vẫn mở trên điện thoại.
function LaptopSheet({ user, mod, id, sub, onClose, onOpenAnyway }: { user: UserAccount; mod?: PhoneModule; id: string; sub?: Record<string, string>; onClose: () => void; onOpenAnyway: () => void }) {
  const label = mod ? phoneLabel(mod) : 'chức năng này';
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const send = async () => {
    setState('sending');
    try { await sendToComputer(user, id, label, sub); setState('sent'); } catch { setState('error'); }
  };
  return (
    <div className="ph ph-scrim" onClick={onClose}>
      <div className="ph-sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label={`${label} dùng trên máy tính`}>
        <div className="grab" />
        <div className="ph-lapico"><Monitor /></div>
        <h3 style={{ textAlign: 'center' }}>{label} dùng trên máy tính</h3>
        <p className="s" style={{ textAlign: 'center' }}>Chức năng này cần màn hình lớn, chuột và bàn phím. EduGo gửi đường link vào thông báo của bạn, lên máy tính mở là vào thẳng.</p>
        <div className="ph-steps">
          <div><i>1</i>Bấm Gửi sang máy tính bên dưới</div>
          <div><i>2</i>Trên máy tính, mở EduGo và bấm chuông thông báo</div>
          <div><i>3</i>Bấm thông báo "Mở {label} trên máy tính"</div>
        </div>
        {state === 'sent' && <div className="ph-ok"><CheckCircle2 />Đã gửi. Thông báo đang chờ bạn trên máy tính.</div>}
        {state === 'error' && <div className="ph-ok" style={{ background: '#fff1f2', color: '#be123c' }}>Chưa gửi được, bạn thử lại sau ít phút.</div>}
        {state === 'sent' ? (
          <button type="button" className="ph-btn" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>Xong</button>
        ) : (
          <button type="button" className="ph-btn" style={{ width: '100%', marginTop: 16 }} disabled={state === 'sending'} onClick={send}>
            {state === 'sending' ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}Gửi sang máy tính
          </button>
        )}
        <button type="button" className="ph-btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={onOpenAnyway}>Vẫn mở trên điện thoại</button>
      </div>
    </div>
  );
}

// Vuốt kéo trang xuống khi đang ở đầu trang để tải lại nội dung (tải lại màn đang mở, không tải lại cả trang web).
function PullRefresh({ className, disabled, children }: { className: string; disabled?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ver, setVer] = useState(0);
  const st = useRef<{ y: number; active: boolean } | null>(null);
  const pullRef = useRef(0);
  const setP = (v: number) => { pullRef.current = v; setPull(v); };
  const LIMIT = 70;
  useEffect(() => {
    const el = ref.current; if (!el || disabled) return;
    const start = (e: TouchEvent) => {
      if (busy || el.scrollTop > 0 || e.touches.length !== 1) { st.current = null; return; }
      // Không bắt khi kéo trong vùng tự cuộn riêng (danh sách ngang, bảng trượt, ô nhập nhiều dòng).
      const t = e.target as HTMLElement;
      if (t.closest('textarea, input, select, [data-no-pull], .ph-hscroll')) { st.current = null; return; }
      st.current = { y: e.touches[0].clientY, active: false };
    };
    const move = (e: TouchEvent) => {
      if (!st.current) return;
      const dy = e.touches[0].clientY - st.current.y;
      if (dy <= 0 || el.scrollTop > 0) { if (st.current.active) setP(0); st.current.active = false; return; }
      st.current.active = true;
      e.preventDefault();
      setP(Math.min(110, dy * 0.5));
    };
    const end = () => {
      const s = st.current; st.current = null;
      if (!s?.active) return;
      if (pullRef.current >= LIMIT) {
        setP(LIMIT); setBusy(true); setVer(v => v + 1);
        window.dispatchEvent(new CustomEvent('edugo:refresh'));
        window.setTimeout(() => { setBusy(false); setP(0); }, 700);
      } else setP(0);
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', end); };
  }, [busy, disabled]);
  const ready = pull >= LIMIT;
  return (
    <main ref={ref as any} id="main-content" className={className} style={{ overscrollBehaviorY: 'contain' }}>
      <div className="ph-ptr" style={{ height: pull, paddingBottom: pull ? 8 : 0, opacity: pull ? 1 : 0, transition: st.current?.active ? 'none' : 'height .25s, opacity .25s' }}>
        <span className={`ic ${busy ? 'spin' : ''}`} style={{ transform: busy ? undefined : `rotate(${pull * 3}deg)` }}><RefreshCw size={18} /></span>
        <small>{busy ? 'Đang tải lại...' : ready ? 'Thả tay để tải lại' : 'Kéo xuống để tải lại'}</small>
      </div>
      <React.Fragment key={ver}>{children}</React.Fragment>
    </main>
  );
}
