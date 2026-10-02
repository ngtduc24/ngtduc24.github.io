import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Maximize2, StickyNote, Pause, Play, MonitorUp, RotateCcw, Minus, Plus, Clock } from 'lucide-react';
import { Slide, SLIDE_W, SLIDE_H } from '../../lib/slides';
import SlideRenderer, { ElPhase, ensureAnimCss } from './SlideRenderer';

// Chế độ trình chiếu.
// full: toàn màn hình. presenter: màn hình người thuyết trình (trang hiện tại, trang sau, ghi chú, đồng hồ),
// có thể mở thêm cửa sổ khán giả chạy theo. audience: cửa sổ khán giả, nhận lệnh từ màn hình người thuyết trình.
// Khối có hiệu ứng "khi bấm" xuất hiện lần lượt mỗi lần bấm, hết khối thì sang trang (có hiệu ứng chuyển trang).
// auto: số giây tự chuyển bước (0 là tắt), loop: hết bài thì quay lại trang đầu.
export type PresentMode = 'full' | 'presenter' | 'audience';
export interface PresentOptions { mode?: PresentMode; auto?: number; loop?: boolean }

type Msg = { type: 'hello' } | { type: 'slides'; slides: Slide[] } | { type: 'state'; i: number; step: number; black: boolean } | { type: 'bye' };

