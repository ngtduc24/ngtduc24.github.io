
import StickyHead from '../ui/StickyHead';
import React, { useState, useEffect } from 'react';
import { prettyShareUrl } from '../../lib/shareLinks';
import { copyText } from '../ui/Dialogs';
import { 
  FileText, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowLeft,
  Calendar,
  ExternalLink,
  Copy
} from 'lucide-react';
import { eduFileTypeLabel } from '../../lib/eduFileTypes';
import { EduResourceList } from './EduResources';
import { exportAssignmentToPdf, subjectNameById } from '../../lib/assignmentPdf';
import { FileDown } from 'lucide-react';
import { Button, IconButton, Card, CardTitle, PageHeader, Badge, Spinner, EmptyState } from '../ui';
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
    copyText(prettyShareUrl('edu', assignment.shareLinkId)).then(ok => addNotification(ok ? "Đã sao chép link nộp bài" : "Không sao chép được, hãy thử lại.", ok ? "success" : "error"));
  };

  if (loading) return <Spinner label="Đang tải chi tiết bài tập..." />;
  if (!assignment) return <EmptyState icon={<FileText size={24} />} title="Không tìm thấy bài tập" action={<Button variant="outline" icon={<ArrowLeft size={16} />} onClick={onBack}>Quay lại</Button>} />;

  const submissionCount = submissions.length;
  const totalStudents = users.length;
  const submissionRate = totalStudents > 0 ? (submissionCount / totalStudents) * 100 : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      <StickyHead onBack={onBack} backTitle="Quay lại danh sách" icon={<FileText className="h-6 w-6" />}
        title={assignment.title} subtitle="Chi tiết bài tập và thống kê nộp bài"
        actions={[
          { key: 'pdf', label: 'Tải PDF', icon: <FileDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />, onClick: async () => exportAssignmentToPdf({
            title: assignment.title, content: assignment.content, subjectName: await subjectNameById(assignment.subjectId),
            deadline: assignment.deadline, allowedFileTypes: assignment.allowedFileTypes, resources: assignment.resources,
          }) },
          { key: 'copy', label: 'Sao chép link', icon: <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5" />, onClick: copyShareLink },
          { key: 'open', label: 'Mở link nộp bài', primary: true, icon: <ExternalLink className="h-4 w-4 sm:h-3.5 sm:w-3.5" />, onClick: () => window.open(`/tracuu.html?edu=${assignment.shareLinkId}`, '_blank', 'noreferrer') },
        ]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nội dung */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardTitle>Nội dung bài tập</CardTitle>
            <div 
              className="prose prose-slate prose-sm max-w-none text-sm text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: assignment.content || 'Không có nội dung mô tả.' }}
            />
          </Card>
          {!!assignment.resources?.length && <Card><EduResourceList resources={assignment.resources} /></Card>}
        </div>

        {/* Cột phải */}
        <div className="space-y-6">
          <Card>
            <CardTitle>Thống kê nộp bài</CardTitle>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-semibold text-slate-500">Tỷ lệ nộp bài</span>
                  <span className="text-xl font-bold text-brand">{submissionCount}/{totalStudents}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-brand transition-all duration-500" style={{ width: `${submissionRate}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-2">{submissionCount} sinh viên đã nộp bài trên tổng số {totalStudents}</p>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium flex items-center gap-2"><Calendar size={14} /> Hạn nộp</span>
                  <span className="text-slate-800 font-semibold text-right">{assignment.deadline ? new Date(assignment.deadline).toLocaleString('vi-VN') : 'Không giới hạn'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium flex items-center gap-2"><CheckCircle2 size={14} /> Cột điểm</span>
                  <span className="text-slate-800 font-semibold text-right">{gradeColumn?.name || 'Chưa gán'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium flex items-center gap-2"><FileText size={14} /> Định dạng</span>
                  <span className="flex flex-wrap gap-1 justify-end">{assignment.allowedFileTypes.length ? assignment.allowedFileTypes.map(t => <Badge key={t} tone="brand">{eduFileTypeLabel(t)}</Badge>) : <Badge>Tất cả</Badge>}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card padding="item" className="bg-brand-light border-brand/10">
            <p className="text-[13px] font-semibold text-slate-700 mb-3">Bạn muốn chấm điểm cho bài tập này?</p>
            <Button full disabled={!gradeColumn} icon={<Users size={16} />} onClick={() => {
              if (gradeColumn) {
                window.dispatchEvent(new CustomEvent('edu_start_grading', { detail: { assignmentId: assignment.id, gradeColumnId: gradeColumn.id } }));
              }
            }}>Bắt đầu chấm điểm</Button>
            {!gradeColumn && <p className="text-xs text-slate-500 mt-2">Bài tập chưa gán cột điểm nên chưa chấm được.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
