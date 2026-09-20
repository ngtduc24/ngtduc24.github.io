import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Scissors, Trash2, Copy, Lock, Unlock, Eye, EyeOff, Type, Download, X, ArrowLeft,
  Upload, Loader2, Film, Image as ImageIcon, Music, ZoomIn, ZoomOut, Plus, Check, ChevronRight, Layers
} from 'lucide-react';
import { UserAccount } from '../../types';
import { useNotifications } from '../NotificationContext';
import {
  MvProject, MvAsset, MvKind, getProject, updateProject, getMyAssets, getSharedAssets,
  uploadAssetFile, addAsset,
} from '../../lib/remier';

interface Props { projectId: string; currentUser: UserAccount; onExit: () => void; }

type ClipKind = 'video' | 'image' | 'audio' | 'text';
interface ClipProps { x: number; y: number; scale: number; rotation: number; opacity: number; volume: number; text: string; fontSize: number; color: string; fontWeight: number; align: string; }
interface Clip { id: string; kind: ClipKind; name: string; src?: string; thumb?: string; start: number; dur: number; inPoint: number; srcDur?: number; props: ClipProps; }
interface Track { id: string; name: string; locked?: boolean; hidden?: boolean; muted?: boolean; clips: Clip[]; }

const defaultProps = (): ClipProps => ({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, volume: 1, text: 'Nội dung chữ', fontSize: 64, color: '#ffffff', fontWeight: 700, align: 'center' });
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtTime = (ms: number) => {
  const s = Math.max(0, ms) / 1000; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); const f = Math.floor((s % 1) * 30);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
};

// Bộ nhớ đệm phần tử media dùng để vẽ và phát.
const mediaCache = new Map<string, HTMLVideoElement | HTMLImageElement | HTMLAudioElement>();
function getMediaEl(clip: Clip): HTMLVideoElement | HTMLImageElement | HTMLAudioElement | null {
  if (!clip.src) return null;
  const key = clip.kind + '|' + clip.src;
  let el = mediaCache.get(key);
  if (!el) {
    if (clip.kind === 'video') { const v = document.createElement('video'); v.src = clip.src; v.crossOrigin = 'anonymous'; v.preload = 'auto'; v.playsInline = true; el = v; }
    else if (clip.kind === 'audio') { const a = document.createElement('audio'); a.src = clip.src; a.crossOrigin = 'anonymous'; a.preload = 'auto'; el = a; }
    else { const i = new Image(); i.crossOrigin = 'anonymous'; i.src = clip.src; el = i; }
    mediaCache.set(key, el);
  }
  return el;
}

