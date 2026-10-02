import React, { useEffect } from 'react';
import { Slide, SlideEl, SLIDE_W, SLIDE_H } from '../../lib/slides';
import { FONT_OPTIONS } from '../../lib/fonts';

// Vẽ một trang trình chiếu ở khung 1280x720 rồi thu phóng theo chiều rộng cần hiện.
// Dùng chung cho khung soạn, ảnh thu nhỏ, chế độ trình chiếu và trang xem công khai.

const loaded = new Set<string>();
export function ensureFont(family?: string) {
  if (!family || loaded.has(family)) return;
  const opt = FONT_OPTIONS.find(f => f.family === family);
  if (!opt) return;
  loaded.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = opt.url;
  document.head.appendChild(link);
}

// Khung hình chuyển động (hiệu ứng xuất hiện, chuyển động lặp, chuyển trang), nạp 1 lần.
let cssDone = false;
export function ensureAnimCss() {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  const st = document.createElement('style');
  st.textContent = `
@keyframes sa-fade{from{opacity:0}to{opacity:1}}
@keyframes sa-rise{from{opacity:0;transform:translateY(40px) scale(.96)}to{opacity:1;transform:none}}
@keyframes sa-up{from{opacity:0;transform:translateY(90px)}to{opacity:1;transform:none}}
@keyframes sa-down{from{opacity:0;transform:translateY(-90px)}to{opacity:1;transform:none}}
@keyframes sa-left{from{opacity:0;transform:translateX(140px)}to{opacity:1;transform:none}}
@keyframes sa-right{from{opacity:0;transform:translateX(-140px)}to{opacity:1;transform:none}}
@keyframes sa-zoom{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:none}}
@keyframes sa-pop{0%{opacity:0;transform:scale(.3)}65%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:none}}
@keyframes sa-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes sa-blur{from{opacity:0;filter:blur(24px)}to{opacity:1;filter:blur(0)}}
@keyframes sa-spin{from{opacity:0;transform:rotate(-200deg) scale(.4)}to{opacity:1;transform:none}}
@keyframes sa-bounce{0%{opacity:0;transform:translateY(-160px)}55%{opacity:1;transform:translateY(14px)}75%{transform:translateY(-8px)}100%{opacity:1;transform:none}}
@keyframes sa-drop{0%{opacity:0;transform:translateY(-60px) rotate(-6deg)}100%{opacity:1;transform:none}}
@keyframes sl-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes sl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes sl-spin{to{transform:rotate(360deg)}}
@keyframes sl-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}
@keyframes sl-blink{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes sl-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
@keyframes sl-swing{0%,100%{transform:rotate(0)}50%{transform:rotate(8deg)}}
@keyframes st-fade-in{from{opacity:0}to{opacity:1}}
@keyframes st-dissolve-in{from{opacity:0;filter:blur(18px)}to{opacity:1;filter:blur(0)}}
@keyframes st-slide-in{from{transform:translateX(100%)}to{transform:none}}
@keyframes st-push-in{from{transform:translateX(100%)}to{transform:none}}
@keyframes st-push-out{from{transform:none}to{transform:translateX(-100%)}}
@keyframes st-cover-in{from{transform:translateY(100%)}to{transform:none}}
@keyframes st-zoom-in{from{opacity:0;transform:scale(1.25)}to{opacity:1;transform:none}}
@keyframes st-flip-in{from{transform:perspective(1600px) rotateY(-90deg);opacity:.2}to{transform:none;opacity:1}}
@keyframes st-wipe-in{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
`;
  document.head.appendChild(st);
}

