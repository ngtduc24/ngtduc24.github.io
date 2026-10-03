import type { AppNotification, UserAccount } from '../types';

// ===== Mở thẳng màn tạo mới của một chức năng (nút Tạo mới trên điện thoại) =====
// Đặt cờ dùng 1 lần, chức năng đích đọc cờ khi mở và tự bật màn tạo mới.
// Mở bảng duyệt gia hạn ngay khi vào trang lớp (từ lời nhắc hoặc ô Phê duyệt yêu cầu).
export function markOpenExt(classId: string) { try { sessionStorage.setItem('edu_open_ext', classId); } catch { /* bỏ qua */ } }
export function takeOpenExt(classId: string): boolean {
  try { if (sessionStorage.getItem('edu_open_ext') === classId) { sessionStorage.removeItem('edu_open_ext'); return true; } } catch { /* bỏ qua */ }
  return false;
}

export function setCreateIntent(tab: string) {
  try { sessionStorage.setItem(`open_hint:create:${tab}`, '1'); } catch { /* bỏ qua */ }
}
export function takeCreateIntent(tab: string): boolean {
  try {
    const k = `open_hint:create:${tab}`;
    if (sessionStorage.getItem(k)) { sessionStorage.removeItem(k); return true; }
  } catch { /* bỏ qua */ }
  return false;
}

// ===== Gửi sang máy tính =====
// Gửi 1 thông báo cho chính mình, kèm chức năng (và màn hình con) cần mở. Trên máy tính bấm thông báo là vào thẳng.
export async function sendToComputer(user: UserAccount, tab: string, label: string, sub?: Record<string, string>) {
  const { pushNotificationToSupabase } = await import('./data');
  await pushNotificationToSupabase({
    title: `Mở ${label} trên máy tính`,
    description: `Bạn gửi từ điện thoại lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Bấm vào thông báo này trên máy tính để mở ${label}.`,
    type: 'info',
    targetAudience: 'custom_users',
    targetUserIds: [user.id],
    senderId: user.id,
    senderName: user.fullName,
    metadata: { handoff: { tab, sub: sub || null, label } },
  });
}

// ===== Phân loại thông báo theo thẻ Tất cả, Công việc, Cộng tác, Lớp học, Hệ thống =====
export type NotifCategory = 'approval' | 'task' | 'collab' | 'class' | 'system';
const CLASS_TYPES = new Set(['edu_class', 'edu_school', 'quiz', 'quiz_question', 'bank_item']);

export function notifCategory(n: AppNotification): NotifCategory {
  const meta: any = n.metadata || {};
  if (n.type === 'approval' || meta.approval) return 'approval';
  if (n.type === 'task' || n.type === 'warning') return 'task';
  if (meta.collabType && CLASS_TYPES.has(meta.collabType)) return 'class';
  if (meta.classId || meta.assignmentId || meta.quizId) return 'class';
  if (n.type === 'collab') return 'collab';
  return 'system';
}

export const NOTIF_CATEGORY_LABEL: Record<NotifCategory, string> = {
  approval: 'Phê duyệt', task: 'Công việc', collab: 'Cộng tác', class: 'Lớp học', system: 'Hệ thống',
};
