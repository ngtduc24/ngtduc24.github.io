import React, { useEffect, useState } from 'react';
import { BookMarked, Plus, Trash2, Edit3, X, Save, FolderOpen, FileText } from 'lucide-react';
import { EduSubject, EduAssignmentBankItem } from '../../types/edu';
import { getSubjects, saveSubject, deleteSubject, getAssignmentBank, saveAssignmentBankItem, deleteAssignmentBankItem } from '../../lib/edu';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';

const FORMAT_OPTIONS = [
  { id: 'pdf', label: 'PDF' },
  { id: 'link', label: 'Link' },
  { id: 'image', label: 'Hình ảnh' },
  { id: 'video', label: 'Video' },
  { id: 'doc', label: 'Văn bản (Word)' },
  { id: '3d', label: 'Mô hình 3D' },
  { id: 'text', label: 'Nhập văn bản' },
];

const emptyItem = (): Partial<EduAssignmentBankItem> => ({ title: '', content: '', allowedFileTypes: ['pdf'] });

export default function EduAssignmentBank() {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();

  const [subjects, setSubjects] = useState<EduSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [items, setItems] = useState<EduAssignmentBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingItem, setEditingItem] = useState<Partial<EduAssignmentBankItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSubjects = async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
      setTablesMissing(false);
      if (!selectedSubjectId && data.length > 0) setSelectedSubjectId(data[0].id);
    } catch {
      setTablesMissing(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubjects(); }, []);

  useEffect(() => {
    if (!selectedSubjectId) { setItems([]); return; }
    getAssignmentBank(selectedSubjectId).then(setItems).catch(() => setItems([]));
  }, [selectedSubjectId]);

  const reloadItems = () => {
    if (selectedSubjectId) getAssignmentBank(selectedSubjectId).then(setItems).catch(() => setItems([]));
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const saved = await saveSubject({ name: newSubjectName.trim() });
      setSubjects(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedSubjectId(saved.id);
      setNewSubjectName('');
      addNotification('Đã thêm môn học', 'success');
    } catch {
      addNotification('Lỗi thêm môn. Kiểm tra bảng ngân hàng trên Supabase.', 'error');
    }
  };

  const handleDeleteSubject = async (s: EduSubject) => {
    const ok = await confirm({ title: 'Xóa môn học', message: `Xóa môn "${s.name}"? Các bài tập trong ngân hàng của môn này cũng sẽ bị xóa.`, confirmText: 'Xóa' });
    if (!ok) return;
    try {
      await deleteSubject(s.id);
      setSubjects(prev => prev.filter(x => x.id !== s.id));
      if (selectedSubjectId === s.id) setSelectedSubjectId('');
      addNotification('Đã xóa môn học', 'success');
    } catch {
      addNotification('Lỗi xóa môn học', 'error');
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;
    if (!editingItem.title?.trim()) { addNotification('Vui lòng nhập tên bài tập', 'error'); return; }
    setSaving(true);
    try {
      await saveAssignmentBankItem({
        id: editingItem.id,
        subjectId: selectedSubjectId,
        title: editingItem.title,
        content: editingItem.content,
        allowedFileTypes: editingItem.allowedFileTypes && editingItem.allowedFileTypes.length ? editingItem.allowedFileTypes : ['pdf'],
      });
      addNotification('Đã lưu bài tập vào ngân hàng', 'success');
      setEditingItem(null);
      reloadItems();
    } catch {
      addNotification('Lỗi lưu bài tập', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item: EduAssignmentBankItem) => {
    const ok = await confirm({ title: 'Xóa bài tập', message: `Xóa bài tập "${item.title}" khỏi ngân hàng?`, confirmText: 'Xóa' });
    if (!ok) return;
    try {
      await deleteAssignmentBankItem(item.id);
      setItems(prev => prev.filter(x => x.id !== item.id));
      addNotification('Đã xóa bài tập', 'success');
    } catch {
      addNotification('Lỗi xóa bài tập', 'error');
    }
  };

  const toggleFormat = (id: string) => {
    setEditingItem(prev => {
      if (!prev) return prev;
      const cur = prev.allowedFileTypes || [];
      return { ...prev, allowedFileTypes: cur.includes(id) ? cur.filter(t => t !== id) : [...cur, id] };
    });
  };

  if (loading) return <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center text-slate-400">Đang tải...</div>;

  if (tablesMissing) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center space-y-3">
        <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-600">Ngân hàng bài tập chưa sẵn sàng.</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">Cần chạy file EDU_ASSIGNMENT_BANK.sql trên Supabase để tạo 2 bảng edu_subjects và edu_assignment_bank, sau đó tải lại trang.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Subjects column */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wide">
          <FolderOpen className="w-4 h-4 text-brand" /> Môn học
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSubjectName}
            onChange={e => setNewSubjectName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
            placeholder="Tên môn mới"
            className="flex-1 bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-3 py-2 text-xs"
          />
          <button onClick={handleAddSubject} className="bg-brand hover:bg-brand-hover text-white p-2 rounded-xl shrink-0"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="space-y-1.5">
          {subjects.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Chưa có môn nào. Thêm môn để bắt đầu.</p>}
          {subjects.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${selectedSubjectId === s.id ? 'bg-brand-light text-brand' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              <span className="text-[13px] font-bold truncate">{s.name}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s); }} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Bank items column */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wide">
            <BookMarked className="w-4 h-4 text-brand" /> Ngân hàng bài tập
          </div>
          {selectedSubjectId && (
            <button onClick={() => setEditingItem(emptyItem())} className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide">
              <Plus className="w-4 h-4" /> Thêm bài tập
            </button>
          )}
        </div>

        {!selectedSubjectId ? (
          <p className="text-xs text-slate-400 italic text-center py-10">Chọn một môn ở cột bên trái để xem và thêm bài tập.</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-10">Môn này chưa có bài tập mẫu nào. Bấm Thêm bài tập để tạo.</p>
        ) : (
          <div className="space-y-2.5">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-4 border border-slate-200 rounded-2xl hover:border-brand transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-brand-light text-brand rounded-xl flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-slate-800 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400">{(item.allowedFileTypes || []).map(t => FORMAT_OPTIONS.find(f => f.id === t)?.label || t).join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditingItem({ ...item })} className="p-2 text-slate-400 hover:text-brand transition-all"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteItem(item)} className="p-2 text-slate-400 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item editor modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{editingItem.id ? 'Sửa bài tập mẫu' : 'Thêm bài tập mẫu'}</h3>
              <button onClick={() => setEditingItem(null)} className="p-2 bg-slate-100 text-slate-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Tên bài tập</label>
                <input
                  type="text"
                  value={editingItem.title || ''}
                  onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="Ví dụ: Vẽ art work cơ bản"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-sm font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Yêu cầu và hướng dẫn</label>
                <textarea
                  value={editingItem.content || ''}
                  onChange={e => setEditingItem({ ...editingItem, content: e.target.value })}
                  rows={6}
                  placeholder="Mô tả yêu cầu bài tập..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-4 py-3 text-sm leading-relaxed resize-y"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Định dạng nộp bài</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FORMAT_OPTIONS.map(f => {
                    const active = (editingItem.allowedFileTypes || []).includes(f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggleFormat(f.id)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${active ? 'bg-brand-light text-brand border-brand' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-brand'}`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end">
              <button onClick={handleSaveItem} disabled={saving} className="flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide">
                <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu bài tập'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
