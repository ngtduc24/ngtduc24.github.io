// Đọc tệp PowerPoint (.pptx) ngay trên trình duyệt và đổi thành bài giảng sửa được trong ứng dụng Bài giảng.
// Mỗi trang PowerPoint thành 1 trang, chữ thành khối chữ, hình thành khối hình, ảnh được tải lên kho của người dùng,
// bảng thành các ô chữ có viền, ghi chú người trình bày giữ nguyên. Biểu đồ, SmartArt, video chưa đọc được thì bỏ qua và báo lại.
import type { Slide, SlideEl, SlideBg, ShapeKind } from './slides';
import { SLIDE_W, SLIDE_H, uid } from './slides';

type El = Element;
const EMU_PER_PT = 12700;

// ===== Duyệt XML theo tên thẻ không kèm tiền tố =====
const kids = (e: El | null | undefined, name?: string): El[] => {
  if (!e) return [];
  const out: El[] = [];
  for (let n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!name || (n as El).localName === name)) out.push(n as El);
  return out;
};
const kid = (e: El | null | undefined, name: string): El | null => kids(e, name)[0] || null;
const path = (e: El | null | undefined, ...names: string[]): El | null => { let cur: El | null | undefined = e; for (const n of names) { cur = kid(cur, n); if (!cur) return null; } return cur || null; };
const findAll = (e: El | null | undefined, name: string, out: El[] = []): El[] => { if (!e) return out; for (const c of kids(e)) { if (c.localName === name) out.push(c); findAll(c, name, out); } return out; };
const find = (e: El | null | undefined, name: string): El | null => findAll(e, name)[0] || null;
const attr = (e: El | null | undefined, name: string): string | null => {
  if (!e) return null;
  if (e.hasAttribute(name)) return e.getAttribute(name);
  for (let i = 0; i < e.attributes.length; i++) { const a = e.attributes[i]; if (a.localName === name) return a.value; }
  return null;
};
const num = (v: string | null, d = 0) => (v == null || v === '' ? d : Number(v));

// ===== Màu =====
type Theme = { colors: Record<string, string>; major: string; minor: string };
function hexToRgb(h: string) { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r: number, g: number, b: number) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number) {
  if (!s) return [l * 255, l * 255, l * 255];
  const f = (p: number, q: number, t: number) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}
