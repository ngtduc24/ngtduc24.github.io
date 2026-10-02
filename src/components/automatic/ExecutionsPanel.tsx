import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Trash2, Clock, MousePointerClick, Upload } from 'lucide-react';
import type { Execution, Workflow } from '../../lib/automatic/types';
import { listExecutions, getExecution, deleteExecutions, ExecutionSummary } from '../../lib/automatic/store';
import { AUTOMATIC_EXECUTED } from '../../lib/automatic/scheduler';
import { DataView, ViewSwitch, ViewMode } from './DataView';
import { NodeIcon, fmtDuration, fmtTime, nodeTypeOf } from './shared';
import { useConfirmation } from '../ConfirmationContext';

function StatusIcon({ s }: { s: string }) {
  if (s === 'success') return <CheckCircle2 size={16} className="text-brand" />;
  if (s === 'error') return <XCircle size={16} className="text-rose-500" />;
  return <Loader2 size={16} className="animate-spin text-brand" />;
}

export default function ExecutionsPanel({ wf, onLoad }: { wf: Workflow; onLoad: (e: Execution) => void }) {
  const [list, setList] = useState<ExecutionSummary[] | null>(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<Execution | null>(null);
  const [selNode, setSelNode] = useState('');
  const [mode, setMode] = useState<ViewMode>('table');
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const { confirm } = useConfirmation();

  const load = async () => {
    setErr('');
    try { setList(await listExecutions(wf.id, 200)); } catch (e: any) { setErr(e?.message || String(e)); setList([]); }
  };
  useEffect(() => { load(); }, [wf.id]);
  useEffect(() => {
    const h = (e: any) => { if (e.detail?.workflowId === wf.id) load(); };
    window.addEventListener(AUTOMATIC_EXECUTED, h);
    return () => window.removeEventListener(AUTOMATIC_EXECUTED, h);
  }, [wf.id]);

  const open = async (id: string) => {
    try { const e = await getExecution(id); setSel(e); const first = e ? Object.keys(e.runData)[0] : ''; setSelNode(e?.lastNode && e.status === 'error' ? e.lastNode : first || ''); } catch (e: any) { setErr(e?.message || String(e)); }
  };
  const remove = async (ids: string[]) => {
    if (!(await confirm({ title: 'Xoá lịch sử chạy', message: ids.length > 1 ? `Xoá ${ids.length} lần chạy đang hiện?` : 'Xoá lần chạy này?', confirmText: 'Xoá' }))) return;
    await deleteExecutions(ids).catch(() => {});
    if (sel && ids.includes(sel.id)) setSel(null);
    load();
  };

  const shown = (list || []).filter(x => filter === 'all' || x.status === filter);
  const run = sel?.runData[selNode];
  const node = wf.nodes.find(n => n.name === selNode);

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="flex max-h-[45%] min-h-0 flex-col border-b border-slate-200 bg-white md:max-h-none md:w-[320px] md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <select value={filter} onChange={e => setFilter(e.target.value as any)} className="h-8 rounded-lg border border-slate-200 px-2 text-[12px] font-semibold text-slate-700">
            <option value="all">Tất cả</option><option value="success">Thành công</option><option value="error">Lỗi</option>
          </select>
          <span className="text-[12px] text-slate-500">{shown.length} lần chạy</span>
          <button type="button" title="Tải lại" onClick={load} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><RefreshCw size={15} /></button>
          {shown.length > 0 && <button type="button" title="Xoá các lần chạy đang hiện" onClick={() => remove(shown.map(x => x.id))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {err && <p className="m-3 rounded-lg bg-rose-50 p-2 text-[12px] text-rose-700">{err}</p>}
          {list === null ? <div className="flex justify-center p-6"><Loader2 className="animate-spin text-brand" size={18} /></div>
            : !shown.length ? <p className="p-6 text-center text-[13px] text-slate-500">Chưa có lần chạy nào. Lần chạy thử và lần chạy theo lịch sẽ hiện ở đây.</p>
            : shown.map(x => (
              <button key={x.id} type="button" onClick={() => open(x.id)} className={`flex w-full items-start gap-2.5 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 ${sel?.id === x.id ? 'bg-brand-light/60' : ''}`}>
                <StatusIcon s={x.status} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-slate-800">{fmtTime(x.startedAt)}</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    {x.mode === 'schedule' ? <><Clock size={11} />Theo lịch</> : <><MousePointerClick size={11} />Chạy thử</>}
                    {x.finishedAt && <> · {fmtDuration(new Date(x.finishedAt).getTime() - new Date(x.startedAt).getTime())}</>}
                  </span>
                  {x.error && <span className="mt-0.5 block truncate text-[11px] text-rose-600">{x.error}</span>}
                </span>
              </button>
            ))}
        </div>
      </aside>
      <section className="flex min-h-0 flex-1 flex-col bg-slate-50">
        {!sel ? (
          <div className="grid flex-1 place-items-center p-6 text-[13px] text-slate-500">Chọn một lần chạy để xem dữ liệu của từng bước</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
              <StatusIcon s={sel.status} />
              <span className="text-[13px] font-semibold text-slate-800">{sel.status === 'success' ? 'Thành công' : sel.status === 'error' ? 'Bị lỗi' : 'Đang chạy'}</span>
              <span className="text-[12px] text-slate-500">{fmtTime(sel.startedAt)}</span>
              <button type="button" onClick={() => onLoad(sel)} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand-hover"><Upload size={13} />Xem trên khung vẽ</button>
              <button type="button" title="Xoá lần chạy" onClick={() => remove([sel.id])} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
            </div>
            {sel.error && <div className="m-3 mb-0 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[12px] text-rose-700">{sel.error}</div>}
            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2 md:w-[220px] md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
                {Object.entries(sel.runData).map(([name, r]) => {
                  const n = wf.nodes.find(x => x.name === name);
                  const cnt = (r.output || []).reduce((a, o) => a + (o?.length || 0), 0);
                  return (
                    <button key={name} type="button" onClick={() => setSelNode(name)} className={`flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] ${selNode === name ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/70'}`}>
                      <NodeIcon type={n ? nodeTypeOf(n) : undefined} size={14} />
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{name}</span>
                      {r.error ? <XCircle size={13} className="text-rose-500" /> : <span className="text-[11px] text-slate-400">{cnt}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-2 px-3 py-2">
                  {node && <NodeIcon type={nodeTypeOf(node)} size={16} />}
                  <span className="text-[13px] font-semibold text-slate-700">{selNode}</span>
                  {run && <span className="text-[11px] text-slate-500">{fmtDuration(run.executionTime)}</span>}
                  <div className="ml-auto"><ViewSwitch mode={mode} onChange={setMode} /></div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-white">
                  {run?.error ? <div className="m-3 whitespace-pre-wrap rounded-lg bg-rose-50 p-3 text-[13px] text-rose-700">{run.error}</div>
                    : run ? (run.output || []).map((o, i) => (
                      <div key={i}>
                        {(run.output || []).length > 1 && <div className="bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500">Nhánh {i}</div>}
                        <DataView items={o || []} mode={mode} base="$json" emptyText="Không có item" />
                      </div>
                    )) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
