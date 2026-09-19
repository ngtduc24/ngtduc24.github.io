import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Edit2, Save, X, FileCheck2, Clock, ListChecks, Check, ChevronLeft, Copy
} from 'lucide-react';
import { UserAccount } from '../../types';
import { useNotifications } from '../NotificationContext';
import { useConfirmation } from '../ConfirmationContext';

interface ExamQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  description: string;
  durationMin: number;
  questions: ExamQuestion[];
  ownerId: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

interface EduExamBankProps {
  currentUser: UserAccount;
}

const STORE_KEY = 'edu_exams_v1';

function loadExams(): Exam[] {
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveExams(list: Exam[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch {}
}
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function blankQuestion(): ExamQuestion {
  return { id: uid(), text: '', options: ['', '', '', ''], correctIndex: 0, points: 1 };
}

/**
 * Ngân hàng đề kiểm tra trắc nghiệm. Cho phép tạo, sửa, nhân bản và xóa các đề gồm
 * nhiều câu hỏi trắc nghiệm với đáp án đúng. Dữ liệu lưu cục bộ theo trình duyệt, có
 * thể chuyển sang cơ sở dữ liệu ở bước sau.
 */
export default function EduExamBank({ currentUser }: EduExamBankProps) {
  const { addNotification } = useNotifications();
  const { confirm } = useConfirmation();
  const isAdmin = currentUser.role === 'admin';

  const [exams, setExams] = useState<Exam[]>([]);
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [draft, setDraft] = useState<Exam | null>(null);

  useEffect(() => { setExams(loadExams()); }, []);

  const visibleExams = exams.filter(e => isAdmin || e.ownerId === currentUser.id);

  const persist = (list: Exam[]) => { setExams(list); saveExams(list); };

  const startCreate = () => {
    setDraft({
      id: uid(), title: '', subject: '', description: '', durationMin: 45,
      questions: [blankQuestion()], ownerId: currentUser.id, ownerName: currentUser.fullName,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    setMode('edit');
  };

  const startEdit = (exam: Exam) => { setDraft(JSON.parse(JSON.stringify(exam))); setMode('edit'); };

  const duplicateExam = (exam: Exam) => {
    const copy: Exam = { ...JSON.parse(JSON.stringify(exam)), id: uid(), title: exam.title + ' (bản sao)', ownerId: currentUser.id, ownerName: currentUser.fullName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    persist([copy, ...exams]);
    addNotification('Đã nhân bản đề kiểm tra.', 'success');
  };

  const removeExam = (exam: Exam) => {
    confirm('Xóa đề kiểm tra', `Bạn có chắc muốn xóa đề "${exam.title || 'chưa đặt tên'}"?`, () => {
      persist(exams.filter(e => e.id !== exam.id));
      addNotification('Đã xóa đề kiểm tra.', 'success');
    });
  };

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.title.trim()) { addNotification('Vui lòng nhập tên đề kiểm tra.', 'error'); return; }
    for (let i = 0; i < draft.questions.length; i++) {
      const q = draft.questions[i];
      if (!q.text.trim()) { addNotification(`Câu ${i + 1} chưa có nội dung câu hỏi.`, 'error'); return; }
      const filled = q.options.filter(o => o.trim()).length;
      if (filled < 2) { addNotification(`Câu ${i + 1} cần ít nhất 2 phương án.`, 'error'); return; }
      if (!q.options[q.correctIndex]?.trim()) { addNotification(`Câu ${i + 1} chưa chọn đáp án đúng hợp lệ.`, 'error'); return; }
    }
    const updated: Exam = { ...draft, title: draft.title.trim(), updatedAt: new Date().toISOString() };
    const exists = exams.some(e => e.id === updated.id);
    persist(exists ? exams.map(e => e.id === updated.id ? updated : e) : [updated, ...exams]);
    addNotification('Đã lưu đề kiểm tra.', 'success');
    setMode('list'); setDraft(null);
  };

  // ---- Thao tác trên draft ----
  const patchDraft = (patch: Partial<Exam>) => setDraft(d => d ? { ...d, ...patch } : d);
  const patchQuestion = (qid: string, patch: Partial<ExamQuestion>) =>
    setDraft(d => d ? { ...d, questions: d.questions.map(q => q.id === qid ? { ...q, ...patch } : q) } : d);
  const addQuestion = () => setDraft(d => d ? { ...d, questions: [...d.questions, blankQuestion()] } : d);
  const removeQuestion = (qid: string) => setDraft(d => d && d.questions.length > 1 ? { ...d, questions: d.questions.filter(q => q.id !== qid) } : d);
  const setOption = (qid: string, idx: number, val: string) =>
    setDraft(d => d ? { ...d, questions: d.questions.map(q => q.id === qid ? { ...q, options: q.options.map((o, i) => i === idx ? val : o) } : q) } : d);
  const addOption = (qid: string) =>
    setDraft(d => d ? { ...d, questions: d.questions.map(q => q.id === qid && q.options.length < 6 ? { ...q, options: [...q.options, ''] } : q) } : d);
  const removeOption = (qid: string, idx: number) =>
    setDraft(d => d ? { ...d, questions: d.questions.map(q => {
      if (q.id !== qid || q.options.length <= 2) return q;
      const options = q.options.filter((_, i) => i !== idx);
      let correctIndex = q.correctIndex;
      if (idx === q.correctIndex) correctIndex = 0;
      else if (idx < q.correctIndex) correctIndex = q.correctIndex - 1;
      return { ...q, options, correctIndex };
    }) } : d);

  // ================= DANH SÁCH =================
  if (mode === 'list') {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-black text-slate-900">Đề kiểm tra trắc nghiệm</h2>
            <p className="text-xs font-medium text-slate-500">Tạo và quản lý các đề kiểm tra trắc nghiệm để giao cho lớp.</p>
          </div>
          <button onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover">
            <Plus className="h-4 w-4" /> Tạo đề mới
          </button>
        </div>

        {visibleExams.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><FileCheck2 className="h-7 w-7" /></div>
            <p className="mt-4 text-sm font-bold text-slate-700">Chưa có đề kiểm tra nào</p>
            <p className="mt-1 text-xs text-slate-400">Bấm "Tạo đề mới" để bắt đầu soạn đề trắc nghiệm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleExams.map(exam => (
              <div key={exam.id} className="flex flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand"><FileCheck2 className="h-5 w-5" /></div>
                  {isAdmin && exam.ownerId !== currentUser.id && exam.ownerName && (
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600">Tạo bởi {exam.ownerName}</span>
                  )}
                </div>
                <h3 className="mt-3 text-sm font-black text-slate-800">{exam.title || 'Đề chưa đặt tên'}</h3>
                {exam.subject && <p className="mt-0.5 text-[11px] font-semibold text-brand">{exam.subject}</p>}
                {exam.description && <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{exam.description}</p>}
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> {exam.questions.length} câu</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {exam.durationMin} phút</span>
                </div>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <button onClick={() => startEdit(exam)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-light py-2 text-[11px] font-bold text-brand hover:bg-brand/15"><Edit2 className="h-3.5 w-3.5" /> Sửa</button>
                  <button onClick={() => duplicateExam(exam)} className="flex items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-slate-500 hover:bg-slate-200" title="Nhân bản"><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={() => removeExam(exam)} className="flex items-center justify-center rounded-xl bg-rose-50 px-3 py-2 text-rose-500 hover:bg-rose-100" title="Xóa"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ================= SOẠN ĐỀ =================
  if (!draft) return null;
  const totalPoints = draft.questions.reduce((s, q) => s + (Number(q.points) || 0), 0);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => { setMode('list'); setDraft(null); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">
          <ChevronLeft className="h-4 w-4" /> Danh sách đề
        </button>
        <button onClick={saveDraft} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-brand-hover">
          <Save className="h-4 w-4" /> Lưu đề
        </button>
      </div>

      {/* Thông tin chung */}
      <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tên đề kiểm tra *</label>
            <input value={draft.title} onChange={e => patchDraft({ title: e.target.value })} placeholder="VD: Kiểm tra giữa kỳ Nhập môn Truyền thông" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Môn / học phần</label>
            <input value={draft.subject} onChange={e => patchDraft({ subject: e.target.value })} placeholder="VD: Nhập môn Truyền thông" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Thời gian làm bài (phút)</label>
            <input type="number" min={1} value={draft.durationMin} onChange={e => patchDraft({ durationMin: Math.max(1, Number(e.target.value) || 1) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mô tả / hướng dẫn</label>
            <textarea value={draft.description} onChange={e => patchDraft({ description: e.target.value })} rows={2} placeholder="Ghi chú hoặc hướng dẫn làm bài (không bắt buộc)" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-brand focus:bg-white" />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5 text-brand" /> {draft.questions.length} câu hỏi</span>
          <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-brand" /> Tổng điểm: {totalPoints}</span>
        </div>
      </div>

      {/* Câu hỏi */}
      {draft.questions.map((q, qi) => (
        <div key={q.id} className="space-y-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex h-7 items-center rounded-full bg-brand px-3 text-[11px] font-black text-white">Câu {qi + 1}</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Điểm</span>
                <input type="number" min={0} step={0.25} value={q.points} onChange={e => patchQuestion(q.id, { points: Number(e.target.value) || 0 })} className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-brand focus:bg-white" />
              </div>
              {draft.questions.length > 1 && (
                <button onClick={() => removeQuestion(q.id)} className="rounded-lg bg-rose-50 p-2 text-rose-500 hover:bg-rose-100" title="Xóa câu hỏi"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          </div>

          <textarea value={q.text} onChange={e => patchQuestion(q.id, { text: e.target.value })} rows={2} placeholder="Nhập nội dung câu hỏi..." className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white" />

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phương án (chọn ô tròn ở đáp án đúng)</p>
            {q.options.map((opt, oi) => {
              const isCorrect = q.correctIndex === oi;
              return (
                <div key={oi} className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${isCorrect ? 'border-brand bg-brand-light/40' : 'border-slate-200 bg-white'}`}>
                  <button type="button" onClick={() => patchQuestion(q.id, { correctIndex: oi })} title="Đặt làm đáp án đúng" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${isCorrect ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}>
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-black text-slate-400">{String.fromCharCode(65 + oi)}</span>
                  <input value={opt} onChange={e => setOption(q.id, oi, e.target.value)} placeholder={`Phương án ${String.fromCharCode(65 + oi)}`} className="flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none" />
                  {q.options.length > 2 && (
                    <button onClick={() => removeOption(q.id, oi)} className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-rose-500" title="Xóa phương án"><X className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              );
            })}
            {q.options.length < 6 && (
              <button onClick={() => addOption(q.id)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-brand hover:bg-brand-light"><Plus className="h-3.5 w-3.5" /> Thêm phương án</button>
            )}
          </div>
        </div>
      ))}

      <button onClick={addQuestion} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white py-4 text-sm font-bold text-slate-500 hover:border-brand hover:text-brand">
        <Plus className="h-4 w-4" /> Thêm câu hỏi
      </button>
    </div>
  );
}
