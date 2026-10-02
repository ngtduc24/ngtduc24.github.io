import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Play, Square, Loader2, ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Plus, History, Settings2, MoreHorizontal,
  Download, Copy, Trash2, Check, CloudOff, PenSquare, Power, Workflow as WorkflowIcon, ExternalLink, Eraser,
} from 'lucide-react';
import { DateTime } from 'luxon';
import type { Execution, NodeRun, NodeType, WConnection, WNode, Workflow } from '../../lib/automatic/types';
import { runWorkflow, isTrigger, childrenOf, outputCount, uid } from '../../lib/automatic/engine';
import { nextRun } from '../../lib/automatic/schedule';
import { saveWorkflow, saveExecution, setWorkflowActive, deleteWorkflow } from '../../lib/automatic/store';
import { notifyAutomaticChanged } from '../../lib/automatic/scheduler';
import { exportWorkflowJson } from '../../lib/automatic/n8nImport';
import { setSidebarTools } from '../../lib/sidebarTools';
import Canvas, { CanvasHandle, NodeState, NODE } from './Canvas';
import NodeCreator from './NodeCreator';
import NodeDetails from './NodeDetails';
import ExecutionsPanel from './ExecutionsPanel';
import { Overlay, Toggle, uniqueName, renameInParams, fmtDuration } from './shared';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import type { UserAccount } from '../../types';

type Snap = { nodes: WNode[]; connections: WConnection[] };
type AddReq = { from?: string; fromOutput?: number; at?: [number, number]; insert?: WConnection };

