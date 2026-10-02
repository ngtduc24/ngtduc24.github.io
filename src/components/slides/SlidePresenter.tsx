import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { Slide, SLIDE_W, SLIDE_H } from '../../lib/slides';
import SlideRenderer from './SlideRenderer';

// Chế độ trình chiếu toàn màn hình: phím mũi tên, phím cách, bấm chuột để chuyển trang, Esc để thoát.
export default function SlidePresenter({ slides, start = 0, onClose }: { slides: Slide[]; start?: number; onClose: () => void }) {
  const [i, setI] = useState(Math.min(start, slides.length - 1));
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [showUi, setShowUi] = useState(true);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); setI(v => Math.min(slides.length - 1, v + 1)); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); setI(v => Math.max(0, v - 1)); }
      else if (e.key === 'Home') setI(0);
      else if (e.key === 'End') setI(slides.length - 1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length, onClose]);

  // Ẩn nút điều khiển khi không rê chuột.
  useEffect(() => {
    let t: any;
    const move = () => { setShowUi(true); clearTimeout(t); t = setTimeout(() => setShowUi(false), 2500); };
    move();
    window.addEventListener('mousemove', move);
    return () => { window.removeEventListener('mousemove', move); clearTimeout(t); };
  }, []);

  const width = Math.min(size.w, size.h * (SLIDE_W / SLIDE_H));
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black" style={{ cursor: showUi ? 'default' : 'none' }}
      onClick={e => { if ((e.target as HTMLElement).closest('button')) return; setI(v => Math.min(slides.length - 1, v + 1)); }}>
      <SlideRenderer slide={slides[i]} width={width} />
      <div className={`fixed bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white transition-opacity ${showUi ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={() => setI(v => Math.max(0, v - 1))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" aria-label="Trang trước"><ChevronLeft className="h-5 w-5" /></button>
        <span className="min-w-[64px] text-center tabular-nums">{i + 1} / {slides.length}</span>
        <button onClick={() => setI(v => Math.min(slides.length - 1, v + 1))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" aria-label="Trang sau"><ChevronRight className="h-5 w-5" /></button>
        <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" aria-label="Toàn màn hình"><Maximize2 className="h-4 w-4" /></button>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" aria-label="Thoát trình chiếu"><X className="h-5 w-5" /></button>
      </div>
    </div>,
    document.body,
  );
}
