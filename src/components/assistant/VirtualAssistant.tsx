import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, BookOpen, LayoutGrid, HelpCircle, ArrowRight, Loader2, FileQuestion } from 'lucide-react';
import { UserAccount, AppSettings } from '../../types';
import { MODULE_REGISTRY, resolveModuleMeta, isModuleHidden } from '../../lib/modules';
import { getSubjects } from '../../lib/edu';
import { getMyLessons, getPublicLessons, stripHtml, ELLesson } from '../../lib/elearning';
import { getBankQuestions, QuizQuestion } from '../../lib/quiz';
import { EduSubject } from '../../types/edu';

interface Props {
  currentUser: UserAccount;
  settings: AppSettings;
  onSwitchTab: (tab: string) => void;
}

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu.
const norm = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

interface FeatureHit { id: string; label: string; desc: string }
interface BotResult {
  intro: string;
  faqs: { title: string; body: string; goId?: string }[];
  features: FeatureHit[];
  lessons: { id: string; title: string; subject: string }[];
  questions: { id: string; text: string }[];
}
type Msg = { role: 'user'; text: string } | { role: 'bot'; result: BotResult };

// Mẹo hướng dẫn thao tác nhanh cho người dùng mới. Khớp theo từ khóa đã bỏ dấu.
const FAQS: { keys: string[]; title: string; body: string; goId?: string }[] = [
  { keys: ['tao de', 'de trac nghiem', 'trac nghiem', 'tao bai kiem tra'], title: 'Tạo đề trắc nghiệm', body: 'Vào Quản lý Giáo dục, mở Trắc nghiệm, bấm Tạo đề mới, thêm câu hỏi từ ngân hàng rồi bấm Phát hành đề để giao cho lớp.', goId: 'edu_exam' },
  { keys: ['nhap diem', 'vao diem', 'cong diem'], title: 'Nhập điểm', body: 'Vào Quản lý Giáo dục, mở Nhập điểm để nhập điểm vào file của phần mềm trường.', goId: 'edu_grade' },
  { keys: ['ngan hang bai tap', 'kho bai tap', 'bai tap'], title: 'Ngân hàng bài tập', body: 'Mở Ngân hàng bài tập trong Quản lý Giáo dục để lưu và dùng lại bài tập theo môn.', goId: 'edu_bank' },
  { keys: ['xuat pdf bai giang', 'tai bai giang', 'tai pdf'], title: 'Tải bài giảng ra PDF', body: 'Mở bài giảng cần tải, bấm nút Tải PDF ở góc trên, sau đó chọn Lưu thành PDF.' },
  { keys: ['xuat de pdf', 'in de', 'xuat cau hoi'], title: 'Xuất đề ra PDF để in', body: 'Mở một đề, hoặc tích chọn các câu trong Ngân hàng câu hỏi, rồi bấm Xuất PDF và điền thông tin đầu trang như trường, môn, mã đề.' },
  { keys: ['them mon', 'tao mon', 'mon hoc moi'], title: 'Thêm môn học mới', body: 'Khi tạo bài giảng hoặc soạn đề, bấm dấu cộng cạnh ô chọn môn để tạo nhanh một môn mới ngay tại chỗ.' },
  { keys: ['soan bai giang', 'tao bai giang', 'bai giang', 'e-learning', 'elearning'], title: 'Soạn bài giảng', body: 'Vào E-Learning, bấm Tạo bài giảng mới, đặt tên và chọn môn, sau đó soạn nội dung theo từng phần.', goId: 'elearning' },
  { keys: ['nop bai', 'nop tre', 'nop lai', 'nop bo sung'], title: 'Nộp bài của sinh viên', body: 'Sinh viên mở liên kết bài tập, nhập mã số sinh viên rồi tải file nộp. Giảng viên có thể mở Cho nộp lại hoặc bật Cho nộp bổ sung trong phần chấm bài.' },
  { keys: ['ma de', 'ban nhap', 'phat hanh'], title: 'Bản nháp và phát hành đề', body: 'Đề mới soạn ở trạng thái bản nháp, chưa giao cho sinh viên được. Mở đề và bấm Phát hành đề khi đã soạn xong.' },
];

