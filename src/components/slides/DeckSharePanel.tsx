import React, { useEffect, useRef, useState } from 'react';
import {
  X, Search, Loader2, Lock, Globe, Library, ChevronDown, Check, Link2, Download, Play, Presentation, FileDown, MoreHorizontal, QrCode, Trash2, Crown, Mail, ArrowLeft, Send,
} from 'lucide-react';
import { Collaborator, CollabRole, ROLE_LABELS, addCollaborator, updateCollaborator, removeCollaborator, searchUsers } from '../../lib/collab';
import { Deck, deckShareUrl } from '../../lib/slides';
import { usePerson } from '../../lib/people';
import { AvatarImg, PersonHover } from '../ui/People';
import { copyText } from '../ui/Dialogs';
import type { UserAccount } from '../../types';

// Bảng Chia sẻ bài giảng (giống Canva): thêm người ngay tại đây, chọn cấp độ truy cập của link,
// sao chép link, tải xuống, trình chiếu, chia sẻ lên mạng xã hội.
// Cấp độ truy cập: chỉ người được thêm, hoặc bất cứ ai có link (không cần đăng nhập, chỉ xem).
// Người đã đăng nhập nhưng không được thêm và link chưa bật công khai thì không mở được bài giảng.

function Face({ id, name, size = 32 }: { id: string; name?: string | null; size?: number }) {
  const p = usePerson(id, name);
  return <PersonHover person={p}><AvatarImg person={p} size={size} /></PersonHover>;
}
function Name({ id, name }: { id: string; name?: string | null }) {
  const p = usePerson(id, name);
  return <>{p?.name || name || 'Người dùng'}</>;
}

