import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Play, Power, Loader2, Check, AlertTriangle, Zap, StickyNote } from 'lucide-react';
import type { NodeRun, WConnection, WNode, Workflow } from '../../lib/automatic/types';
import { outputCount } from '../../lib/automatic/engine';
import { NodeIcon, nodeTypeOf } from './shared';

export const NODE = 100;
const GRID = 20;

export type NodeState = 'running' | 'done' | 'error';
export interface CanvasHandle { fit: () => void; zoomBy: (f: number) => void; reset: () => void; center: () => [number, number] }

interface Props {
  wf: Workflow;
  selected: string[];
  onSelect: (ids: string[]) => void;
  runData: Record<string, NodeRun>;
  states: Record<string, NodeState>;
  readOnly?: boolean;
  onMove: (pos: Record<string, [number, number]>, commit: boolean) => void;
  onConnect: (c: WConnection) => void;
  onDeleteEdge: (c: WConnection) => void;
  onOpen: (name: string) => void;
  onAdd: (req: { from?: string; fromOutput?: number; at?: [number, number]; insert?: WConnection }) => void;
  onMenu: (name: string, x: number, y: number) => void;
  onExecute: (name: string) => void;
  onToggle: (name: string) => void;
  onDelete: (name: string) => void;
}

const edgeKey = (c: WConnection) => `${c.from}|${c.fromOutput}|${c.to}|${c.toInput}`;

