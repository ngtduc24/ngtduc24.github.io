
// Quyền của người đang xem với một lớp, trường. Chủ thì có đủ quyền,
// người cộng tác chỉ có các quyền chủ đã tích chọn.
export interface EduAccess {
  owner: boolean;
  perms: {
    viewSubmissions?: boolean;
    assign?: boolean;
    grade?: boolean;
    editStudents?: boolean;
    editColumns?: boolean;
    exportGrades?: boolean;
    manageMembers?: boolean;
  };
  ownerName?: string | null;
}

// Học kỳ thuộc từng trường (lưu trong cột semesters của edu_schools), lớp gắn vào học kỳ qua semester_id.
export interface EduSemester {
  id: string;
  name: string;
}

export interface EduSchool {
  id: string;
  name: string;
  description?: string;
  semesters?: EduSemester[];
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  access?: EduAccess;
}

export interface EduClass {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  semesterId?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  access?: EduAccess;
}

export interface EduUser {
  id: string;
  classId: string;
  stt: number;
  fullName: string;
  mssv: string;
  createdAt: string;
}

export interface EduGradeColumn {
  id: string;
  classId: string;
  name: string;
  order: number;
  isConfirmed: boolean;
  weight?: number; // tỷ trọng % của cột trong điểm trung bình môn
  createdAt: string;
  updatedAt: string;
}

export interface EduSubject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
}

export interface EduAssignmentBankItem {
  id: string;
  subjectId?: string;
  title: string;
  content?: string;
  allowedFileTypes: string[];
  resources?: EduResource[];
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  isPublic?: boolean;
  shareToken?: string | null; // mã link xem bài không cần MSSV
  ownerName?: string | null;
}

// Tài nguyên thực hành đính kèm bài tập: tệp tải lên Cloudinary hoặc đường link (Google Drive, OneDrive...).
export interface EduResource {
  id: string;
  name: string;
  url: string;
  kind: 'file' | 'link';
  size?: number;
}

export interface EduAssignment {
  id: string;
  classId: string;
  gradeColumnId?: string;
  subjectId?: string;
  bankId?: string;
  title: string;
  content?: string;
  allowedFileTypes: string[];
  deadline?: string;
  allowLate?: boolean; // cho phép nộp bài sau khi hết hạn
  allowSupplement?: boolean; // cho phép nộp bổ sung sau khi đã nộp
  resources?: EduResource[]; // tài nguyên thực hành để sinh viên tải về
  createdAt: string;
  updatedAt: string;
  shareLinkId: string;
}

export interface EduSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  mssv: string;
  files: EduSubmissionFile[];
  content?: string;
  submittedAt: string;
  updatedAt: string;
  firstSubmittedAt: string;
}

// Yêu cầu gia hạn nộp bài của sinh viên, giáo viên duyệt và chọn thời gian gia hạn.
export interface EduExtensionRequest {
  id: string;
  assignmentId: string;
  classId: string;
  userId: string;
  mssv: string;
  studentName?: string;
  status: 'pending' | 'approved' | 'rejected';
  extendUntil?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  respondedBy?: string | null;
}

export interface EduSubmissionFile {
  url: string;
  type: string;
  name: string;
  submittedAt: string;
  // Tệp còn lưu base64 trong cơ sở dữ liệu: url để trống, tải riêng bằng getSubmissionFileUrl khi cần xem.
  inline?: boolean;
  size?: number;
}

export interface EduGrade {
  id: string;
  gradeColumnId: string;
  userId: string;
  score: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
