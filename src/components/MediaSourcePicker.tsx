import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CloudUpload, File, Image as ImageIcon, Images, Loader2, Search, Upload, Video, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { CloudinaryResourceType, uploadMediaToCloudinary } from '../lib/upload';

interface LibraryItem {
  public_id: string;
  url: string;
  resource_type: string;
  original_filename?: string | null;
  folder?: string | null;
  created_at?: string | null;
}

interface MediaSourcePickerProps {
  onSelect: (url: string) => void;
  onSelectMultiple?: (urls: string[]) => void;
  accept?: string;
  resourceType?: CloudinaryResourceType;
  folder?: string;
  category?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
  compact?: boolean;
}

export default function MediaSourcePicker({
  onSelect,
  onSelectMultiple,
  accept = 'image/*',
  resourceType = 'image',
  folder = 'shared_library',
  category = 'Chung',
  multiple = false,
  disabled = false,
  label = 'Chọn ảnh',
  className = '',
  compact = false
}: MediaSourcePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'choice' | 'library' | 'upload'>('choice');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setMode('choice');
    setSelected([]);
    setSearch('');
    setError('');
  };

  useEffect(() => {
    if (!open || mode !== 'library') return;
    let active = true;
    setLoading(true);
    setError('');
    Promise.allSettled([
      supabase.from('media_library').select('public_id,url,resource_type,original_filename,folder,created_at').order('created_at', { ascending: false }),
      getDocs(query(collection(db, 'uploaded_images'), orderBy('uploadedAt', 'desc')))
    ]).then(results => {
      if (!active) return;
      const merged = new Map<string, LibraryItem>();
      const supabaseResult = results[0];
      if (supabaseResult.status === 'fulfilled') {
        const { data, error: loadError } = supabaseResult.value;
        if (loadError) setError(`Không tải được một phần thư viện: ${loadError.message}`);
        (data || []).forEach(item => item.url && merged.set(item.url, item));
      }
      const firestoreResult = results[1];
      if (firestoreResult.status === 'fulfilled') {
        firestoreResult.value.docs.forEach(snapshot => {
          const item = snapshot.data();
          if (!item.url || merged.has(item.url)) return;
          merged.set(item.url, {
            public_id: snapshot.id,
            url: item.url,
            resource_type: item.type || 'image',
            original_filename: item.originalFilename || item.category || 'Tệp thư viện',
            folder: item.category || 'Thư viện chung',
            created_at: item.uploadedAt?.toDate?.()?.toISOString?.() || null
          });
        });
      }
      if (!merged.size && results.every(result => result.status === 'rejected')) setError('Không thể kết nối Thư viện dùng chung.');
      setItems(Array.from(merged.values()));
      setLoading(false);
    });
    return () => { active = false; };
  }, [open, mode]);

  const wantedType = resourceType === 'auto'
    ? (accept.includes('image') ? 'image' : accept.includes('video') ? 'video' : '')
    : resourceType;

  const filtered = useMemo(() => items.filter(item => {
    const typeMatches = !wantedType || wantedType === 'auto' || item.resource_type === wantedType;
    const text = `${item.original_filename || ''} ${item.folder || ''} ${item.public_id}`.toLowerCase();
    return typeMatches && text.includes(search.toLowerCase());
  }), [items, search, wantedType]);

  const choose = (url: string) => {
    if (!multiple) {
      onSelect(url);
      close();
      return;
    }
    setSelected(current => current.includes(url) ? current.filter(value => value !== url) : [...current, url]);
  };

  const confirmMultiple = () => {
    if (selected.length) {
      if (onSelectMultiple) onSelectMultiple(selected);
      else onSelect(selected[0]);
    }
    close();
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const urls = await Promise.all(files.map(file => uploadMediaToCloudinary(file, { resourceType, folder, category })));
      if (multiple && onSelectMultiple) onSelectMultiple(urls);
      else onSelect(urls[0]);
      close();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Không thể tải tệp mới.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => { setOpen(true); setMode('choice'); }}
        className={className || `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover disabled:bg-slate-400 ${compact ? 'h-9 w-9 p-0' : ''}`}
        title={label}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
        {!compact && <span>{uploading ? 'Đang tải' : label}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Chọn media" onMouseDown={event => event.target === event.currentTarget && close()}>
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-black text-slate-800">Chọn ảnh hoặc tệp</h3>
                <p className="mt-0.5 text-xs text-slate-500">Dùng lại nội dung trong thư viện hoặc tải tệp mới lên hệ thống.</p>
              </div>
              <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Đóng"><X className="h-4 w-4" /></button>
            </div>

            {mode === 'choice' && (
              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
                <button type="button" onClick={() => setMode('library')} className="group flex min-h-44 flex-col items-center justify-center rounded-2xl bg-brand-light p-6 text-center transition hover:bg-brand/15">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand shadow-sm"><Images className="h-7 w-7" /></span>
                  <strong className="mt-4 text-sm text-slate-800">Chọn từ Thư viện</strong>
                  <span className="mt-1 text-xs leading-5 text-slate-500">Dùng lại ảnh, video hoặc tài liệu đã có trên hệ thống.</span>
                </button>
                <button type="button" onClick={() => setMode('upload')} className="group flex min-h-44 flex-col items-center justify-center rounded-2xl bg-slate-50 p-6 text-center transition hover:bg-slate-100">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm"><CloudUpload className="h-7 w-7" /></span>
                  <strong className="mt-4 text-sm text-slate-800">Tải tệp mới</strong>
                  <span className="mt-1 text-xs leading-5 text-slate-500">Chọn tệp từ máy và tải lên Cloudinary dùng chung.</span>
                </button>
              </div>
            )}

            {mode === 'library' && (
              <div className="flex min-h-0 flex-1 flex-col p-5">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setMode('choice')} className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600">Quay lại</button>
                  <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc thư mục..." className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-xs outline-none ring-1 ring-slate-200 focus:ring-brand" /></label>
                </div>
                <div className="mt-4 min-h-60 flex-1 overflow-y-auto">
                  {loading ? <div className="grid min-h-60 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div> : filtered.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {filtered.map(item => {
                        const isSelected = selected.includes(item.url);
                        return <button key={item.public_id} type="button" onClick={() => choose(item.url)} className={`relative overflow-hidden rounded-2xl bg-slate-50 text-left ring-2 transition ${isSelected ? 'ring-brand' : 'ring-transparent hover:ring-brand/30'}`}>
                          <div className="aspect-square bg-slate-100">
                            {item.resource_type === 'image' ? <img src={item.url} alt={item.original_filename || 'Ảnh thư viện'} className="h-full w-full object-cover" /> : item.resource_type === 'video' ? <div className="grid h-full place-items-center text-brand"><Video className="h-9 w-9" /></div> : <div className="grid h-full place-items-center text-slate-500"><File className="h-9 w-9" /></div>}
                          </div>
                          <div className="truncate px-2.5 py-2 text-[10px] font-bold text-slate-600">{item.original_filename || item.public_id.split('/').pop()}</div>
                          {isSelected && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-brand text-white"><Check className="h-3.5 w-3.5" /></span>}
                        </button>;
                      })}
                    </div>
                  ) : <div className="grid min-h-60 place-items-center rounded-2xl bg-slate-50 text-center"><div><ImageIcon className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-xs font-bold text-slate-500">Chưa có nội dung phù hợp trong thư viện</p></div></div>}
                </div>
                {multiple && <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs font-semibold text-slate-500">Đã chọn {selected.length} tệp</span><button type="button" disabled={!selected.length} onClick={confirmMultiple} className="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white disabled:bg-slate-300">Dùng các tệp đã chọn</button></div>}
              </div>
            )}

            {mode === 'upload' && (
              <div className="p-5 sm:p-7">
                <button type="button" onClick={() => setMode('choice')} className="mb-4 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600">Quay lại</button>
                <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void uploadFiles(Array.from(event.dataTransfer.files)); }}>
                  {uploading ? <Loader2 className="h-10 w-10 animate-spin text-brand" /> : <Upload className="h-10 w-10 text-brand" />}
                  <p className="mt-4 text-sm font-black text-slate-700">{uploading ? 'Đang tải lên Cloudinary...' : 'Kéo thả tệp vào đây'}</p>
                  <p className="mt-1 text-xs text-slate-400">hoặc chọn từ thiết bị của bạn</p>
                  <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white disabled:bg-slate-400">Chọn tệp mới</button>
                  <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={event => void uploadFiles(event.target.files ? Array.from(event.target.files) : [])} />
                </div>
              </div>
            )}
            {error && <p className="px-5 pb-4 text-xs font-semibold text-rose-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