// Đọc 1 thẻ màu (srgbClr, schemeClr, sysClr, prstClr) kèm các phép chỉnh sáng tối.
function colorOf(c: El | null, theme: Theme): string | null {
  if (!c) return null;
  let hex: string | null = null;
  const v = attr(c, 'val');
  if (c.localName === 'srgbClr') hex = '#' + (v || '000000');
  else if (c.localName === 'sysClr') hex = '#' + (attr(c, 'lastClr') || (v === 'window' ? 'FFFFFF' : '000000'));
  else if (c.localName === 'schemeClr') {
    const map: Record<string, string> = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' };
    hex = theme.colors[map[v || ''] || v || ''] || null;
  } else if (c.localName === 'prstClr') {
    const p: Record<string, string> = { black: '#000000', white: '#ffffff', red: '#ff0000', blue: '#0000ff', green: '#008000', yellow: '#ffff00', gray: '#808080' };
    hex = p[v || ''] || '#000000';
  }
  if (!hex) return null;
  let [r, g, b] = hexToRgb(hex);
  for (const m of kids(c)) {
    const val = num(attr(m, 'val')) / 100000;
    if (m.localName === 'lumMod' || m.localName === 'lumOff') {
      const [h, s, l] = rgbToHsl(r, g, b);
      const nl = m.localName === 'lumMod' ? l * val : l + val;
      [r, g, b] = hslToRgb(h, s, Math.max(0, Math.min(1, nl)));
    } else if (m.localName === 'tint') { r = r + (255 - r) * (1 - val); g = g + (255 - g) * (1 - val); b = b + (255 - b) * (1 - val); }
    else if (m.localName === 'shade') { r *= val; g *= val; b *= val; }
  }
  const alpha = kids(c).find(m => m.localName === 'alpha');
  const out = rgbToHex(r, g, b);
  if (alpha) { const a = num(attr(alpha, 'val'), 100000) / 100000; if (a < 0.999) return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(2)})`; }
  return out;
}
const firstColor = (parent: El | null, theme: Theme) => colorOf(kids(parent).find(k => /Clr$/.test(k.localName)) || null, theme);
// Màu tô: màu đơn, dải màu (lấy CSS gradient cho nền, màu đầu cho hình), không tô.
function fillOf(spPr: El | null, theme: Theme): { color?: string; gradient?: string; none?: boolean; blip?: El } | null {
  if (!spPr) return null;
  if (kid(spPr, 'noFill')) return { none: true };
  const sf = kid(spPr, 'solidFill'); if (sf) return { color: firstColor(sf, theme) || undefined };
  const gf = kid(spPr, 'gradFill');
  if (gf) {
    const stops = kids(path(gf, 'gsLst')).map(gs => ({ pos: num(attr(gs, 'pos')) / 1000, c: firstColor(gs, theme) || '#ffffff' }));
    if (stops.length) {
      const ang = num(attr(kid(gf, 'lin'), 'ang')) / 60000;
      return { color: stops[0].c, gradient: `linear-gradient(${Math.round(ang + 90)}deg, ${stops.map(s => `${s.c} ${s.pos}%`).join(', ')})` };
    }
  }
  const bf = kid(spPr, 'blipFill'); if (bf) return { blip: bf };
  return null;
}

// ===== Tệp trong gói pptx =====
type Zip = { file: (p: string) => { async: (t: 'string' | 'blob' | 'uint8array') => Promise<any> } | null };
const normPath = (base: string, target: string) => {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/'); parts.pop();
  for (const seg of target.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
  return parts.join('/');
};
async function readXml(zip: Zip, p: string, parse: (s: string) => Document): Promise<El | null> {
  const f = zip.file(p); if (!f) return null;
  return parse(await f.async('string')).documentElement;
}
async function readRels(zip: Zip, p: string, parse: (s: string) => Document): Promise<Record<string, { target: string; type: string }>> {
  const i = p.lastIndexOf('/');
  const relPath = `${p.slice(0, i)}/_rels/${p.slice(i + 1)}.rels`;
  const root = await readXml(zip, relPath, parse);
  const out: Record<string, { target: string; type: string }> = {};
  for (const r of kids(root, 'Relationship')) {
    const mode = attr(r, 'TargetMode');
    out[attr(r, 'Id') || ''] = { target: mode === 'External' ? (attr(r, 'Target') || '') : normPath(p, attr(r, 'Target') || ''), type: attr(r, 'Type') || '' };
  }
  return out;
}

// ===== Kiểu chữ mặc định theo khuôn trang (placeholder) =====
type PhKey = { type: string; idx: string };
const phOf = (sp: El): PhKey | null => {
  const ph = find(kid(sp, 'nvSpPr') || kid(sp, 'nvPicPr') || sp, 'ph');
  if (!ph) return null;
  return { type: attr(ph, 'type') || 'body', idx: attr(ph, 'idx') || '' };
};
const sameKind = (t: string) => (t === 'ctrTitle' ? 'title' : t === 'subTitle' || t === 'obj' ? 'body' : t);
function findPh(tree: El | null, key: PhKey): El | null {
  const sps = findAll(tree, 'sp');
  return sps.find(s => { const k = phOf(s); return k && key.idx && k.idx === key.idx; })
    || sps.find(s => { const k = phOf(s); return k && sameKind(k.type) === sameKind(key.type); }) || null;
}

interface Ctx {
  theme: Theme; scale: number; ox: number; oy: number;
  layout: El | null; master: El | null;
  rels: Record<string, { target: string; type: string }>;
  zip: Zip; upload: (blob: Blob, name: string) => Promise<string | null>;
  skipped: { [k: string]: number };
  mediaCache: Map<string, Promise<string | null>>;
  pending: Promise<void>[];
}
type Xf = { x: number; y: number; w: number; h: number; rot: number; flipH: boolean; flipV: boolean };
const xfrmOf = (spPr: El | null): Xf | null => {
  const x = kid(spPr, 'xfrm'); if (!x) return null;
  const off = kid(x, 'off'), ext = kid(x, 'ext');
  if (!off || !ext) return null;
  return { x: num(attr(off, 'x')), y: num(attr(off, 'y')), w: num(attr(ext, 'cx')), h: num(attr(ext, 'cy')), rot: num(attr(x, 'rot')) / 60000, flipH: attr(x, 'flipH') === '1', flipV: attr(x, 'flipV') === '1' };
};
// Hình vẽ tự do (custGeom) đổi sang đường SVG trong khung w x h (đơn vị điểm ảnh của bài giảng).
function custPath(spPr: El | null, w: number, h: number): string | null {
  const cg = kid(spPr, 'custGeom'); if (!cg) return null;
  const parts: string[] = [];
  for (const pe of kids(kid(cg, 'pathLst'), 'path')) {
    const pw = num(attr(pe, 'w')) || 1, phh = num(attr(pe, 'h')) || 1;
    const sx = w / pw, sy = h / phh;
    let cx = 0, cy = 0;
    const pt = (e: El | null) => { const x = num(attr(e, 'x')) * sx, y = num(attr(e, 'y')) * sy; return [x, y]; };
    for (const c of kids(pe)) {
      const pts = kids(c, 'pt');
      if (c.localName === 'moveTo') { [cx, cy] = pt(pts[0]); parts.push(`M${cx.toFixed(1)} ${cy.toFixed(1)}`); }
      else if (c.localName === 'lnTo') { [cx, cy] = pt(pts[0]); parts.push(`L${cx.toFixed(1)} ${cy.toFixed(1)}`); }
      else if (c.localName === 'cubicBezTo' && pts.length === 3) { const a = pts.map(pt); [cx, cy] = a[2]; parts.push(`C${a.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' ')}`); }
      else if (c.localName === 'quadBezTo' && pts.length === 2) { const a = pts.map(pt); [cx, cy] = a[1]; parts.push(`Q${a.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' ')}`); }
      else if (c.localName === 'arcTo') {
        const wR = num(attr(c, 'wR')) * sx, hR = num(attr(c, 'hR')) * sy;
        const st = num(attr(c, 'stAng')) / 60000 * Math.PI / 180, sw = num(attr(c, 'swAng')) / 60000 * Math.PI / 180;
        if (!wR || !hR) continue;
        const ox = cx - wR * Math.cos(st), oy = cy - hR * Math.sin(st);
        const ex = ox + wR * Math.cos(st + sw), ey = oy + hR * Math.sin(st + sw);
        parts.push(`A${wR.toFixed(1)} ${hR.toFixed(1)} 0 ${Math.abs(sw) > Math.PI ? 1 : 0} ${sw > 0 ? 1 : 0} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
        cx = ex; cy = ey;
      } else if (c.localName === 'close') parts.push('Z');
    }
  }
  return parts.length ? parts.join(' ') : null;
}

