import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileUser, Plus, Pencil, Copy, Trash2, FileDown, FileText, ArrowLeft, Save, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, X, ImagePlus, Lock, Eye, PanelLeft,
} from 'lucide-react';
import { UserAccount } from '../../types';
import {
  ScientificCv, CvSummary, CvData, emptyCvData, listMyCvs, getCv, createCv, saveCv, deleteCv, shrinkPortrait,
} from '../../lib/scientificCv';
import { renderCvBody, CV_STYLES, printCv, downloadCvWord } from '../../lib/scientificCvRender';
import { readSubRoute, writeSubRoute } from '../../lib/seoConfig';
import { PageHeader, Card, Button, IconButton, Input, Textarea, Field, Badge, EmptyState, Spinner, Modal, Select, cx } from '../ui';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';

interface Props { currentUser: UserAccount }

export default function ScientificCvModule({ currentUser }: Props) {
  const [editingId, setEditingId] = useState<string | null>(() => readSubRoute().cvid || null);
  useEffect(() => { writeSubRoute({ cvid: editingId }); }, [editingId]);
  return editingId
    ? <CvEditor id={editingId} onBack={() => setEditingId(null)} />
    : <CvList currentUser={currentUser} onEdit={setEditingId} />;
}

// ------------------------------------------------------------------ Danh sách hồ sơ

