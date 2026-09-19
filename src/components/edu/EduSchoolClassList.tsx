
import React, { useState, useEffect } from 'react';
import { 
  School, 
  BookOpen, 
  Plus, 
  Upload,
  Users, 
  ChevronRight, 
  Search, 
  Filter,
  BookMarked,
  GraduationCap,
  Calendar,
  MoreVertical,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  CheckCircle2
} from 'lucide-react';
import { EduClass, EduSchool } from '../../types/edu';
import { getClasses, getSchools, deleteSchool, deleteClass, saveSchool, saveClass, getClassUsers, getAssignments, getSubmissions } from '../../lib/edu';
import { getUsers } from '../../lib/data';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';

interface EduSchoolClassListProps {
  onSelectClass: (classId: string) => void;
  onImport?: () => void;
  onOpenBank?: () => void;
  isAdmin?: boolean;
}

export default function EduSchoolClassList({ onSelectClass, onImport, onOpenBank, isAdmin }: EduSchoolClassListProps) {
  const [schools, setSchools] = useState<EduSchool[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const ownerName = (ownerId?: string) => (ownerId ? userNames[ownerId] || '' : '');
  const [classes, setClasses] = useState<(EduClass & { edu_schools: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingSchool, setEditingSchool] = useState<EduSchool | null>(null);
  const [editingClass, setEditingClass] = useState<EduClass | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const [isCreatingSchool, setIsCreatingSchool] = useState(false);
  const [isCreatingClassForSchool, setIsCreatingClassForSchool] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({ name: '', description: '' });

  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Thống kê nhanh cho mỗi lớp: tổng sinh viên, bài tập đang có hạn nộp gần nhất, số đã nộp.
  type ClassStat = { students: number; assignmentTitle?: string; deadline?: string; submitted: number };
  const [classStats, setClassStats] = useState<Record<string, ClassStat>>({});

  const loadClassStats = async (cls: { id: string }[]) => {
    const entries = await Promise.all(cls.map(async (c) => {
      try {
        const [users, assignments] = await Promise.all([getClassUsers(c.id), getAssignments(c.id)]);
        const now = Date.now();
        const withDeadline = assignments.filter(a => a.deadline);
        const upcoming = withDeadline
          .filter(a => new Date(a.deadline as string).getTime() >= now)
          .sort((a, b) => new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime());
        const chosen = upcoming[0]
          || withDeadline.sort((a, b) => new Date(b.deadline as string).getTime() - new Date(a.deadline as string).getTime())[0]
          || assignments[0];
        let submitted = 0;
        if (chosen) {
          const subs = await getSubmissions(chosen.id);
          submitted = new Set(subs.map(s => s.userId || s.mssv)).size;
        }
        const stat: ClassStat = {
          students: users.length,
          assignmentTitle: chosen?.title,
          deadline: chosen?.deadline,
          submitted,
        };
        return [c.id, stat] as const;
      } catch {
        return [c.id, { students: 0, submitted: 0 } as ClassStat] as const;
      }
    }));
    setClassStats(Object.fromEntries(entries));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [schoolsData, classesData] = await Promise.all([
        getSchools(),
        getClasses()
      ]);
      setSchools(schoolsData);
      setClasses(classesData);
      loadClassStats(classesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Admin cần thấy trường lớp do ai tạo, nên nạp tên người dùng để hiển thị.
    if (isAdmin) {
      getUsers()
        .then(list => {
          const map: Record<string, string> = {};
          list.forEach(u => { map[u.id] = u.fullName || u.username || u.email || u.id; });
          setUserNames(map);
        })
        .catch(() => {});
    }

    const handleClickOutside = () => setActiveDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSaveSchool = async () => {
    if (!editingSchool || !editForm.name.trim()) return;
    try {
      await saveSchool({ ...editingSchool, name: editForm.name, description: editForm.description });
      setEditingSchool(null);
      loadData();
      addNotification("Đã cập nhật thông tin trường", "success");
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi cập nhật trường", "error");
    }
  };

  const handleDeleteSchool = async (school: EduSchool) => {
    confirm(
      "Xóa trường học",
      `Bạn có chắc chắn muốn xóa trường "${school.name}"? Mọi lớp học và dữ liệu sinh viên liên quan sẽ bị xóa vĩnh viễn.`,
      async () => {
        try {
          await deleteSchool(school.id);
          loadData();
          addNotification("Đã xóa trường học", "success");
        } catch (err) {
          console.error(err);
          addNotification("Lỗi khi xóa trường học", "error");
        }
      }
    );
  };

  const handleSaveClass = async () => {
    if (!editingClass || !editForm.name.trim()) return;
    try {
      await saveClass({ ...editingClass, name: editForm.name, description: editForm.description });
      setEditingClass(null);
      loadData();
      addNotification("Đã cập nhật thông tin lớp học", "success");
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi cập nhật lớp học", "error");
    }
  };

  const handleCreateSchool = async () => {
    if (!newForm.name.trim()) return;
    try {
      await saveSchool({ name: newForm.name, description: newForm.description });
      setIsCreatingSchool(false);
      setNewForm({ name: '', description: '' });
      loadData();
      addNotification("Đã tạo trường học mới", "success");
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi tạo trường học", "error");
    }
  };

  const handleCreateClass = async (schoolId: string) => {
    if (!newForm.name.trim()) return;
    try {
      await saveClass({ schoolId, name: newForm.name, description: newForm.description });
      setIsCreatingClassForSchool(null);
      setNewForm({ name: '', description: '' });
      loadData();
      addNotification("Đã tạo lớp học mới", "success");
    } catch (err) {
      console.error(err);
      addNotification("Lỗi khi tạo lớp học", "error");
    }
  };

  const handleDeleteClass = async (clazz: EduClass) => {
    confirm(
      "Xóa lớp học",
      `Bạn có chắc chắn muốn xóa lớp "${clazz.name}"? Mọi dữ liệu sinh viên và điểm số sẽ bị xóa vĩnh viễn.`,
      async () => {
        try {
          await deleteClass(clazz.id);
          loadData();
          addNotification("Đã xóa lớp học", "success");
        } catch (err) {
          console.error(err);
          addNotification("Lỗi khi xóa lớp học", "error");
        }
      }
    );
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.edu_schools?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBySchool = schools.map(school => ({
    ...school,
    classes: filteredClasses.filter(c => c.schoolId === school.id)
  })).filter(s => s.classes.length > 0 || searchTerm === '');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải danh sách...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner - Matching Image */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex items-center gap-6">
        <div className="w-16 h-16 bg-brand-light text-brand rounded-2xl flex items-center justify-center shrink-0">
          <GraduationCap className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hệ thống Giáo dục Edu</h1>
          <p className="text-sm font-medium text-slate-500">Quản lý trường học, lớp học và kết quả học tập</p>
        </div>
      </div>

      {/* Action Bar - Matching Image */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm lớp học, trường học..."
              className="w-full bg-white border border-slate-200 focus:border-brand focus:ring-4 focus:ring-brand/5 rounded-2xl pl-11 pr-4 py-3 text-[13px] font-medium transition-all"
            />
          </div>
          
          <button 
            onClick={() => {
              setIsCreatingSchool(true);
              setNewForm({ name: '', description: '' });
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-50 transition-all uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 text-brand" />
            <span>Thêm trường</span>
          </button>

          {onImport && (
            <button
              onClick={onImport}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded-2xl text-[11px] font-bold transition-all shadow-lg shadow-brand/20 uppercase tracking-wider"
            >
              <Upload className="w-4 h-4" />
              <span>Import tạo lớp</span>
            </button>
          )}

          {onOpenBank && (
            <button
              onClick={onOpenBank}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-brand text-brand text-[11px] font-bold hover:bg-brand-light transition-all uppercase tracking-wider"
            >
              <BookMarked className="w-4 h-4" />
              <span>Ngân hàng bài tập</span>
            </button>
          )}
        </div>

        <button className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-50 transition-all uppercase tracking-wider">
          <Filter className="w-4 h-4" />
          <span>Bộ lọc</span>
        </button>
      </div>

      {isCreatingSchool && (
        <div className="bg-white border border-slate-200 p-6 rounded-3xl animate-fadeIn space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Thêm cơ sở đào tạo mới</h3>
            <button onClick={() => setIsCreatingSchool(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Tên trường học..."
              value={newForm.name}
              onChange={e => setNewForm({...newForm, name: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-0 rounded-xl px-4 py-3 text-sm font-medium"
            />
            <input 
              type="text" 
              placeholder="Mô tả..."
              value={newForm.description}
              onChange={e => setNewForm({...newForm, description: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-0 rounded-xl px-4 py-3 text-sm font-medium"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsCreatingSchool(false)} className="px-6 py-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Hủy</button>
            <button onClick={handleCreateSchool} className="px-8 py-2 bg-brand text-white rounded-xl text-[11px] font-bold uppercase tracking-wider">Xác nhận</button>
          </div>
        </div>
      )}

      {groupedBySchool.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-slate-100">
          <GraduationCap className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">Chưa có dữ liệu</h3>
          <p className="text-xs text-slate-400 font-medium">Thêm trường hoặc lớp học để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-12">
          {groupedBySchool.map(school => (
            <div key={school.id} className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-light text-brand rounded-lg flex items-center justify-center">
                    <School className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">{school.name}</h2>
                  {isAdmin && ownerName(school.ownerId) && (
                    <span className="text-[10px] font-bold text-brand bg-brand-light border border-brand/20 px-2 py-0.5 rounded-full normal-case">Tạo bởi {ownerName(school.ownerId)}</span>
                  )}

                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(activeDropdownId === `school-${school.id}` ? null : `school-${school.id}`);
                      }}
                      className="p-1 text-slate-300 hover:text-slate-600"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeDropdownId === `school-${school.id}` && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl p-1 z-20 min-w-[150px]">
                        <button onClick={() => { setEditingSchool(school); setEditForm({ name: school.name, description: school.description || '' }); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><Edit2 className="w-3.5 h-3.5" /> Sửa</button>
                        <button onClick={() => handleDeleteSchool(school)} className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><Trash2 className="w-3.5 h-3.5" /> Xóa</button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setIsCreatingClassForSchool(school.id);
                      setNewForm({ name: '', description: '' });
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-brand/20 text-brand rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-brand hover:text-white transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm lớp</span>
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 uppercase">{school.classes.length} Lớp học</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {school.classes.map(clazz => (
                  <div
                    key={clazz.id}
                    onClick={() => onSelectClass(clazz.id)}
                    className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand/30 transition-all cursor-pointer flex flex-col"
                  >
                    <div className="p-6 flex-1">
                      <div className="flex justify-end items-start mb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === clazz.id ? null : clazz.id);
                          }}
                          className="p-1 text-slate-300 hover:text-slate-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeDropdownId === clazz.id && (
                          <div className="absolute right-4 top-9 bg-white border border-slate-100 rounded-xl shadow-xl p-1 z-30 min-w-[140px]" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditingClass(clazz); setEditForm({ name: clazz.name, description: clazz.description || '' }); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><Edit2 className="w-3.5 h-3.5" /> Sửa</button>
                            <button onClick={() => handleDeleteClass(clazz)} className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><Trash2 className="w-3.5 h-3.5" /> Xóa</button>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-[15px] font-bold text-slate-800 group-hover:text-brand transition-colors mb-2 line-clamp-2 leading-snug">{clazz.name}</h3>
                      {(() => {
                        const st = classStats[clazz.id];
                        if (!st) {
                          return <p className="text-[12px] text-slate-400 italic">Đang tải thống kê...</p>;
                        }
                        return (
                          <div className="text-[12px] text-slate-600 space-y-1.5">
                            <p><span className="font-black text-slate-800">{st.students}</span> sinh viên</p>
                            {st.assignmentTitle ? (
                              <>
                                <p className="truncate"><span className="text-slate-400">Bài đang mở </span><span className="font-bold text-slate-700">{st.assignmentTitle}</span></p>
                                {st.deadline && (
                                  <p><span className="text-slate-400">Hạn nộp </span><span className="font-bold text-rose-500">{new Date(st.deadline).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></p>
                                )}
                                <p><span className="text-slate-400">Đã nộp </span><span className="font-black text-brand">{st.submitted}</span><span className="text-slate-400"> trên </span><span className="font-bold text-slate-700">{st.students}</span></p>
                              </>
                            ) : (
                              <p className="text-slate-400 italic">Chưa có bài tập nào</p>
                            )}
                          </div>
                        );
                      })()}
                      {isAdmin && ownerName(clazz.ownerId) && (
                        <p className="text-[11px] font-bold text-brand mt-2">Tạo bởi {ownerName(clazz.ownerId)}</p>
                      )}
                    </div>

                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Users className="w-3.5 h-3.5" />
                          <span>{classStats[clazz.id]?.students ?? '-'} sinh viên</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(clazz.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

}
