import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe, Plus, RefreshCw, Search, Loader2, Trash2, Link2, QrCode, Eye, Download, ArrowLeft, Box, Grid3x3, Image as ImageIcon,
  Upload, X, Check, Copy, ExternalLink, Pencil, Save, ChevronLeft, ChevronRight, Sparkles, EyeOff
} from 'lucide-react';
import { UserAccount } from '../../types';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import VRViewer360 from './VRViewer360';
import {
  VRTour, VRSourceType, getMyTours, saveTour, deleteTour, uploadPanorama, buildTourLink,
  loadImageFromFile, imageToData, cubemapToEquirect, gridToEquirect, equirectToCanvas, canvasToBlob, defaultRowPitches, GridImage
} from '../../lib/vr360';

interface Props { currentUser: UserAccount; }

type View = 'list' | 'create' | 'view';

const SOURCE_OPTIONS: { id: VRSourceType; label: string; desc: string; icon: any }[] = [
  { id: 'cubemap', label: '6 mặt khối (cubemap)', desc: 'Chụp hoặc xuất 6 hướng trước, sau, trái, phải, trên, dưới. Ghép chính xác, không cần chồng lấn.', icon: Box },
  { id: 'grid', label: 'Nhiều ảnh chụp theo lưới', desc: 'Đứng một chỗ, xoay máy chụp thành từng hàng (ngẩng lên, ngang, cúi xuống). Hệ thống chiếu từng ảnh lên mặt cầu và trộn vùng chồng lấn.', icon: Grid3x3 },
  { id: 'equirect', label: 'Ảnh 360 có sẵn', desc: 'Ảnh tỉ lệ 2:1 từ camera 360 hoặc ứng dụng panorama, chỉ cần tải lên.', icon: ImageIcon },
];

const CUBE_SLOTS: { key: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'; label: string }[] = [
  { key: 'front', label: 'Trước' }, { key: 'right', label: 'Phải' }, { key: 'back', label: 'Sau' },
  { key: 'left', label: 'Trái' }, { key: 'top', label: 'Trên' }, { key: 'bottom', label: 'Dưới' },
];

