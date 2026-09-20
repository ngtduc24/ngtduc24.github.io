import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Scissors, Trash2, Copy, Lock, Unlock, Eye, EyeOff, Type, Download, ArrowLeft,
  Upload, Loader2, Film, Image as ImageIcon, Music, ZoomIn, ZoomOut, Maximize2, Captions,
  Volume2, VolumeX, Headphones, Plus, Frame, Sticker, Sparkles, ArrowLeftRight, SlidersHorizontal,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { useNotifications } from '../NotificationContext';
import {
  MvProject, MvAsset, MvKind, getProject, updateProject, getMyAssets, getSharedAssets,
  uploadAssetFile, addAsset, saveSharedToMine,
} from '../../lib/remier';

interface Props { projectId: string; currentUser: UserAccount; onExit: () => void; }

type ClipKind = 'video' | 'image' | 'audio' | 'text';
type LaneKind = 'video' | 'audio';
type LeftPanel = 'media' | 'audio' | 'text' | 'caption' | 'sticker' | 'effect' | 'transition' | 'filter';
const TOP_TABS: { id: LeftPanel; label: string; icon: any; soon?: boolean }[] = [
  { id: 'media', label: 'Tệp phương tiện', icon: Film },
  { id: 'audio', label: 'Âm thanh', icon: Music },
  { id: 'text', label: 'Văn bản', icon: Type },
  { id: 'caption', label: 'Chú thích', icon: Captions },
  { id: 'sticker', label: 'Nhãn dán', icon: Sticker, soon: true },
  { id: 'effect', label: 'Hiệu ứng', icon: Sparkles, soon: true },
  { id: 'transition', label: 'Chuyển tiếp', icon: ArrowLeftRight, soon: true },
  { id: 'filter', label: 'Bộ lọc', icon: SlidersHorizontal, soon: true },
];
interface ClipProps { x: number; y: number; scale: number; rotation: number; opacity: number; volume: number; text: string; fontSize: number; color: string; fontWeight: number; align: string; }
interface Clip { id: string; kind: ClipKind; name: string; src?: string; thumb?: string; start: number; dur: number; inPoint: number; srcDur?: number; fadeIn?: number; fadeOut?: number; props: ClipProps; }
interface Track { id: string; name: string; kind: LaneKind; text?: boolean; locked?: boolean; hidden?: boolean; muted?: boolean; solo?: boolean; clips: Clip[]; }

const defaultProps = (): ClipProps => ({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, volume: 1, text: 'Nội dung chữ', fontSize: 64, color: '#ffffff', fontWeight: 700, align: 'center' });
const uid = () => Math.random().toString(36).slice(2, 10);
// Hệ số mờ dần theo vị trí thời gian trong lớp (0..1).
const fadeFactor = (clip: Clip, t: number) => {
  const into = t - clip.start; const left = clip.start + clip.dur - t;
  let f = 1;
  if (clip.fadeIn && into < clip.fadeIn) f = Math.max(0, into / clip.fadeIn);
  if (clip.fadeOut && left < clip.fadeOut) f = Math.min(f, Math.max(0, left / clip.fadeOut));
  return f;
};
const fmtTime = (ms: number) => {
  const s = Math.max(0, ms) / 1000; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); const f = Math.floor((s % 1) * 30);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
};

// Phân tích phụ đề SRT hoặc VTT thành danh sách cue {start,dur,text} theo ms.
function parseSubtitles(raw: string): { start: number; dur: number; text: string }[] {
  const toMs = (s: string) => { const m = s.trim().replace(',', '.').match(/(\d+):(\d+):(\d+(?:\.\d+)?)/); if (!m) return 0; return (parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])) * 1000; };
  const out: { start: number; dur: number; text: string }[] = [];
  const blocks = raw.replace(/\r/g, '').replace(/^WEBVTT.*\n/, '').split(/\n\n+/);
  for (const b of blocks) {
    const lines = b.split('\n').filter(Boolean); if (!lines.length) continue;
    const tl = lines.find(l => l.includes('-->')); if (!tl) continue;
    const [a, z] = tl.split('-->'); const start = toMs(a); const end = toMs(z);
    const text = lines.slice(lines.indexOf(tl) + 1).join('\n').trim();
    if (text && end > start) out.push({ start, dur: end - start, text });
  }
  return out;
}

// Các định dạng xuất mà trình duyệt hỗ trợ (dò một lần).
const FORMAT_OPTIONS: { v: string; mime: string; ext: string; label: string }[] = (() => {
  const o: { v: string; mime: string; ext: string; label: string }[] = [];
  try {
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.640028,mp4a.40.2')) o.push({ v: 'mp4', mime: 'video/mp4;codecs=avc1.640028,mp4a.40.2', ext: 'mp4', label: 'mp4 (H.264)' });
      else if (MediaRecorder.isTypeSupported('video/mp4')) o.push({ v: 'mp4', mime: 'video/mp4', ext: 'mp4', label: 'mp4' });
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) o.push({ v: 'webm-vp9', mime: 'video/webm;codecs=vp9,opus', ext: 'webm', label: 'webm (VP9)' });
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) o.push({ v: 'webm-vp8', mime: 'video/webm;codecs=vp8,opus', ext: 'webm', label: 'webm (VP8)' });
    }
  } catch {}
  if (!o.length) o.push({ v: 'webm', mime: 'video/webm', ext: 'webm', label: 'webm' });
  return o;
})();

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

// --------- Âm thanh dùng chung cho cả xem trước và xuất video ---------
// Định tuyến mọi media qua một AudioContext duy nhất để tiếng luôn ra loa,
// đồng thời khi xuất chỉ cần nối thêm vào MediaStreamDestination.
let sharedCtx: AudioContext | null = null;
const srcNodeMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
function ensureAudioCtx(): AudioContext {
  if (!sharedCtx) sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
  return sharedCtx;
}
function sourceNodeFor(el: HTMLMediaElement): MediaElementAudioSourceNode | null {
  try {
    const ctx = ensureAudioCtx();
    let n = srcNodeMap.get(el);
    if (!n) { n = ctx.createMediaElementSource(el); n.connect(ctx.destination); srcNodeMap.set(el, n); }
    return n;
  } catch { return null; }
}

