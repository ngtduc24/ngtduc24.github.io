import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Trash2, 
  CheckCircle, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  History, 
  FileCheck2, 
  ExternalLink, 
  Edit3, 
  Printer, 
  Lock, 
  Sparkles,
  Award
} from 'lucide-react';
import { Task, Subtask, UserAccount, TaskCompletionReport } from '../types';
import { saveTaskToSupabase, addTaskHistory, isTaskRelevantToUser } from '../lib/tasks';
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';
import TaskCompletionModal from './TaskCompletionModal';

interface Props {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
  currentUser: UserAccount;
  users?: UserAccount[];
}

export default function TaskDetailModal({ task, onClose, onUpdate, currentUser, users = [] }: Props) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [localTask, setLocalTask] = useState<Task>(task);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  
  // State quản lý modal nhập báo cáo hoàn thành
  const [completionModalConfig, setCompletionModalConfig] = useState<{
    isOpen: boolean;
    itemType: 'task' | 'subtask';
    title: string;
    subtask?: Subtask;
    initialReport?: TaskCompletionReport;
  } | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const hasAccess = isTaskRelevantToUser(task, currentUser);

  // Phân quyền: Người giao task (Creator), Người nhận task (Assignee), Admin toàn quyền
  const isAssignee = localTask.assignedTo === currentUser.id || 
                    (Boolean(localTask.assignedTo) && Boolean(currentUser.username) && localTask.assignedTo === currentUser.username);

  const isCreator = localTask.creatorId === currentUser.id || 
                    localTask.createdBy === currentUser.id || 
                    (Boolean(localTask.createdBy) && Boolean(currentUser.username) && localTask.createdBy === currentUser.username) ||
                    (Boolean(currentUser.fullName) && Boolean(localTask.createdByName) && localTask.createdByName === currentUser.fullName);

  // Chỉ Admin, Người giao việc và Người nhận việc mới được xem nội dung báo cáo hoàn thành
  const canViewCompletionReport = isAdmin || isAssignee || isCreator;

  // Công việc đã hoàn thành thì khóa lại. Không ai bấm hoàn thành hay sửa báo cáo được nữa,
  // báo cáo đã nộp chỉ còn để xem và xuất file.
  const isCompleted = localTask.status === 'Completed';
  const canModifyTask = (isAdmin || isAssignee || isCreator) && !isCompleted && localTask.status !== 'Cancelled';

  // Chỉ người nhận việc (hoặc người tự làm, hoặc admin) mới thấy nút hoàn thành và nộp báo cáo.
  // Người giao việc không thấy nút này.
  const canSubmitReport = canModifyTask && (isAssignee || isAdmin || (isCreator && !localTask.assignedTo));

  const creator = users.find(u => u.id === localTask.creatorId || u.id === localTask.createdBy);
  const assignee = users.find(u => u.id === localTask.assignedTo);

  const creatorName = creator ? `${creator.fullName} (@${creator.username})` : (localTask.createdByName || (localTask.creatorId ? `ID: ${localTask.creatorId}` : 'Hệ thống'));
  const assigneeName = assignee ? `${assignee.fullName} (@${assignee.username})` : (localTask.assignedToName || (localTask.assignedTo ? `ID: ${localTask.assignedTo}` : 'Chưa giao'));

  useEffect(() => {
    setLocalTask(task);
    setSubtasks(task.subtasks || []);
  }, [task]);

  if (!hasAccess) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-xl border border-slate-100">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 mx-auto flex items-center justify-center mb-4">
            <X className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Không có quyền truy cập</h3>
          <p className="text-sm text-slate-500 mb-6">Bạn không có quyền xem thông tin chi tiết của công việc này.</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // Xử lý khi bấm vào subtask
  const handleSubtaskAction = async (st: Subtask, action: 'toggle' | 'delete' | 'run' | 'pause') => {
    if (localTask.status === 'Cancelled') {
      addNotification("Công việc đã bị hủy, không thể thao tác với việc nhỏ.", "error");
      return;
    }
    if (!canModifyTask) {
      addNotification("Bạn không có quyền thực hiện thao tác này.", "error");
      return;
    }
    if (action === 'delete' && !isAdmin) {
      addNotification("Bạn không có quyền xóa việc nhỏ.", "error");
      return;
    }
    
    if (action === 'delete') {
      confirm("Xác nhận xóa", `Bạn có chắc chắn muốn xóa việc nhỏ: "${st.title}"?`, async () => {
        await executeSubtaskAction(st, action);
      });
      return;
    }

    // Khi người nhận việc/admin bấm hoàn thành subtask (từ chưa xong -> xong)
    if (action === 'toggle' && !st.completed) {
      setCompletionModalConfig({
        isOpen: true,
        itemType: 'subtask',
        title: st.title,
        subtask: st,
        initialReport: st.completionReport,
      });
      return;
    }
    
    await executeSubtaskAction(st, action);
  };
  
  const executeSubtaskAction = async (st: Subtask, action: 'toggle' | 'delete' | 'run' | 'pause') => {
    let updatedSubtasks = [...subtasks];
    const index = updatedSubtasks.findIndex(s => s.id === st.id);
    const now = new Date().toISOString();
    
    let historyAction = '';
    let historyDetails = '';

    if (action === 'toggle') {
      updatedSubtasks[index].completed = !updatedSubtasks[index].completed;
      updatedSubtasks[index].progress = updatedSubtasks[index].completed ? 100 : 0;
      updatedSubtasks[index].status = updatedSubtasks[index].completed ? 'Completed' : 'In Progress';
      
      const isCompletedNow = updatedSubtasks[index].completed;
      historyAction = isCompletedNow ? 'Hoàn thành việc nhỏ' : 'Bỏ hoàn thành việc nhỏ';
      historyDetails = isCompletedNow ? `Đã hoàn thành việc nhỏ: "${st.title}"` : `Đã chuyển việc nhỏ về chưa hoàn thành: "${st.title}"`;
      addNotification(`Đã ${isCompletedNow ? 'hoàn thành' : 'bỏ hoàn thành'} việc nhỏ: "${st.title}"`, "success");
    } else if (action === 'delete') {
      updatedSubtasks = updatedSubtasks.filter(s => s.id !== st.id);
      historyAction = 'Xóa việc nhỏ';
      historyDetails = `Đã xóa việc nhỏ: "${st.title}"`;
      addNotification(`Đã xóa việc nhỏ: "${st.title}"`, "success");
    } else if (action === 'pause') {
      updatedSubtasks[index].status = 'Paused';
      updatedSubtasks[index].lastPausedAt = now;
      historyAction = 'Tạm dừng việc nhỏ';
      historyDetails = `Đã tạm dừng việc nhỏ: "${st.title}"`;
      addNotification(`Đã tạm dừng việc nhỏ: "${st.title}"`, "success");
    } else if (action === 'run') {
      updatedSubtasks[index].status = 'In Progress';
      delete updatedSubtasks[index].lastPausedAt;
      historyAction = 'Chạy việc nhỏ';
      historyDetails = `Đã tiếp tục việc nhỏ: "${st.title}"`;
      addNotification(`Đã tiếp tục việc nhỏ: "${st.title}"`, "success");
    }
    
    let updatedTask: Task = { ...localTask, subtasks: updatedSubtasks };
    updatedTask = addTaskHistory(updatedTask, historyAction, currentUser.id, currentUser.fullName, historyDetails);

    try {
      await saveTaskToSupabase(updatedTask);
    } catch (err: any) {
      addNotification(err?.message || 'Không lưu được thay đổi lên máy chủ.', 'error');
      return;
    }
    setLocalTask(updatedTask);
    setSubtasks(updatedSubtasks);
    onUpdate();
  };

  // Lưu báo cáo hoàn thành sau khi người dùng điền form chuyên nghiệp
  const handleSaveCompletionReport = async (report: TaskCompletionReport) => {
    if (completionModalConfig?.itemType === 'subtask' && completionModalConfig.subtask) {
      const st = completionModalConfig.subtask;
      let updatedSubtasks = [...subtasks];
      const index = updatedSubtasks.findIndex(s => s.id === st.id);
      if (index !== -1) {
        report.subtaskId = st.id;
        report.subtaskTitle = st.title;
        updatedSubtasks[index].completed = true;
        updatedSubtasks[index].progress = 100;
        updatedSubtasks[index].status = 'Completed';
        updatedSubtasks[index].completionReport = report;

        let updatedTask: Task = { ...localTask, subtasks: updatedSubtasks };
        updatedTask = addTaskHistory(
          updatedTask, 
          'Hoàn thành việc nhỏ & Nộp báo cáo', 
          currentUser.id, 
          currentUser.fullName, 
          `Đã hoàn thành việc nhỏ "${st.title}" kèm báo cáo kết quả nghiệm thu.`
        );

        try {
          await saveTaskToSupabase(updatedTask);
        } catch (err: any) {
          addNotification(err?.message || 'Không lưu được báo cáo lên máy chủ.', 'error');
          return;
        }
        setLocalTask(updatedTask);
        setSubtasks(updatedSubtasks);
        onUpdate();
        addNotification(`Đã ghi nhận báo cáo hoàn thành việc nhỏ: "${st.title}"`, 'success');
      }
    } else {
      // Hoàn thành task lớn
      let updatedTask: Task = {
        ...localTask,
        status: 'Completed',
        progress: 100,
        completionReport: report,
      };

      updatedTask = addTaskHistory(
        updatedTask,
        'Hoàn thành công việc & Báo cáo kết quả',
        currentUser.id,
        currentUser.fullName,
        `Đã nộp báo cáo hoàn thành công việc.`
      );

      try {
        await saveTaskToSupabase(updatedTask);
      } catch (err: any) {
        addNotification(err?.message || 'Không lưu được báo cáo lên máy chủ. Công việc chưa được ghi nhận hoàn thành.', 'error');
        return;
      }
      setLocalTask(updatedTask);
      onUpdate();
      addNotification('Đã ghi nhận báo cáo nghiệm thu và hoàn thành công việc!', 'success');
    }
  };

  // In báo cáo riêng cho task này
  const handlePrintTaskReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép popup trình duyệt để in báo cáo.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Báo cáo nghiệm thu: ${localTask.name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; font-size: 11pt; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 16pt; font-weight: bold; color: #065f46; margin: 0 0 6px 0; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 10pt; }
          .section-title { font-size: 12pt; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 20px 0 10px 0; }
          .report-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 8px; white-space: pre-wrap; font-size: 10.5pt; }
          .deliverable { color: #2563eb; word-break: break-all; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .sign-col { text-align: center; width: 220px; }
          .sign-title { font-weight: bold; margin-bottom: 70px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">BÁO CÁO NGHIỆM THU CÔNG VIỆC</h1>
          <div style="font-size: 10pt; color: #64748b;">Hệ thống quản lý công việc Smart Research VN</div>
        </div>

        <div class="meta-grid">
          <div><strong>Tên công việc:</strong> ${localTask.name}</div>
          <div><strong>Hạn chót:</strong> ${new Date(localTask.deadline).toLocaleString('vi-VN')}</div>
          <div><strong>Người giao việc:</strong> ${creatorName}</div>
          <div><strong>Người thực hiện:</strong> ${assigneeName}</div>
          <div><strong>Trạng thái:</strong> ${localTask.status === 'Completed' ? 'ĐÃ HOÀN THÀNH' : localTask.status}</div>
          ${isAdmin && localTask.hasIncome ? `<div><strong>Giá trị thu nhập:</strong> ${localTask.income?.toLocaleString()} VNĐ</div>` : ''}
        </div>

        <div class="section-title">NỘI DUNG MÔ TẢ GIAO VIỆC</div>
        <p style="font-size: 10pt; color: #334155;">${localTask.description || 'Không có mô tả chi tiết.'}</p>

        ${localTask.completionReport ? `
          <div class="section-title">BÁO CÁO KẾT QUẢ HOÀN THÀNH & NGHIỆM THU</div>
          <div style="font-size: 9pt; color: #64748b; margin-bottom: 6px;">
            Báo cáo bởi: <strong>${localTask.completionReport.completedByName}</strong> vào ngày ${new Date(localTask.completionReport.completedAt).toLocaleString('vi-VN')}
          </div>
          <div class="report-box">${localTask.completionReport.summary}</div>
          ${localTask.completionReport.deliverables && localTask.completionReport.deliverables.length > 0 ? `
            <div style="margin-top: 10px;">
              <strong>Đường dẫn tài liệu / sản phẩm bàn giao:</strong>
              <ul>
                ${localTask.completionReport.deliverables.map(l => `<li class="deliverable">${l}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        ` : ''}

        <div class="signatures">
          <div class="sign-col">
            <div class="sign-title">NGƯỜI THỰC HIỆN</div>
            <div>${assigneeName}</div>
          </div>
          <div class="sign-col">
            <div class="sign-title">NGƯỜI GIAO VIỆC / DUYỆT</div>
            <div>${creatorName}</div>
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

  const sortedHistory = localTask.history ? [...localTask.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn"
        onClick={(e) => {
          // Bấm ra ngoài vùng modal thì đóng popup
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scaleUp">
          {localTask.coverImage && <img src={localTask.coverImage} alt="Cover" className="w-full h-40 object-cover" />}
          
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Header Title */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    localTask.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                    localTask.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    localTask.status === 'Paused' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {localTask.status === 'Completed' ? 'Đã hoàn thành' :
                     localTask.status === 'In Progress' ? 'Đang thực hiện' :
                     localTask.status === 'Paused' ? 'Tạm dừng' : localTask.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{localTask.tag || 'Mặc định'}</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{localTask.name}</h2>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Metadata Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                <Calendar className="w-4 h-4 text-brand shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">Hạn chót (Deadline)</span>
                  <span className="text-slate-700">{new Date(localTask.deadline).toLocaleString()}</span>
                </div>
              </div>
              {isAdmin && localTask.hasIncome && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-emerald-50/60 border border-emerald-100/60 rounded-xl px-3 py-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-emerald-600/80 block font-normal">Thu nhập (Income)</span>
                    <span className="text-emerald-700 font-bold">{localTask.income?.toLocaleString()} VNĐ</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                <User className="w-4 h-4 text-brand shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">Người phụ trách</span>
                  <span className="text-slate-700 font-bold">{assignee ? assignee.fullName : (localTask.assignedToName || localTask.assignedTo || 'Chưa giao')}</span>
                </div>
              </div>
            </div>

            {/* Task Owner & Personnel Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 pb-5">
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Người tạo công việc</span>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {creator?.fullName ? creator.fullName.charAt(0) : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate" title={creatorName}>{creator ? creator.fullName : (localTask.createdByName || 'Hệ thống / Admin')}</p>
                    <p className="text-[10px] text-slate-400 truncate">@{creator ? creator.username : 'admin'}</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Người nhận công việc (Assignee)</span>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {assignee?.fullName ? assignee.fullName.charAt(0) : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate" title={assigneeName}>{assignee ? assignee.fullName : (localTask.assignedToName || 'Chưa phân công')}</p>
                    <p className="text-[10px] text-slate-400 truncate">{assignee ? `@${assignee.username}` : 'Vui lòng chọn người nhận'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Công việc đã hoàn thành: chỉ hiện thông tin và nút xuất file, không còn nút thao tác */}
            {isCompleted && canViewCompletionReport && (
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Công việc đã được nghiệm thu hoàn tất</h4>
                    <p className="text-[11px] text-emerald-700">
                      {localTask.completionReport
                        ? `Hoàn thành bởi ${localTask.completionReport.completedByName} lúc ${new Date(localTask.completionReport.completedAt).toLocaleString('vi-VN')}. Báo cáo đã được lưu và chỉ chờ xuất file.`
                        : 'Báo cáo nghiệm thu đã được lưu trữ trong hệ thống.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePrintTaskReport}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="In hoặc xuất PDF báo cáo này"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Xuất PDF</span>
                </button>
              </div>
            )}

            {/* Người giao việc: chỉ theo dõi, không có nút hoàn thành và nút báo cáo */}
            {!isCompleted && !canSubmitReport && isCreator && localTask.status !== 'Cancelled' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Đang chờ người nhận thực hiện</h4>
                  <p className="text-[11px] text-slate-500">
                    {assignee ? `${assignee.fullName} sẽ bấm hoàn thành và nộp báo cáo nghiệm thu.` : 'Công việc chưa có người nhận.'}
                  </p>
                </div>
              </div>
            )}

            {/* Task Completion Action / Status Bar */}
            {canSubmitReport && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Trạng thái hoàn thành công việc</h4>
                    <p className="text-[11px] text-emerald-700">
                      Khi làm xong, hãy bấm Hoàn thành để mở trình soạn báo cáo nghiệm thu. Báo cáo chỉ nộp được 1 lần.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setCompletionModalConfig({
                      isOpen: true,
                      itemType: 'task',
                      title: localTask.name,
                      initialReport: localTask.completionReport,
                    })}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hoàn thành & Báo cáo kết quả</span>
                  </button>
                </div>
              </div>
            )}

            {/* BÁO CÁO HOÀN THÀNH CỦA TASK CHÍNH (Chỉ Admin, Người giao, Người nhận được xem) */}
            {canViewCompletionReport ? (
              localTask.completionReport && (
                <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
                      <FileCheck2 className="w-4 h-4 text-emerald-600" />
                      <span>Báo Cáo Nghiệm Thu & Kết Quả Hoàn Thành</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Thời điểm: <strong>{new Date(localTask.completionReport.completedAt).toLocaleString('vi-VN')}</strong>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs">
                    {localTask.completionReport.summary}
                  </div>

                  {localTask.completionReport.deliverables && localTask.completionReport.deliverables.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Đường dẫn sản phẩm & tài liệu bàn giao:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {localTask.completionReport.deliverables.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-xl text-xs font-semibold text-emerald-700 transition-colors shadow-2xs"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                            <span className="truncate max-w-xs">{link}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Thực hiện & Nghiệm thu bởi: <strong className="text-slate-700">{localTask.completionReport.completedByName}</strong></span>
                    <button
                      type="button"
                      onClick={handlePrintTaskReport}
                      className="text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" /> Xuất phiếu nghiệm thu PDF
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 text-slate-400 text-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Nội dung báo cáo hoàn thành được bảo mật (chỉ Người giao, Người nhận và Admin có quyền xem).</span>
              </div>
            )}

            {/* Mô tả chi tiết */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-xs mb-2 flex items-center gap-2 text-slate-700 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-brand" /> Mô tả công việc
              </h4>
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                {localTask.description || 'Không có mô tả chi tiết.'}
              </p>
            </div>
            
            {/* Danh sách việc nhỏ (Subtasks) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Danh sách việc nhỏ (Subtasks)</h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  Hoàn thành {subtasks.filter(s => s.completed).length}/{subtasks.length}
                </span>
              </div>

              {subtasks.length > 0 ? (
                subtasks.map(st => (
                  <div key={st.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className='flex-1 pr-4'>
                        <div className="flex items-center gap-2">
                          <h5 className={`font-bold text-xs ${st.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {st.title}
                          </h5>
                          {st.completed && (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                              Đã hoàn thành
                            </span>
                          )}
                        </div>
                        {st.description && <p className="text-[11px] text-slate-500 mt-0.5">{st.description}</p>}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style={{width: `${st.progress || 0}%`}}></div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {st.status === 'Paused' ? (
                          <button 
                            disabled={localTask.status === 'Completed' || localTask.status === 'Cancelled'} 
                            onClick={() => handleSubtaskAction(st, 'run')} 
                            className={localTask.status === 'Completed' || localTask.status === 'Cancelled' ? "text-slate-300 cursor-not-allowed p-1.5" : "text-brand hover:bg-white p-1.5 rounded-lg transition-colors cursor-pointer"}
                            title="Tiếp tục"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            disabled={localTask.status === 'Completed' || localTask.status === 'Cancelled' || st.completed} 
                            onClick={() => handleSubtaskAction(st, 'pause')} 
                            className={localTask.status === 'Completed' || localTask.status === 'Cancelled' || st.completed ? "text-slate-300 cursor-not-allowed p-1.5" : "text-slate-500 hover:bg-white p-1.5 rounded-lg transition-colors cursor-pointer"}
                            title="Tạm dừng"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}

                        {/* Nút checkmark hoàn thành subtask - Bấm sẽ hiện khung nhập báo cáo */}
                        <button 
                          disabled={localTask.status === 'Cancelled' || !canModifyTask} 
                          onClick={() => handleSubtaskAction(st, 'toggle')} 
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            st.completed 
                              ? "text-emerald-600 bg-emerald-100/70 hover:bg-emerald-200/80" 
                              : "text-slate-400 hover:text-emerald-600 hover:bg-white border border-slate-200"
                          }`}
                          title={st.completed ? "Bấm để đổi trạng thái" : "Bấm hoàn thành & nhập báo cáo"}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <button 
                            disabled={localTask.status === 'Completed' || localTask.status === 'Cancelled'} 
                            onClick={() => handleSubtaskAction(st, 'delete')} 
                            className={localTask.status === 'Completed' || localTask.status === 'Cancelled' ? "text-slate-300 cursor-not-allowed p-1.5" : "text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"}
                            title="Xóa subtask"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hiển thị báo cáo kết quả của subtask nếu có (chỉ người có quyền xem) */}
                    {canViewCompletionReport && st.completionReport && (
                      <div className="p-3 bg-white rounded-xl border border-emerald-100 text-[11px] space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-500 font-semibold border-b border-slate-100 pb-1">
                          <span className="flex items-center gap-1 text-emerald-800">
                            <Sparkles className="w-3 h-3 text-emerald-600" /> Báo cáo hoàn thành việc nhỏ:
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {st.completionReport.completedByName} • {new Date(st.completionReport.completedAt).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{st.completionReport.summary}</p>
                        {st.completionReport.deliverables && st.completionReport.deliverables.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {st.completionReport.deliverables.map((dLink, dIdx) => (
                              <a
                                key={dIdx}
                                href={dLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded text-[10px] text-emerald-700 transition-colors"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[180px]">{dLink}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">Không có việc nhỏ nào.</p>
              )}
            </div>

            {/* Lịch sử hoạt động */}
            <div className="pt-6 border-t border-slate-100">
              <h4 className="font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2 text-slate-700">
                <History className="w-4 h-4 text-slate-400" />
                Lịch sử hoạt động
              </h4>
              {sortedHistory.length > 0 ? (
                <div className="relative pl-6 border-l border-slate-200 ml-3 space-y-4 py-2">
                  {sortedHistory.map((entry, idx) => (
                    <div key={entry.id || idx} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[31px] top-1 bg-white border-2 border-brand rounded-full w-3.5 h-3.5 flex items-center justify-center">
                        <span className="bg-brand rounded-full w-1.5 h-1.5"></span>
                      </span>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-2xs">
                        <div className="flex justify-between items-start flex-wrap gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-800">{entry.action}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {entry.details && <p className="text-xs text-slate-600 mb-1 leading-relaxed">{entry.details}</p>}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Thực hiện bởi: <strong className="text-slate-700">{entry.userFullName}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Chưa ghi nhận hoạt động nào.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal nhập báo cáo hoàn thành chuyên nghiệp */}
      {completionModalConfig?.isOpen && (
        <TaskCompletionModal
          title={completionModalConfig.title}
          itemType={completionModalConfig.itemType}
          parentTaskName={localTask.name}
          initialReport={completionModalConfig.initialReport}
          currentUser={currentUser}
          onClose={() => setCompletionModalConfig(null)}
          onSubmit={handleSaveCompletionReport}
        />
      )}
    </>
  );
}
