
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
import { EduClass, EduSchool } from '../types/edu';
import { getClasses, getSchools } from '../lib/edu';

interface EduModuleProps {
  currentUser: UserAccount;
  settings: AppSettings;
}

type EduView = 'list' | 'import' | 'class_detail' | 'assignment_edit' | 'assignment_detail' | 'grading' | 'assignment_bank';

export default function EduModule({ currentUser, settings }: EduModuleProps) {
  const [view, setView] = useState<EduView>('list');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedGradeColumnId, setSelectedGradeColumnId] = useState<string | null>(null);
  
  const { addNotification } = useNotifications();

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
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="edu-module-container">
      {/* Module Header - Only show when NOT in list view to avoid redundancy with the new Hero Banner */}
      {view !== 'list' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-display">
                {view === 'class_detail' ? 'Chi tiết lớp học' :
                 view === 'import' ? 'Import dữ liệu' :
                 view === 'grading' ? 'Chấm điểm sinh viên' :
                 view === 'assignment_bank' ? 'Ngân hàng bài tập' :
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
          />
        )}

        {view === 'assignment_bank' && (
          <EduAssignmentBank />
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