function CvList({ currentUser, onEdit }: { currentUser: UserAccount; onEdit: (id: string) => void }) {
  const [items, setItems] = useState<CvSummary[] | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();

  const load = useCallback(async () => {
    setError('');
    try { setItems(await listMyCvs()); } catch (e: any) { setError(e?.message || String(e)); setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const full = async (cv: CvSummary): Promise<ScientificCv | null> => {
    try { return await getCv(cv.id); } catch (e: any) { addNotification('Không mở được hồ sơ: ' + (e?.message || e), 'error'); return null; }
  };
  const exportPdf = async (cv: CvSummary) => { const f = await full(cv); if (f) printCv(f.data); };
  const exportWord = async (cv: CvSummary) => { const f = await full(cv); if (f) downloadCvWord(f.data); };
  const duplicate = async (cv: CvSummary) => {
    try {
      const f = await getCv(cv.id);
      if (!f) return;
      const id = await createCv(`${cv.name} (bản sao)`, f.data);
      addNotification('Đã nhân bản hồ sơ.', 'success');
      onEdit(id);
    } catch (e: any) { addNotification('Không nhân bản được: ' + (e?.message || e), 'error'); }
  };
  const remove = async (cv: CvSummary) => {
    if (!(await confirm({ title: 'Xoá lý lịch khoa học', message: `Xoá hồ sơ "${cv.name}"? Không thể khôi phục sau khi xoá.`, confirmText: 'Xoá' }))) return;
    try { await deleteCv(cv.id); setItems(prev => (prev || []).filter(x => x.id !== cv.id)); addNotification('Đã xoá hồ sơ.', 'success'); }
    catch (e: any) { addNotification('Không xoá được: ' + (e?.message || e), 'error'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileUser size={22} />}
        title="Lý lịch khoa học"
        description="Tạo và quản lý lý lịch khoa học của riêng bạn theo mẫu, xuất ra PDF hoặc Word để nộp cho từng trường."
        badge={<Badge tone="brand" icon={<Lock size={12} />}>Riêng tư</Badge>}
        actions={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Tạo lý lịch mới</Button>}
      />

      <div className="rounded-xl border border-brand/20 bg-brand-light px-4 py-3 text-[13px] text-slate-600 flex items-start gap-2">
        <Lock size={16} className="text-brand shrink-0 mt-0.5" />
        <span>Hồ sơ trong mục này chỉ tài khoản của bạn xem và sửa được. Nội dung được mã hoá trước khi lưu, quản trị viên và người dùng khác không đọc được.</span>
      </div>

      {items === null ? <Spinner /> : error ? (
        <Card><p className="text-[13px] text-rose-600">Không tải được danh sách: {error}</p></Card>
      ) : items.length === 0 ? (
        <Card padding="none">
          <EmptyState icon={<FileUser size={26} />} title="Chưa có lý lịch khoa học nào"
            description="Tạo hồ sơ đầu tiên, điền thông tin theo từng mục rồi xuất PDF hoặc Word. Có thể nhân bản để sửa tên trường cho từng nơi nộp."
            action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Tạo lý lịch mới</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(cv => (
            <Card key={cv.id} padding="item" className="flex flex-col">
              <div className="flex items-start gap-3">
                <div className="w-12 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                  <FileUser size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{cv.name}</p>
                  <p className="text-[13px] text-slate-500 truncate">{cv.fullName || 'Chưa nhập họ tên'}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{cv.school || 'Chưa nhập tên trường'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">{cv.updatedAt ? `Cập nhật ${new Date(cv.updatedAt).toLocaleString('vi-VN')}` : ''}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                <Button size="sm" icon={<Pencil size={14} />} onClick={() => onEdit(cv.id)}>Mở</Button>
                <IconButton label="Xuất PDF" variant="ghost" onClick={() => exportPdf(cv)}><FileDown size={16} /></IconButton>
                <IconButton label="Tải file Word" variant="ghost" onClick={() => exportWord(cv)}><FileText size={16} /></IconButton>
                <IconButton label="Nhân bản" variant="ghost" onClick={() => duplicate(cv)}><Copy size={16} /></IconButton>
                <div className="flex-1" />
                <IconButton label="Xoá" variant="danger" onClick={() => remove(cv)}><Trash2 size={16} /></IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateDialog open={creating} onClose={() => setCreating(false)} existing={items || []} currentUser={currentUser}
        onCreated={(id) => { setCreating(false); onEdit(id); }} />
    </div>
  );
}

function CreateDialog({ open, onClose, existing, currentUser, onCreated }: { open: boolean; onClose: () => void; existing: CvSummary[]; currentUser: UserAccount; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [busy, setBusy] = useState(false);
  const { addNotification } = useNotifications();
  useEffect(() => { if (open) { setName(''); setFrom(''); } }, [open]);
  const submit = async () => {
    setBusy(true);
    try {
      const src = from ? await getCv(from) : null;
      const data = src ? src.data : emptyCvData(currentUser.fullName || '', currentUser.email || '');
      onCreated(await createCv(name || 'Lý lịch khoa học', data));
    } catch (e: any) { addNotification('Không tạo được: ' + (e?.message || e), 'error'); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Tạo lý lịch khoa học" description="Đặt tên gợi nhớ, ví dụ theo trường sẽ nộp."
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button loading={busy} onClick={submit}>Tạo</Button></>}>
      <div className="space-y-4">
        <Field label="Tên hồ sơ"><Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Nộp Đại học Văn Lang 2026" onKeyDown={e => e.key === 'Enter' && submit()} /></Field>
        {existing.length > 0 && (
          <Field label="Bắt đầu từ">
            <Select value={from} onChange={e => setFrom(e.target.value)}>
              <option value="">Mẫu trống</option>
              {existing.map(x => <option key={x.id} value={x.id}>Sao chép từ: {x.name}</option>)}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ Soạn hồ sơ

type SectionKey = 'header' | 'A' | 'B' | 'C' | 'D' | 'E' | 'sign';
const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'header', label: 'Đầu trang và ảnh' },
  { key: 'A', label: 'A. Sơ lược về bản thân' },
  { key: 'B', label: 'B. Văn bằng, chứng chỉ' },
  { key: 'C', label: 'C. Giảng dạy, công tác' },
  { key: 'D', label: 'D. Nghiên cứu khoa học' },
  { key: 'E', label: 'E. Học phần có thể giảng dạy' },
  { key: 'sign', label: 'Ký tên và ghi chú' },
];

function CvEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const [name, setName] = useState('');
  const [data, setData] = useState<CvData | null>(null);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({ header: true, A: true, B: false, C: false, D: false, E: false, sign: false });
  const [mobilePreview, setMobilePreview] = useState(false);
  const { addNotification } = useNotifications();
  const timer = useRef<number | null>(null);
  const latest = useRef<{ name: string; data: CvData | null }>({ name: '', data: null });

  useEffect(() => {
    let alive = true;
    getCv(id).then(cv => {
      if (!alive) return;
      if (!cv) { setError('Không tìm thấy hồ sơ hoặc bạn không có quyền xem hồ sơ này.'); return; }
      setName(cv.name); setData(cv.data);
    }).catch(e => alive && setError(e?.message || String(e)));
    return () => { alive = false; };
  }, [id]);

  const doSave = useCallback(async (silent = false) => {
    const { name: n, data: d } = latest.current;
    if (!d) return;
    setSaving(true);
    try {
      await saveCv(id, n, d);
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      if (!silent) addNotification('Đã lưu lý lịch khoa học.', 'success');
    } catch (e: any) { addNotification('Không lưu được: ' + (e?.message || e), 'error'); }
    finally { setSaving(false); }
  }, [id, addNotification]);

  // Tự lưu 2 giây sau lần sửa cuối.
  useEffect(() => {
    latest.current = { name, data };
    if (!dirty) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => doSave(true), 2000);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [name, data, dirty, doSave]);

  const set = <K extends keyof CvData>(k: K, v: CvData[K]) => { setData(prev => prev ? { ...prev, [k]: v } : prev); setDirty(true); };
  const toggle = (k: SectionKey) => setOpen(p => ({ ...p, [k]: !p[k] }));
  const back = async () => { if (dirty) await doSave(true); onBack(); };

  if (error) return (
    <Card><p className="text-[13px] text-rose-600">{error}</p><Button className="mt-4" variant="secondary" icon={<ArrowLeft size={16} />} onClick={onBack}>Về danh sách</Button></Card>
  );
  if (!data) return <Spinner />;

  const txt = (k: keyof CvData, label: string, ph = '', className = '') => (
    <Field label={label} className={className}><Input value={(data as any)[k] || ''} placeholder={ph} onChange={e => set(k, e.target.value as any)} /></Field>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<IconButton label="Về danh sách" variant="ghost" onClick={back}><ArrowLeft size={18} /></IconButton>}
        title={<input value={name} onChange={e => { setName(e.target.value); setDirty(true); }} className="bg-transparent outline-none w-full text-xl font-bold text-slate-800" aria-label="Tên hồ sơ" />}
        description={saving ? 'Đang lưu...' : dirty ? 'Có thay đổi chưa lưu, tự lưu sau 2 giây' : savedAt ? `Đã lưu lúc ${savedAt}` : 'Mọi thay đổi được tự lưu'}
        actions={<div className="flex flex-wrap gap-2">
          <Button variant="outline" className="lg:hidden" icon={mobilePreview ? <PanelLeft size={16} /> : <Eye size={16} />} onClick={() => setMobilePreview(v => !v)}>{mobilePreview ? 'Nhập liệu' : 'Xem trước'}</Button>
          <Button variant="outline" icon={<FileText size={16} />} onClick={() => downloadCvWord(data)}>Word</Button>
          <Button variant="outline" icon={<FileDown size={16} />} onClick={() => printCv(data)}>PDF</Button>
          <Button icon={<Save size={16} />} loading={saving} onClick={() => doSave(false)}>Lưu</Button>
        </div>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
        {/* Nhập liệu */}
        <div className={cx('space-y-3', mobilePreview && 'hidden lg:block')}>
          {SECTIONS.map(sec => (
            <Card key={sec.key} padding="none">
              <button onClick={() => toggle(sec.key)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                <span className="text-sm font-semibold text-slate-800">{sec.label}</span>
                {open[sec.key] ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </button>
              {open[sec.key] && <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                {sec.key === 'header' && <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {txt('agency', 'Cơ quan chủ quản', 'BỘ GIÁO DỤC VÀ ĐÀO TẠO')}
                    {txt('school', 'Tên trường', 'TRƯỜNG ĐẠI HỌC ...')}
                    {txt('motto1', 'Quốc hiệu')}
                    {txt('motto2', 'Tiêu ngữ')}
                    {txt('docTitle', 'Tiêu đề văn bản')}
                    {txt('subtitle', 'Dòng phụ dưới tiêu đề', 'Để trống nếu không cần')}
                  </div>
                  <PhotoField value={data.photo} onChange={v => set('photo', v)} />
                </>}
                {sec.key === 'A' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {txt('fullName', 'Họ và tên')}
                  {txt('gender', 'Giới tính', 'Nam / Nữ')}
                  {txt('birthDate', 'Ngày sinh', 'dd/mm/yyyy')}
                  {txt('birthPlace', 'Nơi sinh')}
                  {txt('idNumber', 'Số CCCD/CMND')}
                  {txt('idDate', 'Ngày cấp', 'dd/mm/yyyy')}
                  {txt('idPlace', 'Nơi cấp', '', 'sm:col-span-2')}
                  {txt('nationality', 'Quốc tịch')}
                  {txt('ethnicity', 'Dân tộc')}
                  {txt('religion', 'Tôn giáo')}
                  {txt('phone', 'Điện thoại liên lạc')}
                  {txt('address', 'Địa chỉ thường trú', '', 'sm:col-span-2')}
                  {txt('email', 'Email cá nhân', '', 'sm:col-span-2')}
                  {txt('degree', 'Học vị', 'Cử nhân / Thạc sĩ / Tiến sĩ')}
                  {txt('academicRank', 'Học hàm', 'Không có')}
                  {txt('title', 'Chức danh', 'Không có')}
                  {txt('honors', 'Danh hiệu được Nhà nước phong', 'Không có')}
                </div>}
                {sec.key === 'B' && <>
                  <Sub title="1. Đại học"><Rows rows={data.bachelor} onChange={v => set('bachelor', v)} empty={{ name: '', years: '', school: '', major: '', mode: '', place: '', year: '' }}
                    cols={[{ k: 'name', l: 'Tên văn bằng', wide: true }, { k: 'years', l: 'Số năm đào tạo' }, { k: 'school', l: 'Trường cấp bằng', wide: true }, { k: 'major', l: 'Chuyên ngành đào tạo', wide: true }, { k: 'mode', l: 'Hình thức đào tạo', ph: 'Chính quy' }, { k: 'place', l: 'Nơi học', ph: 'Trong nước' }, { k: 'year', l: 'Năm được cấp' }]} /></Sub>
                  <Sub title="2. Thạc sĩ"><Rows rows={data.master} onChange={v => set('master', v)} empty={{ name: '', years: '', school: '', major: '', thesis: '', mode: '', place: '', year: '' }}
                    cols={[{ k: 'name', l: 'Tên văn bằng', wide: true }, { k: 'years', l: 'Số năm đào tạo' }, { k: 'school', l: 'Trường cấp bằng', wide: true }, { k: 'major', l: 'Chuyên ngành đào tạo', wide: true }, { k: 'thesis', l: 'Tên luận văn', wide: true }, { k: 'mode', l: 'Hình thức đào tạo' }, { k: 'place', l: 'Nơi học' }, { k: 'year', l: 'Năm được cấp' }]} /></Sub>
                  <Sub title="3. Tiến sĩ"><Rows rows={data.doctor} onChange={v => set('doctor', v)} empty={{ name: '', years: '', school: '', major: '', thesis: '', mode: '', place: '', year: '' }}
                    cols={[{ k: 'name', l: 'Tên văn bằng', wide: true }, { k: 'years', l: 'Số năm đào tạo' }, { k: 'school', l: 'Trường cấp bằng', wide: true }, { k: 'major', l: 'Chuyên ngành đào tạo', wide: true }, { k: 'thesis', l: 'Tên luận án', wide: true }, { k: 'mode', l: 'Hình thức đào tạo' }, { k: 'place', l: 'Nơi học' }, { k: 'year', l: 'Năm được cấp' }]} /></Sub>
                  <Sub title="4. Chứng chỉ, chứng nhận và giấy tờ khác"><Rows rows={data.certificates} onChange={v => set('certificates', v)} empty={{ type: '', name: '', issuer: '', year: '' }}
                    cols={[{ k: 'type', l: 'Loại giấy tờ', ph: 'Chứng chỉ NVSP' }, { k: 'name', l: 'Tên giấy tờ', wide: true }, { k: 'issuer', l: 'Đơn vị cấp', wide: true }, { k: 'year', l: 'Năm được cấp' }]} /></Sub>
                </>}
                {sec.key === 'C' && <>
                  <Sub title="1. Nơi làm việc hiện nay"><Rows rows={data.currentJobs} onChange={v => set('currentJobs', v)} empty={{ mode: '', unit: '', address: '', position: '', years: '', note: '' }}
                    cols={[{ k: 'mode', l: 'Hình thức công tác', wide: true }, { k: 'unit', l: 'Tên đơn vị', wide: true }, { k: 'address', l: 'Địa chỉ', wide: true }, { k: 'position', l: 'Chức danh/Chức vụ' }, { k: 'years', l: 'Số năm công tác' }, { k: 'note', l: 'Ghi chú', wide: true }]} /></Sub>
                  <Sub title="2. Quá trình giảng dạy tại các trường"><Rows rows={data.teaching} onChange={v => set('teaching', v)} empty={{ from: '', to: '', unit: '', position: '' }}
                    cols={[{ k: 'from', l: 'Từ tháng', ph: 'mm/yyyy' }, { k: 'to', l: 'Đến tháng', ph: 'mm/yyyy' }, { k: 'unit', l: 'Tên đơn vị', wide: true }, { k: 'position', l: 'Chức danh/Chức vụ', wide: true }]} /></Sub>
                  <Sub title="3. Kinh nghiệm tại các đơn vị thực tế"><Rows rows={data.experience} onChange={v => set('experience', v)} empty={{ from: '', to: '', unit: '', position: '' }}
                    cols={[{ k: 'from', l: 'Từ tháng', ph: 'mm/yyyy' }, { k: 'to', l: 'Đến tháng', ph: 'mm/yyyy' }, { k: 'unit', l: 'Tên đơn vị', wide: true }, { k: 'position', l: 'Chức danh/Chức vụ', wide: true }]} /></Sub>
                </>}
                {sec.key === 'D' && <>
                  <Field label="1. Lĩnh vực nghiên cứu"><Textarea rows={2} value={data.researchField} onChange={e => set('researchField', e.target.value)} /></Field>
                  <Sub title="2.1 Sách/chương sách"><Rows rows={data.books} onChange={v => set('books', v)} empty={{ title: '', publisher: '', year: '' }}
                    cols={[{ k: 'title', l: 'Tên sách', wide: true }, { k: 'publisher', l: 'Nhà xuất bản', wide: true }, { k: 'year', l: 'Năm xuất bản' }]} /></Sub>
                  {([['articlesDomestic', '2.2 Bài báo trong nước'], ['articlesIntl', '2.2 Bài báo quốc tế']] as const).map(([k, t]) => (
                    <Sub key={k} title={t}><Rows rows={data[k]} onChange={v => set(k, v)} empty={{ authors: '', title: '', journal: '', year: '', role: '' }}
                      cols={[{ k: 'authors', l: 'Các tác giả', wide: true }, { k: 'title', l: 'Tên công trình', wide: true }, { k: 'journal', l: 'Tên tạp chí', wide: true }, { k: 'year', l: 'Năm xuất bản' }, { k: 'role', l: 'Vai trò', ph: 'Tác giả chính' }]} /></Sub>
                  ))}
                  {([['confDomestic', '2.3 Hội thảo trong nước'], ['confIntl', '2.3 Hội thảo quốc tế']] as const).map(([k, t]) => (
                    <Sub key={k} title={t}><Rows rows={data[k]} onChange={v => set(k, v)} empty={{ authors: '', title: '', conference: '', place: '', note: '' }}
                      cols={[{ k: 'authors', l: 'Tác giả', wide: true }, { k: 'title', l: 'Tên công trình', wide: true }, { k: 'conference', l: 'Tên hội thảo', wide: true }, { k: 'place', l: 'Địa điểm' }, { k: 'note', l: 'Ghi chú' }]} /></Sub>
                  ))}
                  <Sub title="3. Đề tài/dự án nghiên cứu"><Rows rows={data.projects} onChange={v => set('projects', v)} empty={{ title: '', time: '', sponsor: '', role: '', value: '' }}
                    cols={[{ k: 'title', l: 'Tên đề tài/dự án', wide: true }, { k: 'time', l: 'Thời gian' }, { k: 'sponsor', l: 'Tổ chức tài trợ' }, { k: 'role', l: 'Vai trò tham gia' }, { k: 'value', l: 'Tổng giá trị' }]} /></Sub>
                  <Sub title="4. Bằng sáng chế"><Rows rows={data.patents} onChange={v => set('patents', v)} empty={{ product: '', year: '', issuer: '', country: '', value: '' }}
                    cols={[{ k: 'product', l: 'Tên sản phẩm', wide: true }, { k: 'year', l: 'Năm cấp' }, { k: 'issuer', l: 'Tổ chức cấp' }, { k: 'country', l: 'Quốc gia' }, { k: 'value', l: 'Tổng giá trị chuyển giao' }]} /></Sub>
                  <Field label="5. Thành viên ban biên tập tạp chí ISI/Scopus"><Textarea rows={2} value={data.editorialBoard} onChange={e => set('editorialBoard', e.target.value)} /></Field>
                  <Sub title="6. Lịch sử phản biện tạp chí ISI/Scopus"><Rows rows={data.reviews} onChange={v => set('reviews', v)} empty={{ journal: '', times: '' }}
                    cols={[{ k: 'journal', l: 'Tạp chí', wide: true }, { k: 'times', l: 'Số lần phản biện' }]} /></Sub>
                  <Sub title="7. Giải thưởng, thành tựu nghiên cứu"><Rows rows={data.awards} onChange={v => set('awards', v)} empty={{ name: '', year: '', organization: '', country: '' }}
                    cols={[{ k: 'name', l: 'Tên giải thưởng, thành tựu', wide: true }, { k: 'year', l: 'Năm' }, { k: 'organization', l: 'Tổ chức trao giải', wide: true }, { k: 'country', l: 'Quốc gia' }]} /></Sub>
                </>}
                {sec.key === 'E' && <Rows rows={data.courses} onChange={v => set('courses', v)} empty={{ name: '', unit: '' }}
                  cols={[{ k: 'name', l: 'Tên học phần', wide: true }, { k: 'unit', l: 'Đơn vị', wide: true }]} />}
                {sec.key === 'sign' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {txt('signPlace', 'Nơi ký', 'Tp. Hồ Chí Minh')}
                  {txt('signDate', 'Ngày ký', 'Để trống để điền tay, ví dụ: ngày 05 tháng 10 năm 2026')}
                  {txt('signName', 'Họ tên dưới chữ ký', '', 'sm:col-span-2')}
                  <Field label="Ghi chú cuối văn bản" className="sm:col-span-2"><Textarea rows={3} value={data.note} placeholder="Để trống nếu không cần" onChange={e => set('note', e.target.value)} /></Field>
                </div>}
              </div>}
            </Card>
          ))}
        </div>

        {/* Xem trước */}
        <div className={cx('lg:sticky lg:top-4', !mobilePreview && 'hidden lg:block')}>
          <Preview data={data} />
        </div>
      </div>
    </div>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="text-[13px] font-semibold text-slate-700 mb-2">{title}</p>{children}</div>;
}

type ColDef = { k: string; l: string; ph?: string; wide?: boolean };
function Rows<T extends Record<string, any>>({ rows, onChange, cols, empty }: { rows: T[]; onChange: (v: T[]) => void; cols: ColDef[]; empty: T }) {
  const upd = (i: number, k: string, v: string) => onChange(rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= rows.length) return; const n = [...rows]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Dòng {i + 1}</span>
            <div className="flex items-center gap-0.5">
              <IconButton label="Lên" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={14} /></IconButton>
              <IconButton label="Xuống" size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === rows.length - 1}><ArrowDown size={14} /></IconButton>
              <IconButton label="Xoá dòng" size="sm" variant="danger" onClick={() => onChange(rows.filter((_, j) => j !== i))}><X size={14} /></IconButton>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cols.map(c => (
              <label key={c.k} className={cx('block', c.wide && 'col-span-2')}>
                <span className="block text-xs text-slate-500 mb-1">{c.l}</span>
                <Input size="sm" value={r[c.k] || ''} placeholder={c.ph} onChange={e => upd(i, c.k, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => onChange([...rows, { ...empty }])}>Thêm dòng</Button>
    </div>
  );
}

function PhotoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotifications();
  const pick = async (f?: File) => {
    if (!f) return;
    try { onChange(await shrinkPortrait(f)); } catch (e: any) { addNotification(e?.message || String(e), 'error'); }
  };
  return (
    <div className="flex items-center gap-4">
      <div className="w-[72px] h-24 rounded-lg border border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center text-slate-400 shrink-0">
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={20} />}
      </div>
      <div className="space-y-2">
        <p className="text-[13px] text-slate-600">Ảnh chân dung 3x4, được thu nhỏ và lưu riêng trong hồ sơ của bạn.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={<ImagePlus size={14} />} onClick={() => ref.current?.click()}>{value ? 'Đổi ảnh' : 'Chọn ảnh'}</Button>
          {value && <Button size="sm" variant="ghost" onClick={() => onChange('')}>Bỏ ảnh</Button>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </div>
  );
}

// Xem trước đúng khổ A4, thu nhỏ theo bề rộng cột.
function Preview({ data }: { data: CvData }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / 794));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Dựng bản xem trước chậm hơn nhịp gõ một chút để ô nhập không bị giật với hồ sơ dài.
  const deferred = useDeferredValue(data);
  const html = useMemo(() => renderCvBody(deferred), [deferred]);
  const pageRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(1123);
  useEffect(() => { if (pageRef.current) setH(pageRef.current.scrollHeight); }, [html, scale]);
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-700">Xem trước</span>
        <span className="text-xs text-slate-400">Khổ A4</span>
      </div>
      <div ref={wrap} className="bg-slate-100 p-0 max-h-[calc(100vh-9rem)] overflow-auto">
        <div style={{ height: h * scale }}>
          <div ref={pageRef} style={{ width: 794, transform: `scale(${scale})`, transformOrigin: 'top left' }} className="bg-white">
            <style>{CV_STYLES}</style>
            <div style={{ padding: '76px 68px 76px 83px' }} dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
