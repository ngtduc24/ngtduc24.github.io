import { supabase } from './supabase';
import { UserAccount, OnlinePresenceUser } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const PRESENCE_CHANNEL_NAME = 'system_online_presence';

let presenceChannel: RealtimeChannel | null = null;
let currentTrackingUser: UserAccount | null = null;
const listeners = new Set<(users: OnlinePresenceUser[]) => void>();

/**
 * Trích xuất và chuyển đổi presenceState từ Supabase Realtime thành mảng OnlinePresenceUser
 */
function parsePresenceState(state: Record<string, any[]>): OnlinePresenceUser[] {
  const usersMap = new Map<string, OnlinePresenceUser>();

  Object.entries(state).forEach(([key, presences]) => {
    if (Array.isArray(presences) && presences.length > 0) {
      // Lấy phiên trực tuyến mới nhất của người dùng này
      const p = presences[presences.length - 1];
      if (p && p.id) {
        usersMap.set(p.id, {
          id: p.id,
          username: p.username || '',
          fullName: p.fullName || 'Người dùng',
          email: p.email || '',
          role: (p.role as 'admin' | 'user' | 'member') || 'user',
          avatarUrl: p.avatarUrl || '',
          onlineAt: p.onlineAt || new Date().toISOString(),
        });
      }
    }
  });

  const list = Array.from(usersMap.values());

  // Sắp xếp: Admin trước, sau đó tới User, Member; cùng vai trò xếp theo thời gian mới nhất
  const roleWeight: Record<string, number> = {
    admin: 3,
    user: 2,
    member: 1,
  };

  return list.sort((a, b) => {
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
 * Khởi tạo hoặc lấy kênh Supabase Realtime Presence duy nhất
 */
function getOrCreateChannel(user?: UserAccount): RealtimeChannel {
  if (presenceChannel) {
    return presenceChannel;
  }

  const channel = supabase.channel(PRESENCE_CHANNEL_NAME, {
    config: {
      presence: {
        key: user?.id || 'guest_' + Math.random().toString(36).substring(2, 9),
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
  return channel;
}

/**
 * Bắt đầu theo dõi và truyền tín hiệu trực tuyến của người dùng lên Supabase Realtime Presence
 */
export async function trackUserPresence(user: UserAccount) {
  if (!user || !user.id) return;
  currentTrackingUser = user;

  const channel = getOrCreateChannel(user);

  // Nếu kênh chưa subscribe
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      try {
        await channel.track({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl || '',
          onlineAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Không thể gửi trạng thái presence lên Supabase:', err);
      }
    }
  });

  // Nếu kênh đã được subscribe từ trước, cập nhật track
  if (channel.state === 'joined') {
    try {
      await channel.track({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl || '',
        onlineAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Lỗi khi cập nhật presence state:', err);
    }
  }
}

/**
 * Hủy theo dõi trực tuyến (khi đăng xuất)
 */
export async function untrackUserPresence() {
  if (presenceChannel && currentTrackingUser) {
    try {
      await presenceChannel.untrack();
    } catch (err) {
      console.warn('Lỗi khi untrack presence:', err);
    }
    currentTrackingUser = null;
  }
}

/**
 * Đăng ký lắng nghe danh sách người dùng đang trực tuyến qua Supabase Realtime Presence
 * Dành riêng cho màn hình Admin trên Dashboard
 */
export function subscribeToOnlineUsers(callback: (users: OnlinePresenceUser[]) => void): () => void {
  listeners.add(callback);

  const channel = getOrCreateChannel(currentTrackingUser || undefined);

  if (channel.state !== 'joined') {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        notifyListeners();
      }
    });
  } else {
    // Trả về dữ liệu tức thời nếu kênh đã sẵn sàng
    const state = channel.presenceState();
    callback(parsePresenceState(state));
  }

  return () => {
    listeners.delete(callback);
    // Nếu không còn listener nào và không có user đang track, dọn dẹp kênh
    if (listeners.size === 0 && !currentTrackingUser && presenceChannel) {
      supabase.removeChannel(presenceChannel);
      presenceChannel = null;
    }
  };
}
