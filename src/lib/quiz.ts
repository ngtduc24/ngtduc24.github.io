import { supabase } from './supabase';
import { getEduCtx } from './edu';

// =====================================================================
// Lớp dữ liệu cho phân hệ trắc nghiệm. Phía giảng viên dùng anon key và lọc
// theo owner_id (Firebase uid) ở client, giống phần EDU hiện có. Luồng sinh
// viên đi qua các hàm RPC phía máy chủ (quiz_open/start/save_answer/...).
// =====================================================================

export type QuestionType = 'single' | 'multiple';
export type MultipleGrading = 'all_or_nothing' | 'partial';
export type QuizStatus = 'draft' | 'published' | 'archived';

export interface QuizOption {
  id?: string;
  question_id?: string;
  content: string;
  is_correct: boolean;
  order_index: number;
}

export interface QuizQuestion {
  id: string;
  owner_id: string;
  owner_name?: string;
  subject_id?: string | null;
  content: string;
  question_type: QuestionType;
  multiple_grading: MultipleGrading;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  explanation?: string | null;
  is_public: boolean;
  copied_from?: string | null;
  created_at?: string;
  updated_at?: string;
  options?: QuizOption[];
}

export interface Quiz {
  id: string;
  owner_id: string;
  owner_name?: string;
  subject_id?: string | null;
  title: string;
  description?: string | null;
  slug: string;
  access_code?: string | null;
  status: QuizStatus;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  random_pick_count?: number | null;
  duration_minutes: number;
  open_at?: string | null;
  close_at?: string | null;
  max_attempts: number;
  grading_method: 'highest' | 'first' | 'last' | 'average';
  scale_to_10: boolean;
  result_visibility: 'hidden' | 'score_only' | 'score_and_answers';
  proctor_fullscreen: boolean;
  proctor_warning_threshold: number;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface QuizItem {
  id: string;
  quiz_id: string;
  question_id: string;
  order_index: number;
  points: number;
  question?: QuizQuestion;
}

const Q_TABLE = 'quiz_bank_questions';
const OPT_TABLE = 'quiz_bank_options';
const QUIZ_TABLE = 'quizzes';
const ITEM_TABLE = 'quiz_items';
const ASSIGN_TABLE = 'quiz_class_assignments';
const ATTEMPT_TABLE = 'quiz_attempts';
const ANSWER_TABLE = 'quiz_attempt_answers';
const LOG_TABLE = 'quiz_proctor_logs';

function ownerId(): string | null { return getEduCtx().userId; }
function isAdmin(): boolean { return getEduCtx().isAdmin; }

// --------------------------- Ngân hàng câu hỏi ---------------------------

export async function getBankQuestions(opts?: { subjectId?: string; scope?: 'mine' | 'shared'; type?: QuestionType; search?: string }): Promise<QuizQuestion[]> {
  const ctx = getEduCtx();
  let query = supabase.from(Q_TABLE).select('*, quiz_bank_options(*)').order('created_at', { ascending: false });

  if (opts?.scope === 'shared') {
    query = query.eq('is_public', true);
    if (ctx.userId) query = query.neq('owner_id', ctx.userId);
  } else {
    if (!ctx.isAdmin && ctx.userId) query = query.eq('owner_id', ctx.userId);
  }
  if (opts?.subjectId) query = query.eq('subject_id', opts.subjectId);
  if (opts?.type) query = query.eq('question_type', opts.type);

  const { data, error } = await query;
  if (error) throw error;
  let list = (data || []).map(mapQuestion);
  const s = opts?.search?.trim().toLowerCase();
  if (s) list = list.filter(q => stripHtml(q.content).toLowerCase().includes(s) || (q.tags || []).some(t => t.toLowerCase().includes(s)));
  return list;
}

function mapQuestion(row: any): QuizQuestion {
  return {
    ...row,
    tags: row.tags || [],
    options: (row.quiz_bank_options || []).sort((a: any, b: any) => a.order_index - b.order_index),
  };
}

function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function saveQuestion(q: Partial<QuizQuestion>, options: QuizOption[]): Promise<QuizQuestion> {
  const ctx = getEduCtx();
  const payload: any = {
    content: q.content ?? '',
    question_type: q.question_type ?? 'single',
    multiple_grading: q.multiple_grading ?? 'all_or_nothing',
    difficulty: q.difficulty ?? 'medium',
    tags: q.tags ?? [],
    explanation: q.explanation ?? null,
    is_public: q.is_public ?? false,
    subject_id: q.subject_id ?? null,
  };
  payload.owner_name = q.owner_name ?? undefined;

  let data: any, error: any;
  if (q.id) {
    ({ data, error } = await supabase.from(Q_TABLE).update(payload).eq('id', q.id).select('*').single());
  } else {
    payload.owner_id = q.owner_id ?? ctx.userId;
    ({ data, error } = await supabase.from(Q_TABLE).insert(payload).select('*').single());
  }
  if (error) throw error;
  const questionId = data.id;

  // Thay toàn bộ phương án của câu hỏi này.
  await supabase.from(OPT_TABLE).delete().eq('question_id', questionId);
  if (options.length) {
    const rows = options.map((o, i) => ({ question_id: questionId, content: o.content, is_correct: o.is_correct, order_index: o.order_index ?? i }));
    const { error: optErr } = await supabase.from(OPT_TABLE).insert(rows);
    if (optErr) throw optErr;
  }
  const { data: full } = await supabase.from(Q_TABLE).select('*, quiz_bank_options(*)').eq('id', questionId).single();
  return mapQuestion(full);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from(Q_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Sao chép một câu hỏi công khai về ngân hàng riêng của người dùng hiện tại.
export async function copyQuestionToMine(q: QuizQuestion, ownerName?: string): Promise<QuizQuestion> {
  return saveQuestion({
    content: q.content, question_type: q.question_type, multiple_grading: q.multiple_grading,
    difficulty: q.difficulty, tags: q.tags, explanation: q.explanation, is_public: false,
    subject_id: q.subject_id, owner_name: ownerName,
  }, (q.options || []).map((o, i) => ({ content: o.content, is_correct: o.is_correct, order_index: i })));
}

export async function toggleQuestionPublic(id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from(Q_TABLE).update({ is_public: isPublic }).eq('id', id);
  if (error) throw error;
}

// --------------------------- Đề trắc nghiệm ---------------------------

export async function getQuizzes(subjectId?: string): Promise<Quiz[]> {
  const ctx = getEduCtx();
  let query = supabase.from(QUIZ_TABLE).select('*').order('created_at', { ascending: false });
  if (!ctx.isAdmin && ctx.userId) query = query.eq('owner_id', ctx.userId);
  if (subjectId) query = query.eq('subject_id', subjectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Quiz[];
}

export async function getQuizById(id: string): Promise<Quiz> {
  const { data, error } = await supabase.from(QUIZ_TABLE).select('*').eq('id', id).single();
  if (error) throw error;
  return data as Quiz;
}

export async function saveQuiz(q: Partial<Quiz>): Promise<Quiz> {
  const ctx = getEduCtx();
  const payload: any = {
    title: q.title ?? 'Đề chưa đặt tên',
    description: q.description ?? null,
    subject_id: q.subject_id ?? null,
    status: q.status ?? 'draft',
    shuffle_questions: q.shuffle_questions ?? true,
    shuffle_options: q.shuffle_options ?? true,
    random_pick_count: q.random_pick_count ?? null,
    duration_minutes: q.duration_minutes ?? 30,
    open_at: q.open_at ?? null,
    close_at: q.close_at ?? null,
    max_attempts: q.max_attempts ?? 1,
    grading_method: q.grading_method ?? 'highest',
    scale_to_10: q.scale_to_10 ?? false,
    result_visibility: q.result_visibility ?? 'score_only',
    proctor_fullscreen: q.proctor_fullscreen ?? true,
    proctor_warning_threshold: q.proctor_warning_threshold ?? 3,
    is_public: q.is_public ?? false,
  };
  let data: any, error: any;
  if (q.id) {
    ({ data, error } = await supabase.from(QUIZ_TABLE).update(payload).eq('id', q.id).select('*').single());
  } else {
    payload.owner_id = q.owner_id ?? ctx.userId;
    payload.owner_name = q.owner_name ?? undefined;
    ({ data, error } = await supabase.from(QUIZ_TABLE).insert(payload).select('*').single());
  }
  if (error) throw error;
  return data as Quiz;
}

export async function deleteQuiz(id: string): Promise<void> {
  const { error } = await supabase.from(QUIZ_TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function publishQuiz(id: string, publish: boolean): Promise<Quiz> {
  const { data, error } = await supabase.from(QUIZ_TABLE).update({ status: publish ? 'published' : 'draft' }).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Quiz;
}

// --------------------------- Câu hỏi trong đề ---------------------------

export async function getQuizItems(quizId: string): Promise<QuizItem[]> {
  const { data, error } = await supabase.from(ITEM_TABLE).select('*, quiz_bank_questions(*, quiz_bank_options(*))').eq('quiz_id', quizId).order('order_index');
  if (error) throw error;
  return (data || []).map((r: any) => ({ ...r, question: r.quiz_bank_questions ? mapQuestion(r.quiz_bank_questions) : undefined }));
}

export async function addQuestionsToQuiz(quizId: string, questionIds: string[], startOrder = 0): Promise<void> {
  if (!questionIds.length) return;
  const rows = questionIds.map((qid, i) => ({ quiz_id: quizId, question_id: qid, order_index: startOrder + i, points: 1 }));
  const { error } = await supabase.from(ITEM_TABLE).upsert(rows, { onConflict: 'quiz_id,question_id' });
  if (error) throw error;
}

export async function removeQuizItem(itemId: string): Promise<void> {
  const { error } = await supabase.from(ITEM_TABLE).delete().eq('id', itemId);
  if (error) throw error;
}

export async function updateQuizItem(itemId: string, patch: { order_index?: number; points?: number }): Promise<void> {
  const { error } = await supabase.from(ITEM_TABLE).update(patch).eq('id', itemId);
  if (error) throw error;
}

export async function reorderQuizItems(items: { id: string; order_index: number }[]): Promise<void> {
  await Promise.all(items.map(it => supabase.from(ITEM_TABLE).update({ order_index: it.order_index }).eq('id', it.id)));
}

// --------------------------- Giao đề cho lớp ---------------------------

export interface QuizAssignment { class_id: string; grade_column_id: string | null; }

export async function getQuizAssignments(quizId: string): Promise<QuizAssignment[]> {
  const { data, error } = await supabase.from(ASSIGN_TABLE).select('class_id, grade_column_id').eq('quiz_id', quizId);
  if (error) throw error;
  return (data || []) as QuizAssignment[];
}

export async function assignQuizToClass(quizId: string, classId: string, gradeColumnId: string): Promise<void> {
  const { error } = await supabase.from(ASSIGN_TABLE).upsert({ quiz_id: quizId, class_id: classId, grade_column_id: gradeColumnId }, { onConflict: 'quiz_id,class_id' });
  if (error) throw error;
}

export async function unassignQuizFromClass(quizId: string, classId: string): Promise<void> {
  const { error } = await supabase.from(ASSIGN_TABLE).delete().eq('quiz_id', quizId).eq('class_id', classId);
  if (error) throw error;
}

// --------------------------- Kết quả (giảng viên) ---------------------------

export async function getQuizAttempts(quizId: string): Promise<any[]> {
  const { data, error } = await supabase.from(ATTEMPT_TABLE).select('*').eq('quiz_id', quizId).order('started_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAttemptDetail(attemptId: string): Promise<{ answers: any[]; logs: any[] }> {
  const [{ data: answers }, { data: logs }] = await Promise.all([
    supabase.from(ANSWER_TABLE).select('*').eq('attempt_id', attemptId),
    supabase.from(LOG_TABLE).select('*').eq('attempt_id', attemptId).order('occurred_at'),
  ]);
  return { answers: answers || [], logs: logs || [] };
}

// --------------------------- RPC luồng sinh viên ---------------------------

export async function rpcQuizOpen(slug: string, studentCode: string) {
  const { data, error } = await supabase.rpc('quiz_open', { p_slug: slug, p_student_code: studentCode });
  if (error) throw error;
  return data;
}
export async function rpcQuizStart(slug: string, studentCode: string, ua?: string) {
  const { data, error } = await supabase.rpc('quiz_start', { p_slug: slug, p_student_code: studentCode, p_ua: ua || navigator.userAgent });
  if (error) throw error;
  return data;
}
export async function rpcSaveAnswer(attemptId: string, questionId: string, optionIds: string[]) {
  const { data, error } = await supabase.rpc('quiz_save_answer', { p_attempt: attemptId, p_question: questionId, p_options: optionIds });
  if (error) throw error;
  return data;
}
export async function rpcLogEvent(attemptId: string, event: string, durationMs?: number, meta?: any) {
  const { error } = await supabase.rpc('quiz_log_event', { p_attempt: attemptId, p_event: event, p_duration: durationMs ?? null, p_meta: meta ?? {} });
  if (error) throw error;
}
export async function rpcSubmit(attemptId: string, auto = false) {
  const { data, error } = await supabase.rpc('quiz_submit', { p_attempt: attemptId, p_auto: auto });
  if (error) throw error;
  return data;
}

export { stripHtml };