// Biến đổi toạ độ khi khối nằm trong nhóm.
type Tf = (x: Xf) => Xf;
const idTf: Tf = x => x;

const PRESET: Record<string, ShapeKind> = {
  rect: 'rect', roundRect: 'round', snip1Rect: 'rect', ellipse: 'ellipse', triangle: 'triangle', rtTriangle: 'triangle', diamond: 'diamond',
  star5: 'star', star4: 'star', star6: 'star', pentagon: 'pentagon', homePlate: 'arrow', hexagon: 'hexagon', line: 'line', straightConnector1: 'line',
  rightArrow: 'arrow', leftArrow: 'arrow', flowChartProcess: 'rect', flowChartAlternateProcess: 'round', flowChartDecision: 'diamond', flowChartConnector: 'ellipse',
};

function lvlStyle(styleRoot: El | null, lvl: number): El | null { return styleRoot ? kid(styleRoot, `lvl${lvl + 1}pPr`) : null; }
// Lấy kiểu chữ mặc định từ khuôn của trang mẫu và trang chủ.
function inheritedText(ctx: Ctx, ph: PhKey | null, lvl: number) {
  const out: { sz?: number; color?: string; bold?: boolean; font?: string; algn?: string; bullet?: boolean } = {};
  const apply = (p: El | null) => {
    if (!p) return;
    const d = kid(p, 'defRPr');
    if (d) {
      if (attr(d, 'sz')) out.sz = num(attr(d, 'sz')) / 100;
      if (attr(d, 'b')) out.bold = attr(d, 'b') === '1';
      const c = firstColor(kid(d, 'solidFill'), ctx.theme); if (c) out.color = c;
      const lt = attr(kid(d, 'latin'), 'typeface'); if (lt) out.font = lt;
    }
    if (attr(p, 'algn')) out.algn = attr(p, 'algn')!;
    if (kid(p, 'buChar') || kid(p, 'buAutoNum')) out.bullet = true;
    if (kid(p, 'buNone')) out.bullet = false;
  };
  const txStyles = path(ctx.master, 'txStyles');
  const kind = ph ? sameKind(ph.type) : 'other';
  apply(lvlStyle(kind === 'title' ? kid(txStyles, 'titleStyle') : kind === 'body' ? kid(txStyles, 'bodyStyle') : kid(txStyles, 'otherStyle'), lvl));
  if (ph) {
    for (const tree of [ctx.master, ctx.layout]) {
      const s = findPh(tree, ph);
      apply(lvlStyle(path(s, 'txBody', 'lstStyle'), lvl));
    }
  }
  return out;
}

function themeFont(f: string | undefined, theme: Theme) {
  if (!f) return undefined;
  if (f.startsWith('+mj')) return theme.major;
  if (f.startsWith('+mn')) return theme.minor;
  return f;
}

// Ký hiệu của phông Wingdings, Symbol (vùng mã riêng U+F0xx) đổi sang ký tự Unicode thường để hiện đúng.
const WINGDINGS: Record<number, string> = {
  0x6C: '●', 0x6E: '■', 0x6F: '□', 0x71: '❑', 0x75: '◆', 0x76: '❖', 0x77: '⬥', 0xA7: '▪', 0xA8: '◻', 0xB7: '•', 0xD8: '➢', 0xD7: '▼', 0xD9: '▲',
  0xDF: '←', 0xE0: '→', 0xE1: '↑', 0xE2: '↓', 0xE8: '➔', 0xE7: '➔', 0xF0: '⇨', 0xEF: '⇦', 0xFB: '✗', 0xFC: '✔', 0xFE: '☑', 0x4A: '☺', 0x4C: '☹', 0x46: '☞',
};
const SYMBOL: Record<number, string> = { 0xAE: '→', 0xAC: '←', 0xAD: '↑', 0xAF: '↓', 0xB7: '•', 0xD7: '·', 0xB4: '×', 0xB8: '÷', 0xA3: '≤', 0xB3: '≥', 0xB9: '≠', 0xBB: '≈', 0xA5: '∞', 0xDE: '⇒', 0xDC: '⇐', 0xDB: '⇔' };
function fixSymbols(t: string, font?: string | null): string {
  return t.replace(/[\uF000-\uF0FF]/g, ch => {
    const c = ch.charCodeAt(0) - 0xF000;
    if (font && /symbol/i.test(font)) return SYMBOL[c] || String.fromCharCode(c);
    return WINGDINGS[c] || SYMBOL[c] || '•';
  });
}

