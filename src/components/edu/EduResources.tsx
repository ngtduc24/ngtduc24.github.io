import React, { useRef, useState } from 'react';
import { Paperclip, Link2, Upload, Trash2, Download, ExternalLink, Loader2, FileArchive, ArrowUp, ArrowDown, Check, X } from 'lucide-react';
import { EduResource } from '../../types/edu';
import { uploadMediaToCloudinary } from '../../lib/upload';
import { useNotifications } from '../NotificationContext';

// Tài nguyên thực hành của bài tập: giảng viên tải tệp lên hoặc dán link, sinh viên bấm để tải về.

const MAX_UPLOAD = 100 * 1024 * 1024; // tệp lớn hơn nên để trên Google Drive, OneDrive rồi dán link

export const fmtSize = (b?: number) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const newId = () => Math.random().toString(36).slice(2, 10);

const normalizeUrl = (raw: string) => {
  const s = raw.trim();
  if (!s) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : 'https://' + s;
};

const nameFromUrl = (url: string) => {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
    return last && /\.[a-z0-9]{2,5}$/i.test(last) ? last : u.hostname.replace(/^www\./, '');
  } catch { return 'Tài nguyên'; }
};

// Link chia sẻ Google Drive dạng /file/d/ID/view đổi sang link tải thẳng.
const directDriveUrl = (url: string) => {
  const m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/) || url.match(/drive\.google\.com\/open\?id=([^&#]+)/);
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : url;
};

const extOf = (name: string) => (name.match(/\.([a-z0-9]{1,6})$/i)?.[1] || '').toUpperCase();

// Tải tệp về đúng tên gốc. Tệp trên Cloudinary tải qua blob để giữ tên, link ngoài mở tab mới.
export async function downloadResource(r: EduResource) {
  if (r.kind === 'file' && /res\.cloudinary\.com/.test(r.url)) {
    try {
      const resp = await fetch(r.url);
      if (!resp.ok) throw new Error(String(resp.status));
      const blob = await resp.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href; a.download = r.name || nameFromUrl(r.url);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10000);
      return;
    } catch { /* mở trực tiếp bên dưới */ }
  }
  window.open(r.kind === 'link' ? directDriveUrl(r.url) : r.url, '_blank', 'noopener,noreferrer');
}

// ------------------------------------------------------------------
// Khung soạn tài nguyên trong màn tạo bài tập và ngân hàng bài tập
// ------------------------------------------------------------------
export function EduResourceEditor({ value, onChange, className }: { value: EduResource[]; onChange: (v: EduResource[]) => void; className?: string }) {
  const { addNotification } = useNotifications();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [addingLink, setAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const list = value || [];
  // Giữ danh sách mới nhất khi nhiều tệp tải lên cùng lúc
  const latest = useRef(list);
  latest.current = list;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      if (f.size > MAX_UPLOAD) {
        addNotification(`Tệp ${f.name} lớn hơn 100 MB. Hãy tải lên Google Drive hoặc OneDrive rồi dùng Thêm link.`, 'warning');
        continue;
      }
      setUploading(u => [...u, f.name]);
      try {
        const resourceType = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'raw';
        const url = await uploadMediaToCloudinary(f, { resourceType, folder: 'edu_resources', noBase64Fallback: true });
        const next = [...latest.current, { id: newId(), name: f.name, url, kind: 'file' as const, size: f.size }];
        latest.current = next;
        onChange(next);
      } catch (e: any) {
        addNotification(`Không tải được ${f.name}: ${e?.message || e}. Có thể dùng Thêm link thay thế.`, 'error');
      } finally {
        setUploading(u => u.filter(n => n !== f.name));
      }
    }
  };

  const addLink = () => {
    const url = normalizeUrl(linkUrl);
    try { new URL(url); } catch { addNotification('Đường link không hợp lệ.', 'error'); return; }
    onChange([...list, { id: newId(), name: linkName.trim() || nameFromUrl(url), url, kind: 'link' }]);
    setLinkUrl(''); setLinkName(''); setAddingLink(false);
  };

  const rename = (id: string, name: string) => onChange(list.map(r => r.id === id ? { ...r, name } : r));
  const remove = (id: string) => onChange(list.filter(r => r.id !== id));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list]; [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };

  return (
    <div className={`space-y-2.5 ${className || ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-black text-slate-400 uppercase">Tài nguyên thực hành</label>
        <span className="text-[10px] text-slate-400">{list.length ? `${list.length} mục` : ''}</span>
      </div>

      {list.length > 0 && (
        <ul className="space-y-1.5">
          {list.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-brand">{r.kind === 'link' ? <Link2 className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}</span>
              <div className="min-w-0 flex-1">
                <input value={r.name} onChange={e => rename(r.id, e.target.value)} title="Tên hiển thị cho sinh viên" className="w-full truncate bg-transparent text-[11px] font-bold text-slate-700 outline-none focus:text-brand" />
                <p className="truncate text-[10px] text-slate-400">{r.kind === 'link' ? r.url : [extOf(r.name), fmtSize(r.size)].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Lên" className="rounded p-1 text-slate-400 hover:text-brand disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} title="Xuống" className="rounded p-1 text-slate-400 hover:text-brand disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                <button type="button" onClick={() => remove(r.id)} title="Gỡ" className="rounded p-1 text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {uploading.map(n => (
        <div key={n} className="flex items-center gap-2 rounded-xl border border-dashed border-brand/30 bg-brand/5 px-3 py-2 text-[11px] font-semibold text-brand">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> <span className="truncate">Đang tải {n}...</span>
        </div>
      ))}

      {addingLink ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
          <input autoFocus value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="Dán link tệp (Google Drive, OneDrive, Dropbox...)" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] outline-none focus:border-brand" />
          <input value={linkName} onChange={e => setLinkName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLink()} placeholder="Tên hiển thị (không bắt buộc)" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] outline-none focus:border-brand" />
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={() => { setAddingLink(false); setLinkUrl(''); setLinkName(''); }} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100"><X className="h-3.5 w-3.5" /> Hủy</button>
            <button type="button" onClick={addLink} disabled={!linkUrl.trim()} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Thêm</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-[10px] font-bold text-slate-600 transition-all hover:border-brand hover:text-brand"><Upload className="h-3.5 w-3.5" /> Tải tệp lên</button>
          <button type="button" onClick={() => setAddingLink(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-[10px] font-bold text-slate-600 transition-all hover:border-brand hover:text-brand"><Link2 className="h-3.5 w-3.5" /> Thêm link</button>
        </div>
      )}
      <p className="text-[10px] leading-snug text-slate-400">Tệp đến 100 MB tải lên trực tiếp. Tệp lớn hơn hãy để trên Google Drive, OneDrive rồi dán link, link Google Drive được đổi sang tải thẳng.</p>
      <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}

// ------------------------------------------------------------------
// Danh sách tài nguyên cho sinh viên bấm tải về
// ------------------------------------------------------------------
export function EduResourceList({ resources, title = 'Tài nguyên thực hành', className }: { resources?: EduResource[]; title?: string; className?: string }) {
  const [busy, setBusy] = useState('');
  const list = resources || [];
  if (!list.length) return null;
  const get = async (r: EduResource) => {
    setBusy(r.id);
    try { await downloadResource(r); } finally { setBusy(''); }
  };
  return (
    <div className={`space-y-3 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <FileArchive className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="text-[12px] text-slate-400">{list.length} mục</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {list.map(r => (
          <button key={r.id} type="button" onClick={() => get(r)} disabled={busy === r.id} title={r.kind === 'link' ? 'Mở link tải tài nguyên' : 'Tải tệp về máy'}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-all hover:border-brand/40 hover:bg-brand/5 disabled:opacity-60">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-light text-[10px] font-black text-brand">
              {r.kind === 'link' ? <Link2 className="h-4 w-4" /> : (extOf(r.name) || <Paperclip className="h-4 w-4" />)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-slate-800 group-hover:text-brand">{r.name}</span>
              <span className="block truncate text-[11px] text-slate-400">{r.kind === 'link' ? (() => { try { return new URL(r.url).hostname.replace(/^www\./, ''); } catch { return 'Link'; } })() : fmtSize(r.size) || 'Tệp'}</span>
            </span>
            <span className="shrink-0 text-slate-400 group-hover:text-brand">
              {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : r.kind === 'link' ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
