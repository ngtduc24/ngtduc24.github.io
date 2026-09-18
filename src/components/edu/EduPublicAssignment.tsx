
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
  Download
} from 'lucide-react';
import { EduAssignment, EduClass, EduSchool, EduSubmission, EduUser, EduGrade } from '../../types/edu';
import { getAssignmentByLinkId, getSubmissionByMssv, saveSubmission, getGradesForUser } from '../../lib/edu';
import { uploadImageToCloudinary } from '../../lib/upload';
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !assignment) return;

    // Validate file type (basic extension check)
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAllowed = (assignment.allowedFileTypes || []).some(t => {
      if (t === 'pdf') return ext === 'pdf';
      if (t === 'doc') return ['doc', 'docx'].includes(ext || '');
      if (t === 'image') return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');
      if (t === 'video') return ['mp4', 'mov', 'avi'].includes(ext || '');
      return true;
    });

    if (!isAllowed) {
      addNotification("Định dạng file không được phép!", "error");
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setNotification(null);
    try {
      const reader = new FileReader();
      reader.onprogress = (data) => {
        if (data.lengthComputable) {
          const progress = Math.round((data.loaded / data.total) * 50) + 10;
          setUploadProgress(progress);
        }
      };

      reader.onload = async () => {
        setUploadProgress(70);
        const url = await uploadImageToCloudinary(reader.result as string);
        setUploadProgress(100);
        
        setTimeout(() => {
          setFiles(prev => [...prev, {
            url,
            name: file.name,
            type: file.type,
            submittedAt: new Date().toISOString()
          }]);
          setNotification({
            type: 'success',
            title: 'Well done!',
            message: `Tệp "${file.name}" đã được tải lên thành công.`
          });
          setUploading(false);
          setUploadProgress(0);
        }, 300);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'danger',
        title: 'Oh snap!',
        message: 'Lỗi tải tệp tin lên. Vui lòng thử lại.'
      });
      setUploading(false);
      setUploadProgress(0);
    }
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

  const currentGrade = grades.find(g => g.column.id === assignment.gradeColumnId)?.grade;

  if (currentGrade && currentGrade.score !== undefined && currentGrade.score !== null) {
    canEdit = false;
    lockReason = 'Bài tập đã được chấm điểm';
  } else if (isOverdue) {
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
            className="h-full bg-[#321fdb] transition-all duration-300 relative"
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
                      className="w-full bg-white border border-slate-200 focus:border-[#321fdb] focus:ring-0 focus:outline-none rounded-sm px-4 py-3 text-[15px] text-slate-700 placeholder:text-slate-400 transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleVerifyMssv}
                  disabled={isVerifying || !mssv.trim()}
                  className="w-full bg-[#321fdb] hover:bg-[#2a1ab9] disabled:opacity-50 text-white py-3.5 rounded-sm text-[15px] font-medium transition-all flex items-center justify-center gap-3 active:scale-[0.98] uppercase tracking-wide shadow-sm"
                >
                  {isVerifying ? 'ĐANG XỬ LÝ...' : 'Tiếp tục'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          {/* Header Section - Inspired by Image 1 (Dashboard Header) */}
          <div className="bg-white border-b border-slate-200">
            <div className="w-full px-6 py-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Chào mừng quay trở lại, {identifiedUser.fullName}!</h1>
                  <p className="text-slate-500 font-medium">Hệ thống quản lý bài tập và kết quả học tập Edu.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
                  <div className="flex items-center gap-12 border-r border-slate-200 pr-12 hidden md:flex">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mã sinh viên</p>
                      <p className="text-lg font-bold text-[#3c4b64]">{identifiedUser.mssv}</p>
                    </div>
                    {deadlineDate && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hạn nộp bài</p>
                        <p className="text-lg font-bold text-[#3c4b64]">
                          {deadlineDate.toLocaleDateString('vi-VN', { month: 'short', day: '2-digit', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-navigation - Simplified */}
              <div className="flex items-center gap-8 mt-12 border-b border-slate-100">
                <button className="px-1 py-4 text-[#321fdb] font-bold text-[14px] border-b-2 border-[#321fdb] transition-all">Tổng quan</button>
              </div>
            </div>
          </div>

          <div className="w-full px-6 py-12 space-y-12">
            {/* Grades Cards - Inspired by Image 4 plain/colored cards */}
            {grades.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#321fdb] rounded-full" />
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Kết quả học tập</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {grades.map((item, idx) => (
                    <div key={idx} className={`p-8 rounded-sm shadow-sm transition-all border ${idx === 0 ? 'bg-[#321fdb] text-white border-transparent' : idx === 1 ? 'bg-[#3c4b64] text-white border-transparent' : 'bg-white border-slate-200'}`}>
                      <div className="space-y-4">
                        <p className={`text-[11px] font-bold uppercase tracking-widest ${idx < 2 ? 'text-white/60' : 'text-slate-400'}`}>{item.column.name}</p>
                        <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold leading-none">
                            {item.grade?.score !== undefined ? item.grade.score : '-'}
                          </p>
                          <p className={`text-[13px] font-bold mb-1 ${idx < 2 ? 'text-white/40' : 'text-slate-300'}`}>/ 10</p>
                        </div>
                        {item.grade?.note && (
                          <p className={`text-[12px] italic leading-relaxed pt-3 border-t ${idx < 2 ? 'border-white/10 text-white/70' : 'border-slate-50 text-slate-500'}`}>“{item.grade.note}”</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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

            {/* Assignment Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Instructions & Details */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-sm border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 bg-[#f8f9fa] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#321fdb] text-white flex items-center justify-center rounded-sm shadow-sm">
                        <Upload className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Nộp bài làm</h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <select 
                        value={assignment.id}
                        onChange={(e) => handleSelectAssignment(e.target.value)}
                        className="bg-white border border-slate-200 rounded-sm px-4 py-2 text-[13px] font-medium text-slate-700 focus:outline-none focus:border-[#321fdb] transition-all min-w-[200px]"
                      >
                        {classAssignments.map(a => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-8 space-y-10">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide">Yêu cầu & Hướng dẫn</h4>
                        <div className="flex gap-2">
                          {(assignment.allowedFileTypes || []).map(type => (
                            <span key={type} className="px-3 py-1 bg-blue-50 text-[#321fdb] rounded-sm text-[10px] font-bold uppercase tracking-wider">{type}</span>
                          ))}
                        </div>
                      </div>
                      <div 
                        className="prose prose-slate max-w-none text-slate-600 text-[15px] leading-relaxed p-6 bg-slate-50 border border-slate-100 rounded-sm"
                        dangerouslySetInnerHTML={{ __html: assignment.content || 'Không có hướng dẫn cụ thể.' }}
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide">Tệp tin bài nộp</h4>
                        {canEdit && (
                          <button 
                            onClick={() => document.getElementById('file-upload-input')?.click()}
                            disabled={uploading}
                            className="bg-[#321fdb] hover:bg-[#2a1ab9] text-white px-5 py-2 rounded-sm text-[12px] font-bold transition-all uppercase tracking-wide flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> {uploading ? 'Đang tải...' : 'Tải tệp mới'}
                          </button>
                        )}
                      </div>
                      
                      <input id="file-upload-input" type="file" className="hidden" multiple onChange={handleFileUpload} />

                      <div className="space-y-3">
                        {files.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-sm group hover:border-[#321fdb] transition-all shadow-sm">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-10 h-10 bg-slate-50 text-[#321fdb] rounded-sm flex items-center justify-center border border-slate-100">
                                {file.type.includes('pdf') ? <FileText className="w-5 h-5" /> : 
                                 file.type.includes('image') ? <ImageIcon className="w-5 h-5" /> :
                                 <FileText className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[14px] font-bold text-slate-700 truncate">{file.name}</p>
                                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-tighter">Đã tải lên vào {new Date(file.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                            {canEdit && (
                              <button 
                                onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {files.length === 0 && (
                          <div className="py-16 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-sm space-y-3">
                            <Upload className="w-10 h-10 text-slate-300 mx-auto" />
                            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Chưa có tệp bài làm nào</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Submission Action */}
              <div className="space-y-8">
                <div className="space-y-4">
                  {canEdit ? (
                    <button 
                      onClick={handleSubmit}
                      disabled={submitting || (files.length === 0 && !textContent.trim())}
                      className="w-full bg-[#321fdb] hover:bg-[#2a1ab9] disabled:opacity-50 text-white py-5 rounded-sm text-[15px] font-bold shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest"
                    >
                      {submitting ? 'ĐANG XỬ LÝ...' : (submission ? 'CẬP NHẬT BÀI NỘP' : 'XÁC NHẬN NỘP BÀI')}
                    </button>
                  ) : (
                    <div className="bg-rose-50 border border-rose-100 p-6 rounded-sm flex items-center gap-4 text-rose-600">
                      <Lock className="w-6 h-6 shrink-0" />
                      <p className="text-[13px] font-bold uppercase tracking-wide">{lockReason}</p>
                    </div>
                  )}
                  <p className="text-[11px] text-center text-slate-400 font-bold uppercase tracking-widest">Bạn có thể chỉnh sửa trước thời hạn chót</p>
                </div>

                <div className="pt-8 border-t border-slate-200">
                  <button 
                    onClick={() => {
                      setIdentifiedUser(null);
                      setSubmission(null);
                      setMssv('');
                      setNotification(null);
                    }}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 py-3 rounded-sm text-[13px] font-bold transition-all uppercase tracking-wide"
                  >
                    Đăng xuất tài khoản
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
