export interface SeoModuleMeta {
  id: string;
  slug: string;
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
}

export const SEO_MODULES: Record<string, SeoModuleMeta> = {
  user_profile: {
    id: 'user_profile',
    slug: 'nguoi-dung',
    title: 'Trang cá nhân | EduGo',
    description: 'Trang cá nhân của người dùng EduGo.',
    keywords: 'trang cá nhân, edugo',
  },
  profile: {
    id: 'profile',
    slug: 'ho-so-ca-nhan',
    title: 'Hồ sơ cá nhân | EduGo',
    description: 'Xem và cập nhật thông tin cá nhân, ảnh đại diện và mật khẩu tài khoản.',
    keywords: 'hồ sơ, trang cá nhân, tài khoản, thông tin cá nhân',
  },
  all_features: {
    id: 'all_features',
    slug: 'tat-ca-tinh-nang',
    title: 'Tất cả tính năng | EduGo',
    description: 'Danh mục toàn bộ tính năng và công cụ trên hệ thống.',
    keywords: 'tính năng, công cụ, danh mục chức năng',
  },
  ar_module: {
    id: 'ar_module',
    slug: 'tao-ar',
    title: 'Tạo AR | EduGo',
    description: 'Tạo điểm ảnh nhận diện thực tế tăng cường kèm mã QR để quét bằng điện thoại.',
    keywords: 'AR, thực tế tăng cường, image target, mã QR',
  },
  utility_image_resize: {
    id: 'utility_image_resize',
    slug: 'phong-to-anh',
    title: 'Phóng to ảnh | EduGo',
    description: 'Phóng to ảnh theo tỉ lệ và làm rõ chi tiết ở độ phân giải cao hơn.',
    keywords: 'phóng to ảnh, upscale, tăng độ phân giải',
  },
  utility_social_design: {
    id: 'utility_social_design',
    slug: 'thiet-ke-anh',
    title: 'Thiết kế ảnh | EduGo',
    description: 'Tạo nhanh ảnh cho bài báo, tin tức từ các khung mẫu có sẵn.',
    keywords: 'thiết kế ảnh, ảnh bài báo, khung mẫu',
  },
  utility_file_compress: {
    id: 'utility_file_compress',
    slug: 'giam-dung-luong-file',
    title: 'Giảm dung lượng file | EduGo',
    description: 'Nén PDF, JPG, PNG ngay trên trình duyệt mà vẫn giữ chất lượng tốt.',
    keywords: 'nén ảnh, nén pdf, giảm dung lượng file',
  },
  vr360: {
    id: 'vr360',
    slug: 'vr-360',
    title: 'VR 360 | EduGo',
    description: 'Ghép ảnh chụp thành không gian 360 độ, chia sẻ link xem bằng kính VR hoặc xoay điện thoại.',
    keywords: 'vr 360, ảnh 360, panorama, kính vr, cardboard',
  },
  edu_bank: {
    id: 'edu_bank',
    slug: 'ngan-hang-bai-tap',
    title: 'Ngân hàng bài tập | EduGo',
    description: 'Kho bài tập dùng lại và chia sẻ theo môn học.',
    keywords: 'ngân hàng bài tập, bài tập mẫu, chia sẻ bài tập',
  },
  edu_exam: {
    id: 'edu_exam',
    slug: 'trac-nghiem',
    title: 'Kiểm tra trắc nghiệm | EduGo',
    description: 'Tạo, giao và chấm đề kiểm tra trắc nghiệm trực tuyến.',
    keywords: 'trắc nghiệm, đề kiểm tra, thi online',
  },
  edu_question_bank: {
    id: 'edu_question_bank',
    slug: 'ngan-hang-cau-hoi',
    title: 'Ngân hàng câu hỏi | EduGo',
    description: 'Kho câu hỏi trắc nghiệm dùng lại và chia sẻ theo môn.',
    keywords: 'ngân hàng câu hỏi, câu hỏi trắc nghiệm',
  },
  edu_grade: {
    id: 'edu_grade',
    slug: 'nhap-diem',
    title: 'Nhập điểm | EduGo',
    description: 'Nhập điểm vào file .fg của phần mềm quản lý đào tạo.',
    keywords: 'nhập điểm, file fg, bảng điểm',
  },
  stats: {
    id: 'stats',
    slug: 'thong-ke',
    title: 'Thống kê | EduGo',
    description: 'Số liệu tổng quan và người dùng đang trực tuyến.',
    keywords: 'thống kê, số liệu, trực tuyến',
  },
  dashboard: {
    id: 'dashboard',
    slug: 'dashboard',
    title: 'Tổng quan Dashboard | EduGo',
    description: 'Bảng điều khiển tổng hợp chỉ số nghiên cứu, tiến độ đề tài và các hoạt động học thuật khoa học.',
    keywords: 'dashboard, tổng quan, nghiên cứu khoa học, quản lý đề tài, chỉ số khoa học',
  },
  tasks: {
    id: 'tasks',
    slug: 'tasks',
    title: 'Quản lý Công việc & Dự án Nghiên cứu | EduGo',
    description: 'Hệ thống quản lý công việc nghiên cứu khoa học, phân công nhiệm vụ và theo dõi tiến độ chi tiết.',
    keywords: 'quản lý công việc, dự án nghiên cứu, task management, kanban đề tài',
  },
  scientific_journals: {
    id: 'scientific_journals',
    slug: 'scientific-journals',
    title: 'Quản lý Điểm Báo Khoa Học & Bài Báo | EduGo',
    description: 'Tra cứu, tổng hợp và phân loại điểm báo khoa học, tạp chí uy tín ISI/Scopus và cơ sở dữ liệu học thuật.',
    keywords: 'điểm báo khoa học, bài báo isi scopus, tạp chí khoa học, nghiên cứu học thuật',
  },
  calculator: {
    id: 'calculator',
    slug: 'sample-size-calculator',
    title: 'Tính Cỡ Mẫu Nghiên Cứu Y Sinh & Xã Hội | EduGo',
    description: 'Công cụ tính toán cỡ mẫu nghiên cứu khoa học, thử nghiệm lâm sàng và khảo sát thống kê theo chuẩn quốc tế.',
    keywords: 'tính cỡ mẫu, sample size calculator, nghiên cứu y học, công thức cỡ mẫu, thống kê',
  },
  qualitative_analysis: {
    id: 'qualitative_analysis',
    slug: 'qualitative-analysis',
    title: 'Phân tích Dữ liệu Định tính & Mã hóa Nghiên cứu | EduGo',
    description: 'Bộ công cụ phân tích dữ liệu định tính, mã hóa chủ đề (thematic coding) và trích xuất dữ liệu khoa học.',
    keywords: 'phân tích định tính, mã hóa dữ liệu, thematic analysis, nghiên cứu định tính',
  },
  quantitative_analysis: {
    id: 'quantitative_analysis',
    slug: 'quantitative-analysis',
    title: 'Phân tích Số liệu Định lượng & Thống kê | EduGo',
    description: 'Xử lý và phân tích số liệu thống kê mô tả, tương quan, hồi quy và kiểm định giả thuyết nghiên cứu.',
    keywords: 'phân tích định lượng, thống kê số liệu, kiểm định giả thuyết, spss, hồi quy',
  },
  utilities: {
    id: 'utilities',
    slug: 'utilities',
    title: 'Tiện ích Nghiên cứu & Thiết kế Đồ họa | EduGo',
    description: 'Bộ công cụ tiện ích tích hợp: Thiết kế đồ họa truyền thông mạng xã hội, quét mô hình AR 3D và tiện ích học thuật.',
    keywords: 'tiện ích, thiết kế canva, đồ họa truyền thông, quét ar, công cụ nghiên cứu',
  },
  portfolio_cms: {
    id: 'portfolio_cms',
    slug: 'website',
    title: 'Website | EduGo',
    description: 'Tạo trang giới thiệu bản thân với địa chỉ riêng trên EduGo.',
    keywords: 'quản trị portfolio, hồ sơ năng lực, cms nghiên cứu, khóa học trực tuyến',
  },
  notifications: {
    id: 'notifications',
    slug: 'notifications',
    title: 'Thông báo & Hộp thư Hệ thống | EduGo',
    description: 'Xem thông báo mới nhất về tiến độ dự án, hạn nộp bài báo và các thông điệp cập nhật học thuật.',
    keywords: 'thông báo, hộp thư, tin tức nghiên cứu, thông báo hệ thống',
  },
  users: {
    id: 'users',
    slug: 'quan-ly-nguoi-dung',
    title: 'Quản lý Tài khoản Người dùng | EduGo',
    description: 'Quản lý danh sách thành viên, tạo và chỉnh sửa tài khoản admin, thành viên và học viên trên hệ thống.',
    keywords: 'quản lý người dùng, tài khoản thành viên, user management, quản trị tài khoản',
  },
  permissions: {
    id: 'permissions',
    slug: 'phan-quyen',
    title: 'Phân quyền Truy cập Chức năng | EduGo',
    description: 'Cấp và thu hồi quyền truy cập từng chức năng cùng các quyền thao tác chi tiết cho từng tài khoản.',
    keywords: 'phân quyền, quyền truy cập, permission, quản trị quyền chức năng',
  },
  notifications_admin: {
    id: 'notifications_admin',
    slug: 'notifications-admin',
    title: 'Quản trị & Gửi Thông báo Hệ thống | EduGo',
    description: 'Kênh quản trị thông báo, gửi tin nhắn Push FCM đến các thành viên và quản lý lịch sử thông báo.',
    keywords: 'gửi thông báo, fcm notification, quản trị thông báo, push message',
  },
  media_library: {
    id: 'media_library',
    slug: 'kho-luu-tru',
    title: 'Kho lưu trữ | EduGo',
    description: 'Ảnh và video bạn đã tải lên, tìm kiếm, sao chép link để dùng lại.',
    keywords: 'kho lưu trữ, hình ảnh, video, tệp tin',
  },
  settings: {
    id: 'settings',
    slug: 'settings',
    title: 'Cấu hình Hệ thống & Cơ sở Dữ liệu | EduGo',
    description: 'Thiết lập thông số vận hành, kết nối Supabase, Firebase Firestore và sao lưu dữ liệu nghiên cứu.',
    keywords: 'cấu hình hệ thống, sao lưu dữ liệu, database settings, backup',
  },
  edu: {
    id: 'edu',
    slug: 'quan-ly-giao-duc',
    title: 'Hệ thống Quản lý Giáo dục & Đào tạo | EduGo',
    description: 'Nền tảng quản lý trường học, lớp học, danh sách sinh viên, bài tập và bảng điểm học thuật chuyên nghiệp.',
    keywords: 'quản lý giáo dục, quản lý sinh viên, bảng điểm, bài tập trực tuyến, đào tạo khoa học',
  },
  courses: {
    id: 'courses',
    slug: 'khoa-hoc',
    title: 'Khoá học | EduGo',
    description: 'Học các khoá trực tuyến do EduGo biên soạn, theo dõi tiến độ và làm bài kiểm tra.',
    keywords: 'khoá học trực tuyến, học online, edugo',
  },
  slides: {
    id: 'slides',
    slug: 'bai-giang',
    title: 'Bài giảng · Thiết kế bài giảng trình chiếu | EduGo',
    description: 'Thiết kế bài giảng trình chiếu như Google Slides, Canva, cùng soạn với đồng nghiệp và trình chiếu ngay trên web.',
    keywords: 'bài giảng, thiết kế bài giảng, trình chiếu, slide, google slides, canva',
  },
  elearning: {
    id: 'elearning',
    slug: 'e-learning',
    title: 'Giáo trình · Kho giáo trình và học liệu | EduGo',
    description: 'Soạn, lưu trữ và chia sẻ giáo trình theo môn học, công khai lên thư viện và giao giáo trình cho lớp.',
    keywords: 'giáo trình, học liệu, kho giáo trình, e-learning, giao giáo trình',
  },
  qr_codes: {
    id: 'qr_codes',
    slug: 'tao-ma-qr',
    title: 'Tạo mã QR cá nhân | EduGo',
    description: 'Tạo mã QR từ đường link ngay trên trình duyệt, lưu và quản lý mã QR của riêng bạn.',
    keywords: 'tạo mã QR, QR code, mã QR link, quản lý mã QR',
  },
  scientific_cv: {
    id: 'scientific_cv',
    slug: 'ly-lich-khoa-hoc',
    title: 'Lý lịch khoa học cá nhân | EduGo',
    description: 'Tạo, lưu và xuất lý lịch khoa học cá nhân theo mẫu cho giảng viên, nội dung chỉ riêng chủ hồ sơ xem được.',
    keywords: 'lý lịch khoa học, lý lịch giảng viên, CV khoa học, mẫu lý lịch khoa học',
  },
  remier: {
    id: 'remier',
    slug: 'remier-dung-phim',
    title: 'Remier · Dựng phim trên web | EduGo',
    description: 'Ứng dụng dựng phim nhiều lớp chạy trong trình duyệt, quản lý kho tư liệu và xuất video.',
    keywords: 'dựng phim, video editor, remier, biên tập video, dòng thời gian',
  },
  automatic: {
    id: 'automatic',
    slug: 'automatic',
    title: 'Automatic · Tự động hoá quy trình | EduGo',
    description: 'Tạo quy trình tự động hoá kéo thả theo cách của n8n: bước kích hoạt, lịch chạy, gọi API, rẽ nhánh, biến đổi dữ liệu.',
    keywords: 'tự động hoá, automation, quy trình, n8n, lịch chạy, cron, workflow',
  },
  assistant: {
    id: 'assistant',
    slug: 'tro-ly-giao-duc',
    title: 'Trợ lý giáo dục | EduGo',
    description: 'Hỏi đáp kiến thức bài học dựa trên bài giảng, câu hỏi và bài tập được chia sẻ công khai.',
    keywords: 'trợ lý giáo dục, hỏi đáp kiến thức, bài giảng, ôn tập',
  },
  portfolio: {
    id: 'portfolio',
    slug: 'portfolio',
    title: 'EduGo - Nền tảng học tập và làm việc trực tuyến',
    description: 'EduGo gom các công cụ giảng dạy, học tập và nghiên cứu vào một chỗ.',
    keywords: 'edugo, giáo dục, e-learning, trắc nghiệm, quản lý lớp học',
  },
  public_search: {
    id: 'public_search',
    slug: 'tra-cuu',
    title: 'Tra Cứu Điểm Báo Khoa Học & Tạp Chí ISI/Scopus | EduGo',
    description: 'Cổng tra cứu điểm báo khoa học, định danh tạp chí uy tín ISI, Scopus, tính điểm công trình nghiên cứu và cơ sở dữ liệu y sinh học toàn diện.',
    keywords: 'tra cứu điểm báo, tạp chí khoa học, isi, scopus, tính điểm công trình, bài báo y học',
  },
};

