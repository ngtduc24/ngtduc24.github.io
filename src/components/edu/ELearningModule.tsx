import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, LayoutGrid, List as ListIcon, Edit2, Eye, Copy, Send, Trash2, Globe, Lock,
  ArrowLeft, ArrowUp, ArrowDown, Loader2, X, Check, BookOpen, Users, Link2, QrCode, FileText,
  Upload, RotateCcw, FileSpreadsheet, ChevronRight, GraduationCap, Image as ImageIconEl
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UserAccount } from '../../types';
import { EduSubject, EduClass } from '../../types/edu';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import { getSubjects, saveSubject, getClasses, getClassUsers, setEduAuthContext } from '../../lib/edu';
import {
  ELLesson, ELSection, ELResource,
  getMyLessons, getPublicLessons, getPublicSubjectCounts, getLesson, createLesson, updateLesson,
  softDeleteLesson, restoreLesson, purgeLesson, getTrashLessons,
  getSections, createSection, updateSection, deleteSection, reorderSections,
  getResources, addResource, uploadResource, updateResource, deleteResource,
  copyPublicLesson, getLessonClasses, setLessonClasses, getSectionViews, stripHtml,
} from '../../lib/elearning';
import QuizRichText from './QuizRichText';
import MediaSourcePicker from '../MediaSourcePicker';

interface Props { currentUser: UserAccount; onExit?: () => void; }
type View = 'list' | 'editor' | 'assign' | 'progress' | 'trash';
type Tab = 'mine' | 'public';

// Mở trang xem bài giảng ở chế độ riêng (link riêng). Điều hướng ngay trong tab
// hiện tại để chạy ổn định trên di động (mở tab mới hay bị trình duyệt chặn).
const openLessonView = (id: string) => { window.location.href = `${window.location.origin}${window.location.pathname}?elview=${id}`; };