export default function RemierEditor({ projectId, currentUser, onExit }: Props) {
  const { addNotification } = useNotifications();
  const [project, setProject] = useState<MvProject | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [title, setTitle] = useState('');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [pxPerSec, setPxPerSec] = useState(80);
  const [savedAt, setSavedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expProgress, setExpProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const playheadRef = useRef(0);
  const tracksRef = useRef<Track[]>([]);
  const dirtyRef = useRef(false);
  tracksRef.current = tracks;

  const W = project?.width || 1920, H = project?.height || 1080;
  const duration = tracks.reduce((mx, t) => Math.max(mx, t.clips.reduce((m, c) => Math.max(m, c.start + c.dur), 0)), 0);

  // ---------- Nạp dự án ----------
  useEffect(() => {
    (async () => {
      try {
        const p = await getProject(projectId);
        setProject(p); setTitle(p.title);
        setTracks((p.timeline?.tracks || []).map((t: any) => ({ ...t, clips: t.clips || [] })));
      } catch (e: any) { addNotification('Lỗi mở dự án: ' + (e.message || e), 'error'); }
    })();
  }, [projectId, addNotification]);

  // ---------- Lưu ----------
  const persist = useCallback(async (silent = true) => {
    if (!project) return;
    setSaving(true);
    try {
      await updateProject(project.id, { title, timeline: { tracks: tracksRef.current }, duration_ms: Math.round(duration) });
      dirtyRef.current = false; setSavedAt(new Date().toLocaleTimeString('vi-VN'));
      if (!silent) addNotification('Đã lưu dự án.', 'success');
    } catch (e: any) { addNotification('Lỗi lưu: ' + (e.message || e), 'error'); }
    finally { setSaving(false); }
  }, [project, title, duration, addNotification]);

  // Tự lưu 15 giây sau thay đổi cuối.
  const markDirty = () => { dirtyRef.current = true; };
  useEffect(() => {
    const iv = setInterval(() => { if (dirtyRef.current) persist(true); }, 15000);
    return () => clearInterval(iv);
  }, [persist]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, []);

  // ---------- Vẽ khung hình ----------
  const activeClip = (track: Track, t: number): Clip | null => {
    if (track.hidden) return null;
    for (const c of track.clips) if (t >= c.start && t < c.start + c.dur) return c;
    return null;
  };
  const drawClipVisual = (ctx: CanvasRenderingContext2D, clip: Clip, cv: HTMLCanvasElement) => {
    const p = clip.props;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(cv.width / 2 + (p.x / 100) * cv.width, cv.height / 2 + (p.y / 100) * cv.height);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.scale(p.scale, p.scale);
    if (clip.kind === 'text') {
      ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color;
      ctx.font = `${p.fontWeight} ${p.fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = (p.align as CanvasTextAlign) || 'center'; ctx.textBaseline = 'middle';
      const lines = (p.text || '').split('\n');
      lines.forEach((ln, i) => ctx.fillText(ln, 0, (i - (lines.length - 1) / 2) * p.fontSize * 1.2));
    } else {
      const el = getMediaEl(clip) as HTMLVideoElement | HTMLImageElement | null;
      if (el) {
        const iw = (el as any).videoWidth || (el as any).naturalWidth || cv.width;
        const ih = (el as any).videoHeight || (el as any).naturalHeight || cv.height;
        if (iw && ih) {
          const scale = Math.min(cv.width / iw, cv.height / ih); // contain
          const dw = iw * scale, dh = ih * scale;
          try { ctx.drawImage(el as CanvasImageSource, -dw / 2, -dh / 2, dw, dh); } catch {}
        }
      }
    }
    ctx.restore();
  };
  const draw = useCallback((t: number) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    const tk = tracksRef.current;
    for (let i = tk.length - 1; i >= 0; i--) {
      const c = activeClip(tk[i], t);
      if (c && c.kind !== 'audio') drawClipVisual(ctx, c, cv);
    }
  }, []);

  // Khi tua (không phát): set currentTime cho video rồi vẽ khi seeked.
  useEffect(() => {
    if (playing) return;
    const tk = tracksRef.current;
    tk.forEach(track => {
      const c = activeClip(track, playhead);
      if (c && (c.kind === 'video')) {
        const el = getMediaEl(c) as HTMLVideoElement;
        if (el) { const want = (c.inPoint + (playhead - c.start)) / 1000; if (Math.abs(el.currentTime - want) > 0.05) { try { el.currentTime = want; } catch {} } el.pause(); }
      }
    });
    // vẽ ngay và vẽ lại sau khi ảnh/video sẵn sàng
    draw(playhead);
    const tmo = setTimeout(() => draw(playhead), 120);
    return () => clearTimeout(tmo);
  }, [playhead, playing, draw, tracks]);

  // ---------- Phát ----------
  const manageMedia = (t: number, isPlaying: boolean) => {
    const tk = tracksRef.current;
    const activeSrcs = new Set<string>();
    tk.forEach(track => {
      const c = activeClip(track, t);
      if (c && (c.kind === 'video' || c.kind === 'audio') && c.src) {
        activeSrcs.add(c.kind + '|' + c.src);
        const el = getMediaEl(c) as HTMLVideoElement | HTMLAudioElement;
        if (el) {
          el.muted = !!track.muted || c.kind === 'audio' && false; // giữ tiếng
          el.volume = Math.max(0, Math.min(1, c.props.volume));
          const want = (c.inPoint + (t - c.start)) / 1000;
          if (isPlaying) {
            if (Math.abs(el.currentTime - want) > 0.25) { try { el.currentTime = want; } catch {} }
            if (el.paused) el.play().catch(() => {});
          }
        }
      }
    });
    // dừng các media không còn active
    mediaCache.forEach((el, key) => { if (!activeSrcs.has(key) && (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement)) { if (!el.paused) el.pause(); } });
  };

  const loop = useCallback((ts: number) => {
    if (!lastTsRef.current) lastTsRef.current = ts;
    const dt = ts - lastTsRef.current; lastTsRef.current = ts;
    let t = playheadRef.current + dt;
    const dur = tracksRef.current.reduce((mx, tr) => Math.max(mx, tr.clips.reduce((m, c) => Math.max(m, c.start + c.dur), 0)), 0);
    if (t >= dur) { t = dur; playheadRef.current = t; setPlayhead(t); draw(t); manageMedia(t, false); setPlaying(false); return; }
    playheadRef.current = t; setPlayhead(t); manageMedia(t, true); draw(t);
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false); if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; lastTsRef.current = 0;
      manageMedia(playheadRef.current, false);
    } else {
      if (playheadRef.current >= duration) { playheadRef.current = 0; setPlayhead(0); }
      setPlaying(true); lastTsRef.current = 0; rafRef.current = requestAnimationFrame(loop);
    }
  };
  useEffect(() => { playheadRef.current = playhead; }, [playhead]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); mediaCache.forEach(el => { if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement) el.pause(); }); }, []);

  // ---------- Thao tác lớp ----------
  const selClip = (() => { for (const tr of tracks) { const c = tr.clips.find(c => c.id === selId); if (c) return { track: tr, clip: c }; } return null; })();

  const addClipFromAsset = (asset: MvAsset) => {
    const kind: ClipKind = asset.kind === 'audio' ? 'audio' : asset.kind === 'video' ? 'video' : 'image';
    const dur = asset.duration_ms && asset.duration_ms > 0 ? asset.duration_ms : (kind === 'image' ? 5000 : 5000);
    const clip: Clip = { id: uid(), kind, name: asset.title, src: asset.url, thumb: asset.thumb_url || undefined, start: playheadRef.current, dur, inPoint: 0, srcDur: asset.duration_ms || undefined, props: defaultProps() };
    setTracks(prev => {
      const next = prev.length ? [...prev] : [{ id: uid(), name: 'Lớp 1', clips: [] }];
      // đặt vào track phù hợp (audio xuống track audio cuối, hình lên track đầu); đơn giản: track 0
      const idx = kind === 'audio' ? next.length - 1 : 0;
      next[idx] = { ...next[idx], clips: [...next[idx].clips, clip] };
      return next;
    });
    markDirty(); setSelId(clip.id);
  };

  const addTextClip = () => {
    const clip: Clip = { id: uid(), kind: 'text', name: 'Văn bản', start: playheadRef.current, dur: 4000, inPoint: 0, props: defaultProps() };
    setTracks(prev => { const next = prev.length ? [...prev] : [{ id: uid(), name: 'Lớp 1', clips: [] }]; next[0] = { ...next[0], clips: [...next[0].clips, clip] }; return next; });
    markDirty(); setSelId(clip.id);
  };

  const addTrack = () => { setTracks(prev => [{ id: uid(), name: `Lớp ${prev.length + 1}`, clips: [] }, ...prev]); markDirty(); };

  const updateClip = (id: string, patch: Partial<Clip>) => {
    setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.map(c => c.id === id ? { ...c, ...patch } : c) }))); markDirty();
  };
  const updateClipProps = (id: string, patch: Partial<ClipProps>) => {
    setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.map(c => c.id === id ? { ...c, props: { ...c.props, ...patch } } : c) }))); markDirty();
  };
  const deleteClip = (id: string) => { setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.filter(c => c.id !== id) }))); if (selId === id) setSelId(null); markDirty(); };
  const duplicateClip = (id: string) => {
    const found = selClip; if (!found || found.clip.id !== id) return;
    const c = found.clip; const copy: Clip = { ...c, id: uid(), start: c.start + c.dur, props: { ...c.props } };
    setTracks(prev => prev.map(tr => tr.id === found.track.id ? { ...tr, clips: [...tr.clips, copy] } : tr)); markDirty(); setSelId(copy.id);
  };
  const splitAtPlayhead = () => {
    if (!selClip) return; const { clip } = selClip; const t = playheadRef.current;
    if (t <= clip.start + 30 || t >= clip.start + clip.dur - 30) return;
    const left: Clip = { ...clip, dur: t - clip.start };
    const right: Clip = { ...clip, id: uid(), start: t, dur: clip.start + clip.dur - t, inPoint: clip.inPoint + (t - clip.start) };
    setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.flatMap(c => c.id === clip.id ? [left, right] : [c]) }))); markDirty();
  };
  const toggleTrack = (id: string, key: 'locked' | 'hidden' | 'muted') => { setTracks(prev => prev.map(tr => tr.id === id ? { ...tr, [key]: !tr[key] } : tr)); markDirty(); };

  // ---------- Kéo lớp trên dòng thời gian ----------
  const dragRef = useRef<{ id: string; mode: 'move' | 'l' | 'r'; startX: number; orig: Clip } | null>(null);
  const onClipPointerDown = (e: React.PointerEvent, tr: Track, clip: Clip, mode: 'move' | 'l' | 'r') => {
    if (tr.locked) return;
    e.stopPropagation(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { id: clip.id, mode, startX: e.clientX, orig: { ...clip } }; setSelId(clip.id);
  };
  const onTimelinePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    const deltaMs = ((e.clientX - d.startX) / pxPerSec) * 1000;
    let patch: Partial<Clip> = {};
    if (d.mode === 'move') patch = { start: Math.max(0, Math.round(d.orig.start + deltaMs)) };
    else if (d.mode === 'l') { const ns = Math.max(0, Math.min(d.orig.start + d.orig.dur - 100, d.orig.start + deltaMs)); patch = { start: Math.round(ns), dur: Math.round(d.orig.dur - (ns - d.orig.start)), inPoint: Math.max(0, Math.round(d.orig.inPoint + (ns - d.orig.start))) }; }
    else patch = { dur: Math.max(100, Math.round(d.orig.dur + deltaMs)) };
    updateClip(d.id, patch);
  };
  const onTimelinePointerUp = () => { dragRef.current = null; };

  // ---------- Xuất bản nhẹ (webm) ----------
  const exportVideo = async () => {
    const cv = canvasRef.current; if (!cv || duration <= 0) { addNotification('Chưa có nội dung để xuất.', 'warning'); return; }
    setExporting(true); setExpProgress(0);
    try {
      const fps = project?.fps || 30;
      const stream = (cv as any).captureStream(fps) as MediaStream;
      // Trộn tiếng các lớp qua WebAudio.
      let audioCtx: AudioContext | null = null;
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        const seen = new Set<string>();
        tracksRef.current.forEach(tr => tr.clips.forEach(c => {
          if ((c.kind === 'video' || c.kind === 'audio') && c.src) {
            const key = c.kind + '|' + c.src; if (seen.has(key)) return; seen.add(key);
            const el = getMediaEl(c) as HTMLMediaElement;
            try { const node = (el as any)._mvNode || audioCtx!.createMediaElementSource(el); (el as any)._mvNode = node; node.connect(dest); node.connect(audioCtx!.destination); } catch {}
          }
        }));
        dest.stream.getAudioTracks().forEach(tk => stream.addTrack(tk));
      } catch {}
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' })); });
      rec.start(100);
      // Phát từ đầu theo thời gian thực để thu.
      playheadRef.current = 0; setPlayhead(0);
      await new Promise<void>(resolve => {
        const t0 = performance.now();
        const step = () => {
          const t = performance.now() - t0;
          playheadRef.current = t; setPlayhead(t); manageMedia(t, true); draw(t);
          setExpProgress(Math.min(99, Math.round((t / duration) * 100)));
          if (t >= duration) { resolve(); return; }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      manageMedia(duration, false); rec.stop();
      const blob = await done;
      if (audioCtx) audioCtx.close().catch(() => {});
      // Tải về máy.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${(title || 'remier').replace(/\s+/g, '_')}.webm`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      // Lưu vào kho của tôi (nhóm Bản xuất).
      try {
        const file = new File([blob], `${(title || 'remier')}.webm`, { type: 'video/webm' });
        const upUrl = await uploadAssetFile(file);
        await addAsset({ kind: 'export', title: `${title} (bản xuất)`, url: upUrl, mime_type: 'video/webm', size_bytes: blob.size, duration_ms: Math.round(duration), owner_name: currentUser.fullName });
      } catch {}
      addNotification('Đã xuất video (bản nhẹ webm) và tải về máy.', 'success');
    } catch (e: any) { addNotification('Lỗi xuất video: ' + (e.message || e), 'error'); }
    finally { setExporting(false); setExpProgress(0); }
  };

  // ---------- Phím tắt ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'Delete' && selId) { deleteClip(selId); }
      else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && selClip) { splitAtPlayhead(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); persist(false); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D') && selId) { e.preventDefault(); duplicateClip(selId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, selClip, playing]);

  if (!project) return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900 text-slate-300"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0f1216] text-slate-200" style={{ minWidth: 1280 }}>
      {/* Thanh công cụ trên */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[#151a21] px-3">
        <button onClick={() => { persist(true); onExit(); }} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 hover:bg-white/10" title="Thoát về hệ thống"><ArrowLeft className="h-4 w-4" /></button>
        <input value={title} onChange={e => { setTitle(e.target.value); markDirty(); }} className="w-56 rounded-lg bg-transparent px-2 py-1 text-sm font-bold text-white outline-none hover:bg-white/5 focus:bg-white/10" />
        <span className="text-[11px] text-slate-400">{saving ? 'Đang lưu...' : savedAt ? `Đã lưu ${savedAt}` : 'Tự lưu sau 15 giây'}</span>
        <span className="ml-2 rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-400">{W}×{H} · {project.fps}fps</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => persist(false)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold hover:bg-white/10">Lưu</button>
          <button onClick={exportVideo} disabled={exporting} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-60">{exporting ? <><Loader2 className="h-4 w-4 animate-spin" /> {expProgress}%</> : <><Download className="h-4 w-4" /> Xuất video</>}</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Cột thư viện trái */}
        <LibraryPanel currentUser={currentUser} onAddAsset={addClipFromAsset} onAddText={addTextClip} />

        {/* Khung xem trước */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center bg-[#0b0e12] p-4">
            <canvas ref={canvasRef} width={W} height={H} className="max-h-full max-w-full rounded-lg bg-black shadow-2xl" style={{ aspectRatio: `${W}/${H}` }} />
          </div>
          <div className="flex h-11 shrink-0 items-center gap-3 border-t border-white/10 bg-[#151a21] px-4">
            <button onClick={togglePlay} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 hover:bg-white/10">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
            <span className="font-mono text-xs text-slate-300">{fmtTime(playhead)} / {fmtTime(duration)}</span>
          </div>
        </div>

        {/* Bảng thuộc tính phải */}
        <div className="w-[320px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#151a21] p-4">
          {selClip ? <PropsPanel clip={selClip.clip} onProps={(p) => updateClipProps(selClip.clip.id, p)} onClip={(p) => updateClip(selClip.clip.id, p)} onDelete={() => deleteClip(selClip.clip.id)} onDuplicate={() => duplicateClip(selClip.clip.id)} />
            : <div className="mt-10 text-center text-xs text-slate-500">Chọn một lớp trên dòng thời gian để chỉnh thuộc tính.</div>}
        </div>
      </div>

      {/* Dòng thời gian */}
      <div className="h-[240px] shrink-0 border-t border-white/10 bg-[#12161c]" onPointerMove={onTimelinePointerMove} onPointerUp={onTimelinePointerUp}>
        <div className="flex h-10 items-center gap-1 border-b border-white/10 px-2">
          <button onClick={addTrack} title="Thêm lớp" className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10"><Layers className="h-3.5 w-3.5" /></button>
          <button onClick={splitAtPlayhead} title="Cắt tại đầu phát (S)" disabled={!selClip} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-40"><Scissors className="h-3.5 w-3.5" /></button>
          <button onClick={() => selId && duplicateClip(selId)} title="Nhân đôi (Ctrl+D)" disabled={!selId} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-40"><Copy className="h-3.5 w-3.5" /></button>
          <button onClick={() => selId && deleteClip(selId)} title="Xóa (Delete)" disabled={!selId} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
          <button onClick={addTextClip} title="Thêm chữ (T)" className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10"><Type className="h-3.5 w-3.5" /></button>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setPxPerSec(v => Math.max(20, v - 20))} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10"><ZoomOut className="h-3.5 w-3.5" /></button>
            <button onClick={() => setPxPerSec(v => Math.min(300, v + 20))} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10"><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <Timeline tracks={tracks} pxPerSec={pxPerSec} playhead={playhead} duration={duration} selId={selId}
          onSeek={(t) => { setPlayhead(t); playheadRef.current = t; }}
          onSelect={setSelId} onClipPointerDown={onClipPointerDown} onToggleTrack={toggleTrack} />
      </div>
    </div>
  );
}

// ============================ Thư viện trái ============================
function LibraryPanel({ currentUser, onAddAsset, onAddText }: { currentUser: UserAccount; onAddAsset: (a: MvAsset) => void; onAddText: () => void; }) {
  const { addNotification } = useNotifications();
  const [tab, setTab] = useState<'mine' | 'shared' | 'text'>('mine');
  const [assets, setAssets] = useState<MvAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (tab === 'text') return;
    setLoading(true);
    try { setAssets(tab === 'mine' ? await getMyAssets() : await getSharedAssets()); }
    catch (e: any) { addNotification('Lỗi tải tư liệu: ' + (e.message || e), 'error'); }
    finally { setLoading(false); }
  }, [tab, addNotification]);
  useEffect(() => { load(); }, [load]);

  // Đọc thông tin media để lưu thời lượng, kích thước.
  const probe = (file: File, kind: MvKind): Promise<{ duration_ms?: number; width?: number; height?: number; thumb?: string }> => new Promise(res => {
    const url = URL.createObjectURL(file);
    if (kind === 'image') { const im = new Image(); im.onload = () => { res({ width: im.naturalWidth, height: im.naturalHeight, thumb: url }); }; im.onerror = () => res({}); im.src = url; }
    else if (kind === 'video') {
      const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.src = url;
      v.onloadedmetadata = () => { v.currentTime = Math.min(0.1, v.duration || 0); };
      v.onseeked = () => { try { const c = document.createElement('canvas'); c.width = 320; c.height = Math.round(320 * (v.videoHeight / v.videoWidth || 0.56)); c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height); res({ duration_ms: Math.round(v.duration * 1000), width: v.videoWidth, height: v.videoHeight, thumb: c.toDataURL('image/jpeg', 0.7) }); } catch { res({ duration_ms: Math.round(v.duration * 1000), width: v.videoWidth, height: v.videoHeight }); } };
      v.onerror = () => res({});
    }
    else if (kind === 'audio') { const a = document.createElement('audio'); a.preload = 'metadata'; a.src = url; a.onloadedmetadata = () => res({ duration_ms: Math.round(a.duration * 1000) }); a.onerror = () => res({}); }
    else res({});
  });

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const kind: MvKind = f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'audio' : 'image';
        const meta = await probe(f, kind);
        const url = await uploadAssetFile(f);
        await addAsset({ kind, title: f.name, url, thumb_url: kind === 'image' ? url : (meta.thumb && meta.thumb.startsWith('data:') ? undefined : undefined), mime_type: f.type, size_bytes: f.size, duration_ms: meta.duration_ms, width: meta.width, height: meta.height, owner_name: currentUser.fullName });
      }
      addNotification('Đã tải tư liệu lên.', 'success'); load();
    } catch (e: any) { addNotification('Lỗi tải lên: ' + (e.message || e), 'error'); }
    finally { setUploading(false); }
  };

  const kindIcon = (k: MvKind) => k === 'video' ? Film : k === 'audio' ? Music : k === 'export' ? Download : ImageIcon;

  return (
    <div className="flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#151a21]">
      <div className="flex gap-1 p-2">
        {(['mine', 'shared', 'text'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold ${tab === t ? 'bg-brand text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{t === 'mine' ? 'Kho của tôi' : t === 'shared' ? 'Thư viện chung' : 'Văn bản'}</button>
        ))}
      </div>
      {tab === 'text' ? (
        <div className="p-3">
          <button onClick={onAddText} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-4 text-xs font-bold text-slate-300 hover:border-brand hover:text-brand"><Type className="h-4 w-4" /> Thêm lớp văn bản</button>
          <p className="mt-2 text-[11px] text-slate-500">Kéo vào dòng thời gian bằng cách bấm nút trên. Chọn lớp để sửa nội dung, phông, màu ở bảng bên phải.</p>
        </div>
      ) : (
        <>
          {tab === 'mine' && (
            <div className="px-3 pb-2">
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-60">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Tải tư liệu lên</button>
              <input ref={fileRef} type="file" multiple accept="video/*,image/*,audio/*" className="hidden" onChange={e => onFiles(e.target.files)} />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {loading ? <div className="py-10 text-center text-xs text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
              : assets.length === 0 ? <p className="py-10 text-center text-xs text-slate-500">Chưa có tư liệu.</p>
              : (
                <div className="grid grid-cols-2 gap-2">
                  {assets.map(a => { const Icon = kindIcon(a.kind); return (
                    <button key={a.id} onClick={() => onAddAsset(a)} title={`Thêm "${a.title}" vào dòng thời gian`} className="group overflow-hidden rounded-lg border border-white/10 bg-black/30 text-left hover:border-brand">
                      <div className="grid aspect-video place-items-center bg-black/40">
                        {a.thumb_url ? <img src={a.thumb_url} alt="" className="h-full w-full object-cover" /> : <Icon className="h-6 w-6 text-slate-500" />}
                      </div>
                      <div className="p-1.5"><p className="truncate text-[10px] font-semibold text-slate-300">{a.title}</p>{a.duration_ms ? <p className="text-[9px] text-slate-500">{fmtTime(a.duration_ms)}</p> : null}</div>
                    </button>
                  ); })}
                </div>
              )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================ Dòng thời gian ============================
function Timeline({ tracks, pxPerSec, playhead, duration, selId, onSeek, onSelect, onClipPointerDown, onToggleTrack }: {
  tracks: Track[]; pxPerSec: number; playhead: number; duration: number; selId: string | null;
  onSeek: (t: number) => void; onSelect: (id: string) => void;
  onClipPointerDown: (e: React.PointerEvent, tr: Track, c: Clip, mode: 'move' | 'l' | 'r') => void;
  onToggleTrack: (id: string, k: 'locked' | 'hidden' | 'muted') => void;
}) {
  const totalMs = Math.max(duration, 10000) + 4000;
  const width = (totalMs / 1000) * pxPerSec;
  const rulerRef = useRef<HTMLDivElement>(null);
  const seek = (e: React.MouseEvent) => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); const x = e.clientX - rect.left + (e.currentTarget as HTMLElement).scrollLeft; onSeek(Math.max(0, (x / pxPerSec) * 1000)); };
  const ticks = []; const stepSec = pxPerSec < 50 ? 5 : pxPerSec < 120 ? 2 : 1;
  for (let s = 0; s * 1000 <= totalMs; s += stepSec) ticks.push(s);

  if (tracks.length === 0) {
    return <div className="grid h-[180px] place-items-center text-center text-xs text-slate-500"><div><Film className="mx-auto mb-2 h-8 w-8 text-slate-600" /><p>Chưa có lớp nào.</p><p className="mt-1 text-slate-600">Chọn tư liệu ở cột trái rồi bấm để thêm vào dòng thời gian.</p></div></div>;
  }

  return (
    <div className="flex h-[190px]">
      {/* Đầu hàng lớp */}
      <div className="w-32 shrink-0 border-r border-white/10">
        <div className="h-6 border-b border-white/10" />
        {tracks.map(tr => (
          <div key={tr.id} className="flex h-14 items-center gap-1 border-b border-white/5 px-2">
            <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-300">{tr.name}</span>
            <button onClick={() => onToggleTrack(tr.id, 'hidden')} title="Ẩn/hiện" className="text-slate-500 hover:text-slate-200">{tr.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
            <button onClick={() => onToggleTrack(tr.id, 'locked')} title="Khóa" className="text-slate-500 hover:text-slate-200">{tr.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}</button>
          </div>
        ))}
      </div>
      {/* Vùng lớp cuộn ngang */}
      <div className="relative min-w-0 flex-1 overflow-x-auto">
        <div style={{ width }}>
          {/* Thước */}
          <div ref={rulerRef} onClick={seek} className="relative h-6 cursor-pointer border-b border-white/10 bg-[#0e1319]">
            {ticks.map(s => <div key={s} className="absolute top-0 h-full border-l border-white/10" style={{ left: s * pxPerSec }}><span className="ml-1 text-[9px] text-slate-500">{s}s</span></div>)}
          </div>
          {/* Hàng lớp */}
          {tracks.map(tr => (
            <div key={tr.id} className="relative h-14 border-b border-white/5" onClick={seek}>
              {tr.clips.map(c => {
                const left = (c.start / 1000) * pxPerSec; const w = (c.dur / 1000) * pxPerSec; const sel = selId === c.id;
                const color = c.kind === 'audio' ? 'bg-emerald-500/25 border-emerald-400/50' : c.kind === 'text' ? 'bg-violet-500/25 border-violet-400/50' : c.kind === 'video' ? 'bg-blue-500/25 border-blue-400/50' : 'bg-amber-500/25 border-amber-400/50';
                return (
                  <div key={c.id} onClick={e => { e.stopPropagation(); onSelect(c.id); }}
                    onPointerDown={e => onClipPointerDown(e, tr, c, 'move')}
                    className={`absolute top-1.5 h-11 cursor-grab overflow-hidden rounded-md border ${color} ${sel ? 'ring-2 ring-brand' : ''}`} style={{ left, width: Math.max(8, w) }}>
                    <div onPointerDown={e => onClipPointerDown(e, tr, c, 'l')} className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize bg-white/10" />
                    <div onPointerDown={e => onClipPointerDown(e, tr, c, 'r')} className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize bg-white/10" />
                    <div className="flex h-full items-center gap-1 px-2">
                      {c.thumb && c.kind !== 'text' && <img src={c.thumb} alt="" className="h-8 w-10 shrink-0 rounded object-cover" />}
                      <span className="truncate text-[10px] font-semibold text-slate-100">{c.kind === 'text' ? (c.props.text || 'Văn bản') : c.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {/* Đầu phát */}
          <div className="pointer-events-none absolute top-0 z-20 h-full w-[2px] bg-rose-500" style={{ left: (playhead / 1000) * pxPerSec }}><div className="absolute -left-1.5 top-0 h-3 w-3 rounded-sm bg-rose-500" /></div>
        </div>
      </div>
    </div>
  );
}

// ============================ Bảng thuộc tính ============================
function PropsPanel({ clip, onProps, onClip, onDelete, onDuplicate }: { clip: Clip; onProps: (p: Partial<ClipProps>) => void; onClip: (p: Partial<Clip>) => void; onDelete: () => void; onDuplicate: () => void; }) {
  const p = clip.props;
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-3"><label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{label}</label>{children}</div>
  );
  const num = (v: number, on: (n: number) => void, step = 1, min?: number, max?: number) => (
    <input type="number" value={v} step={step} min={min} max={max} onChange={e => on(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-brand" />
  );
  const slider = (v: number, on: (n: number) => void, min: number, max: number, step = 0.01) => (
    <input type="range" min={min} max={max} step={step} value={v} onChange={e => on(Number(e.target.value))} className="w-full accent-[var(--color-brand,#22c55e)]" />
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-black uppercase text-slate-300">{clip.kind === 'text' ? 'Lớp văn bản' : clip.kind === 'audio' ? 'Lớp âm thanh' : clip.kind === 'video' ? 'Lớp video' : 'Lớp hình ảnh'}</span>
        <div className="flex gap-1">
          <button onClick={onDuplicate} title="Nhân đôi" className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10"><Copy className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} title="Xóa" className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-rose-500/20 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {clip.kind === 'text' && (
        <>
          <Row label="Nội dung"><textarea value={p.text} onChange={e => onProps({ text: e.target.value })} rows={3} className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-brand" /></Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Cỡ chữ">{num(p.fontSize, v => onProps({ fontSize: v }), 1, 8)}</Row>
            <Row label="Độ đậm">{num(p.fontWeight, v => onProps({ fontWeight: v }), 100, 100, 900)}</Row>
          </div>
          <Row label="Màu chữ"><input type="color" value={p.color} onChange={e => onProps({ color: e.target.value })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5" /></Row>
        </>
      )}

      {(clip.kind === 'video' || clip.kind === 'image' || clip.kind === 'text') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Ngang %">{num(p.x, v => onProps({ x: v }))}</Row>
            <Row label="Dọc %">{num(p.y, v => onProps({ y: v }))}</Row>
          </div>
          <Row label={`Tỉ lệ ${p.scale.toFixed(2)}`}>{slider(p.scale, v => onProps({ scale: v }), 0.1, 3)}</Row>
          <Row label={`Xoay ${p.rotation}°`}>{slider(p.rotation, v => onProps({ rotation: v }), -180, 180, 1)}</Row>
          <Row label={`Độ mờ đục ${Math.round(p.opacity * 100)}%`}>{slider(p.opacity, v => onProps({ opacity: v }), 0, 1)}</Row>
        </>
      )}

      {(clip.kind === 'video' || clip.kind === 'audio') && (
        <Row label={`Âm lượng ${Math.round(p.volume * 100)}%`}>{slider(p.volume, v => onProps({ volume: v }), 0, 1)}</Row>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Row label="Bắt đầu (giây)">{num(Math.round(clip.start) / 1000, v => onClip({ start: Math.max(0, Math.round(v * 1000)) }), 0.1, 0)}</Row>
        <Row label="Thời lượng (giây)">{num(Math.round(clip.dur) / 1000, v => onClip({ dur: Math.max(0.1, Math.round(v * 1000)) }), 0.1, 0.1)}</Row>
      </div>
    </div>
  );
}
