import { supabase } from './supabase';
import { getEduCtx } from './edu';

// Dự án phân tích định lượng: biến, dữ liệu, kết quả được lưu lên máy chủ theo từng dự án.
// Lưu ở bảng portfolio_settings với khoá quant:<chủ>:<mã> (giống Bài giảng), không cần tạo bảng mới.
// Người cộng tác dùng bảng collaborators loại quant_project với 3 mức Xem, Chỉnh sửa, Quản lý.

export interface QuantProject {
  id: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  variables: any[];
  data: any[];
  results: any[];
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  deletedAt?: string | null;
}
export interface QuantSummary { id: string; ownerId: string; ownerName?: string; title: string; updatedAt: string; rows: number; vars: number; role: 'owner' | 'view' | 'edit' | 'manage' }

const T = 'portfolio_settings';
const me = () => getEduCtx().userId;
export const quantKey = (owner: string, id: string) => `quant:${owner}:${id}`;
const newId = () => `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function fromRow(key: string, d: any): QuantProject {
  const [, owner, id] = key.split(':');
  return {
    id, ownerId: owner, ownerName: d.ownerName, title: d.title || 'Dự án không tên',
    variables: Array.isArray(d.variables) ? d.variables : [], data: Array.isArray(d.data) ? d.data : [], results: Array.isArray(d.results) ? d.results : [],
    createdAt: d.createdAt || '', updatedAt: d.updatedAt || '', updatedBy: d.updatedBy, deletedAt: d.deletedAt || null,
  };
}
function toData(p: QuantProject) {
  return {
    ownerName: p.ownerName, title: p.title, variables: p.variables, data: p.data, results: p.results,
    rowCount: p.data.length, varCount: p.variables.length,
    createdAt: p.createdAt, updatedAt: p.updatedAt, updatedBy: p.updatedBy, deletedAt: p.deletedAt || null,
  };
}

export async function listQuantProjects(): Promise<QuantSummary[]> {
  const owner = me();
  if (!owner) return [];
  const cols = 'key, title:data->>title, updatedAt:data->>updatedAt, deletedAt:data->>deletedAt, rows:data->>rowCount, vars:data->>varCount, ownerName:data->>ownerName';
  const out: QuantSummary[] = [];
  const { data } = await supabase.from(T).select(cols).like('key', `quant:${owner}:%`);
  (data || []).forEach((r: any) => { if (!r.deletedAt) out.push({ id: String(r.key).split(':')[2], ownerId: owner, ownerName: r.ownerName, title: r.title || 'Dự án không tên', updatedAt: r.updatedAt || '', rows: Number(r.rows) || 0, vars: Number(r.vars) || 0, role: 'owner' }); });
  // Dự án người khác chia sẻ cho mình.
  const { data: shared } = await supabase.from('collaborators').select('resource_id, owner_id, role').eq('resource_type', 'quant_project').eq('user_id', owner);
  if (shared && shared.length) {
    const keys = shared.map((c: any) => quantKey(c.owner_id, c.resource_id));
    const { data: rows } = await supabase.from(T).select(cols).in('key', keys);
    (rows || []).forEach((r: any) => {
      if (r.deletedAt) return;
      const [, o, id] = String(r.key).split(':');
      const c: any = shared.find((x: any) => x.resource_id === id);
      out.push({ id, ownerId: o, ownerName: r.ownerName, title: r.title || 'Dự án không tên', updatedAt: r.updatedAt || '', rows: Number(r.rows) || 0, vars: Number(r.vars) || 0, role: (c?.role || 'view') as QuantSummary['role'] });
    });
  }
  return out.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export async function getQuantProject(owner: string, id: string): Promise<QuantProject | null> {
  const { data } = await supabase.from(T).select('key,data').eq('key', quantKey(owner, id)).maybeSingle();
  return data ? fromRow(data.key, data.data || {}) : null;
}

export async function getQuantUpdatedAt(owner: string, id: string): Promise<string | null> {
  const { data } = await supabase.from(T).select('u:data->>updatedAt, by:data->>updatedBy').eq('key', quantKey(owner, id)).maybeSingle();
  return (data as any)?.u ? `${(data as any).u}|${(data as any).by || ''}` : null;
}

export async function saveQuantProject(p: QuantProject): Promise<QuantProject> {
  const next = { ...p, updatedAt: new Date().toISOString(), updatedBy: me() || '' };
  const { error } = await supabase.from(T).upsert({ key: quantKey(p.ownerId, p.id), data: toData(next) });
  if (error) throw error;
  return next;
}

export async function createQuantProject(title: string, ownerName?: string, init?: Partial<Pick<QuantProject, 'variables' | 'data' | 'results'>>): Promise<QuantProject> {
  const owner = me();
  if (!owner) throw new Error('Bạn cần đăng nhập.');
  const now = new Date().toISOString();
  return saveQuantProject({ id: newId(), ownerId: owner, ownerName, title: title || 'Dự án định lượng', variables: init?.variables || [], data: init?.data || [], results: init?.results || [], createdAt: now, updatedAt: now });
}

// Xoá: chuyển vào mục Đã xoá ở trang Cá nhân (giữ 30 ngày).
export async function softDeleteQuant(p: QuantProject): Promise<void> {
  if (p.ownerId !== me()) throw new Error('Chỉ chủ dự án mới xoá được.');
  await saveQuantProject({ ...p, deletedAt: new Date().toISOString() });
}
export async function listTrashQuant(): Promise<Array<{ id: string; title: string; deletedAt: string }>> {
  const owner = me();
  if (!owner) return [];
  const { data } = await supabase.from(T).select('key, title:data->>title, deletedAt:data->>deletedAt').like('key', `quant:${owner}:%`);
  return (data || []).filter((r: any) => r.deletedAt).map((r: any) => ({ id: String(r.key).split(':')[2], title: r.title || 'Dự án định lượng', deletedAt: r.deletedAt }));
}
export async function restoreQuant(id: string): Promise<void> {
  const owner = me(); if (!owner) return;
  const p = await getQuantProject(owner, id);
  if (p) await saveQuantProject({ ...p, deletedAt: null });
}
export async function purgeQuant(id: string): Promise<void> {
  const owner = me(); if (!owner) return;
  await supabase.from(T).delete().eq('key', quantKey(owner, id));
  await supabase.from('collaborators').delete().eq('resource_type', 'quant_project').eq('resource_id', id);
}