export function nodeHeight(n: WNode) {
  const t = nodeTypeOf(n);
  const ins = t?.inputs ?? 1, outs = outputCount(n);
  return Math.max(NODE, 26 * Math.max(ins, outs) + 26);
}
function inPos(n: WNode, i: number): [number, number] {
  const t = nodeTypeOf(n); const k = Math.max(1, t?.inputs ?? 1); const h = nodeHeight(n);
  return [n.position[0], n.position[1] + (h * (i + 1)) / (k + 1)];
}
function outPos(n: WNode, i: number): [number, number] {
  const k = Math.max(1, outputCount(n)); const h = nodeHeight(n);
  return [n.position[0] + NODE, n.position[1] + (h * (i + 1)) / (k + 1)];
}
function curve(a: [number, number], b: [number, number]) {
  const dx = Math.max(50, Math.abs(b[0] - a[0]) / 2);
  if (b[0] < a[0] + 20) {
    // Nối ngược về bên trái: vòng xuống dưới cho dễ nhìn
    const dy = Math.max(80, Math.abs(b[1] - a[1]) / 2 + 60);
    const my = Math.max(a[1], b[1]) + dy;
    return `M${a[0]},${a[1]} C${a[0] + 80},${a[1]} ${a[0] + 80},${my} ${(a[0] + b[0]) / 2},${my} S${b[0] - 80},${b[1]} ${b[0]},${b[1]}`;
  }
  return `M${a[0]},${a[1]} C${a[0] + dx},${a[1]} ${b[0] - dx},${b[1]} ${b[0]},${b[1]}`;
}
function mid(a: [number, number], b: [number, number]): [number, number] {
  if (b[0] < a[0] + 20) return [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + Math.max(80, Math.abs(b[1] - a[1]) / 2 + 60)];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

type Gesture =
  | { kind: 'pan'; sx: number; sy: number; ox: number; oy: number; moved: boolean }
  | { kind: 'drag'; id: string; sx: number; sy: number; start: Record<string, [number, number]>; moved: boolean; t: number; touch: boolean }
  | { kind: 'connect'; from: string; fromOutput: number; moved: boolean }
  | { kind: 'band'; sx: number; sy: number; moved: boolean }
  | null;

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(p, ref) {
  const { wf, selected, runData, states, readOnly } = p;
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 120, y: 160, k: 1 });
  const viewRef = useRef(view); viewRef.current = view;
  const gesture = useRef<Gesture>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; cx: number; cy: number; view: typeof view } | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [band, setBand] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const lastTap = useRef<{ id: string; t: number }>({ id: '', t: 0 });
  const longPress = useRef<number | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const byName = useMemo(() => new Map(wf.nodes.map(n => [n.name, n])), [wf.nodes]);
  const toWorld = useCallback((cx: number, cy: number): [number, number] => {
    const r = box.current!.getBoundingClientRect(); const v = viewRef.current;
    return [(cx - r.left - v.x) / v.k, (cy - r.top - v.y) / v.k];
  }, []);

  const fit = useCallback(() => {
    const el = box.current; if (!el) return;
    const r = el.getBoundingClientRect();
    if (!wf.nodes.length) { setView({ x: r.width / 2 - NODE / 2, y: r.height / 2 - NODE / 2, k: 1 }); return; }
    const xs = wf.nodes.map(n => n.position[0]), ys = wf.nodes.map(n => n.position[1]);
    const minX = Math.min(...xs) - 60, maxX = Math.max(...xs) + NODE + 100, minY = Math.min(...ys) - 70, maxY = Math.max(...wf.nodes.map(n => n.position[1] + nodeHeight(n))) + 70;
    const k = Math.max(0.25, Math.min(1.2, Math.min(r.width / (maxX - minX), (r.height - 80) / (maxY - minY))));
    setView({ k, x: (r.width - (maxX - minX) * k) / 2 - minX * k, y: (r.height - 60 - (maxY - minY) * k) / 2 - minY * k });
  }, [wf.nodes]);

  const zoomAt = useCallback((f: number, cx?: number, cy?: number) => {
    const el = box.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = cx ?? r.left + r.width / 2, py = cy ?? r.top + r.height / 2;
    setView(v => {
      const k = Math.max(0.2, Math.min(2.5, v.k * f));
      const wx = (px - r.left - v.x) / v.k, wy = (py - r.top - v.y) / v.k;
      return { k, x: px - r.left - wx * k, y: py - r.top - wy * k };
    });
  }, []);

  useImperativeHandle(ref, () => ({
    fit, zoomBy: f => zoomAt(f), reset: () => setView(v => ({ ...v, k: 1 })),
    center: () => { const r = box.current!.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); },
  }), [fit, zoomAt, toWorld]);

  // Mở quy trình thì căn vừa khung nhìn
  const fitted = useRef(false);
  useEffect(() => { if (!fitted.current && box.current) { fitted.current = true; requestAnimationFrame(fit); } }, [fit]);

  // Cuộn chuột: di chuyển, giữ Ctrl hoặc chụm 2 ngón trên bàn di chuột: phóng to thu nhỏ
  useEffect(() => {
    const el = box.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
      else setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const clearLong = () => { if (longPress.current) { clearTimeout(longPress.current); longPress.current = null; } };

  const startPinchIfTwo = () => {
    if (pointers.current.size !== 2) return false;
    const [a, b] = [...pointers.current.values()];
    pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, view: viewRef.current };
    gesture.current = null; setBand(null); setCursor(null); clearLong();
    return true;
  };

  const onPointerDownBg = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    box.current?.setPointerCapture(e.pointerId);
    if (startPinchIfTwo()) return;
    setSelEdge(null);
    if (e.shiftKey && !readOnly) gesture.current = { kind: 'band', sx: e.clientX, sy: e.clientY, moved: false };
    else gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: viewRef.current.x, oy: viewRef.current.y, moved: false };
  };

  const onPointerDownNode = (e: React.PointerEvent, n: WNode) => {
    e.stopPropagation();
    if (e.button === 2) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    box.current?.setPointerCapture(e.pointerId);
    if (startPinchIfTwo()) return;
    let ids = selected;
    if (e.shiftKey || e.metaKey || e.ctrlKey) { ids = selected.includes(n.id) ? selected.filter(x => x !== n.id) : [...selected, n.id]; p.onSelect(ids); }
    else if (!selected.includes(n.id)) { ids = [n.id]; p.onSelect(ids); }
    const start: Record<string, [number, number]> = {};
    wf.nodes.filter(x => ids.includes(x.id)).forEach(x => { start[x.id] = [...x.position] as [number, number]; });
    gesture.current = { kind: 'drag', id: n.id, sx: e.clientX, sy: e.clientY, start, moved: false, t: Date.now(), touch: e.pointerType !== 'mouse' };
    clearLong();
    if (e.pointerType !== 'mouse') {
      const cx = e.clientX, cy = e.clientY;
      longPress.current = window.setTimeout(() => { const g = gesture.current; if (g && g.kind === 'drag' && !g.moved) { gesture.current = null; p.onMenu(n.name, cx, cy); } }, 550);
    }
  };

  const onPointerDownOut = (e: React.PointerEvent, n: WNode, i: number) => {
    e.stopPropagation();
    if (readOnly) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    box.current?.setPointerCapture(e.pointerId);
    gesture.current = { kind: 'connect', from: n.name, fromOutput: i, moved: false };
    setCursor(toWorld(e.clientX, e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const s = pinch.current, r = box.current!.getBoundingClientRect();
      const k = Math.max(0.2, Math.min(2.5, s.view.k * (d / Math.max(1, s.d))));
      const wx = (s.cx - r.left - s.view.x) / s.view.k, wy = (s.cy - r.top - s.view.y) / s.view.k;
      setView({ k, x: cx - r.left - wx * k, y: cy - r.top - wy * k });
      return;
    }
    const g = gesture.current; if (!g) return;
    if (g.kind === 'pan') {
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) g.moved = true;
      setView(v => ({ ...v, x: g.ox + dx, y: g.oy + dy }));
    } else if (g.kind === 'drag') {
      if (readOnly) return;
      const k = viewRef.current.k;
      const dx = (e.clientX - g.sx) / k, dy = (e.clientY - g.sy) / k;
      if (!g.moved && Math.abs(dx) + Math.abs(dy) < 4 / k) return;
      g.moved = true; clearLong();
      const pos: Record<string, [number, number]> = {};
      for (const [id, s] of Object.entries(g.start)) pos[id] = [Math.round((s[0] + dx) / GRID) * GRID, Math.round((s[1] + dy) / GRID) * GRID];
      p.onMove(pos, false);
    } else if (g.kind === 'connect') {
      g.moved = true;
      setCursor(toWorld(e.clientX, e.clientY));
    } else if (g.kind === 'band') {
      g.moved = true;
      setBand({ x1: g.sx, y1: g.sy, x2: e.clientX, y2: e.clientY });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    clearLong();
    if (pinch.current) { if (pointers.current.size < 2) pinch.current = null; gesture.current = null; return; }
    const g = gesture.current; gesture.current = null;
    if (!g) return;
    if (g.kind === 'pan' && !g.moved) { p.onSelect([]); }
    if (g.kind === 'drag') {
      if (g.moved) {
        const pos: Record<string, [number, number]> = {};
        wf.nodes.filter(n => g.start[n.id]).forEach(n => { pos[n.id] = n.position; });
        p.onMove(pos, true);
      } else {
        const n = wf.nodes.find(x => x.id === g.id);
        const now = Date.now();
        if (n && lastTap.current.id === g.id && now - lastTap.current.t < 350) { lastTap.current = { id: '', t: 0 }; p.onOpen(n.name); }
        else lastTap.current = { id: g.id, t: now };
      }
    }
    if (g.kind === 'connect') {
      setCursor(null);
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const inEl = el?.closest('[data-in]') as HTMLElement | null;
      const nodeEl = el?.closest('[data-node]') as HTMLElement | null;
      let to: string | null = null, toInput = 0;
      if (inEl) { const [nm, idx] = inEl.dataset.in!.split('|'); to = nm; toInput = Number(idx); }
      else if (nodeEl) {
        to = nodeEl.dataset.node!;
        const tn = byName.get(to);
        const nIn = nodeTypeOf(tn!)?.inputs ?? 1;
        if (!nIn) to = null;
        else {
          // Thả vào thân bước nhiều đầu vào thì chọn cổng gần nhất còn trống
          const used = new Set(wf.connections.filter(c => c.to === to).map(c => c.toInput));
          toInput = Array.from({ length: nIn }, (_, i) => i).find(i => !used.has(i)) ?? 0;
        }
      }
      if (to && to !== g.from) {
        if ((nodeTypeOf(byName.get(to)!)?.inputs ?? 1) > 0) p.onConnect({ from: g.from, fromOutput: g.fromOutput, to, toInput });
      } else if (!to && g.moved) {
        p.onAdd({ from: g.from, fromOutput: g.fromOutput, at: toWorld(e.clientX, e.clientY) });
      } else if (!g.moved) {
        p.onAdd({ from: g.from, fromOutput: g.fromOutput });
      }
    }
    if (g.kind === 'band') {
      setBand(null);
      if (g.moved) {
        const [ax, ay] = toWorld(Math.min(g.sx, e.clientX), Math.min(g.sy, e.clientY));
        const [bx, by] = toWorld(Math.max(g.sx, e.clientX), Math.max(g.sy, e.clientY));
        p.onSelect(wf.nodes.filter(n => n.position[0] + NODE > ax && n.position[0] < bx && n.position[1] + nodeHeight(n) > ay && n.position[1] < by).map(n => n.id));
      }
    }
  };

  // Vùng vẽ đường nối bao quanh mọi bước
  const bounds = useMemo(() => {
    if (!wf.nodes.length) return { x: -1000, y: -1000, w: 3000, h: 3000 };
    const xs = wf.nodes.map(n => n.position[0]), ys = wf.nodes.map(n => n.position[1]);
    const x = Math.min(...xs) - 1500, y = Math.min(...ys) - 1500;
    return { x, y, w: Math.max(...xs) + 1500 - x + NODE, h: Math.max(...ys) + 1500 - y + 400 };
  }, [wf.nodes]);

  const edges = wf.connections.map(c => {
    const a = byName.get(c.from), b = byName.get(c.to);
    if (!a || !b) return null;
    const pa = outPos(a, c.fromOutput), pb = inPos(b, c.toInput);
    const count = runData[c.from]?.output?.[c.fromOutput]?.length;
    return { c, pa, pb, d: curve(pa, pb), m: mid(pa, pb), count, key: edgeKey(c) };
  }).filter(Boolean) as Array<{ c: WConnection; pa: [number, number]; pb: [number, number]; d: string; m: [number, number]; count?: number; key: string }>;

  const g = gesture.current;
  const dragLine = cursor && g?.kind === 'connect' ? (() => { const a = byName.get(g.from); return a ? curve(outPos(a, g.fromOutput), cursor) : null; })() : null;

  const showEdgeBtns = (k: string) => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setHoverEdge(k); };
  const hideEdgeBtns = () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => setHoverEdge(null), 250); };

  return (
    <div ref={box} className="relative h-full w-full touch-none select-none overflow-hidden"
      style={{ backgroundColor: '#f5f6f8', backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: `${GRID * view.k}px ${GRID * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      onPointerDown={onPointerDownBg} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onContextMenu={e => e.preventDefault()}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
        <svg className="absolute overflow-visible" style={{ left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h, pointerEvents: 'none' }}>
          <g transform={`translate(${-bounds.x} ${-bounds.y})`}>
            {edges.map(e => {
              const on = hoverEdge === e.key || selEdge === e.key;
              const hasData = e.count != null;
              return (
                <g key={e.key}>
                  <path d={e.d} fill="none" stroke={on ? '#f97316' : hasData ? '#10b981' : '#94a3b8'} strokeWidth={on ? 3 : 2} />
                  <path d={e.d} fill="none" stroke="transparent" strokeWidth={18} style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onPointerEnter={() => showEdgeBtns(e.key)} onPointerLeave={hideEdgeBtns}
                    onPointerDown={ev => { ev.stopPropagation(); setSelEdge(e.key); }} />
                  <path d={`M${e.pb[0] - 8},${e.pb[1] - 5} L${e.pb[0]},${e.pb[1]} L${e.pb[0] - 8},${e.pb[1] + 5}`} fill="none" stroke={on ? '#f97316' : hasData ? '#10b981' : '#94a3b8'} strokeWidth={2} />
                </g>
              );
            })}
            {dragLine && <path d={dragLine} fill="none" stroke="#f97316" strokeWidth={2} strokeDasharray="6 4" />}
            {/* Đường chờ ở cổng ra chưa nối */}
            {wf.nodes.flatMap(n => Array.from({ length: outputCount(n) }, (_, i) => {
              if (readOnly || wf.connections.some(c => c.from === n.name && c.fromOutput === i)) return null;
              const [x, y] = outPos(n, i);
              return <line key={`${n.id}-${i}`} x1={x + 6} y1={y} x2={x + 44} y2={y} stroke="#cbd5e1" strokeWidth={2} />;
            }))}
          </g>
        </svg>

        {/* Nhãn số item và nút trên đường nối */}
        {edges.map(e => (
          <React.Fragment key={'l' + e.key}>
            {e.count != null && hoverEdge !== e.key && selEdge !== e.key && (
              <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200" style={{ left: e.m[0], top: e.m[1] - 12 }}>
                {e.count} item
              </div>
            )}
            {!readOnly && (hoverEdge === e.key || selEdge === e.key) && (
              <div className="absolute flex -translate-x-1/2 -translate-y-1/2 gap-1" style={{ left: e.m[0], top: e.m[1] }} onPointerEnter={() => showEdgeBtns(e.key)} onPointerLeave={hideEdgeBtns} onPointerDown={ev => ev.stopPropagation()}>
                <button type="button" title="Chèn bước vào giữa" onClick={() => { setSelEdge(null); setHoverEdge(null); p.onAdd({ insert: e.c }); }} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow hover:border-brand hover:text-brand"><Plus size={14} /></button>
                <button type="button" title="Xoá đường nối" onClick={() => { setSelEdge(null); setHoverEdge(null); p.onDeleteEdge(e.c); }} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow hover:border-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>
              </div>
            )}
          </React.Fragment>
        ))}

        {wf.nodes.map(n => {
          const t = nodeTypeOf(n);
          const h = nodeHeight(n);
          const sel = selected.includes(n.id);
          const st = states[n.name];
          const run = runData[n.name];
          const total = run && !run.error ? (run.output || []).reduce((a, o) => a + (o?.length || 0), 0) : 0;
          const nIn = t?.inputs ?? 1, nOut = outputCount(n);
          const outNames = t?.outputNames?.({ ...t.defaults, ...n.parameters }) || [];
          const sub = (() => { try { return t?.subtitle?.({ ...t.defaults, ...n.parameters }) || ''; } catch { return ''; } })();
          const ring = st === 'error' || run?.error ? 'border-rose-500' : st === 'running' ? 'border-orange-400' : run ? 'border-emerald-500' : sel ? 'border-brand' : 'border-slate-300';
          return (
            <div key={n.id} data-node={n.name} className="group absolute" style={{ left: n.position[0], top: n.position[1], width: NODE, height: h }}>
              {/* Thanh công cụ nhanh khi rê chuột hoặc khi đang chọn */}
              {!readOnly && (
                <div className={`absolute -top-9 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-lg bg-white p-0.5 shadow ring-1 ring-slate-200 ${sel ? 'flex' : 'hidden group-hover:flex'}`} onPointerDown={e => e.stopPropagation()}>
                  <button type="button" title="Thực thi bước" onClick={() => p.onExecute(n.name)} className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-slate-100"><Play size={14} /></button>
                  <button type="button" title={n.disabled ? 'Bật bước' : 'Tắt bước'} onClick={() => p.onToggle(n.name)} className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-slate-100"><Power size={14} /></button>
                  <button type="button" title="Xoá bước" onClick={() => p.onDelete(n.name)} className="grid h-7 w-7 place-items-center rounded-md text-slate-600 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
                </div>
              )}
              <div
                onPointerDown={e => onPointerDownNode(e, n)}
                onDoubleClick={() => p.onOpen(n.name)}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); p.onMenu(n.name, e.clientX, e.clientY); }}
                className={`relative flex h-full w-full cursor-pointer items-center justify-center border-2 bg-white shadow-sm transition-shadow hover:shadow-md ${ring} ${sel ? 'ring-4 ring-brand/25' : ''} ${t?.trigger ? 'rounded-l-[44px] rounded-r-xl' : 'rounded-xl'} ${n.disabled ? 'opacity-50 grayscale' : ''}`}>
                <NodeIcon type={t} size={38} />
                {t?.trigger && <Zap size={14} className="absolute -left-5 top-1/2 -translate-y-1/2 fill-orange-400 text-orange-400" />}
                {n.notes && <StickyNote size={12} className="absolute left-2 top-2 text-amber-500" />}
                <div className="absolute bottom-1.5 right-1.5">
                  {st === 'running' ? <Loader2 size={15} className="animate-spin text-orange-500" />
                    : run?.error || st === 'error' ? <AlertTriangle size={15} className="text-rose-500" />
                    : run ? <span className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-600"><Check size={14} strokeWidth={3} />{total > 1 ? total : ''}</span> : null}
                </div>
              </div>
              {/* Cổng vào */}
              {Array.from({ length: nIn }, (_, i) => {
                const y = (h * (i + 1)) / (nIn + 1);
                return (
                  <div key={'i' + i} data-in={`${n.name}|${i}`} className="absolute -left-[7px] flex h-6 w-3.5 -translate-y-1/2 items-center" style={{ top: y }}>
                    <span className="h-4 w-2 rounded-sm bg-slate-400" />
                    {nIn > 1 && <span className="pointer-events-none absolute right-4 whitespace-nowrap text-[10px] text-slate-500">{t?.inputNames?.[i] || i + 1}</span>}
                  </div>
                );
              })}
              {/* Cổng ra */}
              {Array.from({ length: nOut }, (_, i) => {
                const y = (h * (i + 1)) / (nOut + 1);
                const free = !wf.connections.some(c => c.from === n.name && c.fromOutput === i);
                return (
                  <React.Fragment key={'o' + i}>
                    <div className="absolute -right-[9px] z-10 grid h-[18px] w-[18px] -translate-y-1/2 cursor-crosshair place-items-center" style={{ top: y }} onPointerDown={e => onPointerDownOut(e, n, i)}>
                      <span className="h-3 w-3 rounded-full border-2 border-white bg-slate-500 shadow" />
                    </div>
                    {outNames[i] && nOut > 1 && <span className="pointer-events-none absolute left-[calc(100%+12px)] -translate-y-full whitespace-nowrap text-[10px] font-semibold text-slate-500" style={{ top: y - 2 }}>{outNames[i]}</span>}
                    {free && !readOnly && (
                      <button type="button" title="Thêm bước tiếp theo" onPointerDown={e => e.stopPropagation()} onClick={() => p.onAdd({ from: n.name, fromOutput: i })}
                        className="absolute grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md border border-slate-300 bg-white text-slate-500 hover:border-brand hover:text-brand" style={{ left: NODE + 44, top: y }}>
                        <Plus size={14} />
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
              <div className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-[180px] -translate-x-1/2 text-center">
                <div className={`truncate text-[12px] font-semibold text-slate-800 ${n.disabled ? 'line-through' : ''}`}>{n.name}</div>
                {sub && <div className="truncate text-[11px] text-slate-500">{sub}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {band && <div className="pointer-events-none fixed border border-brand bg-brand/10" style={{ left: Math.min(band.x1, band.x2), top: Math.min(band.y1, band.y2), width: Math.abs(band.x2 - band.x1), height: Math.abs(band.y2 - band.y1) }} />}

      {!wf.nodes.length && !readOnly && (
        <div className="absolute inset-0 flex items-center justify-center" onPointerDown={e => e.stopPropagation()}>
          <button type="button" onClick={() => p.onAdd({})} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 px-10 py-8 text-slate-500 hover:border-brand hover:text-brand">
            <Plus size={32} />
            <span className="text-[14px] font-semibold">Thêm bước đầu tiên</span>
          </button>
        </div>
      )}
    </div>
  );
});

export default Canvas;
