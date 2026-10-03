import { UserAccount } from '../types';
import { getCachedLanding } from './landing';

// Ứng dụng mặc định cho tài khoản tự đăng ký (admin chọn trong Cấu hình hệ thống). Áp cho tài khoản
// tự đăng ký chưa được admin phân quyền riêng, admin phân quyền rồi thì theo công tắc của admin.
let DEFAULT_APPS: string[] = getCachedLanding().defaultApps;
export function setDefaultApps(list: string[]) { DEFAULT_APPS = Array.isArray(list) ? list : []; }

// Ứng dụng được cấp sẵn khi tự đăng ký thì được dùng đầy đủ thao tác của ứng dụng đó
// (tạo, sửa, xoá, nhập, xuất...), không phải chờ admin bật từng quyền con.
// Riêng danh mục tạp chí là dữ liệu dùng chung của cả hệ thống nên không cấp quyền xoá và quản lý danh mục.
const EDU_ALL = ['canManageEdu', 'canCreateEdu', 'canEditEdu', 'canDeleteEdu', 'canImportEdu', 'canExportEdu', 'canGradeEdu', 'canGradeImportEdu'];
const APP_RIGHTS: Record<string, string[]> = {
  edu: EDU_ALL, edu_bank: EDU_ALL, edu_exam: EDU_ALL, edu_question_bank: EDU_ALL, edu_grade: EDU_ALL,
  elearning: ['canElearningPublic', 'canElearningAssign'],
  qualitative_analysis: ['canCreateQualitative', 'canEditQualitative', 'canDeleteQualitative', 'canImportQualitative', 'canExportQualitative'],
  quantitative_analysis: ['canCreateQuantitative', 'canEditQuantitative', 'canDeleteQuantitative', 'canImportQuantitative', 'canExportQuantitative'],
  tasks: ['canCreateTask', 'canAssignTask', 'canReceiveTask', 'canRunPauseTask', 'canCompleteTask', 'canDeleteTask'],
  scientific_journals: ['canCreateJournal', 'canEditJournal', 'canImportJournal'],
  portfolio_cms: ['canPortfolioContent', 'canPortfolioProjects', 'canPortfolioResearch', 'canPortfolioNavigation', 'canPortfolioProfile'],
};
export function withDefaultRights<T extends UserAccount | null | undefined>(user: T): T {
  if (!user || user.role === 'admin' || user.role === 'member') return user;
  const p = user.permissions || [];
  if (!user.selfRegistered || p.includes(PERM_V2)) return user;
  const apps = Array.from(new Set([...p, ...DEFAULT_APPS]));
  const add: Record<string, boolean> = {};
  apps.forEach(a => (APP_RIGHTS[a] || []).forEach(f => { if ((user as any)[f] === undefined || (user as any)[f] === null) add[f] = true; }));
  return Object.keys(add).length ? ({ ...(user as any), ...add } as T) : user;
}
function effectivePerms(user: UserAccount): string[] {
  const p = user.permissions || [];
  if (user.selfRegistered && !p.includes(PERM_V2)) return Array.from(new Set([...p, ...DEFAULT_APPS]));
  return p;
}

// Quyền vào từng chức năng, dùng chung cho điều hướng (App), trang Tất cả tính năng và Tổng quan.
// Mỗi chức năng có công tắc riêng trong trang Phân quyền. Các quyền gộp cũ vẫn được tính để
// tài khoản đã cấp từ trước không mất quyền.
export const PERM_V2 = 'perm_v2';

// Chuyển quyền cũ sang bộ công tắc mới: Giáo dục kèm cờ thao tác thành quyền riêng của từng chức năng con.
export function migratePermissions(user: UserAccount): string[] {
  const set = new Set(effectivePerms(user));
  if (set.has('utilities')) {
    set.delete('utilities');
    set.add('ar_module'); set.add('utility_image_resize'); set.add('utility_social_design');
  }
  if (!set.has(PERM_V2)) {
    if (set.has('edu') && user.canCreateEdu) set.add('edu_bank');
    if (set.has('edu') && user.canGradeEdu) { set.add('edu_exam'); set.add('edu_question_bank'); }
    if (set.has('edu') && user.canGradeImportEdu) set.add('edu_grade');
    set.add(PERM_V2);
  }
  return Array.from(set);
}

export function canUseModule(user: UserAccount | null | undefined, id: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  // Học viên chỉ dùng trang Thư viện, Khoá học, Thông báo, Hồ sơ.
  if (user.role === 'member') return ['portfolio_website', 'courses', 'dashboard', 'notifications', 'profile', 'user_profile', 'all_features'].includes(id);
  const p = effectivePerms(user);
  // Tài khoản đã được phân quyền theo bộ công tắc mới (có dấu PERM_V2) thì chỉ xét công tắc riêng,
  // tài khoản cũ chưa phân quyền lại thì vẫn tính theo quyền Giáo dục kèm cờ thao tác như trước.
  const legacy = !p.includes(PERM_V2);
  switch (id) {
    case 'courses': // Khoá học: ai đăng nhập cũng học được, chỉ admin quản lý
    case 'dashboard': // trang Thư viện (trang chủ bên trong) luôn mở cho tài khoản đã đăng nhập
    case 'notifications':
    case 'portfolio_website':
    case 'all_features':
    case 'profile':
    case 'user_profile':
      return true;
    case 'users':
    case 'permissions':
    case 'stats':
    case 'backup':
      return false;
    case 'settings':
    case 'media_library': // Kho lưu trữ nằm trong Cấu hình hệ thống
      return p.includes('settings');
    case 'notifications_admin':
      return p.includes('notifications');
    // Chức năng con của Giáo dục: quyền riêng, hoặc quyền cũ (Giáo dục kèm cờ thao tác).
    case 'edu_bank':
      return p.includes('edu_bank') || (legacy && p.includes('edu') && !!user.canCreateEdu);
    case 'edu_exam':
      // Ngân hàng câu hỏi nằm trong Quizz: tài khoản trước đây chỉ có quyền Ngân hàng câu hỏi vẫn vào được Quizz.
      // Quizz là chức năng con trong Giáo dục: ai dùng được Giáo dục thì dùng được Quizz.
      return p.includes('edu') || p.includes('edu_exam') || p.includes('edu_question_bank');
    case 'edu_question_bank':
      return p.includes('edu') || p.includes('edu_question_bank') || p.includes('edu_exam');
    case 'edu_grade':
      return p.includes('edu_grade') || (legacy && p.includes('edu') && !!user.canGradeImportEdu);
    case 'utilities':
      return p.includes('utilities') || p.includes('ar_module') || p.includes('utility_image_resize') || p.includes('utility_social_design');
    case 'ar_module':
    case 'utility_image_resize':
    case 'utility_social_design':
    case 'utility_file_compress':
      return p.includes(id) || p.includes('utilities');
    default:
      return p.includes(id);
  }
}
