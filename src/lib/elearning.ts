import { supabase } from './supabase';
import { getEduCtx } from './edu';
import { uploadFileToSupabase } from './upload';

// =====================================================================
// Lớp dữ liệu cho module E-Learning. Giảng viên dùng anon key và lọc theo
// owner_id (Firebase uid) ở client, giống EDU và trắc nghiệm. Luồng sinh viên
// đi qua RPC el_public_lesson / el_log_view. Sao chép bài công khai qua el_copy_lesson.
// =====================================================================

export type ELStatus = 'draft' | 'published';
export type ELResourceKind = 'file' | 'link' | 'video' | 'embed';
export const EL_BUCKET = 'elearning';

export interface ELLesson {
  id: string;
  owner_id?: string | null;
  owner_name?: string | null;
  subject_id?: string | null;
  title: string;
  summary?: string | null;
  cover_url?: string | null;
  tags: string[];
  status: ELStatus;
  is_public: boolean;
  allow_copy: boolean;
  author_label?: string | null;
  duration_minutes?: number | null;
  share_enabled: boolean;
  share_token: string;
  source_lesson_id?: string | null;
  source_owner_name?: string | null;
  copy_count: number;
  view_count: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  sectionCount?: number;
  resourceCount?: number;
}

export interface ELSection {
  id: string;
  lesson_id: string;
  title: string;
  content: string;
  order_index: number;
}

export interface ELResource {
  id: string;
  lesson_id: string;
  section_id: string | null;
  kind: ELResourceKind;
  title: string;
  storage_path?: string | null;
  url?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  order_index: number;
}

const L_TABLE = 'el_lessons';
const S_TABLE = 'el_sections';
const R_TABLE = 'el_resources';
const V_TABLE = 'el_lesson_versions';
const LC_TABLE = 'el_lesson_classes';
const VIEW_TABLE = 'el_section_views';

function ctx() { return getEduCtx(); }
function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// --------------------------- Kho bài giảng của tôi ---------------------------

export async function getMyLessons(opts?: { subjectId?: string; status?: ELStatus | 'public'; search?: string }): Promise<ELLesson[]> {
  const c = ctx();
  let query = supabase.from(L_TABLE)
    .select('*, el_sections(count), el_resources(count)')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (!c.isAdmin && c.userId) query = query.eq('owner_id', c.userId);
  if (opts?.subjectId) query = query.eq('subject_id', opts.subjectId);
  if (opts?.status === 'public') query = query.eq('is_public', true);
  else if (opts?.status) query = query.eq('status', opts.status);
  const { data, error } = await query;
  if (error) throw error;
  let list = (data || []).map(mapLesson);
  const s = opts?.search?.trim().toLowerCase();
  if (s) list = list.filter(l => l.title.toLowerCase().includes(s));
  return list;
}

export async function getTrashLessons(): Promise<ELLesson[]> {
  const c = ctx();
  let query = supabase.from(L_TABLE).select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  if (!c.isAdmin && c.userId) query = query.eq('owner_id', c.userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapLesson);
}

function mapLesson(row: any): ELLesson {
  return {
    ...row,
    tags: row.tags || [],
    sectionCount: Array.isArray(row.el_sections) ? (row.el_sections[0]?.count ?? 0) : undefined,
    resourceCount: Array.isArray(row.el_resources) ? (row.el_resources[0]?.count ?? 0) : undefined,
  };
}

export async function getLesson(id: string): Promise<ELLesson> {
  const { data, error } = await supabase.from(L_TABLE).select('*').eq('id', id).single();
  if (error) throw error;
  return mapLesson(data);
}

export async function createLesson(input: { title: string; subject_id?: string | null; owner_name?: string }): Promise<ELLesson> {
  const c = ctx();
  const payload: any = {
    title: input.title || 'Bài giảng chưa đặt tên',
    subject_id: input.subject_id ?? null,
    owner_id: c.userId,
    owner_name: input.owner_name ?? undefined,
    status: 'draft',
    is_public: false,
  };
  const { data, error } = await supabase.from(L_TABLE).insert(payload).select('*').single();
  if (error) throw error;
  return mapLesson(data);
}

