import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { Task, TaskHistoryEntry } from '../types';

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
let unsubscribeFirestore: any = null;

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

// Save or update a task in Supabase (Migrated to Firebase)
export async function saveTaskToSupabase(task: Task) {
  // Sync locally first
  const tasks = getLocalTasks();
  const index = tasks.findIndex(t => t.id === task.id);
  if (index !== -1) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }
  saveLocalTasks(tasks);

  try {
    const taskRef = doc(db, TASKS_TABLE, task.id);
    // Remove undefined properties before saving to Firestore to prevent errors
    const removeUndefined = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(removeUndefined);
      if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, removeUndefined(v)])
        );
      }
      return obj;
    };
    const cleanTask = removeUndefined(task);
    await setDoc(taskRef, cleanTask, { merge: true });
  } catch (error) {
    console.warn(`Failed to save task ${task.name} to Firebase, saved locally:`, error);
  }
}

// Delete a task from Supabase (Migrated to Firebase)
export async function deleteTaskFromSupabase(taskId: string) {
  // Sync locally first
  const tasks = getLocalTasks().filter(t => t.id !== taskId);
  saveLocalTasks(tasks);

  try {
    const taskRef = doc(db, TASKS_TABLE, taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.warn(`Failed to delete task with ID ${taskId} from Firebase, deleted locally:`, error);
  }
}

// Fetch all tasks
export async function getTasksFromSupabase(): Promise<Task[]> {
  try {
    const querySnapshot = await getDocs(collection(db, TASKS_TABLE));
    const tasks: Task[] = [];
    querySnapshot.forEach((docSnap) => {
      tasks.push(docSnap.data() as Task);
    });
    
    saveLocalTasks(tasks);
    return tasks;
  } catch (error) {
    console.warn("Failed to fetch tasks from Firebase, using local fallback:", error);
    return getLocalTasks();
  }
}

// Subscribe to tasks changes
export function subscribeToTasks(callback: TaskListener) {
  const id = Math.random().toString(36).substring(2, 11);
  taskListeners.push({ id, callback });
  
  // Real-time channel (Singleton pattern)
  if (!unsubscribeFirestore) {
    unsubscribeFirestore = onSnapshot(collection(db, TASKS_TABLE), (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((docSnap) => {
        tasks.push(docSnap.data() as Task);
      });
      saveLocalTasks(tasks);
      triggerLocalTasksChange();
    }, (error) => {
      console.warn("Firebase tasks realtime listener error:", error);
    });
  }

  // Send initial data
  callback(getLocalTasks());
  
  return () => {
    const index = taskListeners.findIndex(l => l.id === id);
    if (index !== -1) taskListeners.splice(index, 1);
    
    // Only remove channel if no listeners left
    if (taskListeners.length === 0 && unsubscribeFirestore) {
      unsubscribeFirestore();
      unsubscribeFirestore = null;
    }
  };
}
