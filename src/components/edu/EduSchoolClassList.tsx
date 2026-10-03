
import React, { useState, useEffect } from 'react';
import { canUseModule } from '../../lib/moduleAccess';
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
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  UserPlus,
  Monitor
} from 'lucide-react';
import { EduClass, EduSchool } from '../../types/edu';
import { getClasses, getSchools, getSharedEdu, deleteSchool, deleteClass, saveSchool, saveClass, getClassUsers, getAssignments, getSubmissions } from '../../lib/edu';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import { eduCan } from '../../lib/eduPermissions';
import { usePhoneMaybe, PhoneActionGrid } from '../phone/PhoneShell';
import { PhoneExt, PhoneSearch, PhoneSeg, PhoneChips, PhoneChip, PhoneSheet, PhoneMenuSheet, PhoneFab, PhoneEmpty, bandOf } from '../phone/PhoneKit';
import { askText } from '../ui/Dialogs';
import { getGrades } from '../../lib/edu';
import { phoneMode, phoneUi } from '../../lib/device';
import { PhoneTop } from '../phone/PhoneHome';
import { MODULE_REGISTRY } from '../../lib/modules';
import ShareDialog from '../ui/ShareDialog';
import type { CollabType } from '../../lib/collab';
import { collaboratorsByResource } from '../../lib/collab';
import { AvatarStack } from '../ui/People';

interface EduSchoolClassListProps {
  onSelectClass: (classId: string) => void;
  onGrade?: (classId: string, assignmentId: string, gradeColumnId: string) => void;
  onImport?: () => void;
  onOpenBank?: () => void;
  onOpenGrades?: () => void;
  onOpenExams?: () => void;
  isAdmin?: boolean;
  currentUser?: any;
}

