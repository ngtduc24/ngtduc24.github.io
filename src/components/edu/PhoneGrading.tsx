import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, List, MoreHorizontal, Minus, Plus, Keyboard, ArrowRight, MessageSquare, Maximize2, X, Download, FileText, Film, Search, Check, RotateCcw, ScanSearch, AlertTriangle, Loader2, CloudOff, CheckCircle2, Type } from 'lucide-react';
import type { EduUser, EduSubmission, EduAssignment, EduSubmissionFile } from '../../types/edu';
import type { SimilarityMap } from './SimilarityCheck';
import { askText } from '../ui/Dialogs';

type Row = { score: string; note: string };
type LateInfo = { late: boolean; extended: boolean; text?: string; at?: Date } | null;
interface Props {
  users: EduUser[];
  submissions: EduSubmission[];
  assignment: EduAssignment | null;
  gradingData: Record<string, Row>;
  saveState: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  savedAt: Date | null;
  invalidIds: Set<string>;
  simMap: SimilarityMap;
  lateInfo: (s: EduSubmission) => LateInfo;
  onScore: (uid: string, score: string) => void;
  onNote: (uid: string, note: string) => void;
  flush: () => Promise<void> | void;
  onReopen: (submissionId: string, uid: string, name: string) => void;
  onSimilarity: () => void;
  resolveFile: (s: EduSubmission, f: EduSubmissionFile, idx: number) => Promise<EduSubmissionFile>;
  onBack: () => void;
}

const QUICK = ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5', '4', '0'];
const DEFAULT_TPL = ['Bài làm tốt', 'Bố cục tốt', 'Cần chỉnh màu', 'Thiếu tệp nguồn', 'Làm lại phần chưa đạt'];
const TPL_KEY = 'edu_grade_note_templates';
const COLORS = ['#f97316', '#8b5cf6', '#0ea5e9', '#10b981', '#e11d48', '#f59e0b', '#6366f1', '#14b8a6'];
const num = (v?: string) => { const t = (v || '').trim().replace(',', '.'); if (!t) return null; const n = Number(t); return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null; };
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase();
const extOf = (f: EduSubmissionFile) => (f.name.split('.').pop() || '').toLowerCase();
const isImg = (f: EduSubmissionFile) => f.type?.includes('image') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(extOf(f));
const isVid = (f: EduSubmissionFile) => f.type?.includes('video') || ['mp4', 'mov', 'webm', 'm4v'].includes(extOf(f));
const when = (iso?: string) => iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';

