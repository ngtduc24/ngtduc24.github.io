
import { supabase } from './supabase';
import { 
  EduSchool, 
  EduClass, 
  EduUser, 
  EduGradeColumn, 
  EduAssignment,
  EduSubmission,
  EduGrade,
  EduSubject,
  EduAssignmentBankItem
} from '../types/edu';

// Table names
export const SCHOOLS_TABLE = 'edu_schools';
export const CLASSES_TABLE = 'edu_classes';
export const USERS_TABLE = 'edu_users';
export const GRADE_COLUMNS_TABLE = 'edu_grade_columns';
export const ASSIGNMENTS_TABLE = 'edu_assignments';
export const SUBMISSIONS_TABLE = 'edu_submissions';
export const GRADES_TABLE = 'edu_grades';
export const SUBJECTS_TABLE = 'edu_subjects';
export const ASSIGNMENT_BANK_TABLE = 'edu_assignment_bank';

// Ngữ cảnh người dùng hiện tại cho module Edu. Dùng để tách dữ liệu trường lớp sinh viên
// theo từng người tạo, và để mặc định gán chủ sở hữu khi tạo mới. Admin thì xem được tất cả.
// App gọi setEduAuthContext mỗi khi người dùng đăng nhập thay đổi.
let ctxUserId: string | null = null;
let ctxIsAdmin = false;

export function setEduAuthContext(userId: string | null, isAdmin: boolean) {
  ctxUserId = userId || null;
  ctxIsAdmin = !!isAdmin;
}

// Cho phép các module khác (ví dụ trắc nghiệm) dùng lại ngữ cảnh người dùng hiện tại.
export function getEduCtx(): { userId: string | null; isAdmin: boolean } {
  return getCtx();
}

// Lấy ngữ cảnh người dùng hiện tại. Ưu tiên giá trị đã set, nếu chưa có thì đọc thẳng
// từ localStorage để bộ lọc luôn áp đúng, tránh phụ thuộc thời điểm khởi tạo.
function getCtx(): { userId: string | null; isAdmin: boolean } {
  if (ctxUserId) return { userId: ctxUserId, isAdmin: ctxIsAdmin };
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('logged_in_user') : null;
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.id) return { userId: u.id as string, isAdmin: u.role === 'admin' };
    }
  } catch {
    // bỏ qua lỗi đọc cache
  }
  return { userId: null, isAdmin: false };
}

// Mappers
function mapSchool(s: any): EduSchool {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    ownerId: s.owner_id
  };
}

function mapClass(c: any): EduClass {
  return {
    id: c.id,
    schoolId: c.school_id,
    name: c.name,
    description: c.description,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    ownerId: c.owner_id
  };
}

function mapUser(u: any): EduUser {
  return {
    id: u.id,
    classId: u.class_id,
    stt: u.stt,
    fullName: u.full_name,
    mssv: u.mssv,
    createdAt: u.created_at
  };
}

function mapGradeColumn(gc: any): EduGradeColumn {
  return {
    id: gc.id,
    classId: gc.class_id,
    name: gc.name,
    order: gc.order,
    isConfirmed: gc.is_confirmed,
    createdAt: gc.created_at,
    updatedAt: gc.updated_at
  };
}

function mapAssignment(a: any): EduAssignment {
  return {
    id: a.id,
    classId: a.class_id,
    gradeColumnId: a.grade_column_id,
    subjectId: a.subject_id,
    bankId: a.bank_id,
    title: a.title,
    content: a.content,
    allowedFileTypes: a.allowed_file_types || [],
    deadline: a.deadline,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    shareLinkId: a.share_link_id
  };
}

function mapSubject(s: any): EduSubject {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    ownerId: s.owner_id
  };
}

function mapBankItem(b: any): EduAssignmentBankItem {
  return {
    id: b.id,
    subjectId: b.subject_id,
    title: b.title,
    content: b.content,
    allowedFileTypes: b.allowed_file_types || [],
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    ownerId: b.owner_id,
    isPublic: b.is_public === true
  };
}

