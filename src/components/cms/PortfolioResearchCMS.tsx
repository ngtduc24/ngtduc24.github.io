import React, { useEffect, useState } from 'react';
import { Award, Edit3, Plus, Search, Trash2, Star, Pin } from 'lucide-react';
import { getPortfolioResearch, savePortfolioResearch, deletePortfolioResearch } from '../../lib/portfolioData';
import { PortfolioResearch } from '../portfolioTypes';
import CloudinaryUploadField from './CloudinaryUploadField';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20';
const labelClass = 'text-[10px] font-black uppercase tracking-wider text-slate-500';

const typeOptions: { value: PortfolioResearch['type']; label: string }[] = [
  { value: 'article', label: 'Bài báo tạp chí' },
  { value: 'conference', label: 'Báo cáo hội nghị' },
  { value: 'proceedings', label: 'Kỷ yếu hội nghị' },
  { value: 'book', label: 'Sách' },
  { value: 'book_chapter', label: 'Chương sách' },
  { value: 'thesis', label: 'Luận văn / Luận án' },
  { value: 'report', label: 'Báo cáo khoa học' },
  { value: 'project', label: 'Đề tài / Dự án' },
];

const permissionOptions: { value: PortfolioResearch['viewPermission']; label: string }[] = [
  { value: 'allow_download', label: 'Cho phép tải xuống' },
  { value: 'online', label: 'Đọc trực tuyến' },
  { value: 'abstract_only', label: 'Chỉ xem tóm tắt' },
];

const typeLabel = (t: PortfolioResearch['type']) => typeOptions.find(o => o.value === t)?.label || t;

const emptyResearch = (): PortfolioResearch => ({
  id: `research_${Date.now()}`,
  titleVi: '', titleEn: '',
  type: 'article',
  authors: [], coAuthors: [],
  affiliation: '',
  publishYear: new Date().getFullYear(),
  journalOrConference: '', volume: '', issue: '', pages: '',
  issnOrIsbn: '', doi: '',
  abstractVi: '', abstractEn: '',
  keywordsVi: [], keywordsEn: [],
  content: '',
  coverImage: '', pdfUrl: '', publisherUrl: '',
  citationApa: '',
  relatedResearch: [],
  viewPermission: 'allow_download',
  isFeatured: false, isPinned: false,
  field: '',
  viewCount: 0, downloadCount: 0,
});

const toList = (value: string) => value.split(',').map(v => v.trim()).filter(Boolean);

