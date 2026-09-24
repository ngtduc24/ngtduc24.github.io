
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  Upload, 
  CheckCircle2, 
  Lock, 
  User,
  ImageIcon,
  Trash2,
  X,
  Plus,
  Download,
  LogOut,
  ArrowRight
} from 'lucide-react';
import { Button, IconButton, Input, Select, Textarea, Field, Card, Badge, Spinner, EmptyState, Z } from '../ui';
import { EduAssignment, EduClass, EduSchool, EduSubmission, EduUser, EduGrade, EduExtensionRequest } from '../../types/edu';
import { getAssignmentByLinkId, getSubmissionByMssv, saveSubmission, getGradesForUser, requestExtension, getExtensionForUser } from '../../lib/edu';
import { CalendarClock } from 'lucide-react';
import { uploadImageToCloudinary, uploadMediaToCloudinary } from '../../lib/upload';
import { useNotifications } from '../NotificationContext';

interface EduPublicAssignmentProps {
  shareLinkId: string;
}

export default function EduPublicAssignment({ shareLinkId }: EduPublicAssignmentProps) {
  const { addNotification } = useNotifications();
  const [assignment, setAssignment] = useState<(EduAssignment & { edu_classes: EduClass & { edu_schools: EduSchool } }) | null>(null);
  const [classAssignments, setClassAssignments] = useState<EduAssignment[]>([]);
  const [mssv, setMssv] = useState('');
  const [identifiedUser, setIdentifiedUser] = useState<EduUser | null>(null);
  const [submission, setSubmission] = useState<EduSubmission | null>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [extension, setExtension] = useState<EduExtensionRequest | null>(null);
  const [requesting, setRequesting] = useState(false);
  // Đồng hồ đếm ngược thời gian còn lại tới hạn nộp, cập nhật mỗi 30 giây.
  const [nowTs, setNowTs] = useState(Date.now());
  // Cập nhật mỗi giây để đếm ngược chính xác khi hạn nộp hoặc gia hạn chỉ còn vài phút.
  useEffect(() => { const t = setInterval(() => setNowTs(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Submission Form State
  const [files, setFiles] = useState<any[]>([]);
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'warning' | 'danger', message: string, title?: string } | null>(null);

  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    async function loadAssignment() {
      try {
        const data = await getAssignmentByLinkId(shareLinkId);
        setAssignment(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAssignment();
  }, [shareLinkId]);

  // Đặt tiêu đề tab trình duyệt theo tên sinh viên sau khi xác thực.
  useEffect(() => {
    if (identifiedUser?.fullName) {
      document.title = `${identifiedUser.fullName} - Nộp bài làm`;
    } else {
      document.title = 'Nộp bài làm | Xác thực sinh viên';
    }
  }, [identifiedUser]);

  const handleSelectAssignment = async (newAssignmentId: string) => {
    if (!identifiedUser || !assignment) return;
    
    // Find assignment in classAssignments
    const nextAssignment = classAssignments.find(a => a.id === newAssignmentId);
    if (!nextAssignment) return;

    // We need to keep the edu_classes and edu_schools info
    setAssignment({
      ...nextAssignment,
      edu_classes: assignment.edu_classes
    } as any);

    setSubmission(null);
    setFiles([]);
    setTextContent('');

    try {
      const [subData, ext] = await Promise.all([
        getSubmissionByMssv(newAssignmentId, identifiedUser.mssv),
        getExtensionForUser(newAssignmentId, identifiedUser.id).catch(() => null),
      ]);
      setSubmission(subData);
      setExtension(ext);
      if (subData) {
        setFiles(subData.files || []);
        setTextContent(subData.content || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyMssv = async () => {
    if (!mssv.trim() || !assignment) return;
    setIsVerifying(true);
    setNotification(null);
    try {
      // Find user in class
      const { getClassUsers, getAssignments } = await import('../../lib/edu');
      const [classUsers, allAssignments] = await Promise.all([
        getClassUsers(assignment.classId),
        getAssignments(assignment.classId)
      ]);
      
      const user = classUsers.find(u => u.mssv === mssv.trim());
      
      if (!user) {
        setNotification({
          type: 'danger',
          title: 'Oh snap!',
          message: 'Mã số sinh viên không tồn tại trong lớp học này. Vui lòng kiểm tra lại.'
        });
        setIsVerifying(false);
        return;
      }

      setIdentifiedUser(user);
      setClassAssignments(allAssignments);
      
      // Load submission and grades for THIS specific user
      const [subData, gradesData, ext] = await Promise.all([
        getSubmissionByMssv(assignment.id, user.mssv),
        getGradesForUser(assignment.classId, user.id),
        getExtensionForUser(assignment.id, user.id).catch(() => null)
      ]);

      // Reset current state first to prevent flickering/leakage
      setSubmission(null);
      setFiles([]);
      setTextContent('');
      setGrades([]);

      setSubmission(subData);
      setGrades(gradesData);
      setExtension(ext);
      
      if (subData) {
        setFiles(subData.files || []);
        setTextContent(subData.content || '');
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'danger',
        title: 'Error!',
        message: 'Đã có lỗi xảy ra trong quá trình xác thực.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const isFileAllowed = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = assignment?.allowedFileTypes || [];
    if (allowed.length === 0) return true;
    return allowed.some(t => {
      if (t === 'pdf') return ext === 'pdf';
      if (t === 'doc') return ['doc', 'docx'].includes(ext || '');
      if (t === 'image') return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');
      if (t === 'video') return ['mp4', 'mov', 'avi'].includes(ext || '');
      if (t === '3d') return ['fbx', 'obj', 'glb', 'gltf'].includes(ext || '');
      if (t === 'text') return false; // dạng văn bản nhập trực tiếp, không nhận tệp
      return true;
    });
  };

  const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Không đọc được tệp.'));
    reader.readAsDataURL(file);
  });

  // Tải một tệp lên thư viện hệ thống. Ảnh và PDF đi đường ảnh, còn các tệp nhị phân
  // như mô hình 3D (fbx, obj, glb), Word, zip thì tải dạng raw để giữ nguyên tệp gốc.
  const uploadSingleFile = async (file: File) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isImageLike = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);
    const isPdf = ext === 'pdf';
    try {
      setUploadProgress(30);
      let url: string;
      if (isImageLike || isPdf) {
        const dataUrl = await readAsDataUrl(file);
        url = await uploadImageToCloudinary(dataUrl);
      } else {
        url = await uploadMediaToCloudinary(file, { resourceType: 'raw', folder: 'edu_submissions' });
      }
      setUploadProgress(100);
      setFiles(prev => [...prev, {
        url,
        name: file.name,
        type: file.type || ext,
        submittedAt: new Date().toISOString()
      }]);
      setNotification({
        type: 'success',
        title: 'Well done!',
        message: `Tệp "${file.name}" đã được tải lên thành công.`
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'danger',
        title: 'Oh snap!',
        message: 'Lỗi tải tệp tin lên. Vui lòng thử lại.'
      });
    }
  };

  const uploadFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList || !assignment) return;
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setNotification(null);
    for (const file of arr) {
      if (!isFileAllowed(file)) {
        addNotification("Định dạng file không được phép!", "error");
        continue;
      }
      setUploading(true);
      setUploadProgress(10);
      await uploadSingleFile(file);
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!identifiedUser || !assignment) return;
    setSubmitting(true);
    setUploadProgress(20);
    setNotification(null);
    try {
      const now = new Date().toISOString();
      setUploadProgress(50);
      await saveSubmission({
        id: submission?.id,
        assignmentId: assignment.id,
        userId: identifiedUser.id,
        mssv: identifiedUser.mssv,
        files: files,
        content: textContent,
        submittedAt: now,
        updatedAt: now,
        firstSubmittedAt: submission?.firstSubmittedAt || now
      });
      
      setUploadProgress(80);
      const newSub = await getSubmissionByMssv(assignment.id, identifiedUser.mssv);
      setSubmission(newSub);
      setUploadProgress(100);
      setNotification({
        type: 'success',
        title: 'Well done!',
        message: 'Bài làm của bạn đã được gửi thành công lên hệ thống.'
      });
      setTimeout(() => {
        setSubmitting(false);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'danger',
        title: 'Oh snap!',
        message: 'Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.'
      });
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleRequestExtension = async () => {
    if (!identifiedUser || !assignment) return;
    setRequesting(true);
    setNotification(null);
    try {
      const ext = await requestExtension({ assignmentId: assignment.id, classId: assignment.classId, userId: identifiedUser.id, mssv: identifiedUser.mssv, studentName: identifiedUser.fullName });
      setExtension(ext);
      setNotification({ type: 'success', title: 'Đã gửi', message: 'Đã gửi yêu cầu gia hạn. Vui lòng chờ giảng viên duyệt rồi quay lại nộp bài.' });
    } catch (e: any) {
      setNotification({ type: 'danger', title: 'Lỗi', message: 'Không gửi được yêu cầu gia hạn. ' + (e?.message || '') });
    } finally {
      setRequesting(false);
    }
  };

  const Alert = ({ type, message, title, onClose }: { type: 'success' | 'info' | 'warning' | 'danger', message: string, title?: string, onClose: () => void }) => {
    const styles = {
      success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      info: 'bg-blue-50 border-blue-100 text-blue-700',
      warning: 'bg-amber-50 border-amber-100 text-amber-700',
      danger: 'bg-rose-50 border-rose-100 text-rose-600',
    };
    return (
      <div className={`${styles[type]} border p-4 rounded-xl flex items-start justify-between gap-3 animate-fadeIn`} role="alert">
        <div className="flex-1 text-[13px] leading-relaxed">
          {title && <span className="font-bold mr-1.5">{title}</span>}
          <span className="font-medium">{message}</span>
        </div>
        <IconButton label="Đóng thông báo" size="sm" variant="ghost" onClick={onClose} className="-mr-1 -mt-1 text-current hover:bg-black/5"><X size={16} /></IconButton>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Spinner label="Đang tải bài tập..." /></div>;
  if (!assignment) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><EmptyState icon={<FileText size={24} />} title="Không tìm thấy bài tập" description="Đường dẫn có thể đã bị thay đổi hoặc bài tập đã bị xoá." /></div>;

  const deadlineDate = assignment.deadline ? new Date(assignment.deadline) : null;
  const isOverdue = deadlineDate ? new Date() > deadlineDate : false;
  
  // Edit window logic: min(first_submission + 24h, deadline)
  let canEdit = true;
  let lockReason = '';

  // Xác định hình thức nộp bài. Dạng text thì hiện khung nhập trực tiếp, còn lại
  // (pdf, ảnh, word, 3d, video...) thì hiện phần tải tệp.
  const allowedTypes = assignment.allowedFileTypes || [];
  const isTextMode = allowedTypes.includes('text');
  const hasFileMode = allowedTypes.some(t => t !== 'text');

  const currentGrade = grades.find(g => g.column.id === assignment.gradeColumnId)?.grade;

  // Sinh viên được gia hạn còn hiệu lực thì mở khóa nộp bài bất kể quá hạn, trừ khi đã chấm điểm.
  const graded = !!(currentGrade && currentGrade.score !== undefined && currentGrade.score !== null);
  const extApproved = extension?.status === 'approved' && extension.extendUntil && new Date(extension.extendUntil).getTime() > Date.now();

  // Đối chiếu thời điểm nộp lần đầu với hạn nộp để biết sinh viên nộp đúng hạn hay nộp trễ.
  const firstSubTime = submission ? new Date(submission.firstSubmittedAt).getTime() : 0;
  const submittedOnTime = !!submission && (!deadlineDate || firstSubTime <= deadlineDate.getTime());
  const submittedLate = !!submission && !!deadlineDate && firstSubTime > deadlineDate.getTime();
  const fmtTime = (t: number) => new Date(t).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (graded) {
    canEdit = false;
    lockReason = 'Bài tập đã được chấm điểm';
  } else if (extApproved) {
    canEdit = true;
  } else if (isOverdue && !assignment.allowLate) {
    canEdit = false;
    lockReason = submission ? 'Đã quá hạn, không thể nộp thêm' : 'Hết thời gian nộp bài';
  } else if (submission) {
    const firstSub = new Date(submission.firstSubmittedAt).getTime();
    const lastSub = new Date(submission.submittedAt).getTime();
    // Giáo viên bấm Cho nộp lại sẽ đặt firstSubmittedAt mới hơn lần nộp cuối.
    const reopened = firstSub > lastSub + 1000;
    const windowEnd = firstSub + 24 * 60 * 60 * 1000;
    const allowSupplement = assignment.allowSupplement !== false;
    if (!allowSupplement && !reopened) {
      canEdit = false;
      lockReason = 'Đã nộp bài, giáo viên không cho nộp bổ sung';
    } else if (Date.now() > windowEnd) {
      canEdit = false;
      lockReason = 'Đã hết thời gian 24h chỉnh sửa sau khi nộp lần đầu';
    }
  }

  // Khung thông báo trạng thái dùng chung trong thẻ nộp bài.
  const Notice = ({ tone, icon, children }: { tone: 'success' | 'warning' | 'danger' | 'neutral'; icon: React.ReactNode; children: React.ReactNode }) => {
    const cls = tone === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : tone === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' : tone === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-600';
    return <div className={`${cls} border p-4 rounded-xl flex items-center gap-3 text-[13px] font-semibold`}>{icon}<div className="min-w-0 flex-1">{children}</div></div>;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative font-sans">
      {/* Thanh tiến trình tải tệp */}
      {(uploading || submitting) && (
        <div className={`fixed top-0 left-0 right-0 ${Z.top} h-1 bg-slate-200 overflow-hidden`}>
          <div className="h-full bg-brand transition-all duration-300 relative" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {!identifiedUser ? (
        /* Màn hình xác thực sinh viên */
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card padding="none" className="w-full max-w-[440px] shadow-xl animate-fadeIn">
            <div className="p-8 sm:p-10 space-y-6">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-brand-light text-brand flex items-center justify-center"><User size={22} /></div>
                <h1 className="text-xl font-bold text-slate-800">Xác thực sinh viên</h1>
                <p className="text-[13px] text-slate-500 leading-relaxed">Bài tập <span className="font-semibold text-slate-700">{assignment.title}</span>{assignment.edu_classes?.name ? <> của lớp <span className="font-semibold text-slate-700">{assignment.edu_classes.name}</span></> : null}. Nhập mã số sinh viên để tiếp tục.</p>
              </div>

              {notification && (
                <Alert type={notification.type} message={notification.message} title={notification.title} onClose={() => setNotification(null)} />
              )}

              <div className="space-y-4">
                <Field label="Mã số sinh viên">
                  <Input
                    type="text"
                    placeholder="Ví dụ: 010100141601"
                    value={mssv}
                    autoFocus
                    onChange={e => setMssv(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyMssv()}
                  />
                </Field>
                <Button full onClick={handleVerifyMssv} loading={isVerifying} disabled={!mssv.trim()} iconRight={<ArrowRight size={16} />}>
                  Tiếp tục
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="animate-fadeIn min-h-screen px-4 py-8 sm:py-12">
          <div className="w-full max-w-3xl mx-auto space-y-5">
            {/* Lời chào ngắn */}
            <div className="px-1 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Chào mừng, {identifiedUser.fullName}</h1>
                <p className="text-[13px] text-slate-500 mt-0.5">Mã sinh viên {identifiedUser.mssv}{assignment.edu_classes?.name ? ` · Lớp ${assignment.edu_classes.name}` : ''}</p>
              </div>
              <Button variant="outline" size="sm" icon={<LogOut size={16} />} onClick={() => { setIdentifiedUser(null); setSubmission(null); setMssv(''); setNotification(null); setFiles([]); setGrades([]); }}>Đăng xuất</Button>
            </div>

            {/* Thời gian hết hạn nộp bài, có đếm ngược thời gian còn lại */}
            {deadlineDate && (() => {
              const extActive = !!(extApproved && extension?.extendUntil);
              const effMs = extActive ? new Date(extension!.extendUntil as string).getTime() : deadlineDate.getTime();
              const diff = effMs - nowTs;
              const over = diff <= 0;
              const days = Math.floor(diff / 86400000);
              const hours = Math.floor((diff % 86400000) / 3600000);
              const mins = Math.floor((diff % 3600000) / 60000);
              const secs = Math.max(0, Math.floor((diff % 60000) / 1000));
              const remain = days > 0 ? `${days} ngày ${hours} giờ` : hours > 0 ? `${hours} giờ ${mins} phút` : mins > 0 ? `${mins} phút ${secs} giây` : `${secs} giây`;
              const urgent = !over && diff < 24 * 3600 * 1000;
              const tone = over ? 'bg-rose-50 border-rose-100 text-rose-600' : urgent ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-brand-light border-brand/10 text-brand';
              const effDate = new Date(effMs).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              return (
                <div className={`flex items-center gap-3 rounded-2xl border p-4 ${tone}`}>
                  <Clock className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{over ? 'Đã hết thời gian nộp bài' : `Còn ${remain} là hết hạn nộp bài`}</p>
                    <p className="text-xs font-medium opacity-90">{extActive ? 'Hạn được gia hạn tới' : 'Hạn nộp'} {effDate}</p>
                  </div>
                </div>
              );
            })()}

            {/* Kết quả học tập */}
            {grades.length > 0 && (() => {
              // Điểm trung bình môn tính theo tỷ trọng, cùng công thức với bảng điểm của giảng viên:
              // chỉ gộp các cột đã có điểm và có tỷ trọng lớn hơn 0, chia cho tổng tỷ trọng của các cột đó.
              let sw = 0, sv = 0, counted = 0;
              for (const item of grades) {
                const w = item.column?.weight || 0;
                const score = item.grade?.score;
                if (w <= 0 || score === undefined || score === null) continue;
                sw += w; sv += Number(score) * w; counted += 1;
              }
              const avg = sw > 0 ? Math.round((sv / sw) * 100) / 100 : null;
              const hasWeights = grades.some(item => (item.column?.weight || 0) > 0);
              return (
                <div className="space-y-4">
                  <Card padding="item" className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">Điểm trung bình môn</p>
                      <p className="text-[13px] text-slate-500 mt-1">
                        {avg != null
                          ? `Tính theo tỷ trọng của ${counted} cột điểm đã chấm (tổng tỷ trọng ${sw}%)`
                          : hasWeights ? 'Chưa có cột điểm nào đủ điều kiện để tính' : 'Giảng viên chưa đặt tỷ trọng cho các cột điểm'}
                      </p>
                    </div>
                    <div className="flex items-end gap-1.5 shrink-0">
                      <p className={`text-4xl font-bold leading-none ${avg != null ? 'text-brand' : 'text-slate-300'}`}>{avg != null ? avg : '-'}</p>
                      <p className="text-[13px] font-semibold text-slate-400 mb-0.5">/ 10</p>
                    </div>
                  </Card>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {grades.map((item, idx) => (
                      <Card key={idx} padding="item" className={idx === 0 ? 'bg-brand text-white border-transparent' : ''}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-xs font-semibold ${idx === 0 ? 'text-white/80' : 'text-slate-500'}`}>{item.column.name}</p>
                          {(item.column?.weight || 0) > 0 && <Badge tone={idx === 0 ? 'neutral' : 'brand'} className={idx === 0 ? 'bg-white/15 text-white' : ''}>Tỷ trọng {item.column.weight}%</Badge>}
                        </div>
                        <div className="flex items-end gap-2 mt-3">
                          <p className="text-4xl font-bold leading-none">{item.grade?.score !== undefined ? item.grade.score : '-'}</p>
                          <p className={`text-[13px] font-semibold mb-1 ${idx === 0 ? 'text-white/60' : 'text-slate-400'}`}>/ 10</p>
                        </div>
                        {item.grade?.note && (
                          <div className={`pt-3 mt-3 border-t ${idx === 0 ? 'border-white/15' : 'border-slate-100'}`}>
                            <p className={`text-xs font-semibold ${idx === 0 ? 'text-white/70' : 'text-slate-500'}`}>Nhận xét của giảng viên</p>
                            <p className={`text-[13px] italic leading-relaxed mt-1 ${idx === 0 ? 'text-white/90' : 'text-slate-600'}`}>“{item.grade.note}”</p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}

            {notification && (
              <Alert type={notification.type} message={notification.message} title={notification.title} onClose={() => setNotification(null)} />
            )}

            {/* Thẻ nộp bài chính */}
            <Card padding="none" className="overflow-hidden">
              {/* Đầu thẻ */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-brand-light text-brand flex items-center justify-center shrink-0">
                    <Upload size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-800">Nộp bài làm</h2>
                    <p className="text-[13px] text-slate-500 truncate">Nộp đúng định dạng và thời hạn quy định</p>
                  </div>
                </div>
                {classAssignments.length > 1 && (
                  <Select value={assignment.id} onChange={(e) => handleSelectAssignment(e.target.value)} className="sm:w-64 shrink-0" aria-label="Chọn bài tập">
                    {classAssignments.map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="px-6 py-6 space-y-7">
                {/* Yêu cầu và hướng dẫn */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-800">{assignment.title}</h3>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {(assignment.allowedFileTypes || []).map(type => (
                        <Badge key={type} tone="brand" className="uppercase">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  <div
                    className="prose prose-slate prose-sm max-w-none text-slate-600 text-sm leading-relaxed p-5 bg-slate-50 border border-slate-100 rounded-xl"
                    dangerouslySetInnerHTML={{ __html: assignment.content || 'Không có hướng dẫn cụ thể.' }}
                  />
                </div>

                {/* Khung nhập văn bản trực tiếp cho bài dạng text */}
                {isTextMode && (
                  <Field label="Nội dung bài làm">
                    <Textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      disabled={!canEdit}
                      rows={10}
                      placeholder="Nhập trực tiếp nội dung bài làm của bạn tại đây..."
                    />
                  </Field>
                )}

                {/* Tệp tin bài nộp */}
                {hasFileMode && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-800">Tệp tin bài nộp</h3>
                    {canEdit && (
                      <Button size="sm" icon={<Plus size={16} />} loading={uploading} onClick={() => document.getElementById('file-upload-input')?.click()}>
                        {uploading ? 'Đang tải...' : 'Tải tệp mới'}
                      </Button>
                    )}
                  </div>

                  <input id="file-upload-input" type="file" className="hidden" multiple onChange={handleFileInput} />

                  {/* Vùng kéo thả */}
                  {canEdit && (
                    <div
                      onClick={() => document.getElementById('file-upload-input')?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all ${isDragging ? 'border-brand bg-brand-light' : 'border-slate-200 bg-slate-50/70 hover:border-brand'}`}
                    >
                      <Upload className={`w-8 h-8 mx-auto mb-3 transition-colors ${isDragging ? 'text-brand' : 'text-slate-400'}`} />
                      <p className="text-sm font-semibold text-slate-600">Kéo thả tệp vào đây</p>
                      <p className="text-xs text-slate-500 mt-1">Hoặc bấm “Tải tệp mới” để chọn tệp. Hỗ trợ PDF, DOC, DOCX, PPT, PPTX, ZIP, RAR{allowedTypes.includes('3d') ? ', FBX, OBJ, GLB' : ''}, tối đa 50MB mỗi tệp.</p>
                    </div>
                  )}

                  {/* Danh sách tệp đã nộp */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-brand-light text-brand rounded-xl flex items-center justify-center shrink-0">
                              {file.type.includes('image') ? <ImageIcon size={18} /> : <FileText size={18} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                              <p className="text-xs text-slate-500">Đã tải lên lúc {new Date(file.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {file.url && <IconButton label="Tải tệp về" variant="ghost" onClick={() => window.open(file.url, '_blank')}><Download size={16} /></IconButton>}
                            {canEdit && <IconButton label="Gỡ tệp này" variant="danger" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}><Trash2 size={16} /></IconButton>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {submittedOnTime && <Notice tone="success" icon={<CheckCircle2 className="w-5 h-5 shrink-0" />}>Đã nộp bài đúng hạn lúc {fmtTime(firstSubTime)}.</Notice>}
                {submittedLate && <Notice tone="warning" icon={<Clock className="w-5 h-5 shrink-0" />}>Đã nộp bài (nộp trễ) lúc {fmtTime(firstSubTime)}.</Notice>}
                {extApproved && <Notice tone="success" icon={<CalendarClock className="w-5 h-5 shrink-0" />}>Bạn được gia hạn nộp bài tới {new Date(extension!.extendUntil as string).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.</Notice>}

                {/* Thông báo khóa khi hết hạn hoặc đã chấm điểm, kèm nút xin gia hạn */}
                {!canEdit && (
                  <div className="space-y-3">
                    <Notice tone="danger" icon={<Lock className="w-5 h-5 shrink-0" />}>{lockReason}</Notice>
                    {!graded && (
                      extension?.status === 'pending' ? (
                        <Notice tone="warning" icon={<CalendarClock className="w-5 h-5 shrink-0" />}>Đã gửi yêu cầu gia hạn, đang chờ giảng viên duyệt.</Notice>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="flex-1 text-[13px] text-slate-600">{extension?.status === 'rejected' ? 'Yêu cầu gia hạn trước đã bị từ chối. Bạn có thể gửi lại yêu cầu.' : 'Nếu cần thêm thời gian, bạn có thể gửi yêu cầu gia hạn cho giảng viên.'}</p>
                          <Button size="sm" icon={<CalendarClock size={16} />} loading={requesting} onClick={handleRequestExtension}>Xin gia hạn</Button>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Nút hành động */}
                {canEdit && (
                  <div className="pt-5 border-t border-slate-100 space-y-3">
                    {submission && (
                      <p className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-medium text-amber-700">Bạn có thể tải thêm tệp để nộp bổ sung. Tệp mới được thêm cùng với tệp đã nộp trước đó, không thay thế.</p>
                    )}
                    <Button full icon={<Upload size={18} />} loading={submitting} disabled={files.length === 0 && !textContent.trim()} onClick={handleSubmit} className="h-11 text-[15px]">
                      {submission ? 'Nộp bổ sung' : 'Xác nhận nộp bài'}
                    </Button>
                    <p className="text-xs text-center text-slate-500">Bạn có thể chỉnh sửa bài nộp trước thời hạn chót.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
