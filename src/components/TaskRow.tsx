import React from 'react';
import { Play, Pause, CheckCircle, XCircle, MoreVertical, Briefcase, User, Book, Folder } from 'lucide-react';
import { Task, UserAccount } from '../types';

const tagIcons: Record<string, React.ReactNode> = {
  'Client': <Briefcase className="w-6 h-6" />,
  'Personal': <User className="w-6 h-6" />,
  'School': <Book className="w-6 h-6" />,
  'Work': <Folder className="w-6 h-6" />,
};

const getTagIcon = (tag: string) => tagIcons[tag] || <Folder className="w-6 h-6" />;

interface Props {
  key?: any;
  task: Task;
  users: UserAccount[];
  currentUser: UserAccount;
  progress: number;
  onAction: (task: Task, action: 'pause' | 'run' | 'complete' | 'delete' | 'cancel' | 'restore' | 'permanent_delete') => void;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  isOverdue: boolean;
  isWarning: boolean;
  isOpen: boolean;
  onToggleMenu: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function TaskRow({ task, users, currentUser, progress, onAction, onView, onEdit, isOverdue, isWarning, isOpen, onToggleMenu, isSelected, onToggleSelect }: Props) {
  let rowClass = 'border-slate-100 bg-white';
  if (isOverdue) rowClass = 'border-red-200 bg-red-50';
  else if (isWarning) rowClass = 'border-yellow-200 bg-yellow-50';
  else if (task.status === 'Cancelled') rowClass = 'border-slate-100 bg-slate-50';
  else if (task.isDeleted) rowClass = 'border-slate-200 bg-slate-100';

  const progressColor = isOverdue ? 'bg-red-500' : task.status === 'Cancelled' ? 'bg-red-500' : task.status === 'Paused' ? 'bg-yellow-500' : 'bg-emerald-500';

  const assignedUser = users?.find(u => u.id === task.assignedTo);
  const creatorUser = users?.find(u => u.id === task.creatorId);

  const isUserAdmin = currentUser?.role === 'admin';
  const isCreator = task.creatorId === currentUser?.id;
  const isAssigned = task.assignedTo === currentUser?.id;

  const canEdit = isUserAdmin || isCreator;
  const canDelete = isUserAdmin || !!currentUser?.canDeleteTask;
  const canPerformAction = isUserAdmin || isCreator || isAssigned;
  const canComplete = isAssigned || isCreator || isUserAdmin;

  return (
    <div className={`p-4 sm:p-5 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 transition-all ${rowClass}`}>
      <div className='flex items-start sm:items-center gap-3 sm:gap-4 w-full md:flex-1 min-w-0'>
        {onToggleSelect && (
          <div className="flex items-center shrink-0 pr-1">
            <input
              type="checkbox"
              id={`task-select-${task.id}`}
              checked={!!isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 rounded text-brand border-slate-300 focus:ring-brand cursor-pointer accent-brand"
            />
          </div>
        )}
        <div className={`p-2.5 sm:p-3 rounded-full shrink-0 ${task.status === 'Cancelled' ? 'bg-slate-100' : 'bg-brand/10'}`}>
          {getTagIcon(task.tag)}
        </div>
        <div className='cursor-pointer min-w-0 flex-1' onClick={() => !task.isDeleted && onView(task)}>
          <h3 className={`font-bold text-sm sm:text-base leading-snug break-words ${task.status === 'Cancelled' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{task.tag} • {task.status} {isOverdue && <span className="text-red-500 font-bold"> (Quá hạn)</span>} {isWarning && <span className="text-yellow-500 font-bold"> (Sắp đến hạn)</span>}</p>
          <p className="text-xs text-slate-400 mt-0.5">{new Date(task.deadline).toLocaleString()}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
             <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">Tạo bởi: {creatorUser?.fullName || 'Hệ thống'}</span>
             {assignedUser && <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-bold">Giao cho: {assignedUser.fullName}</span>}
          </div>
        </div>
      </div>

      <div className="w-full md:flex-1 md:max-w-xs">
        <div className="flex justify-between text-xs mb-1 font-bold">
          <span className="text-slate-400">Tiến độ</span>
          <span className="text-slate-800">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div className={`${progressColor} h-2 rounded-full transition-all duration-300`} style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      
      <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100/60">
        <span className="text-[11px] font-semibold text-slate-400 md:hidden">Thao tác nhanh:</span>
        <div className="flex items-center gap-2">
          {!task.isDeleted && task.status !== 'Completed' && task.status !== 'Cancelled' && canPerformAction && (
            <>
              {task.status === 'In Progress' && <button title="Tạm dừng" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors" onClick={() => onAction(task, 'pause')}><Pause className="w-4 h-4 text-slate-600"/></button>}
              {task.status === 'Paused' && <button title="Bắt đầu" className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors" onClick={() => onAction(task, 'run')}><Play className="w-4 h-4 text-slate-600"/></button>}
              {canComplete && <button title="Hoàn thành" className="p-2 rounded-full bg-emerald-50 hover:bg-emerald-100 transition-colors" onClick={() => onAction(task, 'complete')}><CheckCircle className="w-4 h-4 text-emerald-500"/></button>}
              {isUserAdmin && <button title="Hủy" className="p-2 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors" onClick={() => onAction(task, 'cancel')}><XCircle className="w-4 h-4 text-orange-500"/></button>}
            </>
          )}
          {task.isDeleted && (
            <div className="flex items-center gap-1.5">
              <button className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition-colors" onClick={() => onAction(task, 'restore')}>Khôi phục</button>
              {canDelete && (
                <button className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-colors" onClick={() => onAction(task, 'permanent_delete')}>Xóa vĩnh viễn</button>
              )}
            </div>
          )}
          <div className="relative">
            <button className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors" onClick={onToggleMenu}>
              <MoreVertical className="w-4 h-4 text-slate-600"/>
            </button>
            <div className={`absolute right-0 bottom-full md:bottom-auto md:top-full mb-2 md:mb-0 md:mt-2 w-32 bg-white rounded-xl shadow-lg border border-slate-100 ${isOpen ? 'block' : 'hidden'} z-10`}>
              {!task.isDeleted && canEdit && <button onClick={() => { onEdit(task); onToggleMenu(); }} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50">Sửa</button>}
              {!task.isDeleted && canDelete && <button title="Xoá" onClick={() => { onAction(task, 'delete'); onToggleMenu(); }} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50">Xoá</button>}
              {task.isDeleted && canDelete && <button title="Xóa vĩnh viễn" onClick={() => { onAction(task, 'permanent_delete'); onToggleMenu(); }} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50">Xóa vĩnh viễn</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
