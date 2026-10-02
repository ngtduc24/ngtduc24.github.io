import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, ClipboardList, Clapperboard, FileQuestion, FolderKanban, Globe, Library, ListChecks, Loader2, Presentation, RotateCcw, Search, Trash2, View } from 'lucide-react';
import { listMyTrash, restoreTrash, purgeTrash, TrashItem, TrashApp, TRASH_APP_LABELS, TRASH_DAYS } from '../lib/trash';
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';

// Mục Đã xoá trong trang Cá nhân: gom mọi nội dung đã xoá từ các ứng dụng, khôi phục hoặc xoá hẳn.

const ICONS: Record<TrashApp, any> = {
  bank_item: Library, quiz: ListChecks, quiz_question: FileQuestion, qda_project: FolderKanban,
  vr_tour: View, task: ClipboardList, website: Globe, el_lesson: BookOpen, remier: Clapperboard, slide_deck: Presentation, quant_project: BarChart3,
};

const daysLeft = (iso: string) => Math.max(0, TRASH_DAYS - Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
const fmt = (iso: string) => { try { return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

export default function TrashPanel() {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [app, setApp] = useState<TrashApp | ''>('');
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try { setItems(await listMyTrash()); } catch (e: any) { addNotification('Chưa tải được mục đã xoá: ' + (e?.message || e), 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Partial<Record<TrashApp, number>> = {};
    items.forEach(i => { c[i.app] = (c[i.app] || 0) + 1; });
    return c;
  }, [items]);
  const shown = items.filter(i => (!app || i.app === app) && (!q.trim() || i.title.toLowerCase().includes(q.trim().toLowerCase())));

  const restore = async (it: TrashItem) => {
    setBusy(it.key);
    try { await restoreTrash(it); setItems(prev => prev.filter(x => x.key !== it.key)); addNotification(`Đã khôi phục "${it.title}" về ${TRASH_APP_LABELS[it.app]}.`, 'success'); }
    catch (e: any) { addNotification(e?.message || 'Chưa khôi phục được.', 'error'); }
    finally { setBusy(null); }
  };
  const purge = (it: TrashItem) => confirm('Xoá vĩnh viễn', `Xoá hẳn "${it.title}"? Sau khi xoá vĩnh viễn sẽ không khôi phục được nữa.`, async () => {
    setBusy(it.key);
    try { await purgeTrash(it); setItems(prev => prev.filter(x => x.key !== it.key)); addNotification('Đã xoá vĩnh viễn.', 'success'); }
    catch (e: any) { addNotification(e?.message || 'Chưa xoá được.', 'error'); }
    finally { setBusy(null); }
  });
  const purgeAll = () => confirm('Dọn sạch mục đã xoá', `Xoá vĩnh viễn ${shown.length} mục đang hiện? Thao tác này không hoàn tác được.`, async () => {
    setBusy('all');
    let ok = 0;
    for (const it of shown) { try { await purgeTrash(it); ok++; } catch { /* bỏ qua mục lỗi */ } }
    setBusy(null);
    addNotification(`Đã xoá vĩnh viễn ${ok} mục.`, 'success');
    load();
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">Đã xoá</h2>
          <p className="text-[13px] text-slate-500">Nội dung bạn xoá ở các ứng dụng được giữ lại {TRASH_DAYS} ngày, sau đó tự xoá hẳn. Bấm Khôi phục để đưa về đúng chỗ cũ.</p>
        </div>
        {shown.length > 0 && (
          <button onClick={purgeAll} disabled={busy === 'all'} className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
            {busy === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Dọn sạch
          </button>
        )}
      </div>

      <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm trong mục đã xoá..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:bg-white" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setApp('')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!app ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Tất cả {items.length}</button>
          {(Object.keys(counts) as TrashApp[]).map(a => (
            <button key={a} onClick={() => setApp(a)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${app === a ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{TRASH_APP_LABELS[a]} {counts[a]}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</div>
        ) : shown.length === 0 ? (
          <div className="py-16 text-center">
            <Trash2 className="mx-auto mb-3 h-10 w-10 text-slate-200" />
            <p className="text-sm font-semibold text-slate-600">Không có mục nào đã xoá</p>
            <p className="mt-1 text-[13px] text-slate-400">Khi bạn xoá bài tập, đề, câu hỏi, giáo trình, dự án, công việc... chúng sẽ nằm ở đây.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map(it => {
              const Icon = ICONS[it.app] || Trash2;
              const left = daysLeft(it.deletedAt);
              return (
                <li key={it.key} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{it.title}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {TRASH_APP_LABELS[it.app]} · xoá lúc {fmt(it.deletedAt)}
                      {it.app !== 'website' && <> · <span className={left <= 3 ? 'font-semibold text-rose-500' : ''}>còn {left} ngày</span></>}
                      {it.note && <> · {it.note}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => restore(it)} disabled={!!busy} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50">
                      {busy === it.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Khôi phục
                    </button>
                    <button onClick={() => purge(it)} disabled={!!busy} title="Xoá vĩnh viễn" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
