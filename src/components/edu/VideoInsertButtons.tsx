import React from 'react';
import type { Editor } from '@tiptap/react';
import { Film, Youtube } from 'lucide-react';
import MediaSourcePicker from '../MediaSourcePicker';
import { askText, notice } from '../ui/Dialogs';
import { toVideoSource } from '../../lib/tiptapVideo';

// 2 nút trên thanh công cụ soạn thảo: chèn video từ thư viện hoặc tải lên, và chèn video bằng link.
export default function VideoInsertButtons({ editor, folder = 'edu-videos', className = 'p-2 rounded-lg text-slate-500 hover:bg-slate-200 flex items-center' }: { editor: Editor | null; folder?: string; className?: string }) {
  const addLink = async () => {
    const url = await askText({ title: 'Chèn video bằng link', label: 'Dán link YouTube, Vimeo, Google Drive hoặc link tệp .mp4.', placeholder: 'https://www.youtube.com/watch?v=...', okText: 'Chèn video' });
    if (!url) return;
    const src = toVideoSource(url);
    if (!src) { notice('Link này không phải video hỗ trợ. Hãy dùng link YouTube, Vimeo, Google Drive hoặc tệp .mp4.'); return; }
    editor?.chain().focus().insertVideo(src).run();
  };
  return (
    <>
      <span title="Chèn video từ thư viện hoặc tải lên" className="inline-flex">
        <MediaSourcePicker
          onSelect={url => editor?.chain().focus().insertVideo({ kind: 'file', src: url }).run()}
          accept="video/*"
          resourceType="video"
          folder={folder}
          category="Video bài giảng"
          icon={Film}
          label=""
          className={className}
        />
      </span>
      <button type="button" onClick={addLink} title="Chèn video bằng link YouTube, Vimeo, Drive" className={className}><Youtube className="w-4 h-4" /></button>
    </>
  );
}
