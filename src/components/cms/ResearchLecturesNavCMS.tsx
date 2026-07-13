import React, { useState, useEffect } from 'react';
import { Trash2, Edit3, Check, Award, FileText, Copy } from 'lucide-react';
import { 
  PortfolioResearch, PortfolioLecture
} from '../portfolioTypes';
import { 
  getPortfolioResearch, savePortfolioResearch, deletePortfolioResearch,
  getPortfolioLectures, savePortfolioLecture, deletePortfolioLecture
} from '../../lib/portfolioData';
import CloudinaryUploadField from './CloudinaryUploadField';
import PortfolioListToolbar from './PortfolioListToolbar';

const createEmptyResearch = (): PortfolioResearch => ({
  id: `res_${Date.now()}`, titleVi: '', titleEn: '', type: 'article', authors: ['Alex Nguyễn'], coAuthors: [], affiliation: 'Đại học Sân khấu Điện ảnh', publishYear: new Date().getFullYear(), journalOrConference: '', volume: '', issue: '', pages: '', issnOrIsbn: '', doi: '', abstractVi: '', abstractEn: '', keywordsVi: [], keywordsEn: [], content: '', coverImage: '', pdfUrl: '', publisherUrl: '', citationApa: '', relatedResearch: [], viewPermission: 'online', isFeatured: false, isPinned: false, field: '', viewCount: 0, downloadCount: 0
});

const createEmptyLecture = (): PortfolioLecture => ({
  id: `lec_${Date.now()}`, title: '', subject: 'Kỹ năng thiết kế', topic: '', documentType: 'slides', publishDate: new Date().toISOString().slice(0, 10), status: 'draft', viewCount: 0, downloadCount: 0, learningObjectives: [], targetLearners: ['Học viên đại học', 'Người đam mê thiết kế'], detailedContent: '', images: [], videoUrl: '', pdfUrl: '', slideUrl: '', practiceFileUrl: '', assignments: [], references: [], duration: '', keywords: [], accessPermission: 'public', allowDownload: true
});

