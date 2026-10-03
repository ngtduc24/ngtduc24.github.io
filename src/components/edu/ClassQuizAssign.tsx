import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Loader2, CheckCircle2, Plus, ChevronLeft, Link2, BarChart3, Trash2, ListChecks, MoreHorizontal } from 'lucide-react';
import { Quiz, getQuizzes, getSharedQuizzes, getCollabQuizzes, copyQuizToMine, saveQuiz, publishQuiz, assignQuizToClass, unassignQuizFromClass, getClassQuizzes, getQuizItems } from '../../lib/quiz';
import { getGradeColumns, saveGradeColumn, setEduAuthContext } from '../../lib/edu';
import type { EduGradeColumn } from '../../types/edu';
import { prettyShareUrl } from '../../lib/shareLinks';
import { copyText } from '../ui/Dialogs';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import { usePhoneMaybe } from '../phone/PhoneShell';
import { PhoneMenuSheet } from '../phone/PhoneKit';

// Giao Quizz cho đúng lớp đang mở: chọn đề (Thư viện, Được chia sẻ, Của tôi) hoặc tạo đề mới,
// đặt giờ mở, giờ đóng, thời gian làm bài, cột điểm, rồi giao. Dùng chung cho máy tính và điện thoại.

const toLocal = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);
const fmt = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}`;
};
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export function ClassQuizPicker({ classId, className, currentUser, onClose, onDone, onCreateNew }: {
  classId: string; className: string; currentUser: any; onClose: () => void; onDone: () => void; onCreateNew?: () => void;
}) {
  const { addNotification } = useNotifications();
  const [tab, setTab] = useState<'library' | 'shared' | 'mine'>('mine');
  const [mine, setMine] = useState<Quiz[] | null>(null);
  const [lib, setLib] = useState<Quiz[]>([]);
  const [shared, setShared] = useState<Quiz[]>([]);
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<Quiz | null>(null);
  const [cols, setCols] = useState<EduGradeColumn[]>([]);
  const [colChoice, setColChoice] = useState('__new__');
  const [newCol, setNewCol] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [closeAt, setCloseAt] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEduAuthContext(currentUser.id, currentUser.role === 'admin');
    Promise.all([getQuizzes().catch(() => []), getSharedQuizzes().catch(() => []), getCollabQuizzes().then(r => r.quizzes).catch(() => [])])
      .then(([a, b, c]) => { setMine(a); setLib(b); setShared(c); if (!a.length) setTab(b.length ? 'library' : c.length ? 'shared' : 'mine'); });
    getGradeColumns(classId).then(cs => {
      setCols(cs);
      setNewCol('QUIZZ ' + String(cs.filter(c => /^QUIZZ /i.test(c.name)).length + 1).padStart(2, '0'));
    }).catch(() => {});
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const src = tab === 'mine' ? (mine || []) : tab === 'shared' ? shared : lib;
    const k = fold(q.trim());
    return k ? src.filter(x => fold(x.title).includes(k)) : src;
  }, [tab, mine, lib, shared, q]);

  const choose = (x: Quiz) => {
    setPick(x);
    setOpenAt(toLocal(x.open_at) || toLocal(new Date().toISOString()));
    setCloseAt(toLocal(x.close_at));
    setMinutes(String(x.duration_minutes || 30));
    setCount(null);
    getQuizItems(x.id).then(it => setCount(it.length)).catch(() => {});
  };

  const confirm = async () => {
    if (!pick) return;
    if (closeAt && openAt && new Date(closeAt) <= new Date(openAt)) { addNotification('Giờ đóng phải sau giờ mở.', 'warning'); return; }
    setBusy(true);
    try {
      // Đề của người khác (thư viện) thì chép về kho của mình rồi mới giao, để tự chỉnh giờ mở, giờ đóng.
      let quiz = pick;
      if (pick.owner_id !== currentUser.id && tab === 'library') quiz = await copyQuizToMine(pick, currentUser.id, currentUser.fullName);
      quiz = await saveQuiz({ ...quiz, open_at: fromLocal(openAt), close_at: fromLocal(closeAt), duration_minutes: Math.max(1, Number(minutes) || 30) });
      let colId = colChoice;
      if (colChoice === '__new__') {
        if (!newCol.trim()) { addNotification('Nhập tên cột điểm.', 'warning'); setBusy(false); return; }
        const order = cols.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1;
        const saved = await saveGradeColumn({ classId, name: newCol.trim(), order, isConfirmed: false });
        colId = saved.id;
      }
      await assignQuizToClass(quiz.id, classId, colId);
      if (quiz.status !== 'published') await publishQuiz(quiz.id, true);
      addNotification(`Đã giao Quizz "${quiz.title}" cho lớp ${className}.`, 'success');
      onDone(); onClose();
    } catch (e: any) { addNotification('Chưa giao được: ' + (e?.message || e), 'error'); }
    finally { setBusy(false); }
  };

  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[15px] font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white';
  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          {pick && <button type="button" onClick={() => setPick(null)} aria-label="Chọn đề khác" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>}
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-slate-900">{pick ? 'Đặt giờ và giao Quizz' : 'Giao Quizz'}</p>
            <p className="truncate text-xs text-slate-500">Cho lớp {className}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {!pick ? (
          <>
            <div className="space-y-3 px-4 pt-3">
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {([['library', 'Thư viện'], ['shared', 'Được chia sẻ'], ['mine', 'Của tôi']] as const).map(([id, l]) => (
                  <button key={id} type="button" onClick={() => setTab(id)} className={`flex-1 rounded-lg py-2 text-[13px] font-bold ${tab === id ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>{l}</button>
                ))}
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm đề theo tên" className="h-10 flex-1 bg-transparent text-[15px] outline-none" />
              </label>
            </div>
            <div className="min-h-[200px] flex-1 overflow-y-auto px-4 py-3">
              {mine === null ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
                : list.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">{q ? 'Không có đề nào khớp.' : tab === 'mine' ? 'Bạn chưa có đề nào. Bấm Tạo đề mới.' : 'Chưa có đề nào trong mục này.'}</p>
                : (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                    {list.map(x => (
                      <button key={x.id} type="button" onClick={() => choose(x)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50">
                        <ListChecks className="h-6 w-6 shrink-0 text-brand" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-semibold leading-snug text-slate-800">{x.title}</span>
                          <span className="block text-xs text-slate-500">{x.duration_minutes} phút{x.status === 'published' ? ' · Đã phát hành' : ' · Bản nháp'}{tab !== 'mine' && x.owner_name ? ` · ${x.owner_name}` : ''}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
            {onCreateNew && (
              <div className="border-t border-slate-100 p-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
                <button type="button" onClick={() => { onClose(); onCreateNew(); }} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-brand text-sm font-bold text-brand"><Plus className="h-4 w-4" /> Tạo đề mới</button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="rounded-2xl bg-brand-light/60 px-4 py-3">
                <p className="text-[15px] font-bold text-slate-900">{pick.title}</p>
                <p className="text-xs text-slate-500">{count == null ? 'Đang đếm câu hỏi...' : `${count} câu hỏi`}{tab === 'library' && pick.owner_id !== currentUser.id ? ' · Đề sẽ được chép về kho của bạn trước khi giao' : ''}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1"><span className="text-xs font-bold text-slate-500">Mở lúc</span><input type="datetime-local" value={openAt} onChange={e => setOpenAt(e.target.value)} className={field} /></label>
                <label className="block space-y-1"><span className="text-xs font-bold text-slate-500">Đóng lúc (để trống là không đóng)</span><input type="datetime-local" value={closeAt} onChange={e => setCloseAt(e.target.value)} className={field} /></label>
              </div>
              <label className="block space-y-1"><span className="text-xs font-bold text-slate-500">Thời gian làm bài (phút)</span><input type="number" min={1} inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} className={field} /></label>
              <label className="block space-y-1"><span className="text-xs font-bold text-slate-500">Cột điểm nhận kết quả</span>
                <select value={colChoice} onChange={e => setColChoice(e.target.value)} className={field}>
                  <option value="__new__">Tạo cột điểm mới</option>
                  {cols.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              {colChoice === '__new__' && <label className="block space-y-1"><span className="text-xs font-bold text-slate-500">Tên cột điểm mới</span><input value={newCol} onChange={e => setNewCol(e.target.value)} className={field} /></label>}
              <p className="text-xs leading-relaxed text-slate-500">Giờ mở, giờ đóng và thời gian làm bài áp dụng cho đề này. Sinh viên mở link, nhập mã số sinh viên để vào làm, điểm tự về cột đã chọn.</p>
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setPick(null)} className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-bold text-slate-600">Chọn đề khác</button>
              <button type="button" disabled={busy} onClick={confirm} className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Giao cho lớp này</button>
            </div>
          </>
        )}
      </div>
    </div>, document.body);
}

// Danh sách Quizz đã giao cho lớp: tên đề, giờ mở, giờ đóng, chép link, xem kết quả, bỏ giao.
export function ClassQuizList({ classId, reloadKey, canAssign, onOpenQuiz }: {
  classId: string; reloadKey: number; canAssign: boolean; onOpenQuiz?: (quizId: string) => void;
}) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const phone = usePhoneMaybe();
  const [rows, setRows] = useState<Array<{ quiz: Quiz; grade_column_id: string | null }> | null>(null);
  const [menu, setMenu] = useState<Quiz | null>(null);
  const load = () => getClassQuizzes(classId).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, [classId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows || !rows.length) return null;
  const state = (x: Quiz) => {
    const now = Date.now();
    if (x.status !== 'published') return { t: 'Bản nháp', c: 'text-slate-500' };
    if (x.open_at && new Date(x.open_at).getTime() > now) return { t: `Mở lúc ${fmt(x.open_at)}`, c: 'text-amber-600' };
    if (x.close_at && new Date(x.close_at).getTime() < now) return { t: 'Đã đóng', c: 'text-slate-500' };
    return { t: x.close_at ? `Đang mở, đóng ${fmt(x.close_at)}` : 'Đang mở', c: 'text-brand' };
  };
  const copyLink = (x: Quiz) => copyText(prettyShareUrl('quiz', x.slug)).then(ok => addNotification(ok ? 'Đã sao chép link làm bài.' : 'Không sao chép được.', ok ? 'success' : 'error'));
  const unassign = (x: Quiz) => confirm('Bỏ giao Quizz', `Bỏ giao "${x.title}" khỏi lớp này? Điểm đã vào cột điểm vẫn giữ nguyên.`, async () => {
    try { await unassignQuizFromClass(x.id, classId); load(); addNotification('Đã bỏ giao Quizz.', 'success'); }
    catch (e: any) { addNotification('Lỗi: ' + (e?.message || e), 'error'); }
  });

  if (phone) return (
    <div>
      <div className="pk-grp-h"><span>Quizz đã giao</span><em>{rows.length} đề</em></div>
      <div className="pk-grp">
        {rows.map(({ quiz: x }) => { const s = state(x); return (
          <div key={x.id} className="pk-li" role="button" tabIndex={0} onClick={() => onOpenQuiz?.(x.id)}>
            <span className="ic"><ListChecks /></span>
            <span className="m"><b>{x.title}</b><small>{x.duration_minutes} phút · <span className={s.c}>{s.t}</span></small></span>
            <button type="button" className="mn2" aria-label="Thao tác Quizz" onClick={e => { e.stopPropagation(); setMenu(x); }}><MoreHorizontal /></button>
          </div>
        ); })}
      </div>
      {menu && <PhoneMenuSheet title={menu.title} onClose={() => setMenu(null)} items={[
        { key: 'res', label: 'Xem kết quả', icon: BarChart3, hidden: !onOpenQuiz, onClick: () => onOpenQuiz?.(menu.id) },
        { key: 'link', label: 'Sao chép link làm bài', icon: Link2, onClick: () => copyLink(menu) },
        { key: 'un', label: 'Bỏ giao khỏi lớp', icon: Trash2, danger: true, hidden: !canAssign, onClick: () => unassign(menu) },
      ]} />}
    </div>
  );

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-bold text-slate-800">Quizz đã giao cho lớp ({rows.length})</p>
      <div className="divide-y divide-slate-100">
        {rows.map(({ quiz: x }) => { const s = state(x); return (
          <div key={x.id} className="flex flex-wrap items-center gap-3 py-3">
            <ListChecks className="h-5 w-5 shrink-0 text-brand" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">{x.title}</p>
              <p className="text-xs text-slate-500">{x.duration_minutes} phút · <span className={s.c}>{s.t}</span></p>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => copyLink(x)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand/40 hover:text-brand"><Link2 className="h-3.5 w-3.5" /> Link</button>
              {onOpenQuiz && <button type="button" onClick={() => onOpenQuiz(x.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand/40 hover:text-brand"><BarChart3 className="h-3.5 w-3.5" /> Kết quả</button>}
              {canAssign && <button type="button" onClick={() => unassign(x)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Bỏ giao</button>}
            </div>
          </div>
        ); })}
      </div>
    </div>
  );
}
