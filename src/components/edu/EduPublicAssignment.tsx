
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
  LogOut
} from 'lucide-react';
import { EduAssignment, EduClass, EduSchool, EduSubmission, EduUser, EduGrade } from '../../types/edu';
import { getAssignmentByLinkId, getSubmissionByMssv, saveSubmission, getGradesForUser } from '../../lib/edu';
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
      const subData = await getSubmissionByMssv(newAssignmentId, identifiedUser.mssv);
      setSubmission(subData);
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
      const [subData, gradesData] = await Promise.all([
        getSubmissionByMssv(assignment.id, user.mssv),
        getGradesForUser(assignment.classId, user.id)
      ]);
      
      // Reset current state first to prevent flickering/leakage
      setSubmission(null);
      setFiles([]);
      setTextContent('');
      setGrades([]);

      setSubmission(subData);
      setGrades(gradesData);
      
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

  const Alert = ({ type, message, title, onClose }: { type: 'success' | 'info' | 'warning' | 'danger', message: string, title?: string, onClose: () => void }) => {
    const styles = {
      success: 'bg-[#4dbd74]',
      info: 'bg-[#63c2de]',
      warning: 'bg-[#ffc107]',
      danger: 'bg-[#f86c6b]'
    };

    return (
      <div className={`${styles[type]} text-white p-4 mb-6 rounded-sm flex items-center justify-between animate-fadeIn shadow-sm border-l-4 border-black/10`}>
        <div className="flex-1">
          {title && <span className="font-bold mr-2">{title}</span>}
          <span className="text-[14px] font-medium">{message}</span>
        </div>
        <button onClick={onClose} className="ml-4 text-white/60 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Đang tải bài tập...</div>;
  if (!assignment) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Không tìm thấy bài tập</div>;

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

  if (currentGrade && currentGrade.score !== undefined && currentGrade.score !== null) {
    canEdit = false;
    lockReason = 'Bài tập đã được chấm điểm';
  } else if (isOverdue && !assignment.allowLate) {
    canEdit = false;
    lockReason = 'Đã quá hạn nộp bài';
  } else if (submission) {
    const firstSub = new Date(submission.firstSubmittedAt);
    const windowEnd = new Date(firstSub.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now > windowEnd) {
      canEdit = false;
      lockReason = 'Đã hết thời gian 24h chỉnh sửa sau khi nộp lần đầu';
    }
  }

  return (
    <div className={`min-h-screen ${!identifiedUser ? 'bg-[#3c4b64]' : 'bg-[#f0f3f5]'} pb-20 relative font-sans transition-colors duration-500`}>
      {/* Stripe Progress Bar */}
      {(uploading || submitting) && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-300 relative"
            style={{ 
              width: `${uploadProgress}%`,
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)',
              backgroundSize: '1rem 1rem',
              animation: 'stripes 1s linear infinite'
            }}
          />
        </div>
      )}

      {!identifiedUser ? (
        /* Identification Screen - Inspired by Image 2 (Create New Account Modal) */
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-[440px] rounded-sm shadow-2xl overflow-hidden animate-fadeIn relative">
            <button className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-10 sm:p-14 space-y-8">
              <div className="space-y-2">
                <h2 className="text-[28px] font-bold text-[#3c4b64] tracking-tight">Xác thực sinh viên</h2>
                <p className="text-[15px] text-slate-500 leading-relaxed">Nhập Mã số sinh viên của bạn để tiếp tục truy cập vào hệ thống học tập.</p>
              </div>
              
              {notification && (
                <Alert 
                  type={notification.type} 
                  message={notification.message} 
                  title={notification.title} 
                  onClose={() => setNotification(null)} 
                />
              )}

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Mã số sinh viên"
                      value={mssv}
                      onChange={e => setMssv(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleVerifyMssv()}
                      className="w-full bg-white border border-slate-200 focus:border-brand focus:ring-0 focus:outline-none rounded-sm px-4 py-3 text-[15px] text-slate-700 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleVerifyMssv}
                  disabled={isVerifying || !mssv.trim()}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white py-3.5 rounded-sm text-[15px] font-medium transition-all flex items-center justify-center gap-3 active:scale-[0.98] uppercase tracking-wide shadow-sm"
                >
                  {isVerifying ? 'ĐANG XỬ LÝ...' : 'Tiếp tục'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn min-h-screen px-4 py-8 sm:py-12">
          <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* Lời chào ngắn */}
            <div className="px-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Chào mừng, {identifiedUser.fullName}</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Mã sinh viên {identifiedUser.mssv}
                {deadlineDate && ` • Hạn nộp ${deadlineDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
              </p>
            </div>

            {/* Kết quả học tập */}
            {grades.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {grades.map((item, idx) => (
                  <div key={idx} className={`p-6 rounded-2xl shadow-sm transition-all border ${idx === 0 ? 'bg-brand text-white border-transparent' : 'bg-white border-slate-200'}`}>
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${idx === 0 ? 'text-white/70' : 'text-slate-400'}`}>{item.column.name}</p>
                    <div className="flex items-end gap-2 mt-3">
                      <p className="text-4xl font-bold leading-none">{item.grade?.score !== undefined ? item.grade.score : '-'}</p>
                      <p className={`text-[13px] font-bold mb-1 ${idx === 0 ? 'text-white/50' : 'text-slate-300'}`}>/ 10</p>
                    </div>
                    {item.grade?.note && (
                      <div className={`pt-3 mt-3 border-t ${idx === 0 ? 'border-white/15' : 'border-slate-100'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${idx === 0 ? 'text-white/60' : 'text-slate-400'}`}>Nhận xét của giảng viên</p>
                        <p className={`text-[12.5px] italic leading-relaxed mt-1 ${idx === 0 ? 'text-white/90' : 'text-slate-600'}`}>“{item.grade.note}”</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {notification && (
              <Alert
                type={notification.type}
                message={notification.message}
                title={notification.title}
                onClose={() => setNotification(null)}
              />
            )}

            {/* Thẻ nộp bài chính */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Đầu thẻ */}
              <div className="flex items-center justify-between gap-4 px-6 sm:px-8 py-6 border-b border-slate-100">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center shadow-sm shrink-0">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Nộp bài làm</h2>
                    <p className="text-[13px] text-slate-500 truncate">Vui lòng nộp bài đúng định dạng và thời hạn quy định</p>
                  </div>
                </div>
                <select
                  value={assignment.id}
                  onChange={(e) => handleSelectAssignment(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-[13px] font-medium text-slate-700 focus:outline-none focus:border-brand transition-all min-w-[160px] shrink-0"
                >
                  {classAssignments.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>

              <div className="px-6 sm:px-8 py-8 space-y-8">
                {/* Yêu cầu và hướng dẫn */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">Yêu cầu & Hướng dẫn</h4>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {(assignment.allowedFileTypes || []).map(type => (
                        <span key={type} className="px-3 py-1 bg-brand-light text-brand rounded-md text-[10px] font-bold uppercase tracking-wider">{type}</span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="prose prose-slate max-w-none text-slate-600 text-[15px] leading-relaxed p-5 bg-slate-50 border border-slate-100 rounded-xl"
                    dangerouslySetInnerHTML={{ __html: assignment.content || 'Không có hướng dẫn cụ thể.' }}
                  />
                </div>

                {/* Khung nhập văn bản trực tiếp cho bài dạng text */}
                {isTextMode && (
                  <div className="space-y-3">
                    <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">Nội dung bài làm</h4>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      disabled={!canEdit}
                      rows={10}
                      placeholder="Nhập trực tiếp nội dung bài làm của bạn tại đây..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand-light focus:outline-none rounded-xl p-4 text-[14px] text-slate-700 leading-relaxed transition-all resize-y disabled:opacity-60"
                    />
                  </div>
                )}

                {/* Tệp tin bài nộp */}
                {hasFileMode && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">Tệp tin bài nộp</h4>
                    {canEdit && (
                      <button
                        onClick={() => document.getElementById('file-upload-input')?.click()}
                        disabled={uploading}
                        className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-[12px] font-bold transition-all uppercase tracking-wide flex items-center gap-2 shrink-0"
                      >
                        <Plus className="w-4 h-4" /> {uploading ? 'Đang tải...' : 'Tải tệp mới'}
                      </button>
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
                      className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all ${isDragging ? 'border-brand bg-brand-light' : 'border-slate-200 bg-slate-50/70 hover:border-brand'}`}
                    >
                      <Upload className={`w-9 h-9 mx-auto mb-3 transition-colors ${isDragging ? 'text-brand' : 'text-slate-300'}`} />
                      <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wide">Kéo thả tệp vào đây</p>
                      <p className="text-[12px] text-slate-400 mt-1">Hoặc nhấn “Tải tệp mới” để chọn tệp</p>
                    </div>
                  )}

                  <p className="text-center text-[12px] text-slate-400">Hỗ trợ PDF, DOC, DOCX, PPT, PPTX, ZIP, RAR{allowedTypes.includes('3d') ? ', FBX, OBJ, GLB' : ''} (Tối đa 50MB mỗi tệp)</p>

                  {/* Danh sách tệp đã nộp */}
                  {files.length > 0 && (
                    <div className="space-y-3">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl group hover:border-brand transition-all shadow-sm">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 bg-brand-light text-brand rounded-lg flex items-center justify-center shrink-0">
                              {file.type.includes('pdf') ? <FileText className="w-5 h-5" /> :
                               file.type.includes('image') ? <ImageIcon className="w-5 h-5" /> :
                               <FileText className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[14px] font-bold text-slate-700 truncate">{file.name}</p>
                              <p className="text-[11px] text-slate-400 font-medium">Đã tải lên vào {new Date(file.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="p-2 text-slate-300 hover:text-rose-500 transition-all shrink-0"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Thông báo khóa khi hết hạn hoặc đã chấm điểm */}
                {!canEdit && (
                  <div className="bg-rose-50 border border-rose-100 p-5 rounded-xl flex items-center gap-4 text-rose-600">
                    <Lock className="w-5 h-5 shrink-0" />
                    <p className="text-[13px] font-bold uppercase tracking-wide">{lockReason}</p>
                  </div>
                )}

                {/* Hai nút hành động */}
                <div className="pt-6 border-t border-slate-100 space-y-3">
                  {canEdit && submission && (
                    <p className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] font-medium text-amber-700">Bạn có thể tải thêm file để nộp bổ sung. File mới được thêm cùng với file đã nộp trước đó, không thay thế.</p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {canEdit && (
                      <button
                        onClick={handleSubmit}
                        disabled={submitting || (files.length === 0 && !textContent.trim())}
                        className="flex-1 bg-gradient-to-r from-brand to-brand-hover hover:opacity-95 disabled:opacity-50 text-white py-4 rounded-xl text-[14px] font-bold shadow-lg transition-all active:scale-[0.99] uppercase tracking-wide flex items-center justify-center gap-2.5"
                      >
                        <Upload className="w-5 h-5" />
                        {submitting ? 'Đang xử lý...' : (submission ? 'Nộp bổ sung' : 'Xác nhận nộp bài')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIdentifiedUser(null);
                        setSubmission(null);
                        setMssv('');
                        setNotification(null);
                        setFiles([]);
                        setGrades([]);
                      }}
                      className={`${canEdit ? 'sm:flex-1' : 'w-full'} bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl text-[14px] font-bold transition-all uppercase tracking-wide flex items-center justify-center gap-2.5`}
                    >
                      <LogOut className="w-5 h-5" />
                      Đăng xuất tài khoản
                    </button>
                  </div>
                  {canEdit && (
                    <p className="text-[11px] text-center text-brand font-semibold">Bạn có thể chỉnh sửa trước thời hạn chót</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
