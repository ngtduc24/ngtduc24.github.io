import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ListChecks, Flag, ChevronLeft, ChevronRight, Send, AlertTriangle, Maximize2, CheckCircle2, Trophy } from 'lucide-react';
import { Button, Input, Field, Card, Badge, Z, Spinner } from '../ui';
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

  // Người học khoá học công khai được mở đề qua link kèm mã người học và tên (không cần nhập MSSV).
  const learner = useRef<{ code: string; name: string; courseId: string; lessonId: string } | null>(null);
  if (learner.current === null && typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    const code = (sp.get('learner') || '').trim();
    learner.current = code ? { code, name: (sp.get('name') || '').trim(), courseId: sp.get('course') || '', lessonId: sp.get('lesson') || '' } : { code: '', name: '', courseId: '', lessonId: '' };
  }
  const isLearner = !!learner.current?.code;

  // ---------------- Vào thi ----------------
  const checkStudent = async (codeOverride?: string) => {
    const code = (codeOverride ?? studentCode).trim();
    if (!code) { setError('Vui lòng nhập mã số sinh viên.'); return; }
    setLoading(true); setError('');
    try {
      const r = await rpcQuizOpen(slug, code, isLearner ? learner.current!.name : undefined);
      if (!r?.ok) { setError(r?.error || 'Không mở được đề.'); setInfo(null); }
      else { setInfo(r); setPhase('ready'); }
    } catch (e: any) { setError('Lỗi kết nối: ' + (e.message || e)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isLearner && learner.current) { setStudentCode(learner.current.code); checkStudent(learner.current.code); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- Bắt đầu làm ----------------
  const start = async () => {
    setLoading(true); setError('');
    try {
      const r = await rpcQuizStart(slug, studentCode.trim(), undefined,
        isLearner && learner.current ? { studentName: learner.current.name, courseId: learner.current.courseId || undefined, lessonId: learner.current.lessonId || undefined } : undefined);
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
        <Card padding="none" className="w-full p-7 sm:p-8 shadow-xl animate-fadeIn">
          <div className="w-11 h-11 rounded-xl bg-brand-light text-brand flex items-center justify-center mb-3"><ListChecks size={22} /></div>
          <h1 className="text-xl font-bold text-slate-800">{info?.quiz?.title || 'Vào làm bài trắc nghiệm'}</h1>
          <p className="mt-1 text-[13px] text-slate-500">Nhập mã số sinh viên để vào làm bài, không cần đăng nhập.</p>

          {info && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
              <div><p className="text-lg font-bold text-slate-800">{info.quiz.num_questions}</p><p className="text-xs font-medium text-slate-500">Số câu</p></div>
              <div><p className="text-lg font-bold text-slate-800">{info.quiz.duration}′</p><p className="text-xs font-medium text-slate-500">Thời gian</p></div>
              <div><p className="text-lg font-bold text-slate-800">{info.quiz.total_points}</p><p className="text-xs font-medium text-slate-500">Tổng điểm</p></div>
              <div><p className="text-lg font-bold text-slate-800">{info.attempts_used}/{info.quiz.max_attempts}</p><p className="text-xs font-medium text-slate-500">Lần đã làm</p></div>
            </div>
          )}

          {phase === 'enter' && isLearner ? (
            <div className="mt-5 space-y-4">
              {loading && <Spinner label="Đang mở đề cho học viên khoá học..." />}
              {error && <p className="text-center text-[13px] font-medium text-rose-600">{error}</p>}
              {error && <Button full variant="secondary" onClick={() => checkStudent(learner.current?.code)} loading={loading}>Thử lại</Button>}
            </div>
          ) : phase === 'enter' ? (
            <div className="mt-5 space-y-4">
              <Field label="Mã số sinh viên">
                <Input value={studentCode} autoFocus onChange={e => setStudentCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkStudent()} placeholder="Ví dụ: 010100141601" invalid={!!error} />
              </Field>
              {error && <p className="text-[13px] font-medium text-rose-600">{error}</p>}
              <Button full onClick={() => checkStudent()} loading={loading} iconRight={<ChevronRight size={16} />}>Tiếp tục</Button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-brand/20 bg-brand-light p-4 text-center">
                <p className="text-xs font-medium text-slate-500">{isLearner ? 'Học viên khoá học' : 'Xác nhận sinh viên'}</p>
                <p className="mt-0.5 text-base font-bold text-slate-800">{info.student.name}</p>
                {!isLearner && <p className="text-[13px] font-medium text-slate-500">MSSV {studentCode}</p>}
              </div>
              {info.quiz.fullscreen && <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700"><Maximize2 size={14} /> Bài thi chạy ở chế độ toàn màn hình</p>}
              {error && <p className="text-center text-[13px] font-medium text-rose-600">{error}</p>}
              {info.can_start ? (
                <Button full onClick={start} loading={loading}>{loading ? 'Đang tải đề...' : 'Bắt đầu làm bài'}</Button>
              ) : (
                <p className="text-center text-sm font-semibold text-rose-600">Bạn đã hết số lần làm bài.</p>
              )}
              {!isLearner && <Button full variant="secondary" onClick={() => { setPhase('enter'); setInfo(null); }}>Không phải bạn? Nhập lại MSSV</Button>}
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (phase === 'done') {
    const vis = result?.visibility;
    return shell(
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <Card padding="none" className="w-full p-8 shadow-xl animate-fadeIn">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light text-brand"><CheckCircle2 size={34} /></div>
          <h1 className="mt-4 text-xl font-bold text-slate-800">Đã nộp bài</h1>
          {vis === 'hidden' ? (
            <p className="mt-2 text-sm text-slate-500">Bài của bạn đã được ghi nhận. Điểm sẽ do giảng viên công bố.</p>
          ) : (
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 rounded-xl bg-brand-light px-5 py-3">
                <Trophy size={20} className="text-brand" />
                <span className="text-2xl font-bold text-brand">{result?.score}</span>
                <span className="text-sm font-semibold text-slate-500">/ {result?.max_score}</span>
              </div>
              {vis === 'score_and_answers' && <p className="mt-3 text-xs text-slate-500">Xem đáp án đúng ở bảng kết quả do giảng viên cung cấp.</p>}
            </div>
          )}
          <p className="mt-5 text-xs text-slate-500">Bạn có thể đóng trang này.</p>
        </Card>
      </div>
    );
  }

  // ---------------- Đang làm bài ----------------
  const q = questions[current];
  return shell(
    <div className="mx-auto max-w-5xl px-4 py-5">
      {/* Thanh trên: đồng hồ + tiến độ */}
      <div className={`sticky top-0 ${Z.sticky} mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur`}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><ListChecks size={16} className="text-brand" /> Đã trả lời {answeredCount}/{questions.length}</div>
        <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums ${remaining <= 60 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'}`}><Clock size={16} /> {fmt(remaining)}</div>
      </div>

      {fsWarn && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-amber-700"><AlertTriangle size={16} /> Bạn đã rời chế độ toàn màn hình. Vui lòng quay lại để tiếp tục.</span>
          <Button size="sm" onClick={enterFullscreen} className="bg-amber-500 hover:bg-amber-600">Vào lại toàn màn hình</Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
        {/* Câu hỏi */}
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <Badge tone="brand" className="bg-brand text-white">Câu {current + 1}/{questions.length}</Badge>
            <Button size="sm" variant={flags.has(q.question_id) ? 'secondary' : 'ghost'} icon={<Flag size={14} />} onClick={() => toggleFlag(q.question_id)} className={flags.has(q.question_id) ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'text-slate-600'}>{flags.has(q.question_id) ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}</Button>
          </div>
          <div className="prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: q.content }} />
          <p className="mt-1 text-xs font-medium text-slate-500">{q.type === 'single' ? 'Chọn 1 đáp án' : 'Chọn nhiều đáp án'} · {q.points} điểm</p>

          <div className="mt-4 space-y-2.5">
            {q.options.map((o, i) => {
              const sel = (answers[q.question_id] || []).includes(o.id);
              return (
                <button key={o.id} type="button" onClick={() => select(q, o.id)} aria-pressed={sel} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${sel ? 'border-brand bg-brand-light' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center border-2 ${q.type === 'single' ? 'rounded-full' : 'rounded-md'} ${sel ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}><CheckCircle2 size={14} /></span>
                  <span className="text-[13px] font-bold text-slate-500 w-4">{String.fromCharCode(65 + i)}</span>
                  <span className="text-sm font-medium text-slate-800">{o.content}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft size={16} />} onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>Câu trước</Button>
            {current < questions.length - 1 ? (
              <Button size="sm" iconRight={<ChevronRight size={16} />} onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}>Câu sau</Button>
            ) : (
              <Button size="sm" icon={<Send size={16} />} loading={submitting} onClick={() => doSubmit(false)}>Nộp bài</Button>
            )}
          </div>
        </Card>

        {/* Bảng điều hướng câu */}
        <Card padding="item" className="h-fit">
          <p className="mb-2 text-xs font-semibold text-slate-500">Danh sách câu</p>
          <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
            {questions.map((qq, i) => {
              const answered = (answers[qq.question_id] || []).length > 0;
              const flagged = flags.has(qq.question_id);
              return (
                <button key={qq.question_id} type="button" aria-label={`Câu ${i + 1}`} onClick={() => setCurrent(i)} className={`relative grid h-9 w-full place-items-center rounded-lg text-[13px] font-bold ${i === current ? 'ring-2 ring-brand ring-offset-1' : ''} ${answered ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {i + 1}
                  {flagged && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />}
                </button>
              );
            })}
          </div>
          <Button full size="sm" className="mt-4" loading={submitting} onClick={() => doSubmit(false)}>Nộp bài</Button>
          <p className="mt-2 text-center text-xs text-slate-500">Bài tự nộp khi hết giờ.</p>
        </Card>
      </div>
    </div>
  );
}
