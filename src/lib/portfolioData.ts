import { supabase } from './supabase';
import { 
  PortfolioBanner, 
  PortfolioAbout, 
  PortfolioEducation, 
  PortfolioExperience, 
  PortfolioSkill, 
  PortfolioProject, 
  PortfolioCourse, 
  CourseChapter, 
  CourseLesson, 
  CourseStudent, 
  PortfolioResearch, 
  PortfolioLecture, 
  PortfolioNavigation,
  PortfolioPost
} from '../components/portfolioTypes';

// Storage fallback keys
const STORAGE_PREFIX = 'portfolio_';

function getLocalFallback<T>(key: string, defaultValue: T): T {
  try {
    const cached = localStorage.getItem(STORAGE_PREFIX + key);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error(`Error reading local storage for ${key}:`, e);
  }
  return defaultValue;
}

function setLocalFallback<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing local storage for ${key}:`, e);
  }
}

// Default Seed Data
const DEFAULT_BANNER: PortfolioBanner = {
  backgroundImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80',
  title: 'XÓA NHÒA RANH GIỚI GIỮA NGHỆ THUẬT & CÔNG NGHỆ',
  description: 'Tôi là Alex Nguyễn — Giám đốc Nghệ thuật & Nhà Thiết kế Đa phương tiện sáng tạo ra các trải nghiệm thị giác đỉnh cao, đồ họa chuyển động và không gian tương tác kỹ thuật số.',
  buttonText: 'Khám phá tác phẩm',
  buttonLink: '#projects',
  altText: 'Alex Nguyen Multimedia Artist portfolio banner',
  alignment: 'center',
  overlayColor: '#0f172a',
  overlayOpacity: 0.6,
  brightness: 85,
  animate: true,
  visible: true
};

const DEFAULT_ABOUT: PortfolioAbout = {
  fullName: 'Nguyễn Minh Quân (Alex)',
  artistName: 'Alex Nguyễn',
  jobTitle: 'Art Director & Multimedia Creative Technologist',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
  briefBio: 'Nhà thiết kế tiên phong trong lĩnh vực nghệ thuật số và tương tác đa phương tiện, sáp nhập tư duy logic học thuật với thẩm mỹ thiết kế hiện đại.',
  detailedAbout: 'Với hơn 8 năm hoạt động chuyên nghiệp trong ngành thiết kế sáng tạo truyền thông, tôi luôn tìm kiếm điểm giao thoa giữa trải nghiệm người dùng tinh tế và hiệu ứng thị giác ấn tượng. Tôi chuyên sâu về đồ họa động 3D, kiến trúc tương tác ảo (VR/AR) và triển khai các giải pháp thẩm mỹ kỹ thuật số hiệu suất cao. Sứ mệnh của tôi là thổi hồn nghệ thuật vào từng dòng code và khung hình.',
  creativePhilosophy: 'Nghệ thuật không chỉ để nhìn ngắm — nghệ thuật là sự tương tác. Một thiết kế đa phương tiện vĩ đại phải tạo ra một thế giới quan nơi người xem trở thành một phần của tác phẩm.',
  specialties: ['Art Direction', '3D Motion Design', 'Virtual Reality (VR/AR)', 'Interactive Installations', 'Brand Choreography', 'UX/UI Engineering'],
  location: 'Thành phố Hồ Chí Minh, Việt Nam',
  email: 'alex.nguyen.creative@gmail.com',
  phone: '+84 909 123 456',
  socialLinks: [
    { platform: 'Behance', url: 'https://behance.net/alex_multimedia', icon: 'Behance' },
    { platform: 'Dribbble', url: 'https://dribbble.net/alex_creative', icon: 'Dribbble' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/alex-nguyen-multimedia', icon: 'Linkedin' },
    { platform: 'GitHub', url: 'https://github.com/alex-nguyen-tech', icon: 'Github' }
  ],
  cvUrl: '',
  showCvButton: true
};

const DEFAULT_EDUCATION: PortfolioEducation[] = [
  {
    id: 'edu_1',
    degree: 'Thạc sĩ Khoa học Truyền thông Đa phương tiện',
    major: 'Interactive Media & Creative Technology',
    school: 'Đại học Quốc gia TP.HCM',
    startDate: '2021',
    endDate: '2023',
    isOngoing: false,
    description: 'Nghiên cứu chuyên sâu về các thiết bị tương tác ảo, thiết kế cảm xúc trong giao diện người dùng và ứng dụng thuật toán AI trong mỹ thuật số học.',
    achievement: 'Tốt nghiệp thủ khoa đầu ra, Đề tài xuất sắc nhất khóa',
    certificateUrl: '',
    sortOrder: 1
  },
  {
    id: 'edu_2',
    degree: 'Cử nhân Thiết kế Đồ họa & Mỹ thuật Đa phương tiện',
    major: 'Multimedia Design & Digital Arts',
    school: 'Đại học Mỹ thuật TP.HCM',
    startDate: '2016',
    endDate: '2020',
    isOngoing: false,
    description: 'Học tập nền tảng mỹ thuật hàn lâm, thiết kế đồ họa tĩnh, dàn trang, nhiếp ảnh, quay dựng video cơ bản và hoạt hình 2D.',
    achievement: 'Học bổng tài năng trẻ xuất sắc 3 năm liên tiếp',
    certificateUrl: '',
    sortOrder: 2
  }
];

const DEFAULT_EXPERIENCE: PortfolioExperience[] = [
  {
    id: 'exp_1',
    title: 'Giám đốc Nghệ thuật (Art Director)',
    company: 'Vortex Creative Agency Vietnam',
    startDate: '2022',
    endDate: 'Hiện tại',
    isOngoing: true,
    description: 'Chỉ đạo định hướng sáng tạo mỹ thuật cho các chiến dịch ra mắt sản phẩm lớn, thiết kế sân khấu tương tác 3D và quản lý đội ngũ 12 nhà thiết kế đồ họa chuyển động.',
    achievements: [
      'Thành lập hệ thống thiết kế chuyển động (motion system) giúp tối ưu 40% thời gian render của đội ngũ',
      'Đoạt giải thưởng "Chiến dịch Truyền thông Đột phá của Năm" năm 2024'
    ],
    logoUrl: '',
    websiteUrl: 'https://vortex-agency.vn',
    sortOrder: 1
  },
  {
    id: 'exp_2',
    title: 'Chuyên viên Thiết kế Đa phương tiện Cấp cao',
    company: 'HoloGroup Interactive Technologies',
    startDate: '2020',
    endDate: '2022',
    isOngoing: false,
    description: 'Trực tiếp lên ý tưởng, dựng hình 3D và lập trình trải nghiệm tương tác thực tế ảo VR/AR phục vụ giáo dục, bảo tàng số và bất động sản thông minh.',
    achievements: [
      'Thiết kế thành công ứng dụng Bảo tàng Lịch sử số 3D thu hút hơn 100,000 lượt tham quan thực tế ảo',
      'Phát triển framework tương tác cử chỉ không chạm trong triển lãm'
    ],
    logoUrl: '',
    websiteUrl: 'https://hologroup.com.vn',
    sortOrder: 2
  }
];

const DEFAULT_SKILLS: PortfolioSkill[] = [
  {
    id: 'skill_1',
    name: '3D Modeling & Animation',
    category: 'Design',
    proficiency: 95,
    icon: 'Boxes',
    description: 'Dựng hình, xử lý vật liệu và hoạt hình chuyên nghiệp trên phần mềm Blender và Cinema 4D.',
    relatedProjects: ['proj_1', 'proj_2'],
    sortOrder: 1,
    visible: true
  },
  {
    id: 'skill_2',
    name: 'Motion Graphics',
    category: 'Design',
    proficiency: 90,
    icon: 'Film',
    description: 'Thiết kế đồ họa chuyển động quảng cáo, kỹ xảo thị giác visual effects với After Effects.',
    relatedProjects: ['proj_2'],
    sortOrder: 2,
    visible: true
  },
  {
    id: 'skill_3',
    name: 'Interactive UI/UX Design',
    category: 'Technical',
    proficiency: 88,
    icon: 'Sparkles',
    description: 'Tạo mẫu giao diện web/app động và xây dựng hệ thống design system mạnh mẽ bằng Figma.',
    relatedProjects: ['proj_3'],
    sortOrder: 3,
    visible: true
  },
  {
    id: 'skill_4',
    name: 'Web Gl & Creative Coding',
    category: 'Technical',
    proficiency: 80,
    icon: 'Code2',
    description: 'Lập trình hiệu ứng thị giác tương tác thời gian thực trên trình duyệt với Three.js, HTML5 Canvas.',
    relatedProjects: ['proj_1'],
    sortOrder: 4,
    visible: true
  },
  {
    id: 'skill_5',
    name: 'Kể chuyện bằng hình ảnh (Visual Storytelling)',
    category: 'Soft',
    proficiency: 92,
    icon: 'Layers',
    description: 'Xây dựng kịch bản phân cảnh (storyboard), kiến tạo không khí màu sắc và chỉ đạo nhịp điệu tác phẩm.',
    relatedProjects: [],
    sortOrder: 5,
    visible: true
  }
];

const DEFAULT_PROJECTS: PortfolioProject[] = [
  {
    id: 'proj_1',
    title: 'CyberSpace VR: Triển Lãm Không Gian Ảo Đa Giác Quan',
    slug: 'cyberspace-vr',
    coverImage: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1527690787677-fc2e1f48c269?auto=format&fit=crop&w=800&q=80'
    ],
    introVideo: '',
    briefDescription: 'Dự án nghệ thuật thực tế ảo tương tác kết hợp âm thanh không gian động và nghệ thuật kiến tạo ánh sáng vô hạn.',
    detailedContent: 'CyberSpace VR là triển lãm thực tế ảo đột phá, cho phép người dùng tham quan và tương tác trực tiếp với các hạt ánh sáng 3D được điều khiển bởi nhịp tim hoặc cử chỉ tay. Dự án sử dụng WebGL kết hợp cùng framework React Three Fiber, tối ưu hóa để chạy mượt mà trên cả trình duyệt máy tính và kính VR di động.',
    context: 'Dự án nhằm giải quyết ranh giới địa lý, cho phép giới trẻ yêu nghệ thuật tham quan triển lãm chất lượng cao từ mọi nơi.',
    problem: 'Tải lượng tệp tin 3D rất lớn và độ trễ phản hồi âm thanh không gian là một rào cản cho WebVR.',
    goal: 'Đạt tần số quét 90 FPS ổn định trên kính Oculus Quest 2 thông qua trình duyệt.',
    targetAudience: 'Những người đam mê nghệ thuật số, sinh viên mỹ thuật và các chuyên gia công nghệ truyền thông.',
    process: 'Từ việc vẽ storyboard không gian -> Thiết kế mô hình khối thấp (Low-poly) -> Thiết lập Shader màu -> Đồng bộ âm thanh động.',
    designIdea: 'Sử dụng tone màu xanh neon và hồng tím đậm chất Cyberpunk đại diện cho sự hòa quyện tương lai và thực tế ảo.',
    solution: 'Nén mô hình tối đa bằng định dạng GLTF/DRACO và lập trình giải thuật phân chia luồng tính toán cử chỉ.',
    result: 'Thu hút hơn 50,000 lượt truy cập trực tuyến trong tuần đầu tiên, đoạt giải thưởng sáng tạo số toàn quốc.',
    role: 'Trưởng nhóm Thiết kế & Lập trình Tương tác 3D',
    client: 'Trung tâm Nghệ thuật Đương đại V-Art',
    members: ['Alex Nguyễn', 'Trần Nam (Developer)', 'Mỹ Linh (Sound Designer)'],
    timeline: '6 tháng (01/2024 - 06/2024)',
    tools: ['Blender', 'Three.js', 'React Three Fiber', 'Ableton Live'],
    category: 'Virtual Reality / AR',
    tags: ['WebGL', 'Blender', 'Interactive', 'Art Exhibition'],
    relatedProjects: [],
    status: 'published',
    publishDate: '2024-06-15',
    viewCount: 14502,
    sortOrder: 1,
    isFeatured: true,
    isPinned: true,
    showViews: true,
    showShare: true,
    isPrivate: false
  },
  {
    id: 'proj_2',
    title: 'EcoMotion: Chiến Dịch Nhận Diện Động Cho Môi Trường Xanh',
    slug: 'ecomotion-campaign',
    coverImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'
    ],
    introVideo: '',
    briefDescription: 'Bộ nhận diện thương hiệu chuyển động sáng tạo với hàng loạt các hoạt cảnh mang thông điệp tái sinh sinh thái.',
    detailedContent: 'EcoMotion là dự án phi lợi nhuận hướng tới việc biến đổi các biểu tượng sinh thái tĩnh thành các chuỗi chuyển động sinh động, tạo cảm xúc mạnh mẽ cho chiến dịch chống biến đổi khí hậu.',
    context: 'Thông điệp môi trường thường khô khan và khó tiếp cận giới trẻ học đường.',
    problem: 'Sự thiếu hụt định dạng đồ họa động thu hút trên mạng xã hội.',
    goal: 'Tạo dựng bộ tài nguyên video động dạng ngắn (Social Shorts) có sức lan tỏa rộng rãi.',
    targetAudience: 'Cộng đồng trẻ năng động, thế hệ Gen Z yêu thích bảo vệ thiên nhiên.',
    process: 'Nghiên cứu biểu tượng -> Lên chuyển động tự nhiên (Organic Motion) -> Tạo hiệu ứng hạt lá rơi sinh động.',
    designIdea: 'Sử dụng gam màu xanh lục bảo kết hợp vàng nắng sáng tạo cảm giác ấm áp, sống động đầy sức sống.',
    solution: 'Thiết kế hệ thống vector động có thể mở rộng mượt mà trên mọi tỷ lệ màn hình điện thoại di động.',
    result: 'Hơn 1.2 triệu lượt chia sẻ trên các nền tảng mạng xã hội lớn, được dùng làm tư liệu giáo dục học đường.',
    role: 'Chỉ đạo Mỹ thuật & Motion Designer',
    client: 'Quỹ Môi trường Xanh Việt Nam',
    members: ['Alex Nguyễn', 'Hoàng Bách (Illustrator)'],
    timeline: '3 tháng (09/2024 - 12/2024)',
    tools: ['After Effects', 'Illustrator', 'Lottie', 'Adobe Premiere'],
    category: 'Motion Graphics',
    tags: ['After Effects', 'Lottie', 'Green Earth', 'Branding'],
    relatedProjects: [],
    status: 'published',
    publishDate: '2024-12-05',
    viewCount: 9840,
    sortOrder: 2,
    isFeatured: true,
    isPinned: false,
    showViews: true,
    showShare: true,
    isPrivate: false
  }
];

const DEFAULT_COURSES: PortfolioCourse[] = [
  {
    id: 'course_1',
    title: 'Thiết kế Đồ họa Động 3D với Blender & After Effects',
    coverImage: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?auto=format&fit=crop&w=800&q=80',
    introVideo: '',
    briefDescription: 'Khóa học từ nền tảng đến chuyên sâu giúp bạn làm chủ tư duy thiết kế không gian 3D và biến các vật thể tĩnh thành hoạt ảnh cuốn hút.',
    detailedDescription: 'Chào mừng bạn đến với chương trình đào tạo đồ họa động 3D toàn diện. Khóa học này được thiết kế đặc biệt cho những bạn đã có nền tảng thiết kế 2D cơ bản muốn bứt phá bước vào thế giới không gian 3 chiều. Chúng ta sẽ cùng nhau tìm hiểu quy trình dựng hình Blender, thiết kế chất liệu, ánh sáng sân khấu, xuất file định dạng nén tối ưu và kết hợp kỹ xảo hậu kỳ cực đỉnh bằng Adobe After Effects.',
    objectives: [
      'Làm chủ giao diện dựng hình, thao tác phím tắt tối ưu trong Blender',
      'Ứng dụng lý thuyết vật lý ánh sáng để tạo không gian có chiều sâu nghệ thuật',
      'Thiết kế chuyển động mượt mà sử dụng biểu đồ chuyển động Graph Editor',
      'Kết xuất (render) hoạt cảnh chất lượng cao phục vụ Website và Video truyền thông'
    ],
    targetStudents: [
      'Chuyên viên Thiết kế Đồ họa muốn mở rộng kỹ năng sang 3D',
      'Sinh viên ngành Mỹ thuật Đa phương tiện, Kiến trúc, Truyền thông',
      'Những bạn làm sáng tạo nội dung tự do (Freelance Creator) muốn nâng tầm thương hiệu cá nhân'
    ],
    requirements: [
      'Đã biết sử dụng cơ bản Adobe Illustrator hoặc Figma',
      'Máy tính cấu hình tầm trung trở lên (tối thiểu 8GB RAM, đề xuất có card đồ họa rời)'
    ],
    learningOutcomes: [
      'Xây dựng được một Portfolio đồ họa chuyển động 3D chuyên nghiệp đạt chuẩn tuyển dụng quốc tế',
      'Hiểu rõ quy trình tư duy của một Art Director khi lập kế hoạch sản xuất visual 3D'
    ],
    duration: '8 tuần (Tổng cộng 24 giờ học trực tuyến)',
    level: 'intermediate',
    format: 'Online kết hợp Zoom định kỳ hàng tuần',
    price: 1200000,
    salePrice: 599000,
    saleStartDate: '2026-07-01',
    saleEndDate: '2026-08-31',
    hasCertificate: true,
    documents: [
      { name: 'Bộ phím tắt Blender cho thiết kế động.pdf', url: '#' },
      { name: 'Tệp mẫu 3D Room Studio thực hành.blend', url: '#' }
    ],
    instructor: 'Alex Nguyễn (Art Director)',
    category: 'Motion Design',
    status: 'published',
    publishDate: '2025-01-10',
    viewCount: 3450,
    lessonsCount: 12,
    studentsCount: 245
  }
];

const DEFAULT_CHAPTERS: CourseChapter[] = [
  { id: 'chap_1', courseId: 'course_1', title: 'Chương 1: Làm quen với Blender & Tạo hình khối cơ bản', sortOrder: 1 },
  { id: 'chap_2', courseId: 'course_1', title: 'Chương 2: Thiết lập Ánh sáng & Chất liệu thực tế', sortOrder: 2 },
  { id: 'chap_3', courseId: 'course_1', title: 'Chương 3: Diễn hoạt chuyển động (Animation Core)', sortOrder: 3 }
];

const DEFAULT_LESSONS: CourseLesson[] = [
  {
    id: 'les_1',
    chapterId: 'chap_1',
    courseId: 'course_1',
    title: 'Bài 1: Tổng quan quy trình làm việc Multimedia 3D',
    sortOrder: 1,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    textContent: 'Trong bài học mở đầu này, chúng ta sẽ xem xét tổng quan vị trí của Blender trong thiết kế đồ họa chuyển động, cách sáp nhập nó cùng After Effects để tạo nên các tác phẩm thị giác ấn tượng nhất.',
    allowPreview: true,
    isRequired: true,
    allowDownloadDocuments: true
  },
  {
    id: 'les_2',
    chapterId: 'chap_1',
    courseId: 'course_1',
    title: 'Bài 2: Làm chủ hệ thống tọa độ và thao tác biến đổi vật thể',
    sortOrder: 2,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    textContent: 'Tìm hiểu về Trục tọa độ X, Y, Z, hệ thống Transform, phím tắt di chuyển (G), xoay (R), co giãn (S) và quản lý Outliner khoa học.',
    allowPreview: false,
    isRequired: true,
    allowDownloadDocuments: true
  },
  {
    id: 'les_3',
    chapterId: 'chap_2',
    courseId: 'course_1',
    title: 'Bài 3: Set up Ánh sáng 3 điểm (Three-Point Lighting) kinh điển',
    sortOrder: 3,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    textContent: 'Phân biệt Key Light, Fill Light và Back Light để tôn vinh hình khối của chủ thể thiết kế giống như các studio nhiếp ảnh chuyên nghiệp.',
    allowPreview: true,
    isRequired: true,
    allowDownloadDocuments: true
  }
];

const DEFAULT_STUDENTS: CourseStudent[] = [
  {
    id: 'stu_1',
    studentName: 'Trần Văn Hoàng',
    studentEmail: 'hoang.tran98@gmail.com',
    courseId: 'course_1',
    progress: 75,
    quizScore: 90,
    registrationDate: '2026-06-15',
    paymentStatus: 'paid',
    hasCertificate: false,
    isLocked: false
  },
  {
    id: 'stu_2',
    studentName: 'Lê Mỹ Duyên',
    studentEmail: 'duyenle.design@gmail.com',
    courseId: 'course_1',
    progress: 100,
    quizScore: 95,
    registrationDate: '2026-05-10',
    completionDate: '2026-07-01',
    paymentStatus: 'paid',
    hasCertificate: true,
    isLocked: false
  }
];

const DEFAULT_RESEARCH: PortfolioResearch[] = [
  {
    id: 'res_1',
    titleVi: 'Ứng dụng Trí tuệ Nhân tạo trong Tối ưu hóa Trải nghiệm Người dùng trên Thiết bị Di động',
    titleEn: 'Applying Artificial Intelligence in Mobile User Experience Optimization',
    type: 'article',
    authors: ['Nguyễn Minh Quân (Alex Nguyễn)'],
    coAuthors: ['TS. Lê Văn Tấn (ĐHQG TP.HCM)'],
    affiliation: 'Khoa Truyền thông Đa phương tiện, ĐHQG TP.HCM',
    publishYear: 2025,
    journalOrConference: 'Tạp chí Khoa học & Công nghệ Việt Nam',
    volume: 'Tập 67',
    issue: 'Số 4',
    pages: '124 - 132',
    issnOrIsbn: '1859-1868',
    doi: '10.31276/VJST.67(4).124-132',
    abstractVi: 'Nghiên cứu này tìm hiểu phương pháp sáp nhập các thuật toán học máy trực tiếp vào giao diện người dùng trên điện thoại di động nhằm cá nhân hóa bố cục hiển thị thời gian thực. Kết quả thực nghiệm trên mẫu 1,500 người dùng cho thấy tỷ lệ hoàn thành tác vụ tăng 32.5% và mức độ hài lòng về mặt cảm xúc thiết kế tăng đáng kể.',
    abstractEn: 'This study investigates methods of integrating machine learning algorithms directly into mobile user interfaces to personalize layout display in real-time. Experimental results on 1,500 users show that task completion rate increased by 32.5% and emotional design satisfaction significantly improved.',
    keywordsVi: ['Trải nghiệm người dùng', 'Trí tuệ nhân tạo', 'Giao diện thích ứng', 'Thiết kế di động'],
    keywordsEn: ['User Experience', 'Artificial Intelligence', 'Adaptive UI', 'Mobile Design'],
    content: 'Tóm tắt bài viết khoa học chi tiết về thiết kế giao diện thông minh thích ứng...',
    coverImage: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    pdfUrl: '#',
    publisherUrl: 'https://most.gov.vn',
    citationApa: 'Nguyễn, M. Q., & Lê, V. T. (2025). Ứng dụng Trí tuệ Nhân tạo trong Tối ưu hóa Trải nghiệm Người dùng trên Thiết bị Di động. Tạp chí Khoa học & Công nghệ Việt Nam, 67(4), 124-132.',
    relatedResearch: [],
    viewPermission: 'allow_download',
    isFeatured: true,
    isPinned: true,
    field: 'Công nghệ & Thiết kế tương tác',
    viewCount: 1205,
    downloadCount: 412
  }
];

const DEFAULT_LECTURES: PortfolioLecture[] = [
  {
    id: 'lec_1',
    title: 'Giáo trình Nguyên lý Thị giác và Bố cục trong Thiết kế Đa phương tiện',
    subject: 'Nguyên lý Thiết kế Đa phương tiện',
    topic: 'Bố cục & Thị giác học',
    documentType: 'curriculum',
    publishDate: '2025-03-12',
    status: 'published',
    viewCount: 450,
    downloadCount: 182,
    learningObjectives: [
      'Nắm bắt sâu sắc quy luật Gestalt trong phân bổ thị giác',
      'Thiết lập tiêu cự thu hút điểm nhìn của người xem trên khung hình động',
      'Ứng dụng tỷ lệ vàng và lưới lưới bất đối xứng sáng tạo'
    ],
    targetLearners: ['Sinh viên năm nhất chuyên ngành Thiết kế Mỹ thuật', 'Người mới tự học đồ họa chuyển động'],
    detailedContent: 'Nội dung chi tiết của cuốn giáo trình về Nguyên lý Thị giác học ứng dụng trong thiết kế khung hình truyền hình, điện ảnh và Web tương tác hiện đại...',
    pdfUrl: '#',
    allowDownload: true,
    duration: '2 giờ tự học',
    keywords: ['Nguyên lý thị giác', 'Gestalt', 'Bố cục', 'Mỹ thuật đa phương tiện'],
    accessPermission: 'public'
  }
];

export const DEFAULT_PORTFOLIO_NAVIGATION: PortfolioNavigation[] = [
  { id: 'nav_home', label: 'Trang chủ', link: '#banner', target: '_self', icon: 'Home', parentId: null, sortOrder: 1, visible: true, kind: 'scroll', locked: true },
  { id: 'nav_about', label: 'Giới thiệu', link: '#about', target: '_self', icon: 'User', parentId: null, sortOrder: 2, visible: true, kind: 'scroll', locked: true },
  { id: 'nav_skills', label: 'Kỹ năng', link: '#skills', target: '_self', icon: 'Boxes', parentId: 'nav_about', sortOrder: 1, visible: true, kind: 'scroll', locked: true },
  { id: 'nav_education', label: 'Học vấn', link: '#education', target: '_self', icon: 'GraduationCap', parentId: 'nav_about', sortOrder: 2, visible: true, kind: 'scroll', locked: true },
  { id: 'nav_experience', label: 'Kinh nghiệm', link: '#experience', target: '_self', icon: 'Briefcase', parentId: 'nav_about', sortOrder: 3, visible: true, kind: 'scroll', locked: true },
  { id: 'nav_projects', label: 'Dự án', link: '#projects', target: '_self', icon: 'FolderGit2', parentId: null, sortOrder: 3, visible: true, kind: 'scroll', locked: true },
  { id: 'nav_courses', label: 'Khóa học', link: '#courses', target: '_self', icon: 'BookOpen', parentId: null, sortOrder: 4, visible: true, kind: 'scroll', locked: true },
  { id: 'nav_research', label: 'Nghiên cứu', link: '#research', target: '_self', icon: 'FileText', parentId: null, sortOrder: 5, visible: true, kind: 'scroll', locked: true },
  { id: 'nav_lectures', label: 'Bài giảng', link: '#lectures', target: '_self', icon: 'Presentation', parentId: null, sortOrder: 6, visible: true, kind: 'scroll', locked: true },
  { id: 'nav_contact', label: 'Liên hệ', link: '#contact', target: '_self', icon: 'Mail', parentId: null, sortOrder: 7, visible: true, kind: 'scroll', locked: true }
];

/* LEGACY FIREBASE IMPLEMENTATION (kept temporarily for migration reference)
// Helper functions with LocalFallback integrated for bulletproof execution
export async function getPortfolioBanner(): Promise<PortfolioBanner> {
  try {
    const docRef = doc(db, 'portfolio_banner', 'general');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PortfolioBanner;
    }
    // Try local
    const local = getLocalFallback('banner', null);
    if (local) return local;
    
    // Seed and save
    await setDoc(docRef, DEFAULT_BANNER);
    setLocalFallback('banner', DEFAULT_BANNER);
    return DEFAULT_BANNER;
  } catch (error) {
    console.warn("Firestore portfolio_banner fetch failed, falling back to local storage:", error);
    return getLocalFallback('banner', DEFAULT_BANNER);
  }
}

export async function savePortfolioBanner(banner: PortfolioBanner): Promise<void> {
  setLocalFallback('banner', banner);
  try {
    const docRef = doc(db, 'portfolio_banner', 'general');
    await setDoc(docRef, banner);
  } catch (error) {
    console.error("Firestore savePortfolioBanner failed:", error);
  }
}

export async function getPortfolioAbout(): Promise<PortfolioAbout> {
  try {
    const docRef = doc(db, 'portfolio_about', 'general');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PortfolioAbout;
    }
    // Try local
    const local = getLocalFallback('about', null);
    if (local) return local;

    // Seed and save
    await setDoc(docRef, DEFAULT_ABOUT);
    setLocalFallback('about', DEFAULT_ABOUT);
    return DEFAULT_ABOUT;
  } catch (error) {
    console.warn("Firestore portfolio_about fetch failed, falling back to local storage:", error);
    return getLocalFallback('about', DEFAULT_ABOUT);
  }
}

export async function savePortfolioAbout(about: PortfolioAbout): Promise<void> {
  setLocalFallback('about', about);
  try {
    const docRef = doc(db, 'portfolio_about', 'general');
    await setDoc(docRef, about);
  } catch (error) {
    console.error("Firestore savePortfolioAbout failed:", error);
  }
}

export async function getPortfolioEducation(): Promise<PortfolioEducation[]> {
  try {
    const colRef = collection(db, 'portfolio_education');
    const qSnap = await getDocs(query(colRef, orderBy('sortOrder', 'asc')));
    const list: PortfolioEducation[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as PortfolioEducation);
    });
    if (list.length > 0) {
      setLocalFallback('education', list);
      return list;
    }
    
    const local = getLocalFallback<PortfolioEducation[]>('education', []);
    if (local && local.length > 0) return local;

    // Seed
    for (const edu of DEFAULT_EDUCATION) {
      await setDoc(doc(db, 'portfolio_education', edu.id), edu);
    }
    setLocalFallback('education', DEFAULT_EDUCATION);
    return DEFAULT_EDUCATION;
  } catch (error) {
    console.warn("Firestore portfolio_education fetch failed, falling back to local storage:", error);
    return getLocalFallback('education', DEFAULT_EDUCATION);
  }
}

export async function savePortfolioEducation(eduList: PortfolioEducation[]): Promise<void> {
  setLocalFallback('education', eduList);
  try {
    // Delete and rewrite or simply set
    for (const edu of eduList) {
      await setDoc(doc(db, 'portfolio_education', edu.id), edu);
    }
  } catch (error) {
    console.error("Firestore savePortfolioEducation failed:", error);
  }
}

export async function deletePortfolioEducationDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_education', id));
  } catch (error) {
    console.error("Firestore deletePortfolioEducationDoc failed:", error);
  }
}

export async function getPortfolioExperience(): Promise<PortfolioExperience[]> {
  try {
    const colRef = collection(db, 'portfolio_experience');
    const qSnap = await getDocs(query(colRef, orderBy('sortOrder', 'asc')));
    const list: PortfolioExperience[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as PortfolioExperience);
    });
    if (list.length > 0) {
      setLocalFallback('experience', list);
      return list;
    }

    const local = getLocalFallback<PortfolioExperience[]>('experience', []);
    if (local && local.length > 0) return local;

    // Seed
    for (const exp of DEFAULT_EXPERIENCE) {
      await setDoc(doc(db, 'portfolio_experience', exp.id), exp);
    }
    setLocalFallback('experience', DEFAULT_EXPERIENCE);
    return DEFAULT_EXPERIENCE;
  } catch (error) {
    console.warn("Firestore portfolio_experience fetch failed, falling back to local storage:", error);
    return getLocalFallback('experience', DEFAULT_EXPERIENCE);
  }
}

export async function savePortfolioExperience(expList: PortfolioExperience[]): Promise<void> {
  setLocalFallback('experience', expList);
  try {
    for (const exp of expList) {
      await setDoc(doc(db, 'portfolio_experience', exp.id), exp);
    }
  } catch (error) {
    console.error("Firestore savePortfolioExperience failed:", error);
  }
}

export async function deletePortfolioExperienceDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_experience', id));
  } catch (error) {
    console.error("Firestore deletePortfolioExperienceDoc failed:", error);
  }
}

export async function getPortfolioSkills(): Promise<PortfolioSkill[]> {
  try {
    const colRef = collection(db, 'portfolio_skills');
    const qSnap = await getDocs(query(colRef, orderBy('sortOrder', 'asc')));
    const list: PortfolioSkill[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as PortfolioSkill);
    });
    if (list.length > 0) {
      setLocalFallback('skills', list);
      return list;
    }

    const local = getLocalFallback<PortfolioSkill[]>('skills', []);
    if (local && local.length > 0) return local;

    // Seed
    for (const skill of DEFAULT_SKILLS) {
      await setDoc(doc(db, 'portfolio_skills', skill.id), skill);
    }
    setLocalFallback('skills', DEFAULT_SKILLS);
    return DEFAULT_SKILLS;
  } catch (error) {
    console.warn("Firestore portfolio_skills fetch failed, falling back to local storage:", error);
    return getLocalFallback('skills', DEFAULT_SKILLS);
  }
}

export async function savePortfolioSkills(skills: PortfolioSkill[]): Promise<void> {
  setLocalFallback('skills', skills);
  try {
    for (const s of skills) {
      await setDoc(doc(db, 'portfolio_skills', s.id), s);
    }
  } catch (error) {
    console.error("Firestore savePortfolioSkills failed:", error);
  }
}

export async function deletePortfolioSkillDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_skills', id));
  } catch (error) {
    console.error("Firestore deletePortfolioSkillDoc failed:", error);
  }
}

export async function getPortfolioProjects(): Promise<PortfolioProject[]> {
  try {
    const colRef = collection(db, 'portfolio_projects');
    const qSnap = await getDocs(query(colRef, orderBy('sortOrder', 'asc')));
    const list: PortfolioProject[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as PortfolioProject);
    });
    if (list.length > 0) {
      setLocalFallback('projects', list);
      return list;
    }

    const local = getLocalFallback<PortfolioProject[]>('projects', []);
    if (local && local.length > 0) return local;

    // Seed
    for (const proj of DEFAULT_PROJECTS) {
      await setDoc(doc(db, 'portfolio_projects', proj.id), proj);
    }
    setLocalFallback('projects', DEFAULT_PROJECTS);
    return DEFAULT_PROJECTS;
  } catch (error) {
    console.warn("Firestore portfolio_projects fetch failed, falling back to local storage:", error);
    return getLocalFallback('projects', DEFAULT_PROJECTS);
  }
}

export async function savePortfolioProject(proj: PortfolioProject): Promise<void> {
  try {
    await setDoc(doc(db, 'portfolio_projects', proj.id), proj);
    // Sync local
    const current = await getPortfolioProjects();
    const idx = current.findIndex(p => p.id === proj.id);
    if (idx >= 0) current[idx] = proj;
    else current.push(proj);
    setLocalFallback('projects', current);
  } catch (error) {
    console.error("Firestore savePortfolioProject failed:", error);
    // Backup local directly
    const local = getLocalFallback<PortfolioProject[]>('projects', DEFAULT_PROJECTS);
    const idx = local.findIndex(p => p.id === proj.id);
    if (idx >= 0) local[idx] = proj;
    else local.push(proj);
    setLocalFallback('projects', local);
  }
}

export async function deletePortfolioProject(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_projects', id));
  } catch (error) {
    console.error("Firestore deletePortfolioProject failed:", error);
  }
  const current = getLocalFallback<PortfolioProject[]>('projects', []);
  const updated = current.filter(p => p.id !== id);
  setLocalFallback('projects', updated);
}

export async function getPortfolioCourses(): Promise<PortfolioCourse[]> {
  try {
    const colRef = collection(db, 'portfolio_courses');
    const qSnap = await getDocs(colRef);
    const list: PortfolioCourse[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as PortfolioCourse);
    });
    if (list.length > 0) {
      setLocalFallback('courses', list);
      return list;
    }

    const local = getLocalFallback<PortfolioCourse[]>('courses', []);
    if (local && local.length > 0) return local;

    // Seed
    for (const course of DEFAULT_COURSES) {
      await setDoc(doc(db, 'portfolio_courses', course.id), course);
    }
    setLocalFallback('courses', DEFAULT_COURSES);
    return DEFAULT_COURSES;
  } catch (error) {
    console.warn("Firestore portfolio_courses fetch failed, falling back to local storage:", error);
    return getLocalFallback('courses', DEFAULT_COURSES);
  }
}

export async function savePortfolioCourse(course: PortfolioCourse): Promise<void> {
  try {
    await setDoc(doc(db, 'portfolio_courses', course.id), course);
    const current = await getPortfolioCourses();
    const idx = current.findIndex(c => c.id === course.id);
    if (idx >= 0) current[idx] = course;
    else current.push(course);
    setLocalFallback('courses', current);
  } catch (error) {
    console.error("Firestore savePortfolioCourse failed:", error);
    const local = getLocalFallback<PortfolioCourse[]>('courses', DEFAULT_COURSES);
    const idx = local.findIndex(c => c.id === course.id);
    if (idx >= 0) local[idx] = course;
    else local.push(course);
    setLocalFallback('courses', local);
  }
}

export async function deletePortfolioCourse(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_courses', id));
  } catch (error) {
    console.error("Firestore deletePortfolioCourse failed:", error);
  }
  const current = getLocalFallback<PortfolioCourse[]>('courses', []);
  const updated = current.filter(c => c.id !== id);
  setLocalFallback('courses', updated);
}

export async function getCourseChapters(courseId: string): Promise<CourseChapter[]> {
  try {
    const colRef = collection(db, 'portfolio_chapters');
    const qSnap = await getDocs(query(colRef, where('courseId', '==', courseId), orderBy('sortOrder', 'asc')));
    const list: CourseChapter[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as CourseChapter);
    });
    if (list.length > 0) {
      setLocalFallback(`chapters_${courseId}`, list);
      return list;
    }

    const local = getLocalFallback<CourseChapter[]>(`chapters_${courseId}`, []);
    if (local && local.length > 0) return local;

    // Seed if matches default course
    if (courseId === 'course_1') {
      for (const chap of DEFAULT_CHAPTERS) {
        await setDoc(doc(db, 'portfolio_chapters', chap.id), chap);
      }
      setLocalFallback(`chapters_${courseId}`, DEFAULT_CHAPTERS);
      return DEFAULT_CHAPTERS;
    }
    return [];
  } catch (error) {
    console.warn("Firestore portfolio_chapters fetch failed, falling back to local storage:", error);
    return getLocalFallback(`chapters_${courseId}`, courseId === 'course_1' ? DEFAULT_CHAPTERS : []);
  }
}

export async function saveCourseChapters(courseId: string, chapters: CourseChapter[]): Promise<void> {
  setLocalFallback(`chapters_${courseId}`, chapters);
  try {
    for (const chap of chapters) {
      await setDoc(doc(db, 'portfolio_chapters', chap.id), chap);
    }
  } catch (error) {
    console.error("Firestore saveCourseChapters failed:", error);
  }
}

export async function deleteCourseChapterDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_chapters', id));
  } catch (error) {
    console.error("Firestore deleteCourseChapterDoc failed:", error);
  }
}

export async function getCourseLessons(courseId: string): Promise<CourseLesson[]> {
  try {
    const colRef = collection(db, 'portfolio_lessons');
    const qSnap = await getDocs(query(colRef, where('courseId', '==', courseId), orderBy('sortOrder', 'asc')));
    const list: CourseLesson[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as CourseLesson);
    });
    if (list.length > 0) {
      setLocalFallback(`lessons_${courseId}`, list);
      return list;
    }

    const local = getLocalFallback<CourseLesson[]>(`lessons_${courseId}`, []);
    if (local && local.length > 0) return local;

    // Seed if matches default course
    if (courseId === 'course_1') {
      for (const les of DEFAULT_LESSONS) {
        await setDoc(doc(db, 'portfolio_lessons', les.id), les);
      }
      setLocalFallback(`lessons_${courseId}`, DEFAULT_LESSONS);
      return DEFAULT_LESSONS;
    }
    return [];
  } catch (error) {
    console.warn("Firestore portfolio_lessons fetch failed, falling back to local storage:", error);
    return getLocalFallback(`lessons_${courseId}`, courseId === 'course_1' ? DEFAULT_LESSONS : []);
  }
}

export async function saveCourseLessons(courseId: string, lessons: CourseLesson[]): Promise<void> {
  setLocalFallback(`lessons_${courseId}`, lessons);
  try {
    for (const les of lessons) {
      await setDoc(doc(db, 'portfolio_lessons', les.id), les);
    }
  } catch (error) {
    console.error("Firestore saveCourseLessons failed:", error);
  }
}

export async function deleteCourseLessonDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_lessons', id));
  } catch (error) {
    console.error("Firestore deleteCourseLessonDoc failed:", error);
  }
}

export async function getCourseStudents(): Promise<CourseStudent[]> {
  try {
    const colRef = collection(db, 'portfolio_students');
    const qSnap = await getDocs(colRef);
    const list: CourseStudent[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as CourseStudent);
    });
    if (list.length > 0) {
      setLocalFallback('students', list);
      return list;
    }

    const local = getLocalFallback<CourseStudent[]>('students', []);
    if (local && local.length > 0) return local;

    // Seed
    for (const stu of DEFAULT_STUDENTS) {
      await setDoc(doc(db, 'portfolio_students', stu.id), stu);
    }
    setLocalFallback('students', DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
  } catch (error) {
    console.warn("Firestore portfolio_students fetch failed, falling back to local storage:", error);
    return getLocalFallback('students', DEFAULT_STUDENTS);
  }
}

export async function saveCourseStudent(student: CourseStudent): Promise<void> {
  try {
    await setDoc(doc(db, 'portfolio_students', student.id), student);
    const current = await getCourseStudents();
    const idx = current.findIndex(s => s.id === student.id);
    if (idx >= 0) current[idx] = student;
    else current.push(student);
    setLocalFallback('students', current);
  } catch (error) {
    console.error("Firestore saveCourseStudent failed:", error);
  }
}

export async function deleteCourseStudentDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_students', id));
  } catch (error) {
    console.error("Firestore deleteCourseStudentDoc failed:", error);
  }
  const current = getLocalFallback<CourseStudent[]>('students', []);
  const updated = current.filter(s => s.id !== id);
  setLocalFallback('students', updated);
}

export async function getPortfolioResearch(): Promise<PortfolioResearch[]> {
  try {
    const colRef = collection(db, 'portfolio_research');
    const qSnap = await getDocs(colRef);
    const list: PortfolioResearch[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as PortfolioResearch);
    });
    if (list.length > 0) {
      setLocalFallback('research', list);
      return list;
    }

    const local = getLocalFallback<PortfolioResearch[]>('research', []);
    if (local && local.length > 0) return local;

    // Seed
    for (const res of DEFAULT_RESEARCH) {
      await setDoc(doc(db, 'portfolio_research', res.id), res);
    }
    setLocalFallback('research', DEFAULT_RESEARCH);
    return DEFAULT_RESEARCH;
  } catch (error) {
    console.warn("Firestore portfolio_research fetch failed, falling back to local storage:", error);
    return getLocalFallback('research', DEFAULT_RESEARCH);
  }
}

export async function savePortfolioResearch(res: PortfolioResearch): Promise<void> {
  try {
    await setDoc(doc(db, 'portfolio_research', res.id), res);
    const current = await getPortfolioResearch();
    const idx = current.findIndex(r => r.id === res.id);
    if (idx >= 0) current[idx] = res;
    else current.push(res);
    setLocalFallback('research', current);
  } catch (error) {
    console.error("Firestore savePortfolioResearch failed:", error);
    const local = getLocalFallback<PortfolioResearch[]>('research', DEFAULT_RESEARCH);
    const idx = local.findIndex(r => r.id === res.id);
    if (idx >= 0) local[idx] = res;
    else local.push(res);
    setLocalFallback('research', local);
  }
}

export async function deletePortfolioResearch(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_research', id));
  } catch (error) {
    console.error("Firestore deletePortfolioResearch failed:", error);
  }
  const current = getLocalFallback<PortfolioResearch[]>('research', []);
  const updated = current.filter(r => r.id !== id);
  setLocalFallback('research', updated);
}

export async function getPortfolioLectures(): Promise<PortfolioLecture[]> {
  try {
    const colRef = collection(db, 'portfolio_lectures');
    const qSnap = await getDocs(colRef);
    const list: PortfolioLecture[] = [];
    qSnap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as PortfolioLecture);
    });
    if (list.length > 0) {
      setLocalFallback('lectures', list);
      return list;
    }

    const local = getLocalFallback<PortfolioLecture[]>('lectures', []);
    if (local && local.length > 0) return local;

    // Seed
    for (const lec of DEFAULT_LECTURES) {
      await setDoc(doc(db, 'portfolio_lectures', lec.id), lec);
    }
    setLocalFallback('lectures', DEFAULT_LECTURES);
    return DEFAULT_LECTURES;
  } catch (error) {
    console.warn("Firestore portfolio_lectures fetch failed, falling back to local storage:", error);
    return getLocalFallback('lectures', DEFAULT_LECTURES);
  }
}

export async function savePortfolioLecture(lec: PortfolioLecture): Promise<void> {
  try {
    await setDoc(doc(db, 'portfolio_lectures', lec.id), lec);
    const current = await getPortfolioLectures();
    const idx = current.findIndex(l => l.id === lec.id);
    if (idx >= 0) current[idx] = lec;
    else current.push(lec);
    setLocalFallback('lectures', current);
  } catch (error) {
    console.error("Firestore savePortfolioLecture failed:", error);
    const local = getLocalFallback<PortfolioLecture[]>('lectures', DEFAULT_LECTURES);
    const idx = local.findIndex(l => l.id === lec.id);
    if (idx >= 0) local[idx] = lec;
    else local.push(lec);
    setLocalFallback('lectures', local);
  }
}

export async function deletePortfolioLecture(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portfolio_lectures', id));
  } catch (error) {
    console.error("Firestore deletePortfolioLecture failed:", error);
  }
  const current = getLocalFallback<PortfolioLecture[]>('lectures', []);
  const updated = current.filter(l => l.id !== id);
  setLocalFallback('lectures', updated);
}

export async function getPortfolioNavigation(): Promise<PortfolioNavigation[]> {
  try {
    const docRef = doc(db, 'portfolio_navigation', 'general');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.items) {
        return data.items as PortfolioNavigation[];
      }
    }

    const local = getLocalFallback<PortfolioNavigation[]>('navigation', []);
    if (local && local.length > 0) return local;

    // Seed
    await setDoc(docRef, { items: DEFAULT_PORTFOLIO_NAVIGATION });
    setLocalFallback('navigation', DEFAULT_PORTFOLIO_NAVIGATION);
    return DEFAULT_PORTFOLIO_NAVIGATION;
  } catch (error) {
    console.warn("Firestore portfolio_navigation fetch failed, falling back to local storage:", error);
    return getLocalFallback('navigation', DEFAULT_PORTFOLIO_NAVIGATION);
  }
}

export async function savePortfolioNavigation(items: PortfolioNavigation[]): Promise<boolean> {
  setLocalFallback('navigation', items);
  try {
    const docRef = doc(db, 'portfolio_navigation', 'general');
    await setDoc(docRef, { items });
    return true;
  } catch (error) {
    console.error("Firestore savePortfolioNavigation failed:", error);
    return false;
  }
}
*/

// ============================================================
// SUPABASE IMPLEMENTATION — source of truth for Portfolio CMS
// Existing local data is used once as the seed when a table is empty.
// ============================================================

type PortfolioTable =
  | 'portfolio_education'
  | 'portfolio_experience'
  | 'portfolio_skills'
  | 'portfolio_projects'
  | 'portfolio_courses'
  | 'portfolio_course_chapters'
  | 'portfolio_course_lessons'
  | 'portfolio_course_students'
  | 'portfolio_research'
  | 'portfolio_lectures';

function getLocalSeed<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? defaultValue : JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

async function loadSetting<T>(key: string, localKey: string, defaultValue: T): Promise<T> {
  try {
    const { data, error } = await supabase
      .from('portfolio_settings')
      .select('data')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const value = data.data as T;
      setLocalFallback(localKey, value);
      return value;
    }

    const seed = getLocalSeed(localKey, defaultValue);
    const { error: seedError } = await supabase.from('portfolio_settings').upsert({ key, data: seed });
    if (seedError) throw seedError;
    setLocalFallback(localKey, seed);
    return seed;
  } catch (error) {
    console.error(`Supabase portfolio_settings/${key} failed:`, error);
    return getLocalSeed(localKey, defaultValue);
  }
}

async function saveSetting<T>(key: string, localKey: string, value: T): Promise<boolean> {
  setLocalFallback(localKey, value);
  const { error } = await supabase.from('portfolio_settings').upsert({ key, data: value });
  if (error) {
    console.error(`Supabase portfolio_settings/${key} save failed:`, error);
    return false;
  }
  return true;
}

async function loadCollection<T extends { id: string }>(
  table: PortfolioTable,
  localKey: string,
  defaultValue: T[],
  options?: { filter?: [string, string]; orderBy?: string; row?: (item: T) => Record<string, unknown> }
): Promise<T[]> {
  try {
    let request: any = supabase.from(table).select('data');
    if (options?.filter) request = request.eq(options.filter[0], options.filter[1]);
    if (options?.orderBy) request = request.order(options.orderBy, { ascending: true });
    const { data, error } = await request;
    if (error) throw error;
    if (data?.length) {
      const values = data.map((row: { data: T }) => row.data);
      setLocalFallback(localKey, values);
      return values;
    }

    const seed = getLocalSeed(localKey, defaultValue);
    if (seed.length) {
      const rows = seed.map(item => ({ id: item.id, data: item, ...(options?.row?.(item) || {}) }));
      const { error: seedError } = await supabase.from(table).upsert(rows);
      if (seedError) throw seedError;
    }
    setLocalFallback(localKey, seed);
    return seed;
  } catch (error) {
    console.error(`Supabase ${table} load failed:`, error);
    return getLocalSeed(localKey, defaultValue);
  }
}

async function saveCollection<T extends { id: string }>(
  table: PortfolioTable,
  localKey: string,
  items: T[],
  row?: (item: T) => Record<string, unknown>
): Promise<boolean> {
  setLocalFallback(localKey, items);
  if (!items.length) return true;
  const rows = items.map(item => ({ id: item.id, data: item, ...(row?.(item) || {}) }));
  const { error } = await supabase.from(table).upsert(rows);
  if (error) {
    console.error(`Supabase ${table} save failed:`, error);
    return false;
  }
  return true;
}

async function saveOne<T extends { id: string }>(
  table: PortfolioTable,
  localKey: string,
  item: T,
  defaultValue: T[],
  row?: (item: T) => Record<string, unknown>
): Promise<boolean> {
  const current = getLocalSeed(localKey, defaultValue);
  const index = current.findIndex(value => value.id === item.id);
  if (index >= 0) current[index] = item;
  else current.push(item);
  setLocalFallback(localKey, current);
  const { error } = await supabase.from(table).upsert({ id: item.id, data: item, ...(row?.(item) || {}) });
  if (error) {
    console.error(`Supabase ${table}/${item.id} save failed:`, error);
    return false;
  }
  return true;
}

async function deleteOne(table: PortfolioTable, id: string, localKey?: string): Promise<boolean> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (localKey) {
    const current = getLocalSeed<Array<{ id: string }>>(localKey, []);
    setLocalFallback(localKey, current.filter(item => item.id !== id));
  }
  if (error) {
    console.error(`Supabase ${table}/${id} delete failed:`, error);
    return false;
  }
  return true;
}

const educationRow = (item: PortfolioEducation) => ({ sort_order: item.sortOrder });
const experienceRow = (item: PortfolioExperience) => ({ sort_order: item.sortOrder });
const skillRow = (item: PortfolioSkill) => ({ category: item.category, visible: item.visible, sort_order: item.sortOrder });
const projectRow = (item: PortfolioProject) => ({ slug: item.slug || null, category: item.category, status: item.status, publish_date: item.publishDate || null, is_featured: item.isFeatured, is_pinned: item.isPinned, sort_order: item.sortOrder });
const courseRow = (item: PortfolioCourse) => ({ category: item.category, status: item.status, publish_date: item.publishDate || null });
const chapterRow = (courseId: string) => (item: CourseChapter) => ({ course_id: item.courseId || courseId, sort_order: item.sortOrder });
const lessonRow = (courseId: string) => (item: CourseLesson) => ({ course_id: item.courseId || courseId, chapter_id: item.chapterId || null, sort_order: item.sortOrder });
const studentRow = (item: CourseStudent) => ({ course_id: item.courseId || null, payment_status: item.paymentStatus, progress: Math.max(0, Math.min(100, item.progress)) });
const researchRow = (item: PortfolioResearch) => ({ research_type: item.type, field: item.field || null, publish_year: item.publishYear, is_featured: item.isFeatured, is_pinned: item.isPinned });
const lectureRow = (item: PortfolioLecture) => ({ subject: item.subject, document_type: item.documentType, status: item.status, publish_date: item.publishDate || null });

export const getPortfolioBanner = () => loadSetting('banner', 'banner', DEFAULT_BANNER);
export const savePortfolioBanner = async (value: PortfolioBanner) => { await saveSetting('banner', 'banner', value); };
export const getPortfolioAbout = () => loadSetting('about', 'about', DEFAULT_ABOUT);
export const savePortfolioAbout = async (value: PortfolioAbout) => { await saveSetting('about', 'about', value); };

export const getPortfolioEducation = () => loadCollection('portfolio_education', 'education', DEFAULT_EDUCATION, { orderBy: 'sort_order', row: educationRow });
export const savePortfolioEducation = async (items: PortfolioEducation[]) => { await saveCollection('portfolio_education', 'education', items, educationRow); };
export const deletePortfolioEducationDoc = async (id: string) => { await deleteOne('portfolio_education', id, 'education'); };

export const getPortfolioExperience = () => loadCollection('portfolio_experience', 'experience', DEFAULT_EXPERIENCE, { orderBy: 'sort_order', row: experienceRow });
export const savePortfolioExperience = async (items: PortfolioExperience[]) => { await saveCollection('portfolio_experience', 'experience', items, experienceRow); };
export const deletePortfolioExperienceDoc = async (id: string) => { await deleteOne('portfolio_experience', id, 'experience'); };

export const getPortfolioSkills = () => loadCollection('portfolio_skills', 'skills', DEFAULT_SKILLS, { orderBy: 'sort_order', row: skillRow });
export const savePortfolioSkills = async (items: PortfolioSkill[]) => { await saveCollection('portfolio_skills', 'skills', items, skillRow); };
export const deletePortfolioSkillDoc = async (id: string) => { await deleteOne('portfolio_skills', id, 'skills'); };

export const getPortfolioProjects = () => loadCollection('portfolio_projects', 'projects', DEFAULT_PROJECTS, { orderBy: 'sort_order', row: projectRow });
export const savePortfolioProject = async (item: PortfolioProject) => { await saveOne('portfolio_projects', 'projects', item, DEFAULT_PROJECTS, projectRow); };
export const deletePortfolioProject = async (id: string) => { await deleteOne('portfolio_projects', id, 'projects'); };

export const getPortfolioCourses = () => loadCollection('portfolio_courses', 'courses', DEFAULT_COURSES, { row: courseRow });
export const savePortfolioCourse = async (item: PortfolioCourse) => { await saveOne('portfolio_courses', 'courses', item, DEFAULT_COURSES, courseRow); };
export const deletePortfolioCourse = async (id: string) => { await deleteOne('portfolio_courses', id, 'courses'); };

export const getCourseChapters = (courseId: string) => loadCollection('portfolio_course_chapters', `chapters_${courseId}`, courseId === 'course_1' ? DEFAULT_CHAPTERS : [], { filter: ['course_id', courseId], orderBy: 'sort_order', row: chapterRow(courseId) });
export const saveCourseChapters = async (courseId: string, items: CourseChapter[]) => { await saveCollection('portfolio_course_chapters', `chapters_${courseId}`, items.map(item => ({ ...item, courseId })), chapterRow(courseId)); };
export const deleteCourseChapterDoc = async (id: string) => { await deleteOne('portfolio_course_chapters', id); };

export const getCourseLessons = (courseId: string) => loadCollection('portfolio_course_lessons', `lessons_${courseId}`, courseId === 'course_1' ? DEFAULT_LESSONS : [], { filter: ['course_id', courseId], orderBy: 'sort_order', row: lessonRow(courseId) });
export const saveCourseLessons = async (courseId: string, items: CourseLesson[]) => { await saveCollection('portfolio_course_lessons', `lessons_${courseId}`, items.map(item => ({ ...item, courseId })), lessonRow(courseId)); };
export const deleteCourseLessonDoc = async (id: string) => { await deleteOne('portfolio_course_lessons', id); };

export const getCourseStudents = () => loadCollection('portfolio_course_students', 'students', DEFAULT_STUDENTS, { row: studentRow });
export const saveCourseStudent = async (item: CourseStudent) => { await saveOne('portfolio_course_students', 'students', item, DEFAULT_STUDENTS, studentRow); };
export const deleteCourseStudentDoc = async (id: string) => { await deleteOne('portfolio_course_students', id, 'students'); };

export const getPortfolioResearch = () => loadCollection('portfolio_research', 'research', DEFAULT_RESEARCH, { row: researchRow });
export const savePortfolioResearch = async (item: PortfolioResearch) => { await saveOne('portfolio_research', 'research', item, DEFAULT_RESEARCH, researchRow); };
export const deletePortfolioResearch = async (id: string) => { await deleteOne('portfolio_research', id, 'research'); };

export const getPortfolioLectures = () => loadCollection('portfolio_lectures', 'lectures', DEFAULT_LECTURES, { row: lectureRow });
export const savePortfolioLecture = async (item: PortfolioLecture) => { await saveOne('portfolio_lectures', 'lectures', item, DEFAULT_LECTURES, lectureRow); };
export const deletePortfolioLecture = async (id: string) => { await deleteOne('portfolio_lectures', id, 'lectures'); };

export const getPortfolioNavigation = () => loadSetting('navigation', 'navigation', DEFAULT_PORTFOLIO_NAVIGATION);
export const savePortfolioNavigation = (items: PortfolioNavigation[]) => saveSetting('navigation', 'navigation', items);

export const getPortfolioPosts = () => loadSetting<PortfolioPost[]>('posts', 'posts', []);
export const savePortfolioPost = async (item: PortfolioPost) => {
  const current = await getPortfolioPosts();
  const index = current.findIndex(value => value.id === item.id);
  const next = [...current];
  if (index >= 0) next[index] = item;
  else next.unshift(item);
  return saveSetting('posts', 'posts', next);
};
export const deletePortfolioPost = async (id: string) => saveSetting('posts', 'posts', (await getPortfolioPosts()).filter(item => item.id !== id));
