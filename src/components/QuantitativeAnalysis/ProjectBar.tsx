import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Cloud, CloudOff, FolderOpen, Loader2, Pencil, Plus, Trash2, UserPlus, Check, Eye } from 'lucide-react';
import { useQuantitative } from './QuantitativeContext';
import { QuantProject, QuantSummary, listQuantProjects, getQuantProject, saveQuantProject, createQuantProject, softDeleteQuant, getQuantUpdatedAt } from '../../lib/quant';
import { listCollaborators, Collaborator } from '../../lib/collab';
import { takeOpenHint } from '../../lib/notifications';
import { askText } from '../ui/Dialogs';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';
import ShareDialog from '../ui/ShareDialog';
import { AvatarStack } from '../ui/People';
import type { UserAccount } from '../../types';

// Thanh dự án của module Định lượng: chọn, tạo, đổi tên, chia sẻ, xoá dự án.
// Biến, dữ liệu và kết quả tự lưu lên máy chủ sau mỗi thay đổi (chờ 1,5 giây),
// người cộng tác mở cùng dự án sẽ thấy bản mới sau vài giây.
const lastKey = (uid: string) => `quant_last:${uid}`;
const DEFAULT_VARS = () => [{ id: '1', name: 'VAR00001', label: '', type: 'Numeric', measure: 'Scale', values: {}, missing: [] }];

