import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, CloudOff, FileText, Hash, Image as ImageIcon, Link2, Loader2, RotateCcw, Save, Send, Sparkles, Star, Tag, X } from 'lucide-react';
import { PortfolioCategory } from '../../lib/portfolioData';
import { auth } from '../../lib/firebase';
import CloudinaryUploadField from './CloudinaryUploadField';
import RichTextEditor from './RichTextEditor';

// Trang soạn nội dung chuẩn của EduGo (bài viết, dự án...).
// Bên trái: tiêu đề và trình soạn thảo. Bên phải: xuất bản, ngày đăng, ảnh đại diện, chuyên mục,
// mô tả ngắn, hashtag và các thẻ riêng của từng loại nội dung.
// Chống mất bài: mọi thay đổi được giữ ngay trên máy (kể cả khi web treo, tải lại hay mất mạng),
// nội dung đang là bản nháp còn tự lưu lên máy chủ sau vài giây ngừng gõ.

export interface ComposerItem {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  category: string;
  tags: string[];
  status: string;
  publishDate: string;
  isFeatured: boolean;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
const AUTOSAVE_MS = 8000;
const EXCERPT_MAX = 200;

export const toSlug = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
export const plainText = (html: string) => {
  try { return (new DOMParser().parseFromString(html || '', 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim(); }
  catch { return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
};
export const hasBody = (html: string) => /<(img|video|iframe|table)\b/i.test(html || '') || !!plainText(html);
const timeLabel = (t: number) => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

interface Backup<T> { post: T; at: number }
const readBackup = <T,>(key: string): Backup<T> | null => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const writeBackup = <T,>(key: string, b: Backup<T>) => { try { localStorage.setItem(key, JSON.stringify(b)); } catch { /* bộ nhớ đầy hoặc bị chặn */ } };
const dropBackup = (key: string) => { try { localStorage.removeItem(key); } catch { /* bỏ qua */ } };
// So sánh nội dung, bỏ qua lượt xem để không coi là có thay đổi.
const sameContent = (a: unknown, b: unknown) => JSON.stringify({ ...(a as object), viewCount: 0 }) === JSON.stringify({ ...(b as object), viewCount: 0 });

export const composerCard = 'rounded-2xl border border-slate-100 bg-white p-4 shadow-sm';
export const composerField = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:bg-white';

export function CardTitle({ icon: Icon, children, extra }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-700"><Icon className="h-4 w-4 text-brand" /> {children}</p>
      {extra}
    </div>
  );
}

// Ô nhập dạng thẻ: gõ rồi Enter hoặc dấu phẩy để thêm (hashtag, công cụ...).
export function TagInput({ tags, onChange, prefix = '#', placeholder = 'thietke, truyenthong' }: { tags: string[]; onChange: (t: string[]) => void; prefix?: string; placeholder?: string }) {
  const [v, setV] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(/[,\n]/).map(x => x.trim().replace(/^#+/, '')).map(x => (prefix === '#' ? x.replace(/\s+/g, '') : x)).filter(Boolean);
    if (!parts.length) { setV(''); return; }
    onChange(Array.from(new Set([...tags, ...parts])).slice(0, 30));
    setV('');
  };
  return (
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 focus-within:border-brand focus-within:bg-white">
      {tags.map(t => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
          {prefix}{t}
          <button type="button" aria-label={`Bỏ ${t}`} onClick={() => onChange(tags.filter(x => x !== t))} className="rounded hover:bg-brand/10"><X className="h-3 w-3" /></button>
        </span>
      ))}
      <input value={v} onChange={e => { if (/[,\n]/.test(e.target.value)) add(e.target.value); else setV(e.target.value); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); add(v); }
          else if (e.key === 'Backspace' && !v && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={() => add(v)} placeholder={tags.length ? '' : placeholder} className="min-w-[90px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none" />
    </div>
  );
}

export interface ContentComposerProps<T extends ComposerItem> {
  kind: 'post' | 'project';
  item: T;
  isNew: boolean;
  contentKey: keyof T & string;
  excerptKey: keyof T & string;
  save: (item: T) => Promise<boolean>;
  categories: PortfolioCategory[];
  onManageCategories: () => void;
  onSaved: (item: T, opts: { auto: boolean }) => void;
  onClose: () => void;
  folder: string;
  labels: { noun: string; titlePlaceholder: string; back: string; editorPlaceholder: string };
  // Thẻ riêng bên cột phải (ví dụ thông tin dự án) và khối riêng dưới trình soạn (ví dụ bộ ảnh dự án).
  renderSideCards?: (draft: T, set: (p: Partial<T>) => void) => React.ReactNode;
  renderBelowEditor?: (draft: T, set: (p: Partial<T>) => void) => React.ReactNode;
}

export default function ContentComposer<T extends ComposerItem>(props: ContentComposerProps<T>) {
  const { kind, item, isNew, contentKey, excerptKey, save, categories, onManageCategories, onSaved, onClose, folder, labels, renderSideCards, renderBelowEditor } = props;
  const uid = auth.currentUser?.uid || 'guest';
  const backupKey = (id: string) => `edugo_${kind}_draft:${uid}:${id}`;
  const pointerKey = `edugo_${kind}_draft_last:${uid}`;
  const [draft, setDraft] = useState<T>(item);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [slugTouched, setSlugTouched] = useState(!isNew && !!item.slug);
  const serverCopy = useRef<T>(item);
  const existsOnServer = useRef(!isNew);
  const draftRef = useRef(draft); draftRef.current = draft;
  const body = (d: T) => String(d[contentKey] || '');
  const excerpt = String(draft[excerptKey] || '');

  // Bản soạn dở còn trên máy: của chính nội dung này, hoặc nội dung mới chưa lưu lần trước.
  const [recover, setRecover] = useState<Backup<T> | null>(() => {
    const own = readBackup<T>(backupKey(item.id));
    if (own && !sameContent(own.post, item)) return own;
    if (isNew) {
      try {
        const lastId = localStorage.getItem(pointerKey);
        const last = lastId ? readBackup<T>(backupKey(lastId)) : null;
        if (last && (last.post.title || hasBody(body(last.post)))) return last;
      } catch { /* bỏ qua */ }
    }
    return null;
  });

  const dirty = !sameContent(draft, serverCopy.current);
  const set = (patch: Partial<T>) => setDraft(d => {
    const next = { ...d, ...patch };
    if (patch.title !== undefined && !slugTouched) next.slug = toSlug(String(patch.title));
    return next;
  });

  // 1. Giữ bản sao trên máy ngay khi có thay đổi.
  useEffect(() => {
    if (!dirty) return;
    setSaveState(s => (s === 'saving' ? s : 'dirty'));
    const t = setTimeout(() => {
      writeBackup(backupKey(draft.id), { post: draft, at: Date.now() });
      if (!existsOnServer.current) { try { localStorage.setItem(pointerKey, draft.id); } catch { /* bỏ qua */ } }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty, uid]);
  // Ghi ngay khi rời trang hoặc chuyển thẻ trình duyệt.
  useEffect(() => {
    const flush = () => {
      const d = draftRef.current;
      if (!sameContent(d, serverCopy.current)) writeBackup(backupKey(d.id), { post: d, at: Date.now() });
    };
    const vis = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', vis);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const persist = async (next: T, auto: boolean): Promise<boolean> => {
    setSaveState('saving'); setError('');
    const normalized: T = { ...next, slug: next.slug.trim() || toSlug(next.title) || next.id };
    const ok = await save(normalized).catch(() => false);
    if (!ok) { setSaveState('error'); if (!auto) setError(`Chưa lưu được lên máy chủ. ${labels.noun[0].toUpperCase()}${labels.noun.slice(1)} vẫn được giữ trên máy này, hãy thử lại khi mạng ổn định.`); return false; }
    serverCopy.current = normalized;
    existsOnServer.current = true;
    setSavedAt(Date.now());
    setSaveState('saved');
    if (sameContent(normalized, draftRef.current)) {
      dropBackup(backupKey(normalized.id));
      try { if (localStorage.getItem(pointerKey) === normalized.id) localStorage.removeItem(pointerKey); } catch { /* bỏ qua */ }
    }
    onSaved(normalized, { auto });
    return true;
  };

  // 2. Bản nháp tự lưu lên máy chủ sau vài giây ngừng gõ. Nội dung đã xuất bản chỉ giữ trên máy tới khi bấm Cập nhật.
  useEffect(() => {
    if (!dirty || draft.status !== 'draft' || recover) return;
    if (!draft.title.trim() && !hasBody(body(draft))) return;
    const t = setTimeout(() => { persist(draftRef.current, true); }, AUTOSAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty, recover]);

  const saveAs = async (status: string) => {
    const next = { ...draft, status } as T;
    if (status !== 'draft') {
      if (!next.title.trim()) { setError(`${labels.noun[0].toUpperCase()}${labels.noun.slice(1)} chưa có tiêu đề.`); return; }
      if (!hasBody(body(next))) { setError(`${labels.noun[0].toUpperCase()}${labels.noun.slice(1)} chưa có nội dung.`); return; }
    } else if (!next.title.trim() && !hasBody(body(next))) { setError('Còn trống, chưa có gì để lưu.'); return; }
    setDraft(next);
    const ok = await persist(next, false);
    if (ok && status === 'published') onClose();
  };

  const doRecover = () => {
    if (!recover) return;
    setDraft(recover.post);
    if (recover.post.id !== item.id) existsOnServer.current = false;
    setSlugTouched(!!recover.post.slug && recover.post.slug !== toSlug(recover.post.title));
    setEditorKey(k => k + 1);
    setRecover(null);
  };
  const discardRecover = () => {
    if (!recover) return;
    dropBackup(backupKey(recover.post.id));
    try { if (localStorage.getItem(pointerKey) === recover.post.id) localStorage.removeItem(pointerKey); } catch { /* bỏ qua */ }
    setRecover(null);
  };

  const words = useMemo(() => plainText(body(draft)).split(' ').filter(Boolean).length, [draft, contentKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const statusLabel = ({ draft: 'Bản nháp', published: 'Đã xuất bản', hidden: 'Đang ẩn' } as Record<string, string>)[draft.status] || 'Bản nháp';
  const saveLine = saveState === 'saving' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</>
    : saveState === 'error' ? <><CloudOff className="h-3.5 w-3.5 text-amber-600" /> Chưa lên máy chủ, đã giữ trên máy</>
    : dirty ? <><Save className="h-3.5 w-3.5" /> {draft.status === 'draft' ? 'Có thay đổi, sẽ tự lưu nháp' : 'Có thay đổi chưa cập nhật, đã giữ trên máy'}</>
    : savedAt ? <><Check className="h-3.5 w-3.5 text-brand" /> Đã lưu lúc {timeLabel(savedAt)}</>
    : <><Check className="h-3.5 w-3.5 text-brand" /> Chưa có thay đổi</>;
  const published = serverCopy.current.status === 'published' && existsOnServer.current;
  const card = composerCard; const fieldCls = composerField;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> {labels.back}
        </button>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">{saveLine}</span>
          <span className={`rounded-full px-2.5 py-1 font-semibold ${draft.status === 'published' ? 'bg-brand-light text-brand' : draft.status === 'hidden' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>{statusLabel}</span>
        </div>
      </div>

      {recover && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-[13px] text-amber-800">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Có bản đang soạn dở chưa lưu{recover.post.title ? <> của <b>{recover.post.title}</b></> : ''}, giữ trên máy lúc {timeLabel(recover.at)} ngày {new Date(recover.at).toLocaleDateString('vi-VN')}.</span>
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={discardRecover} className="h-9 rounded-xl bg-white px-3 text-[13px] font-semibold text-slate-600">Bỏ bản này</button>
            <button type="button" onClick={doRecover} className="h-9 rounded-xl bg-amber-600 px-3 text-[13px] font-semibold text-white hover:bg-amber-700">Khôi phục</button>
          </div>
        </div>
      )}

      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-[13px] font-semibold text-rose-600">{error}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className={card}>
            <textarea value={draft.title} onChange={e => set({ title: e.target.value.replace(/\n/g, ' ') } as Partial<T>)} rows={1}
              placeholder={labels.titlePlaceholder} aria-label={labels.titlePlaceholder}
              onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
              className="block w-full resize-none overflow-hidden bg-transparent text-2xl font-bold leading-snug text-slate-900 outline-none placeholder:text-slate-300 sm:text-3xl" />
            <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-slate-400"><Link2 className="h-3.5 w-3.5 shrink-0" /> …/{draft.slug || toSlug(draft.title) || 'duong-dan'}</p>
          </div>
          <RichTextEditor key={`${draft.id}-${editorKey}`} value={body(draft)} onChange={html => setDraft(d => ({ ...d, [contentKey]: html }))}
            placeholder={labels.editorPlaceholder} minHeight="520px" autoHeight folder={folder} />
          {renderBelowEditor?.(draft, set)}
        </div>

        <aside className="space-y-4">
          <section className={card}>
            <CardTitle icon={Send}>Xuất bản</CardTitle>
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Ngày đăng</span>
                <input type="date" value={draft.publishDate || ''} onChange={e => set({ publishDate: e.target.value } as Partial<T>)} className={fieldCls} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Trạng thái</span>
                <select value={['draft', 'published', 'hidden'].includes(draft.status) ? draft.status : 'draft'} onChange={e => set({ status: e.target.value } as Partial<T>)} className={fieldCls}>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="hidden">Ẩn khỏi Website</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700">
                <span className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Nổi bật</span>
                <input type="checkbox" checked={draft.isFeatured} onChange={e => set({ isFeatured: e.target.checked } as Partial<T>)} className="h-4 w-4 accent-brand" />
              </label>
              <p className="text-xs text-slate-400">{words} từ, khoảng {Math.max(1, Math.round(words / 200))} phút đọc</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => saveAs('draft')} disabled={saveState === 'saving'}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:border-brand/40 hover:text-brand disabled:opacity-50">
                  <Save className="h-4 w-4" /> {published ? 'Về nháp' : 'Lưu nháp'}
                </button>
                <button type="button" onClick={() => saveAs(draft.status === 'hidden' ? 'hidden' : 'published')} disabled={saveState === 'saving'}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                  {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {draft.status === 'hidden' ? 'Lưu' : published ? 'Cập nhật' : 'Xuất bản'}
                </button>
              </div>
            </div>
          </section>

          <section className={card}>
            <CardTitle icon={ImageIcon}>Ảnh đại diện</CardTitle>
            <CloudinaryUploadField label="" value={draft.coverImage} onChange={coverImage => set({ coverImage } as Partial<T>)} accept="image/*" resourceType="image" folder={folder} hint="Ảnh ngang, hiện ở danh sách và khi chia sẻ link." compact />
          </section>

          <section className={card}>
            <CardTitle icon={Tag} extra={<button type="button" onClick={onManageCategories} className="text-xs font-semibold text-brand hover:underline">Quản lý</button>}>Chuyên mục</CardTitle>
            <select value={draft.category} onChange={e => set({ category: e.target.value } as Partial<T>)} className={fieldCls}>
              {categories.length === 0 && <option value={draft.category || 'Tin tức'}>{draft.category || 'Tin tức'}</option>}
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              {draft.category && categories.length > 0 && !categories.some(c => c.name === draft.category) && <option value={draft.category}>{draft.category}</option>}
            </select>
          </section>

          <section className={card}>
            <CardTitle icon={FileText} extra={<span className={`text-xs ${excerpt.length > EXCERPT_MAX ? 'font-semibold text-amber-600' : 'text-slate-400'}`}>{excerpt.length}/{EXCERPT_MAX}</span>}>Mô tả ngắn</CardTitle>
            <textarea value={excerpt} onChange={e => set({ [excerptKey]: e.target.value } as Partial<T>)} rows={4} placeholder="Vài câu tóm tắt, hiện dưới tiêu đề và khi chia sẻ link." className={`${fieldCls} resize-none`} />
            <button type="button" onClick={() => { const t = plainText(body(draft)); set({ [excerptKey]: t.length > 180 ? `${t.slice(0, 180).replace(/\s+\S*$/, '')}...` : t } as Partial<T>); }} disabled={!hasBody(body(draft))}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" /> Lấy từ đầu nội dung</button>
          </section>

          <section className={card}>
            <CardTitle icon={Hash}>Từ khoá, hashtag</CardTitle>
            <TagInput tags={draft.tags} onChange={tags => set({ tags } as Partial<T>)} />
            <p className="mt-1.5 text-xs text-slate-400">Gõ rồi bấm Enter hoặc dấu phẩy để thêm.</p>
          </section>

          {renderSideCards?.(draft, set)}

          <section className={card}>
            <CardTitle icon={Link2}>Đường dẫn</CardTitle>
            <input value={draft.slug} onChange={e => { setSlugTouched(true); set({ slug: toSlug(e.target.value) } as Partial<T>); }} placeholder="tu-tao-theo-tieu-de" className={fieldCls} />
          </section>
        </aside>
      </div>
    </div>
  );
}
