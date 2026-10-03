import { supabase } from './supabase';
import { getAssignableClasses } from './edu';
import { isTaskRelevantToUser } from './tasks';
import type { Task, UserAccount } from '../types';

// Số liệu cho Trang chủ điện thoại: việc hôm nay, bài nộp chờ chấm, lời nhắc.
// Chỉ đọc dữ liệu của chính tài khoản (lớp của mình và lớp được chia sẻ quyền giao bài).

const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
const dueOf = (t: Task) => { const v = t.deadline || t.endDate; const n = v ? new Date(v).getTime() : NaN; return isNaN(n) ? null : n; };
const isOpen = (t: Task) => !t.isDeleted && t.status !== 'Completed' && t.status !== 'Cancelled';

// Việc cần làm hôm nay: việc chưa xong, hạn trong hôm nay hoặc đã quá hạn.
export function todayTasks(tasks: Task[], user: UserAccount) {
  const mine = tasks.filter(t => isOpen(t) && isTaskRelevantToUser(t, user));
  const eod = endOfToday();
  const today = mine.filter(t => { const d = dueOf(t); return d !== null && d <= eod; });
  return { today: today.length, open: mine.length, overdue: today.filter(t => (dueOf(t) || 0) < Date.now()).length };
}

export interface PendingClass { classId: string; className: string; assignmentId: string; assignmentTitle: string; gradeColumnId: string; count: number }
export interface PendingGrading { total: number; classes: PendingClass[] }

// Bài nộp chưa có điểm ở cột điểm của bài tập, gộp theo từng bài tập.
export async function loadPendingGrading(): Promise<PendingGrading> {
  const classes = await getAssignableClasses().catch(() => [] as any[]);
  if (!classes.length) return { total: 0, classes: [] };
  const nameOf = new Map(classes.map((c: any) => [c.id, c.name as string]));
  const { data: asg } = await supabase.from('edu_assignments').select('id,class_id,grade_column_id,title').in('class_id', [...nameOf.keys()]);
  const gradable = (asg || []).filter((a: any) => a.grade_column_id);
  if (!gradable.length) return { total: 0, classes: [] };
  const aids = gradable.map((a: any) => a.id);
  const pick = 'assignment_id,user_id';
  let sub = await supabase.from('edu_submissions_meta').select(pick).in('assignment_id', aids);
  if (sub.error) sub = await supabase.from('edu_submissions').select(pick).in('assignment_id', aids);
  const cols = [...new Set(gradable.map((a: any) => a.grade_column_id))];
  const { data: grades } = await supabase.from('edu_grades').select('grade_column_id,user_id,score').in('grade_column_id', cols);
  const graded = new Set((grades || []).filter((g: any) => g.score !== null && g.score !== undefined).map((g: any) => `${g.grade_column_id}|${g.user_id}`));
  const byA = new Map(gradable.map((a: any) => [a.id, a]));
  const counts = new Map<string, number>();
  for (const s of (sub.data || []) as any[]) {
    const a: any = byA.get(s.assignment_id);
    if (!a || graded.has(`${a.grade_column_id}|${s.user_id}`)) continue;
    counts.set(a.id, (counts.get(a.id) || 0) + 1);
  }
  const list: PendingClass[] = [...counts.entries()].map(([aid, count]) => {
    const a: any = byA.get(aid);
    return { classId: a.class_id, className: nameOf.get(a.class_id) || 'Lớp học', assignmentId: aid, assignmentTitle: a.title || 'Bài tập', gradeColumnId: a.grade_column_id, count };
  }).sort((x, y) => y.count - x.count);
  return { total: list.reduce((n, x) => n + x.count, 0), classes: list };
}

export interface Reminder {
  id: string;
  title: string;
  detail: string;
  kind: 'grading' | 'task' | 'quiz' | 'extension';
  tab: string;
  sub?: Record<string, string>;
  at?: number;
}

const fmtWhen = (ms: number) => {
  const d = new Date(ms); const now = new Date();
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - day0) / 86400000);
  if (diff === 0) return `${time} hôm nay`;
  if (diff === 1) return `${time} ngày mai`;
  if (diff === -1) return `${time} hôm qua`;
  return `${time} ngày ${d.getDate()}/${d.getMonth() + 1}`;
};