// Khối chữ từ txBody.
function textFrom(sp: El, txBody: El, box: Xf, ctx: Ctx, ph: PhKey | null, extra: Partial<SlideEl> = {}, defColor?: string): SlideEl | null {
  const paras = kids(txBody, 'p');
  const lines: string[] = [];
  let first: { sz?: number; color?: string; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; font?: string; algn?: string; bullet?: boolean; caps?: boolean } | null = null;
  let anyBullet = false;
  for (const p of paras) {
    const pPr = kid(p, 'pPr');
    const lvl = num(attr(pPr, 'lvl'));
    const inh = inheritedText(ctx, ph, lvl);
    let text = '';
    for (const r of kids(p)) {
      if (r.localName === 'r' || r.localName === 'fld') {
        const symFont = attr(kid(kid(r, 'rPr'), 'sym'), 'typeface') || attr(kid(kid(r, 'rPr'), 'latin'), 'typeface');
        const t = fixSymbols(kid(r, 't')?.textContent || '', symFont);
        text += t;
        if (!first && t.trim()) {
          const rPr = kid(r, 'rPr');
          first = {
            sz: attr(rPr, 'sz') ? num(attr(rPr, 'sz')) / 100 : inh.sz,
            color: firstColor(kid(rPr, 'solidFill'), ctx.theme) || defColor || inh.color,
            bold: attr(rPr, 'b') != null ? attr(rPr, 'b') === '1' : inh.bold,
            italic: attr(rPr, 'i') === '1', underline: !!attr(rPr, 'u') && attr(rPr, 'u') !== 'none', strike: !!attr(rPr, 'strike') && attr(rPr, 'strike') !== 'noStrike',
            font: themeFont(attr(kid(rPr, 'latin'), 'typeface') || inh.font, ctx.theme), algn: attr(pPr, 'algn') || inh.algn,
            caps: attr(rPr, 'cap') === 'all',
          };
        }
      } else if (r.localName === 'br') text += '\n';
    }
    const bullet = kid(pPr, 'buNone') ? false : (kid(pPr, 'buChar') || kid(pPr, 'buAutoNum')) ? true : !!inh.bullet;
    if (bullet && text.trim()) anyBullet = true;
    lines.push((lvl > 0 ? '   '.repeat(lvl) : '') + text);
  }
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.join('').trim()) return null;
  const f = first || {};
  const scaleFont = num(attr(path(txBody, 'bodyPr', 'normAutofit'), 'fontScale'), 100000) / 100000;
  const isTitle = ph && sameKind(ph.type) === 'title';
  const sizePt = (f.sz || (isTitle ? 44 : ph ? 28 : 18)) * scaleFont;
  const fontPx = Math.max(8, Math.round(sizePt * EMU_PER_PT * ctx.scale));
  const bodyPr = kid(txBody, 'bodyPr');
  const insL = num(attr(bodyPr, 'lIns'), 91440) * ctx.scale, insT = num(attr(bodyPr, 'tIns'), 45720) * ctx.scale;
  const insR = num(attr(bodyPr, 'rIns'), 91440) * ctx.scale;
  let x = ctx.ox + box.x * ctx.scale + insL, y = ctx.oy + box.y * ctx.scale + insT;
  const w = Math.max(20, box.w * ctx.scale - insL - insR), h = Math.max(20, box.h * ctx.scale - insT * 2);
  // Chữ căn giữa hay căn dưới theo chiều dọc: ước lượng chiều cao chữ để đặt đúng chỗ.
  const anchor = attr(bodyPr, 'anchor') || (isTitle ? 'ctr' : 't');
  if (anchor === 'ctr' || anchor === 'b') {
    const perLine = Math.max(1, Math.floor(w / (fontPx * 0.52)));
    const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
    const est = rows * fontPx * 1.25;
    if (est < h) y += anchor === 'ctr' ? (h - est) / 2 : h - est;
  }
  const algn = f.algn === 'ctr' ? 'center' : f.algn === 'r' ? 'right' : 'left';
  const fontName = f.font && !/^\+/.test(f.font) ? f.font : undefined;
  return {
    id: uid(), type: 'text', x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(Math.min(h, fontPx * 1.3 * lines.length + 4)),
    text: lines.join('\n'), fontSize: fontPx, color: f.color || defColor || '#1e293b', bold: !!f.bold, italic: !!f.italic, underline: !!f.underline, strike: !!f.strike, upper: !!f.caps,
    fontFamily: fontName, align: algn, lineHeight: 1.2, list: anyBullet, rot: box.rot || undefined, ...extra,
  };
}

