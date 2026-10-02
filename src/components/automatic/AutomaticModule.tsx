import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Workflow as WorkflowIcon, Plus, Upload, MoreHorizontal, Copy, Download, Trash2, CheckCircle2, XCircle, Loader2, Clock, Database, Info, Sparkles } from 'lucide-react';
import type { UserAccount } from '../../types';
import type { Workflow } from '../../lib/automatic/types';
import { listWorkflows, createWorkflow, deleteWorkflow, setWorkflowActive, getWorkflow, WorkflowSummary, MissingTableError } from '../../lib/automatic/store';
import { notifyAutomaticChanged, AUTOMATIC_EXECUTED } from '../../lib/automatic/scheduler';
import { TEMPLATES } from '../../lib/automatic/templates';
import { importWorkflowJson, exportWorkflowJson } from '../../lib/automatic/n8nImport';
import { describeRule } from '../../lib/automatic/schedule';
import { getNodeType } from '../../lib/automatic/nodes';
import { PageHeader, Card, Button, SearchInput, EmptyState, Spinner } from '../ui';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';
import WorkflowEditor from './WorkflowEditor';
import { Icon, NodeIcon, Toggle, fmtAgo } from './shared';

export default function AutomaticModule({ currentUser }: { currentUser: UserAccount }) {
  const [items, setItems] = useState<WorkflowSummary[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Workflow | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [creating, setCreating] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();

  const load = async () => {
    setError('');
    try { setItems(await listWorkflows(currentUser.id)); setMissing(false); }
    catch (e: any) { if (e instanceof MissingTableError) setMissing(true); else setError(e?.message || String(e)); setItems([]); }
  };
  useEffect(() => { load(); }, [currentUser.id]);
  useEffect(() => {
    const h = () => { if (!open) load(); };
    window.addEventListener(AUTOMATIC_EXECUTED, h);
    return () => window.removeEventListener(AUTOMATIC_EXECUTED, h);
  }, [open]);
  // Mở lại quy trình đang soạn khi tải lại trang
  useEffect(() => {
    let id = ''; try { id = sessionStorage.getItem('automatic_open') || ''; } catch { /* bỏ qua */ }
    if (id) getWorkflow(id).then(w => { if (w) setOpen(w); }).catch(() => {});
  }, []);
  useEffect(() => { try { open ? sessionStorage.setItem('automatic_open', open.id) : sessionStorage.removeItem('automatic_open'); } catch { /* bỏ qua */ } }, [open?.id]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (items || []).filter(w => !k || w.name.toLowerCase().includes(k));
  }, [items, q]);

  const createFrom = async (key: string, data?: Partial<Workflow>) => {
    setCreating(key);
    try {
      const t = TEMPLATES.find(x => x.key === key);
      const built = data || (t ? { name: t.key === 'blank' ? 'Quy trình mới' : t.name, ...t.build() } : {});
      const wf = await createWorkflow(currentUser.id, built);
      setOpen(wf);
    } catch (e: any) {
      if (e instanceof MissingTableError) setMissing(true);
      addNotification(e?.message || String(e), 'error');
    } finally { setCreating(''); }
  };

  const onImport = async (f: File) => {
    try {
      const r = importWorkflowJson(await f.text());
      await createFrom('import', { name: r.name, nodes: r.nodes, connections: r.connections, settings: r.settings });
      if (r.unsupported.length) addNotification(`Đã nhập. ${r.unsupported.length} bước chưa hỗ trợ được đổi thành "Không làm gì": ${r.unsupported.slice(0, 3).join(', ')}${r.unsupported.length > 3 ? '…' : ''}`, 'warning');
      else addNotification('Đã nhập quy trình', 'success');
    } catch (e: any) { addNotification(e?.message || String(e), 'error'); }
  };

  const duplicate = async (w: Workflow) => createFrom('dup', { name: `${w.name} (bản sao)`, nodes: w.nodes, connections: w.connections, settings: w.settings });
  const download = (w: Workflow) => {
    const blob = new Blob([exportWorkflowJson(w)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${w.name.replace(/[\\/:*?"<>|]+/g, '_')}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const remove = async (w: Workflow) => {
    if (!(await confirm({ title: 'Xoá quy trình', message: `Xoá quy trình "${w.name}" cùng toàn bộ lịch sử chạy? Không khôi phục được.`, confirmText: 'Xoá' }))) return;
    try { await deleteWorkflow(w.id); setItems(p => (p || []).filter(x => x.id !== w.id)); notifyAutomaticChanged(); }
    catch (e: any) { addNotification(e?.message || String(e), 'error'); }
  };
  const toggle = async (w: WorkflowSummary, on: boolean) => {
    if (on && !w.nodes.some(n => n.type === 'scheduleTrigger' && !n.disabled)) { addNotification('Quy trình cần có bước "Lịch chạy" thì mới bật chạy tự động được.', 'error'); return; }
    try { await setWorkflowActive(w.id, on); setItems(p => (p || []).map(x => (x.id === w.id ? { ...x, active: on } : x))); notifyAutomaticChanged(); }
    catch (e: any) { addNotification(e?.message || String(e), 'error'); }
  };

  if (open) return <WorkflowEditor initial={open} currentUser={currentUser} onExit={() => { setOpen(null); load(); }} />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<WorkflowIcon size={22} />}
        title="Automatic"
        description="Tự động hoá công việc bằng quy trình kéo thả: bước kích hoạt, gọi API, rẽ nhánh, biến đổi dữ liệu, chạy theo lịch."
        actions={<>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={missing}><Upload size={16} />Nhập tệp n8n</Button>
          <Button onClick={() => createFrom('blank')} disabled={missing || !!creating}>{creating === 'blank' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Tạo quy trình</Button>
        </>}
      />

      {missing && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex gap-3">
            <Database className="mt-0.5 shrink-0 text-amber-600" size={20} />
            <div className="text-[13px] leading-6 text-amber-900">
              <div className="font-semibold">Chưa có bảng dữ liệu cho Automatic</div>
              Quản trị viên mở Supabase, vào SQL Editor, dán toàn bộ nội dung tệp AUTOMATIC.sql rồi bấm Run. Sau đó tải lại trang này.
            </div>
          </div>
        </Card>
      )}
      {error && <Card className="border-rose-200 bg-rose-50 text-[13px] text-rose-700">{error}</Card>}

      {!missing && (
        <Card padding="none">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Quy trình của tôi</h2>
            <span className="text-[13px] text-slate-500">{items?.length ?? 0} quy trình · {(items || []).filter(w => w.active).length} đang chạy theo lịch</span>
            <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm quy trình" wrapClassName="ml-auto w-full sm:w-64" size="sm" />
          </div>
          {items === null ? <Spinner /> : !filtered.length ? (
            <EmptyState icon={<WorkflowIcon size={26} />} title={items.length ? 'Không có quy trình phù hợp' : 'Chưa có quy trình nào'} description="Tạo quy trình trống hoặc bắt đầu từ một mẫu bên dưới." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map(w => {
                const sched = w.nodes.filter(n => n.type === 'scheduleTrigger' && !n.disabled).flatMap(n => (n.parameters?.rules || []).map((r: any) => describeRule(r)));
                const types = [...new Set(w.nodes.map(n => n.type))].slice(0, 6);
                return (
                  <li key={w.id} className="group flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3.5 last:rounded-b-2xl hover:bg-slate-50" onClick={() => setOpen(w)}>
                    <div className="flex -space-x-1.5">
                      {types.map(t => <span key={t} className="grid h-8 w-8 place-items-center rounded-lg border-2 border-white bg-slate-50"><NodeIcon type={getNodeType(t)} size={15} /></span>)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-slate-800">{w.name}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-slate-500">
                        <span>Sửa {fmtAgo(w.updatedAt)}</span>
                        <span>{w.nodes.length} bước</span>
                        {sched.length > 0 && <span className="inline-flex items-center gap-1"><Clock size={12} />{sched.join(' · ')}</span>}
                        {w.lastExec && (
                          <span className="inline-flex items-center gap-1">
                            {w.lastExec.status === 'success' ? <CheckCircle2 size={12} className="text-brand" /> : w.lastExec.status === 'error' ? <XCircle size={12} className="text-rose-500" /> : <Loader2 size={12} className="animate-spin" />}
                            Chạy {fmtAgo(w.lastExec.startedAt)}{w.lastExec.mode === 'schedule' ? ' theo lịch' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600" onClick={e => e.stopPropagation()}>
                      <span className="hidden sm:inline">{w.active ? 'Đang chạy' : 'Đang tắt'}</span>
                      <Toggle on={w.active} onChange={v => toggle(w, v)} />
                    </label>
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button type="button" onClick={() => setMenu(m => (m === w.id ? null : w.id))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><MoreHorizontal size={18} /></button>
                      {menu === w.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} />
                          <div className="absolute right-0 top-10 z-40 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl" onClick={() => setMenu(null)}>
                            <Item icon={<Copy size={15} />} label="Nhân bản" onClick={() => duplicate(w)} />
                            <Item icon={<Download size={15} />} label="Tải xuống JSON" onClick={() => download(w)} />
                            <Item icon={<Trash2 size={15} />} label="Xoá" danger onClick={() => remove(w)} />
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {!missing && (
        <div>
          <div className="mb-3 flex items-center gap-2"><Sparkles size={16} className="text-brand" /><h2 className="text-base font-semibold text-slate-800">Bắt đầu từ mẫu</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TEMPLATES.filter(t => t.key !== 'blank').map(t => (
              <Card key={t.key} padding="item" interactive className="flex cursor-pointer flex-col gap-2" onClick={() => !creating && createFrom(t.key)}>
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-light text-brand">{creating === t.key ? <Loader2 size={18} className="animate-spin" /> : <Icon name={t.icon} size={18} />}</span>
                  <div className="text-[14px] font-semibold text-slate-800">{t.name}</div>
                </div>
                <p className="text-[12px] leading-5 text-slate-500">{t.desc}</p>
                <div className="mt-auto flex flex-wrap gap-1 pt-1">
                  {[...new Set(t.build().nodes.map(n => n.type))].map(ty => <span key={ty} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-50"><NodeIcon type={getNodeType(ty)} size={14} /></span>)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="flex gap-3 text-[13px] leading-6 text-slate-600">
        <Info size={18} className="mt-1 shrink-0 text-brand" />
        <div>
          Mỗi quy trình gồm các bước nối với nhau, dữ liệu chạy qua từng bước dưới dạng danh sách item. Bước kích hoạt quyết định khi nào quy trình chạy: <b>Chạy thủ công</b> để thử, <b>Lịch chạy</b> để tự chạy theo giờ, ngày, tuần, tháng hoặc cron.
          Lịch chạy hoạt động khi EduGo đang mở trên ít nhất 1 trình duyệt đăng nhập tài khoản của bạn, mỗi mốc lịch chỉ chạy 1 lần dù mở nhiều thẻ.
          Bước Gọi HTTP chạy ngay trên trình duyệt nên chỉ gọi được các API cho phép truy cập chéo nguồn (CORS).
        </div>
      </Card>
    </div>
  );
}

function Item({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'}`}>{icon}{label}</button>;
}
