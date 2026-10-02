// Xuất bài giảng ra tệp PowerPoint (.pptx) để mở, sửa tiếp bằng PowerPoint, Google Slides, Keynote.
// Chữ (cả màu, cỡ từng đoạn), hình, ảnh, video, âm thanh, nền, ghi chú người trình bày giữ được, hiệu ứng chuyển động không chuyển sang được.
import type { Deck, SlideEl, Slide, TextRun } from './slides';
import { richOf } from './slides';

const trimLead = (runs: TextRun[]) => { const out: TextRun[] = []; let lead = true; for (const r of runs) { if (lead) { const t = r.t.replace(/^\s+/, ''); if (!t) continue; lead = false; out.push({ ...r, t }); } else out.push(r); } return out; };

const IN = (px: number) => px / 96;              // 1280 px = 13,333 inch (khổ rộng 16:9)
const PT = (px: number) => Math.max(1, Math.round(px * 0.75 * 10) / 10);
const hex = (c?: string | null) => {
  if (!c || c === 'transparent') return undefined;
  if (c.startsWith('#')) return c.slice(1, 7).toUpperCase().padEnd(6, '0');
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [m[1], m[2], m[3]].map(v => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase() : undefined;
};
const firstGradColor = (g?: string) => (g?.match(/#[0-9a-f]{6}/i) || [])[0];

// Đường SVG (M L C Q A Z) đổi sang điểm của pptxgenjs, toạ độ inch trong khung hình.
function svgToPoints(d: string, sx: number, sy: number) {
  const pts: any[] = [];
  const tok = d.match(/[MLCQAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  let i = 0; let cmd = '';
  const n = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/[MLCQAZ]/i.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'M') pts.push({ x: IN(n() * sx), y: IN(n() * sy), moveTo: true });
    else if (cmd === 'L') pts.push({ x: IN(n() * sx), y: IN(n() * sy) });
    else if (cmd === 'C') { const x1 = IN(n() * sx), y1 = IN(n() * sy), x2 = IN(n() * sx), y2 = IN(n() * sy); pts.push({ x: IN(n() * sx), y: IN(n() * sy), curve: { type: 'cubic', x1, y1, x2, y2 } }); }
    else if (cmd === 'Q') { const x1 = IN(n() * sx), y1 = IN(n() * sy); pts.push({ x: IN(n() * sx), y: IN(n() * sy), curve: { type: 'quadratic', x1, y1 } }); }
    else if (cmd === 'A') { n(); n(); n(); n(); n(); pts.push({ x: IN(n() * sx), y: IN(n() * sy) }); }
    else if (cmd === 'Z') { pts.push({ close: true }); cmd = ''; }
    else i++;
  }
  return pts;
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = () => res(null); fr.readAsDataURL(b); });
  } catch { return null; }
}

export async function exportPptx(deck: Deck, onProgress?: (done: number, total: number) => void): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = deck.title;
  pres.author = deck.ownerName || 'EduGo';
  const ST = (pres as any).ShapeType || (PptxGenJS as any).ShapeType;
  const shapeMap: Record<string, string> = { rect: 'rect', round: 'roundRect', ellipse: 'ellipse', triangle: 'triangle', diamond: 'diamond', star: 'star5', pentagon: 'pentagon', hexagon: 'hexagon' };
  let done = 0;
  for (const s of deck.slides) {
    const slide = pres.addSlide();
    await addBg(slide, s);
    for (const el of s.els) await addEl(pres, slide, el, ST, shapeMap);
    if (s.notes) slide.addNotes(s.notes);
    onProgress?.(++done, deck.slides.length);
  }
  await pres.writeFile({ fileName: `${(deck.title || 'Bai giang').replace(/[\\/:*?"<>|]/g, ' ').trim()}.pptx` });
}

async function addBg(slide: any, s: Slide) {
  if (s.bg?.image) { const data = await toDataUrl(s.bg.image); if (data) { slide.background = { data }; return; } }
  const c = hex(s.bg?.color) || hex(firstGradColor(s.bg?.gradient)) || 'FFFFFF';
  slide.background = { color: c };
}

