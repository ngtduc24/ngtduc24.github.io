import React, { useEffect, useMemo, useState } from 'react';
import {
  QrCode, Plus, Pencil, Trash2, Download, Copy, ExternalLink, List, LayoutGrid, FileImage,
} from 'lucide-react';
import { UserAccount } from '../../types';
import {
  QrItem, QrData, QrLevel, emptyQr, listQrs, createQr, updateQr, deleteQr, normalizeUrl, isValidUrl,
  qrDataUrl, downloadPng, downloadSvg, copyPng,
} from '../../lib/qrCodes';
import { PageHeader, Card, Button, IconButton, Input, Textarea, Field, EmptyState, Spinner, Modal, Select, SearchInput } from '../ui';
import { useConfirmation } from '../ConfirmationContext';
import { useNotifications } from '../NotificationContext';

interface Props { currentUser: UserAccount }

// Ảnh QR dựng tại chỗ trên trình duyệt.
function QrThumb({ data, size }: { data: QrData; size: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    qrDataUrl(data, Math.max(160, size * 2)).then(u => { if (alive) setSrc(u); }).catch(() => {});
    return () => { alive = false; };
  }, [data.url, data.fg, data.bg, data.level, data.margin, size]);
  return (
    <div className="rounded-lg border border-slate-100 bg-white overflow-hidden shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      {src ? <img src={src} alt={data.title || 'Mã QR'} width={size} height={size} className="block" /> : <QrCode size={size / 3} className="text-slate-300" />}
    </div>
  );
}