// Ảnh tải lên chạy song song ở nền, khối ảnh được điền link khi tải xong.
function deferSrc(ctx: Ctx, rid: string | null, el: SlideEl) {
  ctx.pending.push(mediaUrl(ctx, rid).then(u => { el.src = u || ''; }));
}

async function mediaUrl(ctx: Ctx, rid: string | null): Promise<string | null> {
  if (!rid) return null;
  const rel = ctx.rels[rid];
  if (!rel) return null;
  if (/^https?:/i.test(rel.target)) return rel.target;
  if (!ctx.mediaCache.has(rel.target)) {
    ctx.mediaCache.set(rel.target, (async () => {
      const ext = (rel.target.split('.').pop() || '').toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) { ctx.skipped['ảnh định dạng EMF, WMF, TIFF'] = (ctx.skipped['ảnh định dạng EMF, WMF, TIFF'] || 0) + 1; return null; }
      const f = ctx.zip.file(rel.target); if (!f) return null;
      const data: Uint8Array = await f.async('uint8array');
      const type = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      return ctx.upload(new Blob([data], { type }), rel.target.split('/').pop() || `anh.${ext}`);
    })());
  }
  return ctx.mediaCache.get(rel.target)!;
}

// Đọc các khối trên một cây (trang, nhóm).
async function readTree(tree: El | null, ctx: Ctx, tf: Tf, out: SlideEl[]) {
  for (const node of kids(tree)) {
    const name = node.localName;
    if (name === 'sp' || name === 'cxnSp') {
      const spPr = kid(node, 'spPr');
      const ph = phOf(node);
      let xf = xfrmOf(spPr);
      if (!xf && ph) xf = xfrmOf(kid(findPh(ctx.layout, ph), 'spPr')) || xfrmOf(kid(findPh(ctx.master, ph), 'spPr'));
      if (!xf) continue;
      const box = tf(xf);
      const geom = attr(kid(spPr, 'prstGeom'), 'prst') || (name === 'cxnSp' ? 'line' : 'rect');
      // Màu tô và viền (kể cả lấy theo kiểu chủ đề p:style).
      let fill = fillOf(spPr, ctx.theme);
      if (!fill) { const fr = path(node, 'style', 'fillRef'); if (fr && attr(fr, 'idx') !== '0') { const c = firstColor(fr, ctx.theme); if (c) fill = { color: c }; } }
      const ln = kid(spPr, 'ln');
      let stroke = ln && !kid(ln, 'noFill') ? firstColor(kid(ln, 'solidFill'), ctx.theme) : null;
      if (!stroke && !(ln && kid(ln, 'noFill'))) { const lr = path(node, 'style', 'lnRef'); if (lr && attr(lr, 'idx') !== '0') stroke = firstColor(lr, ctx.theme); }
      const sw = ln ? Math.max(1, Math.round(num(attr(ln, 'w'), 12700) * ctx.scale)) : 0;
      const kind = PRESET[geom] || 'rect';
      const px = { x: Math.round(ctx.ox + box.x * ctx.scale), y: Math.round(ctx.oy + box.y * ctx.scale), w: Math.max(2, Math.round(box.w * ctx.scale)), h: Math.max(2, Math.round(box.h * ctx.scale)) };
      if (kind === 'line') {
        if (stroke || fill?.color) out.push({ id: uid(), type: 'shape', shape: (kid(ln, 'tailEnd') && attr(kid(ln, 'tailEnd'), 'type') !== 'none') ? 'arrow' : 'line', ...px, h: Math.max(px.h, 12), fill: stroke || fill?.color, stroke: stroke || fill?.color, strokeWidth: Math.max(2, sw), rot: box.rot || undefined });
        continue;
      }
      const freeform = custPath(spPr, px.w, px.h);
      if (fill?.blip) {
        const el: SlideEl = { id: uid(), type: 'image', src: '', ...px, fit: 'cover', rot: box.rot || undefined, radius: kind === 'ellipse' ? 999 : 0 };
        deferSrc(ctx, attr(kid(fill.blip, 'blip'), 'embed'), el); out.push(el);
      } else if ((fill && !fill.none && fill.color) || (stroke && sw)) {
        const geo: Partial<SlideEl> = freeform ? { shape: 'path', path: freeform, pathW: px.w, pathH: px.h } : { shape: kind };
        out.push({ id: uid(), type: 'shape', ...geo, ...px, fill: fill && !fill.none ? fill.color : 'transparent', stroke: stroke || undefined, strokeWidth: stroke ? sw : 0, rot: box.rot || undefined, flipX: box.flipH || undefined, flipY: box.flipV || undefined } as SlideEl);
      }
      const tx = kid(node, 'txBody');
      if (tx) {
        // Màu chữ mặc định của hình theo kiểu chủ đề (thường là chữ trắng trên hình màu).
        const fontRefColor = firstColor(path(node, 'style', 'fontRef'), ctx.theme);
        const t = textFrom(node, tx, box, ctx, ph, {}, fontRefColor || undefined);
        if (t) out.push(t);
      }
    } else if (name === 'pic') {
      const spPr = kid(node, 'spPr');
      const xf = xfrmOf(spPr) || (phOf(node) ? xfrmOf(kid(findPh(ctx.layout, phOf(node)!), 'spPr')) : null);
      if (!xf) continue;
      const box = tf(xf);
      // Video gắn link ngoài (YouTube...) thì thành khối video, video nhúng trong tệp thì bỏ qua.
      const vf = find(node, 'videoFile');
      if (vf) {
        const link = ctx.rels[Array.from(vf.attributes).find(a => a.localName === 'link')?.value || '']?.target || '';
        if (/^https?:/i.test(link)) {
          out.push({ id: uid(), type: 'video', video: link, x: Math.round(ctx.ox + box.x * ctx.scale), y: Math.round(ctx.oy + box.y * ctx.scale), w: Math.max(40, Math.round(box.w * ctx.scale)), h: Math.max(30, Math.round(box.h * ctx.scale)) });
          continue;
        }
        ctx.skipped['video, âm thanh nhúng trong tệp'] = (ctx.skipped['video, âm thanh nhúng trong tệp'] || 0) + 1;
      } else if (find(node, 'audioFile')) ctx.skipped['video, âm thanh nhúng trong tệp'] = (ctx.skipped['video, âm thanh nhúng trong tệp'] || 0) + 1;
      const rid = attr(find(kid(node, 'blipFill'), 'blip'), 'embed');
      if (!rid) continue;
      const geom = attr(kid(spPr, 'prstGeom'), 'prst');
      const el: SlideEl = { id: uid(), type: 'image', src: '', x: Math.round(ctx.ox + box.x * ctx.scale), y: Math.round(ctx.oy + box.y * ctx.scale), w: Math.max(4, Math.round(box.w * ctx.scale)), h: Math.max(4, Math.round(box.h * ctx.scale)), fit: 'cover', rot: box.rot || undefined, flipX: box.flipH || undefined, flipY: box.flipV || undefined, radius: geom === 'ellipse' ? 999 : geom === 'roundRect' ? 16 : 0 };
      // Phần ảnh bị cắt trong PowerPoint.
      const sr = kid(kid(node, 'blipFill'), 'srcRect');
      if (sr) {
        const c = { l: num(attr(sr, 'l')) / 100000, t: num(attr(sr, 't')) / 100000, r: num(attr(sr, 'r')) / 100000, b: num(attr(sr, 'b')) / 100000 };
        if (c.l || c.t || c.r || c.b) el.crop = c;
      }
      deferSrc(ctx, rid, el); out.push(el);
    } else if (name === 'grpSp') {
      const x = kid(kid(node, 'grpSpPr'), 'xfrm');
      if (!x) { await readTree(node, ctx, tf, out); continue; }
      const off = kid(x, 'off'), ext = kid(x, 'ext'), cOff = kid(x, 'chOff'), cExt = kid(x, 'chExt');
      const ox = num(attr(off, 'x')), oy = num(attr(off, 'y')), ew = num(attr(ext, 'cx'), 1), eh = num(attr(ext, 'cy'), 1);
      const cx = num(attr(cOff, 'x')), cy = num(attr(cOff, 'y')), cw = num(attr(cExt, 'cx'), ew) || 1, ch = num(attr(cExt, 'cy'), eh) || 1;
      const sx = ew / cw, sy = eh / ch;
      const inner: Tf = c => tf({ ...c, x: ox + (c.x - cx) * sx, y: oy + (c.y - cy) * sy, w: c.w * sx, h: c.h * sy });
      await readTree(node, ctx, inner, out);
    } else if (name === 'graphicFrame') {
      const xfE = kid(node, 'xfrm');
      const xf = xfE ? { x: num(attr(kid(xfE, 'off'), 'x')), y: num(attr(kid(xfE, 'off'), 'y')), w: num(attr(kid(xfE, 'ext'), 'cx')), h: num(attr(kid(xfE, 'ext'), 'cy')), rot: 0, flipH: false, flipV: false } : null;
      const tbl = find(node, 'tbl');
      if (tbl && xf) {
        // Bảng: mỗi ô thành 1 khung viền và 1 khối chữ.
        const box = tf(xf);
        const cols = kids(kid(tbl, 'tblGrid'), 'gridCol').map(g => num(attr(g, 'w')));
        const tblPr = kid(tbl, 'tblPr');
        const head = attr(tblPr, 'firstRow') === '1', band = attr(tblPr, 'bandRow') === '1';
        const accent = ctx.theme.colors.accent1 || '#4f81bd';
        const [ar, ag, ab] = hexToRgb(accent.startsWith('#') ? accent : '#4f81bd');
        const light = rgbToHex(ar + (255 - ar) * 0.8, ag + (255 - ag) * 0.8, ab + (255 - ab) * 0.8);
        let yy = box.y;
        let rowNo = 0;
        for (const tr of kids(tbl, 'tr')) {
          const isHead = head && rowNo === 0;
          const rowFill = isHead ? accent : band && (rowNo - (head ? 1 : 0)) % 2 === 0 ? light : undefined;
          rowNo++;
          const rh = num(attr(tr, 'h'));
          let xx = box.x;
          kids(tr, 'tc').forEach((tc, ci) => {
            const cw = cols[ci] || 0;
            const span = num(attr(tc, 'gridSpan'), 1);
            const w = cols.slice(ci, ci + span).reduce((a, b) => a + b, 0) || cw;
            if (attr(tc, 'hMerge') !== '1' && attr(tc, 'vMerge') !== '1') {
              const cell = { x: xx, y: yy, w, h: rh, rot: 0, flipH: false, flipV: false };
              const f = fillOf(kid(tc, 'tcPr'), ctx.theme);
              out.push({ id: uid(), type: 'shape', shape: 'rect', x: Math.round(ctx.ox + cell.x * ctx.scale), y: Math.round(ctx.oy + cell.y * ctx.scale), w: Math.round(w * ctx.scale), h: Math.round(rh * ctx.scale), fill: f?.color || rowFill || 'transparent', stroke: isHead ? accent : '#cbd5e1', strokeWidth: 1 });
              const tx = kid(tc, 'txBody');
              if (tx) { const t = textFrom(tc, tx, cell, ctx, null, isHead ? { bold: true } : {}, isHead && !f?.color ? '#ffffff' : undefined); if (t) out.push(t); }
            }
            xx += cw;
          });
          yy += rh;
        }
      } else {
        const what = find(node, 'chart') ? 'biểu đồ' : find(node, 'relIds') ? 'SmartArt' : 'đối tượng nhúng';
        ctx.skipped[what] = (ctx.skipped[what] || 0) + 1;
      }
    }
  }
}

