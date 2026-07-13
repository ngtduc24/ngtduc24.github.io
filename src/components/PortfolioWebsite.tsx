import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Code2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Film,
  FolderGit2,
  Github,
  GraduationCap,
  Home,
  Layers3,
  Layout,
  Library,
  Linkedin,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Palette,
  Newspaper,
  Phone,
  Play,
  Presentation,
  Quote,
  Search,
  Share2,
  Sparkles,
  UserRound,
  Users,
  Video,
  X
} from 'lucide-react';
import {
  getPortfolioAbout,
  getPortfolioBanner,
  getPortfolioCourses,
  getPortfolioEducation,
  getPortfolioExperience,
  getPortfolioLectures,
  getPortfolioNavigation,
  getPortfolioPosts,
  getPortfolioProjects,
  getPortfolioResearch,
  getPortfolioSkills
} from '../lib/portfolioData';
import {
  PortfolioAbout,
  PortfolioBanner,
  PortfolioCourse,
  PortfolioEducation,
  PortfolioExperience,
  PortfolioLecture,
  PortfolioNavigation,
  PortfolioPost,
  PortfolioProject,
  PortfolioResearch,
  PortfolioSkill
} from './portfolioTypes';

interface PortfolioWebsiteProps {
  onEnterSystem?: () => void;
}

type DetailItem =
  | { type: 'article'; data: PortfolioPost }
  | { type: 'project'; data: PortfolioProject }
  | { type: 'course'; data: PortfolioCourse }
  | { type: 'research'; data: PortfolioResearch }
  | { type: 'lecture'; data: PortfolioLecture };

type CollectionPage = 'projects' | 'courses' | 'research' | 'lectures';

type CollectionCard = {
  id: string;
  type: DetailItem['type'];
  title: string;
  description: string;
  image?: string;
  category: string;
  date: string;
  views: number;
  featured: boolean;
  detail: DetailItem;
};

const collectionPageMeta: Record<CollectionPage, { label: string; eyebrow: string; title: string; description: string }> = {
  projects: { label: 'Dự án', eyebrow: 'Selected work', title: 'Dự án thiết kế đa phương tiện', description: 'Case study, quy trình sáng tạo và những giải pháp thiết kế đã được triển khai.' },
  courses: { label: 'Khóa học', eyebrow: 'Online learning', title: 'Khóa học trực tuyến', description: 'Chương trình học thực hành với video, học liệu và lộ trình được tổ chức rõ ràng.' },
  research: { label: 'Nghiên cứu', eyebrow: 'Academic work', title: 'Nghiên cứu khoa học', description: 'Các công trình, bài báo và xuất bản học thuật trong thiết kế, trải nghiệm và công nghệ.' },
  lectures: { label: 'Bài giảng', eyebrow: 'Learning resources', title: 'Bài giảng & học liệu', description: 'Giáo trình, slide, video và tài liệu thực hành dành cho người học.' }
};

const skillIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Boxes,
  Film,
  Sparkles,
  Code2,
  Layers: Layers3,
  Palette
};

const navigationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  User: UserRound,
  Boxes,
  GraduationCap,
  Briefcase: BriefcaseBusiness,
  FolderGit2,
  BookOpen,
  FileText,
  Presentation,
  Mail,
  Link: ExternalLink,
  Newspaper,
  Video,
  Library,
  Image: Palette,
  Globe2: ExternalLink,
  Phone,
  MapPin,
  Sparkles,
  Layout
};

const researchTypeLabel: Record<PortfolioResearch['type'], string> = {
  article: 'Bài báo khoa học',
  conference: 'Tham luận hội thảo',
  project: 'Đề tài nghiên cứu',
  book: 'Sách chuyên khảo',
  book_chapter: 'Chương sách',
  thesis: 'Luận văn / luận án',
  report: 'Báo cáo khoa học',
  proceedings: 'Kỷ yếu hội thảo'
};

const lectureTypeLabel: Record<PortfolioLecture['documentType'], string> = {
  theory: 'Bài giảng lý thuyết',
  practice: 'Bài thực hành',
  curriculum: 'Giáo trình',
  slides: 'Slide bài giảng',
  video: 'Video hướng dẫn',
  assignment: 'Bài tập',
  reference: 'Tài liệu tham khảo',
  sample_file: 'File mẫu',
  rubric: 'Rubric đánh giá',
  exam: 'Đề kiểm tra'
};

const levelLabel: Record<PortfolioCourse['level'], string> = {
  basic: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao'
};

const sectionShell = 'mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10';

