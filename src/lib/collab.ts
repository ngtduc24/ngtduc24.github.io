import { supabase } from './supabase';
import { getEduCtx } from './edu';
import { getUsers, pushNotificationToSupabase } from './data';
import type { UserAccount } from '../types';

// Cộng tác: chủ sở hữu thêm người khác vào tài nguyên của mình với quyền hạn rõ ràng.
// Bảng collaborators (xem COLLABORATORS.sql).
// Bài giảng, bài tập, câu hỏi, đề trắc nghiệm, dự án dùng 3 mức: view (xem), edit (chỉnh sửa), manage (quản lý).
// Lớp, trường dùng quyền tích chọn trong cột perms.

export type CollabType = 'el_lesson' | 'bank_item' | 'quiz' | 'quiz_question' | 'edu_class' | 'edu_school' | 'qda_project' | 'quant_project';
export type CollabRole = 'view' | 'edit' | 'manage';
export type MyRole = 'owner' | CollabRole | null;

// Quyền tích chọn cho lớp, trường.
export interface ClassPerms {
  viewSubmissions?: boolean; // xem bài nộp
  assign?: boolean;          // giao bài, sửa bài tập của lớp
  grade?: boolean;           // chấm điểm
  editStudents?: boolean;    // sửa danh sách sinh viên
  editColumns?: boolean;     // sửa cột điểm
  exportGrades?: boolean;    // xuất bảng điểm
  manageMembers?: boolean;   // thêm bớt người cộng tác
}
export const CLASS_PERM_LABELS: Array<[keyof ClassPerms, string]> = [
  ['viewSubmissions', 'Xem bài nộp'],
  ['assign', 'Giao bài, sửa bài tập của lớp'],
  ['grade', 'Chấm điểm'],
  ['editStudents', 'Sửa danh sách sinh viên'],
  ['editColumns', 'Sửa cột điểm'],
  ['exportGrades', 'Xuất bảng điểm'],
  ['manageMembers', 'Thêm bớt người cộng tác'],
];

export const ROLE_LABELS: Record<CollabRole, { label: string; hint: string }> = {
  view: { label: 'Xem', hint: 'Chỉ xem nội dung' },
  edit: { label: 'Chỉnh sửa', hint: 'Xem và sửa nội dung' },
  manage: { label: 'Quản lý', hint: 'Sửa nội dung, thêm bớt người cộng tác. Không xoá được, không đổi được chủ' },
};

export const TYPE_LABELS: Record<CollabType, string> = {
  el_lesson: 'bài giảng', bank_item: 'bài tập', quiz: 'đề trắc nghiệm', quiz_question: 'câu hỏi',
  edu_class: 'lớp', edu_school: 'trường', qda_project: 'dự án định tính', quant_project: 'dự án định lượng',
};

export interface Collaborator {
  id: string;
  resourceType: CollabType;
  resourceId: string;
  resourceTitle?: string | null;
  ownerId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  role: CollabRole;
  perms: ClassPerms;
  addedBy?: string | null;
  createdAt?: string;
}

const T = 'collaborators';
const map = (r: any): Collaborator => ({
  id: r.id, resourceType: r.resource_type, resourceId: r.resource_id, resourceTitle: r.resource_title, ownerId: r.owner_id,
  userId: r.user_id, userName: r.user_name, userEmail: r.user_email, role: (r.role || 'view') as CollabRole, perms: r.perms || {},
  addedBy: r.added_by, createdAt: r.created_at,
});
const me = () => getEduCtx().userId;

// Bảng chưa tạo thì coi như chưa có ai cộng tác (web vẫn chạy bình thường).
const missingTable = (e: any) => /collaborators|relation|does not exist|schema cache/i.test(String(e?.message || e?.code || ''));

export async function listCollaborators(type: CollabType, resourceId: string): Promise<Collaborator[]> {
  const { data, error } = await supabase.from(T).select('*').eq('resource_type', type).eq('resource_id', resourceId).order('created_at');
  if (error) { if (missingTable(error)) return []; throw error; }
  return (data || []).map(map);
}

// Các tài nguyên người khác đã thêm mình vào (theo loại).
export async function getMyShares(type: CollabType): Promise<Collaborator[]> {
  const uid = me();
  if (!uid) return [];
  const { data, error } = await supabase.from(T).select('*').eq('resource_type', type).eq('user_id', uid);
  if (error) { if (missingTable(error)) return []; throw error; }
  return (data || []).map(map);
}

