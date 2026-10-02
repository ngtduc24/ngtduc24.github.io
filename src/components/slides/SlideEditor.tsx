import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Home, Undo2, Redo2, Cloud, CloudOff, Loader2, Play, Share2, UserPlus, LayoutTemplate, Shapes, Type, Upload, Images, PaintBucket,
  StickyNote, Grid2X2, Maximize, Plus, Copy, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List,
  ArrowUpToLine, ArrowDownToLine, Lock, Unlock, Search, X, ChevronDown, Link2, Check, FileDown, Pencil, Minus, Droplet, Eye,
  Strikethrough, CaseUpper, MoveVertical, Sparkles, Wand2, Move, Paintbrush, FlipHorizontal2, FlipVertical2, Replace, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, ChevronsUp, ChevronsDown, ChevronUp, PlayCircle, Blend, MoreHorizontal,
} from 'lucide-react';
import {
  Deck, Slide, SlideEl, SLIDE_W, SLIDE_H, LAYOUTS, LayoutId, makeSlide, textEl, uid, saveDeck, getDeck, getDeckUpdatedAt,
  BG_SWATCHES, GRADIENTS, ShapeKind, setDeckShare, deckShareUrl, DEFAULT_FONT, duplicateDeck, softDeleteDeck,
  ANIM_IN_LABELS, ANIM_LOOP_LABELS, TRANSITION_LABELS, EFFECT_LABELS, AnimIn, AnimLoop, TransitionKind, EffectKind, ImgFilter,
} from '../../lib/slides';
import { FONT_OPTIONS } from '../../lib/fonts';
import { listMyMedia, MediaItem } from '../../lib/mediaItems';
import { uploadMediaToCloudinary } from '../../lib/upload';
import { listCollaborators, Collaborator, userAvatar } from '../../lib/collab';
import SlideRenderer, { ElementView, bgStyle, ensureFont, ensureAnimCss, ElPhase } from './SlideRenderer';
import SlidePresenter from './SlidePresenter';
import ShareDialog from '../ui/ShareDialog';
import { AvatarStack } from '../ui/People';
import { copyText, askText } from '../ui/Dialogs';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import type { UserAccount } from '../../types';

