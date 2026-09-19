import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  User as UserIcon, 
  Clock, 
  Radio,
  ChevronLeft,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { subscribeToOnlineUsers, getCurrentSessionId } from '../lib/presence';
import { OnlinePresenceUser, UserAccount } from '../types';

interface OnlineUsersPresenceProps {
  currentUser: UserAccount;
}

const PAGE_SIZE = 3;

export default function OnlineUsersPresence({ currentUser }: OnlineUsersPresenceProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlinePresenceUser[]>([]);
  const [selectedRole, setSelectedRole] = useState<'all' | 'admin' | 'user' | 'member'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const mySessionId = getCurrentSessionId();

  useEffect(() => {
    // Đăng ký lắng nghe thời gian thực qua Supabase Realtime Presence
    const unsubscribe = subscribeToOnlineUsers((users) => {
      setOnlineUsers(users);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Đảm bảo phiên hiện tại luôn xuất hiện trong danh sách hiển thị
  const allUsersWithCurrent = useMemo(() => {
    const list = [...onlineUsers];
    const exists = list.some((u) => u.id === currentUser.id && (u.sessionId === mySessionId || !u.sessionId));
    if (!exists && currentUser) {
      list.unshift({
        id: currentUser.id,
        sessionId: mySessionId,
        username: currentUser.username,
        fullName: currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role,
        avatarUrl: currentUser.avatarUrl,
        onlineAt: new Date().toISOString(),
      });
    }
    return list;
  }, [onlineUsers, currentUser, mySessionId]);

  // Thống kê số lượng theo vai trò
  const counts = useMemo(() => {
    const total = allUsersWithCurrent.length;
    const admin = allUsersWithCurrent.filter((u) => u.role === 'admin').length;
    const user = allUsersWithCurrent.filter((u) => u.role === 'user').length;
    const member = allUsersWithCurrent.filter((u) => u.role === 'member').length;
    return { total, admin, user, member };
  }, [allUsersWithCurrent]);

  // Lọc theo vai trò đã chọn
  const filteredUsers = useMemo(() => {
    return allUsersWithCurrent.filter((u) => {
      if (selectedRole === 'all') return true;
      return u.role === selectedRole;
    });
  }, [allUsersWithCurrent, selectedRole]);

  // Reset trang về 1 khi đổi vai trò lọc
  const handleRoleChange = (role: 'all' | 'admin' | 'user' | 'member') => {
    setSelectedRole(role);
    setCurrentPage(1);
  };

  // Tính toán phân trang (3 thành viên / trang)
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredUsers, safeCurrentPage]);

  // Định dạng thời gian tương đối
  const formatOnlineTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) return 'Vừa mới truy cập';
      if (diffMinutes < 60) return `Trực tuyến ${diffMinutes} phút trước`;
      const diffHours = Math.floor(diffMinutes / 60);
      return `Trực tuyến ${diffHours} giờ trước`;
    } catch {
      return 'Đang hoạt động';
    }
  };

  const getRoleBadge = (role: 'admin' | 'user' | 'member') => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-light text-brand-hover border border-brand/60 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-brand" />
            Admin
          </span>
        );
      case 'user':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-light text-brand-hover border border-brand/60 shadow-xs">
            <UserCheck className="w-3 h-3 text-brand" />
            User
          </span>
        );
      case 'member':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-light text-brand-hover border border-brand/60 shadow-xs">
            <UserIcon className="w-3 h-3 text-brand" />
            Thành viên
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      {/* Tiêu đề & Thông báo Realtime */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-hover text-white flex items-center justify-center shadow-lg shadow-brand/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-lg font-display">Thành viên đang truy cập</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 text-brand border border-brand/20">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping"></span>
                Supabase Realtime
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Theo dõi thời gian thực các tài khoản Admin, User và Thành viên đang trực tuyến</p>
          </div>
        </div>
      </div>

      {/* Thẻ đếm số lượng nhanh (Quick stat chips) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <button
          type="button"
          onClick={() => handleRoleChange('all')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedRole === 'all'
              ? 'bg-slate-900 border-slate-900 text-white shadow-md'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Tổng trực tuyến</span>
            <Users className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-xl font-extrabold mt-1">{counts.total}</div>
        </button>

        <button
          type="button"
          onClick={() => handleRoleChange('admin')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedRole === 'admin'
              ? 'bg-brand border-brand text-white shadow-md shadow-brand/20'
              : 'bg-brand-light/50 hover:bg-brand-light border-brand/60 text-brand-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Admin</span>
            <ShieldCheck className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-xl font-extrabold mt-1">{counts.admin}</div>
        </button>

        <button
          type="button"
          onClick={() => handleRoleChange('user')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedRole === 'user'
              ? 'bg-brand border-brand text-white shadow-md shadow-brand/20'
              : 'bg-brand-light/50 hover:bg-brand-light border-brand/60 text-brand-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">User</span>
            <UserCheck className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-xl font-extrabold mt-1">{counts.user}</div>
        </button>

        <button
          type="button"
          onClick={() => handleRoleChange('member')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedRole === 'member'
              ? 'bg-brand border-brand text-white shadow-md shadow-brand/20'
              : 'bg-brand-light/50 hover:bg-brand-light border-brand/60 text-brand-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Thành viên</span>
            <UserIcon className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-xl font-extrabold mt-1">{counts.member}</div>
        </button>
      </div>

      {/* Danh sách thành viên dạng Bảng (Table) */}
      {filteredUsers.length === 0 ? (
        <div className="py-10 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
          <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-600">Không có thành viên trực tuyến trong danh mục này</p>
        </div>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Thành viên</th>
                  <th className="py-3 px-4">Tài khoản / Email</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedUsers.map((user, idx) => {
                  const isCurrentTab = user.id === currentUser.id && user.sessionId === mySessionId;
                  const isSameUserOtherSession = user.id === currentUser.id && user.sessionId !== mySessionId;
                  const itemKey = user.sessionId ? `${user.id}_${user.sessionId}` : `${user.id}_${idx}`;

                  return (
                    <tr 
                      key={itemKey} 
                      className={`transition-colors ${isCurrentTab ? 'bg-brand/5 hover:bg-brand/10' : 'hover:bg-slate-50/60'}`}
                    >
                      {/* Thành viên: Avatar + Tên */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                                {user.fullName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand border-2 border-white"></span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 text-xs">{user.fullName}</span>
                              {isCurrentTab && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand text-white leading-none">
                                  Bạn (Tab này)
                                </span>
                              )}
                              {isSameUserOtherSession && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 leading-none">
                                  <Monitor className="w-2.5 h-2.5" />
                                  Tab/Thiết bị khác
                                </span>
                              )}
                            </div>
                            {user.username && (
                              <span className="text-[11px] text-slate-400 block mt-0.5">@{user.username}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tài khoản / Email */}
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {user.email || '—'}
                      </td>

                      {/* Vai trò */}
                      <td className="py-3 px-4">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Thời gian */}
                      <td className="py-3 px-4 text-slate-500">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatOnlineTime(user.onlineAt)}</span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-light text-brand-hover border border-brand/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>
                          Trực tuyến
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phân trang: Khi danh sách dài quá 3 thành viên (bấm số 1, 2, 3...) */}
          {filteredUsers.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Hiển thị <span className="font-bold text-slate-700">{(safeCurrentPage - 1) * PAGE_SIZE + 1}</span> -{' '}
                <span className="font-bold text-slate-700">{Math.min(safeCurrentPage * PAGE_SIZE, filteredUsers.length)}</span> trên{' '}
                <span className="font-bold text-slate-700">{filteredUsers.length}</span> kết nối
              </div>

              <div className="flex items-center gap-1.5">
                {/* Nút Trước */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Các nút số 1, 2, 3... */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === safeCurrentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Nút Sau */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