export default function SlidePresenter({ slides: all, start = 0, onClose, mode = 'full', auto = 0, loop = false, channel }: { slides: Slide[]; start?: number; onClose: () => void; channel?: string } & PresentOptions) {
  // Trang ẩn không trình chiếu (trừ khi bắt đầu ngay từ trang ẩn).
  const startId = all[Math.min(start, all.length - 1)]?.id;
  const slides = useMemo(() => { if (mode === 'audience') return all; const v = all.filter(s => !s.hidden || s.id === startId); return v.length ? v : all; }, [all, startId, mode]);
  start = Math.max(0, slides.findIndex(s => s.id === startId));
  const [notesOn, setNotesOn] = useState(false);
  const [black, setBlack] = useState(false);
  const [t0, setT0] = useState(() => Date.now());
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(v => v + 1), 1000); return () => clearInterval(t); }, []);
  const [i, setI] = useState(Math.min(start, slides.length - 1));
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [prev, setPrev] = useState<number | null>(null);
  const [entry, setEntry] = useState(0);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [showUi, setShowUi] = useState(true);
  const [autoSec, setAutoSec] = useState(auto);
  const [paused, setPaused] = useState(false);
  const [noteSize, setNoteSize] = useState(20);
  const timer = useRef<any>(null);

  useEffect(() => { ensureAnimCss(); }, []);
  useEffect(() => {
    const el = document.documentElement;
    if (mode === 'full') el.requestFullscreen?.().catch(() => {});
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    const onFs = () => { if (mode === 'full' && !document.fullscreenElement) onClose(); };
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
    if (i >= slides.length - 1 && loop) { goTo(0, 'fwd'); return; }
    goTo(i + 1, 'fwd');
  }, [dir, step, clickEls.length, goTo, i, slides.length, loop]);
  const back = useCallback(() => goTo(i - 1, 'back'), [goTo, i]);

  // ===== Cửa sổ khán giả nối với màn hình người thuyết trình =====
  const chanRef = useRef<BroadcastChannel | null>(null);
  const [chanId] = useState(() => channel || `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
  const [audienceOn, setAudienceOn] = useState(false);
  const stateRef = useRef({ i, step, black });
  stateRef.current = { i, step, black };
  useEffect(() => {
    if (mode === 'full' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(`edugo-present-${chanId}`);
    chanRef.current = ch;
    ch.onmessage = (ev: MessageEvent<Msg>) => {
      const m = ev.data;
      if (mode === 'presenter') {
        if (m.type === 'hello') { setAudienceOn(true); ch.postMessage({ type: 'slides', slides } as Msg); ch.postMessage({ type: 'state', ...stateRef.current } as Msg); }
        if (m.type === 'bye') setAudienceOn(false);
      }
    };
    return () => { try { ch.postMessage({ type: 'bye' } as Msg); } catch { /* bỏ qua */ } ch.close(); chanRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, chanId]);
  useEffect(() => { if (mode === 'presenter') chanRef.current?.postMessage({ type: 'state', i, step, black } as Msg); }, [mode, i, step, black]);
  // Cửa sổ khán giả: làm theo trang và bước của người thuyết trình.
  const remote = useRef<{ i: number; step: number } | null>(null);
  useEffect(() => {
    if (mode !== 'audience' || !chanRef.current) return;
    const ch = chanRef.current;
    const prevHandler = ch.onmessage;
    ch.onmessage = (ev: MessageEvent<Msg>) => {
      const m = ev.data;
      if (m.type === 'state') { remote.current = { i: m.i, step: m.step }; setBlack(m.black); setRemoteTick(v => v + 1); }
      if (m.type === 'bye') onClose();
      prevHandler?.call(ch, ev);
    };
    ch.postMessage({ type: 'hello' } as Msg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  const [remoteTick, setRemoteTick] = useState(0);
  useEffect(() => {
    const r = remote.current; if (!r) return;
    if (r.i !== i) goTo(r.i, r.i > i ? 'fwd' : 'back');
    else setStep(r.step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteTick]);
  useEffect(() => { const r = remote.current; if (mode === 'audience' && r && r.i === i && r.step !== step) setStep(r.step); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [i]);
  const openAudience = () => {
    const w = window.open(`${window.location.origin}/?audience=${chanId}`, `edugo_audience_${chanId}`, 'popup,width=1280,height=720');
    if (!w) return;
    setAudienceOn(true);
  };

  useEffect(() => {
    if (mode === 'audience') return;
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); back(); }
      else if (e.key === 'Home') goTo(0, 'back');
      else if (e.key === 'End') goTo(slides.length - 1, 'fwd');
      else if (e.key === 'Escape') onClose();
      else if (e.key.toLowerCase() === 'n') setNotesOn(v => !v);
      else if (e.key.toLowerCase() === 'b' || e.key === '.') setBlack(v => !v);
      else if (e.key.toLowerCase() === 'p' && autoSec) setPaused(v => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, goTo, slides.length, onClose, mode, autoSec]);

  // Tự động phát: sau mỗi khoảng thời gian chuyển sang bước, trang tiếp theo.
  const atEnd = i >= slides.length - 1 && step >= clickEls.length;
  useEffect(() => {
    if (!autoSec || paused || mode === 'audience' || (atEnd && !loop)) return;
    const t = setTimeout(next, autoSec * 1000);
    return () => clearTimeout(t);
  }, [autoSec, paused, i, step, next, mode, atEnd, loop]);

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

  const tr = slides[i]?.transition;
  const tk = tr && tr.type !== 'none' && prev !== null ? tr.type : null;
  const td = tr?.dur ?? 0.7;
  const inAnim = tk ? { animation: `st-${tk === 'slide' ? 'slide' : tk}-in ${td}s cubic-bezier(.3,.7,.2,1) both` } : undefined;
  const outAnim = tk === 'push' ? { animation: `st-push-out ${td}s cubic-bezier(.3,.7,.2,1) both` } : undefined;
  const elapsed = `${String(Math.floor((Date.now() - t0) / 60000)).padStart(2, '0')}:${String(Math.floor((Date.now() - t0) / 1000) % 60).padStart(2, '0')}`;
  const stage = (width: number) => (
    <div style={{ position: 'relative', width, height: width * SLIDE_H / SLIDE_W, overflow: 'hidden' }}>
      {prev !== null && <SlideRenderer slide={slides[prev]} width={width} style={{ position: 'absolute', inset: 0, ...outAnim }} />}
      {slides[i] && <SlideRenderer key={`${i}_${entry}`} slide={slides[i]} width={width} phases={phases} loops live playKey={entry} style={{ position: 'absolute', inset: 0, ...inAnim }} />}
      {black && <div style={{ position: 'absolute', inset: 0, background: '#000' }} />}
    </div>
  );
  const iconBtn = 'grid h-8 w-8 place-items-center rounded-full hover:bg-white/15';
  const autoBtn = autoSec > 0 && mode !== 'audience' && (
    <button onClick={() => setPaused(v => !v)} title={paused ? 'Tiếp tục tự động phát (P)' : 'Tạm dừng tự động phát (P)'} className={iconBtn} aria-label="Tự động phát">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
  );

  // ===== Màn hình người thuyết trình =====
  if (mode === 'presenter') {
    const mainW = Math.max(320, Math.min(size.w * 0.64 - 48, (size.h - 140) * (SLIDE_W / SLIDE_H)));
    const sideW = Math.max(200, size.w - mainW - 72);
    const nextSlide = slides[i + 1];
    return createPortal(
      <div className="fixed inset-0 z-[300] flex flex-col bg-slate-950 text-white">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <span className="text-sm font-semibold">Chế độ người thuyết trình</span>
          <span className="ml-3 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm tabular-nums"><Clock className="h-4 w-4" /> {elapsed}</span>
          <button onClick={() => setT0(Date.now())} title="Đặt lại đồng hồ" className={iconBtn}><RotateCcw className="h-4 w-4" /></button>
          {autoBtn}
          <div className="flex-1" />
          <button onClick={openAudience} className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm hover:bg-white/20" title="Mở cửa sổ trình chiếu cho khán giả, kéo sang màn hình máy chiếu rồi bấm toàn màn hình">
            <MonitorUp className="h-4 w-4" /> {audienceOn ? 'Đã nối màn hình khán giả' : 'Mở màn hình khán giả'}
          </button>
          <button onClick={() => setBlack(v => !v)} className={`h-9 rounded-lg px-3 text-sm ${black ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`} title="Màn hình đen (B)">Màn đen</button>
          <button onClick={onClose} className="flex h-9 items-center gap-1.5 rounded-lg bg-rose-500/80 px-3 text-sm font-semibold hover:bg-rose-500"><X className="h-4 w-4" /> Kết thúc</button>
        </div>
        <div className="flex min-h-0 flex-1 gap-6 p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="cursor-pointer overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10" onClick={e => { const t = e.target as HTMLElement; if (t.closest('[data-live]')) return; next(); }}>{stage(mainW)}</div>
            <div className="flex items-center gap-3 text-sm">
              <button onClick={back} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Trang trước"><ChevronLeft className="h-5 w-5" /></button>
              <span className="min-w-[90px] text-center tabular-nums">Trang {i + 1} / {slides.length}{clickEls.length ? ` · bước ${step}/${clickEls.length}` : ''}</span>
              <button onClick={next} className="grid h-10 w-10 place-items-center rounded-full bg-brand hover:bg-brand-hover" aria-label="Tiếp theo"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4" style={{ maxWidth: sideW }}>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Trang tiếp theo</p>
              {nextSlide ? <button onClick={() => goTo(i + 1, 'fwd')} className="overflow-hidden rounded-md ring-1 ring-white/10"><SlideRenderer slide={nextSlide} width={Math.min(sideW, 360)} /></button> : <p className="text-sm text-white/40">Đây là trang cuối.</p>}
            </div>
            <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/50">
                <span>Ghi chú</span>
                <span className="flex items-center gap-1 normal-case">
                  <button onClick={() => setNoteSize(v => Math.max(12, v - 2))} className={iconBtn} title="Chữ nhỏ hơn"><Minus className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setNoteSize(v => Math.min(48, v + 2))} className={iconBtn} title="Chữ to hơn"><Plus className="h-3.5 w-3.5" /></button>
                </span>
              </div>
              <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap leading-relaxed" style={{ fontSize: noteSize }}>{slides[i]?.notes || <span className="text-white/40">Trang này chưa có ghi chú.</span>}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {slides.map((s, k) => <button key={s.id} onClick={() => goTo(k, k > i ? 'fwd' : 'back')} className={`shrink-0 overflow-hidden rounded ring-2 ${k === i ? 'ring-brand' : 'ring-transparent opacity-70 hover:opacity-100'}`}><SlideRenderer slide={s} width={96} /></button>)}
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  const width = Math.min(size.w, size.h * (SLIDE_W / SLIDE_H));
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-black" style={{ cursor: showUi ? 'default' : 'none' }}
      onClick={e => { const t = e.target as HTMLElement; if (mode === 'audience') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); return; } if (t.closest('button') || t.closest('[data-live]') || t.closest('[data-notes]')) return; if (black) { setBlack(false); return; } next(); }}>
      {stage(width)}
      {mode === 'audience' && showUi && !document.fullscreenElement && <div className="fixed left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/15 px-4 py-1.5 text-xs text-white">Bấm vào màn hình để chiếu toàn màn hình. Điều khiển ở cửa sổ người thuyết trình.</div>}
      {mode !== 'audience' && notesOn && (
        <div data-notes className="fixed bottom-20 left-1/2 w-[min(760px,92vw)] -translate-x-1/2 rounded-2xl bg-black/80 p-4 text-white shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-xs text-white/60"><span>Ghi chú trang {i + 1}</span><span className="tabular-nums">Đã trình bày {elapsed}</span></div>
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">{slides[i]?.notes || 'Trang này chưa có ghi chú.'}</p>
          {slides[i + 1] && <p className="mt-2 text-xs text-white/50">Trang sau: {(slides[i + 1].els.find(e => e.type === 'text')?.text || '').split('\n')[0].slice(0, 80)}</p>}
        </div>
      )}
      {mode !== 'audience' && (
        <div className={`fixed bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white transition-opacity ${showUi ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={back} className={iconBtn} aria-label="Trang trước"><ChevronLeft className="h-5 w-5" /></button>
          <span className="min-w-[64px] text-center tabular-nums">{i + 1} / {slides.length}</span>
          <button onClick={next} className={iconBtn} aria-label="Tiếp theo"><ChevronRight className="h-5 w-5" /></button>
          {autoBtn}
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className={iconBtn} aria-label="Toàn màn hình"><Maximize2 className="h-4 w-4" /></button>
          <button onClick={() => setNotesOn(v => !v)} title="Ghi chú và đồng hồ (phím N)" className={`${iconBtn} ${notesOn ? 'bg-white/20' : ''}`} aria-label="Ghi chú"><StickyNote className="h-4 w-4" /></button>
          <button onClick={onClose} className={iconBtn} aria-label="Thoát trình chiếu"><X className="h-5 w-5" /></button>
        </div>
      )}
    </div>,
    document.body,
  );
}

// Cửa sổ khán giả (?audience=<mã>): chờ nhận bài giảng từ màn hình người thuyết trình rồi chiếu theo.
export function SlideAudience({ channel }: { channel: string }) {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  useEffect(() => {
    document.title = 'Màn hình khán giả | EduGo';
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(`edugo-present-${channel}`);
    ch.onmessage = (ev: MessageEvent<Msg>) => { if (ev.data.type === 'slides') setSlides(ev.data.slides); };
    ch.postMessage({ type: 'hello' } as Msg);
    return () => ch.close();
  }, [channel]);
  if (!slides) return <div className="flex min-h-[100dvh] items-center justify-center bg-black text-sm text-white/70">Đang nối với màn hình người thuyết trình...</div>;
  return <SlidePresenter slides={slides} mode="audience" channel={channel} onClose={() => window.close()} />;
}
