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
  Wrench,
  Layers,
  X,
  CheckCircle2,
  Circle,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  Plus,
  ChevronRight,
  Copy,
  BookMarked,
  LogIn,
  LogOut,
  LayoutGrid,
  List,
  UserCircle
} from 'lucide-react';
import ProfileModal from './ProfileModal';
import {
  getPortfolioAbout,
  getPortfolioBanner,
  getPortfolioProjectsSettings,
  getPortfolioCoursesSettings,
  getPortfolioCourses,
  getPortfolioEducation,
  getPortfolioExperience,
  getPortfolioLectures,
  getPortfolioNavigation,
  getPortfolioPosts,
  getPortfolioProjects,
  getPortfolioResearch,
  getPortfolioSkills,
  saveCourseStudent,
  enrollCourse,
  getPortfolioGlobalSettings,
  getCourseChapters,
  getCourseLessons,
  getCourseStudents
} from '../lib/portfolioData';
import { UserAccount } from '../types';
import {
  PortfolioAbout,
  PortfolioBanner,
  PortfolioProjectsSettings,
  PortfolioCoursesSettings,
  PortfolioCourse,
  PortfolioEducation,
  PortfolioExperience,
  PortfolioNavigation,
  PortfolioPost,
  PortfolioProject,
  PortfolioResearch,
  PortfolioSkill,
  PortfolioGlobalSettings,
  CourseStudent,
  PortfolioLecture,
  CourseChapter,
  CourseLesson
} from './portfolioTypes';

const quickLinkIcons: Record<string, React.ComponentType<any>> = {
  Palette,
  Film,
  Code2,
  Code: Code2,
  GraduationCap,
  Sparkles,
  Award,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Home,
  Layers3,
  Layout,
  Library,
  Mail,
  MapPin,
  Phone,
  Play,
  Presentation,
  Share2,
  Users,
  Video
};

interface PortfolioWebsiteProps {
  onEnterSystem?: () => void;
  isAuthenticated?: boolean;
  currentUser?: UserAccount | null;
  onUpdateUser?: (user: UserAccount) => Promise<void>;
  onLogout?: () => void;
}

type DetailItem =
  | { type: 'article'; data: PortfolioPost }
  | { type: 'project'; data: PortfolioProject }
  | { type: 'course'; data: PortfolioCourse }
  | { type: 'research'; data: PortfolioResearch }
  | { type: 'lecture'; data: PortfolioLecture };

type CollectionPage = 'projects' | 'courses' | 'research' | 'my-courses' | 'lectures';

type CollectionCard = {
  id: string;
  type: DetailItem['type'];
  title: string;
  description: string;
  image?: string;
  video?: string;
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
  'my-courses': { label: 'My Coursera', eyebrow: 'My learning', title: 'Khóa học của tôi', description: 'Theo dõi tiến độ học tập và các bài học bạn đã đăng ký.' },
  lectures: { label: 'Tài liệu', eyebrow: 'Resources', title: 'Tài liệu học tập', description: 'Tài liệu và giáo trình tham khảo.' }
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

const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  
  // Try direct 11-character video ID
  if (trimmed.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/embed/${trimmed}?autoplay=0&rel=0`;
  }
  
  // 1. Shorts format: youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=0&rel=0`;
  }
  
  // 2. Live format: youtube.com/live/VIDEO_ID
  const liveMatch = trimmed.match(/\/live\/([a-zA-Z0-9_-]{11})/i);
  if (liveMatch) {
    return `https://www.youtube.com/embed/${liveMatch[1]}?autoplay=0&rel=0`;
  }
  
  // 3. Embed format: youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch) {
    return `https://www.youtube.com/embed/${embedMatch[1]}?autoplay=0&rel=0`;
  }
  
  // 4. Standard/Mobile watch format: watch?v=VIDEO_ID or &v=VIDEO_ID
  const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (vMatch) {
    return `https://www.youtube.com/embed/${vMatch[1]}?autoplay=0&rel=0`;
  }
  
  // 5. Shortened format: youtu.be/VIDEO_ID
  const youtuMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuMatch) {
    return `https://www.youtube.com/embed/${youtuMatch[1]}?autoplay=0&rel=0`;
  }
  
  // 6. Generic regex backup
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0`;
  }
  
  return null;
};

const formatLessonDuration = (dur: string | number | undefined) => {
  if (!dur) return '10 phút';
  const str = String(dur).trim();
  if (str.includes(':')) {
    return str;
  }
  if (/^\d+$/.test(str)) {
    return `${str} phút`;
  }
  return str;
};

function SectionHeading({ eyebrow, title, description, centered = false }: { eyebrow?: string; title: string; description: string; centered?: boolean }) {
  return (
    <div className={`max-w-2xl ${centered ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <span className="inline-flex items-center rounded-full bg-emerald-50/50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
          {eyebrow}
        </span>
      )}
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