export default function ResearchLecturesNavCMS({ initialSubTab = 'research', createOnMount = false, showSubTabs = true }: { initialSubTab?: 'research' | 'lectures'; createOnMount?: boolean; showSubTabs?: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<'research' | 'lectures'>(initialSubTab);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Research States
  const [researchList, setResearchList] = useState<PortfolioResearch[]>([]);
  const [searchResearch, setSearchResearch] = useState('');
  const [filterResearchType, setFilterResearchType] = useState('all');
  const [filterResearchYear, setFilterResearchYear] = useState('all');
  const [filterResearchField, setFilterResearchField] = useState('all');
  const [editingResearch, setEditingResearch] = useState<PortfolioResearch | null>(null);
  const [selectedResearchIds, setSelectedResearchIds] = useState<string[]>([]);

  // 2. Lectures States
  const [lectures, setLectures] = useState<PortfolioLecture[]>([]);
  const [searchLecture, setSearchLecture] = useState('');
  const [filterLectureType, setFilterLectureType] = useState('all');
  const [filterLectureStatus, setFilterLectureStatus] = useState('all');
  const [filterLectureSubject, setFilterLectureSubject] = useState('all');
  const [editingLecture, setEditingLecture] = useState<PortfolioLecture | null>(null);
  const [selectedLectureIds, setSelectedLectureIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [res, lec] = await Promise.all([
          getPortfolioResearch(),
          getPortfolioLectures()
        ]);
        setResearchList(res);
        setLectures(lec);
        if (createOnMount) {
          if (initialSubTab === 'research') setEditingResearch(createEmptyResearch());
          else setEditingLecture(createEmptyLecture());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // --- RESEARCH ACTIONS ---
  const handleSaveResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResearch) return;

    let updated = [...researchList];
    const idx = updated.findIndex(item => item.id === editingResearch.id);
    if (idx >= 0) {
      updated[idx] = editingResearch;
    } else {
      updated.push(editingResearch);
    }
    setResearchList(updated);
    await savePortfolioResearch(editingResearch);
    setEditingResearch(null);
    triggerSuccess(`Đã lưu công trình nghiên cứu: "${editingResearch.titleVi}"!`);
  };

  const handleDeleteResearch = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài nghiên cứu này?')) return;
    setResearchList(researchList.filter(item => item.id !== id));
    await deletePortfolioResearch(id);
    triggerSuccess('Đã xóa bài báo nghiên cứu thành công.');
  };

  const handleCopyCitation = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerSuccess('Đã sao chép trích dẫn APA vào Clipboard!');
  };

  // --- LECTURES ACTIONS ---
  const handleSaveLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLecture) return;

    let updated = [...lectures];
    const idx = updated.findIndex(item => item.id === editingLecture.id);
    if (idx >= 0) {
      updated[idx] = editingLecture;
    } else {
      updated.push(editingLecture);
    }
    setLectures(updated);
    await savePortfolioLecture(editingLecture);
    setEditingLecture(null);
    triggerSuccess(`Đã lưu bài giảng học liệu: "${editingLecture.title}"!`);
  };

  const handleDeleteLecture = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài giảng/tài nguyên này?')) return;
    setLectures(lectures.filter(item => item.id !== id));
    await deletePortfolioLecture(id);
    triggerSuccess('Đã xóa tài liệu bài giảng thành công.');
  };

  if (loading) {
    return <div className="p-8 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest">Đang tải phân hệ quản trị Nghiên cứu & Học liệu...</div>;
  }

  const filteredResearch = researchList.filter(item => {
    const matchesSearch = `${item.titleVi} ${item.titleEn} ${item.authors.join(' ')} ${item.journalOrConference}`.toLowerCase().includes(searchResearch.toLowerCase());
    return matchesSearch && (filterResearchType === 'all' || item.type === filterResearchType) && (filterResearchYear === 'all' || String(item.publishYear) === filterResearchYear) && (filterResearchField === 'all' || item.field === filterResearchField);
  });
  const filteredLectures = lectures.filter(item => {
    const matchesSearch = `${item.title} ${item.subject} ${item.topic}`.toLowerCase().includes(searchLecture.toLowerCase());
    return matchesSearch && (filterLectureType === 'all' || item.documentType === filterLectureType) && (filterLectureStatus === 'all' || item.status === filterLectureStatus) && (filterLectureSubject === 'all' || item.subject === filterLectureSubject);
  });

  return (
    <div className="space-y-6">
      
      {/* Action notify popup */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-slideUp">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {showSubTabs && <div
        className="flex flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-200 pb-4 select-none"
        onWheel={(e) => {
          if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth && e.deltaY !== 0) {
            e.preventDefault();
            e.currentTarget.scrollLeft += e.deltaY * 1.2;
          }
        }}
      >
        {[
          { id: 'research', label: 'Danh sách Nghiên cứu khoa học', icon: Award },
          { id: 'lectures', label: 'Danh sách Bài giảng & Học liệu', icon: FileText },
        ].map(tab => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setEditingResearch(null);
                setEditingLecture(null);
              }}
              className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>}

      {/* SUB-VIEW 1: RESEARCH PAPERS PANEL */}
      {activeSubTab === 'research' && !editingResearch && (
        <div className="space-y-6">
          <PortfolioListToolbar
            searchValue={searchResearch}
            onSearchChange={setSearchResearch}
            searchPlaceholder="Tìm theo tên công trình, tác giả, tạp chí, DOI..."
            filters={[
              { label: 'Phân loại', value: filterResearchType, onChange: setFilterResearchType, options: [{ value: 'all', label: 'Tất cả loại' }, ...Array.from(new Set(researchList.map(item => item.type))).map(value => ({ value: String(value), label: String(value) }))] },
              { label: 'Lĩnh vực', value: filterResearchField, onChange: setFilterResearchField, options: [{ value: 'all', label: 'Tất cả lĩnh vực' }, ...Array.from(new Set(researchList.map(item => item.field).filter(Boolean))).map(value => ({ value: String(value), label: String(value) }))] },
              { label: 'Thời gian', value: filterResearchYear, onChange: setFilterResearchYear, options: [{ value: 'all', label: 'Tất cả thời gian' }, ...Array.from(new Set(researchList.map(item => String(item.publishYear)))).map(value => ({ value: String(value), label: String(value) }))] }
            ]}
            selectedCount={selectedResearchIds.length}
            resultCount={filteredResearch.length}
            onSelectAll={() => setSelectedResearchIds(filteredResearch.map(item => item.id))}
            onClearSelection={() => setSelectedResearchIds([])}
            onDeleteSelected={async () => { if (!selectedResearchIds.length || !window.confirm(`Xóa ${selectedResearchIds.length} công trình đã chọn?`)) return; await Promise.all(selectedResearchIds.map(deletePortfolioResearch)); setResearchList(current => current.filter(item => !selectedResearchIds.includes(item.id))); setSelectedResearchIds([]); triggerSuccess('Đã xóa các công trình được chọn.'); }}
            onCreate={() => setEditingResearch(createEmptyResearch())}
            createLabel="Thêm bài nghiên cứu"
          />

          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[40px_54px_minmax(360px,1.8fr)_150px_125px_145px_130px] items-center gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <input type="checkbox" aria-label="Chọn tất cả nghiên cứu" checked={filteredResearch.length > 0 && filteredResearch.every(item => selectedResearchIds.includes(item.id))} onChange={event => setSelectedResearchIds(event.target.checked ? filteredResearch.map(item => item.id) : [])} className="h-4 w-4 rounded text-brand" /><span>TT</span><span>Công trình nghiên cứu</span><span>Loại / Năm</span><span>Trạng thái</span><span>Lượt xem / Tải</span><span className="text-center">Thao tác</span>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredResearch.map((paper, index) => (
                  <div key={paper.id} className="grid grid-cols-[40px_54px_minmax(360px,1.8fr)_150px_125px_145px_130px] items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70">
                    <input type="checkbox" aria-label={`Chọn nghiên cứu ${paper.titleVi}`} checked={selectedResearchIds.includes(paper.id)} onChange={event => setSelectedResearchIds(current => event.target.checked ? [...current, paper.id] : current.filter(id => id !== paper.id))} className="h-4 w-4 rounded text-brand" />
                    <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                    <div className="flex min-w-0 items-center gap-3">
                      {paper.coverImage ? <img src={paper.coverImage} alt="" className="h-14 w-16 shrink-0 rounded-xl object-cover" /> : <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-brand-light text-brand"><Award className="h-5 w-5" /></span>}
                      <div className="min-w-0"><h3 className="truncate text-xs font-bold text-slate-800">{paper.titleVi || 'Công trình chưa đặt tên'}</h3><p className="mt-1 truncate text-[10px] font-medium text-slate-500">{paper.authors.join(', ')}</p><p className="mt-1 truncate text-[10px] italic text-slate-400">{paper.journalOrConference || 'Chưa có nơi công bố'}</p></div>
                    </div>
                    <div><span className="rounded-lg bg-brand-light px-2.5 py-1 text-[10px] font-bold uppercase text-brand">{paper.type}</span><p className="mt-2 text-[10px] font-semibold text-slate-500">{paper.publishYear}</p></div>
                    <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">Đã cập nhật</span>
                    <div className="text-[10px] font-semibold text-slate-600"><p>{(paper.viewCount || 0).toLocaleString('vi-VN')} lượt xem</p><p className="mt-1 text-slate-400">{(paper.downloadCount || 0).toLocaleString('vi-VN')} lượt tải</p></div>
                    <div className="flex justify-center gap-1.5">{paper.citationApa && <button onClick={() => handleCopyCitation(paper.citationApa)} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" title="Sao chép trích dẫn"><Copy className="h-3.5 w-3.5" /></button>}<button onClick={() => setEditingResearch(paper)} className="rounded-xl bg-brand-light p-2 text-brand hover:bg-brand/15" title="Chỉnh sửa"><Edit3 className="h-3.5 w-3.5" /></button><button onClick={() => handleDeleteResearch(paper.id)} className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100" title="Xóa"><Trash2 className="h-3.5 w-3.5" /></button></div>
                  </div>
                ))}
                {!filteredResearch.length && <div className="py-12 text-center text-xs font-semibold text-slate-400">Chưa có công trình nghiên cứu phù hợp.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDITING / ADDING RESEARCH FORM */}
      {activeSubTab === 'research' && editingResearch && (
        <form onSubmit={handleSaveResearch} className="bg-slate-50 p-6 sm:p-8 rounded-2xl space-y-6 max-w-5xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <Award className="w-5 h-5 text-brand" />
              <span>Thuyết minh thông tin Nghiên cứu</span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingResearch(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold uppercase tracking-wider"
            >
              Quay lại danh sách
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Tiêu đề bài báo tiếng Việt *</label>
                <input
                  type="text"
                  required
                  value={editingResearch.titleVi}
                  onChange={(e) => setEditingResearch({ ...editingResearch, titleVi: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Tiêu đề bài báo tiếng Anh (Title English)</label>
                <input
                  type="text"
                  value={editingResearch.titleEn}
                  onChange={(e) => setEditingResearch({ ...editingResearch, titleEn: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Phân loại ấn phẩm</label>
                  <select
                    value={editingResearch.type}
                    onChange={(e) => setEditingResearch({ ...editingResearch, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                  >
                    <option value="article">Bài báo khoa học</option>
                    <option value="conference">Hội thảo khoa học (Conference)</option>
                    <option value="project">Đề tài nghiên cứu</option>
                    <option value="book">Sách chuyên khảo</option>
                    <option value="book_chapter">Chương sách chuyên khảo</option>
                    <option value="thesis">Luận văn / luận án</option>
                    <option value="report">Báo cáo khoa học</option>
                    <option value="proceedings">Kỷ yếu hội thảo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Năm xuất bản</label>
                  <input
                    type="number"
                    value={editingResearch.publishYear}
                    onChange={(e) => setEditingResearch({ ...editingResearch, publishYear: parseInt(e.target.value) || new Date().getFullYear() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Đơn vị công tác lúc công bố (Affiliation)</label>
                <input
                  type="text"
                  value={editingResearch.affiliation}
                  onChange={(e) => setEditingResearch({ ...editingResearch, affiliation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Tạp chí / Kỷ yếu hội thảo đăng cai</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tạp chí Mỹ thuật & Điện ảnh Việt Nam"
                  value={paperField('journalOrConference')}
                  onChange={(e) => setEditingResearch({ ...editingResearch, journalOrConference: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Volume</label>
                  <input
                    type="text"
                    value={paperField('volume')}
                    onChange={(e) => setEditingResearch({ ...editingResearch, volume: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Issue</label>
                  <input
                    type="text"
                    value={paperField('issue')}
                    onChange={(e) => setEditingResearch({ ...editingResearch, issue: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Trang số</label>
                  <input
                    type="text"
                    placeholder="120-135"
                    value={paperField('pages')}
                    onChange={(e) => setEditingResearch({ ...editingResearch, pages: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Mã ISSN / ISBN</label>
                  <input
                    type="text"
                    value={paperField('issnOrIsbn')}
                    onChange={(e) => setEditingResearch({ ...editingResearch, issnOrIsbn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Mã định danh DOI</label>
                  <input
                    type="text"
                    value={paperField('doi')}
                    onChange={(e) => setEditingResearch({ ...editingResearch, doi: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Tóm tắt nghiên cứu (Abstract Tiếng Việt)</label>
                <textarea
                  rows={3}
                  value={editingResearch.abstractVi}
                  onChange={(e) => setEditingResearch({ ...editingResearch, abstractVi: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CloudinaryUploadField label="Ảnh đại diện công trình" value={editingResearch.coverImage} onChange={url => setEditingResearch({ ...editingResearch, coverImage: url })} accept="image/*" resourceType="image" folder="portfolio/research/covers" />
                <CloudinaryUploadField label="Tệp PDF công trình" value={editingResearch.pdfUrl} onChange={url => setEditingResearch({ ...editingResearch, pdfUrl: url })} accept="application/pdf" resourceType="raw" folder="portfolio/research/documents" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Phân quyền học liệu</label>
                  <select
                    value={editingResearch.viewPermission}
                    onChange={(e) => setEditingResearch({ ...editingResearch, viewPermission: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                  >
                    <option value="online">Chỉ đọc trực tuyến (Online Only)</option>
                    <option value="abstract_only">Chỉ xem Tóm tắt (Abstract Only)</option>
                    <option value="allow_download">Cho phép Tải xuống tệp PDF</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Trích dẫn tiêu chuẩn APA chuẩn hóa</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Nguyen, A. (2025). Title Vi. Journal, Vol(Issue)..."
                  value={editingResearch.citationApa}
                  onChange={(e) => setEditingResearch({ ...editingResearch, citationApa: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-700">Ghim lên nổi bật mục nghiên cứu</span>
                <input
                  type="checkbox"
                  checked={editingResearch.isPinned}
                  onChange={(e) => setEditingResearch({ ...editingResearch, isPinned: e.target.checked })}
                  className="rounded text-brand w-4 h-4"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setEditingResearch(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase py-2.5 px-6 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase py-2.5 px-6 rounded-xl"
            >
              Lưu bài nghiên cứu
            </button>
          </div>
        </form>
      )}

      {/* SUB-VIEW 2: LECTURES PANEL */}
      {activeSubTab === 'lectures' && !editingLecture && (
        <div className="space-y-6">
          <PortfolioListToolbar
            searchValue={searchLecture}
            onSearchChange={setSearchLecture}
            searchPlaceholder="Tìm theo tên bài giảng, môn học, chủ đề..."
            filters={[
              { label: 'Phân loại', value: filterLectureType, onChange: setFilterLectureType, options: [{ value: 'all', label: 'Tất cả tài liệu' }, ...Array.from(new Set(lectures.map(item => item.documentType))).map(value => ({ value: String(value), label: String(value) }))] },
              { label: 'Môn học', value: filterLectureSubject, onChange: setFilterLectureSubject, options: [{ value: 'all', label: 'Tất cả môn học' }, ...Array.from(new Set(lectures.map(item => item.subject))).map(value => ({ value: String(value), label: String(value) }))] },
              { label: 'Trạng thái', value: filterLectureStatus, onChange: setFilterLectureStatus, options: [{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'published', label: 'Đã xuất bản' }, { value: 'draft', label: 'Bản nháp' }, { value: 'hidden', label: 'Đã ẩn' }] }
            ]}
            selectedCount={selectedLectureIds.length}
            resultCount={filteredLectures.length}
            onSelectAll={() => setSelectedLectureIds(filteredLectures.map(item => item.id))}
            onClearSelection={() => setSelectedLectureIds([])}
            onDeleteSelected={async () => { if (!selectedLectureIds.length || !window.confirm(`Xóa ${selectedLectureIds.length} bài giảng đã chọn?`)) return; await Promise.all(selectedLectureIds.map(deletePortfolioLecture)); setLectures(current => current.filter(item => !selectedLectureIds.includes(item.id))); setSelectedLectureIds([]); triggerSuccess('Đã xóa các bài giảng được chọn.'); }}
            onCreate={() => setEditingLecture(createEmptyLecture())}
            createLabel="Đăng bài giảng"
          />

          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <div className="min-w-[1040px]">
              <div className="grid grid-cols-[40px_54px_minmax(340px,1.8fr)_150px_130px_125px_145px_100px] items-center gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <input type="checkbox" aria-label="Chọn tất cả bài giảng" checked={filteredLectures.length > 0 && filteredLectures.every(item => selectedLectureIds.includes(item.id))} onChange={event => setSelectedLectureIds(event.target.checked ? filteredLectures.map(item => item.id) : [])} className="h-4 w-4 rounded text-brand" /><span>TT</span><span>Bài giảng / Học liệu</span><span>Môn học</span><span>Loại tài liệu</span><span>Trạng thái</span><span>Lượt xem / Tải</span><span className="text-center">Thao tác</span>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredLectures.map((lecture, index) => (
                  <div key={lecture.id} className="grid grid-cols-[40px_54px_minmax(340px,1.8fr)_150px_130px_125px_145px_100px] items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70">
                    <input type="checkbox" aria-label={`Chọn bài giảng ${lecture.title}`} checked={selectedLectureIds.includes(lecture.id)} onChange={event => setSelectedLectureIds(current => event.target.checked ? [...current, lecture.id] : current.filter(id => id !== lecture.id))} className="h-4 w-4 rounded text-brand" />
                    <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                    <div className="flex min-w-0 items-center gap-3"><span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-brand-light text-brand"><FileText className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate text-xs font-bold text-slate-800">{lecture.title || 'Bài giảng chưa đặt tên'}</h3><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">{lecture.detailedContent || lecture.topic || 'Chưa có mô tả nội dung.'}</p></div></div>
                    <span className="text-[10px] font-bold text-slate-600">{lecture.subject}</span>
                    <span className="w-fit rounded-lg bg-brand-light px-2.5 py-1 text-[10px] font-bold uppercase text-brand">{lecture.documentType}</span>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${lecture.status === 'published' ? 'bg-emerald-50 text-emerald-600' : lecture.status === 'hidden' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{lecture.status === 'published' ? 'Đã xuất bản' : lecture.status === 'hidden' ? 'Đã ẩn' : 'Bản nháp'}</span>
                    <div className="text-[10px] font-semibold text-slate-600"><p>{(lecture.viewCount || 0).toLocaleString('vi-VN')} lượt xem</p><p className="mt-1 text-slate-400">{(lecture.downloadCount || 0).toLocaleString('vi-VN')} lượt tải</p></div>
                    <div className="flex justify-center gap-1.5"><button onClick={() => setEditingLecture(lecture)} className="rounded-xl bg-brand-light p-2 text-brand hover:bg-brand/15" title="Chỉnh sửa"><Edit3 className="h-3.5 w-3.5" /></button><button onClick={() => handleDeleteLecture(lecture.id)} className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100" title="Xóa"><Trash2 className="h-3.5 w-3.5" /></button></div>
                  </div>
                ))}
                {!filteredLectures.length && <div className="py-12 text-center text-xs font-semibold text-slate-400">Chưa có bài giảng phù hợp.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDITING / ADDING LECTURE FORM */}
      {activeSubTab === 'lectures' && editingLecture && (
        <form onSubmit={handleSaveLecture} className="bg-slate-50 p-6 sm:p-8 rounded-2xl space-y-6 max-w-4xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <FileText className="w-5 h-5 text-brand" />
              <span>Chỉnh sửa tài liệu Học liệu giảng dạy</span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingLecture(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold uppercase tracking-wider"
            >
              Quay lại danh sách
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Tiêu đề bài giảng *</label>
                <input
                  type="text"
                  required
                  value={editingLecture.title}
                  onChange={(e) => setEditingLecture({ ...editingLecture, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Học phần / Môn học</label>
                  <input
                    type="text"
                    required
                    value={editingLecture.subject}
                    onChange={(e) => setEditingLecture({ ...editingLecture, subject: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Định dạng tài liệu</label>
                  <select
                    value={editingLecture.documentType}
                    onChange={(e) => setEditingLecture({ ...editingLecture, documentType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                  >
                    <option value="theory">Bài giảng lý thuyết</option>
                    <option value="practice">Bài thực hành</option>
                    <option value="curriculum">Giáo trình</option>
                    <option value="slides">Slide bài giảng</option>
                    <option value="video">Video hướng dẫn</option>
                    <option value="assignment">Bài tập</option>
                    <option value="reference">Tài liệu tham khảo</option>
                    <option value="sample_file">File mẫu</option>
                    <option value="rubric">Rubric đánh giá</option>
                    <option value="exam">Đề kiểm tra</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Mô tả tóm tắt nội dung bài học</label>
                <textarea
                  rows={3}
                  value={editingLecture.detailedContent}
                  onChange={(e) => setEditingLecture({ ...editingLecture, detailedContent: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Mức độ bảo mật học liệu</label>
                  <select
                    value={editingLecture.accessPermission}
                    onChange={(e) => setEditingLecture({ ...editingLecture, accessPermission: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                  >
                    <option value="public">Công khai ai cũng xem được (Public)</option>
                    <option value="registered_only">Chỉ thành viên đã đăng nhập</option>
                    <option value="course_students_only">Chỉ học viên lớp học</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Trạng thái phát hành</label>
                  <select
                    value={editingLecture.status}
                    onChange={(e) => setEditingLecture({ ...editingLecture, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs"
                  >
                    <option value="published">Đã xuất bản</option>
                    <option value="draft">Bản nháp (Draft)</option>
                    <option value="hidden">Đã ẩn</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <CloudinaryUploadField label="Video bài giảng" value={editingLecture.videoUrl || ''} onChange={url => setEditingLecture({ ...editingLecture, videoUrl: url })} accept="video/*" resourceType="video" folder="portfolio/lectures/videos" />
              <CloudinaryUploadField label="Tệp PDF tài liệu" value={editingLecture.pdfUrl || ''} onChange={url => setEditingLecture({ ...editingLecture, pdfUrl: url })} accept="application/pdf" resourceType="raw" folder="portfolio/lectures/documents" />
              <CloudinaryUploadField label="Slides trình chiếu" value={editingLecture.slideUrl || ''} onChange={url => setEditingLecture({ ...editingLecture, slideUrl: url })} accept=".pdf,.ppt,.pptx" resourceType="raw" folder="portfolio/lectures/slides" hint="Có thể dán URL Canva/Google Slides." />
              <CloudinaryUploadField label="Tệp thực hành" value={editingLecture.practiceFileUrl || ''} onChange={url => setEditingLecture({ ...editingLecture, practiceFileUrl: url })} accept=".zip,.psd,.aep,.ai,.fig" resourceType="raw" folder="portfolio/lectures/practice" />

              <div className="flex items-center justify-between bg-slate-50 p-4 border border-slate-100 rounded-xl mt-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-700">Cho phép Tải xuống học liệu</p>
                  <p className="text-[10px] text-slate-400">Nếu khóa, người học chỉ được phép xem trực quan.</p>
                </div>
                <input
                  type="checkbox"
                  checked={editingLecture.allowDownload}
                  onChange={(e) => setEditingLecture({ ...editingLecture, allowDownload: e.target.checked })}
                  className="rounded text-brand w-4 h-4"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setEditingLecture(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase py-2.5 px-6 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase py-2.5 px-6 rounded-xl"
            >
              Lưu học liệu bài học
            </button>
          </div>
        </form>
      )}

    </div>
  );

  // Helper safe field reader
  function paperField(key: keyof PortfolioResearch) {
    return (editingResearch as any)[key] || '';
  }
}