export default function ELearningModule({ currentUser, onExit }: Props) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<Tab>('mine');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<EduSubject[]>([]);

  useEffect(() => { setEduAuthContext(currentUser?.id ?? null, currentUser?.role === 'admin'); }, [currentUser]);
  useEffect(() => { getSubjects().then(setSubjects).catch(() => {}); }, []);

  const openEditor = (id: string) => { setActiveLessonId(id); setView('editor'); };
  const openAssign = (id: string) => { setActiveLessonId(id); setView('assign'); };
  const openProgress = (id: string) => { setActiveLessonId(id); setView('progress'); };

  if (view === 'editor' && activeLessonId)
    return <LessonEditor lessonId={activeLessonId} subjects={subjects} currentUser={currentUser} onBack={() => setView('list')} onAssign={() => openAssign(activeLessonId)} />;
  if (view === 'assign' && activeLessonId)
    return <AssignScreen lessonId={activeLessonId} onBack={() => setView('list')} onProgress={() => openProgress(activeLessonId)} />;
  if (view === 'progress' && activeLessonId)
    return <ProgressScreen lessonId={activeLessonId} onBack={() => setView('assign')} />;
  if (view === 'trash')
    return <TrashScreen onBack={() => setView('list')} />;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Banner đầu trang có nút quay ra, bố cục chữ giống banner Tạo AR */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        {onExit && (
          <button onClick={onExit} title="Quay lại trang chủ" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-brand-light hover:text-brand">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand"><BookOpen className="h-6 w-6" /></span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">E-Learning</h1>
          <p className="text-sm font-medium text-slate-500">Soạn, lưu trữ và chia sẻ bài giảng theo môn cho lớp học.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
          <button onClick={() => setTab('mine')} className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${tab === 'mine' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Kho của tôi</button>
          <button onClick={() => setTab('public')} className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${tab === 'public' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Kho chung</button>
        </div>
        {tab === 'mine' && (
          <button onClick={() => setView('trash')} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-500 hover:text-brand hover:border-brand/30">
            <Trash2 className="w-3.5 h-3.5" /> Thùng rác
          </button>
        )}
      </div>

      {tab === 'mine'
        ? <MyLessons subjects={subjects} currentUser={currentUser} onEdit={openEditor} onAssign={openAssign} />
        : <PublicLibrary subjects={subjects} currentUser={currentUser} onCopied={openEditor} />}
    </div>
  );
}

// ============================ KHO CỦA TÔI ============================
function MyLessons({ subjects, currentUser, onEdit, onAssign }: { subjects: EduSubject[]; currentUser: UserAccount; onEdit: (id: string) => void; onAssign: (id: string) => void; }) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [lessons, setLessons] = useState<ELLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'grid' | 'table'>('grid');
  const [creating, setCreating] = useState(false);
  const isAdmin = currentUser.role === 'admin';
  const mayPublic = isAdmin || !!currentUser.canElearningPublic;
  const mayAssign = isAdmin || !!currentUser.canElearningAssign;

  const load = useCallback(async () => {
    setLoading(true);
    try { setLessons(await getMyLessons({ subjectId: subjectId || undefined, status: (status as any) || undefined, search })); }
    catch (e: any) { addNotification('Lỗi tải bài giảng: ' + (e.message || e), 'error'); }
    finally { setLoading(false); }
  }, [subjectId, status, search, addNotification]);
  useEffect(() => { load(); }, [load]);

  const subjName = (id?: string | null) => subjects.find(s => s.id === id)?.name || 'Chưa chọn môn';

  const togglePublic = async (l: ELLesson) => {
    if (!mayPublic) { addNotification('Tài khoản chưa được cấp quyền công khai lên kho chung.', 'warning'); return; }
    if (!l.is_public) {
      if (l.status !== 'published') { addNotification('Cần xuất bản bài giảng trước khi công khai.', 'warning'); return; }
      const ok = await confirm({ title: 'Công khai bài giảng', message: 'Bài giảng sẽ hiển thị với mọi người dùng khác và họ được sao chép về kho riêng. Tiếp tục?', confirmText: 'Công khai', cancelText: 'Hủy' });
      if (!ok) return;
    }
    try { await updateLesson(l.id, { is_public: !l.is_public }); load(); addNotification(l.is_public ? 'Đã tắt công khai.' : 'Đã công khai bài giảng.', 'success'); }
    catch (e: any) { addNotification('Lỗi: ' + (e.message || e), 'error'); }
  };

  const duplicate = async (l: ELLesson) => {
    try { const id = await copyPublicLesson(l.id, currentUser.fullName); addNotification('Đã nhân bản.', 'success'); onEdit(id); }
    catch (e: any) { addNotification('Lỗi nhân bản: ' + (e.message || e), 'error'); }
  };

  const copyLink = (l: ELLesson) => {
    const link = `${window.location.origin}${window.location.pathname}?elesson=${l.share_token}`;
    navigator.clipboard?.writeText(link); addNotification('Đã sao chép liên kết.', 'success');
  };

  const remove = async (l: ELLesson) => {
    const ok = await confirm({ title: 'Xóa bài giảng', message: l.is_public ? `Bài giảng đang công khai và đã có ${l.copy_count} lượt sao chép. Chuyển vào Thùng rác?` : 'Chuyển bài giảng vào Thùng rác? Có thể khôi phục trong 30 ngày.', confirmText: 'Xóa', cancelText: 'Hủy', danger: true } as any);
    if (!ok) return;
    try { await softDeleteLesson(l.id); load(); addNotification('Đã chuyển vào Thùng rác.', 'success'); }
    catch (e: any) { addNotification('Lỗi xóa: ' + (e.message || e), 'error'); }
  };

  return (
    <div className="space-y-4">
      {/* Thanh lọc */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên bài giảng..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-brand" />
        </div>
        <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-brand">
          <option value="">Tất cả môn học</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-brand">
          <option value="">Mọi trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="published">Đã xuất bản</option>
          <option value="public">Đã công khai</option>
        </select>
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button onClick={() => setMode('grid')} className={`rounded-lg p-1.5 ${mode === 'grid' ? 'bg-white text-brand shadow-sm' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setMode('table')} className={`rounded-lg p-1.5 ${mode === 'table' ? 'bg-white text-brand shadow-sm' : 'text-slate-400'}`}><ListIcon className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover">
          <Plus className="w-4 h-4" /> Tạo bài giảng mới
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải...</div>
      ) : lessons.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">Chưa có bài giảng nào</p>
          <p className="mt-1 text-xs text-slate-400">Bấm Tạo bài giảng mới để bắt đầu.</p>
        </div>
      ) : mode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {lessons.map(l => (
            <div key={l.id} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-brand/30 transition-all">
              <div onClick={() => openLessonView(l.id)} title="Bấm để xem bài giảng" className="h-28 cursor-pointer bg-slate-100 bg-cover bg-center" style={l.cover_url ? { backgroundImage: `url(${l.cover_url})` } : undefined}>
                {!l.cover_url && <div className="flex h-full items-center justify-center text-slate-300"><BookOpen className="h-8 w-8" /></div>}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 onClick={() => openLessonView(l.id)} className="cursor-pointer text-[13px] font-black text-slate-800 leading-tight line-clamp-2 hover:text-brand">{l.title}</h3>
                  <StatusTag lesson={l} />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{subjName(l.subject_id)}</p>
                <p className="mt-1 text-[10px] text-slate-400">{l.sectionCount ?? 0} phần · cập nhật {fmtDate(l.updated_at)}</p>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-50 pt-3">
                  <IconBtn title="Sửa" onClick={() => onEdit(l.id)}><Edit2 className="w-3.5 h-3.5" /></IconBtn>
                  <IconBtn title="Xem trước" onClick={() => openLessonView(l.id)}><Eye className="w-3.5 h-3.5" /></IconBtn>
                  {mayPublic && <IconBtn title={l.is_public ? 'Tắt công khai' : 'Công khai'} onClick={() => togglePublic(l)}>{l.is_public ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}</IconBtn>}
                  <IconBtn title="Nhân bản" onClick={() => duplicate(l)}><Copy className="w-3.5 h-3.5" /></IconBtn>
                  {mayAssign && <IconBtn title="Giao cho lớp" onClick={() => onAssign(l.id)}><Send className="w-3.5 h-3.5" /></IconBtn>}
                  <IconBtn title="Sao chép liên kết" onClick={() => copyLink(l)}><Link2 className="w-3.5 h-3.5" /></IconBtn>
                  <IconBtn title="Xóa" danger onClick={() => remove(l)}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/40 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Tên bài giảng</th><th className="px-4 py-3">Môn học</th>
                <th className="px-4 py-3 text-center">Phần</th><th className="px-4 py-3 text-center">Tài nguyên</th>
                <th className="px-4 py-3 text-center">Công khai</th><th className="px-4 py-3 text-center">Lượt sao chép</th>
                <th className="px-4 py-3">Cập nhật</th><th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lessons.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/40">
                  <td className="px-4 py-3 font-bold text-slate-800">{l.title}</td>
                  <td className="px-4 py-3 text-slate-500">{subjName(l.subject_id)}</td>
                  <td className="px-4 py-3 text-center">{l.sectionCount ?? 0}</td>
                  <td className="px-4 py-3 text-center">{l.resourceCount ?? 0}</td>
                  <td className="px-4 py-3 text-center"><StatusTag lesson={l} /></td>
                  <td className="px-4 py-3 text-center">{l.copy_count}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(l.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Sửa" onClick={() => onEdit(l.id)}><Edit2 className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Xem trước" onClick={() => openLessonView(l.id)}><Eye className="w-3.5 h-3.5" /></IconBtn>
                      {mayPublic && <IconBtn title={l.is_public ? 'Tắt công khai' : 'Công khai'} onClick={() => togglePublic(l)}>{l.is_public ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}</IconBtn>}
                      {mayAssign && <IconBtn title="Giao cho lớp" onClick={() => onAssign(l.id)}><Send className="w-3.5 h-3.5" /></IconBtn>}
                      <IconBtn title="Sao chép liên kết" onClick={() => copyLink(l)}><Link2 className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Xóa" danger onClick={() => remove(l)}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateDialog subjects={subjects} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); onEdit(id); }} ownerName={currentUser.fullName} />}
    </div>
  );
}

function CreateDialog({ subjects, onClose, onCreated, ownerName }: { subjects: EduSubject[]; onClose: () => void; onCreated: (id: string) => void; ownerName: string; }) {
  const { addNotification } = useNotifications();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);
  // Danh sách môn cục bộ để khi tạo nhanh một môn mới ngay trong cửa sổ thì hiện ra liền.
  const [subs, setSubs] = useState<EduSubject[]>(subjects);
  const [adding, setAdding] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);

  const submit = async () => {
    if (!title.trim()) { addNotification('Nhập tên bài giảng.', 'warning'); return; }
    setSaving(true);
    try { const l = await createLesson({ title: title.trim(), subject_id: subjectId || null, owner_name: ownerName }); onCreated(l.id); }
    catch (e: any) { addNotification('Lỗi tạo bài giảng: ' + (e.message || e), 'error'); setSaving(false); }
  };

  const addSubject = async () => {
    const name = newSubjectName.trim();
    if (!name) return;
    setSavingSubject(true);
    try {
      const saved = await saveSubject({ name });
      setSubs(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setSubjectId(saved.id);
      setNewSubjectName('');
      setAdding(false);
      addNotification('Đã thêm môn học', 'success');
    } catch (e: any) {
      addNotification('Lỗi thêm môn: ' + (e.message || e), 'error');
    } finally {
      setSavingSubject(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Tạo bài giảng mới">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Tên bài giảng</label>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="Ví dụ: Nhập môn Truyền thông đa phương tiện" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Môn học</label>
          {adding ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addSubject(); if (e.key === 'Escape') { setAdding(false); setNewSubjectName(''); } }} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand" placeholder="Nhập tên môn học mới" />
              <button onClick={addSubject} disabled={savingSubject || !newSubjectName.trim()} title="Lưu môn học" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white hover:bg-brand-hover disabled:opacity-50">{savingSubject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</button>
              <button onClick={() => { setAdding(false); setNewSubjectName(''); }} title="Hủy" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand">
                <option value="">Chọn môn học</option>
                {subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={() => setAdding(true)} title="Thêm môn học mới" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-brand hover:text-brand"><Plus className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200">Hủy</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tạo và soạn</button>
      </div>
    </Modal>
  );
}

// ============================ TRÌNH SOẠN ============================
function LessonEditor({ lessonId, subjects, currentUser, onBack, onAssign }: { lessonId: string; subjects: EduSubject[]; currentUser: UserAccount; onBack: () => void; onAssign: () => void; }) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [lesson, setLesson] = useState<ELLesson | null>(null);
  const [sections, setSections] = useState<ELSection[]>([]);
  const [resources, setResources] = useState<ELResource[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const dirty = useRef<Record<string, { title: string; content: string }>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const [l, secs, res] = await Promise.all([getLesson(lessonId), getSections(lessonId), getResources(lessonId)]);
    setLesson(l); setSections(secs); setResources(res);
    setActiveSection(prev => prev && secs.some(s => s.id === prev) ? prev : (secs[0]?.id ?? null));
  }, [lessonId]);
  useEffect(() => { load(); }, [load]);

  // Lưu nháp tự động sau mỗi 20 giây kể từ lần gõ cuối.
  const flush = useCallback(async (silent = true) => {
    const entries = Object.entries(dirty.current);
    if (!entries.length) return;
    setSaving(true);
    try {
      await Promise.all(entries.map(([id, v]) => updateSection(id, { title: v.title, content: v.content })));
      dirty.current = {};
      setSavedAt(new Date().toLocaleTimeString('vi-VN'));
      if (!silent) addNotification('Đã lưu bài giảng.', 'success');
    } catch (e: any) { addNotification('Lỗi lưu: ' + (e.message || e), 'error'); }
    finally { setSaving(false); }
  }, [addNotification]);

  const autoTimer = useRef<number | null>(null);
  const markDirty = (id: string, patch: Partial<{ title: string; content: string }>) => {
    const cur = dirty.current[id] || { title: sections.find(s => s.id === id)?.title || '', content: sections.find(s => s.id === id)?.content || '' };
    dirty.current[id] = { ...cur, ...patch };
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } as ELSection : s));
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    autoTimer.current = window.setTimeout(() => flush(true), 20000);
  };
  useEffect(() => () => { if (autoTimer.current) window.clearTimeout(autoTimer.current); }, []);

  const patchLesson = async (patch: Partial<ELLesson>) => {
    if (!lesson) return;
    const optimistic = { ...lesson, ...patch };
    setLesson(optimistic);
    try { const saved = await updateLesson(lesson.id, patch); setLesson(saved); }
    catch (e: any) { addNotification('Lỗi cập nhật: ' + (e.message || e), 'error'); load(); }
  };

  const addSectionNow = async () => {
    const s = await createSection(lessonId, sections.length, `Phần ${sections.length + 1}`);
    setSections(prev => [...prev, s]); setActiveSection(s.id);
  };
  const removeSection = async (id: string) => {
    const count = resources.filter(r => r.section_id === id).length;
    const ok = await confirm({ title: 'Xóa phần nội dung', message: count > 0 ? `Phần này có ${count} tài nguyên đính kèm sẽ bị xóa theo. Tiếp tục?` : 'Xóa phần nội dung này?', confirmText: 'Xóa', cancelText: 'Hủy', danger: true } as any);
    if (!ok) return;
    await deleteSection(id); delete dirty.current[id];
    const rest = sections.filter(s => s.id !== id);
    setSections(rest); setResources(resources.filter(r => r.section_id !== id));
    if (activeSection === id) setActiveSection(rest[0]?.id ?? null);
  };
  const moveSection = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir; if (j < 0 || j >= sections.length) return;
    const arr = [...sections]; [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const reindexed = arr.map((s, i) => ({ ...s, order_index: i }));
    setSections(reindexed);
    await reorderSections(reindexed.map(s => ({ id: s.id, order_index: s.order_index })));
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files || !files.length || !activeSection) { if (!activeSection) addNotification('Chọn một phần nội dung trước khi đính kèm.', 'warning'); return; }
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const r = await uploadResource(lessonId, activeSection, f, resources.length);
        setResources(prev => [...prev, r]);
      }
      addNotification('Đã tải tài nguyên lên.', 'success');
    } catch (e: any) { addNotification('Lỗi tải lên: ' + (e.message || e), 'error'); }
    finally { setUploading(false); }
  };

  const removeResource = async (id: string) => { await deleteResource(id); setResources(resources.filter(r => r.id !== id)); };
  const renameResource = async (id: string, title: string) => { setResources(resources.map(r => r.id === id ? { ...r, title } : r)); await updateResource(id, { title }); };

  const isAdmin = currentUser.role === 'admin';
  const mayPublic = isAdmin || !!currentUser.canElearningPublic;
  const mayAssign = isAdmin || !!currentUser.canElearningAssign;
  const canPublic = !!lesson && lesson.status === 'published' && sections.length > 0 && mayPublic;
  const sectionResources = resources.filter(r => r.section_id === activeSection);
  const sec = sections.find(s => s.id === activeSection) || null;

  if (!lesson) return <div className="py-20 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải...</div>;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => { flush(true); onBack(); }} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900">{lesson.title}</h1>
            <p className="text-[11px] text-slate-400">{savedAt ? `Đã lưu lúc ${savedAt}` : 'Nội dung tự lưu sau 20 giây'}{lesson.source_owner_name ? ` · Nguồn: ${lesson.source_owner_name}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu</span>}
          <button onClick={() => flush(false)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><Check className="h-4 w-4" /> Lưu</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_300px]">
        {/* Cột trái: danh sách phần */}
        <div className="h-fit rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Các phần</span>
            <button onClick={addSectionNow} className="grid h-6 w-6 place-items-center rounded-lg bg-brand-light text-brand hover:bg-brand hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <div className="space-y-1">
            {sections.length === 0 && <p className="px-2 py-4 text-center text-[11px] text-slate-400">Chưa có phần nào.</p>}
            {sections.map((s, i) => (
              <div key={s.id} className={`group flex items-center gap-1 rounded-xl px-2 py-2 ${activeSection === s.id ? 'bg-brand-light' : 'hover:bg-slate-50'}`}>
                <button onClick={() => setActiveSection(s.id)} className="min-w-0 flex-1 text-left">
                  <span className={`block truncate text-[12px] font-bold ${activeSection === s.id ? 'text-brand' : 'text-slate-700'}`}>{i + 1}. {s.title || 'Không tên'}</span>
                </button>
                <button onClick={() => moveSection(i, -1)} className="text-slate-300 hover:text-slate-600"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => moveSection(i, 1)} className="text-slate-300 hover:text-slate-600"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button onClick={() => removeSection(s.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Cột giữa: soạn nội dung */}
        <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          {!sec ? (
            <div className="py-16 text-center text-sm text-slate-400">Thêm hoặc chọn một phần để bắt đầu soạn.</div>
          ) : (
            <>
              <input value={sec.title} onChange={e => markDirty(sec.id, { title: e.target.value })} placeholder="Tiêu đề phần" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-brand" />
              <QuizRichText value={sec.content} onChange={html => markDirty(sec.id, { content: html })} placeholder="Soạn nội dung bài giảng..." />

              {/* Đính kèm tài nguyên */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Tài nguyên đính kèm</span>
                </div>
                <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onPickFiles(e.dataTransfer.files); }} onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center hover:border-brand/40">
                  {uploading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" /> : <Upload className="mx-auto h-5 w-5 text-slate-400" />}
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Kéo thả file vào đây hoặc bấm để chọn</p>
                  <input ref={fileRef} type="file" multiple className="hidden" onChange={e => onPickFiles(e.target.files)} />
                </div>
                <div className="mt-2 space-y-1.5">
                  {sectionResources.map(r => (
                    <div key={r.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2">
                      <FileText className="h-4 w-4 shrink-0 text-brand" />
                      <input value={r.title} onChange={e => renameResource(r.id, e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none" />
                      <a href={r.url || '#'} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand"><Eye className="h-3.5 w-3.5" /></a>
                      <button onClick={() => removeResource(r.id)} className="text-slate-400 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Cột phải: thông tin chung */}
        <div className="h-fit space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400">Thông tin bài giảng</span>
          <Field label="Tên"><input value={lesson.title} onChange={e => setLesson({ ...lesson, title: e.target.value })} onBlur={e => patchLesson({ title: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-brand" /></Field>
          <Field label="Môn học"><select value={lesson.subject_id || ''} onChange={e => patchLesson({ subject_id: e.target.value || null })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-brand"><option value="">Chọn môn</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Mô tả ngắn"><textarea value={lesson.summary || ''} onChange={e => setLesson({ ...lesson, summary: e.target.value })} onBlur={e => patchLesson({ summary: e.target.value })} rows={2} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-brand" /></Field>
          <Field label="Ảnh bìa">
            {lesson.cover_url ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200">
                <img src={lesson.cover_url} alt="Ảnh bìa" className="h-28 w-full object-cover" />
                <div className="absolute right-2 top-2 flex gap-1">
                  <MediaSourcePicker onSelect={(url) => patchLesson({ cover_url: url })} accept="image/*" resourceType="image" folder="elearning-covers" category="E-Learning" label="Đổi" className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-600 shadow hover:bg-white" />
                  <button onClick={() => patchLesson({ cover_url: '' })} className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-rose-500 shadow hover:bg-white">Xóa</button>
                </div>
              </div>
            ) : (
              <MediaSourcePicker onSelect={(url) => patchLesson({ cover_url: url })} accept="image/*" resourceType="image" folder="elearning-covers" category="E-Learning" label="Tải lên hoặc chọn từ thư viện" icon={ImageIconEl} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500 hover:border-brand/40 hover:text-brand" />
            )}
          </Field>
          <Field label="Thẻ phân loại (cách nhau dấu phẩy)"><input value={(lesson.tags || []).join(', ')} onChange={e => setLesson({ ...lesson, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} onBlur={e => patchLesson({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-brand" /></Field>
          <Field label="Thời lượng học (phút)"><input type="number" min={1} value={lesson.duration_minutes || ''} onChange={e => setLesson({ ...lesson, duration_minutes: e.target.value ? Number(e.target.value) : null })} onBlur={e => patchLesson({ duration_minutes: lesson.duration_minutes })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-brand" /></Field>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <ToggleRow label="Xuất bản" on={lesson.status === 'published'} onChange={b => patchLesson({ status: b ? 'published' : 'draft', ...(b ? {} : { is_public: false }) })} />
            <ToggleRow label="Công khai kho chung" on={lesson.is_public} disabled={!canPublic} onChange={async b => {
              if (b) { const ok = await confirm({ title: 'Công khai bài giảng', message: 'Nội dung sẽ hiển thị với mọi người dùng và họ được sao chép về kho riêng. Tiếp tục?', confirmText: 'Công khai', cancelText: 'Hủy' }); if (!ok) return; }
              patchLesson({ is_public: b });
            }} />
            {mayPublic && !canPublic && <p className="text-[10px] text-amber-600">Cần xuất bản và có ít nhất 1 phần nội dung mới công khai được.</p>}
            {!mayPublic && <p className="text-[10px] text-slate-400">Tài khoản chưa được cấp quyền công khai lên kho chung.</p>}
            <ToggleRow label="Cho phép sao chép" on={lesson.allow_copy} onChange={b => patchLesson({ allow_copy: b })} />
            {mayAssign && <ToggleRow label="Giao cho lớp (link + QR)" on={lesson.share_enabled} onChange={b => patchLesson({ share_enabled: b })} />}
          </div>
          {mayAssign && lesson.share_enabled && <button onClick={onAssign} className="w-full rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold text-white hover:bg-brand-hover">Chọn lớp và lấy liên kết</button>}
        </div>
      </div>
    </div>
  );
}

// ============================ KHO CHUNG ============================
function PublicLibrary({ subjects, currentUser, onCopied }: { subjects: EduSubject[]; currentUser: UserAccount; onCopied: (id: string) => void; }) {
  const { addNotification } = useNotifications();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [subjectId, setSubjectId] = useState('');
  const [sort, setSort] = useState<'new' | 'views' | 'copies'>('new');
  const [lessons, setLessons] = useState<ELLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState('');

  useEffect(() => { getPublicSubjectCounts().then(setCounts).catch(() => {}); }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try { setLessons(await getPublicLessons({ subjectId: subjectId || undefined, sort })); }
    catch (e: any) { addNotification('Lỗi tải kho chung: ' + (e.message || e), 'error'); }
    finally { setLoading(false); }
  }, [subjectId, sort, addNotification]);
  useEffect(() => { load(); }, [load]);

  const copy = async (l: ELLesson) => {
    setCopyingId(l.id);
    try { const id = await copyPublicLesson(l.id, currentUser.fullName); addNotification('Đã sao chép về kho của tôi.', 'success'); onCopied(id); }
    catch (e: any) { addNotification('Lỗi sao chép: ' + (e.message || e), 'error'); }
    finally { setCopyingId(''); }
  };

  const subjName = (id?: string | null) => subjects.find(s => s.id === id)?.name || 'Khác';

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      <div className="h-fit rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        <span className="mb-2 block px-2 text-[10px] font-black uppercase text-slate-400">Môn học</span>
        <button onClick={() => setSubjectId('')} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold ${!subjectId ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-50'}`}>
          <span>Tất cả</span><span className="text-[10px] text-slate-400">{Object.values(counts).reduce((a, b) => a + b, 0)}</span>
        </button>
        {subjects.map(s => (
          <button key={s.id} onClick={() => setSubjectId(s.id)} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold ${subjectId === s.id ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-50'}`}>
            <span className="truncate">{s.name}</span><span className="text-[10px] text-slate-400">{counts[s.id] || 0}</span>
          </button>
        ))}
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Sắp xếp</span>
          <select value={sort} onChange={e => setSort(e.target.value as any)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand">
            <option value="new">Mới nhất</option><option value="views">Xem nhiều nhất</option><option value="copies">Sao chép nhiều nhất</option>
          </select>
        </div>
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải...</div>
        ) : lessons.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">Chưa có bài giảng công khai nào trong mục này.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons.map(l => (
              <div key={l.id} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-brand/30 transition-all">
                <button onClick={() => openLessonView(l.id)} className="block text-left h-28 bg-slate-100 bg-cover bg-center" style={l.cover_url ? { backgroundImage: `url(${l.cover_url})` } : undefined}>
                  {!l.cover_url && <div className="flex h-full items-center justify-center text-slate-300"><BookOpen className="h-8 w-8" /></div>}
                </button>
                <div className="flex flex-1 flex-col p-4">
                  <button onClick={() => openLessonView(l.id)} className="text-left"><h3 className="text-[13px] font-black text-slate-800 leading-tight line-clamp-2 group-hover:text-brand">{l.title}</h3></button>
                  <p className="mt-1 text-[11px] text-slate-400">{subjName(l.subject_id)} · {l.author_label || l.owner_name || 'Ẩn danh'}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{l.view_count} lượt xem · {l.copy_count} lượt sao chép</p>
                  <div className="mt-3 flex gap-1.5 border-t border-slate-50 pt-3">
                    <button onClick={() => openLessonView(l.id)} className="flex-1 rounded-lg bg-slate-100 px-2 py-1.5 text-center text-[10px] font-bold text-slate-600 hover:bg-slate-200">Xem</button>
                    {l.allow_copy && <button onClick={() => copy(l)} disabled={copyingId === l.id} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-brand px-2 py-1.5 text-[10px] font-bold text-white hover:bg-brand-hover disabled:opacity-50">{copyingId === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />} Sao chép</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================ GIAO CHO LỚP ============================
function AssignScreen({ lessonId, onBack, onProgress }: { lessonId: string; onBack: () => void; onProgress: () => void; }) {
  const { addNotification } = useNotifications();
  const [lesson, setLesson] = useState<ELLesson | null>(null);
  const [classes, setClasses] = useState<(EduClass & { count?: number })[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [l, cls, assigned] = await Promise.all([getLesson(lessonId), getClasses(), getLessonClasses(lessonId)]);
        setLesson(l);
        const withCount = await Promise.all(cls.map(async c => ({ ...c, count: (await getClassUsers(c.id)).length })));
        setClasses(withCount);
        setSelected(new Set(assigned));
      } catch (e: any) { addNotification('Lỗi tải: ' + (e.message || e), 'error'); }
      finally { setLoading(false); }
    })();
  }, [lessonId, addNotification]);

  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const save = async () => {
    try { await setLessonClasses(lessonId, Array.from(selected)); addNotification('Đã lưu danh sách lớp được giao.', 'success'); }
    catch (e: any) { addNotification('Lỗi lưu: ' + (e.message || e), 'error'); }
  };

  const link = lesson ? `${window.location.origin}${window.location.pathname}?elesson=${lesson.share_token}` : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}&format=png&margin=10`;

  if (loading || !lesson) return <div className="py-20 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải...</div>;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowLeft className="h-4 w-4" /></button>
          <div><h1 className="font-display text-lg font-bold text-slate-900">Giao bài giảng cho lớp</h1><p className="text-[11px] text-slate-400">{lesson.title}</p></div>
        </div>
        <button onClick={onProgress} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><Eye className="h-4 w-4" /> Theo dõi tiến độ</button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Chọn lớp ({selected.size})</span>
            <button onClick={save} className="rounded-xl bg-brand px-4 py-2 text-[11px] font-bold text-white hover:bg-brand-hover">Lưu</button>
          </div>
          <div className="space-y-1.5">
            {classes.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Chưa có lớp nào.</p>}
            {classes.map(c => {
              const on = selected.has(c.id);
              return (
                <button key={c.id} onClick={() => toggle(c.id)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${on ? 'border-brand/30 bg-brand-light' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <span className="flex items-center gap-2">
                    <span className={`grid h-5 w-5 place-items-center rounded-md border ${on ? 'border-brand bg-brand text-white' : 'border-slate-300'}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                    <span className="text-xs font-bold text-slate-700">{c.name}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Users className="h-3.5 w-3.5" /> {c.count ?? 0} SV</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-fit space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400">Liên kết cho sinh viên</span>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{link}</span>
            <button onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-brand-hover">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
          <div className="flex justify-center"><img src={qrUrl} alt="QR bài giảng" className="h-40 w-40 rounded-2xl border border-slate-200 bg-white p-2" /></div>
          <p className="text-center text-[10px] text-slate-400">Sinh viên quét mã hoặc mở liên kết, nhập mã số sinh viên để xem.</p>
        </div>
      </div>
    </div>
  );
}

// ============================ THEO DÕI TIẾN ĐỘ ============================
function ProgressScreen({ lessonId, onBack }: { lessonId: string; onBack: () => void; }) {
  const { addNotification } = useNotifications();
  const [lesson, setLesson] = useState<ELLesson | null>(null);
  const [sections, setSections] = useState<ELSection[]>([]);
  const [rows, setRows] = useState<{ code: string; name: string; viewed: number; last: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [l, secs, views, classIds] = await Promise.all([getLesson(lessonId), getSections(lessonId), getSectionViews(lessonId), getLessonClasses(lessonId)]);
        setLesson(l); setSections(secs);
        const students: { mssv: string; fullName: string }[] = [];
        for (const cid of classIds) { (await getClassUsers(cid)).forEach(u => students.push({ mssv: u.mssv, fullName: u.fullName })); }
        const byCode: Record<string, { count: number; last: string }> = {};
        views.forEach((v: any) => {
          const k = (v.student_code || '').toUpperCase();
          if (!byCode[k]) byCode[k] = { count: 0, last: '' };
          byCode[k].count += 1;
          if (!byCode[k].last || v.viewed_at > byCode[k].last) byCode[k].last = v.viewed_at;
        });
        setRows(students.map(s => {
          const rec = byCode[(s.mssv || '').toUpperCase()];
          return { code: s.mssv, name: s.fullName, viewed: rec?.count || 0, last: rec?.last || '' };
        }));
      } catch (e: any) { addNotification('Lỗi tải tiến độ: ' + (e.message || e), 'error'); }
      finally { setLoading(false); }
    })();
  }, [lessonId, addNotification]);

  const exportExcel = () => {
    const total = sections.length;
    const data = rows.map(r => ({ 'MSSV': r.code, 'Họ và tên': r.name, 'Số phần đã xem': `${r.viewed}/${total}`, 'Xem gần nhất': r.last ? new Date(r.last).toLocaleString('vi-VN') : 'Chưa xem' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tiến độ');
    XLSX.writeFile(wb, `Tien_do_${(lesson?.title || 'bai_giang').replace(/\s+/g, '_')}.xlsx`);
  };

  if (loading) return <div className="py-20 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải...</div>;
  const total = sections.length;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowLeft className="h-4 w-4" /></button>
          <div><h1 className="font-display text-lg font-bold text-slate-900">Theo dõi tiến độ</h1><p className="text-[11px] text-slate-400">{lesson?.title}</p></div>
        </div>
        <button onClick={exportExcel} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-light px-4 py-2 text-[11px] font-black text-brand hover:bg-brand-light"><FileSpreadsheet className="h-4 w-4" /> Xuất Excel</button>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/40 text-[10px] uppercase text-slate-400">
            <tr><th className="px-4 py-3">MSSV</th><th className="px-4 py-3">Họ và tên</th><th className="px-4 py-3 text-center">Đã xem</th><th className="px-4 py-3">Xem gần nhất</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Chưa có lớp được giao hoặc chưa có lượt xem.</td></tr>}
            {rows.map(r => (
              <tr key={r.code} className="hover:bg-slate-50/40">
                <td className="px-4 py-3 font-mono font-bold text-slate-700">{r.code}</td>
                <td className="px-4 py-3 text-slate-700">{r.name}</td>
                <td className="px-4 py-3 text-center"><span className={`font-bold ${r.viewed >= total && total > 0 ? 'text-brand' : 'text-slate-500'}`}>{r.viewed}/{total}</span></td>
                <td className="px-4 py-3 text-slate-500">{r.last ? new Date(r.last).toLocaleString('vi-VN') : 'Chưa xem'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================ THÙNG RÁC ============================
function TrashScreen({ onBack }: { onBack: () => void; }) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [lessons, setLessons] = useState<ELLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setLessons(await getTrashLessons()); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const restore = async (l: ELLesson) => { await restoreLesson(l.id); addNotification('Đã khôi phục.', 'success'); load(); };
  const purge = async (l: ELLesson) => {
    const ok = await confirm({ title: 'Xóa vĩnh viễn', message: `Xóa vĩnh viễn "${l.title}"? Không thể khôi phục.`, confirmText: 'Xóa vĩnh viễn', cancelText: 'Hủy', danger: true } as any);
    if (!ok) return;
    await purgeLesson(l.id); addNotification('Đã xóa vĩnh viễn.', 'success'); load();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><ArrowLeft className="h-4 w-4" /></button>
        <div><h1 className="font-display text-lg font-bold text-slate-900">Thùng rác</h1><p className="text-[11px] text-slate-400">Bài giảng đã xóa còn khôi phục được trong 30 ngày.</p></div>
      </div>
      {loading ? <div className="py-20 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải...</div>
        : lessons.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">Thùng rác trống.</div>
        : (
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
            {lessons.map(l => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3">
                <div><p className="text-sm font-bold text-slate-700">{l.title}</p><p className="text-[11px] text-slate-400">Đã xóa {fmtDate(l.deleted_at)}</p></div>
                <div className="flex gap-1.5">
                  <button onClick={() => restore(l)} className="inline-flex items-center gap-1 rounded-lg bg-brand-light px-3 py-1.5 text-[10px] font-bold text-brand hover:bg-brand hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Khôi phục</button>
                  <button onClick={() => purge(l)} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" /> Xóa vĩnh viễn</button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ============================ Thành phần dùng chung ============================
function StatusTag({ lesson }: { lesson: ELLesson }) {
  if (lesson.is_public) return <span className="shrink-0 rounded-md bg-brand-light px-2 py-0.5 text-[9px] font-bold text-brand">Công khai</span>;
  if (lesson.status === 'published') return <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">Đã xuất bản</span>;
  return <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">Nháp</span>;
}
function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return <button title={title} onClick={onClick} className={`grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 ${danger ? 'hover:text-rose-500 hover:bg-rose-50' : 'hover:text-brand'}`}>{children}</button>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{label}</label>{children}</div>;
}
function ToggleRow({ label, on, onChange, disabled }: { label: string; on: boolean; onChange: (b: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs font-semibold ${disabled ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
      <button type="button" disabled={disabled} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${on ? 'bg-brand' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-base font-bold text-slate-900">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}
function fmtDate(s?: string | null) { return s ? new Date(s).toLocaleDateString('vi-VN') : ''; }
