import React, { useEffect, useRef, useState } from 'react';
import { Award, BookOpen, Edit3, FileText, FolderGit2, GraduationCap, Newspaper, Plus, Search, Trash2, Settings, X } from 'lucide-react';
import { getSiteFeatures, deletePortfolioPost, getPortfolioPosts, savePortfolioPost, getPortfolioCategories, savePortfolioCategories, PortfolioCategory } from '../../lib/portfolioData';
import { PortfolioPost } from '../portfolioTypes';
import CloudinaryUploadField from './CloudinaryUploadField';
import PostComposer from './PostComposer';
import ProjectsCoursesCMS from './ProjectsCoursesCMS';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';
import CategoryManagerModal from './CategoryManagerModal';
import PortfolioResearchCMS from './PortfolioResearchCMS';
import { auth } from '../../lib/firebase';

type SelectedContentType = 'article' | 'project' | 'course' | 'research' | null;

const contentTypes = [
  { id: 'article', label: 'Bài viết', description: 'Tin tức, blog, bài chia sẻ với ảnh, video, bảng và định dạng đầy đủ.', icon: Newspaper },
  { id: 'project', label: 'Dự án', description: 'Đăng dự án thiết kế dạng portfolio: bối cảnh, quy trình, giải pháp và bộ ảnh.', icon: FolderGit2 },
  { id: 'research', label: 'Bài nghiên cứu', description: 'Bài học thuật, tóm tắt, trích dẫn, DOI và tệp PDF.', icon: Award },
] as const;

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';