export function bgStyle(bg: Slide['bg']): React.CSSProperties {
  if (bg?.image) return { backgroundImage: `url(${bg.image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: bg.color || '#fff' };
  if (bg?.gradient) return { background: bg.gradient };
  return { background: bg?.color || '#ffffff' };
}

function shapePath(kind: string, w: number, h: number): string {
  switch (kind) {
    case 'triangle': return `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z`;
    case 'diamond': return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
    case 'pentagon': {
      const pts = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return `${w / 2 + (w / 2) * Math.cos(a)} ${h / 2 + (h / 2) * Math.sin(a)}`; });
      return `M ${pts.join(' L ')} Z`;
    }
    case 'hexagon': return `M ${w * 0.25} 0 L ${w * 0.75} 0 L ${w} ${h / 2} L ${w * 0.75} ${h} L ${w * 0.25} ${h} L 0 ${h / 2} Z`;
    case 'star': {
      const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 0.4 : 1; return `${w / 2 + (w / 2) * r * Math.cos(a)} ${h / 2 + (h / 2) * r * Math.sin(a)}`; });
      return `M ${pts.join(' L ')} Z`;
    }
    default: return '';
  }
}

// Hiệu ứng cho chữ: bóng đổ, nâng lên, rỗng ruột, viền, phát sáng, neon, tiếng vọng, cắt ghép.
function textEffect(el: SlideEl): React.CSSProperties {
  const c = el.effectColor || '#0f172a';
  const k = (el.effectSize ?? 50) / 50; // 1 là mức chuẩn
  const fs = el.fontSize || 32;
  switch (el.effect) {
    case 'shadow': return { textShadow: `${4 * k}px ${4 * k}px ${8 * k}px ${c}66` };
    case 'lift': return { textShadow: `0 ${6 * k}px ${18 * k}px rgba(0,0,0,.35)` };
    case 'hollow': return { color: 'transparent', WebkitTextStroke: `${Math.max(1, fs * 0.03 * k)}px ${el.color || c}` } as any;
    case 'outline': return { WebkitTextStroke: `${Math.max(1, fs * 0.04 * k)}px ${c}`, paintOrder: 'stroke fill' } as any;
    case 'glow': return { textShadow: `0 0 ${10 * k}px ${c}, 0 0 ${24 * k}px ${c}aa` };
    case 'neon': return { color: '#fff', textShadow: `0 0 ${4 * k}px #fff, 0 0 ${10 * k}px ${c}, 0 0 ${22 * k}px ${c}, 0 0 ${40 * k}px ${c}` };
    case 'echo': return { textShadow: `${6 * k}px ${6 * k}px 0 ${c}55, ${12 * k}px ${12 * k}px 0 ${c}33, ${18 * k}px ${18 * k}px 0 ${c}1a` };
    case 'splice': return { color: 'transparent', WebkitTextStroke: `${Math.max(1, fs * 0.025)}px ${el.color || '#0f172a'}`, textShadow: `${5 * k}px ${5 * k}px 0 ${c}` } as any;
    default: return {};
  }
}
// Hiệu ứng cho ảnh và hình khối (chỉ bóng, nâng, phát sáng có nghĩa).
function boxEffect(el: SlideEl): string | undefined {
  const c = el.effectColor || '#0f172a';
  const k = (el.effectSize ?? 50) / 50;
  switch (el.effect) {
    case 'shadow': return `drop-shadow(${6 * k}px ${6 * k}px ${8 * k}px ${c}77)`;
    case 'lift': return `drop-shadow(0 ${10 * k}px ${22 * k}px rgba(0,0,0,.35))`;
    case 'glow': case 'neon': return `drop-shadow(0 0 ${12 * k}px ${c})`;
    case 'echo': return `drop-shadow(${10 * k}px ${10 * k}px 0 ${c}44)`;
    default: return undefined;
  }
}
function imgFilter(el: SlideEl): string | undefined {
  const f = el.filter;
  if (!f) return undefined;
  const parts: string[] = [];
  if (f.brightness != null && f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast != null && f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturate != null && f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
  if (f.grayscale) parts.push(`grayscale(${f.grayscale}%)`);
  if (f.sepia) parts.push(`sepia(${f.sepia}%)`);
  if (f.hue) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.blur) parts.push(`blur(${f.blur}px)`);
  return parts.length ? parts.join(' ') : undefined;
}

// phase: static (không chạy hiệu ứng), hidden (chưa xuất hiện), play (chạy hiệu ứng xuất hiện).
// loops: cho chạy chuyển động lặp (khi trình chiếu, xem trước).
export type ElPhase = 'static' | 'hidden' | 'play';

