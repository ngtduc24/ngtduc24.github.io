import { supabase } from './supabase';
import { Task, TaskHistoryEntry, UserAccount } from '../types';

export const TASKS_TABLE = 'tasks';

// Add history entry to a task
export function addTaskHistory(task: Task, action: string, userId: string, userFullName: string, details?: string): Task {
  const newEntry: TaskHistoryEntry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    action,
    timestamp: new Date().toISOString(),
    userId,
    userFullName,
    details
  };

  return {
    ...task,
    history: [...(task.history || []), newEntry]
  };
}

// --- Local Caching and Pub-Sub for Resilient Task Integration ---
type TaskListener = (tasks: Task[]) => void;
const taskListeners: { id: string; callback: TaskListener }[] = [];
let realtimeChannel: any = null;
let pollTimer: any = null;

function getLocalTasks(): Task[] {
  const cached = localStorage.getItem('local_tasks_cache');
  if (cached) {
    try {
      return JSON.parse(cached) as Task[];
    } catch (e) {}
  }
  return [];
}

function saveLocalTasks(tasks: Task[]) {
  localStorage.setItem('local_tasks_cache', JSON.stringify(tasks));
  triggerLocalTasksChange();
}

function triggerLocalTasksChange() {
  const tasks = getLocalTasks();
  taskListeners.forEach(l => {
    try { l.callback(tasks); } catch (e) {}
  });
}

// Bỏ các trường rỗng để Postgres không lưu giá trị undefined.
function removeUndefined(obj: any): any {
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return obj;
}

// Toàn bộ nội dung công việc nằm trong cột payload dạng JSONB. Vài cột riêng được
// tách ra để Postgres lọc nhanh và để chính sách bảo mật RLS kiểm tra người tạo,
// người nhận mà không phải mở gói JSON.
function taskToRow(task: Task) {
  const clean = removeUndefined(task) as Task;
  return {
    id: task.id,
    name: task.name || '',
    description: task.description || '',
    status: task.status || 'In Progress',
    type: task.tag || null,
    assigned_to: task.assignedTo || null,
    assigned_to_name: task.assignedToName || null,
    creator_id: task.creatorId || task.createdBy || null,
    created_by: task.creatorId || task.createdBy || null,
    created_by_name: task.createdByName || null,
    deadline: task.deadline || null,
    is_deleted: Boolean(task.isDeleted),
    payload: clean,
    updated_at: new Date().toISOString(),
  };
}

function rowToTask(row: any): Task {
  const payload = row?.payload || {};
  return {
    ...payload,
    id: row.id,
    name: row.name ?? payload.name,
    description: row.description ?? payload.description,
    status: row.status ?? payload.status,
    assignedTo: row.assigned_to ?? payload.assignedTo,
    creatorId: row.creator_id ?? payload.creatorId,
    deadline: row.deadline ?? payload.deadline,
    isDeleted: row.is_deleted ?? payload.isDeleted,
  } as Task;
}

// Chuyển lỗi kỹ thuật của Supabase thành câu tiếng Việt dễ hiểu cho người dùng.
export function describeTaskWriteError(error: any): string {
  const code = error?.code || '';
  const message: string = error?.message || '';

  if (code === '42501' || message.toLowerCase().includes('row-level security')) {
    return 'Máy chủ Supabase từ chối lưu công việc vì chính sách bảo mật của bảng tasks. Vui lòng chạy lại tệp TASKS_SUPABASE.sql trong Supabase.';
  }
  if (code === '42P01' || message.includes('does not exist')) {
    return 'Chưa có bảng tasks trên Supabase. Vui lòng chạy tệp TASKS_SUPABASE.sql trong mục SQL Editor của Supabase.';
  }
  if (code === 'PGRST301' || code === '401') {
    return 'Phiên đăng nhập đã hết hạn nên máy chủ từ chối lưu. Vui lòng đăng nhập lại rồi thử lại.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Không kết nối được máy chủ nên công việc chưa được lưu. Vui lòng kiểm tra đường mạng rồi thử lại.';
  }
  return message || 'Không lưu được công việc lên máy chủ. Vui lòng thử lại.';
}

// Save or update a task in Supabase
export async function saveTaskToSupabase(task: Task) {
  // Cập nhật bản sao trên máy trước để giao diện phản hồi ngay.
  const tasks = getLocalTasks();
  const index = tasks.findIndex(t => t.id === task.id);
  if (index !== -1) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }
  saveLocalTasks(tasks);

  const { error } = await supabase.from(TASKS_TABLE).upsert(taskToRow(task), { onConflict: 'id' });

  if (error) {
    console.warn(`Không lưu được công việc ${task.name} lên Supabase:`, error);
    // Trả bản sao trên máy về đúng dữ liệu của máy chủ để giao diện không hiện sai.
    await getTasksFromSupabase().catch(() => {});
    throw new Error(describeTaskWriteError(error));
  }
}