// mode 'create': chỉ hiện các thẻ đăng bài mới. mode 'manage': chỉ hiện danh sách bài để sửa, xoá.
export default function PortfolioContentManager({ mode = 'all', onSaved }: { mode?: 'all' | 'create' | 'manage'; onSaved?: () => void } = {}) {
  const [posts, setPosts] = useState<PortfolioPost[]>([]);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editing, setEditing] = useState<PortfolioPost | null>(null);
  const [query, setQuery] = useState('');
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();
  const [selectedType, setSelectedType] = useState<SelectedContentType>(null);
  const [editorVersion, setEditorVersion] = useState(0);

  const availableTypes = contentTypes.filter(type => (type.id !== 'research' || getSiteFeatures().research) && (type.id !== 'project' || getSiteFeatures().projects));
  // Website chỉ có bài viết (đã tắt trang Dự án): mở thẳng trang soạn bài, không cần chọn dạng.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (mode === 'create' && availableTypes.length === 1 && !autoOpened.current && categoriesLoaded) { autoOpened.current = true; createPost(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, categoriesLoaded]);
  useEffect(() => {
    getPortfolioPosts().then(setPosts);
    getPortfolioCategories().then(c => { setCategories(c); setCategoriesLoaded(true); });
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

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Xác nhận xóa bài viết', message: 'Bạn có chắc chắn muốn xóa bài viết này?', confirmText: 'Xóa' }))) return;
    await deletePortfolioPost(id);
    setPosts(current => current.filter(item => item.id !== id));
    addNotification('Đã xóa bài viết.', 'success');
  };

  const filtered = posts.filter(item => `${item.title} ${item.category} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      {mode !== 'manage' && !editing && <section className="rounded-2xl bg-slate-50 p-5">
        <div><h3 className="text-base font-semibold text-slate-800">{availableTypes.length > 1 ? 'Chọn dạng bài muốn đăng' : 'Viết bài mới'}</h3><p className="mt-1 text-[13px] text-slate-500">Bấm vào thẻ để mở trang soạn bài.</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableTypes.map(type => <button key={type.id} type="button" onClick={() => { if (type.id === 'article') createPost(); else { setEditing(null); setSelectedType(type.id); setEditorVersion(value => value + 1); } }} className={`group rounded-2xl bg-white p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md ${selectedType === type.id ? 'ring-2 ring-brand shadow-md' : ''}`}><span className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${selectedType === type.id ? 'bg-brand text-white' : 'bg-brand-light text-brand group-hover:bg-brand group-hover:text-white'}`}><type.icon className="h-5 w-5" /></span><strong className="mt-3 block text-xs text-slate-800">{type.label}</strong><span className="mt-1 block text-[10px] leading-4 text-slate-500">{type.description}</span></button>)}
        </div>
      </section>}

      {selectedType === 'project' ? <div key={`project-${editorVersion}`}><ProjectsCoursesCMS initialSubTab="projects" createOnMount showSubTabs={false} /></div> :
      selectedType === 'course' ? <div key={`course-${editorVersion}`}><ProjectsCoursesCMS initialSubTab="courses" createOnMount showSubTabs={false} /></div> :
      selectedType === 'research' ? <div key={`research-${editorVersion}`}><PortfolioResearchCMS createOnMount /></div> :
      editing ? (
        <PostComposer
          key={editing.id}
          post={editing}
          isNew={!posts.some(item => item.id === editing.id)}
          categories={categories}
          onManageCategories={() => setShowCategoriesModal(true)}
          onSaved={(saved, { auto }) => {
            setPosts(current => [saved, ...current.filter(item => item.id !== saved.id)]);
            if (!auto) addNotification(saved.status === 'published' ? 'Đã xuất bản bài viết.' : 'Đã lưu bài viết.', 'success');
          }}
          onClose={() => { setEditing(null); if (mode === 'create') { setSelectedType(null); onSaved?.(); } }}
        />
      ) : mode === 'create' ? null : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-base font-black text-slate-800">Bài viết thông thường ({posts.length})</h3><p className="mt-1 text-[10px] text-slate-500">Xem, sửa và xuất bản như một trang báo.</p></div><div className="flex gap-2"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm bài viết..." className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none" /></label><button type="button" onClick={createPost} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Tạo bài</button></div></div>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><div className="min-w-[880px]"><div className="grid grid-cols-[54px_minmax(340px,1.8fr)_150px_125px_120px_100px] items-center gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500"><span>TT</span><span>Bài viết</span><span>Chuyên mục</span><span>Trạng thái</span><span>Lượt xem</span><span className="text-center">Thao tác</span></div><div className="divide-y divide-slate-100">{filtered.map((post, index) => <article key={post.id} className="grid grid-cols-[54px_minmax(340px,1.8fr)_150px_125px_120px_100px] items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70"><span className="text-xs font-bold text-slate-400">{index + 1}</span><div className="flex min-w-0 items-center gap-3">{post.coverImage ? <img src={post.coverImage} alt="" className="h-14 w-16 shrink-0 rounded-xl object-cover" /> : <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-brand-light text-brand"><FileText className="h-5 w-5" /></span>}<div className="min-w-0"><strong className="block truncate text-xs text-slate-800">{post.title || 'Bài viết chưa đặt tên'}</strong><p className="mt-1 text-[10px] text-slate-400">{post.author} · {post.publishDate}</p></div></div><span className="w-fit rounded-lg bg-brand-light px-2.5 py-1 text-[10px] font-bold text-brand">{post.category}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${post.status === 'published' ? 'bg-brand-light text-brand' : post.status === 'hidden' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{post.status === 'published' ? 'Đã xuất bản' : post.status === 'hidden' ? 'Đã ẩn' : 'Bản nháp'}</span><span className="text-[10px] font-semibold text-slate-600">{(post.viewCount || 0).toLocaleString('vi-VN')}</span><div className="flex justify-center gap-1.5"><button type="button" onClick={() => setEditing(post)} className="rounded-xl bg-brand-light p-2 text-brand hover:bg-brand/15" title="Chỉnh sửa"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => remove(post.id)} className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100" title="Xóa"><Trash2 className="h-4 w-4" /></button></div></article>)}{!filtered.length && <div className="py-12 text-center text-xs font-semibold text-slate-400">Chưa có bài viết phù hợp.</div>}</div></div></div>
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
