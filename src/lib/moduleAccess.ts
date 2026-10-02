import { UserAccount } from '../types';

// Quyền vào từng chức năng, dùng chung cho điều hướng (App), trang Tất cả tính năng và Tổng quan.
// Mỗi chức năng có công tắc riêng trong trang Phân quyền. Các quyền gộp cũ vẫn được tính để
// tài khoản đã cấp từ trước không mất quyền.
export const PERM_V2 = 'perm_v2';

// Chuyển quyền cũ sang bộ công tắc mới: Giáo dục kèm cờ thao tác thành quyền riêng của từng chức năng con.
export function migratePermissions(user: UserAccount): string[] {
  const set = new Set(user.permissions || []);
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
  if (user.role === 'member') return id === 'portfolio_website';
  const p = user.permissions || [];
  // Tài khoản đã được phân quyền theo bộ công tắc mới (có dấu PERM_V2) thì chỉ xét công tắc riêng,
  // tài khoản cũ chưa phân quyền lại thì vẫn tính theo quyền Giáo dục kèm cờ thao tác như trước.
  const legacy = !p.includes(PERM_V2);
  switch (id) {
    case 'notifications':
    case 'portfolio_website':
    case 'all_features':
    case 'profile':
      return true;
    case 'users':
    case 'permissions':
    case 'stats':
    case 'backup':
      return false;
    case 'settings':
      return p.includes('settings');
    case 'notifications_admin':
      return p.includes('notifications');
    // Chức năng con của Giáo dục: quyền riêng, hoặc quyền cũ (Giáo dục kèm cờ thao tác).
    case 'edu_bank':
      return p.includes('edu_bank') || (legacy && p.includes('edu') && !!user.canCreateEdu);
    case 'edu_exam':
      return p.includes('edu_exam') || (legacy && p.includes('edu') && !!user.canGradeEdu);
    case 'edu_question_bank':
      return p.includes('edu_question_bank') || (legacy && p.includes('edu') && !!user.canGradeEdu);
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