function formatCurrency(value: number) {
  if (value <= 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function scrollToLink(link: string) {
  if (link.startsWith('#')) {
    document.querySelector(link)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  window.open(link, '_blank', 'noopener,noreferrer');
}

function SectionHeading({ eyebrow, title, description, centered = false }: { eyebrow: string; title: string; description: string; centered?: boolean }) {
  return (
    <div className={`max-w-2xl ${centered ? 'mx-auto text-center' : ''}`}>
      <span className="inline-flex items-center rounded-full border border-emerald-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
    </div>
  );
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number; key?: React.Key }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 26 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function DetailModal({ item, onClose }: { item: DetailItem; onClose: () => void }) {
  const courseChapters = item.type === 'course' ? (item.data.chapters || []) : [];
  const courseLessons = courseChapters.flatMap(chapter => chapter.lessons || []);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    if (item.type !== 'course') return [];
    try { return JSON.parse(localStorage.getItem(`portfolio_course_progress_${item.data.id}`) || '[]'); } catch { return []; }
  });
  const [activeLessonId, setActiveLessonId] = useState<string | null>(courseLessons[0]?.id || null);
  const activeLesson = courseLessons.find(lesson => lesson.id === activeLessonId);
  const courseProgress = courseLessons.length ? Math.round((completedLessonIds.filter(id => courseLessons.some(lesson => lesson.id === id)).length / courseLessons.length) * 100) : 0;
  const toggleLessonComplete = (lessonId: string) => {
    if (item.type !== 'course') return;
    const next = completedLessonIds.includes(lessonId) ? completedLessonIds.filter(id => id !== lessonId) : [...completedLessonIds, lessonId];
    setCompletedLessonIds(next);
    localStorage.setItem(`portfolio_course_progress_${item.data.id}`, JSON.stringify(next));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const title = item.type === 'research' ? item.data.titleVi : item.data.title;
  const cover = item.type === 'article' || item.type === 'project' || item.type === 'course' || item.type === 'research' ? item.data.coverImage : item.data.images?.[0];

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.article className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
        <div className="sticky top-0 z-10 flex justify-end p-4">
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-slate-950" aria-label="Đóng cửa sổ chi tiết"><X className="h-5 w-5" /></button>
        </div>
        {cover && <img src={cover} alt="" className="mx-auto -mt-14 h-64 w-[calc(100%-2rem)] rounded-[1.5rem] object-cover sm:h-80" />}
        <div className="p-6 sm:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-600">Chi tiết nội dung</p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-4xl">{title}</h2>

          {item.type === 'article' && (
            <article className="mt-7 text-slate-700">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400"><span>{item.data.author}</span><span>•</span><span>{item.data.publishDate}</span><span>•</span><span>{item.data.category}</span></div>
              <p className="mt-6 text-lg font-semibold leading-8 text-slate-600">{item.data.excerpt}</p>
              <div className="mt-7 whitespace-pre-wrap text-sm leading-8 text-slate-700">{item.data.content}</div>
              <div className="mt-8 flex flex-wrap gap-2">{item.data.tags.map(tag => <span key={tag} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">#{tag}</span>)}</div>
            </article>
          )}

          {item.type === 'project' && (
            <div className="mt-7 space-y-7 text-sm leading-7 text-slate-600">
              <p className="text-base">{item.data.detailedContent || item.data.briefDescription}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[['Vai trò', item.data.role], ['Khách hàng', item.data.client], ['Thời gian', item.data.timeline]].map(([label, value]) => <div key={label} className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>)}
              </div>
              {item.data.tools.length > 0 && <div className="flex flex-wrap gap-2">{item.data.tools.map(tool => <span key={tool} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{tool}</span>)}</div>}
              <div className="grid gap-4 sm:grid-cols-2">{[['Bối cảnh dự án', item.data.context], ['Vấn đề cần giải quyết', item.data.problem], ['Ý tưởng thiết kế', item.data.designIdea], ['Giải pháp & Kết quả', [item.data.solution, item.data.result].filter(Boolean).join('\n\n')]].filter(([, value]) => value).map(([label, value]) => <section key={label} className="rounded-2xl bg-slate-50 p-5"><h3 className="text-xs font-black uppercase tracking-wider text-slate-900">{label}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{value}</p></section>)}</div>
              {item.data.gallery.length > 0 && <div><h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Bộ sưu tập dự án</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{item.data.gallery.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${item.data.title} ${index + 1}`} className="w-full rounded-2xl object-cover" loading="lazy" />)}</div></div>}
            </div>
          )}

          {item.type === 'course' && (
            <div className="mt-7 space-y-6 text-sm leading-7 text-slate-600">
              <p className="text-base">{item.data.detailedDescription || item.data.briefDescription}</p>
              <div className="grid gap-4 sm:grid-cols-3">{[['Trình độ', levelLabel[item.data.level]], ['Thời lượng', item.data.duration], ['Hình thức', item.data.format]].map(([label, value]) => <div key={label} className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>)}</div>
              <div><h3 className="font-black text-slate-900">Bạn sẽ đạt được</h3><ul className="mt-3 grid gap-2">{item.data.learningOutcomes.map(value => <li key={value} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />{value}</li>)}</ul></div>
              <section className="rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Tiến trình học tập</p><p className="mt-1 text-sm font-black">{completedLessonIds.length}/{courseLessons.length} bài đã hoàn thành</p></div><strong className="text-2xl text-emerald-400">{courseProgress}%</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${courseProgress}%` }} /></div></section>
              {activeLesson && <section className="overflow-hidden rounded-2xl bg-slate-950 text-white">{activeLesson.videoUrl && <video src={activeLesson.videoUrl} controls className="aspect-video w-full bg-black" />}{!activeLesson.videoUrl && <div className="grid aspect-video place-items-center bg-slate-900"><Play className="h-12 w-12 text-emerald-400" /></div>}<div className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Bài đang học</p><h3 className="mt-2 text-lg font-black">{activeLesson.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{activeLesson.textContent}</p><button onClick={() => toggleLessonComplete(activeLesson.id)} className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${completedLessonIds.includes(activeLesson.id) ? 'bg-emerald-500 text-white' : 'bg-white text-slate-900'}`}><Check className="h-4 w-4" />{completedLessonIds.includes(activeLesson.id) ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}</button></div></section>}
              <div><h3 className="font-black text-slate-900">Nội dung khóa học</h3><div className="mt-3 space-y-3">{courseChapters.map((chapter, chapterIndex) => <section key={chapter.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><strong className="text-xs text-slate-900">Chương {chapterIndex + 1}: {chapter.title}</strong><span className="text-[10px] font-bold text-slate-400">{(chapter.lessons || []).length} bài</span></div><div className="mt-3 space-y-1">{(chapter.lessons || []).map((lesson, lessonIndex) => <button key={lesson.id} onClick={() => setActiveLessonId(lesson.id)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold ${activeLessonId === lesson.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:text-emerald-700'}`}><span className="flex min-w-0 items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black/5 text-[9px]">{lessonIndex + 1}</span><span className="truncate">{lesson.title}</span></span>{completedLessonIds.includes(lesson.id) ? <Check className="h-4 w-4 shrink-0" /> : lesson.videoUrl ? <Play className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}</button>)}</div></section>)}{!courseChapters.length && <div className="rounded-2xl bg-slate-50 p-5 text-center text-xs text-slate-400">Giáo trình đang được cập nhật.</div>}</div></div>
            </div>
          )}

          {item.type === 'research' && (
            <div className="mt-7 space-y-6 text-sm leading-7 text-slate-600">
              {item.data.titleEn && <p className="font-semibold italic text-slate-500">{item.data.titleEn}</p>}
              <p>{item.data.abstractVi}</p>
              <div className="rounded-2xl bg-slate-50 p-5"><p><strong className="text-slate-900">Tác giả:</strong> {item.data.authors.join(', ')}</p><p><strong className="text-slate-900">Xuất bản:</strong> {item.data.journalOrConference}, {item.data.publishYear}</p><p><strong className="text-slate-900">DOI:</strong> {item.data.doi || 'Chưa cập nhật'}</p></div>
              <div className="flex flex-wrap gap-3">{item.data.publisherUrl && <a href={item.data.publisherUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white">Nguồn xuất bản <ExternalLink className="h-4 w-4" /></a>}{item.data.pdfUrl && item.data.viewPermission === 'allow_download' && <a href={item.data.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700">Tải PDF <Download className="h-4 w-4" /></a>}</div>
            </div>
          )}

          {item.type === 'lecture' && (
            <div className="mt-7 space-y-6 text-sm leading-7 text-slate-600">
              <p>{item.data.detailedContent}</p>
              <div><h3 className="font-black text-slate-900">Mục tiêu học tập</h3><ul className="mt-3 grid gap-2">{item.data.learningObjectives.map(value => <li key={value} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />{value}</li>)}</ul></div>
              <section className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2"><Library className="h-5 w-5 text-emerald-600" /><h3 className="font-black text-slate-900">Cây tài liệu bài giảng</h3></div><div className="mt-4 space-y-2">{[
                { label: 'Video bài giảng', url: item.data.videoUrl, icon: Play, download: false },
                { label: 'Tài liệu PDF', url: item.data.pdfUrl, icon: FileText, download: item.data.allowDownload },
                { label: 'Slide trình chiếu', url: item.data.slideUrl, icon: Presentation, download: item.data.allowDownload },
                { label: 'Tệp thực hành', url: item.data.practiceFileUrl, icon: Download, download: item.data.allowDownload }
              ].filter(file => file.url).map(file => <div key={file.label} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><span className="flex items-center gap-3 text-xs font-bold text-slate-700"><span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><file.icon className="h-4 w-4" /></span>{file.label}</span><div className="flex gap-1"><a href={file.url} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600">Xem</a>{file.download && <a href={file.url} download className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white">Tải về</a>}</div></div>)}{![item.data.videoUrl, item.data.pdfUrl, item.data.slideUrl, item.data.practiceFileUrl].some(Boolean) && <p className="py-4 text-center text-xs text-slate-400">Chưa có tài liệu đính kèm.</p>}</div></section>
            </div>
          )}
        </div>
      </motion.article>
    </motion.div>
  );
}

