import CategoryManagerModal from './CategoryManagerModal';
import { PortfolioCategory, getPortfolioProjectCategories, savePortfolioProjectCategories, getPortfolioCourseCategories, savePortfolioCourseCategories } from '../../lib/portfolioData';
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, Eye, Copy, Pin, Star, Folder, BookOpen,
  ArrowUp, ArrowDown, ChevronDown, ChevronRight, Play, Users, Mail, ShieldAlert, FileText, Sparkles, LayoutGrid, Award, Lock, DollarSign, Calendar, Settings
, Image, Type, PlayCircle, Code, Box, PenTool, Film, Link as LinkIcon, X, ChevronLeft} from 'lucide-react';
import { PortfolioProject, PortfolioCourse, CourseChapter, CourseLesson, CourseStudent, PortfolioCoursesSettings } from '../portfolioTypes';
import { UserAccount } from '../../types';
import { 
  getPortfolioProjects, savePortfolioProject, deletePortfolioProject,
  getPortfolioCourses, savePortfolioCourse, deletePortfolioCourse,
  getCourseStudents, saveCourseStudent, deleteCourseStudentDoc,
  getPortfolioProjectsSettings, savePortfolioProjectsSettings,
  getPortfolioCoursesSettings, savePortfolioCoursesSettings
} from '../../lib/portfolioData';
import { PortfolioProjectsSettings } from '../portfolioTypes';
import { getUsers } from '../../lib/data';
import CloudinaryUploadField from './CloudinaryUploadField';
import MediaSourcePicker from '../MediaSourcePicker';
import RichTextEditor from './RichTextEditor';
import PortfolioListToolbar from './PortfolioListToolbar';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';

const createEmptyProject = (sortOrder: number): PortfolioProject => ({
  id: `proj_${Date.now()}`, title: '', slug: '', coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800', gallery: [], introVideo: '', briefDescription: '', detailedContent: '', context: '', problem: '', goal: '', targetAudience: '', process: '', designIdea: '', solution: '', result: '', role: 'Multimedia Designer', client: '', members: [], timeline: '', tools: [], category: 'Graphic Design', tags: [], relatedProjects: [], status: 'draft', publishDate: new Date().toISOString().slice(0, 10), isFeatured: false, isPinned: false, viewCount: 0, sortOrder, showViews: true, showShare: true, isPrivate: false
});

const createEmptyCourse = (): PortfolioCourse => ({
  id: `course_${Date.now()}`, title: '', coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800', introVideo: '', briefDescription: '', detailedDescription: '', objectives: [], targetStudents: [], requirements: [], learningOutcomes: [], duration: '10 giờ', level: 'basic', format: 'Online', price: 0, salePrice: 0, hasCertificate: false, documents: [], instructor: 'Alex Nguyễn', category: 'Motion Graphics', status: 'draft', publishDate: new Date().toISOString().slice(0, 10), viewCount: 0, lessonsCount: 0, studentsCount: 0, chapters: [], students: []
} as PortfolioCourse);