function mapSubmission(s: any): EduSubmission {
  return {
    id: s.id,
    assignmentId: s.assignment_id,
    userId: s.user_id,
    mssv: s.mssv,
    files: s.files || [],
    content: s.content,
    submittedAt: s.submitted_at,
    updatedAt: s.updated_at,
    firstSubmittedAt: s.first_submitted_at
  };
}

function mapGrade(g: any): EduGrade {
  return {
    id: g.id,
    gradeColumnId: g.grade_column_id,
    userId: g.user_id,
    score: g.score,
    note: g.note,
    createdAt: g.created_at,
    updatedAt: g.updated_at
  };
}

// Schools
export async function getSchools() {
  let query = supabase.from(SCHOOLS_TABLE).select('*').order('name');
  // Mỗi người chỉ thấy trường của mình, admin thấy tất cả.
  const ctx = getCtx();
  if (!ctx.isAdmin && ctx.userId) query = query.eq('owner_id', ctx.userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapSchool);
}

export async function saveSchool(school: Partial<EduSchool>) {
  const dbData = {
    id: school.id,
    name: school.name,
    description: school.description,
    // Gán chủ sở hữu là người đang đăng nhập nếu chưa có.
    owner_id: school.ownerId ?? getCtx().userId ?? undefined
  };
  // Remove undefined
  Object.keys(dbData).forEach(key => (dbData as any)[key] === undefined && delete (dbData as any)[key]);

  const { data, error } = await supabase.from(SCHOOLS_TABLE).upsert(dbData).select().single();
  if (error) throw error;
  return mapSchool(data);
}

