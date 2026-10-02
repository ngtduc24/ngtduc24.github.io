import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import RichTextEditor from '../cms/RichTextEditor';
import LibraryHero, { HeroChip, ViewToggle } from '../ui/LibraryHero';
import {
  BookMarked, Plus, Trash2, Edit3, X, Save, FileText, Search, LayoutGrid, List as ListIcon, Globe, Lock,
  Bold, Italic, List, ListOrdered, Heading1, Heading2, FileDown, Eye, ArrowLeft, Loader2, FolderInput, Check,
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, Link as LinkIcon, Undo, Redo, ChevronDown, ChevronUp, Link2
} from 'lucide-react';
import { toggleEduFileType, eduFileTypeLabel } from '../../lib/eduFileTypes';
import { EduResourceEditor, EduResourceList } from './EduResources';
import { EduSubject, EduAssignmentBankItem } from '../../types/edu';
import { UserAccount } from '../../types';
import {
  getSubjects, getSubjectsByIds, saveSubject, deleteSubject, getAssignmentBank, saveAssignmentBankItem, deleteAssignmentBankItem,
  bulkUpdateAssignmentBank, bulkDeleteAssignmentBank, ensureBankShareToken, bankShareUrl, newShareToken,
} from '../../lib/edu';
import { uploadImageToCloudinary } from '../../lib/upload';
import { exportAssignmentToPdf } from '../../lib/assignmentPdf';
import { readSubRoute, writeSubRoute } from '../../lib/seoConfig';
import { useNotifications } from '../NotificationContext';
import { askText, copyText } from '../ui/Dialogs';
import { useConfirmation } from '../ConfirmationContext';
import { fold, usePaging, Pager } from './ListPager';
import MediaSourcePicker from '../MediaSourcePicker';

const FORMAT_OPTIONS = [
  { id: 'any', label: 'Mọi loại tệp' },
  { id: 'pdf', label: 'PDF' },
  { id: 'link', label: 'Link' },
  { id: 'image', label: 'Hình ảnh' },
  { id: 'video', label: 'Video' },
  { id: 'doc', label: 'Văn bản (Word)' },
  { id: '3d', label: 'Mô hình 3D' },
  { id: 'text', label: 'Nhập văn bản' },
];

