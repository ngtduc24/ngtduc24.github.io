
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowLeft,
  Calendar,
  ExternalLink,
  Copy,
  Layout
} from 'lucide-react';
import { EduAssignment, EduSubmission, EduUser, EduGradeColumn } from '../../types/edu';
import { getSubmissions, getClassUsers, getGradeColumns } from '../../lib/edu';
import { useNotifications } from '../NotificationContext';

interface EduAssignmentDetailProps {
  classId: string;
  assignmentId: string;
  onBack: () => void;
}

export default function EduAssignmentDetail({ classId, assignmentId, onBack }: EduAssignmentDetailProps) {
  const [assignment, setAssignment] = useState<EduAssignment | null>(null);
  const [submissions, setSubmissions] = useState<EduSubmission[]>([]);
  const [users, setUsers] = useState<EduUser[]>([]);
  const [gradeColumn, setGradeColumn] = useState<EduGradeColumn | null>(null);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    async function loadData() {
      try {
        const { getAssignments } = await import('../../lib/edu');
        const [assignmentsData, subsData, usersData, columnsData] = await Promise.all([
          getAssignments(classId),
          getSubmissions(assignmentId),
          getClassUsers(classId),
          getGradeColumns(classId)
        ]);

        const foundAssignment = assignmentsData.find(a => a.id === assignmentId);
        if (foundAssignment) {
          setAssignment(foundAssignment);
          const col = columnsData.find(c => c.id === foundAssignment.gradeColumnId);
          setGradeColumn(col || null);
        }
        
        setSubmissions(subsData);
        setUsers(usersData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [classId, assignmentId]);

  const copyShareLink = () => {
    if (!assignment) return;
    const link = `${window.location.origin}/tracuu.html?edu=${assignment.shareLinkId}`;
    navigator.clipboard.writeText(link);
    addNotification("Đã sao chép link nộp bài", "success");
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Đang tải chi tiết bài tập...</div>;
  if (!assignment) return <div className="py-20 text-center text-slate-400">Không tìm thấy bài tập</div>;

  const submissionCount = submissions.length;
  const totalStudents = users.length;
  const submissionRate = totalStudents > 0 ? (submissionCount / totalStudents) * 100 : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900">{assignment.title}</h2>
            <p className="text-xs text-slate-500 font-medium">Chi tiết bài tập và thống kê nộp bài</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={copyShareLink}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <Copy className="w-4 h-4" />
            <span>Sao chép Link</span>
          </button>
          <a 
            href={`/tracuu.html?edu=${assignment.shareLinkId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Mở Link nộp bài</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              Nội dung bài tập
            </h3>
            <div 
              className="prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: assignment.content || 'Không có nội dung mô tả.' }}
            />
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layout className="w-4 h-4 text-brand" />
              Thống kê nộp bài
            </h3>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Tỷ lệ nộp bài</span>
                  <span className="text-xl font-black text-brand">{submissionCount}/{totalStudents}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand transition-all duration-500" 
                    style={{ width: `${submissionRate}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-500 font-bold mt-2 uppercase">
                  {submissionCount} sinh viên đã nộp bài trên tổng số {totalStudents}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Hạn nộp
                  </span>
                  <span className="text-slate-700 font-black">
                    {assignment.deadline ? new Date(assignment.deadline).toLocaleString('vi-VN') : 'Không giới hạn'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cột điểm
                  </span>
                  <span className="text-slate-700 font-black">
                    {gradeColumn?.name || 'Chưa gán'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> Định dạng
                  </span>
                  <span className="text-slate-700 font-black uppercase">
                    {assignment.allowedFileTypes.join(', ') || 'Tất cả'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-brand/5 p-6 rounded-3xl border border-brand/10">
            <p className="text-xs font-bold text-brand mb-4">Bạn muốn chấm điểm cho bài tập này?</p>
            <button 
              onClick={() => {
                if (gradeColumn) {
                  // This is a bit tricky since we need to tell the parent to switch to grading
                  // For now, we'll assume the parent handles this if we provide a way
                  window.dispatchEvent(new CustomEvent('edu_start_grading', { 
                    detail: { assignmentId: assignment.id, gradeColumnId: gradeColumn.id } 
                  }));
                }
              }}
              className="w-full bg-brand text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-brand/20 hover:bg-brand-hover transition-all"
            >
              BẮT ĐẦU CHẤM ĐIỂM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
