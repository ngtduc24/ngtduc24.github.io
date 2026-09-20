export interface SeoModuleMeta {
  id: string;
  slug: string;
  title: string;
  description: string;
  keywords?: string;
  ogType?: string;
}

export const SEO_MODULES: Record<string, SeoModuleMeta> = {
  profile: {
    id: 'profile',
    slug: 'ho-so-ca-nhan',
    title: 'Hồ sơ cá nhân | SmartResearch',
    description: 'Xem và cập nhật thông tin cá nhân, ảnh đại diện và mật khẩu tài khoản.',
    keywords: 'hồ sơ, trang cá nhân, tài khoản, thông tin cá nhân',
  },
  all_features: {
    id: 'all_features',
    slug: 'tat-ca-tinh-nang',
    title: 'Tất cả tính năng | SmartResearch',
    description: 'Danh mục toàn bộ tính năng và công cụ trên hệ thống.',
    keywords: 'tính năng, công cụ, danh mục chức năng',
  },
  ar_module: {
    id: 'ar_module',
    slug: 'tao-ar',
    title: 'Tạo AR | SmartResearch',
    description: 'Tạo điểm ảnh nhận diện thực tế tăng cường kèm mã QR để quét bằng điện thoại.',
    keywords: 'AR, thực tế tăng cường, image target, mã QR',
  },
  utility_image_resize: {
    id: 'utility_image_resize',
    slug: 'phong-to-anh',
    title: 'Phóng to ảnh | SmartResearch',
    description: 'Phóng to ảnh theo tỉ lệ và làm rõ chi tiết ở độ phân giải cao hơn.',
    keywords: 'phóng to ảnh, upscale, tăng độ phân giải',
  },
  utility_social_design: {
    id: 'utility_social_design',
    slug: 'thiet-ke-anh',
    title: 'Thiết kế ảnh | SmartResearch',
    description: 'Tạo nhanh ảnh cho bài báo, tin tức từ các khung mẫu có sẵn.',
    keywords: 'thiết kế ảnh, ảnh bài báo, khung mẫu',
  },
  dashboard: {
    id: 'dashboard',
    slug: 'dashboard',
    title: 'Tổng quan Dashboard | SmartResearch',
    description: 'Bảng điều khiển tổng hợp chỉ số nghiên cứu, tiến độ đề tài và các hoạt động học thuật khoa học.',
    keywords: 'dashboard, tổng quan, nghiên cứu khoa học, quản lý đề tài, chỉ số khoa học',
  },
  tasks: {
    id: 'tasks',
    slug: 'tasks',
    title: 'Quản lý Công việc & Dự án Nghiên cứu | SmartResearch',
    description: 'Hệ thống quản lý công việc nghiên cứu khoa học, phân công nhiệm vụ và theo dõi tiến độ chi tiết.',
    keywords: 'quản lý công việc, dự án nghiên cứu, task management, kanban đề tài',
  },
  scientific_journals: {
    id: 'scientific_journals',
    slug: 'scientific-journals',
    title: 'Quản lý Điểm Báo Khoa Học & Bài Báo | SmartResearch',
    description: 'Tra cứu, tổng hợp và phân loại điểm báo khoa học, tạp chí uy tín ISI/Scopus và cơ sở dữ liệu học thuật.',
    keywords: 'điểm báo khoa học, bài báo isi scopus, tạp chí khoa học, nghiên cứu học thuật',
  },
  calculator: {
    id: 'calculator',
    slug: 'sample-size-calculator',
    title: 'Tính Cỡ Mẫu Nghiên Cứu Y Sinh & Xã Hội | SmartResearch',
    description: 'Công cụ tính toán cỡ mẫu nghiên cứu khoa học, thử nghiệm lâm sàng và khảo sát thống kê theo chuẩn quốc tế.',
    keywords: 'tính cỡ mẫu, sample size calculator, nghiên cứu y học, công thức cỡ mẫu, thống kê',
  },
  qualitative_analysis: {
    id: 'qualitative_analysis',
    slug: 'qualitative-analysis',
    title: 'Phân tích Dữ liệu Định tính & Mã hóa Nghiên cứu | SmartResearch',
    description: 'Bộ công cụ phân tích dữ liệu định tính, mã hóa chủ đề (thematic coding) và trích xuất dữ liệu khoa học.',
    keywords: 'phân tích định tính, mã hóa dữ liệu, thematic analysis, nghiên cứu định tính',
  },
  quantitative_analysis: {
    id: 'quantitative_analysis',
    slug: 'quantitative-analysis',
    title: 'Phân tích Số liệu Định lượng & Thống kê | SmartResearch',
    description: 'Xử lý và phân tích số liệu thống kê mô tả, tương quan, hồi quy và kiểm định giả thuyết nghiên cứu.',
    keywords: 'phân tích định lượng, thống kê số liệu, kiểm định giả thuyết, spss, hồi quy',
  },
  utilities: {
    id: 'utilities',
    slug: 'utilities',
    title: 'Tiện ích Nghiên cứu & Thiết kế Đồ họa | SmartResearch',
    description: 'Bộ công cụ tiện ích tích hợp: Thiết kế đồ họa truyền thông mạng xã hội, quét mô hình AR 3D và tiện ích học thuật.',
    keywords: 'tiện ích, thiết kế canva, đồ họa truyền thông, quét ar, công cụ nghiên cứu',
  },
  portfolio_cms: {
    id: 'portfolio_cms',
    slug: 'portfolio-cms',
    title: 'Quản trị Nội dung Portfolio & Hồ sơ Năng lực | SmartResearch',
    description: 'Hệ thống quản trị hồ sơ khoa học, công trình nghiên cứu, khóa học và dự án truyền thông đa phương tiện.',
    keywords: 'quản trị portfolio, hồ sơ năng lực, cms nghiên cứu, khóa học trực tuyến',
  },
  notifications: {
    id: 'notifications',
    slug: 'notifications',
    title: 'Thông báo & Hộp thư Hệ thống | SmartResearch',
    description: 'Xem thông báo mới nhất về tiến độ dự án, hạn nộp bài báo và các thông điệp cập nhật học thuật.',
    keywords: 'thông báo, hộp thư, tin tức nghiên cứu, thông báo hệ thống',
  },
  users: {
    id: 'users',
    slug: 'quan-ly-nguoi-dung',
    title: 'Quản lý Tài khoản Người dùng | SmartResearch',
    description: 'Quản lý danh sách thành viên, tạo và chỉnh sửa tài khoản admin, thành viên và học viên trên hệ thống.',
    keywords: 'quản lý người dùng, tài khoản thành viên, user management, quản trị tài khoản',
  },
  permissions: {
    id: 'permissions',
    slug: 'phan-quyen',
    title: 'Phân quyền Truy cập Chức năng | SmartResearch',
    description: 'Cấp và thu hồi quyền truy cập từng chức năng cùng các quyền thao tác chi tiết cho từng tài khoản.',
    keywords: 'phân quyền, quyền truy cập, permission, quản trị quyền chức năng',
  },
  notifications_admin: {
    id: 'notifications_admin',
    slug: 'notifications-admin',
    title: 'Quản trị & Gửi Thông báo Hệ thống | SmartResearch',
    description: 'Kênh quản trị thông báo, gửi tin nhắn Push FCM đến các thành viên và quản lý lịch sử thông báo.',
    keywords: 'gửi thông báo, fcm notification, quản trị thông báo, push message',
  },
  media_library: {
    id: 'media_library',
    slug: 'media-library',
    title: 'Thư viện Media & Tệp tin Đa phương tiện | SmartResearch',
    description: 'Lưu trữ, quản lý và chia sẻ hình ảnh, tài liệu và tệp tin nghiên cứu an toàn trên đám mây.',
    keywords: 'thư viện media, hình ảnh, tài liệu nghiên cứu, tệp tin',
  },
  settings: {
    id: 'settings',
    slug: 'settings',
    title: 'Cấu hình Hệ thống & Cơ sở Dữ liệu | SmartResearch',
    description: 'Thiết lập thông số vận hành, kết nối Supabase, Firebase Firestore và sao lưu dữ liệu nghiên cứu.',
    keywords: 'cấu hình hệ thống, sao lưu dữ liệu, database settings, backup',
  },
  edu: {
    id: 'edu',
    slug: 'quan-ly-giao-duc',
    title: 'Hệ thống Quản lý Giáo dục & Đào tạo | SmartResearch',
    description: 'Nền tảng quản lý trường học, lớp học, danh sách sinh viên, bài tập và bảng điểm học thuật chuyên nghiệp.',
    keywords: 'quản lý giáo dục, quản lý sinh viên, bảng điểm, bài tập trực tuyến, đào tạo khoa học',
  },
  elearning: {
    id: 'elearning',
    slug: 'e-learning',
    title: 'E-Learning · Kho Bài giảng & Học liệu | SmartResearch',
    description: 'Soạn, lưu trữ và chia sẻ bài giảng theo môn học, công khai lên kho chung và giao bài giảng cho lớp.',
    keywords: 'e-learning, bài giảng, học liệu, kho bài giảng, giao bài giảng',
  },
  remier: {
    id: 'remier',
    slug: 'remier-dung-phim',
    title: 'Remier · Dựng phim trên web | SmartResearch',
    description: 'Ứng dụng dựng phim nhiều lớp chạy trong trình duyệt, quản lý kho tư liệu và xuất video.',
    keywords: 'dựng phim, video editor, remier, biên tập video, dòng thời gian',
  },
  assistant: {
    id: 'assistant',
    slug: 'tro-ly-ao',
    title: 'Trợ lý ảo | SmartResearch',
    description: 'Hỏi đáp và hướng dẫn dùng hệ thống, tìm nhanh bài giảng, câu hỏi và chức năng.',
    keywords: 'trợ lý ảo, hướng dẫn, hỏi đáp, tìm bài giảng',
  },
  portfolio: {
    id: 'portfolio',
    slug: 'portfolio',
    title: 'Andy Nguyễn - Truyền thông đa phương tiện và Thiết kế đồ họa',
    description: 'Hồ sơ năng lực, dự án thiết kế, khóa học trực tuyến và công trình nghiên cứu khoa học về truyền thông đa phương tiện.',
    keywords: 'andy nguyễn, portfolio, thiết kế đồ họa, truyền thông đa phương tiện, nghiên cứu',
  },
  public_search: {
    id: 'public_search',
    slug: 'tra-cuu',
    title: 'Tra Cứu Điểm Báo Khoa Học & Tạp Chí ISI/Scopus | SmartResearch',
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
export const SUBROUTE_PARAMS = ['sv', 'cid', 'aid', 'gcol', 'lid', 'ltab', 'qv', 'qid'];

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
