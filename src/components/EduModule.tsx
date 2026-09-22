
import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Upload, 
  Users, 
  BookOpen, 
  ClipboardCheck, 
  FileSpreadsheet, 
  Search,
  ChevronRight,
  School,
  ArrowLeft,
  Settings,
  MoreVertical,
  Trash2,
  Edit2,
  BookMarked
} from 'lucide-react';
import { UserAccount, AppSettings } from '../types';
import { useNotifications } from './NotificationContext';
import { useConfirmation } from './ConfirmationContext';
import EduImport from './edu/EduImport';
import EduSchoolClassList from './edu/EduSchoolClassList';
import EduClassDetail from './edu/EduClassDetail';
import EduAssignmentEditor from './edu/EduAssignmentEditor';
import EduAssignmentDetail from './edu/EduAssignmentDetail';
import EduGrading from './edu/EduGrading';
import EduAssignmentBank from './edu/EduAssignmentBank';
import EduGradeEntry from './edu/EduGradeEntry';
import QuizModule from './edu/QuizModule';
import { EduClass, EduSchool } from '../types/edu';
import { getClasses, getSchools } from '../lib/edu';
import { readSubRoute, writeSubRoute } from '../lib/seoConfig';

interface EduModuleProps {
  currentUser: UserAccount;
  settings: AppSettings;
  initialView?: EduView; // mở thẳng một màn hình con khi vào bằng link riêng (ngân hàng bài tập, trắc nghiệm...)
}

type EduView = 'list' | 'import' | 'class_detail' | 'assignment_edit' | 'assignment_detail' | 'grading' | 'assignment_bank' | 'grade_entry' | 'exam_bank' | 'question_bank';

