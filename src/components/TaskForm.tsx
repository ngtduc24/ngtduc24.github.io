import { uploadImageToCloudinary } from '../lib/upload';
import React, { useState } from 'react';
import { Plus, X, Upload, Trash2 } from 'lucide-react';
import { Task, Subtask, TaskTag, UserAccount, AppSettings } from '../types';
import { saveTaskToSupabase, addTaskHistory } from '../lib/tasks';
import { pushNotificationToSupabase } from '../lib/data';
import MediaSourcePicker from './MediaSourcePicker';

interface Props {
  onClose: () => void;
  onCreated: () => void;
  users: UserAccount[];
  settings: AppSettings;
  currentUser: UserAccount;
  taskToEdit?: Task;
  isInline?: boolean;
}

import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';

export default function TaskForm({ onClose, onCreated, users, settings, taskToEdit, currentUser, isInline = false }: Props) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [name, setName] = useState(taskToEdit?.name || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [tag, setTag] = useState<string>(taskToEdit?.tag || settings.taskTypes?.[0] || 'Work');
  const [deadlineDate, setDeadlineDate] = useState(taskToEdit ? new Date(taskToEdit.deadline).toISOString().split('T')[0] : '');
  const [deadlineTime, setDeadlineTime] = useState(taskToEdit ? new Date(taskToEdit.deadline).toTimeString().split(':').slice(0, 2).join(':') : '17:00');
  const [hasIncome, setHasIncome] = useState(taskToEdit?.hasIncome || false);
  const [income, setIncome] = useState<number>(taskToEdit?.income || 0);
  const [assignedTo, setAssignedTo] = useState(taskToEdit?.assignedTo || '');
  const [subtasks, setSubtasks] = useState<Subtask[]>(taskToEdit?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [fileNames, setFileNames] = useState<string[]>(taskToEdit?.fileNames || []);
  const [coverImage, setCoverImage] = useState<string | undefined>(taskToEdit?.coverImage);
  const isAdmin = currentUser?.role === 'admin';
  const isTaskInactive = taskToEdit?.status === 'Completed' || taskToEdit?.status === 'Cancelled';
  
  const handleCreate = async () => {
    if (!name || !deadlineDate) {
      addNotification("Vui lòng nhập tên công việc và hạn chót", "error");
      return;
    }
    
    const now = new Date();
    const dead = new Date(`${deadlineDate}T${deadlineTime}`);
    if (dead < now && !taskToEdit) {
      addNotification("Hạn chót phải sau thời điểm hiện tại", "error");
      return;
    }

    const isNew = !taskToEdit;
    let newTask: Task = {
      ...(taskToEdit || { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11), createdAt: now.toISOString(), status: 'In Progress', progress: 0, pauseDuration: 0, isDeleted: false }),
      name,
      description,
      tag,
      deadline: dead.toISOString(),
      hasIncome,
      income: hasIncome ? income : undefined,
      subtasks,
      fileNames,
      assignedTo: assignedTo || undefined,
      creatorId: taskToEdit?.creatorId || currentUser.id,
      coverImage: coverImage || settings.defaultCoverImage
    };
    
    if (isNew) {
      newTask = addTaskHistory(
        newTask,
        "Tạo công việc",
        currentUser.id,
        currentUser.fullName,
        `Tên công việc: "${name}", Loại: "${tag}", Hạn chót: ${dead.toLocaleString()}`
      );
    } else {
      newTask = addTaskHistory(
        newTask,
        "Cập nhật thông tin",
        currentUser.id,
        currentUser.fullName,
        `Cập nhật thông tin chung của công việc`
      );
    }
    
    await saveTaskToSupabase(newTask);

    // Gửi thông báo cho người được giao nhiệm vụ
    if (isNew && assignedTo && assignedTo !== currentUser.id) {
      try {
        await pushNotificationToSupabase({
          title: 'Nhiệm vụ mới được giao',
          description: `${currentUser.fullName} đã giao cho bạn nhiệm vụ: "${name}"`,
          type: 'task',
          targetAudience: 'custom_users',
          targetUserIds: [assignedTo],
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          metadata: { taskId: newTask.id }
        });
      } catch (err) {
        console.error("Lỗi khi gửi thông báo giao việc:", err);
      }
    }

    addNotification("✅ Task đã được lưu thành công!", "success");
    onCreated();
  };

    const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingImage(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const url = await uploadImageToCloudinary(reader.result as string);
          setCoverImage(url);
        } catch (error) {
          console.error(error);
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formContent = (
    <div className="space-y-6">
      <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
        <h3 className="font-bold text-xs flex items-center gap-2 text-slate-700 uppercase tracking-wider">Thông tin công việc</h3>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Thiết kế giao diện Dashboard..." className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs bg-white" />
        <label className="text-xs font-bold text-slate-500">Loại công việc</label>
        <select value={tag} onChange={(e) => setTag(e.target.value)} className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs bg-white">
            {(settings.taskTypes || ['Work', 'Client', 'School', 'Personal']).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="text-xs font-bold text-slate-500">Giao cho nhân viên</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={!currentUser.canAssignTask && currentUser.role !== 'admin'} className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs bg-white">
          <option value="">{currentUser.canAssignTask || currentUser.role === 'admin' ? "Chưa giao" : "Chỉ mình bạn"}</option>
          {currentUser.canAssignTask || currentUser.role === 'admin' ? (
            users.filter(u => (u.role === 'admin' || u.canReceiveTask || (u.permissions || []).includes('tasks'))).map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)
          ) : (
            <option value={currentUser.id}>{currentUser.fullName}</option>
          )}
        </select>
        <div className="flex gap-2">
          <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className="flex-1 px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs bg-white" />
          <input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} className="flex-1 px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs bg-white" />
        </div>
        <label className="text-xs font-bold text-slate-500">Ảnh bìa</label>
        <MediaSourcePicker onSelect={setCoverImage} accept="image/*" resourceType="image" folder="tasks/covers" category="Ảnh dự án & công việc" label="Chọn ảnh bìa" disabled={isUploadingImage} />{isUploadingImage && <p className="text-xs text-brand mt-1">Đang tải ảnh lên Cloudinary...</p>}
        {coverImage && <img src={coverImage} alt="Cover" className="w-20 h-20 object-cover rounded-lg mt-2 border border-slate-200" />}
      </div>

      <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
        <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Subtasks</h3>
        {subtasks.map(s => (
            <div key={s.id} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                <span className="font-medium text-slate-700">{s.title}</span>
                {isAdmin && !isTaskInactive && (
                  <button onClick={() => confirm("Xác nhận xóa", "Bạn có chắc chắn muốn xóa subtask này không?", () => { setSubtasks(subtasks.filter(st => st.id !== s.id)); addNotification("Đã xóa subtask thành công!", "success"); })} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4"/></button>
                )}
            </div>
        ))}
        <div className="flex gap-2">
            <input 
              type="text" 
              value={newSubtaskTitle} 
              onChange={(e) => setNewSubtaskTitle(e.target.value)} 
              disabled={isTaskInactive}
              placeholder={isTaskInactive ? "Không thể thêm subtask khi task đã hoàn thành/hủy" : "Tên subtask"} 
              className="flex-1 px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs bg-white disabled:bg-slate-100 disabled:cursor-not-allowed" 
            />
            <button 
              disabled={isTaskInactive}
              onClick={() => {
                if (newSubtaskTitle) {
                    setSubtasks([...subtasks, { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11), title: newSubtaskTitle, description: '', progress: 0, pauseDuration: 0 }]);
                    setNewSubtaskTitle('');
                }
              }} 
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-xl transition-colors flex items-center justify-center"
            >
              <Plus className="w-4 h-4"/>
            </button>
        </div>
      </div>

      <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
        <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Mô tả công việc</h3>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs bg-white" rows={4} placeholder="Nhập mô tả công việc..." />
      </div>

      <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
        <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Thu nhập</h3>
        <div className="flex gap-4 text-xs font-semibold text-slate-600">
          <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={!hasIncome} onChange={() => setHasIncome(false)} className="accent-emerald-600" /> Không</label>
          <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={hasIncome} onChange={() => setHasIncome(true)} className="accent-emerald-600" /> Có</label>
        </div>
        {hasIncome && <input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-xs bg-white" placeholder="Số tiền VNĐ" />}
      </div>

      <div className="flex justify-end gap-2 mt-6 border-t border-slate-100 pt-4">
        {onClose && (
          <button onClick={onClose} className="px-4 py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs rounded-xl transition-all">Hủy bỏ</button>
        )}
        <button onClick={handleCreate} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all">{taskToEdit ? 'Lưu thay đổi' : 'Tạo Task Mới'}</button>
      </div>
    </div>
  );

  if (isInline) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>{taskToEdit ? 'Sửa thông tin công việc' : 'Thêm công việc mới'}</span>
          </h2>
          {onClose && (
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl transition-all">Quay lại</button>
          )}
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-800">{taskToEdit ? 'Sửa công việc' : 'Tạo công việc mới'}</h2>
          <button onClick={onClose} className="text-slate-400 font-bold text-xs hover:text-slate-600">Quay lại</button>
        </div>
        {formContent}
      </div>
    </div>
  );
}
