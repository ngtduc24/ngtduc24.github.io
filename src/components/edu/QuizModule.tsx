import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Save, X, FileCheck2, Clock, ListChecks, Check, ChevronLeft,
  Search, Library, BookOpen, Users, Link2, Copy, QrCode, Send, ArrowUp, ArrowDown, Loader2, Share2, Globe
} from 'lucide-react';
import { UserAccount } from '../../types';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';
import { getSubjects, getClasses, getClassUsers } from '../../lib/edu';
import { EduSubject, EduClass } from '../../types/edu';
import {
  QuizQuestion, QuizOption, Quiz, QuizItem, QuestionType,
  getBankQuestions, saveQuestion, deleteQuestion, copyQuestionToMine, toggleQuestionPublic,
  getQuizzes, saveQuiz, deleteQuiz, publishQuiz, getQuizItems, addQuestionsToQuiz,
  removeQuizItem, updateQuizItem, reorderQuizItems, getQuizClasses, assignQuizToClass, unassignQuizFromClass,
  stripHtml,
} from '../../lib/quiz';
import QuizRichText from './QuizRichText';

interface QuizModuleProps { currentUser: UserAccount; }
type View = 'list' | 'editor' | 'bank' | 'assign';

const emptyOptions = (): QuizOption[] => [
  { content: '', is_correct: true, order_index: 0 },
  { content: '', is_correct: false, order_index: 1 },
  { content: '', is_correct: false, order_index: 2 },
  { content: '', is_correct: false, order_index: 3 },
];

