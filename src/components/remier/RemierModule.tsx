import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Film, Trash2, Loader2, X, Clapperboard, Monitor } from 'lucide-react';
import { UserAccount } from '../../types';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import { MvProject, getProjects, createProject, softDeleteProject } from '../../lib/remier';
import RemierEditor from './RemierEditor';

interface Props { currentUser: UserAccount; }
const RATIOS = [
  { id: '16:9', label: 'Ngang 16:9', w: 1920, h: 1080 },
  { id: '9:16', label: 'Dọc 9:16', w: 1080, h: 1920 },
  { id: '1:1', label: 'Vuông 1:1', w: 1080, h: 1080 },
  { id: '4:5', label: 'Đứng 4:5', w: 1080, h: 1350 },
];

export default function RemierModule({ currentUser }: Props) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [projects, setProjects] = useState<MvProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [wide, setWide] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1280 : true);

  useEffect(() => { const onR = () => setWide(window.innerWidth >= 1280); window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR); }, []);

  const load = useCallback(async () => { setLoading(true); try { setProjects(await getProjects()); } catch (e: any) { addNotification('Lỗi tải dự án: ' + (e.message || e), 'error'); } finally { setLoading(false); } }, [addNotification]);
  useEffect(() => { load(); }, [load]);

  const remove = async (p: MvProject) => {
    const ok = await confirm({ title: 'Xóa dự án', message: `Chuyển dự án "${p.title}" vào thùng rác?`, confirmText: 'Xóa', cancelText: 'Hủy', danger: true } as any);
    if (!ok) return;
    try { await softDeleteProject(p.id); load(); addNotification('Đã chuyển vào thùng rác.', 'success'); } catch (e: any) { addNotification('Lỗi: ' + (e.message || e), 'error'); }
  };

  if (activeId) {
    if (!wide) return (
      <div className="grid min-h-[60vh] place-items-center rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <div>
          <Monitor className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h2 className="font-display text-lg font-bold text-slate-800">Cần màn hình rộng hơn</h2>
          <p className="mt-1 text-sm text-slate-500">Trình dựng phim cần màn hình rộng tối thiểu 1280px. Vui lòng dùng máy tính hoặc xoay ngang màn hình.</p>
          <button onClick={() => setActiveId(null)} className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">Quay lại danh sách</button>
        </div>
      </div>
    );
    return <RemierEditor projectId={activeId} currentUser={currentUser} onExit={() => { setActiveId(null); load(); }} />;
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><Clapperboard className="h-7 w-7" /></div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">Remier · Dựng phim</h1>
            <p className="text-xs text-slate-500">Dựng video nhiều lớp ngay trên trình duyệt.</p>
          </div>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover"><Plus className="h-4 w-4" /> Tạo dự án mới</button>
      </div>

      {loading ? <div className="py-20 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải...</div>
        : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <Film className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-500">Chưa có dự án nào</p>
            <p className="mt-1 text-xs text-slate-400">Bấm Tạo dự án mới để bắt đầu dựng phim.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map(p => (
              <div key={p.id} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-brand/30 transition-all">
                <button onClick={() => setActiveId(p.id)} className="block w-full">
                  <div className="grid aspect-video place-items-center bg-slate-900">
                    {p.thumb_url ? <img src={p.thumb_url} alt="" className="h-full w-full object-cover" /> : <Film className="h-8 w-8 text-slate-600" />}
                  </div>
                </button>
                <div className="flex items-center justify-between gap-2 p-3">
                  <button onClick={() => setActiveId(p.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[13px] font-bold text-slate-800 group-hover:text-brand">{p.title}</p>
                    <p className="text-[10px] text-slate-400">{p.width}×{p.height} · {new Date(p.updated_at || p.created_at || '').toLocaleDateString('vi-VN')}</p>
                  </button>
                  <button onClick={() => remove(p)} title="Xóa" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

      {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setActiveId(id); }} ownerName={currentUser.fullName} />}
    </div>
  );
}

function CreateDialog({ onClose, onCreated, ownerName }: { onClose: () => void; onCreated: (id: string) => void; ownerName: string; }) {
  const { addNotification } = useNotifications();
  const [title, setTitle] = useState('');
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!title.trim()) { addNotification('Nhập tên dự án.', 'warning'); return; }
    setSaving(true);
    try { const p = await createProject({ title: title.trim(), width: ratio.w, height: ratio.h, owner_name: ownerName }); onCreated(p.id); }
    catch (e: any) { addNotification('Lỗi tạo dự án: ' + (e.message || e), 'error'); setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-base font-bold text-slate-900">Tạo dự án mới</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button></div>
        <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Tên dự án</label>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="Ví dụ: Video giới thiệu môn học" />
        <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Tỉ lệ khung hình</label>
        <div className="grid grid-cols-2 gap-2">
          {RATIOS.map(r => <button key={r.id} onClick={() => setRatio(r)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${ratio.id === r.id ? 'border-brand bg-brand-light text-brand' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{r.label}</button>)}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200">Hủy</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tạo và mở</button>
        </div>
      </div>
    </div>
  );
}