const emptyItem = (subjectId?: string): Partial<EduAssignmentBankItem> => ({ title: '', content: '', allowedFileTypes: ['pdf'], subjectId: subjectId || undefined, resources: [] });
const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString('vi-VN') : '');
const firstImage = (html?: string) => (html || '').match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '';
const plain = (html?: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const formatsText = (t?: string[]) => (t || []).map(x => FORMAT_OPTIONS.find(f => f.id === x)?.label || eduFileTypeLabel(x)).join(', ');

export default function EduAssignmentBank({ currentUser, onExit }: { currentUser: UserAccount; onExit?: () => void }) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  // Chỉ người tạo ra bài mới được sửa, xóa và bật chia sẻ công khai.
  const canEdit = (item?: { ownerId?: string } | null) => !!item && item.ownerId === currentUser?.id;

  const [subjects, setSubjects] = useState<EduSubject[]>([]);
  const [items, setItems] = useState<EduAssignmentBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);

  // Bộ lọc và cách hiển thị
  const [subjectId, setSubjectId] = useState('');
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'mine' | 'shared'>('mine');
  const [sort, setSort] = useState<'new' | 'name'>('new');
  // Mặc định luôn mở dạng lưới, người dùng tự đổi sang danh sách khi cần.
  const [mode, setMode] = useState<'grid' | 'table'>('grid');

  // Quản lý môn ở cột trái
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');

  // Xem, sửa
  const [expandedId, setExpandedId] = useState('');                       // dạng danh sách: mở rộng ngay dưới dòng
  const [viewId, setViewId] = useState<string>(() => readSubRoute().bid || ''); // dạng lưới: trang xem riêng
  const [editing, setEditing] = useState<Partial<EduAssignmentBankItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Chọn nhiều bài ở dạng danh sách
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkSubject, setBulkSubject] = useState('');

  // Trình soạn thảo chuẩn dùng chung của EduGo (RichTextEditor). Nội dung giữ trong state, editor chỉ dùng khi cần gọi trực tiếp.
  const [editor, setEditor] = useState<Editor | null>(null);
  const [contentHtml, setContentHtml] = useState('');

  // Tên người tạo lấy từ chính bài tập (bài dùng chung của người khác có lưu tên tác giả).
  const userNames: Record<string, string> = {};
  const ownerName = (ownerId?: string) => (ownerId ? (ownerId === currentUser.id ? currentUser.fullName : items.find(i => i.ownerId === ownerId && i.ownerName)?.ownerName || '') : '');
  // Môn của bài dùng chung do người khác tạo: chỉ để hiện tên, không sửa xoá được.
  const [otherSubjects, setOtherSubjects] = useState<EduSubject[]>([]);
  useEffect(() => {
    const mine = new Set(subjects.map(s => s.id));
    const ids = items.map(i => i.subjectId).filter(id => id && !mine.has(id));
    if (!ids.length) { setOtherSubjects([]); return; }
    getSubjectsByIds(ids).then(setOtherSubjects).catch(() => setOtherSubjects([]));
  }, [items, subjects]);
  const subjName = (id?: string) => subjects.find(s => s.id === id)?.name || otherSubjects.find(s => s.id === id)?.name || '';

  const reloadItems = () => getAssignmentBank().then(setItems).catch(() => setItems([]));

  useEffect(() => {
    (async () => {
      try { setSubjects(await getSubjects()); setTablesMissing(false); } catch { setTablesMissing(true); }
      await reloadItems();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { writeSubRoute({ bid: viewId || null }); }, [viewId]);
  useEffect(() => () => { writeSubRoute({ bid: null }); }, []);

  // Đếm số bài theo môn (sau khi lọc phạm vi), để hiện ở cột trái
  const scoped = useMemo(() => items.filter(it => scope === 'all' ? true : scope === 'mine' ? it.ownerId === currentUser.id : (it.isPublic && it.ownerId !== currentUser.id)), [items, scope, currentUser.id]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    scoped.forEach(it => { const k = it.subjectId || '__none'; m[k] = (m[k] || 0) + 1; });
    return m;
  }, [scoped]);

  const shown = useMemo(() => {
    const q = fold(search);
    let list = scoped.filter(it => !subjectId ? true : subjectId === '__none' ? !it.subjectId : it.subjectId === subjectId);
    if (q) list = list.filter(it => fold(`${it.title} ${subjName(it.subjectId)} ${ownerName(it.ownerId)} ${plain(it.content)}`).includes(q));
    list = [...list].sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'vi') : (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, subjectId, search, sort, subjects, userNames]);
  const pg = usePaging(shown.length, 'bank_page_size', 12, [search, subjectId, scope, sort]);
  const pageItems = shown.slice(pg.from, pg.to);

  // Bỏ các mục đã chọn không còn trong danh sách
  useEffect(() => { setSelected(prev => { const ids = new Set(items.map(i => i.id)); const n = new Set([...prev].filter(id => ids.has(id))); return n.size === prev.size ? prev : n; }); }, [items]);

  const openEditor = (item: Partial<EduAssignmentBankItem>) => {
    setExpandedId('');
    setEditing(item);
    setContentHtml(item.content || '');
  };

  const downloadPdf = (it: EduAssignmentBankItem) => exportAssignmentToPdf({
    title: it.title, content: it.content, subjectName: subjName(it.subjectId), author: ownerName(it.ownerId),
    allowedFileTypes: it.allowedFileTypes, resources: it.resources,
  });

  // Link xem bài không cần MSSV. Sinh mã lần đầu rồi giữ nguyên.
  const copyShareLink = (it: EduAssignmentBankItem) => {
    // Mã link có sẵn thì dùng lại, chưa có thì sinh ngay trên máy để chép được liền trong lúc bấm.
    const token = it.shareToken || newShareToken();
    const copying = copyText(bankShareUrl(token));
    const name = it.ownerId === currentUser.id ? currentUser.fullName : ownerName(it.ownerId);
    (async () => {
      try {
        const saved = await ensureBankShareToken(it, name || undefined, token);
        if (saved !== token) await copyText(bankShareUrl(saved));
        if (!it.shareToken) setItems(prev => prev.map(x => x.id === it.id ? { ...x, shareToken: saved, ownerName: x.ownerName || name } : x));
        addNotification((await copying) ? 'Đã sao chép link xem bài tập.' : 'Không sao chép được, hãy thử lại.', (await copying) ? 'success' : 'error');
      } catch (e: any) { addNotification('Không tạo được link: ' + (e?.message || e), 'error'); }
    })();
  };
  const canShare = (it: EduAssignmentBankItem) => canEdit(it) || !!it.shareToken;

  // ---------------- Môn học ----------------
  const handleAddSubject = async (nameArg?: string) => {
    const name = (nameArg ?? newSubjectName).trim();
    if (!name) return;
    try {
      const saved = await saveSubject({ name });
      setSubjects(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setSubjectId(saved.id);
      setNewSubjectName(''); setAddingSubject(false);
      addNotification('Đã thêm môn học', 'success');
    } catch { addNotification('Lỗi thêm môn học', 'error'); }
  };
  const handleRenameSubject = async (s: EduSubject, nameArg?: string) => {
    const name = (nameArg ?? editSubjectName).trim();
    if (!name || name === s.name) { setEditingSubjectId(''); return; }
    try {
      const saved = await saveSubject({ id: s.id, name });
      setSubjects(prev => prev.map(x => x.id === s.id ? saved : x).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingSubjectId('');
      addNotification('Đã đổi tên môn', 'success');
    } catch { addNotification('Lỗi đổi tên môn', 'error'); }
  };
  const handleDeleteSubject = async (s: EduSubject) => {
    const ok = await confirm({ title: 'Xóa môn học', message: `Xóa môn "${s.name}"? Các bài tập trong ngân hàng của môn này cũng sẽ bị xóa.`, confirmText: 'Xóa' });
    if (!ok) return;
    try {
      await deleteSubject(s.id);
      setSubjects(prev => prev.filter(x => x.id !== s.id));
      if (subjectId === s.id) setSubjectId('');
      reloadItems();
      addNotification('Đã xóa môn học', 'success');
    } catch { addNotification('Lỗi xóa môn học', 'error'); }
  };

  // ---------------- Bài tập ----------------
  const handleSaveItem = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { addNotification('Vui lòng nhập tên bài tập', 'error'); return; }
    setSaving(true);
    try {
      const saved = await saveAssignmentBankItem({
        id: editing.id,
        subjectId: editing.subjectId || '',
        title: editing.title,
        content: contentHtml,
        allowedFileTypes: editing.allowedFileTypes && editing.allowedFileTypes.length ? editing.allowedFileTypes : ['pdf'],
        resources: editing.resources || [],
        ownerId: editing.ownerId,
        isPublic: editing.isPublic === true,
      });
      addNotification('Đã lưu bài tập vào ngân hàng', 'success');
      setEditing(null);
      await reloadItems();
      if (viewId && saved?.id === viewId) setViewId(saved.id);
    } catch (e: any) {
      addNotification('Lỗi lưu bài tập: ' + (e?.message || 'không rõ nguyên nhân'), 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteItem = async (item: EduAssignmentBankItem) => {
    const ok = await confirm({ title: 'Xóa bài tập', message: `Xóa bài tập "${item.title}" khỏi ngân hàng?`, confirmText: 'Xóa' });
    if (!ok) return;
    try {
      await deleteAssignmentBankItem(item.id);
      setItems(prev => prev.filter(x => x.id !== item.id));
      if (viewId === item.id) setViewId('');
      if (expandedId === item.id) setExpandedId('');
      addNotification('Đã xóa bài tập', 'success');
    } catch { addNotification('Lỗi xóa bài tập', 'error'); }
  };

  const handleTogglePublic = async (item: EduAssignmentBankItem) => {
    const next = !item.isPublic;
    try {
      await bulkUpdateAssignmentBank([item.id], { isPublic: next });
      setItems(prev => prev.map(x => (x.id === item.id ? { ...x, isPublic: next } : x)));
      addNotification(next ? 'Đã bật chia sẻ công khai' : 'Đã tắt chia sẻ công khai', 'success');
    } catch { addNotification('Lỗi cập nhật chia sẻ', 'error'); }
  };

  // ---------------- Thao tác hàng loạt ----------------
  const picked = items.filter(i => selected.has(i.id));
  const pickedOwn = picked.filter(canEdit);
  const skipNote = (n: number) => (n ? ` Bỏ qua ${n} bài của người khác.` : '');
  const allChecked = pageItems.length > 0 && pageItems.every(i => selected.has(i.id));
  const someChecked = !allChecked && pageItems.some(i => selected.has(i.id));
  const toggleOne = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => { const n = new Set(prev); pageItems.forEach(i => allChecked ? n.delete(i.id) : n.add(i.id)); return n; });

  const runBulk = async (fn: () => Promise<void>, done: string) => {
    setBulkBusy(true);
    try { await fn(); addNotification(done, 'success'); setSelected(new Set()); await reloadItems(); }
    catch (e: any) { addNotification('Lỗi: ' + (e?.message || e), 'error'); }
    finally { setBulkBusy(false); }
  };
  const needOwn = () => { if (!pickedOwn.length) { addNotification('Các bài đã chọn đều là bài của người khác, bạn không sửa được.', 'warning'); return false; } return true; };

  const bulkDelete = async () => {
    if (!needOwn()) return;
    const skip = picked.length - pickedOwn.length;
    const ok = await confirm({ title: 'Xóa nhiều bài tập', message: `Xóa ${pickedOwn.length} bài tập khỏi ngân hàng? Không thể hoàn tác.${skipNote(skip)}`, confirmText: 'Xóa', danger: true } as any);
    if (!ok) return;
    runBulk(() => bulkDeleteAssignmentBank(pickedOwn.map(i => i.id)), `Đã xóa ${pickedOwn.length} bài tập.${skipNote(skip)}`);
  };
  const bulkChangeSubject = async (sid: string) => {
    setBulkSubject('');
    if (!sid || !needOwn()) return;
    const skip = picked.length - pickedOwn.length;
    const name = sid === '__none' ? 'Chưa chọn môn' : subjName(sid);
    const ok = await confirm({ title: 'Đổi môn học', message: `Chuyển ${pickedOwn.length} bài tập sang môn ${name}?${skipNote(skip)}`, confirmText: 'Đổi môn', cancelText: 'Hủy' });
    if (!ok) return;
    runBulk(() => bulkUpdateAssignmentBank(pickedOwn.map(i => i.id), { subjectId: sid === '__none' ? null : sid }), `Đã đổi môn cho ${pickedOwn.length} bài tập.${skipNote(skip)}`);
  };
  const bulkPublic = async (on: boolean) => {
    if (!needOwn()) return;
    const skip = picked.length - pickedOwn.length;
    if (on) {
      const ok = await confirm({ title: 'Chia sẻ công khai', message: `Công khai ${pickedOwn.length} bài tập cho mọi người dùng thấy và dùng lại?${skipNote(skip)}`, confirmText: 'Công khai', cancelText: 'Hủy' });
      if (!ok) return;
    }
    runBulk(() => bulkUpdateAssignmentBank(pickedOwn.map(i => i.id), { isPublic: on }), `${on ? 'Đã công khai' : 'Đã tắt công khai'} ${pickedOwn.length} bài tập.${skipNote(skip)}`);
  };

  // ---------------- Soạn thảo ----------------
  const toggleFormat = (id: string) => setEditing(prev => prev ? { ...prev, allowedFileTypes: toggleEduFileType(prev.allowedFileTypes || [], id) } : prev);
  const handleInsertImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    if (!file.type.startsWith('image/')) { addNotification('Vui lòng chọn tệp ảnh.', 'error'); return; }
    setUploadingImage(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
        reader.readAsDataURL(file);
      });
      const url = await uploadImageToCloudinary(dataUrl);
      editor.chain().focus().setImage({ src: url }).run();
    } catch { addNotification('Lỗi tải ảnh lên. Vui lòng thử lại.', 'error'); }
    finally { setUploadingImage(false); }
  };

  if (loading) return <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải...</div>;

  if (tablesMissing) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center space-y-3">
        <BookMarked className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-600">Ngân hàng bài tập chưa sẵn sàng.</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">Cần chạy file EDU_ASSIGNMENT_BANK.sql trên Supabase để tạo 2 bảng edu_subjects và edu_assignment_bank, sau đó tải lại trang.</p>
      </div>
    );
  }

  const tbBtn = (active: boolean) => `p-2 rounded-lg transition-all ${active ? 'bg-brand text-white' : 'hover:bg-slate-200 text-slate-500'}`;

  // ===================== Màn soạn bài =====================
  if (editing) {
    return (
      <div className="space-y-5 animate-fadeIn">
      <Banner onBack={() => setEditing(null)} backTitle="Hủy, quay lại ngân hàng bài tập" icon={<Edit3 className="h-6 w-6" />}
        title={editing.id ? 'Sửa bài tập mẫu' : 'Thêm bài tập mẫu'} subtitle={editing.id ? (editing.title || '') : 'Soạn đề, chọn định dạng nộp và đính kèm tài nguyên thực hành.'} />
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 min-w-0">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Tên bài tập</label>
              <input type="text" value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Ví dụ: Vẽ art work cơ bản" className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-4 py-2.5 text-sm font-bold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Yêu cầu và hướng dẫn</label>
              <RichTextEditor value={contentHtml} onChange={setContentHtml} onReady={setEditor} placeholder="Nhập yêu cầu và hướng dẫn bài tập..." minHeight="360px" maxHeight="70vh" folder="edu-assignments" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Môn học</label>
              <select value={editing.subjectId || ''} onChange={e => setEditing({ ...editing, subjectId: e.target.value || undefined })} className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:outline-none rounded-xl px-3 py-2.5 text-xs font-bold">
                <option value="">Chưa chọn môn</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Định dạng nộp bài</label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map(f => {
                  const active = (editing.allowedFileTypes || []).includes(f.id);
                  return <button key={f.id} onClick={() => toggleFormat(f.id)} className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${active ? 'bg-brand-light text-brand border-brand' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-brand'}`}>{f.label}</button>;
                })}
              </div>
            </div>
            <EduResourceEditor value={editing.resources || []} onChange={v => setEditing(prev => prev ? { ...prev, resources: v } : prev)} />
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer select-none">
              <input type="checkbox" checked={editing.isPublic === true} onChange={e => setEditing({ ...editing, isPublic: e.target.checked })} className="mt-0.5 w-4 h-4 accent-brand" />
              <span className="min-w-0">
                <span className="block text-[12px] font-bold text-slate-700">Chia sẻ công khai cho mọi người</span>
                <span className="block text-[11px] text-slate-400 leading-snug">Bật thì tất cả người dùng đều thấy và dùng lại được bài này.</span>
              </span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all">Hủy</button>
              <button onClick={handleSaveItem} disabled={saving} className="flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide">
                <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu bài tập'}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  }

  // ===================== Trang xem bài (từ dạng lưới) =====================
  const viewing = viewId ? items.find(i => i.id === viewId) : null;
  if (viewId && viewing) {
    const it = viewing;
    return (
      <div className="space-y-5 animate-fadeIn">
        <Banner onBack={() => setViewId('')} backTitle="Quay lại ngân hàng bài tập" icon={<FileText className="h-6 w-6" />}
          title={it.title} subtitle={[subjName(it.subjectId) || 'Chưa chọn môn', ownerName(it.ownerId)].filter(Boolean).join(' · ')}
          actions={<>
            {canShare(it) && <HeadBtn onClick={() => copyShareLink(it)} icon={<Link2 className="h-3.5 w-3.5" />}>Sao chép link</HeadBtn>}
            <HeadBtn onClick={() => downloadPdf(it)} icon={<FileDown className="h-3.5 w-3.5" />}>Tải PDF</HeadBtn>
            {canEdit(it) && <HeadBtn primary onClick={() => openEditor({ ...it })} icon={<Edit3 className="h-3.5 w-3.5" />}>Sửa</HeadBtn>}
          </>} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
          <div className="min-w-0 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
            {plain(it.content) || /<(img|video|iframe)/i.test(it.content || '')
              ? <div className="prose prose-slate max-w-none break-words text-[15px] leading-relaxed text-slate-700 [overflow-wrap:anywhere] [&_a]:break-all [&_img]:rounded-xl" dangerouslySetInnerHTML={{ __html: it.content || '' }} />
              : <p className="text-sm italic text-slate-400">Bài tập này chưa có phần yêu cầu và hướng dẫn.</p>}
            <EduResourceList resources={it.resources} className="mt-6 border-t border-slate-100 pt-5" />
          </div>
          <div className="h-fit rounded-3xl border border-slate-100 bg-white p-4 text-[12px] shadow-sm lg:sticky lg:top-6">
            <div className="space-y-2.5 px-1">
              <Info k="Môn học" v={subjName(it.subjectId) || 'Chưa chọn môn'} />
              <Info k="Định dạng nộp" v={formatsText(it.allowedFileTypes) || 'Chưa chọn'} />
              <Info k="Tài nguyên" v={`${(it.resources || []).length} mục`} />
              <Info k="Cập nhật" v={fmtDate(it.updatedAt || it.createdAt)} />
              <Info k="Chia sẻ" v={it.isPublic ? 'Công khai' : 'Không công khai'} />
            </div>
            {canEdit(it) && (
              <div className="mt-3 flex gap-1.5 border-t border-slate-100 pt-3">
                <button onClick={() => handleTogglePublic(it)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-2 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-100">{it.isPublic ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />} {it.isPublic ? 'Tắt công khai' : 'Công khai'}</button>
                <button onClick={() => handleDeleteItem(it)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" /> Xóa</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===================== Danh sách =====================
  const StatusTag = ({ it }: { it: EduAssignmentBankItem }) => it.isPublic
    ? <span className="shrink-0 rounded-md bg-brand-light px-2 py-0.5 text-[9px] font-bold text-brand">Công khai</span>
    : !canEdit(it) ? <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">Dùng chung</span> : null;

  const Actions = ({ it }: { it: EduAssignmentBankItem }) => (
    <>
      {canEdit(it) && <IconBtn title="Sửa" onClick={() => openEditor({ ...it })}><Edit3 className="w-3.5 h-3.5" /></IconBtn>}
      <IconBtn title="Xem" onClick={() => setViewId(it.id)}><Eye className="w-3.5 h-3.5" /></IconBtn>
      <IconBtn title="Tải PDF" onClick={() => downloadPdf(it)}><FileDown className="w-3.5 h-3.5" /></IconBtn>
      {canShare(it) && <IconBtn title="Sao chép link xem bài (không cần MSSV)" onClick={() => copyShareLink(it)}><Link2 className="w-3.5 h-3.5" /></IconBtn>}
      {canEdit(it) && <IconBtn title={it.isPublic ? 'Tắt công khai' : 'Chia sẻ công khai'} onClick={() => handleTogglePublic(it)}>{it.isPublic ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}</IconBtn>}
      {canEdit(it) && <IconBtn title="Xóa" danger onClick={() => handleDeleteItem(it)}><Trash2 className="w-3.5 h-3.5" /></IconBtn>}
    </>
  );

  const total = scoped.length;
  const chips: HeroChip[] = [
    { id: '', label: 'Tất cả', count: total },
    ...subjects.map(su => (su.ownerId === currentUser.id
      ? { id: su.id, label: su.name, count: counts[su.id] || 0, onRename: (n: string) => handleRenameSubject(su, n), onDelete: () => handleDeleteSubject(su) }
      : { id: su.id, label: su.name, count: counts[su.id] || 0 })),
    ...otherSubjects.filter(su => (counts[su.id] || 0) > 0).map(su => ({ id: su.id, label: su.name, count: counts[su.id] || 0 })),
    ...((counts.__none || 0) > 0 ? [{ id: '__none', label: 'Chưa chọn môn', count: counts.__none }] : []),
  ];
  return (
    <div className="space-y-5 animate-fadeIn">
      <LibraryHero
        title="Bạn muốn tìm bài tập nào?"
        subtitle="Lưu, chia sẻ và dùng lại bài tập theo môn cho các lớp."
        onBack={onExit}
        backTitle="Quay lại"
        search={search}
        onSearch={setSearch}
        placeholder="Tìm theo tên bài, môn học, người tạo, nội dung..."
        chips={chips}
        activeChip={subjectId}
        onChip={setSubjectId}
        onAddChip={name => handleAddSubject(name)}
        actions={
          <button onClick={() => openEditor(emptyItem(subjectId && subjectId !== '__none' ? subjectId : undefined))} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-hover">
            <Plus className="h-4 w-4" /> Thêm bài tập
          </button>
        }
      />

      <div className="min-w-0 space-y-4">
        {/* Thanh lọc phụ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500"><span className="font-semibold text-slate-800">{shown.length}</span> bài tập{subjectId ? ` trong môn ${subjectId === '__none' ? 'chưa chọn' : subjName(subjectId)}` : ''}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={scope} onChange={e => setScope(e.target.value as any)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-brand">
              <option value="mine">Bài của tôi</option>
              <option value="shared">Bài dùng chung</option>
              <option value="all">Tất cả</option>
            </select>
            <select value={sort} onChange={e => setSort(e.target.value as any)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-brand">
              <option value="new">Mới nhất</option>
              <option value="name">Tên A đến Z</option>
            </select>
            <ViewToggle mode={mode} onChange={setMode} gridIcon={<LayoutGrid className="h-4 w-4" />} listIcon={<ListIcon className="h-4 w-4" />} />
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <BookMarked className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-500">{search ? 'Không tìm thấy bài tập phù hợp' : 'Chưa có bài tập nào trong mục này'}</p>
            {!search && <p className="mt-1 text-xs text-slate-400">Bấm Thêm bài tập để tạo.</p>}
          </div>
        ) : mode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {pageItems.map(it => {
              const img = firstImage(it.content);
              return (
                <div key={it.id} onClick={() => setViewId(it.id)} title="Bấm để xem bài tập" className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:border-brand/30 hover:shadow-md">
                  <div className="h-28 bg-slate-100 bg-cover bg-center" style={img ? { backgroundImage: `url(${img})` } : undefined}>
                    {!img && <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-light to-slate-50 text-brand/40"><FileText className="h-9 w-9" /></div>}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[13px] font-black leading-tight text-slate-800 line-clamp-2 group-hover:text-brand">{it.title}</h3>
                      <StatusTag it={it} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{[subjName(it.subjectId) || 'Chưa chọn môn', ownerName(it.ownerId)].filter(Boolean).join(' · ')}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{formatsText(it.allowedFileTypes)}{(it.resources || []).length ? ` · ${(it.resources || []).length} tài nguyên` : ''}</p>
                    <div onClick={e => e.stopPropagation()} className="mt-auto flex cursor-default flex-wrap gap-1 border-t border-slate-50 pt-3"><Actions it={it} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {selected.size > 0 && (
              <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-brand/20 bg-brand-light/60 px-4 py-2.5 shadow-sm backdrop-blur">
                <span className="text-xs font-bold text-brand">Đã chọn {selected.size} bài</span>
                <button onClick={() => setSelected(new Set())} className="text-[11px] font-semibold text-slate-500 underline hover:text-slate-700">Bỏ chọn</button>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {bulkBusy && <Loader2 className="h-4 w-4 animate-spin text-brand" />}
                  <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white pl-2.5 text-[11px] font-bold text-slate-600">
                    <FolderInput className="h-3.5 w-3.5" />
                    <select value={bulkSubject} disabled={bulkBusy} onChange={e => { setBulkSubject(e.target.value); bulkChangeSubject(e.target.value); }} className="rounded-xl bg-transparent py-1.5 pr-2 text-[11px] font-bold outline-none">
                      <option value="">Đổi môn...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      <option value="__none">Bỏ môn (chưa chọn môn)</option>
                    </select>
                  </label>
                  <BulkBtn disabled={bulkBusy} onClick={() => bulkPublic(true)} icon={<Globe className="h-3.5 w-3.5" />}>Công khai</BulkBtn>
                  <BulkBtn disabled={bulkBusy} onClick={() => bulkPublic(false)} icon={<Lock className="h-3.5 w-3.5" />}>Tắt công khai</BulkBtn>
                  <BulkBtn disabled={bulkBusy} danger onClick={bulkDelete} icon={<Trash2 className="h-3.5 w-3.5" />}>Xóa</BulkBtn>
                </div>
              </div>
            )}
            <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/40 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="w-10 py-3 pl-4 pr-1"><CheckBox checked={allChecked} indeterminate={someChecked} onChange={toggleAll} title="Chọn tất cả" /></th>
                    <th className="px-4 py-3">Tên bài tập</th><th className="px-4 py-3">Môn học</th>
                    <th className="px-4 py-3">Định dạng nộp</th><th className="px-4 py-3 text-center">Tài nguyên</th>
                    <th className="px-4 py-3 text-center">Chia sẻ</th><th className="px-4 py-3">Người tạo</th>
                    <th className="px-4 py-3">Cập nhật</th><th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pageItems.map(it => {
                    const open = expandedId === it.id;
                    return (
                      <React.Fragment key={it.id}>
                        <tr className={selected.has(it.id) || open ? 'bg-brand-light/30' : 'hover:bg-slate-50/40'}>
                          <td className="py-3 pl-4 pr-1"><CheckBox checked={selected.has(it.id)} onChange={() => toggleOne(it.id)} title="Chọn bài này" /></td>
                          <td className="px-4 py-3">
                            <button onClick={() => setExpandedId(open ? '' : it.id)} title="Bấm để xem nhanh" className="inline-flex items-center gap-1.5 text-left font-bold text-slate-800 hover:text-brand">
                              {open ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-brand" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                              <span>{it.title}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{subjName(it.subjectId) || 'Chưa chọn môn'}</td>
                          <td className="px-4 py-3 text-slate-500">{formatsText(it.allowedFileTypes)}</td>
                          <td className="px-4 py-3 text-center">{(it.resources || []).length || ''}</td>
                          <td className="px-4 py-3 text-center"><StatusTag it={it} /></td>
                          <td className="px-4 py-3 text-slate-500">{ownerName(it.ownerId)}</td>
                          <td className="px-4 py-3 text-slate-500">{fmtDate(it.updatedAt || it.createdAt)}</td>
                          <td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><Actions it={it} /></div></td>
                        </tr>
                        {open && (
                          <tr className="bg-white">
                            <td colSpan={9} className="px-4 pb-5 pt-1">
                              <div className="rounded-2xl border border-brand/20 bg-slate-50/50 p-5">
                                {plain(it.content) || /<(img|video|iframe)/i.test(it.content || '')
                                  ? <div className="prose prose-slate max-w-none break-words text-[14px] leading-relaxed text-slate-700 [overflow-wrap:anywhere]" dangerouslySetInnerHTML={{ __html: it.content || '' }} />
                                  : <p className="text-sm italic text-slate-400">Bài tập này chưa có phần yêu cầu và hướng dẫn.</p>}
                                <EduResourceList resources={it.resources} className="mt-5 border-t border-slate-100 pt-4" />
                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                  {canShare(it) && <button onClick={() => copyShareLink(it)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:border-brand/30 hover:text-brand"><Link2 className="h-3.5 w-3.5" /> Sao chép link</button>}
                                  <button onClick={() => downloadPdf(it)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:border-brand/30 hover:text-brand"><FileDown className="h-3.5 w-3.5" /> Tải PDF</button>
                                  {canEdit(it) && <button onClick={() => openEditor({ ...it })} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-[11px] font-bold text-white hover:bg-brand-hover"><Edit3 className="h-3.5 w-3.5" /> Sửa</button>}
                                  <button onClick={() => setExpandedId('')} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><X className="h-3.5 w-3.5" /> Thu gọn</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {shown.length > 0 && <Pager pg={pg} total={shown.length} unit="bài tập" sizes={[12, 24, 48, 96]} />}
      </div>
    </div>
  );
}

// Banner đầu trang giống E-Learning: nút quay lại, biểu tượng, tiêu đề, mô tả, nút thao tác bên phải.
function Banner({ onBack, backTitle, icon, title, subtitle, actions }: { onBack?: () => void; backTitle?: string; icon: React.ReactNode; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      {onBack && <button onClick={onBack} title={backTitle} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-brand-light hover:text-brand"><ArrowLeft className="h-5 w-5" /></button>}
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand">{icon}</span>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-black leading-tight tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-sm font-medium text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
function HeadBtn({ children, icon, onClick, primary }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${primary ? 'bg-brand text-white hover:bg-brand-hover' : 'border border-slate-200 bg-white text-slate-600 hover:border-brand/30 hover:text-brand'}`}>{icon}{children}</button>;
}

function Info({ k, v }: { k: string; v: string }) {
  return <div className="flex items-start justify-between gap-3"><span className="text-slate-500">{k}</span><span className="text-right font-semibold text-slate-800">{v}</span></div>;
}
function SubjectBtn({ active, label, count, onClick, onRename, onDelete }: { active: boolean; label: string; count: number; onClick: () => void; onRename?: () => void; onDelete?: () => void }) {
  return (
    <div onClick={onClick} className={`group mb-1 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold ${active ? 'bg-brand-light text-brand' : 'text-slate-600 hover:bg-slate-50'}`}>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {onRename && <button onClick={e => { e.stopPropagation(); onRename(); }} title="Sửa tên môn" className="hidden rounded p-0.5 text-slate-300 hover:text-brand group-hover:block"><Edit3 className="h-3.5 w-3.5" /></button>}
      {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Xóa môn" className="hidden rounded p-0.5 text-slate-300 hover:text-rose-500 group-hover:block"><Trash2 className="h-3.5 w-3.5" /></button>}
      <span className="shrink-0 text-[10px] text-slate-400">{count}</span>
    </div>
  );
}
function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return <button title={title} onClick={onClick} className={`grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 ${danger ? 'hover:text-rose-500 hover:bg-rose-50' : 'hover:text-brand'}`}>{children}</button>;
}
function CheckBox({ checked, indeterminate, onChange, title }: { checked: boolean; indeterminate?: boolean; onChange: () => void; title?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" title={title} checked={checked} onChange={onChange} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand align-middle" />;
}
function BulkBtn({ children, icon, onClick, disabled, danger }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-1.5 rounded-xl border bg-white px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${danger ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-slate-200 text-slate-600 hover:border-brand/40 hover:text-brand'}`}>{icon}{children}</button>;
}