export default function QuizModule({ currentUser }: QuizModuleProps) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();

  const [view, setView] = useState<View>('list');
  const [subjects, setSubjects] = useState<EduSubject[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [bankSelectMode, setBankSelectMode] = useState(false); // mở ngân hàng để chọn câu thêm vào đề

  useEffect(() => { getSubjects().then(setSubjects).catch(() => {}); }, []);
  const loadQuizzes = useCallback(() => {
    setLoading(true);
    getQuizzes(filterSubject || undefined).then(setQuizzes).catch(e => addNotification('Lỗi tải danh sách đề: ' + e.message, 'error')).finally(() => setLoading(false));
  }, [filterSubject, addNotification]);
  useEffect(() => { if (view === 'list') loadQuizzes(); }, [view, loadQuizzes]);

  const subjectName = (id?: string | null) => subjects.find(s => s.id === id)?.name || '';

  // ---------- Danh sách đề ----------
  const openNewQuiz = async () => {
    try {
      const q = await saveQuiz({ title: 'Đề mới', subject_id: filterSubject || null, owner_name: currentUser.fullName });
      setActiveQuiz(q); setView('editor');
    } catch (e: any) { addNotification('Không tạo được đề: ' + e.message, 'error'); }
  };

  const removeQuiz = (q: Quiz) => {
    confirm('Xóa đề trắc nghiệm', `Xóa đề "${q.title}"? Toàn bộ câu trong đề và kết quả liên quan sẽ bị xóa. Không thể hoàn tác.`, async () => {
      try { await deleteQuiz(q.id); addNotification('Đã xóa đề.', 'success'); loadQuizzes(); }
      catch (e: any) { addNotification('Lỗi xóa đề: ' + e.message, 'error'); }
    });
  };

  if (view === 'list') {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 outline-none focus:border-brand">
              <option value="">Tất cả môn học</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setBankSelectMode(false); setView('bank'); }} className="inline-flex items-center gap-2 rounded-2xl border border-brand bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-brand hover:bg-brand-light">
              <Library className="h-4 w-4" /> Ngân hàng câu hỏi
            </button>
            <button onClick={openNewQuiz} className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover">
              <Plus className="h-4 w-4" /> Tạo đề mới
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-sm font-bold text-slate-700">Chưa có đề trắc nghiệm nào</p>
            <p className="mt-1 text-xs text-slate-400">Bấm "Tạo đề mới" để bắt đầu, hoặc thêm câu hỏi vào ngân hàng trước.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quizzes.map(q => (
              <div key={q.id} className="flex flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${q.status === 'published' ? 'bg-brand-light text-brand' : q.status === 'archived' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'}`}>
                    {q.status === 'published' ? 'Đã phát hành' : q.status === 'archived' ? 'Lưu trữ' : 'Bản nháp'}
                  </span>
                  {q.is_public && <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600"><Globe className="h-3 w-3" /> Công khai</span>}
                </div>
                <h3 className="mt-3 text-sm font-black text-slate-800">{q.title}</h3>
                {q.subject_id && <p className="mt-0.5 text-[11px] font-semibold text-brand">{subjectName(q.subject_id)}</p>}
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {q.duration_minutes} phút</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {q.max_attempts} lần</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button onClick={() => { setActiveQuiz(q); setView('editor'); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-light py-2 text-[11px] font-bold text-brand hover:bg-brand/15"><Edit2 className="h-3.5 w-3.5" /> Sửa</button>
                  <button onClick={() => { setActiveQuiz(q); setView('assign'); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><Send className="h-3.5 w-3.5" /> Giao lớp</button>
                  <button onClick={() => removeQuiz(q)} className="flex items-center justify-center rounded-xl bg-rose-50 px-3 py-2 text-rose-500 hover:bg-rose-100" title="Xóa"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === 'bank') {
    return <QuestionBank currentUser={currentUser} subjects={subjects} selectMode={bankSelectMode} targetQuiz={bankSelectMode ? activeQuiz : null}
      onBack={() => setView(bankSelectMode ? 'editor' : 'list')}
      onAddedToQuiz={() => setView('editor')} />;
  }

  if (view === 'editor' && activeQuiz) {
    return <QuizEditor quiz={activeQuiz} subjects={subjects} currentUser={currentUser}
      onQuizChange={setActiveQuiz}
      onOpenBankSelect={() => { setBankSelectMode(true); setView('bank'); }}
      onBack={() => { setView('list'); }} />;
  }

  if (view === 'assign' && activeQuiz) {
    return <QuizAssign quiz={activeQuiz} currentUser={currentUser} onQuizChange={setActiveQuiz} onBack={() => setView('list')} />;
  }

  return null;
}

// =====================================================================
// NGÂN HÀNG CÂU HỎI
// =====================================================================
function QuestionBank({ currentUser, subjects, selectMode, targetQuiz, onBack, onAddedToQuiz }: {
  currentUser: UserAccount; subjects: EduSubject[]; selectMode: boolean; targetQuiz: Quiz | null; onBack: () => void; onAddedToQuiz: () => void;
}) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [tab, setTab] = useState<'mine' | 'shared'>('mine');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState<QuestionType | ''>('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<QuizQuestion | null | 'new'>(null);

  const load = useCallback(() => {
    setLoading(true);
    getBankQuestions({ scope: tab, subjectId: subjectId || undefined, type: type || undefined, search })
      .then(setItems).catch(e => addNotification('Lỗi tải ngân hàng: ' + e.message, 'error')).finally(() => setLoading(false));
  }, [tab, subjectId, type, search, addNotification]);
  useEffect(() => { load(); }, [load]);

  const subjectName = (id?: string | null) => subjects.find(s => s.id === id)?.name || '';

  const remove = (q: QuizQuestion) => {
    confirm('Xóa câu hỏi', 'Xóa câu hỏi này khỏi ngân hàng? Không thể hoàn tác.', async () => {
      try { await deleteQuestion(q.id); addNotification('Đã xóa câu hỏi.', 'success'); load(); }
      catch (e: any) { addNotification('Không xóa được (có thể câu đang nằm trong đề đã phát hành): ' + e.message, 'error'); }
    });
  };
  const copyToMine = async (q: QuizQuestion) => {
    try { await copyQuestionToMine(q, currentUser.fullName); addNotification('Đã sao chép về ngân hàng của bạn.', 'success'); }
    catch (e: any) { addNotification('Lỗi sao chép: ' + e.message, 'error'); }
  };
  const togglePublic = async (q: QuizQuestion) => {
    try { await toggleQuestionPublic(q.id, !q.is_public); load(); } catch (e: any) { addNotification('Lỗi cập nhật chia sẻ: ' + e.message, 'error'); }
  };
  const toggleSel = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const addSelectedToQuiz = async () => {
    if (!targetQuiz || selected.size === 0) return;
    try {
      const existing = await getQuizItems(targetQuiz.id);
      await addQuestionsToQuiz(targetQuiz.id, Array.from(selected), existing.length);
      addNotification(`Đã thêm ${selected.size} câu vào đề.`, 'success');
      onAddedToQuiz();
    } catch (e: any) { addNotification('Lỗi thêm vào đề: ' + e.message, 'error'); }
  };

  if (editing) {
    return <QuestionForm currentUser={currentUser} subjects={subjects}
      question={editing === 'new' ? null : editing}
      defaultSubject={subjectId}
      onCancel={() => setEditing(null)}
      onSaved={() => { setEditing(null); load(); }} />;
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">
          <ChevronLeft className="h-4 w-4" /> {selectMode ? 'Về trình soạn đề' : 'Danh sách đề'}
        </button>
        <div className="flex gap-2">
          {selectMode && (
            <button onClick={addSelectedToQuiz} disabled={selected.size === 0} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover disabled:opacity-50">
              <Plus className="h-4 w-4" /> Thêm {selected.size} câu vào đề
            </button>
          )}
          <button onClick={() => setEditing('new')} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-slate-900">
            <Plus className="h-4 w-4" /> Soạn câu mới
          </button>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-wrap items-center gap-2">
        {!selectMode && (
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button onClick={() => setTab('mine')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'mine' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Ngân hàng của tôi</button>
            <button onClick={() => setTab('shared')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'shared' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Ngân hàng dùng chung</button>
          </div>
        )}
        <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand">
          <option value="">Mọi môn</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value as any)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand">
          <option value="">Mọi dạng</option>
          <option value="single">Chọn 1 đáp án</option>
          <option value="multiple">Chọn nhiều đáp án</option>
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo nội dung hoặc nhãn..." className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium outline-none focus:border-brand" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">Không có câu hỏi nào phù hợp.</div>
      ) : (
        <div className="space-y-3">
          {items.map(q => {
            const correctCount = (q.options || []).filter(o => o.is_correct).length;
            return (
              <div key={q.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition-colors ${selectMode && selected.has(q.id) ? 'border-brand ring-1 ring-brand' : 'border-slate-100'}`}>
                <div className="flex items-start gap-3">
                  {selectMode && (
                    <button onClick={() => toggleSel(q.id)} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${selected.has(q.id) ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}><Check className="h-3 w-3" /></button>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{q.question_type === 'single' ? 'Chọn 1' : 'Chọn nhiều'}</span>
                      {q.subject_id && <span className="rounded-md bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">{subjectName(q.subject_id)}</span>}
                      <span className="text-[10px] font-semibold text-slate-400">{correctCount} đáp án đúng · {(q.options || []).length} phương án</span>
                      {q.is_public && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600"><Globe className="h-3 w-3" /> Công khai</span>}
                    </div>
                    <p className="text-[13px] font-semibold text-slate-800 line-clamp-2">{stripHtml(q.content) || '(câu hỏi trống)'}</p>
                    {(q.tags || []).length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{q.tags.map(t => <span key={t} className="rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">#{t}</span>)}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {tab === 'shared' ? (
                      <button onClick={() => copyToMine(q)} className="rounded-lg bg-brand-light px-3 py-2 text-[11px] font-bold text-brand hover:bg-brand/15">Sao chép về của tôi</button>
                    ) : (
                      <>
                        <button onClick={() => togglePublic(q)} title={q.is_public ? 'Tắt chia sẻ' : 'Chia sẻ công khai'} className={`rounded-lg p-2 ${q.is_public ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><Share2 className="h-4 w-4" /></button>
                        <button onClick={() => setEditing(q)} className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => remove(q)} className="rounded-lg bg-rose-50 p-2 text-rose-500 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// FORM SOẠN CÂU HỎI
// =====================================================================
function QuestionForm({ currentUser, subjects, question, defaultSubject, onCancel, onSaved }: {
  currentUser: UserAccount; subjects: EduSubject[]; question: QuizQuestion | null; defaultSubject?: string; onCancel: () => void; onSaved: (q: QuizQuestion) => void;
}) {
  const { addNotification } = useNotifications();
  const [content, setContent] = useState(question?.content || '');
  const [type, setType] = useState<QuestionType>(question?.question_type || 'single');
  const [grading, setGrading] = useState<'all_or_nothing' | 'partial'>(question?.multiple_grading || 'all_or_nothing');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(question?.difficulty || 'medium');
  const [subjectId, setSubjectId] = useState(question?.subject_id || defaultSubject || '');
  const [tags, setTags] = useState((question?.tags || []).join(', '));
  const [isPublic, setIsPublic] = useState(question?.is_public || false);
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [options, setOptions] = useState<QuizOption[]>(question?.options?.length ? question.options.map((o, i) => ({ ...o, order_index: i })) : emptyOptions());
  const [saving, setSaving] = useState(false);

  const setCorrect = (idx: number) => {
    setOptions(opts => opts.map((o, i) => type === 'single' ? { ...o, is_correct: i === idx } : (i === idx ? { ...o, is_correct: !o.is_correct } : o)));
  };
  const setOptText = (idx: number, val: string) => setOptions(opts => opts.map((o, i) => i === idx ? { ...o, content: val } : o));
  const addOpt = () => setOptions(opts => opts.length < 8 ? [...opts, { content: '', is_correct: false, order_index: opts.length }] : opts);
  const removeOpt = (idx: number) => setOptions(opts => opts.length > 2 ? opts.filter((_, i) => i !== idx).map((o, i) => ({ ...o, order_index: i })) : opts);

  // Khi chuyển về "chọn 1", chỉ giữ 1 đáp án đúng.
  useEffect(() => {
    if (type === 'single') {
      setOptions(opts => {
        const firstCorrect = opts.findIndex(o => o.is_correct);
        return opts.map((o, i) => ({ ...o, is_correct: i === (firstCorrect === -1 ? 0 : firstCorrect) }));
      });
    }
  }, [type]);

  const save = async () => {
    if (!stripHtml(content).trim()) { addNotification('Vui lòng nhập nội dung câu hỏi.', 'error'); return; }
    const filled = options.filter(o => o.content.trim());
    if (filled.length < 2) { addNotification('Cần ít nhất 2 phương án.', 'error'); return; }
    if (!options.some(o => o.is_correct && o.content.trim())) { addNotification('Chưa chọn đáp án đúng.', 'error'); return; }
    setSaving(true);
    try {
      const saved = await saveQuestion({
        id: question?.id, content, question_type: type, multiple_grading: grading, difficulty,
        subject_id: subjectId || null, tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        is_public: isPublic, explanation, owner_name: currentUser.fullName,
      }, filled.map((o, i) => ({ content: o.content, is_correct: o.is_correct, order_index: i })));
      addNotification('Đã lưu câu hỏi vào ngân hàng.', 'success');
      onSaved(saved);
    } catch (e: any) { addNotification('Lỗi lưu câu hỏi: ' + e.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><ChevronLeft className="h-4 w-4" /> Hủy</button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu câu hỏi</button>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Môn học</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white">
              <option value="">Chưa gán</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dạng câu hỏi</label>
            <select value={type} onChange={e => setType(e.target.value as QuestionType)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white">
              <option value="single">Chọn 1 đáp án</option>
              <option value="multiple">Chọn nhiều đáp án</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mức độ</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white">
              <option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nội dung câu hỏi</label>
          <QuizRichText value={content} onChange={setContent} />
        </div>

        {type === 'multiple' && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cách chấm khi chọn nhiều</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setGrading('all_or_nothing')} className={`rounded-xl px-4 py-2 text-xs font-bold ${grading === 'all_or_nothing' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>Đúng toàn phần</button>
              <button onClick={() => setGrading('partial')} className={`rounded-xl px-4 py-2 text-xs font-bold ${grading === 'partial' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>Chấm theo tỉ lệ</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Phương án ({type === 'single' ? 'chọn ô tròn ở đáp án đúng' : 'tick các đáp án đúng'})</label>
          {options.map((o, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${o.is_correct ? 'border-brand bg-brand-light/40' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setCorrect(i)} className={`grid h-6 w-6 shrink-0 place-items-center border-2 ${type === 'single' ? 'rounded-full' : 'rounded-md'} ${o.is_correct ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}><Check className="h-3.5 w-3.5" /></button>
              <span className="text-xs font-black text-slate-400">{String.fromCharCode(65 + i)}</span>
              <input value={o.content} onChange={e => setOptText(i, e.target.value)} placeholder={`Phương án ${String.fromCharCode(65 + i)}`} className="flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none" />
              {options.length > 2 && <button onClick={() => removeOpt(i)} className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>}
            </div>
          ))}
          {options.length < 8 && <button onClick={addOpt} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-brand hover:bg-brand-light"><Plus className="h-3.5 w-3.5" /> Thêm phương án</button>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nhãn phân loại (cách nhau dấu phẩy)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="VD: chương 1, lý thuyết" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-brand focus:bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Giải thích đáp án (không bắt buộc)</label>
            <input value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Ghi chú lời giải" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-brand focus:bg-white" />
          </div>
        </div>

        <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="h-4 w-4 accent-brand rounded" />
          <span className="text-[11px] font-bold text-slate-600">Chia sẻ công khai câu hỏi này cho người dùng khác (chỉ đọc)</span>
        </label>
      </div>
    </div>
  );
}

// =====================================================================
// TRÌNH SOẠN ĐỀ
// =====================================================================
function QuizEditor({ quiz, subjects, currentUser, onQuizChange, onOpenBankSelect, onBack }: {
  quiz: Quiz; subjects: EduSubject[]; currentUser: UserAccount; onQuizChange: (q: Quiz) => void; onOpenBankSelect: () => void; onBack: () => void;
}) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const [tab, setTab] = useState<'content' | 'settings'>('content');
  const [form, setForm] = useState<Quiz>(quiz);
  const [items, setItems] = useState<QuizItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [composing, setComposing] = useState(false);

  const loadItems = useCallback(() => {
    setLoadingItems(true);
    getQuizItems(quiz.id).then(setItems).catch(e => addNotification('Lỗi tải câu hỏi của đề: ' + e.message, 'error')).finally(() => setLoadingItems(false));
  }, [quiz.id, addNotification]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const patch = (p: Partial<Quiz>) => setForm(f => ({ ...f, ...p }));

  const persist = async (extra?: Partial<Quiz>) => {
    setSavingInfo(true);
    try { const saved = await saveQuiz({ ...form, ...extra }); setForm(saved); onQuizChange(saved); return saved; }
    catch (e: any) { addNotification('Lỗi lưu đề: ' + e.message, 'error'); }
    finally { setSavingInfo(false); }
  };

  const totalPoints = items.reduce((s, it) => s + Number(it.points || 0), 0);

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    const reindexed = next.map((it, i) => ({ ...it, order_index: i }));
    setItems(reindexed);
    try { await reorderQuizItems(reindexed.map(it => ({ id: it.id, order_index: it.order_index }))); } catch {}
  };
  const setPoints = async (itemId: string, points: number) => {
    setItems(list => list.map(it => it.id === itemId ? { ...it, points } : it));
    try { await updateQuizItem(itemId, { points }); } catch {}
  };
  const removeItem = (it: QuizItem) => {
    confirm('Bỏ câu khỏi đề', 'Bỏ câu hỏi này khỏi đề? Câu vẫn còn trong ngân hàng.', async () => {
      try { await removeQuizItem(it.id); loadItems(); } catch (e: any) { addNotification('Lỗi: ' + e.message, 'error'); }
    });
  };

  const subjectName = (id?: string | null) => subjects.find(s => s.id === id)?.name || '';

  if (composing) {
    return <QuestionForm currentUser={currentUser} subjects={subjects} question={null} defaultSubject={form.subject_id || ''}
      onCancel={() => setComposing(false)}
      onSaved={async (q) => {
        setComposing(false);
        try { await addQuestionsToQuiz(quiz.id, [q.id], items.length); loadItems(); addNotification('Đã thêm câu mới vào đề.', 'success'); }
        catch (e: any) { addNotification('Đã lưu câu vào ngân hàng nhưng thêm vào đề lỗi: ' + e.message, 'error'); }
      }} />;
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={async () => { await persist(); onBack(); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><ChevronLeft className="h-4 w-4" /> Lưu & về danh sách</button>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-light px-3 py-2 text-[11px] font-bold text-brand">Tổng điểm: {totalPoints}{form.scale_to_10 ? ' → thang 10' : ''}</div>
          <button onClick={() => persist()} disabled={savingInfo} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover disabled:opacity-50">{savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu đề</button>
        </div>
      </div>

      <div className="flex rounded-xl bg-slate-100 p-1 w-fit">
        <button onClick={() => setTab('content')} className={`rounded-lg px-5 py-2 text-xs font-bold ${tab === 'content' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Nội dung</button>
        <button onClick={() => setTab('settings')} className={`rounded-lg px-5 py-2 text-xs font-bold ${tab === 'settings' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>Thiết lập</button>
      </div>

      {tab === 'content' ? (
        <div className="space-y-5">
          <div className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tên đề *</label>
              <input value={form.title} onChange={e => patch({ title: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Môn học</label>
              <select value={form.subject_id || ''} onChange={e => patch({ subject_id: e.target.value || null })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white">
                <option value="">Chưa gán</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mô tả</label>
              <input value={form.description || ''} onChange={e => patch({ description: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-brand focus:bg-white" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={async () => { await persist(); onOpenBankSelect(); }} className="inline-flex items-center gap-2 rounded-xl border border-brand bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand hover:bg-brand-light"><Library className="h-4 w-4" /> Chọn từ ngân hàng</button>
            <button onClick={() => setComposing(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-slate-900"><Plus className="h-4 w-4" /> Soạn câu mới</button>
          </div>

          {loadingItems ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Đề chưa có câu hỏi. Thêm từ ngân hàng hoặc soạn câu mới.</div>
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={it.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded-md bg-slate-100 p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="rounded-md bg-slate-100 p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className="mt-1 inline-flex h-7 items-center rounded-full bg-brand px-3 text-[11px] font-black text-white">Câu {idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{it.question?.question_type === 'single' ? 'Chọn 1' : 'Chọn nhiều'}</span>
                        {it.question?.subject_id && <span className="rounded-md bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">{subjectName(it.question.subject_id)}</span>}
                      </div>
                      <p className="text-[13px] font-semibold text-slate-800 line-clamp-2">{stripHtml(it.question?.content || '') || '(trống)'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Điểm</span>
                        <input type="number" min={0} step={0.25} value={it.points} onChange={e => setPoints(it.id, Number(e.target.value) || 0)} className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-brand focus:bg-white" />
                      </div>
                      <button onClick={() => removeItem(it)} className="rounded-lg bg-rose-50 p-2 text-rose-500 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <QuizSettings form={form} patch={patch} totalQuestions={items.length} onSave={() => persist()} saving={savingInfo} />
      )}
    </div>
  );
}

// ---------- Thiết lập đề ----------
function QuizSettings({ form, patch, totalQuestions, onSave, saving }: { form: Quiz; patch: (p: Partial<Quiz>) => void; totalQuestions: number; onSave: () => void; saving: boolean; }) {
  const toLocal = (v?: string | null) => v ? new Date(v).toISOString().slice(0, 16) : '';
  const fromLocal = (v: string) => v ? new Date(v).toISOString() : null;
  const row = 'flex flex-col gap-1.5';
  const lbl = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';
  const inp = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white';
  const Toggle = ({ v, on, label, desc }: { v: boolean; on: (b: boolean) => void; label: string; desc: string }) => (
    <button onClick={() => on(!v)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left">
      <span><span className="block text-[13px] font-bold text-slate-800">{label}</span><span className="block text-[11px] text-slate-400">{desc}</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${v ? 'bg-brand' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${v ? 'left-[22px]' : 'left-0.5'}`} /></span>
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle v={form.shuffle_questions} on={b => patch({ shuffle_questions: b })} label="Đảo thứ tự câu hỏi" desc="Mỗi lượt làm có thứ tự câu khác nhau" />
        <Toggle v={form.shuffle_options} on={b => patch({ shuffle_options: b })} label="Đảo thứ tự phương án" desc="Xáo trộn phương án trong từng câu" />
        <Toggle v={form.proctor_fullscreen} on={b => patch({ proctor_fullscreen: b })} label="Giám sát toàn màn hình" desc="Ghi nhận khi sinh viên rời màn hình" />
        <Toggle v={form.scale_to_10} on={b => patch({ scale_to_10: b })} label="Quy đổi về thang 10" desc="Hiển thị thêm điểm theo thang 10" />
      </div>

      <div className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div className={row}><label className={lbl}>Thời gian làm bài (phút)</label><input type="number" min={1} value={form.duration_minutes} onChange={e => patch({ duration_minutes: Math.max(1, Number(e.target.value) || 1) })} className={inp} /></div>
        <div className={row}><label className={lbl}>Số câu rút ngẫu nhiên (để trống = tất cả {totalQuestions})</label><input type="number" min={1} value={form.random_pick_count ?? ''} onChange={e => patch({ random_pick_count: e.target.value ? Number(e.target.value) : null })} placeholder={`${totalQuestions}`} className={inp} /></div>
        <div className={row}><label className={lbl}>Mở đề từ</label><input type="datetime-local" value={toLocal(form.open_at)} onChange={e => patch({ open_at: fromLocal(e.target.value) })} className={inp} /></div>
        <div className={row}><label className={lbl}>Đóng đề lúc</label><input type="datetime-local" value={toLocal(form.close_at)} onChange={e => patch({ close_at: fromLocal(e.target.value) })} className={inp} /></div>
        <div className={row}><label className={lbl}>Số lần được làm</label><input type="number" min={1} value={form.max_attempts} onChange={e => patch({ max_attempts: Math.max(1, Number(e.target.value) || 1) })} className={inp} /></div>
        <div className={row}><label className={lbl}>Cách lấy điểm</label>
          <select value={form.grading_method} onChange={e => patch({ grading_method: e.target.value as any })} className={inp}>
            <option value="highest">Điểm cao nhất</option><option value="first">Lần đầu</option><option value="last">Lần cuối</option><option value="average">Trung bình</option>
          </select>
        </div>
        <div className={row}><label className={lbl}>Hiển thị kết quả cho sinh viên</label>
          <select value={form.result_visibility} onChange={e => patch({ result_visibility: e.target.value as any })} className={inp}>
            <option value="hidden">Không hiển thị</option><option value="score_only">Chỉ hiển thị điểm</option><option value="score_and_answers">Điểm kèm đáp án đúng</option>
          </select>
        </div>
        <div className={row}><label className={lbl}>Ngưỡng cảnh báo rời màn hình</label><input type="number" min={1} value={form.proctor_warning_threshold} onChange={e => patch({ proctor_warning_threshold: Math.max(1, Number(e.target.value) || 1) })} className={inp} /></div>
      </div>

      <div className="flex justify-end">
        <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu thiết lập</button>
      </div>
    </div>
  );
}

// =====================================================================
// GIAO ĐỀ CHO LỚP + PHÁT HÀNH
// =====================================================================
function QuizAssign({ quiz, currentUser, onQuizChange, onBack }: { quiz: Quiz; currentUser: UserAccount; onQuizChange: (q: Quiz) => void; onBack: () => void; }) {
  const { addNotification } = useNotifications();
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [q, setQ] = useState<Quiz>(quiz);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cls, asg] = await Promise.all([getClasses(), getQuizClasses(quiz.id)]);
        setClasses(cls); setAssigned(new Set(asg));
        const cnt: Record<string, number> = {};
        await Promise.all(cls.map(async c => { try { cnt[c.id] = (await getClassUsers(c.id)).length; } catch { cnt[c.id] = 0; } }));
        setCounts(cnt);
      } catch (e: any) { addNotification('Lỗi tải danh sách lớp: ' + e.message, 'error'); }
      finally { setLoading(false); }
    })();
  }, [quiz.id, addNotification]);

  const toggleClass = async (c: EduClass) => {
    const isOn = assigned.has(c.id);
    const next = new Set(assigned);
    try {
      if (isOn) { await unassignQuizFromClass(quiz.id, c.id); next.delete(c.id); }
      else { await assignQuizToClass(quiz.id, c.id); next.add(c.id); }
      setAssigned(next);
    } catch (e: any) { addNotification('Lỗi cập nhật giao lớp: ' + e.message, 'error'); }
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      if (q.status !== 'published' && assigned.size === 0) { addNotification('Hãy giao đề cho ít nhất một lớp trước khi phát hành.', 'warning'); setPublishing(false); return; }
      const saved = await publishQuiz(quiz.id, q.status !== 'published');
      setQ(saved); onQuizChange(saved);
      addNotification(saved.status === 'published' ? 'Đã phát hành đề.' : 'Đã chuyển về bản nháp.', 'success');
    } catch (e: any) { addNotification('Lỗi phát hành: ' + e.message, 'error'); }
    finally { setPublishing(false); }
  };

  const link = `${window.location.origin}${window.location.pathname}?quiz=${q.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}&format=png&margin=10`;

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"><ChevronLeft className="h-4 w-4" /> Danh sách đề</button>
        <button onClick={togglePublish} disabled={publishing} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg disabled:opacity-50 ${q.status === 'published' ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/20' : 'bg-brand hover:bg-brand-hover shadow-brand/20'}`}>
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {q.status === 'published' ? 'Thu hồi phát hành' : 'Phát hành đề'}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-black text-slate-900">{q.title}</h2>
        <p className="mt-0.5 text-xs text-slate-400">Chọn các lớp được làm đề này. Danh sách sinh viên của lớp là danh sách hợp lệ.</p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
        ) : classes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có lớp nào. Hãy tạo lớp trong phần quản lý lớp trước.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map(c => {
              const on = assigned.has(c.id);
              return (
                <button key={c.id} onClick={() => toggleClass(c)} className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition-colors ${on ? 'border-brand bg-brand-light/40' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-slate-800">{c.name}</span><span className="block text-[11px] text-slate-400">{counts[c.id] ?? 0} sinh viên</span></span>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}><Check className="h-3.5 w-3.5" /></span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {q.status === 'published' && (
        <div className="grid gap-4 rounded-3xl border border-brand/20 bg-brand-light/30 p-6 lg:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900">Đường liên kết làm bài</h3>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
              <Link2 className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
              <input readOnly value={link} className="flex-1 bg-transparent text-xs font-medium text-slate-600 outline-none" />
              <button onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[11px] font-bold text-white hover:bg-brand-hover">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Đã chép' : 'Sao chép'}</button>
            </div>
            <p className="text-[11px] text-slate-500">Sinh viên mở liên kết, nhập mã số sinh viên để vào làm. Không cần đăng nhập.</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <img src={qrUrl} alt="QR đề" className="h-36 w-36 rounded-2xl border border-slate-200 bg-white p-2" />
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500"><QrCode className="h-3.5 w-3.5" /> Quét để làm bài</span>
          </div>
        </div>
      )}
    </div>
  );
}
