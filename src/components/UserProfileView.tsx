import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Globe, Library, ListChecks, Loader2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePerson, loadPeople } from '../lib/people';
import { AvatarImg } from './ui/People';
import { prettyShareUrl } from '../lib/shareLinks';

// Trang cá nhân công khai của một người dùng: ảnh bìa, ảnh đại diện, tên, Website và nội dung đã công khai.
// Chỉ hiện thông tin công khai, không có email hay dữ liệu riêng.
export default function UserProfileView({ uid, isMe, onBack, onEditMine }: { uid: string; isMe: boolean; onBack: () => void; onEditMine: () => void }) {
  const person = usePerson(uid);
  const [site, setSite] = useState<{ slug: string; title?: string } | null>(null);
  const [lessons, setLessons] = useState<Array<{ id: string; title: string }> | null>(null);
  const [bank, setBank] = useState<Array<{ id: string; title: string; share_token?: string }>>([]);
  const [quizzes, setQuizzes] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    loadPeople(true);
    (async () => {
      const { getSiteOfOwner } = await import('../lib/portfolioData');
      const s = await getSiteOfOwner(uid).catch(() => null);
      setSite(s && s.published !== false ? { slug: s.slug, title: s.title } : null);
    })();
    supabase.from('el_lessons').select('id,title').eq('owner_id', uid).eq('is_public', true).is('deleted_at', null).order('updated_at', { ascending: false }).limit(30)
      .then(({ data }) => setLessons((data as any) || [])).then(undefined, () => setLessons([]));
    supabase.from('edu_assignment_bank').select('id,title,share_token').eq('owner_id', uid).eq('is_public', true).order('updated_at', { ascending: false }).limit(30)
      .then(({ data }) => setBank((data as any) || []), () => {});
    supabase.from('quizzes').select('id,title').eq('owner_id', uid).eq('is_public', true).limit(30)
      .then(({ data }) => setQuizzes((data as any) || []), () => {});
  }, [uid]);

  const Section = ({ icon, title, children, count }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) => (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">{icon}{title} <span className="text-slate-400">{count}</span></p>
      {children}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fadeIn">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand"><ArrowLeft className="h-4 w-4" /> Quay lại</button>
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="h-48 w-full bg-gradient-to-r from-brand to-brand-hover sm:h-64" style={person?.cover ? { backgroundImage: `url(${person.cover})`, backgroundSize: 'cover', backgroundPosition: person.coverPos || '50% 50%' } : undefined} />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="-mt-14 sm:-mt-16"><AvatarImg person={person} size={128} ring /></div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black text-slate-900">{person?.name || 'Người dùng'}</h1>
            {person?.username && <p className="text-sm text-slate-500">@{person.username}</p>}
          </div>
          <div className="flex gap-2">
            {site && <a href={`/${site.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"><Globe className="h-4 w-4" /> Website</a>}
            {isMe && <button onClick={onEditMine} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"><Pencil className="h-4 w-4" /> Sửa hồ sơ</button>}
          </div>
        </div>
      </div>

      {lessons === null ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Section icon={<BookOpen className="h-4 w-4 text-brand" />} title="Giáo trình công khai" count={lessons.length}>
            {lessons.length ? <ul className="space-y-1">{lessons.map(l => <li key={l.id}><a href={prettyShareUrl('elview', l.id)} target="_blank" rel="noreferrer" className="block truncate rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand">{l.title}</a></li>)}</ul> : <p className="text-xs text-slate-400">Chưa có.</p>}
          </Section>
          <Section icon={<Library className="h-4 w-4 text-brand" />} title="Bài tập công khai" count={bank.length}>
            {bank.length ? <ul className="space-y-1">{bank.map(b => <li key={b.id}>{b.share_token ? <a href={prettyShareUrl('bt', b.share_token)} target="_blank" rel="noreferrer" className="block truncate rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand">{b.title}</a> : <span className="block truncate px-2 py-1.5 text-sm text-slate-700">{b.title}</span>}</li>)}</ul> : <p className="text-xs text-slate-400">Chưa có.</p>}
          </Section>
          <Section icon={<ListChecks className="h-4 w-4 text-brand" />} title="Đề trắc nghiệm công khai" count={quizzes.length}>
            {quizzes.length ? <ul className="space-y-1">{quizzes.map(q => <li key={q.id} className="truncate px-2 py-1.5 text-sm text-slate-700">{q.title}</li>)}</ul> : <p className="text-xs text-slate-400">Chưa có.</p>}
          </Section>
        </div>
      )}
    </div>
  );
}