/**
 * Đặt SEO tùy biến linh hoạt cho bất kỳ trang hoặc kết quả tìm kiếm nào
 */
export function setCustomPageSEO(options: {
  title: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
}): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const title = options.title;
  const description = options.description || 'Hệ thống hỗ trợ tính toán cỡ mẫu và tra cứu điểm báo khoa học toàn diện.';
  const currentUrl = options.canonicalUrl || window.location.href;

  document.title = title;

  const setMetaTag = (name: string, content: string, isProperty = false) => {
    const attr = isProperty ? 'property' : 'name';
    let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attr, name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  setMetaTag('description', description);
  setMetaTag('og:title', title, true);
  setMetaTag('og:description', description, true);
  setMetaTag('og:url', currentUrl, true);
  setMetaTag('og:type', 'website', true);
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);

  if (options.keywords) {
    setMetaTag('keywords', options.keywords);
  }
  if (options.ogImage) {
    setMetaTag('og:image', options.ogImage, true);
    setMetaTag('twitter:image', options.ogImage);
  }

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', currentUrl);
}

/**
 * Tìm kiếm cấu hình SEO theo tabId hoặc theo slug URL
 */
export function getSeoMeta(tabOrSlug: string): SeoModuleMeta {
  if (SEO_MODULES[tabOrSlug]) {
    return SEO_MODULES[tabOrSlug];
  }
  const bySlug = Object.values(SEO_MODULES).find(item => item.slug === tabOrSlug);
  if (bySlug) {
    return bySlug;
  }
  // Mặc định trả về Dashboard
  return SEO_MODULES.dashboard;
}

