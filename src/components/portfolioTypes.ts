export interface BannerQuickLink {
  icon: string;
  title: string;
  text: string;
}

export interface PortfolioBanner {
  backgroundImage: string;
  backgroundVideo?: string;
  loopVideo?: boolean;
  smoothMotion?: boolean;
  enableOverlay?: boolean;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  altText: string;
  alignment: 'left' | 'center' | 'right';
  overlayColor: string;
  overlayOpacity: number;
  showText?: boolean;
  brightness: number;
  animate: boolean;
  visible: boolean;
  showTitle?: boolean;
  showLabel?: boolean;
  showButton?: boolean;
  labelText?: string;
  mediaType?: 'image' | 'video';
  videoUrl?: string;
  videoLoop?: boolean;
  showOverlay?: boolean;
  logoText?: string;
  logoImage?: string;
  quickLinks?: BannerQuickLink[];
}

export interface PortfolioAbout {
  fullName: string;
  artistName: string;
  jobTitle: string;
  avatarUrl: string;
  briefBio: string;
  detailedAbout: string;
  creativePhilosophy: string;
  specialties: string[];
  location: string;
  email: string;
  phone: string;
  socialLinks: { platform: string; url: string; icon?: string }[];
  cvUrl: string;
  showCvButton: boolean;
  showAboutLabel?: boolean;
}

export interface PortfolioEducation {
  id: string;
  degree: string;
  major: string;
  school: string;
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  description: string;
  achievement: string;
  certificateUrl: string;
  sortOrder: number;
}

export interface PortfolioExperience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  isOngoing: boolean;
  description: string;
  achievements: string[];
  logoUrl: string;
  websiteUrl: string;
  sortOrder: number;
}

export interface PortfolioSkill {
  id: string;
  name: string;
  category: string; // Design, Technical, Soft, Other
  proficiency: number; // 0 - 100
  icon: string;
  description: string;
  relatedProjects: string[]; // Project IDs
  sortOrder: number;
  visible: boolean;
}

export interface PortfolioProject {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  gallery: string[];
  introVideo: string;
  loopVideo?: boolean;
  briefDescription: string;
  detailedContent: string;
  context: string;
  problem: string;
  goal: string;
  targetAudience: string;
  process: string;
  designIdea: string;
  solution: string;
  result: string;
  role: string;
  client: string;
  members: string[];
  timeline: string;
  tools: string[];
  category: string;
  tags: string[];
  relatedProjects: string[];
  status: 'draft' | 'pending' | 'published' | 'hidden' | 'ongoing' | 'completed' | 'archived' | 'scheduled';
  publishDate: string;
  viewCount: number;
  sortOrder: number;
  isFeatured: boolean;
  isPinned: boolean;
  showViews: boolean;
  showShare: boolean;
  isPrivate: boolean;
  password?: string;
}

export interface PortfolioProjectsSettings {
  banner: PortfolioBanner;
  pageTitle: string;
  postsPerCategory: number;
  layoutStyle?: 'grid' | 'list';
}

export interface PortfolioCoursesSettings {
  banner: PortfolioBanner;
  pageTitle: string;
  postsPerCategory: number;
  layoutStyle?: 'grid' | 'list';
}

export interface PortfolioCourse {
  id: string;
  title: string;
  coverImage: string;
  introVideo: string;
  loopVideo?: boolean;
  briefDescription: string;
  detailedDescription: string;
  objectives: string[];
  targetStudents: string[];
  requirements: string[];
  learningOutcomes: string[];
  duration: string;
  level: 'basic' | 'intermediate' | 'advanced';
  format: string; // Online, Zoom, Offline, Hybrid
  price: number;
  salePrice: number;
  saleStartDate?: string;
  saleEndDate?: string;
  hasCertificate: boolean;
  documents: { name: string; url: string }[];
  instructor: string;
  category: string;
  status: 'draft' | 'published' | 'hidden';
  publishDate: string;
  viewCount: number;
  lessonsCount: number;
  studentsCount: number;
  students?: CourseStudent[];
  chapters?: CourseChapter[];
}

export interface CourseStudent {
  id: string;
  accountId?: string;
  studentName?: string;
  studentEmail?: string;
  name?: string;
  email?: string;
  courseId?: string;
  progress: number; // 0 - 100
  quizScore?: number;
  registrationDate?: string;
  registerDate?: string;
  completedLessons?: string[];
  completionDate?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  hasCertificate?: boolean;
  isLocked?: boolean;
  lessonNotes?: Record<string, any[]>;
  lessonHighlights?: Record<string, string[]>;
}

export interface PortfolioResearch {
  id: string;
  titleVi: string;
  titleEn: string;
  type: 'article' | 'conference' | 'project' | 'book' | 'book_chapter' | 'thesis' | 'report' | 'proceedings';
  authors: string[];
  coAuthors: string[];
  affiliation: string;
  publishYear: number;
  journalOrConference: string;
  volume: string;
  issue: string;
  pages: string;
  issnOrIsbn: string;
  doi: string;
  abstractVi: string;
  abstractEn: string;
  keywordsVi: string[];
  keywordsEn: string[];
  content: string;
  coverImage: string;
  pdfUrl: string;
  publisherUrl: string;
  citationApa: string;
  relatedResearch: string[];
  viewPermission: 'online' | 'abstract_only' | 'allow_download';
  isFeatured: boolean;
  isPinned: boolean;
  field: string;
  viewCount: number;
  downloadCount: number;
}

