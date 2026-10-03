import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookOpen, Globe, Library, ListChecks, Loader2, Presentation, ChevronLeft, Home, Share2, QrCode, Mail, AtSign, Link2, LayoutGrid, List, ImagePlus, FileText } from 'lucide-react';
import type { UserAccount } from '../types';
import { copyText } from './ui/Dialogs';
import { useNotifications } from './NotificationContext';
import { getSeoMeta } from '../lib/seoConfig';
import './profile.css';
import { supabase } from '../lib/supabase';
import { usePerson, loadPeople } from '../lib/people';
import { AvatarImg } from './ui/People';
import { usePhoneMaybe } from './phone/PhoneShell';
import { prettyShareUrl } from '../lib/shareLinks';

type Kind = 'lesson' | 'bank' | 'deck' | 'quiz';
interface Post { key: string; kind: Kind; title: string; at: string; text?: string; cover?: string; href?: string; external?: boolean }

const KIND: Record<Kind, { verb: string; label: string; icon: any; tone: string }> = {
  lesson: { verb: 'đã đăng giáo trình', label: 'Giáo trình', icon: BookOpen, tone: 'bg-orange-50 text-orange-600' },
  bank: { verb: 'đã chia sẻ bài tập', label: 'Bài tập', icon: Library, tone: 'bg-amber-50 text-amber-600' },
  deck: { verb: 'đã đưa bài giảng vào thư viện', label: 'Bài giảng', icon: Presentation, tone: 'bg-violet-50 text-violet-600' },
  quiz: { verb: 'đã chia sẻ đề Quizz', label: 'Đề Quizz', icon: ListChecks, tone: 'bg-sky-50 text-sky-600' },
};