// Giao diện chấm bài trên điện thoại: danh sách bài nộp, chấm từng bài với bảng chấm dưới ngón cái,
// nhập điểm nhanh bằng bàn phím số riêng, màn hoàn tất. Điểm và nhận xét dùng chung cơ chế tự lưu của màn chấm.
export default function PhoneGrading(p: Props) {
  const [mode, setMode] = useState<'list' | 'one' | 'fast' | 'done'>('list');
  const [filter, setFilter] = useState<'pending' | 'done' | 'late' | 'none' | 'sim' | 'all'>('pending');
  const [q, setQ] = useState('');
  const [queue, setQueue] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [menu, setMenu] = useState(false);
  const [tpl, setTpl] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(TPL_KEY) || 'null') || DEFAULT_TPL; } catch { return DEFAULT_TPL; } });
  const saveTpl = (t: string[]) => { setTpl(t); try { localStorage.setItem(TPL_KEY, JSON.stringify(t)); } catch { /* bỏ qua */ } };

  const students = useMemo(() => [...p.users].sort((a, b) => (a.stt || 0) - (b.stt || 0)), [p.users]);
  const subOf = (uid: string) => p.submissions.find(s => s.userId === uid);
  const scoreOf = (uid: string) => num(p.gradingData[uid]?.score);
  const cats = useMemo(() => {
    const c = { pending: [] as string[], done: [] as string[], late: [] as string[], none: [] as string[], sim: [] as string[], all: [] as string[] };
    students.forEach(u => {
      const s = subOf(u.id); const sc = scoreOf(u.id);
      c.all.push(u.id);
      if (!s && sc === null) c.none.push(u.id);
      if (s && sc === null) c.pending.push(u.id);
      if (sc !== null) c.done.push(u.id);
      if (s && p.lateInfo(s)?.late) c.late.push(u.id);
      if (p.simMap[u.id]) c.sim.push(u.id);
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, p.submissions, p.gradingData, p.simMap]);
  const submittedCount = students.filter(u => subOf(u.id) || scoreOf(u.id) !== null).length;
  const doneScores = cats.done.map(id => scoreOf(id) as number);
  const avg = doneScores.length ? doneScores.reduce((a, b) => a + b, 0) / doneScores.length : null;

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const listIds = cats[filter].filter(id => { if (!q.trim()) return true; const u = students.find(x => x.id === id)!; return norm(`${u.fullName} ${u.mssv}`).includes(norm(q.trim())); });

  const startOne = (ids: string[], at = 0) => { setQueue(ids); setIdx(at); setMode('one'); };
  const uid = queue[idx];
  const cur = students.find(u => u.id === uid);

  const saveText = p.saveState === 'saving' ? 'Đang lưu...' : p.saveState === 'pending' ? 'Chờ lưu...' : p.saveState === 'error' ? (p.invalidIds.size ? 'Điểm phải từ 0 đến 10' : 'Chưa lưu được, đang thử lại') : p.savedAt ? `Đã tự lưu lúc ${p.savedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Tự lưu khi chấm';
  const SaveIcon = p.saveState === 'saving' ? Loader2 : p.saveState === 'error' ? CloudOff : CheckCircle2;

  const head = (title: string, sub: string, left: React.ReactNode, right?: React.ReactNode) => (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-100 bg-white px-3 pb-2.5 pt-[calc(10px+env(safe-area-inset-top))]">
      {left}
      <div className="min-w-0 flex-1"><b className="block truncate text-[15px] font-extrabold text-slate-900">{title}</b><small className="block truncate text-xs text-slate-500">{sub}</small></div>
      {right}
    </div>
  );
  const iconBtn = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 active:scale-95';

  // Màn chấm chiếm trọn màn hình: ẩn thanh dưới để bàn phím và ô nhận xét không bị che.
  useEffect(() => {
    document.documentElement.classList.add('ph-immersive');
    return () => { document.documentElement.classList.remove('ph-immersive'); };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[45] flex flex-col bg-[#f3f6f9] text-slate-800">
      {mode === 'list' && (
        <>
          <div className="flex-1 overflow-y-auto pb-28">
            {head(p.assignment?.title || 'Chấm bài', p.assignment?.deadline ? `Hạn ${when(p.assignment.deadline)}` : 'Không đặt hạn nộp',
              <button className={iconBtn} onClick={async () => { await p.flush(); p.onBack(); }} aria-label="Quay lại"><ChevronLeft className="h-5 w-5" /></button>,
              <button className={iconBtn} onClick={() => setMenu(true)} aria-label="Thêm"><MoreHorizontal className="h-5 w-5" /></button>)}
            <div className="mx-4 mt-3 rounded-[18px] bg-gradient-to-br from-brand-hover to-brand p-3.5 text-white" style={{ background: 'linear-gradient(135deg,var(--color-brand-hover),color-mix(in srgb,var(--color-brand-hover) 78%,#022c22))' }}>
              <div className="flex items-end justify-between">
                <b className="text-[26px] font-extrabold leading-none">{cats.done.length}<small className="text-sm font-semibold opacity-80">/{submittedCount} đã chấm</small></b>
                <span className="text-right text-xs leading-relaxed opacity-90">{avg !== null ? `Điểm TB ${fmt(avg)}` : 'Chưa có điểm'}<br /><span className="inline-flex items-center gap-1"><SaveIcon className={`h-3 w-3 ${p.saveState === 'saving' ? 'animate-spin' : ''}`} />{saveText}</span></span>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded bg-white/25"><i className="block h-full rounded bg-white" style={{ width: `${submittedCount ? (cats.done.length / submittedCount) * 100 : 0}%` }} /></div>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-1 pt-3 scrollbar-none">
              {([['pending', 'Chờ chấm'], ['done', 'Đã chấm'], ['late', 'Nộp trễ'], ['none', 'Chưa nộp'], ['sim', 'Giống bài'], ['all', 'Tất cả']] as const).map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${filter === k ? 'border-transparent bg-brand-light text-brand-hover' : 'border-slate-200 bg-white text-slate-500'}`}>
                  {l}<em className="rounded-lg bg-slate-100 px-1.5 text-[11px] font-extrabold not-italic text-slate-600">{cats[k].length}</em>
                </button>
              ))}
            </div>
            <div className="mx-4 mt-2 flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search className="h-4 w-4 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm tên hoặc MSSV" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
            {listIds.map((id, i) => {
              const u = students.find(x => x.id === id)!; const s = subOf(id); const sc = scoreOf(id); const li = s ? p.lateInfo(s) : null; const sim = p.simMap[id];
              return (
                <button key={id} onClick={() => s && startOne(listIds.filter(x => subOf(x)), listIds.filter(x => subOf(x)).indexOf(id))} className="mx-4 mt-2 flex w-[calc(100%-32px)] items-center gap-3 rounded-2xl bg-white p-3 text-left">
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] text-sm font-extrabold text-white" style={{ background: s ? COLORS[i % COLORS.length] : '#94a3b8' }}>{initials(u.fullName)}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[14.5px] text-slate-900">{u.fullName}</b>
                    <small className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">{u.mssv}
                      {!s ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-extrabold text-slate-400">Chưa nộp</span>
                        : li?.late ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-extrabold text-amber-700">Trễ {li.text}</span>
                        : <span className="rounded-md bg-brand-light px-1.5 py-0.5 text-[10.5px] font-extrabold text-brand-hover">Đúng hạn</span>}
                      {sim && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-extrabold text-rose-600">Giống {sim.pct}%</span>}
                      {s && <span>{s.files?.length ? `${s.files.length} tệp` : s.content ? 'Văn bản' : ''}</span>}
                    </small>
                  </span>
                  {sc !== null ? <span className="grid h-10 min-w-[54px] place-items-center rounded-xl bg-brand-light px-2 text-[17px] font-extrabold text-brand-hover">{fmt(sc)}</span>
                    : s ? <span className="grid h-10 place-items-center rounded-xl bg-brand px-3 text-[13px] font-bold text-white">Chấm</span>
                    : <span className="text-[13px] text-slate-300">Chưa nộp</span>}
                </button>
              );
            })}
            {!listIds.length && <p className="px-6 py-12 text-center text-sm text-slate-400">{filter === 'pending' ? 'Đã chấm hết bài nộp.' : 'Không có sinh viên nào trong mục này.'}</p>}
          </div>
          <div className="flex gap-2.5 rounded-t-[22px] bg-white px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,.08)]">
            <button onClick={() => { setQueue(students.map(u => u.id)); setIdx(Math.max(0, students.findIndex(u => scoreOf(u.id) === null))); setMode('fast'); }} className="grid h-[50px] w-[50px] place-items-center rounded-[15px] border-[1.5px] border-brand text-brand-hover" aria-label="Nhập điểm nhanh"><Keyboard className="h-5 w-5" /></button>
            <button disabled={!cats.pending.length} onClick={() => startOne(cats.pending)} className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[15px] bg-brand text-[15px] font-bold text-white disabled:opacity-50"><ArrowRight className="h-5 w-5" />{cats.pending.length ? `Chấm lần lượt ${cats.pending.length} bài` : 'Đã chấm hết'}</button>
          </div>
        </>
      )}

      {mode === 'one' && cur && (
        <OneSubmission key={cur.id} user={cur} sub={subOf(cur.id)} row={p.gradingData[cur.id] || { score: '', note: '' }} pos={`${idx + 1}/${queue.length}`}
          late={subOf(cur.id) ? p.lateInfo(subOf(cur.id)!) : null} sim={p.simMap[cur.id]} invalid={p.invalidIds.has(cur.id)} saveText={saveText} saveState={p.saveState}
          tpl={tpl} onTpl={saveTpl} onScore={v => p.onScore(cur.id, v)} onNote={v => p.onNote(cur.id, v)} resolveFile={p.resolveFile}
          onList={async () => { await p.flush(); setMode('list'); }} onPrev={() => setIdx(i => Math.max(0, i - 1))} onNext={() => setIdx(i => Math.min(queue.length - 1, i + 1))}
          onMenu={() => setMenu(true)}
          onSaveNext={async () => { await p.flush(); if (idx + 1 < queue.length) setIdx(idx + 1); else setMode('done'); }} />
      )}

      {mode === 'fast' && (
        <FastEntry students={students} subOf={subOf} data={p.gradingData} start={idx} onScore={p.onScore} saveText={saveText}
          onBack={async () => { await p.flush(); setMode('list'); }} onDone={async () => { await p.flush(); setMode('done'); }} />
      )}

      {mode === 'done' && (
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 pb-6 pt-[calc(40px+env(safe-area-inset-top))] text-center">
            <div className="mx-auto mb-3.5 grid h-[76px] w-[76px] place-items-center rounded-[26px] bg-brand-light text-brand-hover"><Check className="h-10 w-10" strokeWidth={2.4} /></div>
            <h2 className="text-[21px] font-extrabold text-slate-900">Đã chấm {cats.done.length}/{submittedCount} bài nộp</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">{cats.pending.length ? `Còn ${cats.pending.length} bài chưa chấm.` : 'Đã chấm hết bài nộp.'} {cats.none.length ? `${cats.none.length} sinh viên chưa nộp được để trống.` : ''} Điểm đã tự lưu.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[['Điểm TB', avg !== null ? fmt(avg) : '-'], ['Cao nhất', doneScores.length ? fmt(Math.max(...doneScores)) : '-'], ['Thấp nhất', doneScores.length ? fmt(Math.min(...doneScores)) : '-']].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-white px-1.5 py-3"><b className="block text-xl font-extrabold text-slate-900">{v}</b><small className="text-[11.5px] text-slate-500">{l}</small></div>
              ))}
            </div>
            <Dist scores={doneScores} />
          </div>
          <div className="flex gap-2.5 rounded-t-[22px] bg-white px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,.08)]">
            <button onClick={() => setMode('list')} className="h-[50px] flex-1 rounded-[15px] border-[1.5px] border-brand text-[15px] font-bold text-brand-hover">Danh sách</button>
            <button onClick={() => { if (cats.pending.length) startOne(cats.pending); else p.onBack(); }} className="h-[50px] flex-1 rounded-[15px] bg-brand text-[15px] font-bold text-white">{cats.pending.length ? 'Chấm tiếp' : 'Xong'}</button>
          </div>
        </div>
      )}

      {menu && (
        <div className="fixed inset-0 z-[55] flex items-end bg-slate-900/45" onClick={() => setMenu(false)}>
          <div className="w-full rounded-t-[26px] bg-white px-[18px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-2.5" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-3.5 h-[5px] w-10 rounded bg-slate-300" />
            {mode === 'one' && cur && subOf(cur.id) && (
              <MenuItem icon={RotateCcw} title="Cho nộp lại" sub="Mở 24 giờ cho sinh viên này sửa hoặc nộp bổ sung" onClick={() => { setMenu(false); p.onReopen(subOf(cur.id)!.id, cur.id, cur.fullName); }} />
            )}
            <MenuItem icon={ScanSearch} title="Kiểm tra trùng bài" sub="So ảnh bài nộp giữa các sinh viên" onClick={() => { setMenu(false); p.onSimilarity(); }} />
            <MenuItem icon={Keyboard} title="Nhập điểm nhanh" sub="Bàn phím số riêng, bấm Tiếp sang người sau" onClick={() => { setMenu(false); setIdx(0); setMode('fast'); }} />
            <MenuItem icon={CheckCircle2} title="Thống kê điểm" sub="Điểm trung bình, phân bố điểm" onClick={() => { setMenu(false); setMode('done'); }} />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function MenuItem({ icon: Icon, title, sub, onClick }: { icon: any; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-slate-100 px-1 py-3 text-left last:border-0">
      <Icon className="h-6 w-6 text-brand-hover" /><span><span className="block text-[15px] text-slate-900">{title}</span><small className="block text-xs text-slate-500">{sub}</small></span>
    </button>
  );
}

function Dist({ scores }: { scores: number[] }) {
  const bins = [['<5', (s: number) => s < 5], ['5', (s: number) => s >= 5 && s < 6], ['6', (s: number) => s >= 6 && s < 7], ['7 đến 8', (s: number) => s >= 7 && s <= 8], ['8,5 đến 9,5', (s: number) => s > 8 && s < 10], ['10', (s: number) => s === 10]] as const;
  const counts = bins.map(([, f]) => scores.filter(f).length);
  const max = Math.max(1, ...counts);
  return (
    <div className="mt-2.5 rounded-[18px] bg-white p-3.5 text-left">
      <h4 className="mb-2.5 text-[13px] font-extrabold text-slate-900">Phân bố điểm</h4>
      <div className="flex h-24 items-end gap-1.5">{counts.map((c, i) => <i key={i} title={`${c} bài`} className={`flex-1 rounded-t-md ${c === max && c > 0 ? 'bg-brand' : 'bg-brand-light'}`} style={{ height: `${Math.max(6, (c / max) * 100)}%` }} />)}</div>
      <div className="mt-1.5 flex gap-1.5">{bins.map(([l], i) => <span key={l} className="flex-1 text-center text-[10.5px] text-slate-500">{l}<br /><b className="text-slate-700">{counts[i]}</b></span>)}</div>
    </div>
  );
}

// ===== Chấm từng bài =====
function OneSubmission({ user, sub, row, pos, late, sim, invalid, saveText, saveState, tpl, onTpl, onScore, onNote, resolveFile, onList, onPrev, onNext, onMenu, onSaveNext }: {
  user: EduUser; sub?: EduSubmission; row: Row; pos: string; late: LateInfo; sim?: { pct: number; withId: string }; invalid: boolean; saveText: string; saveState: Props['saveState'];
  tpl: string[]; onTpl: (t: string[]) => void; onScore: (v: string) => void; onNote: (v: string) => void;
  resolveFile: Props['resolveFile']; onList: () => void; onPrev: () => void; onNext: () => void; onMenu: () => void; onSaveNext: () => void;
}) {
  const files = sub?.files || [];
  const [fi, setFi] = useState(0);
  const [file, setFile] = useState<EduSubmissionFile | null>(null);
  const [loadingF, setLoadingF] = useState(false);
  const [full, setFull] = useState(false);
  const [typing, setTyping] = useState(false);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const f = files[fi]; if (!f) { setFile(null); return; }
    let on = true; setLoadingF(true);
    (f.inline && !f.url ? resolveFile(sub!, f, fi) : Promise.resolve(f)).then(r => { if (on) setFile(r); }).catch(() => { if (on) setFile(null); }).finally(() => { if (on) setLoadingF(false); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fi, sub?.id]);

  const val = num(row.score);
  const step = (d: number) => { const n = Math.min(10, Math.max(0, Math.round(((val ?? 0) + d) * 4) / 4)); onScore(String(n)); };
  const toggleTpl = (t: string) => {
    const parts = (row.note || '').split(/\.\s*/).map(x => x.trim()).filter(Boolean);
    const has = parts.includes(t);
    onNote((has ? parts.filter(x => x !== t) : [...parts, t]).join('. '));
  };
  const addTpl = async () => {
    const v = await askText({ title: 'Thêm nhận xét mẫu', placeholder: 'Ví dụ: Màu sắc hài hoà', okText: 'Thêm' });
    if (v && v.trim() && !tpl.includes(v.trim())) onTpl([...tpl, v.trim()]);
  };

  const viewer = (big: boolean) => {
    if (loadingF) return <div className="grid h-full place-items-center text-white/70"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    if (!file) return <div className="grid h-full place-items-center text-sm text-white/70">Không có tệp</div>;
    if (isImg(file)) return <img src={file.url} alt={file.name} className={`h-full w-full ${big ? 'object-contain' : 'object-cover'}`} />;
    if (isVid(file)) return <video src={file.url} controls playsInline className="h-full w-full bg-black object-contain" />;
    return (
      <div className="grid h-full place-items-center p-4 text-center text-white">
        <div><FileText className="mx-auto mb-2 h-10 w-10 opacity-80" /><p className="mb-3 break-all text-sm font-semibold">{file.name}</p>
          <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-800"><Download className="h-4 w-4" /> Mở tệp</a></div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 pb-2.5 pt-[calc(10px+env(safe-area-inset-top))]">
        <button onClick={onList} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="Danh sách"><List className="h-5 w-5" /></button>
        <button onClick={onPrev} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="Bài trước"><ChevronLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1 text-center"><b className="block truncate text-[15px] font-extrabold text-slate-900">{user.fullName}</b><small className="block truncate text-xs text-slate-500">{user.mssv} · {pos}</small></div>
        <button onClick={onNext} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="Bài sau"><ChevronRight className="h-5 w-5" /></button>
        <button onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="Thêm"><MoreHorizontal className="h-5 w-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto py-2.5">
        <div className="flex flex-wrap gap-1.5 px-4">
          {late?.late ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-extrabold text-amber-700">Nộp trễ {late.text}</span> : <span className="rounded-md bg-brand-light px-1.5 py-0.5 text-[10.5px] font-extrabold text-brand-hover">{late?.extended ? 'Đúng hạn gia hạn' : 'Đúng hạn'}</span>}
          {sub && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-extrabold text-slate-500">Nộp {when(sub.firstSubmittedAt || sub.submittedAt)}</span>}
          {sub && sub.submittedAt !== sub.firstSubmittedAt && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-extrabold text-slate-500">Sửa {when(sub.submittedAt)}</span>}
        </div>
        {sim && <div className="mx-4 mt-2.5 flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 text-[12.5px] font-semibold text-rose-700"><AlertTriangle className="h-4 w-4" />Bài giống {sim.pct}% với một bài khác trong lớp</div>}
        {files.length > 0 && (
          <>
            <div className="relative mx-4 mt-2.5 aspect-[4/3] overflow-hidden rounded-[18px] bg-slate-900">
              {viewer(false)}
              {file && <button onClick={() => setFull(true)} className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-xl bg-slate-900/55 text-white" aria-label="Toàn màn hình"><Maximize2 className="h-4 w-4" /></button>}
              <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-slate-900/55 px-2 py-0.5 text-[11.5px] font-bold text-white">Tệp {fi + 1}/{files.length}</span>
            </div>
            {files.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 pt-2.5 scrollbar-none">
                {files.map((f, i) => (
                  <button key={i} onClick={() => setFi(i)} className={`relative grid h-[60px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-xl border-2 bg-slate-200 text-slate-600 ${i === fi ? 'border-brand' : 'border-transparent'}`}>
                    {isImg(f) && f.url ? <img src={f.url} alt="" className="h-full w-full object-cover" /> : isVid(f) ? <Film className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    {!(isImg(f) && f.url) && <small className="absolute inset-x-1 bottom-0.5 truncate text-center text-[9.5px] font-bold">{f.name}</small>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {sub?.content?.trim() && <div className="mx-4 mt-2.5 whitespace-pre-wrap rounded-2xl bg-white px-3.5 py-3 text-[13.5px] leading-relaxed"><b className="mb-1 flex items-center gap-1 text-xs text-slate-500"><Type className="h-3.5 w-3.5" />Bài làm dạng văn bản</b>{sub.content}</div>}
        {!sub && <p className="px-6 py-10 text-center text-sm text-slate-400">Sinh viên chưa nộp bài, vẫn chấm được nếu chấm trên giấy.</p>}
      </div>

      {/* Bảng chấm dính dưới đáy, trong tầm ngón cái */}
      <div className="rounded-t-[24px] bg-white px-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,.12)]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-[14px] bg-slate-100 p-1">
            <button onClick={() => step(-0.25)} className="grid h-[38px] w-[34px] place-items-center rounded-[10px] bg-white" aria-label="Giảm 0,25"><Minus className="h-4 w-4" /></button>
            {typing ? (
              <input autoFocus inputMode="decimal" value={row.score} onChange={e => onScore(e.target.value)} onBlur={() => setTyping(false)} className={`h-[38px] w-[64px] rounded-lg bg-white text-center text-2xl font-extrabold outline-none ${invalid ? 'text-rose-600 ring-2 ring-rose-300' : 'text-brand-hover'}`} />
            ) : (
              <button onClick={() => setTyping(true)} className={`min-w-[64px] text-center text-2xl font-extrabold ${invalid ? 'text-rose-600' : 'text-brand-hover'}`}>{row.score ? row.score.replace('.', ',') : '–'}</button>
            )}
            <button onClick={() => step(0.25)} className="grid h-[38px] w-[34px] place-items-center rounded-[10px] bg-white" aria-label="Tăng 0,25"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="min-w-0 flex-1 text-xs leading-snug text-slate-500"><b className={`block text-[13px] ${saveState === 'error' ? 'text-rose-600' : 'text-brand-hover'}`}>{saveText}</b>Bấm số để gõ điểm</div>
          <button onClick={() => setTyping(true)} className="grid h-[42px] w-[42px] place-items-center rounded-xl border border-slate-200 text-slate-600" aria-label="Gõ điểm"><Keyboard className="h-5 w-5" /></button>
        </div>
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto scrollbar-none">
          {QUICK.map(v => <button key={v} onClick={() => onScore(v)} className={`grid h-10 min-w-[46px] shrink-0 place-items-center rounded-xl border-[1.5px] px-2 text-[15px] font-extrabold ${num(row.score) === Number(v) ? 'border-brand bg-brand-light text-brand-hover' : 'border-slate-200 text-slate-700'}`}>{v.replace('.', ',')}</button>)}
        </div>
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto scrollbar-none">
          {tpl.map(t => { const on = (row.note || '').split(/\.\s*/).map(x => x.trim()).includes(t); return <button key={t} onClick={() => toggleTpl(t)} className={`shrink-0 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold ${on ? 'bg-brand-light text-brand-hover' : 'bg-slate-100 text-slate-600'}`}>{t}</button>; })}
          <button onClick={addTpl} className="shrink-0 rounded-[10px] bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">+ Thêm mẫu</button>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <MessageSquare className="h-4 w-4 shrink-0 text-slate-400" />
          <input value={row.note || ''} onChange={e => onNote(e.target.value)} placeholder="Nhận xét cho sinh viên" className="h-[42px] min-w-0 flex-1 bg-transparent text-[13.5px] outline-none" />
        </div>
        <button onClick={onSaveNext} className="mt-2.5 flex h-[50px] w-full items-center justify-center gap-2 rounded-[15px] bg-brand text-[15px] font-bold text-white"><ArrowRight className="h-5 w-5" />Lưu và sang bài tiếp</button>
      </div>

      {full && file && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-[calc(12px+env(safe-area-inset-top))] text-white">
            <button onClick={() => { setFull(false); setZoom(1); }} className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-white/15" aria-label="Đóng"><X className="h-5 w-5" /></button>
            <b className="min-w-0 flex-1 truncate text-sm">{file.name} · {fi + 1}/{files.length}</b>
            <a href={file.url} target="_blank" rel="noreferrer" className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-white/15" aria-label="Tải về"><Download className="h-5 w-5" /></a>
          </div>
          {/* Chạm vào ảnh để phóng to 2 lần, chạm lần nữa để thu lại; khi phóng to thì kéo để xem các phần */}
          <div className="relative flex-1 overflow-auto" onClick={() => file && isImg(file) && setZoom(z => (z === 1 ? 2.2 : 1))}>
            {file && isImg(file) ? <img src={file.url} alt={file.name} style={{ width: `${zoom * 100}%`, maxWidth: 'none', height: zoom === 1 ? '100%' : 'auto' }} className={zoom === 1 ? 'object-contain' : ''} /> : viewer(true)}
            {file && isImg(file) && zoom === 1 && <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] text-white/80">Chạm để phóng to</span>}
          </div>
          <div className="mx-3 mb-[calc(14px+env(safe-area-inset-bottom))] mt-2 flex items-center gap-1.5 rounded-[20px] bg-white/95 p-2">
            {files.length > 1 && <button onClick={() => setFi(i => (i - 1 + files.length) % files.length)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>}
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scrollbar-none">
              {['9', '8.5', '8', '7.5', '7'].map(v => <button key={v} onClick={() => onScore(v)} className={`grid h-10 min-w-[44px] shrink-0 place-items-center rounded-xl border-[1.5px] text-[15px] font-extrabold ${num(row.score) === Number(v) ? 'border-brand bg-brand-light text-brand-hover' : 'border-slate-200 text-slate-700'}`}>{v.replace('.', ',')}</button>)}
            </div>
            {files.length > 1 && <button onClick={() => setFi(i => (i + 1) % files.length)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><ChevronRight className="h-5 w-5" /></button>}
            <button onClick={() => setFull(false)} className="h-10 rounded-xl bg-brand px-4 text-sm font-bold text-white">Xong</button>
          </div>
        </div>
      )}
    </>
  );
}

// ===== Nhập điểm nhanh bằng bàn phím số riêng =====
function FastEntry({ students, subOf, data, start, onScore, saveText, onBack, onDone }: {
  students: EduUser[]; subOf: (uid: string) => EduSubmission | undefined; data: Record<string, Row>; start: number;
  onScore: (uid: string, v: string) => void; saveText: string; onBack: () => void; onDone: () => void;
}) {
  const [i, setI] = useState(Math.min(start, Math.max(0, students.length - 1)));
  const [buf, setBuf] = useState<string | null>(null);
  const u = students[i];
  const commit = () => { if (buf !== null && u) onScore(u.id, buf.replace(',', '.')); setBuf(null); };
  const go = (d: number) => { commit(); const n = i + d; if (n >= students.length) { onDone(); return; } setI(Math.max(0, n)); };
  const press = (k: string) => {
    if (k === 'del') { setBuf(b => (b ?? (data[u.id]?.score || '')).slice(0, -1)); return; }
    if (k === '10') { setBuf('10'); return; }
    if (k === ',5') { setBuf(b => { const base = (b ?? '').replace(/[,.].*$/, '') || '0'; return `${base},5`; }); return; }
    setBuf(b => { const cur = b ?? ''; if (cur === '10' || cur.length >= 4) return k; return cur + k; });
  };
  useEffect(() => { const el = document.getElementById(`fe-${i}`); el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [i]);
  const Key = ({ k, label, cls = '' }: { k: string; label?: string; cls?: string }) => <button onClick={() => press(k)} className={`h-12 rounded-xl bg-white text-xl font-bold text-slate-900 shadow-[0_1px_0_rgba(15,23,42,.12)] active:scale-95 ${cls}`}>{label || k}</button>;
  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 pb-2.5 pt-[calc(10px+env(safe-area-inset-top))]">
        <button onClick={() => { commit(); onBack(); }} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-label="Quay lại"><ChevronLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><b className="block text-[15px] font-extrabold text-slate-900">Nhập điểm nhanh</b><small className="block truncate text-xs text-slate-500">{saveText}</small></div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {students.map((s, k) => {
          const on = k === i; const shown = on && buf !== null ? buf : (data[s.id]?.score || '').replace('.', ',');
          return (
            <button key={s.id} id={`fe-${k}`} onClick={() => { commit(); setI(k); }} className="flex w-full items-center gap-2.5 border-b border-slate-100 bg-white px-4 py-2.5 text-left">
              <span className="w-6 text-xs font-bold text-slate-400">{k + 1}</span>
              <span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-900">{s.fullName}</b><small className="text-[11.5px] text-slate-500">{s.mssv} · {subOf(s.id) ? 'đã nộp' : 'chưa nộp'}</small></span>
              <span className={`grid h-10 w-16 place-items-center rounded-xl border-[1.5px] text-[17px] font-extrabold ${on ? 'border-brand text-brand-hover shadow-[0_0_0_3px_var(--color-brand-light)]' : 'border-slate-200 text-slate-900'} ${!shown ? 'text-[13px] text-slate-300' : ''}`}>{shown || (on ? '_' : 'trống')}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1.5 bg-[#e9eef3] p-2 pb-[calc(10px+env(safe-area-inset-bottom))]">
        <Key k="1" /><Key k="2" /><Key k="3" /><Key k="del" label="Xoá" cls="!bg-slate-300/60 !text-sm" />
        <Key k="4" /><Key k="5" /><Key k="6" />
        <button onClick={() => go(1)} className="row-span-2 rounded-xl bg-brand text-sm font-bold text-white">Tiếp</button>
        <Key k="7" /><Key k="8" /><Key k="9" />
        <Key k=",5" cls="!bg-slate-300/60 !text-sm" /><Key k="0" /><Key k="10" cls="!bg-slate-300/60 !text-sm" />
        <button onClick={() => go(-1)} className="h-12 rounded-xl bg-slate-300/60 text-sm font-bold text-slate-800">Trước</button>
      </div>
    </>
  );
}
