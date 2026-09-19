
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
  ChevronDown
} from 'lucide-react';
import { EduAssignment, EduGradeColumn } from '../../types/edu';
import { getGradeColumns, saveAssignment, getAssignments } from '../../lib/edu';
import { useNotifications } from '../NotificationContext';
import { uploadImageToCloudinary } from '../../lib/upload';

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
  { id: 'text', label: 'Nhập văn bản', icon: Type },
];

export default function EduAssignmentEditor({ classId, assignmentId, onSuccess }: EduAssignmentEditorProps) {
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<EduGradeColumn[]>([]);
  const [title, setTitle] = useState('');
  const [gradeColumnId, setGradeColumnId] = useState('');
  const [allowedTypes, setAllowedTypes] = useState<string[]>(['pdf']);
  const [deadline, setDeadline] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

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
            setAllowedTypes(assignment.allowedFileTypes || []);
            setDeadline(assignment.deadline ? assignment.deadline.slice(0, 16) : '');
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
        title,
        content: editor?.getHTML(),
        allowedFileTypes: allowedTypes,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
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
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
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
            <label className={`p-2 rounded-lg text-slate-500 cursor-pointer flex items-center ${uploadingImage ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-200'}`} title="Tải ảnh từ máy lên thư viện hệ thống">
              <input type="file" accept="image/*" className="hidden" onChange={handleInsertImageFile} disabled={uploadingImage} />
              <ImageIcon className="w-4 h-4" />
            </label>
            <button onClick={() => {
              const url = prompt('Nhập URL liên kết:');
              if (url) editor?.chain().focus().setLink({ href: url }).run();
            }} className={`p-2 rounded-lg transition-all ${editor?.isActive('link') ? 'bg-brand text-white shadow-sm' : 'hover:bg-slate-200 text-slate-500'}`}><LinkIcon className="w-4 h-4" /></button>
            <div className="flex-1" />
            <button onClick={() => editor?.chain().focus().undo().run()} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"><Undo className="w-4 h-4" /></button>
            <button onClick={() => editor?.chain().focus().redo().run()} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"><Redo className="w-4 h-4" /></button>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Tên tiêu đề bài tập..."
              className="w-full text-2xl font-black text-slate-900 border-none focus:ring-0 placeholder:text-slate-300 mb-4"
            />
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

          <div className="pt-4 border-t border-slate-50">
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