function CollectionSwitcher({ active, onSelect }: { active: CollectionPage; onSelect: (page: CollectionPage) => void }) {
  return (
    <nav className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1.5 shadow-[0_14px_38px_-20px_rgba(15,23,42,0.35)] ring-1 ring-slate-100 scrollbar-none" aria-label="Chuyên mục Portfolio">
      {(Object.keys(collectionPageMeta) as CollectionPage[]).map((page, index) => (
        <button key={page} onClick={() => onSelect(page)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-black transition ${active === page ? 'bg-emerald-100 text-slate-950' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'}`}>
          {collectionPageMeta[page].label}
          {active === page && <span className="grid h-7 min-w-7 place-items-center rounded-full bg-emerald-900 px-1 text-[10px] text-white">{index + 1}</span>}
        </button>
      ))}
    </nav>
  );
}

function CollectionImage({ card, className = '' }: { card: CollectionCard; className?: string }) {
  if (card.image) return <img src={card.image} alt={card.title} className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${className}`} loading="lazy" />;
  return <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100 text-emerald-700 ${className}`}><FileText className="h-12 w-12" /></div>;
}

function PortfolioCollectionPage({ page, cards, onSelectPage, onOpen }: { page: CollectionPage; cards: CollectionCard[]; onSelectPage: (page: CollectionPage) => void; onOpen: (item: DetailItem) => void }) {
  const meta = collectionPageMeta[page];
  const ordered = [...cards].sort((a, b) => Number(b.featured) - Number(a.featured) || b.date.localeCompare(a.date) || b.views - a.views);
  const hero = ordered[0];
  const secondary = ordered.slice(1, 3);
  const popular = [...ordered].sort((a, b) => b.views - a.views).slice(0, 5);
  const groups = Array.from(new Set(ordered.map(card => card.category || 'Nội dung khác')));

  return (
    <div className="bg-[#f7fbf9] pb-24 pt-28 sm:pt-32">
      <div className={sectionShell}>
        <CollectionSwitcher active={page} onSelect={onSelectPage} />
        <div className="mt-12 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">{meta.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl">{meta.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">{meta.description}</p>
        </div>

        {hero ? (
          <section className="mt-12 grid gap-6 xl:grid-cols-[1.45fr_0.75fr_0.8fr]" aria-label="Nội dung mới và nổi bật">
            <button onClick={() => onOpen(hero.detail)} className="group relative min-h-[430px] overflow-hidden rounded-[2rem] bg-slate-950 text-left shadow-xl sm:min-h-[520px]">
              <CollectionImage card={hero} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
                <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">Mới & nổi bật</span>
                <h2 className="mt-5 text-2xl font-black leading-tight sm:text-4xl">{hero.title}</h2>
                <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-7 text-slate-200">{hero.description}</p>
              </div>
            </button>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
              {secondary.map(card => <button key={card.id} onClick={() => onOpen(card.detail)} className="group overflow-hidden rounded-[1.75rem] bg-white text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl"><div className="aspect-[16/9] overflow-hidden"><CollectionImage card={card} /></div><div className="p-5"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">{card.category}</p><h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-slate-950">{card.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{card.description}</p></div></button>)}
            </div>
            <aside className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <h2 className="text-xl font-black text-slate-950">Được quan tâm</h2>
              <div className="mt-5 divide-y divide-slate-100">{popular.map((card, index) => <button key={card.id} onClick={() => onOpen(card.detail)} className="group flex w-full gap-3 py-4 text-left"><span className="text-xl font-black text-emerald-200 group-hover:text-emerald-500">{String(index + 1).padStart(2, '0')}</span><span><strong className="line-clamp-2 text-sm leading-6 text-slate-800 group-hover:text-emerald-700">{card.title}</strong><small className="mt-1 block text-[10px] font-bold text-slate-400">{card.views.toLocaleString('vi-VN')} lượt xem</small></span></button>)}</div>
            </aside>
          </section>
        ) : <div className="mt-12 rounded-[2rem] bg-white p-12 text-center text-sm text-slate-500">Chưa có nội dung được xuất bản.</div>}

        {groups.map(group => {
          const groupCards = ordered.filter(card => (card.category || 'Nội dung khác') === group);
          return <section key={group} className="mt-20"><div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-5"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Chuyên mục</p><h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{group}</h2></div><span className="text-xs font-bold text-slate-400">{groupCards.length} nội dung</span></div><div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{groupCards.map(card => <button key={card.id} onClick={() => onOpen(card.detail)} className="group overflow-hidden rounded-[1.75rem] bg-white text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl"><div className="aspect-[16/10] overflow-hidden"><CollectionImage card={card} /></div><div className="p-6"><div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider text-emerald-600"><span>{card.category}</span><span className="text-slate-400">{card.date}</span></div><h3 className="mt-3 line-clamp-2 text-xl font-black leading-snug text-slate-950 group-hover:text-emerald-700">{card.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{card.description}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-emerald-700">Xem nội dung <ArrowRight className="h-4 w-4" /></span></div></button>)}</div></section>;
        })}
      </div>
    </div>
  );
}

function PortfolioDetailPage({ item, related, page, onSelectPage, onOpen }: { item: DetailItem; related: CollectionCard[]; page: CollectionPage; onSelectPage: (page: CollectionPage) => void; onOpen: (item: DetailItem) => void }) {
  const title = item.type === 'research' ? item.data.titleVi : item.data.title;
  const image = item.type === 'lecture' ? item.data.images?.[0] : item.data.coverImage;
  const category = item.type === 'project' ? item.data.category : item.type === 'course' ? item.data.category : item.type === 'research' ? (item.data.field || researchTypeLabel[item.data.type]) : item.type === 'lecture' ? (item.data.subject || lectureTypeLabel[item.data.documentType]) : item.data.category;
  const description = item.type === 'project' ? item.data.briefDescription : item.type === 'course' ? item.data.briefDescription : item.type === 'research' ? item.data.abstractVi : item.type === 'lecture' ? item.data.detailedContent : item.data.excerpt;
  const body = item.type === 'project' ? (item.data.detailedContent || item.data.context || item.data.briefDescription) : item.type === 'course' ? (item.data.detailedDescription || item.data.briefDescription) : item.type === 'research' ? (item.data.content || item.data.abstractVi) : item.type === 'lecture' ? item.data.detailedContent : item.data.content;
  return (
    <div className="bg-white pb-24 pt-28 sm:pt-32">
      <div className={sectionShell}><CollectionSwitcher active={page} onSelect={onSelectPage} /></div>
      <div className={`${sectionShell} mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_340px]`}>
        <article>
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">{category}</span>
          <h1 className="mt-6 max-w-5xl text-4xl font-black leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl">{title}</h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-500 sm:text-xl">{description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400"><span>{item.type === 'research' ? item.data.publishYear : item.type === 'article' ? item.data.publishDate : item.type === 'lecture' ? item.data.publishDate : item.data.publishDate}</span><span>•</span><span>{item.type === 'research' ? item.data.authors.join(', ') : item.type === 'article' ? item.data.author : item.type === 'course' ? item.data.instructor : 'Portfolio Artist'}</span></div>
          {image ? <img src={image} alt={title} className="mt-10 aspect-[16/9] w-full rounded-[2rem] object-cover shadow-xl" /> : <div className="mt-10 grid aspect-[16/8] place-items-center rounded-[2rem] bg-gradient-to-br from-emerald-100 to-slate-100 text-emerald-700"><FileText className="h-16 w-16" /></div>}
          <div className="mt-10 whitespace-pre-wrap text-base leading-8 text-slate-700">{body}</div>
          {item.type === 'project' && <div className="mt-10 grid gap-5 sm:grid-cols-2">{[['Bối cảnh', item.data.context], ['Vấn đề', item.data.problem], ['Ý tưởng thiết kế', item.data.designIdea], ['Giải pháp & kết quả', [item.data.solution, item.data.result].filter(Boolean).join('\n\n')]].filter(([, value]) => value).map(([label, value]) => <section key={label} className="rounded-3xl bg-[#effaf5] p-6"><h2 className="font-black text-slate-950">{label}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{value}</p></section>)}</div>}
          {item.type === 'course' && <div className="mt-10 space-y-4"><h2 className="text-2xl font-black text-slate-950">Nội dung khóa học</h2>{(item.data.chapters || []).map((chapter, index) => <section key={chapter.id} className="rounded-2xl bg-slate-50 p-5"><strong className="text-sm text-slate-950">Chương {index + 1}: {chapter.title}</strong><div className="mt-3 space-y-2">{(chapter.lessons || []).map(lesson => <div key={lesson.id} className="flex items-center gap-3 rounded-xl bg-white p-3 text-xs font-bold text-slate-600"><Play className="h-4 w-4 text-emerald-600" />{lesson.title}</div>)}</div></section>)}</div>}
          {item.type === 'research' && <div className="mt-10 rounded-3xl bg-[#effaf5] p-6 text-sm leading-7 text-slate-700"><p><strong>Tác giả:</strong> {item.data.authors.join(', ')}</p><p><strong>Nguồn:</strong> {item.data.journalOrConference}, {item.data.publishYear}</p><p><strong>DOI:</strong> {item.data.doi || 'Chưa cập nhật'}</p></div>}
          {item.type === 'lecture' && <div className="mt-10 rounded-3xl bg-[#effaf5] p-6"><h2 className="text-xl font-black text-slate-950">Tài liệu bài giảng</h2><div className="mt-4 grid gap-3">{[{ label: 'Video bài giảng', url: item.data.videoUrl }, { label: 'Tài liệu PDF', url: item.data.pdfUrl }, { label: 'Slide trình chiếu', url: item.data.slideUrl }, { label: 'Tệp thực hành', url: item.data.practiceFileUrl }].filter(file => file.url).map(file => <a key={file.label} href={file.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-white p-4 text-sm font-bold text-slate-700 hover:text-emerald-700"><span className="flex items-center gap-3"><FileText className="h-5 w-5 text-emerald-600" />{file.label}</span><ExternalLink className="h-4 w-4" /></a>)}</div></div>}
        </article>
        <aside className="xl:sticky xl:top-32 xl:self-start"><h2 className="text-2xl font-black text-slate-950">Nội dung liên quan</h2><div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">{related.slice(0, 5).map(card => <button key={card.id} onClick={() => onOpen(card.detail)} className="group flex w-full gap-4 py-5 text-left"><div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl"><CollectionImage card={card} /></div><div><p className="text-[10px] font-black uppercase text-emerald-600">{card.category}</p><h3 className="mt-1 line-clamp-3 text-sm font-black leading-5 text-slate-800 group-hover:text-emerald-700">{card.title}</h3></div></button>)}</div></aside>
      </div>
    </div>
  );
}

export default function PortfolioWebsite({ onEnterSystem = () => {} }: PortfolioWebsiteProps) {
  const [banner, setBanner] = useState<PortfolioBanner | null>(null);
  const [about, setAbout] = useState<PortfolioAbout | null>(null);
  const [education, setEducation] = useState<PortfolioEducation[]>([]);
  const [experience, setExperience] = useState<PortfolioExperience[]>([]);
  const [skills, setSkills] = useState<PortfolioSkill[]>([]);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [courses, setCourses] = useState<PortfolioCourse[]>([]);
  const [research, setResearch] = useState<PortfolioResearch[]>([]);
  const [lectures, setLectures] = useState<PortfolioLecture[]>([]);
  const [navigation, setNavigation] = useState<PortfolioNavigation[]>([]);
  const [posts, setPosts] = useState<PortfolioPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('banner');
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [collectionPage, setCollectionPage] = useState<CollectionPage | null>(() => {
    const page = new URLSearchParams(window.location.search).get('page');
    return page === 'projects' || page === 'courses' || page === 'research' || page === 'lectures' ? page : null;
  });
  const [projectFilter, setProjectFilter] = useState('Tất cả');
  const [researchQuery, setResearchQuery] = useState('');
  const mobileNavigationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getPortfolioBanner(), getPortfolioAbout(), getPortfolioEducation(), getPortfolioExperience(), getPortfolioSkills(),
      getPortfolioProjects(), getPortfolioCourses(), getPortfolioResearch(), getPortfolioLectures(), getPortfolioNavigation(), getPortfolioPosts()
    ]).then(([bannerData, aboutData, educationData, experienceData, skillData, projectData, courseData, researchData, lectureData, navigationData, postData]) => {
      if (!mounted) return;
      setBanner(bannerData);
      setAbout(aboutData);
      setEducation(educationData.sort((a, b) => a.sortOrder - b.sortOrder));
      setExperience(experienceData.sort((a, b) => a.sortOrder - b.sortOrder));
      setSkills(skillData.filter(item => item.visible).sort((a, b) => a.sortOrder - b.sortOrder));
      setProjects(projectData.filter(item => item.status === 'published' || item.status === 'completed' || item.status === 'ongoing').sort((a, b) => a.sortOrder - b.sortOrder));
      setCourses(courseData.filter(item => item.status === 'published'));
      setResearch(researchData);
      setLectures(lectureData.filter(item => item.status === 'published'));
      setNavigation(navigationData);
      setPosts(postData.filter(item => item.status === 'published'));
      const params = new URLSearchParams(window.location.search);
      const requestedProject = projectData.find(item => item.id === params.get('project'));
      const requestedCourse = courseData.find(item => item.id === params.get('course'));
      const requestedPost = postData.find(item => item.id === params.get('post') && item.status === 'published');
      const requestedResearch = researchData.find(item => item.id === params.get('research'));
      const requestedLecture = lectureData.find(item => item.id === params.get('lecture') && item.status === 'published');
      if (requestedProject) setDetail({ type: 'project', data: requestedProject });
      if (requestedCourse) setDetail({ type: 'course', data: requestedCourse });
      if (requestedPost) setDetail({ type: 'article', data: requestedPost });
      if (requestedResearch) setDetail({ type: 'research', data: requestedResearch });
      if (requestedLecture) setDetail({ type: 'lecture', data: requestedLecture });
    }).catch(console.error).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const ids = ['banner', 'skills', 'about', 'education', 'experience', 'projects', 'courses', 'research', 'lectures', 'contact'];
    const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting && setActiveSection(entry.target.id)), { rootMargin: '-35% 0px -55%', threshold: 0 });
    ids.forEach(id => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [loading]);

  const menuItems = navigation.filter(item => item.visible && (!item.parentId || navigation.some(parent => parent.id === item.parentId && parent.visible)));
  const desktopMenuItems = menuItems.filter(item => !item.parentId && item.deviceVisibility !== 'mobile').sort((a, b) => a.sortOrder - b.sortOrder);
  const menuChildren = (parentId: string) => menuItems.filter(item => item.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const mobileRoots = menuItems.filter(item => !item.parentId && item.deviceVisibility !== 'desktop').sort((a, b) => a.sortOrder - b.sortOrder);
  const mobileMenuItems = mobileRoots.flatMap(parent => [
    parent,
    ...menuChildren(parent.id).filter(child => child.deviceVisibility !== 'desktop')
  ]);
  const collectionFromLink = (link: string): CollectionPage | null => {
    const key = link.replace('#', '');
    return key === 'projects' || key === 'courses' || key === 'research' || key === 'lectures' ? key : null;
  };
  const showCollectionPage = (page: CollectionPage, replace = false) => {
    setDetail(null);
    setCollectionPage(page);
    const url = `?portfolio=true&page=${page}`;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const showHomeSection = (link = '#banner') => {
    setDetail(null);
    setCollectionPage(null);
    window.history.pushState({}, '', `?portfolio=true${link}`);
    window.setTimeout(() => scrollToLink(link), 0);
  };
  const showDetail = (item: DetailItem, replace = false) => {
    const page: CollectionPage = item.type === 'project' ? 'projects' : item.type === 'course' ? 'courses' : item.type === 'lecture' ? 'lectures' : 'research';
    const queryKey = item.type === 'article' ? 'post' : item.type;
    setCollectionPage(page);
    setDetail(item);
    window.history[replace ? 'replaceState' : 'pushState']({}, '', `?portfolio=true&page=${page}&${queryKey}=${item.data.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openMenuItem = (item: PortfolioNavigation) => {
    if (item.kind === 'article' && item.contentId) {
      const post = posts.find(value => value.id === item.contentId);
      if (post) return showDetail({ type: 'article', data: post });
    }
    if (item.kind === 'project' && item.contentId) {
      const project = projects.find(value => value.id === item.contentId);
      if (project) return showDetail({ type: 'project', data: project });
    }
    if (item.kind === 'course' && item.contentId) {
      const course = courses.find(value => value.id === item.contentId);
      if (course) return showDetail({ type: 'course', data: course });
    }
    if (item.link.startsWith('#')) {
      const page = collectionFromLink(item.link);
      if (page) showCollectionPage(page);
      else showHomeSection(item.link);
    } else if (item.target === '_blank') {
      window.open(item.link, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = item.link;
    }
  };
  const handleMobileNavigationWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = mobileNavigationRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;
    event.preventDefault();
    container.scrollLeft += event.deltaY || event.deltaX;
  };
  const categories = useMemo(() => ['Tất cả', ...Array.from(new Set(projects.map(item => item.category)))], [projects]);
  const visibleProjects = projectFilter === 'Tất cả' ? projects : projects.filter(item => item.category === projectFilter);
  const visibleResearch = research.filter(item => `${item.titleVi} ${item.titleEn} ${item.keywordsVi.join(' ')}`.toLowerCase().includes(researchQuery.toLowerCase()));

  const collectionCards = useMemo<Record<CollectionPage, CollectionCard[]>>(() => ({
    projects: projects.map(item => ({ id: item.id, type: 'project', title: item.title, description: item.briefDescription, image: item.coverImage, category: item.category || 'Dự án', date: item.publishDate || item.timeline, views: item.viewCount || 0, featured: Boolean(item.isFeatured || item.isPinned), detail: { type: 'project', data: item } })),
    courses: courses.map(item => ({ id: item.id, type: 'course', title: item.title, description: item.briefDescription, image: item.coverImage, category: item.category || 'Khóa học', date: item.publishDate, views: item.viewCount || 0, featured: false, detail: { type: 'course', data: item } })),
    research: research.map(item => ({ id: item.id, type: 'research', title: item.titleVi, description: item.abstractVi, image: item.coverImage, category: item.field || researchTypeLabel[item.type], date: String(item.publishYear), views: item.viewCount || 0, featured: Boolean(item.isFeatured || item.isPinned), detail: { type: 'research', data: item } })),
    lectures: lectures.map(item => ({ id: item.id, type: 'lecture', title: item.title, description: item.detailedContent, image: item.images?.[0], category: item.subject || lectureTypeLabel[item.documentType], date: item.publishDate, views: item.viewCount || 0, featured: false, detail: { type: 'lecture', data: item } }))
  }), [projects, courses, research, lectures]);

  useEffect(() => {
    const syncRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page');
      const nextPage = page === 'projects' || page === 'courses' || page === 'research' || page === 'lectures' ? page : null;
      setCollectionPage(nextPage);
      const requested = projects.find(item => item.id === params.get('project'));
      const requestedCourse = courses.find(item => item.id === params.get('course'));
      const requestedResearch = research.find(item => item.id === params.get('research'));
      const requestedLecture = lectures.find(item => item.id === params.get('lecture'));
      const requestedPost = posts.find(item => item.id === params.get('post'));
      setDetail(requested ? { type: 'project', data: requested } : requestedCourse ? { type: 'course', data: requestedCourse } : requestedResearch ? { type: 'research', data: requestedResearch } : requestedLecture ? { type: 'lecture', data: requestedLecture } : requestedPost ? { type: 'article', data: requestedPost } : null);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, [projects, courses, research, lectures, posts]);

  if (loading || !banner || !about) {
    return <div className="grid min-h-screen place-items-center bg-[#f7fbf9]"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" /><p className="mt-3 text-sm font-bold text-slate-500">Đang chuẩn bị Portfolio...</p></div></div>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-24 font-sans text-slate-800 selection:bg-emerald-200 selection:text-emerald-950 lg:pb-0">
      <a href="#main-content" className="fixed left-4 top-3 z-[120] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus:translate-y-0">Bỏ qua menu</a>

      <header className="fixed inset-x-0 top-0 z-50 bg-white/70 backdrop-blur-xl">
        <div className={`${sectionShell} flex h-24 items-center justify-between gap-4`}>
          <button onClick={() => showHomeSection('#banner')} className="flex min-w-0 items-center gap-3 text-left" aria-label="Về đầu trang">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-600/20">{about.artistName.charAt(0)}</span>
            <span className="hidden min-w-0 xl:block"><strong className="block truncate text-base font-black tracking-tight text-slate-950">{about.artistName}</strong><span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">Multimedia Portfolio</span></span>
          </button>

          <nav className="hidden items-center gap-1 rounded-full border border-white bg-white/95 p-1.5 shadow-[0_14px_36px_-14px_rgba(15,23,42,0.28)] ring-1 ring-slate-100/80 lg:flex" aria-label="Điều hướng chính">
            {desktopMenuItems.map((item, index) => {
              const section = item.link.replace('#', '');
              const children = menuChildren(item.id).filter(child => child.deviceVisibility !== 'mobile');
              const linkedPage = collectionFromLink(item.link);
              const isActive = linkedPage ? collectionPage === linkedPage : !collectionPage && (activeSection === section || children.some(child => child.link.replace('#', '') === activeSection));
              return (
                <div key={item.id} className="group relative">
                  <button
                    onClick={() => openMenuItem(item)}
                    className={`flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition-all duration-200 ${
                      item.highlight
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700'
                        : isActive
                          ? 'bg-emerald-100 text-slate-950 shadow-sm'
                          : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[9px] font-black ${item.highlight ? 'bg-white/20 text-white' : 'bg-emerald-900 text-white'}`}>
                        {index + 1}
                      </span>
                    )}
                    {!isActive && children.length > 0 && <ChevronDown className="h-3 w-3 text-slate-400" />}
                  </button>
                  {children.length > 0 && (
                    <div className="invisible absolute left-1/2 top-full z-20 min-w-52 -translate-x-1/2 translate-y-3 rounded-2xl border border-slate-100 bg-white p-2 opacity-0 shadow-2xl shadow-slate-900/15 transition group-hover:visible group-hover:translate-y-2 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-2 group-focus-within:opacity-100">
                      {children.map(child => (
                        <button key={child.id} onClick={() => openMenuItem(child)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold ${child.highlight ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                          {React.createElement(navigationIcons[child.icon] || ExternalLink, { className: 'h-3.5 w-3.5' })}{child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={onEnterSystem} aria-label="Đăng nhập quản trị" className="hidden items-center gap-2 rounded-full bg-emerald-600 px-3 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 sm:inline-flex xl:px-4 xl:py-2.5"><LockKeyhole className="h-4 w-4" /><span className="hidden xl:inline">Đăng nhập quản trị</span></button>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Điều hướng trang chủ trên thiết bị di động">
        <div className="mx-auto max-w-xl rounded-[2rem] bg-white/92 p-1.5 pt-5 shadow-[0_-10px_40px_-14px_rgba(15,23,42,0.28)] ring-1 ring-white/80 backdrop-blur-2xl">
          <div
            ref={mobileNavigationRef}
            onWheel={handleMobileNavigationWheel}
            className="flex snap-x snap-mandatory items-end gap-1 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-0.5 pt-1 scrollbar-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {mobileMenuItems.map(item => {
              const itemSection = item.link.replace('#', '');
              const linkedPage = collectionFromLink(item.link);
              const isActive = linkedPage ? collectionPage === linkedPage : !collectionPage && activeSection === itemSection;
              const Icon = navigationIcons[item.icon] || ExternalLink;
              return (
                <button
                  key={item.id}
                  onClick={() => openMenuItem(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex w-[76px] shrink-0 snap-center flex-col items-center justify-end gap-1 rounded-[1.4rem] px-1 pb-2 pt-1 text-center transition-all ${isActive ? 'text-emerald-700' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <span className={`grid place-items-center rounded-full transition-all duration-300 ${isActive ? '-mt-5 h-14 w-14 bg-emerald-500 text-white shadow-[0_10px_22px_-7px_rgba(16,185,129,0.7)] ring-4 ring-white' : 'h-8 w-8'}`}>
                    <Icon className={isActive ? 'h-6 w-6' : 'h-5 w-5'} />
                  </span>
                  <span className={`max-w-full truncate text-[9px] leading-none ${isActive ? 'font-black' : 'font-bold'}`}>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={onEnterSystem}
              className="group flex w-[76px] shrink-0 snap-center flex-col items-center justify-end gap-1 rounded-[1.4rem] px-1 pb-2 pt-1 text-center text-slate-400 transition-all hover:bg-emerald-50 hover:text-emerald-700"
              aria-label="Đăng nhập quản trị"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full"><LockKeyhole className="h-5 w-5" /></span>
              <span className="max-w-full truncate text-[9px] font-bold leading-none">Quản trị</span>
            </button>
          </div>
        </div>
      </nav>

      <main id="main-content">
        {detail ? (
          <PortfolioDetailPage
            item={detail}
            page={collectionPage || (detail.type === 'project' ? 'projects' : detail.type === 'course' ? 'courses' : detail.type === 'lecture' ? 'lectures' : 'research')}
            related={collectionCards[collectionPage || (detail.type === 'project' ? 'projects' : detail.type === 'course' ? 'courses' : detail.type === 'lecture' ? 'lectures' : 'research')].filter(card => card.id !== detail.data.id)}
            onSelectPage={showCollectionPage}
            onOpen={showDetail}
          />
        ) : collectionPage ? (
          <PortfolioCollectionPage page={collectionPage} cards={collectionCards[collectionPage]} onSelectPage={showCollectionPage} onOpen={showDetail} />
        ) : <>
        {banner.visible && (
          <section id="banner" className="scroll-mt-24 bg-gradient-to-b from-white to-[#effaf5] pb-14 pt-28 sm:pt-32">
            <div className={sectionShell}>
              <div className="relative min-h-[650px] overflow-hidden rounded-[2.5rem] bg-slate-950 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)] sm:min-h-[700px]">
                <img src={banner.backgroundImage} alt={banner.altText} className="absolute inset-0 h-full w-full object-cover" style={{ filter: `brightness(${banner.brightness}%)` }} fetchPriority="high" />
                <div className="absolute inset-0" style={{ backgroundColor: banner.overlayColor, opacity: banner.overlayOpacity }} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/10" />
                <motion.div initial={banner.animate ? { opacity: 0, y: 28 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }} className={`relative z-10 flex min-h-[650px] flex-col justify-center p-7 sm:min-h-[700px] sm:p-12 lg:p-20 ${banner.alignment === 'left' ? 'items-start text-left' : banner.alignment === 'right' ? 'items-end text-right' : 'items-center text-center'}`}>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-md"><Sparkles className="h-4 w-4 text-emerald-300" /> Multimedia Designer & Artist</span>
                  <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">{banner.title}</h1>
                  <p className="mt-7 max-w-2xl text-sm leading-7 text-slate-200 sm:text-lg sm:leading-8">{banner.description}</p>
                  <div className="mt-9 flex flex-wrap justify-center gap-3">
                    <button onClick={() => scrollToLink(banner.buttonLink || '#about')} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-400">{banner.buttonText || 'Tìm hiểu thêm'} <ArrowRight className="h-4 w-4" /></button>
                    <button onClick={() => scrollToLink('#about')} className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-black text-white backdrop-blur-md hover:bg-white/20"><UserRound className="h-4 w-4" /> Giới thiệu bản thân</button>
                  </div>
                  <button onClick={() => scrollToLink('#skills')} className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70" aria-label="Cuộn xuống phần kỹ năng">Cuộn để khám phá <ChevronDown className="h-5 w-5 animate-bounce" /></button>
                </motion.div>
              </div>

              <div className="relative z-20 mx-auto -mt-7 grid max-w-6xl gap-px overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-100 shadow-xl shadow-emerald-900/5 sm:grid-cols-2 lg:grid-cols-4">
                {[{ icon: Palette, title: 'Art Direction', text: 'Định hướng hình ảnh nhất quán' }, { icon: Film, title: 'Motion & 3D', text: 'Chuyển động giàu cảm xúc' }, { icon: Code2, title: 'Creative Tech', text: 'Trải nghiệm số tương tác' }, { icon: GraduationCap, title: 'Education', text: 'Chia sẻ tri thức thực hành' }].map(item => <div key={item.title} className="flex items-start gap-4 bg-white p-6"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><item.icon className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-slate-950">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p></div></div>)}
              </div>
            </div>
          </section>
        )}

        <section id="skills" className="scroll-mt-24 bg-[#effaf5] py-24 sm:py-28">
          <div className={sectionShell}>
            <Reveal><SectionHeading eyebrow="Kỹ năng & Dịch vụ" title="Giải pháp sáng tạo từ ý tưởng đến trải nghiệm" description="Kết hợp mỹ thuật, chuyển động và công nghệ để tạo nên những sản phẩm đa phương tiện rõ ràng, đẹp và có giá trị sử dụng." centered /></Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill, index) => { const Icon = skillIcons[skill.icon] || Sparkles; return <Reveal key={skill.id} delay={Math.min(index * 0.06, 0.24)}><article className="group h-full rounded-[1.75rem] border border-emerald-100/80 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/5"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"><Icon className="h-6 w-6" /></span><span className="text-sm font-black text-emerald-600">{skill.proficiency}%</span></div><p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">{skill.category}</p><h3 className="mt-2 text-xl font-black text-slate-950">{skill.name}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{skill.description}</p><div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${skill.proficiency}%` }} /></div></article></Reveal>; })}
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 bg-white py-24 sm:py-28">
          <div className={sectionShell}>
            <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
              <Reveal className="relative"><div className="absolute -inset-5 rounded-[2.5rem] bg-emerald-100/70 blur-2xl" /><img src={about.avatarUrl} alt={`Chân dung ${about.fullName}`} loading="lazy" className="relative aspect-[4/5] w-full rounded-[2.25rem] object-cover shadow-2xl" /><div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/60 bg-white/90 p-5 backdrop-blur"><p className="text-xl font-black text-slate-950">{about.artistName}</p><p className="mt-1 text-xs font-bold text-emerald-600">{about.jobTitle}</p></div></Reveal>
              <Reveal><SectionHeading eyebrow="Giới thiệu bản thân" title={`Xin chào, tôi là ${about.artistName}`} description={about.briefBio} /><p className="mt-6 text-sm leading-8 text-slate-600">{about.detailedAbout}</p><blockquote className="mt-7 rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-5 text-sm font-semibold italic leading-7 text-slate-700"><Quote className="mb-2 h-5 w-5 text-emerald-600" />“{about.creativePhilosophy}”</blockquote><div className="mt-7 flex flex-wrap gap-2">{about.specialties.map(value => <span key={value} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">{value}</span>)}</div>{about.showCvButton && <a href={about.cvUrl || '#'} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"><Download className="h-4 w-4" /> Tải hồ sơ năng lực</a>}</Reveal>
            </div>

            <div className="mt-20 grid gap-8 lg:grid-cols-2">
              <Reveal><div id="education" className="scroll-mt-28"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><GraduationCap className="h-5 w-5" /></span><h3 className="text-2xl font-black text-slate-950">Học vấn</h3></div><div className="mt-6 space-y-4">{education.map(item => <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6"><p className="text-xs font-extrabold text-emerald-600">{item.startDate} — {item.isOngoing ? 'Hiện tại' : item.endDate}</p><h4 className="mt-2 text-base font-black text-slate-950">{item.degree}</h4><p className="mt-1 text-xs font-bold text-slate-500">{item.major} • {item.school}</p><p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>{item.achievement && <p className="mt-3 flex gap-2 text-xs font-bold text-emerald-700"><Award className="h-4 w-4 shrink-0" />{item.achievement}</p>}</article>)}</div></div></Reveal>
              <Reveal delay={0.08}><div id="experience" className="scroll-mt-28"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><BriefcaseBusiness className="h-5 w-5" /></span><h3 className="text-2xl font-black text-slate-950">Kinh nghiệm</h3></div><div className="mt-6 space-y-4">{experience.map(item => <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6"><p className="text-xs font-extrabold text-emerald-600">{item.startDate} — {item.isOngoing ? 'Hiện tại' : item.endDate}</p><h4 className="mt-2 text-base font-black text-slate-950">{item.title}</h4><p className="mt-1 text-xs font-bold text-slate-500">{item.company}</p><p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p></article>)}</div></div></Reveal>
            </div>
          </div>
        </section>

        <section id="projects" className="scroll-mt-24 bg-slate-950 py-20 text-white sm:py-24">
          <div className={sectionShell}>
            <Reveal>
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400">Selected work</span>
                  <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">Dự án được tuyển chọn</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">Những dự án thể hiện rõ nhất cách tôi kết hợp tư duy thiết kế, câu chuyện và công nghệ.</p>
                </div>
                <button onClick={() => showCollectionPage('projects')} className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-black text-white hover:bg-emerald-400">Xem tất cả dự án <ArrowRight className="h-4 w-4" /></button>
              </div>
            </Reveal>
            <div className="mt-7 flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-none">{categories.map(category => <button key={category} onClick={() => setProjectFilter(category)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${projectFilter === category ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{category}</button>)}</div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProjects.slice(0, 6).map((project, index) => <Reveal key={project.id} delay={Math.min(index * 0.05, 0.18)}><button onClick={() => showDetail({ type: 'project', data: project })} className="group h-full w-full overflow-hidden rounded-[1.5rem] bg-white/5 text-left ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/10"><div className="relative aspect-[16/9] overflow-hidden"><img src={project.coverImage} alt={project.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />{project.isFeatured && <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">Nổi bật</span>}</div><div className="p-5"><div className="flex items-center justify-between gap-3 text-[9px] font-bold uppercase tracking-wider text-emerald-400"><span className="truncate">{project.category}</span><span className="shrink-0">{project.timeline}</span></div><h3 className="mt-3 line-clamp-2 text-lg font-black leading-snug">{project.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{project.briefDescription}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-white group-hover:text-emerald-400">Xem case study <ArrowRight className="h-3.5 w-3.5" /></span></div></button></Reveal>)}
            </div>
          </div>
        </section>

        <section id="courses" className="scroll-mt-24 bg-[#effaf5] py-20 sm:py-24">
          <div className={sectionShell}>
            <Reveal><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><SectionHeading eyebrow="Khóa học trực tuyến" title="Học từ quy trình sáng tạo thực tế" description="Các chương trình học có cấu trúc rõ ràng, tập trung vào thực hành và kết quả đầu ra có thể đưa vào Portfolio." /><button onClick={() => showCollectionPage('courses')} className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white hover:bg-emerald-700">Xem tất cả khóa học <ArrowRight className="h-4 w-4" /></button></div></Reveal>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.slice(0, 6).map(course => <Reveal key={course.id}><button onClick={() => showDetail({ type: 'course', data: course })} className="group h-full w-full overflow-hidden rounded-[1.5rem] bg-white text-left shadow-sm ring-1 ring-emerald-100 transition hover:-translate-y-1 hover:shadow-xl"><div className="relative aspect-[16/9] overflow-hidden"><img src={course.coverImage} alt={course.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700 backdrop-blur">{levelLabel[course.level]}</span></div><div className="p-5"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600">{course.category}</p><h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-slate-950">{course.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{course.briefDescription}</p><div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500"><span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {course.lessonsCount} bài</span><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.studentsCount} học viên</span><strong className="ml-auto text-sm text-emerald-600">{formatCurrency(course.salePrice || course.price)}</strong></div></div></button></Reveal>)}</div>
          </div>
        </section>

        <section id="research" className="scroll-mt-24 bg-white py-20 sm:py-24">
          <div className={sectionShell}>
            <Reveal><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><SectionHeading eyebrow="Nghiên cứu khoa học" title="Công trình & xuất bản học thuật" description="Các nghiên cứu tại giao điểm giữa thiết kế đa phương tiện, trải nghiệm người dùng và công nghệ sáng tạo." /><button onClick={() => showCollectionPage('research')} className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white hover:bg-emerald-700">Xem tất cả nghiên cứu <ArrowRight className="h-4 w-4" /></button></div></Reveal>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleResearch.slice(0, 6).map(item => <Reveal key={item.id}><button onClick={() => showDetail({ type: 'research', data: item })} className="group flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] bg-slate-50 text-left ring-1 ring-slate-100 transition hover:-translate-y-1 hover:bg-emerald-50 hover:shadow-xl"><div className="aspect-[16/8] overflow-hidden">{item.coverImage ? <img src={item.coverImage} alt={item.titleVi} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-emerald-100 to-slate-100 text-emerald-600"><Award className="h-10 w-10" /></div>}</div><div className="flex flex-1 flex-col p-5"><div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-wider text-emerald-600"><span className="truncate">{researchTypeLabel[item.type]}</span><span className="shrink-0">{item.publishYear}</span></div><h3 className="mt-3 line-clamp-2 text-lg font-black leading-snug text-slate-950">{item.titleVi}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{item.abstractVi}</p><p className="mt-auto pt-4 text-[10px] font-bold text-slate-400">{item.authors.slice(0, 2).join(', ')}</p></div></button></Reveal>)}</div>
          </div>
        </section>

        <section id="lectures" className="scroll-mt-24 bg-[#effaf5] py-20 sm:py-24">
          <div className={sectionShell}>
            <Reveal><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><SectionHeading eyebrow="Bài giảng & Học liệu" title="Tài nguyên để học và thực hành" description="Bài giảng, giáo trình, slide và tệp thực hành được tổ chức rõ ràng để người học dễ tiếp cận." /><button onClick={() => showCollectionPage('lectures')} className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white hover:bg-emerald-700">Xem tất cả bài giảng <ArrowRight className="h-4 w-4" /></button></div></Reveal>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{lectures.slice(0, 6).map((lecture, index) => <Reveal key={lecture.id} delay={Math.min(index * 0.05, 0.16)}><button onClick={() => showDetail({ type: 'lecture', data: lecture })} className="group flex h-full w-full flex-col rounded-[1.5rem] bg-white p-5 text-left shadow-sm ring-1 ring-emerald-100 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><FileText className="h-5 w-5" /></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">{lectureTypeLabel[lecture.documentType]}</span></div><p className="mt-4 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600">{lecture.subject}</p><h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-slate-950">{lecture.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{lecture.detailedContent}</p><div className="mt-auto flex items-center justify-between pt-4 text-[10px] font-bold text-slate-500"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {lecture.duration}</span><span className="text-emerald-700">Xem bài giảng →</span></div></button></Reveal>)}</div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 bg-white py-24 sm:py-28"><div className={sectionShell}><Reveal><div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white sm:p-12 lg:p-16"><div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" /><div className="relative grid gap-12 lg:grid-cols-[1fr_0.9fr]"><div><span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400">Liên hệ hợp tác</span><h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">Bạn có một ý tưởng thú vị?</h2><p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">Hãy cùng biến ý tưởng đó thành một trải nghiệm đa phương tiện rõ ràng, đẹp và đáng nhớ.</p><a href={`mailto:${about.email}`} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black text-white hover:bg-emerald-400"><Mail className="h-4 w-4" /> Bắt đầu trao đổi</a></div><div className="grid gap-3"><a href={`mailto:${about.email}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><Mail className="h-5 w-5" /></span><span><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</small><strong className="text-sm">{about.email}</strong></span></a><a href={`tel:${about.phone}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><Phone className="h-5 w-5" /></span><span><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Điện thoại</small><strong className="text-sm">{about.phone}</strong></span></a><div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><MapPin className="h-5 w-5" /></span><span><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Địa điểm</small><strong className="text-sm">{about.location}</strong></span></div><div className="mt-2 flex flex-wrap gap-2">{about.socialLinks.map(link => { const Icon = link.platform.toLowerCase().includes('github') ? Github : link.platform.toLowerCase().includes('linkedin') ? Linkedin : Share2; return <a key={link.platform} href={link.url} target="_blank" rel="noreferrer" aria-label={link.platform} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold hover:bg-emerald-500"><Icon className="h-4 w-4" />{link.platform}</a>; })}</div></div></div></div></Reveal></div></section>
        </>}
      </main>

      <footer className="border-t border-slate-100 bg-white py-8"><div className={`${sectionShell} flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left`}><div><p className="font-black text-slate-950">{about.artistName}</p><p className="mt-1 text-xs text-slate-500">© {new Date().getFullYear()} Multimedia Portfolio. Bảo lưu mọi quyền.</p></div><button onClick={onEnterSystem} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700"><LockKeyhole className="h-4 w-4" /> Đăng nhập hệ thống quản trị</button></div></footer>

    </div>
  );
}