export default function EduModule({ currentUser, settings, initialView }: EduModuleProps) {
  // Đọc màn hình con từ URL để tải lại trang không nhảy về danh sách chính.
  const sub = readSubRoute();
  const [view, setView] = useState<EduView>(() => {
    const valid: EduView[] = ['import', 'class_detail', 'assignment_edit', 'assignment_detail', 'grading', 'assignment_bank', 'grade_entry', 'exam_bank', 'question_bank'];
    if (sub.sv && (valid as string[]).includes(sub.sv)) return sub.sv as EduView;
    if (initialView) return initialView;
    // Phím tắt từ Dashboard có thể mở thẳng vào Trắc nghiệm, Nhập điểm hoặc Ngân hàng câu hỏi.
    try {
      const v = localStorage.getItem('edu_initial_view');
      if (v === 'exam_bank' || v === 'grade_entry' || v === 'assignment_bank' || v === 'question_bank') { localStorage.removeItem('edu_initial_view'); return v as EduView; }
    } catch {}
    return 'list';
  });
  const [selectedClassId, setSelectedClassId] = useState<string | null>(sub.cid || null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(sub.aid || null);
  const [selectedGradeColumnId, setSelectedGradeColumnId] = useState<string | null>(sub.gcol || null);

  const { addNotification } = useNotifications();

  // Đồng bộ màn hình con hiện tại lên URL mỗi khi đổi màn hình hay đổi lớp, bài tập, cột điểm.
  useEffect(() => {
    const needsClass = ['class_detail', 'assignment_edit', 'assignment_detail', 'grading'].includes(view);
    const needsAid = ['assignment_edit', 'assignment_detail', 'grading'].includes(view);
    const needsGcol = view === 'grading';
    writeSubRoute({
      sv: view === 'list' ? null : view,
      cid: needsClass ? selectedClassId : null,
      aid: needsAid ? selectedAssignmentId : null,
      gcol: needsGcol ? selectedGradeColumnId : null,
    });
  }, [view, selectedClassId, selectedAssignmentId, selectedGradeColumnId]);

  useEffect(() => {
    const handleStartGrading = (e: any) => {
      const { assignmentId, gradeColumnId } = e.detail;
      setSelectedAssignmentId(assignmentId);
      setSelectedGradeColumnId(gradeColumnId);
      setView('grading');
    };

    window.addEventListener('edu_start_grading', handleStartGrading);
    return () => window.removeEventListener('edu_start_grading', handleStartGrading);
  }, []);

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    setView('class_detail');
  };

  const handleAssignmentEdit = (classId: string, assignmentId?: string) => {
    setSelectedClassId(classId);
    setSelectedAssignmentId(assignmentId || null);
    setView('assignment_edit');
  };

  const handleAssignmentDetail = (classId: string, assignmentId: string) => {
    setSelectedClassId(classId);
    setSelectedAssignmentId(assignmentId);
    setView('assignment_detail');
  };

  const handleGrading = (classId: string, assignmentId: string, gradeColumnId: string) => {
    setSelectedClassId(classId);
    setSelectedAssignmentId(assignmentId);
    setSelectedGradeColumnId(gradeColumnId);
    setView('grading');
  };

  const handleBack = () => {
    if (view === 'class_detail') {
      setView('list');
      setSelectedClassId(null);
    } else if (view === 'import') {
      setView('list');
    } else if (view === 'assignment_edit') {
      setView('class_detail');
    } else if (view === 'assignment_detail') {
      setView('class_detail');
    } else if (view === 'grading') {
      setView('class_detail');
    } else if (view === 'assignment_bank') {
      setView('list');
    } else if (view === 'grade_entry') {
      setView('list');
    } else if (view === 'exam_bank') {
      setView('list');
    } else if (view === 'question_bank') {
      setView('list');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="edu-module-container">
      {/* Module Header - Ẩn ở danh sách và ở chi tiết lớp (chi tiết lớp có nút quay lại riêng ở tiêu đề). */}
      {view !== 'list' && view !== 'class_detail' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-display">
                {view === 'import' ? 'Import dữ liệu' :
                 view === 'grading' ? 'Chấm điểm sinh viên' :
                 view === 'assignment_bank' ? 'Ngân hàng bài tập' :
                 view === 'grade_entry' ? 'Nhập điểm' :
                 view === 'exam_bank' ? 'Kiểm tra trắc nghiệm' :
                 view === 'question_bank' ? 'Ngân hàng câu hỏi' :
                 'Hệ thống Giáo dục Edu'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">Quản lý trường học, lớp học và kết quả học tập</p>
            </div>
          </div>
          
          <button 
            onClick={handleBack}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-[11px] font-black transition-all cursor-pointer uppercase tracking-widest shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div className="min-h-[600px]">
        {view === 'list' && (
          <EduSchoolClassList
            onSelectClass={handleClassSelect}
            onImport={() => setView('import')}
            onOpenBank={() => setView('assignment_bank')}
            onOpenGrades={() => setView('grade_entry')}
            onOpenExams={() => setView('exam_bank')}
            isAdmin={currentUser.role === 'admin'}
            currentUser={currentUser}
          />
        )}

        {view === 'assignment_bank' && (
          <EduAssignmentBank currentUser={currentUser} />
        )}

        {view === 'grade_entry' && (
          <EduGradeEntry currentUser={currentUser} />
        )}

        {view === 'exam_bank' && (
          <QuizModule currentUser={currentUser} />
        )}

        {view === 'question_bank' && (
          <QuizModule currentUser={currentUser} standaloneBank />
        )}
        
        {view === 'import' && (
          <EduImport 
            currentUser={currentUser} 
            onSuccess={(classId) => {
              addNotification("Import thành công!", "success");
              handleClassSelect(classId);
            }} 
          />
        )}
        
        {view === 'class_detail' && selectedClassId && (
          <EduClassDetail
            classId={selectedClassId}
            currentUser={currentUser}
            onBack={handleBack}
            onEditAssignment={(assignmentId) => handleAssignmentEdit(selectedClassId, assignmentId)}
            onViewAssignment={(assignmentId) => handleAssignmentDetail(selectedClassId, assignmentId)}
            onGrading={(assignmentId, gradeColumnId) => handleGrading(selectedClassId, assignmentId, gradeColumnId)}
          />
        )}

        {view === 'assignment_edit' && selectedClassId && (
          <EduAssignmentEditor 
            classId={selectedClassId}
            assignmentId={selectedAssignmentId}
            onSuccess={() => setView('class_detail')}
          />
        )}

        {view === 'assignment_detail' && selectedClassId && selectedAssignmentId && (
          <EduAssignmentDetail 
            classId={selectedClassId}
            assignmentId={selectedAssignmentId}
            onBack={() => setView('class_detail')}
          />
        )}

        {view === 'grading' && selectedClassId && selectedAssignmentId && selectedGradeColumnId && (
          <EduGrading 
            classId={selectedClassId}
            assignmentId={selectedAssignmentId}
            gradeColumnId={selectedGradeColumnId}
            onSuccess={() => setView('class_detail')}
          />
        )}
      </div>
    </div>
  );
}
