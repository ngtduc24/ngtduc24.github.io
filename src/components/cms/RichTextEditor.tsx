import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Node } from '@tiptap/core';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Code, Image as ImageIcon, Link as LinkIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Undo, Redo,
  Video as VideoIcon
} from 'lucide-react';
import MediaSourcePicker from '../MediaSourcePicker';

// Declare module augmentation for TipTap commands to support setVideo without TS errors
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string }) => ReturnType;
    };
  }
}

// Custom Video Extension for TipTap
export const VideoExtension = Node.create({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
      width: {
        default: '100%',
      },
      style: {
        default: 'max-width: 100%; border-radius: 0.5rem; display: block; margin: 1rem auto; background: #000;',
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'video',
        getAttrs: (el) => {
          if (typeof el === 'string') return {};
          const element = el as HTMLVideoElement;
          return {
            src: element.getAttribute('src'),
            controls: element.hasAttribute('controls'),
          };
        }
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', { ...HTMLAttributes, controls: 'true', class: 'rounded-xl max-w-full my-4 mx-auto block bg-black' }];
  },

  addCommands() {
    return {
      setVideo: (options: { src: string }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL liên kết:', previousUrl);
    if (url === null) {
      return;
    }
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const ToolbarBtn = ({ onClick, isActive = false, disabled = false, icon: Icon, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="In đậm" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="In nghiêng" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} title="Gạch ngang" />
      
      <div className="w-px h-6 bg-slate-300 mx-1"></div>
      
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={Heading1} title="Tiêu đề 1" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading2} title="Tiêu đề 2" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} icon={Heading3} title="Tiêu đề 3" />
      
      <div className="w-px h-6 bg-slate-300 mx-1"></div>
      
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} title="Căn trái" />
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} title="Căn giữa" />
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} title="Căn phải" />
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={AlignJustify} title="Căn đều" />
      
      <div className="w-px h-6 bg-slate-300 mx-1"></div>
      
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} title="Danh sách" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} title="Danh sách số" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={Quote} title="Trích dẫn" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} icon={Code} title="Khối mã" />
      
      <div className="w-px h-6 bg-slate-300 mx-1"></div>
      
      <MediaSourcePicker
        onSelect={(url) => {
          editor.chain().focus().setImage({ src: url }).run();
        }}
        accept="image/*"
        resourceType="image"
        label="Chèn ảnh từ thư viện"
        compact={true}
        icon={ImageIcon}
        className="p-1.5 rounded-lg transition-colors text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
      />

      <MediaSourcePicker
        onSelect={(url) => {
          editor.chain().focus().setVideo({ src: url }).run();
        }}
        accept="video/*"
        resourceType="video"
        label="Chèn video từ thư viện"
        compact={true}
        icon={VideoIcon}
        className="p-1.5 rounded-lg transition-colors text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
      />

      <ToolbarBtn onClick={setLink} isActive={editor.isActive('link')} icon={LinkIcon} title="Chèn liên kết" />
      
      <div className="flex-1"></div>
      
      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} icon={Undo} title="Hoàn tác" />
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} icon={Redo} title="Làm lại" />
    </div>
  );
};

export default function RichTextEditor({ value, onChange, placeholder = 'Nhập nội dung...', minHeight = '320px', maxHeight = '450px' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      VideoExtension,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base prose-slate max-w-none focus:outline-none p-4',
      },
    },
  });

  return (
    <div className="flex flex-col border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all overflow-hidden">
      <MenuBar editor={editor} />
      <div className={`overflow-y-auto scrollbar-thin ${!editor ? 'opacity-0' : 'opacity-100'}`} style={{ minHeight, maxHeight }}>
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror img {
          border-radius: 0.5rem;
          max-width: 100%;
          height: auto;
        }
        .ProseMirror video {
          border-radius: 0.5rem;
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1rem auto;
          background: #000;
        }
      `}</style>
    </div>
  );
}