export default function EduSchoolClassList({ onSelectClass, onGrade, onImport, onOpenBank, onOpenGrades, onOpenExams, isAdmin, currentUser }: EduSchoolClassListProps) {
  const canCreate = eduCan(currentUser, 'create');
  const canEdit = eduCan(currentUser, 'edit');
  const canDelete = eduCan(currentUser, 'delete');
  const canImportEdu = eduCan(currentUser, 'import');
  const canGradeImport = eduCan(currentUser, 'gradeImport');
  const canGrade = eduCan(currentUser, 'grade');
  const [schools, setSchools] = useState<EduSchool[]>([]);
  const [classes, setClasses] = useState<(EduClass & { edu_schools: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const phone = usePhoneMaybe();
  const lpTimer = React.useRef<number | undefined>(undefined);
  const lpFired = React.useRef(false);
  // Điện thoại: đầu trang Lớp học có nút quay lại và về Trang chủ riêng, nên ẩn thanh trên của ứng dụng.
  useEffect(() => {
    if (!phone) return;
    document.documentElement.classList.add('ph-own-head');
    return () => document.documentElement.classList.remove('ph-own-head');
  }, [!!phone]); // eslint-disable-line react-hooks/exhaustive-deps
  // Mục của mình (không có access) hoặc mục người khác chia sẻ mà mình là chủ.
  const mine = (x: { access?: EduSchool['access'] }) => !x.access || x.access.owner;
  const [classCollabs, setClassCollabs] = useState<Record<string, Array<{ id: string; name?: string | null }>>>({});
  const [sharing, setSharing] = useState<{ type: CollabType; id: string; title: string; ownerId: string; canManage: boolean } | null>(null);
  
  const [editingSchool, setEditingSchool] = useState<EduSchool | null>(null);
  const [editingClass, setEditingClass] = useState<EduClass | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const [isCreatingSchool, setIsCreatingSchool] = useState(false);
  const [isCreatingClassForSchool, setIsCreatingClassForSchool] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({ name: '', description: '' });

  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  // Điện thoại
  const [pScope, setPScope] = useState<'mine' | 'shared'>('mine');
  const [pSchool, setPSchool] = useState('');
  const [pQuick, setPQuick] = useState<'' | 'pending' | 'soon'>('');
  const [pSheet, setPSheet] = useState<null | 'school' | 'menu' | 'new' | { cls: EduClass } | { school: EduSchool }>(null);
  const [newCls, setNewCls] = useState({ schoolId: '', name: '' });

  // Thống kê nhanh cho mỗi lớp: tổng sinh viên, bài tập đang có hạn nộp gần nhất, số đã nộp.
  type ClassStat = { students: number; assignmentTitle?: string; deadline?: string; submitted: number; pending?: number; assignmentId?: string; gradeColumnId?: string; assignments?: number };
  const [classStats, setClassStats] = useState<Record<string, ClassStat>>({});

  // Chạy tuần tự có thử lại 1 lần cho từng lớp để tránh lỗi tạm thời khi gọi nhiều
  // truy vấn cùng lúc. Khi một lớp lỗi thì giữ nguyên chỉ số cũ, không ghi đè số 0.
  const statFor = async (id: string): Promise<ClassStat> => {
    // Đếm sinh viên trước và hiện ngay ra thẻ, phần bài nộp tải sau cho đỡ chờ.
    const users = await getClassUsers(id);
    setClassStats(prev => ({ ...prev, [id]: { students: users.length, submitted: prev[id]?.submitted || 0, assignmentTitle: prev[id]?.assignmentTitle, deadline: prev[id]?.deadline } }));
    const assignments = await getAssignments(id);
    const now = Date.now();
    const withDeadline = assignments.filter(a => a.deadline);
    const upcoming = withDeadline
      .filter(a => new Date(a.deadline as string).getTime() >= now)
      .sort((a, b) => new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime());
    const chosen = upcoming[0]
      || withDeadline.sort((a, b) => new Date(b.deadline as string).getTime() - new Date(a.deadline as string).getTime())[0]
      || assignments[0];
    let submitted = 0, pending = 0;
    if (chosen) {
      const subs = await getSubmissions(chosen.id);
      const who = new Set(subs.map(s => s.userId || s.mssv));
      submitted = who.size;
      // Số bài đã nộp mà chưa có điểm, để hiện nút Chấm bài ngay trên thẻ lớp ở điện thoại.
      if (phone && chosen.gradeColumnId && submitted) {
        const gs = await getGrades(chosen.gradeColumnId).catch(() => []);
        const done = new Set((gs as any[]).map(g => g.userId || g.user_id));
        pending = [...who].filter(u => !done.has(u as string)).length;
      }
    }
    return { students: users.length, assignmentTitle: chosen?.title, deadline: chosen?.deadline, submitted, pending, assignmentId: chosen?.id, gradeColumnId: chosen?.gradeColumnId, assignments: assignments.length };
  };

  // Tải thống kê từng lớp song song nhưng giới hạn số truy vấn cùng lúc để nhanh mà
  // không quá tải máy chủ. Mỗi lớp tải xong thì cập nhật ngay thẻ đó, một lớp lỗi
  // không làm kẹt các lớp còn lại.
  const loadClassStats = async (cls: { id: string }[]) => {
    const queue = [...cls];
    const LIMIT = 5;
    const worker = async () => {
      while (queue.length) {
        const c = queue.shift();
        if (!c) break;
        let stat: ClassStat | null = null;
        for (let attempt = 0; attempt < 2 && !stat; attempt++) {
          try { stat = await statFor(c.id); }
          catch { if (attempt === 0) await new Promise(r => setTimeout(r, 400)); }
        }
        if (stat) setClassStats(prev => ({ ...prev, [c.id]: stat as ClassStat }));
      }
    };
    await Promise.all(Array.from({ length: Math.min(LIMIT, queue.length) }, worker));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [schoolsData, classesData, shared] = await Promise.all([
        getSchools(),
        getClasses(),
        getSharedEdu().catch(() => ({ schools: [], classes: [] }))
      ]);
      // Gộp lớp, trường người khác thêm mình vào cộng tác.
      const ownSchoolIds = new Set(schoolsData.map(x => x.id));
      const ownClassIds = new Set(classesData.map(x => x.id));
      const allSchools = [...schoolsData, ...shared.schools.filter(x => !ownSchoolIds.has(x.id))];
      const allClasses = [...classesData, ...shared.classes.filter(x => !ownClassIds.has(x.id))];
      setSchools(allSchools);
      setClasses(allClasses);
      loadClassStats(allClasses);
      collaboratorsByResource('edu_class', allClasses.map(c => c.id)).then(setClassCollabs).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

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
      `Bạn có chắc chắn muốn xóa lớp "${clazz.name}"? Danh sách sinh viên, bài tập, điểm số và toàn bộ bài sinh viên đã nộp (kể cả tệp đính kèm) sẽ bị xóa vĩnh viễn để giải phóng bộ nhớ.`,
      async () => {
        try {
          const files = await deleteClass(clazz.id);
          loadData();
          addNotification(files >= 0 ? `Đã xóa lớp học và ${files} tệp bài nộp.` : "Đã xóa lớp học. Chưa dọn được tệp bài nộp trên kho lưu trữ.", files >= 0 ? "success" : "info");
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

  if (phone) {
    const scoped = classes.filter(c => (pScope === 'mine' ? mine(c) : !mine(c)));
    const q = searchTerm.trim().toLowerCase();
    const list = scoped
      .filter(c => !pSchool || c.schoolId === pSchool)
      .filter(c => !q || c.name.toLowerCase().includes(q) || (c.edu_schools?.name || '').toLowerCase().includes(q))
      .filter(c => { const st = classStats[c.id]; if (pQuick === 'pending') return !!st?.pending; if (pQuick === 'soon') return !!st?.deadline && new Date(st.deadline).getTime() > Date.now() && new Date(st.deadline).getTime() - Date.now() < 72 * 3600e3; return true; });
    const schoolName = (id: string) => schools.find(x => x.id === id)?.name || '';
    const left = (iso?: string) => {
      if (!iso) return null;
      const ms = new Date(iso).getTime() - Date.now();
      if (ms < 0) return { t: 'Đã hết hạn', c: 'mu' };
      const h = ms / 3600e3;
      return h < 24 ? { t: `Còn ${Math.max(1, Math.floor(h))} giờ`, c: 'r' } : { t: `Còn ${Math.floor(h / 24)} ngày`, c: h < 72 ? 'a' : 'g' };
    };
    const mySchools = schools.filter(x => mine(x));
    const createClass = async () => {
      if (!newCls.name.trim() || !newCls.schoolId) return;
      try { await saveClass({ schoolId: newCls.schoolId, name: newCls.name.trim(), description: '' }); setPSheet(null); setNewCls({ schoolId: '', name: '' }); loadData(); addNotification('Đã tạo lớp học mới', 'success'); }
      catch { addNotification('Lỗi khi tạo lớp học', 'error'); }
    };
    const newSchool = async (): Promise<string | null> => {
      const name = await askText({ title: 'Thêm trường', placeholder: 'Tên trường' });
      if (!name || !name.trim()) return null;
      try { const sc: any = await saveSchool({ name: name.trim(), description: '' }); loadData(); addNotification('Đã tạo trường học mới', 'success'); return sc?.id || null; }
      catch { addNotification('Lỗi khi tạo trường học', 'error'); return null; }
    };
    const rename = async (kind: 'class' | 'school', x: any) => {
      const name = await askText({ title: kind === 'class' ? 'Đổi tên lớp' : 'Đổi tên trường', defaultValue: x.name });
      if (!name || !name.trim() || name.trim() === x.name) return;
      try { if (kind === 'class') await saveClass({ ...x, name: name.trim() }); else await saveSchool({ ...x, name: name.trim() }); loadData(); addNotification('Đã đổi tên', 'success'); }
      catch { addNotification('Lỗi khi đổi tên', 'error'); }
    };
    const sel = pSheet && typeof pSheet === 'object' ? pSheet : null;
    return (
      <div>
        {sharing && currentUser && (
          <ShareDialog type={sharing.type} resourceId={sharing.id} resourceTitle={sharing.title} ownerId={sharing.ownerId}
            currentUser={currentUser} canManage={sharing.canManage} onClose={() => setSharing(null)} />
        )}
        {(() => {
          // Đầu trang giống Trang chủ: ảnh nền theo mùa của admin, tên chức năng, số liệu nhanh, 4 nút tròn.
          const totalSt = scoped.reduce((n, c) => n + (classStats[c.id]?.students || 0), 0);
          const totalPending = scoped.reduce((n, c) => n + (classStats[c.id]?.pending || 0), 0);
          const ui = { ...phoneUi(phone.settings), title: `${scoped.length} lớp · ${totalSt} sinh viên`, desc: totalPending ? `${totalPending} bài đang chờ chấm, bấm Chờ chấm để xem lớp cần chấm.` : 'Bài đã nộp đều được chấm hết.', titleOn: true, descOn: true };
          const acts = [
            ...(canCreate ? [{ key: 'new', label: 'Lớp mới', icon: Plus, run: () => { setNewCls({ schoolId: pSchool || mySchools[0]?.id || '', name: '' }); setPSheet('new'); } }] : []),
            ...(onImport && canImportEdu ? [{ key: 'import', label: 'Import', icon: Upload, run: () => onImport() }] : []),
            { key: 'pending', label: 'Chờ chấm', icon: ClipboardList, run: () => { setPQuick(pQuick === 'pending' ? '' : 'pending'); document.getElementById('pk-cls-list')?.scrollIntoView({ behavior: 'smooth' }); } },
            { key: 'more', label: 'Khác', icon: MoreVertical, run: () => setPSheet('menu') },
          ].slice(0, 4);
          // Lưới chức năng liên quan đến lớp học
          const can = (id: string) => canUseModule(currentUser, id) && phoneMode(id, phone.settings) !== 'hidden';
          const meta = (id: string) => MODULE_REGISTRY.find(m => m.id === id);
          const tiles = [
            { key: 'bank', id: 'edu_bank', label: 'Bài tập', icon: BookMarked, on: !!onOpenBank && can('edu_bank'), run: () => onOpenBank?.() },
            { key: 'exam', id: 'edu_exam', label: 'Kiểm tra', icon: FileCheck2, on: !!onOpenExams && can('edu_exam'), run: () => onOpenExams?.() },
            { key: 'grade', id: 'edu_grade', label: 'Nhập điểm', icon: ClipboardList, on: !!onOpenGrades && can('edu_grade'), run: () => phone.open('edu_grade'), lap: phoneMode('edu_grade', phone.settings) === 'laptop' },
            { key: 'el', id: 'elearning', label: 'Giáo trình', icon: BookOpen, on: can('elearning'), run: () => phone.open('elearning') },
            { key: 'sl', id: 'slides', label: 'Bài giảng', icon: meta('slides')?.icon || BookOpen, on: can('slides'), run: () => phone.open('slides') },
            { key: 'qb', id: 'edu_question_bank', label: 'Câu hỏi', icon: meta('edu_question_bank')?.icon || BookOpen, on: can('edu_question_bank'), run: () => phone.open('edu_question_bank') },
            { key: 'school', id: '', label: 'Thêm trường', icon: School, on: canCreate, run: () => { newSchool(); } },
            { key: 'qr', id: 'qr_codes', label: 'Mã QR', icon: meta('qr_codes')?.icon || School, on: can('qr_codes'), run: () => phone.open('qr_codes') },
          ].filter(t => t.on).slice(0, 8);
          return (
            <div style={{ margin: '-12px -12px 0' }}>
              <PhoneTop settings={phone.settings} ui={ui} acts={acts}
                nav={{ title: 'Lớp học', onBack: () => phone.open('dashboard'), onHome: () => phone.open('dashboard') }} />
              {tiles.length > 0 && (
                <div className="ph-grid">
                  <div className="ph-apps">
                    {tiles.map(t => { const I = t.icon; return (
                      <button key={t.key} type="button" className="ph-app" onClick={t.run}>
                        {t.lap && <span className="lap"><Monitor /></span>}
                        <span className="ph-ico" style={{ background: 'var(--ph-brand-light)', color: 'var(--ph-brand-hover)' }}><I /></span><span>{t.label}</span>
                      </button>
                    ); })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        <div id="pk-cls-list" className="pk-cls-sec">
          <PhoneSeg tabs={[{ id: 'mine', label: 'Lớp của tôi' }, { id: 'shared', label: `Được chia sẻ${classes.some(c => !mine(c)) ? ` (${classes.filter(c => !mine(c)).length})` : ''}` }]} active={pScope} onTab={t => { setPScope(t as any); setPSchool(''); }} />
          <div className="pk-srch" style={{ marginTop: 10 }}>
            <Search /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm lớp, trường..." enterKeyHint="search" />
            {searchTerm && <button type="button" className="clr" aria-label="Xoá tìm kiếm" onClick={() => setSearchTerm('')}><X /></button>}
          </div>
        </div>
        <PhoneChips>
          <PhoneChip caret on={!!pSchool} onClick={() => setPSheet('school')}>{pSchool ? schoolName(pSchool) : 'Mọi trường'}</PhoneChip>
          <PhoneChip on={pQuick === ''} onClick={() => setPQuick('')}>Tất cả</PhoneChip>
          <PhoneChip on={pQuick === 'pending'} onClick={() => setPQuick('pending')}>Có bài chờ chấm</PhoneChip>
          <PhoneChip on={pQuick === 'soon'} onClick={() => setPQuick('soon')}>Sắp hết hạn</PhoneChip>
        </PhoneChips>
        {list.length === 0 ? <PhoneEmpty icon={GraduationCap} title={classes.length ? 'Không có lớp nào khớp' : 'Chưa có lớp học nào'} sub={!classes.length && canCreate ? 'Bấm Lớp mới để tạo lớp đầu tiên, hoặc Import từ Excel ở nút Khác.' : undefined} /> : (
          // Danh sách gọn theo từng trường: thẻ trắng bo tròn, mỗi lớp 1 dòng có biểu tượng, tên, thông tin phụ, mũi tên.
          // Giữ tay trên 1 dòng để mở thao tác với lớp (cộng tác, đổi tên, xoá).
          <div className="pk-list" style={{ gap: 16 }}>
            {Array.from(new Set(list.map(c => c.schoolId))).map(sid => {
              const sc = schools.find(x => x.id === sid);
              const rows = list.filter(c => c.schoolId === sid);
              return (
                <div key={sid || 'none'}>
                  <div className="pk-grp-h">
                    <span>{sc?.name || schoolName(sid) || 'Chưa có trường'}</span><em>{rows.length} lớp</em>
                    {sc && (mine(sc) || sc.access?.perms.manageMembers) && <button type="button" aria-label="Thao tác với trường" onClick={() => setPSheet({ school: sc })}><MoreVertical /></button>}
                  </div>
                  <div className="pk-grp">
                    {rows.map(c => { const st = classStats[c.id]; const l = left(st?.deadline); const n = st?.students || 0; const canMenu = mine(c) || !!c.access?.perms.manageMembers; return (
                      <div key={c.id} className="pk-li" role="button" tabIndex={0}
                        onClick={() => { if (lpFired.current) { lpFired.current = false; return; } onSelectClass(c.id); }}
                        onContextMenu={e => { if (!canMenu) return; e.preventDefault(); setPSheet({ cls: c }); }}
                        onTouchStart={() => { if (!canMenu) return; lpFired.current = false; lpTimer.current = window.setTimeout(() => { lpFired.current = true; setPSheet({ cls: c }); }, 550); }}
                        onTouchMove={() => window.clearTimeout(lpTimer.current)} onTouchEnd={() => window.clearTimeout(lpTimer.current)}>
                        <span className="ic"><GraduationCap /></span>
                        <span className="m">
                          <b>{c.name}</b>
                          <small>{st ? `${n} sinh viên${st.assignments != null ? ` · ${st.assignments} bài tập` : ''}` : 'Đang tải...'}{!mine(c) ? ' · Được chia sẻ' : ''}</small>
                          {st?.assignmentTitle && (
                            <>
                              <small className="as">
                                <span className="t">{st.assignmentTitle}</span>
                                <span>{st.submitted}/{n} đã nộp{l ? ` · ${l.t.toLowerCase()}` : ''}</span>
                              </small>
                              <span className="pk-pbar" aria-label={`Đã nộp ${st.submitted} trên ${n}`}><i style={{ width: `${n ? Math.min(100, st.submitted / n * 100) : 0}%` }} /></span>
                            </>
                          )}
                        </span>
                        {!!st?.pending && canGrade && st.assignmentId && st.gradeColumnId && onGrade ? (
                          <button type="button" className="pd" onClick={e => { e.stopPropagation(); onGrade(c.id, st.assignmentId!, st.gradeColumnId!); }}>Chấm {st.pending}</button>
                        ) : null}
                        <ChevronRight className="cv" />
                      </div>
                    ); })}
                  </div>
                </div>
              );
            })}
            <p className="pk-hint2">Giữ tay trên 1 lớp để mở thao tác cộng tác, đổi tên, xoá.</p>
          </div>
        )}

        {pSheet === 'school' && (
          <PhoneSheet title="Chọn trường" onClose={() => setPSheet(null)}>
            <div className="pk-pick">
              <button type="button" className={!pSchool ? 'on' : ''} onClick={() => { setPSchool(''); setPSheet(null); }}><span>Mọi trường</span><em>{scoped.length}</em></button>
              {schools.filter(x => scoped.some(c => c.schoolId === x.id) || (pScope === 'mine' && mine(x))).map(x => (
                <button key={x.id} type="button" className={pSchool === x.id ? 'on' : ''} onClick={() => { setPSchool(x.id); setPSheet(null); }}><span>{x.name}</span><em>{scoped.filter(c => c.schoolId === x.id).length}</em></button>
              ))}
            </div>
          </PhoneSheet>
        )}
        {pSheet === 'menu' && <PhoneMenuSheet title="Thao tác" onClose={() => setPSheet(null)} items={[
          { key: 'import', label: 'Import tạo lớp', sub: 'Từ tệp Excel danh sách sinh viên', icon: Upload, hidden: !(onImport && canImportEdu), onClick: () => onImport?.() },
          { key: 'school', label: 'Thêm trường', icon: School, hidden: !canCreate, onClick: () => { newSchool(); } },
          { key: 'bank', label: 'Ngân hàng bài tập', icon: BookMarked, hidden: !(onOpenBank && canUseModule(currentUser, 'edu_bank')), onClick: () => onOpenBank?.() },
          { key: 'exam', label: 'Kiểm tra trắc nghiệm', icon: FileCheck2, hidden: !(onOpenExams && canUseModule(currentUser, 'edu_exam')), onClick: () => onOpenExams?.() },
          { key: 'grade', label: 'Nhập điểm hàng loạt', sub: phoneMode('edu_grade', phone.settings) === 'laptop' ? 'Nên làm trên máy tính' : undefined, icon: ClipboardList, hidden: !(onOpenGrades && canUseModule(currentUser, 'edu_grade')), onClick: () => phone.open('edu_grade') },
        ]} />}
        {sel && 'cls' in sel && (() => { const c = sel.cls; return <PhoneMenuSheet title={c.name} sub={schoolName(c.schoolId)} onClose={() => setPSheet(null)} items={[
          { key: 'open', label: 'Mở lớp', icon: ChevronRight, onClick: () => onSelectClass(c.id) },
          { key: 'share', label: 'Cộng tác', sub: 'Thêm người cùng chấm, giao bài', icon: UserPlus, hidden: !(mine(c) || c.access?.perms.manageMembers), onClick: () => setSharing({ type: 'edu_class', id: c.id, title: c.name, ownerId: c.ownerId || currentUser?.id, canManage: true }) },
          { key: 'rename', label: 'Đổi tên lớp', icon: Edit2, hidden: !(canEdit && mine(c)), onClick: () => rename('class', c) },
          { key: 'del', label: 'Xoá lớp', icon: Trash2, danger: true, hidden: !(canDelete && mine(c)), onClick: () => handleDeleteClass(c) },
        ]} />; })()}
        {sel && 'school' in sel && (() => { const sc = sel.school; return <PhoneMenuSheet title={sc.name} onClose={() => setPSheet(null)} items={[
          { key: 'add', label: 'Thêm lớp vào trường này', icon: Plus, hidden: !(canCreate && mine(sc)), onClick: () => { setNewCls({ schoolId: sc.id, name: '' }); setPSheet('new'); } },
          { key: 'share', label: 'Cộng tác', icon: UserPlus, onClick: () => setSharing({ type: 'edu_school', id: sc.id, title: sc.name, ownerId: sc.ownerId || currentUser?.id, canManage: true }) },
          { key: 'rename', label: 'Đổi tên trường', icon: Edit2, hidden: !(canEdit && mine(sc)), onClick: () => rename('school', sc) },
          { key: 'del', label: 'Xoá trường', icon: Trash2, danger: true, hidden: !(canDelete && mine(sc)), onClick: () => handleDeleteSchool(sc) },
        ]} />; })()}
        {pSheet === 'new' && (
          <PhoneSheet title="Lớp mới" sub="Tạo lớp trống, sau đó thêm sinh viên trong lớp. Muốn nhập cả danh sách thì dùng Import tạo lớp." onClose={() => setPSheet(null)}
            footer={<><button type="button" className="ph-btn ghost" onClick={() => setPSheet(null)}>Huỷ</button><button type="button" className="ph-btn" style={{ flex: 2 }} disabled={!newCls.name.trim() || !newCls.schoolId} onClick={createClass}>Tạo lớp</button></>}>
            <div className="pk-form">
              <label>Trường</label>
              <div className="pk-chips" style={{ margin: '-4px 0 0', padding: 0, flexWrap: 'wrap' }}>
                {mySchools.map(x => <PhoneChip key={x.id} on={newCls.schoolId === x.id} onClick={() => setNewCls(v => ({ ...v, schoolId: x.id }))}>{x.name}</PhoneChip>)}
                <PhoneChip onClick={async () => { const id = await newSchool(); if (id) setNewCls(v => ({ ...v, schoolId: id })); }}>+ Trường mới</PhoneChip>
              </div>
              <label>Tên lớp<input value={newCls.name} onChange={e => setNewCls(v => ({ ...v, name: e.target.value }))} placeholder="Ví dụ Thiết kế đồ hoạ K24" onKeyDown={e => { if (e.key === 'Enter') createClass(); }} /></label>
            </div>
          </PhoneSheet>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {sharing && currentUser && (
        <ShareDialog type={sharing.type} resourceId={sharing.id} resourceTitle={sharing.title} ownerId={sharing.ownerId}
          currentUser={currentUser} canManage={sharing.canManage} onClose={() => setSharing(null)} />
      )}
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
          
          {phone && (
            <div className="w-full">
              <PhoneActionGrid items={[
                ...(onImport && canImportEdu ? [{ key: 'import', label: 'Import tạo lớp', icon: Upload, onClick: onImport, primary: true }] : []),
                ...(canCreate ? [{ key: 'school', label: 'Thêm trường', icon: Plus, onClick: () => { setIsCreatingSchool(true); setNewForm({ name: '', description: '' }); } }] : []),
                ...(onOpenBank && canUseModule(currentUser, 'edu_bank') ? [{ key: 'bank', label: 'Ngân hàng bài tập', icon: BookMarked, onClick: onOpenBank }] : []),
                ...(onOpenExams && canUseModule(currentUser, 'edu_exam') ? [{ key: 'exam', label: 'Kiểm tra', icon: FileCheck2, onClick: onOpenExams }] : []),
                ...(onOpenGrades && canUseModule(currentUser, 'edu_grade') ? [{ key: 'grade', label: 'Nhập điểm', icon: ClipboardList, onClick: () => phone.open('edu_grade'), laptop: phoneMode('edu_grade', phone.settings) === 'laptop' }] : []),
              ]} />
            </div>
          )}
          {!phone && canCreate && (
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
          )}

          {!phone && onOpenBank && canUseModule(currentUser, 'edu_bank') && (
            <button
              onClick={onOpenBank}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-50 transition-all uppercase tracking-wider"
            >
              <BookMarked className="w-4 h-4 text-brand" />
              <span>Ngân hàng bài tập</span>
            </button>
          )}

          {!phone && onOpenGrades && canUseModule(currentUser, 'edu_grade') && (
            <button
              onClick={onOpenGrades}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-50 transition-all uppercase tracking-wider"
            >
              <ClipboardList className="w-4 h-4 text-brand" />
              <span>Nhập điểm</span>
            </button>
          )}

          {!phone && onOpenExams && canUseModule(currentUser, 'edu_exam') && (
            <button
              onClick={onOpenExams}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-50 transition-all uppercase tracking-wider"
            >
              <FileCheck2 className="w-4 h-4 text-brand" />
              <span>Kiểm tra</span>
            </button>
          )}

          {!phone && onImport && canImportEdu && (
            <button
              onClick={onImport}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded-2xl text-[11px] font-bold transition-all shadow-lg shadow-brand/20 uppercase tracking-wider"
            >
              <Upload className="w-4 h-4" />
              <span>Import tạo lớp</span>
            </button>
          )}
        </div>
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

      {/* Form thêm lớp học mới cho một trường. Trước đây nút Thêm lớp không mở được form nào. */}
      {isCreatingClassForSchool && (
        <div className="bg-white border border-slate-200 p-6 rounded-3xl animate-fadeIn space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Thêm lớp học mới{(() => { const s = schools.find(sc => sc.id === isCreatingClassForSchool); return s ? ` cho ${s.name}` : ''; })()}</h3>
            <button onClick={() => setIsCreatingClassForSchool(null)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              autoFocus
              placeholder="Tên lớp học..."
              value={newForm.name}
              onChange={e => setNewForm({ ...newForm, name: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateClass(isCreatingClassForSchool); }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-0 rounded-xl px-4 py-3 text-sm font-medium"
            />
            <input
              type="text"
              placeholder="Mô tả..."
              value={newForm.description}
              onChange={e => setNewForm({ ...newForm, description: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateClass(isCreatingClassForSchool); }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-0 rounded-xl px-4 py-3 text-sm font-medium"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsCreatingClassForSchool(null)} className="px-6 py-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Hủy</button>
            <button onClick={() => handleCreateClass(isCreatingClassForSchool)} className="px-8 py-2 bg-brand text-white rounded-xl text-[11px] font-bold uppercase tracking-wider">Xác nhận</button>
          </div>
        </div>
      )}

      {/* Form sửa trường hoặc lớp. Trước đây nút Sửa chỉ đặt state mà không có form nào hiện ra. */}
      {(editingSchool || editingClass) && (() => {
        const isSchool = !!editingSchool;
        const close = () => { setEditingSchool(null); setEditingClass(null); };
        const save = () => (isSchool ? handleSaveSchool() : handleSaveClass());
        const title = isSchool ? `Sửa trường ${editingSchool?.name || ''}` : `Sửa lớp ${editingClass?.name || ''}`;
        return (
          <div className="bg-white border border-slate-200 p-6 rounded-3xl animate-fadeIn space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider truncate pr-4">{title}</h3>
              <button onClick={close} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                autoFocus
                placeholder={isSchool ? 'Tên trường học...' : 'Tên lớp học...'}
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') save(); }}
                className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-0 rounded-xl px-4 py-3 text-sm font-medium"
              />
              <input
                type="text"
                placeholder="Mô tả..."
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') save(); }}
                className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-0 rounded-xl px-4 py-3 text-sm font-medium"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={close} className="px-6 py-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Hủy</button>
              <button onClick={save} disabled={!editForm.name.trim()} className="px-8 py-2 bg-brand text-white rounded-xl text-[11px] font-bold uppercase tracking-wider disabled:opacity-50">Lưu thay đổi</button>
            </div>
          </div>
        );
      })()}

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
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-light text-brand rounded-lg flex items-center justify-center">
                    <School className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">{school.name}</h2>
                  {!mine(school) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Được chia sẻ</span>}

                  {(mine(school) || !!school.access?.perms.manageMembers) ? (
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
                        {(mine(school) || school.access?.perms.manageMembers) && <button onClick={() => setSharing({ type: 'edu_school', id: school.id, title: school.name, ownerId: school.ownerId || currentUser?.id, canManage: true })} className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><UserPlus className="w-3.5 h-3.5" /> Cộng tác</button>}
                        {canEdit && mine(school) && <button onClick={() => { setEditingSchool(school); setEditForm({ name: school.name, description: school.description || '' }); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><Edit2 className="w-3.5 h-3.5" /> Sửa</button>}
                        {canDelete && mine(school) && <button onClick={() => handleDeleteSchool(school)} className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><Trash2 className="w-3.5 h-3.5" /> Xóa</button>}
                      </div>
                    )}
                  </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  {canCreate && mine(school) && (
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
                  )}
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
                        {!mine(clazz) && <span className="mr-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Được chia sẻ</span>}
                        {(mine(clazz) || !!clazz.access?.perms.manageMembers) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === clazz.id ? null : clazz.id);
                          }}
                          className="p-1 text-slate-300 hover:text-slate-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        )}
                        {activeDropdownId === clazz.id && (
                          <div className="absolute right-4 top-9 bg-white border border-slate-100 rounded-xl shadow-xl p-1 z-30 min-w-[140px]" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setActiveDropdownId(null); setSharing({ type: 'edu_class', id: clazz.id, title: clazz.name, ownerId: clazz.ownerId || currentUser?.id, canManage: true }); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><UserPlus className="w-3.5 h-3.5" /> Cộng tác</button>
                            {canEdit && mine(clazz) && <button onClick={() => { setEditingClass(clazz); setEditForm({ name: clazz.name, description: clazz.description || '' }); }} className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><Edit2 className="w-3.5 h-3.5" /> Sửa</button>}
                            {canDelete && mine(clazz) && <button onClick={() => handleDeleteClass(clazz)} className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 uppercase tracking-wider"><Trash2 className="w-3.5 h-3.5" /> Xóa</button>}
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
                    </div>

                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Users className="w-3.5 h-3.5" />
                          <span>{classStats[clazz.id]?.students ?? '-'} sinh viên</span>
                        </div>
                        {(!mine(clazz) || (classCollabs[clazz.id] || []).length > 0) && (
                          <span onClick={e => e.stopPropagation()}><AvatarStack people={[{ id: clazz.ownerId }, ...(classCollabs[clazz.id] || [])]} size="xs" singleWithName={false} /></span>
                        )}
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
