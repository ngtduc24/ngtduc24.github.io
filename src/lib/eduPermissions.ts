import { UserAccount } from '../types';

// Các hành động con trong module Quản lý Giáo dục, khớp với cờ quyền trong trang Phân quyền.
export type EduAction = 'create' | 'edit' | 'delete' | 'import' | 'export' | 'gradeImport' | 'grade';

type EduUserLike = Partial<UserAccount> | null | undefined;

const EDU_FLAGS: (keyof UserAccount)[] = [
  'canCreateEdu', 'canEditEdu', 'canDeleteEdu', 'canImportEdu', 'canExportEdu', 'canGradeImportEdu', 'canGradeEdu',
];

// Tài khoản chưa được cấu hình bất kỳ quyền con Giáo dục nào (tất cả cờ đều tắt) thì
// vẫn cho làm đầy đủ như trước, để không làm mất quyền của tài khoản cũ. Khi đã bật
// ít nhất một quyền con thì mỗi hành động phải đúng quyền tương ứng mới được thực hiện.
export function eduHasAnyFlag(user: EduUserLike): boolean {
  return !!user && EDU_FLAGS.some(f => !!(user as any)[f]);
}

export function eduCan(user: EduUserLike, action: EduAction): boolean {
  if (!user) return false;
  if ((user as any).role === 'admin') return true;
  if (!eduHasAnyFlag(user)) return true;
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
