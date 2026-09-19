import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Image as ImageIcon } from 'lucide-react';
import MediaSourcePicker from '../MediaSourcePicker';

interface QuizRichTextProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Trình soạn thảo nội dung câu hỏi trắc nghiệm, dùng lại đúng bộ TipTap và cách
 * chèn ảnh qua Cloudinary như trình soạn bài tập hiện có.
 */
export default function QuizRichText({ value, onChange, placeholder }: QuizRichTextProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({ placeholder: placeholder || 'Nhập nội dung câu hỏi...' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[90px] px-4 py-3' } },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;
  const btn = (active: boolean) => `p-2 rounded-lg transition-colors ${active ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-200'}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Đậm"><Bold className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Nghiêng"><Italic className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Danh sách"><List className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Danh sách số"><ListOrdered className="w-4 h-4" /></button>
        <MediaSourcePicker
          onSelect={(url) => editor.chain().focus().setImage({ src: url }).run()}
          accept="image/*"
          resourceType="image"
          folder="quiz-questions"
          icon={ImageIcon}
          label=""
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 flex items-center"
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
