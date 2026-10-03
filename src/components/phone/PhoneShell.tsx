import React, { createContext, useContext, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Home, Bell, Plus, LayoutGrid, User, Monitor, Send, CheckCircle2, Loader2, Presentation, BookOpen, CircleCheck, CalendarDays, QrCode, Workflow, ScanLine, Library } from 'lucide-react';
import type { AppSettings, UserAccount } from '../../types';
import { MODULE_REGISTRY, isModuleHidden, resolveModuleMeta, ModuleDef } from '../../lib/modules';
import { canUseModule } from '../../lib/moduleAccess';
import { phoneMode } from '../../lib/device';
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
}
const Ctx = createContext<PhoneApi | null>(null);
export const usePhone = () => useContext(Ctx)!;
// Dùng trong các chức năng: có giá trị khi đang ở giao diện điện thoại, ngoài ra là null.
export const usePhoneMaybe = () => useContext(Ctx);

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
  edu_question_bank: 'Câu hỏi', remier: 'Remier', qr_codes: 'Mã QR', utility_image_resize: 'Phóng to ảnh',
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
    return () => { document.documentElement.classList.remove('is-phone'); };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('ph-has-tools', !!tools);
    return () => { document.documentElement.classList.remove('ph-has-tools'); };
  }, [tools]);

  const go = (id: string, sub?: Record<string, string>) => {
    if (sub) writeSubRoute(sub);
    setTab(id);
  };
  const api: PhoneApi = {
    user, settings, tab, unread,
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
      <div className="ph ph-root" id="app-root">
        <main id="main-content" className={`ph-main ${bare ? '' : 'ph-mod'} ${tools ? 'ph-tools' : ''}`}>{children}</main>

        {tools ? (
          // Màn soạn có công cụ riêng (ví dụ khung thiết kế Bài giảng): thay thanh dưới bằng dải công cụ cuộn ngang.
          <nav className="ph-toolbar">
            {tools.map(t => { const I = t.icon; return <button key={t.id} type="button" className={t.active ? 'on' : ''} onClick={t.onClick}><I />{t.label}</button>; })}
          </nav>
        ) : (
          <nav className="ph-nav">
            {item('dashboard', 'Trang chủ', Home, tab === 'dashboard')}
            {item('notifications', 'Thông báo', Bell, tab === 'notifications', unread)}
            <button type="button" className="fab" onClick={() => setSheet('create')}><span className="b"><Plus /></span>Tạo mới</button>
            {item('all_features', 'Chức năng', LayoutGrid, tab === 'all_features')}
            {item('me', 'Tài khoản', User, tab === 'me' || tab === 'profile' || tab === 'user_profile')}
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
  { id: 'edu_exam', label: 'Đề trắc nghiệm', icon: CircleCheck, create: true },
  { id: 'tasks', label: 'Công việc', icon: CalendarDays, create: true },
  { id: 'qr_codes', label: 'Mã QR', icon: QrCode, create: true },
  { id: 'automatic', label: 'Quy trình', icon: Workflow, create: true },
  { id: 'edu_question_bank', label: 'Câu hỏi', icon: Library, create: false },
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
