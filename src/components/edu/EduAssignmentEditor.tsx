
import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Heading1, 
  Heading2, 
  Undo, 
  Redo,
  Save,
  Calendar,
  Settings,
  FileText,
  Link2,
  Video,
  FileDigit,
  Type,
  Box,
  ChevronDown
} from 'lucide-react';
import { EduAssignment, EduGradeColumn } from '../../types/edu';
import { getGradeColumns, saveAssignment, getAssignments, getSubjects, saveSubject, getAssignmentBank, saveAssignmentBankItem } from '../../lib/edu';
import { EduSubject, EduAssignmentBankItem } from '../../types/edu';
import { useNotifications } from '../NotificationContext';
import { uploadImageToCloudinary } from '../../lib/upload';
import MediaSourcePicker from '../MediaSourcePicker';

interface EduAssignmentEditorProps {
  classId: string;
  assignmentId: string | null;
  onSuccess: () => void;
}

const FILE_TYPES = [
  { id: 'pdf', label: 'PDF', icon: FileText },
  { id: 'link', label: 'Link', icon: Link2 },
  { id: 'image', label: 'Hình ảnh', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'doc', label: 'Văn bản (Word)', icon: FileDigit },
  { id: '3d', label: 'Mô hình 3D (FBX/OBJ)', icon: Box },
  { id: 'text', label: 'Nhập văn bản', icon: Type },
];