// Delete a task from Supabase
export async function deleteTaskFromSupabase(taskId: string) {
  const remaining = getLocalTasks().filter(t => t.id !== taskId);
  saveLocalTasks(remaining);

  const { error } = await supabase.from(TASKS_TABLE).delete().eq('id', taskId);

  if (error) {
    console.warn(`Không xóa được công việc ${taskId} trên Supabase:`, error);
    await getTasksFromSupabase().catch(() => {});
    throw new Error(describeTaskWriteError(error));
  }
}

// Fetch all tasks
export async function getTasksFromSupabase(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from(TASKS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const tasks = (data || []).map(rowToTask);
    saveLocalTasks(tasks);
    return tasks;
  } catch (error) {
    console.warn('Không tải được danh sách công việc từ Supabase, dùng bản lưu trên máy:', error);
    return getLocalTasks();
  }
}

// Subscribe to tasks changes
export function subscribeToTasks(callback: TaskListener) {
  const id = Math.random().toString(36).substring(2, 11);
  taskListeners.push({ id, callback });

  // Kênh thời gian thực dùng chung cho mọi nơi trong ứng dụng.
  if (!realtimeChannel) {
    realtimeChannel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TASKS_TABLE }, () => {
        getTasksFromSupabase().catch(() => {});
      })
      .subscribe();

    getTasksFromSupabase().catch(() => {});

    // Lưới an toàn khi kênh thời gian thực chưa bật, cứ 25 giây tải lại 1 lần.
    pollTimer = setInterval(() => {
      getTasksFromSupabase().catch(() => {});
    }, 25000);
  }

  // Gửi dữ liệu có sẵn ngay lập tức
  callback(getLocalTasks());

  return () => {
    const index = taskListeners.findIndex(l => l.id === id);
    if (index !== -1) taskListeners.splice(index, 1);

    if (taskListeners.length === 0 && realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }
  };
}

/**
 * Chuyển toàn bộ công việc cũ từ Firebase Firestore sang Supabase. Chỉ chạy 1 lần
 * khi quản trị viên bấm nút trong tab Cài đặt của module Quản lý công việc.
 */
export async function migrateTasksFromFirebase(): Promise<{ moved: number; skipped: number }> {
  const { db } = await import('./firebase');
  const { collection, getDocs } = await import('firebase/firestore');

  const snapshot = await getDocs(collection(db, TASKS_TABLE));
  const oldTasks: Task[] = [];
  snapshot.forEach(docSnap => oldTasks.push(docSnap.data() as Task));

  if (oldTasks.length === 0) return { moved: 0, skipped: 0 };

  const { data: existing } = await supabase.from(TASKS_TABLE).select('id');
  const existingIds = new Set((existing || []).map((r: any) => r.id));

  const rows = oldTasks
    .filter(t => t && t.id && !existingIds.has(t.id))
    .map(taskToRow);

  if (rows.length === 0) return { moved: 0, skipped: oldTasks.length };

  const { error } = await supabase.from(TASKS_TABLE).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(describeTaskWriteError(error));

  await getTasksFromSupabase();
  return { moved: rows.length, skipped: oldTasks.length - rows.length };
}

/**
 * Kiểm tra xem công việc có thuộc quyền hạn hoặc liên quan đến người dùng hiện tại hay không:
 * - Quản trị viên (admin): Toàn quyền thấy và quản lý toàn bộ task.
 * - Người dùng thông thường: Chỉ thấy task do mình tạo (creatorId/createdBy), hoặc task được giao cho mình (assignedTo).
 */
export function isTaskRelevantToUser(task: Task | null | undefined, user: UserAccount | null | undefined): boolean {
  if (!task || !user) return false;
  if (user.role === 'admin') return true;

  const isAssigned = task.assignedTo === user.id ||
                    (Boolean(task.assignedTo) && Boolean(user.username) && task.assignedTo === user.username);

  const isCreator = task.creatorId === user.id ||
                    task.createdBy === user.id ||
                    (Boolean(task.createdBy) && Boolean(user.username) && task.createdBy === user.username) ||
                    (Boolean(user.fullName) && Boolean(task.createdByName) && task.createdByName === user.fullName);

  return Boolean(isAssigned || isCreator);
}