/**
 * Cập nhật động thẻ Title và Meta Tags (OpenGraph, Twitter, Description)
 */
export function updateDocumentSEO(tabOrSlug: string, customTitle?: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const meta = getSeoMeta(tabOrSlug);
  const title = customTitle || meta.title;
  const description = meta.description;
  const currentUrl = window.location.href;

  // 1. Cập nhật Title
  document.title = title;

  // 2. Cập nhật các thẻ Meta
  const setMetaTag = (name: string, content: string, isProperty = false) => {
    const attr = isProperty ? 'property' : 'name';
    let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attr, name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  setMetaTag('description', description);
  setMetaTag('og:title', title, true);
  setMetaTag('og:description', description, true);
  setMetaTag('og:url', currentUrl, true);
  setMetaTag('og:type', meta.ogType || 'website', true);
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);

  if (meta.keywords) {
    setMetaTag('keywords', meta.keywords);
  }

  // 3. Cập nhật Canonical Link
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', currentUrl);
}

/**
 * Chuyển đổi tabId sang đường dẫn link chuẩn SEO
 */
export function getTabUrl(tabId: string): string {
  const meta = SEO_MODULES[tabId];
  const slug = meta ? meta.slug : tabId;
  return `?tab=${encodeURIComponent(slug)}`;
}