const SOCIAL: Array<{ id: string; label: string; color: string; url: (u: string, t: string) => string; glyph: string }> = [
  { id: 'fb', label: 'Facebook', color: '#1877F2', glyph: 'f', url: u => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: 'ms', label: 'Messenger', color: '#0084FF', glyph: 'm', url: u => `https://www.facebook.com/dialog/send?link=${encodeURIComponent(u)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(u)}` },
  { id: 'zalo', label: 'Zalo', color: '#0068FF', glyph: 'Z', url: u => `https://sp.zalo.me/share_inline?d=${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ url: u })))))}` },
  { id: 'x', label: 'X (Twitter)', color: '#000000', glyph: '𝕏', url: (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { id: 'in', label: 'LinkedIn', color: '#0A66C2', glyph: 'in', url: u => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { id: 'tg', label: 'Telegram', color: '#26A5E4', glyph: '✈', url: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { id: 'mail', label: 'Email', color: '#64748b', glyph: '@', url: (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(u)}` },
];

export default function DeckSharePanel({ deck, title, currentUser, canManage, collabs, onCollabsChange, onToggleShare, onToggleLibrary, onPresent, onPdf, onPptx, onClose, notify }: {
  deck: Deck; title: string; currentUser: UserAccount; canManage: boolean; collabs: Collaborator[];
  onCollabsChange: () => void; onToggleShare: (on: boolean) => Promise<Deck | null>; onToggleLibrary?: (on: boolean) => Promise<void>; onPresent: () => void; onPdf: () => void; onPptx: () => void; onClose: () => void;
  notify: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserAccount[]>([]);
  const [picked, setPicked] = useState<UserAccount | null>(null);
  const [role, setRole] = useState<CollabRole>('edit');
  const [busy, setBusy] = useState(false);
  const [showList, setShowList] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [view, setView] = useState<'main' | 'social' | 'qr'>('main');
  const [dlOpen, setDlOpen] = useState(false);
  const [qr, setQr] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const isPublic = !!deck.shareOn && !!deck.shareToken;
  const publicUrl = deck.shareToken ? deckShareUrl(deck.shareToken) : '';
  const editUrl = `${window.location.origin}/?tab=bai-giang&sid=${encodeURIComponent(deck.id)}`;

  useEffect(() => {
    if (!q.trim() || picked) { setResults([]); return; }
    const t = setTimeout(() => searchUsers(q).then(r => setResults(r.filter(u => u.id !== deck.ownerId && !collabs.some(c => c.userId === u.id)).slice(0, 6))), 220);
    return () => clearTimeout(t);
  }, [q, picked, collabs, deck.ownerId]);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('[data-share-toggle]')) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', down); window.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', key); };
  }, [onClose]);
  useEffect(() => {
    if (view !== 'qr' || !publicUrl) return;
    import('qrcode').then(m => (m.default || m).toDataURL(publicUrl, { margin: 1, width: 360 })).then(setQr).catch(() => setQr(''));
  }, [view, publicUrl]);

  const add = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await addCollaborator({ type: 'slide_deck' as any, resourceId: deck.id, resourceTitle: title, ownerId: deck.ownerId, user: picked, role, senderName: currentUser.fullName });
      notify(`Đã thêm ${picked.fullName}, họ sẽ nhận được thông báo.`, 'success');
      setPicked(null); setQ(''); onCollabsChange();
    } catch (e: any) { notify(e?.message || 'Chưa thêm được, vui lòng thử lại.', 'error'); }
    finally { setBusy(false); }
  };
  const setLevel = async (pub: boolean) => {
    setLevelOpen(false);
    if (pub === isPublic) return;
    setShareBusy(true);
    try { await onToggleShare(pub); } finally { setShareBusy(false); }
  };
  // Link công khai: bật chia sẻ nếu chưa bật rồi trả về link.
  const ensurePublic = async (): Promise<string | null> => {
    if (isPublic) return publicUrl;
    if (!canManage) { notify('Chỉ chủ bài giảng hoặc người quản lý bật được link xem công khai.', 'warning'); return null; }
    setShareBusy(true);
    try { const d = await onToggleShare(true); return d?.shareToken ? deckShareUrl(d.shareToken) : null; } finally { setShareBusy(false); }
  };
  const copyLink = async () => {
    const url = isPublic ? publicUrl : editUrl;
    await copyText(url);
    notify(isPublic ? 'Đã chép link. Ai có link đều xem được, không cần đăng nhập.' : 'Đã chép link. Chỉ những người được thêm mới mở được.', 'success');
  };
  const openSocial = async (s: typeof SOCIAL[number]) => {
    const u = await ensurePublic(); if (!u) return;
    window.open(s.url(u, title), '_blank', 'noopener,width=640,height=600');
  };

  const tile = (icon: React.ReactNode, label: string, onClick: () => void, bg = 'bg-slate-100 text-slate-700') => (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center text-[11px] leading-tight text-slate-600 hover:bg-slate-50">
      <span className={`grid h-11 w-11 place-items-center rounded-full ${bg}`}>{icon}</span>{label}
    </button>
  );

  return (
    <div ref={boxRef} className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-16px)] rounded-2xl border border-slate-200 bg-white p-4 text-slate-700 shadow-2xl">
      {view !== 'main' ? (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <button onClick={() => setView('main')} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100" aria-label="Quay lại"><ArrowLeft className="h-4 w-4" /></button>
            <p className="flex-1 text-sm font-semibold">{view === 'qr' ? 'Mã QR link xem bài giảng' : 'Chia sẻ liên kết'}</p>
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100" aria-label="Đóng"><X className="h-4 w-4" /></button>
          </div>
          {!isPublic && <p className="mb-3 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800">Link đang ở chế độ riêng. Chia sẻ lên mạng xã hội hoặc mã QR sẽ bật “Bất cứ ai có liên kết” (chỉ xem, không cần đăng nhập).</p>}
          {view === 'social' ? (
            <div className="grid grid-cols-4 gap-1">
              {SOCIAL.map(s => (
                <button key={s.id} onClick={() => openSocial(s)} className="flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center text-[11px] leading-tight text-slate-600 hover:bg-slate-50">
                  <span className="grid h-11 w-11 place-items-center rounded-full text-base font-bold text-white" style={{ background: s.color }}>{s.id === 'mail' ? <Mail className="h-5 w-5" /> : s.id === 'tg' ? <Send className="h-5 w-5" /> : s.glyph}</span>{s.label}
                </button>
              ))}
              {tile(<QrCode className="h-5 w-5" />, 'Mã QR', async () => { if (await ensurePublic()) setView('qr'); })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              {qr ? <img src={qr} alt="Mã QR" className="h-56 w-56 rounded-xl border border-slate-100" /> : <Loader2 className="my-16 h-6 w-6 animate-spin text-slate-400" />}
              {qr && <a href={qr} download={`${title || 'bai-giang'}-qr.png`} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Tải ảnh mã QR</a>}
              <p className="text-center text-xs text-slate-500">Quét mã bằng điện thoại để mở bài giảng (chỉ xem).</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><p className="text-base font-semibold text-slate-800">Chia sẻ bài giảng</p><button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100" aria-label="Đóng"><X className="h-4 w-4" /></button></div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Thành viên có quyền truy cập</p>
            {canManage && (picked ? (
              <div className="space-y-2 rounded-xl border border-brand/40 bg-brand-light/40 p-2.5">
                <div className="flex items-center gap-2">
                  <Face id={picked.id} name={picked.fullName} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{picked.fullName}</p><p className="truncate text-xs text-slate-500">{picked.email}</p></div>
                  <button onClick={() => setPicked(null)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-white" aria-label="Chọn người khác"><X className="h-4 w-4" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <select value={role} onChange={e => setRole(e.target.value as CollabRole)} className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm">
                    <option value="edit">Có thể chỉnh sửa</option>
                    <option value="view">Có thể xem</option>
                    <option value="manage">Quản lý (thêm bớt người)</option>
                  </select>
                  <button onClick={add} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Thêm</button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Thêm người theo tên hoặc email" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand" />
                {results.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
                    {results.map(u => (
                      <button key={u.id} onClick={() => { setPicked(u); setResults([]); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50">
                        <Face id={u.id} name={u.fullName} size={30} />
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold">{u.fullName}</span><span className="block truncate text-xs text-slate-500">{u.email}</span></span>
                      </button>
                    ))}
                  </div>
                )}
                {q.trim() && !results.length && <p className="mt-1 text-xs text-slate-400">Chưa thấy tài khoản phù hợp.</p>}
              </div>
            ))}
            <div className="mt-2 flex items-center">
              <div className="flex -space-x-2">
                <span className="rounded-full ring-2 ring-white"><Face id={deck.ownerId} name={deck.ownerName} /></span>
                {collabs.slice(0, 7).map(c => <span key={c.id} className="rounded-full ring-2 ring-white"><Face id={c.userId} name={c.userName} /></span>)}
                {collabs.length > 7 && <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-xs font-semibold ring-2 ring-white">+{collabs.length - 7}</span>}
              </div>
              <button onClick={() => setShowList(v => !v)} className="ml-auto text-xs font-semibold text-brand hover:underline">{showList ? 'Thu gọn' : `Xem ${collabs.length + 1} người`}</button>
            </div>
            {showList && (
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                <div className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                  <Face id={deck.ownerId} name={deck.ownerName} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm"><Name id={deck.ownerId} name={deck.ownerName} />{deck.ownerId === currentUser.id ? ' (bạn)' : ''}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-700"><Crown className="h-3.5 w-3.5" /> Chủ sở hữu</span>
                </div>
                {collabs.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-slate-50">
                    <Face id={c.userId} name={c.userName} size={28} />
                    <span className="min-w-0 flex-1 truncate text-sm"><Name id={c.userId} name={c.userName} />{c.userId === currentUser.id ? ' (bạn)' : ''}</span>
                    <select value={c.role} disabled={!canManage} onChange={async e => { try { await updateCollaborator(c, { role: e.target.value as CollabRole }); onCollabsChange(); } catch (er: any) { notify(er?.message || 'Chưa đổi được quyền.', 'error'); } }} className="h-8 rounded-lg border border-slate-200 bg-white px-1.5 text-xs disabled:bg-slate-50">
                      {(Object.keys(ROLE_LABELS) as CollabRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r].label}</option>)}
                    </select>
                    {(canManage || c.userId === currentUser.id) && <button onClick={async () => { try { await removeCollaborator(c); onCollabsChange(); } catch (er: any) { notify(er?.message || 'Chưa bỏ được người này.', 'error'); } }} title="Bỏ người này" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Cấp độ truy cập</p>
            <div className="relative">
              <button disabled={!canManage || shareBusy} onClick={() => setLevelOpen(v => !v)} className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100">{shareBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : isPublic ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{isPublic ? 'Bất cứ ai có liên kết này' : 'Chỉ người được thêm'}</span><span className="block truncate text-xs text-slate-500">{isPublic ? 'Không cần đăng nhập, có thể xem' : 'Người khác dù đã đăng nhập cũng không mở được'}</span></span>
                {canManage && <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {levelOpen && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
                  {[false, true].map(pub => (
                    <button key={String(pub)} onClick={() => setLevel(pub)} className={`flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 ${pub === isPublic ? 'bg-slate-50' : ''}`}>
                      {pub ? <Globe className="mt-0.5 h-5 w-5 shrink-0" /> : <Lock className="mt-0.5 h-5 w-5 shrink-0" />}
                      <span className="flex-1"><span className="block text-sm font-semibold">{pub ? 'Bất cứ ai có liên kết này' : 'Chỉ người được thêm'}</span><span className="block text-xs text-slate-500">{pub ? 'Mọi người mở được qua link để xem, không cần đăng nhập. Muốn sửa vẫn phải được thêm vào.' : 'Chỉ bạn và những người được thêm ở trên mới mở được bài giảng.'}</span></span>
                      {pub === isPublic && <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {deck.ownerId === currentUser.id && onToggleLibrary && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Library className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Đưa vào Thư viện</span><span className="block text-xs text-slate-500">Mọi tài khoản trong EduGo xem, trình chiếu và sao chép về được. Chỉ bạn sửa được bản gốc.</span></span>
              <span role="switch" aria-checked={!!deck.inLibrary} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${deck.inLibrary ? 'bg-brand' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${deck.inLibrary ? 'left-[22px]' : 'left-0.5'}`} /></span>
              <input type="checkbox" className="sr-only" checked={!!deck.inLibrary} onChange={async e => { const on = e.target.checked; try { await onToggleLibrary(on); notify(on ? 'Đã đưa bài giảng vào Thư viện.' : 'Đã gỡ bài giảng khỏi Thư viện.', 'success'); } catch { notify('Chưa đổi được, vui lòng thử lại.', 'error'); } }} />
            </label>
          )}

          <button onClick={copyLink} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-hover"><Link2 className="h-4 w-4" /> Sao chép liên kết</button>

          <div className="grid grid-cols-4 gap-1 border-t border-slate-100 pt-3">
            <div className="relative">
              {tile(<Download className="h-5 w-5" />, 'Tải xuống', () => setDlOpen(v => !v))}
              {dlOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
                  <button onClick={() => { setDlOpen(false); onPdf(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"><FileDown className="h-4 w-4" /> PDF (in hoặc lưu)</button>
                  <button onClick={() => { setDlOpen(false); onPptx(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"><Presentation className="h-4 w-4" /> PowerPoint (.pptx)</button>
                </div>
              )}
            </div>
            {tile(<Play className="h-5 w-5" />, 'Trình chiếu', onPresent, 'bg-orange-500 text-white')}
            {tile(<Globe className="h-5 w-5" />, 'Liên kết xem công khai', async () => { const u = await ensurePublic(); if (u) { await copyText(u); notify('Đã bật và chép link xem công khai.', 'success'); } })}
            {tile(<span className="text-sm font-black">P</span>, 'Microsoft PowerPoint', onPptx, 'bg-[#C43E1C] text-white')}
            {tile(<QrCode className="h-5 w-5" />, 'Mã QR', async () => { if (await ensurePublic()) setView('qr'); })}
            {tile(<span className="text-base font-bold">f</span>, 'Facebook', () => openSocial(SOCIAL[0]), 'bg-[#1877F2] text-white')}
            {tile(<span className="text-sm font-bold">Zalo</span>, 'Zalo', () => openSocial(SOCIAL[2]), 'bg-[#0068FF] text-white')}
            {tile(<MoreHorizontal className="h-5 w-5" />, 'Xem tất cả', () => setView('social'))}
          </div>
        </div>
      )}
    </div>
  );
}
