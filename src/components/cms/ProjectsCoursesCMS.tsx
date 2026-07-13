import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, Eye, Copy, Pin, Check, Star, Folder, BookOpen,
  ArrowUp, ArrowDown, ChevronDown, ChevronRight, Play, Users, Mail, ShieldAlert, FileText, Sparkles, LayoutGrid, Award, Lock, DollarSign, Calendar
} from 'lucide-react';
import { PortfolioProject, PortfolioCourse, CourseChapter, CourseLesson, CourseStudent } from '../portfolioTypes';
import { 
  getPortfolioProjects, savePortfolioProject, deletePortfolioProject,
  getPortfolioCourses, savePortfolioCourse, deletePortfolioCourse
} from '../../lib/portfolioData';
import CloudinaryUploadField from './CloudinaryUploadField';
import PortfolioListToolbar from './PortfolioListToolbar';

const createEmptyProject = (sortOrder: number): PortfolioProject => ({
  id: `proj_${Date.now()}`, title: '', slug: '', coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800', gallery: [], introVideo: '', briefDescription: '', detailedContent: '', context: '', problem: '', goal: '', targetAudience: '', process: '', designIdea: '', solution: '', result: '', role: 'Multimedia Designer', client: '', members: [], timeline: '', tools: [], category: 'Graphic Design', tags: [], relatedProjects: [], status: 'draft', publishDate: new Date().toISOString().slice(0, 10), isFeatured: false, isPinned: false, viewCount: 0, sortOrder, showViews: true, showShare: true, isPrivate: false
});

const createEmptyCourse = (): PortfolioCourse => ({
  id: `course_${Date.now()}`, title: '', coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800', introVideo: '', briefDescription: '', detailedDescription: '', objectives: [], targetStudents: [], requirements: [], learningOutcomes: [], duration: '10 giờ', level: 'basic', format: 'Online', price: 0, salePrice: 0, hasCertificate: false, documents: [], instructor: 'Alex Nguyễn', category: 'Motion Graphics', status: 'draft', publishDate: new Date().toISOString().slice(0, 10), viewCount: 0, lessonsCount: 0, studentsCount: 0, chapters: [], students: [], outcomes: []
} as PortfolioCourse);