export function ElementView({ el, editingText, phase = 'static', loops = false, playKey }: { el: SlideEl; editingText?: boolean; phase?: ElPhase; loops?: boolean; playKey?: number | string }) {
  useEffect(() => { if (el.type === 'text') ensureFont(el.fontFamily); }, [el.type, el.fontFamily]);
  useEffect(() => { if (phase !== 'static' || loops) ensureAnimCss(); }, [phase, loops]);
  const anim = el.anim || {};
  const inK = anim.in && anim.in !== 'none' ? anim.in : null;
  const dur = anim.dur ?? 0.7;
  const delay = anim.delay ?? 0;
  const outer: React.CSSProperties = {
    position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.type === 'text' ? 'auto' : el.h, minHeight: el.type === 'text' ? el.h : undefined,
    transform: el.rot ? `rotate(${el.rot}deg)` : undefined, opacity: el.opacity ?? 1,
    visibility: phase === 'hidden' ? 'hidden' : undefined,
  };
  const enter: React.CSSProperties = phase === 'play' && inK ? { animation: `sa-${inK} ${dur}s cubic-bezier(.2,.7,.2,1) ${delay}s both` } : {};
  const loopK = loops && anim.loop && anim.loop !== 'none' ? anim.loop : null;
  const loop: React.CSSProperties = loopK ? { animation: `sl-${loopK} ${anim.loopDur ?? (loopK === 'spin' ? 6 : 2)}s ${loopK === 'spin' ? 'linear' : 'ease-in-out'} ${phase === 'play' && inK ? delay + dur : 0}s infinite` } : {};
  const fill: React.CSSProperties = { width: '100%', height: el.type === 'text' ? 'auto' : '100%', minHeight: el.type === 'text' ? el.h : undefined };

  let body: React.ReactNode;
  if (el.type === 'text') {
    const lines = (el.text || '').split('\n');
    const deco = [el.underline ? 'underline' : '', el.strike ? 'line-through' : ''].filter(Boolean).join(' ') || 'none';
    body = (
      <div style={{
        ...fill, fontFamily: `'${el.fontFamily || 'Inter'}', sans-serif`, fontSize: el.fontSize || 32,
        color: el.color || '#1e293b', fontWeight: el.bold ? 700 : 400, fontStyle: el.italic ? 'italic' : 'normal',
        textDecoration: deco, textAlign: el.align || 'left', lineHeight: el.lineHeight || 1.3, letterSpacing: el.letterSpacing ? `${el.letterSpacing / 1000}em` : undefined,
        textTransform: el.upper ? 'uppercase' : undefined, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: el.bg || 'transparent',
        visibility: editingText ? 'hidden' : 'visible', padding: el.bg ? '0.2em 0.4em' : 0, borderRadius: el.bg ? 12 : 0, ...textEffect(el),
      }}>
        {el.list
          ? <ul style={{ margin: 0, paddingLeft: '1.2em', listStyle: 'disc' }}>{lines.map((l, i) => <li key={i}>{l || ' '}</li>)}</ul>
          : (el.text || ' ')}
      </div>
    );
  } else if (el.type === 'image') {
    const flip = el.flipX || el.flipY ? `scale(${el.flipX ? -1 : 1},${el.flipY ? -1 : 1})` : undefined;
    body = (
      <div style={{ ...fill, overflow: 'hidden', borderRadius: el.radius || 0, background: el.src ? 'transparent' : '#e2e8f0', filter: boxEffect(el) }}>
        {el.src && <img src={el.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: el.fit || 'cover', display: 'block', pointerEvents: 'none', transform: flip, filter: imgFilter(el), borderRadius: el.radius || 0 }} />}
      </div>
    );
  } else {
    const fillC = el.fill ?? '#6366f1';
    const stroke = el.stroke || 'transparent';
    const sw = el.strokeWidth || 0;
    const k = el.shape || 'rect';
    const fx = boxEffect(el);
    if (k === 'rect' || k === 'round' || k === 'ellipse') {
      body = <div style={{ ...fill, background: fillC, border: sw ? `${sw}px solid ${stroke}` : undefined, borderRadius: k === 'ellipse' ? '50%' : k === 'round' ? Math.min(el.w, el.h) * 0.18 : 0, boxSizing: 'border-box', filter: fx }} />;
    } else if (k === 'line' || k === 'arrow') {
      const t = Math.max(2, sw || 6);
      body = (
        <svg style={{ ...fill, overflow: 'visible', display: 'block', filter: fx }} viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
          <line x1={0} y1={el.h / 2} x2={k === 'arrow' ? el.w - t * 2 : el.w} y2={el.h / 2} stroke={el.stroke || fillC} strokeWidth={t} strokeLinecap="round" />
          {k === 'arrow' && <path d={`M ${el.w - t * 3.5} ${el.h / 2 - t * 2} L ${el.w} ${el.h / 2} L ${el.w - t * 3.5} ${el.h / 2 + t * 2} Z`} fill={el.stroke || fillC} />}
        </svg>
      );
    } else {
      body = (
        <svg style={{ ...fill, display: 'block', overflow: 'visible', filter: fx }} viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
          <path d={shapePath(k, el.w, el.h)} fill={fillC} stroke={sw ? stroke : 'none'} strokeWidth={sw} vectorEffect="non-scaling-stroke" />
        </svg>
      );
    }
  }
  return (
    <div style={outer}>
      <div key={playKey} style={{ ...fill, ...enter }}>
        <div style={{ ...fill, ...loop, transformOrigin: 'center' }}>{body}</div>
      </div>
    </div>
  );
}

// Trang thu phóng theo chiều rộng width (px).
// phases: trạng thái hiệu ứng từng khối (khi trình chiếu), loops: chạy chuyển động lặp.
export default function SlideRenderer({ slide, width, className, children, editingId, phases, loops, playKey, style }: {
  slide?: Slide; width: number; className?: string; children?: React.ReactNode; editingId?: string | null;
  phases?: Record<string, ElPhase>; loops?: boolean; playKey?: number | string; style?: React.CSSProperties;
}) {
  const scale = width / SLIDE_W;
  return (
    <div className={className} style={{ width, height: SLIDE_H * scale, position: 'relative', overflow: 'hidden', ...style }}>
      <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', left: 0, top: 0, ...(slide ? bgStyle(slide.bg) : { background: '#fff' }) }}>
        {slide?.els.map(el => <ElementView key={el.id} el={el} editingText={editingId === el.id} phase={phases?.[el.id] || 'static'} loops={loops} playKey={phases?.[el.id] === 'play' ? playKey : undefined} />)}
        {children}
      </div>
    </div>
  );
}
