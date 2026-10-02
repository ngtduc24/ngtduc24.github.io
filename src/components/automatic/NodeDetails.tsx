import React, { useMemo, useState } from 'react';
import { ArrowLeft, Play, Loader2, BookOpen, AlertTriangle, CheckCircle2, Power, Pin } from 'lucide-react';
import type { NodeRun, NodeSettings, WNode, Workflow } from '../../lib/automatic/types';
import { ancestors, outputCount, parentsOf } from '../../lib/automatic/engine';
import { ParamForm, FormProvider, useInsertTarget } from './ParamForm';
import { DataView, ViewSwitch, ViewMode } from './DataView';
import { NodeIcon, Overlay, Toggle, fmtDuration, nodeTypeOf } from './shared';

interface Props {
  wf: Workflow;
  node: WNode;
  runData: Record<string, NodeRun>;
  nodeState?: 'running' | 'done' | 'error';
  busy: boolean;
  onChange: (n: WNode) => void;
  onRename: (oldName: string, newName: string) => string;   // trả về tên thật sau khi chống trùng
  onExecute: (nodeName: string) => void;
  onClose: () => void;
}

type MobileTab = 'input' | 'params' | 'output';

export default function NodeDetails({ wf, node, runData, nodeState, busy, onChange, onRename, onExecute, onClose }: Props) {
  const type = nodeTypeOf(node);
  const [tab, setTab] = useState<'params' | 'settings'>('params');
  const [mtab, setMtab] = useState<MobileTab>('params');
  const [name, setName] = useState(node.name);
  const [inMode, setInMode] = useState<ViewMode>('schema');
  const [outMode, setOutMode] = useState<ViewMode>('table');
  const [outBranch, setOutBranch] = useState(0);
  const { register, insert } = useInsertTarget();

  // Các bước đứng trước đã có dữ liệu
  const directParents = useMemo(() => parentsOf(wf, node.name), [wf, node.name]);
  const upstream = useMemo(() => [...ancestors(wf, node.name)].filter(n => n !== node.name), [wf, node.name]);
  const [inNode, setInNode] = useState<string>(() => directParents.find(p => runData[p]) || directParents[0] || upstream.find(p => runData[p]) || '');
  const isDirect = directParents.includes(inNode);

  const inputItems = useMemo(() => {
    const r = runData[inNode];
    if (!r) return [];
    const c = wf.connections.find(c => c.from === inNode && c.to === node.name);
    if (c) return r.output?.[c.fromOutput] || [];
    for (const o of r.output || []) if (o?.length) return o;
    return [];
  }, [runData, inNode, wf.connections, node.name]);

  // Dữ liệu vào cổng 1 dùng để xem trước biểu thức
  const previewItems = useMemo(() => {
    const own = runData[node.name]?.input;
    if (own && own.length) return own;
    const c = wf.connections.find(c => c.to === node.name && c.toInput === 0 && runData[c.from]);
    return c ? runData[c.from].output?.[c.fromOutput] || [] : [];
  }, [runData, node.name, wf.connections]);

  const exprData = useMemo(() => (Object.keys(runData).length ? {
    runData, items: previewItems, itemIndex: 0, nodeName: node.name, timezone: wf.settings?.timezone || 'Asia/Ho_Chi_Minh',
    workflow: { id: wf.id, name: wf.name, active: wf.active }, execution: { id: 'xem-truoc', mode: 'manual' }, nodeParams: node.parameters,
  } : null), [runData, previewItems, node.name, node.parameters, wf.id, wf.name, wf.active, wf.settings?.timezone]);

  const run = runData[node.name];
  const nOut = outputCount(node);
  const outNames = type?.outputNames?.({ ...type.defaults, ...node.parameters }) || [];
  const outItems = run?.output?.[outBranch] || [];
  const commitName = () => { const n = name.trim(); if (!n || n === node.name) { setName(node.name); return; } setName(onRename(node.name, n)); };
  const setSettings = (s: Partial<NodeSettings>) => onChange({ ...node, settings: { ...(node.settings || {}), ...s } });

  const inputPanel = (
    <section className="flex min-h-0 flex-col bg-slate-50">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
        <span className="text-[12px] font-bold uppercase tracking-wide text-slate-500">Dữ liệu vào</span>
        {upstream.length > 0 && (
          <select value={inNode} onChange={e => setInNode(e.target.value)} className="h-8 max-w-[180px] rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-700">
            {upstream.map(u => <option key={u} value={u}>{u}{runData[u] ? '' : ' (chưa chạy)'}</option>)}
          </select>
        )}
        <div className="ml-auto"><ViewSwitch mode={inMode} onChange={setInMode} /></div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {type?.trigger ? (
          <div className="p-6 text-center text-[13px] text-slate-500">Bước kích hoạt là điểm bắt đầu nên không có dữ liệu vào.</div>
        ) : !upstream.length ? (
          <div className="p-6 text-center text-[13px] text-slate-500">Bước này chưa được nối với bước nào ở phía trước.</div>
        ) : !runData[inNode] ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center text-[13px] text-slate-500">
            Bước "{inNode}" chưa chạy nên chưa có dữ liệu.
            <button type="button" disabled={busy} onClick={() => onExecute(inNode)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}Thực thi các bước trước
            </button>
          </div>
        ) : (
          <DataView items={inputItems} mode={inMode} base={isDirect ? '$json' : `$('${inNode.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}').item.json`} onInsert={t => { insert(t); }} emptyText="Bước trước chạy xong nhưng không trả ra item nào" />
        )}
      </div>
    </section>
  );

  const paramsPanel = (
    <section className="flex min-h-0 flex-col bg-white">
      <div className="flex items-center gap-1 border-b border-slate-200 px-3 pt-2">
        {(['params', 'settings'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 pb-2 text-[13px] font-semibold ${tab === t ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t === 'params' ? 'Tham số' : 'Cài đặt'}</button>
        ))}
        {type?.docs && <a href={type.docs} target="_blank" rel="noreferrer" className="ml-auto mb-1.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-slate-500 hover:bg-slate-100"><BookOpen size={13} />Tài liệu n8n</a>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {type && <p className="mb-4 text-[12px] leading-5 text-slate-500">{type.desc}</p>}
        <FormProvider expr={exprData} register={register}>
          {tab === 'params' ? (
            type ? <ParamForm fields={type.fields} values={node.parameters} defaults={type.defaults} onChange={p => onChange({ ...node, parameters: p })} />
              : <p className="text-[13px] text-rose-600">Không nhận ra loại bước "{node.type}".</p>
          ) : (
            <div className="space-y-4">
              <Row label="Tắt bước này" hint="Bước bị tắt cho dữ liệu đi thẳng qua."><Toggle size="sm" on={!!node.disabled} onChange={v => onChange({ ...node, disabled: v })} /></Row>
              <Row label="Luôn trả ra dữ liệu" hint="Không có kết quả vẫn trả 1 item rỗng để các bước sau vẫn chạy."><Toggle size="sm" on={!!node.settings?.alwaysOutputData} onChange={v => setSettings({ alwaysOutputData: v })} /></Row>
              <Row label="Chỉ chạy 1 lần" hint="Chỉ dùng item đầu tiên của dữ liệu vào."><Toggle size="sm" on={!!node.settings?.executeOnce} onChange={v => setSettings({ executeOnce: v })} /></Row>
              <Row label="Thử lại khi lỗi"><Toggle size="sm" on={!!node.settings?.retryOnFail} onChange={v => setSettings({ retryOnFail: v })} /></Row>
              {node.settings?.retryOnFail && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[12px] font-semibold text-slate-600">Số lần thử tối đa
                    <input type="number" min={2} max={5} value={node.settings?.maxTries ?? 3} onChange={e => setSettings({ maxTries: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px]" />
                  </label>
                  <label className="text-[12px] font-semibold text-slate-600">Chờ giữa 2 lần (ms)
                    <input type="number" min={0} max={5000} step={100} value={node.settings?.waitBetweenTries ?? 1000} onChange={e => setSettings({ waitBetweenTries: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px]" />
                  </label>
                </div>
              )}
              <Row label="Lỗi thì vẫn chạy tiếp" hint="Ghi nội dung lỗi vào item rồi đi tiếp thay vì dừng quy trình."><Toggle size="sm" on={!!node.settings?.continueOnFail} onChange={v => setSettings({ continueOnFail: v })} /></Row>
              <div>
                <div className="mb-1 text-[12px] font-semibold text-slate-600">Ghi chú</div>
                <textarea value={node.notes || ''} onChange={e => onChange({ ...node, notes: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 p-2 text-[13px] outline-none focus:border-brand" placeholder="Ghi chú cho bước này" />
              </div>
            </div>
          )}
        </FormProvider>
      </div>
    </section>
  );

  const outputPanel = (
    <section className="flex min-h-0 flex-col bg-slate-50">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
        <span className="text-[12px] font-bold uppercase tracking-wide text-slate-500">Dữ liệu ra</span>
        {run && !run.error && <span className="text-[12px] text-slate-500">{(run.output || []).reduce((a, o) => a + (o?.length || 0), 0)} item · {fmtDuration(run.executionTime)}</span>}
        <div className="ml-auto"><ViewSwitch mode={outMode} onChange={setOutMode} /></div>
      </div>
      {nOut > 1 && run && !run.error && (
        <div className="flex flex-wrap gap-1 border-b border-slate-200 px-3 py-1.5">
          {Array.from({ length: nOut }, (_, i) => (
            <button key={i} type="button" onClick={() => setOutBranch(i)} className={`h-7 rounded-md px-2.5 text-[12px] font-semibold ${outBranch === i ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
              {outNames[i] ? `Nhánh ${outNames[i]}` : `Nhánh ${i}`} ({run.output?.[i]?.length || 0})
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {nodeState === 'running' ? (
          <div className="flex items-center justify-center gap-2 p-8 text-[13px] text-slate-500"><Loader2 size={16} className="animate-spin text-brand" />Đang chạy bước này...</div>
        ) : run?.error ? (
          <div className="m-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">
            <div className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle size={15} />Bước bị lỗi</div>
            <div className="whitespace-pre-wrap break-words">{run.error}</div>
          </div>
        ) : run ? (
          <>
            {(run as any).hint && <div className="m-3 rounded-lg bg-amber-50 p-2 text-[12px] text-amber-800">Lỗi đã được bỏ qua: {(run as any).hint}</div>}
            <DataView items={outItems} mode={outMode} base="$json" emptyText="Bước chạy xong nhưng không trả ra item nào ở nhánh này" />
            {(run as any).logs?.length > 0 && (
              <div className="m-3 rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-slate-200">
                <div className="mb-1 font-sans text-[11px] font-semibold text-slate-400">console.log</div>
                {(run as any).logs.map((l: string, i: number) => <div key={i} className="whitespace-pre-wrap break-words">{l}</div>)}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-[13px] text-slate-500">
            Chưa có dữ liệu ra.
            <button type="button" disabled={busy} onClick={() => onExecute(node.name)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-[13px] font-semibold text-white hover:bg-orange-600 disabled:opacity-50"><Play size={14} />Thực thi bước</button>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <Overlay onClose={onClose}>
      <div className="flex h-full max-h-[96vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"><ArrowLeft size={16} /><span className="hidden sm:inline">Về khung vẽ</span></button>
          <NodeIcon type={type} size={18} boxed />
          <input value={name} onChange={e => setName(e.target.value)} onBlur={commitName} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-[15px] font-bold text-slate-800 outline-none hover:border-slate-200 focus:border-brand" />
          {node.disabled && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500"><Power size={11} />Đang tắt</span>}
          {run && !run.error && <CheckCircle2 size={18} className="text-emerald-500" />}
          <button type="button" disabled={busy} onClick={() => onExecute(node.name)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-[13px] font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}{type?.trigger ? 'Chạy thử bước kích hoạt' : 'Thực thi bước'}
          </button>
        </header>
        {/* Màn hình nhỏ: chuyển qua lại 3 phần bằng thẻ */}
        <div className="flex shrink-0 border-b border-slate-200 lg:hidden">
          {([['input', 'Dữ liệu vào'], ['params', 'Tham số'], ['output', 'Dữ liệu ra']] as Array<[MobileTab, string]>).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMtab(k)} className={`flex-1 border-b-2 py-2 text-[13px] font-semibold ${mtab === k ? 'border-brand text-brand' : 'border-transparent text-slate-500'}`}>{l}</button>
          ))}
        </div>
        <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] lg:divide-x lg:divide-slate-200">
          {inputPanel}{paramsPanel}{outputPanel}
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">
          {mtab === 'input' ? inputPanel : mtab === 'params' ? paramsPanel : outputPanel}
        </div>
        <p className="hidden shrink-0 items-center gap-1 border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400 lg:flex"><Pin size={11} />Kéo trường ở cột Dữ liệu vào thả vào ô tham số để tạo biểu thức {'{{ $json.ten_truong }}'}.</p>
      </div>
    </Overlay>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[13px] font-medium text-slate-700">{label}</div>{hint && <div className="text-[11px] text-slate-400">{hint}</div>}</div>
      {children}
    </div>
  );
}