// Bỏ thẻ HTML và rút gọn đoạn giới thiệu ngắn cho bài đăng.
const plain = (s?: string | null) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
const when = (iso: string) => {
  const t = new Date(iso).getTime(); if (!t) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Trang cá nhân công khai: ảnh bìa, ảnh đại diện, tên, Website và dòng thời gian các nội dung đã công khai,
// trình bày như trang đăng bài mạng xã hội. Chỉ hiện thông tin công khai, không có email hay dữ liệu riêng.
export default function UserProfileView({ uid, isMe, onBack, onEditMine, self }: { uid: string; isMe: boolean; onBack: () => void; onEditMine: () => void; self?: UserAccount | null }) {
  const cached = usePerson(uid);
  // Trang của chính mình: lấy thẳng ảnh đại diện, ảnh bìa, tên đang dùng để đổi xong thấy ngay, không chờ danh bạ công khai.
  const person = isMe && self ? { ...(cached || { id: uid, name: '' }), id: uid, name: self.fullName || cached?.name || '', username: self.username || cached?.username,
    avatar: self.avatarUrl || '', avatarPos: self.avatarPosition, cover: self.coverImage || '', coverPos: self.coverImagePosition } : cached;
  const [site, setSite] = useState<{ slug: string; title?: string } | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    loadPeople(true);
    (async () => {
      const { getSiteOfOwner } = await import('../lib/portfolioData');
      const s = await getSiteOfOwner(uid).catch(() => null);
      setSite(s && s.published !== false ? { slug: s.slug, title: s.title } : null);
    })();
    const safe = async <T,>(p: PromiseLike<{ data: T[] | null }>): Promise<T[]> => { try { return (await p).data || []; } catch { return []; } };
    (async () => {
      const [lessons, bank, quizzes, decks] = await Promise.all([
        safe<any>(supabase.from('el_lessons').select('id,title,summary,cover_url,updated_at').eq('owner_id', uid).eq('is_public', true).is('deleted_at', null).order('updated_at', { ascending: false }).limit(40)),
        safe<any>(supabase.from('edu_assignment_bank').select('id,title,content,share_token,updated_at').eq('owner_id', uid).eq('is_public', true).order('updated_at', { ascending: false }).limit(40)),
        safe<any>(supabase.from('quizzes').select('id,title,description,updated_at').eq('owner_id', uid).eq('is_public', true).limit(40)),
        safe<any>(supabase.from('portfolio_settings').select('key, title:data->>title, del:data->>deletedAt, at:data->>updatedAt').like('key', `deck:${uid}:%`).eq('data->>inLibrary', 'true')),
      ]);
      const list: Post[] = [
        ...lessons.map(l => ({ key: `l${l.id}`, kind: 'lesson' as const, title: l.title || 'Giáo trình', at: l.updated_at, text: plain(l.summary), cover: l.cover_url || undefined, href: prettyShareUrl('elview', l.id), external: true })),
        ...bank.map(b => ({ key: `b${b.id}`, kind: 'bank' as const, title: b.title || 'Bài tập', at: b.updated_at, text: plain(b.content), href: b.share_token ? prettyShareUrl('bt', b.share_token) : undefined, external: true })),
        ...decks.filter(d => !d.del).map(d => { const id = String(d.key).split(':')[2]; return { key: `d${id}`, kind: 'deck' as const, title: d.title || 'Bài giảng', at: d.at || '', href: `/?tab=bai-giang&sid=${encodeURIComponent(id)}` }; }),
        ...quizzes.map(q => ({ key: `q${q.id}`, kind: 'quiz' as const, title: q.title || 'Đề Quizz', at: q.updated_at, text: plain(q.description) })),
      ];
      list.sort((a, b) => (new Date(b.at).getTime() || 0) - (new Date(a.at).getTime() || 0));
      setPosts(list);
    })();
  }, [uid]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: posts?.length || 0, lesson: 0, bank: 0, deck: 0, quiz: 0 };
    (posts || []).forEach(p => { c[p.kind]++; });
    return c;
  }, [posts]);
  const shown = (posts || []).filter(p => filter === 'all' || p.kind === filter);
  const phone = usePhoneMaybe();
  const { addNotification } = useNotifications();
  const [mode, setMode] = useState<'list' | 'grid'>('list');
  const [qr, setQr] = useState<string | null>(null);
  const link = `${window.location.origin}/?tab=${getSeoMeta('user_profile').slug}&uid=${encodeURIComponent(uid)}`;
  const siteUrl = site ? `/${site.slug}` : '';
  const copyLink = () => copyText(link).then(ok => addNotification(ok ? 'Đã sao chép link trang cá nhân.' : 'Không sao chép được.', ok ? 'success' : 'error'));
  const share = async () => {
    try { if ((navigator as any).share) { await (navigator as any).share({ title: person?.name || 'Trang cá nhân', url: link }); return; } } catch { return; }
    copyLink();
  };
  const openQr = () => { import('qrcode').then(m => (m.default || m).toDataURL(link, { margin: 1, width: 440 })).then(setQr).catch(() => setQr('')); };
  // Điện thoại: trang tự vẽ băng đầu trang có nút quay lại và về Trang chủ, nên ẩn thanh trên của ứng dụng.
  useEffect(() => {
    if (!phone) return;
    document.documentElement.classList.add('ph-own-head');
    return () => document.documentElement.classList.remove('ph-own-head');
  }, [!!phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = person?.name || 'Người dùng';
  const email = isMe ? self?.email : ''; // email chỉ hiện ở trang của chính mình, người khác không thấy
  const coverStyle = person?.cover ? { backgroundImage: `url(${person.cover})`, backgroundPosition: person.coverPos || '50% 50%' } : undefined;
  const KINDS: Array<{ id: Kind; label: string; icon: any; bg: string; fg: string; grad: string }> = [
    { id: 'lesson', label: 'Giáo trình', icon: BookOpen, bg: '#fff7ed', fg: '#ea580c', grad: 'linear-gradient(135deg,#ea580c,#fb923c)' },
    { id: 'deck', label: 'Bài giảng', icon: Presentation, bg: '#f5f3ff', fg: '#7c3aed', grad: 'linear-gradient(135deg,#7c3aed,#c084fc)' },
    { id: 'bank', label: 'Bài tập', icon: Library, bg: '#fffbeb', fg: '#d97706', grad: 'linear-gradient(135deg,#d97706,#facc15)' },
    { id: 'quiz', label: 'Quizz', icon: ListChecks, bg: '#f0f9ff', fg: '#0284c7', grad: 'linear-gradient(135deg,#0284c7,#38bdf8)' },
  ];
  const kindOf = (k: Kind) => KINDS.find(x => x.id === k)!;
  const pick = (k: 'all' | Kind) => { setFilter(f => (f === k && k !== 'all' ? 'all' : k)); setLimit(12); };
  const thumb = (p: Post, cls: string, tag = true) => {
    const k = kindOf(p.kind); const I = k.icon;
    return <span className={`up-th ${cls}`} style={p.cover ? { backgroundImage: `url(${p.cover})` } : { background: k.grad }}>{!p.cover && <I />}{tag && <i className={`k-${p.kind}`}>{k.label}</i>}</span>;
  };
  const wrap = (p: Post, cls: string, children: React.ReactNode) => p.href
    ? <a key={p.key} href={p.href} target={p.external ? '_blank' : undefined} rel="noreferrer" className={cls}>{children}</a>
    : <div key={p.key} className={cls}>{children}</div>;
  const tabs = (
    <>
      <button type="button" className={filter === 'all' ? 'on' : ''} onClick={() => pick('all')}><LayoutGrid />Tất cả<em>{counts.all}</em></button>
      {KINDS.map(k => { const I = k.icon; return <button key={k.id} type="button" className={filter === k.id ? 'on' : ''} onClick={() => pick(k.id)}><I />{k.label}<em>{counts[k.id]}</em></button>; })}
    </>
  );
  const empty = posts === null
    ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</div>
    : <div className="py-10 text-center text-sm text-slate-400">Chưa có nội dung công khai.</div>;
  const more = shown.length > limit && <button type="button" onClick={() => setLimit(n => n + 12)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand">Xem thêm</button>;
  const qrBox = qr !== null && createPortal(
    <div className="up up-qr" onClick={() => setQr(null)}>
      <div onClick={e => e.stopPropagation()}>
        <b>Mã QR trang cá nhân</b>
        {qr ? <img src={qr} alt="Mã QR trang cá nhân" /> : <p className="py-10">Chưa tạo được mã QR.</p>}
        <p>{link}</p>
        <button type="button" onClick={() => { copyLink(); setQr(null); }}>Sao chép link</button>
      </div>
    </div>, document.body);

  // ===================== ĐIỆN THOẠI =====================
  if (phone) return (
    <div className="up animate-fadeIn">
      <div className={`up-top ${person?.cover ? 'img' : ''}`} style={coverStyle}>
        <div className="up-nv">
          <button type="button" onClick={phone.back} aria-label="Quay lại"><ChevronLeft /></button>
          <b>Trang cá nhân</b>
          <button type="button" onClick={share} aria-label="Chia sẻ trang cá nhân"><Share2 /></button>
          <button type="button" onClick={() => phone.open('dashboard')} aria-label="Về Trang chủ"><Home /></button>
        </div>
        <div className="up-me">
          <span className="up-av"><AvatarImg person={person} size={76} /></span>
          <div className="m">
            <b>{name}</b>
            {person?.username && <span><AtSign />{person.username}</span>}
            {email && <span><Mail />{email}</span>}
          </div>
        </div>
        <div className="up-acts">
          {site && <a href={siteUrl} target="_blank" rel="noreferrer" className="up-pill"><Globe />Website</a>}
          <button type="button" className="up-pill" onClick={copyLink}><Link2 />Sao chép link</button>
          <button type="button" className="up-pill ic" onClick={openQr} aria-label="Mã QR trang cá nhân"><QrCode /></button>
        </div>
      </div>
      <div className="up-grid">
        {KINDS.map(k => { const I = k.icon; return (
          <button key={k.id} type="button" className={filter === k.id ? 'on' : ''} onClick={() => pick(k.id)}>
            <span className="ic" style={{ background: k.bg, color: k.fg }}><I /></span><b>{posts ? counts[k.id] : '–'}</b>{k.label}
          </button>
        ); })}
      </div>
      <div className="up-tabs" style={{ marginTop: 18 }}>{tabs}</div>
      <div className="up-panel">
        <div className="up-vt">
          <small>{shown.length} nội dung công khai</small>
          <span className="tg">
            <button type="button" className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')} aria-label="Xem dạng danh sách"><List /></button>
            <button type="button" className={mode === 'grid' ? 'on' : ''} onClick={() => setMode('grid')} aria-label="Xem dạng lưới ảnh"><LayoutGrid /></button>
          </span>
        </div>
        {!shown.length ? empty : mode === 'list'
          ? shown.slice(0, limit).map(p => wrap(p, 'up-post', <>{thumb(p, '')}<span className="m"><b>{p.title}</b>{p.text && <p>{p.text}</p>}<small>{when(p.at)}</small></span></>))
          : <div className="up-g3">{shown.slice(0, limit).map(p => p.href
              ? <a key={p.key} href={p.href} target={p.external ? '_blank' : undefined} rel="noreferrer" style={p.cover ? { backgroundImage: `url(${p.cover})` } : { background: kindOf(p.kind).grad }}><span>{p.title}</span></a>
              : <div key={p.key} className="t" style={p.cover ? { backgroundImage: `url(${p.cover})` } : { background: kindOf(p.kind).grad }}><span>{p.title}</span></div>)}</div>}
        {more}
      </div>
      <div style={{ height: 24 }} />
      {qrBox}
    </div>
  );

  // ===================== MÁY TÍNH =====================
  const recent = (posts || []).slice(0, 5);
  return (
    <div className="up mx-auto max-w-6xl animate-fadeIn">
      <div className="upd-hero">
        <div className="upd-cover" style={coverStyle}>
          <button type="button" className="back" onClick={onBack} aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></button>
          {isMe && <button type="button" className="edit" onClick={onEditMine}><ImagePlus className="h-4 w-4" />Đổi ảnh bìa</button>}
        </div>
        <div className="upd-id">
          <span className="up-av"><AvatarImg person={person} size={128} /></span>
          <div className="nm">
            <h1>{name}</h1>
            <div className="h">
              {person?.username && <span><AtSign />{person.username}</span>}
              {email && <span><Mail />{email}</span>}
            </div>
          </div>
          <div className="acts">
            {site && <a href={siteUrl} target="_blank" rel="noreferrer" className="upd-btn"><Globe />Website</a>}
            <button type="button" className="upd-btn" onClick={copyLink}><Link2 />Sao chép link</button>
            <button type="button" className="upd-btn" onClick={openQr} aria-label="Mã QR trang cá nhân"><QrCode /></button>
          </div>
        </div>
        <div className="upd-stats">
          {KINDS.map(k => { const I = k.icon; return (
            <button key={k.id} type="button" className={filter === k.id ? 'on' : ''} onClick={() => pick(k.id)}>
              <span className="ic" style={{ background: k.bg, color: k.fg }}><I /></span>
              <span><b>{posts ? counts[k.id] : '–'}</b><span>{k.label}</span></span>
            </button>
          ); })}
        </div>
      </div>
      <div className="upd-cols">
        <div>
          <div className="upd-box">
            <h3>Giới thiệu</h3>
            {person?.username && <div className="row"><AtSign />{person.username}</div>}
            {email && <div className="row"><Mail />{email}</div>}
            {site && <div className="row"><Globe /><a href={siteUrl} target="_blank" rel="noreferrer" className="hover:text-brand">{window.location.host}/{site.slug}</a></div>}
            <div className="row"><FileText />{posts ? `${counts.all} nội dung công khai` : 'Đang tải...'}</div>
          </div>
          {recent.length > 0 && (
            <div className="upd-box">
              <h3>Mới đăng gần đây</h3>
              <div className="upd-mini">
                {recent.map(p => wrap(p, p.href ? '' : 'r', <>{thumb(p, '', false)}<b>{p.title}</b></>))}
              </div>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="up-tabs upd-tabs">{tabs}</div>
          <div className="upd-panel">
            {!shown.length ? empty : <div className="upd-grid">{shown.slice(0, limit).map(p => wrap(p, 'upd-card', <>{thumb(p, '')}<div className="bd"><b>{p.title}</b>{p.text && <p>{p.text}</p>}<small>{when(p.at)}</small></div></>))}</div>}
            {more}
          </div>
        </div>
      </div>
      {qrBox}
    </div>
  );
}