export async function updateLesson(id: string, patch: Partial<ELLesson>): Promise<ELLesson> {
  const allowed: any = {};
  const keys: (keyof ELLesson)[] = ['title', 'summary', 'cover_url', 'tags', 'subject_id', 'status', 'is_public', 'allow_copy', 'author_label', 'duration_minutes', 'share_enabled'];
  keys.forEach(k => { if (k in patch) allowed[k] = (patch as any)[k]; });
  const { data, error } = await supabase.from(L_TABLE).update(allowed).eq('id', id).select('*').single();
  if (error) throw error;
  return mapLesson(data);
}

export async function softDeleteLesson(id: string): Promise<void> {
  const { error } = await supabase.from(L_TABLE).update({ deleted_at: new Date().toISOString(), is_public: false }).eq('id', id);
  if (error) throw error;
}
export async function restoreLesson(id: string): Promise<void> {
  const { error } = await supabase.from(L_TABLE).update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
}
export async function purgeLesson(id: string): Promise<void> {
  const { error } = await supabase.from(L_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// --------------------------- Phần nội dung ---------------------------

export async function getSections(lessonId: string): Promise<ELSection[]> {
  const { data, error } = await supabase.from(S_TABLE).select('*').eq('lesson_id', lessonId).order('order_index');
  if (error) throw error;
  return (data || []) as ELSection[];
}

export async function createSection(lessonId: string, order: number, title = 'Phần mới'): Promise<ELSection> {
  const { data, error } = await supabase.from(S_TABLE).insert({ lesson_id: lessonId, title, content: '', order_index: order }).select('*').single();
  if (error) throw error;
  return data as ELSection;
}

export async function updateSection(id: string, patch: { title?: string; content?: string; order_index?: number }): Promise<void> {
  const { error } = await supabase.from(S_TABLE).update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteSection(id: string): Promise<void> {
  const { error } = await supabase.from(S_TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function reorderSections(items: { id: string; order_index: number }[]): Promise<void> {
  await Promise.all(items.map(it => supabase.from(S_TABLE).update({ order_index: it.order_index }).eq('id', it.id)));
}

// --------------------------- Tài nguyên đính kèm ---------------------------

export async function getResources(lessonId: string): Promise<ELResource[]> {
  const { data, error } = await supabase.from(R_TABLE).select('*').eq('lesson_id', lessonId).order('order_index');
  if (error) throw error;
  return (data || []) as ELResource[];
}

export async function addResource(res: Partial<ELResource> & { lesson_id: string }): Promise<ELResource> {
  const payload: any = {
    lesson_id: res.lesson_id,
    section_id: res.section_id ?? null,
    kind: res.kind ?? 'file',
    title: res.title ?? '',
    storage_path: res.storage_path ?? null,
    url: res.url ?? null,
    mime_type: res.mime_type ?? null,
    size_bytes: res.size_bytes ?? null,
    order_index: res.order_index ?? 0,
  };
  const { data, error } = await supabase.from(R_TABLE).insert(payload).select('*').single();
  if (error) throw error;
  return data as ELResource;
}

export async function updateResource(id: string, patch: { title?: string; order_index?: number }): Promise<void> {
  const { error } = await supabase.from(R_TABLE).update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteResource(id: string): Promise<void> {
  const { error } = await supabase.from(R_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Tải file lên Storage theo dạng <lesson_id>/<ten file> rồi thêm bản ghi tài nguyên.
export async function uploadResource(lessonId: string, sectionId: string | null, file: File, order: number): Promise<ELResource> {
  const url = await uploadFileToSupabase(file, EL_BUCKET, `${lessonId}/`);
  return addResource({
    lesson_id: lessonId, section_id: sectionId, kind: 'file', title: file.name,
    url, mime_type: file.type, size_bytes: file.size, order_index: order,
  });
}

// --------------------------- Lịch sử phiên bản ---------------------------

export async function saveVersion(lessonId: string, snapshot: any, note?: string): Promise<void> {
  await supabase.from(V_TABLE).insert({ lesson_id: lessonId, snapshot, note: note ?? null });
  // Giữ tối đa 20 bản gần nhất.
  const { data } = await supabase.from(V_TABLE).select('id').eq('lesson_id', lessonId).order('created_at', { ascending: false });
  const ids = (data || []).map((r: any) => r.id);
  if (ids.length > 20) {
    await supabase.from(V_TABLE).delete().in('id', ids.slice(20));
  }
}

export async function getVersions(lessonId: string): Promise<any[]> {
  const { data, error } = await supabase.from(V_TABLE).select('*').eq('lesson_id', lessonId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// --------------------------- Kho bài giảng chung ---------------------------

export async function getPublicLessons(opts?: { subjectId?: string; sort?: 'new' | 'views' | 'copies'; search?: string }): Promise<ELLesson[]> {
  const c = ctx();
  let query = supabase.from(L_TABLE).select('*')
    .is('deleted_at', null).eq('is_public', true).eq('status', 'published');
  if (opts?.subjectId) query = query.eq('subject_id', opts.subjectId);
  const order = opts?.sort === 'views' ? 'view_count' : opts?.sort === 'copies' ? 'copy_count' : 'updated_at';
  query = query.order(order, { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  let list = (data || []).map(mapLesson);
  // Ẩn bài của chính mình khỏi kho chung (đã có ở kho của tôi).
  if (c.userId) list = list.filter(l => l.owner_id !== c.userId);
  const s = opts?.search?.trim().toLowerCase();
  if (s) list = list.filter(l => l.title.toLowerCase().includes(s));
  return list;
}

export async function getPublicSubjectCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from(L_TABLE).select('subject_id').is('deleted_at', null).eq('is_public', true).eq('status', 'published');
  if (error) throw error;
  const map: Record<string, number> = {};
  (data || []).forEach((r: any) => { const k = r.subject_id || 'none'; map[k] = (map[k] || 0) + 1; });
  return map;
}

export async function copyPublicLesson(lessonId: string, ownerName?: string): Promise<string> {
  const c = ctx();
  const { data, error } = await supabase.rpc('el_copy_lesson', { p_lesson_id: lessonId, p_owner_id: c.userId, p_owner_name: ownerName ?? null });
  if (error) throw error;
  return data as string;
}

// --------------------------- Giao cho lớp ---------------------------

export async function getLessonClasses(lessonId: string): Promise<string[]> {
  const { data, error } = await supabase.from(LC_TABLE).select('class_id').eq('lesson_id', lessonId);
  if (error) throw error;
  return (data || []).map((r: any) => r.class_id);
}

export async function setLessonClasses(lessonId: string, classIds: string[]): Promise<void> {
  await supabase.from(LC_TABLE).delete().eq('lesson_id', lessonId);
  if (classIds.length) {
    await supabase.from(LC_TABLE).insert(classIds.map(cid => ({ lesson_id: lessonId, class_id: cid })));
  }
}

// --------------------------- Theo dõi tiến độ (giảng viên) ---------------------------

export async function getSectionViews(lessonId: string): Promise<any[]> {
  const { data, error } = await supabase.from(VIEW_TABLE).select('*').eq('lesson_id', lessonId);
  if (error) throw error;
  return data || [];
}

// --------------------------- RPC luồng sinh viên ---------------------------

export async function elPublicLesson(token: string, studentCode: string): Promise<any> {
  const { data, error } = await supabase.rpc('el_public_lesson', { p_token: token, p_student_code: studentCode });
  if (error) throw error;
  return data;
}

export async function elLogView(token: string, studentCode: string, sectionId: string): Promise<void> {
  const { error } = await supabase.rpc('el_log_view', { p_token: token, p_student_code: studentCode, p_section_id: sectionId });
  if (error) throw error;
}

export { stripHtml };