type Role = 'owner' | 'view' | 'edit' | 'manage';
type Panel = 'templates' | 'elements' | 'text' | 'uploads' | 'library' | 'background' | 'effects' | 'animate' | 'position' | 'transition' | null;
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const COLORS = ['#0f172a', '#334155', '#64748b', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', 'var(--color-brand)', '#ec4899', '#f43f5e'];
const SHAPES: Array<{ k: ShapeKind; label: string }> = [
  { k: 'rect', label: 'Hình chữ nhật' }, { k: 'round', label: 'Bo góc' }, { k: 'ellipse', label: 'Hình tròn' }, { k: 'triangle', label: 'Tam giác' },
  { k: 'diamond', label: 'Hình thoi' }, { k: 'pentagon', label: 'Ngũ giác' }, { k: 'hexagon', label: 'Lục giác' }, { k: 'star', label: 'Ngôi sao' },
  { k: 'line', label: 'Đường thẳng' }, { k: 'arrow', label: 'Mũi tên' },
];

// Đo chiều cao thật của khối chữ để khung chọn khớp nội dung.
function measureText(el: SlideEl): number {
  const d = document.createElement('div');
  Object.assign(d.style, {
    position: 'absolute', visibility: 'hidden', left: '-99999px', top: '0', width: `${el.w}px`, fontFamily: `'${el.fontFamily || 'Inter'}', sans-serif`,
    fontSize: `${el.fontSize || 32}px`, fontWeight: el.bold ? '700' : '400', fontStyle: el.italic ? 'italic' : 'normal',
    lineHeight: String(el.lineHeight || 1.3), whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: el.bg ? '0.2em 0.4em' : '0',
    letterSpacing: el.letterSpacing ? `${el.letterSpacing / 1000}em` : 'normal', textTransform: el.upper ? 'uppercase' : 'none',
  } as CSSStyleDeclaration);
  if (el.list) {
    const ul = document.createElement('ul'); ul.style.margin = '0'; ul.style.paddingLeft = '1.2em';
    (el.text || '').split('\n').forEach(l => { const li = document.createElement('li'); li.textContent = l || ' '; ul.appendChild(li); });
    d.appendChild(ul);
  } else d.textContent = el.text || ' ';
  document.body.appendChild(d);
  const h = d.scrollHeight;
  d.remove();
  return Math.max(20, Math.ceil(h));
}
const fitText = (el: SlideEl): SlideEl => (el.type === 'text' ? { ...el, h: measureText(el) } : el);

function ColorButton({ value, onChange, title, icon }: { value?: string; onChange: (c: string) => void; title: string; icon?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" title={title} onClick={() => setOpen(v => !v)} className="flex h-9 items-center gap-1 rounded-lg px-2 hover:bg-slate-100">
        {icon}
        <span className="h-5 w-5 rounded-md border border-slate-300" style={{ background: value || 'transparent' }} />
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="grid grid-cols-8 gap-1.5">
            {COLORS.map(c => <button key={c} onClick={() => { onChange(c); setOpen(false); }} className={`h-5 w-5 rounded-md border ${value === c ? 'ring-2 ring-brand ring-offset-1' : 'border-slate-200'}`} style={{ background: c }} />)}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">Màu khác
            <input type="color" value={value && value.startsWith('#') && value.length === 7 ? value : '#000000'} onChange={e => onChange(e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-slate-200" />
          </label>
          <button onClick={() => { onChange('transparent'); setOpen(false); }} className="mt-2 text-xs text-slate-500 hover:text-slate-800">Không màu</button>
        </div>
      )}
    </div>
  );
}

export default function SlideEditor({ initial, role, currentUser, onExit }: { initial: Deck; role: Role; currentUser: UserAccount; onExit: () => void }) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const readOnly = role === 'view';
  const canManage = role === 'owner' || role === 'manage';

  const [deck, setDeck] = useState<Deck>(initial);
  const [slides, setSlides] = useState<Slide[]>(initial.slides);
  const [title, setTitle] = useState(initial.title);
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(readOnly ? null : 'templates');
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  const [showNotes, setShowNotes] = useState(false);
  const [grid, setGrid] = useState(false);
  const [presenting, setPresenting] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [fileMenu, setFileMenu] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [status, setStatus] = useState<'saved' | 'saving' | 'error' | 'dirty'>('saved');
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [busyUpload, setBusyUpload] = useState(0);
  const [painter, setPainter] = useState<Partial<SlideEl> | null>(null);       // sao chép kiểu
  const [replaceId, setReplaceId] = useState<string | null>(null);             // ảnh đang chờ thay
  const [preview, setPreview] = useState<{ phases: Record<string, ElPhase>; key: number } | null>(null);
  const [transKey, setTransKey] = useState(0);
  const [tplMode, setTplMode] = useState<'add' | 'replace'>('add');
  const previewTimer = useRef<any>(null);

  const past = useRef<Slide[][]>([]);
  const future = useRef<Slide[][]>([]);
  const slidesRef = useRef(slides); slidesRef.current = slides;
  const deckRef = useRef(deck); deckRef.current = deck;
  const titleRef = useRef(title); titleRef.current = title;
  const saveTimer = useRef<any>(null);
  const lastSeen = useRef<string | null>(null);
  const clipboard = useRef<SlideEl[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const slideBoxRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 900, h: 500 });

  const slide = slides[Math.min(cur, slides.length - 1)];
  const selected = slide.els.filter(e => sel.includes(e.id));
  const one = selected.length === 1 ? selected[0] : null;

  // ===== Kích thước khung =====
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStage({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fitWidth = Math.max(240, Math.min(stage.w - 64, (stage.h - 48) * (SLIDE_W / SLIDE_H)));
  const width = zoom === 'fit' ? fitWidth : SLIDE_W * zoom;
  const scale = width / SLIDE_W;

  // ===== Lưu tự động =====
  const save = useCallback(async () => {
    clearTimeout(saveTimer.current);
    setStatus('saving');
    try {
      const next = await saveDeck({ ...deckRef.current, title: titleRef.current.trim() || 'Bài giảng không tên', slides: slidesRef.current });
      deckRef.current = next; setDeck(next);
      lastSeen.current = `${next.updatedAt}|${next.updatedBy || ''}`;
      setStatus(s => (s === 'dirty' ? 'dirty' : 'saved'));
    } catch { setStatus('error'); }
  }, []);
  const markDirty = useCallback(() => {
    if (readOnly) return;
    setStatus('dirty');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { save(); }, 1200);
  }, [readOnly, save]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (status === 'dirty' || status === 'saving') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);
  useEffect(() => () => { if (saveTimer.current) { clearTimeout(saveTimer.current); if (!readOnly) saveDeck({ ...deckRef.current, title: titleRef.current, slides: slidesRef.current }).catch(() => {}); } }, [readOnly]);

  // Nhận thay đổi của người cùng chỉnh sửa (8 giây kiểm tra 1 lần khi mình không đang sửa).
  const dragging = useRef(false);
  useEffect(() => {
    lastSeen.current = `${initial.updatedAt}|${initial.updatedBy || ''}`;
    const t = setInterval(async () => {
      if (dragging.current || editingId || saveTimer.current && status !== 'saved') return;
      const v = await getDeckUpdatedAt(deckRef.current.ownerId, deckRef.current.id).catch(() => null);
      if (!v || v === lastSeen.current) return;
      const [, by] = v.split('|');
      lastSeen.current = v;
      if (by === currentUser.id) return;
      const fresh = await getDeck(deckRef.current.ownerId, deckRef.current.id).catch(() => null);
      if (!fresh) return;
      setDeck(fresh); setSlides(fresh.slides); setTitle(fresh.title);
      setCur(c => Math.min(c, fresh.slides.length - 1));
      addNotification('Đã cập nhật thay đổi của người cùng chỉnh sửa.', 'info');
    }, 8000);
    return () => clearInterval(t);
  }, [editingId, status, currentUser.id, addNotification, initial]);

  useEffect(() => { listCollaborators('slide_deck' as any, deck.id).then(setCollabs).catch(() => {}); }, [deck.id, collabOpen]);

  // ===== Lịch sử =====
  const commit = useCallback((next: Slide[], keepFuture = false) => {
    past.current.push(slidesRef.current);
    if (past.current.length > 100) past.current.shift();
    if (!keepFuture) future.current = [];
    setSlides(next);
    markDirty();
  }, [markDirty]);
  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push(slidesRef.current); setSlides(p); setSel([]); markDirty(); };
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push(slidesRef.current); setSlides(f); setSel([]); markDirty(); };

  const mapSlide = (fn: (s: Slide) => Slide, idx = cur) => slidesRef.current.map((s, i) => (i === idx ? fn(s) : s));
  const updateEls = (ids: string[], patch: Partial<SlideEl> | ((e: SlideEl) => Partial<SlideEl>), record = true) => {
    const next = mapSlide(s => ({ ...s, els: s.els.map(e => (ids.includes(e.id) ? fitText({ ...e, ...(typeof patch === 'function' ? patch(e) : patch) }) : e)) }));
    if (record) commit(next); else { setSlides(next); markDirty(); }
  };
  const addEl = (el: SlideEl) => {
    if (readOnly) return;
    const e = fitText(el);
    commit(mapSlide(s => ({ ...s, els: [...s.els, e] })));
    setSel([e.id]);
  };
  const removeSel = () => { if (!sel.length) return; commit(mapSlide(s => ({ ...s, els: s.els.filter(e => !sel.includes(e.id)) }))); setSel([]); };
  const duplicateSel = () => {
    if (!selected.length) return;
    const copies = selected.map(e => ({ ...e, id: uid(), x: e.x + 24, y: e.y + 24 }));
    commit(mapSlide(s => ({ ...s, els: [...s.els, ...copies] })));
    setSel(copies.map(c => c.id));
  };
  const layer = (dir: 'up' | 'down') => {
    commit(mapSlide(s => {
      const rest = s.els.filter(e => !sel.includes(e.id));
      const mine = s.els.filter(e => sel.includes(e.id));
      return { ...s, els: dir === 'up' ? [...rest, ...mine] : [...mine, ...rest] };
    }));
  };

  // ===== Trang =====
  const addSlide = (layout: LayoutId = 'title_content', at = cur + 1) => {
    if (readOnly) return;
    const s = makeSlide(layout, layout === 'section' ? undefined : { ...(slide.bg || { color: '#fff' }) });
    const next = [...slidesRef.current]; next.splice(at, 0, s);
    commit(next); setCur(at); setSel([]);
  };
  const dupSlide = (i: number) => {
    const c: Slide = JSON.parse(JSON.stringify(slidesRef.current[i])); c.id = uid('s'); c.els.forEach(e => { e.id = uid(); });
    const next = [...slidesRef.current]; next.splice(i + 1, 0, c); commit(next); setCur(i + 1);
  };
  const delSlide = (i: number) => {
    if (slidesRef.current.length <= 1) { addNotification('Bài giảng cần ít nhất 1 trang.', 'warning'); return; }
    const next = slidesRef.current.filter((_, k) => k !== i); commit(next); setCur(c => Math.max(0, Math.min(c > i ? c - 1 : c, next.length - 1))); setSel([]);
  };
  const moveSlide = (from: number, to: number) => {
    if (from === to) return;
    const next = [...slidesRef.current]; const [m] = next.splice(from, 1); next.splice(to, 0, m); commit(next); setCur(to);
  };
  const setBg = (bg: Slide['bg'], all = false) => {
    commit(all ? slidesRef.current.map(s => ({ ...s, bg })) : mapSlide(s => ({ ...s, bg })));
  };
  // Áp mẫu trang (hoặc trang trống) lên trang đang mở, giữ ghi chú và chuyển trang.
  const applyLayout = (layout: LayoutId) => {
    const t = makeSlide(layout, layout === 'section' ? undefined : { ...(slide.bg || { color: '#fff' }) });
    commit(mapSlide(s => ({ ...s, els: t.els, bg: layout === 'section' ? t.bg : s.bg })));
    setSel([]);
    addNotification('Đã áp mẫu lên trang hiện tại. Bấm Ctrl Z nếu muốn lấy lại nội dung cũ.', 'info');
  };
  const setTransition = (type: TransitionKind, dur?: number, all = false) => {
    const tr = { type, dur: dur ?? slide.transition?.dur ?? 0.7 };
    commit(all ? slidesRef.current.map(s => ({ ...s, transition: tr })) : mapSlide(s => ({ ...s, transition: tr })));
    setTransKey(k => k + 1);
  };
  // Xem trước hiệu ứng xuất hiện ngay trên khung soạn.
  const playPreview = (ids: string[]) => {
    ensureAnimCss();
    const ph: Record<string, ElPhase> = {};
    let total = 0;
    ids.forEach(id => { const e = slide.els.find(x => x.id === id); if (e?.anim?.in && e.anim.in !== 'none') { ph[id] = 'play'; total = Math.max(total, (e.anim.delay ?? 0) + (e.anim.dur ?? 0.7)); } });
    clearTimeout(previewTimer.current);
    setPreview({ phases: ph, key: Date.now() });
    previewTimer.current = setTimeout(() => setPreview(null), (total + 2.5) * 1000);
  };
  const setAnim = (patch: Partial<NonNullable<SlideEl['anim']>>, play = true) => {
    updateEls(sel, e => ({ anim: { trigger: 'auto', dur: 0.7, delay: 0, ...(e.anim || {}), ...patch } }));
    if (play) setTimeout(() => playPreview(sel), 30);
  };
  // Căn khối theo trang.
  const alignTo = (how: 'l' | 'c' | 'r' | 't' | 'm' | 'b') => updateEls(sel, e => {
    if (how === 'l') return { x: 0 }; if (how === 'c') return { x: Math.round((SLIDE_W - e.w) / 2) }; if (how === 'r') return { x: SLIDE_W - e.w };
    if (how === 't') return { y: 0 }; if (how === 'm') return { y: Math.round((SLIDE_H - e.h) / 2) }; return { y: SLIDE_H - e.h };
  });
  const layerStep = (dir: 1 | -1) => commit(mapSlide(s => {
    const els = [...s.els];
    const idxs = els.map((e, i) => (sel.includes(e.id) ? i : -1)).filter(i => i >= 0);
    const order = dir === 1 ? idxs.reverse() : idxs;
    for (const i of order) { const j = i + dir; if (j < 0 || j >= els.length || sel.includes(els[j].id)) continue; [els[i], els[j]] = [els[j], els[i]]; }
    return { ...s, els };
  }));
  // Sao chép kiểu: lấy kiểu của khối đang chọn, bấm khối khác để dán.
  const styleOf = (e: SlideEl): Partial<SlideEl> => e.type === 'text'
    ? { fontFamily: e.fontFamily, fontSize: e.fontSize, color: e.color, bold: e.bold, italic: e.italic, underline: e.underline, strike: e.strike, upper: e.upper, align: e.align, lineHeight: e.lineHeight, letterSpacing: e.letterSpacing, bg: e.bg, effect: e.effect, effectColor: e.effectColor, effectSize: e.effectSize, opacity: e.opacity }
    : e.type === 'image' ? { radius: e.radius, filter: e.filter, effect: e.effect, effectColor: e.effectColor, effectSize: e.effectSize, opacity: e.opacity }
    : { fill: e.fill, stroke: e.stroke, strokeWidth: e.strokeWidth, effect: e.effect, effectColor: e.effectColor, effectSize: e.effectSize, opacity: e.opacity };

  // ===== Ảnh =====
  const insertImage = async (src: string) => {
    const size = await new Promise<{ w: number; h: number }>(res => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ w: 800, h: 600 }); im.src = src; });
    if (replaceId) {
      const target = slidesRef.current[cur]?.els.find(e => e.id === replaceId);
      setReplaceId(null);
      if (target) { updateEls([target.id], { src }); setSel([target.id]); return; }
    }
    const k = Math.min(640 / size.w, 480 / size.h, 1);
    const w = Math.round(size.w * k), h = Math.round(size.h * k);
    addEl({ id: uid(), type: 'image', src, x: (SLIDE_W - w) / 2, y: (SLIDE_H - h) / 2, w, h, fit: 'cover' });
  };
  const uploadFiles = async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setBusyUpload(n => n + imgs.length);
    for (const f of imgs) {
      try { const url = await uploadMediaToCloudinary(f, { resourceType: 'image', folder: 'slides', category: 'Bài giảng' } as any); await insertImage(url); }
      catch (e: any) { addNotification('Chưa tải được ảnh: ' + (e?.message || e), 'error'); }
      finally { setBusyUpload(n => n - 1); }
    }
  };
  // Ảnh lấy từ web khác được chép về kho của mình để không bị mất khi trang gốc xoá.
  const insertRemote = async (url: string) => {
    setBusyUpload(n => n + 1);
    try { const mine = await uploadMediaToCloudinary(url, { resourceType: 'image', folder: 'slides', category: 'Bài giảng' } as any); await insertImage(mine); }
    catch { await insertImage(url); }
    finally { setBusyUpload(n => n - 1); }
  };

  // Dán ảnh từ bộ nhớ tạm.
  useEffect(() => {
    if (readOnly) return;
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length) { e.preventDefault(); uploadFiles(files); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  // ===== Phím tắt =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (presenting !== null) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (readOnly) return; e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); if (!readOnly) redo(); return; }
      if (e.key === 'PageDown') { setCur(c => Math.min(slidesRef.current.length - 1, c + 1)); setSel([]); return; }
      if (e.key === 'PageUp') { setCur(c => Math.max(0, c - 1)); setSel([]); return; }
      if (readOnly) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length) { e.preventDefault(); removeSel(); return; }
      if (mod && e.key.toLowerCase() === 'c' && selected.length) { clipboard.current = selected.map(x => ({ ...x })); return; }
      if (mod && e.key.toLowerCase() === 'x' && selected.length) { clipboard.current = selected.map(x => ({ ...x })); removeSel(); return; }
      if (mod && e.key.toLowerCase() === 'v' && clipboard.current.length) {
        const copies = clipboard.current.map(x => ({ ...x, id: uid(), x: x.x + 20, y: x.y + 20 }));
        clipboard.current = copies;
        commit(mapSlide(s => ({ ...s, els: [...s.els, ...copies] }))); setSel(copies.map(c => c.id)); return;
      }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSel(); return; }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); setSel(slide.els.map(x => x.id)); return; }
      if (e.key === 'Escape') { setSel([]); return; }
      if (e.key === 'Enter' && one?.type === 'text') { e.preventDefault(); setEditingId(one.id); return; }
      const step = e.shiftKey ? 10 : 1;
      const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (d[e.key] && sel.length) { e.preventDefault(); updateEls(sel, x => ({ x: x.x + d[e.key][0], y: x.y + d[e.key][1] })); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ===== Kéo, đổi cỡ, xoay =====
  const toSlide = (cx: number, cy: number) => {
    const r = slideBoxRef.current!.getBoundingClientRect();
    return { x: (cx - r.left) / scale, y: (cy - r.top) / scale };
  };
  const startDrag = (e: React.PointerEvent, el: SlideEl, mode: 'move' | 'resize' | 'rotate', handle?: Handle) => {
    if (readOnly) return;
    if (editingId && editingId !== el.id) stopEditing();
    e.stopPropagation();
    e.preventDefault();
    let ids = sel;
    if (mode === 'move' && painter) {
      updateEls([el.id], painter);
      setPainter(null); setSel([el.id]);
      return;
    }
    if (mode === 'move') {
      if (e.shiftKey) { ids = sel.includes(el.id) ? sel.filter(i => i !== el.id) : [...sel, el.id]; setSel(ids); return; }
      if (!sel.includes(el.id)) { ids = [el.id]; setSel(ids); }
      if (el.locked) return;
    } else ids = [el.id];
    const start = toSlide(e.clientX, e.clientY);
    const before = slidesRef.current;
    const orig = new Map(slide.els.filter(x => ids.includes(x.id)).map(x => [x.id, { ...x }]));
    const others = slide.els.filter(x => !ids.includes(x.id));
    const T = 6 / scale;
    let moved = false;
    dragging.current = true;
    const onMove = (ev: PointerEvent) => {
      const p = toSlide(ev.clientX, ev.clientY);
      let dx = p.x - start.x, dy = p.y - start.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 2) return;
      moved = true;
      const next = new Map<string, Partial<SlideEl>>();
      if (mode === 'move') {
        // Bám mép, bám giữa trang và các khối khác (đường gióng tím).
        const os = [...orig.values()];
        const bx = Math.min(...os.map(o => o.x)), by = Math.min(...os.map(o => o.y));
        const bw = Math.max(...os.map(o => o.x + o.w)) - bx, bh = Math.max(...os.map(o => o.y + o.h)) - by;
        const xs = [0, SLIDE_W / 2, SLIDE_W, ...others.flatMap(o => [o.x, o.x + o.w / 2, o.x + o.w])];
        const ys = [0, SLIDE_H / 2, SLIDE_H, ...others.flatMap(o => [o.y, o.y + o.h / 2, o.y + o.h])];
        const gx: number[] = [], gy: number[] = [];
        if (!ev.altKey) {
          let best = T + 1, adj = 0;
          for (const c of xs) for (const v of [bx + dx, bx + dx + bw / 2, bx + dx + bw]) { const d = c - v; if (Math.abs(d) < Math.abs(best)) { best = d; adj = d; } }
          if (Math.abs(best) <= T) { dx += adj; for (const c of xs) if ([bx + dx, bx + dx + bw / 2, bx + dx + bw].some(v => Math.abs(v - c) < 0.5)) gx.push(c); }
          best = T + 1; adj = 0;
          for (const c of ys) for (const v of [by + dy, by + dy + bh / 2, by + dy + bh]) { const d = c - v; if (Math.abs(d) < Math.abs(best)) { best = d; adj = d; } }
          if (Math.abs(best) <= T) { dy += adj; for (const c of ys) if ([by + dy, by + dy + bh / 2, by + dy + bh].some(v => Math.abs(v - c) < 0.5)) gy.push(c); }
        }
        setGuides({ x: [...new Set(gx)], y: [...new Set(gy)] });
        orig.forEach((o, id) => next.set(id, { x: Math.round(o.x + dx), y: Math.round(o.y + dy) }));
      } else if (mode === 'resize' && handle) {
        const o = orig.get(el.id)!;
        let { x, y, w, h } = o;
        const keep = o.type === 'image' ? !ev.shiftKey && handle.length === 2 : ev.shiftKey && handle.length === 2;
        if (handle.includes('e')) w = Math.max(16, o.w + dx);
        if (handle.includes('s')) h = Math.max(16, o.h + dy);
        if (handle.includes('w')) { w = Math.max(16, o.w - dx); x = o.x + (o.w - w); }
        if (handle.includes('n')) { h = Math.max(16, o.h - dy); y = o.y + (o.h - h); }
        if (keep || (o.type === 'text' && handle.length === 2)) {
          const k = Math.max(w / o.w, h / o.h);
          w = o.w * k; h = o.h * k;
          if (handle.includes('w')) x = o.x + o.w - w;
          if (handle.includes('n')) y = o.y + o.h - h;
        }
        const patch: Partial<SlideEl> = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
        if (o.type === 'text' && handle.length === 2) patch.fontSize = Math.max(8, Math.round((o.fontSize || 32) * (w / o.w)));
        next.set(el.id, patch);
      } else if (mode === 'rotate') {
        const o = orig.get(el.id)!;
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
        a = ((a % 360) + 360) % 360;
        if (ev.shiftKey) a = Math.round(a / 15) * 15;
        else for (const s of [0, 90, 180, 270, 360]) if (Math.abs(a - s) < 4) a = s % 360;
        next.set(el.id, { rot: Math.round(a) });
      }
      setSlides(prev => prev.map((s, i) => (i !== cur ? s : { ...s, els: s.els.map(x => (next.has(x.id) ? (x.type === 'text' && mode === 'resize' ? fitText({ ...x, ...next.get(x.id) }) : { ...x, ...next.get(x.id) }) : x)) })));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dragging.current = false;
      setGuides({ x: [], y: [] });
      if (moved) { past.current.push(before); future.current = []; markDirty(); }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ===== Thêm nhanh =====
  const addText = (kind: 'h1' | 'h2' | 'body' | 'list') => {
    const preset: Record<string, Partial<SlideEl>> = {
      h1: { text: 'Thêm tiêu đề', fontSize: 64, bold: true, color: '#0f172a', w: 900 },
      h2: { text: 'Thêm tiêu đề phụ', fontSize: 40, bold: true, color: '#334155', w: 800 },
      body: { text: 'Thêm một đoạn văn bản', fontSize: 28, color: '#334155', w: 700 },
      list: { text: 'Ý thứ nhất\nÝ thứ hai\nÝ thứ ba', fontSize: 28, list: true, lineHeight: 1.6, color: '#334155', w: 700 },
    };
    const p = preset[kind];
    addEl(textEl({ ...p, x: (SLIDE_W - (p.w as number)) / 2, y: 300, align: kind === 'list' ? 'left' : 'center' }));
  };
  const addShape = (k: ShapeKind) => {
    const line = k === 'line' || k === 'arrow';
    // Hình mới lấy màu chủ đạo của hệ thống.
    const brand = (getComputedStyle(document.documentElement).getPropertyValue('--brand') || '').trim() || '#10b981';
    addEl({ id: uid(), type: 'shape', shape: k, x: line ? 440 : 540, y: line ? 350 : 260, w: line ? 400 : 200, h: line ? 20 : 200, fill: brand, stroke: line ? brand : undefined, strokeWidth: line ? 6 : 0 });
  };

  // ===== Xuất PDF (in) =====
  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => { window.print(); }, 600);
    const after = () => setPrinting(false);
    window.addEventListener('afterprint', after);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', after); };
  }, [printing]);

  // ===== Giao diện =====
  const rail: Array<{ id: Exclude<Panel, null>; label: string; icon: any }> = [
    { id: 'templates', label: 'Mẫu', icon: LayoutTemplate },
    { id: 'elements', label: 'Thành phần', icon: Shapes },
    { id: 'text', label: 'Văn bản', icon: Type },
    { id: 'uploads', label: 'Tải lên', icon: Upload },
    { id: 'library', label: 'Thư viện', icon: Images },
    { id: 'background', label: 'Nền', icon: PaintBucket },
  ];
  const tb = 'grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100';
  const tbOn = 'grid h-9 w-9 place-items-center rounded-lg bg-brand-light text-brand';
  const handles: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const hpos: Record<Handle, React.CSSProperties> = {
    nw: { left: 0, top: 0, cursor: 'nwse-resize' }, n: { left: '50%', top: 0, cursor: 'ns-resize' }, ne: { left: '100%', top: 0, cursor: 'nesw-resize' },
    e: { left: '100%', top: '50%', cursor: 'ew-resize' }, se: { left: '100%', top: '100%', cursor: 'nwse-resize' }, s: { left: '50%', top: '100%', cursor: 'ns-resize' },
    sw: { left: 0, top: '100%', cursor: 'nesw-resize' }, w: { left: 0, top: '50%', cursor: 'ew-resize' },
  };

  const editingEl = slide.els.find(e => e.id === editingId) || null;

  const panelHead = (t: string) => (
    <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">{t}</p><button onClick={() => setPanel(null)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
  );
  const chip = (on: boolean) => `rounded-xl border px-2 py-2 text-xs font-medium ${on ? 'border-brand bg-brand-light text-brand' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`;
  const FILTERS: Array<[string, ImgFilter | undefined]> = [
    ['Gốc', undefined], ['Đen trắng', { grayscale: 100 }], ['Cổ điển', { sepia: 60, contrast: 105 }], ['Ấm', { saturate: 130, hue: -10, brightness: 105 }],
    ['Lạnh', { saturate: 90, hue: 15, brightness: 102 }], ['Rực rỡ', { saturate: 170, contrast: 110 }], ['Nhạt', { saturate: 60, brightness: 110 }], ['Tối', { brightness: 80, contrast: 115 }],
  ];
  function renderPropPanel() {
    if (panel === 'transition') {
      const tr = slide.transition || { type: 'none' as TransitionKind, dur: 0.7 };
      return (
        <div className="space-y-4">{panelHead('Chuyển tiếp trang')}
          <p className="text-xs text-slate-500">Hiệu ứng khi chuyển sang trang {cur + 1} lúc trình chiếu.</p>
          <div className="grid grid-cols-3 gap-2">
            {TRANSITION_LABELS.map(([k, l]) => <button key={k} onClick={() => setTransition(k)} className={chip(tr.type === k)}>{l}</button>)}
          </div>
          {tr.type !== 'none' && <SliderRow label="Thời gian (giây)" min={0.2} max={3} step={0.1} value={tr.dur ?? 0.7} onChange={v => setTransition(tr.type, v)} />}
          <button onClick={() => setTransition(tr.type, tr.dur, true)} className="w-full rounded-xl border border-slate-200 py-2 text-sm hover:bg-slate-50">Áp dụng cho mọi trang</button>
          <button onClick={() => setPresenting(Math.max(0, cur - 1))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-hover"><Play className="h-4 w-4" /> Trình chiếu thử</button>
        </div>
      );
    }
    if (panel === 'animate') {
      if (!selected.length) {
        const animated = slide.els.filter(e => e.anim?.in && e.anim.in !== 'none');
        return (
          <div className="space-y-3">{panelHead('Chuyển động trên trang')}
            <p className="text-xs text-slate-500">Chọn một khối trên trang để đặt hiệu ứng xuất hiện và chuyển động. Trang này có {animated.length} khối có hiệu ứng.</p>
            {animated.length > 0 && <>
              <button onClick={() => playPreview(slide.els.map(e => e.id))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2 text-sm font-semibold text-white"><PlayCircle className="h-4 w-4" /> Xem trước cả trang</button>
              <button onClick={() => commit(mapSlide(s => ({ ...s, els: s.els.map(e => ({ ...e, anim: undefined })) })))} className="w-full rounded-xl border border-slate-200 py-2 text-sm text-rose-600 hover:bg-rose-50">Bỏ mọi hiệu ứng trên trang</button>
            </>}
          </div>
        );
      }
      const a = selected[0].anim || {};
      return (
        <div className="space-y-4">{panelHead('Chuyển động')}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">Hiệu ứng xuất hiện</p>
            <div className="grid grid-cols-3 gap-2">
              {ANIM_IN_LABELS.map(([k, l]) => <button key={k} onClick={() => setAnim({ in: k as AnimIn })} className={chip((a.in || 'none') === k)}>{l}</button>)}
            </div>
          </div>
          {a.in && a.in !== 'none' && <>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setAnim({ trigger: 'auto' }, false)} className={chip(a.trigger !== 'click')}>Tự động khi vào trang</button>
              <button onClick={() => setAnim({ trigger: 'click' }, false)} className={chip(a.trigger === 'click')}>Khi bấm chuột</button>
            </div>
            <SliderRow label="Thời gian (giây)" min={0.2} max={3} step={0.1} value={a.dur ?? 0.7} onChange={v => setAnim({ dur: v }, false)} />
            <SliderRow label="Chờ trước khi chạy (giây)" min={0} max={5} step={0.1} value={a.delay ?? 0} onChange={v => setAnim({ delay: v }, false)} />
          </>}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">Chuyển động lặp lại</p>
            <div className="grid grid-cols-3 gap-2">
              {ANIM_LOOP_LABELS.map(([k, l]) => <button key={k} onClick={() => setAnim({ loop: k as AnimLoop })} className={chip((a.loop || 'none') === k)}>{l}</button>)}
            </div>
            {a.loop && a.loop !== 'none' && <div className="mt-3"><SliderRow label="Chu kỳ (giây)" min={0.5} max={10} step={0.5} value={a.loopDur ?? (a.loop === 'spin' ? 6 : 2)} onChange={v => setAnim({ loopDur: v }, false)} /></div>}
          </div>
          <button onClick={() => playPreview(sel)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-hover"><PlayCircle className="h-4 w-4" /> Xem trước</button>
          <p className="text-[11px] text-slate-400">Khối đặt "Khi bấm chuột" xuất hiện lần lượt theo thứ tự lớp (số trên khung) mỗi lần bấm khi trình chiếu.</p>
        </div>
      );
    }
    if (panel === 'position') {
      if (!selected.length) return <div>{panelHead('Vị trí')}<p className="text-xs text-slate-500">Chọn một khối trên trang.</p></div>;
      const o = selected[0];
      const num = (label: string, v: number, k: 'x' | 'y' | 'w' | 'h' | 'rot') => (
        <label className="space-y-1"><span className="text-[11px] text-slate-500">{label}</span>
          <input type="number" value={Math.round(v)} onChange={e => updateEls([o.id], { [k]: Number(e.target.value) || 0 } as any)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label>
      );
      return (
        <div className="space-y-4">{panelHead('Vị trí')}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">Lớp</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => layer('up')} className={chip(false)}><ChevronsUp className="mr-1 inline h-3.5 w-3.5" />Lên trên cùng</button>
              <button onClick={() => layerStep(1)} className={chip(false)}><ChevronUp className="mr-1 inline h-3.5 w-3.5" />Lên 1 lớp</button>
              <button onClick={() => layerStep(-1)} className={chip(false)}><ChevronDown className="mr-1 inline h-3.5 w-3.5" />Xuống 1 lớp</button>
              <button onClick={() => layer('down')} className={chip(false)}><ChevronsDown className="mr-1 inline h-3.5 w-3.5" />Xuống dưới cùng</button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">Căn theo trang</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => alignTo('l')} className={chip(false)} title="Trái"><AlignStartVertical className="mx-auto h-4 w-4" /></button>
              <button onClick={() => alignTo('c')} className={chip(false)} title="Giữa ngang"><AlignCenterVertical className="mx-auto h-4 w-4" /></button>
              <button onClick={() => alignTo('r')} className={chip(false)} title="Phải"><AlignEndVertical className="mx-auto h-4 w-4" /></button>
              <button onClick={() => alignTo('t')} className={chip(false)} title="Trên"><AlignStartHorizontal className="mx-auto h-4 w-4" /></button>
              <button onClick={() => alignTo('m')} className={chip(false)} title="Giữa dọc"><AlignCenterHorizontal className="mx-auto h-4 w-4" /></button>
              <button onClick={() => alignTo('b')} className={chip(false)} title="Dưới"><AlignEndHorizontal className="mx-auto h-4 w-4" /></button>
            </div>
          </div>
          {one && <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">Kích thước và vị trí chính xác</p>
            <div className="grid grid-cols-2 gap-2">{num('Ngang (X)', o.x, 'x')}{num('Dọc (Y)', o.y, 'y')}{num('Rộng', o.w, 'w')}{num('Cao', o.h, 'h')}{num('Xoay (độ)', o.rot || 0, 'rot')}</div>
          </div>}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={duplicateSel} className={chip(false)}><Copy className="mx-auto mb-0.5 h-4 w-4" />Nhân bản</button>
            <button onClick={() => updateEls(sel, { locked: !selected.every(x => x.locked) })} className={chip(selected.every(x => x.locked))}>{selected.every(x => x.locked) ? <Lock className="mx-auto mb-0.5 h-4 w-4" /> : <Unlock className="mx-auto mb-0.5 h-4 w-4" />}{selected.every(x => x.locked) ? 'Mở khoá' : 'Khoá'}</button>
            <button onClick={removeSel} className="rounded-xl border border-rose-200 px-2 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"><Trash2 className="mx-auto mb-0.5 h-4 w-4" />Xoá</button>
          </div>
        </div>
      );
    }
    // Hiệu ứng
    if (!selected.length) return <div>{panelHead('Hiệu ứng')}<p className="text-xs text-slate-500">Chọn một khối trên trang.</p></div>;
    const o = selected[0];
    const effects = o.type === 'text' ? EFFECT_LABELS : EFFECT_LABELS.filter(([k]) => ['none', 'shadow', 'lift', 'glow', 'echo'].includes(k));
    const f = o.filter || {};
    const setF = (patch: ImgFilter) => updateEls(sel, { filter: { ...f, ...patch } }, false);
    return (
      <div className="space-y-4">{panelHead('Hiệu ứng')}
        {o.type === 'image' && <>
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">Bộ lọc màu</p>
            <div className="grid grid-cols-4 gap-2">
              {FILTERS.map(([l, v]) => (
                <button key={l} onClick={() => updateEls(sel, { filter: v })} className="text-center">
                  <div className={`aspect-square overflow-hidden rounded-lg ${JSON.stringify(o.filter || null) === JSON.stringify(v || null) ? 'ring-2 ring-brand' : ''}`}>
                    {o.src && <img src={o.src.replace('/upload/', '/upload/w_120,q_auto,f_auto/')} alt="" className="h-full w-full object-cover" style={{ filter: v ? [v.brightness && `brightness(${v.brightness}%)`, v.contrast && `contrast(${v.contrast}%)`, v.saturate && `saturate(${v.saturate}%)`, v.grayscale && `grayscale(${v.grayscale}%)`, v.sepia && `sepia(${v.sepia}%)`, v.hue && `hue-rotate(${v.hue}deg)`].filter(Boolean).join(' ') : undefined }} />}
                  </div>
                  <span className="text-[10px] text-slate-600">{l}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500">Chỉnh ảnh</p>
            <SliderRow label="Độ sáng" min={30} max={180} step={1} value={f.brightness ?? 100} onChange={v => setF({ brightness: v })} />
            <SliderRow label="Tương phản" min={30} max={180} step={1} value={f.contrast ?? 100} onChange={v => setF({ contrast: v })} />
            <SliderRow label="Độ bão hoà màu" min={0} max={250} step={1} value={f.saturate ?? 100} onChange={v => setF({ saturate: v })} />
            <SliderRow label="Làm mờ" min={0} max={20} step={0.5} value={f.blur ?? 0} onChange={v => setF({ blur: v })} />
          </div>
        </>}
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">{o.type === 'text' ? 'Kiểu chữ' : 'Bóng và ánh sáng'}</p>
          <div className="grid grid-cols-3 gap-2">
            {effects.map(([k, l]) => (
              <button key={k} onClick={() => updateEls(sel, { effect: k as EffectKind, effectColor: o.effectColor || (k === 'neon' || k === 'glow' ? '#22d3ee' : '#0f172a') })} className={`${chip((o.effect || 'none') === k)} flex flex-col items-center gap-1`}>
                {o.type === 'text' && <span className="relative block h-8 w-full"><ElementView el={{ id: 'p', type: 'text', x: 0, y: 0, w: 70, h: 30, text: 'Ag', fontSize: 24, bold: true, align: 'center', color: '#1e293b', fontFamily: o.fontFamily, effect: k as EffectKind, effectColor: k === 'neon' || k === 'glow' ? '#22d3ee' : '#64748b' }} /></span>}
                {l}
              </button>
            ))}
          </div>
        </div>
        {o.effect && o.effect !== 'none' && <>
          <div className="flex items-center justify-between text-xs text-slate-600">Màu hiệu ứng <ColorButton title="Màu hiệu ứng" value={o.effectColor} onChange={c => updateEls(sel, { effectColor: c })} /></div>
          <SliderRow label="Độ mạnh" min={0} max={100} step={1} value={o.effectSize ?? 50} onChange={v => updateEls(sel, { effectSize: v }, false)} />
        </>}
      </div>
    );
  }
  // Kết thúc sửa chữ: lấy nội dung ô đang gõ rồi lưu, gọi trước mọi thao tác làm ô gõ biến mất.
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const stopEditing = () => {
    const ta = editRef.current;
    const el = editingEl;
    setEditingId(null);
    if (ta && el && ta.value !== el.text) updateEls([el.id], { text: ta.value });
    editRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-100 text-slate-800">
      {/* Thanh trên */}
      <header className="flex h-14 shrink-0 items-center gap-1 bg-gradient-to-r from-brand to-brand-hover px-2 text-white sm:px-3">
        <button onClick={async () => { if (status === 'dirty') await save(); onExit(); }} title="Về danh sách bài giảng" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white/15"><Home className="h-5 w-5" /></button>
        <div className="relative">
          <button onClick={() => setFileMenu(v => !v)} className="flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold hover:bg-white/15">Tệp <ChevronDown className="h-4 w-4" /></button>
          {fileMenu && (
            <div className="absolute left-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 text-sm text-slate-700 shadow-xl" onMouseLeave={() => setFileMenu(false)}>
              {!readOnly && <button onClick={async () => { setFileMenu(false); const v = await askText({ title: 'Đổi tên bài giảng', defaultValue: title }); if (v != null) { setTitle(v); markDirty(); } }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><Pencil className="h-4 w-4" /> Đổi tên</button>}
              <button onClick={async () => { setFileMenu(false); try { const c = await duplicateDeck({ ...deck, slides, title }, currentUser.fullName); addNotification(`Đã tạo bản sao "${c.title}" trong danh sách của bạn.`, 'success'); } catch (e: any) { addNotification(e?.message || 'Chưa tạo được bản sao.', 'error'); } }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><Copy className="h-4 w-4" /> Tạo bản sao</button>
              <button onClick={() => { setFileMenu(false); setSel([]); setPrinting(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"><FileDown className="h-4 w-4" /> In hoặc lưu PDF</button>
              {role === 'owner' && <button onClick={() => { setFileMenu(false); confirm('Xoá bài giảng', `Xoá "${title}"? Bài giảng sẽ nằm ở mục Đã xoá trong trang Cá nhân 30 ngày.`, async () => { try { await softDeleteDeck({ ...deck, slides, title }); onExit(); } catch (e: any) { addNotification(e?.message || 'Chưa xoá được.', 'error'); } }); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /> Xoá bài giảng</button>}
            </div>
          )}
        </div>
        {!readOnly && <>
          <button onClick={undo} disabled={!past.current.length} title="Hoàn tác (Ctrl Z)" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white/15 disabled:opacity-40"><Undo2 className="h-5 w-5" /></button>
          <button onClick={redo} disabled={!future.current.length} title="Làm lại (Ctrl Y)" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white/15 disabled:opacity-40"><Redo2 className="h-5 w-5" /></button>
        </>}
        <span className="ml-1 grid h-10 w-10 place-items-center" title={status === 'saved' ? 'Đã lưu' : status === 'error' ? 'Chưa lưu được' : 'Đang lưu'}>
          {status === 'saving' || status === 'dirty' ? <Loader2 className="h-5 w-5 animate-spin" /> : status === 'error' ? <CloudOff className="h-5 w-5 text-amber-200" /> : <Cloud className="h-5 w-5" />}
        </span>
        <div className="mx-2 min-w-0 flex-1 text-center">
          {readOnly
            ? <span className="truncate text-sm font-semibold">{title} <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">Chỉ xem</span></span>
            : <input value={title} onChange={e => { setTitle(e.target.value); markDirty(); }} className="w-full max-w-md truncate rounded-lg bg-transparent px-2 py-1 text-center text-sm font-semibold outline-none placeholder:text-white/60 hover:bg-white/10 focus:bg-white/15" placeholder="Bài giảng không tên" />}
        </div>
        <div className="hidden items-center md:flex">
          <AvatarStack people={[{ id: deck.ownerId, name: deck.ownerName }, ...collabs.map(c => ({ id: c.userId, name: c.userName }))]} size="md" max={5} singleWithName={false} />
        </div>
        {canManage && <button onClick={() => setCollabOpen(true)} title="Thêm người cùng chỉnh sửa" className="ml-1 flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-white/15"><UserPlus className="h-5 w-5" /><span className="hidden lg:inline">Cộng tác</span></button>}
        <button onClick={() => setPresenting(cur)} className="ml-1 flex h-10 items-center gap-2 rounded-lg border border-white/50 px-3 text-sm font-semibold hover:bg-white/15"><Play className="h-4 w-4" /><span className="hidden sm:inline">Trình chiếu</span></button>
        <div className="relative">
          <button onClick={() => setShareOpen(v => !v)} className="ml-1 flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-white/90"><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Chia sẻ</span></button>
          {shareOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-slate-700 shadow-2xl">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Chia sẻ bài giảng</p><button onClick={() => setShareOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
              {canManage && (
                <button onClick={() => { setShareOpen(false); setCollabOpen(true); }} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50"><UserPlus className="h-4 w-4 text-brand" /> Thêm người cùng xem, cùng chỉnh sửa</button>
              )}
              <div className="rounded-xl border border-slate-200 p-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2"><Link2 className="h-4 w-4 text-slate-500" /> Ai có link đều xem được</span>
                  <input type="checkbox" disabled={!canManage} checked={!!deck.shareOn} onChange={async e => { try { const n = await setDeckShare({ ...deck, slides, title }, e.target.checked); setDeck(n); deckRef.current = n; } catch { addNotification('Chưa đổi được chế độ chia sẻ.', 'error'); } }} className="h-4 w-4 accent-brand" />
                </label>
                {deck.shareOn && deck.shareToken && (
                  <div className="mt-3 flex gap-2">
                    <input readOnly value={deckShareUrl(deck.shareToken)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs" />
                    <button onClick={async () => { await copyText(deckShareUrl(deck.shareToken!)); addNotification('Đã chép link xem bài giảng.', 'success'); }} className="rounded-lg bg-brand px-3 text-xs font-semibold text-white">Chép</button>
                  </div>
                )}
                {!canManage && <p className="mt-2 text-xs text-slate-400">Chỉ chủ bài giảng hoặc người có quyền quản lý đổi được chế độ này.</p>}
              </div>
              <button onClick={() => { setShareOpen(false); setPresenting(0); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50"><Play className="h-4 w-4" /> Trình chiếu từ đầu</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Thanh công cụ bên trái */}
        {!readOnly && (
          <nav className="flex w-[72px] shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-slate-200 bg-white py-2">
            {rail.map(r => {
              const I = r.icon; const on = panel === r.id;
              return (
                <button key={r.id} onClick={() => setPanel(on ? null : r.id)} className={`flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium ${on ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <I className="h-5 w-5" />{r.label}
                </button>
              );
            })}
          </nav>
        )}
        {!readOnly && panel && (
          <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
            {panel === 'effects' || panel === 'animate' || panel === 'position' || panel === 'transition'
              ? renderPropPanel()
              : <LeftPanel panel={panel} slide={slide} onLayout={l => (tplMode === 'replace' ? applyLayout(l) : addSlide(l))} tplMode={tplMode} onTplMode={setTplMode} onText={addText} onShape={addShape} onImage={insertImage} onRemoteImage={insertRemote}
                  onUpload={uploadFiles} busy={busyUpload} onBg={setBg} onClose={() => setPanel(null)} />}
          </aside>
        )}

        {/* Vùng soạn */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Thanh thuộc tính theo khối đang chọn */}
          {!readOnly && (
            <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5">
              {one?.type === 'text' && <>
                <select value={one.fontFamily || DEFAULT_FONT} onChange={e => { ensureFont(e.target.value); updateEls([one.id], { fontFamily: e.target.value }); }} className="h-9 w-40 rounded-lg border border-slate-200 px-2 text-sm">
                  {FONT_OPTIONS.map(f => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>)}
                </select>
                <div className="flex items-center rounded-lg border border-slate-200">
                  <button className="grid h-8 w-8 place-items-center hover:bg-slate-100" onClick={() => updateEls([one.id], { fontSize: Math.max(8, (one.fontSize || 32) - 2) })}><Minus className="h-3.5 w-3.5" /></button>
                  <input value={one.fontSize || 32} onChange={e => { const v = Number(e.target.value); if (v > 0) updateEls([one.id], { fontSize: Math.min(400, v) }); }} className="h-8 w-11 text-center text-sm outline-none" />
                  <button className="grid h-8 w-8 place-items-center hover:bg-slate-100" onClick={() => updateEls([one.id], { fontSize: Math.min(400, (one.fontSize || 32) + 2) })}><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <ColorButton title="Màu chữ" value={one.color} onChange={c => updateEls([one.id], { color: c })} icon={<span className="text-sm font-bold underline">A</span>} />
                <button className={one.bold ? tbOn : tb} title="Chữ đậm" onClick={() => updateEls([one.id], { bold: !one.bold })}><Bold className="h-4 w-4" /></button>
                <button className={one.italic ? tbOn : tb} title="Chữ nghiêng" onClick={() => updateEls([one.id], { italic: !one.italic })}><Italic className="h-4 w-4" /></button>
                <button className={one.underline ? tbOn : tb} title="Gạch chân" onClick={() => updateEls([one.id], { underline: !one.underline })}><Underline className="h-4 w-4" /></button>
                <button className={one.strike ? tbOn : tb} title="Gạch ngang chữ" onClick={() => updateEls([one.id], { strike: !one.strike })}><Strikethrough className="h-4 w-4" /></button>
                <button className={one.upper ? tbOn : tb} title="Chữ in hoa" onClick={() => updateEls([one.id], { upper: !one.upper })}><CaseUpper className="h-4 w-4" /></button>
                <button className={tb} title="Căn lề" onClick={() => updateEls([one.id], { align: one.align === 'left' ? 'center' : one.align === 'center' ? 'right' : 'left' })}>
                  {one.align === 'center' ? <AlignCenter className="h-4 w-4" /> : one.align === 'right' ? <AlignRight className="h-4 w-4" /> : <AlignLeft className="h-4 w-4" />}
                </button>
                <button className={one.list ? tbOn : tb} title="Danh sách gạch đầu dòng" onClick={() => updateEls([one.id], { list: !one.list })}><List className="h-4 w-4" /></button>
                <Popover title="Khoảng cách chữ" icon={<MoveVertical className="h-4 w-4" />}>
                  <SliderRow label="Khoảng cách giữa các chữ" min={-50} max={400} step={10} value={one.letterSpacing || 0} onChange={v => updateEls([one.id], { letterSpacing: v }, false)} />
                  <SliderRow label="Khoảng cách dòng" min={0.8} max={2.5} step={0.05} value={one.lineHeight || 1.3} onChange={v => updateEls([one.id], { lineHeight: v }, false)} />
                </Popover>
                <ColorButton title="Màu nền khối chữ" value={one.bg} onChange={c => updateEls([one.id], { bg: c === 'transparent' ? undefined : c })} icon={<PaintBucket className="h-4 w-4" />} />
                <Sep />
              </>}
              {one?.type === 'shape' && <>
                {one.shape !== 'line' && one.shape !== 'arrow' && <ColorButton title="Màu tô" value={one.fill} onChange={c => updateEls([one.id], { fill: c })} icon={<Droplet className="h-4 w-4" />} />}
                <ColorButton title="Màu viền" value={one.stroke} onChange={c => updateEls([one.id], { stroke: c, strokeWidth: one.strokeWidth || 4 })} icon={<span className="text-xs font-semibold">Viền</span>} />
                <select value={one.strokeWidth || 0} onChange={e => updateEls([one.id], { strokeWidth: Number(e.target.value) })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" title="Độ dày viền">
                  {[0, 2, 4, 6, 8, 12, 16].map(n => <option key={n} value={n}>{n ? `${n} px` : 'Không viền'}</option>)}
                </select>
                <Sep />
              </>}
              {one?.type === 'image' && <>
                <button className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm hover:bg-slate-100" title="Thay ảnh khác, giữ nguyên vị trí và cỡ" onClick={() => { setReplaceId(one.id); setPanel('uploads'); addNotification('Chọn ảnh ở mục Tải lên hoặc Thư viện để thay.', 'info'); }}><Replace className="h-4 w-4" /> Thay ảnh</button>
                <button className={one.flipX ? tbOn : tb} title="Lật ngang" onClick={() => updateEls([one.id], { flipX: !one.flipX })}><FlipHorizontal2 className="h-4 w-4" /></button>
                <button className={one.flipY ? tbOn : tb} title="Lật dọc" onClick={() => updateEls([one.id], { flipY: !one.flipY })}><FlipVertical2 className="h-4 w-4" /></button>
                <button className={tb} title={one.fit === 'contain' ? 'Lấp đầy khung' : 'Hiện trọn ảnh'} onClick={() => updateEls([one.id], { fit: one.fit === 'contain' ? 'cover' : 'contain' })}><Maximize className="h-4 w-4" /></button>
                <select value={one.radius || 0} onChange={e => updateEls([one.id], { radius: Number(e.target.value) })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" title="Bo góc">
                  {[0, 8, 16, 24, 40, 999].map(n => <option key={n} value={n}>{n === 999 ? 'Tròn' : n ? `Bo ${n}` : 'Không bo'}</option>)}
                </select>
                <button className={tb} title="Dùng làm ảnh nền trang" onClick={() => { commit(mapSlide(s => ({ ...s, bg: { image: one.src }, els: s.els.filter(e => e.id !== one.id) }))); setSel([]); }}><PaintBucket className="h-4 w-4" /></button>
                <Sep />
              </>}
              {selected.length > 0 ? <>
                <TextBtn on={panel === 'effects'} onClick={() => setPanel(panel === 'effects' ? null : 'effects')} icon={<Sparkles className="h-4 w-4" />}>Hiệu ứng</TextBtn>
                <TextBtn on={panel === 'animate'} onClick={() => setPanel(panel === 'animate' ? null : 'animate')} icon={<Wand2 className="h-4 w-4" />}>Chuyển động</TextBtn>
                <TextBtn on={panel === 'position'} onClick={() => setPanel(panel === 'position' ? null : 'position')} icon={<Move className="h-4 w-4" />}>Vị trí</TextBtn>
                <Popover title="Độ trong suốt" icon={<Blend className="h-4 w-4" />}>
                  <SliderRow label="Độ trong suốt" min={0} max={100} step={1} value={Math.round((one?.opacity ?? selected[0].opacity ?? 1) * 100)} onChange={v => updateEls(sel, { opacity: v / 100 }, false)} />
                </Popover>
                {one && <button className={painter ? tbOn : tb} title="Sao chép kiểu: bấm rồi chọn khối khác để dán kiểu" onClick={() => { if (painter) setPainter(null); else { setPainter(styleOf(one)); addNotification('Bấm vào khối khác để dán kiểu.', 'info'); } }}><Paintbrush className="h-4 w-4" /></button>}
              </> : (
                <div className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
                  <ColorButton title="Màu nền trang" value={slide.bg?.color} onChange={c => setBg({ color: c })} icon={<PaintBucket className="h-4 w-4" />} />
                  <TextBtn on={panel === 'transition'} onClick={() => setPanel(panel === 'transition' ? null : 'transition')} icon={<PlayCircle className="h-4 w-4" />}>Chuyển tiếp{slide.transition && slide.transition.type !== 'none' ? ` · ${TRANSITION_LABELS.find(t => t[0] === slide.transition!.type)?.[1]}` : ''}</TextBtn>
                  <TextBtn on={panel === 'animate'} onClick={() => setPanel(panel === 'animate' ? null : 'animate')} icon={<Wand2 className="h-4 w-4" />}>Chuyển động</TextBtn>
                  <TextBtn on={panel === 'templates'} onClick={() => { setTplMode('replace'); setPanel('templates'); }} icon={<LayoutTemplate className="h-4 w-4" />}>Áp mẫu cho trang này</TextBtn>
                  <span className="ml-2 hidden xl:inline">Bấm vào một khối để chỉnh. Kéo thả hoặc dán ảnh bằng Ctrl V.</span>
                </div>
              )}
              {painter && <span className="ml-2 rounded-full bg-brand-light px-2 py-1 text-xs font-semibold text-brand">Đang sao chép kiểu, bấm vào khối cần dán</span>}
              {replaceId && <button onClick={() => setReplaceId(null)} className="ml-2 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Đang chọn ảnh để thay · Huỷ</button>}
              {busyUpload > 0 && <span className="ml-auto flex items-center gap-1.5 text-xs text-brand"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải ảnh...</span>}
            </div>
          )}

          <div ref={stageRef} className="relative min-h-0 flex-1 overflow-auto"
            onPointerDown={e => { if (e.target === e.currentTarget) { setSel([]); stopEditing(); } }}
            onDragOver={e => { if (!readOnly) e.preventDefault(); }}
            onDrop={e => { if (readOnly) return; e.preventDefault(); uploadFiles(Array.from(e.dataTransfer.files || [])); }}>
            <div className="flex min-h-full min-w-full items-center justify-center p-6" onPointerDown={e => { if (e.target === e.currentTarget) { setSel([]); stopEditing(); } }}>
              <div ref={slideBoxRef} className="relative shrink-0 shadow-lg" style={{ width, height: SLIDE_H * scale }}>
                <SlideRenderer key={`tr_${transKey}`} slide={slide} width={width} editingId={editingId} phases={preview?.phases} loops={!!preview} playKey={preview?.key}
                  style={transKey && slide.transition && slide.transition.type !== 'none' && panel === 'transition' ? { animation: `st-${slide.transition.type}-in ${slide.transition.dur ?? 0.7}s cubic-bezier(.3,.7,.2,1) both` } : undefined}>
                  {/* Lớp tương tác */}
                  <div className="absolute inset-0" onPointerDown={e => { if (e.target === e.currentTarget) { setSel([]); stopEditing(); } }}>
                    {slide.els.map(el => (
                      <div key={el.id}
                        onPointerDown={e => startDrag(e, el, 'move')}
                        onDoubleClick={() => { if (!readOnly && el.type === 'text') setEditingId(el.id); }}
                        style={{ position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h, transform: el.rot ? `rotate(${el.rot}deg)` : undefined, cursor: readOnly ? 'default' : el.locked ? 'not-allowed' : 'move' }}
                        className={!readOnly && !sel.includes(el.id) ? 'hover:outline hover:outline-2 hover:outline-brand/40' : ''} />
                    ))}
                    {!readOnly && selected.map(el => (
                      <div key={`s_${el.id}`} style={{ position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h, transform: el.rot ? `rotate(${el.rot}deg)` : undefined, outline: `${2 / scale}px solid var(--color-brand)`, pointerEvents: 'none' }}>
                        {one && !el.locked && editingId !== el.id && <>
                          {handles.filter(h => !(el.type === 'text' && (h === 'n' || h === 's'))).map(h => (
                            <span key={h} onPointerDown={e => startDrag(e, el, 'resize', h)}
                              style={{ ...hpos[h], position: 'absolute', width: 14 / scale, height: 14 / scale, transform: 'translate(-50%,-50%)', background: '#fff', border: `${2 / scale}px solid var(--color-brand)`, borderRadius: h.length === 2 ? '50%' : 4 / scale, pointerEvents: 'auto' }} />
                          ))}
                          <span onPointerDown={e => startDrag(e, el, 'rotate')} title="Xoay"
                            style={{ position: 'absolute', left: '50%', top: -36 / scale, width: 22 / scale, height: 22 / scale, transform: 'translate(-50%,-50%)', background: '#fff', border: `${2 / scale}px solid var(--color-brand)`, borderRadius: '50%', cursor: 'grab', pointerEvents: 'auto' }} />
                        </>}
                      </div>
                    ))}
                    {/* Số thứ tự xuất hiện khi bấm */}
                    {panel === 'animate' && slide.els.filter(e => e.anim?.in && e.anim.in !== 'none').map(e => {
                      const clicks = slide.els.filter(x => x.anim?.in && x.anim.in !== 'none' && x.anim.trigger === 'click');
                      const n = e.anim?.trigger === 'click' ? clicks.indexOf(e) + 1 : 0;
                      return <span key={`n_${e.id}`} style={{ position: 'absolute', left: e.x - 14 / scale, top: e.y - 14 / scale, minWidth: 26 / scale, height: 26 / scale, fontSize: 13 / scale, borderRadius: 13 / scale, padding: `0 ${6 / scale}px`, pointerEvents: 'none' }}
                        className="grid place-items-center bg-brand font-bold text-white shadow">{n || 'A'}</span>;
                    })}
                    {/* Thanh nhỏ nổi trên khối đang chọn */}
                    {!readOnly && selected.length > 0 && !editingId && !dragging.current && (() => {
                      const top = Math.min(...selected.map(e => e.y)), left = Math.min(...selected.map(e => e.x)), right = Math.max(...selected.map(e => e.x + e.w));
                      const above = top > 120;
                      const bottom = Math.max(...selected.map(e => e.y + e.h));
                      return (
                        <div onPointerDown={e => e.stopPropagation()} style={{ position: 'absolute', left: (left + right) / 2, top: above ? top - 96 / scale : bottom + 22 / scale, transform: `translateX(-50%) scale(${1 / scale})`, transformOrigin: 'top center' }}
                          className="flex items-center gap-0.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                          <button title={selected.every(x => x.locked) ? 'Mở khoá' : 'Khoá'} onClick={() => updateEls(sel, { locked: !selected.every(x => x.locked) })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">{selected.every(x => x.locked) ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}</button>
                          <button title="Nhân bản (Ctrl D)" onClick={duplicateSel} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><Copy className="h-4 w-4" /></button>
                          <button title="Xoá (Delete)" onClick={removeSel} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                          <button title="Vị trí, lớp, căn chỉnh" onClick={() => setPanel('position')} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></button>
                        </div>
                      );
                    })()}
                    {guides.x.map(x => <div key={`gx${x}`} style={{ position: 'absolute', left: x, top: 0, width: 1 / scale, height: SLIDE_H, background: 'var(--color-brand)', pointerEvents: 'none' }} />)}
                    {guides.y.map(y => <div key={`gy${y}`} style={{ position: 'absolute', top: y, left: 0, height: 1 / scale, width: SLIDE_W, background: 'var(--color-brand)', pointerEvents: 'none' }} />)}
                    {editingEl && (
                      <textarea ref={editRef} rows={1} autoFocus defaultValue={editingEl.text || ''}
                        onFocus={e => { const ta = e.currentTarget; ta.select(); ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; }}
                        onPointerDown={e => e.stopPropagation()}
                        onKeyDown={e => { if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur(); e.stopPropagation(); }}
                        onInput={e => { const ta = e.currentTarget; ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; }}
                        onBlur={() => stopEditing()}
                        style={{
                          position: 'absolute', left: editingEl.x, top: editingEl.y, width: editingEl.w, minHeight: editingEl.h, transform: editingEl.rot ? `rotate(${editingEl.rot}deg)` : undefined,
                          fontFamily: `'${editingEl.fontFamily || 'Inter'}', sans-serif`, fontSize: editingEl.fontSize, color: editingEl.color, fontWeight: editingEl.bold ? 700 : 400,
                          fontStyle: editingEl.italic ? 'italic' : 'normal', textAlign: editingEl.align, lineHeight: editingEl.lineHeight || 1.3, background: editingEl.bg || 'rgba(255,255,255,0.0)',
                          outline: `${2 / scale}px solid var(--color-brand)`, border: 'none', resize: 'none', overflow: 'hidden', padding: editingEl.bg ? '0.2em 0.4em' : 0, margin: 0, whiteSpace: 'pre-wrap',
                        }} />
                    )}
                  </div>
                </SlideRenderer>
              </div>
            </div>
          </div>

          {showNotes && (
            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-2">
              <textarea value={slide.notes || ''} readOnly={readOnly} onChange={e => { const v = e.target.value; setSlides(prev => prev.map((s, i) => (i === cur ? { ...s, notes: v } : s))); markDirty(); }}
                placeholder="Ghi chú cho người trình bày ở trang này..." rows={3} className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white" />
            </div>
          )}

          {/* Dải trang thu nhỏ */}
          <div className="flex h-[112px] shrink-0 items-center gap-3 overflow-x-auto border-t border-slate-200 bg-white px-4">
            {slides.map((s, i) => (
              <div key={s.id} draggable={!readOnly}
                onDragStart={e => { e.dataTransfer.setData('text/slide', String(i)); }}
                onDragOver={e => { if (e.dataTransfer.types.includes('text/slide')) e.preventDefault(); }}
                onDrop={e => { const from = Number(e.dataTransfer.getData('text/slide')); if (!Number.isNaN(from)) moveSlide(from, i); }}
                className="group relative shrink-0">
                <button onClick={() => { stopEditing(); setCur(i); setSel([]); }} className={`block overflow-hidden rounded-lg border-2 ${i === cur ? 'border-brand' : 'border-slate-200 hover:border-slate-300'}`}>
                  <SlideRenderer slide={s} width={140} />
                </button>
                <span className="absolute bottom-1 left-1.5 rounded bg-white/85 px-1 text-[11px] font-semibold text-slate-600">{i + 1}</span>
                {!readOnly && (
                  <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                    <button onClick={() => dupSlide(i)} title="Nhân bản trang" className="grid h-6 w-6 place-items-center rounded-md bg-white/90 text-slate-600 shadow hover:text-brand"><Copy className="h-3.5 w-3.5" /></button>
                    <button onClick={() => delSlide(i)} title="Xoá trang" className="grid h-6 w-6 place-items-center rounded-md bg-white/90 text-slate-600 shadow hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
            {!readOnly && (
              <button onClick={() => addSlide('title_content', slides.length)} title="Thêm trang" className="grid h-[79px] w-[60px] shrink-0 place-items-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand hover:text-brand"><Plus className="h-6 w-6" /></button>
            )}
          </div>

          {/* Thanh dưới */}
          <div className="flex h-11 shrink-0 items-center gap-3 border-t border-slate-200 bg-white px-4 text-sm text-slate-600">
            <button onClick={() => setShowNotes(v => !v)} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${showNotes ? 'bg-brand-light text-brand' : 'hover:bg-slate-100'}`}><StickyNote className="h-4 w-4" /> Ghi chú</button>
            <div className="ml-auto flex items-center gap-2">
              <input type="range" min={25} max={200} step={5} value={Math.round(scale * 100)} onChange={e => setZoom(Number(e.target.value) / 100)} className="hidden w-32 accent-brand sm:block" />
              <button onClick={() => setZoom('fit')} title="Vừa khung" className="w-12 rounded-lg px-1 py-1 text-center tabular-nums hover:bg-slate-100">{Math.round(scale * 100)}%</button>
              <span className="tabular-nums">{cur + 1} / {slides.length}</span>
              <button onClick={() => setGrid(true)} title="Xem tất cả trang" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><Grid2X2 className="h-4 w-4" /></button>
              <button onClick={() => setPresenting(cur)} title="Trình chiếu toàn màn hình" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><Maximize className="h-4 w-4" /></button>
            </div>
          </div>
        </main>
      </div>

      {/* Xem tất cả trang, kéo để đổi thứ tự */}
      {grid && createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/70 p-6 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) setGrid(false); }}>
          <div className="mx-auto max-w-6xl rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between"><p className="font-semibold">Tất cả {slides.length} trang</p><button onClick={() => setGrid(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {slides.map((s, i) => (
                <div key={s.id} draggable={!readOnly} onDragStart={e => e.dataTransfer.setData('text/slide', String(i))} onDragOver={e => e.preventDefault()}
                  onDrop={e => { const from = Number(e.dataTransfer.getData('text/slide')); if (!Number.isNaN(from)) moveSlide(from, i); }}>
                  <button onClick={() => { setCur(i); setGrid(false); }} className={`block w-full overflow-hidden rounded-lg border-2 ${i === cur ? 'border-brand' : 'border-slate-200'}`}><SlideRenderer slide={s} width={250} /></button>
                  <p className="mt-1 text-center text-xs text-slate-500">{i + 1}</p>
                </div>
              ))}
            </div>
          </div>
        </div>, document.body)}

      {presenting !== null && <SlidePresenter slides={slides} start={presenting} onClose={() => setPresenting(null)} />}
      {collabOpen && <ShareDialog type={'slide_deck' as any} resourceId={deck.id} resourceTitle={title} ownerId={deck.ownerId} ownerName={deck.ownerName} currentUser={currentUser} canManage={canManage} onClose={() => setCollabOpen(false)} />}

      {/* Bản in: mỗi trang 1 tờ khổ ngang */}
      {printing && createPortal(
        <div id="slides-print">
          <style>{`@media screen { #slides-print { position: fixed; left: -100000px; top: 0; } }
@media print { body > *:not(#slides-print) { display: none !important; } #slides-print { display: block; } @page { size: 1280px 720px; margin: 0; } .sp-page { page-break-after: always; break-after: page; } }`}</style>
          {slides.map(s => <div key={s.id} className="sp-page"><SlideRenderer slide={s} width={1280} /></div>)}
        </div>, document.body)}
    </div>
  );
}

function Sep() { return <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" />; }
function TextBtn({ on, onClick, icon, children }: { on?: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium ${on ? 'bg-brand-light text-brand' : 'text-slate-700 hover:bg-slate-100'}`}>{icon}{children}</button>;
}
function Popover({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button title={title} onClick={() => setOpen(v => !v)} className={`grid h-9 w-9 place-items-center rounded-lg ${open ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-100'}`}>{icon}</button>
      {open && <div className="absolute left-0 top-11 z-50 w-72 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"><p className="text-sm font-semibold text-slate-800">{title}</p>{children}</div>}
    </div>
  );
}
function SliderRow({ label, min, max, step, value, onChange, suffix }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between text-xs text-slate-600">{label}<input type="number" min={min} max={max} step={step} value={value} onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} className="w-16 rounded-md border border-slate-200 px-1.5 py-0.5 text-right text-xs" /></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-brand" />
      {suffix && <span className="text-[11px] text-slate-400">{suffix}</span>}
    </label>
  );
}

// ===== Bảng bên trái =====
function LeftPanel({ panel, slide, onLayout, tplMode, onTplMode, onText, onShape, onImage, onRemoteImage, onUpload, busy, onBg, onClose }: {
  panel: Exclude<Panel, null>; slide: Slide; onLayout: (l: LayoutId) => void; tplMode: 'add' | 'replace'; onTplMode: (m: 'add' | 'replace') => void; onText: (k: 'h1' | 'h2' | 'body' | 'list') => void; onShape: (k: ShapeKind) => void;
  onImage: (url: string) => void; onRemoteImage: (url: string) => void; onUpload: (files: File[]) => void; busy: number; onBg: (bg: Slide['bg'], all?: boolean) => void; onClose: () => void;
}) {
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [q, setQ] = useState('');
  const [stock, setStock] = useState<Array<{ id: string; url: string; thumb: string; title: string }>>([]);
  const [stockBusy, setStockBusy] = useState(false);
  const [applyAll, setApplyAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((panel === 'uploads' || panel === 'background') && media === null) listMyMedia().then(m => setMedia(m.filter(x => x.type === 'image'))).catch(() => setMedia([]));
  }, [panel, media]);
  useEffect(() => { if (busy === 0 && panel === 'uploads') listMyMedia().then(m => setMedia(m.filter(x => x.type === 'image'))).catch(() => {}); }, [busy, panel]);

  const searchStock = async (term: string) => {
    setStockBusy(true);
    try {
      const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(term || 'education')}&page_size=30&mature=false`);
      const j = await r.json();
      setStock((j.results || []).map((x: any) => ({ id: x.id, url: x.url, thumb: x.thumbnail || x.url, title: x.title || '' })));
    } catch { setStock([]); }
    finally { setStockBusy(false); }
  };
  useEffect(() => { if (panel === 'library' && !stock.length) searchStock('education'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [panel]);

  const head = (t: string) => (
    <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">{t}</p><button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
  );
  const previews = useMemo(() => LAYOUTS.map(l => ({ ...l, slide: makeSlide(l.id) })), []);

  if (panel === 'templates') return (
    <div>{head('Mẫu trang')}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
        <button onClick={() => onTplMode('add')} className={`rounded-lg py-1.5 ${tplMode === 'add' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Thêm trang mới</button>
        <button onClick={() => onTplMode('replace')} className={`rounded-lg py-1.5 ${tplMode === 'replace' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Áp vào trang này</button>
      </div>
      <p className="mb-3 text-xs text-slate-500">{tplMode === 'add' ? 'Bấm một mẫu để thêm trang mới ngay sau trang đang mở.' : 'Bấm một mẫu để thay toàn bộ nội dung trang đang mở (chọn Trang trống để xoá sạch). Ctrl Z để lấy lại.'}</p>
      <div className="grid grid-cols-2 gap-3">
        {previews.map(p => (
          <button key={p.id} onClick={() => onLayout(p.id)} className="text-left">
            <div className="overflow-hidden rounded-lg border border-slate-200 hover:border-brand"><SlideRenderer slide={p.slide} width={124} /></div>
            <p className="mt-1 text-[11px] text-slate-600">{p.label}</p>
          </button>
        ))}
      </div>
    </div>
  );

  if (panel === 'elements') return (
    <div>{head('Thành phần')}
      <p className="mb-2 text-xs font-semibold text-slate-500">Hình khối và đường kẻ</p>
      <div className="grid grid-cols-4 gap-2">
        {SHAPES.map(s => (
          <button key={s.k} title={s.label} onClick={() => onShape(s.k)} className="grid aspect-square place-items-center rounded-lg bg-slate-50 p-2 hover:bg-brand-light">
            <div style={{ position: 'relative', width: 44, height: s.k === 'line' || s.k === 'arrow' ? 10 : 44 }}>
              <ElementView el={{ id: 'p', type: 'shape', shape: s.k, x: 0, y: 0, w: 44, h: s.k === 'line' || s.k === 'arrow' ? 10 : 44, fill: 'var(--color-brand)', stroke: 'var(--color-brand)', strokeWidth: s.k === 'line' || s.k === 'arrow' ? 3 : 0 }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  if (panel === 'text') return (
    <div className="space-y-3">{head('Văn bản')}
      <button onClick={() => onText('h1')} className="w-full rounded-xl bg-slate-100 px-4 py-3 text-left text-2xl font-bold hover:bg-brand-light">Thêm tiêu đề</button>
      <button onClick={() => onText('h2')} className="w-full rounded-xl bg-slate-100 px-4 py-3 text-left text-lg font-semibold hover:bg-brand-light">Thêm tiêu đề phụ</button>
      <button onClick={() => onText('body')} className="w-full rounded-xl bg-slate-100 px-4 py-3 text-left text-sm hover:bg-brand-light">Thêm một đoạn văn bản</button>
      <button onClick={() => onText('list')} className="w-full rounded-xl bg-slate-100 px-4 py-3 text-left text-sm hover:bg-brand-light">• Danh sách gạch đầu dòng</button>
      <p className="pt-2 text-xs text-slate-500">Nhấn đúp vào khối chữ trên trang để sửa nội dung. Kéo góc khối để phóng to chữ.</p>
    </div>
  );

  if (panel === 'uploads') return (
    <div>{head('Tải lên')}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { onUpload(Array.from(e.target.files || [])); e.target.value = ''; }} />
      <button onClick={() => fileRef.current?.click()} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Tải ảnh lên
      </button>
      <p className="mb-2 text-xs text-slate-500">Ảnh đã tải lên trước đây trong kho của bạn. Bấm để chèn vào trang.</p>
      {media === null ? <div className="py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> :
        media.length === 0 ? <p className="py-6 text-center text-xs text-slate-400">Chưa có ảnh nào.</p> : (
          <div className="columns-2 gap-2">
            {media.map(m => <button key={m.url} onClick={() => onImage(m.url)} className="mb-2 block w-full overflow-hidden rounded-lg hover:ring-2 hover:ring-brand"><img src={m.url.replace('/upload/', '/upload/w_300,q_auto,f_auto/')} alt="" loading="lazy" className="w-full" /></button>)}
          </div>
        )}
    </div>
  );

  if (panel === 'library') return (
    <div>{head('Thư viện ảnh')}
      <form onSubmit={e => { e.preventDefault(); searchStock(q); }} className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm ảnh (tiếng Anh cho nhiều kết quả)" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white" />
      </form>
      <p className="mb-2 text-[11px] text-slate-400">Ảnh miễn phí từ Openverse, giấy phép Creative Commons. Ảnh chèn vào sẽ được chép về kho của bạn.</p>
      {stockBusy ? <div className="py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : (
        <div className="columns-2 gap-2">
          {stock.map(s => <button key={s.id} title={s.title} onClick={() => onRemoteImage(s.url)} className="mb-2 block w-full overflow-hidden rounded-lg hover:ring-2 hover:ring-brand"><img src={s.thumb} alt={s.title} loading="lazy" className="w-full" /></button>)}
          {!stock.length && <p className="py-6 text-center text-xs text-slate-400">Không tìm thấy ảnh.</p>}
        </div>
      )}
    </div>
  );

  // Nền
  return (
    <div className="space-y-4">{head('Nền trang')}
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={applyAll} onChange={e => setApplyAll(e.target.checked)} className="accent-brand" /> Áp dụng cho mọi trang</label>
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500">Màu đơn</p>
        <div className="grid grid-cols-6 gap-2">
          {BG_SWATCHES.map(c => <button key={c} onClick={() => onBg({ color: c }, applyAll)} className={`aspect-square rounded-lg border ${slide.bg?.color === c && !slide.bg?.gradient && !slide.bg?.image ? 'ring-2 ring-brand' : 'border-slate-200'}`} style={{ background: c }} />)}
          <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed border-slate-300 text-slate-400" title="Chọn màu khác">
            <Plus className="h-4 w-4" /><input type="color" className="hidden" onChange={e => onBg({ color: e.target.value }, applyAll)} />
          </label>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500">Chuyển màu</p>
        <div className="grid grid-cols-4 gap-2">
          {GRADIENTS.map(g => <button key={g} onClick={() => onBg({ gradient: g }, applyAll)} className={`aspect-video rounded-lg ${slide.bg?.gradient === g ? 'ring-2 ring-brand' : ''}`} style={{ background: g }} />)}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500">Ảnh nền từ kho của bạn</p>
        {media === null ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : media.length === 0 ? <p className="text-xs text-slate-400">Chưa có ảnh, hãy dùng mục Tải lên.</p> : (
          <div className="grid grid-cols-3 gap-2">
            {media.slice(0, 30).map(m => <button key={m.url} onClick={() => onBg({ image: m.url }, applyAll)} className="aspect-video overflow-hidden rounded-lg hover:ring-2 hover:ring-brand" style={{ ...bgStyle({ image: m.url.replace('/upload/', '/upload/w_200,q_auto,f_auto/') }) }} />)}
          </div>
        )}
      </div>
      {slide.bg?.image && <button onClick={() => onBg({ color: '#ffffff' }, applyAll)} className="flex items-center gap-1.5 text-xs text-rose-600"><X className="h-3.5 w-3.5" /> Bỏ ảnh nền</button>}
      <p className="flex items-center gap-1 text-[11px] text-slate-400"><Check className="h-3.5 w-3.5" /> Mẹo: chọn một ảnh trên trang rồi bấm biểu tượng nền để biến ảnh đó thành nền.</p>
    </div>
  );
}