function CollectionImage({ card, className = '' }: { card: CollectionCard; className?: string }) {
  if (card.video) {
    return (
      <video 
        key={card.video} 
        src={card.video} 
        poster={card.image} 
        className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${className}`} 
        autoPlay 
        muted 
        loop 
        playsInline
        preload="auto"
        onCanPlay={(e) => {
          e.currentTarget.play().catch(() => {});
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  if (card.image) return <img src={card.image} alt={card.title} className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${className}`} loading="lazy" />;
  return <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100 text-emerald-700 ${className}`}><FileText className="h-12 w-12" /></div>;
}

function PortfolioCollectionPage({ page, cards, onOpen, metaOverride, projectsSettings, coursesSettings, onCollectionPage, onEnroll, registering, viewer }: { page: CollectionPage; cards: CollectionCard[]; onOpen: (item: DetailItem) => void; metaOverride?: { label: string; eyebrow: string; title: string; description: string }; projectsSettings?: PortfolioProjectsSettings | null; coursesSettings?: PortfolioCoursesSettings | null; onCollectionPage?: (page: CollectionPage) => void; onEnroll?: (course: PortfolioCourse) => void; registering?: boolean; viewer?: UserAccount | null; }) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  useEffect(() => {
    const defaultMode = (page === 'courses' ? coursesSettings?.layoutStyle : projectsSettings?.layoutStyle) || 'grid';
    setViewMode(defaultMode as any);
  }, [page, coursesSettings?.layoutStyle, projectsSettings?.layoutStyle]);

  const meta = metaOverride || collectionPageMeta[page];
  const ordered = [...cards].sort((a, b) => Number(b.featured) - Number(a.featured) || b.date.localeCompare(a.date) || b.views - a.views);
  const hero = ordered[0];
  const secondary = ordered.slice(1, 3);
  const popular = [...ordered].sort((a, b) => b.views - a.views).slice(0, 5);
  const groups = Array.from(new Set(ordered.map(card => card.category || 'Nội dung khác')));

  if ((page === 'projects' || page === 'courses') && (projectsSettings || coursesSettings)) {
    const isCourses = page === 'courses';
    const pBanner = isCourses 
      ? ((coursesSettings?.banner || {
          title: "Khóa học trực tuyến",
          description: "Chương trình đào tạo thực hành chuyên sâu về đồ họa chuyển động, hoạt hình 2D và thiết kế đa phương tiện.",
          mediaType: "image",
          backgroundImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
          backgroundVideo: "",
          brightness: 80,
          enableOverlay: true,
          overlayColor: "#0f172a",
          overlayOpacity: 0.6,
          animate: true,
          altText: "Khóa học trực tuyến",
          loopVideo: false,
          showText: true
        }) as PortfolioBanner)
      : (projectsSettings?.banner as PortfolioBanner);

    const postsPerCat = isCourses ? (coursesSettings?.postsPerCategory || 12) : (projectsSettings?.postsPerCategory || 4);

    const renderGrid = (groupCards: CollectionCard[]) => (
      <div className={`mt-7 grid gap-6 ${viewMode === 'list' ? 'grid-cols-1 sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {groupCards.map(card => {
          const isCourse = card.detail.type === 'course';
          const courseData = isCourse ? (card.detail.data as PortfolioCourse) : null;
          const isEnrolled = isCourse && courseData && viewer && courseData.students?.some(s => s.accountId === viewer.id);
          
          return (
            <div key={card.id} className={`group relative flex overflow-hidden rounded-[1.5rem] bg-slate-50 text-left ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl ${viewMode === 'list' ? 'flex-row items-center h-40' : 'flex-col h-full'}`}>
              <button onClick={() => onOpen(card.detail)} className="absolute inset-0 z-10" />
              <div className={`overflow-hidden shrink-0 ${viewMode === 'list' ? 'h-full aspect-[4/3] w-1/3 min-w-[120px]' : 'aspect-[4/3] w-full'}`}>
                <CollectionImage card={card} />
              </div>
              <div className="flex flex-1 flex-col p-5 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">{card.category}</span>
                  {isCourse && courseData && (
                    <span className="text-[9px] font-bold uppercase text-slate-400">
                      · {courseData.level === 'basic' ? 'Cơ bản' : courseData.level === 'intermediate' ? 'Trung cấp' : 'Nâng cao'}
                    </span>
                  )}
                </div>
                <h3 className="line-clamp-2 text-base font-black leading-snug text-slate-950 group-hover:text-emerald-700">{card.title}</h3>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{card.description}</p>
                {isCourse && courseData && (
                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100/50">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-emerald-700">
                        {courseData.price > 0 ? `${courseData.price.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        {courseData.chapters?.length || 0} chương
                      </span>
                    </div>
                    
                    {!isEnrolled && onEnroll && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEnroll(courseData);
                        }}
                        disabled={registering}
                        className="relative z-20 flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[10px] font-black text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {registering ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookMarked className="h-3 w-3" />}
                        Đăng ký
                      </button>
                    )}
                    {isEnrolled && (
                      <span className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-[10px] font-black text-emerald-700 border border-emerald-100">
                        Đã đăng ký
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );

    return (
      <div className="bg-white pb-24">
        {/* Banner Section */}
        <section className="relative overflow-hidden bg-slate-950 sm:min-h-[500px]">
            {pBanner.mediaType === "video" && pBanner.backgroundVideo ? (
              <video 
                src={pBanner.backgroundVideo} 
                autoPlay 
                loop={pBanner.loopVideo !== false} 
                muted 
                playsInline 
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover" 
                style={{ filter: `brightness(${pBanner.brightness}%)` }} 
                onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <img src={pBanner.backgroundImage} alt={pBanner.altText || ''} className="absolute inset-0 h-full w-full object-cover" style={{ filter: `brightness(${pBanner.brightness}%)` }} fetchPriority="high" />
            )}
            {pBanner.enableOverlay !== false && (
              <div className="absolute inset-0" style={{ backgroundColor: pBanner.overlayColor || "#000000", opacity: pBanner.overlayOpacity !== undefined ? pBanner.overlayOpacity : 0.4 }} />
            )}
            {pBanner.showText !== false && (
              <motion.div initial={pBanner.animate ? { opacity: 0, y: 28 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }} className="relative z-10 mx-auto flex min-h-[500px] w-full max-w-7xl flex-col justify-center px-5 py-24 sm:px-8 lg:px-10 items-center text-center">
                <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl">{pBanner.title}</h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-lg sm:leading-8">{pBanner.description}</p>
              </motion.div>
            )}
          </section>

        <div className={sectionShell}>
          <div className="mb-4 flex items-center justify-end gap-2 border-b border-slate-100 pb-4">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Dạng lưới"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Dạng danh sách"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          {selectedGroup ? (
            <section className="mt-20">
              <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <button onClick={() => setSelectedGroup(null)} className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 hover:text-brand">← Quay lại danh mục</button>
                  <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{selectedGroup}</h2>
                </div>
                <span className="text-xs font-bold text-slate-400">{ordered.filter(c => (c.category || 'Nội dung khác') === selectedGroup).length} {isCourses ? 'khóa học' : 'dự án'}</span>
              </div>
              {renderGrid(ordered.filter(card => (card.category || 'Nội dung khác') === selectedGroup))}
            </section>
          ) : (
            groups.map(group => {
              const allGroupCards = ordered.filter(card => (card.category || 'Nội dung khác') === group);
              const groupCards = allGroupCards.slice(0, postsPerCat);
              if (groupCards.length === 0) return null;
              return (
                <section key={group} className="mt-20">
                  <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-5">
                    <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">{group}</h2>
                    {allGroupCards.length > postsPerCat && (
                      <button onClick={() => setSelectedGroup(group)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Tất cả →</button>
                    )}
                  </div>
                  {renderGrid(groupCards)}
                </section>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f7fbf9] pb-24 pt-28 sm:pt-32">
      <div className={sectionShell}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">{meta.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl">{meta.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">{meta.description}</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Dạng lưới"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Dạng danh sách"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
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
              {secondary.map(card => <button key={card.id} onClick={() => onOpen(card.detail)} className="group overflow-hidden rounded-[1.75rem] bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="aspect-[16/9] overflow-hidden"><CollectionImage card={card} /></div><div className="p-5"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">{card.category}</p><h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-slate-950">{card.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{card.description}</p></div></button>)}
            </div>
            <aside className="rounded-[1.75rem] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Được quan tâm</h2>
              <div className="mt-5 divide-y divide-slate-100">{popular.map((card, index) => <button key={card.id} onClick={() => onOpen(card.detail)} className="group flex w-full gap-3 py-4 text-left"><span className="text-xl font-black text-emerald-200 group-hover:text-emerald-500">{String(index + 1).padStart(2, '0')}</span><span><strong className="line-clamp-2 text-sm leading-6 text-slate-800 group-hover:text-emerald-700">{card.title}</strong><small className="mt-1 block text-[10px] font-bold text-slate-400">{card.views.toLocaleString('vi-VN')} lượt xem</small></span></button>)}</div>
            </aside>
          </section>
        ) : <div className="mt-12 rounded-[2rem] bg-white p-12 text-center text-sm text-slate-500">Chưa có nội dung được xuất bản.</div>}

        {groups.map(group => {
          const groupCards = ordered.filter(card => (card.category || 'Nội dung khác') === group);
          return (
            <section key={group} className="mt-20">
              <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Chuyên mục</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{group}</h2>
                </div>
                <span className="text-xs font-bold text-slate-400">{groupCards.length} nội dung</span>
              </div>
              <div className={`mt-7 grid gap-6 ${viewMode === 'list' ? 'grid-cols-1 sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
                {groupCards.map(card => (
                  <div 
                    key={card.id} 
                    className={`group relative flex overflow-hidden rounded-[1.75rem] bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${viewMode === 'list' ? 'flex-row items-center h-48' : 'flex-col h-full'}`}
                  >
                    <button onClick={() => onOpen(card.detail)} className="absolute inset-0 z-10" />
                    <div className={`overflow-hidden shrink-0 ${viewMode === 'list' ? 'h-full aspect-[4/3] w-1/3 min-w-[140px]' : 'aspect-[16/10] w-full'}`}>
                      <CollectionImage card={card} />
                    </div>
                    <div className="flex flex-1 flex-col p-6 min-w-0">
                      <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                        <span>{card.category}</span>
                        <span className="text-slate-400">{card.date}</span>
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-xl font-black leading-snug text-slate-950 group-hover:text-emerald-700">{card.title}</h3>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{card.description}</p>
                      <span className="mt-auto pt-4 inline-flex items-center gap-2 text-xs font-black text-emerald-700">
                        Xem nội dung <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PortfolioDetailPage({ item, related, onOpen, viewer, onBack, globalSettings, onEnterSystem, onUpdateCourse, onEnroll, registering }: { item: DetailItem; related: CollectionCard[]; onOpen: (item: DetailItem) => void; viewer?: UserAccount | null; onBack?: () => void; globalSettings: PortfolioGlobalSettings | null; onEnterSystem?: () => void; onUpdateCourse?: (course: PortfolioCourse) => void; onEnroll?: (course: PortfolioCourse) => void; registering?: boolean; }) {
  const course = item.type === 'course' ? item.data : null;
  const [enrollment, setEnrollment] = useState<CourseStudent | null>(null);
  const [loading, setLoading] = useState(true);

  // Chapters and lessons come from the item.data in this version
  const courseChapters = course?.chapters || [];
  const courseLessons = useMemo(() => courseChapters.flatMap(chapter => chapter.lessons || []), [courseChapters]);

  // Learning states
  const [notes, setNotes] = useState<any[]>([]);
  const [lessonHighlights, setLessonHighlights] = useState<string[]>([]);
  const [noteBgColor, setNoteBgColor] = useState('bg-amber-50 text-amber-950 border-amber-200');
  const [newNote, setNewNote] = useState('');
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [popupNoteText, setPopupNoteText] = useState('');
  const activeLessonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadEnrollment() {
      if (!course || !viewer) {
        setLoading(false);
        return;
      }
      try {
        const students = await getCourseStudents({ userId: viewer.id, courseId: course.id });
        if (students && students.length > 0) {
          // Find the student record belonging to the current user
          const student = students.find(s => 
            s.accountId === viewer.id || 
            s.studentEmail === viewer.email || 
            s.id === `${viewer.id}_${course.id}`
          );
          if (student) {
            setEnrollment({
              ...student,
              id: student.id,
              studentName: student.studentName || student.name || viewer.fullName,
              studentEmail: student.studentEmail || student.email || viewer.email,
              courseId: course.id,
              progress: student.progress || 0,
              paymentStatus: student.paymentStatus === 'paid' ? 'paid' : 'pending',
              registrationDate: student.registrationDate || student.registerDate,
              isLocked: student.paymentStatus !== 'paid',
              completedLessons: student.completedLessons || []
            });
            return;
          }
        }
        
        // Fallback to legacy or course.students if not found
        const legacyEnrollment = course?.students?.find(student =>
          student.accountId === viewer.id || student.email === viewer.email || student.studentEmail === viewer.email
        );
        if (legacyEnrollment) {
          setEnrollment(legacyEnrollment);
        }
      } catch (err) {
        console.error('Error loading enrollment from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEnrollment();
  }, [course?.id, viewer?.id]);

  useEffect(() => {
    if (course && viewer) {
      // If parent updated course students, re-check enrollment
      const myEnrollment = course.students?.find(s => s.accountId === viewer.id);
      if (myEnrollment) {
        setEnrollment(prev => {
          if (!prev) {
            return { ...myEnrollment, isLocked: false };
          }
          // Safe-merge incoming data with our freshest local state to prevent losing notes
          return {
            ...myEnrollment,
            isLocked: false,
            lessonNotes: prev.lessonNotes || myEnrollment.lessonNotes || {},
            lessonHighlights: prev.lessonHighlights || myEnrollment.lessonHighlights || {},
            completedLessons: prev.completedLessons || myEnrollment.completedLessons || [],
            progress: prev.progress !== undefined ? prev.progress : (myEnrollment.progress || 0)
          };
        });
      }
    }
  }, [course?.students, viewer?.id]);

  const canLearn = Boolean(course && viewer && (viewer.role === 'admin' || (enrollment && enrollment.paymentStatus === 'paid')));
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  useEffect(() => {
    if (enrollment) {
      setCompletedLessonIds(enrollment.completedLessons || []);
    }
  }, [enrollment]);

  useEffect(() => {
    if (courseLessons.length > 0 && !activeLessonId) {
      setActiveLessonId(courseLessons[0].id);
    }
  }, [courseLessons, activeLessonId]);

  const activeLesson = useMemo(() => courseLessons.find(l => l.id === activeLessonId) || courseLessons[0], [courseLessons, activeLessonId]);
  const courseProgress = courseLessons.length ? Math.round((completedLessonIds.length / courseLessons.length) * 100) : 0;

  // Load notes and highlights for active lesson - unique to each logged-in account
  const loadedLessonRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeLessonId) {
      const key = `${viewer?.id || 'anon'}_${activeLessonId}`;
      if (loadedLessonRef.current === key) {
        return;
      }
      loadedLessonRef.current = key;

      if (viewer && enrollment) {
        const dbNotes = enrollment.lessonNotes?.[activeLessonId];
        const dbHighlights = enrollment.lessonHighlights?.[activeLessonId];
        
        if (dbNotes) {
          setNotes(dbNotes);
        } else {
          const savedNotes = localStorage.getItem(`notes_${viewer.id}_${activeLessonId}`) || localStorage.getItem(`notes_${activeLessonId}`);
          if (savedNotes) setNotes(JSON.parse(savedNotes));
          else setNotes([]);
        }

        if (dbHighlights) {
          setLessonHighlights(dbHighlights);
        } else {
          const savedHighlights = localStorage.getItem(`highlights_${viewer.id}_${activeLessonId}`) || localStorage.getItem(`highlights_${activeLessonId}`);
          if (savedHighlights) setLessonHighlights(JSON.parse(savedHighlights));
          else setLessonHighlights([]);
        }
      } else {
        const savedNotes = localStorage.getItem(`notes_${activeLessonId}`);
        if (savedNotes) setNotes(JSON.parse(savedNotes));
        else setNotes([]);

        const savedHighlights = localStorage.getItem(`highlights_${activeLessonId}`);
        if (savedHighlights) setLessonHighlights(JSON.parse(savedHighlights));
        else setLessonHighlights([]);
      }
    }
  }, [activeLessonId, enrollment?.id, viewer?.id]);

  const saveNotes = (updated: any[]) => {
    setNotes(updated);
    if (activeLessonId) {
      if (viewer) {
        localStorage.setItem(`notes_${viewer.id}_${activeLessonId}`, JSON.stringify(updated));
        if (enrollment) {
          const updatedEnrollment: CourseStudent = {
            ...enrollment,
            lessonNotes: {
              ...(enrollment.lessonNotes || {}),
              [activeLessonId]: updated
            }
          };
          setEnrollment(updatedEnrollment);
          saveCourseStudent(updatedEnrollment).catch(err => console.error("Error saving notes to Supabase:", err));
          
          if (onUpdateCourse && course) {
            onUpdateCourse({
              ...course,
              students: (course.students || []).map(s => s.id === updatedEnrollment.id ? updatedEnrollment : s)
            });
          }
        }
      } else {
        localStorage.setItem(`notes_${activeLessonId}`, JSON.stringify(updated));
      }
    }
  };

  const saveHighlights = (updated: string[]) => {
    setLessonHighlights(updated);
    if (activeLessonId) {
      if (viewer) {
        localStorage.setItem(`highlights_${viewer.id}_${activeLessonId}`, JSON.stringify(updated));
        if (enrollment) {
          const updatedEnrollment: CourseStudent = {
            ...enrollment,
            lessonHighlights: {
              ...(enrollment.lessonHighlights || {}),
              [activeLessonId]: updated
            }
          };
          setEnrollment(updatedEnrollment);
          saveCourseStudent(updatedEnrollment).catch(err => console.error("Error saving highlights to Supabase:", err));
          
          if (onUpdateCourse && course) {
            onUpdateCourse({
              ...course,
              students: (course.students || []).map(s => s.id === updatedEnrollment.id ? updatedEnrollment : s)
            });
          }
        }
      } else {
        localStorage.setItem(`highlights_${activeLessonId}`, JSON.stringify(updated));
      }
    }
  };

  const handleTextMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 5 && activeLessonContainerRef.current) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      const containerRect = activeLessonContainerRef.current.getBoundingClientRect();
      
      if (rect) {
        setPopupPosition({
          top: rect.top - containerRect.top - 120,
          left: Math.max(10, rect.left - containerRect.left)
        });
        setSelectedText(text);
        setShowNotePopup(true);
      }
    }
  };

  const handleInnerEnroll = async () => {
    if (!course || !onEnroll) return;
    onEnroll(course);
  };

  const toggleLessonComplete = async (lessonId: string) => {
    if (!course || !viewer || !canLearn || !enrollment) return;
    
    const next = completedLessonIds.includes(lessonId)
      ? completedLessonIds.filter(id => id !== lessonId)
      : [...completedLessonIds, lessonId];
    
    setCompletedLessonIds(next);
    const progress = courseLessons.length ? Math.round((next.length / courseLessons.length) * 100) : 0;

    try {
      const updatedEnrollment: CourseStudent = {
        ...enrollment,
        completedLessons: next,
        progress: progress
      };
      await saveCourseStudent(updatedEnrollment);
      setEnrollment(updatedEnrollment);
      
      if (onUpdateCourse) {
        onUpdateCourse({
          ...course,
          students: (course.students || []).map(s => s.id === updatedEnrollment.id ? updatedEnrollment : s)
        });
      }
    } catch (err) {
      console.error('Update progress error:', err);
    }
  };

  const handleSelectLesson = async (lessonId: string | null) => {
    // Tự động đánh dấu hoàn thành bài học trước đó nếu chuyển sang bài mới
    if (activeLessonId && activeLessonId !== lessonId) {
      if (!completedLessonIds.includes(activeLessonId)) {
        toggleLessonComplete(activeLessonId);
      }
    }
    setActiveLessonId(lessonId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const title = item.type === 'research' ? item.data.titleVi : item.data.title;
  const cover = item.type === 'article' || item.type === 'project' || item.type === 'course' || item.type === 'research' ? item.data.coverImage : item.data.images?.[0];
  const video = item.type === 'project' || item.type === 'course' ? item.data.introVideo : null;
  
  const category = item.type === 'project' ? item.data.category : item.type === 'course' ? item.data.category : item.type === 'research' ? (item.data.field || researchTypeLabel[item.data.type]) : item.type === 'lecture' ? (item.data.subject || lectureTypeLabel[item.data.documentType]) : item.data.category;

  const infoItems = useMemo(() => {
    if (item.type === 'project') {
      return [
        { icon: Layout, label: 'Thể loại', value: item.data.category || 'Chưa cập nhật' },
        { icon: CalendarDays, label: 'Năm thực hiện', value: item.data.timeline || 'Chưa cập nhật' },
        { icon: Wrench, label: 'Công cụ', value: item.data.tools?.join(', ') || 'Chưa cập nhật' },
        { icon: Layers, label: 'Thẻ (Tags)', value: item.data.tags?.join(', ') || 'Chưa cập nhật' }
      ];
    }
    if (item.type === 'course') {
      const course = item.data;
      const studentCount = course.students?.length || 0;
      const lessonCount = courseLessons.length;
      
      return [
        { icon: BookOpen, label: 'Trình độ', value: levelLabel[course.level] || 'Chưa cập nhật' },
        { icon: Users, label: 'Học viên', value: `${studentCount.toLocaleString('vi-VN')} người` },
        { icon: Play, label: 'Bài giảng', value: `${lessonCount} bài` },
        { icon: Layers, label: 'Danh mục', value: course.category || 'Chưa cập nhật' }
      ];
    }
    return [];
  }, [item, courseLessons]);

  const glassStyle = globalSettings?.menuGlassEffect ? 'backdrop-blur-xl' : '';
  const opacityHex = globalSettings ? Math.round((globalSettings.menuOpacity / 100) * 255).toString(16).padStart(2, '0') : 'f2';
  const bgColor = globalSettings ? `#ffffff${opacityHex}` : 'white';

  return (
    <div className="bg-white">
      {/* 1. Hero Banner Style */}
      <section className={`relative ${item.type === 'course' ? 'h-[45vh] min-h-[350px]' : 'h-[98vh] min-h-[750px] sm:h-[100vh]'} w-full overflow-hidden bg-slate-950`}>
        {video ? (
          <video 
            key={video} 
            src={video} 
            autoPlay 
            muted 
            playsInline 
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover" 
            style={{ filter: 'brightness(100%)' }}
            loop={(item.type === 'project' || item.type === 'course') ? (item.data.loopVideo ?? true) : true}
          />
        ) : cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-100" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-slate-900" />
        )}
        
        {/* Back button */}
        <div className={sectionShell + " relative z-20 pt-28"}>
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition-colors">
            <ArrowRight className="h-4 w-4 rotate-180" /> Quay lại
          </button>
        </div>
      </section>
 
      {/* 2. Info Block Bento Grid Style */}
      {(item.type === 'project' || item.type === 'course') && (
        <div className={`${sectionShell} relative z-30 -mt-20`}>
          <div 
            className={`mx-auto grid max-w-5xl overflow-hidden rounded-[2.5rem] shadow-2xl shadow-slate-900/20 sm:grid-cols-2 lg:grid-cols-4 ${glassStyle}`}
            style={{ backgroundColor: bgColor }}
          >
            {infoItems.map((info, idx) => (
              <div key={idx} className="group flex items-start gap-4 p-6 transition-colors hover:bg-emerald-50/50 sm:p-8">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                  <info.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{info.label}</p>
                  <h3 className="mt-1 text-sm font-black text-slate-950">{info.value}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 3. Main Content Area */}
      <div className={`${sectionShell} py-12 lg:py-16`}>
        <div className={`mx-auto ${item.type === 'course' ? 'max-w-7xl' : 'max-w-4xl'}`}>
          {item.type !== 'course' && (
            <header className="mb-12">
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">{title}</h1>
            </header>
          )}

          <div className={`${item.type === 'course' ? 'mt-0' : 'mt-12'}`}>
            {item.type === 'article' && (
              <article className="prose prose-slate prose-sm sm:prose-base max-w-none">
                <p className="text-xl font-semibold leading-relaxed text-slate-600">{item.data.excerpt}</p>
                <div className="mt-10" dangerouslySetInnerHTML={{ __html: item.data.content || "" }} />
                <div className="mt-12 flex flex-wrap gap-2">
                  {item.data.tags.map(tag => (
                    <span key={tag} className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600">#{tag}</span>
                  ))}
                </div>
              </article>
            )}

            {item.type === 'project' && (
              <div className="space-y-12">
                <div className="prose prose-slate prose-sm sm:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: item.data.detailedContent || item.data.briefDescription }} />
                
                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { label: 'Bối cảnh dự án', value: item.data.context },
                    { label: 'Vấn đề cần giải quyết', value: item.data.problem },
                    { label: 'Ý tưởng thiết kế', value: item.data.designIdea },
                    { label: 'Giải pháp & Kết quả', value: [item.data.solution, item.data.result].filter(Boolean).join('\n\n') }
                  ].filter(s => s.value).map((section, i) => (
                    <section key={i} className="rounded-[2rem] bg-slate-50 p-8">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">{section.label}</h3>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-slate-600">{section.value}</p>
                    </section>
                  ))}
                </div>

                {item.data.gallery && item.data.gallery.length > 0 && (
                  <div className="pt-8">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Bộ sưu tập dự án</h3>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {item.data.gallery.map((img, i) => (
                        <Reveal key={i} delay={i * 0.1}>
                          <img src={img} alt="" className="w-full rounded-[2rem] object-cover shadow-lg" loading="lazy" />
                        </Reveal>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {item.type === 'course' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Video and lesson details */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Course Category & Title */}
                    <div className="mb-4">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        {course.category}
                      </span>
                      <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                        {course.title}
                      </h1>
                    </div>

                    {/* Active Video Player */}
                    <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] bg-slate-900 shadow-xl ring-1 ring-slate-900/10">
                      {!canLearn && activeLesson && !activeLesson.allowPreview ? (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-white p-8 text-center space-y-6">
                           <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white/50">
                            <LockKeyhole className="w-8 h-8" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-black text-white">Nội dung đã khóa</h3>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto">
                              {!viewer 
                                ? "Vui lòng đăng nhập để có thể đăng ký và tham gia học tập." 
                                : "Vui lòng đăng ký khóa học để truy cập bài học này."}
                            </p>
                          </div>
                          <button 
                            onClick={viewer ? handleInnerEnroll : onEnterSystem}
                            disabled={registering}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all transform hover:scale-105 flex items-center gap-2"
                          >
                            {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : viewer ? <BookMarked className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                            {viewer ? "Đăng ký khóa học ngay" : "Đăng nhập ngay"}
                          </button>
                        </div>
                      ) : activeLesson ? (
                        (() => {
                          const ytUrl = getYouTubeEmbedUrl(activeLesson.videoUrl || '');
                          if (ytUrl) {
                            return (
                              <iframe
                                key={activeLesson.videoUrl}
                                src={ytUrl}
                                className="h-full w-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            );
                          } else if (activeLesson.videoUrl) {
                            return (
                              <video
                                key={activeLesson.videoUrl}
                                src={activeLesson.videoUrl}
                                controls
                                autoPlay
                                playsInline
                                className="h-full w-full object-cover"
                                onEnded={() => toggleLessonComplete(activeLesson.id)}
                              />
                            );
                          } else {
                            return (
                              <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
                                <BookOpen className="h-16 w-16 text-emerald-500 mb-4 animate-pulse" />
                                <p className="text-base font-bold text-white">Bài đọc lý thuyết</p>
                                <p className="mt-1 text-xs text-slate-400 max-w-md">Bài học này không chứa video. Học viên hãy đọc nội dung tóm tắt chi tiết bên dưới.</p>
                              </div>
                            );
                          }
                        })()
                      ) : (
                        (() => {
                          const ytIntroUrl = getYouTubeEmbedUrl(course.introVideo || '');
                          if (ytIntroUrl) {
                            return (
                              <iframe
                                key={course.introVideo}
                                src={ytIntroUrl}
                                className="h-full w-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            );
                          } else if (course.introVideo) {
                            return (
                              <video
                                key={course.introVideo}
                                src={course.introVideo}
                                controls
                                playsInline
                                className="h-full w-full object-cover"
                              />
                            );
                          } else {
                            return (
                              <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-white">
                                <BookOpen className="h-16 w-16 text-slate-600" />
                                <p className="mt-4 text-sm text-slate-400">Video giới thiệu không khả dụng</p>
                              </div>
                            );
                          }
                        })()
                      )}
                    </div>

                    {/* Lesson / Course Info below the video */}
                    {!activeLesson ? (
                      /* CASE 1: Intro Video (General course info) */
                      <div className="space-y-8">
                        {/* Enrollment Banner */}
                        {!canLearn && (
                          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                              <div className="text-center md:text-left space-y-2">
                                <h2 className="text-xl sm:text-2xl font-black">Bắt đầu học ngay hôm nay</h2>
                                <p className="text-slate-400 text-sm">Đăng ký để mở khóa toàn bộ bài học, học liệu thực hành và bài tập kiểm tra.</p>
                              </div>
                              <button 
                                onClick={viewer ? handleInnerEnroll : onEnterSystem}
                                disabled={registering}
                                className="group relative flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all transform hover:scale-105 shadow-xl shadow-emerald-600/20 disabled:opacity-50"
                              >
                                {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : viewer ? <BookMarked className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                                {viewer ? "Đăng ký khóa học" : "Đăng nhập để đăng ký"}
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                              </button>
                            </div>
                            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
                          </div>
                        )}

                        {/* Course Stats Bento Cards */}
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                          <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-800 shrink-0">
                              <Clock className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Thời lượng</p>
                              <p className="mt-1 font-black text-slate-900">{course.duration || "Chưa cập nhật"}</p>
                            </div>
                          </div>
                          
                          <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-100 text-indigo-800 shrink-0">
                              <Wrench className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-800">Bài thực hành</p>
                              <p className="mt-1 font-black text-slate-900">
                                {courseLessons.reduce((sum, lesson) => sum + (lesson.assignments?.length || 0), 0) || courseLessons.filter(l => l.practiceFileUrl).length || 3} bài Lab
                              </p>
                            </div>
                          </div>
                          
                          <div className="rounded-2xl bg-rose-50/50 border border-rose-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-100 text-rose-800 shrink-0">
                              <BookMarked className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wider text-rose-800">Bài kiểm tra</p>
                              <p className="mt-1 font-black text-slate-900">
                                {courseLessons.reduce((sum, lesson) => sum + (lesson.quizzes?.length || 0), 0) || 2} bài quizz
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Description */}
                        <div className="prose prose-slate prose-sm sm:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: course.detailedDescription || course.briefDescription }} />
                        
                        {/* Course Outcomes & Requirements */}
                        <div className="grid gap-6 sm:grid-cols-2">
                          {course.objectives && course.objectives.length > 0 && (
                            <div className="rounded-[1.5rem] bg-emerald-50/40 border border-emerald-100/50 p-6">
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-600" /> Mục tiêu khóa học
                              </h4>
                              <ul className="mt-4 space-y-3 text-sm text-slate-600 font-medium">
                                {course.objectives.map((obj, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-emerald-500 mt-0.5">✦</span>
                                    <span>{obj}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {course.requirements && course.requirements.length > 0 && (
                            <div className="rounded-[1.5rem] bg-slate-50 border border-slate-100 p-6">
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-slate-500" /> Yêu cầu chuẩn bị
                              </h4>
                              <ul className="mt-4 space-y-3 text-sm text-slate-600 font-medium">
                                {course.requirements.map((req, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                                    <span>{req}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* CASE 2: Active Lesson Content (Lesson 2 onwards or any active lesson) */
                      <div ref={activeLessonContainerRef} className="space-y-8 relative">
                        <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-black text-slate-950">
                              {activeLesson.title}
                            </h2>
                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400 font-bold">
                              <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                <Clock className="h-3.5 w-3.5" /> {formatLessonDuration(activeLesson.duration)} học
                              </span>
                              {activeLesson.practiceFileUrl && (
                                <a 
                                  href={activeLesson.practiceFileUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:underline"
                                >
                                  Tải file thực hành (Lab)
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Manual Completion Button */}
                          {canLearn && (
                            <button
                              onClick={() => toggleLessonComplete(activeLesson.id)}
                              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                                completedLessonIds.includes(activeLesson.id)
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                              }`}
                            >
                              {completedLessonIds.includes(activeLesson.id) ? (
                                <><CheckCircle2 className="h-4 w-4" /> Đã hoàn thành</>
                              ) : (
                                <><Circle className="h-4 w-4" /> Đánh dấu hoàn thành</>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Interactive Highlight Block for Lesson Text Content */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Tóm tắt & Nội dung cốt lõi</h3>
                          
                          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50/70 border border-amber-100 p-3.5 text-xs text-amber-800">
                            <span className="text-sm">💡</span>
                            <p className="font-bold leading-relaxed">
                              Mẹo học tập: Hãy <span className="underline decoration-2 decoration-amber-400">bôi đen (tô đen)</span> bất kỳ câu/đoạn văn bản nào bên dưới để hiện cửa sổ nhỏ viết ghi chú nhanh lưu lại bài học!
                            </p>
                          </div>

                          {(() => {
                            const paragraphs = (activeLesson.textContent || "Nội dung tóm tắt bài học đang được cập nhật bởi quản trị viên.").split('\n').filter(p => p.trim());
                            return (
                              <div className="space-y-4" onMouseUp={handleTextMouseUp}>
                                {paragraphs.map((para, pIdx) => {
                                  const isHighlighted = lessonHighlights.includes(para);
                                  return (
                                    <div 
                                      key={pIdx} 
                                      className={`group relative rounded-xl p-3.5 border transition-all duration-300 ${
                                        isHighlighted 
                                          ? 'bg-yellow-100/70 border-yellow-200 shadow-sm' 
                                          : 'border-transparent hover:bg-slate-50'
                                      }`}
                                    >
                                      {/* Highlight hover button */}
                                      <button
                                        onClick={() => {
                                          const nextHighlights = isHighlighted
                                            ? lessonHighlights.filter(h => h !== para)
                                            : [...lessonHighlights, para];
                                          saveHighlights(nextHighlights);
                                        }}
                                        title={isHighlighted ? "Bỏ đánh dấu" : "Đánh dấu đoạn này"}
                                        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 focus:outline-none"
                                      >
                                        <BookMarked className={`h-3.5 w-3.5 ${isHighlighted ? 'text-yellow-600 fill-current' : ''}`} />
                                      </button>
                                      <p className={`text-sm leading-relaxed text-slate-700 ${isHighlighted ? 'text-slate-900 font-medium' : ''}`}>
                                        {para}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Highly Interactive Notepad */}
                        <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6 sm:p-8 space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-base font-black text-slate-900">Ghi chú của học viên</h3>
                              <p className="text-xs text-slate-400 font-medium mt-1">
                                Các ghi chú sẽ được tự động lưu trữ riêng tư cho bài học này.
                              </p>
                            </div>
                            
                            {/* Color Selector */}
                            <div className="flex items-center gap-1.5 bg-white border border-slate-100 p-1 rounded-xl">
                              {[
                                { bg: 'bg-amber-50 text-amber-950 border-amber-200', dot: 'bg-amber-400', label: 'Vàng' },
                                { bg: 'bg-emerald-50 text-emerald-950 border-emerald-200', dot: 'bg-emerald-400', label: 'Xanh' },
                                { bg: 'bg-sky-50 text-sky-950 border-sky-200', dot: 'bg-sky-400', label: 'Lam' },
                                { bg: 'bg-rose-50 text-rose-950 border-rose-200', dot: 'bg-rose-400', label: 'Hồng' }
                              ].map((colorObj, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setNoteBgColor(colorObj.bg)}
                                  className={`h-6 w-6 rounded-lg flex items-center justify-center transition-transform ${
                                    noteBgColor === colorObj.bg ? 'ring-2 ring-emerald-600 scale-105' : 'hover:scale-105'
                                  }`}
                                  title={colorObj.label}
                                >
                                  <span className={`h-3.5 w-3.5 rounded-full ${colorObj.dot}`} />
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Write note form */}
                          <div className="space-y-3">
                            <textarea
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder="Ghi lại bài học hoặc ý tưởng thiết kế tại đây..."
                              className="w-full min-h-[90px] rounded-2xl border border-slate-200 bg-white p-4 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
                            />
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                                Tự động lưu trên trình duyệt
                              </span>
                              <button
                                onClick={() => {
                                  if (!newNote.trim()) return;
                                  const updated = [
                                    {
                                      id: `note_${Date.now()}`,
                                      text: newNote.trim(),
                                      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('vi-VN'),
                                      color: noteBgColor
                                    },
                                    ...notes
                                  ];
                                  saveNotes(updated);
                                  setNewNote('');
                                }}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-black transition-colors shadow-lg shadow-emerald-600/10"
                              >
                                <Plus className="h-4 w-4" /> Lưu ghi chú
                              </button>
                            </div>
                          </div>

                          {/* Notes List */}
                          {notes.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2 pt-2">
                              {notes.map((note) => (
                                <div 
                                  key={note.id} 
                                  className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow ${
                                    note.color || 'bg-amber-50 text-amber-950 border-amber-200'
                                  }`}
                                >
                                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-bold text-slate-800">
                                    {note.text}
                                  </p>
                                  <div className="flex justify-between items-center border-t border-black/5 pt-3 text-[10px] font-bold text-slate-400">
                                    <span>{note.timestamp}</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => navigator.clipboard.writeText(note.text)}
                                        title="Sao chép"
                                        className="p-1 hover:text-emerald-700 transition"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => saveNotes(notes.filter(n => n.id !== note.id))}
                                        title="Xóa"
                                        className="p-1 hover:text-rose-600 transition"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
                              <BookMarked className="h-8 w-8 text-slate-300 mx-auto" />
                              <p className="mt-2 text-xs font-bold text-slate-400">Chưa có ghi chú nào cho bài học này</p>
                            </div>
                          )}
                        </div>

                        {/* Floating Popup Note Editor for Selected Text */}
                        {showNotePopup && (
                          <div 
                            style={{ top: popupPosition.top, left: popupPosition.left }}
                            className="absolute z-50 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 ring-1 ring-black/50 text-white transition-all duration-200"
                          >
                            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tạo ghi chú nhanh</span>
                              <button 
                                onClick={() => {
                                  setShowNotePopup(false);
                                  setSelectedText('');
                                  window.getSelection()?.removeAllRanges();
                                }}
                                className="text-slate-400 hover:text-slate-200 p-1"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400 bg-white/5 p-2 rounded-lg italic max-h-16 overflow-y-auto">
                              "{selectedText}"
                            </div>
                            <textarea
                              rows={3}
                              value={popupNoteText}
                              onChange={(e) => setPopupNoteText(e.target.value)}
                              placeholder="Nhập nội dung ghi chú cho đoạn bôi đen này..."
                              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition placeholder:text-slate-500"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setShowNotePopup(false);
                                  setSelectedText('');
                                  window.getSelection()?.removeAllRanges();
                                }}
                                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-[10px] font-bold text-slate-400 transition"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={() => {
                                  if (!popupNoteText.trim()) return;
                                  const noteText = popupNoteText.trim();
                                  const updated = [
                                    {
                                      id: `note_${Date.now()}`,
                                      text: selectedText ? `[Ghi chú bôi đen]: "${selectedText}"\n\n💬 ${noteText}` : noteText,
                                      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('vi-VN'),
                                      color: 'bg-amber-50 text-amber-950 border-amber-200'
                                    },
                                    ...notes
                                  ];
                                  saveNotes(updated);
                                  setPopupNoteText('');
                                  setSelectedText('');
                                  setShowNotePopup(false);
                                  window.getSelection()?.removeAllRanges();
                                }}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black text-white transition-colors"
                              >
                                Lưu ghi chú
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>

                  {/* Right Column: Course Playlist navigation */}
                  <div className="lg:col-span-4">
                    <div className="sticky top-24 rounded-[2.2rem] bg-slate-900 text-white p-6 sm:p-7 space-y-6 shadow-xl shadow-slate-950/30">
                      
                      {/* Navigation Header */}
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-white">Nội dung khóa học</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                          Bảng điều hướng lộ trình
                        </p>
                      </div>

                      {/* Learning Progress Bar */}
                      {canLearn && (
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-4.5 space-y-3">
                          <div className="flex items-center justify-between text-[10px] font-black">
                            <span className="text-slate-400 uppercase tracking-wider">TIẾN ĐỘ HỌC TẬP</span>
                            <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-bold">
                              {completedLessonIds.filter(id => courseLessons.some(l => l.id === id)).length}/{courseLessons.length} bài
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                              style={{ width: `${courseProgress}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold">
                            Hoàn thành tất cả các bài học để nhận chứng chỉ!
                          </p>
                        </div>
                      )}

                      {/* Course Intro Video Row */}
                      <button
                        onClick={() => handleSelectLesson(null)}
                        className={`flex w-full items-center justify-between gap-4 rounded-xl p-3 text-left transition-all border ${
                          activeLessonId === null 
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/10' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-3 text-xs font-bold">
                          <div className={`grid h-6 w-6 place-items-center rounded-lg ${activeLessonId === null ? 'bg-white/20 text-white' : 'bg-emerald-400/20 text-emerald-400'}`}>
                            <Play className="h-3 w-3 fill-current" />
                          </div>
                          Giới thiệu khóa học
                        </span>
                        <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded font-bold">Video</span>
                      </button>

                      {/* Chapter / Lesson Syllabus */}
                      <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                        {courseChapters.map((chapter, idx) => (
                          <div key={chapter.id} className="space-y-2">
                            <strong className="text-xs font-black uppercase tracking-wider text-slate-400 block pt-1">
                              Chương {idx + 1}: {chapter.title}
                            </strong>
                            <div className="space-y-1.5">
                              {(chapter.lessons || []).map((lesson, lIdx) => {
                                const isCompleted = completedLessonIds.includes(lesson.id);
                                const isActive = activeLessonId === lesson.id;
                                const lessonIndex = courseLessons.findIndex(l => l.id === lesson.id);
                                
                                // Non-sequential learning: user can choose any content if enrolled.
                                const isLocked = !canLearn && !lesson.allowPreview;
                                
                                return (
                                  <button 
                                    key={lesson.id}
                                    disabled={isLocked}
                                    onClick={() => handleSelectLesson(lesson.id)}
                                    className={`group flex w-full items-center gap-3 rounded-xl border p-3 transition-all text-left focus:outline-none ${
                                      isLocked
                                        ? 'opacity-45 cursor-not-allowed bg-white/5 border-transparent'
                                        : isActive 
                                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/10 scale-[1.02]' 
                                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15 text-slate-300'
                                    }`}
                                  >
                                    {/* Status Icon */}
                                    <div 
                                      className="shrink-0 select-none cursor-pointer"
                                      onClick={(e) => {
                                        if (!isLocked) {
                                          e.stopPropagation();
                                          toggleLessonComplete(lesson.id);
                                        }
                                      }}
                                    >
                                      {isLocked ? (
                                        <LockKeyhole className="h-4 w-4 text-slate-500" />
                                      ) : isCompleted ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-400 fill-emerald-950/30" />
                                      ) : isActive ? (
                                        <div className="h-4 w-4 rounded-full border-2 border-emerald-300 animate-pulse bg-emerald-500/20" title="Đang học" />
                                      ) : (
                                        <div className="h-4 w-4 rounded-full border border-white/30 group-hover:border-emerald-400 transition-colors" />
                                      )}
                                    </div>

                                    {/* Title & Duration */}
                                    <div className="flex-1 min-w-0">
                                      <p className={`truncate text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                                        {lesson.title}
                                      </p>
                                      <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-400 font-bold">
                                        <Clock className="h-3 w-3 shrink-0" />
                                        <span className={isActive ? 'text-emerald-200' : ''}>{formatLessonDuration(lesson.duration)}</span>
                                        {lesson.practiceFileUrl && (
                                          <>
                                            <span className="h-1 w-1 rounded-full bg-white/20" />
                                            <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[8px]">Lab</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Right Sidebar List of Lesson Notes */}
                      {canLearn && activeLessonId && (
                        <div className="pt-4 border-t border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ghi chú đã lưu ({notes.length})</span>
                            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded">
                              Bài học hiện tại
                            </span>
                          </div>
                          
                          {notes.length > 0 ? (
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                              {notes.map((note) => (
                                <div key={note.id} className="rounded-xl bg-white/5 border border-white/5 p-3 space-y-2 relative group hover:bg-white/10 transition-colors">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveNotes(notes.filter(n => n.id !== note.id));
                                    }}
                                    className="absolute right-2 top-2 text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Xóa ghi chú"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                  <p className="text-[11px] text-slate-200 leading-relaxed font-bold whitespace-pre-wrap">
                                    {note.text}
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-bold">
                                    {note.timestamp}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">
                              Bôi đen bất kỳ đoạn văn bản nào bên dưới video để tạo ghi chú nhanh cho bài học này.
                            </p>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                  
                </div>
              </div>
            )}

            {item.type === 'research' && (
              <div className="space-y-8">
                {item.data.titleEn && <p className="text-xl font-medium italic text-slate-500">{item.data.titleEn}</p>}
                <div className="rounded-[2rem] bg-emerald-50 p-8">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800">Tóm tắt</h3>
                  <p className="mt-4 text-sm leading-8 text-slate-700">{item.data.abstractVi}</p>
                </div>
                <div className="grid gap-6 rounded-[2rem] border border-slate-100 p-8 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tác giả</p>
                    <p className="mt-2 font-bold text-slate-950">{item.data.authors.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Xuất bản</p>
                    <p className="mt-2 font-bold text-slate-950">{item.data.journalOrConference}, {item.data.publishYear}</p>
                  </div>
                  {item.data.doi && (
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DOI</p>
                      <p className="mt-2 font-mono text-xs font-bold text-slate-600">{item.data.doi}</p>
                    </div>
                  )}
                </div>
                {item.data.pdfUrl && (
                  <div className="overflow-hidden rounded-[2rem] border border-slate-200 shadow-sm">
                    <iframe src={item.data.pdfUrl} title="Tài liệu PDF" className="h-[80vh] w-full" />
                  </div>
                )}
                <div className="flex flex-wrap gap-4">
                  {item.data.publisherUrl && <a href={item.data.publisherUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-500">Nguồn xuất bản <ExternalLink className="h-4 w-4" /></a>}
                  {item.data.pdfUrl && <a href={item.data.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-700 hover:bg-slate-50">Tải tài liệu PDF <Download className="h-4 w-4" /></a>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Related Projects Section (4 items row) */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className={sectionShell}>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
             <div>
               <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-600">Discover more</span>
               <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Nội dung liên quan</h2>
             </div>
          </div>
          
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((card, idx) => (
              <Reveal key={card.id} delay={idx * 0.05}>
                <button 
                  onClick={() => onOpen(card.detail)}
                  className="group flex h-full flex-col overflow-hidden rounded-[2rem] bg-white text-left shadow-sm ring-1 ring-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/5"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <CollectionImage card={card} />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">{card.category}</span>
                    <h3 className="mt-3 line-clamp-2 text-base font-black leading-snug text-slate-950 group-hover:text-emerald-700">{card.title}</h3>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{card.description}</p>
                    <div className="mt-auto pt-5">
                      <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-600 transition-colors">
                        Xem chi tiết <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Footer (Simple unified footer for detail page) */}
      <footer className="border-t border-slate-100 bg-white py-12">
        <div className={`${sectionShell} flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left`}>
          <div>
            <p className="text-lg font-black text-slate-950">Multimedia Portfolio</p>
            <p className="mt-1 text-xs font-medium text-slate-500">© {new Date().getFullYear()} Designed & Developed with Passion.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
              <ChevronDown className="h-5 w-5 rotate-180" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function PortfolioWebsite({ onEnterSystem = () => {}, isAuthenticated = false, currentUser = null, onUpdateUser, onLogout }: PortfolioWebsiteProps) {
  const [banner, setBanner] = useState<PortfolioBanner | null>(null);
  const [projectsSettings, setProjectsSettings] = useState<PortfolioProjectsSettings | null>(null);
  const [coursesSettings, setCoursesSettings] = useState<PortfolioCoursesSettings | null>(null);
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
  const [globalSettings, setGlobalSettings] = useState<PortfolioGlobalSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('banner');
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [generatedMenuId, setGeneratedMenuId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('menu'));
  const [collectionPage, setCollectionPage] = useState<CollectionPage | null>(() => {
    const page = new URLSearchParams(window.location.search).get('page');
    return page === 'projects' || page === 'courses' || page === 'research' || page === 'lectures' ? page : null;
  });
  const [projectFilter, setProjectFilter] = useState('Tất cả');
  const [researchQuery, setResearchQuery] = useState('');
  const [registering, setRegistering] = useState(false);
  const mobileNavigationRef = useRef<HTMLDivElement>(null);

  const handleEnroll = async (course: PortfolioCourse) => {
    if (!currentUser) {
      onEnterSystem();
      return;
    }
    setRegistering(true);
    try {
      const success = await enrollCourse(course, currentUser);
      if (success) {
        const enrollmentId = `${currentUser.id}_${course.id}`;
        const newEnrollment: CourseStudent = {
          id: enrollmentId,
          accountId: currentUser.id,
          studentName: currentUser.fullName,
          studentEmail: currentUser.email,
          courseId: course.id,
          paymentStatus: 'paid',
          registrationDate: new Date().toISOString(),
          progress: 0,
          completedLessons: []
        };
        handleUpdateCourse({
          ...course,
          students: [...(course.students || []), newEnrollment]
        });
      }
    } catch (err) {
      console.error('Enrollment error:', err);
    } finally {
      setRegistering(false);
    }
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isMember = currentUser?.role === 'member';
  const accountActionLabel = isMember ? 'My Coursera' : isAuthenticated ? 'Quản trị' : 'Đăng nhập';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getPortfolioBanner(), getPortfolioAbout(), getPortfolioEducation(), getPortfolioExperience(), getPortfolioSkills(),
      getPortfolioProjects(), getPortfolioCourses(), getCourseStudents(), getPortfolioResearch(), getPortfolioLectures(), getPortfolioNavigation(), getPortfolioPosts(),
      getPortfolioProjectsSettings(), getPortfolioCoursesSettings(), getPortfolioGlobalSettings()
    ]).then(([bannerData, aboutData, educationData, experienceData, skillData, projectData, courseData, studentData, researchData, lectureData, navigationData, postData, projSettingsData, coursesSettingsData, globalSettingsData]) => {
      if (!mounted) return;
      setBanner(bannerData);
      setProjectsSettings(projSettingsData);
      setCoursesSettings(coursesSettingsData);
      setAbout(aboutData);
      setGlobalSettings(globalSettingsData);
      setEducation(educationData.sort((a, b) => a.sortOrder - b.sortOrder));
      setExperience(experienceData.sort((a, b) => a.sortOrder - b.sortOrder));
      setSkills(skillData.filter(item => item.visible).sort((a, b) => a.sortOrder - b.sortOrder));
      setProjects(projectData.filter(item => item.status === 'published' || item.status === 'completed' || item.status === 'ongoing').sort((a, b) => a.sortOrder - b.sortOrder));
      
      const mappedCourses = courseData.map(course => ({
        ...course,
        students: studentData.filter(s => s.courseId === course.id)
      }));
      setCourses(mappedCourses.filter(item => item.status === 'published'));
      setResearch(researchData);
      setLectures(lectureData.filter(item => item.status === 'published'));
      setNavigation(navigationData);
      setPosts(postData.filter(item => item.status === 'published'));
      const params = new URLSearchParams(window.location.search);
      const requestedProject = projectData.find(item => item.id === params.get('project'));
      const requestedCourse = mappedCourses.find(item => item.id === params.get('course'));
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
    const ids = ['banner', 'about', 'skills', 'education', 'experience', 'projects', 'courses', 'research', 'contact'];
    const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.isIntersecting && setActiveSection(entry.target.id)), { rootMargin: '-35% 0px -55%', threshold: 0 });
    ids.forEach(id => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [loading]);

  const menuItems = navigation.filter(item => item.visible && item.id !== 'nav_lectures' && item.label !== 'Bài giảng' && (!item.parentId || navigation.some(parent => parent.id === item.parentId && parent.visible)));
  const generatedMenuItem = navigation.find(item => item.id === generatedMenuId && (item.kind === 'article' || item.kind === 'course' || item.kind === 'project')) || null;
  const desktopMenuItems = menuItems.filter(item => !item.parentId && item.deviceVisibility !== 'mobile').sort((a, b) => a.sortOrder - b.sortOrder);
  const menuChildren = (parentId: string) => menuItems.filter(item => item.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const mobileRoots = menuItems.filter(item => !item.parentId && item.deviceVisibility !== 'desktop').sort((a, b) => a.sortOrder - b.sortOrder);
  const mobileMenuItems = mobileRoots.flatMap(parent => [
    parent,
    ...menuChildren(parent.id).filter(child => child.deviceVisibility !== 'desktop')
  ]);
  const collectionFromLink = (link: string): CollectionPage | null => {
    const key = link.replace('#', '');
    return key === 'projects' || key === 'courses' || key === 'research' || key === 'lectures' || key === 'my-courses' ? key : null;
  };
  const showCollectionPage = (page: CollectionPage, replace = false) => {
    setDetail(null);
    setGeneratedMenuId(null);
    setCollectionPage(page);
    const url = `?portfolio=true&page=${page}`;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const showHomeSection = (link = '#banner') => {
    setDetail(null);
    setGeneratedMenuId(null);
    setCollectionPage(null);
    window.history.pushState({}, '', `?portfolio=true${link}`);
    window.setTimeout(() => scrollToLink(link), 0);
  };
  const showDetail = (item: DetailItem, replace = false) => {
    const page: CollectionPage = item.type === 'project' ? 'projects' : item.type === 'course' ? 'courses' : item.type === 'lecture' ? 'lectures' : 'research';
    const queryKey = item.type === 'article' ? 'post' : item.type;
    setCollectionPage(generatedMenuId ? null : page);
    setDetail(item);
    const parentQuery = generatedMenuId ? `menu=${generatedMenuId}` : `page=${page}`;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', `?portfolio=true&${parentQuery}&${queryKey}=${item.data.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const showGeneratedMenuPage = (item: PortfolioNavigation, replace = false) => {
    setDetail(null);
    setCollectionPage(null);
    setGeneratedMenuId(item.id);
    window.history[replace ? 'replaceState' : 'pushState']({}, '', `?portfolio=true&menu=${item.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openMenuItem = (item: PortfolioNavigation) => {
    setOpenMenuId(null);
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
    if (item.kind === 'article' || item.kind === 'project' || item.kind === 'course') {
      return showGeneratedMenuPage(item);
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
  const handleDesktopNavigationWheel = (event: React.WheelEvent<HTMLElement>) => {
    const container = event.currentTarget;
    if (container.scrollWidth <= container.clientWidth) return;
    event.preventDefault();
    container.scrollLeft += event.deltaY || event.deltaX;
  };
  const categories = useMemo(() => ['Tất cả', ...Array.from(new Set(projects.map(item => item.category)))], [projects]);
  const visibleProjects = projectFilter === 'Tất cả' ? projects : projects.filter(item => item.category === projectFilter);
  const visibleResearch = research.filter(item => `${item.titleVi} ${item.titleEn} ${item.keywordsVi.join(' ')}`.toLowerCase().includes(researchQuery.toLowerCase()));

  const handleUpdateCourse = (updatedCourse: PortfolioCourse) => {
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    if (detail && detail.type === 'course' && detail.data.id === updatedCourse.id) {
      setDetail({ ...detail, data: updatedCourse });
    }
  };

  const collectionCards = useMemo<Record<CollectionPage, CollectionCard[]>>(() => {
    const allCourses = courses.map(item => ({ id: item.id, type: 'course' as const, title: item.title, description: item.briefDescription, image: item.coverImage, video: item.introVideo, category: item.category || 'Khóa học', date: item.publishDate, views: item.viewCount || 0, featured: false, detail: { type: 'course' as const, data: item } }));
    
    return {
      projects: projects.map(item => ({ id: item.id, type: 'project', title: item.title, description: item.briefDescription, image: item.coverImage, video: item.introVideo, category: item.category || 'Dự án', date: item.publishDate || item.timeline, views: item.viewCount || 0, featured: Boolean(item.isFeatured || item.isPinned), detail: { type: 'project', data: item } })),
      courses: allCourses,
      research: research.map(item => ({ id: item.id, type: 'research', title: item.titleVi, description: item.abstractVi, image: item.coverImage, category: item.field || researchTypeLabel[item.type], date: String(item.publishYear), views: item.viewCount || 0, featured: Boolean(item.isFeatured || item.isPinned), detail: { type: 'research', data: item } })),
      lectures: lectures.map(item => ({ id: item.id, type: 'lecture', title: item.title, description: item.detailedContent, image: item.images?.[0], category: item.subject || lectureTypeLabel[item.documentType], date: item.publishDate, views: item.viewCount || 0, featured: false, detail: { type: 'lecture', data: item } })),
      'my-courses': allCourses.filter(card => {
        const courseData = card.detail.data as PortfolioCourse;
        return courseData.students?.some(s => s.accountId === currentUser?.id || s.studentEmail === currentUser?.email);
      })
    };
  }, [projects, courses, research, lectures, currentUser]);
  const postCards = useMemo<CollectionCard[]>(() => posts.map(item => ({
    id: item.id,
    type: 'article',
    title: item.title,
    description: item.excerpt,
    image: item.coverImage,
    category: item.category || 'Bài viết',
    date: item.publishDate,
    views: item.viewCount || 0,
    featured: Boolean(item.isFeatured),
    detail: { type: 'article', data: item }
  })), [posts]);
  const generatedCards = generatedMenuItem?.kind === 'project'
    ? collectionCards.projects
    : generatedMenuItem?.kind === 'course'
      ? collectionCards.courses
      : postCards;
  const generatedMeta = generatedMenuItem ? {
    label: generatedMenuItem.label,
    eyebrow: generatedMenuItem.kind === 'project' ? 'Selected work' : generatedMenuItem.kind === 'course' ? 'Online learning' : 'Featured articles',
    title: generatedMenuItem.label,
    description: generatedMenuItem.pageDescription || (generatedMenuItem.kind === 'project'
      ? 'Những dự án thiết kế tiêu biểu, quy trình sáng tạo và giải pháp đã được triển khai.'
      : generatedMenuItem.kind === 'course'
        ? 'Các khóa học trực tuyến, video, học liệu và lộ trình học được tổ chức rõ ràng.'
        : 'Bài viết mới nhất, nội dung nổi bật và các chuyên mục được tuyển chọn.')
  } : null;
  useEffect(() => {
    const syncRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page');
      const nextPage = page === 'projects' || page === 'courses' || page === 'research' || page === 'lectures' || page === 'my-courses' ? page : null;
      setCollectionPage(nextPage);
      setGeneratedMenuId(params.get('menu'));
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

  useEffect(() => {
    const owner = about?.artistName || 'Multimedia Portfolio';
    const collectionTitles: Record<CollectionPage, string> = {
      projects: 'Dự án',
      courses: 'Khóa học',
      research: 'Nghiên cứu khoa học',
      lectures: 'Bài giảng và học liệu',
      'my-courses': 'My Coursera'
    };
    const sectionTitles: Record<string, string> = {
      banner: 'Trang chủ',
      about: 'Giới thiệu',
      skills: 'Kỹ năng',
      education: 'Học vấn',
      experience: 'Kinh nghiệm',
      projects: 'Dự án',
      courses: 'Khóa học',
      research: 'Nghiên cứu khoa học',
      lectures: 'Bài giảng và học liệu',
      contact: 'Liên hệ',
    };

    let pageTitle = generatedMenuItem?.label || (collectionPage ? (collectionPage === 'projects' && projectsSettings?.pageTitle ? projectsSettings.pageTitle : collectionPage === 'courses' && coursesSettings?.pageTitle ? coursesSettings.pageTitle : collectionTitles[collectionPage]) : sectionTitles[activeSection] || 'Trang chủ');
    if (detail) {
      if (detail.type === 'research') pageTitle = detail.data.titleVi;
      else pageTitle = detail.data.title;
    }
    document.title = `${pageTitle} | ${owner}`;
  }, [about?.artistName, activeSection, collectionPage, detail, generatedMenuItem?.label, projectsSettings?.pageTitle, coursesSettings?.pageTitle]);

  const glassStyle = globalSettings?.menuGlassEffect ? 'backdrop-blur-xl' : '';
  const opacityHex = globalSettings ? Math.round((globalSettings.menuOpacity / 100) * 255).toString(16).padStart(2, '0') : 'f2';
  const bgColor = globalSettings ? `#ffffff${opacityHex}` : 'white';

  if (loading || !banner || !about) {
    return <div className="grid min-h-screen place-items-center bg-[#f7fbf9]"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" /><p className="mt-3 text-sm font-bold text-slate-500">Đang chuẩn bị Portfolio...</p></div></div>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-slate-800 selection:bg-emerald-200 selection:text-emerald-950 lg:pb-0">
      <a href="#main-content" className="fixed left-4 top-3 z-[120] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white focus:translate-y-0">Bỏ qua menu</a>

      <header className="fixed inset-x-0 top-0 z-50 bg-transparent flex justify-center py-4 pointer-events-none px-4 md:px-8">
        <motion.div 
          layout
          onMouseEnter={() => setIsNavHovered(true)}
          onMouseLeave={() => setIsNavHovered(false)}
          animate={{
            gap: isScrolled && !isNavHovered ? '8px' : '16px',
            height: isScrolled && !isNavHovered ? '56px' : '72px',
            maxWidth: isScrolled && !isNavHovered ? '240px' : '1240px',
            marginTop: '12px',
            backgroundColor: isScrolled && !isNavHovered ? 'rgba(255, 255, 255, 0.92)' : 'transparent',
            borderColor: isScrolled && !isNavHovered ? 'rgba(226, 232, 240, 0.8)' : 'transparent',
            borderWidth: isScrolled && !isNavHovered ? '1px' : '0px',
            borderRadius: '9999px',
            boxShadow: isScrolled && !isNavHovered ? '0 10px 30px -10px rgba(15,23,42,0.15), 0 1px 3px rgba(15,23,42,0.05)' : 'none',
            paddingLeft: isScrolled && !isNavHovered ? '8px' : '16px',
            paddingRight: isScrolled && !isNavHovered ? '8px' : '16px',
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 25 }}
          className={`${isScrolled && !isNavHovered ? 'ml-0 mr-auto' : 'mx-auto'} w-full flex items-center justify-between pointer-events-auto ${isScrolled && !isNavHovered ? 'backdrop-blur-xl' : ''}`}
        >
          <motion.button 
            onClick={() => showHomeSection('#banner')} 
            animate={{
              padding: isScrolled && !isNavHovered ? '6px' : '10px 12px',
            }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
            className={`flex min-w-0 items-center gap-3 rounded-full text-left transition-all duration-300 cursor-pointer ${isScrolled && !isNavHovered ? '' : 'shadow-[0_16px_38px_-16px_rgba(15,23,42,0.45)] ' + glassStyle}`} 
            aria-label="Về đầu trang"
            style={{ backgroundColor: isScrolled && !isNavHovered ? 'transparent' : bgColor }}
          >
            {banner.logoImage ? (
              <motion.img 
                src={banner.logoImage} 
                alt="Logo" 
                animate={{
                  width: isScrolled && !isNavHovered ? 34 : 40,
                  height: isScrolled && !isNavHovered ? 34 : 40,
                }}
                transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                className="shrink-0 rounded-xl object-contain shadow-md shadow-emerald-600/15" 
              />
            ) : (
              <motion.span 
                animate={{
                  width: isScrolled && !isNavHovered ? 34 : 40,
                  height: isScrolled && !isNavHovered ? 34 : 40,
                }}
                transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                className="grid shrink-0 place-items-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-md shadow-emerald-600/20"
              >
                {(banner.logoText || about.artistName).charAt(0)}
              </motion.span>
            )}
            <motion.span 
              animate={{
                width: isScrolled && !isNavHovered ? 0 : 'auto',
                opacity: isScrolled && !isNavHovered ? 0 : 1,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              className="hidden min-w-0 xl:block overflow-hidden whitespace-nowrap text-left"
            >
              <strong className="block truncate text-base font-black tracking-tight text-slate-950">
                {banner.logoText || about.artistName}
              </strong>
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">Multimedia Portfolio</span>
            </motion.span>
          </motion.button>

          <motion.div 
            animate={{ flexGrow: isScrolled && !isNavHovered ? 0 : 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
            className="hidden lg:block h-px animate-none" 
          />

          <motion.nav 
            animate={{
              width: isScrolled && !isNavHovered ? 0 : 'auto',
              opacity: isScrolled && !isNavHovered ? 0 : 1,
              scale: isScrolled && !isNavHovered ? 0.9 : 1,
            }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
            className={`hidden shrink-0 items-center gap-1 p-1.5 ${isScrolled && !isNavHovered ? '' : 'shadow-[0_14px_36px_-14px_rgba(15,23,42,0.28)] ' + glassStyle} lg:flex xl:max-w-[1000px] rounded-full overflow-visible`} 
            aria-label="Điều hướng chính"
            style={{ backgroundColor: isScrolled && !isNavHovered ? 'transparent' : bgColor, pointerEvents: isScrolled && !isNavHovered ? 'none' : 'auto' }}
          >
            {desktopMenuItems.map(item => {
              const section = item.link.replace('#', '');
              const children = menuChildren(item.id).filter(child => child.deviceVisibility !== 'mobile');
              const linkedPage = collectionFromLink(item.link);
              const isActive = generatedMenuId === item.id || children.some(child => child.id === generatedMenuId) || (linkedPage ? collectionPage === linkedPage : !collectionPage && !generatedMenuId && (activeSection === section || children.some(child => child.link.replace('#', '') === activeSection)));
              return (
                <div key={item.id} className="group relative shrink-0">
                  <button
                    onClick={(e) => {
                      if (children.length > 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === item.id ? null : item.id);
                      } else {
                        openMenuItem(item);
                      }
                    }}
                    className={`flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                      item.highlight
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700'
                        : isActive
                          ? 'bg-emerald-100 text-slate-950 shadow-sm'
                          : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    {item.label}
                    {!isActive && children.length > 0 && <ChevronDown className="h-3 w-3 text-slate-400" />}
                  </button>
                  {children.length > 0 && (
                    <div className={`absolute left-1/2 top-full z-50 min-w-[140px] -translate-x-1/2 rounded-2xl p-1.5 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200/50 transition-all duration-200 ${openMenuId === item.id ? 'visible translate-y-4 opacity-100' : 'invisible translate-y-2 opacity-0'} group-hover:visible group-hover:translate-y-4 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-4 group-focus-within:opacity-100 ${glassStyle}`} style={{ backgroundColor: bgColor }}>
                      <div className="flex flex-col gap-0.5">
                        {children.map(child => (
                          <button key={child.id} onClick={() => openMenuItem(child)} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[10px] font-bold transition-colors cursor-pointer ${child.highlight ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                            {React.createElement(navigationIcons[child.icon] || ExternalLink, { className: 'h-3 w-3 opacity-80' })}{child.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.nav>

          <motion.div 
            animate={{ flexGrow: isScrolled && !isNavHovered ? 0 : 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
            className="hidden lg:block h-px animate-none" 
          />

          <div className="flex items-center gap-2 shrink-0">
            <motion.a 
              href="/tracuu.html" 
              aria-label="Mở trang tra cứu" 
              animate={{
                padding: isScrolled && !isNavHovered ? '8px' : '10px 16px',
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              className={`hidden items-center justify-center rounded-full text-xs font-extrabold text-slate-700 hover:bg-white hover:text-emerald-700 sm:inline-flex transition-all duration-300 cursor-pointer ${isScrolled && !isNavHovered ? '' : 'shadow-[0_14px_36px_-16px_rgba(15,23,42,0.4)] ' + glassStyle}`}
              style={{ backgroundColor: isScrolled && !isNavHovered ? 'transparent' : bgColor }}
            >
              <Search className="h-4 w-4 shrink-0" />
              <motion.span
                animate={{
                  width: isScrolled && !isNavHovered ? 0 : 'auto',
                  opacity: isScrolled && !isNavHovered ? 0 : 1,
                  marginLeft: isScrolled && !isNavHovered ? 0 : 8,
                }}
                transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                className="hidden xl:block overflow-hidden whitespace-nowrap"
              >
                Tra cứu
              </motion.span>
            </motion.a>
            <motion.button 
              onClick={onEnterSystem} 
              aria-label={isMember ? 'Mở các khóa học của tôi' : isAuthenticated ? 'Mở trang quản trị' : 'Đăng nhập quản trị'} 
              animate={{
                padding: isScrolled && !isNavHovered ? '8px' : '10px 16px',
                backgroundColor: isScrolled && !isNavHovered ? 'transparent' : '#059669',
                color: isScrolled && !isNavHovered ? '#334155' : '#ffffff',
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              className={`hidden items-center justify-center rounded-full text-xs font-extrabold sm:inline-flex cursor-pointer ${isScrolled && !isNavHovered ? '' : 'shadow-lg shadow-emerald-600/20 hover:bg-emerald-700'}`}
            >
              {isAuthenticated ? (
                isMember ? <FileText className="h-4 w-4 shrink-0" /> : <UserRound className="h-4 w-4 shrink-0" />
              ) : (
                <LockKeyhole className="h-4 w-4 shrink-0" />
              )}
              <motion.span
                animate={{
                  width: isScrolled && !isNavHovered ? 0 : 'auto',
                  opacity: isScrolled && !isNavHovered ? 0 : 1,
                  marginLeft: isScrolled && !isNavHovered ? 0 : 8,
                }}
                transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                className="hidden xl:block overflow-hidden whitespace-nowrap"
              >
                {accountActionLabel}
              </motion.span>
            </motion.button>

            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <motion.button 
                  onClick={() => setShowProfile(true)} 
                  aria-label="Xem hồ sơ" 
                  animate={{
                    padding: isScrolled && !isNavHovered ? '8px' : '10px 16px',
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                  className={`hidden items-center justify-center rounded-full text-xs font-extrabold text-slate-700 hover:bg-white hover:text-emerald-700 sm:inline-flex transition-all duration-300 cursor-pointer ${isScrolled && !isNavHovered ? '' : 'shadow-[0_14px_36px_-16px_rgba(15,23,42,0.4)] ' + glassStyle}`}
                  style={{ backgroundColor: isScrolled && !isNavHovered ? 'transparent' : bgColor }}
                >
                  <UserCircle className="h-4 w-4 shrink-0" />
                  <motion.span
                    animate={{
                      width: isScrolled && !isNavHovered ? 0 : 'auto',
                      opacity: isScrolled && !isNavHovered ? 0 : 1,
                      marginLeft: isScrolled && !isNavHovered ? 0 : 8,
                    }}
                    transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                    className="hidden xl:block overflow-hidden whitespace-nowrap"
                  >
                    Hồ sơ
                  </motion.span>
                </motion.button>

                <motion.button 
                  onClick={onLogout} 
                  aria-label="Đăng xuất" 
                  animate={{
                    padding: isScrolled && !isNavHovered ? '8px' : '10px 16px',
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                  className={`hidden items-center justify-center rounded-full text-xs font-extrabold text-red-600 hover:bg-red-50 sm:inline-flex transition-all duration-300 cursor-pointer ${isScrolled && !isNavHovered ? '' : 'shadow-[0_14px_36px_-16px_rgba(239,68,68,0.2)] ' + glassStyle}`}
                  style={{ backgroundColor: isScrolled && !isNavHovered ? 'transparent' : bgColor }}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <motion.span
                    animate={{
                      width: isScrolled && !isNavHovered ? 0 : 'auto',
                      opacity: isScrolled && !isNavHovered ? 0 : 1,
                      marginLeft: isScrolled && !isNavHovered ? 0 : 8,
                    }}
                    transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                    className="hidden xl:block overflow-hidden whitespace-nowrap"
                  >
                    Đăng xuất
                  </motion.span>
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </header>

      <nav className="fixed bottom-0 left-3 right-3 z-[70] pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Điều hướng trang chủ trên thiết bị di động">
        <div 
          className={`relative mx-auto max-w-xl overflow-visible rounded-[2.25rem] p-1.5 pt-5 shadow-[0_-10px_40px_-14px_rgba(15,23,42,0.28)] ${glassStyle}`}
          style={{ backgroundColor: bgColor }}
        >
          <div
            ref={mobileNavigationRef}
            onWheel={handleMobileNavigationWheel}
            className="flex snap-x snap-mandatory items-end gap-1 overflow-x-auto overscroll-x-contain rounded-[1.8rem] scroll-smooth px-1 pb-0.5 pt-1 scrollbar-none"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {mobileMenuItems.map(item => {
              const itemSection = item.link.replace('#', '');
              const linkedPage = collectionFromLink(item.link);
              const isActive = generatedMenuId === item.id || (linkedPage ? collectionPage === linkedPage : !collectionPage && !generatedMenuId && activeSection === itemSection);
              const Icon = navigationIcons[item.icon] || ExternalLink;
              return (
                <button
                  key={item.id}
                  onClick={() => openMenuItem(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex w-[76px] shrink-0 snap-center flex-col items-center justify-end gap-1 rounded-[1.4rem] px-1 pb-2 pt-1 text-center transition-all cursor-pointer ${isActive ? 'text-emerald-700' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <span className={`grid place-items-center rounded-full transition-all duration-300 ${isActive ? '-mt-5 h-14 w-14 bg-emerald-500 text-white shadow-[0_10px_22px_-7px_rgba(16,185,129,0.7)] ring-4 ring-white' : 'h-8 w-8'}`}>
                    <Icon className={isActive ? 'h-6 w-6' : 'h-5 w-5'} />
                  </span>
                  <span className={`max-w-full truncate text-[9px] leading-none ${isActive ? 'font-black' : 'font-bold'}`}>{item.label}</span>
                </button>
              );
            })}
            <a
              href="/tracuu.html"
              className="group flex w-[76px] shrink-0 snap-center flex-col items-center justify-end gap-1 rounded-[1.4rem] px-1 pb-2 pt-1 text-center text-slate-400 transition-all hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
              aria-label="Mở trang tra cứu"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full"><Search className="h-5 w-5" /></span>
              <span className="max-w-full truncate text-[9px] font-bold leading-none">Tra cứu</span>
            </a>
            <button
              onClick={onEnterSystem}
              className="group flex w-[76px] shrink-0 snap-center flex-col items-center justify-end gap-1 rounded-[1.4rem] px-1 pb-2 pt-1 text-center text-slate-400 transition-all hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
              aria-label={isMember ? 'Mở các khóa học của tôi' : isAuthenticated ? 'Mở trang quản trị' : 'Đăng nhập quản trị'}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full"><LockKeyhole className="h-5 w-5" /></span>
              <span className="max-w-full truncate text-[9px] font-bold leading-none">{isMember ? 'Coursera' : isAuthenticated ? 'Quản trị' : 'Đăng nhập'}</span>
            </button>
          </div>
        </div>
      </nav>

      <main id="main-content">
        {detail ? (
          <PortfolioDetailPage
            item={detail}
            viewer={currentUser}
            related={(generatedMenuItem ? generatedCards : detail.type === 'article' ? postCards : collectionCards[collectionPage || (detail.type === 'project' ? 'projects' : detail.type === 'course' ? 'courses' : detail.type === 'lecture' ? 'lectures' : 'research')]).filter(card => card.id !== detail.data.id)}
            onOpen={showDetail}
            onBack={() => setDetail(null)}
            globalSettings={globalSettings}
            onUpdateCourse={handleUpdateCourse}
            onEnterSystem={onEnterSystem}
            onEnroll={handleEnroll}
            registering={registering}
          />
        ) : generatedMenuItem && generatedMeta ? (
          <PortfolioCollectionPage page={generatedMenuItem.kind === 'project' ? 'projects' : generatedMenuItem.kind === 'course' ? 'courses' : 'projects'} cards={generatedCards} onOpen={showDetail} metaOverride={generatedMeta} projectsSettings={projectsSettings} coursesSettings={coursesSettings} onCollectionPage={showCollectionPage} onEnroll={handleEnroll} registering={registering} viewer={currentUser} />
        ) : collectionPage ? (
          <PortfolioCollectionPage page={collectionPage} cards={collectionCards[collectionPage]} onOpen={showDetail} projectsSettings={projectsSettings} coursesSettings={coursesSettings} onCollectionPage={showCollectionPage} onEnroll={handleEnroll} registering={registering} viewer={currentUser} />
        ) : <>
        {banner.visible && (
          <section id="banner" className="relative scroll-mt-0 bg-slate-950">
              <div className="relative min-h-[720px] overflow-hidden bg-slate-950 sm:min-h-[780px]">
                {banner.mediaType === 'video' && banner.videoUrl ? (
                  <video
                    src={banner.videoUrl}
                    autoPlay
                    loop={banner.videoLoop !== false}
                    muted
                    playsInline
                    preload="auto"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ filter: `brightness(${banner.brightness}%)` }}
                    onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <img src={banner.backgroundImage} alt={banner.altText} className="absolute inset-0 h-full w-full object-cover" style={{ filter: `brightness(${banner.brightness}%)` }} fetchPriority="high" />
                )}
                {banner.showOverlay !== false && (
                  <div className="absolute inset-0" style={{ backgroundColor: banner.overlayColor, opacity: banner.overlayOpacity }} />
                )}
                <motion.div initial={banner.animate ? { opacity: 0, y: 28 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }} className={`relative z-10 mx-auto flex min-h-[720px] w-full max-w-7xl flex-col justify-center px-5 pb-28 pt-32 sm:min-h-[780px] sm:px-8 lg:px-10 ${banner.alignment === 'left' ? 'items-start text-left' : banner.alignment === 'right' ? 'items-end text-right' : 'items-center text-center'}`}>
                  {banner.showLabel !== false && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                      <Sparkles className="h-4 w-4 text-emerald-300" />
                      {banner.labelText || 'Multimedia Designer & Artist'}
                    </span>
                  )}
                  {banner.showTitle !== false && (
                    <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                      {banner.title}
                    </h1>
                  )}
                  <p className="mt-7 max-w-2xl text-sm leading-7 text-slate-200 sm:text-lg sm:leading-8">
                    {banner.description}
                  </p>
                  {banner.showButton !== false && (
                    <div className={`mt-9 flex flex-wrap gap-3 ${banner.alignment === 'left' ? 'justify-start' : banner.alignment === 'right' ? 'justify-end' : 'justify-center'}`}>
                      <button onClick={() => scrollToLink(banner.buttonLink || '#about')} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-400">
                        {banner.buttonText || 'Tìm hiểu thêm'} <ArrowRight className="h-4 w-4" />
                      </button>
                      <button onClick={() => scrollToLink('#about')} className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-black text-white backdrop-blur-md hover:bg-white/20">
                        <UserRound className="h-4 w-4" /> Giới thiệu bản thân
                      </button>
                    </div>
                  )}
                  <button onClick={() => scrollToLink('#about')} className="absolute bottom-24 sm:bottom-28 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70" aria-label="Cuộn xuống phần giới thiệu">
                    Cuộn để khám phá <ChevronDown className="h-5 w-5 animate-bounce" />
                  </button>
                </motion.div>
              </div>
          </section>
        )}

        {banner.visible && (
          <div className={`${sectionShell} relative z-20 -mt-16 sm:-mt-20 mb-8 sm:mb-12`}>
            <div className={`mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] shadow-2xl shadow-slate-950/10 sm:grid-cols-2 lg:grid-cols-4 ${glassStyle}`} style={{ backgroundColor: bgColor }}>
              {(banner.quickLinks && banner.quickLinks.length > 0 ? banner.quickLinks : [
                { icon: 'Palette', title: 'Art Direction', text: 'Định hướng hình ảnh nhất quán' },
                { icon: 'Film', title: 'Motion & 3D', text: 'Chuyển động giàu cảm xúc' },
                { icon: 'Code', title: 'Creative Tech', text: 'Trải nghiệm số tương tác' },
                { icon: 'GraduationCap', title: 'Education', text: 'Chia sẻ tri thức thực hành' }
              ]).map((item, index) => {
                const IconComponent = quickLinkIcons[item.icon] || Sparkles;
                return (
                  <div key={index} className="flex items-start gap-4 p-6 transition-colors hover:bg-emerald-50/30">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <IconComponent className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <section id="about" className="scroll-mt-24 bg-white py-24 sm:py-28">
          <div className={sectionShell}>
            <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
              <Reveal className="relative"><div className="absolute -inset-5 rounded-[2.5rem] bg-emerald-100/70 blur-2xl" /><img src={about.avatarUrl} alt={`Chân dung ${about.fullName}`} loading="lazy" className="relative aspect-[4/5] w-full rounded-[2.25rem] object-cover shadow-2xl" /><div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/60 bg-white/90 p-5 backdrop-blur"><p className="text-xl font-black text-slate-950">{about.artistName}</p><p className="mt-1 text-xs font-bold text-emerald-600">{about.jobTitle}</p></div></Reveal>
              <Reveal><SectionHeading eyebrow={about.showAboutLabel !== false ? "Giới thiệu bản thân" : undefined} title={about.fullName || about.artistName} description={about.briefBio} /><p className="mt-6 text-sm leading-8 text-slate-600">{about.detailedAbout}</p><blockquote className="mt-7 rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-5 text-sm font-semibold italic leading-7 text-slate-700"><Quote className="mb-2 h-5 w-5 text-emerald-600" />“{about.creativePhilosophy}”</blockquote><div className="mt-7 flex flex-wrap gap-2">{about.specialties.map(value => <span key={value} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">{value}</span>)}</div>{about.showCvButton && <a href={about.cvUrl || '#'} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"><Download className="h-4 w-4" /> Tải hồ sơ năng lực</a>}</Reveal>
            </div>
          </div>
        </section>

        <section className="bg-white py-24 sm:py-28" aria-label="Học vấn và kinh nghiệm">
          <div className={sectionShell}>
            <div className="grid gap-8 lg:grid-cols-2">
              <Reveal><div id="education" className="scroll-mt-28"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><GraduationCap className="h-5 w-5" /></span><h3 className="text-2xl font-black text-slate-950">Học vấn</h3></div><div className="mt-6 space-y-4">{education.map(item => <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6"><p className="text-xs font-extrabold text-emerald-600">{item.startDate} — {item.isOngoing ? 'Hiện tại' : item.endDate}</p><h4 className="mt-2 text-base font-black text-slate-950">{item.degree}</h4><p className="mt-1 text-xs font-bold text-slate-500">{item.major} • {item.school}</p><p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>{item.achievement && <p className="mt-3 flex gap-2 text-xs font-bold text-emerald-700"><Award className="h-4 w-4 shrink-0" />{item.achievement}</p>}</article>)}</div></div></Reveal>
              <Reveal delay={0.08}><div id="experience" className="scroll-mt-28"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><BriefcaseBusiness className="h-5 w-5" /></span><h3 className="text-2xl font-black text-slate-950">Kinh nghiệm</h3></div><div className="mt-6 space-y-4">{experience.map(item => <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6"><p className="text-xs font-extrabold text-emerald-600">{item.startDate} — {item.isOngoing ? 'Hiện tại' : item.endDate}</p><h4 className="mt-2 text-base font-black text-slate-950">{item.title}</h4><p className="mt-1 text-xs font-bold text-slate-500">{item.company}</p><p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p></article>)}</div></div></Reveal>
            </div>
          </div>
        </section>

        <section id="skills" className="scroll-mt-24 bg-[#effaf5] py-24 sm:py-28">
          <div className={sectionShell}>
            <Reveal><SectionHeading eyebrow="Kỹ năng & Dịch vụ" title="Giải pháp sáng tạo từ ý tưởng đến trải nghiệm" description="Kết hợp mỹ thuật, chuyển động và công nghệ để tạo nên những sản phẩm đa phương tiện rõ ràng, đẹp và có giá trị sử dụng." centered /></Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill, index) => { const Icon = skillIcons[skill.icon] || Sparkles; return <Reveal key={skill.id} delay={Math.min(index * 0.06, 0.24)}><article className="group h-full rounded-[1.75rem] border border-emerald-100/80 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/5"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"><Icon className="h-6 w-6" /></span><span className="text-sm font-black text-emerald-600">{skill.proficiency}%</span></div><p className="mt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">{skill.category}</p><h3 className="mt-2 text-xl font-black text-slate-950">{skill.name}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{skill.description}</p><div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${skill.proficiency}%` }} /></div></article></Reveal>; })}
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
              {visibleProjects.slice(0, 6).map((project, index) => {
                const card: CollectionCard = {
                  id: project.id,
                  type: 'project',
                  title: project.title,
                  description: project.briefDescription,
                  image: project.coverImage,
                  video: project.introVideo,
                  category: project.category,
                  date: project.timeline,
                  views: project.viewCount,
                  featured: project.isFeatured,
                  detail: { type: 'project', data: project }
                };
                return (
                  <Reveal key={project.id} delay={Math.min(index * 0.05, 0.18)}>
                    <button onClick={() => showDetail({ type: 'project', data: project })} className="group h-full w-full overflow-hidden rounded-[1.5rem] bg-white/5 text-left ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/10">
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <CollectionImage card={card} />
                        {project.isFeatured && <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">Nổi bật</span>}
                      </div>
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                          <span className="truncate">{project.category}</span>
                          <span className="shrink-0">{project.timeline}</span>
                        </div>
                        <h3 className="mt-3 line-clamp-2 text-lg font-black leading-snug">{project.title}</h3>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{project.briefDescription}</p>
                        <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-white group-hover:text-emerald-400">Xem case study <ArrowRight className="h-3.5 w-3.5" /></span>
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="courses" className="scroll-mt-24 bg-[#effaf5] py-20 sm:py-24">
          <div className={sectionShell}>
            <Reveal><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><SectionHeading eyebrow="Khóa học trực tuyến" title="Học từ quy trình sáng tạo thực tế" description="Các chương trình học có cấu trúc rõ ràng, tập trung vào thực hành và kết quả đầu ra có thể đưa vào Portfolio." /><button onClick={() => showCollectionPage('courses')} className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white hover:bg-emerald-700">Xem tất cả khóa học <ArrowRight className="h-4 w-4" /></button></div></Reveal>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 6).map(course => {
                const card: CollectionCard = {
                  id: course.id,
                  type: 'course',
                  title: course.title,
                  description: course.briefDescription,
                  image: course.coverImage,
                  video: course.introVideo,
                  category: course.category,
                  date: course.publishDate,
                  views: course.viewCount,
                  featured: false,
                  detail: { type: 'course', data: course }
                };
                return (
                  <Reveal key={course.id}>
                    <button onClick={() => showDetail({ type: 'course', data: course })} className="group h-full w-full overflow-hidden rounded-[1.5rem] bg-white text-left shadow-sm ring-1 ring-emerald-100 transition hover:-translate-y-1 hover:shadow-xl">
                      <div className="relative aspect-[16/9] overflow-hidden">
                        <CollectionImage card={card} />
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700 backdrop-blur">{levelLabel[course.level]}</span>
                      </div>
                      <div className="p-5">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600">{course.category}</p>
                        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-slate-950">{course.title}</h3>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{course.briefDescription}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500">
                          <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {course.lessonsCount} bài</span>
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {course.studentsCount} học viên</span>
                          <strong className="ml-auto text-sm text-emerald-600">{formatCurrency(course.salePrice || course.price)}</strong>
                        </div>
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="research" className="scroll-mt-24 bg-white py-20 sm:py-24">
          <div className={sectionShell}>
            <Reveal><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><SectionHeading eyebrow="Nghiên cứu khoa học" title="Công trình & xuất bản học thuật" description="Các nghiên cứu tại giao điểm giữa thiết kế đa phương tiện, trải nghiệm người dùng và công nghệ sáng tạo." /><button onClick={() => showCollectionPage('research')} className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white hover:bg-emerald-700">Xem tất cả nghiên cứu <ArrowRight className="h-4 w-4" /></button></div></Reveal>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleResearch.slice(0, 6).map(item => <Reveal key={item.id}><button onClick={() => showDetail({ type: 'research', data: item })} className="group flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] bg-slate-50 text-left ring-1 ring-slate-100 transition hover:-translate-y-1 hover:bg-emerald-50 hover:shadow-xl"><div className="aspect-[16/8] overflow-hidden">{item.coverImage ? <img src={item.coverImage} alt={item.titleVi} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-emerald-100 to-slate-100 text-emerald-600"><Award className="h-10 w-10" /></div>}</div><div className="flex flex-1 flex-col p-5"><div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-wider text-emerald-600"><span className="truncate">{researchTypeLabel[item.type]}</span><span className="shrink-0">{item.publishYear}</span></div><h3 className="mt-3 line-clamp-2 text-lg font-black leading-snug text-slate-950">{item.titleVi}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{item.abstractVi}</p><p className="mt-auto pt-4 text-[10px] font-bold text-slate-400">{item.authors.slice(0, 2).join(', ')}</p></div></button></Reveal>)}</div>
          </div>
        </section>


        <section id="contact" className="scroll-mt-24 bg-white py-24 sm:py-28"><div className={sectionShell}><Reveal><div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white sm:p-12 lg:p-16"><div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" /><div className="relative grid gap-12 lg:grid-cols-[1fr_0.9fr]"><div><span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-400">Liên hệ hợp tác</span><h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">Bạn có một ý tưởng thú vị?</h2><p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">Hãy cùng biến ý tưởng đó thành một trải nghiệm đa phương tiện rõ ràng, đẹp và đáng nhớ.</p><a href={`mailto:${about.email}`} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black text-white hover:bg-emerald-400"><Mail className="h-4 w-4" /> Bắt đầu trao đổi</a></div><div className="grid gap-3"><a href={`mailto:${about.email}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><Mail className="h-5 w-5" /></span><span><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</small><strong className="text-sm">{about.email}</strong></span></a><a href={`tel:${about.phone}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><Phone className="h-5 w-5" /></span><span><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Điện thoại</small><strong className="text-sm">{about.phone}</strong></span></a><div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><MapPin className="h-5 w-5" /></span><span><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Địa điểm</small><strong className="text-sm">{about.location}</strong></span></div><div className="mt-2 flex flex-wrap gap-2">{about.socialLinks.map(link => { const Icon = link.platform.toLowerCase().includes('github') ? Github : link.platform.toLowerCase().includes('linkedin') ? Linkedin : Share2; return <a key={link.platform} href={link.url} target="_blank" rel="noreferrer" aria-label={link.platform} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold hover:bg-emerald-500"><Icon className="h-4 w-4" />{link.platform}</a>; })}</div></div></div></div></Reveal></div></section>
        </>}
      </main>

      <footer className="border-t border-slate-100 bg-white py-8">
        <div className={`${sectionShell} flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left`}>
          <div>
            <p className="font-black text-slate-950">{about.artistName}</p>
            <p className="mt-1 text-xs text-slate-500">© {new Date().getFullYear()} Multimedia Portfolio. Bảo lưu mọi quyền.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={onEnterSystem} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700 cursor-pointer">
              {isAuthenticated ? (
                isMember ? <FileText className="h-4 w-4" /> : <UserRound className="h-4 w-4" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}
              {accountActionLabel}
            </button>
            {isAuthenticated && (
              <button onClick={onLogout} className="inline-flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer">
                <LogOut className="h-4 w-4" /> Đăng xuất
              </button>
            )}
          </div>
        </div>
      </footer>

      {showProfile && currentUser && (
        <ProfileModal 
          user={currentUser} 
          onSaveProfile={async (updated) => {
            if (onUpdateUser) await onUpdateUser(updated);
            setShowProfile(false);
          }} 
          onClose={() => setShowProfile(false)} 
        />
      )}
    </div>
  );
}