export default function RemierEditor({ projectId, currentUser, onExit }: Props) {
  const { addNotification } = useNotifications();
  const [project, setProject] = useState<MvProject | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [title, setTitle] = useState('');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [pxPerSec, setPxPerSec] = useState(80);
  const [savedAt, setSavedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expProgress, setExpProgress] = useState(0);

  // Hộp thoại xuất video.
  const [showExport, setShowExport] = useState(false);
  const [expName, setExpName] = useState('');
  const [expRes, setExpRes] = useState(1080);
  const [expFps, setExpFps] = useState(30);
  const [expBitrate, setExpBitrate] = useState<'low' | 'rec' | 'high'>('high');
  const [expFormat, setExpFormat] = useState('');
  const [expAudio, setExpAudio] = useState(true);
  const [expSubs, setExpSubs] = useState(false);
  const [expCover, setExpCover] = useState('');

  // Khung xem trước.
  const [previewFit, setPreviewFit] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [safeFrame, setSafeFrame] = useState(false);
  const [zoomMenu, setZoomMenu] = useState(false);
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('media');
  const [transformMode, setTransformMode] = useState(false);

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
        // Tương thích dữ liệu cũ chưa có trường kind cho lớp.
        setTracks((p.timeline?.tracks || []).map((t: any) => ({
          ...t,
          kind: (t.kind === 'audio' ? 'audio' : 'video') as LaneKind,
          clips: t.clips || [],
        })));
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
  // Vẽ một lớp trong hệ tọa độ logic W×H (không phụ thuộc kích thước canvas thật),
  // nhờ vậy xuất ở độ phân giải nào chữ và bố cục vẫn đúng tỉ lệ.
  const drawClipVisual = (ctx: CanvasRenderingContext2D, clip: Clip, LW: number, LH: number, t: number) => {
    const p = clip.props;
    const alpha = p.opacity * fadeFactor(clip, t);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(LW / 2 + (p.x / 100) * LW, LH / 2 + (p.y / 100) * LH);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.scale(p.scale, p.scale);
    if (clip.kind === 'text') {
      ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
      ctx.font = `${p.fontWeight} ${p.fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = (p.align as CanvasTextAlign) || 'center'; ctx.textBaseline = 'middle';
      // Viền mỏng cho chữ dễ đọc trên nền sáng.
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, p.fontSize / 16); ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      const lines = (p.text || '').split('\n');
      lines.forEach((ln, i) => {
        const yy = (i - (lines.length - 1) / 2) * p.fontSize * 1.2;
        ctx.strokeText(ln, 0, yy); ctx.fillText(ln, 0, yy);
      });
    } else {
      const el = getMediaEl(clip) as HTMLVideoElement | HTMLImageElement | null;
      if (el) {
        const iw = (el as any).videoWidth || (el as any).naturalWidth || LW;
        const ih = (el as any).videoHeight || (el as any).naturalHeight || LH;
        if (iw && ih) {
          const scale = Math.min(LW / iw, LH / ih); // contain
          const dw = iw * scale, dh = ih * scale;
          try { ctx.drawImage(el as CanvasImageSource, -dw / 2, -dh / 2, dw, dh); } catch {}
        }
      }
    }
    ctx.restore();
  };
  // Vẽ toàn bộ khung hình vào một canvas bất kỳ tại thời điểm t.
  const drawTo = useCallback((cv: HTMLCanvasElement | null, t: number) => {
    if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.scale(cv.width / W, cv.height / H);
    const tk = tracksRef.current;
    for (let i = tk.length - 1; i >= 0; i--) {
      const c = activeClip(tk[i], t);
      if (c && c.kind !== 'audio') drawClipVisual(ctx, c, W, H, t);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H]);
  const draw = useCallback((t: number) => { drawTo(canvasRef.current, t); }, [drawTo]);

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
    const anySolo = tk.some(tr => tr.solo);
    const activeSrcs = new Set<string>();
    tk.forEach(track => {
      const c = activeClip(track, t);
      if (c && (c.kind === 'video' || c.kind === 'audio') && c.src) {
        activeSrcs.add(c.kind + '|' + c.src);
        const el = getMediaEl(c) as HTMLVideoElement | HTMLAudioElement;
        if (el) {
          const audible = !track.muted && (!anySolo || !!track.solo);
          el.muted = !audible;
          el.volume = Math.max(0, Math.min(1, c.props.volume * fadeFactor(c, t)));
          const want = (c.inPoint + (t - c.start)) / 1000;
          if (isPlaying) {
            sourceNodeFor(el); // đảm bảo tiếng đi ra loa qua AudioContext chung
            if (Math.abs(el.currentTime - want) > 0.25) { try { el.currentTime = want; } catch {} }
            if (el.paused) el.play().catch(() => {});
          }
        }
      }
    });
    // dừng các media không còn active
    mediaCache.forEach((el, key) => { if (!activeSrcs.has(key) && (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement)) { if (!el.paused) el.pause(); } });
  };

  // Dừng hẳn mọi media (video + tiếng). Dùng khi bấm dừng hoặc chạy hết.
  const pauseAllMedia = () => {
    mediaCache.forEach(el => { if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement) { try { el.pause(); } catch {} } });
  };

  const loop = useCallback((ts: number) => {
    if (!lastTsRef.current) lastTsRef.current = ts;
    const dt = ts - lastTsRef.current; lastTsRef.current = ts;
    let t = playheadRef.current + dt;
    const dur = tracksRef.current.reduce((mx, tr) => Math.max(mx, tr.clips.reduce((m, c) => Math.max(m, c.start + c.dur), 0)), 0);
    if (t >= dur) { t = dur; playheadRef.current = t; setPlayhead(t); draw(t); pauseAllMedia(); setPlaying(false); return; }
    playheadRef.current = t; setPlayhead(t); manageMedia(t, true); draw(t);
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false); if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; lastTsRef.current = 0;
      pauseAllMedia();
    } else {
      ensureAudioCtx(); // mở khóa âm thanh bằng thao tác người dùng
      if (playheadRef.current >= duration) { playheadRef.current = 0; setPlayhead(0); }
      setPlaying(true); lastTsRef.current = 0; rafRef.current = requestAnimationFrame(loop);
    }
  };
  useEffect(() => { playheadRef.current = playhead; }, [playhead]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); mediaCache.forEach(el => { if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement) el.pause(); }); }, []);

  // ---------- Thao tác lớp ----------
  const selClip = (() => { for (const tr of tracks) { const c = tr.clips.find(c => c.id === selId); if (c) return { track: tr, clip: c }; } return null; })();

  // Tìm hoặc tạo lớp phù hợp cho loại nội dung. video/hình/chữ vào lớp video,
  // âm thanh vào lớp tiếng. Nếu chưa có thì tự tạo.
  // Đặt clip media vào lớp phù hợp (không dùng lớp chữ). Có thể chỉ định lớp đích và vị trí bắt đầu.
  const placeClipAt = (clip: Clip, lane: LaneKind, trackId?: string, start?: number) => {
    setTracks(prev => {
      const next = [...prev];
      let idx = -1;
      if (trackId) { const i = next.findIndex(t => t.id === trackId); if (i >= 0 && !next[i].locked && !next[i].text && (next[i].kind === 'audio') === (lane === 'audio')) idx = i; }
      if (idx < 0) idx = lane === 'audio' ? next.findIndex(t => t.kind === 'audio' && !t.locked) : next.findIndex(t => t.kind === 'video' && !t.locked && !t.text);
      if (idx < 0) {
        const vCount = next.filter(t => t.kind === 'video' && !t.text).length;
        const aCount = next.filter(t => t.kind === 'audio').length;
        const nt: Track = { id: uid(), kind: lane, name: lane === 'audio' ? `Tiếng ${aCount + 1}` : `Video ${vCount + 1}`, clips: [] };
        if (lane === 'audio') { next.push(nt); idx = next.length - 1; }
        else { next.unshift(nt); idx = 0; }
      }
      const c = start != null ? { ...clip, start: Math.max(0, Math.round(start)) } : clip;
      next[idx] = { ...next[idx], clips: [...next[idx].clips, c] };
      return next;
    });
  };
  const placeClip = (clip: Clip, lane: LaneKind) => placeClipAt(clip, lane);
  // Lớp chữ luôn nằm trên một track riêng ở trên cùng để không bị video che.
  const placeTextClip = (clip: Clip) => {
    setTracks(prev => {
      const next = [...prev];
      let idx = next.findIndex(t => t.text && !t.locked);
      if (idx < 0) { next.unshift({ id: uid(), kind: 'video', text: true, name: 'Chữ', clips: [] }); idx = 0; }
      next[idx] = { ...next[idx], clips: [...next[idx].clips, clip] };
      return next;
    });
  };

  const addClipFromAsset = (asset: MvAsset) => {
    const kind: ClipKind = asset.kind === 'audio' ? 'audio' : asset.kind === 'video' ? 'video' : 'image';
    const dur = asset.duration_ms && asset.duration_ms > 0 ? asset.duration_ms : 5000;
    const clip: Clip = { id: uid(), kind, name: asset.title, src: asset.url, thumb: asset.thumb_url || undefined, start: playheadRef.current, dur, inPoint: 0, srcDur: asset.duration_ms || undefined, props: defaultProps() };
    placeClip(clip, kind === 'audio' ? 'audio' : 'video');
    markDirty(); setSelId(clip.id);
  };

  // Kéo thả tư liệu từ kho vào một vị trí trên dòng thời gian.
  const dropAssetOnTimeline = (asset: MvAsset, trackId: string | null, timeMs: number) => {
    const kind: ClipKind = asset.kind === 'audio' ? 'audio' : asset.kind === 'video' ? 'video' : 'image';
    const dur = asset.duration_ms && asset.duration_ms > 0 ? asset.duration_ms : 5000;
    const clip: Clip = { id: uid(), kind, name: asset.title, src: asset.url, thumb: asset.thumb_url || undefined, start: Math.max(0, Math.round(timeMs)), dur, inPoint: 0, srcDur: asset.duration_ms || undefined, props: defaultProps() };
    placeClipAt(clip, kind === 'audio' ? 'audio' : 'video', trackId || undefined, clip.start);
    markDirty(); setSelId(clip.id); setTimeout(() => draw(playheadRef.current), 0);
  };

  const addTextClip = () => {
    const clip: Clip = { id: uid(), kind: 'text', name: 'Văn bản', start: playheadRef.current, dur: 4000, inPoint: 0, props: defaultProps() };
    placeTextClip(clip);
    markDirty(); setSelId(clip.id);
    // Đưa đầu phát vào trong khoảng lớp chữ và vẽ lại ngay để thấy chữ.
    seekTo(clip.start); setTimeout(() => draw(clip.start), 0);
    requestAnimationFrame(() => draw(clip.start));
  };

  const addVideoTrack = () => { setTracks(prev => { const n = prev.filter(t => t.kind === 'video').length; return [{ id: uid(), kind: 'video', name: `Video ${n + 1}`, clips: [] }, ...prev]; }); markDirty(); };
  const addAudioTrack = () => { setTracks(prev => { const n = prev.filter(t => t.kind === 'audio').length; return [...prev, { id: uid(), kind: 'audio', name: `Tiếng ${n + 1}`, clips: [] }]; }); markDirty(); };

  const updateClip = (id: string, patch: Partial<Clip>) => {
    setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.map(c => c.id === id ? { ...c, ...patch } : c) }))); markDirty();
  };
  const updateClipProps = (id: string, patch: Partial<ClipProps>) => {
    setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.map(c => c.id === id ? { ...c, props: { ...c.props, ...patch } } : c) }))); markDirty();
  };
  const deleteClip = (id: string) => { setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.filter(c => c.id !== id) }))); if (selId === id) setSelId(null); setMultiSel(m => m.filter(x => x !== id)); markDirty(); };
  // Xóa mọi clip đang chọn (một hoặc nhiều do quét vùng chọn).
  const deleteSelected = () => {
    const ids = multiSel.length ? multiSel : (selId ? [selId] : []);
    if (!ids.length) return;
    setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.filter(c => !ids.includes(c.id)) })));
    setSelId(null); setMultiSel([]); markDirty();
  };
  const selectClip = (id: string) => { setSelId(id); setMultiSel([]); };
  const onMarquee = (ids: string[]) => { setMultiSel(ids); setSelId(ids.length === 1 ? ids[0] : null); };
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
  const toggleTrack = (id: string, key: 'locked' | 'hidden' | 'muted' | 'solo') => { setTracks(prev => prev.map(tr => tr.id === id ? { ...tr, [key]: !tr[key] } : tr)); markDirty(); };
  const deleteTrack = (id: string) => { setTracks(prev => prev.filter(tr => tr.id !== id)); markDirty(); };

  // Tách âm thanh khỏi video: tạo lớp tiếng riêng, tắt tiếng lớp video gốc.
  const splitAudioFromVideo = (clip: Clip) => {
    if (clip.kind !== 'video' || !clip.src) return;
    const audioClip: Clip = { id: uid(), kind: 'audio', name: clip.name + ' (tiếng)', src: clip.src, start: clip.start, dur: clip.dur, inPoint: clip.inPoint, srcDur: clip.srcDur, fadeIn: clip.fadeIn, fadeOut: clip.fadeOut, props: { ...defaultProps(), volume: clip.props.volume } };
    updateClipProps(clip.id, { volume: 0 });
    placeClip(audioClip, 'audio');
    markDirty(); setSelId(audioClip.id); addNotification('Đã tách âm thanh thành lớp riêng.', 'success');
  };

  // Nhập phụ đề srt/vtt thành các lớp chữ trên 1 hàng riêng.
  const importSubtitles = (cues: { start: number; dur: number; text: string }[]) => {
    if (!cues.length) return;
    const clips: Clip[] = cues.map(c => ({ id: uid(), kind: 'text', name: 'Phụ đề', start: c.start, dur: c.dur, inPoint: 0, props: { ...defaultProps(), text: c.text, fontSize: 46, y: 36 } }));
    setTracks(prev => [{ id: uid(), kind: 'video', text: true, name: 'Phụ đề', clips }, ...prev]); markDirty();
    addNotification(`Đã nhập ${cues.length} dòng phụ đề.`, 'success');
  };

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  // Phóng to, thu nhỏ dòng thời gian, giữ nguyên mốc thời gian đang ở dưới con trỏ.
  const zoomTimelineAt = (factor: number, focusMs?: number) => {
    setPxPerSec(prev => {
      const next = Math.max(10, Math.min(400, Math.round(prev * factor)));
      const el = timelineScrollRef.current;
      if (el && focusMs != null && next !== prev) {
        const cursorX = (focusMs / 1000) * prev - el.scrollLeft;
        const after = (focusMs / 1000) * next;
        requestAnimationFrame(() => { if (el) el.scrollLeft = Math.max(0, after - cursorX); });
      }
      return next;
    });
  };
  const fitTimeline = () => {
    const w = timelineScrollRef.current?.clientWidth || (window.innerWidth - 460);
    const dur = Math.max(duration, 5000) / 1000;
    setPxPerSec(Math.max(20, Math.min(300, Math.floor((w - 20) / dur))));
  };

  // ---------- Kéo lớp trên dòng thời gian ----------
  const dragRef = useRef<{ ids: string[]; mode: 'move' | 'l' | 'r'; startX: number; origs: Record<string, Clip> } | null>(null);
  const onClipPointerDown = (e: React.PointerEvent, tr: Track, clip: Clip, mode: 'move' | 'l' | 'r') => {
    if (tr.locked) return;
    e.stopPropagation(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    // Nếu clip nằm trong vùng đang chọn nhiều thì kéo cả nhóm, ngược lại chọn riêng clip này.
    const inGroup = mode === 'move' && multiSel.includes(clip.id) && multiSel.length > 1;
    const ids = inGroup ? multiSel : [clip.id];
    const origs: Record<string, Clip> = {};
    tracksRef.current.forEach(t => t.clips.forEach(c => { if (ids.includes(c.id)) origs[c.id] = { ...c }; }));
    dragRef.current = { ids, mode, startX: e.clientX, origs };
    if (inGroup) setSelId(clip.id); else { setSelId(clip.id); setMultiSel([]); }
  };
  const onTimelinePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return;
    const deltaMs = ((e.clientX - d.startX) / pxPerSec) * 1000;
    // Kéo nhóm nhiều clip: dời tất cả cùng một lượng, không cho lùi qua mốc 0.
    if (d.mode === 'move' && d.ids.length > 1) {
      let delta = deltaMs;
      const minStart = Math.min(...d.ids.map(id => d.origs[id].start));
      if (minStart + delta < 0) delta = -minStart;
      setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.map(c => d.ids.includes(c.id) ? { ...c, start: Math.max(0, Math.round(d.origs[c.id].start + delta)) } : c) }))); markDirty();
      return;
    }
    const id = d.ids[0]; const orig = d.origs[id]; if (!orig) return;
    let patch: Partial<Clip> = {};
    if (d.mode === 'move') {
      let ns = Math.max(0, Math.round(orig.start + deltaMs));
      // Hít dính: bám đầu phát, mốc 0, và mép các lớp khác trong ngưỡng ~8px.
      const thr = (8 / pxPerSec) * 1000;
      const pts: number[] = [0, playheadRef.current];
      tracksRef.current.forEach(tr => tr.clips.forEach(c => { if (c.id !== id) { pts.push(c.start); pts.push(c.start + c.dur); } }));
      const ne = ns + orig.dur;
      for (const p of pts) { if (Math.abs(ns - p) < thr) { ns = p; break; } if (Math.abs(ne - p) < thr) { ns = p - orig.dur; break; } }
      patch = { start: Math.max(0, Math.round(ns)) };
    }
    else if (d.mode === 'l') { const ns = Math.max(0, Math.min(orig.start + orig.dur - 100, orig.start + deltaMs)); patch = { start: Math.round(ns), dur: Math.round(orig.dur - (ns - orig.start)), inPoint: Math.max(0, Math.round(orig.inPoint + (ns - orig.start))) }; }
    else patch = { dur: Math.max(100, Math.round(orig.dur + deltaMs)) };
    updateClip(id, patch);
  };
  const onTimelinePointerUp = () => { dragRef.current = null; };

  const seekTo = (t: number) => { const v = Math.max(0, t); setPlayhead(v); playheadRef.current = v; };

  // ---------- Xuất video ----------
  // Gom mọi lớp chữ thành nội dung phụ đề SRT.
  const buildSrt = (): string => {
    const cues: { start: number; end: number; text: string }[] = [];
    tracksRef.current.forEach(tr => tr.clips.forEach(c => { if (c.kind === 'text' && (c.props.text || '').trim()) cues.push({ start: c.start, end: c.start + c.dur, text: c.props.text }); }));
    cues.sort((a, b) => a.start - b.start);
    const f = (ms: number) => { const s = Math.max(0, ms); const h = Math.floor(s / 3600000); const m = Math.floor((s % 3600000) / 60000); const se = Math.floor((s % 60000) / 1000); const mm = Math.floor(s % 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(se).padStart(2, '0')},${String(mm).padStart(3, '0')}`; };
    return cues.map((c, i) => `${i + 1}\n${f(c.start)} --> ${f(c.end)}\n${c.text}\n`).join('\n');
  };

  const openExportDialog = () => {
    if (duration <= 0) { addNotification('Chưa có nội dung để xuất.', 'warning'); return; }
    setExpName(title || 'remier');
    setExpFps(project?.fps || 30);
    setExpRes(Math.min(1080, H));
    setExpFormat(FORMAT_OPTIONS[0].v);
    setExpAudio(true);
    setExpSubs(false);
    try { const cv = canvasRef.current; if (cv) setExpCover(cv.toDataURL('image/jpeg', 0.7)); } catch {}
    setShowExport(true);
  };

  const runExport = async () => {
    if (duration <= 0) return;
    const fmt = FORMAT_OPTIONS.find(o => o.v === expFormat) || FORMAT_OPTIONS[0];
    const aspect = W / H;
    const outH = Math.max(2, Math.round((expRes || H) / 2) * 2);
    const outW = Math.max(2, Math.round((outH * aspect) / 2) * 2);
    const fps = expFps || 30;
    const bpp = expBitrate === 'low' ? 0.07 : expBitrate === 'high' ? 0.22 : 0.13;
    const bitrate = Math.round(outW * outH * fps * bpp);

    setShowExport(false);
    setExporting(true); setExpProgress(0);
    const connectedNodes: MediaElementAudioSourceNode[] = [];
    let dest: MediaStreamAudioDestinationNode | null = null;
    try {
      const off = document.createElement('canvas'); off.width = outW; off.height = outH;
      const stream = (off as any).captureStream(fps) as MediaStream;
      if (expAudio) {
        try {
          const ctx = ensureAudioCtx();
          dest = ctx.createMediaStreamDestination();
          const seen = new Set<string>();
          tracksRef.current.forEach(tr => tr.clips.forEach(c => {
            if ((c.kind === 'video' || c.kind === 'audio') && c.src) {
              const key = c.kind + '|' + c.src; if (seen.has(key)) return; seen.add(key);
              const el = getMediaEl(c) as HTMLMediaElement;
              const node = sourceNodeFor(el);
              if (node && dest) { try { node.connect(dest); connectedNodes.push(node); } catch {} }
            }
          }));
          dest.stream.getAudioTracks().forEach(tk => stream.addTrack(tk));
        } catch {}
      }
      const rec = new MediaRecorder(stream, { mimeType: fmt.mime, videoBitsPerSecond: bitrate });
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: fmt.mime })); });
      rec.start(100);
      playheadRef.current = 0; setPlayhead(0);
      await new Promise<void>(resolve => {
        const t0 = performance.now();
        const step = () => {
          const t = performance.now() - t0;
          playheadRef.current = t; setPlayhead(t); manageMedia(t, true); drawTo(off, t); draw(t);
          setExpProgress(Math.min(99, Math.round((t / duration) * 100)));
          if (t >= duration) { resolve(); return; }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      pauseAllMedia(); rec.stop();
      const blob = await done;
      connectedNodes.forEach(n => { try { if (dest) n.disconnect(dest); } catch {} });
      const base = (expName || 'remier').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'remier';
      // Tải video về máy.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${base}.${fmt.ext}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      // Xuất kèm phụ đề SRT nếu chọn.
      if (expSubs) {
        const srt = buildSrt();
        if (srt.trim()) { const su = URL.createObjectURL(new Blob([srt], { type: 'text/plain' })); const sa = document.createElement('a'); sa.href = su; sa.download = `${base}.srt`; sa.click(); setTimeout(() => URL.revokeObjectURL(su), 5000); }
      }
      // Lưu vào kho của tôi (nhóm Bản xuất).
      try {
        const file = new File([blob], `${base}.${fmt.ext}`, { type: fmt.mime });
        const upUrl = await uploadAssetFile(file);
        await addAsset({ kind: 'export', title: `${expName} (bản xuất)`, url: upUrl, mime_type: fmt.mime, size_bytes: blob.size, duration_ms: Math.round(duration), width: outW, height: outH, owner_name: currentUser.fullName });
      } catch {}
      addNotification(`Đã xuất ${outW}×${outH} ${fmt.ext} và tải về máy.`, 'success');
    } catch (e: any) {
      connectedNodes.forEach(n => { try { if (dest) n.disconnect(dest); } catch {} });
      addNotification('Lỗi xuất video: ' + (e.message || e), 'error');
    }
    finally { setExporting(false); setExpProgress(0); }
  };

  // ---------- Phím tắt ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && (selId || multiSel.length)) { e.preventDefault(); deleteSelected(); }
      else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && selClip) { splitAtPlayhead(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); persist(false); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D') && selId) { e.preventDefault(); duplicateClip(selId); }
      else if (e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); fitTimeline(); }
      else if (e.key === 'Home') { seekTo(0); }
      else if (e.key === 'End') { seekTo(duration); }
      else if (e.key === 'Escape') { setTransformMode(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, selClip, playing, duration, multiSel]);

  if (!project) return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900 text-slate-300"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const zoomOptions: { label: string; v: number | 'fit' }[] = [
    { label: 'Vừa khung', v: 'fit' }, { label: '25%', v: 0.25 }, { label: '50%', v: 0.5 },
    { label: '75%', v: 0.75 }, { label: '100%', v: 1 }, { label: '150%', v: 1.5 }, { label: '200%', v: 2 },
  ];
  const applyZoom = (v: number | 'fit') => { if (v === 'fit') { setPreviewFit(true); } else { setPreviewFit(false); setPreviewZoom(v); } setZoomMenu(false); };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0f1216] text-slate-200" style={{ minWidth: 1280 }}>
      {/* Thanh công cụ trên */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[#151a21] px-3">
        <button onClick={() => { persist(true); onExit(); }} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 hover:bg-white/10" title="Thoát về hệ thống"><ArrowLeft className="h-4 w-4" /></button>
        <input value={title} onChange={e => { setTitle(e.target.value); markDirty(); }} className="w-56 rounded-lg bg-transparent px-2 py-1 text-sm font-bold text-white outline-none hover:bg-white/5 focus:bg-white/10" />
        <span className="text-[11px] text-slate-400">{saving ? 'Đang lưu...' : savedAt ? `Đã lưu ${savedAt}` : 'Tự lưu sau 15 giây'}</span>
        <span className="ml-2 rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-400">{W}×{H} · {project.fps}fps</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => persist(false)} title="Lưu dự án (Ctrl+S)" className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold hover:bg-white/10">Lưu</button>
          <button onClick={openExportDialog} disabled={exporting} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-60">{exporting ? <><Loader2 className="h-4 w-4 animate-spin" /> {expProgress}%</> : <><Download className="h-4 w-4" /> Xuất video</>}</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Cột trái: thanh tab chức năng dựng phim nằm ngay trên khu tư liệu (theo mẫu) */}
        <div className="flex w-[280px] shrink-0 flex-col">
          <div className="flex h-14 shrink-0 items-center gap-1 overflow-x-auto border-b border-r border-white/10 bg-[#12161c] px-1 scrollbar-none">
            {TOP_TABS.map(tb => {
              const Icon = tb.icon; const active = leftPanel === tb.id;
              return (
                <button key={tb.id} onClick={() => setLeftPanel(tb.id)}
                  title={tb.soon ? `${tb.label} (sắp có)` : tb.label}
                  className={`relative flex h-full min-w-[58px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 transition-colors ${active ? 'bg-brand/15 text-brand' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                  <Icon className="h-5 w-5" />
                  <span className="whitespace-nowrap text-[10px] font-bold leading-none">{tb.label}</span>
                  {tb.soon && <span className="absolute right-0.5 top-0.5 rounded-full bg-amber-500/20 px-1 text-[7px] font-black text-amber-400">SẮP</span>}
                </button>
              );
            })}
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <LibraryPanel currentUser={currentUser} panel={leftPanel} onAddAsset={addClipFromAsset} onAddText={addTextClip} onImportSubtitles={importSubtitles} />
          </div>
        </div>

        {/* Khung xem trước */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#0b0e12] p-4"
            onDoubleClick={() => {
              const target = selClip?.clip && selClip.clip.kind !== 'audio' ? selClip.clip
                : (() => { for (const tr of tracksRef.current) { const c = activeClip(tr, playheadRef.current); if (c && c.kind !== 'audio') return c; } return null; })();
              if (target) { setSelId(target.id); setMultiSel([]); setTransformMode(true); }
            }}>
            <div className={`relative inline-block leading-none ${previewFit ? 'max-h-full max-w-full' : ''}`}>
              <canvas ref={canvasRef} width={W} height={H}
                className={`block rounded-lg bg-black shadow-2xl ${previewFit ? 'max-h-full max-w-full' : ''}`}
                style={previewFit ? { aspectRatio: `${W}/${H}` } : { width: Math.round(W * previewZoom), height: Math.round(H * previewZoom) }} />
              {safeFrame && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute border border-white/45" style={{ inset: '5%' }} />
                  <div className="absolute border border-dashed border-white/30" style={{ inset: '10%' }} />
                </div>
              )}
              {transformMode && selClip && selClip.clip.kind !== 'audio' && (
                <TransformOverlay clip={selClip.clip} W={W} H={H} canvasRef={canvasRef} onChange={(patch) => updateClipProps(selClip.clip.id, patch)} />
              )}
            </div>
            {transformMode && (
              <button onClick={() => setTransformMode(false)} className="absolute right-3 top-3 z-20 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-brand-hover">Xong khung neo</button>
            )}
            {!transformMode && selClip && selClip.clip.kind !== 'audio' && (
              <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-slate-300">Nhấn đúp vào khung để chỉnh trực tiếp</span>
            )}
          </div>
          <div className="flex h-11 shrink-0 items-center gap-3 border-t border-white/10 bg-[#151a21] px-4">
            <button onClick={togglePlay} title={playing ? 'Tạm dừng (Space)' : 'Phát (Space)'} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 hover:bg-white/10">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
            <span className="font-mono text-xs text-slate-300">{fmtTime(playhead)} / {fmtTime(duration)}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => setSafeFrame(s => !s)} title="Bật/tắt khung an toàn" className={`grid h-8 w-8 place-items-center rounded-lg ${safeFrame ? 'bg-brand text-white' : 'bg-white/5 hover:bg-white/10'}`}><Frame className="h-4 w-4" /></button>
              <button onClick={() => applyZoom('fit')} title="Vừa khung xem trước" className={`grid h-8 w-8 place-items-center rounded-lg ${previewFit ? 'bg-brand text-white' : 'bg-white/5 hover:bg-white/10'}`}><Maximize2 className="h-4 w-4" /></button>
              <div className="relative">
                <button onClick={() => setZoomMenu(v => !v)} title="Mức thu phóng khung xem trước" className="flex h-8 items-center gap-1 rounded-lg bg-white/5 px-2 text-xs font-bold hover:bg-white/10">
                  {previewFit ? 'Vừa khung' : `${Math.round(previewZoom * 100)}%`}
                </button>
                {zoomMenu && (
                  <div className="absolute bottom-10 right-0 z-30 w-32 overflow-hidden rounded-lg border border-white/10 bg-[#1b222b] py-1 shadow-xl">
                    {zoomOptions.map(o => (
                      <button key={o.label} onClick={() => applyZoom(o.v)} className="block w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10">{o.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bảng thuộc tính phải */}
        <div className="w-[320px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#151a21] p-4">
          {selClip ? <PropsPanel clip={selClip.clip} onProps={(p) => updateClipProps(selClip.clip.id, p)} onClip={(p) => updateClip(selClip.clip.id, p)} onDelete={() => deleteClip(selClip.clip.id)} onDuplicate={() => duplicateClip(selClip.clip.id)} onSplitAudio={() => splitAudioFromVideo(selClip.clip)} />
            : <div className="mt-10 text-center text-xs text-slate-500">Chọn một lớp trên dòng thời gian để chỉnh thuộc tính.</div>}
        </div>
      </div>

      {/* Dòng thời gian */}
      <div className="h-[260px] shrink-0 border-t border-white/10 bg-[#12161c]" onPointerMove={onTimelinePointerMove} onPointerUp={onTimelinePointerUp}>
        <div className="flex h-10 items-center gap-1 border-b border-white/10 px-2">
          <button onClick={addVideoTrack} title="Thêm lớp video" className="flex h-7 items-center gap-1 rounded-md bg-white/5 px-2 text-[11px] font-bold hover:bg-white/10"><Plus className="h-3.5 w-3.5" /><Film className="h-3.5 w-3.5" /> Video</button>
          <button onClick={addAudioTrack} title="Thêm lớp tiếng" className="flex h-7 items-center gap-1 rounded-md bg-white/5 px-2 text-[11px] font-bold hover:bg-white/10"><Plus className="h-3.5 w-3.5" /><Music className="h-3.5 w-3.5" /> Tiếng</button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button onClick={splitAtPlayhead} title="Cắt tại đầu phát (S)" disabled={!selClip} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-40"><Scissors className="h-3.5 w-3.5" /></button>
          <button onClick={() => selId && duplicateClip(selId)} title="Nhân đôi (Ctrl+D)" disabled={!selId} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-40"><Copy className="h-3.5 w-3.5" /></button>
          <button onClick={deleteSelected} title="Xóa (Delete)" disabled={!selId && !multiSel.length} className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />{multiSel.length > 1 && <span className="ml-0.5 text-[9px] font-black">{multiSel.length}</span>}</button>
          <button onClick={addTextClip} title="Thêm chữ (T)" className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10"><Type className="h-3.5 w-3.5" /></button>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={fitTimeline} title="Thu vừa dòng thời gian (Shift+Z)" className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10"><Maximize2 className="h-3.5 w-3.5" /></button>
            <button onClick={() => setPxPerSec(v => Math.max(20, v - 20))} title="Thu nhỏ dòng thời gian" className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10"><ZoomOut className="h-3.5 w-3.5" /></button>
            <button onClick={() => setPxPerSec(v => Math.min(300, v + 20))} title="Phóng to dòng thời gian" className="grid h-7 w-7 place-items-center rounded-md bg-white/5 hover:bg-white/10"><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <Timeline tracks={tracks} pxPerSec={pxPerSec} playhead={playhead} duration={duration} selId={selId} selIds={multiSel} scrollRef={timelineScrollRef}
          onSeek={seekTo} onSelect={selectClip} onMarquee={onMarquee} onZoom={zoomTimelineAt} onClipPointerDown={onClipPointerDown} onToggleTrack={toggleTrack} onDeleteTrack={deleteTrack} onDropAsset={dropAssetOnTimeline} />
      </div>

      {/* Hộp thoại xuất video */}
      {showExport && (() => {
        const aspect = W / H;
        const outH = Math.round((expRes || H));
        const outW = Math.round(outH * aspect);
        const bpp = expBitrate === 'low' ? 0.07 : expBitrate === 'high' ? 0.22 : 0.13;
        const bitrate = outW * outH * (expFps || 30) * bpp;
        const estMB = Math.max(1, Math.round((bitrate * (duration / 1000)) / 8 / 1024 / 1024));
        const resChoices = [2160, 1440, 1080, 720, 480].filter(r => r <= Math.max(480, H));
        if (!resChoices.includes(H)) resChoices.push(H);
        const uniqRes = Array.from(new Set(resChoices)).sort((a, b) => b - a);
        const hasText = tracks.some(t => t.clips.some(c => c.kind === 'text'));
        const sel = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand';
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowExport(false)}>
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#1b222b] text-slate-200 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="border-b border-white/10 px-6 py-4"><h2 className="text-base font-bold text-white">Xuất · {expName || 'video'}</h2></div>
              <div className="flex min-h-0 flex-1 gap-6 overflow-y-auto p-6">
                {/* Ảnh bìa xem trước */}
                <div className="w-[300px] shrink-0">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black" style={{ aspectRatio: `${W}/${H}` }}>
                    {expCover ? <img src={expCover} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-xs text-slate-500">Không có xem trước</div>}
                  </div>
                  <button onClick={() => { try { const cv = canvasRef.current; if (cv) setExpCover(cv.toDataURL('image/jpeg', 0.8)); addNotification('Đã lấy khung hình hiện tại làm ảnh bìa.', 'success'); } catch {} }} className="mt-2 w-full rounded-lg bg-white/5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10">Lấy khung hình hiện tại làm ảnh bìa</button>
                </div>
                {/* Tùy chọn */}
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                    <label className="text-sm text-slate-400">Tên</label>
                    <input value={expName} onChange={e => setExpName(e.target.value)} className={sel} />
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Film className="h-4 w-4" /> Video</div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                        <label className="text-sm text-slate-400">Độ phân giải</label>
                        <select value={expRes} onChange={e => setExpRes(Number(e.target.value))} className={sel}>
                          {uniqRes.map(r => <option key={r} value={r}>{r}P{r === H ? ' (gốc)' : ''}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                        <label className="text-sm text-slate-400">Tốc độ bit</label>
                        <select value={expBitrate} onChange={e => setExpBitrate(e.target.value as any)} className={sel}>
                          <option value="low">Thấp (nhẹ)</option>
                          <option value="rec">Đề xuất</option>
                          <option value="high">Cao hơn (nét)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                        <label className="text-sm text-slate-400">Định dạng</label>
                        <select value={expFormat} onChange={e => setExpFormat(e.target.value)} className={sel}>
                          {FORMAT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                        <label className="text-sm text-slate-400">Tỷ lệ khung hình</label>
                        <select value={expFps} onChange={e => setExpFps(Number(e.target.value))} className={sel}>
                          {[24, 25, 30, 50, 60].map(f => <option key={f} value={f}>{f}fps</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white"><Volume2 className="h-4 w-4" /> Âm thanh</div>
                    <button onClick={() => setExpAudio(v => !v)} className={`relative h-6 w-11 rounded-full transition-colors ${expAudio ? 'bg-brand' : 'bg-white/15'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${expAudio ? 'left-[22px]' : 'left-0.5'}`} /></button>
                  </div>
                  {hasText && (
                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-white"><Captions className="h-4 w-4" /> Xuất phụ đề (SRT)</div>
                      <button onClick={() => setExpSubs(v => !v)} className={`relative h-6 w-11 rounded-full transition-colors ${expSubs ? 'bg-brand' : 'bg-white/15'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${expSubs ? 'left-[22px]' : 'left-0.5'}`} /></button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
                <span className="text-xs text-slate-400">Thời lượng {fmtTime(duration)} · {outW}×{outH} · ước tính khoảng {estMB} MB</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowExport(false)} className="rounded-lg bg-white/5 px-5 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">Hủy</button>
                  <button onClick={runExport} className="rounded-lg bg-brand px-6 py-2 text-sm font-bold text-white hover:bg-brand-hover">Xuất</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ============================ Thư viện trái ============================
function LibraryPanel({ currentUser, panel, onAddAsset, onAddText, onImportSubtitles }: { currentUser: UserAccount; panel: LeftPanel; onAddAsset: (a: MvAsset) => void; onAddText: () => void; onImportSubtitles: (cues: { start: number; dur: number; text: string }[]) => void; }) {
  const { addNotification } = useNotifications();
  const [source, setSource] = useState<'mine' | 'shared'>('mine');
  const subRef = useRef<HTMLInputElement>(null);
  const onSubFile = async (f: File | null) => { if (!f) return; try { const txt = await f.text(); const cues = parseSubtitles(txt); if (!cues.length) { addNotification('Không đọc được dòng phụ đề nào.', 'warning'); return; } onImportSubtitles(cues); } catch (e: any) { addNotification('Lỗi đọc phụ đề: ' + (e.message || e), 'error'); } };
  const [assets, setAssets] = useState<MvAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isLibrary = panel === 'media' || panel === 'audio';

  const load = useCallback(async () => {
    if (!isLibrary) return;
    setLoading(true);
    try { setAssets(source === 'mine' ? await getMyAssets() : await getSharedAssets()); }
    catch (e: any) { addNotification('Lỗi tải tư liệu: ' + (e.message || e), 'error'); }
    finally { setLoading(false); }
  }, [isLibrary, source, addNotification]);
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
        await addAsset({ kind, title: f.name, url, thumb_url: kind === 'image' ? url : (meta.thumb && meta.thumb.startsWith('data:') ? meta.thumb : undefined), mime_type: f.type, size_bytes: f.size, duration_ms: meta.duration_ms, width: meta.width, height: meta.height, owner_name: currentUser.fullName });
      }
      addNotification('Đã tải tư liệu lên.', 'success'); load();
    } catch (e: any) { addNotification('Lỗi tải lên: ' + (e.message || e), 'error'); }
    finally { setUploading(false); }
  };

  const kindIcon = (k: MvKind) => k === 'video' ? Film : k === 'audio' ? Music : k === 'export' ? Download : ImageIcon;
  const shown = panel === 'audio' ? assets.filter(a => a.kind === 'audio' || a.kind === 'export') : assets;
  const soonLabel = TOP_TABS.find(t => t.id === panel)?.label || '';

  // Tab Văn bản và Chú thích.
  if (panel === 'text' || panel === 'caption') {
    return (
      <div className="flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#151a21]">
        <div className="px-3 pt-3 pb-1 text-xs font-black uppercase tracking-wide text-slate-400">{panel === 'text' ? 'Văn bản' : 'Chú thích, phụ đề'}</div>
        <div className="space-y-2 p-3">
          {panel === 'text' && <button onClick={onAddText} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-4 text-xs font-bold text-slate-300 hover:border-brand hover:text-brand"><Type className="h-4 w-4" /> Thêm lớp văn bản</button>}
          <button onClick={() => subRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"><Captions className="h-4 w-4" /> Nhập phụ đề (SRT/VTT)</button>
          <input ref={subRef} type="file" accept=".srt,.vtt,text/vtt" className="hidden" onChange={e => onSubFile(e.target.files?.[0] || null)} />
          <p className="text-[11px] text-slate-500">Nhập file phụ đề sẽ tạo một hàng lớp chữ theo đúng mốc thời gian. Chọn lớp để sửa nội dung, phông, màu ở bảng bên phải.</p>
        </div>
      </div>
    );
  }
  // Các tab chưa có chức năng.
  if (!isLibrary) {
    return (
      <div className="flex w-[280px] shrink-0 flex-col items-center justify-center gap-3 border-r border-white/10 bg-[#151a21] p-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-slate-500"><Sparkles className="h-7 w-7" /></span>
        <p className="text-sm font-bold text-slate-300">{soonLabel}</p>
        <p className="text-[11px] text-slate-500">Tính năng đang phát triển, sẽ có trong bản cập nhật tới.</p>
      </div>
    );
  }
  // Tab Tệp phương tiện và Âm thanh.
  return (
    <div className="flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#151a21]">
      <div className="flex gap-1 p-2">
        {(['mine', 'shared'] as const).map(s => (
          <button key={s} onClick={() => setSource(s)} className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold ${source === s ? 'bg-brand text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{s === 'mine' ? 'Kho của tôi' : 'Thư viện chung'}</button>
        ))}
      </div>
      {source === 'mine' && (
        <div className="px-3 pb-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-60">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {panel === 'audio' ? 'Tải âm thanh lên' : 'Tải tư liệu lên'}</button>
          <input ref={fileRef} type="file" multiple accept={panel === 'audio' ? 'audio/*' : 'video/*,image/*,audio/*'} className="hidden" onChange={e => onFiles(e.target.files)} />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {loading ? <div className="py-10 text-center text-xs text-slate-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          : shown.length === 0 ? <p className="py-10 text-center text-xs text-slate-500">{panel === 'audio' ? 'Chưa có âm thanh.' : 'Chưa có tư liệu.'}</p>
          : (
            <div className="grid grid-cols-2 gap-2">
              {shown.map(a => { const Icon = kindIcon(a.kind); return (
                    <div key={a.id} className="group relative overflow-hidden rounded-lg border border-white/10 bg-black/30 hover:border-brand">
                      <button
                        onClick={() => onAddAsset(a)}
                        draggable
                        onDragStart={e => { try { e.dataTransfer.setData('application/x-remier-asset', JSON.stringify(a)); e.dataTransfer.effectAllowed = 'copy'; } catch {} }}
                        title={`Bấm để thêm, hoặc kéo thả "${a.title}" vào dòng thời gian`}
                        className="block w-full cursor-grab text-left active:cursor-grabbing">
                        <div className="grid aspect-video place-items-center bg-black/40">
                          {a.thumb_url ? <img src={a.thumb_url} alt="" draggable={false} className="h-full w-full object-cover" /> : <Icon className="h-6 w-6 text-slate-500" />}
                        </div>
                        <div className="p-1.5"><p className="truncate text-[10px] font-semibold text-slate-300">{a.title}</p>{a.duration_ms ? <p className="text-[9px] text-slate-500">{fmtTime(a.duration_ms)}</p> : null}</div>
                      </button>
                      {source === 'shared' && (
                        <button onClick={async () => { try { await saveSharedToMine(a, currentUser.fullName); addNotification('Đã lưu vào kho của tôi.', 'success'); } catch (e: any) { addNotification('Lỗi: ' + (e.message || e), 'error'); } }} title="Lưu vào kho của tôi" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-black/60 text-white opacity-0 transition-opacity hover:bg-brand group-hover:opacity-100"><Plus className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  ); })}
                </div>
              )}
          </div>
    </div>
  );
}

// ============================ Dòng thời gian ============================
function Timeline({ tracks, pxPerSec, playhead, duration, selId, selIds, scrollRef, onSeek, onSelect, onMarquee, onZoom, onClipPointerDown, onToggleTrack, onDeleteTrack, onDropAsset }: {
  tracks: Track[]; pxPerSec: number; playhead: number; duration: number; selId: string | null; selIds: string[];
  scrollRef?: React.RefObject<HTMLDivElement>;
  onSeek: (t: number) => void; onSelect: (id: string) => void;
  onMarquee: (ids: string[]) => void; onZoom: (factor: number, focusMs?: number) => void;
  onClipPointerDown: (e: React.PointerEvent, tr: Track, c: Clip, mode: 'move' | 'l' | 'r') => void;
  onToggleTrack: (id: string, k: 'locked' | 'hidden' | 'muted' | 'solo') => void;
  onDeleteTrack: (id: string) => void;
  onDropAsset: (asset: MvAsset, trackId: string | null, timeMs: number) => void;
}) {
  const totalMs = Math.max(duration, 10000) + 4000;
  const width = (totalMs / 1000) * pxPerSec;
  const rulerRef = useRef<HTMLDivElement>(null);
  const headersRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const ROW_H = 64, RULER_H = 28;
  // Lăn chuột cuộn ngang, Alt cộng lăn để phóng to thu nhỏ timeline. Dùng listener
  // không thụ động để preventDefault được.
  useEffect(() => {
    const el = scrollRef?.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.altKey) { e.preventDefault(); const r = rulerRef.current?.getBoundingClientRect(); const focus = r ? Math.max(0, ((e.clientX - r.left) / pxPerSec) * 1000) : undefined; onZoom(e.deltaY < 0 ? 1.12 : 0.89, focus); }
      else { e.preventDefault(); el.scrollLeft += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY); }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scrollRef, pxPerSec, onZoom]);
  // Đồng bộ cuộn dọc giữa cột đầu lớp và vùng clip.
  const syncFromRight = () => { if (headersRef.current && scrollRef?.current) headersRef.current.scrollTop = scrollRef.current.scrollTop; };
  const syncFromLeft = () => { if (headersRef.current && scrollRef?.current) scrollRef.current.scrollTop = headersRef.current.scrollTop; };
  // Kéo giữa (chuột giữa) để di chuyển khung nhìn timeline.
  const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const onContainerPointerDown = (e: React.PointerEvent) => {
    if (e.button === 1) { e.preventDefault(); const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId); panRef.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop }; }
  };
  const onContainerPointerMove = (e: React.PointerEvent) => { if (panRef.current) { const el = e.currentTarget as HTMLElement; el.scrollLeft = panRef.current.sl - (e.clientX - panRef.current.x); el.scrollTop = panRef.current.st - (e.clientY - panRef.current.y); } };
  const onContainerPointerUp = (e: React.PointerEvent) => { if (panRef.current) { panRef.current = null; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {} } };
  // Quét tạo vùng chọn nhiều clip (kéo chuột trái trên vùng trống).
  const marqueeRef = useRef<{ x0: number; y0: number } | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onMarqueeDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const host = contentRef.current; if (!host) return;
    try { host.setPointerCapture(e.pointerId); } catch {}
    const r = host.getBoundingClientRect();
    marqueeRef.current = { x0: e.clientX - r.left, y0: e.clientY - r.top };
    setMarquee({ x: marqueeRef.current.x0, y: marqueeRef.current.y0, w: 0, h: 0 });
  };
  const onMarqueeMove = (e: React.PointerEvent) => {
    if (!marqueeRef.current) return;
    const host = contentRef.current; if (!host) return;
    const r = host.getBoundingClientRect();
    const x1 = e.clientX - r.left, y1 = e.clientY - r.top;
    const x = Math.min(marqueeRef.current.x0, x1), y = Math.min(marqueeRef.current.y0, y1);
    const w = Math.abs(x1 - marqueeRef.current.x0), h = Math.abs(y1 - marqueeRef.current.y0);
    setMarquee({ x, y, w, h });
    // Xác định clip giao với hình chữ nhật chọn.
    const ids: string[] = [];
    tracks.forEach((tr, ti) => {
      const rowTop = RULER_H + ti * ROW_H, rowBot = rowTop + ROW_H;
      if (rowBot < y || rowTop > y + h) return;
      tr.clips.forEach(c => { const cl = (c.start / 1000) * pxPerSec, cr = cl + (c.dur / 1000) * pxPerSec; if (cr >= x && cl <= x + w) ids.push(c.id); });
    });
    onMarquee(ids);
  };
  const onMarqueeUp = () => { marqueeRef.current = null; setMarquee(null); };
  const scrubAt = (clientX: number) => {
    const el = rulerRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    onSeek(Math.max(0, ((clientX - rect.left) / pxPerSec) * 1000));
  };
  // Kéo thả tư liệu từ kho.
  const parseAsset = (e: React.DragEvent): MvAsset | null => { try { const s = e.dataTransfer.getData('application/x-remier-asset'); return s ? JSON.parse(s) : null; } catch { return null; } };
  const allowDrop = (e: React.DragEvent) => { if (Array.from(e.dataTransfer.types).includes('application/x-remier-asset')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } };
  const timeFromX = (clientX: number) => { const el = rulerRef.current; if (!el) return 0; const r = el.getBoundingClientRect(); return Math.max(0, ((clientX - r.left) / pxPerSec) * 1000); };
  const onRulerDown = (e: React.PointerEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); scrubbing.current = true; scrubAt(e.clientX); };
  const onRulerMove = (e: React.PointerEvent) => { if (scrubbing.current) scrubAt(e.clientX); };
  const onRulerUp = (e: React.PointerEvent) => { scrubbing.current = false; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {} };
  const rowSeek = (e: React.MouseEvent) => { scrubAt(e.clientX); };

  const ticks = []; const stepSec = pxPerSec < 50 ? 5 : pxPerSec < 120 ? 2 : 1;
  for (let s = 0; s * 1000 <= totalMs; s += stepSec) ticks.push(s);

  if (tracks.length === 0) {
    return (
      <div className="grid h-[200px] place-items-center text-center text-xs text-slate-500"
        onDragOver={allowDrop} onDrop={e => { const a = parseAsset(e); if (a) { e.preventDefault(); onDropAsset(a, null, 0); } }}>
        <div><Film className="mx-auto mb-2 h-8 w-8 text-slate-600" /><p>Chưa có lớp nào.</p><p className="mt-1 text-slate-600">Kéo thả tư liệu từ kho vào đây, hoặc bấm "+ Video" / "+ Tiếng", hoặc bấm tư liệu ở cột trái.</p></div>
      </div>
    );
  }

  return (
    <div className="flex h-[210px]">
      {/* Đầu hàng lớp */}
      <div ref={headersRef} onScroll={syncFromLeft} className="w-40 shrink-0 overflow-y-auto border-r border-white/10">
        <div className="sticky top-0 z-20 h-7 border-b border-white/10 bg-[#12161c]" />
        {tracks.map(tr => (
          <div key={tr.id} className={`group flex h-16 flex-col justify-center gap-1 border-b border-white/5 px-2 ${tr.kind === 'audio' ? 'bg-emerald-500/5' : 'bg-blue-500/5'}`}>
            <div className="flex items-center gap-1">
              {tr.kind === 'audio' ? <Music className="h-3 w-3 shrink-0 text-emerald-400/70" /> : <Film className="h-3 w-3 shrink-0 text-blue-400/70" />}
              <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-300">{tr.name}</span>
              <button onClick={() => onDeleteTrack(tr.id)} title="Xóa lớp" className="text-slate-600 opacity-0 hover:text-rose-400 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onToggleTrack(tr.id, 'hidden')} title="Ẩn/hiện hình" className={tr.hidden ? 'text-rose-400' : 'text-slate-500 hover:text-slate-200'}>{tr.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
              <button onClick={() => onToggleTrack(tr.id, 'solo')} title="Chỉ nghe lớp này (Solo)" className={tr.solo ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'}><Headphones className="h-3.5 w-3.5" /></button>
              <button onClick={() => onToggleTrack(tr.id, 'muted')} title="Tắt/mở tiếng" className={tr.muted ? 'text-rose-400' : 'text-slate-500 hover:text-slate-200'}>{tr.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}</button>
              <button onClick={() => onToggleTrack(tr.id, 'locked')} title="Khóa lớp" className={tr.locked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'}>{tr.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}</button>
            </div>
          </div>
        ))}
      </div>
      {/* Vùng lớp: cuộn ngang và dọc, kéo giữa để pan, quét chọn nhiều clip */}
      <div ref={scrollRef} onScroll={syncFromRight} onPointerDown={onContainerPointerDown} onPointerMove={onContainerPointerMove} onPointerUp={onContainerPointerUp}
        className="relative min-w-0 flex-1 overflow-auto">
        <div ref={contentRef} className="relative" style={{ width }} onPointerDown={onMarqueeDown} onPointerMove={onMarqueeMove} onPointerUp={onMarqueeUp}>
          {/* Thước: cố định ở trên khi cuộn dọc, nhấn giữ và kéo để tua */}
          <div ref={rulerRef} onPointerDown={e => { e.stopPropagation(); onRulerDown(e); }} onPointerMove={onRulerMove} onPointerUp={onRulerUp}
            onDragOver={allowDrop} onDrop={e => { const a = parseAsset(e); if (a) { e.preventDefault(); onDropAsset(a, null, timeFromX(e.clientX)); } }}
            className="sticky top-0 z-30 h-7 cursor-ew-resize touch-none select-none border-b border-white/10 bg-[#0e1319]">
            {ticks.map(s => <div key={s} className="pointer-events-none absolute top-0 h-full border-l border-white/10" style={{ left: s * pxPerSec }}><span className="ml-1 text-[9px] text-slate-500">{s}s</span></div>)}
          </div>
          {/* Hàng lớp */}
          {tracks.map(tr => (
            <div key={tr.id} className={`relative h-16 border-b border-white/5 ${tr.kind === 'audio' ? 'bg-emerald-500/[0.03]' : ''}`} onClick={rowSeek}
              onDragOver={tr.locked ? undefined : allowDrop} onDrop={e => { if (tr.locked) return; const a = parseAsset(e); if (a) { e.preventDefault(); onDropAsset(a, tr.id, timeFromX(e.clientX)); } }}>
              {tr.clips.map(c => {
                const left = (c.start / 1000) * pxPerSec; const w = (c.dur / 1000) * pxPerSec; const sel = selId === c.id || selIds.includes(c.id);
                const color = c.kind === 'audio' ? 'bg-emerald-500/25 border-emerald-400/50' : c.kind === 'text' ? 'bg-violet-500/25 border-violet-400/50' : c.kind === 'video' ? 'bg-blue-500/25 border-blue-400/50' : 'bg-amber-500/25 border-amber-400/50';
                return (
                  <div key={c.id} onClick={e => { e.stopPropagation(); if (!tr.locked) onSelect(c.id); }}
                    onPointerDown={e => { if (!tr.locked) onClipPointerDown(e, tr, c, 'move'); }}
                    className={`absolute top-1.5 h-12 overflow-hidden rounded-md border ${color} ${sel ? 'ring-2 ring-brand' : ''} ${tr.locked ? 'opacity-70' : 'cursor-grab'}`} style={{ left, width: Math.max(8, w) }}>
                    {!tr.locked && <div onPointerDown={e => onClipPointerDown(e, tr, c, 'l')} className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize bg-white/10" />}
                    {!tr.locked && <div onPointerDown={e => onClipPointerDown(e, tr, c, 'r')} className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize bg-white/10" />}
                    <div className="flex h-full items-center gap-1 px-2">
                      {c.thumb && c.kind !== 'text' && <img src={c.thumb} alt="" draggable={false} className="h-9 w-12 shrink-0 rounded object-cover" />}
                      {c.kind === 'audio' && <Music className="h-3.5 w-3.5 shrink-0 text-emerald-300" />}
                      <span className="truncate text-[10px] font-semibold text-slate-100">{c.kind === 'text' ? (c.props.text || 'Văn bản') : c.name}</span>
                    </div>
                  </div>
                );
              })}
              {/* Lớp bị khóa: phủ vân chéo, chặn mọi thao tác. */}
              {tr.locked && (
                <div className="absolute inset-0 z-30 cursor-not-allowed" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.06) 0 7px, rgba(148,163,184,0.14) 7px 14px)' }}>
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-slate-200"><Lock className="h-3 w-3" /> Đã khóa</span>
                </div>
              )}
            </div>
          ))}
          {/* Đầu phát (con trỏ đỏ) luôn nổi trên cùng, thấy cả khi cuộn dọc */}
          <div className="pointer-events-none absolute top-0 z-40 h-full w-[2px] bg-rose-500" style={{ left: (playhead / 1000) * pxPerSec }}><div className="absolute -left-1.5 top-0 h-3 w-3 rounded-sm bg-rose-500" /></div>
          {/* Khung quét chọn nhiều clip */}
          {marquee && marquee.w > 2 && marquee.h > 2 && (
            <div className="pointer-events-none absolute z-40 rounded border border-brand bg-brand/15" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================ Bảng thuộc tính ============================
function PropsPanel({ clip, onProps, onClip, onDelete, onDuplicate, onSplitAudio }: { clip: Clip; onProps: (p: Partial<ClipProps>) => void; onClip: (p: Partial<Clip>) => void; onDelete: () => void; onDuplicate: () => void; onSplitAudio: () => void; }) {
  const p = clip.props;
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-3"><label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{label}</label>{children}</div>
  );
  const num = (v: number, on: (n: number) => void, step = 1, min?: number, max?: number) => (
    <input type="number" value={v} step={step} min={min} max={max} onChange={e => on(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-brand" />
  );
  // Thanh trượt kèm ô nhập số bên cạnh.
  const sliderNum = (v: number, on: (n: number) => void, min: number, max: number, step: number, digits = 0) => (
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step} value={v} onChange={e => on(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--color-brand,#22c55e)]" />
      <input type="number" value={digits ? Number(v.toFixed(digits)) : Math.round(v)} step={step} min={min} max={max} onChange={e => on(Math.max(min, Math.min(max, Number(e.target.value))))} className="w-16 shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-brand" />
    </div>
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
          <div className="grid grid-cols-2 gap-2">
            <Row label="Canh chữ">
              <select value={p.align} onChange={e => onProps({ align: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-brand">
                <option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option>
              </select>
            </Row>
            <Row label="Màu chữ"><input type="color" value={p.color} onChange={e => onProps({ color: e.target.value })} className="h-9 w-full rounded-lg border border-white/10 bg-white/5" /></Row>
          </div>
        </>
      )}

      {(clip.kind === 'video' || clip.kind === 'image' || clip.kind === 'text') && (
        <>
          <Row label="Vị trí ngang X %">{sliderNum(p.x, v => onProps({ x: v }), -100, 100, 1)}</Row>
          <Row label="Vị trí dọc Y %">{sliderNum(p.y, v => onProps({ y: v }), -100, 100, 1)}</Row>
          <Row label="Tỉ lệ (scale)">{sliderNum(p.scale, v => onProps({ scale: v }), 0.1, 4, 0.01, 2)}</Row>
          <Row label="Xoay (độ)">{sliderNum(p.rotation, v => onProps({ rotation: v }), -180, 180, 1)}</Row>
          <Row label={`Độ mờ đục ${Math.round(p.opacity * 100)}%`}>{sliderNum(p.opacity, v => onProps({ opacity: v }), 0, 1, 0.01, 2)}</Row>
        </>
      )}

      {(clip.kind === 'video' || clip.kind === 'audio') && (
        <Row label="Âm lượng">{sliderNum(p.volume, v => onProps({ volume: v }), 0, 1, 0.01, 2)}</Row>
      )}

      {clip.kind === 'video' && (
        <button onClick={onSplitAudio} className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"><Volume2 className="h-4 w-4" /> Tách âm thanh khỏi video</button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Row label="Mờ dần vào (giây)">{num(Math.round(clip.fadeIn || 0) / 1000, v => onClip({ fadeIn: Math.max(0, Math.round(v * 1000)) }), 0.1, 0)}</Row>
        <Row label="Mờ dần ra (giây)">{num(Math.round(clip.fadeOut || 0) / 1000, v => onClip({ fadeOut: Math.max(0, Math.round(v * 1000)) }), 0.1, 0)}</Row>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Row label="Bắt đầu (giây)">{num(Math.round(clip.start) / 1000, v => onClip({ start: Math.max(0, Math.round(v * 1000)) }), 0.1, 0)}</Row>
        <Row label="Thời lượng (giây)">{num(Math.round(clip.dur) / 1000, v => onClip({ dur: Math.max(0.1, Math.round(v * 1000)) }), 0.1, 0.1)}</Row>
      </div>
    </div>
  );
}

// ============================ Khung neo trên preview ============================
// Hiện đường bao có điểm neo để kéo di chuyển và phóng to thu nhỏ media trực tiếp.
function TransformOverlay({ clip, W, H, canvasRef, onChange }: { clip: Clip; W: number; H: number; canvasRef: React.RefObject<HTMLCanvasElement>; onChange: (p: Partial<ClipProps>) => void; }) {
  const p = clip.props;
  const [, force] = useState(0);
  useEffect(() => { force(x => x + 1); }, []); // vẽ lại sau khi canvas đã có kích thước
  const cv = canvasRef.current;
  if (!cv) return null;
  const rect = cv.getBoundingClientRect();
  const disp = rect.width / W || 1;

  // Kích thước hộp trong hệ tọa độ logic (trước khi xoay).
  let bw = W, bh = H;
  if (clip.kind === 'text') {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = `${p.fontWeight} ${p.fontSize}px Inter, system-ui, sans-serif`;
      const lines = (p.text || '').split('\n');
      bw = Math.max(10, ...lines.map(l => ctx.measureText(l).width));
      bh = lines.length * p.fontSize * 1.2;
    }
  } else {
    const el = getMediaEl(clip) as any;
    const iw = el?.videoWidth || el?.naturalWidth || W;
    const ih = el?.videoHeight || el?.naturalHeight || H;
    const cs = Math.min(W / iw, H / ih);
    bw = iw * cs; bh = ih * cs;
  }
  bw *= p.scale; bh *= p.scale;
  const cx = W / 2 + (p.x / 100) * W, cy = H / 2 + (p.y / 100) * H;
  const left = (cx - bw / 2) * disp, top = (cy - bh / 2) * disp, w = bw * disp, h = bh * disp;

  const dragBody = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, sx = p.x, sy = p.y;
    const move = (ev: PointerEvent) => {
      const d = cv.getBoundingClientRect(); const ds = d.width / W || 1;
      const dxp = ((ev.clientX - startX) / ds) / W * 100;
      const dyp = ((ev.clientY - startY) / ds) / H * 100;
      onChange({ x: Math.round((sx + dxp) * 10) / 10, y: Math.round((sy + dyp) * 10) / 10 });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const dragCorner = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const d0 = cv.getBoundingClientRect();
    const centerX = d0.left + cx * disp, centerY = d0.top + cy * disp;
    const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY) || 1;
    const sScale = p.scale;
    const move = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - centerX, ev.clientY - centerY);
      const ns = Math.max(0.05, Math.min(10, sScale * (dist / startDist)));
      onChange({ scale: Math.round(ns * 100) / 100 });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const corners: { k: string; s: React.CSSProperties }[] = [
    { k: 'nw', s: { left: 0, top: 0, cursor: 'nwse-resize' } },
    { k: 'ne', s: { left: '100%', top: 0, cursor: 'nesw-resize' } },
    { k: 'sw', s: { left: 0, top: '100%', cursor: 'nesw-resize' } },
    { k: 'se', s: { left: '100%', top: '100%', cursor: 'nwse-resize' } },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="pointer-events-auto absolute cursor-move border-2 border-brand"
        style={{ left, top, width: Math.max(6, w), height: Math.max(6, h), transform: `rotate(${p.rotation}deg)` }}
        onPointerDown={dragBody}>
        {corners.map(c => (
          <span key={c.k} onPointerDown={dragCorner}
            className="pointer-events-auto absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-white shadow"
            style={c.s} />
        ))}
      </div>
    </div>
  );
}
