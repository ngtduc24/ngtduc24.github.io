import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, MoreHorizontal, Loader2, ChevronLeft, Home, Library, Users, FolderOpen, Table2, FileText, ListChecks } from 'lucide-react';
import { usePhoneMaybe } from './PhoneShell';
import { AvatarStack } from '../ui/People';

// Bộ khung giao diện điện thoại dùng chung cho các chức năng (Bài giảng, Giáo trình, Bài tập, Điểm báo, Lớp học):
// phần nền màu nối liền thanh trên, ô tìm, nhóm chuyển kho, dải chip lọc cuộn ngang, thẻ có dải màu, nút nổi, bảng dưới.

// Phần nền màu ngay dưới thanh trên (ô tìm kiếm, nhóm Của tôi, Được chia sẻ, Thư viện)
// head: gộp luôn thanh trên của ứng dụng vào khối màu này (nút quay lại, tên chức năng, nút về Trang chủ),
// cả khối đứng yên ở đầu màn khi cuộn, không còn 2 thanh chồng lên nhau.
export function PhoneExt({ children, head, title, still }: { children: React.ReactNode; head?: boolean; title?: string; still?: boolean }) {
  const phone = usePhoneMaybe();
  const own = !!(head && phone);
  useEffect(() => {
    if (!own) return;
    document.documentElement.classList.add('ph-own-head');
    return () => document.documentElement.classList.remove('ph-own-head');
  }, [own]);
  if (!own) return <div className="pk-ext">{children}</div>;
  return (
    <div className={`pk-ext pk-hd ${still ? "" : "st"}`}>
      <div className="nv">
        <button type="button" className="bk" onClick={phone!.back} aria-label="Quay lại"><ChevronLeft /></button>
        <h1>{title || phone!.title}</h1>
        <button type="button" className="hm" onClick={() => phone!.open('dashboard')} aria-label="Về Trang chủ"><Home /></button>
      </div>
      {children}
    </div>
  );
}

export function PhoneSearch({ value, onChange, placeholder, right }: { value: string; onChange: (v: string) => void; placeholder?: string; right?: React.ReactNode }) {
  return (
    <div className="pk-srch">
      <Search />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Tìm kiếm'} enterKeyHint="search" />
      {value && <button type="button" className="clr" aria-label="Xoá tìm kiếm" onClick={() => onChange('')}><X /></button>}
      {right}
    </div>
  );
}

// Thẻ phân trang kiểu bìa hồ sơ: thẻ đang chọn nổi lên, liền khối với phần nội dung bên dưới, 2 bên uốn cong như tab trình duyệt.
// Thẻ chưa chọn nằm trên dải nền nhạt, có biểu tượng và số đếm. Số trong ngoặc ở cuối nhãn, ví dụ "Được chia sẻ (2)", tự tách thành số đếm.
const TAB_ICONS: Record<string, any> = {
  library: Library, shared: Users, mine: FolderOpen, students: Users, grades: Table2, assignments: FileText, quizzes: ListChecks,
};
export function PhoneSeg({ tabs, active, onTab }: { tabs: Array<{ id: string; label: string; icon?: any; count?: number }>; active: string; onTab: (id: string) => void }) {
  return (
    <div className={`pk-ftabs n${tabs.length}`} role="tablist">
      {tabs.map(t => {
        const m = /^(.*?)\s*\((\d+\+?)\)\s*$/.exec(t.label);
        const label = m ? m[1] : t.label;
        const count = t.count ?? (m ? m[2] : undefined);
        const I = t.icon || TAB_ICONS[t.id];
        return (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === active} className={`ft ${t.id === active ? 'on' : ''}`} onClick={() => onTab(t.id)}>
            {I && <I />}<span>{label}</span>{count !== undefined && count !== 0 && <em>{count}</em>}
          </button>
        );
      })}
    </div>
  );
}

