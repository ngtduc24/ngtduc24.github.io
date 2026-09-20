import { UserAccount } from '../types';

// Các hành động con trong module Quản lý Giáo dục, khớp với cờ quyền trong trang Phân quyền.
export type EduAction = 'create' | 'edit' | 'delete' | 'import' | 'export' | 'gradeImport' | 'grade';

type EduUserLike = Partial<UserAccount> | null | undefined;

const EDU_FLAGS: (keyof UserAccount)[] = [
  'canCreateEdu', 'canEditEdu', 'canDeleteEdu', 'canImportEdu', 'canExportEdu', 'canGradeImportEdu', 'canGradeEdu',
];

export function eduHasAnyFlag(user: EduUserLike): boolean {
  return !!user && EDU_FLAGS.some(f => !!(user as any)[f]);
}

// Nguyên tắc chặt: quản trị viên làm được tất cả. Tài khoản khác chỉ làm được đúng
// thao tác đã được cấp quyền. Không cấp quyền con nào thì chỉ xem, không thao tác.
export function eduCan(user: EduUserLike, action: EduAction): boolean {
  if (!user) return false;
  if ((user as any).role === 'admin') return true;
  switch (action) {
    case 'create': return !!(user as any).canCreateEdu;
    case 'edit': return !!(user as any).canEditEdu;
    case 'delete': return !!(user as any).canDeleteEdu;
    case 'import': return !!(user as any).canImportEdu;
    case 'export': return !!(user as any).canExportEdu;
    case 'gradeImport': return !!(user as any).canGradeImportEdu;
    case 'grade': return !!(user as any).canGradeEdu;
    default: return false;
  }
}
