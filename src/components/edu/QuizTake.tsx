import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ListChecks, Flag, ChevronLeft, ChevronRight, Send, Loader2, AlertTriangle, Maximize2, CheckCircle2, Trophy } from 'lucide-react';
import { rpcQuizOpen, rpcQuizStart, rpcSaveAnswer, rpcLogEvent, rpcSubmit } from '../../lib/quiz';

interface QuizTakeProps { slug: string; }

interface TakeQuestion {
  item_id: string;
  question_id: string;
  content: string;
  type: 'single' | 'multiple';
  points: number;
  options: { id: string; content: string }[];
}

type Phase = 'enter' | 'ready' | 'taking' | 'done';

export default function QuizTake({ slug }: QuizTakeProps) {
  const [phase, setPhase] = useState<Phase>('enter');
  const [studentCode, setStudentCode] = useState('');
  const [info, setInfo] = useState<any>(null);        // kết quả quiz_open
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [attemptId, setAttemptId] = useState<string>('');
  const [questions, setQuestions] = useState<TakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [deadline, setDeadline] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [fsWarn, setFsWarn] = useState(false);
  const proctorOn = useRef(false);
  const submittedRef = useRef(false);

  const LS_KEY = `quiz_answers_${slug}_${studentCode}`;

  // ---------------- Vào thi ----------------
  const checkStudent = async () => {
    if (!studentCode.trim()) { setError('Vui lòng nhập mã số sinh viên.'); return; }
    setLoading(true); setError('');
    try {
      const r = await rpcQuizOpen(slug, studentCode.trim());
      if (!r?.ok) { setError(r?.error || 'Không mở được đề.'); setInfo(null); }
      else { setInfo(r); setPhase('ready'); }
    } catch (e: any) { setError('Lỗi kết nối: ' + (e.message || e)); }
    finally { setLoading(false); }
  };

  // ---------------- Bắt đầu làm ----------------
  const start = async () => {
    setLoading(true); setError('');
    try {
      const r = await rpcQuizStart(slug, studentCode.trim());
      if (!r?.ok) { setError(r?.error || 'Không bắt đầu được.'); setLoading(false); return; }
      setAttemptId(r.attempt_id);
      setQuestions(r.questions || []);
      const dl = Date.parse(r.deadline);
      setDeadline(dl);
      setRemaining(Math.max(0, Math.floor((dl - Date.now()) / 1000)));
      // Khôi phục câu trả lời tạm nếu có (mất mạng trước đó)
      try { const raw = localStorage.getItem(LS_KEY); if (raw) setAnswers(JSON.parse(raw)); } catch {}
      setPhase('taking');
      if (info?.quiz?.fullscreen) enterFullscreen();
    } catch (e: any) { setError('Lỗi bắt đầu: ' + (e.message || e)); }
    finally { setLoading(false); }
  };

  const enterFullscreen = () => {
    const el: any = document.documentElement;
    (el.requestFullscreen?.() || el.webkitRequestFullscreen?.())?.catch?.(() => {});
  };

  // ---------------- Đồng hồ đếm ngược ----------------
  useEffect(() => {
    if (phase !== 'taking') return;
    const t = setInterval(() => {
      const rem = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) { clearInterval(t); doSubmit(true); }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, deadline]);

  // ---------------- Giám sát ----------------
  const log = useCallback((event: string, durationMs?: number) => {
    if (!attemptId) return;
    rpcLogEvent(attemptId, event, durationMs).catch(() => {});
  }, [attemptId]);

  useEffect(() => {
    if (phase !== 'taking' || !info?.quiz?.fullscreen) return;
    proctorOn.current = true;
    let hiddenAt = 0;
    const onFsChange = () => {
      const inFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (inFs) { log('enter_fullscreen'); setFsWarn(false); }
      else { log('exit_fullscreen'); setFsWarn(true); }
    };
    const onVis = () => {
      if (document.hidden) { hiddenAt = Date.now(); log('tab_hidden'); }
      else { log('tab_visible', hiddenAt ? Date.now() - hiddenAt : undefined); hiddenAt = 0; }
    };
    const onBlur = () => log('window_blur');
    const onFocus = () => log('window_focus');
    const onCopy = () => log('copy');
    const onPaste = () => log('paste');
    const onCtx = (e: MouseEvent) => { e.preventDefault(); log('contextmenu'); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') log('escape_key'); };
    const onBeforeUnload = () => { log('reload'); };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange as any);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange as any);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, info, log]);

  // ---------------- Trả lời + lưu tạm ----------------
  const persistLocal = (next: Record<string, string[]>) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  };
  const syncAnswer = (questionId: string, optionIds: string[]) => {
    rpcSaveAnswer(attemptId, questionId, optionIds).catch(() => {
      // Mất mạng: giữ trong localStorage, thử lại khi có mạng.
      const onOnline = () => { rpcSaveAnswer(attemptId, questionId, optionIds).catch(() => {}); window.removeEventListener('online', onOnline); };
      window.addEventListener('online', onOnline);
    });
  };
  const select = (q: TakeQuestion, optId: string) => {
    setAnswers(prev => {
      const cur = prev[q.question_id] || [];
      let nextSel: string[];
      if (q.type === 'single') nextSel = [optId];
      else nextSel = cur.includes(optId) ? cur.filter(x => x !== optId) : [...cur, optId];
      const next = { ...prev, [q.question_id]: nextSel };
      persistLocal(next);
      syncAnswer(q.question_id, nextSel);
      return next;
    });
  };
  const toggleFlag = (qid: string) => setFlags(s => { const n = new Set(s); n.has(qid) ? n.delete(qid) : n.add(qid); return n; });

  // ---------------- Nộp bài ----------------
  const doSubmit = async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const r = await rpcSubmit(attemptId, auto);
      setResult(r);
      setPhase('done');
      try { localStorage.removeItem(LS_KEY); } catch {}
      if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
    } catch (e: any) {
      submittedRef.current = false;
      setError('Lỗi nộp bài: ' + (e.message || e));
    } finally { setSubmitting(false); }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const answeredCount = questions.filter(q => (answers[q.question_id] || []).length > 0).length;

  // ============================= RENDER =============================
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800">{children}</div>
  );

  if (phase === 'enter' || phase === 'ready') {
    return shell(
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10">
        <div className="w-full rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
          <h1 className="font-display text-xl font-black text-slate-900">{info?.quiz?.title || 'Vào làm bài trắc nghiệm'}</h1>
          <p className="mt-1 text-xs text-slate-400">Nhập mã số sinh viên để vào làm bài. Không cần đăng nhập.</p>

          {info && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-center">
              <div><p className="text-lg font-black text-slate-800">{info.quiz.num_questions}</p><p className="text-[10px] font-semibold text-slate-400">Số câu</p></div>
              <div><p className="text-lg font-black text-slate-800">{info.quiz.duration}′</p><p className="text-[10px] font-semibold text-slate-400">Thời gian</p></div>
              <div><p className="text-lg font-black text-slate-800">{info.quiz.total_points}</p><p className="text-[10px] font-semibold text-slate-400">Tổng điểm</p></div>
              <div><p className="text-lg font-black text-slate-800">{info.attempts_used}/{info.quiz.max_attempts}</p><p className="text-[10px] font-semibold text-slate-400">Số lần đã làm</p></div>
            </div>
          )}

          {phase === 'enter' ? (
            <div className="mt-5 space-y-3">
              <input value={studentCode} onChange={e => setStudentCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkStudent()} placeholder="Mã số sinh viên" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />
              {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
              <button onClick={checkStudent} disabled={loading} className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">{loading ? 'Đang kiểm tra...' : 'Tiếp tục'}</button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-brand/20 bg-brand-light/40 p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500">Xác nhận sinh viên</p>
                <p className="mt-0.5 text-base font-black text-slate-900">{info.student.name}</p>
                <p className="text-xs font-semibold text-slate-500">MSSV: {studentCode}</p>
              </div>
              {info.quiz.fullscreen && <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-600"><Maximize2 className="h-3.5 w-3.5" /> Bài thi chạy ở chế độ toàn màn hình</p>}
              {error && <p className="text-center text-xs font-semibold text-rose-600">{error}</p>}
              {info.can_start ? (
                <button onClick={start} disabled={loading} className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">{loading ? 'Đang tải đề...' : 'Bắt đầu làm bài'}</button>
              ) : (
                <p className="text-center text-sm font-bold text-rose-600">Bạn đã hết số lần làm bài.</p>
              )}
              <button onClick={() => { setPhase('enter'); setInfo(null); }} className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200">Không phải bạn? Nhập lại MSSV</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    const vis = result?.visibility;
    return shell(
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <div className="w-full rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand"><CheckCircle2 className="h-9 w-9" /></div>
          <h1 className="mt-4 font-display text-xl font-black text-slate-900">Đã nộp bài</h1>
          {vis === 'hidden' ? (
            <p className="mt-2 text-sm text-slate-500">Bài của bạn đã được ghi nhận. Điểm sẽ do giảng viên công bố.</p>
          ) : (
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-brand-light px-5 py-3">
                <Trophy className="h-5 w-5 text-brand" />
                <span className="text-2xl font-black text-brand">{result?.score}</span>
                <span className="text-sm font-bold text-slate-500">/ {result?.max_score}</span>
              </div>
              {vis === 'score_and_answers' && <p className="mt-3 text-[11px] text-slate-400">Xem đáp án đúng ở bảng kết quả do giảng viên cung cấp.</p>}
            </div>
          )}
          <p className="mt-5 text-[11px] text-slate-400">Bạn có thể đóng trang này.</p>
        </div>
      </div>
    );
  }

  // ---------------- Đang làm bài ----------------
  const q = questions[current];
  return shell(
    <div className="mx-auto max-w-5xl px-4 py-5">
      {/* Thanh trên: đồng hồ + tiến độ */}
      <div className="sticky top-0 z-20 mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><ListChecks className="h-4 w-4 text-brand" /> Đã trả lời {answeredCount}/{questions.length}</div>
        <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-black ${remaining <= 60 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'}`}><Clock className="h-4 w-4" /> {fmt(remaining)}</div>
      </div>

      {fsWarn && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-bold text-amber-700"><AlertTriangle className="h-4 w-4" /> Bạn đã rời chế độ toàn màn hình. Vui lòng quay lại để tiếp tục.</span>
          <button onClick={enterFullscreen} className="rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600">Vào lại toàn màn hình</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
        {/* Câu hỏi */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex h-7 items-center rounded-full bg-brand px-3 text-[11px] font-black text-white">Câu {current + 1}/{questions.length}</span>
            <button onClick={() => toggleFlag(q.question_id)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold ${flags.has(q.question_id) ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><Flag className="h-3.5 w-3.5" /> {flags.has(q.question_id) ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}</button>
          </div>
          <div className="prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: q.content }} />
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{q.type === 'single' ? 'Chọn 1 đáp án' : 'Chọn nhiều đáp án'} · {q.points} điểm</p>

          <div className="mt-4 space-y-2.5">
            {q.options.map((o, i) => {
              const sel = (answers[q.question_id] || []).includes(o.id);
              return (
                <button key={o.id} onClick={() => select(q, o.id)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${sel ? 'border-brand bg-brand-light/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center border-2 ${q.type === 'single' ? 'rounded-full' : 'rounded-md'} ${sel ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}><CheckCircle2 className="h-3.5 w-3.5" /></span>
                  <span className="text-xs font-black text-slate-400">{String.fromCharCode(65 + i)}</span>
                  <span className="text-sm font-medium text-slate-800">{o.content}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Câu trước</button>
            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover">Câu sau <ChevronRight className="h-4 w-4" /></button>
            ) : (
              <button onClick={() => doSubmit(false)} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Nộp bài</button>
            )}
          </div>
        </div>

        {/* Bảng điều hướng câu */}
        <div className="h-fit rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Danh sách câu</p>
          <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
            {questions.map((qq, i) => {
              const answered = (answers[qq.question_id] || []).length > 0;
              const flagged = flags.has(qq.question_id);
              return (
                <button key={qq.question_id} onClick={() => setCurrent(i)} className={`relative grid h-9 w-full place-items-center rounded-lg text-xs font-black ${i === current ? 'ring-2 ring-brand ring-offset-1' : ''} ${answered ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {i + 1}
                  {flagged && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />}
                </button>
              );
            })}
          </div>
          <button onClick={() => doSubmit(false)} disabled={submitting} className="mt-4 w-full rounded-xl bg-brand py-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50">{submitting ? 'Đang nộp...' : 'Nộp bài'}</button>
          <p className="mt-2 text-center text-[10px] text-slate-400">Bài tự nộp khi hết giờ.</p>
        </div>
      </div>
    </div>
  );
}
