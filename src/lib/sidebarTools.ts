import { useSyncExternalStore } from 'react';

// Nút công cụ riêng của một màn hình (ví dụ khung thiết kế Bài giảng) gắn lên đầu thanh bên trái của hệ thống.
// Khi có công cụ, các mục chung (Thư viện, Thống kê, Cài đặt, Thông báo, Cá nhân, Đăng xuất) dồn xuống cuối thanh.
export interface SidebarTool { id: string; label: string; icon: any; active?: boolean; onClick: () => void }

let tools: SidebarTool[] | null = null;
const subs = new Set<() => void>();
export function setSidebarTools(t: SidebarTool[] | null) { tools = t; subs.forEach(f => f()); }
export function useSidebarTools(): SidebarTool[] | null {
  return useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => tools, () => null);
}
