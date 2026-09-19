
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  FileText, 
  GraduationCap, 
  MoreVertical,
  ChevronRight,
  ClipboardCheck,
  Search,
  ArrowRight,
  Trash2,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  Edit2,
  School,
  ArrowLeft,
  X,
  UserPlus,
  FileSpreadsheet
} from 'lucide-react';
import { EduUser, EduClass, EduSchool, EduGradeColumn, EduAssignment, EduGrade } from '../../types/edu';
import { 
  getClassById, 
  getClassUsers, 
  getGradeColumns, 
  saveGradeColumn, 
  getAssignments, 
  getAllClassGrades,
  getAllClassSubmissions,
  deleteGradeColumn,
  deleteUser,
  saveUser,
  saveGrades,
  deleteAssignment
} from '../../lib/edu';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import EduExport from './EduExport';

interface EduClassDetailProps {
  classId: string;
  currentUser: any;
  onEditAssignment: (assignmentId?: string) => void;
  onViewAssignment: (assignmentId: string) => void;
  onGrading: (assignmentId: string, gradeColumnId: string) => void;
  onBack?: () => void;
}

export default function EduClassDetail({ classId, currentUser, onEditAssignment, onViewAssignment, onGrading, onBack }: EduClassDetailProps) {
  const [clazz, setClazz] = useState<(EduClass & { edu_schools: EduSchool }) | null>(null);
  const [users, setUsers] = useState<EduUser[]>([]);
  const [gradeColumns, setGradeColumns] = useState<EduGradeColumn[]>([]);
  const [assignments, setAssignments] = useState<EduAssignment[]>([]);
  const [grades, setGrades] = useState<EduGrade[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'assignments'>('users');
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState<EduGradeColumn | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<EduUser | null>(null);
  const [userForm, setUserForm] = useState({ stt: '', fullName: '', mssv: '' });

  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();

  const loadData = async () => {
    try {
      const [classData, usersData, columnsData, assignmentsData, gradesData, submissionsData] = await Promise.all([
        getClassById(classId),
        getClassUsers(classId),
        getGradeColumns(classId),
        getAssignments(classId),
        getAllClassGrades(classId),
        getAllClassSubmissions(classId)
      ]);
      setClazz(classData);
      setUsers(usersData);
      setGradeColumns(columnsData);
      setAssignments(assignmentsData);
      setGrades(gradesData);
      setSubmissions(submissionsData);
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi tải thông tin lớp học", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleClickOutside = () => setActiveDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [classId]);

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    try {
      await saveGradeColumn({
        id: editingColumn?.id,
        classId,
        name: newColumnName,
        order: editingColumn ? editingColumn.order : gradeColumns.length,
        isConfirmed: editingColumn ? editingColumn.isConfirmed : false
      });
      setNewColumnName('');
      setIsAddingColumn(false);
      setEditingColumn(null);
      loadData();
      addNotification(editingColumn ? "Đã cập nhật cột điểm" : "Đã thêm cột điểm mới", "success");
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi lưu cột điểm", "error");
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    confirm(
      "Xóa cột điểm",
      "Bạn có chắc chắn muốn xóa cột điểm này? Mọi dữ liệu điểm và bài tập liên quan sẽ bị xóa vĩnh viễn.",
      async () => {
        try {
          // Find assignments linked to this column and delete them first
          const linkedAssignments = assignments.filter(a => a.gradeColumnId === columnId);
          for (const assignment of linkedAssignments) {
            await deleteAssignment(assignment.id);
          }
          
          await deleteGradeColumn(columnId);
          loadData();
          addNotification("Đã xóa cột điểm và bài tập liên quan", "success");
        } catch (err) {
          console.error(err);
          addNotification("Lỗi khi xóa cột điểm", "error");
        }
      }
    );
  };

  const handleSaveUser = async () => {
    if (!userForm.fullName.trim() || !userForm.mssv.trim()) {
      addNotification("Vui lòng nhập đầy đủ thông tin", "warning");
      return;
    }
    try {
      await saveUser({
        id: editingUser?.id,
        classId,
        stt: Number(userForm.stt) || users.length + 1,
        fullName: userForm.fullName,
        mssv: userForm.mssv
      });
      setIsAddingUser(false);
      setEditingUser(null);
      setUserForm({ stt: '', fullName: '', mssv: '' });
      loadData();
      addNotification(editingUser ? "Đã cập nhật thông tin sinh viên" : "Đã thêm sinh viên mới", "success");
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi lưu thông tin sinh viên", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    confirm(
      "Xóa sinh viên",
      "Bạn có chắc chắn muốn xóa sinh viên này khỏi lớp? Mọi dữ liệu điểm liên quan cũng sẽ bị xóa.",
      async () => {
        try {
          await deleteUser(userId);
          loadData();
          addNotification("Đã xóa sinh viên", "success");
        } catch (err) {
          console.error(err);
          addNotification("Lỗi khi xóa sinh viên", "error");
        }
      }
    );
  };

  const handleConfirmColumn = async (column: EduGradeColumn) => {
    confirm(
      "Xác nhận hoàn tất chấm điểm",
      `Sau khi xác nhận, sinh viên có thể xem điểm của mình ở cột "${column.name}". Hệ thống sẽ tự động đặt điểm 0 cho những sinh viên chưa nộp bài. Bạn vẫn có thể sửa điểm sau này nếu cần.`,
      async () => {
        try {
          // Identify students who haven't submitted for assignments linked to this column
          // and don't have a grade yet
          const linkedAssignments = assignments.filter(a => a.gradeColumnId === column.id);
          
          const studentsToSetZero = users.filter(user => {
            const hasSubmission = submissions.some(s => 
              linkedAssignments.some(a => a.id === s.assignmentId) && s.userId === user.id
            );
            const hasGrade = grades.some(g => g.gradeColumnId === column.id && g.userId === user.id);
            return !hasSubmission && !hasGrade;
          });

          if (studentsToSetZero.length > 0) {
            const zeroGrades = studentsToSetZero.map(user => ({
              gradeColumnId: column.id,
              userId: user.id,
              score: 0,
              note: 'Hệ thống: Không nộp bài'
            }));
            await saveGrades(zeroGrades);
          }

          await saveGradeColumn({ ...column, isConfirmed: true });
          loadData();
          addNotification(
            studentsToSetZero.length > 0 
              ? `Đã xác nhận hoàn tất. Đã tự động đặt điểm 0 cho ${studentsToSetZero.length} SV chưa nộp.` 
              : "Đã xác nhận hoàn tất chấm điểm", 
            "success"
          );
        } catch (err) {
          console.error(err);
          addNotification("Lỗi khi xác nhận hoàn tất chấm điểm", "error");
        }
      }
    );
  };

  const handleDeleteAssignment = async (assignmentId: string, gradeColumnId?: string) => {
    confirm(
      "Xóa bài tập",
      "Bạn có chắc chắn muốn xóa bài tập này? Cột điểm liên quan cũng sẽ bị xóa vĩnh viễn.",
      async () => {
        try {
          await deleteAssignment(assignmentId);
          if (gradeColumnId) {
            await deleteGradeColumn(gradeColumnId);
          }
          loadData();
          addNotification("Đã xóa bài tập và cột điểm liên quan", "success");
        } catch (err) {
          console.error(err);
          addNotification("Lỗi khi xóa bài tập", "error");
        }
      }
    );
  };

  const copyShareLink = (shareLinkId: string) => {
    const link = `${window.location.origin}/tracuu.html?edu=${shareLinkId}`;
    navigator.clipboard.writeText(link);
    addNotification("Đã sao chép link chia sẻ", "success");
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Đang tải...</div>;
  if (!clazz) return <div className="py-20 text-center text-slate-400">Không tìm thấy lớp học</div>;

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.mssv.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Class Info Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 shrink-0 rounded-2xl bg-slate-50 hover:bg-brand hover:text-white text-slate-500 grid place-items-center transition-all"
              title="Quay lại"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand font-bold text-[10px] uppercase tracking-widest">
            <School className="w-3 h-3" />
            <span>{clazz.edu_schools.name}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">{clazz.name}</h2>
          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {users.length} sinh viên
            </span>
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5" />
              {gradeColumns.length} cột điểm
            </span>
          </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (gradeColumns.length === 0) {
                addNotification("Cần thêm ít nhất một cột điểm trước khi tạo bài tập", "warning");
              } else {
                onEditAssignment();
              }
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              gradeColumns.length > 0 
                ? 'bg-brand hover:bg-brand-hover text-white shadow-brand/20' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bài tập</span>
            {gradeColumns.length === 0 && <Lock className="w-3 h-3 ml-1" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Danh sách & Điểm số
        </button>
        <button 
          onClick={() => setActiveTab('assignments')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'assignments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Quản lý Bài tập
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm sinh viên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-brand focus:outline-none rounded-xl pl-9 pr-4 py-2 text-xs font-semibold"
              />
            </div>
            
            <div className="flex items-center gap-2">
              {clazz && (
                <EduExport 
                  clazz={clazz as any} 
                  users={users} 
                  gradeColumns={gradeColumns} 
                  grades={grades} 
                />
              )}

              <button 
                onClick={() => {
                  setEditingUser(null);
                  setUserForm({ stt: (users.length + 1).toString(), fullName: '', mssv: '' });
                  setIsAddingUser(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-light text-brand hover:bg-brand-light rounded-xl text-xs font-bold transition-all border border-brand-light"
              >
                <UserPlus className="w-4 h-4" />
                <span>Thêm SV thủ công</span>
              </button>

              {(isAddingColumn || editingColumn) ? (
                <div className="flex items-center gap-2 animate-fadeIn bg-white p-1 rounded-xl shadow-sm border border-brand/20">
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Tên cột điểm..."
                    value={newColumnName}
                    onChange={e => setNewColumnName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                    className="px-3 py-1.5 border-none focus:ring-0 text-xs font-semibold w-32"
                  />
                  <button onClick={handleAddColumn} className="p-1.5 bg-brand text-white rounded-lg hover:bg-brand-hover"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setIsAddingColumn(false); setEditingColumn(null); setNewColumnName(''); }} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingColumn(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-brand/30 text-slate-600 hover:text-brand rounded-xl text-xs font-bold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm cột điểm</span>
                </button>
              )}
            </div>
          </div>

          {isAddingUser && (
            <div className="bg-brand-light/50 p-4 rounded-2xl border border-brand-light flex flex-wrap items-center gap-3 animate-fadeIn">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-brand uppercase ml-1">STT</label>
                <input 
                  type="number" 
                  value={userForm.stt}
                  onChange={e => setUserForm({...userForm, stt: e.target.value})}
                  className="w-16 px-3 py-2 bg-white border border-brand-light rounded-xl text-xs font-bold focus:outline-none focus:border-brand"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-brand uppercase ml-1">MSSV</label>
                <input 
                  type="text" 
                  placeholder="SV001"
                  value={userForm.mssv}
                  onChange={e => setUserForm({...userForm, mssv: e.target.value})}
                  className="w-32 px-3 py-2 bg-white border border-brand-light rounded-xl text-xs font-bold focus:outline-none focus:border-brand"
                />
              </div>
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-[9px] font-black text-brand uppercase ml-1">Họ và Tên</label>
                <input 
                  type="text" 
                  placeholder="Nguyễn Văn A"
                  value={userForm.fullName}
                  onChange={e => setUserForm({...userForm, fullName: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-brand-light rounded-xl text-xs font-bold focus:outline-none focus:border-brand"
                />
              </div>
              <div className="flex gap-2 pt-5">
                <button 
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-black shadow-sm hover:bg-brand-hover transition-all"
                >
                  {editingUser ? 'CẬP NHẬT' : 'THÊM MỚI'}
                </button>
                <button 
                  onClick={() => { setIsAddingUser(false); setEditingUser(null); }}
                  className="px-4 py-2 bg-white text-slate-500 rounded-xl text-xs font-black border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  HỦY
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-16">STT</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-32">MSSV</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Họ và Tên</th>
                  {gradeColumns.map(col => (
                    <th key={col.id} className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-wider text-center border-l border-slate-50 group min-w-[120px]">
                      <div className="flex flex-col items-center gap-1 relative">
                        <div className="flex items-center gap-1">
                          <span>{col.name}</span>
                          <div className="relative ml-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === col.id ? null : col.id);
                              }}
                              className={`p-1 rounded-lg transition-all ${activeDropdownId === col.id ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>
                            {activeDropdownId === col.id && (
                              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl p-1 z-20 min-w-[120px] animate-fadeIn font-bold" onClick={e => e.stopPropagation()}>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingColumn(col);
                                    setNewColumnName(col.name);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                  <Edit2 className="w-3 h-3 text-brand" /> SỬA CỘT
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteColumn(col.id);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" /> XÓA CỘT
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {!col.isConfirmed ? (
                          <button 
                            onClick={() => handleConfirmColumn(col)}
                            className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            Xác nhận hoàn tất
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-brand bg-brand-light px-1.5 py-0.5 rounded border border-brand flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Đã chốt
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-20 text-center border-l border-slate-50">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">{user.stt}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{user.mssv}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-800">{user.fullName}</td>
                    {gradeColumns.map(col => {
                      const grade = grades.find(g => g.gradeColumnId === col.id && g.userId === user.id);
                      return (
                        <td key={col.id} className="px-6 py-4 text-center border-l border-slate-50">
                          <span className={`text-xs font-black ${grade && grade.score !== undefined ? 'text-brand' : 'text-slate-300'}`}>
                            {grade && grade.score !== undefined ? grade.score : '-'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-center border-l border-slate-50">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setEditingUser(user);
                            setUserForm({ stt: user.stt.toString(), fullName: user.fullName, mssv: user.mssv });
                            setIsAddingUser(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">Không tìm thấy sinh viên nào</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Tên bài tập</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Cột điểm</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Hạn nộp</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {assignments.map(assignment => {
                const column = gradeColumns.find(c => c.id === (assignment as any).grade_column_id || c.id === assignment.gradeColumnId);
                const subCount = submissions.filter(s => s.assignmentId === assignment.id).length;
                const totalCount = users.length;
                return (
                  <tr key={assignment.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <button 
                          onClick={() => onViewAssignment(assignment.id)}
                          className="text-xs font-black text-slate-900 group-hover:text-brand transition-colors text-left"
                        >
                          {assignment.title}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{assignment.allowedFileTypes.join(', ')}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className={`text-[9px] font-black uppercase ${subCount === totalCount ? 'text-brand' : 'text-amber-500'}`}>
                            {subCount}/{totalCount} SV đã nộp
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                        {column?.name || 'Chưa gán'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500">
                        {assignment.deadline ? new Date(assignment.deadline).toLocaleString('vi-VN') : 'Không giới hạn'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => column && onGrading(assignment.id, column.id)}
                          className="px-3 py-1.5 bg-brand text-white rounded-xl text-[10px] font-black hover:bg-brand-hover transition-all"
                        >
                          CHẤM BÀI
                        </button>
                        <button 
                          onClick={() => copyShareLink(assignment.shareLinkId)}
                          className="p-2 bg-slate-50 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-xl transition-all"
                          title="Sao chép link nộp bài"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onEditAssignment(assignment.id)}
                          className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                          title="Chỉnh sửa bài tập"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <a 
                          href={`/tracuu.html?edu=${assignment.shareLinkId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-slate-600 transition-all"
                          title="Mở link nộp bài"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button 
                          onClick={() => handleDeleteAssignment(assignment.id, assignment.gradeColumnId)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          title="Xóa bài tập"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {assignments.length === 0 && (
            <div className="py-20 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chưa có bài tập nào được tạo</p>
              {gradeColumns.length > 0 ? (
                <button 
                  onClick={() => onEditAssignment()}
                  className="mt-4 inline-flex items-center gap-2 text-brand font-bold text-xs hover:underline"
                >
                  <Plus className="w-4 h-4" /> Tạo bài tập đầu tiên
                </button>
              ) : (
                <p className="mt-2 text-[10px] text-amber-600 font-medium">Vui lòng thêm cột điểm trước khi tạo bài tập</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
