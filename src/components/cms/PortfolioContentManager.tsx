import React, { useEffect, useState } from 'react';
import { Award, BookOpen, Edit3, FileText, FolderGit2, GraduationCap, Newspaper, Plus, Search, Trash2, Settings, X } from 'lucide-react';
import { deletePortfolioPost, getPortfolioPosts, savePortfolioPost, getPortfolioCategories, savePortfolioCategories, PortfolioCategory } from '../../lib/portfolioData';
import { PortfolioPost } from '../portfolioTypes';
import CloudinaryUploadField from './CloudinaryUploadField';
import ProjectsCoursesCMS from './ProjectsCoursesCMS';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';
import CategoryManagerModal from './CategoryManagerModal';
import { auth } from '../../lib/firebase';

type SelectedContentType = 'article' | 'project' | 'course' | 'research' | null;

const contentTypes = [
  { id: 'article', label: 'Bài viết bình thường', description: 'Bài báo, tin tức hoặc nội dung dài với ảnh bìa, chuyên mục và thẻ.', icon: Newspaper },
  { id: 'project', label: 'Bài dự án Design', description: 'Case study dạng Behance: bối cảnh, quy trình, giải pháp và bộ ảnh.', icon: FolderGit2 },
  { id: 'course', label: 'Khóa học online', description: 'Chương, bài học, video, tài liệu, tiến trình và học viên.', icon: GraduationCap },
  { id: 'research', label: 'Bài nghiên cứu', description: 'Bài học thuật, tóm tắt, trích dẫn, DOI và tệp PDF.', icon: Award },
] as const;

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

