import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { TableKit } from '@tiptap/extension-table';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { CharacterCount } from '@tiptap/extensions';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Subscript as SubIcon, Superscript as SupIcon, Code,
  List, ListOrdered, Quote, SquareCode, Minus, Image as ImageIcon, Images, Link as LinkIcon, Unlink,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo, Video as VideoIcon, Youtube, Table as TableIcon,
  Baseline, Highlighter, RemoveFormatting, Maximize2, Minimize2, FileCode2, Indent, Outdent, Trash2,
  PanelLeft, PanelRight, Loader2, ChevronDown, X,
} from 'lucide-react';
import MediaSourcePicker from '../MediaSourcePicker';
import { VideoNode, toVideoSource } from '../../lib/tiptapVideo';
import { uploadMediaToCloudinary } from '../../lib/upload';
import { askText, notice } from '../ui/Dialogs';

// Trình soạn thảo đầy đủ cho bài viết, dự án, khoá học của Website:
// kiểu chữ, cỡ chữ, màu chữ, tô nền, căn lề, giãn dòng, danh sách, trích dẫn, bảng,
// chèn ảnh và video từ Kho lưu trữ của chính người dùng hoặc tải lên mới, nhúng YouTube, Vimeo, Google Drive,
// chèn liên kết, chỉnh cỡ và vị trí ảnh, dán hoặc kéo thả ảnh, xem mã HTML và soạn toàn màn hình.

// ----- Ảnh có cỡ và vị trí -----
type ImgAlign = 'center' | 'left' | 'right' | 'floatLeft' | 'floatRight';
const alignStyle = (a: ImgAlign) => ({
  center: 'display:block;margin-left:auto;margin-right:auto',
  left: 'display:block;margin-left:0;margin-right:auto',
  right: 'display:block;margin-left:auto;margin-right:0',
  floatLeft: 'float:left;margin:0.25rem 1.25rem 0.75rem 0',
  floatRight: 'float:right;margin:0.25rem 0 0.75rem 1.25rem',
}[a] || '');
const readAlign = (el: HTMLElement): ImgAlign => {
  const s = el.style;
  if (s.float === 'left') return 'floatLeft';
  if (s.float === 'right') return 'floatRight';
  if (s.marginLeft === 'auto' && s.marginRight === 'auto') return 'center';
  if (s.marginLeft === 'auto') return 'right';
  if (s.display === 'block') return 'left';
  return 'center';
};
const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: '100%', parseHTML: el => (el as HTMLElement).style.width || (el as HTMLElement).getAttribute('width') || '100%', renderHTML: () => ({}) },
      align: { default: 'center', parseHTML: el => readAlign(el as HTMLElement), renderHTML: () => ({}) },
    };
  },
  renderHTML({ HTMLAttributes, node }) {
    const width = node.attrs.width || '100%';
    const style = `width:${width};max-width:100%;height:auto;border-radius:0.75rem;${alignStyle(node.attrs.align || 'center')}`;
    const { width: _w, align: _a, style: _s, ...rest } = HTMLAttributes as Record<string, unknown>;
    return ['img', { ...rest, style, loading: 'lazy' }];
  },
}).configure({ inline: false, allowBase64: false });