export default function ProjectBar({ currentUser }: { currentUser?: UserAccount }) {
  const { variables, setVariables, data, setData, results, setResults } = useQuantitative();
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [list, setList] = useState<QuantSummary[] | null>(null);
  const [proj, setProj] = useState<QuantProject | null>(null);
  const [role, setRole] = useState<QuantSummary['role']>('owner');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [menu, setMenu] = useState(false);
  const [share, setShare] = useState(false);
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const projRef = useRef<QuantProject | null>(null); projRef.current = proj;
  const lastSaved = useRef<string | null>(null);
  const loading = useRef(false);
  const creating = useRef(false);
  const timer = useRef<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const uid = currentUser?.id || '';
  const readOnly = role === 'view';
  const snapshot = useCallback(() => JSON.stringify({ variables, data, results }), [variables, data, results]);
  // Trạng thái ban đầu (chưa nhập gì) coi như đã lưu, để chỉ mở trang không tự tạo dự án rỗng.
  if (lastSaved.current === null) lastSaved.current = snapshot();

  const open = useCallback(async (s: { id: string; ownerId: string; role?: QuantSummary['role'] }) => {
    loading.current = true;
    try {
      const p = await getQuantProject(s.ownerId, s.id);
      if (!p) { addNotification('Không mở được dự án này.', 'error'); return; }
      setProj(p); setRole(s.role || (p.ownerId === uid ? 'owner' : 'view'));
      setVariables(p.variables.length ? p.variables : DEFAULT_VARS() as any);
      setData(p.data); setResults(p.results);
      lastSaved.current = JSON.stringify({ variables: p.variables.length ? p.variables : DEFAULT_VARS(), data: p.data, results: p.results });
      setStatus('saved');
      try { localStorage.setItem(lastKey(uid), JSON.stringify({ id: p.id, ownerId: p.ownerId })); } catch { /* bỏ qua */ }
    } finally { setTimeout(() => { loading.current = false; }, 50); }
  }, [uid, setVariables, setData, setResults, addNotification]);

  // Tải danh sách, mở dự án gần nhất (hoặc dự án được nhắc trong thông báo cộng tác).
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    listQuantProjects().then(async l => {
      if (!alive) return;
      setList(l);
      const hint = takeOpenHint('quant_project');
      let pick = hint ? l.find(x => x.id === hint) : undefined;
      if (!pick) { try { const v = JSON.parse(localStorage.getItem(lastKey(uid)) || 'null'); if (v) pick = l.find(x => x.id === v.id); } catch { /* bỏ qua */ } }
      if (pick) await open(pick);
    }).catch(() => setList([]));
    return () => { alive = false; };
  }, [uid, open]);

  useEffect(() => { if (proj) listCollaborators('quant_project', proj.id).then(setCollabs).catch(() => setCollabs([])); else setCollabs([]); }, [proj?.id, share]);

  // Tự lưu khi biến, dữ liệu, kết quả thay đổi.
  useEffect(() => {
    if (loading.current || !uid || readOnly) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const snap = snapshot();
      if (snap === lastSaved.current) return;
      setStatus('saving');
      try {
        let p = projRef.current;
        if (!p) {
          // Bắt đầu nhập liệu khi chưa có dự án: tự tạo dự án để không mất dữ liệu.
          if (creating.current) return;
          creating.current = true;
          p = await createQuantProject(`Dự án định lượng ${new Date().toLocaleDateString('vi-VN')}`, currentUser?.fullName, { variables, data, results });
          creating.current = false;
          setProj(p); setRole('owner');
          setList(l => [{ id: p!.id, ownerId: p!.ownerId, ownerName: p!.ownerName, title: p!.title, updatedAt: p!.updatedAt, rows: p!.data.length, vars: p!.variables.length, role: 'owner' }, ...(l || [])]);
          try { localStorage.setItem(lastKey(uid), JSON.stringify({ id: p.id, ownerId: p.ownerId })); } catch { /* bỏ qua */ }
        } else {
          p = await saveQuantProject({ ...p, variables, data, results });
          setProj(p);
        }
        lastSaved.current = snap;
        setStatus('saved');
      } catch (e: any) {
        creating.current = false;
        setStatus('error');
        console.warn('Lưu dự án định lượng lỗi:', e?.message || e);
      }
    }, 1500);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variables, data, results]);

  // Rời trang hoặc chuyển ứng dụng khi còn thay đổi chưa kịp lưu thì lưu ngay.
  const latest = useRef({ variables, data, results, readOnly }); latest.current = { variables, data, results, readOnly };
  useEffect(() => {
    const flush = () => {
      const p = projRef.current, L = latest.current;
      if (!p || L.readOnly) return;
      if (JSON.stringify({ variables: L.variables, data: L.data, results: L.results }) === lastSaved.current) return;
      saveQuantProject({ ...p, variables: L.variables, data: L.data, results: L.results }).catch(() => {});
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, []);

  // Lấy bản mới khi người cộng tác vừa sửa (mỗi 10 giây, chỉ khi mình không có thay đổi chưa lưu).
  useEffect(() => {
    if (!proj) return;
    const t = setInterval(async () => {
      const p = projRef.current; if (!p || status === 'saving') return;
      if (snapshot() !== lastSaved.current) return;
      const u = await getQuantUpdatedAt(p.ownerId, p.id).catch(() => null);
      if (u && u.split('|')[0] !== p.updatedAt && u.split('|')[1] !== uid) await open({ id: p.id, ownerId: p.ownerId, role });
    }, 10000);
    return () => clearInterval(t);
  }, [proj?.id, status, snapshot, uid, open, role]);

  useEffect(() => {
    const d = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', d); return () => document.removeEventListener('mousedown', d);
  }, []);

  const newProject = async () => {
    setMenu(false);
    const t = await askText({ title: 'Dự án định lượng mới', label: 'Tên dự án', defaultValue: `Dự án định lượng ${new Date().toLocaleDateString('vi-VN')}` });
    if (t == null) return;
    try {
      loading.current = true;
      const p = await createQuantProject(t.trim() || 'Dự án định lượng', currentUser?.fullName, { variables: DEFAULT_VARS() });
      setList(l => [{ id: p.id, ownerId: p.ownerId, ownerName: p.ownerName, title: p.title, updatedAt: p.updatedAt, rows: 0, vars: 1, role: 'owner' }, ...(l || [])]);
      await open({ id: p.id, ownerId: p.ownerId, role: 'owner' });
      addNotification('Đã tạo dự án mới.', 'success');
    } catch (e: any) { addNotification('Chưa tạo được dự án: ' + (e?.message || e), 'error'); loading.current = false; }
  };
  const rename = async () => {
    if (!proj || readOnly) return;
    const t = await askText({ title: 'Đổi tên dự án', label: 'Tên dự án', defaultValue: proj.title });
    if (!t?.trim()) return;
    try { const p = await saveQuantProject({ ...proj, title: t.trim(), variables, data, results }); setProj(p); lastSaved.current = snapshot(); setList(l => (l || []).map(x => (x.id === p.id ? { ...x, title: p.title } : x))); }
    catch (e: any) { addNotification('Chưa đổi được tên: ' + (e?.message || e), 'error'); }
  };
  const remove = () => {
    if (!proj) return;
    const target = proj;
    confirm('Xoá dự án', `Chuyển dự án "${target.title}" vào mục Đã xoá ở trang Cá nhân? Có thể khôi phục trong 30 ngày.`, async () => {
      try {
        await softDeleteQuant({ ...target, variables, data, results });
        setList(l => (l || []).filter(x => x.id !== target.id));
        loading.current = true;
        setProj(null); setVariables(DEFAULT_VARS() as any); setData([]); setResults([]);
        lastSaved.current = JSON.stringify({ variables: DEFAULT_VARS(), data: [], results: [] });
        try { localStorage.removeItem(lastKey(uid)); } catch { /* bỏ qua */ }
        setTimeout(() => { loading.current = false; }, 50);
        addNotification('Đã chuyển dự án vào mục Đã xoá.', 'success');
      } catch (e: any) { addNotification(e?.message || 'Chưa xoá được dự án.', 'error'); }
    });
  };

  if (!uid) return null;
  const canManage = role === 'owner' || role === 'manage';
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div ref={menuRef} className="relative">
        <button onClick={() => setMenu(v => !v)} className="flex h-10 max-w-[320px] items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <FolderOpen className="h-4 w-4 shrink-0 text-brand" />
          <span className="truncate">{proj ? proj.title : 'Chưa chọn dự án'}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        {menu && (
          <div className="absolute left-0 top-12 z-40 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
            <button onClick={newProject} className="mb-1 flex w-full items-center gap-2 rounded-xl bg-brand-light px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-light/70"><Plus className="h-4 w-4" /> Tạo dự án mới</button>
            <div className="max-h-72 overflow-y-auto">
              {list === null ? <p className="py-4 text-center text-xs text-slate-400"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></p>
                : list.length === 0 ? <p className="px-3 py-4 text-center text-xs text-slate-400">Chưa có dự án nào. Bắt đầu nhập dữ liệu là dự án được tạo và lưu tự động.</p>
                : list.map(x => (
                  <button key={`${x.ownerId}:${x.id}`} onClick={async () => { setMenu(false); if (x.id !== proj?.id) await open(x); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-50 ${x.id === proj?.id ? 'bg-slate-50' : ''}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-700">{x.title}</span>
                      <span className="block truncate text-[11px] text-slate-400">{x.vars} biến · {x.rows} dòng{x.role !== 'owner' ? ` · của ${x.ownerName || 'người khác'} (${x.role === 'view' ? 'xem' : x.role === 'edit' ? 'sửa' : 'quản lý'})` : ''}</span>
                    </span>
                    {x.id === proj?.id && <Check className="h-4 w-4 text-brand" />}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
      {proj && !readOnly && <button onClick={rename} title="Đổi tên dự án" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>}
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        {readOnly ? <><Eye className="h-4 w-4" /> Chỉ xem, thay đổi không được lưu</>
          : status === 'saving' ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu</>
          : status === 'error' ? <><CloudOff className="h-4 w-4 text-amber-500" /> Chưa lưu được, sẽ thử lại khi có thay đổi</>
          : proj ? <><Cloud className="h-4 w-4 text-emerald-500" /> Đã lưu</> : <span className="text-slate-400">Dữ liệu sẽ tự lưu thành dự án khi bạn bắt đầu nhập</span>}
      </span>
      <div className="flex-1" />
      {proj && <AvatarStack people={[{ id: proj.ownerId, name: proj.ownerName }, ...collabs.map(c => ({ id: c.userId, name: c.userName }))]} size="sm" max={5} singleWithName={false} />}
      {proj && <button onClick={() => setShare(true)} className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><UserPlus className="h-4 w-4 text-brand" /> Cộng tác</button>}
      {proj && proj.ownerId === uid && <button onClick={remove} title="Xoá dự án" className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
      {share && proj && currentUser && <ShareDialog type="quant_project" resourceId={proj.id} resourceTitle={proj.title} ownerId={proj.ownerId} ownerName={proj.ownerName} currentUser={currentUser} canManage={canManage} onClose={() => setShare(false)} />}
    </div>
  );
}