export function PhoneChips({ children }: { children: React.ReactNode }) {
  return <div className="pk-chips ph-hscroll-x" data-no-pull>{children}</div>;
}
export function PhoneChip({ on, onClick, children, caret, count }: { on?: boolean; onClick: () => void; children: React.ReactNode; caret?: boolean; count?: number }) {
  return (
    <button type="button" className={`pk-chip ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="t">{children}</span>
      {typeof count === 'number' && <span className="n">{count}</span>}
      {caret && <ChevronDown />}
    </button>
  );
}

export function PhoneMeta({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return <div className="pk-meta"><span>{left}</span>{right}</div>;
}

// Bảng dưới trượt lên
export function PhoneSheet({ title, sub, onClose, children, footer }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="ph ph-scrim fixed inset-0" onClick={onClose}>
      <div className="ph-sheet pk-sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="grab" />
        <h3>{title}</h3>
        {sub && <p className="s">{sub}</p>}
        <div className="pk-sheet-bd">{children}</div>
        {footer && <div className="pk-sheet-ft">{footer}</div>}
      </div>
    </div>, document.body);
}

export interface PhoneMenuItem { key: string; label: string; sub?: string; icon?: any; onClick: () => void; danger?: boolean; hidden?: boolean }
export function PhoneMenuSheet({ title, sub, items, onClose }: { title: string; sub?: string; items: PhoneMenuItem[]; onClose: () => void }) {
  return (
    <PhoneSheet title={title} sub={sub} onClose={onClose}>
      <div className="pk-menu">
        {items.filter(i => !i.hidden).map(i => { const I = i.icon; return (
          <button key={i.key} type="button" className={i.danger ? 'dg' : ''} onClick={() => { onClose(); i.onClick(); }}>
            {I && <span className="ic"><I /></span>}
            <span className="m">{i.label}{i.sub && <small>{i.sub}</small>}</span>
          </button>
        ); })}
      </div>
    </PhoneSheet>
  );
}

// Danh sách lựa chọn 1 giá trị (bộ lọc)
export function PhonePickSheet({ title, options, value, onPick, onClose }: { title: string; options: Array<{ id: string; label: string; count?: number }>; value: string; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <PhoneSheet title={title} onClose={onClose}>
      <div className="pk-pick">
        {options.map(o => (
          <button key={o.id || '_all'} type="button" className={o.id === value ? 'on' : ''} onClick={() => { onPick(o.id); onClose(); }}>
            <span>{o.label}</span>{typeof o.count === 'number' && <em>{o.count}</em>}
          </button>
        ))}
      </div>
    </PhoneSheet>
  );
}

// Nút nổi góc dưới phải. Gắn thẳng vào trang để không bị khung cuộn hay hiệu ứng của chức năng làm lệch chỗ.
export function PhoneFab({ label, icon: I, onClick, busy }: { label: string; icon: any; onClick: () => void; busy?: boolean }) {
  return createPortal(
    <button type="button" className="ph pk-fab" onClick={onClick} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <I />}{label}</button>,
    document.body);
}

// Dải màu theo môn: cùng môn luôn cùng màu
const BANDS = [
  'linear-gradient(135deg,#0f766e,#14b8a6)', 'linear-gradient(135deg,#7c3aed,#c084fc)', 'linear-gradient(135deg,#ea580c,#fb923c)',
  'linear-gradient(135deg,#1d4ed8,#60a5fa)', 'linear-gradient(135deg,#be123c,#fb7185)', 'linear-gradient(135deg,#334155,#64748b)',
  'linear-gradient(135deg,#047857,#34d399)', 'linear-gradient(135deg,#a16207,#facc15)',
];
export function bandOf(seed: string) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return BANDS[h % BANDS.length];
}

export function ago(iso?: string | null) {
  if (!iso) return '';
  const t = new Date(iso).getTime(); if (!t) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 2) return 'hôm qua';
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} ngày trước`;
  const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export type TagTone = 'g' | 'a' | 'r' | 'b' | 'p' | 'n';
export interface CardTag { text: string; tone?: TagTone }

// Thẻ chung cho Bài giảng, Giáo trình, Bài tập: dải màu theo môn, tên, nhãn, người cùng soạn, thời gian sửa.
// Dòng chung cho Bài giảng, Giáo trình, Bài tập: cùng kiểu danh sách lớp học (thẻ trắng, biểu tượng màu hệ thống,
// tên, thông tin phụ, nút ba chấm). Có ảnh bìa thì hiện ảnh nhỏ thay biểu tượng.
export function PhoneLibCard({ kicker, icon: I, cover, title, tags, people, time, onClick, menu, menuTitle, selected }: {
  seed?: string; kicker: string; icon: any; cover?: React.ReactNode; title: string; tags: CardTag[];
  people?: Array<{ id: string; name?: string | null }>; time?: string; onClick: () => void;
  menu?: () => void; menuTitle?: string; footer?: React.ReactNode; selected?: boolean;
}) {
  const owner = people?.[0]?.name;
  const [first, ...rest] = tags;
  return (
    <div className={`pk-li ${selected ? 'sel' : ''}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onClick(); }}>
      {cover ? <span className="thm">{cover}</span> : <span className="ic"><I /></span>}
      <span className="m">
        <b>{title}</b>
        <small>{kicker}{rest.length ? ` · ${rest.map(t => t.text).join(' · ')}` : ''}</small>
        <small className="as">
          {first && <span className={`st ${first.tone || 'n'}`}>{first.text}</span>}
          <span className="t">{[owner, time].filter(Boolean).join(' · ')}</span>
        </small>
      </span>
      {menu ? <button type="button" className="mn2" aria-label={menuTitle || 'Thao tác'} onClick={e => { e.stopPropagation(); menu(); }}><MoreHorizontal /></button> : <ChevronRightIcon />}
    </div>
  );
}
function ChevronRightIcon() {
  return <svg className="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>;
}

export function PhoneList({ children }: { children: React.ReactNode }) {
  return <div className="pk-list"><div className="pk-grp">{children}</div></div>;
}

export function PhoneEmpty({ icon: I, title, sub, action }: { icon: any; title: string; sub?: string; action?: React.ReactNode }) {
  return <div className="pk-empty"><I /><b>{title}</b>{sub && <p>{sub}</p>}{action}</div>;
}

// Nạp thêm khi cuộn gần cuối danh sách (thay cho phân trang trên điện thoại)
export function useMoreOnScroll(total: number, step = 20, reset: unknown[] = []) {
  const [n, setN] = React.useState(step);
  useEffect(() => { setN(step); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, reset);
  useEffect(() => {
    const el = document.getElementById('main-content'); if (!el) return;
    const on = () => { if (el.scrollTop + el.clientHeight > el.scrollHeight - 600) setN(v => (v < total ? v + step : v)); };
    el.addEventListener('scroll', on, { passive: true }); return () => el.removeEventListener('scroll', on);
  }, [total, step]);
  return Math.min(n, total);
}
