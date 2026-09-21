import React, { useState, useEffect } from 'react';
import { BarChart3, Calculator, Layers, Microscope, BookOpen, CheckCircle2, ClipboardList } from 'lucide-react';
import { getStatsFromSupabase, getJournalsFromSupabase } from '../lib/data';
import { useTasks } from './TaskContext';
import { UserAccount, ScientificJournal } from '../types';
import { isTaskRelevantToUser } from '../lib/tasks';
import OnlineUsersPresence from './OnlineUsersPresence';

interface StatsOverviewProps {
  currentUser: UserAccount;
}

// Trang Số liệu tách riêng, gom toàn bộ thống kê trước đây nằm trên dashboard.
export default function StatsOverview({ currentUser }: StatsOverviewProps) {
  const { tasks } = useTasks();
  const [statsData, setStatsData] = useState<Record<string, number>>({ calculator: 0, public_search: 0 });
  const [journals, setJournals] = useState<ScientificJournal[]>([]);

  useEffect(() => {
    getStatsFromSupabase().then(setStatsData).catch(() => {});
    getJournalsFromSupabase().then(setJournals).catch(() => {});
  }, []);

  const isUserAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions || [];
  const can = (id: string) => isUserAdmin || perms.includes(id);

  const visibleTasks = tasks.filter(t => !t.isDeleted && isTaskRelevantToUser(t, currentUser));
  const completedTasksCount = (isUserAdmin ? tasks.filter(t => !t.isDeleted) : visibleTasks).filter(t => t.status === 'Completed').length;
  const runningTasksCount = visibleTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length;
  const journalsCount = journals.length;
  const disciplinesCount = new Set(journals.map(j => j.field?.trim()).filter(Boolean)).size;

  const tiles = [
    ...(can('tasks') ? [
      { label: 'Công việc đang thực hiện', value: runningTasksCount, sub: 'Chưa hoàn thành', icon: ClipboardList },
      { label: 'Công việc đã hoàn thành', value: completedTasksCount, sub: 'Tổng đã xong', icon: CheckCircle2 },
    ] : []),
    ...(can('calculator') ? [
      { label: 'Lượt tính cỡ mẫu', value: statsData.calculator || 0, sub: 'Thời gian thực', icon: Calculator },
    ] : []),
    ...(can('scientific_journals') ? [
      { label: 'Tạp chí lưu trữ', value: journalsCount, sub: 'Trong thư viện', icon: Layers },
      { label: 'Ngành và lĩnh vực', value: disciplinesCount, sub: 'Đa dạng', icon: Microscope },
      { label: 'Lượt tra cứu điểm báo', value: statsData.public_search || 0, sub: 'Cổng công khai', icon: BookOpen },
    ] : []),
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">Số liệu tổng quan</h1>
          <p className="text-xs text-slate-500 font-medium">Thống kê hoạt động của hệ thống theo quyền của bạn</p>
        </div>
      </div>

      {isUserAdmin && <OnlineUsersPresence currentUser={currentUser} />}
    </div>
  );
}
