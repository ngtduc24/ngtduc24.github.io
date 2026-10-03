import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Loader2, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import {
  CollabType, CollabRole, Collaborator, ClassPerms, CLASS_PERM_LABELS, ROLE_LABELS, TYPE_LABELS,
  listCollaborators, addCollaborator, updateCollaborator, removeCollaborator, searchUsers, userAvatar,
} from '../../lib/collab';
import type { UserAccount } from '../../types';
import { usePerson } from '../../lib/people';
import { AvatarImg, PersonHover } from './People';

// Hộp thêm người cộng tác: tìm tài khoản theo tên hoặc email, chọn quyền, xem và đổi quyền người đã thêm.
// Bài giảng, bài tập, Quizz, dự án: 3 mức Xem, Chỉnh sửa, Quản lý. Lớp, trường: tích chọn từng quyền.

interface ShareDialogProps {
  type: CollabType;
  resourceId: string;
  resourceTitle: string;
  ownerId: string;
  ownerName?: string;
  currentUser: UserAccount;
  canManage: boolean;
  onClose: () => void;
}

const isClassType = (t: CollabType) => t === 'edu_class' || t === 'edu_school';
const DEFAULT_CLASS_PERMS: ClassPerms = { viewSubmissions: true, grade: true };

// Ảnh đại diện lấy từ danh bạ công khai, rê chuột hiện thẻ thông tin, bấm mở trang cá nhân.
function Avatar({ id, name }: { id: string; name?: string | null }) {
  const person = usePerson(id, name);
  return <PersonHover person={person}><AvatarImg person={person} size={36} /></PersonHover>;
}
function PName({ id, name, suffix }: { id: string; name?: string | null; suffix?: string }) {
  const person = usePerson(id, name);
  return <PersonHover person={person}><span className="truncate text-sm font-semibold text-slate-800 hover:underline">{person?.name || name}{suffix}</span></PersonHover>;
}