export default function QrCodeModule({ currentUser: _currentUser }: Props) {
  const [items, setItems] = useState<QrItem[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<QrItem | 'new' | null>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => {
    try { return localStorage.getItem('qr_view') === 'grid' ? 'grid' : 'list'; } catch { return 'list'; }
  });
  const changeView = (v: 'list' | 'grid') => { setView(v); try { localStorage.setItem('qr_view', v); } catch { /* bỏ qua */ } };
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();

  const load = async () => {
    setError('');
    try { setItems(await listQrs()); } catch (e: any) { setError(e?.message || String(e)); setItems([]); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!items) return [];
    if (!k) return items;
    return items.filter(it => [it.data.title, it.data.url, it.data.note].some(v => (v || '').toLowerCase().includes(k)));
  }, [items, q]);

  const remove = async (it: QrItem) => {
    if (!(await confirm({ title: 'Xoá mã QR', message: `Xoá mã "${it.data.title || it.data.url}"? Ảnh QR đã in hoặc đã gửi vẫn quét được vì mã chứa trực tiếp đường link.`, confirmText: 'Xoá' }))) return;
    try { await deleteQr(it.id); setItems(prev => (prev || []).filter(x => x.id !== it.id)); addNotification('Đã xoá mã QR.', 'success'); }
    catch (e: any) { addNotification('Không xoá được: ' + (e?.message || e), 'error'); }
  };
  const copy = async (it: QrItem) => {
    const ok = await copyPng(it.data);
    addNotification(ok ? 'Đã chép ảnh QR, có thể dán vào Word, Zalo, slide.' : 'Trình duyệt không cho chép ảnh, hãy dùng nút tải PNG.', ok ? 'success' : 'warning');
  };
  const onSaved = (it: QrItem) => {
    setItems(prev => {
      const list = prev || [];
      const i = list.findIndex(x => x.id === it.id);
      return i >= 0 ? [it, ...list.filter(x => x.id !== it.id)] : [it, ...list];
    });
    setEditing(null);
  };

  const actions = (it: QrItem) => (
    <>
      <IconButton label="Tải ảnh PNG" variant="ghost" onClick={() => downloadPng(it.data)}><Download size={16} /></IconButton>
      <IconButton label="Tải file SVG (in ấn)" variant="ghost" onClick={() => downloadSvg(it.data)}><FileImage size={16} /></IconButton>
      <IconButton label="Chép ảnh QR" variant="ghost" onClick={() => copy(it)}><Copy size={16} /></IconButton>
      <IconButton label="Mở link" variant="ghost" onClick={() => window.open(normalizeUrl(it.data.url), '_blank', 'noopener')}><ExternalLink size={16} /></IconButton>
      <IconButton label="Sửa" variant="ghost" onClick={() => setEditing(it)}><Pencil size={16} /></IconButton>
      <IconButton label="Xoá" variant="danger" onClick={() => remove(it)}><Trash2 size={16} /></IconButton>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<QrCode size={22} />}
        title="Tạo mã QR"
        description="Tạo mã QR từ đường link, lưu lại để tải, chép hoặc chỉnh sửa khi cần."
        actions={<div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Kiểu hiển thị">
            <IconButton label="Dạng danh sách" size="sm" variant={view === 'list' ? 'primary' : 'ghost'} onClick={() => changeView('list')}><List size={16} /></IconButton>
            <IconButton label="Dạng lưới" size="sm" variant={view === 'grid' ? 'primary' : 'ghost'} onClick={() => changeView('grid')}><LayoutGrid size={16} /></IconButton>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>Tạo mã QR</Button>
        </div>}
      />

      {items && items.length > 0 && (
        <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên, link hoặc ghi chú..." wrapClassName="max-w-md" />
      )}

      {items === null ? <Spinner /> : error ? (
        <Card><p className="text-[13px] text-rose-600">Không tải được danh sách: {error}</p></Card>
      ) : items.length === 0 ? (
        <Card padding="none">
          <EmptyState icon={<QrCode size={26} />} title="Chưa có mã QR nào"
            description="Dán một đường link để tạo mã QR, đặt tên gợi nhớ rồi lưu lại. Mã được tạo ngay trên máy của bạn."
            action={<Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>Tạo mã QR</Button>} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card><p className="text-[13px] text-slate-500">Không có mã nào khớp với "{q}".</p></Card>
      ) : view === 'list' ? (
        <Card padding="none" className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(it => (
              <div key={it.id} className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-3 hover:bg-slate-50/70">
                <button onClick={() => setEditing(it)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <QrThumb data={it.data} size={52} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{it.data.title || 'Chưa đặt tên'}</span>
                    <span className="block text-[13px] text-brand truncate">{it.data.url}</span>
                    {it.data.note && <span className="block text-xs text-slate-400 truncate">{it.data.note}</span>}
                  </span>
                </button>
                <span className="text-xs text-slate-400 md:w-36 shrink-0">{it.updatedAt ? new Date(it.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                <div className="flex items-center gap-0.5 shrink-0">{actions(it)}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(it => (
            <Card key={it.id} padding="item" className="flex flex-col items-center text-center">
              <button onClick={() => setEditing(it)} aria-label="Sửa mã QR"><QrThumb data={it.data} size={168} /></button>
              <p className="mt-3 text-sm font-semibold text-slate-800 truncate w-full">{it.data.title || 'Chưa đặt tên'}</p>
              <p className="text-[13px] text-brand truncate w-full">{it.data.url}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 w-full flex items-center justify-center gap-0.5">{actions(it)}</div>
            </Card>
          ))}
        </div>
      )}

      {editing && <QrEditor item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}

const LEVELS: { v: QrLevel; l: string }[] = [
  { v: 'L', l: 'Thấp (7%), mã thưa, dễ quét' },
  { v: 'M', l: 'Vừa (15%), dùng thông thường' },
  { v: 'Q', l: 'Khá (25%)' },
  { v: 'H', l: 'Cao (30%), chịu được in mờ, dán logo' },
];

function QrEditor({ item, onClose, onSaved }: { item: QrItem | null; onClose: () => void; onSaved: (it: QrItem) => void }) {
  const [d, setD] = useState<QrData>(item ? { ...item.data } : emptyQr());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { addNotification } = useNotifications();
  const set = <K extends keyof QrData>(k: K, v: QrData[K]) => setD(p => ({ ...p, [k]: v }));
  const valid = isValidUrl(d.url);

  const save = async () => {
    if (!valid) { setErr('Hãy nhập đường link hợp lệ, ví dụ https://ngtduc24.github.io'); return; }
    setBusy(true); setErr('');
    const data: QrData = { ...d, url: normalizeUrl(d.url), title: d.title.trim() || new URL(normalizeUrl(d.url)).hostname || 'Mã QR' };
    try {
      if (item) { const updatedAt = await updateQr(item.id, data); onSaved({ ...item, data, updatedAt }); }
      else onSaved(await createQr(data));
      addNotification('Đã lưu mã QR.', 'success');
    } catch (e: any) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={item ? 'Sửa mã QR' : 'Tạo mã QR'} description="Mã QR chứa trực tiếp đường link, quét bằng camera điện thoại là mở được."
      footer={<>
        {valid && <Button variant="outline" icon={<Download size={16} />} onClick={() => downloadPng({ ...d, url: normalizeUrl(d.url) })}>Tải PNG</Button>}
        <div className="flex-1" />
        <Button variant="secondary" onClick={onClose}>Huỷ</Button>
        <Button loading={busy} onClick={save}>Lưu</Button>
      </>}>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5">
        <div className="space-y-4">
          <Field label="Đường link"><Input autoFocus value={d.url} placeholder="https://..." onChange={e => set('url', e.target.value)} invalid={!!d.url && !valid} /></Field>
          <Field label="Tên gợi nhớ"><Input value={d.title} placeholder="Ví dụ: Link nộp bài BT02 Nhóm 01" onChange={e => set('title', e.target.value)} /></Field>
          <Field label="Ghi chú"><Textarea rows={2} value={d.note} placeholder="Dùng ở đâu, in cho lớp nào..." onChange={e => set('note', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Màu mã"><div className="flex items-center gap-2"><input type="color" value={d.fg} onChange={e => set('fg', e.target.value)} className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1 cursor-pointer" aria-label="Màu mã" /><Input value={d.fg} onChange={e => set('fg', e.target.value)} /></div></Field>
            <Field label="Màu nền"><div className="flex items-center gap-2"><input type="color" value={d.bg} onChange={e => set('bg', e.target.value)} className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1 cursor-pointer" aria-label="Màu nền" /><Input value={d.bg} onChange={e => set('bg', e.target.value)} /></div></Field>
            <Field label="Mức sửa lỗi"><Select value={d.level} onChange={e => set('level', e.target.value as QrLevel)}>{LEVELS.map(x => <option key={x.v} value={x.v}>{x.l}</option>)}</Select></Field>
            <Field label="Viền trắng"><Select value={String(d.margin)} onChange={e => set('margin', Number(e.target.value))}>{[0, 1, 2, 4, 6].map(n => <option key={n} value={n}>{n === 0 ? 'Không viền' : `${n} ô`}</option>)}</Select></Field>
          </div>
          {err && <p className="text-[13px] text-rose-600">{err}</p>}
        </div>
        <div className="flex flex-col items-center gap-2">
          {valid ? <QrThumb data={{ ...d, url: normalizeUrl(d.url) }} size={200} /> : (
            <div className="w-[200px] h-[200px] rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center text-xs text-slate-400 px-4">Nhập đường link để xem trước mã QR</div>
          )}
          <p className="text-xs text-slate-400 text-center">Nên giữ màu mã đậm trên nền sáng để điện thoại quét nhanh.</p>
        </div>
      </div>
    </Modal>
  );
}