const ZONES = ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Australia/Sydney', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'UTC'];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default function WorkflowEditor({ initial, currentUser, onExit }: { initial: Workflow; currentUser: UserAccount; onExit: () => void }) {
  const [wf, setWf] = useState<Workflow>(initial);
  const wfRef = useRef(wf); wfRef.current = wf;
  const [selected, setSelected] = useState<string[]>([]);
  const [runData, setRunData] = useState<Record<string, NodeRun>>({});
  const [states, setStates] = useState<Record<string, NodeState>>({});
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const [tab, setTab] = useState<'editor' | 'executions'>('editor');
  const [creator, setCreator] = useState<AddReq | null>(null);
  const [ndv, setNdv] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ name: string; x: number; y: number } | null>(null);
  const [topMenu, setTopMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [save, setSave] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [saveErr, setSaveErr] = useState('');
  const past = useRef<Snap[]>([]), future = useRef<Snap[]>([]);
  const dragBase = useRef<Snap | null>(null);
  const canvas = useRef<CanvasHandle>(null);
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const user = useMemo(() => ({ id: currentUser.id, fullName: currentUser.fullName, username: (currentUser as any).username }), [currentUser]);

  // ===== Lưu tự động =====
  const firstRender = useRef(true);
  const ver = useRef(0);
  const persist = useCallback(async () => {
    const cur = wfRef.current;
    const v = ver.current;
    setSave('saving');
    try {
      await saveWorkflow(cur);
      // Trong lúc lưu mà có sửa tiếp thì giữ trạng thái chưa lưu, lượt lưu kế tiếp đã được hẹn
      setSave(ver.current === v ? 'saved' : 'dirty');
      setSaveErr('');
      if (cur.active) notifyAutomaticChanged();
    } catch (e: any) { setSave('error'); setSaveErr(e?.message || String(e)); }
  }, []);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    ver.current++;
    setSave('dirty');
    const t = setTimeout(persist, 1200);
    return () => clearTimeout(t);
  }, [wf.nodes, wf.connections, wf.name, wf.settings, persist]);

  const exit = async () => { if (save === 'dirty' || save === 'error') await persist(); onExit(); };

  // ===== Sửa quy trình, có hoàn tác =====
  const snap = (): Snap => ({ nodes: wfRef.current.nodes, connections: wfRef.current.connections });
  const mutate = (fn: (w: Workflow) => Partial<Workflow>, record = true) => {
    if (record) { past.current.push(snap()); if (past.current.length > 100) past.current.shift(); future.current = []; }
    setWf(w => ({ ...w, ...fn(w) }));
  };
  const undo = () => { const s = past.current.pop(); if (!s) return; future.current.push(snap()); setWf(w => ({ ...w, ...s })); };
  const redo = () => { const s = future.current.pop(); if (!s) return; past.current.push(snap()); setWf(w => ({ ...w, ...s })); };

  const byName = (name: string) => wfRef.current.nodes.find(n => n.name === name);

  const onMove = (pos: Record<string, [number, number]>, commit: boolean) => {
    if (!dragBase.current) dragBase.current = snap();
    setWf(w => ({ ...w, nodes: w.nodes.map(n => (pos[n.id] ? { ...n, position: pos[n.id] } : n)) }));
    if (commit) { past.current.push(dragBase.current); future.current = []; dragBase.current = null; }
  };

  const onConnect = (c: WConnection) => {
    const w = wfRef.current;
    if (w.connections.some(x => x.from === c.from && x.fromOutput === c.fromOutput && x.to === c.to && x.toInput === c.toInput)) return;
    mutate(w => ({ connections: [...w.connections, c] }));
  };
  const onDeleteEdge = (c: WConnection) => mutate(w => ({ connections: w.connections.filter(x => !(x.from === c.from && x.fromOutput === c.fromOutput && x.to === c.to && x.toInput === c.toInput)) }));

  const deleteNodes = (names: string[]) => {
    if (!names.length) return;
    mutate(w => {
      let conns = w.connections;
      // Xoá bước nằm giữa 1 vào 1 ra thì nối lại bước trước với bước sau
      for (const nm of names) {
        const ins = conns.filter(c => c.to === nm), outs = conns.filter(c => c.from === nm);
        if (ins.length === 1 && outs.length >= 1 && !names.includes(ins[0].from)) {
          const add = outs.filter(o => !names.includes(o.to)).map(o => ({ from: ins[0].from, fromOutput: ins[0].fromOutput, to: o.to, toInput: o.toInput }));
          conns = [...conns, ...add];
        }
        conns = conns.filter(c => c.from !== nm && c.to !== nm);
      }
      return { nodes: w.nodes.filter(n => !names.includes(n.name)), connections: conns };
    });
    setRunData(r => { const o = { ...r }; names.forEach(n => delete o[n]); return o; });
    setSelected([]);
  };

  const updateNode = (n: WNode) => mutate(w => ({ nodes: w.nodes.map(x => (x.id === n.id ? n : x)) }), false);

  const renameNode = (oldName: string, want: string): string => {
    const nn = uniqueName(wfRef.current, want.trim(), oldName);
    if (nn === oldName) return oldName;
    mutate(w => ({
      nodes: w.nodes.map(x => ({ ...(x.name === oldName ? { ...x, name: nn } : x), parameters: renameInParams(x.parameters, oldName, nn) })),
      connections: w.connections.map(c => ({ ...c, from: c.from === oldName ? nn : c.from, to: c.to === oldName ? nn : c.to })),
    }));
    setRunData(r => { if (!r[oldName]) return r; const o = { ...r, [nn]: r[oldName] }; delete o[oldName]; return o; });
    if (ndv === oldName) setNdv(nn);
    return nn;
  };

  const addNode = (t: NodeType, req: AddReq) => {
    const w = wfRef.current;
    const name = uniqueName(w, t.label);
    let pos: [number, number];
    let nodes = [...w.nodes];
    const snapG = (v: number) => Math.round(v / 20) * 20;
    if (req.insert) {
      const a = byName(req.insert.from)!, b = byName(req.insert.to)!;
      pos = [snapG((a.position[0] + b.position[0]) / 2), snapG((a.position[1] + b.position[1]) / 2)];
      if (b.position[0] - a.position[0] < 440) {
        // Dời các bước phía sau sang phải để có chỗ
        const down = new Set<string>([b.name]); const st = [b.name];
        while (st.length) { const x = st.pop()!; for (const c of childrenOf(w, x)) if (!down.has(c)) { down.add(c); st.push(c); } }
        nodes = nodes.map(n => (down.has(n.name) ? { ...n, position: [n.position[0] + 240, n.position[1]] as [number, number] } : n));
        pos = [snapG(a.position[0] + 240), snapG(a.position[1])];
      }
    } else if (req.from) {
      const a = byName(req.from)!;
      const k = outputCount(a);
      if (req.at) pos = [snapG(req.at[0]), snapG(req.at[1] - NODE / 2)];
      else pos = [snapG(a.position[0] + 240), snapG(a.position[1] + ((req.fromOutput || 0) - (k - 1) / 2) * 160)];
    } else if (t.trigger && w.nodes.length) {
      const minX = Math.min(...w.nodes.map(n => n.position[0]));
      const ys = w.nodes.filter(n => isTrigger(n)).map(n => n.position[1]);
      pos = [snapG(minX - (ys.length ? 0 : 240)), snapG(ys.length ? Math.max(...ys) + 180 : w.nodes[0].position[1])];
    } else {
      const c = canvas.current?.center() || [0, 0];
      pos = [snapG(c[0] - NODE / 2), snapG(c[1] - NODE / 2)];
    }
    // Tránh đè lên bước khác
    for (let i = 0; i < 20 && nodes.some(n => Math.abs(n.position[0] - pos[0]) < 80 && Math.abs(n.position[1] - pos[1]) < 80); i++) pos = [pos[0], pos[1] + 140];
    const node: WNode = { id: uid(), name, type: t.type, position: pos, parameters: clone(t.defaults) };
    let conns = [...w.connections];
    if (req.insert) {
      const c = req.insert;
      conns = conns.filter(x => !(x.from === c.from && x.fromOutput === c.fromOutput && x.to === c.to && x.toInput === c.toInput));
      conns.push({ from: c.from, fromOutput: c.fromOutput, to: name, toInput: 0 });
      if (outputCount(node) > 0) conns.push({ from: name, fromOutput: 0, to: c.to, toInput: c.toInput });
    } else if (req.from && t.inputs > 0) {
      conns.push({ from: req.from, fromOutput: req.fromOutput || 0, to: name, toInput: 0 });
    }
    past.current.push(snap()); future.current = [];
    setWf(x => ({ ...x, nodes: [...nodes, node], connections: conns }));
    setSelected([node.id]);
    setCreator(null);
    setNdv(name);
  };

  const duplicate = (names: string[]) => {
    const w = wfRef.current;
    const src = w.nodes.filter(n => names.includes(n.name));
    if (!src.length) return;
    const map = new Map<string, string>();
    const tmp = { nodes: [...w.nodes] };
    const copies = src.map(n => { const nm = uniqueName(tmp, n.name); map.set(n.name, nm); const c = { ...clone(n), id: uid(), name: nm, position: [n.position[0] + 40, n.position[1] + 60] as [number, number] }; tmp.nodes.push(c); return c; });
    const conns = w.connections.filter(c => map.has(c.from) && map.has(c.to)).map(c => ({ ...c, from: map.get(c.from)!, to: map.get(c.to)! }));
    mutate(x => ({ nodes: [...x.nodes, ...copies], connections: [...x.connections, ...conns] }));
    setSelected(copies.map(c => c.id));
  };

  const copySel = () => {
    const w = wfRef.current;
    const ns = w.nodes.filter(n => selected.includes(n.id));
    if (!ns.length) return;
    const names = new Set(ns.map(n => n.name));
    const data = JSON.stringify({ format: 'edugo-automatic-clip', nodes: ns, connections: w.connections.filter(c => names.has(c.from) && names.has(c.to)) });
    try { localStorage.setItem('automatic_clip', data); } catch { /* bỏ qua */ }
    try { navigator.clipboard?.writeText(data); } catch { /* bỏ qua */ }
    addNotification(`Đã chép ${ns.length} bước`, 'success');
  };
  const paste = () => {
    let raw = ''; try { raw = localStorage.getItem('automatic_clip') || ''; } catch { /* bỏ qua */ }
    if (!raw) return;
    try {
      const j = JSON.parse(raw);
      const w = wfRef.current;
      const tmp = { nodes: [...w.nodes] };
      const c = canvas.current?.center() || [0, 0];
      const minX = Math.min(...j.nodes.map((n: WNode) => n.position[0])), minY = Math.min(...j.nodes.map((n: WNode) => n.position[1]));
      const map = new Map<string, string>();
      const ns: WNode[] = j.nodes.map((n: WNode) => { const nm = uniqueName(tmp, n.name); map.set(n.name, nm); const x = { ...n, id: uid(), name: nm, position: [Math.round((n.position[0] - minX + c[0] - 50) / 20) * 20, Math.round((n.position[1] - minY + c[1] - 50) / 20) * 20] as [number, number] }; tmp.nodes.push(x); return x; });
      const cs = (j.connections || []).map((x: WConnection) => ({ ...x, from: map.get(x.from)!, to: map.get(x.to)! }));
      mutate(x => ({ nodes: [...x.nodes, ...ns], connections: [...x.connections, ...cs] }));
      setSelected(ns.map(n => n.id));
    } catch { /* bỏ qua */ }
  };

  const toggleDisable = (names: string[]) => mutate(w => {
    const allOff = w.nodes.filter(n => names.includes(n.name)).every(n => n.disabled);
    return { nodes: w.nodes.map(n => (names.includes(n.name) ? { ...n, disabled: !allOff } : n)) };
  });

  // ===== Chạy =====
  const execute = async (destination?: string, triggerNode?: string) => {
    if (busy) return;
    const ac = new AbortController(); abort.current = ac;
    setBusy(true);
    const w = wfRef.current;
    if (!destination) { setRunData({}); setStates({}); }
    else setStates(s => { const o = { ...s }; delete o[destination]; return o; });
    const exec = await runWorkflow(w, {
      mode: 'manual', user, destination, triggerNode, seed: destination ? runData : undefined, signal: ac.signal,
      onNode: (name, st, run) => {
        setStates(s => ({ ...s, [name]: st === 'start' ? 'running' : st }));
        if (run) setRunData(r => ({ ...r, [name]: run }));
      },
    });
    setRunData(r => ({ ...(destination ? r : {}), ...exec.runData }));
    setStates(s => { const o: Record<string, NodeState> = {}; for (const [k, v] of Object.entries(s)) o[k] = v === 'running' ? 'error' : v; return o; });
    setBusy(false); abort.current = null;
    if (w.settings?.saveManualExecutions !== false) saveExecution(currentUser.id, exec).catch(() => {});
    const ms = new Date(exec.finishedAt || Date.now()).getTime() - new Date(exec.startedAt).getTime();
    if (exec.status === 'success') addNotification(destination ? `Đã chạy xong bước "${destination}"` : `Quy trình chạy thành công (${fmtDuration(ms)})`, 'success');
    else addNotification(exec.error || 'Quy trình bị lỗi', 'error');
  };
  const stop = () => abort.current?.abort();

  const triggers = wf.nodes.filter(n => isTrigger(n) && !n.disabled);
  const [trigPick, setTrigPick] = useState(false);

  // ===== Bật chạy theo lịch =====
  const scheduleNodes = wf.nodes.filter(n => n.type === 'scheduleTrigger' && !n.disabled);
  const next = useMemo(() => {
    if (!wf.active) return null;
    const rules = scheduleNodes.flatMap(n => n.parameters?.rules || []);
    try { return nextRun(rules, DateTime.now().setZone(wf.settings?.timezone || 'Asia/Ho_Chi_Minh')); } catch { return null; }
  }, [wf.active, wf.nodes, wf.settings?.timezone]);
  const toggleActive = async (on: boolean) => {
    if (on && !scheduleNodes.length) { addNotification('Quy trình cần có bước "Lịch chạy" đang bật thì mới chạy tự động được.', 'error'); return; }
    try {
      if (save !== 'saved') await persist();
      await setWorkflowActive(wf.id, on);
      setWf(w => ({ ...w, active: on }));
      notifyAutomaticChanged();
      addNotification(on ? 'Đã bật. Quy trình sẽ tự chạy theo lịch khi EduGo đang mở.' : 'Đã tắt chạy theo lịch.', 'success');
    } catch (e: any) { addNotification(e?.message || String(e), 'error'); }
  };

  const loadExecution = (e: Execution) => { setRunData(e.runData); const s: Record<string, NodeState> = {}; for (const [k, r] of Object.entries(e.runData)) s[k] = r.error ? 'error' : 'done'; setStates(s); setTab('editor'); };

  const download = () => {
    const blob = new Blob([exportWorkflowJson(wfRef.current)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${wfRef.current.name.replace(/[\\/:*?"<>|]+/g, '_') || 'quy-trinh'}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const removeWorkflow = async () => {
    if (!(await confirm({ title: 'Xoá quy trình', message: `Xoá quy trình "${wf.name}" cùng toàn bộ lịch sử chạy? Không khôi phục được.`, confirmText: 'Xoá' }))) return;
    try { await deleteWorkflow(wf.id); notifyAutomaticChanged(); onExit(); } catch (e: any) { addNotification(e?.message || String(e), 'error'); }
  };

  // ===== Phím tắt =====
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (ndv || creator || settingsOpen || tab !== 'editor') return;
      const mod = e.ctrlKey || e.metaKey;
      const names = wfRef.current.nodes.filter(n => selected.includes(n.id)).map(n => n.name);
      if (e.key === 'Delete' || e.key === 'Backspace') { if (names.length) { e.preventDefault(); deleteNodes(names); } }
      else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); persist(); }
      else if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); setSelected(wfRef.current.nodes.map(n => n.id)); }
      else if (mod && e.key.toLowerCase() === 'c') { copySel(); }
      else if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); paste(); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(names); }
      else if (mod && e.key === 'Enter') { e.preventDefault(); execute(); }
      else if (e.key.toLowerCase() === 'd' && names.length) toggleDisable(names);
      else if (e.key === 'Enter' && names.length === 1) setNdv(names[0]);
      else if (e.key === 'Tab') { e.preventDefault(); setCreator({}); }
      else if (e.key === '1' && e.shiftKey) canvas.current?.fit();
      else if (e.key === '+' || e.key === '=') canvas.current?.zoomBy(1.2);
      else if (e.key === '-') canvas.current?.zoomBy(1 / 1.2);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  // ===== Nút trên thanh bên trái của hệ thống =====
  const execRef = useRef(execute); execRef.current = execute;
  useEffect(() => {
    setSidebarTools([
      { id: 'au-add', label: 'Thêm bước', icon: Plus, active: !!creator, onClick: () => { setTab('editor'); setCreator(c => (c ? null : {})); } },
      { id: 'au-run', label: 'Chạy thử', icon: Play, onClick: () => { setTab('editor'); execRef.current(); } },
      { id: 'au-exec', label: 'Lần chạy', icon: History, active: tab === 'executions', onClick: () => setTab(t => (t === 'executions' ? 'editor' : 'executions')) },
      { id: 'au-set', label: 'Cài đặt quy trình', icon: Settings2, active: settingsOpen, onClick: () => setSettingsOpen(true) },
    ]);
  }, [!!creator, tab, settingsOpen]);
  useEffect(() => () => setSidebarTools(null), []);

  const ndvNode = ndv ? wf.nodes.find(n => n.name === ndv) : null;
  const hasTrigger = wf.nodes.some(n => isTrigger(n));

  return (
    <div className="fixed inset-y-0 left-20 right-0 z-[90] flex flex-col bg-slate-100 text-slate-800">
      {/* Thanh trên */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 sm:px-3">
        <button type="button" onClick={exit} title="Về danh sách quy trình" className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><ArrowLeft size={18} /></button>
        <WorkflowIcon size={18} className="hidden text-brand sm:block" />
        <input value={wf.name} onChange={e => setWf(w => ({ ...w, name: e.target.value }))} className="min-w-0 max-w-[340px] flex-1 rounded-lg border border-transparent px-2 py-1 text-[15px] font-bold outline-none hover:border-slate-200 focus:border-brand" />
        <span className="hidden items-center gap-1 text-[12px] text-slate-400 md:inline-flex" title={saveErr}>
          {save === 'saving' ? <><Loader2 size={13} className="animate-spin" />Đang lưu</> : save === 'dirty' ? <><PenSquare size={13} />Chưa lưu</> : save === 'error' ? <span className="inline-flex items-center gap-1 text-rose-600"><CloudOff size={13} />Lỗi lưu</span> : <><Check size={13} className="text-brand" />Đã lưu</>}
        </span>
        <div className="mx-auto hidden rounded-lg bg-slate-100 p-0.5 sm:inline-flex">
          {(['editor', 'executions'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`h-8 rounded-md px-3 text-[13px] font-semibold ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>{t === 'editor' ? 'Trình soạn' : 'Lần chạy'}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-600" title={next ? `Lần chạy kế tiếp ${next.setLocale('vi').toFormat('HH:mm:ss dd/MM/yyyy')}` : ''}>
            <span className="hidden sm:inline">{wf.active ? 'Đang chạy theo lịch' : 'Chưa bật lịch'}</span>
            <Toggle on={wf.active} onChange={toggleActive} />
          </label>
          <div className="relative">
            <button type="button" onClick={() => setTopMenu(v => !v)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"><MoreHorizontal size={18} /></button>
            {topMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTopMenu(false)} />
                <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-xl" onClick={() => setTopMenu(false)}>
                  <MenuItem icon={<Settings2 size={15} />} label="Cài đặt quy trình" onClick={() => setSettingsOpen(true)} />
                  <MenuItem icon={<Download size={15} />} label="Tải xuống tệp JSON" onClick={download} />
                  <MenuItem icon={<Eraser size={15} />} label="Xoá dữ liệu chạy thử" onClick={() => { setRunData({}); setStates({}); }} />
                  <MenuItem icon={<ExternalLink size={15} />} label="Tài liệu n8n" onClick={() => window.open('https://docs.n8n.io/', '_blank', 'noopener')} />
                  <div className="my-1 h-px bg-slate-100" />
                  <MenuItem icon={<Trash2 size={15} />} label="Xoá quy trình" danger onClick={removeWorkflow} />
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="flex shrink-0 border-b border-slate-200 bg-white sm:hidden">
        {(['editor', 'executions'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 border-b-2 py-2 text-[13px] font-semibold ${tab === t ? 'border-brand text-brand' : 'border-transparent text-slate-500'}`}>{t === 'editor' ? 'Trình soạn' : 'Lần chạy'}</button>
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        {tab === 'executions' ? (
          <ExecutionsPanel wf={wf} onLoad={loadExecution} />
        ) : (
          <>
            <Canvas ref={canvas} wf={wf} selected={selected} onSelect={setSelected} runData={runData} states={states}
              onMove={onMove} onConnect={onConnect} onDeleteEdge={onDeleteEdge} onOpen={setNdv}
              onAdd={req => setCreator(req)} onMenu={(name, x, y) => setMenu({ name, x, y })}
              onExecute={name => execute(name)} onToggle={name => toggleDisable([name])} onDelete={name => deleteNodes([name])} />

            {/* Nút thêm bước góc phải trên */}
            <button type="button" title="Thêm bước (Tab)" onClick={() => setCreator({})} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-brand hover:text-brand"><Plus size={22} /></button>

            {/* Điều khiển khung nhìn */}
            <div className="absolute bottom-4 left-4 z-10 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <IconBtn title="Vừa khung nhìn (Shift+1)" onClick={() => canvas.current?.fit()}><Maximize size={16} /></IconBtn>
              <IconBtn title="Phóng to" onClick={() => canvas.current?.zoomBy(1.2)}><ZoomIn size={16} /></IconBtn>
              <IconBtn title="Thu nhỏ" onClick={() => canvas.current?.zoomBy(1 / 1.2)}><ZoomOut size={16} /></IconBtn>
              <IconBtn title="Hoàn tác (Ctrl+Z)" onClick={undo}><Undo2 size={16} /></IconBtn>
              <IconBtn title="Làm lại (Ctrl+Y)" onClick={redo}><Redo2 size={16} /></IconBtn>
            </div>

            {/* Nút chạy thử quy trình */}
            <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
              {busy ? (
                <button type="button" onClick={stop} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-800 px-5 text-[14px] font-semibold text-white shadow-lg hover:bg-slate-900"><Square size={15} className="fill-white" />Dừng chạy</button>
              ) : (
                <div className="relative flex">
                  <button type="button" onClick={() => (triggers.length > 1 ? setTrigPick(v => !v) : execute())} disabled={!wf.nodes.length} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-[14px] font-semibold text-white shadow-lg hover:bg-brand-hover disabled:opacity-50">
                    <Play size={16} className="fill-white" />Chạy thử quy trình
                  </button>
                  {trigPick && (
                    <div className="absolute bottom-12 left-1/2 w-60 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                      <div className="px-2 py-1 text-[11px] font-bold uppercase text-slate-400">Chạy từ bước kích hoạt</div>
                      {triggers.map(t => <MenuItem key={t.id} icon={<Play size={14} />} label={t.name} onClick={() => { setTrigPick(false); execute(undefined, t.name); }} />)}
                    </div>
                  )}
                </div>
              )}
              {Object.keys(runData).length > 0 && !busy && (
                <button type="button" title="Xoá dữ liệu chạy thử" onClick={() => { setRunData({}); setStates({}); }} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow hover:text-rose-600"><Eraser size={17} /></button>
              )}
            </div>

            {wf.active && next && (
              <div className="absolute left-4 top-4 z-10 rounded-xl border border-brand/30 bg-brand-light px-3 py-2 text-[12px] text-brand-hover shadow-sm">
                Lần chạy kế tiếp {next.setLocale('vi').toFormat('HH:mm dd/MM/yyyy')}
              </div>
            )}

            {creator && <NodeCreator hasTrigger={hasTrigger} onClose={() => setCreator(null)} onPick={t => addNode(t, creator)} />}
          </>
        )}
      </div>

      {menu && (() => {
        const n = byName(menu.name);
        if (!n) return null;
        const close = () => setMenu(null);
        return (
          <div className="fixed inset-0 z-[96]" onPointerDown={close} onContextMenu={e => { e.preventDefault(); close(); }}>
            <div className="absolute w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-xl" style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 280) }} onPointerDown={e => e.stopPropagation()} onClick={close}>
              <MenuItem icon={<PenSquare size={15} />} label="Mở bước" onClick={() => setNdv(n.name)} />
              <MenuItem icon={<Play size={15} />} label="Thực thi bước" onClick={() => execute(n.name)} />
              <MenuItem icon={<Copy size={15} />} label="Nhân bản" onClick={() => duplicate([n.name])} />
              <MenuItem icon={<Power size={15} />} label={n.disabled ? 'Bật bước' : 'Tắt bước'} onClick={() => toggleDisable([n.name])} />
              <MenuItem icon={<Plus size={15} />} label="Thêm bước phía sau" onClick={() => setCreator({ from: n.name, fromOutput: 0 })} />
              <div className="my-1 h-px bg-slate-100" />
              <MenuItem icon={<Trash2 size={15} />} label="Xoá bước" danger onClick={() => deleteNodes([n.name])} />
            </div>
          </div>
        );
      })()}

      {ndvNode && (
        <NodeDetails key={ndvNode.id} wf={wf} node={ndvNode} runData={runData} nodeState={states[ndvNode.name]} busy={busy}
          onChange={updateNode} onRename={renameNode} onExecute={name => execute(name)} onClose={() => setNdv(null)} />
      )}

      {settingsOpen && (
        <Overlay onClose={() => setSettingsOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-[16px] font-bold">Cài đặt quy trình</h3>
            <div className="mt-4 space-y-4">
              <label className="block text-[12px] font-semibold text-slate-600">Múi giờ dùng cho lịch chạy và $now
                <select value={wf.settings?.timezone || 'Asia/Ho_Chi_Minh'} onChange={e => setWf(w => ({ ...w, settings: { ...w.settings, timezone: e.target.value } }))} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-[13px]">
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 text-[13px] text-slate-700">Lưu lịch sử các lần chạy thử
                <Toggle size="sm" on={wf.settings?.saveManualExecutions !== false} onChange={v => setWf(w => ({ ...w, settings: { ...w.settings, saveManualExecutions: v } }))} />
              </label>
              <label className="flex items-center justify-between gap-3 text-[13px] text-slate-700">Gửi thông báo EduGo khi chạy theo lịch bị lỗi
                <Toggle size="sm" on={!!wf.settings?.notifyOnError} onChange={v => setWf(w => ({ ...w, settings: { ...w.settings, notifyOnError: v } }))} />
              </label>
              <p className="rounded-lg bg-slate-50 p-2.5 text-[12px] leading-5 text-slate-500">Lịch chạy hoạt động khi EduGo đang mở trên ít nhất 1 trình duyệt đăng nhập tài khoản của bạn. Nhiều thẻ hoặc nhiều máy cùng mở thì mỗi mốc lịch vẫn chỉ chạy 1 lần.</p>
            </div>
            <div className="mt-5 flex justify-end"><button type="button" onClick={() => setSettingsOpen(false)} className="h-10 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover">Xong</button></div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={title} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">{children}</button>;
}
function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'}`}>{icon}{label}</button>;
}

