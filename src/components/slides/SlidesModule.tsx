import React, { useEffect, useMemo, useState } from 'react';
import { FileUp, Plus, Loader2, Presentation, Copy, Trash2, Pencil, Users, LayoutGrid, List as ListIcon, Play, Eye, Library } from 'lucide-react';
import LibraryHero, { ViewToggle } from '../ui/LibraryHero';
import { AvatarStack } from '../ui/People';
import { collaboratorsByResource } from '../../lib/collab';
import SlideRenderer from './SlideRenderer';
import SlideEditor from './SlideEditor';
import SlidePresenter from './SlidePresenter';
import PptxImportDialog from './PptxImportDialog';
import { createDeck, listMyDecks, listSharedDecks, listLibraryDecks, getDeck, findDeckOwner, duplicateDeck, softDeleteDeck, saveDeck, DeckSummary, Deck, makeSlide } from '../../lib/slides';
import { setEduAuthContext } from '../../lib/edu';
import { readSubRoute, writeSubRoute } from '../../lib/seoConfig';
import { takeOpenHint } from '../../lib/notifications';
import { askText } from '../ui/Dialogs';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import type { UserAccount } from '../../types';

// Ứng dụng Bài giảng: danh sách bài giảng trình chiếu và trang thiết kế giống Google Slides, Canva.
const ROLE_TEXT: Record<string, string> = { view: 'Xem', edit: 'Chỉnh sửa', manage: 'Quản lý' };