async function bgOf(cSld: El | null, ctx: Ctx): Promise<SlideBg | null> {
  const bg = kid(cSld, 'bg'); if (!bg) return null;
  const pr = kid(bg, 'bgPr');
  if (pr) {
    const f = fillOf(pr, ctx.theme);
    if (f?.blip) { const src = await mediaUrl(ctx, attr(kid(f.blip, 'blip'), 'embed')); if (src) return { image: src }; }
    if (f?.gradient) return { gradient: f.gradient };
    if (f?.color) return { color: f.color };
  }
  const ref = kid(bg, 'bgRef');
  if (ref) { const c = firstColor(ref, ctx.theme); if (c) return { color: c }; }
  return null;
}

export interface PptxResult { title: string; slides: Slide[]; skipped: Record<string, number>; images: number }

export async function importPptx(file: File, opts: { upload: (blob: Blob, name: string) => Promise<string | null>; onProgress?: (done: number, total: number) => void; onImages?: (done: number, total: number) => void; parse?: (s: string) => Document }): Promise<PptxResult> {
  const JSZip = (await import('jszip')).default;
  const zip = (await JSZip.loadAsync(file)) as unknown as Zip;
  const parse = opts.parse || ((s: string) => new DOMParser().parseFromString(s, 'application/xml'));
  const pres = await readXml(zip, 'ppt/presentation.xml', parse);
  if (!pres) throw new Error('Tệp không phải PowerPoint dạng .pptx hoặc đã hỏng.');
  const sz = kid(pres, 'sldSz');
  const cx = num(attr(sz, 'cx'), 12192000), cy = num(attr(sz, 'cy'), 6858000);
  const scale = Math.min(SLIDE_W / cx, SLIDE_H / cy);
  const ox = (SLIDE_W - cx * scale) / 2, oy = (SLIDE_H - cy * scale) / 2;
  const presRels = await readRels(zip, 'ppt/presentation.xml', parse);
  const ids = kids(kid(pres, 'sldIdLst'), 'sldId').map(s => Array.from(s.attributes).find(a => a.name === 'r:id' || (a.localName === 'id' && /relationships/.test(a.namespaceURI || '')))?.value || '');
  const slidePaths = ids.map(id => presRels[id]?.target).filter(Boolean) as string[];

  // Chủ đề màu và phông.
  const themePath = Object.values(presRels).find(r => /theme/.test(r.type))?.target || 'ppt/theme/theme1.xml';
  const themeXml = await readXml(zip, themePath, parse);
  const theme: Theme = { colors: {}, major: '', minor: '' };
  for (const c of kids(find(themeXml, 'clrScheme'))) { const v = firstColor(c, { colors: {}, major: '', minor: '' }); if (v) theme.colors[c.localName] = v; }
  theme.major = attr(path(find(themeXml, 'majorFont'), 'latin'), 'typeface') || '';
  theme.minor = attr(path(find(themeXml, 'minorFont'), 'latin'), 'typeface') || '';

  const skipped: Record<string, number> = {};
  // Tải ảnh lên tối đa 4 ảnh cùng lúc.
  let active = 0; const queue: Array<() => void> = [];
  let upDone = 0, upTotal = 0;
  const limitedUpload = (blob: Blob, name: string) => new Promise<string | null>(resolve => {
    upTotal++;
    const run = () => { active++; opts.upload(blob, name).catch(() => null).then(u => { active--; upDone++; opts.onImages?.(upDone, upTotal); resolve(u); const n = queue.shift(); if (n) n(); }); };
    if (active < 4) run(); else queue.push(run);
  });
  const pending: Promise<void>[] = [];
  const mediaCache = new Map<string, Promise<string | null>>();
  const xmlCache = new Map<string, Promise<El | null>>();
  const cachedXml = (p: string) => { if (!xmlCache.has(p)) xmlCache.set(p, readXml(zip, p, parse)); return xmlCache.get(p)!; };
  const slides: Slide[] = [];
  let i = 0;
  for (const sp of slidePaths) {
    const root = await readXml(zip, sp, parse);
    const rels = await readRels(zip, sp, parse);
    const layoutPath = Object.values(rels).find(r => /slideLayout/.test(r.type))?.target;
    const layout = layoutPath ? await cachedXml(layoutPath) : null;
    const layoutRels = layoutPath ? await readRels(zip, layoutPath, parse) : {};
    const masterPath = Object.values(layoutRels).find(r => /slideMaster/.test(r.type))?.target;
    const master = masterPath ? await cachedXml(masterPath) : null;
    const masterRels = masterPath ? await readRels(zip, masterPath, parse) : {};
    const ctx: Ctx = { theme, scale, ox, oy, layout, master, rels, zip, upload: limitedUpload, skipped, mediaCache, pending };
    const cSld = kid(root, 'cSld');
    // Nền: trang, rồi trang mẫu, rồi trang chủ.
    const bg = (await bgOf(cSld, ctx)) || (await bgOf(kid(layout, 'cSld'), { ...ctx, rels: layoutRels })) || (await bgOf(kid(master, 'cSld'), { ...ctx, rels: masterRels })) || { color: '#ffffff' };
    const els: SlideEl[] = [];
    // Hình, ảnh trang trí cố định của trang mẫu và trang chủ (không phải khung giữ chỗ) cũng hiện lên trang.
    if (attr(root, 'showMasterSp') !== '0') {
      const deco = async (tree: El | null, r: Record<string, { target: string; type: string }>) => {
        const t = path(tree, 'cSld', 'spTree'); if (!t) return;
        const clone: El[] = kids(t).filter(n => !phOf(n));
        const tmp = t.cloneNode(false) as El; clone.forEach(n => tmp.appendChild(n.cloneNode(true)));
        await readTree(tmp, { ...ctx, rels: r }, idTf, els);
      };
      if (attr(layout, 'showMasterSp') !== '0') await deco(master, masterRels);
      await deco(layout, layoutRels);
    }
    await readTree(path(cSld, 'spTree'), ctx, idTf, els);
    // Ghi chú người trình bày.
    let notes = '';
    const notesPath = Object.values(rels).find(r => /notesSlide/.test(r.type))?.target;
    if (notesPath) {
      const nx = await readXml(zip, notesPath, parse);
      const body = findAll(nx, 'sp').find(s => phOf(s)?.type === 'body');
      notes = kids(kid(body, 'txBody'), 'p').map(p => findAll(p, 't').map(t => t.textContent || '').join('')).join('\n').trim();
    }
    if (find(root, 'transition') && kids(find(root, 'transition')).length) {
      // Có chuyển trang trong PowerPoint thì dùng hiệu ứng mờ dần tương ứng.
    }
    slides.push({ id: uid('s'), bg, els, notes: notes || undefined, transition: find(root, 'transition') ? { type: 'fade', dur: 0.6 } : undefined });
    opts.onProgress?.(++i, slidePaths.length);
  }
  const core = await readXml(zip, 'docProps/core.xml', parse);
  const coreTitle = (find(core, 'title')?.textContent || '').trim();
  const title = coreTitle && coreTitle.length <= 90 ? coreTitle : file.name.replace(/\.pptx$/i, '');
  await Promise.all(pending);
  // Bỏ khối ảnh không tải được.
  for (const sl of slides) sl.els = sl.els.filter(e => e.type !== 'image' || !!e.src);
  let images = 0;
  for (const p of mediaCache.values()) if (await p) images++;
  return { title, slides, skipped, images };
}
