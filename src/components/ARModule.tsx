import React, { useState, useEffect, useRef } from 'react';
import { QrCode, RefreshCw, Search, AlertCircle, X, Link2, ExternalLink, Download, Check, Plus, Loader2, Upload, Box, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadARAssetToSupabase } from '../lib/upload';

interface ARTarget {
  id: string;
  name: string;
  thumbnail_url?: string;
  description?: string;
  created_at?: string;
}

function ARDetailModal({ target, onClose }: { target: ARTarget; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);

  const arLink = `${window.location.origin}/?ar=${target.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(arLink)}&format=png&margin=10`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(arLink);
    } catch {
      const el = document.createElement('textarea');
      el.value = arLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    setQrDownloading(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_AR_${target.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(qrUrl, '_blank');
    } finally {
      setQrDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand" />
            <h2 className="text-base font-bold text-slate-800 truncate max-w-[260px]">{target.name}</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {target.thumbnail_url ? (
            <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img src={target.thumbnail_url} alt={target.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full h-44 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-slate-200">
              <QrCode className="w-12 h-12 text-slate-300" />
            </div>
          )}
          {target.description && <p className="text-xs text-slate-500 leading-relaxed">{target.description}</p>}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Link AR Scanner</p>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
              <span className="text-xs text-slate-600 truncate font-mono block">{arLink}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopy} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép!' : 'Share link'}
              </button>
              <button onClick={() => window.open(arLink, '_blank', 'noopener,noreferrer')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-brand text-white hover:bg-brand transition-all">
                <ExternalLink className="w-3.5 h-3.5" />
                Mở link
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">QR Code</p>
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <img src={qrUrl} alt={`QR ${target.name}`} width={180} height={180} className="rounded-lg" loading="lazy" />
              </div>
              <button onClick={handleDownloadQR} disabled={qrDownloading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-all disabled:opacity-60">
                <Download className="w-3.5 h-3.5" />
                {qrDownloading ? 'Đang tải...' : 'Tải QR về máy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ARDropZone({ label, hint, accept, previewUrl, kind, fileName, onFile }: { label: string; hint: string; accept: string; previewUrl: string; kind: string; fileName: string; onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => inputRef.current && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) onFile(f); }}
      className={'relative cursor-pointer rounded-2xl border-2 border-dashed min-h-[200px] flex items-center justify-center overflow-hidden transition-all ' + (drag ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-brand bg-slate-50')}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onFile(f); }} />
      {previewUrl ? (
        <>
          {kind === 'video' ? (
            <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover" muted />
          ) : kind === '3d' ? (
            <div className="text-center text-brand px-3"><Box className="w-12 h-12 mx-auto" /><p className="text-xs font-semibold mt-2 break-all">{fileName}</p></div>
          ) : (
            <img src={previewUrl} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute top-2 right-2 bg-brand text-white rounded-full p-1"><Check className="w-4 h-4" /></div>
          {kind !== '3d' && <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-3 py-1.5 truncate">{fileName}</div>}
        </>
      ) : (
        <div className="text-center px-4 text-slate-400">
          <Upload className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold mt-2 text-slate-600">{label}</p>
          <p className="text-xs mt-1">{hint}</p>
        </div>
      )}
    </div>
  );
}

function ARCreateView({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'image' | 'gif' | 'video' | '3d'>('image');
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [targetPreview, setTargetPreview] = useState('');
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentPreview, setContentPreview] = useState('');
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = (setFile: any, setPrev: any) => (f: File) => { setFile(f); setPrev(URL.createObjectURL(f)); };
  const contentAccept = contentType === 'video' ? 'video/*' : contentType === '3d' ? '.glb,.gltf' : 'image/*';
  const types = [{ v: 'image', label: 'Ảnh' }, { v: 'gif', label: 'GIF' }, { v: 'video', label: 'Video' }, { v: '3d', label: '3D Object' }];

  const handleSubmit = async () => {
    setErr(null);
    if (!name.trim()) { setErr('Vui lòng nhập tên AR.'); return; }
    if (!targetFile) { setErr('Vui lòng chọn ảnh target.'); return; }
    if (!contentFile) { setErr('Vui lòng chọn tệp nội dung.'); return; }
    setSaving(true);
    try {
      const target_image_url = await uploadARAssetToSupabase(targetFile);
      const content_url = await uploadARAssetToSupabase(contentFile);
      const thumbnail_url = thumbFile ? await uploadARAssetToSupabase(thumbFile) : target_image_url;
      const { error } = await supabase.from('ar_targets').insert({ name: name.trim(), description: description.trim(), target_image_url, thumbnail_url, content_type: contentType, content_url, scale, rotation, active: true });
      if (error) throw error;
      onCreated();
    } catch (e: any) {
      setErr(e.message || 'Lỗi khi tạo AR target');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand to-brand rounded-2xl p-6 text-white shadow-lg flex items-center gap-3">
        <button type="button" onClick={onCancel} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-black tracking-tight">Tạo AR Target Mới</h1>
          <p className="text-xs text-white/80 mt-0.5">Tải ảnh target và nội dung hiển thị để tạo trải nghiệm AR</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tên AR <span className="text-rose-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên AR target" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Nhập mô tả cho AR target" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tỷ lệ (scale)</label>
              <input type="number" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value) || 1)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Góc xoay (độ)</label>
              <input type="number" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand outline-none" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600">Ảnh Thumbnail (hiển thị ngoài danh sách)</label>
          <ARDropZone label="Thumbnail" hint="Không bắt buộc, mặc định dùng ảnh target" accept="image/*" previewUrl={thumbPreview} kind="image" fileName={thumbFile ? thumbFile.name : ''} onFile={pick(setThumbFile, setThumbPreview)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-sm">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-brand/10 text-brand flex items-center justify-center text-xs font-black">1</span>Ảnh Target (ảnh để quét)</h3>
          <ARDropZone label="Ảnh Target" hint="Kéo thả ảnh vào đây hoặc bấm để chọn" accept="image/*" previewUrl={targetPreview} kind="image" fileName={targetFile ? targetFile.name : ''} onFile={pick(setTargetFile, setTargetPreview)} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 shadow-sm">
          <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-brand/10 text-brand flex items-center justify-center text-xs font-black">2</span>Nội dung hiển thị</h3>
          <div className="flex flex-wrap gap-2">
            {types.map((tp) => (
              <button key={tp.v} type="button" onClick={() => { setContentType(tp.v as any); setContentFile(null); setContentPreview(''); }} className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition ' + (contentType === tp.v ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{tp.label}</button>
            ))}
          </div>
          <ARDropZone label="Nội dung hiển thị" hint="Kéo thả tệp vào đây hoặc bấm để chọn" accept={contentAccept} previewUrl={contentPreview} kind={contentType} fileName={contentFile ? contentFile.name : ''} onFile={pick(setContentFile, setContentPreview)} />
        </div>
      </div>

      {err && <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl p-3"><AlertCircle className="w-4 h-4 shrink-0" />{err}</div>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Hủy</button>
        <button type="button" onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Đang tạo...' : 'Tạo AR Target'}
        </button>
      </div>
    </div>
  );
}

export default function ARModule() {
  const [targets, setTargets] = useState<ARTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<ARTarget | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchTargets = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase.from('ar_targets').select('*').order('created_at', { ascending: false });
      if (sbError) throw sbError;
      setTargets(data || []);
    } catch (e: any) {
      setError(e.message || 'Không thể tải danh sách AR targets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTargets(); }, []);

  const filtered = targets.filter(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (showCreate) {
    return <ARCreateView onCancel={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchTargets(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand to-brand rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <QrCode className="w-6 h-6 opacity-90" />
              <h1 className="text-xl font-black tracking-tight">Quản lý AR Targets</h1>
            </div>
            <p className="text-sm text-brand/20">Click vào thẻ để xem QR code và chia sẻ link.</p>
          </div>
          <div className="shrink-0 flex items-center gap-2"><button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-white text-brand hover:bg-white/90 text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm"><Plus className="w-4 h-4" />Tạo AR Target Mới</button><button onClick={fetchTargets} disabled={loading} className="shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-xl transition disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button></div>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm AR target..." className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/60" />
      </div>
      {error && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div><p className="font-semibold">Lỗi kết nối</p><p className="text-xs mt-0.5 opacity-80">{error}</p></div>
        </div>
      )}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
              <div className="h-40 bg-slate-100" />
              <div className="p-4 space-y-2"><div className="h-4 bg-slate-100 rounded w-3/4" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand/10 rounded-2xl"><QrCode className="w-8 h-8 text-brand/40" /></div>
          <div>
            <p className="font-bold text-slate-700">{searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có AR target nào'}</p>
            <p className="text-xs text-slate-400 mt-1">{searchTerm ? 'Thử từ khóa khác' : 'Thêm record vào bảng ar_targets trong Supabase'}</p>
          </div>
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(target => (
            <button key={target.id} onClick={() => setSelectedTarget(target)} className="group text-left bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg hover:border-brand/20 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
              <div className="relative h-40 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                {target.thumbnail_url ? (
                  <img src={target.thumbnail_url} alt={target.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><QrCode className="w-10 h-10 text-slate-300" /></div>
                )}
                <div className="absolute inset-0 bg-brand/0 group-hover:bg-brand/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-brand text-xs font-bold px-3 py-1.5 rounded-full shadow">Xem chi tiết</span>
                </div>
              </div>
              <div className="p-4 space-y-1.5">
                <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{target.name}</p>
                {target.description && <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{target.description}</p>}
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="w-2 h-2 rounded-full bg-brand/60" />
                  <span className="text-[10px] text-slate-400 font-mono truncate">ID: {target.id}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {!loading && targets.length > 0 && (
        <p className="text-xs text-slate-400 text-center">Hiển thị {filtered.length} / {targets.length} AR target</p>
      )}
      
      {selectedTarget && <ARDetailModal target={selectedTarget} onClose={() => setSelectedTarget(null)} />}
    </div>
  );
}