export default function EduAssignmentEditor({ classId, assignmentId, onSuccess }: EduAssignmentEditorProps) {
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<EduGradeColumn[]>([]);
  const [title, setTitle] = useState('');
  const [gradeColumnId, setGradeColumnId] = useState('');
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['pdf']);
  const [deadline, setDeadline] = useState('');
  const [allowLate, setAllowLate] = useState(false);
  const [allowSupplement, setAllowSupplement] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Ngân hàng bài tập theo môn
  const [subjects, setSubjects] = useState<EduSubject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [bankItems, setBankItems] = useState<EduAssignmentBankItem[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [saveToBank, setSaveToBank] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const { addNotification } = useNotifications();

  // Tải ảnh trực tiếp lên thư viện ảnh hệ thống (Cloudinary) rồi chèn vào nội dung,
  // thay cho việc nhập URL ảnh thủ công qua hộp thoại.
  const handleInsertImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    if (!file.type.startsWith('image/')) {
      addNotification('Vui lòng chọn tệp ảnh.', 'error');
      return;
    }
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
        reader.readAsDataURL(file);
      });
      const url = await uploadImageToCloudinary(dataUrl);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error(err);
      addNotification('Lỗi tải ảnh lên. Vui lòng thử lại.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Nhập nội dung bài tập tại đây...' }),
    ],
    content: '',
  });

  // Nạp danh sách môn học (bỏ qua nếu bảng chưa tạo).
  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, []);

  // Nạp bài tập trong ngân hàng theo môn đang chọn.
  useEffect(() => {
    if (!subjectId) { setBankItems([]); return; }
    getAssignmentBank(subjectId).then(setBankItems).catch(() => setBankItems([]));
  }, [subjectId]);

  const applyBankItem = (bankId: string) => {
    setSelectedBankId(bankId);
    if (bankId) setSaveToBank(false);
    const item = bankItems.find(b => b.id === bankId);
    if (!item) return;
    setTitle(item.title);
    setAllowedTypes(item.allowedFileTypes || ['pdf']);
    editor?.commands.setContent(item.content || '');
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const saved = await saveSubject({ name: newSubjectName.trim() });
      setSubjects(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setSubjectId(saved.id);
      setNewSubjectName('');
      setAddingSubject(false);
      addNotification('Đã thêm môn học', 'success');
    } catch (err) {
      console.error(err);
      addNotification('Lỗi thêm môn. Có thể bảng ngân hàng chưa được tạo trên Supabase.', 'error');
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [columnsData, assignmentsData] = await Promise.all([
          getGradeColumns(classId),
          getAssignments(classId)
        ]);

        const usedColumnIds = assignmentsData
          .filter(a => a.id !== assignmentId)
          .map(a => a.gradeColumnId)
          .filter(Boolean);

        const filteredColumns = columnsData.filter(col => !usedColumnIds.includes(col.id));
        setColumns(filteredColumns);

        if (assignmentId) {
          const assignment = assignmentsData.find(a => a.id === assignmentId);
          if (assignment) {
            setTitle(assignment.title);
            setGradeColumnId(assignment.gradeColumnId || '');
            setSubjectId(assignment.subjectId || '');
            setAllowedTypes(assignment.allowedFileTypes || []);
            setDeadline(assignment.deadline ? assignment.deadline.slice(0, 16) : '');
            setAllowLate(!!assignment.allowLate);
            setAllowSupplement(assignment.allowSupplement !== false);
            editor?.commands.setContent(assignment.content || '');
          }
        } else if (filteredColumns.length > 0) {
          setGradeColumnId(filteredColumns[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [classId, assignmentId, editor]);

  const handleSave = async () => {
    if (!title.trim()) {
      addNotification("Vui lòng nhập tên bài tập", "error");
      return;
    }
    if (!gradeColumnId) {
      addNotification("Vui lòng chọn cột điểm để chấm", "error");
      return;
    }

    setLoading(true);
    try {
      await saveAssignment({
        id: assignmentId || undefined,
        classId,
        gradeColumnId,
        subjectId: subjectId || undefined,
        bankId: selectedBankId || undefined,
        title,
        content: editor?.getHTML(),
        allowedFileTypes: allowedTypes,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        allowLate,
        allowSupplement,
      });

      // Tùy chọn lưu bài này vào ngân hàng để tái dùng cho lớp khác.
      if (saveToBank) {
        try {
          await saveAssignmentBankItem({
            subjectId: subjectId || undefined,
            title,
            content: editor?.getHTML(),
            allowedFileTypes: allowedTypes,
          });
        } catch (bankErr) {
          console.error(bankErr);
          addNotification('Đã lưu bài tập, nhưng lưu vào ngân hàng thất bại (kiểm tra bảng ngân hàng trên Supabase).', 'warning');
        }
      }

      addNotification("Đã lưu bài tập thành công", "success");
      onSuccess();
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi lưu bài tập", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (id: string) => {
    setAllowedTypes(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      {/* Editor Side */}
      <div className="lg:col-span-2 space-y-4">
        {/* Khung tiêu đề riêng */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tiêu đề bài tập</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Nhập tên tiêu đề bài tập..."
            className="w-full text-xl font-black text-slate-900 border-none focus:ring-0 outline-none placeholder:text-slate-300"
          />
        </div>

        {/* Khung nội dung soạn thảo riêng */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[520px]">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-1">
            <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded-lg transition-all ${editor?.isActive('bold') ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><Bold className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg transition-all ${editor?.isActive('italic') ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><Italic className="w-4 h-4" /></button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded-lg transition-all ${editor?.isActive('heading', { level: 1 }) ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><Heading1 className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded-lg transition-all ${editor?.isActive('heading', { level: 2 }) ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><Heading2 className="w-4 h-4" /></button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg transition-all ${editor?.isActive('bulletList') ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><List className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-lg transition-all ${editor?.isActive('orderedList') ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><ListOrdered className="w-4 h-4" /></button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={`p-2 rounded-lg transition-all ${editor?.isActive({ textAlign: 'left' }) ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><AlignLeft className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={`p-2 rounded-lg transition-all ${editor?.isActive({ textAlign: 'center' }) ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><AlignCenter className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={`p-2 rounded-lg transition-all ${editor?.isActive({ textAlign: 'right' }) ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><AlignRight className="w-4 h-4" /></button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            <MediaSourcePicker
              onSelect={(url) => editor?.chain().focus().setImage({ src: url }).run()}
              accept="image/*"
              resourceType="image"
              folder="edu-assignments"
              icon={ImageIcon}
              label=""
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 flex items-center"
            />
            <button onClick={() => {
              const url = prompt('Nhập URL liên kết:');
              if (url) editor?.chain().focus().setLink({ href: url }).run();
            }} className={`p-2 rounded-lg transition-all ${editor?.isActive('link') ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><LinkIcon className="w-4 h-4" /></button>
            <div className="flex-1" />
            <button onClick={() => editor?.chain().focus().undo().run()} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"><Undo className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().redo().run()} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"><Redo className="w-4 h-4" /></button>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
            <EditorContent editor={editor} className="prose prose-slate max-w-none min-h-[400px] text-sm focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Config Side */}
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-wider">
            <Settings className="w-4 h-4 text-brand" />
            <span>Cấu hình bài tập</span>
          </div>

          <div className="space-y-4">
            {/* Môn học */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Môn học</label>
              <div className="relative">
                <select
                  value={subjectId}
                  onChange={e => { setSubjectId(e.target.value); setSelectedBankId(''); }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-xs font-bold transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Không thuộc môn nào --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
              {addingSubject ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                    placeholder="Tên môn mới"
                    className="flex-1 bg-white border border-slate-200 focus:border-brand focus:outline-none rounded-lg px-3 py-1.5 text-xs"
                  />
                  <button onClick={handleAddSubject} className="bg-brand text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">Thêm</button>
                  <button onClick={() => { setAddingSubject(false); setNewSubjectName(''); }} className="text-slate-400 text-[11px] font-bold px-1">Hủy</button>
                </div>
              ) : (
                <button onClick={() => setAddingSubject(true)} className="text-brand text-[11px] font-bold hover:underline">+ Thêm môn mới</button>
              )}
            </div>

            {/* Chọn từ ngân hàng bài tập theo môn */}
            {subjectId && bankItems.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Chọn từ ngân hàng bài tập</label>
                <div className="relative">
                  <select
                    value={selectedBankId}
                    onChange={e => applyBankItem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-xs font-bold transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- Tạo mới hoặc chọn bài mẫu --</option>
                    {bankItems.map(b => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400">Chọn một bài mẫu để tự điền tiêu đề, nội dung và định dạng cho lớp này.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Cột điểm đích</label>
              <div className="relative">
                <select
                  value={gradeColumnId}
                  onChange={e => setGradeColumnId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-xs font-bold transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Chọn cột điểm --</option>
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Thời hạn nộp bài</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="datetime-local" 
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold transition-all"
                />
              </div>
              <button type="button" onClick={() => setAllowLate(v => !v)} className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-brand/30">
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-700">Cho phép nộp trễ</span>
                  <span className="block text-[10px] text-slate-400">{allowLate ? 'Sinh viên vẫn nộp được sau khi hết hạn' : 'Hết hạn là khóa, không cho nộp'}</span>
                </span>
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${allowLate ? 'bg-brand' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${allowLate ? 'left-[22px]' : 'left-0.5'}`} /></span>
              </button>
              <button type="button" onClick={() => setAllowSupplement(v => !v)} className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-brand/30">
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-700">Cho phép nộp bổ sung</span>
                  <span className="block text-[10px] text-slate-400">{allowSupplement ? 'Sau khi nộp, sinh viên được nộp thêm file' : 'Nộp một lần, không cho nộp thêm'}</span>
                </span>
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${allowSupplement ? 'bg-brand' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${allowSupplement ? 'left-[22px]' : 'left-0.5'}`} /></span>
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Định dạng nộp bài</label>
              <div className="grid grid-cols-2 gap-2">
                {FILE_TYPES.map(type => (
                  <button 
                    key={type.id}
                    onClick={() => toggleType(type.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${
                      allowedTypes.includes(type.id) 
                        ? 'bg-brand/5 border-brand text-brand shadow-sm shadow-brand/10' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <type.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 space-y-3">
            {/* Ẩn ô lưu vào ngân hàng khi đang dùng bài chọn sẵn từ ngân hàng bài tập. */}
            {!selectedBankId && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToBank}
                  onChange={e => setSaveToBank(e.target.checked)}
                  className="w-4 h-4 accent-brand rounded cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-600">Lưu bài này vào ngân hàng để dùng lại cho lớp khác</span>
              </label>
            )}
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-brand/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Đang lưu...' : 'LƯU BÀI TẬP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