export default function SlidesModule({ currentUser }: { currentUser: UserAccount }) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  // Mở Bài giảng là vào Thư viện chung trước, bấm chuyển để xem bài của mình hoặc bài được chia sẻ.
  const [scope, setScope] = useState<'library' | 'mine' | 'shared'>(() => (takeOpenHint('slide_deck') === 'shared' ? 'shared' : 'library'));
  const [mine, setMine] = useState<DeckSummary[] | null>(null);
  const [shared, setShared] = useState<DeckSummary[]>([]);
  const [library, setLibrary] = useState<DeckSummary[]>([]);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [open, setOpen] = useState<{ deck: Deck; role: 'owner' | 'view' | 'edit' | 'manage' } | null>(null);
  const [presenting, setPresenting] = useState<Deck | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [collabMap, setCollabMap] = useState<Record<string, Array<{ id: string; name?: string | null }>>>({});

  useEffect(() => { setEduAuthContext(currentUser.id, currentUser.role === 'admin'); }, [currentUser]);

  const load = async () => {
    try {
      const [a, b, c] = await Promise.all([listMyDecks(), listSharedDecks().catch(() => []), listLibraryDecks().catch(() => [])]);
      setMine(a); setShared(b); setLibrary(c);
      collaboratorsByResource('slide_deck', [...a, ...b].map(x => x.id)).then(setCollabMap).catch(() => {});
    } catch (e: any) { setMine([]); addNotification('Chưa tải được danh sách bài giảng: ' + (e?.message || e), 'error'); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Mở lại bài giảng đang soạn khi tải lại trang (mã trên địa chỉ ?sid=).
  useEffect(() => {
    const sid = readSubRoute().sid;
    if (!sid || open) return;
    (async () => {
      const owner = await findDeckOwner(sid);
      if (!owner) return;
      const d = await getDeck(owner, sid).catch(() => null);
      if (!d || d.deletedAt) return;
      const role = owner === currentUser.id ? 'owner' : (await import('../../lib/collab')).getMyRole('slide_deck', sid, owner).then(r => r || 'view');
      setOpen({ deck: d, role: (await role) as any });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { writeSubRoute({ sid: open?.deck.id || null }); }, [open]);
  useEffect(() => () => { writeSubRoute({ sid: null }); }, []);

  const openDeck = async (s: DeckSummary) => {
    setBusy(true);
    try {
      const d = await getDeck(s.ownerId, s.id);
      if (!d) { addNotification('Không tìm thấy bài giảng.', 'error'); return; }
      setOpen({ deck: d, role: s.role || 'owner' });
    } finally { setBusy(false); }
  };
  const create = async () => {
    setBusy(true);
    try { const d = await createDeck('Bài giảng không tên', currentUser.fullName, [makeSlide('title')]); setOpen({ deck: d, role: 'owner' }); }
    catch (e: any) { addNotification(e?.message || 'Chưa tạo được bài giảng.', 'error'); }
    finally { setBusy(false); }
  };
  const rename = async (s: DeckSummary) => {
    const v = await askText({ title: 'Đổi tên bài giảng', defaultValue: s.title });
    if (v == null) return;
    const d = await getDeck(s.ownerId, s.id); if (!d) return;
    await saveDeck({ ...d, title: v.trim() || d.title }); load();
  };
  const dup = async (s: DeckSummary) => {
    const d = await getDeck(s.ownerId, s.id); if (!d) return;
    await duplicateDeck(d, currentUser.fullName); addNotification(scope === 'library' ? 'Đã sao chép về Bài giảng của tôi.' : 'Đã tạo bản sao.', 'success'); load();
  };
  const remove = (s: DeckSummary) => confirm('Xoá bài giảng', `Xoá "${s.title}"? Bài giảng sẽ nằm ở mục Đã xoá trong trang Cá nhân 30 ngày.`, async () => {
    const d = await getDeck(s.ownerId, s.id); if (!d) return;
    try { await softDeleteDeck(d); addNotification('Đã chuyển bài giảng vào mục Đã xoá.', 'success'); load(); } catch (e: any) { addNotification(e?.message || 'Chưa xoá được.', 'error'); }
  });
  const toggleLib = async (s: DeckSummary) => {
    const d = await getDeck(s.ownerId, s.id); if (!d) return;
    try { await saveDeck({ ...d, inLibrary: !d.inLibrary }); addNotification(!d.inLibrary ? `Đã đưa "${d.title}" vào Thư viện.` : `Đã gỡ "${d.title}" khỏi Thư viện.`, 'success'); load(); }
    catch (e: any) { addNotification(e?.message || 'Chưa đổi được.', 'error'); }
  };
  const present = async (s: DeckSummary) => { const d = await getDeck(s.ownerId, s.id); if (d) setPresenting(d); };

  const list = useMemo(() => {
    const src = scope === 'mine' ? (mine || []) : scope === 'shared' ? shared : library;
    const k = q.trim().toLowerCase();
    return k ? src.filter(d => d.title.toLowerCase().includes(k)) : src;
  }, [scope, mine, shared, library, q]);

  if (open) return <SlideEditor initial={open.deck} role={open.role} currentUser={currentUser} onExit={() => { setOpen(null); load(); }} />;

  const fmt = (iso: string) => { try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return ''; } };

  return (
    <div className="space-y-6 animate-fadeIn">
      <LibraryHero
        title="Bạn muốn thiết kế bài giảng nào?"
        subtitle="Thiết kế bài giảng trình chiếu, thêm chữ, hình, ảnh, cùng soạn với đồng nghiệp và trình chiếu ngay trên web."
        tabs={[{ id: 'library', label: 'Thư viện' }, { id: 'mine', label: 'Bài giảng của tôi' }, { id: 'shared', label: `Được chia sẻ với tôi${shared.length ? ` (${shared.length})` : ''}` }]}
        activeTab={scope} onTab={id => setScope(id as any)}
        search={q} onSearch={setQ} placeholder="Tìm theo tên bài giảng..."
        chips={[]} activeChip="" onChip={() => {}}
        configKey="slides" canEditBanner={currentUser.role === 'admin'}
        actions={<><button onClick={() => setImporting(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-brand hover:text-brand"><FileUp className="h-4 w-4" /> Tải lên PowerPoint</button><button onClick={create} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tạo bài giảng mới</button></>}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600"><b className="text-slate-800">{list.length}</b> bài giảng</p>
        <ViewToggle mode={view} onChange={setView} gridIcon={<LayoutGrid className="h-4 w-4" />} listIcon={<ListIcon className="h-4 w-4" />} />
      </div>

      {mine === null ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải...</div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Presentation className="mx-auto mb-3 h-12 w-12 text-slate-200" />
          <p className="font-semibold text-slate-700">{scope === 'mine' ? 'Chưa có bài giảng nào' : scope === 'shared' ? 'Chưa ai chia sẻ bài giảng với bạn' : 'Thư viện chưa có bài giảng nào'}</p>
          {scope === 'library' && <p className="mt-1 text-sm text-slate-500">Mở bài giảng của bạn, bấm Chia sẻ rồi bật Đưa vào thư viện để mọi người cùng xem.</p>}
          {scope === 'mine' && <button onClick={create} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Tạo bài giảng đầu tiên</button>}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map(d => (
            <div key={d.id} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md">
              <button onClick={() => openDeck(d)} className="block w-full bg-slate-100">
                <ThumbFill slide={d.first} />
              </button>
              <div className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => openDeck(d)} className="line-clamp-2 text-left text-sm font-semibold text-slate-800 hover:text-brand">{d.title}</button>
                  {scope === 'shared' && d.role && d.role !== 'owner' && <span className="shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand">{ROLE_TEXT[d.role]}</span>}
                  {scope === 'mine' && d.inLibrary && <span title="Đang có trong Thư viện chung" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><Library className="h-3 w-3" /> Thư viện</span>}
                </div>
                <p className="text-xs text-slate-500">{d.count} trang · sửa {fmt(d.updatedAt)}</p>
                {(scope === 'library' || d.role !== 'owner' || (collabMap[d.id] || []).length > 0) && (
                  <div className="pt-1"><AvatarStack people={[{ id: d.ownerId, name: d.ownerName }, ...(collabMap[d.id] || [])]} size="sm" /></div>
                )}
                <div className="flex gap-1 pt-2 text-slate-400">
                  <IconBtn title="Trình chiếu" onClick={() => present(d)}><Play className="h-4 w-4" /></IconBtn>
                  {scope === 'library' && <IconBtn title="Xem" onClick={() => openDeck(d)}><Eye className="h-4 w-4" /></IconBtn>}
                  {d.role === 'owner' && scope !== 'library' && <IconBtn title="Đổi tên" onClick={() => rename(d)}><Pencil className="h-4 w-4" /></IconBtn>}
                  <IconBtn title={scope === 'library' ? 'Sao chép về bài giảng của tôi' : 'Tạo bản sao'} onClick={() => dup(d)}><Copy className="h-4 w-4" /></IconBtn>
                  {d.role === 'owner' && scope === 'mine' && <IconBtn title={d.inLibrary ? 'Gỡ khỏi Thư viện' : 'Đưa vào Thư viện'} onClick={() => toggleLib(d)}><Library className={`h-4 w-4 ${d.inLibrary ? 'text-emerald-600' : ''}`} /></IconBtn>}
                  {d.role === 'owner' && scope !== 'library' && <IconBtn title="Cộng tác" onClick={() => openDeck(d)}><Users className="h-4 w-4" /></IconBtn>}
                  {d.role === 'owner' && scope !== 'library' && <IconBtn title="Xoá" danger onClick={() => remove(d)}><Trash2 className="h-4 w-4" /></IconBtn>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Bài giảng</th><th className="px-4 py-3">Số trang</th><th className="px-4 py-3">Sửa lần cuối</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5"><button onClick={() => openDeck(d)} className="flex items-center gap-3 text-left font-semibold text-slate-800 hover:text-brand"><span className="w-24 shrink-0 overflow-hidden rounded-md border border-slate-200"><SlideRenderer slide={d.first} width={96} /></span>{d.title}</button></td>
                  <td className="px-4 py-2.5 text-slate-500">{d.count}</td>
                  <td className="px-4 py-2.5 text-slate-500">{fmt(d.updatedAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <IconBtn title="Trình chiếu" onClick={() => present(d)}><Play className="h-4 w-4" /></IconBtn>
                    {d.role === 'owner' && <IconBtn title="Xoá" danger onClick={() => remove(d)}><Trash2 className="h-4 w-4" /></IconBtn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {importing && (
        <PptxImportDialog title="Tải lên PowerPoint thành bài giảng" onClose={() => setImporting(false)} onResult={async r => {
          const d = await createDeck(r.title || 'Bài giảng từ PowerPoint', currentUser.fullName, r.slides);
          addNotification(`Đã tạo bài giảng "${d.title}" với ${r.slides.length} trang. Mọi chữ, hình, ảnh đều sửa được.`, 'success');
          load();
          if (!Object.keys(r.skipped).length) setOpen({ deck: d, role: 'owner' });
        }} />
      )}
      {presenting && <SlidePresenter slides={presenting.slides} onClose={() => setPresenting(null)} />}
    </div>
  );
}

function IconBtn({ title, onClick, children, danger }: { title: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return <button title={title} aria-label={title} onClick={onClick} className={`inline-grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 ${danger ? 'hover:text-rose-600' : 'hover:text-slate-700'}`}>{children}</button>;
}

// Ảnh thu nhỏ co theo chiều rộng thẻ.
function ThumbFill({ slide }: { slide?: any }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [w, setW] = useState(280);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 280));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return <div ref={ref} className="w-full"><SlideRenderer slide={slide} width={w} /></div>;
}
