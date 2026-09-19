
export interface EduSchool {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
}

export interface EduClass {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
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
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  isPublic?: boolean;
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

export interface EduSubmissionFile {
  url: string;
  type: string;
  name: string;
  submittedAt: string;
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