export default function PortfolioResearchCMS({ createOnMount = false }: { createOnMount?: boolean }) {
  const [items, setItems] = useState<PortfolioResearch[]>([]);
  const [editing, setEditing] = useState<PortfolioResearch | null>(createOnMount ? emptyResearch() : null);
  const [query, setQuery] = useState('');
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();

  useEffect(() => { getPortfolioResearch().then(setItems); }, []);

  const update = (patch: Partial<PortfolioResearch>) => setEditing(prev => prev ? { ...prev, ...patch } : prev);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (!editing.titleVi.trim()) { addNotification('Vui lòng nhập tiêu đề tiếng Việt.', 'error'); return; }
    await savePortfolioResearch(editing);
    setItems(current => [editing, ...current.filter(item => item.id !== editing.id)]);
    setEditing(null);
    addNotification('Đã lưu bài nghiên cứu.', 'success');
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Xác nhận xóa bài nghiên cứu', message: 'Bạn có chắc chắn muốn xóa bài nghiên cứu này?', confirmText: 'Xóa' }))) return;
    await deletePortfolioResearch(id);
    setItems(current => current.filter(item => item.id !== id));
    addNotification('Đã xóa bài nghiên cứu.', 'success');
  };

  const filtered = items.filter(item => `${item.titleVi} ${item.titleEn} ${item.field} ${item.authors.join(' ')}`.toLowerCase().includes(query.toLowerCase()));

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-6 rounded-2xl bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-800">{items.some(item => item.id === editing.id) ? 'Chỉnh sửa bài nghiên cứu' : 'Soạn bài nghiên cứu mới'}</h3>
            <p className="mt-1 text-[10px] text-slate-500">Bài báo khoa học, hội nghị, sách và các công trình học thuật.</p>
          </div>
          <button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Quay lại</button>
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h4 className="text-xs font-black text-slate-700">Thông tin chính</h4>
          <label className="block space-y-1"><span className={labelClass}>Tiêu đề tiếng Việt *</span><input required value={editing.titleVi} onChange={e => update({ titleVi: e.target.value })} className={fieldClass} /></label>
          <label className="block space-y-1"><span className={labelClass}>Tiêu đề tiếng Anh</span><input value={editing.titleEn} onChange={e => update({ titleEn: e.target.value })} className={fieldClass} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className={labelClass}>Loại công trình</span><select value={editing.type} onChange={e => update({ type: e.target.value as PortfolioResearch['type'] })} className={fieldClass}>{typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            <label className="space-y-1"><span className={labelClass}>Lĩnh vực</span><input value={editing.field} onChange={e => update({ field: e.target.value })} placeholder="VD: Truyền thông đa phương tiện" className={fieldClass} /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className={labelClass}>Tác giả chính, cách nhau bằng dấu phẩy</span><input value={editing.authors.join(', ')} onChange={e => update({ authors: toList(e.target.value) })} className={fieldClass} /></label>
            <label className="space-y-1"><span className={labelClass}>Đồng tác giả, cách nhau bằng dấu phẩy</span><input value={editing.coAuthors.join(', ')} onChange={e => update({ coAuthors: toList(e.target.value) })} className={fieldClass} /></label>
          </div>
          <label className="block space-y-1"><span className={labelClass}>Đơn vị công tác</span><input value={editing.affiliation} onChange={e => update({ affiliation: e.target.value })} className={fieldClass} /></label>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h4 className="text-xs font-black text-slate-700">Thông tin xuất bản</h4>
          <label className="block space-y-1"><span className={labelClass}>Tạp chí hoặc hội nghị</span><input value={editing.journalOrConference} onChange={e => update({ journalOrConference: e.target.value })} className={fieldClass} /></label>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="space-y-1"><span className={labelClass}>Năm công bố</span><input type="number" value={editing.publishYear} onChange={e => update({ publishYear: parseInt(e.target.value) || new Date().getFullYear() })} className={fieldClass} /></label>
            <label className="space-y-1"><span className={labelClass}>Tập (Volume)</span><input value={editing.volume} onChange={e => update({ volume: e.target.value })} className={fieldClass} /></label>
            <label className="space-y-1"><span className={labelClass}>Số (Issue)</span><input value={editing.issue} onChange={e => update({ issue: e.target.value })} className={fieldClass} /></label>
            <label className="space-y-1"><span className={labelClass}>Trang</span><input value={editing.pages} onChange={e => update({ pages: e.target.value })} className={fieldClass} /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className={labelClass}>ISSN hoặc ISBN</span><input value={editing.issnOrIsbn} onChange={e => update({ issnOrIsbn: e.target.value })} className={fieldClass} /></label>
            <label className="space-y-1"><span className={labelClass}>DOI</span><input value={editing.doi} onChange={e => update({ doi: e.target.value })} placeholder="VD: 10.1234/abcd" className={fieldClass} /></label>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h4 className="text-xs font-black text-slate-700">Nội dung</h4>
          <label className="block space-y-1"><span className={labelClass}>Tóm tắt tiếng Việt</span><textarea rows={4} value={editing.abstractVi} onChange={e => update({ abstractVi: e.target.value })} className={`${fieldClass} resize-y leading-6`} /></label>
          <label className="block space-y-1"><span className={labelClass}>Tóm tắt tiếng Anh (Abstract)</span><textarea rows={4} value={editing.abstractEn} onChange={e => update({ abstractEn: e.target.value })} className={`${fieldClass} resize-y leading-6`} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className={labelClass}>Từ khóa tiếng Việt, cách nhau dấu phẩy</span><input value={editing.keywordsVi.join(', ')} onChange={e => update({ keywordsVi: toList(e.target.value) })} className={fieldClass} /></label>
            <label className="space-y-1"><span className={labelClass}>Từ khóa tiếng Anh, cách nhau dấu phẩy</span><input value={editing.keywordsEn.join(', ')} onChange={e => update({ keywordsEn: toList(e.target.value) })} className={fieldClass} /></label>
          </div>
          <label className="block space-y-1"><span className={labelClass}>Nội dung chi tiết</span><textarea rows={10} value={editing.content} onChange={e => update({ content: e.target.value })} placeholder="Nội dung đầy đủ của bài nghiên cứu..." className={`${fieldClass} resize-y leading-6`} /></label>
          <label className="block space-y-1"><span className={labelClass}>Trích dẫn chuẩn APA</span><textarea rows={3} value={editing.citationApa} onChange={e => update({ citationApa: e.target.value })} placeholder="Tác giả. (Năm). Tiêu đề. Tạp chí, Tập(Số), Trang." className={`${fieldClass} resize-y leading-6`} /></label>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h4 className="text-xs font-black text-slate-700">Tệp và liên kết</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <CloudinaryUploadField label="Ảnh bìa" value={editing.coverImage} onChange={coverImage => update({ coverImage })} accept="image/*" resourceType="image" folder="portfolio/research" />
            <CloudinaryUploadField label="Tệp PDF" value={editing.pdfUrl} onChange={pdfUrl => update({ pdfUrl })} accept=".pdf,application/pdf" resourceType="raw" folder="portfolio/research/pdf" />
          </div>
          <label className="block space-y-1"><span className={labelClass}>Link nhà xuất bản</span><input value={editing.publisherUrl} onChange={e => update({ publisherUrl: e.target.value })} placeholder="https://..." className={fieldClass} /></label>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-3">
          <label className="space-y-1"><span className={labelClass}>Quyền xem</span><select value={editing.viewPermission} onChange={e => update({ viewPermission: e.target.value as PortfolioResearch['viewPermission'] })} className={fieldClass}>{permissionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label className="flex items-center justify-between self-end rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700">Bài nổi bật <input type="checkbox" checked={editing.isFeatured} onChange={e => update({ isFeatured: e.target.checked })} /></label>
          <label className="flex items-center justify-between self-end rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700">Ghim lên đầu <input type="checkbox" checked={editing.isPinned} onChange={e => update({ isPinned: e.target.checked })} /></label>
        </section>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-600">Hủy</button>
          <button type="submit" className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white">Lưu bài nghiên cứu</button>
        </div>
      </form>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-800">Bài nghiên cứu khoa học ({items.length})</h3>
          <p className="mt-1 text-[10px] text-slate-500">Đăng và quản lý bài báo, hội nghị, sách và công trình học thuật.</p>
        </div>
        <div className="flex gap-2">
          <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm bài nghiên cứu..." className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none" /></label>
          <button type="button" onClick={() => setEditing(emptyResearch())} className="inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Tạo bài nghiên cứu</button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[54px_minmax(320px,1.8fr)_150px_110px_110px_100px] items-center gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span>TT</span><span>Bài nghiên cứu</span><span>Loại</span><span>Năm</span><span>Lượt xem</span><span className="text-center">Thao tác</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((item, index) => (
              <article key={item.id} className="grid grid-cols-[54px_minmax(320px,1.8fr)_150px_110px_110px_100px] items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70">
                <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                <div className="flex min-w-0 items-center gap-3">
                  {item.coverImage ? <img src={item.coverImage} alt="" className="h-14 w-16 shrink-0 rounded-xl object-cover" /> : <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-brand-light text-brand"><Award className="h-5 w-5" /></span>}
                  <div className="min-w-0">
                    <strong className="block truncate text-xs text-slate-800">{item.titleVi || 'Bài nghiên cứu chưa đặt tên'}</strong>
                    <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">{item.authors.join(', ') || 'Chưa có tác giả'}{item.isFeatured && <Star className="h-3 w-3 text-amber-400" />}{item.isPinned && <Pin className="h-3 w-3 text-brand" />}</p>
                  </div>
                </div>
                <span className="w-fit rounded-lg bg-brand-light px-2.5 py-1 text-[10px] font-bold text-brand">{typeLabel(item.type)}</span>
                <span className="text-[10px] font-semibold text-slate-600">{item.publishYear}</span>
                <span className="text-[10px] font-semibold text-slate-600">{(item.viewCount || 0).toLocaleString('vi-VN')}</span>
                <div className="flex justify-center gap-1.5">
                  <button type="button" onClick={() => setEditing(item)} className="rounded-xl bg-brand-light p-2 text-brand hover:bg-brand/15" title="Chỉnh sửa"><Edit3 className="h-4 w-4" /></button>
                  <button type="button" onClick={() => remove(item.id)} className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100" title="Xóa"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            ))}
            {!filtered.length && <div className="py-12 text-center text-xs font-semibold text-slate-400">Chưa có bài nghiên cứu nào. Bấm Tạo bài nghiên cứu để bắt đầu.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