export default function VirtualAssistant({ currentUser, settings, onSwitchTab }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [subjects, setSubjects] = useState<EduSubject[]>([]);
  const [lessons, setLessons] = useState<ELLesson[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions || [];
  const canEdu = isAdmin || perms.includes('edu');

  // Kiểm tra quyền xem một chức năng, tôn trọng phân quyền và trạng thái ẩn của admin.
  const canFeature = (id: string): boolean => {
    if (isModuleHidden(id, settings)) return false;
    if (isAdmin) return true;
    if (id === 'notifications') return true;
    if (id === 'utilities') return perms.includes('utilities') || perms.includes('ar_module') || perms.includes('utility_image_resize') || perms.includes('utility_social_design');
    if (id === 'ar_module') return perms.includes('ar_module') || perms.includes('utilities');
    if (id === 'utility_image_resize') return perms.includes('utility_image_resize') || perms.includes('utilities');
    if (id === 'utility_social_design') return perms.includes('utility_social_design') || perms.includes('utilities');
    if (id === 'edu_bank') return perms.includes('edu') && !!currentUser?.canCreateEdu;
    if (id === 'edu_exam') return perms.includes('edu') && !!currentUser?.canGradeEdu;
    if (id === 'edu_grade') return perms.includes('edu') && !!currentUser?.canGradeImportEdu;
    if (id === 'notifications_admin') return perms.includes('notifications');
    if (id === 'users' || id === 'permissions') return false;
    return perms.includes(id);
  };

  const subjectName = (id?: string | null) => subjects.find(s => s.id === id)?.name || '';

  // Nạp dữ liệu môn học và bài giảng một lần khi mở trợ lý lần đầu.
  useEffect(() => {
    if (!open || dataReady) return;
    (async () => {
      try {
        const [subs, mine, pub] = await Promise.all([
          getSubjects().catch(() => []),
          getMyLessons({}).catch(() => []),
          getPublicLessons({}).catch(() => []),
        ]);
        setSubjects(subs);
        const map = new Map<string, ELLesson>();
        [...mine, ...pub].forEach(l => map.set(l.id, l));
        setLessons(Array.from(map.values()));
      } finally {
        setDataReady(true);
      }
    })();
  }, [open, dataReady]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  // Mở một chức năng, xử lý riêng phím tắt con của Giáo dục như Dashboard.
  const go = (id: string) => {
    if (id === 'edu_bank' || id === 'edu_exam' || id === 'edu_grade') {
      const m: Record<string, string> = { edu_bank: 'assignment_bank', edu_exam: 'exam_bank', edu_grade: 'grade_entry' };
      try { localStorage.setItem('edu_initial_view', m[id]); } catch {}
      onSwitchTab('edu');
    } else {
      onSwitchTab(id);
    }
    setOpen(false);
  };
  const openLesson = (id: string) => { window.location.href = `${window.location.origin}${window.location.pathname}?elview=${id}`; };

  const buildResult = async (text: string): Promise<BotResult> => {
    const q = norm(text);
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    const matchText = (t: string) => words.length === 0 ? false : words.some(w => norm(t).includes(w));

    // Chức năng khớp theo tên và mô tả, đã lọc quyền.
    const features: FeatureHit[] = MODULE_REGISTRY
      .filter(m => canFeature(m.id))
      .map(m => resolveModuleMeta(m, settings))
      .filter(m => matchText(`${m.label} ${m.desc}`))
      .slice(0, 4)
      .map(m => ({ id: m.id, label: m.label, desc: m.desc }));

    // Bài giảng khớp theo tên, tóm tắt và tên môn.
    const lessonHits = lessons
      .filter(l => matchText(`${l.title || ''} ${l.summary || ''} ${subjectName(l.subject_id)}`))
      .slice(0, 5)
      .map(l => ({ id: l.id, title: l.title || 'Bài giảng', subject: subjectName(l.subject_id) }));

    // Mẹo hướng dẫn khớp theo từ khóa.
    const faqs = FAQS.filter(f => f.keys.some(k => q.includes(k)) || f.keys.some(k => words.some(w => k.includes(w))))
      .filter(f => !f.goId || canFeature(f.goId))
      .slice(0, 3)
      .map(f => ({ title: f.title, body: f.body, goId: f.goId }));

    // Câu hỏi trong ngân hàng, chỉ cho tài khoản có quyền Giáo dục.
    let questions: { id: string; text: string }[] = [];
    if (canEdu) {
      try {
        const qs: QuizQuestion[] = await getBankQuestions({ search: text });
        questions = qs.slice(0, 3).map(x => ({ id: x.id, text: stripHtml(x.content).slice(0, 120) }));
      } catch { /* bỏ qua */ }
    }

    const total = features.length + lessonHits.length + faqs.length + questions.length;
    const intro = total === 0
      ? 'Mình chưa tìm thấy kết quả phù hợp. Bạn thử gõ ngắn gọn hơn, ví dụ tên môn, tên bài giảng, hoặc việc muốn làm như tạo đề, nhập điểm, tải PDF.'
      : 'Đây là những gì mình tìm được:';
    return { intro, faqs, features, lessons: lessonHits, questions };
  };

  const submit = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    setMsgs(m => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const result = await buildResult(text);
      setMsgs(m => [...m, { role: 'bot', result }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ['Tạo đề trắc nghiệm', 'Nhập điểm ở đâu', 'Tải bài giảng ra PDF', 'Thêm môn học mới'];

  return (
    <>
      {/* Nút nổi mở trợ lý */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Trợ lý ảo"
          className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition-transform hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[95] flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* Đầu khung */}
          <div className="flex items-center justify-between gap-2 bg-brand px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20"><Sparkles className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-bold leading-tight">Trợ lý ảo</p>
                <p className="text-[10px] text-white/80 leading-tight">Tìm bài giảng, câu hỏi và hướng dẫn</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/15"><X className="h-5 w-5" /></button>
          </div>

          {/* Nội dung hội thoại */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 text-[13px] text-slate-700 shadow-sm">
                  Xin chào {currentUser?.fullName?.split(' ').slice(-1)[0] || ''}. Mình có thể giúp tìm bài giảng, tra câu hỏi và chỉ đường tới các chức năng. Bạn muốn làm gì?
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => submit(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-brand/40 hover:text-brand">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-3 py-2 text-[13px] font-medium text-white">{m.text}</div>
              </div>
            ) : (
              <div key={i} className="space-y-2">
                <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 text-[13px] text-slate-700 shadow-sm">{m.result.intro}</div>

                {m.result.faqs.length > 0 && (
                  <div className="space-y-1.5">
                    {m.result.faqs.map((f, k) => (
                      <div key={k} className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                        <p className="flex items-center gap-1.5 text-[12px] font-bold text-amber-800"><HelpCircle className="h-3.5 w-3.5" /> {f.title}</p>
                        <p className="mt-1 text-[12px] leading-snug text-amber-900/90">{f.body}</p>
                        {f.goId && <button onClick={() => go(f.goId!)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline">Tới chức năng <ArrowRight className="h-3 w-3" /></button>}
                      </div>
                    ))}
                  </div>
                )}

                {m.result.lessons.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-2.5">
                    <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase text-slate-400"><BookOpen className="h-3.5 w-3.5" /> Bài giảng</p>
                    <div className="space-y-1">
                      {m.result.lessons.map(l => (
                        <button key={l.id} onClick={() => openLesson(l.id)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-semibold text-slate-800">{l.title}</span>
                            {l.subject && <span className="block truncate text-[10px] text-slate-400">{l.subject}</span>}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {m.result.questions.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-2.5">
                    <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase text-slate-400"><FileQuestion className="h-3.5 w-3.5" /> Câu hỏi trong ngân hàng</p>
                    <div className="space-y-1">
                      {m.result.questions.map(qq => (
                        <p key={qq.id} className="rounded-xl bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-700 line-clamp-2">{qq.text || '(câu hỏi trống)'}</p>
                      ))}
                    </div>
                    <button onClick={() => go('edu_exam')} className="mt-2 inline-flex items-center gap-1 px-1 text-[11px] font-bold text-brand hover:underline">Mở phần trắc nghiệm <ArrowRight className="h-3 w-3" /></button>
                  </div>
                )}

                {m.result.features.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-2.5">
                    <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase text-slate-400"><LayoutGrid className="h-3.5 w-3.5" /> Chức năng</p>
                    <div className="space-y-1">
                      {m.result.features.map(f => (
                        <button key={f.id} onClick={() => go(f.id)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-semibold text-slate-800">{f.label}</span>
                            <span className="block truncate text-[10px] text-slate-400">{f.desc}</span>
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && <div className="flex items-center gap-2 px-2 text-[12px] text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tìm...</div>}
          </div>

          {/* Ô nhập */}
          <div className="flex items-center gap-2 border-t border-slate-100 p-2.5">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Hỏi hoặc tìm gì đó..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] outline-none focus:border-brand focus:bg-white"
            />
            <button onClick={() => submit()} disabled={!input.trim() || loading} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white hover:bg-brand-hover disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </>
  );
}