export interface PortfolioPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'hidden';
  publishDate: string;
  viewCount: number;
  isFeatured: boolean;
}

export interface PortfolioNavigation {
  id: string;
  label: string;
  link: string; // Section anchor (#about) or relative path or external URL
  target: '_self' | '_blank';
  icon: string;
  parentId: string | null;
  sortOrder: number;
  visible: boolean;
  highlight?: boolean;
  deviceVisibility?: 'all' | 'desktop' | 'mobile';
  kind?: 'scroll' | 'article' | 'course' | 'project' | 'external';
  contentId?: string;
  pageDescription?: string;
  locked?: boolean;
}

// Danh sách các khối đang hiển thị trên trang chủ portfolio.
// Mỗi khóa tương ứng với một section trong PortfolioWebsite.
export type HomeSectionKey =
  | 'banner'
  | 'quickLinks'
  | 'about'
  | 'education'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'courses'
  | 'research'
  | 'contact';

export type HomeSectionVisibility = Partial<Record<HomeSectionKey, boolean>>;

// Nhãn tiếng Việt cho từng khối, dùng chung cho bảng bật tắt trong trang quản trị.
export const HOME_SECTION_LABELS: Array<{ key: HomeSectionKey; label: string; hint: string }> = [
  { key: 'banner', label: 'Banner đầu trang', hint: 'Ảnh hoặc video lớn kèm tiêu đề và nút kêu gọi ở đầu trang chủ.' },
  { key: 'quickLinks', label: 'Dải bốn ô giới thiệu nhanh', hint: 'Bốn ô nhỏ nằm đè lên mép dưới của banner.' },
  { key: 'about', label: 'Giới thiệu bản thân', hint: 'Ảnh chân dung, tiểu sử, triết lý sáng tạo và nút tải hồ sơ năng lực.' },
  { key: 'education', label: 'Học vấn', hint: 'Cột bên trái trong khối học vấn và kinh nghiệm.' },
  { key: 'experience', label: 'Kinh nghiệm', hint: 'Cột bên phải trong khối học vấn và kinh nghiệm.' },
  { key: 'skills', label: 'Kỹ năng và dịch vụ', hint: 'Lưới thẻ kỹ năng kèm thanh phần trăm thành thạo.' },
  { key: 'projects', label: 'Dự án tuyển chọn', hint: 'Khối nền tối giới thiệu các dự án nổi bật.' },
  { key: 'courses', label: 'Khóa học trực tuyến', hint: 'Lưới thẻ khóa học kèm giá và số học viên.' },
  { key: 'research', label: 'Nghiên cứu khoa học', hint: 'Lưới thẻ công trình và bài báo học thuật.' },
  { key: 'contact', label: 'Liên hệ hợp tác', hint: 'Khối cuối trang gồm email, điện thoại, địa điểm và mạng xã hội.' }
];

// Khối chưa từng được cấu hình thì mặc định là đang bật, để dữ liệu cũ không bị mất hiển thị.
export const isHomeSectionVisible = (
  settings: PortfolioGlobalSettings | null | undefined,
  key: HomeSectionKey
): boolean => settings?.homeSections?.[key] !== false;

export interface PortfolioGlobalSettings {
  menuOpacity: number; // 0 - 100
  menuGlassEffect: boolean;
  // Bật tắt hiển thị từng khối trên trang chủ. Trường này có thể vắng mặt ở
  // dữ liệu cũ, khi đó mọi khối được coi là đang bật.
  homeSections?: HomeSectionVisibility;
}

export interface CourseChapter {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  chapterId: string;
  courseId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  videoDuration?: string;
  videoPlatform?: 'youtube' | 'vimeo' | 'drive' | 'direct';
  isFreePreview?: boolean;
  content?: string;
  textContent?: string;
  resources?: { name: string; url: string }[];
  allowPreview?: boolean;
  assignments?: any[];
  practiceFileUrl?: string;
  quizzes?: any[];
  isRequired?: boolean;
  sortOrder: number;
  duration?: string;
}

export interface PortfolioLecture {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  documentType: 'theory' | 'practice' | 'curriculum' | 'slides' | 'video' | 'assignment' | 'reference' | 'sample_file' | 'rubric' | 'exam';
  description: string;
  coverImage?: string;
  images?: string[];
  fileUrl: string;
  fileSize?: string;
  publishDate: string;
  status: 'draft' | 'published' | 'hidden';
  accessPermission?: 'public' | 'private' | 'restricted';
  viewCount: number;
  downloadCount: number;
  tags?: string[];
  courseId?: string;
  detailedContent?: string;
  learningObjectives?: string[];
}
