// Bộ chạy quy trình: chạy lần lượt các bước theo đường nối, dữ liệu là mảng item.
// Thứ tự chạy theo cách của n8n bản 1: chạy hết một nhánh rồi mới sang nhánh kế tiếp,
// nhánh nằm cao hơn trên khung vẽ chạy trước. Bước có nhiều đầu vào (Merge) đợi các nhánh trước xong.
import type { Execution, ExecMode, Item, NodeRun, WNode, Workflow, ExecContext } from './types';
import { buildContext, resolveDeep } from './expression';
import { getNodeType } from './nodes';

export interface RunOptions {
  mode: ExecMode;
  user: { id: string; fullName?: string; username?: string };
  triggerNode?: string;                 // bước kích hoạt bắt đầu
  triggerItems?: Item[];                // dữ liệu ra sẵn của bước kích hoạt (lịch chạy)
  destination?: string;                 // chỉ chạy tới bước này (chạy thử một bước)
  seed?: Record<string, NodeRun>;       // dữ liệu lần chạy trước, dùng lại khi chạy một bước
  signal?: AbortSignal;
  onNode?: (name: string, state: 'start' | 'done' | 'error', run?: NodeRun) => void;
  executionId?: string;
}

const MAX_STEPS = 2000;
export const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `x${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new Error('Đã dừng lần chạy')); }, { once: true });
});

export function parentsOf(wf: Workflow, name: string) { return wf.connections.filter(c => c.to === name).map(c => c.from); }
export function childrenOf(wf: Workflow, name: string) { return wf.connections.filter(c => c.from === name).map(c => c.to); }

export function ancestors(wf: Workflow, name: string): Set<string> {
  const out = new Set<string>([name]);
  const st = [name];
  while (st.length) { const n = st.pop()!; for (const p of parentsOf(wf, n)) if (!out.has(p)) { out.add(p); st.push(p); } }
  return out;
}

export function isTrigger(n: WNode) { return !!getNodeType(n.type)?.trigger; }

export function outputCount(n: WNode): number {
  const t = getNodeType(n.type);
  if (!t) return 1;
  return typeof t.outputs === 'function' ? t.outputs({ ...t.defaults, ...n.parameters }) : t.outputs;
}

// Cắt bớt dữ liệu trước khi lưu lịch sử để bản ghi không quá nặng
export function compactRunData(rd: Record<string, NodeRun>, maxItems = 200): Record<string, NodeRun> {
  const out: Record<string, NodeRun> = {};
  for (const [k, r] of Object.entries(rd)) {
    out[k] = { ...r, input: r.input?.slice(0, maxItems), output: r.output.map(o => (o || []).slice(0, maxItems)) };
    if ((r.output || []).some(o => (o || []).length > maxItems)) (out[k] as any).truncated = true;
  }
  return out;
}

export async function runWorkflow(wf: Workflow, opts: RunOptions): Promise<Execution> {
  const exec: Execution = {
    id: opts.executionId || uid(), workflowId: wf.id, mode: opts.mode, status: 'running',
    startedAt: new Date().toISOString(), runData: {},
  };
  const byName = new Map(wf.nodes.map(n => [n.name, n]));
  const pos = (name: string) => byName.get(name)?.position || [0, 0];
  const zone = wf.settings?.timezone || 'Asia/Ho_Chi_Minh';
  const runData = exec.runData;
  const pending = new Map<string, Item[][]>();
  let stack: string[] = [];
  let restrict: Set<string> | null = null;

  const pushInput = (to: string, idx: number, items: Item[]) => {
    const arr = pending.get(to) || [];
    arr[idx] = [...(arr[idx] || []), ...items];
    pending.set(to, arr);
  };

  const propagate = (name: string, output: Item[][]) => {
    if (opts.destination && name === opts.destination) return;
    const kids: Array<{ to: string; y: number; x: number }> = [];
    output.forEach((items, oi) => {
      if (!items || !items.length) return;
      for (const c of wf.connections) {
        if (c.from !== name || c.fromOutput !== oi) continue;
        const kid = byName.get(c.to);
        if (!kid || (restrict && !restrict.has(c.to))) continue;
        pushInput(c.to, c.toInput, items.map(it => ({ json: structuredCloneSafe(it.json) })));
        if (!kids.find(k => k.to === c.to)) kids.push({ to: c.to, y: pos(c.to)[1], x: pos(c.to)[0] });
      }
    });
    // Nhánh cao hơn chạy trước: đẩy vào ngăn xếp theo thứ tự ngược
    kids.sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = kids.length - 1; i >= 0; i--) { stack = stack.filter(s => s !== kids[i].to); stack.push(kids[i].to); }
  };

  // Chuẩn bị điểm bắt đầu
  try {
    if (opts.destination && opts.seed) {
      // Chạy một bước: nếu mọi bước đứng trước đã có dữ liệu thì chỉ chạy bước này
      const dest = byName.get(opts.destination);
      const ps = parentsOf(wf, opts.destination);
      if (dest && !isTrigger(dest) && ps.length && ps.every(p => opts.seed![p])) {
        for (const [k, v] of Object.entries(opts.seed)) if (k !== opts.destination) runData[k] = v;
        for (const c of wf.connections.filter(c => c.to === opts.destination)) {
          const items = opts.seed[c.from]?.output?.[c.fromOutput] || [];
          if (items.length) pushInput(c.to, c.toInput, items.map(it => ({ json: structuredCloneSafe(it.json) })));
        }
        restrict = new Set([opts.destination]);
        stack = [opts.destination];
      }
    }
    if (!stack.length) {
      if (opts.destination) restrict = ancestors(wf, opts.destination);
      const triggers = wf.nodes.filter(n => isTrigger(n) && !n.disabled && (!restrict || restrict.has(n.name)));
      let start = opts.triggerNode ? byName.get(opts.triggerNode) : undefined;
      if (!start) start = triggers.find(n => n.type === 'manualTrigger') || triggers[0];
      if (!start) {
        // Không có bước kích hoạt: bắt đầu từ bước không có đầu vào
        const roots = wf.nodes.filter(n => !parentsOf(wf, n.name).length && (!restrict || restrict.has(n.name)));
        if (!roots.length) throw new Error('Quy trình chưa có bước kích hoạt. Hãy thêm "Chạy thủ công" hoặc "Lịch chạy".');
        start = roots.sort((a, b) => a.position[1] - b.position[1])[0];
      }
      if (opts.triggerItems) {
        const run: NodeRun = { startTime: Date.now(), executionTime: 0, output: [opts.triggerItems] };
        runData[start.name] = run;
        opts.onNode?.(start.name, 'done', run);
        propagate(start.name, run.output);
      } else {
        stack = [start.name];
        pending.set(start.name, [[{ json: {} }]]);
      }
    }

    let steps = 0;
    const deferred = new Set<string>();
    while (stack.length || deferred.size) {
      if (opts.signal?.aborted) throw new Error('Đã dừng lần chạy');
      if (++steps > MAX_STEPS) throw new Error('Quy trình chạy quá nhiều bước, có thể đang lặp vô hạn.');
      let name: string;
      if (stack.length) name = stack.pop()!;
      else { name = [...deferred][0]; deferred.delete(name); }
      const node = byName.get(name);
      if (!node) continue;
      const type = getNodeType(node.type);
      const nInputs = type?.inputs ?? 1;
      const inputs = pending.get(name) || [];

      // Bước nhiều đầu vào: đợi các nhánh còn đang chạy
      if (nInputs > 1 && stack.length) {
        const connected = new Set(wf.connections.filter(c => c.to === name).map(c => c.toInput));
        const filled = [...connected].every(i => (inputs[i] || []).length);
        if (!filled) { deferred.add(name); continue; }
      }
      pending.delete(name);
      deferred.delete(name);

      const run = await executeNode(wf, node, inputs, runData, exec, opts, zone);
      runData[name] = run;
      exec.lastNode = name;
      if (run.error) {
        opts.onNode?.(name, 'error', run);
        throw new NodeError(name, run.error);
      }
      opts.onNode?.(name, 'done', run);
      propagate(name, run.output);
    }
    exec.status = 'success';
  } catch (e: any) {
    exec.status = 'error';
    exec.error = e instanceof NodeError ? `${e.node}: ${e.message}` : (e?.message || String(e));
  }
  exec.finishedAt = new Date().toISOString();
  return exec;
}

class NodeError extends Error { constructor(public node: string, msg: string) { super(msg); } }

function structuredCloneSafe<T>(v: T): T {
  try { return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)); }
  catch { return JSON.parse(JSON.stringify(v ?? null)); }
}

export function normalizeItems(v: any): Item[] {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.filter(x => x !== undefined).map(x => (x && typeof x === 'object' && 'json' in x && typeof x.json === 'object' && x.json !== null && !Array.isArray(x.json)
    ? { json: x.json }
    : { json: x && typeof x === 'object' && !Array.isArray(x) ? x : { value: x } }));
}

async function executeNode(wf: Workflow, node: WNode, inputs: Item[][], runData: Record<string, NodeRun>, exec: Execution, opts: RunOptions, zone: string): Promise<NodeRun> {
  const t0 = Date.now();
  opts.onNode?.(node.name, 'start');
  const type = getNodeType(node.type);
  let items = inputs[0] || [];
  const run: NodeRun = { startTime: t0, executionTime: 0, output: [], input: items };
  if (!type) { run.error = `Không có loại bước "${node.type}"`; return run; }
  const nOut = outputCount(node);
  if (node.disabled) {
    // Bước bị tắt: cho dữ liệu đi thẳng qua
    run.output = [items, ...Array(Math.max(0, nOut - 1)).fill([])];
    run.executionTime = Date.now() - t0;
    return run;
  }
  const st = node.settings || {};
  if (st.executeOnce) items = items.slice(0, 1);
  const params = { ...type.defaults, ...node.parameters };
  const exprBase = (itemIndex: number, list: Item[]) => buildContext({
    runData, items: list, itemIndex, nodeName: node.name, timezone: zone,
    workflow: { id: wf.id, name: wf.name, active: wf.active },
    execution: { id: exec.id, mode: exec.mode }, nodeParams: params,
  });
  const ctx: ExecContext = {
    node, items, inputs: inputs.map((x, i) => (i === 0 ? items : x || [])), mode: opts.mode, workflow: wf, executionId: exec.id, user: opts.user, signal: opts.signal,
    rawParam: (name, fallback) => (params[name] !== undefined ? params[name] : fallback),
    param: (name, itemIndex = 0, fallback) => {
      const v = params[name] !== undefined ? params[name] : fallback;
      const f = type.fields.find(x => x.name === name);
      if (f?.noExpression) return v;
      return resolveDeep(v, exprBase(itemIndex, items));
    },
    evaluate: (value, itemIndex) => resolveDeep(value, exprBase(itemIndex, items)),
    exprContext: (itemIndex) => exprBase(itemIndex, items),
    log: (msg) => { (run as any).logs = [...((run as any).logs || []), String(msg)].slice(-200); },
  };
  const tries = st.retryOnFail ? Math.max(1, Math.min(5, st.maxTries || 3)) : 1;
  let lastErr: any = null;
  for (let a = 0; a < tries; a++) {
    try {
      if (a > 0) await sleep(Math.min(5000, st.waitBetweenTries ?? 1000), opts.signal);
      let out = await type.execute(ctx);
      out = (out || []).map(o => normalizeItems(o));
      while (out.length < nOut) out.push([]);
      if (st.alwaysOutputData && out.every(o => !o.length)) out[0] = [{ json: {} }];
      run.output = out;
      lastErr = null;
      break;
    } catch (e: any) {
      lastErr = e;
      if (opts.signal?.aborted) break;
    }
  }
  if (lastErr) {
    const msg = lastErr?.message || String(lastErr);
    if (st.continueOnFail && !opts.signal?.aborted) {
      run.output = [[{ json: { error: msg } }], ...Array(Math.max(0, nOut - 1)).fill([])];
      (run as any).hint = msg;
    } else {
      run.error = msg;
      run.output = [];
    }
  }
  run.executionTime = Date.now() - t0;
  return run;
}
