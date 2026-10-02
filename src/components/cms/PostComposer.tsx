import React from 'react';
import { User } from 'lucide-react';
import { PortfolioPost } from '../portfolioTypes';
import { PortfolioCategory, savePortfolioPost } from '../../lib/portfolioData';
import ContentComposer, { CardTitle, composerCard, composerField } from './ContentComposer';

// Trang soạn bài viết của Website, dùng trang soạn chuẩn ContentComposer.
export interface PostComposerProps {
  post: PortfolioPost;
  isNew: boolean;
  categories: PortfolioCategory[];
  onManageCategories: () => void;
  onSaved: (post: PortfolioPost, opts: { auto: boolean }) => void;
  onClose: () => void;
}

export default function PostComposer({ post, isNew, categories, onManageCategories, onSaved, onClose }: PostComposerProps) {
  return (
    <ContentComposer<PortfolioPost>
      kind="post"
      item={post}
      isNew={isNew}
      contentKey="content"
      excerptKey="excerpt"
      save={item => savePortfolioPost(item).then(r => (r as unknown) !== false)}
      categories={categories}
      onManageCategories={onManageCategories}
      onSaved={onSaved}
      onClose={onClose}
      folder="portfolio/posts"
      labels={{ noun: 'bài viết', titlePlaceholder: 'Tiêu đề bài viết', back: 'Danh sách bài', editorPlaceholder: 'Bắt đầu viết. Có thể dán chữ, ảnh từ trang khác hoặc kéo thả ảnh từ máy vào đây...' }}
      renderSideCards={(draft, set) => (
        <section className={composerCard}>
          <CardTitle icon={User}>Tác giả</CardTitle>
          <input value={draft.author} onChange={e => set({ author: e.target.value })} className={composerField} />
        </section>
      )}
    />
  );
}