// ----- Bảng màu -----
const COLORS = [
  '#0f172a', '#334155', '#64748b', '#94a3b8', '#ffffff',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d',
  '#059669', '#0d9488', '#0284c7', '#2563eb', '#4f46e5',
  '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48',
];
const HIGHLIGHTS = ['#fef08a', '#fde68a', '#fed7aa', '#fecaca', '#fbcfe8', '#e9d5ff', '#c7d2fe', '#bfdbfe', '#a5f3fc', '#bbf7d0', '#d9f99d', '#e2e8f0'];
const FONTS: Array<{ label: string; value: string }> = [
  { label: 'Mặc định', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];
const SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px'];
const LINE_HEIGHTS = ['1.2', '1.5', '1.75', '2', '2.5'];
const BLOCKS: Array<{ label: string; level: 0 | 1 | 2 | 3 | 4 }> = [
  { label: 'Đoạn văn', level: 0 }, { label: 'Tiêu đề 1', level: 1 }, { label: 'Tiêu đề 2', level: 2 }, { label: 'Tiêu đề 3', level: 3 }, { label: 'Tiêu đề 4', level: 4 },
];

// Nội dung cũ dạng chữ thường (không có thẻ HTML) được tách thành từng đoạn để không dính liền.
function toInitialHtml(v: string): string {
  if (!v) return '';
  if (/<[a-z][\s\S]*>/i.test(v)) return v;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return v.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

// ----- Phần tử giao diện của thanh công cụ -----
function Btn({ onClick, active, disabled, title, children }: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'bg-brand-light text-brand' : 'hover:bg-slate-100 hover:text-slate-900'}`}>
      {children}
    </button>
  );
}
const Sep = () => <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" />;

// Hộp xổ xuống nhỏ, đóng khi bấm ra ngoài.
function Pop({ trigger, title, children, width = 'w-56' }: { trigger: React.ReactNode; title: string; children: (close: () => void) => React.ReactNode; width?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" title={title} aria-label={title} onMouseDown={e => e.preventDefault()} onClick={() => setOpen(o => !o)}
        className={`flex h-8 items-center gap-1 rounded-lg px-1.5 text-slate-600 transition-colors ${open ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100 hover:text-slate-900'}`}>
        {trigger}
      </button>
      {open && (
        <div className={`absolute left-0 top-full z-50 mt-1 ${width} rounded-xl border border-slate-100 bg-white p-2 shadow-xl`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function ColorGrid({ colors, current, onPick, onClear, clearLabel }: { colors: string[]; current?: string; onPick: (c: string) => void; onClear: () => void; clearLabel: string }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-1.5">
        {colors.map(c => (
          <button key={c} type="button" title={c} onMouseDown={e => e.preventDefault()} onClick={() => onPick(c)}
            className={`h-7 w-full rounded-md border ${current?.toLowerCase() === c ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200'}`} style={{ background: c }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <input type="color" defaultValue={current || '#000000'} onChange={e => onPick(e.target.value)} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" /> Màu khác
        </label>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClear} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50">{clearLabel}</button>
      </div>
    </div>
  );
}

function LinkForm({ editor, close }: { editor: Editor; close: () => void }) {
  const prev = editor.getAttributes('link');
  const [url, setUrl] = useState<string>(prev.href || '');
  const [blank, setBlank] = useState<boolean>(prev.target ? prev.target === '_blank' : true);
  const [text, setText] = useState('');
  const hasSelection = !editor.state.selection.empty || editor.isActive('link');
  const apply = () => {
    let href = url.trim();
    if (!href) return;
    if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) href = `https://${href}`;
    const attrs = { href, target: blank ? '_blank' : null } as any;
    if (hasSelection) editor.chain().focus().extendMarkRange('link').setLink(attrs).run();
    else editor.chain().focus().insertContent({ type: 'text', text: text.trim() || href, marks: [{ type: 'link', attrs }] }).run();
    close();
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600">Chèn liên kết</p>
      {!hasSelection && <input value={text} onChange={e => setText(e.target.value)} placeholder="Chữ hiển thị" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm outline-none focus:border-brand" />}
      <input autoFocus value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }} placeholder="https://..." className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm outline-none focus:border-brand" />
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={blank} onChange={e => setBlank(e.target.checked)} className="accent-brand" /> Mở trong thẻ mới</label>
      <div className="flex justify-end gap-1.5">
        {editor.isActive('link') && <button type="button" onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); close(); }} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">Bỏ liên kết</button>}
        <button type="button" onClick={apply} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">Chèn</button>
      </div>
    </div>
  );
}

function TableGrid({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-600">{hover[0] ? `Bảng ${hover[0]} hàng x ${hover[1]} cột` : 'Chọn số hàng, số cột'}</p>
      <div className="grid w-max grid-cols-[repeat(8,1.25rem)] gap-0.5" onMouseLeave={() => setHover([0, 0])}>
        {Array.from({ length: 64 }).map((_, i) => {
          const r = Math.floor(i / 8) + 1; const c = (i % 8) + 1;
          const on = r <= hover[0] && c <= hover[1];
          return <button key={i} type="button" onMouseEnter={() => setHover([r, c])} onClick={() => onPick(r, c)}
            className={`h-5 w-5 rounded-sm border ${on ? 'border-brand bg-brand-light' : 'border-slate-200 bg-white'}`} />;
        })}
      </div>
    </div>
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  folder?: string;
  // true: khung soạn cao theo nội dung, thanh công cụ bám đầu trang khi cuộn (dùng cho trang soạn bài).
  autoHeight?: boolean;
  // Trả về đối tượng editor cho nơi cần gọi trực tiếp (nạp nội dung, lấy HTML).
  onReady?: (editor: Editor) => void;
}

// Ảnh đã nằm trong kho Cloudinary của EduGo thì không cần chép lại.
const OWN_CLOUD = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'sjpkbenx').trim();
const isOwnMedia = (src: string) => src.includes(`res.cloudinary.com/${OWN_CLOUD}/`);
const isImportable = (src: string) => !!src && !isOwnMedia(src) && (/^https?:\/\//i.test(src) || /^data:image\//i.test(src));

export default function RichTextEditor({ value, onChange, placeholder = 'Nhập nội dung...', minHeight = '320px', maxHeight = '600px', folder = 'portfolio/posts', autoHeight = false, onReady }: RichTextEditorProps) {
  const [, force] = useState(0);
  const [full, setFull] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const editorRef = useRef<Editor | null>(null);
  const lastEmitted = useRef<string>(value || '');
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange;

  // Dán hoặc kéo thả ảnh từ máy: tải lên Kho lưu trữ rồi chèn vào đúng chỗ.
  const uploadFiles = async (files: File[], pos?: number) => {
    const imgs = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!imgs.length) return false;
    setUploading(n => n + imgs.length);
    for (const f of imgs) {
      try {
        const isVideo = f.type.startsWith('video/');
        const url = await uploadMediaToCloudinary(f, { resourceType: isVideo ? 'video' : 'image', folder, noBase64Fallback: true });
        const ed = editorRef.current;
        if (ed && url) {
          const node = isVideo ? { type: 'eduVideo', attrs: { src: url, kind: 'file' } } : { type: 'image', attrs: { src: url, alt: f.name.replace(/\.[^.]+$/, '') } };
          if (typeof pos === 'number') ed.chain().focus().insertContentAt(pos, node).run();
          else ed.chain().focus().insertContent(node).run();
        }
      } catch {
        notice(`Không tải lên được ${f.name}, vui lòng thử lại.`);
      } finally {
        setUploading(n => n - 1);
      }
    }
    return true;
  };

  // Ảnh dán từ trang web khác (hoặc chèn bằng link) được chép về Kho lưu trữ của người dùng,
  // để trang gốc có xoá ảnh thì bài viết vẫn còn ảnh.
  const tried = useRef(new Set<string>());
  const importExternalImages = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const srcs = new Set<string>();
    ed.state.doc.descendants(node => { if (node.type.name === 'image' && isImportable(node.attrs.src || '') && !tried.current.has(node.attrs.src)) srcs.add(node.attrs.src); });
    srcs.forEach(async src => {
      tried.current.add(src);
      setImporting(n => n + 1);
      try {
        const url = await uploadMediaToCloudinary(src, { resourceType: 'image', folder, noBase64Fallback: true });
        const cur = editorRef.current;
        if (cur && url && !cur.isDestroyed) {
          const tr = cur.state.tr;
          cur.state.doc.descendants((node, pos) => { if (node.type.name === 'image' && node.attrs.src === src) tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: url }); });
          if (tr.docChanged) cur.view.dispatch(tr);
        }
      } catch {
        notice('Có ảnh không chép được về Kho lưu trữ (trang gốc chặn tải). Ảnh vẫn hiện bằng link gốc.', 'info');
      } finally {
        setImporting(n => n - 1);
      }
    });
  };
  const [importing, setImporting] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      RichImage,
      VideoNode,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TableKit.configure({ table: { resizable: false } }),
      CharacterCount,
      Placeholder.configure({ placeholder }),
    ],
    content: toInitialHtml(value),
    onUpdate: ({ editor }) => { const html = editor.isEmpty ? '' : editor.getHTML(); lastEmitted.current = html; onChangeRef.current(html); },
    onSelectionUpdate: () => force(n => n + 1),
    onTransaction: () => force(n => n + 1),
    editorProps: {
      attributes: { class: 'prose prose-slate max-w-none focus:outline-none px-5 py-4 sm:px-8 sm:py-6' },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files || []);
        if (files.some(f => f.type.startsWith('image/') || f.type.startsWith('video/'))) {
          event.preventDefault();
          uploadFiles(files);
          return true;
        }
        // Dán nội dung có ảnh từ trang khác: để trình soạn dán như thường rồi chép ảnh về kho.
        setTimeout(importExternalImages, 0);
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from((event as DragEvent).dataTransfer?.files || []);
        if (!files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY })?.pos;
        uploadFiles(files, pos);
        return true;
      },
    },
  });
  editorRef.current = editor;

  // Nội dung đổi từ bên ngoài (mở bài khác, nạp từ ngân hàng đề) thì nạp lại vào khung soạn.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if ((value || '') === lastEmitted.current) return;
    const next = toInitialHtml(value || '');
    if (next !== editor.getHTML()) editor.commands.setContent(next, { emitUpdate: false });
    lastEmitted.current = value || '';
  }, [value, editor]);
  useEffect(() => { if (editor && onReady) onReady(editor); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [editor]);

  // Thoát toàn màn hình bằng phím Esc.
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [full]);

  if (!editor) return <div className="rounded-xl border border-slate-200 bg-white" style={{ minHeight }} />;

  const chain = () => editor.chain().focus();
  const ts = editor.getAttributes('textStyle');
  const level = ([1, 2, 3, 4] as const).find(l => editor.isActive('heading', { level: l })) || 0;
  const imgSel = editor.isActive('image');
  const imgAttrs = imgSel ? editor.getAttributes('image') : null;
  const inTable = editor.isActive('table');
  const words = editor.storage.characterCount?.words?.() ?? 0;
  const chars = editor.storage.characterCount?.characters?.() ?? 0;

  const insertEmbed = async () => {
    const raw = await askText({ title: 'Nhúng video', label: 'Dán link YouTube, Vimeo, Google Drive hoặc link tệp video .mp4', placeholder: 'https://www.youtube.com/watch?v=...', okText: 'Chèn' });
    if (!raw) return;
    const src = toVideoSource(raw);
    if (!src) { notice('Link chưa đúng. Hãy dùng link YouTube, Vimeo, Google Drive hoặc tệp video .mp4.'); return; }
    chain().insertVideo(src).run();
  };
  const insertImageUrl = async () => {
    const raw = await askText({ title: 'Chèn ảnh bằng link', placeholder: 'https://...', okText: 'Chèn' });
    if (raw && /^https?:\/\//i.test(raw)) { chain().setImage({ src: raw }).run(); setTimeout(importExternalImages, 0); }
  };
  const toggleSource = () => {
    if (source === null) setSource(editor.getHTML());
    else { editor.commands.setContent(source, { emitUpdate: true }); setSource(null); }
  };

  const selectCls = 'h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-brand';
  const shell = full
    ? 'fixed inset-0 z-[80] flex flex-col bg-white'
    : autoHeight
      ? 'flex flex-col rounded-xl border border-slate-200 bg-white transition-all focus-within:border-brand'
      : 'flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20';

  return (
    <div className={shell}>
      {/* Thanh công cụ */}
      <div className={`sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur ${autoHeight && !full ? 'rounded-t-xl' : ''}`}>
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
          <Btn title="Hoàn tác (Ctrl+Z)" onClick={() => chain().undo().run()} disabled={!editor.can().undo()}><Undo className="h-4 w-4" /></Btn>
          <Btn title="Làm lại (Ctrl+Y)" onClick={() => chain().redo().run()} disabled={!editor.can().redo()}><Redo className="h-4 w-4" /></Btn>
          <Sep />
          <select title="Kiểu đoạn" className={`${selectCls} w-[108px]`} value={level} onChange={e => { const l = Number(e.target.value) as 0 | 1 | 2 | 3 | 4; if (l === 0) chain().setParagraph().run(); else chain().setHeading({ level: l }).run(); }}>
            {BLOCKS.map(b => <option key={b.level} value={b.level}>{b.label}</option>)}
          </select>
          <select title="Phông chữ" className={`${selectCls} w-[118px]`} value={ts.fontFamily || ''} onChange={e => { const v = e.target.value; if (v) chain().setFontFamily(v).run(); else chain().unsetFontFamily().run(); }}>
            {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
          </select>
          <select title="Cỡ chữ" className={`${selectCls} w-[74px]`} value={ts.fontSize || ''} onChange={e => { const v = e.target.value; if (v) chain().setFontSize(v).run(); else chain().unsetFontSize().run(); }}>
            <option value="">Cỡ</option>
            {SIZES.map(s => <option key={s} value={s}>{parseInt(s, 10)}</option>)}
          </select>
          <Sep />
          <Btn title="In đậm (Ctrl+B)" onClick={() => chain().toggleBold().run()} active={editor.isActive('bold')}><Bold className="h-4 w-4" /></Btn>
          <Btn title="In nghiêng (Ctrl+I)" onClick={() => chain().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="h-4 w-4" /></Btn>
          <Btn title="Gạch chân (Ctrl+U)" onClick={() => chain().toggleUnderline().run()} active={editor.isActive('underline')}><UnderlineIcon className="h-4 w-4" /></Btn>
          <Btn title="Gạch ngang chữ" onClick={() => chain().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough className="h-4 w-4" /></Btn>
          <Btn title="Chỉ số dưới" onClick={() => chain().toggleSubscript().run()} active={editor.isActive('subscript')}><SubIcon className="h-4 w-4" /></Btn>
          <Btn title="Chỉ số trên" onClick={() => chain().toggleSuperscript().run()} active={editor.isActive('superscript')}><SupIcon className="h-4 w-4" /></Btn>
          <Btn title="Mã trong dòng" onClick={() => chain().toggleCode().run()} active={editor.isActive('code')}><Code className="h-4 w-4" /></Btn>
          <Pop title="Màu chữ" trigger={<span className="flex flex-col items-center"><Baseline className="h-4 w-4" /><span className="-mt-0.5 h-1 w-4 rounded-sm" style={{ background: ts.color || '#0f172a' }} /></span>}>
            {close => <ColorGrid colors={COLORS} current={ts.color} clearLabel="Mặc định" onPick={c => { chain().setColor(c).run(); close(); }} onClear={() => { chain().unsetColor().run(); close(); }} />}
          </Pop>
          <Pop title="Tô nền chữ" trigger={<span className="flex flex-col items-center"><Highlighter className="h-4 w-4" /><span className="-mt-0.5 h-1 w-4 rounded-sm" style={{ background: editor.getAttributes('highlight').color || '#fef08a' }} /></span>}>
            {close => <ColorGrid colors={HIGHLIGHTS} current={editor.getAttributes('highlight').color} clearLabel="Bỏ tô" onPick={c => { chain().setHighlight({ color: c }).run(); close(); }} onClear={() => { chain().unsetHighlight().run(); close(); }} />}
          </Pop>
          <Btn title="Xoá định dạng" onClick={() => chain().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-4 w-4" /></Btn>
          <Sep />
          <Btn title="Căn trái" onClick={() => chain().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}><AlignLeft className="h-4 w-4" /></Btn>
          <Btn title="Căn giữa" onClick={() => chain().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}><AlignCenter className="h-4 w-4" /></Btn>
          <Btn title="Căn phải" onClick={() => chain().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}><AlignRight className="h-4 w-4" /></Btn>
          <Btn title="Căn đều hai bên" onClick={() => chain().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })}><AlignJustify className="h-4 w-4" /></Btn>
          <select title="Giãn dòng" className={`${selectCls} w-[104px]`} value={ts.lineHeight || ''} onChange={e => { const v = e.target.value; if (v) chain().setLineHeight(v).run(); else chain().unsetLineHeight().run(); }}>
            <option value="">Giãn dòng</option>
            {LINE_HEIGHTS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <Sep />
          <Btn title="Danh sách chấm" onClick={() => chain().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="h-4 w-4" /></Btn>
          <Btn title="Danh sách số" onClick={() => chain().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="h-4 w-4" /></Btn>
          <Btn title="Lùi vào (danh sách con)" onClick={() => chain().sinkListItem('listItem').run()} disabled={!editor.can().sinkListItem('listItem')}><Indent className="h-4 w-4" /></Btn>
          <Btn title="Lùi ra" onClick={() => chain().liftListItem('listItem').run()} disabled={!editor.can().liftListItem('listItem')}><Outdent className="h-4 w-4" /></Btn>
          <Btn title="Trích dẫn" onClick={() => chain().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="h-4 w-4" /></Btn>
          <Btn title="Khối mã" onClick={() => chain().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}><SquareCode className="h-4 w-4" /></Btn>
          <Btn title="Đường kẻ ngang" onClick={() => chain().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Btn>
          <Sep />
          <Pop title="Chèn liên kết" width="w-72" trigger={<LinkIcon className={`h-4 w-4 ${editor.isActive('link') ? 'text-brand' : ''}`} />}>
            {close => <LinkForm editor={editor} close={close} />}
          </Pop>
          {editor.isActive('link') && <Btn title="Bỏ liên kết" onClick={() => chain().extendMarkRange('link').unsetLink().run()}><Unlink className="h-4 w-4" /></Btn>}
          <MediaSourcePicker onSelect={url => chain().setImage({ src: url }).run()} accept="image/*" resourceType="image" folder={folder}
            label="Chèn ảnh từ Kho lưu trữ hoặc tải lên" compact icon={ImageIcon}
            className="grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900" />
          <MediaSourcePicker multiple onSelect={url => chain().setImage({ src: url }).run()}
            onSelectMultiple={urls => { const c = chain(); urls.forEach(u => c.setImage({ src: u })); c.run(); }}
            accept="image/*" resourceType="image" folder={folder} label="Chèn nhiều ảnh cùng lúc" compact icon={Images}
            className="grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900" />
          <MediaSourcePicker onSelect={url => chain().insertVideo({ kind: 'file', src: url }).run()} accept="video/*" resourceType="video" folder={folder}
            label="Chèn video từ Kho lưu trữ hoặc tải lên" compact icon={VideoIcon}
            className="grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900" />
          <Btn title="Nhúng video YouTube, Vimeo, Google Drive" onClick={insertEmbed}><Youtube className="h-4 w-4" /></Btn>
          <Pop title="Chèn bảng" width="w-auto" trigger={<><TableIcon className="h-4 w-4" /><ChevronDown className="h-3 w-3" /></>}>
            {close => <TableGrid onPick={(r, c) => { chain().insertTable({ rows: r, cols: c, withHeaderRow: true }).run(); close(); }} />}
          </Pop>
          <span className="flex-1" />
          <Btn title={source === null ? 'Xem và sửa mã HTML' : 'Quay lại soạn thảo'} onClick={toggleSource} active={source !== null}><FileCode2 className="h-4 w-4" /></Btn>
          <Btn title={full ? 'Thu nhỏ (Esc)' : 'Soạn toàn màn hình'} onClick={() => setFull(f => !f)}>{full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Btn>
        </div>

        {/* Thanh phụ khi đang chọn ảnh */}
        {imgSel && imgAttrs && source === null && (
          <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 bg-white px-2 py-1.5 text-xs">
            <span className="mr-1 font-semibold text-slate-500">Ảnh</span>
            {['25%', '33%', '50%', '75%', '100%'].map(w => (
              <button key={w} type="button" onClick={() => chain().updateAttributes('image', { width: w }).run()}
                className={`h-7 rounded-lg px-2 font-semibold ${imgAttrs.width === w ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-100'}`}>{w}</button>
            ))}
            <Sep />
            <Btn title="Đặt bên trái" onClick={() => chain().updateAttributes('image', { align: 'left' }).run()} active={imgAttrs.align === 'left'}><AlignLeft className="h-4 w-4" /></Btn>
            <Btn title="Đặt giữa" onClick={() => chain().updateAttributes('image', { align: 'center' }).run()} active={imgAttrs.align === 'center'}><AlignCenter className="h-4 w-4" /></Btn>
            <Btn title="Đặt bên phải" onClick={() => chain().updateAttributes('image', { align: 'right' }).run()} active={imgAttrs.align === 'right'}><AlignRight className="h-4 w-4" /></Btn>
            <Btn title="Ảnh bên trái, chữ chạy bên phải" onClick={() => chain().updateAttributes('image', { align: 'floatLeft', width: imgAttrs.width === '100%' ? '40%' : imgAttrs.width }).run()} active={imgAttrs.align === 'floatLeft'}><PanelLeft className="h-4 w-4" /></Btn>
            <Btn title="Ảnh bên phải, chữ chạy bên trái" onClick={() => chain().updateAttributes('image', { align: 'floatRight', width: imgAttrs.width === '100%' ? '40%' : imgAttrs.width }).run()} active={imgAttrs.align === 'floatRight'}><PanelRight className="h-4 w-4" /></Btn>
            <Sep />
            <button type="button" onClick={async () => { const alt = await askText({ title: 'Mô tả ảnh', label: 'Giúp Google hiểu ảnh và hỗ trợ người khiếm thị.', defaultValue: imgAttrs.alt || '', okText: 'Lưu' }); if (alt !== null) chain().updateAttributes('image', { alt }).run(); }}
              className="h-7 rounded-lg px-2 font-semibold text-slate-600 hover:bg-slate-100">Mô tả ảnh</button>
            <button type="button" onClick={insertImageUrl} className="h-7 rounded-lg px-2 font-semibold text-slate-600 hover:bg-slate-100">Thêm ảnh bằng link</button>
            <Btn title="Xoá ảnh" onClick={() => chain().deleteSelection().run()}><Trash2 className="h-4 w-4 text-rose-500" /></Btn>
          </div>
        )}

        {/* Thanh phụ khi con trỏ nằm trong bảng */}
        {inTable && source === null && (
          <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600">
            <span className="mr-1 text-slate-500">Bảng</span>
            {[
              ['Thêm hàng trên', () => chain().addRowBefore().run()], ['Thêm hàng dưới', () => chain().addRowAfter().run()], ['Xoá hàng', () => chain().deleteRow().run()],
              ['Thêm cột trái', () => chain().addColumnBefore().run()], ['Thêm cột phải', () => chain().addColumnAfter().run()], ['Xoá cột', () => chain().deleteColumn().run()],
              ['Gộp hoặc tách ô', () => chain().mergeOrSplit().run()], ['Hàng tiêu đề', () => chain().toggleHeaderRow().run()],
            ].map(([label, fn]) => (
              <button key={label as string} type="button" onClick={fn as () => void} className="h-7 rounded-lg px-2 hover:bg-slate-100">{label as string}</button>
            ))}
            <button type="button" onClick={() => chain().deleteTable().run()} className="h-7 rounded-lg px-2 text-rose-600 hover:bg-rose-50">Xoá bảng</button>
          </div>
        )}
      </div>

      {/* Vùng soạn */}
      <div className={`relative ${full ? 'flex-1 overflow-y-auto bg-slate-50' : autoHeight ? '' : 'overflow-y-auto scrollbar-thin'}`} style={full ? undefined : autoHeight ? { minHeight } : { minHeight, maxHeight }}>
        <div className={full ? 'mx-auto my-6 min-h-[calc(100%-3rem)] max-w-4xl rounded-2xl border border-slate-100 bg-white shadow-sm' : ''}>
          {source !== null ? (
            <textarea value={source} onChange={e => setSource(e.target.value)} spellCheck={false}
              className="block w-full resize-none bg-slate-900 p-4 font-mono text-xs leading-6 text-emerald-100 outline-none" style={{ minHeight: full ? '80vh' : minHeight }} />
          ) : (
            <EditorContent editor={editor} className="rte-content" />
          )}
        </div>
        {(uploading > 0 || importing > 0) && (
          <div className={`pointer-events-none ${autoHeight ? 'fixed bottom-6 left-1/2 -translate-x-1/2' : 'absolute right-3 top-3'} z-30 flex items-center gap-2 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white`}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {uploading > 0 ? `Đang tải lên ${uploading} tệp` : `Đang chép ${importing} ảnh về Kho lưu trữ`}
          </div>
        )}
      </div>

      {/* Chân trình soạn */}
      <div className={`flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 ${autoHeight && !full ? 'rounded-b-xl' : ''}`}>
        <span className="hidden sm:inline">Dán hoặc kéo thả ảnh vào để tải lên. Ảnh dán từ trang khác tự chép về Kho lưu trữ.</span>
        <span className="shrink-0">{words} từ, {chars} ký tự, khoảng {Math.max(1, Math.round(words / 200))} phút đọc</span>
        {full && <button type="button" onClick={() => setFull(false)} className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 font-semibold text-slate-600 shadow-sm"><X className="h-3.5 w-3.5" /> Đóng</button>}
      </div>

      <style>{`
        .rte-content .ProseMirror { min-height: ${full ? '70vh' : `calc(${minHeight} - 2rem)`}; }
        .rte-content .ProseMirror p.is-editor-empty:first-child::before { color: #94a3b8; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .rte-content .ProseMirror img { cursor: pointer; }
        .rte-content .ProseMirror img.ProseMirror-selectednode { outline: 3px solid var(--color-brand, #10b981); outline-offset: 2px; }
        .rte-content .ProseMirror table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .rte-content .ProseMirror td, .rte-content .ProseMirror th { border: 1px solid #e2e8f0; padding: 6px 10px; vertical-align: top; position: relative; }
        .rte-content .ProseMirror th { background: #f8fafc; }
        .rte-content .ProseMirror .selectedCell::after { content: ''; position: absolute; inset: 0; background: rgba(16,185,129,0.12); pointer-events: none; }
        .rte-content .ProseMirror::after { content: ''; display: block; clear: both; }
      `}</style>
    </div>
  );
}
