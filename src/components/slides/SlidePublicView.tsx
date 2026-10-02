import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Play, Presentation } from 'lucide-react';
import { getDeckByShareToken, Deck, SLIDE_W, SLIDE_H } from '../../lib/slides';
import SlideRenderer from './SlideRenderer';
import SlidePresenter from './SlidePresenter';

// Trang xem bài giảng công khai qua link chia sẻ (?deck=<mã>), không cần đăng nhập.
export default function SlidePublicView({ token }: { token: string }) {
  const [deck, setDeck] = useState<Deck | null | undefined>(undefined);
  const [i, setI] = useState(0);
  const [present, setPresent] = useState(false);
  const [w, setW] = useState(Math.min(window.innerWidth - 32, 1100));

  // Trang ẩn không hiện ở link xem công khai.
  useEffect(() => { getDeckByShareToken(token).then(d => { setDeck(d ? { ...d, slides: d.slides.filter(x => !x.hidden).length ? d.slides.filter(x => !x.hidden) : d.slides } : d); if (d) document.title = `${d.title} | EduGo`; }).catch(() => setDeck(null)); }, [token]);
  useEffect(() => {
    const r = () => setW(Math.min(window.innerWidth - 32, 1100, (window.innerHeight - 220) * (SLIDE_W / SLIDE_H)));
    r(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r);
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!deck || present) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setI(v => Math.min(deck.slides.length - 1, v + 1));
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setI(v => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [deck, present]);

  if (deck === undefined) return <div className="flex min-h-[100dvh] items-center justify-center gap-2 bg-slate-100 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải bài giảng...</div>;
  if (!deck) return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
      <Presentation className="h-12 w-12 text-slate-300" />
      <p className="font-semibold text-slate-700">Không mở được bài giảng</p>
      <p className="text-sm text-slate-500">Link đã tắt chia sẻ hoặc bài giảng không còn nữa.</p>
      <a href="/" className="mt-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Về EduGo</a>
    </div>
  );
  return (
    <div className="min-h-[100dvh] bg-slate-100">
      <header className="flex h-14 items-center gap-3 bg-gradient-to-r from-brand to-brand-hover px-4 text-white">
        <a href="/" className="font-display text-lg font-bold">EduGo</a>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold">{deck.title}</span>
        <button onClick={() => setPresent(true)} className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-slate-800"><Play className="h-4 w-4" /> Trình chiếu</button>
      </header>
      <main className="flex flex-col items-center gap-4 p-4">
        <div className="overflow-hidden rounded-xl shadow-xl"><SlideRenderer slide={deck.slides[i]} width={w} live /></div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <button onClick={() => setI(v => Math.max(0, v - 1))} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow hover:bg-slate-50" aria-label="Trang trước"><ChevronLeft className="h-5 w-5" /></button>
          <span className="tabular-nums">{i + 1} / {deck.slides.length}</span>
          <button onClick={() => setI(v => Math.min(deck.slides.length - 1, v + 1))} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow hover:bg-slate-50" aria-label="Trang sau"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto pb-2">
          {deck.slides.map((s, k) => <button key={s.id} onClick={() => setI(k)} className={`shrink-0 overflow-hidden rounded-md border-2 ${k === i ? 'border-brand' : 'border-transparent'}`}><SlideRenderer slide={s} width={120} /></button>)}
        </div>
      </main>
      {present && <SlidePresenter slides={deck.slides} start={i} onClose={() => setPresent(false)} />}
    </div>
  );
}