async function addEl(pres: any, slide: any, el: SlideEl, ST: any, shapeMap: Record<string, string>) {
  const box = { x: IN(el.x), y: IN(el.y), w: IN(el.w), h: IN(el.h), rotate: el.rot || 0 };
  const transparency = el.opacity != null && el.opacity < 1 ? Math.round((1 - el.opacity) * 100) : undefined;
  if (el.type === 'text') {
    const lines = (el.text || '').split('\n');
    const base = {
      fontFace: el.fontFamily || 'Arial', fontSize: PT(el.fontSize || 32), color: hex(el.color) || '1E293B', bold: !!el.bold, italic: !!el.italic,
      underline: el.underline ? { style: 'sng' } : undefined, strike: el.strike ? 'sngStrike' : undefined, charSpacing: el.letterSpacing ? PT((el.fontSize || 32) * el.letterSpacing / 1000) : undefined,
    };
    const rich = richOf(el);
    const runs: any[] = [];
    lines.forEach((l, i) => {
      const lvl = Math.floor((l.match(/^\s*/)?.[0].length || 0) / 3);
      const ln = rich?.[i];
      const para = { breakLine: false, bullet: el.list && l.trim() && ln?.bullet !== false ? (lvl ? { indent: 18 } : true) : false, indentLevel: el.list ? lvl : 0, align: ln?.align, paraSpaceBefore: ln?.before ? PT(ln.before) : undefined };
      const parts: TextRun[] = ln ? trimLead(ln.runs) : [{ t: l.trim() }];
      if (!parts.length) parts.push({ t: ' ' });
      parts.forEach((r, k) => {
        const up = r.upper ?? el.upper;
        runs.push({ text: (up ? r.t.toUpperCase() : r.t) || ' ', options: {
          ...base, ...(k === 0 ? para : {}),
          ...(r.color ? { color: hex(r.color) } : {}), ...(r.bold !== undefined ? { bold: r.bold } : {}), ...(r.italic !== undefined ? { italic: r.italic } : {}),
          ...(r.underline !== undefined ? { underline: r.underline ? { style: 'sng' } : undefined } : {}), ...(r.strike !== undefined ? { strike: r.strike ? 'sngStrike' : undefined } : {}),
          ...(r.size ? { fontSize: PT(r.size) } : {}), ...(r.font ? { fontFace: r.font } : {}),
          breakLine: k === parts.length - 1 && i < lines.length - 1,
        } });
      });
    });
    slide.addText(runs, {
      ...box, h: Math.max(box.h, IN((el.fontSize || 32) * (el.lineHeight || 1.3) * lines.length)), align: el.align || 'left', valign: 'top', margin: 0,
      lineSpacingMultiple: el.lineHeight || 1.2, fill: el.bg ? { color: hex(el.bg) } : undefined, transparency,
    });
    return;
  }
  if (el.type === 'video') {
    if (!el.video) return;
    if (/youtu/.test(el.video)) { const id = (el.video.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{6,})/) || [])[1]; if (id) slide.addMedia({ type: 'online', link: `https://www.youtube.com/embed/${id}`, ...box }); return; }
    const data = await toDataUrl(el.video);
    if (!data) return;
    const ext = (el.video.split('?')[0].split('.').pop() || (el.audio ? 'mp3' : 'mp4')).toLowerCase();
    const cover = el.src ? await toDataUrl(el.src) : null;
    slide.addMedia({ type: el.audio ? 'audio' : 'video', data, extn: ext, ...box, ...(cover ? { cover } : {}) });
    return;
  }
  if (el.type === 'image') {
    if (!el.src) return;
    const data = await toDataUrl(el.src);
    if (!data) return;
    slide.addImage({ data, ...box, flipH: !!el.flipX, flipV: !!el.flipY, rounding: (el.radius || 0) >= 999, transparency, sizing: el.fit === 'contain' ? { type: 'contain', w: box.w, h: box.h } : { type: 'cover', w: box.w, h: box.h } });
    return;
  }
  // Hình khối
  const fill = el.fill && el.fill !== 'transparent' ? { color: hex(el.fill), transparency } : undefined;
  const line = el.strokeWidth && el.stroke ? { color: hex(el.stroke), width: PT(el.strokeWidth) } : undefined;
  if (el.shape === 'line' || el.shape === 'arrow') {
    slide.addShape(ST.line, { x: box.x, y: box.y + box.h / 2, w: box.w, h: 0, rotate: box.rotate, line: { color: hex(el.stroke || el.fill) || '6366F1', width: PT(el.strokeWidth || 6), endArrowType: el.shape === 'arrow' ? 'triangle' : undefined } });
    return;
  }
  if (el.shape === 'path' && el.path) {
    const sx = el.w / (el.pathW || el.w), sy = el.h / (el.pathH || el.h);
    slide.addShape(ST.custGeom, { ...box, flipH: !!el.flipX, flipV: !!el.flipY, fill, line, points: svgToPoints(el.path, sx, sy) });
    return;
  }
  slide.addShape(ST[shapeMap[el.shape || 'rect'] || 'rect'], { ...box, fill, line, rectRadius: el.shape === 'round' ? 0.18 : undefined });
}
