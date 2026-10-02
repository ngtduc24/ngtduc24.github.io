// Lưu quy trình và lịch sử chạy trên Supabase (bảng automatic_workflows, automatic_executions).
// Chính sách RLS chỉ cho chủ sở hữu đọc và ghi, admin cũng không xem được quy trình của người khác.
import { supabase } from '../supabase';
import type { Execution, ExecMode, ExecStatus, Workflow } from './types';
import { compactRunData } from './engine';

const WF = 'automatic_workflows';
const EX = 'automatic_executions';

export class MissingTableError extends Error {}

function check(error: any) {
  if (!error) return;
  const code = String(error.code || ''), msg = String(error.message || '');
  if (code === '42P01' || code === 'PGRST205' || /relation .* does not exist|Could not find the table/i.test(msg)) {
    throw new MissingTableError('Chưa có bảng dữ liệu của Automatic. Quản trị viên cần chạy tệp AUTOMATIC.sql trong Supabase.');
  }
  throw new Error(msg || 'Lỗi máy chủ');
}

const rowToWf = (r: any): Workflow => ({
  id: r.id, ownerId: r.owner_id, name: r.name, nodes: r.nodes || [], connections: r.connections || [],
  settings: r.settings || {}, active: !!r.active, lastSlot: r.last_slot, createdAt: r.created_at, updatedAt: r.updated_at,
});

export interface WorkflowSummary extends Workflow { lastExec?: { status: ExecStatus; startedAt: string; mode: ExecMode } | null }

export async function listWorkflows(ownerId: string): Promise<WorkflowSummary[]> {
  const { data, error } = await supabase.from(WF).select('*').eq('owner_id', ownerId).is('deleted_at', null).order('updated_at', { ascending: false });
  check(error);
  const list = (data || []).map(rowToWf) as WorkflowSummary[];
  if (list.length) {
    const { data: ex } = await supabase.from(EX).select('workflow_id,status,started_at,mode').eq('owner_id', ownerId).order('started_at', { ascending: false }).limit(300);
    for (const w of list) {
      const e = (ex || []).find((x: any) => x.workflow_id === w.id);
      w.lastExec = e ? { status: e.status, startedAt: e.started_at, mode: e.mode } : null;
    }
  }
  return list;
}

export async function listActiveWorkflows(ownerId: string): Promise<Workflow[]> {
  const { data, error } = await supabase.from(WF).select('*').eq('owner_id', ownerId).eq('active', true).is('deleted_at', null);
  check(error);
  return (data || []).map(rowToWf);
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  const { data, error } = await supabase.from(WF).select('*').eq('id', id).maybeSingle();
  check(error);
  return data ? rowToWf(data) : null;
}

export async function createWorkflow(ownerId: string, wf: Partial<Workflow>): Promise<Workflow> {
  const { data, error } = await supabase.from(WF).insert({
    owner_id: ownerId, name: wf.name || 'Quy trình mới', nodes: wf.nodes || [], connections: wf.connections || [],
    settings: wf.settings || { timezone: 'Asia/Ho_Chi_Minh', saveManualExecutions: true }, active: false,
  }).select('*').single();
  check(error);
  return rowToWf(data);
}

export async function saveWorkflow(wf: Workflow): Promise<string> {
  const updated_at = new Date().toISOString();
  const { error } = await supabase.from(WF).update({
    name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings, updated_at,
  }).eq('id', wf.id);
  check(error);
  return updated_at;
}

export async function setWorkflowActive(id: string, active: boolean) {
  // Khi bật lại thì ghi mốc hiện tại để không chạy bù các mốc đã qua
  const patch: any = { active, updated_at: new Date().toISOString() };
  if (active) patch.last_slot = slotKey(Date.now());
  const { error } = await supabase.from(WF).update(patch).eq('id', id);
  check(error);
}

export async function deleteWorkflow(id: string) {
  const { error } = await supabase.from(WF).delete().eq('id', id);
  check(error);
}

// Mốc lịch dạng chuỗi ISO giờ UTC, so sánh theo thứ tự chữ cái cũng đúng thứ tự thời gian
export const slotKey = (ms: number) => new Date(Math.floor(ms / 1000) * 1000).toISOString();

// Giành quyền chạy một mốc lịch: chỉ 1 máy cập nhật được, máy khác nhận về rỗng và bỏ qua
export async function claimSlot(id: string, ms: number): Promise<boolean> {
  const slot = slotKey(ms);
  const { data, error } = await supabase.from(WF).update({ last_slot: slot }).eq('id', id).eq('active', true)
    .or(`last_slot.is.null,last_slot.lt."${slot}"`).select('id');
  if (error) return false;
  return !!(data && data.length);
}

export async function saveExecution(ownerId: string, e: Execution) {
  const row = {
    id: e.id, workflow_id: e.workflowId, owner_id: ownerId, mode: e.mode, status: e.status,
    started_at: e.startedAt, finished_at: e.finishedAt || null, error: e.error || null,
    data: { runData: compactRunData(e.runData), lastNode: e.lastNode || null },
  };
  const { error } = await supabase.from(EX).upsert(row, { onConflict: 'id' });
  check(error);
  // Chỉ giữ 200 lần chạy gần nhất của mỗi quy trình
  const { data: old } = await supabase.from(EX).select('id').eq('workflow_id', e.workflowId).order('started_at', { ascending: false }).range(200, 400);
  if (old && old.length) await supabase.from(EX).delete().in('id', old.map((x: any) => x.id));
}

export interface ExecutionSummary { id: string; workflowId: string; mode: ExecMode; status: ExecStatus; startedAt: string; finishedAt?: string | null; error?: string | null }

export async function listExecutions(workflowId: string, limit = 100): Promise<ExecutionSummary[]> {
  const { data, error } = await supabase.from(EX).select('id,workflow_id,mode,status,started_at,finished_at,error').eq('workflow_id', workflowId).order('started_at', { ascending: false }).limit(limit);
  check(error);
  return (data || []).map((r: any) => ({ id: r.id, workflowId: r.workflow_id, mode: r.mode, status: r.status, startedAt: r.started_at, finishedAt: r.finished_at, error: r.error }));
}

export async function getExecution(id: string): Promise<Execution | null> {
  const { data, error } = await supabase.from(EX).select('*').eq('id', id).maybeSingle();
  check(error);
  if (!data) return null;
  return { id: data.id, workflowId: data.workflow_id, mode: data.mode, status: data.status, startedAt: data.started_at, finishedAt: data.finished_at, error: data.error, runData: data.data?.runData || {}, lastNode: data.data?.lastNode || undefined };
}

export async function deleteExecutions(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from(EX).delete().in('id', ids);
  check(error);
}