export default function ShareDialog({ type, resourceId, resourceTitle, ownerId, ownerName, currentUser, canManage, onClose }: ShareDialogProps) {
  const [list, setList] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserAccount[]>([]);
  const [picked, setPicked] = useState<UserAccount | null>(null);
  const [role, setRole] = useState<CollabRole>('edit');
  const [perms, setPerms] = useState<ClassPerms>(DEFAULT_CLASS_PERMS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const classMode = isClassType(type);

  const load = () => listCollaborators(type, resourceId).then(setList).catch(e => setMsg({ ok: false, text: e?.message || 'Không tải được danh sách.' })).finally(() => setLoading(false));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [type, resourceId]);
  useEffect(() => {
    if (!q.trim() || picked) { setResults([]); return; }
    const t = setTimeout(() => searchUsers(q).then(r => setResults(r.filter(u => u.id !== ownerId && !list.some(c => c.userId === u.id)))), 250);
    return () => clearTimeout(t);
  }, [q, picked, list, ownerId]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const add = async () => {
    if (!picked) return;
    setBusy(true); setMsg(null);
    try {
      await addCollaborator({ type, resourceId, resourceTitle, ownerId, user: picked, role: classMode ? 'edit' : role, perms: classMode ? perms : {}, senderName: currentUser.fullName });
      setPicked(null); setQ('');
      setMsg({ ok: true, text: `Đã thêm ${picked.fullName}.` });
      await load();
    } catch (e: any) { setMsg({ ok: false, text: e?.message || 'Chưa thêm được, vui lòng thử lại.' }); }
    finally { setBusy(false); }
  };
  const change = async (c: Collaborator, patch: { role?: CollabRole; perms?: ClassPerms }) => {
    setMsg(null);
    try { await updateCollaborator(c, patch); setList(prev => prev.map(x => (x.id === c.id ? { ...x, ...patch, perms: patch.perms ?? x.perms } : x))); }
    catch (e: any) { setMsg({ ok: false, text: e?.message || 'Chưa đổi được quyền.' }); }
  };
  const remove = async (c: Collaborator) => {
    setMsg(null);
    try { await removeCollaborator(c); setList(prev => prev.filter(x => x.id !== c.id)); if (c.userId === currentUser.id) onClose(); }
    catch (e: any) { setMsg({ ok: false, text: e?.message || 'Chưa bỏ được người này.' }); }
  };

  const PermBoxes = ({ value, onChange, disabled }: { value: ClassPerms; onChange: (p: ClassPerms) => void; disabled?: boolean }) => (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {CLASS_PERM_LABELS.map(([k, label]) => (
        <label key={k} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] ${disabled ? 'text-slate-400' : 'cursor-pointer text-slate-700 hover:bg-slate-50'}`}>
          <input type="checkbox" disabled={disabled} checked={!!value[k]} onChange={e => onChange({ ...value, [k]: e.target.checked })} className="h-4 w-4 accent-brand" /> {label}
        </label>
      ))}
    </div>
  );
  const RoleSelect = ({ value, onChange, disabled }: { value: CollabRole; onChange: (r: CollabRole) => void; disabled?: boolean }) => (
    <select value={value} disabled={disabled} onChange={e => onChange(e.target.value as CollabRole)} title={ROLE_LABELS[value].hint}
      className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-[13px] font-semibold text-slate-700 outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-400">
      {(Object.keys(ROLE_LABELS) as CollabRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r].label}</option>)}
    </select>
  );

  return createPortal(
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-semibold text-slate-800"><Users className="h-4 w-4 text-brand" /> Cộng tác</p>
            <p className="mt-0.5 truncate text-[13px] text-slate-500">{TYPE_LABELS[type][0].toUpperCase() + TYPE_LABELS[type].slice(1)}: {resourceTitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {canManage && (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
              {picked ? (
                <div className="flex items-center gap-3 rounded-xl bg-white p-2.5">
                  <Avatar id={picked.id} name={picked.fullName} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{picked.fullName}</p><p className="truncate text-xs text-slate-500">{picked.email}</p></div>
                  <button type="button" onClick={() => setPicked(null)} aria-label="Chọn người khác" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên hoặc email trong EduGo..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand" />
                  {results.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
                      {results.map(u => (
                        <button key={u.id} type="button" onClick={() => { setPicked(u); setResults([]); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                          <Avatar id={u.id} name={u.fullName} />
                          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{u.fullName}</span><span className="block truncate text-xs text-slate-500">{u.email}</span></span>
                        </button>
                      ))}
                    </div>
                  )}
                  {q.trim() && !results.length && <p className="mt-1.5 text-xs text-slate-400">Chưa thấy tài khoản phù hợp.</p>}
                </div>
              )}
              {picked && (classMode
                ? <PermBoxes value={perms} onChange={setPerms} />
                : <div className="flex flex-wrap items-center gap-2"><span className="text-[13px] text-slate-600">Quyền</span><RoleSelect value={role} onChange={setRole} /><span className="text-xs text-slate-500">{ROLE_LABELS[role].hint}</span></div>)}
              <div className="flex justify-end">
                <button type="button" disabled={!picked || busy} onClick={add} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Thêm
                </button>
              </div>
            </div>
          )}

          {msg && <p className={`rounded-xl px-3 py-2 text-[13px] font-semibold ${msg.ok ? 'bg-brand-light text-brand' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</p>}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">Người có quyền</p>
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
              <Avatar id={ownerId} name={ownerName} />
              <div className="min-w-0 flex-1"><p className="truncate"><PName id={ownerId} name={ownerName || 'Chủ sở hữu'} suffix={ownerId === currentUser.id ? ' (bạn)' : ''} /></p></div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"><Crown className="h-3.5 w-3.5" /> Chủ sở hữu</span>
            </div>
            {loading ? (
              <p className="py-4 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-1 h-5 w-5 animate-spin" /> Đang tải...</p>
            ) : list.map(c => (
              <div key={c.id} className="space-y-2 rounded-xl border border-slate-100 p-2.5">
                <div className="flex items-center gap-3">
                  <Avatar id={c.userId} name={c.userName} />
                  <div className="min-w-0 flex-1"><p className="truncate"><PName id={c.userId} name={c.userName} suffix={c.userId === currentUser.id ? ' (bạn)' : ''} /></p><p className="truncate text-xs text-slate-500">{c.userEmail}</p></div>
                  {!classMode && <RoleSelect value={c.role} disabled={!canManage} onChange={r => change(c, { role: r })} />}
                  {(canManage || c.userId === currentUser.id) && (
                    <button type="button" onClick={() => remove(c)} title={c.userId === currentUser.id ? 'Rời khỏi cộng tác' : 'Bỏ người này'} aria-label="Bỏ người này"
                      className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                {classMode && <PermBoxes value={c.perms} disabled={!canManage} onChange={p => change(c, { perms: p })} />}
              </div>
            ))}
            {!loading && !list.length && <p className="py-2 text-center text-[13px] text-slate-400">Chưa thêm ai.</p>}
          </div>
        </div>
      </div>
    </div>, document.body);
}