// Quyền của mình với một tài nguyên: chủ, quản lý, chỉnh sửa, xem hoặc không có.
export async function getMyRole(type: CollabType, resourceId: string, ownerId?: string | null): Promise<MyRole> {
  const uid = me();
  if (!uid) return null;
  if (ownerId && ownerId === uid) return 'owner';
  const { data, error } = await supabase.from(T).select('role').eq('resource_type', type).eq('resource_id', resourceId).eq('user_id', uid).maybeSingle();
  if (error || !data) return null;
  return data.role as CollabRole;
}
export async function getMyCollab(type: CollabType, resourceId: string): Promise<Collaborator | null> {
  const uid = me();
  if (!uid) return null;
  const { data, error } = await supabase.from(T).select('*').eq('resource_type', type).eq('resource_id', resourceId).eq('user_id', uid).maybeSingle();
  if (error || !data) return null;
  return map(data);
}
export const canEditRole = (r: MyRole) => r === 'owner' || r === 'manage' || r === 'edit';
export const canManageRole = (r: MyRole) => r === 'owner' || r === 'manage';

// Chỉ chủ hoặc người có quyền quản lý được thêm bớt, đổi quyền người khác.
async function assertCanManage(type: CollabType, resourceId: string, ownerId: string) {
  const uid = me();
  if (!uid) throw new Error('Bạn cần đăng nhập.');
  if (uid === ownerId) return;
  const c = await getMyCollab(type, resourceId);
  const ok = c && (type === 'edu_class' || type === 'edu_school' ? !!c.perms.manageMembers : c.role === 'manage');
  if (!ok) throw new Error('Bạn không có quyền thêm bớt người cộng tác.');
}

export async function addCollaborator(input: {
  type: CollabType; resourceId: string; resourceTitle?: string; ownerId: string;
  user: Pick<UserAccount, 'id' | 'fullName' | 'email'>; role?: CollabRole; perms?: ClassPerms; senderName?: string;
}): Promise<Collaborator> {
  await assertCanManage(input.type, input.resourceId, input.ownerId);
  if (input.user.id === input.ownerId) throw new Error('Người này là chủ sở hữu.');
  const row = {
    resource_type: input.type, resource_id: input.resourceId, resource_title: input.resourceTitle || null, owner_id: input.ownerId,
    user_id: input.user.id, user_name: input.user.fullName || null, user_email: input.user.email || null,
    role: input.role || 'view', perms: input.perms || {}, added_by: me(), updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(T).upsert(row, { onConflict: 'resource_type,resource_id,user_id' }).select('*').single();
  if (error) {
    if (missingTable(error)) throw new Error('Chưa tạo bảng cộng tác. Hãy chạy tệp COLLABORATORS.sql trong Supabase.');
    throw error;
  }
  // Báo cho người được thêm.
  pushNotificationToSupabase({
    title: 'Bạn được thêm vào cộng tác',
    description: `${input.senderName || 'Một người dùng'} đã thêm bạn vào ${TYPE_LABELS[input.type]} "${input.resourceTitle || ''}"${input.role ? ` với quyền ${ROLE_LABELS[input.role].label.toLowerCase()}` : ''}.`,
    type: 'system',
    targetAudience: 'custom_users',
    targetUserIds: [input.user.id],
    senderId: me() || undefined,
    senderName: input.senderName,
    metadata: { collabType: input.type, resourceId: input.resourceId },
  } as any).catch(() => {});
  return map(data);
}

export async function updateCollaborator(c: Collaborator, patch: { role?: CollabRole; perms?: ClassPerms }): Promise<void> {
  await assertCanManage(c.resourceType, c.resourceId, c.ownerId);
  const { error } = await supabase.from(T).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', c.id);
  if (error) throw error;
}

export async function removeCollaborator(c: Collaborator): Promise<void> {
  // Tự rời khỏi cộng tác thì luôn được.
  if (c.userId !== me()) await assertCanManage(c.resourceType, c.resourceId, c.ownerId);
  const { error } = await supabase.from(T).delete().eq('id', c.id);
  if (error) throw error;
}

// Xoá hết người cộng tác khi chủ xoá tài nguyên.
export async function clearCollaborators(type: CollabType, resourceIds: string[]): Promise<void> {
  if (!resourceIds.length) return;
  await supabase.from(T).delete().eq('resource_type', type).in('resource_id', resourceIds).eq('owner_id', me() || '-');
}

// Danh bạ tài khoản để tìm người thêm vào (tên, email).
let userCache: UserAccount[] | null = null;
export async function searchUsers(q: string): Promise<UserAccount[]> {
  if (!userCache) userCache = await getUsers().catch(() => []);
  const fold = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
  const k = fold(q.trim());
  if (!k) return [];
  return userCache
    .filter(u => u.id !== me() && (fold(u.fullName || '').includes(k) || fold(u.email || '').includes(k) || fold(u.username || '').includes(k)))
    .slice(0, 8);
}
export function userAvatar(id: string): string | undefined {
  return userCache?.find(u => u.id === id)?.avatarUrl;
}