export default function VR360Module({ currentUser }: Props) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [view, setView] = useState<View>('list');
  const [tours, setTours] = useState<VRTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<VRTour | null>(null);
  const [linkTour, setLinkTour] = useState<VRTour | null>(null);
  const [renaming, setRenaming] = useState<VRTour | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setTours(await getMyTours()); }
    catch (e: any) { addNotification('Lỗi tải danh sách VR 360: ' + (e.message || ''), 'error'); }
    finally { setLoading(false); }
  }, [addNotification]);
  useEffect(() => { load(); }, [load]);

  const remove = (t: VRTour) => {
    confirm('Xóa không gian 360', `Xóa "${t.title}"? Link chia sẻ sẽ không còn xem được.`, async () => {
      try { await deleteTour(t.id); addNotification('Đã xóa.', 'success'); load(); }
      catch (e: any) { addNotification('Lỗi xóa: ' + e.message, 'error'); }
    });
  };
  const toggleActive = async (t: VRTour) => {
    try { await saveTour({ ...t, is_active: !t.is_active }); load(); }
    catch (e: any) { addNotification('Lỗi cập nhật: ' + e.message, 'error'); }
  };
  const saveRename = async () => {
    if (!renaming) return;
    try { await saveTour({ ...renaming, title: renameTitle }); setRenaming(null); load(); addNotification('Đã đổi tên.', 'success'); }
    catch (e: any) { addNotification('Lỗi đổi tên: ' + e.message, 'error'); }
  };

  const q = search.trim().toLowerCase();
  const filtered = q ? tours.filter(t => t.title.toLowerCase().includes(q)) : tours;

  if (view === 'create') {
    return <VRCreate currentUser={currentUser} onBack={() => setView('list')} onSaved={(t) => { setView('list'); load(); setLinkTour(t); }} />;
  }

  if (view === 'view' && active) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <VRViewer360 src={active.image_url} title={active.title} onClose={() => setView('list')} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm không gian 360..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-brand focus:bg-white" />
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:border-brand/40 hover:text-brand"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới</button>
          <button onClick={() => setView('create')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover"><Plus className="h-4 w-4" /> Tạo VR 360 mới</button>
        </div>
        <p className="mt-3 text-xs text-slate-400">Ghép ảnh chụp thành ảnh toàn cảnh 360 độ, đưa lên web và chia sẻ bằng link hoặc mã QR. Người xem có thể kéo xoay, xoay theo cảm biến điện thoại hoặc đeo kính VR.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand/50"><Globe className="h-8 w-8" /></div>
          <p className="text-sm font-bold text-slate-700">Chưa có không gian 360 nào</p>
          <p className="mt-1 text-xs text-slate-400">Bấm "Tạo VR 360 mới" để ghép ảnh và đưa lên web.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(t => (
            <div key={t.id} className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
              <button onClick={() => { setActive(t); setView('view'); }} className="relative block aspect-[2/1] w-full overflow-hidden bg-slate-900">
                <img src={t.thumb_url || t.image_url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/30"><span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-800 opacity-0 transition-opacity group-hover:opacity-100 inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Xem 360</span></span>
                {!t.is_active && <span className="absolute left-3 top-3 rounded-lg bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-white">Đang tắt</span>}
              </button>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-slate-800">{t.title}</h3>
                    <p className="text-[11px] font-medium text-slate-400">{t.created_at ? new Date(t.created_at).toLocaleDateString('vi-VN') : ''}{t.width ? ` · ${t.width}×${t.height}` : ''}{typeof t.view_count === 'number' ? ` · ${t.view_count} lượt xem` : ''}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => setLinkTour(t)} className="inline-flex items-center gap-1 rounded-lg bg-brand-light px-2.5 py-1.5 text-[10px] font-bold text-brand hover:bg-brand/20"><QrCode className="h-3.5 w-3.5" /> Link & QR</button>
                  <button onClick={() => { setRenaming(t); setRenameTitle(t.title); }} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200"><Pencil className="h-3.5 w-3.5" /> Đổi tên</button>
                  <button onClick={() => toggleActive(t)} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${t.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}>{t.is_active ? <><Eye className="h-3.5 w-3.5" /> Đang bật</> : <><EyeOff className="h-3.5 w-3.5" /> Đang tắt</>}</button>
                  <button onClick={() => remove(t)} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {linkTour && <LinkDialog tour={linkTour} onClose={() => setLinkTour(null)} />}

      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setRenaming(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-base font-bold text-slate-900">Đổi tên không gian 360</h3>
            <input autoFocus value={renameTitle} onChange={e => setRenameTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveRename()} className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-brand focus:bg-white" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRenaming(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500">Hủy</button>
              <button onClick={saveRename} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white hover:bg-brand-hover"><Save className="h-4 w-4" /> Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Hộp thoại link chia sẻ và mã QR
// ---------------------------------------------------------------------
function LinkDialog({ tour, onClose }: { tour: VRTour; onClose: () => void }) {
  const link = buildTourLink(tour.id);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(link)}&format=png&margin=10`;
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* bỏ qua */ } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">Chia sẻ không gian 360</h3>
            <p className="text-[11px] text-slate-400">{tour.title}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 flex justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <img src={qrUrl} alt="QR" className="h-52 w-52 rounded-xl bg-white" />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
          <input readOnly value={link} className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none" onFocus={e => e.currentTarget.select()} />
          <button onClick={copy} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-[10px] font-bold text-white hover:bg-brand-hover">{copied ? <><Check className="h-3.5 w-3.5" /> Đã chép</> : <><Copy className="h-3.5 w-3.5" /> Chép</>}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-bold text-slate-600 hover:border-brand/40 hover:text-brand"><ExternalLink className="h-4 w-4" /> Mở trang xem</a>
          <a href={qrUrl} download={`QR_${tour.title}.png`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-bold text-slate-600 hover:border-brand/40 hover:text-brand"><Download className="h-4 w-4" /> Tải mã QR</a>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Mở link trên điện thoại rồi chọn "Cảm biến" để xoay máy nhìn quanh, hoặc "Kính VR" để đặt vào kính Cardboard, Meta Quest.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Tạo không gian 360 mới: chọn kiểu ảnh đầu vào, tải ảnh, ghép, xem thử, lưu
// ---------------------------------------------------------------------
function VRCreate({ currentUser, onBack, onSaved }: { currentUser: UserAccount; onBack: () => void; onSaved: (t: VRTour) => void }) {
  const { addNotification } = useNotifications();
  const [source, setSource] = useState<VRSourceType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outWidth, setOutWidth] = useState(4096);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [result, setResult] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Cubemap
  const [cubeFiles, setCubeFiles] = useState<Partial<Record<'front' | 'back' | 'left' | 'right' | 'top' | 'bottom', File>>>({});
  const [cubePreviews, setCubePreviews] = useState<Partial<Record<string, string>>>({});
  // Lưới
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(8);
  const [hfov, setHfov] = useState(66);
  const [pitches, setPitches] = useState<number[]>(defaultRowPitches(3));
  const [yawOffset, setYawOffset] = useState(0);
  const [gridFiles, setGridFiles] = useState<{ file: File; url: string }[]>([]);
  // Nhấn giữ ảnh để vào chế độ sắp xếp, kéo thả để đổi chỗ 2 ô trong lưới.
  const [gridSort, setGridSort] = useState(false);
  const [gridDragId, setGridDragId] = useState<number | null>(null);
  const [gridOverId, setGridOverId] = useState<number | null>(null);
  const gridDragRef = useRef<number | null>(null);
  const gridOverRef = useRef<number | null>(null);
  const gridPressTimer = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const beginGridDrag = (i: number) => { setGridDragId(i); gridDragRef.current = i; };
  const startGridPress = (i: number) => {
    if (gridPressTimer.current) window.clearTimeout(gridPressTimer.current);
    gridPressTimer.current = window.setTimeout(() => { setGridSort(true); beginGridDrag(i); }, 400);
  };
  const cancelGridPress = () => { if (gridPressTimer.current) { window.clearTimeout(gridPressTimer.current); gridPressTimer.current = null; } };
  useEffect(() => {
    if (gridDragId === null) return;
    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const slot = el?.closest('[data-slot]') as HTMLElement | null;
      const id = slot ? Number(slot.getAttribute('data-slot')) : null;
      const next = id !== null && !Number.isNaN(id) && id !== gridDragRef.current ? id : null;
      gridOverRef.current = next; setGridOverId(next);
    };
    const onUp = () => {
      const from = gridDragRef.current, to = gridOverRef.current;
      if (from !== null && to !== null && from !== to) {
        setGridFiles(prev => {
          const n = [...prev];
          if (to < n.length) { [n[from], n[to]] = [n[to], n[from]]; }
          else { const [it] = n.splice(from, 1); n.push(it); }
          return n;
        });
      }
      gridDragRef.current = null; gridOverRef.current = null;
      setGridDragId(null); setGridOverId(null);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [gridDragId]);
  useEffect(() => {
    if (!gridSort) return;
    const onDown = (e: PointerEvent) => { if (gridRef.current && !gridRef.current.contains(e.target as Node)) setGridSort(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [gridSort]);
  // Diễn giải góc cho người dùng dễ xếp ảnh đúng chỗ.
  const pitchLabel = (p: number) => p > 15 ? `Ngẩng lên ${p}° (trần)` : p < -15 ? `Cúi xuống ${Math.abs(p)}° (sàn)` : `Ngang tầm mắt ${p}°`;
  const yawLabel = (y: number) => {
    const r = Math.round(y);
    const name = r === 0 ? 'Trước' : r === 90 ? 'Phải' : r === 180 ? 'Sau' : r === 270 ? 'Trái' : r < 90 ? 'Trước phải' : r < 180 ? 'Sau phải' : r < 270 ? 'Sau trái' : 'Trước trái';
    return `${r}° ${name}`;
  };
  // Equirect
  const [equiFile, setEquiFile] = useState<File | null>(null);
  const [equiPreview, setEquiPreview] = useState<string | null>(null);

  const prevUrlRef = useRef<string | null>(null);
  useEffect(() => () => { if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current); }, []);

  const setRowsSafe = (n: number) => { const r = Math.max(1, Math.min(5, n || 1)); setRows(r); setPitches(defaultRowPitches(r)); };

  const pickCube = (key: string, f: File | undefined) => {
    if (!f) return;
    setCubeFiles(s => ({ ...s, [key]: f }));
    setCubePreviews(s => ({ ...s, [key]: URL.createObjectURL(f) }));
  };
  const addGridFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).filter(f => f.type.startsWith('image/'));
    arr.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setGridFiles(prev => [...prev, ...arr.map(f => ({ file: f, url: URL.createObjectURL(f) }))]);
  };
  const moveGrid = (i: number, dir: -1 | 1) => {
    setGridFiles(prev => { const j = i + dir; if (j < 0 || j >= prev.length) return prev; const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  };
  const removeGrid = (i: number) => setGridFiles(prev => prev.filter((_, k) => k !== i));

  const finish = (canvas: HTMLCanvasElement) => {
    canvas.toBlob(b => {
      if (!b) return;
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      const url = URL.createObjectURL(b);
      prevUrlRef.current = url;
      setResult({ canvas, url });
    }, 'image/jpeg', 0.92);
  };

  const build = async () => {
    setProcessing(true); setProgress(0); setResult(null);
    try {
      if (source === 'cubemap') {
        const missing = CUBE_SLOTS.filter(s => !cubeFiles[s.key]).map(s => s.label);
        if (missing.length) throw new Error('Thiếu ảnh mặt ' + missing.join(', '));
        setProgressText('Đang đọc 6 mặt ảnh...');
        const faces: any = {};
        for (const s of CUBE_SLOTS) faces[s.key] = imageToData(await loadImageFromFile(cubeFiles[s.key]!), 2048);
        setProgressText('Đang ghép thành ảnh 360...');
        const canvas = await cubemapToEquirect(faces, outWidth, setProgress);
        finish(canvas);
      } else if (source === 'grid') {
        if (gridFiles.length === 0) throw new Error('Chưa có ảnh nào');
        const need = rows * cols;
        if (gridFiles.length !== need) throw new Error(`Lưới ${rows} hàng × ${cols} cột cần đúng ${need} ảnh, hiện có ${gridFiles.length}`);
        setProgressText('Đang đọc ảnh...');
        const imgs: GridImage[] = [];
        for (let i = 0; i < gridFiles.length; i++) {
          const r = Math.floor(i / cols), c = i % cols;
          const data = imageToData(await loadImageFromFile(gridFiles[i].file), 1600);
          imgs.push({ data, yawDeg: yawOffset + c * (360 / cols), pitchDeg: pitches[r] ?? 0 });
          setProgress(Math.round((i / gridFiles.length) * 100));
        }
        setProgressText('Đang chiếu và trộn ảnh lên mặt cầu...');
        const canvas = await gridToEquirect(imgs, { hfovDeg: hfov, outWidth }, setProgress);
        finish(canvas);
      } else if (source === 'equirect') {
        if (!equiFile) throw new Error('Chưa chọn ảnh 360');
        setProgressText('Đang chuẩn hóa ảnh...');
        const img = await loadImageFromFile(equiFile);
        const ratio = img.naturalWidth / img.naturalHeight;
        if (Math.abs(ratio - 2) > 0.15) addNotification(`Ảnh có tỉ lệ ${ratio.toFixed(2)}:1, ảnh 360 chuẩn là 2:1 nên có thể bị kéo giãn.`, 'warning');
        finish(equirectToCanvas(img, 6144));
        setProgress(100);
      }
    } catch (e: any) {
      addNotification(e.message || 'Lỗi ghép ảnh', 'error');
    } finally { setProcessing(false); }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a'); a.href = result.url; a.download = `${title.trim() || 'vr360'}_${Date.now()}.jpg`; document.body.appendChild(a); a.click(); a.remove();
  };

  const save = async () => {
    if (!result || !source) return;
    setSaving(true);
    try {
      const blob = await canvasToBlob(result.canvas, 0.9);
      if (blob.size > 10 * 1024 * 1024) addNotification('Ảnh lớn hơn 10 MB, tải lên có thể chậm hoặc bị từ chối. Hãy chọn kích thước xuất nhỏ hơn.', 'warning');
      const { url, thumb } = await uploadPanorama(blob, currentUser.id);
      if (url.startsWith('data:')) throw new Error('Không tải được ảnh lên Cloudinary. Kiểm tra cấu hình tải lên.');
      const t = await saveTour({
        title: title.trim() || 'Không gian 360', description, image_url: url, thumb_url: thumb, source_type: source,
        width: result.canvas.width, height: result.canvas.height, is_active: true, owner_id: currentUser.id, owner_name: currentUser.fullName,
      });
      addNotification('Đã đưa không gian 360 lên web.', 'success');
      onSaved(t);
    } catch (e: any) { addNotification('Lỗi lưu: ' + (e.message || ''), 'error'); }
    finally { setSaving(false); }
  };

  const inp = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white';
  const lbl = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><ArrowLeft className="h-4 w-4" /> Danh sách</button>
        {result && (
          <div className="flex flex-wrap gap-2">
            <button onClick={download} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:border-brand/40 hover:text-brand"><Download className="h-4 w-4" /> Tải ảnh 360</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {saving ? 'Đang đưa lên web...' : 'Lưu và đưa lên web'}</button>
          </div>
        )}
      </div>

      {/* Bước 1: chọn kiểu ảnh đầu vào */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-black text-slate-800">1. Ảnh đầu vào là dạng nào?</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {SOURCE_OPTIONS.map(o => {
            const Icon = o.icon; const on = source === o.id;
            return (
              <button key={o.id} onClick={() => { setSource(o.id); setResult(null); }} className={`rounded-2xl border p-4 text-left transition-all ${on ? 'border-brand bg-brand-light shadow-sm' : 'border-slate-200 hover:border-brand/40'}`}>
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${on ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-5 w-5" /></span>
                <p className="mt-3 text-[13px] font-black text-slate-800">{o.label}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{o.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bước 2: tải ảnh theo kiểu đã chọn */}
      {source && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-800">2. Tải ảnh lên</h2>

          {source === 'cubemap' && (
            <>
              <p className="text-[11px] text-slate-500">Mỗi mặt là ảnh vuông góc nhìn 90°. Nếu xuất từ Blender, 3ds Max, Unity, chọn đúng hướng tương ứng. Nếu chụp bằng điện thoại, đứng cố định và chụp thẳng 6 hướng.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {CUBE_SLOTS.map(s => (
                  <label key={s.key} className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-brand">
                    {cubePreviews[s.key] ? <img src={cubePreviews[s.key]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <Upload className="h-6 w-6 text-slate-300 group-hover:text-brand" />}
                    <span className={`relative z-10 mt-auto mb-2 rounded-lg px-2 py-1 text-[11px] font-bold ${cubePreviews[s.key] ? 'bg-black/60 text-white' : 'text-slate-600'}`}>{s.label}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => pickCube(s.key, e.target.files?.[0])} />
                  </label>
                ))}
              </div>
            </>
          )}

          {source === 'grid' && (
            <>
              <p className="text-[11px] text-slate-500">Chụp đứng yên 1 chỗ, xoay đều theo từng hàng: hàng trên ngẩng máy lên, hàng giữa ngang, hàng dưới cúi xuống. Sắp ảnh theo thứ tự từ hàng trên xuống, mỗi hàng từ trái sang phải theo chiều xoay. Kết quả tốt khi các ảnh chồng lấn nhau khoảng 30%.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><label className={lbl}>Số hàng</label><input type="number" min={1} max={5} value={rows} onChange={e => setRowsSafe(Number(e.target.value))} className={inp} /></div>
                <div><label className={lbl}>Số ảnh mỗi hàng (cột)</label><input type="number" min={3} max={36} value={cols} onChange={e => setCols(Math.max(3, Math.min(36, Number(e.target.value) || 3)))} className={inp} /></div>
                <div><label className={lbl}>Góc nhìn ngang ống kính (°)</label><input type="number" min={30} max={120} value={hfov} onChange={e => setHfov(Math.max(30, Math.min(120, Number(e.target.value) || 66)))} className={inp} /><p className="mt-1 text-[10px] text-slate-400">Điện thoại thường 60 đến 70°, ống góc rộng 90 đến 110°</p></div>
                <div><label className={lbl}>Lệch hướng ban đầu (°)</label><input type="number" value={yawOffset} onChange={e => setYawOffset(Number(e.target.value) || 0)} className={inp} /></div>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500 hover:border-brand hover:text-brand">
                <Upload className="h-5 w-5" /> Chọn nhiều ảnh (cần {rows * cols} ảnh, đang có {gridFiles.length})
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => { addGridFiles(e.target.files); e.target.value = ''; }} />
              </label>
              {/* Bảng xếp ảnh theo lưới: hàng là góc ngẩng, cột là hướng quay. Nhấn giữ ảnh rồi kéo thả để đổi chỗ. */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {gridSort ? 'Đang sắp xếp: kéo ảnh thả vào ô muốn đặt (đổi chỗ 2 ảnh). Bấm Xong khi hoàn tất.' : 'Nhấn giữ 1 ảnh khoảng nửa giây để bật chế độ sắp xếp, rồi kéo thả vào đúng hàng và cột.'}
                  </p>
                  <div className="flex items-center gap-2">
                    {gridSort && <button onClick={() => setGridSort(false)} className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-hover">Xong</button>}
                    {gridFiles.length > 0 && <button onClick={() => { setGridFiles([]); setGridSort(false); }} className="text-[11px] font-bold text-rose-500 hover:underline">Xóa hết ảnh</button>}
                  </div>
                </div>
                <div ref={gridRef} className="overflow-x-auto pb-1">
                  <table className="border-separate border-spacing-1">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-slate-50/95 px-1 text-left align-bottom">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hàng ↓ · Hướng →</span>
                        </th>
                        {Array.from({ length: cols }).map((_, c) => {
                          const yaw = ((yawOffset + c * (360 / cols)) % 360 + 360) % 360;
                          return (
                            <th key={c} className="px-1 align-bottom">
                              <div className="w-28 rounded-lg bg-white px-1.5 py-1 text-center">
                                <p className="text-[11px] font-black text-slate-700">Cột {c + 1}</p>
                                <p className="text-[10px] font-semibold text-brand">{yawLabel(yaw)}</p>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r}>
                          <th className="sticky left-0 z-10 bg-slate-50/95 px-1 text-left align-middle">
                            <div className="w-40 rounded-lg bg-white px-2 py-1.5">
                              <p className="text-[11px] font-black text-slate-700">Hàng {r + 1}</p>
                              <p className="text-[10px] font-semibold text-brand">{pitchLabel(pitches[r] ?? 0)}</p>
                              <div className="mt-1 flex items-center gap-1">
                                <input type="number" min={-90} max={90} value={pitches[r] ?? 0} onChange={e => setPitches(ps => ps.map((v, k) => k === r ? Number(e.target.value) || 0 : v))} className="w-16 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 outline-none focus:border-brand" />
                                <span className="text-[10px] text-slate-400">° ngẩng</span>
                              </div>
                            </div>
                          </th>
                          {Array.from({ length: cols }).map((_, c) => {
                            const i = r * cols + c;
                            const g = gridFiles[i];
                            const dragging = gridDragId === i;
                            const over = gridOverId === i && gridDragId !== null && gridDragId !== i;
                            return (
                              <td key={c} className="p-0 align-top">
                                <div
                                  data-slot={i}
                                  onPointerDown={(e) => { if (!g) return; if (gridSort) { e.preventDefault(); beginGridDrag(i); } else startGridPress(i); }}
                                  onPointerUp={cancelGridPress}
                                  onPointerLeave={cancelGridPress}
                                  className={`group relative h-20 w-28 overflow-hidden rounded-xl border-2 bg-slate-100 select-none ${g ? (gridSort ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-pointer') : 'border-dashed'} ${over ? 'border-brand ring-2 ring-brand/40' : g ? 'border-slate-200' : 'border-slate-300'} ${dragging ? 'opacity-40' : ''}`}
                                >
                                  {g ? (
                                    <>
                                      <img src={g.url} alt="" className="pointer-events-none h-full w-full object-cover" draggable={false} />
                                      <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">{i + 1}</span>
                                      {!gridSort && (
                                        <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                          <button onPointerDown={e => e.stopPropagation()} onClick={() => moveGrid(i, -1)} className="text-white"><ChevronLeft className="h-3.5 w-3.5" /></button>
                                          <button onPointerDown={e => e.stopPropagation()} onClick={() => removeGrid(i)} className="text-rose-300"><X className="h-3.5 w-3.5" /></button>
                                          <button onPointerDown={e => e.stopPropagation()} onClick={() => moveGrid(i, 1)} className="text-white"><ChevronRight className="h-3.5 w-3.5" /></button>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] font-semibold text-slate-400">Trống</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {gridFiles.length > rows * cols && (
                        <tr>
                          <th className="sticky left-0 z-10 bg-slate-50/95 px-1 text-left align-middle">
                            <div className="w-40 rounded-lg bg-amber-50 px-2 py-1.5">
                              <p className="text-[11px] font-black text-amber-700">Ảnh thừa ({gridFiles.length - rows * cols})</p>
                              <p className="text-[10px] font-semibold text-amber-600">Không được ghép. Kéo vào lưới hoặc xóa bớt.</p>
                            </div>
                          </th>
                          {gridFiles.slice(rows * cols).map((g, k) => {
                            const i = rows * cols + k;
                            const dragging = gridDragId === i;
                            const over = gridOverId === i && gridDragId !== null && gridDragId !== i;
                            return (
                              <td key={g.url} className="p-0 align-top">
                                <div
                                  data-slot={i}
                                  onPointerDown={(e) => { if (gridSort) { e.preventDefault(); beginGridDrag(i); } else startGridPress(i); }}
                                  onPointerUp={cancelGridPress}
                                  onPointerLeave={cancelGridPress}
                                  className={`group relative h-20 w-28 overflow-hidden rounded-xl border-2 bg-amber-50 select-none ${gridSort ? 'cursor-grab touch-none' : 'cursor-pointer'} ${over ? 'border-brand ring-2 ring-brand/40' : 'border-amber-200'} ${dragging ? 'opacity-40' : ''}`}
                                >
                                  <img src={g.url} alt="" className="pointer-events-none h-full w-full object-cover opacity-70" draggable={false} />
                                  <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">{i + 1}</span>
                                  {!gridSort && <button onPointerDown={e => e.stopPropagation()} onClick={() => removeGrid(i)} className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-rose-300"><X className="h-3.5 w-3.5" /></button>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400">Mỗi hàng là 1 góc ngẩng máy (sửa số độ ngay tại hàng), mỗi cột là 1 hướng quay tính từ hướng trước mặt. Ảnh trần và sàn nên đặt ở hàng ngẩng lên và cúi xuống.</p>
              </div>
            </>
          )}

          {source === 'equirect' && (
            <label className="relative flex min-h-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-brand">
              {equiPreview ? <img src={equiPreview} alt="" className="max-h-72 w-full object-contain" /> : <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><Upload className="h-5 w-5" /> Chọn ảnh 360 (tỉ lệ 2:1)</span>}
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setEquiFile(f); setEquiPreview(URL.createObjectURL(f)); } }} />
            </label>
          )}

          <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            {source !== 'equirect' && (
              <div><label className={lbl}>Kích thước ảnh 360 xuất ra</label>
                <select value={outWidth} onChange={e => setOutWidth(Number(e.target.value))} className={inp}>
                  <option value={2048}>2048 × 1024 (nhẹ, xem thử nhanh)</option>
                  <option value={4096}>4096 × 2048 (khuyên dùng)</option>
                  <option value={6144}>6144 × 3072 (nét cao, nặng)</option>
                </select>
              </div>
            )}
            <button onClick={build} disabled={processing} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-slate-700 disabled:opacity-50">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {processing ? 'Đang ghép...' : 'Ghép thành ảnh 360'}
            </button>
            {processing && (
              <div className="min-w-[200px] flex-1">
                <p className="text-[11px] font-semibold text-slate-500">{progressText} {progress}%</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bước 3: xem thử và đặt tên */}
      {result && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-800">3. Xem thử và đặt tên</h2>
          <div className="h-[420px] overflow-hidden rounded-2xl"><VRViewer360 src={result.url} /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className={lbl}>Tên không gian *</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Phòng thực hành thiết kế" className={inp} /></div>
            <div><label className={lbl}>Mô tả</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ghi chú ngắn cho người xem" className={inp} /></div>
          </div>
          <p className="text-[11px] text-slate-400">Ảnh xuất ra {result.canvas.width}×{result.canvas.height}. Bấm "Lưu và đưa lên web" ở trên để tạo link chia sẻ và mã QR.</p>
        </div>
      )}
    </div>
  );
}
