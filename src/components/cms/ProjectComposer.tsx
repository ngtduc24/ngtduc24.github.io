import React from 'react';
import { Briefcase, Images, Pin, Video } from 'lucide-react';
import { PortfolioProject } from '../portfolioTypes';
import { PortfolioCategory, savePortfolioProject } from '../../lib/portfolioData';
import CloudinaryUploadField from './CloudinaryUploadField';
import ContentComposer, { CardTitle, TagInput, composerCard, composerField } from './ContentComposer';

// Trang soạn dự án (portfolio thiết kế), cùng dạng trang soạn chuẩn với bài viết.
// Thêm bộ ảnh, video giới thiệu dưới trình soạn và thẻ Thông tin dự án ở cột phải.
export interface ProjectComposerProps {
  project: PortfolioProject;
  isNew: boolean;
  categories: PortfolioCategory[];
  onManageCategories: () => void;
  onSaved: (project: PortfolioProject, opts: { auto: boolean }) => void;
  onClose: () => void;
}

export default function ProjectComposer({ project, isNew, categories, onManageCategories, onSaved, onClose }: ProjectComposerProps) {
  return (
    <ContentComposer<PortfolioProject>
      kind="project"
      item={project}
      isNew={isNew}
      contentKey="detailedContent"
      excerptKey="briefDescription"
      save={async item => {
        const toSave = { ...item, publishDate: item.status === 'published' && !item.publishDate ? new Date().toISOString().slice(0, 10) : item.publishDate };
        return savePortfolioProject(toSave).then(r => (r as unknown) !== false);
      }}
      categories={categories}
      onManageCategories={onManageCategories}
      onSaved={onSaved}
      onClose={onClose}
      folder="portfolio/projects"
      labels={{ noun: 'dự án', titlePlaceholder: 'Tên dự án', back: 'Danh sách dự án', editorPlaceholder: 'Giới thiệu dự án: bối cảnh, ý tưởng, quy trình, giải pháp và kết quả. Có thể dán hoặc kéo thả ảnh vào đây...' }}
      renderBelowEditor={(draft, set) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={composerCard}>
            <CardTitle icon={Images}>Bộ ảnh dự án</CardTitle>
            <CloudinaryUploadField label="" value={draft.gallery.join('\n')} onChange={value => set({ gallery: value.split('\n').filter(Boolean) })}
              accept="image/*" resourceType="image" folder="portfolio/projects/gallery" multiple onMultiple={urls => set({ gallery: [...draft.gallery, ...urls] })}
              hint="Chọn nhiều ảnh từ Kho lưu trữ hoặc tải lên, hiện thành bộ ảnh cuối trang dự án." />
            {draft.gallery.length > 0 && <p className="mt-2 text-xs text-slate-500">{draft.gallery.length} ảnh</p>}
          </section>
          <section className={composerCard}>
            <CardTitle icon={Video}>Video giới thiệu</CardTitle>
            <CloudinaryUploadField label="" value={draft.introVideo || ''} onChange={url => set({ introVideo: url })} accept="video/*" resourceType="video" folder="portfolio/projects/videos" hint="Tệp mp4 hoặc link YouTube, Vimeo." />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={!!draft.loopVideo} onChange={e => set({ loopVideo: e.target.checked })} className="accent-brand" /> Phát lặp lại</label>
          </section>
        </div>
      )}
      renderSideCards={(draft, set) => (
        <section className={composerCard}>
          <CardTitle icon={Briefcase}>Thông tin dự án</CardTitle>
          <div className="space-y-3">
            <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Khách hàng, đơn vị</span><input value={draft.client} onChange={e => set({ client: e.target.value })} className={composerField} /></label>
            <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Vai trò</span><input value={draft.role} onChange={e => set({ role: e.target.value })} placeholder="Thiết kế đồ hoạ" className={composerField} /></label>
            <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Thời gian</span><input value={draft.timeline} onChange={e => set({ timeline: e.target.value })} placeholder="2025" className={composerField} /></label>
            <div className="space-y-1"><span className="text-xs font-semibold text-slate-500">Công cụ</span><TagInput tags={draft.tools} onChange={tools => set({ tools })} prefix="" placeholder="Blender, Photoshop" /></div>
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700">
              <span className="flex items-center gap-2"><Pin className="h-4 w-4 text-brand" /> Ghim lên đầu</span>
              <input type="checkbox" checked={draft.isPinned} onChange={e => set({ isPinned: e.target.checked })} className="h-4 w-4 accent-brand" />
            </label>
          </div>
        </section>
      )}
    />
  );
}