export default function ProjectsCoursesCMS({ initialSubTab = 'projects', createOnMount = false, showSubTabs = true }: { initialSubTab?: 'projects' | 'courses'; createOnMount?: boolean; showSubTabs?: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<'projects' | 'courses'>(initialSubTab);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Project States
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [searchProj, setSearchProj] = useState('');
  const [filterProjCat, setFilterProjCat] = useState('all');
  const [filterProjStatus, setFilterProjStatus] = useState('all');
  const [filterProjYear, setFilterProjYear] = useState('all');
  const [editingProj, setEditingProj] = useState<PortfolioProject | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Course States
  const [courses, setCourses] = useState<PortfolioCourse[]>([]);
  const [searchCourse, setSearchCourse] = useState('');
  const [filterCourseCategory, setFilterCourseCategory] = useState('all');
  const [filterCourseStatus, setFilterCourseStatus] = useState('all');
  const [filterCourseLevel, setFilterCourseLevel] = useState('all');
  const [editingCourse, setEditingCourse] = useState<PortfolioCourse | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  
  // Active course builder states
  const [activeCourseEditorTab, setActiveCourseEditorTab] = useState<'info' | 'curriculum' | 'students'>('info');
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [projList, courseList] = await Promise.all([
          getPortfolioProjects(),
          getPortfolioCourses()
        ]);
        setProjects(projList);
        setCourses(courseList);
        if (createOnMount) {
          if (initialSubTab === 'projects') setEditingProj(createEmptyProject(projList.length + 1));
          else setEditingCourse(createEmptyCourse());
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

  // --- 1. PROJECT ACTIONS ---
  const handleSaveProj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProj) return;

    let updated = [...projects];
    const idx = updated.findIndex(p => p.id === editingProj.id);
    if (idx >= 0) {
      updated[idx] = editingProj;
    } else {
      updated.push(editingProj);
    }
    setProjects(updated);
    await savePortfolioProject(editingProj);
    setEditingProj(null);
    triggerSuccess(`Đã lưu dự án "${editingProj.title}" thành công!`);
  };

  const handleDeleteProj = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa dự án này?')) return;
    setProjects(projects.filter(p => p.id !== id));
    await deletePortfolioProject(id);
    triggerSuccess('Xóa dự án thành công!');
  };

  const handleDuplicateProj = async (project: PortfolioProject) => {
    const duplicated: PortfolioProject = {
      ...project,
      id: 'proj_dup_' + Date.now(),
      title: `${project.title} (Bản sao)`,
      slug: `${project.slug}-copy`,
      isFeatured: false,
      isPinned: false,
      viewCount: 0
    };
    const updated = [duplicated, ...projects];
    setProjects(updated);
    await savePortfolioProject(duplicated);
    triggerSuccess('Đã nhân bản dự án thành công!');
  };

  const handleTogglePinProj = async (project: PortfolioProject) => {
    const updatedProj = { ...project, isPinned: !project.isPinned };
    setProjects(projects.map(p => p.id === project.id ? updatedProj : p));
    await savePortfolioProject(updatedProj);
    triggerSuccess(updatedProj.isPinned ? 'Đã ghim dự án lên trang chủ!' : 'Đã gỡ ghim dự án!');
  };

  // --- 2. COURSE ACTIONS ---
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    let updated = [...courses];
    const idx = updated.findIndex(c => c.id === editingCourse.id);
    if (idx >= 0) {
      updated[idx] = editingCourse;
    } else {
      updated.push(editingCourse);
    }
    setCourses(updated);
    await savePortfolioCourse(editingCourse);
    setEditingCourse(null);
    triggerSuccess(`Đã lưu khóa học "${editingCourse.title}" thành công!`);
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khóa học này?')) return;
    setCourses(courses.filter(c => c.id !== id));
    await deletePortfolioCourse(id);
    triggerSuccess('Đã xóa khóa học thành công!');
  };

  // --- 3. CURRICULUM BUILDER ACTIONS ---
  const handleAddChapter = () => {
    if (!editingCourse) return;
    const newChapter: CourseChapter = {
      id: 'chap_' + Date.now(),
      title: `Chương mới ${editingCourse.chapters.length + 1}`,
      description: '',
      sortOrder: editingCourse.chapters.length + 1,
      lessons: []
    };
    const updatedChapters = [...editingCourse.chapters, newChapter];
    setEditingCourse({ ...editingCourse, chapters: updatedChapters });
    setExpandedChapterId(newChapter.id);
  };

  const handleSortChapter = (index: number, direction: 'up' | 'down') => {
    if (!editingCourse) return;
    const chapters = [...editingCourse.chapters];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= chapters.length) return;

    const temp = chapters[index];
    chapters[index] = chapters[targetIdx];
    chapters[targetIdx] = temp;

    const reordered = chapters.map((chap, idx) => ({ ...chap, sortOrder: idx + 1 }));
    setEditingCourse({ ...editingCourse, chapters: reordered });
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!editingCourse || !window.confirm('Bạn có chắc chắn muốn xóa chương này và toàn bộ bài học bên trong?')) return;
    const updatedChapters = editingCourse.chapters.filter(c => c.id !== chapterId);
    setEditingCourse({ ...editingCourse, chapters: updatedChapters });
  };

  const handleAddLesson = (chapterId: string) => {
    if (!editingCourse) return;
    const chapters = editingCourse.chapters.map(chap => {
      if (chap.id === chapterId) {
        const newLesson: CourseLesson = {
          id: 'les_' + Date.now(),
          title: `Bài học mới ${chap.lessons.length + 1}`,
          videoUrl: '',
          duration: 15,
          textContent: '',
          allowPreview: false,
          isRequired: true,
          sortOrder: chap.lessons.length + 1
        };
        return {
          ...chap,
          lessons: [...chap.lessons, newLesson]
        };
      }
      return chap;
    });
    setEditingCourse({ ...editingCourse, chapters });
  };

  const handleDeleteLesson = (chapterId: string, lessonId: string) => {
    if (!editingCourse || !window.confirm('Xóa bài học này?')) return;
    const chapters = editingCourse.chapters.map(chap => {
      if (chap.id === chapterId) {
        return {
          ...chap,
          lessons: chap.lessons.filter(l => l.id !== lessonId)
        };
      }
      return chap;
    });
    setEditingCourse({ ...editingCourse, chapters });
  };

  if (loading) {
    return <div className="p-8 text-center text-xs font-semibold text-slate-500 uppercase tracking-widest">Đang tải phân hệ quản lý Dự án & Khóa học...</div>;
  }

  // Filters projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchProj.toLowerCase()) || 
                          p.tools.some(t => t.toLowerCase().includes(searchProj.toLowerCase()));
    const matchesCat = filterProjCat === 'all' || p.category === filterProjCat;
    const matchesStatus = filterProjStatus === 'all' || p.status === filterProjStatus;
    const matchesYear = filterProjYear === 'all' || p.publishDate?.startsWith(filterProjYear);
    return matchesSearch && matchesCat && matchesStatus && matchesYear;
  });
  const filteredCourses = courses.filter(course => {
    const matchesSearch = `${course.title} ${course.instructor} ${course.category}`.toLowerCase().includes(searchCourse.toLowerCase());
    const matchesCategory = filterCourseCategory === 'all' || course.category === filterCourseCategory;
    const matchesStatus = filterCourseStatus === 'all' || course.status === filterCourseStatus;
    const matchesLevel = filterCourseLevel === 'all' || course.level === filterCourseLevel;
    return matchesSearch && matchesCategory && matchesStatus && matchesLevel;
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

      {/* Internal Subtabs Selector */}
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
          { id: 'projects', label: 'Danh sách Dự án đa phương tiện', icon: Folder },
          { id: 'courses', label: 'Danh sách Khóa học & Học viên', icon: BookOpen },
        ].map(tab => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setEditingProj(null);
                setEditingCourse(null);
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

      {/* SUB-VIEW 1: PROJECTS PANEL */}
      {activeSubTab === 'projects' && !editingProj && (
        <div className="space-y-6">
          <PortfolioListToolbar
            searchValue={searchProj}
            onSearchChange={setSearchProj}
            searchPlaceholder="Tìm theo tên dự án, công cụ, danh mục..."
            filters={[
              { label: 'Phân loại', value: filterProjCat, onChange: setFilterProjCat, options: [{ value: 'all', label: 'Tất cả lĩnh vực' }, ...Array.from(new Set(projects.map(item => item.category))).map(value => ({ value: String(value), label: String(value) }))] },
              { label: 'Trạng thái', value: filterProjStatus, onChange: setFilterProjStatus, options: [{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'published', label: 'Đã xuất bản' }, { value: 'ongoing', label: 'Đang thực hiện' }, { value: 'completed', label: 'Hoàn thành' }, { value: 'draft', label: 'Bản nháp' }] },
              { label: 'Thời gian', value: filterProjYear, onChange: setFilterProjYear, options: [{ value: 'all', label: 'Tất cả thời gian' }, ...Array.from(new Set(projects.map(item => item.publishDate?.slice(0, 4)).filter(Boolean) as string[])).map(value => ({ value, label: value }))] }
            ]}
            selectedCount={selectedProjectIds.length}
            resultCount={filteredProjects.length}
            onSelectAll={() => setSelectedProjectIds(filteredProjects.map(item => item.id))}
            onClearSelection={() => setSelectedProjectIds([])}
            onDeleteSelected={async () => { if (!selectedProjectIds.length || !window.confirm(`Xóa ${selectedProjectIds.length} dự án đã chọn?`)) return; await Promise.all(selectedProjectIds.map(deletePortfolioProject)); setProjects(current => current.filter(item => !selectedProjectIds.includes(item.id))); setSelectedProjectIds([]); triggerSuccess('Đã xóa các dự án được chọn.'); }}
            onCreate={() => setEditingProj(createEmptyProject(projects.length + 1))}
            createLabel="Thêm dự án mới"
          />

          {/* Danh sách dự án — đồng nhất với bảng quản lý Tạp chí */}
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm scrollbar-thin">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[40px_50px_minmax(330px,1.8fr)_150px_120px_100px_120px] items-center gap-3 bg-slate-50/80 px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả dự án"
                  checked={filteredProjects.length > 0 && filteredProjects.every(project => selectedProjectIds.includes(project.id))}
                  onChange={event => setSelectedProjectIds(event.target.checked ? filteredProjects.map(project => project.id) : [])}
                  className="h-4 w-4 rounded text-brand"
                />
                <span>TT</span>
                <span>Dự án</span>
                <span>Danh mục</span>
                <span>Trạng thái</span>
                <span>Lượt xem</span>
                <span className="text-right">Thao tác</span>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredProjects.map((proj, index) => (
                  <div key={proj.id} className="grid grid-cols-[40px_50px_minmax(330px,1.8fr)_150px_120px_100px_120px] items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70">
                    <input
                      type="checkbox"
                      aria-label={`Chọn dự án ${proj.title}`}
                      checked={selectedProjectIds.includes(proj.id)}
                      onChange={event => setSelectedProjectIds(current => event.target.checked ? [...current, proj.id] : current.filter(id => id !== proj.id))}
                      className="h-4 w-4 rounded text-brand"
                    />
                    <span className="text-xs font-bold text-slate-400">{index + 1}</span>

                    <div className="flex min-w-0 items-center gap-3">
                      <img src={proj.coverImage} alt={proj.title} className="h-14 w-16 shrink-0 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-xs font-black text-slate-800">{proj.title}</h3>
                          {proj.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                          {proj.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-brand" />}
                        </div>
                        <p className="mt-1 line-clamp-1 text-[10px] leading-5 text-slate-400">{proj.briefDescription}</p>
                        <div className="mt-1 flex gap-1">{proj.tools.slice(0, 3).map(tool => <span key={tool} className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">{tool}</span>)}</div>
                      </div>
                    </div>

                    <span className="w-fit rounded-full bg-brand-light px-2.5 py-1 text-[9px] font-bold text-brand">{proj.category}</span>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-bold ${proj.status === 'published' || proj.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : proj.status === 'ongoing' ? 'bg-blue-50 text-blue-600' : proj.status === 'hidden' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'}`}>
                      {proj.status === 'published' ? 'Đã xuất bản' : proj.status === 'completed' ? 'Hoàn thành' : proj.status === 'ongoing' ? 'Đang thực hiện' : proj.status === 'hidden' ? 'Đã ẩn' : 'Bản nháp'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{proj.viewCount.toLocaleString('vi-VN')}</span>

                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleTogglePinProj(proj)} className={`rounded-lg p-2 ${proj.isPinned ? 'bg-brand text-white' : 'bg-slate-50 text-slate-500 hover:text-brand'}`} title={proj.isPinned ? 'Gỡ ghim' : 'Ghim lên trang chủ'}><Pin className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDuplicateProj(proj)} className="rounded-lg bg-slate-50 p-2 text-slate-500 hover:text-slate-800" title="Sao chép dự án"><Copy className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditingProj(proj)} className="rounded-lg bg-brand-light p-2 text-brand" title="Sửa dự án"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDeleteProj(proj.id)} className="rounded-lg bg-rose-50 p-2 text-rose-500" title="Xóa dự án"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}

                {filteredProjects.length === 0 && <div className="py-14 text-center text-xs font-semibold text-slate-400">Không tìm thấy dự án phù hợp.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDITING / ADDING PROJECT FORM VIEW */}
      {activeSubTab === 'projects' && editingProj && (
        <form onSubmit={handleSaveProj} className="max-w-5xl space-y-6 rounded-2xl bg-white p-5 sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <Folder className="w-5 h-5 text-brand" />
              <span>{editingProj.title ? `Sửa dự án: ${editingProj.title}` : 'Tạo dự án mới'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setEditingProj(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold uppercase tracking-wider"
            >
              Quay lại danh sách
            </button>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left side inputs: core metadata */}
            <div className="space-y-4 lg:col-span-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tiêu đề dự án *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Brand Identity - Metamorphosis"
                  value={editingProj.title}
                  onChange={(e) => setEditingProj({ ...editingProj, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Đường dẫn rút gọn (Slug) *</label>
                  <input
                    type="text"
                    required
                    placeholder="metamorphosis-identity"
                    value={editingProj.slug}
                    onChange={(e) => setEditingProj({ ...editingProj, slug: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Lĩnh vực thiết kế</label>
                  <select
                    value={editingProj.category}
                    onChange={(e) => setEditingProj({ ...editingProj, category: e.target.value })}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="Graphic Design">Graphic Design</option>
                    <option value="Motion Graphics">Motion Graphics</option>
                    <option value="3D Art">3D Art</option>
                    <option value="Video Editing">Video Editing</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                  </select>
                </div>
              </div>

              <CloudinaryUploadField label="Ảnh bìa đại diện" value={editingProj.coverImage} onChange={url => setEditingProj({ ...editingProj, coverImage: url })} accept="image/*" resourceType="image" folder="portfolio/projects/covers" />

              <CloudinaryUploadField label="Video giới thiệu" value={editingProj.introVideo} onChange={url => setEditingProj({ ...editingProj, introVideo: url })} accept="video/*" resourceType="video" folder="portfolio/projects/videos" hint="Có thể tải video lên Cloudinary hoặc dán URL YouTube/Vimeo." />

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Mô tả ngắn dự án</label>
                <textarea
                  rows={2}
                  required
                  value={editingProj.briefDescription}
                  onChange={(e) => setEditingProj({ ...editingProj, briefDescription: e.target.value })}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold leading-5 text-slate-700 outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nội dung thuyết minh chi tiết</label>
                <textarea
                  rows={4}
                  placeholder="Mô tả cụ thể ý tưởng, tiến trình sáng tạo..."
                  value={editingProj.detailedContent}
                  onChange={(e) => setEditingProj({ ...editingProj, detailedContent: e.target.value })}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold leading-5 text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Right side inputs: design process detail fields */}
            <div className="space-y-4 lg:col-span-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Khách hàng / Client</label>
                  <input
                    type="text"
                    value={editingProj.client}
                    onChange={(e) => setEditingProj({ ...editingProj, client: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Thời gian thực hiện</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 3 tháng (2025)"
                    value={editingProj.timeline}
                    onChange={(e) => setEditingProj({ ...editingProj, timeline: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {/* Tools & Tags inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Công cụ (Dấu phẩy phân cách)</label>
                  <input
                    type="text"
                    placeholder="Photoshop, Illustrator, After Effects"
                    value={editingProj.tools.join(', ')}
                    onChange={(e) => setEditingProj({ ...editingProj, tools: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tags / Nhãn (Dấu phẩy phân cách)</label>
                  <input
                    type="text"
                    placeholder="Branding, Motion Graphics, Concept"
                    value={editingProj.tags.join(', ')}
                    onChange={(e) => setEditingProj({ ...editingProj, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {/* Bento grid fields for Case Study */}
              <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Cấu trúc Case Study thiết kế</span>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <textarea
                    placeholder="Bối cảnh (Context)..."
                    rows={2}
                    value={editingProj.context}
                    onChange={(e) => setEditingProj({ ...editingProj, context: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold leading-5 text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <textarea
                    placeholder="Vấn đề đặt ra (Problem)..."
                    rows={2}
                    value={editingProj.problem}
                    onChange={(e) => setEditingProj({ ...editingProj, problem: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold leading-5 text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <textarea
                    placeholder="Ý tưởng / Khái niệm (Concept)..."
                    rows={2}
                    value={editingProj.designIdea}
                    onChange={(e) => setEditingProj({ ...editingProj, designIdea: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold leading-5 text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <textarea
                    placeholder="Giải pháp thiết kế (Solution)..."
                    rows={2}
                    value={editingProj.solution}
                    onChange={(e) => setEditingProj({ ...editingProj, solution: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold leading-5 text-slate-700 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              {/* Gallery List */}
              <CloudinaryUploadField label="Bộ sưu tập ảnh dự án" value={editingProj.gallery.join('\n')} onChange={value => setEditingProj({ ...editingProj, gallery: value.split('\n').filter(Boolean) })} accept="image/*" resourceType="image" folder="portfolio/projects/gallery" multiple onMultiple={urls => setEditingProj({ ...editingProj, gallery: [...editingProj.gallery, ...urls] })} hint="Chọn nhiều ảnh hoặc nhập mỗi URL trên một dòng." />

              {/* Toggles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                  <span className="text-xs font-bold text-slate-700">Dự án Nổi bật</span>
                  <input
                    type="checkbox"
                    checked={editingProj.isFeatured}
                    onChange={(e) => setEditingProj({ ...editingProj, isFeatured: e.target.checked })}
                    className="rounded text-brand w-4 h-4"
                  />
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                  <span className="text-xs font-bold text-slate-700">Ghim lên Trang chủ</span>
                  <input
                    type="checkbox"
                    checked={editingProj.isPinned}
                    onChange={(e) => setEditingProj({ ...editingProj, isPinned: e.target.checked })}
                    className="rounded text-brand w-4 h-4"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setEditingProj(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-colors"
            >
              Lưu dự án
            </button>
          </div>
        </form>
      )}

      {/* SUB-VIEW 2: COURSES PANEL */}
      {activeSubTab === 'courses' && !editingCourse && (
        <div className="space-y-6">
          <PortfolioListToolbar
            searchValue={searchCourse}
            onSearchChange={setSearchCourse}
            searchPlaceholder="Tìm theo tên khóa học, giảng viên, danh mục..."
            filters={[
              { label: 'Phân loại', value: filterCourseCategory, onChange: setFilterCourseCategory, options: [{ value: 'all', label: 'Tất cả danh mục' }, ...Array.from(new Set(courses.map(item => item.category))).map(value => ({ value: String(value), label: String(value) }))] },
              { label: 'Trạng thái', value: filterCourseStatus, onChange: setFilterCourseStatus, options: [{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'published', label: 'Đã xuất bản' }, { value: 'draft', label: 'Bản nháp' }] },
              { label: 'Trình độ', value: filterCourseLevel, onChange: setFilterCourseLevel, options: [{ value: 'all', label: 'Tất cả trình độ' }, { value: 'basic', label: 'Cơ bản' }, { value: 'intermediate', label: 'Trung cấp' }, { value: 'advanced', label: 'Nâng cao' }] }
            ]}
            selectedCount={selectedCourseIds.length}
            resultCount={filteredCourses.length}
            onSelectAll={() => setSelectedCourseIds(filteredCourses.map(item => item.id))}
            onClearSelection={() => setSelectedCourseIds([])}
            onDeleteSelected={async () => { if (!selectedCourseIds.length || !window.confirm(`Xóa ${selectedCourseIds.length} khóa học đã chọn?`)) return; await Promise.all(selectedCourseIds.map(deletePortfolioCourse)); setCourses(current => current.filter(item => !selectedCourseIds.includes(item.id))); setSelectedCourseIds([]); triggerSuccess('Đã xóa các khóa học được chọn.'); }}
            onCreate={() => setEditingCourse(createEmptyCourse())}
            createLabel="Tạo khóa học mới"
          />

          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <div className="min-w-[940px]">
              <div className="grid grid-cols-[40px_54px_minmax(340px,1.8fr)_140px_130px_150px_100px] items-center gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <input type="checkbox" aria-label="Chọn tất cả khóa học" checked={filteredCourses.length > 0 && filteredCourses.every(item => selectedCourseIds.includes(item.id))} onChange={event => setSelectedCourseIds(event.target.checked ? filteredCourses.map(item => item.id) : [])} className="h-4 w-4 rounded text-brand" /><span>TT</span><span>Khóa học</span><span>Danh mục</span><span>Trạng thái</span><span>Học viên / Bài học</span><span className="text-center">Thao tác</span>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredCourses.map((course, index) => (
                  <div key={course.id} className="grid grid-cols-[40px_54px_minmax(340px,1.8fr)_140px_130px_150px_100px] items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70">
                    <input type="checkbox" aria-label={`Chọn khóa học ${course.title}`} checked={selectedCourseIds.includes(course.id)} onChange={event => setSelectedCourseIds(current => event.target.checked ? [...current, course.id] : current.filter(id => id !== course.id))} className="h-4 w-4 rounded text-brand" />
                    <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={course.coverImage} alt={course.title} className="h-14 w-20 shrink-0 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <h3 className="truncate text-xs font-bold text-slate-800">{course.title || 'Khóa học chưa đặt tên'}</h3>
                        <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{course.briefDescription || `Giảng viên: ${course.instructor}`}</p>
                        <span className="mt-1 inline-block text-[9px] font-bold uppercase text-slate-400">{course.level} · {course.price > 0 ? `${course.price.toLocaleString('vi-VN')} đ` : 'Miễn phí'}</span>
                      </div>
                    </div>
                    <span className="w-fit rounded-lg bg-brand-light px-2.5 py-1 text-[10px] font-bold text-brand">{course.category}</span>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${course.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{course.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span>
                    <div className="text-[10px] font-semibold text-slate-600"><p>{course.studentsCount || course.students?.length || 0} học viên</p><p className="mt-1 text-slate-400">{course.lessonsCount || 0} bài học</p></div>
                    <div className="flex justify-center gap-1.5">
                      <button onClick={() => { setEditingCourse(course); setActiveCourseEditorTab('info'); }} className="rounded-xl bg-brand-light p-2 text-brand hover:bg-brand/15" title="Quản lý"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDeleteCourse(course.id)} className="rounded-xl bg-rose-50 p-2 text-rose-500 hover:bg-rose-100" title="Xóa"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
                {!filteredCourses.length && <div className="py-12 text-center text-xs font-semibold text-slate-400">Chưa có khóa học phù hợp.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE COURSE BUILDER / EDITOR MODULE */}
      {activeSubTab === 'courses' && editingCourse && (
        <div className="bg-slate-50 rounded-2xl overflow-hidden max-w-5xl">
          {/* Top Panel Bar */}
          <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-950">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand uppercase tracking-wider">PHÂN HỆ QUẢN TRỊ KHÓA HỌC</span>
              <h3 className="text-sm font-black text-white">{editingCourse.title || 'KHÓA HỌC MỚI'}</h3>
            </div>
            
            <button
              onClick={() => setEditingCourse(null)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest py-2 px-4 rounded-xl"
            >
              Đóng và Quay lại
            </button>
          </div>

          {/* Subtabs for course management */}
          <div className="flex border-b border-slate-200 px-6 bg-slate-50">
            {[
              { id: 'info', label: 'Thông tin cơ bản', icon: FileText },
              { id: 'curriculum', label: 'Cấu trúc bài giảng (Curriculum)', icon: Play },
              { id: 'students', label: 'Danh sách học viên', icon: Users },
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCourseEditorTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors ${
                    activeCourseEditorTab === tab.id
                      ? 'border-brand text-brand bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6 sm:p-8">
            {/* SUB-TAB 1: Core Course Info Form */}
            {activeCourseEditorTab === 'info' && (
              <form onSubmit={handleSaveCourse} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Tiêu đề khóa học *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Kỹ thuật dựng Motion Graphics chuyên sâu"
                        value={editingCourse.title}
                        onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Thời lượng tổng quát</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 12 giờ (24 bài giảng)"
                          value={editingCourse.duration}
                          onChange={(e) => setEditingCourse({ ...editingCourse, duration: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Cấp độ học viên</label>
                        <select
                          value={editingCourse.level}
                          onChange={(e) => setEditingCourse({ ...editingCourse, level: e.target.value as any })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs"
                        >
                          <option value="basic">Cơ bản (Beginner)</option>
                          <option value="intermediate">Trung cấp (Intermediate)</option>
                          <option value="advanced">Chuyên sâu (Advanced)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Lĩnh vực chuyên đề</label>
                      <input
                        type="text"
                        value={editingCourse.category}
                        onChange={(e) => setEditingCourse({ ...editingCourse, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs"
                      />
                    </div>

                    <CloudinaryUploadField label="Ảnh bìa khóa học" value={editingCourse.coverImage} onChange={url => setEditingCourse({ ...editingCourse, coverImage: url })} accept="image/*" resourceType="image" folder="portfolio/courses/covers" />
                    <CloudinaryUploadField label="Video giới thiệu khóa học" value={editingCourse.introVideo} onChange={url => setEditingCourse({ ...editingCourse, introVideo: url })} accept="video/*" resourceType="video" folder="portfolio/courses/videos" />
                  </div>

                  {/* Right hand pricing / outcomes */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Học phí gốc (VND, 0 là Miễn phí)</label>
                        <input
                          type="number"
                          value={editingCourse.price}
                          onChange={(e) => setEditingCourse({ ...editingCourse, price: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Học phí ưu đãi (VND)</label>
                        <input
                          type="number"
                          value={editingCourse.salePrice}
                          onChange={(e) => setEditingCourse({ ...editingCourse, salePrice: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Mô tả ngắn khóa học</label>
                      <textarea
                        rows={2}
                        value={editingCourse.briefDescription}
                        onChange={(e) => setEditingCourse({ ...editingCourse, briefDescription: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Nội dung thuyết minh khóa học</label>
                      <textarea
                        rows={3}
                        value={editingCourse.detailedDescription}
                        onChange={(e) => setEditingCourse({ ...editingCourse, detailedDescription: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs"
                      />
                    </div>

                    {/* Requirements / Outcomes line-breaks */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Yêu cầu đầu vào (Xuống dòng)</label>
                        <textarea
                          rows={2}
                          value={editingCourse.requirements.join('\n')}
                          onChange={(e) => setEditingCourse({ ...editingCourse, requirements: e.target.value.split('\n').filter(Boolean) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Cam kết đầu ra (Xuống dòng)</label>
                        <textarea
                          rows={2}
                          value={editingCourse.outcomes.join('\n')}
                          onChange={(e) => setEditingCourse({ ...editingCourse, outcomes: e.target.value.split('\n').filter(Boolean) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                        />
                      </div>
                    </div>

                    {/* Status option */}
                    <div className="flex items-center justify-between bg-slate-50 p-3.5 border border-slate-100 rounded-xl">
                      <span className="text-xs font-bold text-slate-700">Trạng thái phát hành</span>
                      <select
                        value={editingCourse.status}
                        onChange={(e) => setEditingCourse({ ...editingCourse, status: e.target.value as any })}
                        className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-none"
                      >
                        <option value="draft">Bản nháp (Draft)</option>
                        <option value="published">Xuất bản công khai (Published)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-colors cursor-pointer"
                  >
                    Lưu thông tin khóa học
                  </button>
                </div>
              </form>
            )}

            {/* SUB-TAB 2: CURRICULUM CHAPTER & LESSONS BUILDER */}
            {activeCourseEditorTab === 'curriculum' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-600">Sơ đồ giáo trình ({editingCourse.chapters.length} Chương)</span>
                  <button
                    type="button"
                    onClick={handleAddChapter}
                    className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Chương mới</span>
                  </button>
                </div>

                {editingCourse.chapters.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Giáo trình rỗng. Nhấn "Thêm Chương mới" để bắt đầu xây dựng bài giảng.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {editingCourse.chapters.map((chapter, chapIdx) => (
                      <div key={chapter.id} className="border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/50">
                        
                        {/* Chapter bar */}
                        <div className="bg-slate-50 border-b border-slate-150 p-4 flex items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => setExpandedChapterId(expandedChapterId === chapter.id ? null : chapter.id)}
                            className="flex items-center gap-2 text-left"
                          >
                            {expandedChapterId === chapter.id ? <ChevronDown className="w-4 h-4 text-brand" /> : <ChevronRight className="w-4 h-4 text-brand" />}
                            <span className="text-xs font-bold text-slate-800">Chương {chapIdx + 1}: {chapter.title}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={chapIdx === 0}
                              onClick={() => handleSortChapter(chapIdx, 'up')}
                              className="p-1 bg-white border border-slate-200 rounded hover:text-brand disabled:opacity-40"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={chapIdx === editingCourse.chapters.length - 1}
                              onClick={() => handleSortChapter(chapIdx, 'down')}
                              className="p-1 bg-white border border-slate-200 rounded hover:text-brand disabled:opacity-40"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddLesson(chapter.id)}
                              className="bg-brand/15 hover:bg-brand/20 text-brand-hover px-2.5 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm Bài</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteChapter(chapter.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Chapter Settings Editor Expanded */}
                        {expandedChapterId === chapter.id && (
                          <div className="p-4 bg-white border-b border-slate-100 space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400">Tiêu đề chương *</label>
                              <input
                                type="text"
                                value={chapter.title}
                                onChange={(e) => {
                                  const chapters = [...editingCourse.chapters];
                                  chapters[chapIdx].title = e.target.value;
                                  setEditingCourse({ ...editingCourse, chapters });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* Lessons inside chapter */}
                        {expandedChapterId === chapter.id && (
                          <div className="p-4 space-y-3 bg-slate-50/20">
                            {chapter.lessons.length === 0 ? (
                              <p className="text-center py-4 text-slate-400 text-[11px]">Chưa có bài học trong chương này.</p>
                            ) : (
                              chapter.lessons.map((lesson, lesIdx) => (
                                <div key={lesson.id} className="p-4 bg-white rounded-xl space-y-4 shadow-xs">
                                  <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-2">
                                    <span className="text-[10px] font-bold text-slate-500">Bài {lesIdx + 1}: {lesson.title || 'Mới'}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLesson(chapter.id, lesson.id)}
                                      className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Xóa Bài</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400">Tiêu đề bài học</label>
                                      <input
                                        type="text"
                                        required
                                        value={lesson.title}
                                        onChange={(e) => {
                                          const chapters = editingCourse.chapters.map(chap => {
                                            if (chap.id === chapter.id) {
                                              const lessons = chap.lessons.map(l => l.id === lesson.id ? { ...l, title: e.target.value } : l);
                                              return { ...chap, lessons };
                                            }
                                            return chap;
                                          });
                                          setEditingCourse({ ...editingCourse, chapters });
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-none"
                                      />
                                    </div>

                                    <CloudinaryUploadField
                                      label="Video bài học"
                                      value={lesson.videoUrl || ''}
                                      accept="video/*"
                                      resourceType="video"
                                      folder="portfolio/courses/lessons"
                                      onChange={(url) => {
                                          const chapters = editingCourse.chapters.map(chap => {
                                            if (chap.id === chapter.id) {
                                              const lessons = chap.lessons.map(l => l.id === lesson.id ? { ...l, videoUrl: url } : l);
                                              return { ...chap, lessons };
                                            }
                                            return chap;
                                          });
                                          setEditingCourse({ ...editingCourse, chapters });
                                        }}
                                    />
                                  </div>

                                  {/* Lesson textual summary */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400">Nội dung thuyết minh bài học (Văn bản / Hướng dẫn)</label>
                                    <textarea
                                      rows={2}
                                      value={lesson.textContent}
                                      onChange={(e) => {
                                        const chapters = editingCourse.chapters.map(chap => {
                                          if (chap.id === chapter.id) {
                                            const lessons = chap.lessons.map(l => l.id === lesson.id ? { ...l, textContent: e.target.value } : l);
                                            return { ...chap, lessons };
                                          }
                                          return chap;
                                        });
                                        setEditingCourse({ ...editingCourse, chapters });
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-none"
                                    />
                                  </div>

                                  {/* Preview & requirement flags */}
                                  <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                      <input
                                        type="checkbox"
                                        checked={lesson.allowPreview}
                                        onChange={(e) => {
                                          const chapters = editingCourse.chapters.map(chap => {
                                            if (chap.id === chapter.id) {
                                              const lessons = chap.lessons.map(l => l.id === lesson.id ? { ...l, allowPreview: e.target.checked } : l);
                                              return { ...chap, lessons };
                                            }
                                            return chap;
                                          });
                                          setEditingCourse({ ...editingCourse, chapters });
                                        }}
                                        className="rounded text-brand w-3.5 h-3.5"
                                      />
                                      <span>Cho phép xem thử trước khi đăng ký học</span>
                                    </label>
                                    
                                    <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                      <input
                                        type="checkbox"
                                        checked={lesson.isRequired}
                                        onChange={(e) => {
                                          const chapters = editingCourse.chapters.map(chap => {
                                            if (chap.id === chapter.id) {
                                              const lessons = chap.lessons.map(l => l.id === lesson.id ? { ...l, isRequired: e.target.checked } : l);
                                              return { ...chap, lessons };
                                            }
                                            return chap;
                                          });
                                          setEditingCourse({ ...editingCourse, chapters });
                                        }}
                                        className="rounded text-brand w-3.5 h-3.5"
                                      />
                                      <span>Bắt buộc học để cấp chứng chỉ</span>
                                    </label>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      await savePortfolioCourse(editingCourse);
                      triggerSuccess('Lưu kết cấu giáo trình thành công!');
                    }}
                    className="bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-colors"
                  >
                    Lưu kết cấu giáo trình
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: STUDENTS MANAGEMENT */}
            {activeCourseEditorTab === 'students' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-700">Học viên đang theo học ({editingCourse.students?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const mockSt: CourseStudent = {
                        id: 'stud_' + Date.now(),
                        name: 'Nguyễn Văn ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)),
                        email: `student_${Date.now()}@gmail.com`,
                        progress: 0,
                        paymentStatus: 'paid',
                        registerDate: new Date().toISOString().split('T')[0],
                        completedLessons: []
                      };
                      const list = editingCourse.students ? [...editingCourse.students, mockSt] : [mockSt];
                      setEditingCourse({ ...editingCourse, students: list });
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase"
                  >
                    + Thêm học viên thủ công
                  </button>
                </div>

                {(!editingCourse.students || editingCourse.students.length === 0) ? (
                  <p className="text-center py-8 text-slate-400 text-xs">Chưa có học viên nào ghi danh khóa học này.</p>
                ) : (
                  <div className="border border-slate-150 rounded-2xl overflow-hidden">
                    <table className="w-full border-collapse text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="p-4">Học viên</th>
                          <th className="p-4">Tiến trình học</th>
                          <th className="p-4">Thanh toán</th>
                          <th className="p-4">Ngày ghi danh</th>
                          <th className="p-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {editingCourse.students.map(st => (
                          <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-slate-800">{st.name}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{st.email}</div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                  <div className="h-full bg-brand" style={{ width: `${st.progress}%` }} />
                                </div>
                                <span className="font-bold text-[10px] text-slate-500">{st.progress}%</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                st.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                                {st.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ kiểm duyệt'}
                              </span>
                            </td>
                            <td className="p-4 text-[10px] text-slate-400">{st.registerDate}</td>
                            <td className="p-4 text-right space-x-1.5">
                              {st.progress >= 100 && (
                                <button
                                  type="button"
                                  onClick={() => triggerSuccess(`Đã phê duyệt & cấp Chứng chỉ thành công cho ${st.name}!`)}
                                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded text-[9px] font-black uppercase"
                                >
                                  Cấp Chứng Chỉ
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const list = editingCourse.students.filter(s => s.id !== st.id);
                                  setEditingCourse({ ...editingCourse, students: list });
                                  triggerSuccess(`Đã xóa học viên ${st.name} khỏi khóa học.`);
                                }}
                                className="text-rose-500 hover:bg-rose-50 px-2 py-1 rounded text-[9px] font-black"
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
