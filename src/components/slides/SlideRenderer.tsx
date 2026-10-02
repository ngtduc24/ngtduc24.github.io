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

export function ElementView({ el, editingText }: { el: SlideEl; editingText?: boolean }) {
  useEffect(() => { if (el.type === 'text') ensureFont(el.fontFamily); }, [el.type, el.fontFamily]);
  const base: React.CSSProperties = {
    position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
    transform: el.rot ? `rotate(${el.rot}deg)` : undefined, opacity: el.opacity ?? 1,
  };
  if (el.type === 'text') {
    const lines = (el.text || '').split('\n');
    return (
      <div style={{
        ...base, height: 'auto', minHeight: el.h, fontFamily: `'${el.fontFamily || 'Inter'}', sans-serif`, fontSize: el.fontSize || 32,
        color: el.color || '#1e293b', fontWeight: el.bold ? 700 : 400, fontStyle: el.italic ? 'italic' : 'normal',
        textDecoration: el.underline ? 'underline' : 'none', textAlign: el.align || 'left', lineHeight: el.lineHeight || 1.3,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: el.bg || 'transparent', visibility: editingText ? 'hidden' : 'visible',
        padding: el.bg ? '0.2em 0.4em' : 0, borderRadius: el.bg ? 12 : 0,
      }}>
        {el.list
          ? <ul style={{ margin: 0, paddingLeft: '1.2em', listStyle: 'disc' }}>{lines.map((l, i) => <li key={i}>{l || ' '}</li>)}</ul>
          : (el.text || ' ')}
      </div>
    );
  }
  if (el.type === 'image') {
    return (
      <div style={{ ...base, overflow: 'hidden', borderRadius: el.radius || 0, background: el.src ? 'transparent' : '#e2e8f0' }}>
        {el.src && <img src={el.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: el.fit || 'cover', display: 'block', pointerEvents: 'none' }} />}
      </div>
    );
  }
  // Hình khối
  const fill = el.fill ?? '#6366f1';
  const stroke = el.stroke || 'transparent';
  const sw = el.strokeWidth || 0;
  const k = el.shape || 'rect';
  if (k === 'rect' || k === 'round' || k === 'ellipse') {
    return <div style={{ ...base, background: fill, border: sw ? `${sw}px solid ${stroke}` : undefined, borderRadius: k === 'ellipse' ? '50%' : k === 'round' ? Math.min(el.w, el.h) * 0.18 : 0, boxSizing: 'border-box' }} />;
  }
  if (k === 'line' || k === 'arrow') {
    const t = Math.max(2, sw || 6);
    return (
      <svg style={{ ...base, overflow: 'visible' }} viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
        <line x1={0} y1={el.h / 2} x2={k === 'arrow' ? el.w - t * 2 : el.w} y2={el.h / 2} stroke={el.stroke || fill} strokeWidth={t} strokeLinecap="round" />
        {k === 'arrow' && <path d={`M ${el.w - t * 3.5} ${el.h / 2 - t * 2} L ${el.w} ${el.h / 2} L ${el.w - t * 3.5} ${el.h / 2 + t * 2} Z`} fill={el.stroke || fill} />}
      </svg>
    );
  }
  return (
    <svg style={base} viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none">
      <path d={shapePath(k, el.w, el.h)} fill={fill} stroke={sw ? stroke : 'none'} strokeWidth={sw} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Trang thu phóng theo chiều rộng width (px).
export default function SlideRenderer({ slide, width, className, children, editingId }: { slide?: Slide; width: number; className?: string; children?: React.ReactNode; editingId?: string | null }) {
  const scale = width / SLIDE_W;
  return (
    <div className={className} style={{ width, height: SLIDE_H * scale, position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', left: 0, top: 0, ...(slide ? bgStyle(slide.bg) : { background: '#fff' }) }}>
        {slide?.els.map(el => <ElementView key={el.id} el={el} editingText={editingId === el.id} />)}
        {children}
      </div>
    </div>
  );
}
