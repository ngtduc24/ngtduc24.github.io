import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Globe, Library, ListChecks, Loader2, Pencil, Presentation, ChevronRight } from 'lucide-react';
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
export default function UserProfileView({ uid, isMe, onBack, onEditMine }: { uid: string; isMe: boolean; onBack: () => void; onEditMine: () => void }) {
  const person = usePerson(uid);
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

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-fadeIn">
      {/* Điện thoại đã có nút quay lại trên thanh trên nên không lặp lại */}
      {!phone && <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand"><ArrowLeft className="h-4 w-4" /> Quay lại</button>}

      {/* Ảnh bìa, ảnh đại diện, tên */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="h-36 w-full bg-gradient-to-r from-brand to-brand-hover sm:h-56" style={person?.cover ? { backgroundImage: `url(${person.cover})`, backgroundSize: 'cover', backgroundPosition: person.coverPos || '50% 50%' } : undefined} />
        <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:px-6">
          <div className="-mt-12 sm:-mt-16"><AvatarImg person={person} size={104} ring /></div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-black leading-tight text-slate-900">{person?.name || 'Người dùng'}</h1>
            {person?.username && <p className="text-sm text-slate-500">@{person.username}</p>}
            {posts && <p className="mt-1 text-xs text-slate-400">{counts.lesson} giáo trình · {counts.deck} bài giảng · {counts.bank} bài tập · {counts.quiz} đề</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {site && <a href={`/${site.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"><Globe className="h-4 w-4" /> Website</a>}
            {isMe && <button onClick={onEditMine} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"><Pencil className="h-4 w-4" /> Cài đặt tài khoản</button>}
          </div>
        </div>
      </div>

      {/* Thẻ lọc dòng thời gian */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {([['all', 'Tất cả'], ['lesson', 'Giáo trình'], ['deck', 'Bài giảng'], ['bank', 'Bài tập'], ['quiz', 'Đề Quizz']] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setFilter(k); setLimit(12); }}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${filter === k ? 'bg-brand-light text-brand' : 'bg-white text-slate-500 border border-slate-100'}`}>
            {l} <span className="opacity-60">{counts[k]}</span>
          </button>
        ))}
      </div>

      {/* Dòng thời gian */}
      {posts === null ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</div>
      ) : !shown.length ? (
        <div className="rounded-3xl border border-slate-100 bg-white py-12 text-center text-sm text-slate-400">Chưa có nội dung công khai.</div>
      ) : (
        <div className="space-y-4">
          {shown.slice(0, limit).map(p => {
            const k = KIND[p.kind]; const Icon = k.icon;
            const body = (
              <>
                <div className="flex items-center gap-3 px-4 pt-4">
                  <AvatarImg person={person} size={40} />
                  <div className="min-w-0 flex-1 text-[13px] leading-snug">
                    <p className="text-slate-600"><b className="font-bold text-slate-900">{person?.name || 'Người dùng'}</b> {k.verb}</p>
                    <p className="text-[12px] text-slate-400">{when(p.at)}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${k.tone}`}><Icon className="h-3.5 w-3.5" />{k.label}</span>
                </div>
                <div className="px-4 pb-3 pt-3">
                  <h3 className="break-words text-[15px] font-bold leading-snug text-slate-900">{p.title}</h3>
                  {p.text && <p className="mt-1 line-clamp-3 break-words text-[13px] leading-relaxed text-slate-500">{p.text}</p>}
                </div>
                {p.cover && <img src={p.cover} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />}
                {p.href && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[13px] font-semibold text-brand">Xem {k.label.toLowerCase()}<ChevronRight className="h-4 w-4" /></div>}
              </>
            );
            return p.href
              ? <a key={p.key} href={p.href} target={p.external ? '_blank' : undefined} rel="noreferrer" className="block overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md">{body}</a>
              : <div key={p.key} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">{body}</div>;
          })}
          {shown.length > limit && (
            <button onClick={() => setLimit(n => n + 12)} className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand">Xem thêm</button>
          )}
        </div>
      )}
    </div>
  );
}
