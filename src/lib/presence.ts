import { supabase } from './supabase';
import { UserAccount, OnlinePresenceUser } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const PRESENCE_CHANNEL_NAME = 'system_online_presence';

// Mỗi tab / cửa sổ trình duyệt có 1 sessionId riêng biệt duy nhất
const SESSION_ID = typeof window !== 'undefined'
  ? (sessionStorage.getItem('app_presence_session_id') || (() => {
      const newId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      sessionStorage.setItem('app_presence_session_id', newId);
      return newId;
    })())
  : 'server_sess';

let presenceChannel: RealtimeChannel | null = null;
let isChannelSubscribed = false;
let pendingTrackPayload: Record<string, any> | null = null;
let currentTrackingUser: UserAccount | null = null;
const listeners = new Set<(users: OnlinePresenceUser[]) => void>();

/**
 * Trích xuất và chuyển đổi presenceState từ Supabase Realtime thành mảng OnlinePresenceUser.
 * Hỗ trợ hiển thị độc lập từng người dùng hoặc phiên đăng nhập.
 */
function parsePresenceState(state: Record<string, any[]>): OnlinePresenceUser[] {
  const usersList: OnlinePresenceUser[] = [];
  const processedKeys = new Set<string>();

  Object.entries(state).forEach(([key, presences]) => {
    if (Array.isArray(presences) && presences.length > 0) {
      presences.forEach((p) => {
        if (!p || !p.id) return;
        // Key duy nhất cho mỗi phiên: nếu có sessionId thì dùng id + sessionId
        const uniqueKey = p.sessionId ? `${p.id}_${p.sessionId}` : `${p.id}_${key}`;
        if (processedKeys.has(uniqueKey)) return;
        processedKeys.add(uniqueKey);

        usersList.push({
          id: p.id,
          sessionId: p.sessionId,
          username: p.username || '',
          fullName: p.fullName || 'Người dùng',
          email: p.email || '',
          role: (p.role as 'admin' | 'user' | 'member') || 'user',
          avatarUrl: p.avatarUrl || '',
          onlineAt: p.onlineAt || new Date().toISOString(),
        });
      });
    }
  });

  // Sắp xếp: Admin trước, sau đó tới User, Member; cùng vai trò xếp theo thời gian mới nhất
  const roleWeight: Record<string, number> = {
    admin: 3,
    user: 2,
    member: 1,
  };

  return usersList.sort((a, b) => {
    const weightDiff = (roleWeight[b.role] || 0) - (roleWeight[a.role] || 0);
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.onlineAt).getTime() - new Date(a.onlineAt).getTime();
  });
}

function notifyListeners() {
  if (!presenceChannel) return;
  const state = presenceChannel.presenceState();
  const users = parsePresenceState(state);
  listeners.forEach((listener) => {
    try {
      listener(users);
    } catch (e) {
      console.error('Lỗi khi thực thi callback presence:', e);
    }
  });
}

/**
 * Khởi tạo hoặc lấy kênh Supabase Realtime Presence duy nhất.
 * Channel chỉ gọi subscribe() đúng 1 lần duy nhất trong toàn bộ vòng đời của nó.
 */
function getOrCreateChannel(user?: UserAccount): RealtimeChannel {
  if (presenceChannel) {
    return presenceChannel;
  }

  // Khóa presence key: kết hợp ID người dùng và Session ID để phân biệt rõ ràng các tab/thiết bị
  const userId = user?.id || 'guest';
  const presenceKey = `${userId}_${SESSION_ID}`;

  const channel = supabase.channel(PRESENCE_CHANNEL_NAME, {
    config: {
      presence: {
        key: presenceKey,
      },
    },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      notifyListeners();
    })
    .on('presence', { event: 'join' }, () => {
      notifyListeners();
    })
    .on('presence', { event: 'leave' }, () => {
      notifyListeners();
    });

  presenceChannel = channel;

  // Đăng ký kênh đúng 1 lần duy nhất tại đây
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      isChannelSubscribed = true;
      if (pendingTrackPayload) {
        try {
          await channel.track(pendingTrackPayload);
          pendingTrackPayload = null;
          notifyListeners();
        } catch (err) {
          console.warn('Không thể gửi trạng thái presence lên Supabase:', err);
        }
      }
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      isChannelSubscribed = false;
    }
  });

  return channel;
}

/**
 * Bắt đầu theo dõi và truyền tín hiệu trực tuyến của người dùng lên Supabase Realtime Presence
 */
export async function trackUserPresence(user: UserAccount) {
  if (!user || !user.id) return;
  currentTrackingUser = user;

  const payload = {
    id: user.id,
    sessionId: SESSION_ID,
    username: user.username || '',
    fullName: user.fullName || 'Người dùng',
    email: user.email || '',
    role: user.role,
    avatarUrl: user.avatarUrl || '',
    onlineAt: new Date().toISOString(),
  };

  const channel = getOrCreateChannel(user);

  if (isChannelSubscribed) {
    try {
      await channel.track(payload);
      pendingTrackPayload = null;
      notifyListeners();
    } catch (err) {
      console.warn('Lỗi khi gửi track presence:', err);
    }
  } else {
    // Lưu lại payload để tự động gửi ngay khi subscribe hoàn tất
    pendingTrackPayload = payload;
  }
}

/**
 * Hủy theo dõi trực tuyến (khi đăng xuất hoặc đóng tab)
 */
export async function untrackUserPresence() {
  if (presenceChannel && currentTrackingUser) {
    pendingTrackPayload = null;
    currentTrackingUser = null;
    if (isChannelSubscribed) {
      try {
        await presenceChannel.untrack();
      } catch (err) {
        console.warn('Lỗi khi untrack presence:', err);
      }
    }
    notifyListeners();
  }
}

/**
 * Đăng ký lắng nghe danh sách người dùng đang trực tuyến qua Supabase Realtime Presence
 */
export function subscribeToOnlineUsers(callback: (users: OnlinePresenceUser[]) => void): () => void {
  listeners.add(callback);

  // Khởi tạo kênh nếu chưa có (kênh sẽ tự động subscribe 1 lần duy nhất)
  const channel = getOrCreateChannel(currentTrackingUser || undefined);

  // Gửi ngay danh sách hiện có nếu đã có state
  const state = channel.presenceState();
  const currentList = parsePresenceState(state);
  callback(currentList);

  return () => {
    listeners.delete(callback);
    // Nếu không còn listener nào và không có user đang track, dọn dẹp kênh
    if (listeners.size === 0 && !currentTrackingUser && presenceChannel) {
      supabase.removeChannel(presenceChannel);
      presenceChannel = null;
      isChannelSubscribed = false;
      pendingTrackPayload = null;
    }
  };
}

export function getCurrentSessionId(): string {
  return SESSION_ID;
}
