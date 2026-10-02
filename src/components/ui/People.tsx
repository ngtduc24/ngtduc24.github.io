import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink } from 'lucide-react';
import { Person, usePerson, usePeopleVersion, getPerson, openProfile, toneOf, initials } from '../../lib/people';

// Ảnh đại diện, tên, thẻ thông tin người dùng dùng chung toàn hệ thống.
// Bấm vào tên hay ảnh thì mở trang cá nhân của người đó, rê chuột thì hiện thẻ có ảnh bìa, ảnh đại diện, tên.

const SIZES = { xs: 20, sm: 24, md: 32, lg: 40, xl: 56 } as const;
type Size = keyof typeof SIZES;

export function AvatarImg({ person, size = 'md', ring }: { person: Person | null; size?: Size | number; ring?: boolean }) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const id = person?.id || person?.name || '?';
  const style: React.CSSProperties = { width: px, height: px, fontSize: Math.max(9, px * 0.42) };
  const cls = `inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white ${ring ? 'ring-2 ring-white' : ''}`;
  if (person?.avatar) return <span className={cls} style={style}><img src={person.avatar} alt={person.name} className="h-full w-full object-cover" style={{ objectPosition: person.avatarPos || '50% 50%' }} /></span>;
  return <span className={cls} style={{ ...style, background: toneOf(id) }}>{initials(person?.name || '?')}</span>;
}

// Thẻ nổi khi rê chuột.
function HoverCard({ person, anchor, onEnter, onLeave }: { person: Person; anchor: DOMRect; onEnter: () => void; onLeave: () => void }) {
  const W = 280;
  const below = anchor.bottom + 230 < window.innerHeight;
  const left = Math.max(8, Math.min(window.innerWidth - W - 8, anchor.left + anchor.width / 2 - W / 2));
  const top = below ? anchor.bottom + 8 : anchor.top - 8;
  return createPortal(
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}
      style={{ position: 'fixed', left, top, width: W, transform: below ? undefined : 'translateY(-100%)', zIndex: 400 }}
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
      <div className="h-20 w-full bg-gradient-to-r from-brand to-brand-hover" style={person.cover ? { backgroundImage: `url(${person.cover})`, backgroundSize: 'cover', backgroundPosition: person.coverPos || '50% 50%' } : undefined} />
      <div className="px-4 pb-4">
        <div className="-mt-8 mb-2"><AvatarImg person={person} size={64} ring /></div>
        <p className="truncate text-base font-bold text-slate-800">{person.name || 'Người dùng'}</p>
        {person.username && <p className="truncate text-xs text-slate-500">@{person.username}</p>}
        {person.role && <p className="mt-0.5 text-xs text-slate-400">{person.role === 'admin' ? 'Quản trị viên' : person.role === 'member' ? 'Học viên' : 'Thành viên'}</p>}
        {person.id && (
          <button onClick={() => openProfile(person.id)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-light py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white">
            <ExternalLink className="h-3.5 w-3.5" /> Xem trang cá nhân
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Bọc một phần tử để rê chuột hiện thẻ, bấm mở trang cá nhân.
export function PersonHover({ person, children, className, clickable = true }: { person: Person | null; children: React.ReactNode; className?: string; clickable?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const t = useRef<any>(null);
  const show = () => { clearTimeout(t.current); t.current = setTimeout(() => { if (ref.current) setRect(ref.current.getBoundingClientRect()); }, 350); };
  const hide = () => { clearTimeout(t.current); t.current = setTimeout(() => setRect(null), 200); };
  useEffect(() => () => clearTimeout(t.current), []);
  if (!person) return <>{children}</>;
  return (
    <span ref={ref} className={`${className || ''} ${clickable && person.id ? 'cursor-pointer' : ''}`} onMouseEnter={show} onMouseLeave={hide}
      onClick={e => { if (!clickable || !person.id) return; e.stopPropagation(); setRect(null); openProfile(person.id); }}>
      {children}
      {rect && <HoverCard person={person} anchor={rect} onEnter={() => clearTimeout(t.current)} onLeave={hide} />}
    </span>
  );
}

// Ảnh và tên một người. showName=false thì chỉ hiện ảnh.
export function UserChip({ id, name, size = 'sm', showName = true, className, nameClass, suffix }: { id?: string | null; name?: string | null; size?: Size | number; showName?: boolean; className?: string; nameClass?: string; suffix?: React.ReactNode }) {
  const person = usePerson(id, name);
  if (!person) return null;
  return (
    <PersonHover person={person} className={`inline-flex min-w-0 items-center gap-1.5 align-middle ${className || ''}`}>
      {size !== 0 && <AvatarImg person={person} size={size} />}
      {showName && <span className={`truncate hover:underline ${nameClass || 'text-xs font-medium text-slate-600'}`}>{person.name}{suffix}</span>}
    </PersonHover>
  );
}

// Nhiều người: chỉ hiện ảnh chồng lên nhau, rê vào từng ảnh hiện thẻ đầy đủ. 1 người thì hiện cả tên.
export function AvatarStack({ people, max = 4, size = 'sm', singleWithName = true, className }: { people: Array<{ id?: string | null; name?: string | null }>; max?: number; size?: Size | number; singleWithName?: boolean; className?: string }) {
  usePeopleVersion();
  const list = people.filter(p => p.id || p.name);
  if (!list.length) return null;
  if (list.length === 1 && singleWithName) return <UserChip id={list[0].id} name={list[0].name} size={size} className={className} />;
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  const px = typeof size === 'number' ? size : SIZES[size];
  return (
    <span className={`inline-flex items-center ${className || ''}`}>
      {shown.map((p, i) => {
        const person = getPerson(p.id, p.name);
        return (
          <PersonHover key={`${p.id || p.name}_${i}`} person={person} className="inline-flex" >
            <span style={{ marginLeft: i ? -px * 0.3 : 0 }} className="inline-flex"><AvatarImg person={person} size={size} ring /></span>
          </PersonHover>
        );
      })}
      {rest > 0 && <span style={{ width: px, height: px, marginLeft: -px * 0.3, fontSize: Math.max(9, px * 0.38) }} className="inline-grid place-items-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white" title={list.slice(max).map(p => getPerson(p.id, p.name)?.name).join(', ')}>+{rest}</span>}
    </span>
  );
}
