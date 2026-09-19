import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  BookMarked, Plus, Trash2, Edit3, X, Save, FolderOpen, FileText,
  Bold, Italic, List, ListOrdered, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Link as LinkIcon, Undo, Redo
} from 'lucide-react';
import { EduSubject, EduAssignmentBankItem } from '../../types/edu';
import { UserAccount } from '../../types';
import { getSubjects, saveSubject, deleteSubject, getAssignmentBank, saveAssignmentBankItem, deleteAssignmentBankItem } from '../../lib/edu';
import { uploadImageToCloudinary } from '../../lib/upload';
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

export default function EduAssignmentBank({ currentUser }: { currentUser: UserAccount }) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();

  // Chỉ người tạo ra bài hoặc admin mới được sửa, xóa và bật chia sẻ công khai.
  const canEdit = (item?: { ownerId?: string } | null) =>
    !!item && (item.ownerId === currentUser?.id || currentUser?.role === 'admin');

  const [subjects, setSubjects] = useState<EduSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [items, setItems] = useState<EduAssignmentBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');

  const [viewingItem, setViewingItem] = useState<EduAssignmentBankItem | null>(null);
  const [editing, setEditing] = useState<Partial<EduAssignmentBankItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Nhập yêu cầu và hướng dẫn bài tập...' }),
    ],
    content: '',
  });

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
    setViewingItem(null);
    setEditing(null);
  }, [selectedSubjectId]);

  const reloadItems = () => {
    if (selectedSubjectId) getAssignmentBank(selectedSubjectId).then(setItems).catch(() => setItems([]));
  };

  const openEditor = (item: Partial<EduAssignmentBankItem>) => {
    setViewingItem(null);
    setEditing(item);
    editor?.commands.setContent(item.content || '');
  };

  // Môn học
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

  const startRenameSubject = (s: EduSubject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubjectId(s.id);
    setEditSubjectName(s.name);
  };

  const handleRenameSubject = async (s: EduSubject) => {
    const name = editSubjectName.trim();
    if (!name || name === s.name) { setEditingSubjectId(''); return; }
    try {
      const saved = await saveSubject({ id: s.id, name });
      setSubjects(prev => prev.map(x => x.id === s.id ? saved : x).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingSubjectId('');
      addNotification('Đã đổi tên môn', 'success');
    } catch {
      addNotification('Lỗi đổi tên môn', 'error');
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

  // Bài tập trong ngân hàng
  const handleSaveItem = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { addNotification('Vui lòng nhập tên bài tập', 'error'); return; }
    setSaving(true);
    try {
      await saveAssignmentBankItem({
        id: editing.id,
        subjectId: selectedSubjectId,
        title: editing.title,
        content: editor?.getHTML() || '',
        allowedFileTypes: editing.allowedFileTypes && editing.allowedFileTypes.length ? editing.allowedFileTypes : ['pdf'],
        ownerId: editing.ownerId,
        isPublic: editing.isPublic === true,
      });
      addNotification('Đã lưu bài tập vào ngân hàng', 'success');
      setEditing(null);
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
      if (viewingItem?.id === item.id) setViewingItem(null);
      addNotification('Đã xóa bài tập', 'success');
    } catch {
      addNotification('Lỗi xóa bài tập', 'error');
    }
  };

  // Bật tắt chia sẻ công khai ngay tại chi tiết, chỉ người tạo hoặc admin dùng được.
  const handleTogglePublic = async (item: EduAssignmentBankItem) => {
    const next = !item.isPublic;
    try {
      await saveAssignmentBankItem({
        id: item.id,
        subjectId: item.subjectId,
        title: item.title,
        content: item.content,
        allowedFileTypes: item.allowedFileTypes,
        ownerId: item.ownerId,
        isPublic: next,
      });
      const updated = { ...item, isPublic: next };
      setItems(prev => prev.map(x => (x.id === item.id ? updated : x)));
      if (viewingItem?.id === item.id) setViewingItem(updated);
      addNotification(next ? 'Đã bật chia sẻ công khai' : 'Đã tắt chia sẻ công khai', 'success');
    } catch {
      addNotification('Lỗi cập nhật chia sẻ', 'error');
    }
  };

  const toggleFormat = (id: string) => {
    setEditing(prev => {
      if (!prev) return prev;
      const cur = prev.allowedFileTypes || [];
      return { ...prev, allowedFileTypes: cur.includes(id) ? cur.filter(t => t !== id) : [...cur, id] };
    });
  };

  const handleInsertImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    if (!file.type.startsWith('image/')) { addNotification('Vui lòng chọn tệp ảnh.', 'error'); return; }
    setUploadingImage(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
        reader.readAsDataURL(file);
      });
      const url = await uploadImageToCloudinary(dataUrl);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      addNotification('Lỗi tải ảnh lên. Vui lòng thử lại.', 'error');
    } finally {
      setUploadingImage(false);
    }
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

  const tbBtn = (active: boolean) => `p-2 rounded-lg transition-all ${active ? 'bg-brand text-white' : 'hover:bg-slate-200 text-slate-500'}`;

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
              onClick={() => editingSubjectId !== s.id && setSelectedSubjectId(s.id)}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all group ${editingSubjectId === s.id ? '' : 'cursor-pointer'} ${selectedSubjectId === s.id ? 'bg-brand-light text-brand' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              {editingSubjectId === s.id ? (
                <input
                  type="text"
                  autoFocus
                  value={editSubjectName}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubject(s); if (e.key === 'Escape') setEditingSubjectId(''); }}
                  onBlur={() => handleRenameSubject(s)}
                  className="flex-1 bg-white border border-brand focus:outline-none rounded-lg px-2 py-1 text-[13px] font-bold text-slate-700"
                />
              ) : (
                <span className="text-[13px] font-bold truncate flex-1">{s.name}</span>
              )}
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={(e) => startRenameSubject(s, e)} className="p-1 text-slate-300 hover:text-brand opacity-0 group-hover:opacity-100 transition-all" title="Sửa tên môn"><Edit3 className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s); }} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all" title="Xóa môn"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank items column */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
        {editing ? (
          /* ===== Inline editor (không popup) ===== */
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wide">
                <Edit3 className="w-4 h-4 text-brand" /> {editing.id ? 'Sửa bài tập mẫu' : 'Thêm bài tập mẫu'}
              </div>
              <button onClick={() => setEditing(null)} className="p-2 text-slate-400 hover:text-slate-700 transition-all" title="Đóng"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Tên bài tập</label>
              <input
                type="text"
                value={editing.title || ''}
                onChange={e => setEditing({ ...editing, title: e.target.value })}
                placeholder="Ví dụ: Vẽ art work cơ bản"
                className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-sm font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Yêu cầu và hướng dẫn</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-2 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-1">
                  <button onClick={() => editor?.chain().focus().toggleBold().run()} className={tbBtn(!!editor?.isActive('bold'))}><Bold className="w-4 h-4" /></button>
                  <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={tbBtn(!!editor?.isActive('italic'))}><Italic className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
                  <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={tbBtn(!!editor?.isActive('heading', { level: 1 }))}><Heading1 className="w-4 h-4" /></button>
                  <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={tbBtn(!!editor?.isActive('heading', { level: 2 }))}><Heading2 className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
                  <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={tbBtn(!!editor?.isActive('bulletList'))}><List className="w-4 h-4" /></button>
                  <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={tbBtn(!!editor?.isActive('orderedList'))}><ListOrdered className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
                  <button onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={tbBtn(!!editor?.isActive({ textAlign: 'left' }))}><AlignLeft className="w-4 h-4" /></button>
                  <button onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={tbBtn(!!editor?.isActive({ textAlign: 'center' }))}><AlignCenter className="w-4 h-4" /></button>
                  <button onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={tbBtn(!!editor?.isActive({ textAlign: 'right' }))}><AlignRight className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
                  <label className={`p-2 rounded-lg text-slate-500 cursor-pointer flex items-center ${uploadingImage ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-200'}`} title="Tải ảnh lên">
                    <input type="file" accept="image/*" className="hidden" onChange={handleInsertImageFile} disabled={uploadingImage} />
                    <ImageIcon className="w-4 h-4" />
                  </label>
                  <button onClick={() => { const url = prompt('Nhập URL liên kết:'); if (url) editor?.chain().focus().setLink({ href: url }).run(); }} className={tbBtn(!!editor?.isActive('link'))}><LinkIcon className="w-4 h-4" /></button>
                  <div className="flex-1" />
                  <button onClick={() => editor?.chain().focus().undo().run()} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"><Undo className="w-4 h-4" /></button>
                  <button onClick={() => editor?.chain().focus().redo().run()} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"><Redo className="w-4 h-4" /></button>
                </div>
                <EditorContent editor={editor} className="prose prose-slate max-w-none text-sm p-4 min-h-[220px] max-h-[420px] overflow-y-auto focus:outline-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Định dạng nộp bài</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FORMAT_OPTIONS.map(f => {
                  const active = (editing.allowedFileTypes || []).includes(f.id);
                  return (
                    <button key={f.id} onClick={() => toggleFormat(f.id)} className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${active ? 'bg-brand-light text-brand border-brand' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-brand'}`}>
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editing.isPublic === true}
                onChange={e => setEditing({ ...editing, isPublic: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-brand"
              />
              <span className="min-w-0">
                <span className="block text-[12px] font-bold text-slate-700">Chia sẻ công khai cho mọi người</span>
                <span className="block text-[11px] text-slate-400 leading-snug">Bật thì tất cả người dùng đều thấy và dùng lại được bài này. Tắt thì chỉ mình bạn thấy.</span>
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all">Hủy</button>
              <button onClick={handleSaveItem} disabled={saving} className="flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide">
                <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu bài tập'}
              </button>
            </div>
          </div>
        ) : (
          /* ===== Danh sách + chi tiết ===== */
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wide">
                <BookMarked className="w-4 h-4 text-brand" /> Ngân hàng bài tập
              </div>
              {selectedSubjectId && (
                <button onClick={() => openEditor(emptyItem())} className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide">
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
                  <React.Fragment key={item.id}>
                  <button
                    onClick={() => setViewingItem(viewingItem?.id === item.id ? null : item)}
                    className={`w-full flex items-center gap-3 p-4 border rounded-2xl transition-all text-left ${viewingItem?.id === item.id ? 'border-brand bg-brand-light/50' : 'border-slate-200 hover:border-brand hover:bg-brand-light/40'}`}
                  >
                    <div className="w-10 h-10 bg-brand-light text-brand rounded-xl flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-slate-800 truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-400">{(item.allowedFileTypes || []).map(t => FORMAT_OPTIONS.find(f => f.id === t)?.label || t).join(', ')}</p>
                    </div>
                  </button>

                  {viewingItem?.id === item.id && (
              <div className="border border-brand/30 rounded-2xl overflow-hidden mt-2.5">
                <div className="px-5 py-4 bg-brand-light/40 border-b border-brand/20 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-black text-slate-900 tracking-tight truncate">{viewingItem.title}</h3>
                      {viewingItem.isPublic && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Công khai</span>
                      )}
                      {!canEdit(viewingItem) && (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Bài dùng chung</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{(viewingItem.allowedFileTypes || []).map(t => FORMAT_OPTIONS.find(f => f.id === t)?.label || t).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit(viewingItem) && (
                      <>
                        <button
                          onClick={() => handleTogglePublic(viewingItem)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border-2 ${viewingItem.isPublic ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-300'}`}
                          title="Bật hoặc tắt chia sẻ công khai bài này"
                        >
                          <span className={`w-8 h-4 rounded-full relative transition-colors ${viewingItem.isPublic ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${viewingItem.isPublic ? 'left-4' : 'left-0.5'}`} />
                          </span>
                          {viewingItem.isPublic ? 'Đang công khai' : 'Chia sẻ công khai'}
                        </button>
                        <button onClick={() => openEditor({ ...viewingItem })} className="flex items-center gap-2 border-2 border-brand text-brand hover:bg-brand-light px-4 py-2 rounded-xl text-[11px] font-bold transition-all">
                          <Edit3 className="w-4 h-4" /> Sửa
                        </button>
                        <button onClick={() => { const it = viewingItem; handleDeleteItem(it); }} className="flex items-center gap-2 border-2 border-rose-300 text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl text-[11px] font-bold transition-all">
                          <Trash2 className="w-4 h-4" /> Xóa
                        </button>
                      </>
                    )}
                    <button onClick={() => setViewingItem(null)} className="p-2 text-slate-400 hover:text-slate-700 transition-all" title="Đóng"><X className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="p-5">
                  {viewingItem.content && viewingItem.content.trim() ? (
                    <div className="prose prose-slate max-w-none text-[14px] text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: viewingItem.content }} />
                  ) : (
                    <p className="text-sm text-slate-400 italic">Bài tập này chưa có phần yêu cầu và hướng dẫn.</p>
                  )}
                </div>
              </div>
                  )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