export default function PortfolioContentManager() {
  const [posts, setPosts] = useState<PortfolioPost[]>([]);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editing, setEditing] = useState<PortfolioPost | null>(null);
  const [query, setQuery] = useState('');
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();
  const [selectedType, setSelectedType] = useState<SelectedContentType>(null);
  const [editorVersion, setEditorVersion] = useState(0);

  useEffect(() => {
    getPortfolioPosts().then(setPosts);
    getPortfolioCategories().then(setCategories);
  }, []);

  const createPost = () => {
    setSelectedType('article');
    setEditing({
      id: `post_${Date.now()}`,
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      coverImage: '',
      author: auth.currentUser?.displayName || auth.currentUser?.email || 'Tác giả',
      category: categories.length > 0 ? categories[0].name : 'Tin tức',
      tags: [],
      status: 'draft',
      publishDate: new Date().toISOString().slice(0, 10),
      viewCount: 0,
      isFeatured: false
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const normalized = { ...editing, slug: editing.slug.trim() || editing.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') };
    await savePortfolioPost(normalized);
    setPosts(current => [normalized, ...current.filter(item => item.id !== normalized.id)]);
    setEditing(null);
    addNotification('Đã lưu bài viết.', 'success');
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Xác nhận xóa bài viết', message: 'Bạn có chắc chắn muốn xóa bài viết này?', confirmText: 'Xóa' }))) return;
    await deletePortfolioPost(id);
    setPosts(current => current.filter(item => item.id !== id));
    addNotification('Đã xóa bài viết.', 'success');
  };

  const filtered = posts.filter(item => `${item.title} ${item.category} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-slate-50 p-5">
        <div><h3 className="text-base font-black text-slate-800">Thêm bài viết mới theo các dạng</h3><p className="mt-1 text-[11px] text-slate-500">Bấm vào một thẻ để mở ngay form tạo mới tương ứng.</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {contentTypes.map(type => <button key={type.id} type="button" onClick={() => { if (type.id === 'article') createPost(); else { setEditing(null); setSelectedType(type.id); setEditorVersion(value => value + 1); } }} className={`group rounded-2xl bg-white p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md ${selectedType === type.id ? 'ring-2 ring-brand shadow-md' : ''}`}><span className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${selectedType === type.id ? 'bg-brand text-white' : 'bg-brand-light text-brand group-hover:bg-brand group-hover:text-white'}`}><type.icon className="h-5 w-5" /></span><strong className="mt-3 block text-xs text-slate-800">{type.label}</strong><span className="mt-1 block text-[10px] leading-4 text-slate-500">{type.description}</span></button>)}
        </div>
      </section>

      {selectedType === 'project' ? <div key={`project-${editorVersion}`}><ProjectsCoursesCMS initialSubTab="projects" createOnMount showSubTabs={false} /></div> :
      selectedType === 'course' ? <div key={`course-${editorVersion}`}><ProjectsCoursesCMS initialSubTab="courses" createOnMount showSubTabs={false} /></div> :
      selectedType === 'research' ? <div key={`research-${editorVersion}`}><p className="text-center py-10 text-slate-500 text-xs">Phân hệ Nghiên cứu đang được cập nhật.</p></div> :
      editing ? (
        <form onSubmit={save} className="space-y-5 rounded-2xl bg-white">
          <div className="flex items-center justify-between gap-4"><div><h3 className="text-base font-black text-slate-800">{posts.some(item => item.id === editing.id) ? 'Chỉnh sửa bài viết' : 'Soạn bài viết mới'}</h3><p className="mt-1 text-[10px] text-slate-500">Trình biên tập bài viết thông thường.</p></div><button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Quay lại</button></div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tiêu đề *</span><input required value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} className={fieldClass} /></label>
              <label className="block space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Đường dẫn</span><input value={editing.slug} onChange={event => setEditing({ ...editing, slug: event.target.value })} placeholder="Tự tạo theo tiêu đề nếu để trống" className={fieldClass} /></label>
              <CloudinaryUploadField label="Ảnh bìa bài viết" value={editing.coverImage} onChange={coverImage => setEditing({ ...editing, coverImage })} accept="image/*" resourceType="image" folder="portfolio/posts" />
              <label className="block space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Mô tả ngắn</span><textarea rows={3} value={editing.excerpt} onChange={event => setEditing({ ...editing, excerpt: event.target.value })} className={`${fieldClass} resize-none`} /></label>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Chuyên mục</span>
                    <button type="button" onClick={() => setShowCategoriesModal(true)} className="text-[10px] font-bold text-brand hover:underline">Quản lý</button>
                  </div>
                  <select value={editing.category} onChange={event => setEditing({ ...editing, category: event.target.value })} className={fieldClass}>
                    {categories.length === 0 && <option value="Tin tức">Tin tức</option>}
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    {editing.category && categories.length > 0 && !categories.some(cat => cat.name === editing.category) && (
                      <option value={editing.category}>{editing.category}</option>
                    )}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tác giả</span>
                  <input value={editing.author} onChange={event => setEditing({ ...editing, author: event.target.value })} className={fieldClass} />
                </label>
              </div>
              <label className="block space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tags, cách nhau bằng dấu phẩy</span><input value={editing.tags.join(', ')} onChange={event => setEditing({ ...editing, tags: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })} className={fieldClass} /></label>
              <label className="block space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nội dung bài viết *</span><textarea required rows={12} value={editing.content} onChange={event => setEditing({ ...editing, content: event.target.value })} placeholder="Soạn nội dung bài viết tại đây..." className={`${fieldClass} resize-y leading-6`} /></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Trạng thái</span><select value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value as PortfolioPost['status'] })} className={fieldClass}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option><option value="hidden">Đã ẩn</option></select></label><label className="flex items-center justify-between self-end rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700">Bài nổi bật <input type="checkbox" checked={editing.isFeatured} onChange={event => setEditing({ ...editing, isFeatured: event.target.checked })} /></label></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-600">Hủy</button><button type="submit" className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white">Lưu bài viết</button></div>
        </form>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-base font-black text-slate-800">Bài viết thông thường ({posts.length})</h3><p className="mt-1 text-[10px] text-slate-500">Xem, sửa và xuất bản như một trang báo.</p></div><div className="flex gap-2"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm bài viết..." className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none" /></label><button type="button" onClick={createPost} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Tạo bài</button></div></div>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><div className="min-w-[880px]"><div className="grid grid-cols-[54px_minmax(340px,1.8fr)_150px_125px_120px_100px] items-center gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500"><span>TT</span><span>Bài viết</span><span>Chuyên mục</span><span>Trạng thái</span><span>Lượt xem</span><span className="text-center">Thao tác</span></div><div className="divide-y divide-slate-100">{filtered.map((post, index) => <article key={post.id} className="grid grid-cols-[54px_minmax(340px,1.8fr)_150px_125px_120px_100px] items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70"><span className="text-xs font-bold text-slate-400">{index + 1}</span><div className="flex min-w-0 items-center gap-3">{post.coverImage ? <img src={post.coverImage} alt="" className="h-14 w-16 shrink-0 rounded-xl object-cover" /> : <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-brand-light text-brand"><FileText className="h-5 w-5" /></span>}<div className="min-w-0"><strong className="block truncate text-xs text-slate-800">{post.title || 'Bài viết chưa đặt tên'}</strong><p className="mt-1 text-[10px] text-slate-400">{post.author} · {post.publishDate}</p></div></div><span className="w-fit rounded-lg bg-brand-light px-2.5 py-1 text-[10px] font-bold text-brand">{post.category}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${post.status === 'published' ? 'bg-emerald-50 text-emerald-600' : post.status === 'hidden' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{post.status === 'published' ? 'Đã xuất bản' : post.status === 'hidden' ? 'Đã ẩn' : 'Bản nháp'}</span><span className="text-[10px] font-semibold text-slate-600">{(post.viewCount || 0).toLocaleString('vi-VN')}</span><div className="flex justify-center gap-1.5"><button type="button" onClick={() => setEditing(post)} className="rounded-xl bg-brand-light p-2 text-brand hover:bg-brand/15" title="Chỉnh sửa"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => remove(post.id)} className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100" title="Xóa"><Trash2 className="h-4 w-4" /></button></div></article>)}{!filtered.length && <div className="py-12 text-center text-xs font-semibold text-slate-400">Chưa có bài viết phù hợp.</div>}</div></div></div>
        </section>
      )}

      {showCategoriesModal && (
        <CategoryManagerModal
          categories={categories}
          setCategories={setCategories}
          onClose={() => setShowCategoriesModal(false)}
          onCategoryUpdate={(oldName, newName) => {
            if (editing && editing.category === oldName) {
              setEditing({ ...editing, category: newName });
            }
          }}
        />
      )}
    </div>
  );
}