// Lời nhắc: bài chờ chấm, việc sắp đến hạn, đề trắc nghiệm sắp đóng, yêu cầu gia hạn chờ duyệt.
export async function loadReminders(user: UserAccount, tasks: Task[], pending: PendingGrading | null, can: (id: string) => boolean): Promise<Reminder[]> {
  const out: Reminder[] = [];
  if (pending && can('edu')) {
    pending.classes.slice(0, 2).forEach(p => out.push({
      id: `grade:${p.assignmentId}:${p.count}`, kind: 'grading',
      title: `${p.count} bài nộp chờ chấm`, detail: `${p.assignmentTitle} · ${p.className}`,
      tab: 'edu', sub: { sv: 'grading', cid: p.classId, aid: p.assignmentId, gcol: p.gradeColumnId },
    }));
  }
  if (can('tasks')) {
    const soon = Date.now() + 3 * 86400000;
    tasks.filter(t => isOpen(t) && isTaskRelevantToUser(t, user)).map(t => ({ t, d: dueOf(t) }))
      .filter(x => x.d !== null && (x.d as number) <= soon)
      .sort((a, b) => (a.d as number) - (b.d as number)).slice(0, 2)
      .forEach(({ t, d }) => out.push({
        id: `task:${t.id}:${d}`, kind: 'task', at: d as number,
        title: (d as number) < Date.now() ? `Quá hạn: ${t.name}` : t.name,
        detail: `Hạn ${fmtWhen(d as number)}`, tab: 'tasks',
      }));
  }
  if (can('edu_exam')) {
    const now = new Date().toISOString(); const soon = new Date(Date.now() + 3 * 86400000).toISOString();
    const { data } = await supabase.from('quizzes').select('id,title,close_at,status').eq('owner_id', user.id).gt('close_at', now).lt('close_at', soon).limit(3);
    (data || []).forEach((q: any) => out.push({
      id: `quiz:${q.id}:${q.close_at}`, kind: 'quiz', at: new Date(q.close_at).getTime(),
      title: `Đề "${q.title}" sắp đóng`, detail: `Đóng lúc ${fmtWhen(new Date(q.close_at).getTime())}`,
      tab: 'edu_exam', sub: { qv: 'detail', qid: q.id },
    }));
  }
  if (can('edu')) {
    const classes = await getAssignableClasses().catch(() => [] as any[]);
    if (classes.length) {
      const { data } = await supabase.from('edu_extension_requests').select('id,class_id').eq('status', 'pending').in('class_id', classes.map((c: any) => c.id));
      const by = new Map<string, number>();
      (data || []).forEach((r: any) => by.set(r.class_id, (by.get(r.class_id) || 0) + 1));
      [...by.entries()].slice(0, 2).forEach(([cid, n]) => out.push({
        id: `ext:${cid}:${n}`, kind: 'extension',
        title: `${n} yêu cầu gia hạn chờ duyệt`, detail: classes.find((c: any) => c.id === cid)?.name || 'Lớp học',
        tab: 'edu', sub: { sv: 'class_detail', cid, ext: '1' },
      }));
    }
  }
  // Yêu cầu chờ duyệt (gia hạn nộp bài) lên đầu danh sách, sau đó tới bài chờ chấm, việc sắp hạn, đề trắc nghiệm.
  const rank: Record<Reminder['kind'], number> = { extension: 0, grading: 1, task: 2, quiz: 3 };
  return out.map((r, i) => ({ r, i })).sort((a, b) => rank[a.r.kind] - rank[b.r.kind] || a.i - b.i).map(x => x.r);
}

// Lời nhắc đã ẩn, lưu theo tài khoản trên máy này. Lời nhắc có số liệu mới (mã khác) sẽ hiện lại.
const DIS_KEY = (uid: string) => `edugo_reminder_off_${uid}`;
export function dismissedReminders(uid: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DIS_KEY(uid)) || '[]')); } catch { return new Set(); }
}
export function dismissReminder(uid: string, id: string) {
  const s = dismissedReminders(uid); s.add(id);
  try { localStorage.setItem(DIS_KEY(uid), JSON.stringify([...s].slice(-200))); } catch { /* bỏ qua */ }
}
