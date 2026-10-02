import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { Slide, SLIDE_W, SLIDE_H } from '../../lib/slides';
import SlideRenderer, { ElPhase, ensureAnimCss } from './SlideRenderer';

// Chế độ trình chiếu toàn màn hình.
// Khối có hiệu ứng "khi bấm" xuất hiện lần lượt mỗi lần bấm, hết khối thì sang trang (có hiệu ứng chuyển trang).
// Phím mũi tên, phím cách, bấm chuột để đi tiếp, Esc để thoát.
export default function SlidePresenter({ slides, start = 0, onClose }: { slides: Slide[]; start?: number; onClose: () => void }) {
  const [i, setI] = useState(Math.min(start, slides.length - 1));
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [prev, setPrev] = useState<number | null>(null);
  const [entry, setEntry] = useState(0);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [showUi, setShowUi] = useState(true);
  const timer = useRef<any>(null);

  useEffect(() => { ensureAnimCss(); }, []);
  useEffect(() => {
    const el = document.documentElement;
    el.requestFullscreen?.().catch(() => {});
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    const onFs = () => { if (!document.fullscreenElement) onClose(); };
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clickEls = useMemo(() => (slides[i]?.els || []).filter(e => e.anim?.in && e.anim.in !== 'none' && e.anim.trigger === 'click').map(e => e.id), [slides, i]);

  const goTo = useCallback((n: number, d: 'fwd' | 'back') => {
    if (n < 0 || n >= slides.length || n === i) return;
    const tr = slides[n].transition;
    clearTimeout(timer.current);
    if (tr && tr.type !== 'none') {
      setPrev(i);
      timer.current = setTimeout(() => setPrev(null), (tr.dur ?? 0.7) * 1000 + 50);
    } else setPrev(null);
    setDir(d);
    setI(n);
    setStep(0);
    setEntry(v => v + 1);
  }, [i, slides]);

  const next = useCallback(() => {
    if (dir === 'fwd' && step < clickEls.length) { setStep(s => s + 1); return; }
    goTo(i + 1, 'fwd');
  }, [dir, step, clickEls.length, goTo, i]);
  const back = useCallback(() => goTo(i - 1, 'back'), [goTo, i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); back(); }
      else if (e.key === 'Home') goTo(0, 'back');
      else if (e.key === 'End') goTo(slides.length - 1, 'fwd');
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, goTo, slides.length, onClose]);

  useEffect(() => {
    let t: any;
    const move = () => { setShowUi(true); clearTimeout(t); t = setTimeout(() => setShowUi(false), 2500); };
    move();
    window.addEventListener('mousemove', move);
    return () => { window.removeEventListener('mousemove', move); clearTimeout(t); };
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Trạng thái từng khối: quay lại trang trước thì hiện đủ, không chạy lại hiệu ứng.
  const phases = useMemo(() => {
    const out: Record<string, ElPhase> = {};
    if (dir === 'back') return out;
    for (const e of slides[i]?.els || []) {
      const a = e.anim;
      if (!a?.in || a.in === 'none') continue;
      if (a.trigger === 'click') out[e.id] = clickEls.indexOf(e.id) < step ? 'play' : 'hidden';
      else out[e.id] = 'play';
    }
    return out;
  }, [slides, i, dir, step, clickEls]);

  const width = Math.min(size.w, size.h * (SLIDE_W / SLIDE_H));
  const tr = slides[i]?.transition;
  const tk = tr && tr.type !== 'none' && prev !== null ? tr.type : null;
  const td = tr?.dur ?? 0.7;
  const inAnim = tk ? { animation: `st-${tk === 'slide' ? 'slide' : tk}-in ${td}s cubic-bezier(.3,.7,.2,1) both` } : undefined;
  const outAnim = tk === 'push' ? { animation: `st-push-out ${td}s cubic-bezier(.3,.7,.2,1) both` } : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-black" style={{ cursor: showUi ? 'default' : 'none' }}
      onClick={e => { if ((e.target as HTMLElement).closest('button')) return; next(); }}>
      <div style={{ position: 'relative', width, height: width * SLIDE_H / SLIDE_W }}>
        {prev !== null && <SlideRenderer slide={slides[prev]} width={width} style={{ position: 'absolute', inset: 0, ...outAnim }} />}
        <SlideRenderer key={`${i}_${entry}`} slide={slides[i]} width={width} phases={phases} loops playKey={entry} style={{ position: 'absolute', inset: 0, ...inAnim }} />
      </div>
      <div className={`fixed bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white transition-opacity ${showUi ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={back} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" aria-label="Trang trước"><ChevronLeft className="h-5 w-5" /></button>
        <span className="min-w-[64px] text-center tabular-nums">{i + 1} / {slides.length}</span>
        <button onClick={next} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" aria-label="Tiếp theo"><ChevronRight className="h-5 w-5" /></button>
        <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" aria-label="Toàn màn hình"><Maximize2 className="h-4 w-4" /></button>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" aria-label="Thoát trình chiếu"><X className="h-5 w-5" /></button>
      </div>
    </div>,
    document.body,
  );
}
