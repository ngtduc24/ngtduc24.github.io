import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  Search, 
  Calendar, 
  User, 
  DollarSign, 
  CheckCircle2, 
  ExternalLink, 
  Filter, 
  FileCheck,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { Task, UserAccount } from '../types';
import { isTaskRelevantToUser } from '../lib/tasks';

interface Props {
  tasks: Task[];
  users: UserAccount[];
  currentUser: UserAccount;
  onClose: () => void;
  onSelectTask?: (task: Task) => void;
}

export default function TaskCompletionReportModal({
  tasks,
  users,
  currentUser,
  onClose,
  onSelectTask,
}: Props) {
  const isAdmin = currentUser.role === 'admin';
  const printRef = useRef<HTMLDivElement>(null);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Lọc danh sách công việc hoàn thành theo phân quyền nghiêm ngặt
  const authorizedCompletedTasks = useMemo(() => {
    return tasks.filter(t => {
      // Chỉ lấy task đã hoàn thành và chưa bị xóa
      if (t.status !== 'Completed' || t.isDeleted) return false;

      // Phân quyền:
      // Admin: Xem được tất cả
      if (isAdmin) return true;

      // User: Chỉ xem được công việc của chính mình (được giao hoặc tự tạo)
      return isTaskRelevantToUser(t, currentUser);
    });
  }, [tasks, isAdmin, currentUser]);

  // Áp dụng bộ lọc người dùng chọn
  const filteredTasks = useMemo(() => {
    return authorizedCompletedTasks.filter(t => {
      // Lọc theo người nhận (Assignee) - chỉ Admin mới được dùng bộ lọc này
      if (isAdmin && selectedAssignee !== 'all') {
        const isMatch = t.assignedTo === selectedAssignee || 
                        (t.assignedTo && users.find(u => u.id === selectedAssignee)?.username === t.assignedTo);
        if (!isMatch) return false;
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = t.name.toLowerCase().includes(query);
        const matchDesc = (t.description || '').toLowerCase().includes(query);
        const matchSummary = (t.completionReport?.summary || '').toLowerCase().includes(query);
        const matchAssignee = (t.assignedToName || '').toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchSummary && !matchAssignee) return false;
      }

      // Lọc theo ngày hoàn thành
      if (dateRange !== 'all') {
        const completedDate = new Date(t.completionReport?.completedAt || t.deadline || t.createdAt || '');
        const now = new Date();
        if (dateRange === 'today') {
          const isToday = completedDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (completedDate < sevenDaysAgo) return false;
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (completedDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.completionReport?.completedAt || a.deadline || 0).getTime();
      const timeB = new Date(b.completionReport?.completedAt || b.deadline || 0).getTime();
      return timeB - timeA;
    });
  }, [authorizedCompletedTasks, isAdmin, selectedAssignee, searchTerm, dateRange, users]);

  // Thống kê số liệu
  const stats = useMemo(() => {
    const totalCount = filteredTasks.length;
    const totalIncome = filteredTasks.reduce((sum, t) => sum + (t.hasIncome && t.income ? t.income : 0), 0);
    const subtaskCompletedCount = filteredTasks.reduce((sum, t) => {
      return sum + (t.subtasks || []).filter(st => st.completed).length;
    }, 0);

    return { totalCount, totalIncome, subtaskCompletedCount };
  }, [filteredTasks]);

  // Xuất file PDF bằng cách in chuẩn A4
  const handlePrintPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép popup để xuất PDF.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Báo cáo công việc hoàn thành - ${new Date().toLocaleDateString('vi-VN')}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 12mm 15mm 12mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            color: #1e293b;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 11pt;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #059669;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 18pt;
            font-weight: 800;
            color: #065f46;
            margin: 0 0 4px 0;
            text-transform: uppercase;
          }
          .brand-subtitle {
            font-size: 10pt;
            color: #64748b;
            margin: 0;
          }
          .report-meta {
            text-align: right;
            font-size: 9pt;
            color: #475569;
          }
          .report-meta strong {
            color: #0f172a;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .stat-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            background-color: #f8fafc;
          }
          .stat-card .label {
            font-size: 8.5pt;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
          }
          .stat-card .value {
            font-size: 14pt;
            font-weight: 800;
            color: #047857;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 9.5pt;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            font-size: 8.5pt;
            text-transform: uppercase;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            vertical-align: top;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .task-name {
            font-weight: 700;
            color: #0f172a;
          }
          .task-report {
            font-size: 8.5pt;
            color: #475569;
            margin-top: 4px;
            white-space: pre-wrap;
            background: #ffffff;
            padding: 6px 8px;
            border-radius: 6px;
            border: 1px dashed #cbd5e1;
          }
          .link-item {
            font-size: 8pt;
            color: #2563eb;
            word-break: break-all;
            display: block;
            margin-top: 2px;
          }
          .signatures {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .sign-box {
            text-align: center;
            width: 200px;
          }
          .sign-title {
            font-weight: 700;
            font-size: 10pt;
            margin-bottom: 60px;
          }
          .sign-name {
            font-weight: 600;
            font-size: 9.5pt;
            border-top: 1px dotted #94a3b8;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">BÁO CÁO CÔNG VIỆC HOÀN THÀNH</h1>
            <p class="brand-subtitle">Hệ thống quản lý công việc & tiến độ dự án</p>
          </div>
          <div class="report-meta">
            <div>Ngày xuất: <strong>${new Date().toLocaleString('vi-VN')}</strong></div>
            <div>Người lập: <strong>${currentUser.fullName} (${currentUser.role.toUpperCase()})</strong></div>
            <div>Phạm vi: <strong>${isAdmin ? (selectedAssignee === 'all' ? 'Toàn bộ hệ thống' : users.find(u => u.id === selectedAssignee)?.fullName || 'Theo nhân viên') : 'Cá nhân'}</strong></div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Tổng task hoàn thành</div>
            <div class="value">${stats.totalCount}</div>
          </div>
          <div class="stat-card">
            <div class="label">Việc nhỏ (Subtask) xong</div>
            <div class="value">${stats.subtaskCompletedCount}</div>
          </div>
          ${isAdmin ? `
            <div class="stat-card">
              <div class="label">Tổng giá trị nghiệm thu</div>
              <div class="value">${stats.totalIncome.toLocaleString()} VNĐ</div>
            </div>
          ` : `
            <div class="stat-card">
              <div class="label">Tỷ lệ hoàn tất</div>
              <div class="value">100%</div>
            </div>
          `}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">STT</th>
              <th style="width: 25%;">Tên công việc</th>
              <th style="width: 15%;">Người thực hiện</th>
              <th style="width: 15%;">Thời gian xong</th>
              <th style="width: 40%;">Báo cáo hoàn thành & Nghiệm thu</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTasks.map((t, idx) => {
              const assigneeObj = users.find(u => u.id === t.assignedTo);
              const assigneeName = assigneeObj?.fullName || t.assignedToName || t.assignedTo || 'Chưa phân công';
              const reportText = t.completionReport?.summary || 'Đã hoàn thành công việc theo đúng quy trình.';
              const completedTime = t.completionReport?.completedAt 
                ? new Date(t.completionReport.completedAt).toLocaleString('vi-VN')
                : (t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : 'Đã hoàn tất');
              
              const deliverablesHtml = t.completionReport?.deliverables && t.completionReport.deliverables.length > 0
                ? `<div style="margin-top: 4px;"><strong>Link bàn giao:</strong>${t.completionReport.deliverables.map(l => `<span class="link-item">• ${l}</span>`).join('')}</div>`
                : '';

              return `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td>
                    <div class="task-name">${t.name}</div>
                    <div style="font-size: 8pt; color: #64748b;">Loại: ${t.tag || 'Mặc định'}</div>
                  </td>
                  <td>
                    <strong>${assigneeName}</strong>
                  </td>
                  <td>
                    <div style="font-size: 8.5pt;">${completedTime}</div>
                  </td>
                  <td>
                    <div class="task-report">${reportText}</div>
                    ${deliverablesHtml}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sign-box">
            <div class="sign-title">NGƯỜI LẬP BÁO CÁO</div>
            <div class="sign-name">${currentUser.fullName}</div>
          </div>
          <div class="sign-box">
            <div class="sign-title">QUẢN LÝ / BAN DUYỆT</div>
            <div class="sign-name">Ký và ghi rõ họ tên</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brand/20 text-brand px-2 py-0.5 rounded-full">
                  {isAdmin ? 'Quản trị viên toàn quyền' : 'Báo cáo cá nhân'}
                </span>
                <span className="text-xs text-slate-400">Xuất & Quản lý nghiệm thu</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Bảng Báo Cáo Công Việc Đã Hoàn Thành
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand text-white rounded-xl text-xs font-bold shadow-md shadow-brand-hover/30 transition-all cursor-pointer"
              title="Xuất bảng báo cáo ra file PDF hoặc máy in"
            >
              <Printer className="w-4 h-4" />
              <span>Xuất PDF / In báo cáo</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-100 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên task, người làm, nội dung báo cáo..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {/* Filter by Assignee (Only for Admin) */}
            {isAdmin ? (
              <div className="relative">
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="all">Tất cả nhân sự</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="px-3 py-2 bg-brand-light border border-brand-light rounded-xl text-xs text-brand-hover font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand shrink-0" />
                <span className="truncate">Cá nhân: {currentUser.fullName}</span>
              </div>
            )}

            {/* Date filter */}
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="all">Toàn bộ thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Task hoàn thành</span>
                <span className="text-xl font-extrabold text-slate-800">{stats.totalCount}</span>
              </div>
              <div className="p-2.5 bg-brand-light text-brand rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subtask đã xong</span>
                <span className="text-xl font-extrabold text-slate-800">{stats.subtaskCompletedCount}</span>
              </div>
              <div className="p-2.5 bg-brand-light text-brand rounded-xl">
                <FileText className="w-4 h-4" />
              </div>
            </div>

            {isAdmin && (
              <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between col-span-2 sm:col-span-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng giá trị</span>
                  <span className="text-xl font-extrabold text-brand">{stats.totalIncome.toLocaleString()} đ</span>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Table / List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4" ref={printRef}>
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-600">Không tìm thấy công việc hoàn thành nào</p>
              <p className="text-xs text-slate-400">
                {isAdmin 
                  ? 'Chưa có dữ liệu hoặc không khớp với bộ lọc hiện tại.' 
                  : 'Bạn chỉ có quyền xem các công việc do bạn thực hiện hoặc bạn giao.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200">
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] w-12 text-center">#</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Tên công việc & Phân loại</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Người thực hiện</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Ngày xong</th>
                    {isAdmin && (
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Giá trị</th>
                    )}
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Báo cáo hoàn thành</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((t, index) => {
                    const assignee = users.find(u => u.id === t.assignedTo);
                    const isExpanded = expandedTaskId === t.id;
                    const hasReport = Boolean(t.completionReport?.summary);

                    return (
                      <React.Fragment key={t.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 text-center text-slate-400 font-semibold">{index + 1}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 line-clamp-1">{t.name}</div>
                            <span className="text-[10px] text-slate-400 font-medium">{t.tag || 'Mặc định'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-brand-light text-brand-hover font-bold flex items-center justify-center text-[10px]">
                                {assignee?.fullName ? assignee.fullName.charAt(0) : (t.assignedToName ? t.assignedToName.charAt(0) : '?')}
                              </div>
                              <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                                {assignee?.fullName || t.assignedToName || 'Chưa giao'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {t.completionReport?.completedAt 
                              ? new Date(t.completionReport.completedAt).toLocaleDateString('vi-VN')
                              : (t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : 'Đã xong')}
                          </td>
                          {isAdmin && (
                            <td className="py-3.5 px-4 font-bold text-brand whitespace-nowrap">
                              {t.hasIncome && t.income ? `${t.income.toLocaleString()} đ` : '-'}
                            </td>
                          )}
                          <td className="py-3.5 px-4">
                            {hasReport ? (
                              <button
                                type="button"
                                onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                                className="flex items-center gap-1 text-[11px] font-bold text-brand-hover hover:text-brand-hover cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 text-brand" />
                                <span>{isExpanded ? 'Ẩn báo cáo' : 'Xem báo cáo'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Chưa có ghi chú</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {onSelectTask && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectTask(t);
                                  onClose();
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold text-brand bg-brand-light hover:bg-brand/20 rounded-lg transition-colors cursor-pointer"
                              >
                                Mở task
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Collapsible details for report */}
                        {isExpanded && t.completionReport && (
                          <tr className="bg-brand-light/30">
                            <td colSpan={isAdmin ? 7 : 6} className="p-4 border-t border-b border-brand-light">
                              <div className="bg-white rounded-xl p-4 border border-brand-light shadow-2xs space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                    <FileCheck className="w-4 h-4 text-brand" />
                                    <span>Nội dung nghiệm thu bàn giao:</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    Báo cáo bởi: <strong>{t.completionReport.completedByName}</strong> vào lúc {new Date(t.completionReport.completedAt).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                                  {t.completionReport.summary}
                                </div>

                                {t.completionReport.deliverables && t.completionReport.deliverables.length > 0 && (
                                  <div className="pt-2 border-t border-slate-100 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                      Tài liệu / Sản phẩm đính kèm:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {t.completionReport.deliverables.map((link, lIdx) => (
                                        <a
                                          key={lIdx}
                                          href={link}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-brand-light border border-slate-200 hover:border-brand rounded-lg text-xs text-brand-hover transition-colors"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          <span className="truncate max-w-xs">{link}</span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {isAdmin 
                ? 'Admin toàn quyền quản lý báo cáo của toàn bộ thành viên.' 
                : 'Bảo mật: Bạn chỉ xem được công việc hoàn thành của chính tài khoản của bạn.'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