// ============================ ĐỊNH TUYẾN MÀN HÌNH CON ============================
// Các tham số phụ mô tả màn hình con bên trong một chức năng: lớp, bài tập, bài giảng,
// đề trắc nghiệm, cột điểm... Nhờ lưu trên URL nên tải lại trang không nhảy về màn hình
// chính của chức năng mà giữ đúng nơi đang mở.
//   sv   : tên màn hình con của chức năng đang mở
//   cid  : id lớp học
//   aid  : id bài tập
//   gcol : id cột điểm đang chấm
//   lid  : id bài giảng
//   ltab : kho bài giảng đang xem (của tôi hay chung)
//   qv   : màn hình con của trắc nghiệm
//   qid  : id đề trắc nghiệm
export const SUBROUTE_PARAMS = ['sv', 'cid', 'aid', 'gcol', 'lid', 'ltab', 'qv', 'qid', 'cvid', 'bid', 'sid', 'uid', 'awf'];

// Đọc các tham số màn hình con hiện có trên URL.
export function readSubRoute(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  SUBROUTE_PARAMS.forEach(k => { const v = p.get(k); if (v) out[k] = v; });
  return out;
}

// Ghi tham số màn hình con vào URL mà không thêm lịch sử (replaceState), giữ nguyên tab.
export function writeSubRoute(values: Record<string, string | null | undefined>) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  Object.entries(values).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
  });
  window.history.replaceState(window.history.state, '', url.toString());
}

// Xóa mọi tham số màn hình con khỏi một URL (dùng khi đổi sang chức năng khác).
export function clearSubRoute(url: URL) {
  SUBROUTE_PARAMS.forEach(k => url.searchParams.delete(k));
}

/**
 * Đọc tabId từ URL hiện tại
 */
export function getTabFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (!tabParam) return null;

  // Kiểm tra xem tabParam khớp với id hay slug
  if (SEO_MODULES[tabParam]) {
    return tabParam;
  }
  const found = Object.values(SEO_MODULES).find(item => item.slug === tabParam);
  return found ? found.id : tabParam;
}