export default function ProjectsCoursesCMS({ initialSubTab = 'projects', createOnMount = false, showSubTabs = true }: { initialSubTab?: 'projects' | 'courses'; createOnMount?: boolean; showSubTabs?: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<'projects' | 'courses'>(initialSubTab);
  const [loading, setLoading] = useState(true);
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();

  // Project States
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [searchProj, setSearchProj] = useState('');
  const [projectCategories, setProjectCategories] = useState<PortfolioCategory[]>([]);
  const [courseCategories, setCourseCategories] = useState<PortfolioCategory[]>([]);
  const [categoryModalType, setCategoryModalType] = useState<'project' | 'course' | null>(null);
  const [filterProjCat, setFilterProjCat] = useState('all');
  const [filterProjStatus, setFilterProjStatus] = useState('all');
  const [filterProjYear, setFilterProjYear] = useState('all');
  const [editingProj, setEditingProj] = useState<PortfolioProject | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [projectsSettings, setProjectsSettings] = useState<PortfolioProjectsSettings | null>(null);
  const [showProjSettings, setShowProjSettings] = useState(false);
  const [showProjectPublishModal, setShowProjectPublishModal] = useState(false);

  // Course States
  const [courses, setCourses] = useState<PortfolioCourse[]>([]);
  const [searchCourse, setSearchCourse] = useState('');
  const [filterCourseCategory, setFilterCourseCategory] = useState('all');
  const [filterCourseStatus, setFilterCourseStatus] = useState('all');
  const [filterCourseLevel, setFilterCourseLevel] = useState('all');
  const [editingCourse, setEditingCourse] = useState<PortfolioCourse | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [systemAccounts, setSystemAccounts] = useState<UserAccount[]>([]);
  const [selectedStudentAccountId, setSelectedStudentAccountId] = useState('');
  const [coursesSettings, setCoursesSettings] = useState<PortfolioCoursesSettings | null>(null);
  const [showCourseSettings, setShowCourseSettings] = useState(false);
  
  // Active course builder states
  const [activeCourseEditorTab, setActiveCourseEditorTab] = useState<'info' | 'students'>('info');
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [projList, courseList, studentList, accountList, pSettings, cSettings, projCats, courseCats] = await Promise.all([
          getPortfolioProjects(),
          getPortfolioCourses(),
          getCourseStudents(),
          getUsers(),
          getPortfolioProjectsSettings(),
          getPortfolioCoursesSettings(),
          getPortfolioProjectCategories(),
          getPortfolioCourseCategories()
        ]);
        const coursesWithStudents = courseList.map(course => {
          const linkedStudents = studentList.filter(student => student.courseId === course.id);
          const mergedStudents = Array.from(new Map([...(course.students || []), ...linkedStudents].map(student => [student.id, student])).values());
          return { ...course, students: mergedStudents, studentsCount: mergedStudents.length };
        });
        setProjects(projList);
        setCourses(coursesWithStudents);
        setSystemAccounts(accountList);
        setProjectCategories(projCats || []);
        setCourseCategories(courseCats || []);
        if (pSettings) setProjectsSettings(pSettings);
        if (cSettings) setCoursesSettings(cSettings);
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

  const triggerSuccess = (msg: string) => addNotification(msg, 'success');

  // --- 1. PROJECT ACTIONS ---
  const handleSaveProj = async (requestedStatus: "published" | "draft" | string) => {
    
    if (!editingProj) return;

    
    const projectToSave: PortfolioProject = {
      ...editingProj,
      status: requestedStatus as any,
      publishDate: requestedStatus === 'published' && !editingProj.publishDate
        ? new Date().toISOString().slice(0, 10)
        : editingProj.publishDate
    };

    let updated = [...projects];
    const idx = updated.findIndex(p => p.id === projectToSave.id);
    if (idx >= 0) {
      updated[idx] = projectToSave;
    } else {
      updated.push(projectToSave);
    }
    setProjects(updated);
    await savePortfolioProject(projectToSave);
    setEditingProj(null);
    triggerSuccess(requestedStatus === 'published'
      ? `Đã xuất bản dự án "${projectToSave.title}" thành công!`
      : requestedStatus === 'draft'
        ? `Đã lưu bản nháp dự án "${projectToSave.title}"!`
        : `Đã lưu dự án "${projectToSave.title}" thành công!`);
  };

  const handleDeleteProj = async (id: string) => {
    if (!(await confirm({ title: 'Xác nhận xóa dự án', message: 'Bạn có chắc chắn muốn xóa dự án này?', confirmText: 'Xóa' }))) return;
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
    if (!(await confirm({ title: 'Xác nhận xóa khóa học', message: 'Bạn có chắc chắn muốn xóa khóa học này?', confirmText: 'Xóa' }))) return;
    setCourses(courses.filter(c => c.id !== id));
    await deletePortfolioCourse(id);
    triggerSuccess('Đã xóa khóa học thành công!');
  };

  // --- 3. CURRICULUM BUILDER ACTIONS (REMOVED) ---

  const eligibleStudentAccounts = systemAccounts.filter(account => account.role === 'member');

  const handleAddStudentFromAccount = async () => {
    if (!editingCourse || !selectedStudentAccountId) {
      addNotification('Vui lòng chọn một tài khoản Member để thêm vào khóa học.', 'warning');
      return;
    }
    const account = eligibleStudentAccounts.find(item => item.id === selectedStudentAccountId);
    if (!account) return;
    const currentStudents = editingCourse.students || [];
    if (currentStudents.some(student => student.accountId === account.id || student.email?.toLowerCase() === account.email.toLowerCase())) {
      addNotification('Tài khoản này đã là học viên của khóa học.', 'info');
      return;
    }
    const student: CourseStudent = {
      id: `${editingCourse.id}_${account.id}`,
      accountId: account.id,
      courseId: editingCourse.id,
      name: account.fullName,
      email: account.email,
      studentName: account.fullName,
      studentEmail: account.email,
      progress: 0,
      paymentStatus: 'paid',
      registerDate: new Date().toISOString().slice(0, 10),
      registrationDate: new Date().toISOString().slice(0, 10),
      completedLessons: [],
      isLocked: false
    };
    const students = [...currentStudents, student];
    const updatedCourse = { ...editingCourse, students, studentsCount: students.length };
    setEditingCourse(updatedCourse);
    setCourses(current => current.map(course => course.id === updatedCourse.id ? updatedCourse : course));
    setSelectedStudentAccountId('');
    await Promise.all([saveCourseStudent(student), savePortfolioCourse(updatedCourse)]);
    triggerSuccess(`Đã thêm ${account.fullName} vào khóa học.`);
  };

  const handleRemoveStudent = async (student: CourseStudent) => {
    if (!editingCourse || !(await confirm({ title: 'Xóa học viên khỏi khóa học', message: `Bạn có chắc chắn muốn xóa ${student.name || student.studentName || 'học viên này'} khỏi khóa học?`, confirmText: 'Xóa' }))) return;
    const students = (editingCourse.students || []).filter(item => item.id !== student.id);
    const updatedCourse = { ...editingCourse, students, studentsCount: students.length };
    setEditingCourse(updatedCourse);
    setCourses(current => current.map(course => course.id === updatedCourse.id ? updatedCourse : course));
    await Promise.all([deleteCourseStudentDoc(student.id), savePortfolioCourse(updatedCourse)]);
    triggerSuccess(`Đã xóa ${student.name || student.studentName || 'học viên'} khỏi khóa học.`);
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
      
      {/* Internal Subtabs Selector */}
      {showSubTabs && <div
        className="flex flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-200 pb-4 select-none"
        onWheel={(e) => {
          if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth && e.deltaY !== 0) {
            
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
                setShowProjSettings(false);
                setShowCourseSettings(false);
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
      {activeSubTab === 'projects' && !editingProj && !showProjSettings && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCategoryModalType('project')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-brand cursor-pointer"
            >
              <Folder className="h-4 w-4" /> Quản lý Chuyên mục
            </button>
            <button
              onClick={() => setShowProjSettings(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-brand cursor-pointer"
            >
              <Settings className="h-4 w-4" /> Cài đặt trang Dự án
            </button>
          </div>
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
            onDeleteSelected={async () => { if (!selectedProjectIds.length || !(await confirm({ title: 'Xác nhận xóa nhiều dự án', message: `Bạn có chắc chắn muốn xóa ${selectedProjectIds.length} dự án đã chọn?`, confirmText: 'Xóa' }))) return; await Promise.all(selectedProjectIds.map(deletePortfolioProject)); setProjects(current => current.filter(item => !selectedProjectIds.includes(item.id))); setSelectedProjectIds([]); triggerSuccess('Đã xóa các dự án được chọn.'); }}
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
                      {proj.coverImage?.match(/\.(mp4|mov|webm)$/) || proj.coverImage?.includes('/video/') ? (
                        <div className="h-14 w-16 shrink-0 rounded-xl bg-slate-100 grid place-items-center">
                          <Play className="h-6 w-6 text-slate-400" />
                        </div>
                      ) : (
                        <img src={proj.coverImage} alt={proj.title} className="h-14 w-16 shrink-0 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      )}
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

      
      {/* PROJECT SETTINGS VIEW */}
      {/* SETTINGS PROJECT FORM VIEW */}
      {activeSubTab === 'projects' && showProjSettings && projectsSettings && (
        <div className="space-y-6">
          <form onSubmit={async (e) => {
            
            await savePortfolioProjectsSettings(projectsSettings);
            triggerSuccess('Đã lưu cài đặt trang Dự án thành công!');
            setShowProjSettings(false);
          }} className="flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowProjSettings(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Settings className="w-5 h-5 text-brand" /> Cài đặt trang Dự án
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Cấu hình chung và giao diện banner</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-hover transition-colors">
                  Lưu thay đổi
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100">
                <div className="space-y-8">
                  {/* Basic Settings */}
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Cài đặt chung</h4>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dạng hiển thị bài viết</label>
                        <select value={projectsSettings.layoutStyle || 'grid'} onChange={e => setProjectsSettings({...projectsSettings, layoutStyle: e.target.value as 'grid' | 'list'})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all cursor-pointer">
                           <option value="grid">Dạng lưới (Grid)</option>
                           <option value="list">Dạng danh sách (List)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Số bài viết mỗi chuyên mục</label>
                        <input type="number" min="1" max="20" required value={projectsSettings.postsPerCategory} onChange={e => setProjectsSettings({...projectsSettings, postsPerCategory: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all" />
                      </div>
                    </div>
                  </div>
                  
                  <hr className="border-slate-100" />

                  {/* Banner Settings */}
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Cài đặt Ảnh bìa (Banner)</h4>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                        <div>
                          <label className="text-sm font-bold text-slate-700">Hiển thị Tiêu đề & Mô tả</label>
                          <p className="text-[11px] text-slate-500 mt-0.5">Bật/tắt việc hiển thị chữ trên banner chính</p>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 cursor-pointer" style={{ backgroundColor: projectsSettings.banner.showText !== false ? '#10b981' : '#cbd5e1' }} onClick={() => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, showText: projectsSettings.banner.showText === false ? true : false}})}>
                          <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (projectsSettings.banner.showText !== false ? "translate-x-6" : "translate-x-1")} />
                        </div>
                      </div>
                      
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tiêu đề Banner</label>
                          <input required value={projectsSettings.banner.title} onChange={e => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, title: e.target.value}})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mô tả Banner</label>
                          <input required value={projectsSettings.banner.description} onChange={e => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, description: e.target.value}})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all" />
                        </div>
                      </div>

{/* Banner Media Selection UI */}
<div className="mt-8 space-y-4">
  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">Hình nền / Video nền Banner</h4>
  
  <div className="flex gap-4">
    <button
      type="button"
      onClick={() => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, mediaType: 'image'}})}
      className={`flex-1 rounded-2xl flex items-center justify-center gap-2 py-4 text-sm font-bold border-2 transition-all ${
        projectsSettings.banner.mediaType !== 'video' 
          ? 'border-brand text-brand bg-white' 
          : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
      }`}
    >
      <Image className="h-5 w-5" /> Sử dụng Hình ảnh
    </button>
    <button
      type="button"
       onClick={() => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, mediaType: 'video'}})}
       className={`flex-1 rounded-2xl flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${
        projectsSettings.banner.mediaType === 'video' 
          ? 'bg-brand border-2 border-brand text-white shadow-sm shadow-brand/20' 
          : 'border-2 border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
      }`}
    >
      <Film className="h-5 w-5" /> Sử dụng Video
    </button>
  </div>

  <div className="pt-6">
    {projectsSettings.banner.mediaType === 'video' ? (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Video nền (.MP4, .WEBM)</label>
          <button type="button" className="text-[11px] font-bold text-brand flex items-center gap-1 hover:text-brand-hover">
            <LinkIcon className="h-3.5 w-3.5" /> Sửa URL thủ công
          </button>
        </div>
        
        {projectsSettings.banner.backgroundVideo ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm">
            <div className="relative h-24 w-40 shrink-0 rounded-2xl overflow-hidden bg-slate-900 border border-slate-100">
              <video src={projectsSettings.banner.backgroundVideo} className="absolute inset-0 h-full w-full object-cover opacity-80" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
                <Play className="h-8 w-8 text-white fill-white drop-shadow-md" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-bold text-slate-800 truncate">
                {projectsSettings.banner.backgroundVideo.split('/').pop()}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5" /> Định dạng Video
              </p>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto px-1">
              <MediaSourcePicker
                onSelect={(url) => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, backgroundVideo: url}})}
                accept="video/*"
                resourceType="video"
                label="Thay đổi"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
              />
              <button
                type="button"
                onClick={() => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, videoUrl: ''}})}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:border-brand/40 hover:bg-slate-50/50 transition-all">
            <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-4">
              <Film className="h-8 w-8" />
            </div>
            <h5 className="text-sm font-bold text-slate-700 mb-2">Chưa có video nền</h5>
            <p className="text-xs text-slate-500 mb-6 max-w-sm">Tải video định dạng mp4, webm hoặc chọn từ thư viện của bạn.</p>
            <MediaSourcePicker
                onSelect={(url) => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, backgroundVideo: url}})}
                accept="video/*"
                resourceType="video"
                label="Chọn Video"
            />
          </div>
        )}
        
        <p className="text-[11px] font-medium text-slate-400 px-2 pt-1">Video sẽ tự động phát chế độ lặp, tắt tiếng ngoài trang chủ.</p>
        
        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 flex items-center justify-between shadow-sm mt-4">
          <div>
            <h5 className="text-sm font-black text-slate-800">Tự động phát lại (Loop)</h5>
            <p className="text-xs font-medium text-slate-500 mt-1">Tự động lặp lại video khi kết thúc.</p>
          </div>
          <div className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer" style={{ backgroundColor: projectsSettings.banner.loopVideo !== false ? '#10b981' : '#e2e8f0' }} onClick={() => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, loopVideo: projectsSettings.banner.loopVideo === false ? true : false}})}>
            <span className={"inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm " + (projectsSettings.banner.loopVideo !== false ? "translate-x-6" : "translate-x-1")} />
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Hình nền (.JPG, .PNG, .WEBP)</label>
          <button type="button" className="text-[11px] font-bold text-brand flex items-center gap-1 hover:text-brand-hover">
            <LinkIcon className="h-3.5 w-3.5" /> Sửa URL thủ công
          </button>
        </div>
        
        {projectsSettings.banner.backgroundImage ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm">
            <div className="relative h-24 w-40 shrink-0 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/50">
              <img src={projectsSettings.banner.backgroundImage} className="absolute inset-0 h-full w-full object-cover" alt="Banner background" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-bold text-slate-800 truncate">
                {projectsSettings.banner.backgroundImage.split('/').pop()}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5" /> Định dạng Hình ảnh
              </p>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto px-1">
              <MediaSourcePicker
                onSelect={(url) => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, backgroundImage: url}})}
                accept="image/*"
                resourceType="image"
                label="Thay đổi"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
              />
              <button
                type="button"
                onClick={() => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, backgroundImage: ''}})}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:border-brand/40 hover:bg-slate-50/50 transition-all">
            <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-4">
              <Image className="h-8 w-8" />
            </div>
            <h5 className="text-sm font-bold text-slate-700 mb-2">Chưa có hình nền</h5>
            <p className="text-xs text-slate-500 mb-6 max-w-sm">Tải ảnh chất lượng cao hoặc chọn từ thư viện để làm ảnh bìa.</p>
            <MediaSourcePicker
                onSelect={(url) => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, backgroundImage: url}})}
                accept="image/*"
                resourceType="image"
                label="Chọn Hình ảnh"
            />
          </div>
        )}
      </div>
    )}
  </div>