export async function deleteSchool(id: string) {
  const { error } = await supabase.from(SCHOOLS_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Classes
export async function getClasses(schoolId?: string) {
  let query = supabase.from(CLASSES_TABLE).select('*, edu_schools(name)').order('name');
  if (schoolId) query = query.eq('school_id', schoolId);
  // Mỗi người chỉ thấy lớp của mình, admin thấy tất cả.
  const ctx = getCtx();
  if (!ctx.isAdmin && ctx.userId) query = query.eq('owner_id', ctx.userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(c => ({
    ...mapClass(c),
    edu_schools: c.edu_schools
  }));
}

export async function saveClass(clazz: Partial<EduClass>) {
  const dbData = {
    id: clazz.id,
    school_id: clazz.schoolId,
    name: clazz.name,
    description: clazz.description,
    owner_id: clazz.ownerId ?? getCtx().userId ?? undefined
  };
  Object.keys(dbData).forEach(key => (dbData as any)[key] === undefined && delete (dbData as any)[key]);

  const { data, error } = await supabase.from(CLASSES_TABLE).upsert(dbData).select().single();
  if (error) throw error;
  return mapClass(data);
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from(CLASSES_TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function getClassById(id: string) {
  const { data, error } = await supabase.from(CLASSES_TABLE).select('*, edu_schools(*)').eq('id', id).single();
  if (error) throw error;
  return {
    ...mapClass(data),
    edu_schools: mapSchool(data.edu_schools)
  };
}

// Users
export async function getClassUsers(classId: string) {
  const { data, error } = await supabase.from(USERS_TABLE).select('*').eq('class_id', classId).order('stt');
  if (error) throw error;
  return (data || []).map(mapUser);
}

export async function saveClassUsers(users: Partial<EduUser>[]) {
  const dbData = users.map(u => {
    const item: any = {
      class_id: u.classId || (u as any).class_id,
      stt: u.stt,
      full_name: u.fullName || (u as any).full_name,
      mssv: u.mssv
    };
    if (u.id) item.id = u.id;
    return item;
  });

  const { data, error } = await supabase.from(USERS_TABLE).upsert(dbData);
  if (error) throw error;
  return data;
}

export async function saveUser(user: Partial<EduUser>) {
  const dbData = {
    id: user.id,
    class_id: user.classId,
    stt: user.stt,
    full_name: user.fullName,
    mssv: user.mssv
  };
  Object.keys(dbData).forEach(key => (dbData as any)[key] === undefined && delete (dbData as any)[key]);
  
  const { data, error } = await supabase.from(USERS_TABLE).upsert(dbData).select().single();
  if (error) throw error;
  return mapUser(data);
}

export async function deleteUser(id: string) {
  const { error } = await supabase.from(USERS_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Grade Columns
export async function getGradeColumns(classId: string) {
  const { data, error } = await supabase.from(GRADE_COLUMNS_TABLE).select('*').eq('class_id', classId).order('order');
  if (error) throw error;
  return (data || []).map(mapGradeColumn);
}

export async function saveGradeColumn(column: Partial<EduGradeColumn>) {
  const dbData = {
    id: column.id,
    class_id: column.classId,
    name: column.name,
    order: column.order,
    is_confirmed: column.isConfirmed
  };
  Object.keys(dbData).forEach(key => (dbData as any)[key] === undefined && delete (dbData as any)[key]);

  const { data, error } = await supabase.from(GRADE_COLUMNS_TABLE).upsert(dbData).select().single();
  if (error) throw error;
  return mapGradeColumn(data);
}

export async function deleteGradeColumn(id: string) {
  const { error } = await supabase.from(GRADE_COLUMNS_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Assignments
export async function getAssignments(classId: string) {
  const { data, error } = await supabase.from(ASSIGNMENTS_TABLE).select('*').eq('class_id', classId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAssignment);
}

export async function getAssignmentByLinkId(linkId: string) {
  const { data, error } = await supabase.from(ASSIGNMENTS_TABLE).select('*, edu_classes(*, edu_schools(*))').eq('share_link_id', linkId).single();
  if (error) throw error;
  return {
    ...mapAssignment(data),
    edu_classes: {
      ...mapClass(data.edu_classes),
      edu_schools: mapSchool(data.edu_classes.edu_schools)
    }
  };
}

export async function saveAssignment(assignment: Partial<EduAssignment>) {
  const dbData = {
    id: assignment.id,
    class_id: assignment.classId,
    grade_column_id: assignment.gradeColumnId,
    subject_id: assignment.subjectId,
    bank_id: assignment.bankId,
    title: assignment.title,
    content: assignment.content,
    allowed_file_types: assignment.allowedFileTypes,
    deadline: assignment.deadline
  };
  Object.keys(dbData).forEach(key => (dbData as any)[key] === undefined && delete (dbData as any)[key]);

  const { data, error } = await supabase.from(ASSIGNMENTS_TABLE).upsert(dbData).select().single();
  if (error) throw error;
  return mapAssignment(data);
}

export async function deleteAssignment(id: string) {
  // Delete submissions first to be safe (if no CASCADE)
  await supabase.from(SUBMISSIONS_TABLE).delete().eq('assignment_id', id);
  const { error } = await supabase.from(ASSIGNMENTS_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// ===== Môn học =====
export async function getSubjects(): Promise<EduSubject[]> {
  const { data, error } = await supabase.from(SUBJECTS_TABLE).select('*').order('name');
  if (error) throw error;
  return (data || []).map(mapSubject);
}

export async function saveSubject(subject: Partial<EduSubject>) {
  const dbData: any = {
    id: subject.id,
    name: subject.name,
    description: subject.description,
    owner_id: subject.ownerId
  };
  Object.keys(dbData).forEach(key => dbData[key] === undefined && delete dbData[key]);
  const { data, error } = await supabase.from(SUBJECTS_TABLE).upsert(dbData).select().single();
  if (error) throw error;
  return mapSubject(data);
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from(SUBJECTS_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// ===== Ngân hàng bài tập =====
export async function getAssignmentBank(subjectId?: string): Promise<EduAssignmentBankItem[]> {
  let query = supabase.from(ASSIGNMENT_BANK_TABLE).select('*').order('created_at', { ascending: false });
  if (subjectId) query = query.eq('subject_id', subjectId);
  // Người dùng thấy bài của chính mình và các bài được bật chia sẻ công khai. Admin thấy tất cả.
  const ctx = getCtx();
  if (!ctx.isAdmin && ctx.userId) query = query.or(`owner_id.eq.${ctx.userId},is_public.eq.true`);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapBankItem);
}

export async function saveAssignmentBankItem(item: Partial<EduAssignmentBankItem>) {
  const dbData: any = {
    id: item.id,
    subject_id: item.subjectId,
    title: item.title,
    content: item.content,
    allowed_file_types: item.allowedFileTypes,
    owner_id: item.ownerId ?? getCtx().userId ?? undefined,
    is_public: item.isPublic === true
  };
  Object.keys(dbData).forEach(key => dbData[key] === undefined && delete dbData[key]);
  const { data, error } = await supabase.from(ASSIGNMENT_BANK_TABLE).upsert(dbData).select().single();
  if (error) throw error;
  return mapBankItem(data);
}

export async function deleteAssignmentBankItem(id: string) {
  const { error } = await supabase.from(ASSIGNMENT_BANK_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Submissions
export async function getSubmissions(assignmentId: string) {
  const { data, error } = await supabase.from(SUBMISSIONS_TABLE).select('*').eq('assignment_id', assignmentId);
  if (error) throw error;
  return (data || []).map(mapSubmission);
}

export async function getAllClassSubmissions(classId: string) {
  const { data: assignments } = await supabase.from(ASSIGNMENTS_TABLE).select('id').eq('class_id', classId);
  if (!assignments || assignments.length === 0) return [];
  
  const assignmentIds = assignments.map(a => a.id);
  const { data, error } = await supabase.from(SUBMISSIONS_TABLE).select('*').in('assignment_id', assignmentIds);
  if (error) throw error;
  return (data || []).map(mapSubmission);
}

export async function getSubmissionByMssv(assignmentId: string, mssv: string) {
  const { data, error } = await supabase.from(SUBMISSIONS_TABLE).select('*').eq('assignment_id', assignmentId).eq('mssv', mssv).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapSubmission(data);
}

export async function saveSubmission(submission: Partial<EduSubmission>) {
  const dbData = {
    id: submission.id,
    assignment_id: submission.assignmentId,
    user_id: submission.userId,
    mssv: submission.mssv,
    files: submission.files,
    content: submission.content,
    submitted_at: submission.submittedAt,
    updated_at: submission.updatedAt,
    first_submitted_at: submission.firstSubmittedAt
  };
  Object.keys(dbData).forEach(key => (dbData as any)[key] === undefined && delete (dbData as any)[key]);

  const { data, error } = await supabase.from(SUBMISSIONS_TABLE).upsert(dbData).select().single();
  if (error) throw error;
  return mapSubmission(data);
}

// Grades
export async function getGrades(columnId: string) {
  const { data, error } = await supabase.from(GRADES_TABLE).select('*').eq('grade_column_id', columnId);
  if (error) throw error;
  return (data || []).map(mapGrade);
}

export async function getAllClassGrades(classId: string) {
  const { data: columns } = await supabase.from(GRADE_COLUMNS_TABLE).select('id').eq('class_id', classId);
  if (!columns || columns.length === 0) return [];
  
  const columnIds = columns.map(c => c.id);
  const { data, error } = await supabase.from(GRADES_TABLE).select('*').in('grade_column_id', columnIds);
  if (error) throw error;
  return (data || []).map(mapGrade);
}

export async function saveGrades(grades: Partial<EduGrade>[]) {
  const dbData = grades.map(g => {
    const item: any = {
      grade_column_id: g.gradeColumnId || (g as any).grade_column_id,
      user_id: g.userId || (g as any).user_id,
      score: g.score,
      note: g.note
    };
    if (g.id) item.id = g.id;
    return item;
  });
  
  const { data, error } = await supabase.from(GRADES_TABLE).upsert(dbData, { 
    onConflict: 'grade_column_id,user_id' 
  });
  if (error) throw error;
  return data;
}

export async function getGradesForUser(classId: string, userId: string) {
  const { data: columns } = await supabase.from(GRADE_COLUMNS_TABLE).select('*').eq('class_id', classId);
  if (!columns || columns.length === 0) return [];
  
  const columnIds = columns.map(c => c.id);
  const { data, error } = await supabase.from(GRADES_TABLE).select('*').in('grade_column_id', columnIds).eq('user_id', userId);
  if (error) throw error;
  
  return columns.map(col => ({
    column: mapGradeColumn(col),
    grade: data.find(g => g.grade_column_id === col.id) ? mapGrade(data.find(g => g.grade_column_id === col.id)) : undefined
  })).filter(item => item.grade !== undefined); // Only show columns that have been graded
}
