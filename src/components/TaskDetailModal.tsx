import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Trash2, CheckCircle, Calendar, DollarSign, User, FileText, History } from 'lucide-react';
import { Task, Subtask, UserAccount } from '../types';
import { saveTaskToSupabase, addTaskHistory } from '../lib/tasks';
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';

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
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const isAdmin = currentUser?.role === 'admin';
  const isCreatorOrAssigned = isAdmin || task.assignedTo === currentUser?.id || task.creatorId === currentUser?.id;

  const creator = users.find(u => u.id === localTask.creatorId);
  const assignee = users.find(u => u.id === localTask.assignedTo);

  const creatorName = creator ? `${creator.fullName} (@${creator.username})` : (localTask.creatorId ? `ID: ${localTask.creatorId}` : 'Chưa rõ');
  const assigneeName = assignee ? `${assignee.fullName} (@${assignee.username})` : (localTask.assignedTo ? `ID: ${localTask.assignedTo}` : 'Chưa giao');

  useEffect(() => {
    setLocalTask(task);
    setSubtasks(task.subtasks || []);
  }, [task]);

  const handleSubtaskAction = async (st: Subtask, action: 'toggle' | 'delete' | 'run' | 'pause') => {
    if (localTask.status === 'Completed' || localTask.status === 'Cancelled') {
        addNotification("Công việc đã hoàn thành hoặc đã hủy, không thể thao tác với việc nhỏ.", "error");
        return;
    }
    if (!isCreatorOrAssigned) {
        addNotification("Bạn không có quyền thực hiện thao tác này.", "error");
        return;
    }
    if (action === 'delete' && !isAdmin) {
        addNotification("Bạn không có quyền xóa subtask.", "error");
        return;
    }
    
    if (action === 'delete') {
      confirm("Xác nhận xóa", "Bạn có chắc chắn muốn xóa subtask này không?", async () => {
          await executeSubtaskAction(st, action);
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

    await saveTaskToSupabase(updatedTask);
    setLocalTask(updatedTask);
    setSubtasks(updatedSubtasks);
    onUpdate();
  };

  const sortedHistory = localTask.history ? [...localTask.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {localTask.coverImage && <img src={localTask.coverImage} alt="Cover" className="w-full h-40 object-cover" />}
        <div className="p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">{localTask.name}</h2>
            <button onClick={onClose} className="text-slate-400"><X /></button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-brand shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-normal">Hạn chót (Deadline)</span>
                    <span className="text-slate-700">{new Date(localTask.deadline).toLocaleString()}</span>
                  </div>
                </div>
                {localTask.hasIncome && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-emerald-50/50 border border-emerald-100/40 rounded-xl px-3 py-2">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-emerald-600/70 block font-normal">Thu nhập (Income)</span>
                      <span className="text-emerald-700 font-bold">{localTask.income?.toLocaleString()} VNĐ</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  <User className="w-4 h-4 text-brand shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-normal">Người phụ trách</span>
                    <span className="text-slate-700 font-bold">{assignee ? assignee.fullName : (localTask.assignedTo || 'Chưa giao')}</span>
                  </div>
                </div>
            </div>

            {/* Task Owner & Personnel Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 border-b border-slate-100 pb-6">
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Người tạo công việc</span>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {creator?.fullName ? creator.fullName.charAt(0) : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate" title={creatorName}>{creator ? creator.fullName : 'Hệ thống / Admin'}</p>
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
                    <p className="text-xs font-bold text-slate-800 truncate" title={assigneeName}>{assignee ? assignee.fullName : 'Chưa phân công'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{assignee ? `@${assignee.username}` : 'Vui lòng chọn người nhận'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Mô tả</h4>
                <p className="text-sm text-slate-600">{localTask.description}</p>
            </div>
            
            <div className="space-y-4">
            <h4 className="font-bold text-sm">Danh sách việc nhỏ</h4>
            {subtasks.length > 0 ? (
              subtasks.map(st => (
                <div key={st.id} className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
                    <div className='flex-1'>
                    <h4 className="font-bold text-sm">{st.title}</h4>
                    <p className="text-xs text-slate-500 mb-2">{st.description}</p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full">
                        <div className="bg-brand h-1.5 rounded-full" style={{width: `${st.progress || 0}%`}}></div>
                    </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        {st.status === 'Paused' ? (
                            <button 
                                disabled={localTask.status === 'Completed' || localTask.status === 'Cancelled'} 
                                onClick={() => handleSubtaskAction(st, 'run')} 
                                className={localTask.status === 'Completed' || localTask.status === 'Cancelled' ? "text-slate-300 cursor-not-allowed" : "text-brand"}
                            >
                                <Play className="w-5 h-5" />
                            </button>
                        ) : (
                            <button 
                                disabled={localTask.status === 'Completed' || localTask.status === 'Cancelled'} 
                                onClick={() => handleSubtaskAction(st, 'pause')} 
                                className={localTask.status === 'Completed' || localTask.status === 'Cancelled' ? "text-slate-300 cursor-not-allowed" : "text-brand"}
                            >
                                <Pause className="w-5 h-5" />
                            </button>
                        )}
                        <button 
                            disabled={localTask.status === 'Completed' || localTask.status === 'Cancelled'} 
                            onClick={() => handleSubtaskAction(st, 'toggle')} 
                            className={localTask.status === 'Completed' || localTask.status === 'Cancelled' ? "text-slate-200 cursor-not-allowed" : (st.completed ? "text-emerald-500 font-bold" : "text-slate-300")}
                        >
                            <CheckCircle className="w-5 h-5" />
                        </button>
                        {isAdmin && (
                            <button 
                                disabled={localTask.status === 'Completed' || localTask.status === 'Cancelled'} 
                                onClick={() => handleSubtaskAction(st, 'delete')} 
                                className={localTask.status === 'Completed' || localTask.status === 'Cancelled' ? "text-slate-300 cursor-not-allowed opacity-50" : "text-red-500"}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Không có subtask nào.</p>
            )}
            </div>

            {/* Lịch sử hoạt động */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
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
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start flex-wrap gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-800">{entry.action}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {entry.details && <p className="text-xs text-slate-600 mb-1">{entry.details}</p>}
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
  );
}