</div>
{/* End Media Selection */}

                      {/* Custom Content Block like image 2 */}
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-6">
                        <div className="grid gap-6 sm:grid-cols-3">
                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Căn lề chữ</label>
                              <select value={projectsSettings.banner.alignment} onChange={e => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, alignment: e.target.value as any}})} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all">
                                 <option value="left">Căn trái</option>
                                 <option value="center">Căn giữa</option>
                                 <option value="right">Căn phải</option>
                              </select>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bật/Tắt và Màu màn phủ</label>
                              <div className="flex items-center gap-3">
                                 <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 cursor-pointer" style={{ backgroundColor: projectsSettings.banner.enableOverlay !== false ? '#10b981' : '#cbd5e1' }} onClick={() => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, enableOverlay: projectsSettings.banner.enableOverlay === false ? true : false}})}>
                                    <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (projectsSettings.banner.enableOverlay !== false ? "translate-x-6" : "translate-x-1")} />
                                 </div>
                                 <input type="color" value={projectsSettings.banner.overlayColor || '#000000'} onChange={e => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, overlayColor: e.target.value}})} className="h-10 w-20 rounded border border-slate-200 cursor-pointer" />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">Độ mờ màn phủ ({(projectsSettings.banner.overlayOpacity * 100).toFixed(0)}%)</label>
                              <div className="pt-2">
                                <input type="range" min="0" max="1" step="0.05" value={projectsSettings.banner.overlayOpacity} onChange={e => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, overlayOpacity: Number(e.target.value)}})} className="w-full accent-brand cursor-pointer" />
                              </div>
                           </div>
                        </div>
                        
                        <div className="grid gap-6 sm:grid-cols-2 items-center">
                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">Mức sáng ảnh ({(projectsSettings.banner.brightness).toFixed(0)}%)</label>
                              <div className="pt-2">
                                <input type="range" min="50" max="150" step="1" value={projectsSettings.banner.brightness} onChange={e => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, brightness: Number(e.target.value)}})} className="w-full accent-brand cursor-pointer" />
                              </div>
                           </div>
                           <div className="flex items-center justify-between pt-4 bg-white p-4 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-slate-700">Chuyển động mượt mà</span>
                              <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 cursor-pointer" style={{ backgroundColor: projectsSettings.banner.smoothMotion ? '#10b981' : '#cbd5e1' }} onClick={() => setProjectsSettings({...projectsSettings, banner: {...projectsSettings.banner, smoothMotion: projectsSettings.banner.smoothMotion === false ? true : false}})}>
                                 <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (projectsSettings.banner.smoothMotion ? "translate-x-6" : "translate-x-1")} />
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* COURSE SETTINGS VIEW */}
      {activeSubTab === 'courses' && showCourseSettings && coursesSettings && (
        <div className="space-y-6">
          <form onSubmit={async (e) => {
            
            await savePortfolioCoursesSettings(coursesSettings);
            triggerSuccess('Đã lưu cài đặt trang Khóa học thành công!');
            setShowCourseSettings(false);
          }} className="flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowCourseSettings(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Settings className="w-5 h-5 text-brand" /> Cài đặt trang Khóa học
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Cấu hình chung và giao diện banner khóa học</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-hover transition-colors">
                  Lưu thay đổi
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100">
                <div className="space-y-8">
                  {/* Basic Settings */}
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Cài đặt chung</h4>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dạng hiển thị khóa học</label>
                        <select value={coursesSettings.layoutStyle || 'grid'} onChange={e => setCoursesSettings({...coursesSettings, layoutStyle: e.target.value as 'grid' | 'list'})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all cursor-pointer">
                           <option value="grid">Dạng lưới (Grid)</option>
                           <option value="list">Dạng danh sách (List)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Số khóa học hiển thị tối đa</label>
                        <input type="number" min="1" max="50" required value={coursesSettings.postsPerCategory} onChange={e => setCoursesSettings({...coursesSettings, postsPerCategory: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all" />
                      </div>
                    </div>
                  </div>
                  
                  <hr className="border-slate-100" />

                  {/* Banner Settings */}
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Cài đặt Ảnh bìa (Banner)</h4>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                        <div>
                          <label className="text-sm font-bold text-slate-700">Hiển thị Tiêu đề & Mô tả</label>
                          <p className="text-[11px] text-slate-500 mt-0.5">Bật/tắt việc hiển thị chữ trên banner chính</p>
                        </div>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 cursor-pointer" style={{ backgroundColor: coursesSettings.banner.showText !== false ? '#10b981' : '#cbd5e1' }} onClick={() => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, showText: coursesSettings.banner.showText === false ? true : false}})}>
                          <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (coursesSettings.banner.showText !== false ? "translate-x-6" : "translate-x-1")} />
                        </div>
                      </div>
                      
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tiêu đề Banner</label>
                          <input required value={coursesSettings.banner.title} onChange={e => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, title: e.target.value}})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mô tả Banner</label>
                          <input required value={coursesSettings.banner.description} onChange={e => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, description: e.target.value}})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20 transition-all" />
                        </div>
                      </div>

                      {/* Banner Media Selection UI */}
                      <div className="mt-8 space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">Hình nền / Video nền Banner</h4>
                        
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, mediaType: 'image'}})}
                            className={`flex-1 rounded-2xl flex items-center justify-center gap-2 py-4 text-sm font-bold border-2 transition-all ${
                              coursesSettings.banner.mediaType !== 'video' 
                                ? 'border-brand text-brand bg-white' 
                                : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <Image className="h-5 w-5" /> Sử dụng Hình ảnh
                          </button>
                          <button
                            type="button"
                             onClick={() => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, mediaType: 'video'}})}
                             className={`flex-1 rounded-2xl flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${
                              coursesSettings.banner.mediaType === 'video' 
                                ? 'bg-brand border-2 border-brand text-white shadow-sm shadow-brand/20' 
                                : 'border-2 border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <Film className="h-5 w-5" /> Sử dụng Video
                          </button>
                        </div>

                        <div className="pt-6">
                          {coursesSettings.banner.mediaType === 'video' ? (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Video nền (.MP4, .WEBM)</label>
                                <button type="button" className="text-[11px] font-bold text-brand flex items-center gap-1 hover:text-brand-hover">
                                  <LinkIcon className="h-3.5 w-3.5" /> Sửa URL thủ công
                                </button>
                              </div>
                              
                              {coursesSettings.banner.backgroundVideo ? (
                                <div className="bg-white border border-slate-100 rounded-3xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm">
                                  <div className="relative h-24 w-40 shrink-0 rounded-2xl overflow-hidden bg-slate-900 border border-slate-100">
                                    <video src={coursesSettings.banner.backgroundVideo} className="absolute inset-0 h-full w-full object-cover opacity-80" muted playsInline />
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
                                      <Play className="h-8 w-8 text-white fill-white drop-shadow-md" />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                      {coursesSettings.banner.backgroundVideo.split('/').pop()}
                                    </p>
                                    <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                                      <Film className="h-3.5 w-3.5" /> Định dạng Video
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 self-stretch sm:self-auto px-1">
                                    <MediaSourcePicker
                                      onSelect={(url) => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, backgroundVideo: url}})}
                                      accept="video/*"
                                      resourceType="video"
                                      label="Thay đổi"
                                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, videoUrl: ''}})}
                                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all"
                                    >
                                      <X className="h-5 w-5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:border-brand/40 hover:bg-slate-50/50 transition-all">
                                  <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-4">
                                    <Film className="h-8 w-8" />
                                  </div>
                                  <h5 className="text-sm font-bold text-slate-700 mb-2">Chưa có video nền</h5>
                                  <p className="text-xs text-slate-500 mb-6 max-w-sm">Tải video định dạng mp4, webm hoặc chọn từ thư viện của bạn.</p>
                                  <MediaSourcePicker
                                      onSelect={(url) => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, backgroundVideo: url}})}
                                      accept="video/*"
                                      resourceType="video"
                                      label="Chọn Video"
                                  />
                                </div>
                              )}
                              
                              <p className="text-[11px] font-medium text-slate-400 px-2 pt-1">Video sẽ tự động phát chế độ lặp, tắt tiếng ngoài trang chủ.</p>
                              
                              <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 flex items-center justify-between shadow-sm mt-4">
                                <div>
                                  <h5 className="text-sm font-black text-slate-800">Tự động phát lại (Loop)</h5>
                                  <p className="text-xs font-medium text-slate-500 mt-1">Tự động lặp lại video khi kết thúc.</p>
                                </div>
                                <div className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer" style={{ backgroundColor: coursesSettings.banner.loopVideo !== false ? '#10b981' : '#e2e8f0' }} onClick={() => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, loopVideo: coursesSettings.banner.loopVideo === false ? true : false}})}>
                                  <span className={"inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm " + (coursesSettings.banner.loopVideo !== false ? "translate-x-6" : "translate-x-1")} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Hình nền (.JPG, .PNG, .WEBP)</label>
                                <button type="button" className="text-[11px] font-bold text-brand flex items-center gap-1 hover:text-brand-hover">
                                  <LinkIcon className="h-3.5 w-3.5" /> Sửa URL thủ công
                                </button>
                              </div>
                              
                              {coursesSettings.banner.backgroundImage ? (
                                <div className="bg-white border border-slate-100 rounded-3xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm">
                                  <div className="relative h-24 w-40 shrink-0 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/50">
                                    <img src={coursesSettings.banner.backgroundImage} className="absolute inset-0 h-full w-full object-cover" alt="Banner background" />
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                      {coursesSettings.banner.backgroundImage.split('/').pop()}
                                    </p>
                                    <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                                      <Image className="h-3.5 w-3.5" /> Định dạng Hình ảnh
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 self-stretch sm:self-auto px-1">
                                    <MediaSourcePicker
                                      onSelect={(url) => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, backgroundImage: url}})}
                                      accept="image/*"
                                      resourceType="image"
                                      label="Thay đổi"
                                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, backgroundImage: ''}})}
                                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all"
                                    >
                                      <X className="h-5 w-5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:border-brand/40 hover:bg-slate-50/50 transition-all">
                                  <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-4">
                                    <Image className="h-8 w-8" />
                                  </div>
                                  <h5 className="text-sm font-bold text-slate-700 mb-2">Chưa có hình nền</h5>
                                  <p className="text-xs text-slate-500 mb-6 max-w-sm">Tải ảnh chất lượng cao hoặc chọn từ thư viện để làm ảnh bìa.</p>
                                  <MediaSourcePicker
                                      onSelect={(url) => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, backgroundImage: url}})}
                                      accept="image/*"
                                      resourceType="image"
                                      label="Chọn Hình ảnh"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* End Media Selection */}

                      {/* Custom Content Block like image 2 */}
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-6">
                        <div className="grid gap-6 sm:grid-cols-3">
                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Căn lề chữ</label>
                              <select value={coursesSettings.banner.alignment} onChange={e => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, alignment: e.target.value as any}})} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all">
                                 <option value="left">Căn trái</option>
                                 <option value="center">Căn giữa</option>
                                 <option value="right">Căn phải</option>
                              </select>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bật/Tắt và Màu màn phủ</label>
                              <div className="flex items-center gap-3">
                                 <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 cursor-pointer" style={{ backgroundColor: coursesSettings.banner.enableOverlay !== false ? '#10b981' : '#cbd5e1' }} onClick={() => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, enableOverlay: coursesSettings.banner.enableOverlay === false ? true : false}})}>
                                    <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (coursesSettings.banner.enableOverlay !== false ? "translate-x-6" : "translate-x-1")} />
                                 </div>
                                 <input type="color" value={coursesSettings.banner.overlayColor || '#000000'} onChange={e => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, overlayColor: e.target.value}})} className="h-10 w-20 rounded border border-slate-200 cursor-pointer" />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">Độ mờ màn phủ ({(coursesSettings.banner.overlayOpacity * 100).toFixed(0)}%)</label>
                              <div className="pt-2">
                                <input type="range" min="0" max="1" step="0.05" value={coursesSettings.banner.overlayOpacity} onChange={e => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, overlayOpacity: Number(e.target.value)}})} className="w-full accent-brand cursor-pointer" />
                              </div>
                           </div>
                        </div>
                        
                        <div className="grid gap-6 sm:grid-cols-2 items-center">
                           <div className="space-y-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex justify-between">Mức sáng ảnh ({(coursesSettings.banner.brightness).toFixed(0)}%)</label>
                              <div className="pt-2">
                                <input type="range" min="50" max="150" step="1" value={coursesSettings.banner.brightness} onChange={e => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, brightness: Number(e.target.value)}})} className="w-full accent-brand cursor-pointer" />
                              </div>
                           </div>
                           <div className="flex items-center justify-between pt-4 bg-white p-4 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-slate-700">Chuyển động mượt mà</span>
                              <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 cursor-pointer" style={{ backgroundColor: coursesSettings.banner.smoothMotion ? '#10b981' : '#cbd5e1' }} onClick={() => setCoursesSettings({...coursesSettings, banner: {...coursesSettings.banner, smoothMotion: coursesSettings.banner.smoothMotion === false ? true : false}})}>
                                 <span className={"inline-block h-4 w-4 transform rounded-full bg-white transition-transform " + (coursesSettings.banner.smoothMotion ? "translate-x-6" : "translate-x-1")} />
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* EDITING / ADDING PROJECT FORM VIEW */}
      {activeSubTab === 'projects' && editingProj && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setEditingProj(null)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {editingProj.title || 'Thêm Dự án mới'}
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">Thiết kế nội dung và thông tin dự án</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => handleSaveProj('draft')} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors">
                Lưu bản nháp
              </button>
              <button type="button" onClick={() => handleSaveProj('published')} className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-hover transition-colors">
                Xuất bản Dự án
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Row 1: Setup Information (Moved to top) */}
            <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100">
              <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-brand" /> Cài đặt Thông tin Dự án
              </h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700">Tiêu đề (Bắt buộc)</label>
                  <input type="text" required placeholder="Nhập tiêu đề dự án" value={editingProj.title} onChange={e => setEditingProj({...editingProj, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[\s\W-]+/g, '-')})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">Trạng thái hiển thị</label>
                  <select value={editingProj.status} onChange={e => setEditingProj({...editingProj, status: e.target.value as any})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all">
                    <option value="published">Đã Xuất bản</option>
                    <option value="draft">Bản nháp</option>
                    <option value="hidden">Ẩn</option>
                    <option value="ongoing">Đang thực hiện</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Thể loại dự án</label>
                    <button type="button" onClick={() => setCategoryModalType('project')} className="text-[10px] text-brand hover:underline font-bold">Quản lý</button>
                  </div>
                  <select
                    value={editingProj.category}
                    onChange={e => setEditingProj({...editingProj, category: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all cursor-pointer"
                  >
                    <option value="">Chọn danh mục</option>
                    {projectCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">Năm thực hiện</label>
                  <input type="text" placeholder="Ví dụ: 2025" value={editingProj.timeline} onChange={e => setEditingProj({...editingProj, timeline: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">Công cụ chính</label>
                  <input type="text" placeholder="Ví dụ: Blender" value={editingProj.tools.join(', ')} onChange={e => setEditingProj({...editingProj, tools: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all" />
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700">Thẻ (Tags)</label>
                  <input type="text" placeholder="brand, logo, 2024..." value={editingProj.tags.join(', ')} onChange={e => setEditingProj({...editingProj, tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all" />
                </div>

                <div className="flex gap-4 pt-4 lg:col-span-1 items-center">
                  <div className="flex-1 flex items-center justify-between bg-slate-50 p-3 border border-slate-100 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Nổi bật</span>
                    <input type="checkbox" checked={editingProj.isFeatured} onChange={(e) => setEditingProj({ ...editingProj, isFeatured: e.target.checked })} className="rounded text-brand w-4 h-4 focus:ring-brand cursor-pointer" />
                  </div>
                  <div className="flex-1 flex items-center justify-between bg-slate-50 p-3 border border-slate-100 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Ghim</span>
                    <input type="checkbox" checked={editingProj.isPinned} onChange={(e) => setEditingProj({ ...editingProj, isPinned: e.target.checked })} className="rounded text-brand w-4 h-4 focus:ring-brand cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Design Content (Middle) */}
            <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100">
              <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-brand" /> Thiết kế Nội dung Chi tiết
              </h3>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Bài viết chi tiết (Rich Text)</label>
                  <RichTextEditor 
                    value={editingProj.detailedContent} 
                    onChange={val => setEditingProj({...editingProj, detailedContent: val})} 
                    placeholder="Viết nội dung bài viết giới thiệu dự án của bạn..."
                  />
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Lưới Ảnh (Photo Grid)</label>
                  <CloudinaryUploadField label="" value={editingProj.gallery.join('\n')} onChange={value => setEditingProj({ ...editingProj, gallery: value.split('\n').filter(Boolean) })} accept="image/*" resourceType="image" folder="portfolio/projects/gallery" multiple onMultiple={urls => setEditingProj({ ...editingProj, gallery: [...editingProj.gallery, ...urls] })} hint="Tải lên hoặc dán URL nhiều ảnh (mỗi URL 1 dòng)" />
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Video giới thiệu</label>
                  <CloudinaryUploadField label="" value={editingProj.introVideo || ''} onChange={url => setEditingProj({ ...editingProj, introVideo: url })} accept="video/*" resourceType="video" folder="portfolio/projects/videos" hint="Tải video mp4 hoặc dán URL (YouTube, Vimeo...)" />
                </div>
              </div>
            </div>

            {/* Row 3: Cover Image (Moved to bottom!) */}
            <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100">
              <h3 className="mb-6 text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Image className="w-4 h-4 text-brand" /> Ảnh bìa dự án (Cover Image / Video)
              </h3>
              <div className="grid gap-6 md:grid-cols-2 items-start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700">Tải ảnh bìa hoặc dán liên kết</label>
                    <CloudinaryUploadField label="" value={editingProj.coverImage} onChange={url => setEditingProj({ ...editingProj, coverImage: url })} accept="image/*,video/*" resourceType="auto" folder="portfolio/projects/covers" />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input id="loopVideoProj" type="checkbox" checked={!!editingProj.loopVideo} onChange={e => setEditingProj({...editingProj, loopVideo: e.target.checked})} className="rounded border-slate-300 text-brand focus:ring-brand cursor-pointer" />
                    <label htmlFor="loopVideoProj" className="text-xs font-bold text-slate-700 cursor-pointer">Tự động phát lại video (nếu chọn bìa dạng video)</label>
                  </div>
                </div>
                {editingProj.coverImage && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Xem trước ảnh bìa</label>
                    <div className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img src={editingProj.coverImage} className="w-full h-full object-cover" alt="Cover Preview" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: COURSES PANEL */}
      {activeSubTab === 'courses' && !editingCourse && !showCourseSettings && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCategoryModalType('course')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-brand cursor-pointer"
            >
              <Folder className="h-4 w-4" /> Quản lý Chuyên mục
            </button>
            <button
              onClick={() => setShowCourseSettings(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-brand cursor-pointer"
            >
              <Settings className="h-4 w-4" /> Cài đặt trang Khóa học
            </button>
          </div>
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
            onDeleteSelected={async () => { if (!selectedCourseIds.length || !(await confirm({ title: 'Xác nhận xóa nhiều khóa học', message: `Bạn có chắc chắn muốn xóa ${selectedCourseIds.length} khóa học đã chọn?`, confirmText: 'Xóa' }))) return; await Promise.all(selectedCourseIds.map(deletePortfolioCourse)); setCourses(current => current.filter(item => !selectedCourseIds.includes(item.id))); setSelectedCourseIds([]); triggerSuccess('Đã xóa các khóa học được chọn.'); }}
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
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Lĩnh vực chuyên đề</label>
                        <button type="button" onClick={() => setCategoryModalType('course')} className="text-[10px] text-brand hover:underline font-bold">Quản lý</button>
                      </div>
                      <select
                        value={editingCourse.category}
                        onChange={(e) => setEditingCourse({ ...editingCourse, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                      >
                        <option value="">Chọn danh mục</option>
                        {courseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
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
                      <RichTextEditor 
                        value={editingCourse.detailedDescription} 
                        onChange={val => setEditingCourse({...editingCourse, detailedDescription: val})} 
                        placeholder="Nhập nội dung chi tiết..."
                        minHeight="200px"
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
                          value={editingCourse.learningOutcomes.join('\n')}
                          onChange={(e) => setEditingCourse({ ...editingCourse, learningOutcomes: e.target.value.split('\n').filter(Boolean) })}
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

            {/* SUB-TAB 2: CURRICULUM CHAPTER & LESSONS BUILDER (DISABLED) */}
            {false && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-600">Sơ đồ giáo trình ({editingCourse.chapters.length} Chương)</span>
                  <button
                    type="button"
                    onClick={() => {}}
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
                              onClick={() => {}}
                              className="p-1 bg-white border border-slate-200 rounded hover:text-brand disabled:opacity-40"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={chapIdx === editingCourse.chapters.length - 1}
                              onClick={() => {}}
                              className="p-1 bg-white border border-slate-200 rounded hover:text-brand disabled:opacity-40"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {}}
                              className="bg-brand/15 hover:bg-brand/20 text-brand-hover px-2.5 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm Bài</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {}}
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
                                      onClick={() => {}}
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
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
                  <span className="text-xs font-bold text-slate-700">Học viên đang theo học ({editingCourse.students?.length || 0})</span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select value={selectedStudentAccountId} onChange={event => setSelectedStudentAccountId(event.target.value)} className="min-w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand">
                      <option value="">Chọn tài khoản Member...</option>
                      {eligibleStudentAccounts.map(account => <option key={account.id} value={account.id}>{account.fullName} — {account.email}</option>)}
                    </select>
                    <button type="button" onClick={handleAddStudentFromAccount} className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold uppercase text-white hover:bg-slate-800">+ Thêm học viên</button>
                  </div>
                </div>

                {!eligibleStudentAccounts.length && <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">Chưa có tài khoản Member. Hãy tạo hoặc đổi vai trò tài khoản thành Member trong Quản lý thành viên.</p>}

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
                                onClick={() => handleRemoveStudent(st)}
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

    
      {categoryModalType !== null && (
        <CategoryManagerModal
          categories={categoryModalType === 'project' ? projectCategories : courseCategories}
          setCategories={categoryModalType === 'project' ? setProjectCategories : setCourseCategories}
          onSave={categoryModalType === 'project' ? savePortfolioProjectCategories : savePortfolioCourseCategories}
          onClose={() => setCategoryModalType(null)}
          onCategoryUpdate={async (oldName, newName) => {
            if (categoryModalType === 'project') {
              if (editingProj && editingProj.category === oldName) {
                setEditingProj({...editingProj, category: newName});
              }
              
              // Propagate to all projects
              const updatedProjects = projects.map(p => {
                if (p.category === oldName) {
                  const updated = { ...p, category: newName };
                  savePortfolioProject(updated).catch(console.error);
                  return updated;
                }
                return p;
              });
              setProjects(updatedProjects);
            } else {
              if (editingCourse && editingCourse.category === oldName) {
                setEditingCourse({...editingCourse, category: newName});
              }
              
              // Propagate to all courses
              const updatedCourses = courses.map(c => {
                if (c.category === oldName) {
                  const updated = { ...c, category: newName };
                  savePortfolioCourse(updated).catch(console.error);
                  return updated;
                }
                return c;
              });
              setCourses(updatedCourses);
            }
          }}
          onCategoryDelete={async (deletedName) => {
            if (categoryModalType === 'project') {
              if (editingProj && editingProj.category === deletedName) {
                setEditingProj({...editingProj, category: ''});
              }
              
              // Propagate to all projects
              const updatedProjects = projects.map(p => {
                if (p.category === deletedName) {
                  const updated = { ...p, category: '' };
                  savePortfolioProject(updated).catch(console.error);
                  return updated;
                }
                return p;
              });
              setProjects(updatedProjects);
            } else {
              if (editingCourse && editingCourse.category === deletedName) {
                setEditingCourse({...editingCourse, category: ''});
              }
              
              // Propagate to all courses
              const updatedCourses = courses.map(c => {
                if (c.category === deletedName) {
                  const updated = { ...c, category: '' };
                  savePortfolioCourse(updated).catch(console.error);
                  return updated;
                }
                return c;
              });
              setCourses(updatedCourses);
            }
          }}
        />
      )}
    </div>
  );
}