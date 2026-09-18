
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  FileText, 
  ExternalLink, 
  Save, 
  ArrowLeft,
  Search,
  MessageSquare,
  Star,
  Download,
  AlertCircle,
  Eye,
  FileDigit,
  ImageIcon,
  Video,
  Link2,
  Type,
  X,
  Maximize2
} from 'lucide-react';
import { EduUser, EduClass, EduAssignment, EduSubmission, EduGrade, EduGradeColumn } from '../../types/edu';
import { getClassUsers, getSubmissions, getGrades, saveGrades, saveGradeColumn } from '../../lib/edu';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';

interface EduGradingProps {
  classId: string;
  assignmentId: string;
  gradeColumnId: string;
  onSuccess: () => void;
}

export default function EduGrading({ classId, assignmentId, gradeColumnId, onSuccess }: EduGradingProps) {
  const [users, setUsers] = useState<EduUser[]>([]);
  const [submissions, setSubmissions] = useState<EduSubmission[]>([]);
  const [grades, setGrades] = useState<EduGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingData, setGradingData] = useState<Record<string, { score: string; note: string }>>({});
  const [activeSubmission, setActiveSubmission] = useState<EduSubmission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [editingCommentUserId, setEditingCommentUserId] = useState<string | null>(null);

  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();

  useEffect(() => {
    async function loadData() {
      try {
        const [usersData, submissionsData, gradesData] = await Promise.all([
          getClassUsers(classId),
          getSubmissions(assignmentId),
          getGrades(gradeColumnId)
        ]);
        setUsers(usersData);
        setSubmissions(submissionsData);
        setGrades(gradesData);

        // Initialize grading data
        const initialGrading: Record<string, { score: string; note: string }> = {};
        gradesData.forEach(g => {
          const userId = g.userId || (g as any).user_id;
          if (userId) {
            initialGrading[userId] = { 
              score: g.score !== undefined ? String(g.score) : '', 
              note: g.note || '' 
            };
          }
        });
        setGradingData(initialGrading);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [assignmentId, gradeColumnId]);

  const handleScoreChange = (userId: string, score: string) => {
    setGradingData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], score }
    }));
  };

  const handleNoteChange = (userId: string, note: string) => {
    setGradingData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], note }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const gradesToSave = Object.entries(gradingData)
        .filter(([_, data]) => data.score !== '')
        .map(([userId, data]) => ({
          gradeColumnId: gradeColumnId,
          userId: userId,
          score: Number(data.score),
          note: data.note
        }));

      await saveGrades(gradesToSave);
      addNotification("Đã lưu điểm thành công", "success");
      onSuccess();
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi lưu điểm", "error");
    } finally {
      setLoading(false);
    }
  };

  // Only show users who submitted and sort them
  const submittedUsers = users.filter(u => submissions.some(s => s.userId === u.id));
  const sortedUsers = [...submittedUsers].sort((a, b) => (a.stt || 0) - (b.stt || 0));
  
  const filteredUsers = sortedUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.mssv.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileDisplay = (submission?: EduSubmission) => {
    if (!submission || !submission.files || submission.files.length === 0) {
      return <span className="text-slate-300 italic">No file</span>;
    }
    
    return (
      <div className="flex flex-col items-center gap-2">
        {submission.files.map((file, idx) => (
          <button 
            key={idx}
            onClick={() => setPreviewFile(file)}
            className="text-brand font-black hover:underline uppercase text-[11px] tracking-tight truncate max-w-[200px] text-center"
            title={file.name}
          >
            {file.name}
          </button>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center space-y-4 animate-pulse">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
        <Star className="w-6 h-6 text-slate-200" />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu chấm bài...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            NUMBER OF SUBMISSIONS: <span className="text-brand">{submissions.length}/{users.length}</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Management of scores and student assignments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="text-[11px] font-black text-brand uppercase tracking-widest hover:underline px-2 py-1">
            EXPAND TABLE
          </button>
          <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="SEARCH STUDENT..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-100 focus:border-brand focus:outline-none rounded-xl pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-wider w-full sm:w-48 transition-all"
            />
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-6 py-2.5 rounded-xl text-[10px] font-black shadow-lg shadow-brand/20 transition-all uppercase tracking-widest"
          >
            <Save className="w-4 h-4" />
            Lưu điểm số
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-20">NO</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px] text-center">STUDENT</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[180px]">SUBMISSION TIME</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[220px]">LINK OR FILE ASSIGNMENT</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">SCORE</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[180px]">COMMENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user, index) => {
                const submission = submissions.find(s => s.userId === user.id);
                const isSubmitted = !!submission;
                
                return (
                  <tr key={user.id} className="group hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-8 text-[12px] font-black text-slate-900 text-center">{index + 1}</td>
                    <td className="px-6 py-8">
                      <div className="space-y-1 text-center">
                        <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{user.fullName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user.mssv}</p>
                      </div>
                    </td>
                    <td className="px-6 py-8 text-center">
                      {isSubmitted ? (
                        <div className="inline-flex flex-col items-center gap-1.5">
                          <span className="px-3 py-1 bg-[#f0fdf4] text-[#16a34a] text-[10px] font-black rounded-lg border border-[#dcfce7] uppercase tracking-widest">
                            Submited
                          </span>
                          <span className="text-[11px] font-black text-slate-900">
                            {new Date(submission.submittedAt).toLocaleString('en-GB', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            }).replace(/\//g, '-').replace(',', '')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Submission</span>
                      )}
                    </td>
                    <td className="px-6 py-8 text-center">
                      {isSubmitted && submission.files && submission.files.length > 0 ? (
                        <div className="flex flex-col items-center gap-2">
                          {submission.files.map((file, idx) => (
                            <a 
                              key={idx}
                              href={file.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-brand font-black hover:underline uppercase text-[11px] tracking-tight truncate max-w-[200px]"
                              title={file.name}
                            >
                              {file.name}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 italic uppercase">No file</span>
                      )}
                    </td>
                    <td className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <input 
                          type="number" 
                          min="0"
                          max="10"
                          step="0.1"
                          value={gradingData[user.id]?.score || ''}
                          onChange={e => handleScoreChange(user.id, e.target.value)}
                          placeholder="-"
                          className="w-14 bg-transparent border-none focus:outline-none text-center text-[15px] font-black text-brand transition-all appearance-none placeholder:text-slate-200"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        {gradingData[user.id]?.note ? (
                          <button 
                            onClick={() => setEditingCommentUserId(user.id)}
                            className="w-full text-center text-[11px] font-black text-brand uppercase tracking-tight truncate max-w-[150px] hover:underline"
                          >
                            {gradingData[user.id].note}
                          </button>
                        ) : (
                          <button 
                            onClick={() => setEditingCommentUserId(user.id)}
                            className="text-brand font-black text-[11px] uppercase tracking-widest hover:underline"
                          >
                            ADD
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {submittedUsers.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
              <Users className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No submissions yet for this assignment</p>
          </div>
        ) : filteredUsers.length === 0 && (
          <div className="py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
              <Users className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No students found matching your search</p>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPreviewFile(null)} />
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden relative flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[300px]">{previewFile.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{previewFile.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={previewFile.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-2 bg-slate-100 text-slate-500 hover:bg-brand hover:text-white rounded-xl transition-all"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-2 bg-slate-100 text-slate-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 p-4 overflow-hidden flex items-center justify-center">
              {previewFile.type.includes('image') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-xl shadow-lg" />
              ) : previewFile.type.includes('pdf') ? (
                <iframe src={previewFile.url} className="w-full h-full rounded-xl border-0 shadow-lg bg-white" title="PDF Preview" />
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto">
                    <FileDigit className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">Preview not available for this file type.</p>
                  <a 
                    href={previewFile.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    <Download className="w-4 h-4" />
                    Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comment Editor Modal */}
      {editingCommentUserId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingCommentUserId(null)} />
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    {users.find(u => u.id === editingCommentUserId)?.fullName}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add teacher's comment</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingCommentUserId(null)}
                className="p-2 bg-slate-100 text-slate-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-50">
              <textarea 
                autoFocus
                value={gradingData[editingCommentUserId]?.note || ''}
                onChange={e => handleNoteChange(editingCommentUserId, e.target.value)}
                placeholder="Write your feedback here..."
                className="w-full bg-white border border-slate-100 focus:border-brand focus:outline-none rounded-[1.5rem] p-6 text-sm font-medium min-h-[200px] transition-all shadow-sm leading-relaxed"
              />
            </div>
            <div className="p-6 bg-white border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setEditingCommentUserId(null)}
                className="bg-brand text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/20 hover:bg-brand-hover transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
