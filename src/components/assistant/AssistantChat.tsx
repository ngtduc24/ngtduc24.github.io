import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, LayoutGrid, HelpCircle, ArrowRight, Loader2, FileQuestion, Sparkles, BookMarked } from 'lucide-react';
import { UserAccount, AppSettings } from '../../types';
import { MODULE_REGISTRY, resolveModuleMeta, isModuleHidden } from '../../lib/modules';
import { getSubjects, getAssignmentBank } from '../../lib/edu';
import { getMyLessons, getPublicLessons, getSections, stripHtml, ELLesson } from '../../lib/elearning';
import { getBankQuestions, QuizQuestion } from '../../lib/quiz';
import { EduSubject, EduAssignmentBankItem } from '../../types/edu';
import { auth } from '../../lib/firebase';

interface Props {
  currentUser: UserAccount;
  settings: AppSettings;
  onSwitchTab: (tab: string) => void;
  onAfterNavigate?: () => void;
  // 'system' (nút nổi): hỏi đáp và hướng dẫn dùng hệ thống. 'knowledge' (trang riêng): chỉ
  // hỏi đáp kiến thức bài học từ nội dung công khai, không trả lời về hệ thống hay cách dùng.
  mode?: 'system' | 'knowledge';
}

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu.
const norm = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// Từ chung ít mang nghĩa, bỏ ra khi tìm câu trả lời để bám vào từ khóa chính (ví dụ vertex).
const STOPWORDS = new Set(['la', 'gi', 'the', 'nao', 'cua', 'va', 'o', 'dau', 'cach', 'lam', 'khi', 'cho', 'mot', 'cai', 'nhu', 'nay', 'do', 'ra', 'sao', 'ai', 'bao', 'nhieu', 'co', 'khong', 'duoc', 'voi', 'trong', 'tren', 'de', 'thi', 'hay', 'cac', 'nhung', 've', 'ban', 'minh']);

// Tách văn bản thành câu, không dùng lookbehind để chạy được trên Safari cũ.
const splitSentences = (text: string) => text.split(/(?:[.!?…]+\s+)|[\n\r]+/).map(s => s.trim()).filter(Boolean);

// Trích câu trong nội dung bài giảng có chứa từ khóa chính, để trả lời thẳng câu hỏi.
function extractAnswer(text: string, keywords: string[]): string | null {
  const sentences = splitSentences(text);
  const kws = [...keywords].sort((a, b) => b.length - a.length);
  for (let i = 0; i < sentences.length; i += 1) {
    const n = norm(sentences[i]);
    if (kws.some(w => n.includes(w))) {
      let out = sentences[i];
      if (out.length < 60 && sentences[i + 1]) out += '. ' + sentences[i + 1];
      return out.length > 320 ? out.slice(0, 318).trimEnd() + '…' : out;
    }
  }
  return null;
}

interface FeatureHit { id: string; label: string; desc: string }
interface GuideHit { id: string; name: string; whatIs: string; howTo: string[] }
interface Passage { lessonId: string; lessonTitle: string; text: string }
interface AnswerHit { snippet: string; lessonId: string; lessonTitle: string }
interface BotResult {
  intro: string;
  aiAnswer?: string;
  aiError?: string;
  answers: AnswerHit[];
  knowledge: { title: string; content: string }[];
  guides: GuideHit[];
  faqs: { title: string; body: string; goId?: string }[];
  features: FeatureHit[];
  lessons: { id: string; title: string; subject: string }[];
  questions: { id: string; text: string }[];
  assignments: { id: string; title: string; subject: string; snippet: string }[];
}
type Msg = { role: 'user'; text: string } | { role: 'bot'; result: BotResult };

// Giới thiệu từng chức năng: nó là gì và các bước dùng. Trợ lý dùng để trả lời đầy đủ khi
// người dùng hỏi về một chức năng, thay vì chỉ đưa liên kết.
const FEATURE_GUIDE: Record<string, { whatIs: string; howTo: string[] }> = {
  remier: { whatIs: 'Remier là công cụ dựng video nhiều lớp chạy ngay trên trình duyệt, không cần cài phần mềm.', howTo: ['Mở Remier từ trang tổng quan.', 'Thêm ảnh, video, âm thanh vào kho tư liệu rồi kéo xuống dòng thời gian.', 'Cắt ghép, thêm chữ, hiệu ứng, chuyển tiếp cho từng lớp.', 'Bấm Xuất để lưu video ra file.'] },
  edu: { whatIs: 'Quản lý Giáo dục là nơi quản lý trường, lớp, danh sách sinh viên, bài tập và bảng điểm.', howTo: ['Mở Quản lý Giáo dục.', 'Tạo hoặc chọn lớp rồi nhập danh sách sinh viên.', 'Tạo bài tập, cột điểm, giao bài và chấm điểm.', 'Xem cột Trung bình môn tính theo trọng số từng cột.'] },
  elearning: { whatIs: 'E-Learning là nơi soạn, lưu trữ và chia sẻ bài giảng theo môn, giao bài giảng cho lớp.', howTo: ['Vào E-Learning rồi bấm Tạo bài giảng mới.', 'Đặt tên và chọn môn, nếu chưa có môn thì bấm dấu cộng thêm nhanh.', 'Soạn nội dung theo từng phần, đính kèm tài nguyên.', 'Công khai lên kho chung hoặc giao cho lớp bằng liên kết.'] },
  edu_bank: { whatIs: 'Ngân hàng bài tập lưu các bài tập để dùng lại và chia sẻ theo môn.', howTo: ['Mở Ngân hàng bài tập.', 'Tạo bài tập mới hoặc chọn từ kho có sẵn.', 'Gán bài tập vào lớp khi cần giao.'] },
  edu_exam: { whatIs: 'Trắc nghiệm là nơi soạn câu hỏi, tạo đề, giao đề cho lớp và chấm tự động.', howTo: ['Mở Trắc nghiệm.', 'Soạn câu hỏi trong Ngân hàng câu hỏi.', 'Bấm Tạo đề mới rồi thêm câu hỏi vào đề.', 'Bấm Phát hành đề rồi giao cho lớp.', 'Có thể xuất đề ra PDF để in.'] },
  edu_grade: { whatIs: 'Nhập điểm giúp nhập điểm vào file của phần mềm trường.', howTo: ['Mở Nhập điểm.', 'Chọn lớp và cột điểm.', 'Nhập điểm rồi xuất file.'] },
  calculator: { whatIs: 'Tính cỡ mẫu nghiên cứu hỗ trợ tính toán cỡ mẫu theo công thức chuẩn.', howTo: ['Mở Tính cỡ mẫu nghiên cứu.', 'Chọn công thức phù hợp.', 'Nhập các tham số rồi xem kết quả cỡ mẫu.'] },
  scientific_journals: { whatIs: 'Quản lý điểm báo khoa học để lưu trữ và phân loại điểm báo, bài viết.', howTo: ['Mở Quản lý điểm báo khoa học.', 'Thêm hoặc nhập danh sách tạp chí.', 'Lọc theo ngành, loại và điểm.'] },
  qualitative_analysis: { whatIs: 'Định tính để mã hóa và phân tích dữ liệu phỏng vấn, thảo luận nhóm.', howTo: ['Mở Định tính.', 'Tạo dự án rồi thêm tài liệu.', 'Mã hóa đoạn văn và xem tổng hợp mã.'] },
  quantitative_analysis: { whatIs: 'Định lượng để phân tích thống kê và trực quan hóa số liệu.', howTo: ['Mở Định lượng.', 'Nhập hoặc tải dữ liệu lên.', 'Chạy phân tích và xem biểu đồ.'] },
  tasks: { whatIs: 'Quản lý công việc để tạo, theo dõi và phân công việc cá nhân hoặc nhóm.', howTo: ['Mở Quản lý công việc.', 'Tạo công việc, đặt hạn và người nhận.', 'Cập nhật trạng thái tới khi hoàn thành.'] },
  ar_module: { whatIs: 'Tạo AR để tạo điểm ảnh nhận diện kèm mã QR quét bằng điện thoại.', howTo: ['Mở Tạo AR.', 'Tải ảnh mục tiêu và nội dung hiển thị.', 'Lấy mã QR để người xem quét.'] },
  utility_image_resize: { whatIs: 'Phóng to ảnh để tăng độ phân giải và làm rõ chi tiết ảnh.', howTo: ['Mở Phóng to ảnh.', 'Tải ảnh lên và chọn tỉ lệ.', 'Tải ảnh kết quả về.'] },
  utility_social_design: { whatIs: 'Thiết kế ảnh để tạo nhanh ảnh cho bài báo, tin tức từ khung mẫu.', howTo: ['Mở Thiết kế ảnh.', 'Chọn khung mẫu.', 'Đổi nội dung và ảnh rồi tải về.'] },
  portfolio_cms: { whatIs: 'Quản trị Portfolio để quản lý hồ sơ cá nhân, dự án và khóa học.', howTo: ['Mở Quản trị Portfolio.', 'Thêm hoặc sửa dự án, khóa học, bài viết.', 'Công khai lên trang portfolio.'] },
  media_library: { whatIs: 'Thư viện lưu trữ và quản lý hình ảnh, tài liệu dùng chung.', howTo: ['Mở Thư viện.', 'Tải tệp lên theo danh mục.', 'Chọn tệp để dùng lại ở các chức năng khác.'] },
  notifications_admin: { whatIs: 'Trung tâm thông báo để soạn và phát thông báo tới người dùng.', howTo: ['Mở Trung tâm thông báo.', 'Soạn nội dung và chọn người nhận.', 'Gửi thông báo.'] },
  notifications: { whatIs: 'Thông báo là hộp thư xem các thông báo hệ thống.', howTo: ['Mở Thông báo để xem tin mới.'] },
  assistant: { whatIs: 'Trợ lý giáo dục giúp hỏi đáp kiến thức bài học dựa trên bài giảng, câu hỏi và bài tập được chia sẻ công khai.', howTo: ['Mở Trợ lý giáo dục.', 'Gõ câu hỏi về nội dung bài học hoặc tên bài giảng.', 'Bấm kết quả để xem bài giảng liên quan.'] },
  users: { whatIs: 'Quản lý người dùng để tạo và chỉnh sửa tài khoản trên hệ thống.', howTo: ['Mở Quản lý người dùng.', 'Thêm hoặc sửa tài khoản và đặt vai trò.'] },
  permissions: { whatIs: 'Phân quyền người dùng để cấp quyền truy cập từng chức năng.', howTo: ['Mở Phân quyền người dùng.', 'Chọn tài khoản rồi bật tắt quyền từng chức năng.'] },
  settings: { whatIs: 'Cấu hình hệ thống để chỉnh màu, phông chữ, ảnh, chức năng và chế độ bảo trì.', howTo: ['Mở Cấu hình hệ thống.', 'Chọn tab tương ứng và chỉnh.', 'Bấm Lưu.'] },
};

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

// Phần lõi hội thoại của trợ lý, dùng chung cho nút nổi và trang Trợ lý.
export default function AssistantChat({ currentUser, settings, onSwitchTab, onAfterNavigate, mode = 'system' }: Props) {
  const knowledgeMode = mode === 'knowledge';
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [subjects, setSubjects] = useState<EduSubject[]>([]);
  const [lessons, setLessons] = useState<ELLesson[]>([]);
  const [bankItems, setBankItems] = useState<EduAssignmentBankItem[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [dataReady, setDataReady] = useState(false);
  // Chế độ trả lời bằng AI Gemini, chỉ có ở Trợ lý giáo dục. Cần Edge Function gemini-chat.
  const [aiMode, setAiMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions || [];
  const canEdu = isAdmin || perms.includes('edu');

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

  useEffect(() => {
    if (dataReady) return;
    (async () => {
      try {
        const subs = await getSubjects().catch(() => []);
        setSubjects(subs);
        if (knowledgeMode) {
          // Trang trợ lý kiến thức chỉ dùng nội dung công khai: bài giảng kho chung và
          // ngân hàng bài tập được chia sẻ công khai.
          const [pub, bank] = await Promise.all([
            getPublicLessons({}).catch(() => []),
            getAssignmentBank().catch(() => []),
          ]);
          setLessons(pub);
          setBankItems((bank as EduAssignmentBankItem[]).filter(b => b.isPublic === true));
          // Đọc nội dung các phần của bài giảng công khai để trả lời thẳng câu hỏi kiến thức.
          const limited = pub.slice(0, 40);
          const secLists = await Promise.all(limited.map(l =>
            getSections(l.id).then(secs => ({ l, secs })).catch(() => ({ l, secs: [] as any[] }))
          ));
          const ps: Passage[] = [];
          secLists.forEach(({ l, secs }) => secs.forEach((s: any) => {
            const t = stripHtml(s.content || '');
            if (t.trim().length > 0) ps.push({ lessonId: l.id, lessonTitle: l.title || 'Bài giảng', text: t });
          }));
          setPassages(ps);
        } else {
          const [mine, pub] = await Promise.all([
            getMyLessons({}).catch(() => []),
            getPublicLessons({}).catch(() => []),
          ]);
          const map = new Map<string, ELLesson>();
          [...mine, ...pub].forEach(l => map.set(l.id, l));
          setLessons(Array.from(map.values()));
        }
      } finally {
        setDataReady(true);
      }
    })();
  }, [dataReady, knowledgeMode]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  const go = (id: string) => {
    if (id === 'edu_bank' || id === 'edu_exam' || id === 'edu_grade') {
      const m: Record<string, string> = { edu_bank: 'assignment_bank', edu_exam: 'exam_bank', edu_grade: 'grade_entry' };
      try { localStorage.setItem('edu_initial_view', m[id]); } catch {}
      onSwitchTab('edu');
    } else {
      onSwitchTab(id);
    }
    onAfterNavigate?.();
  };
  const openLesson = (id: string) => { window.location.href = `${window.location.origin}${window.location.pathname}?elview=${id}`; };

  // Gọi AI Gemini qua Edge Function trên Supabase, khóa API nằm ở máy chủ, cần đăng nhập.
  const callGeminiChat = async (question: string, context: string): Promise<string> => {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL?.trim?.();
    if (!supabaseUrl) throw new Error('Chưa cấu hình địa chỉ Supabase.');
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (!idToken) throw new Error('Bạn cần đăng nhập để dùng trả lời bằng AI.');
    const res = await fetch(`${String(supabaseUrl).replace(/\/$/, '')}/functions/v1/gemini-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ question, context }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.answer) throw new Error(payload?.error || 'Gemini không trả lời được.');
    return payload.answer as string;
  };

  const buildResult = async (text: string): Promise<BotResult> => {
    const q = norm(text);
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    const matchText = (t: string) => words.length === 0 ? false : words.some(w => norm(t).includes(w));

    // Thư viện kiến thức do admin cung cấp trong Cấu hình hệ thống.
    const knowledge = (settings.assistantKnowledge || [])
      .filter(k => (k.title || k.content) && matchText(`${k.title || ''} ${k.keywords || ''} ${k.content || ''}`))
      .slice(0, 3)
      .map(k => ({ title: k.title || 'Kiến thức', content: k.content || '' }));

    // Bài giảng khớp theo tên, tóm tắt và tên môn (ở chế độ kiến thức chỉ là bài giảng công khai).
    const lessonHitsAll = lessons
      .filter(l => matchText(`${l.title || ''} ${l.summary || ''} ${subjectName(l.subject_id)}`))
      .slice(0, 5)
      .map(l => ({ id: l.id, title: l.title || 'Bài giảng', subject: subjectName(l.subject_id) }));

    // ===== Chế độ trang trợ lý kiến thức: chỉ nội dung công khai, không có phần hệ thống =====
    if (knowledgeMode) {
      // Trả lời thẳng bằng cách trích câu trong nội dung bài giảng có chứa từ khóa chính.
      const keywords = words.filter(w => w.length >= 2 && !STOPWORDS.has(w));
      const kw = keywords.length ? keywords : words;
      const answers: AnswerHit[] = [];
      const usedLessons = new Set<string>();
      for (const p of passages) {
        if (answers.length >= 2) break;
        if (usedLessons.has(p.lessonId)) continue;
        const snip = extractAnswer(p.text, kw);
        if (snip) { answers.push({ snippet: snip, lessonId: p.lessonId, lessonTitle: p.lessonTitle }); usedLessons.add(p.lessonId); }
      }

      // Nếu bật AI Gemini: gom ngữ cảnh từ học liệu công khai rồi nhờ Gemini trả lời.
      let aiAnswer: string | undefined;
      let aiError: string | undefined;
      if (aiMode) {
        const ctxParts: string[] = [];
        knowledge.forEach(k => ctxParts.push(`${k.title}: ${k.content}`));
        const relevant = passages.filter(p => kw.some(w => norm(p.text).includes(w)));
        const usePassages = (relevant.length ? relevant : passages).slice(0, 6);
        usePassages.forEach(p => ctxParts.push(`Bài giảng ${p.lessonTitle}: ${p.text.slice(0, 1000)}`));
        const context = ctxParts.join('\n\n').slice(0, 15000);
        try {
          aiAnswer = await callGeminiChat(text, context);
        } catch (e: any) {
          aiError = e?.message || 'Không gọi được AI.';
        }
      }

      let questions: { id: string; text: string }[] = [];
      try {
        const qs = await getBankQuestions({ scope: 'shared', search: text });
        questions = qs.slice(0, 3).map(x => ({ id: x.id, text: stripHtml(x.content).slice(0, 140) }));
      } catch { /* bỏ qua */ }

      const assignments = bankItems
        .filter(b => matchText(`${b.title || ''} ${stripHtml(b.content || '')} ${subjectName(b.subjectId)}`))
        .slice(0, 3)
        .map(b => ({ id: b.id, title: b.title || 'Bài tập', subject: subjectName(b.subjectId), snippet: stripHtml(b.content || '').slice(0, 140) }));

      // Khi AI trả lời, ẩn phần trích câu cục bộ để tránh trùng, vẫn giữ nguồn bài giảng bên dưới.
      const localAnswers = aiAnswer ? [] : answers;
      const total = (aiAnswer ? 1 : 0) + localAnswers.length + knowledge.length + lessonHitsAll.length + questions.length + assignments.length;
      let intro: string;
      if (aiAnswer) intro = 'Trợ lý giáo dục trả lời (AI Gemini dựa trên học liệu công khai):';
      else if (total === 0) intro = 'Mình chưa tìm thấy nội dung phù hợp trong kho công khai. Bạn thử hỏi theo tên bài giảng, môn học, hoặc một khái niệm trong bài. Lưu ý mình chỉ biết các bài giảng, câu hỏi và bài tập đã được chia sẻ công khai.';
      else if (localAnswers.length > 0) intro = 'Theo nội dung bài giảng công khai:';
      else intro = 'Mình tìm được nội dung liên quan trong kho học liệu công khai:';
      return { intro, aiAnswer, aiError, answers: localAnswers, knowledge, guides: [], faqs: [], features: [], lessons: lessonHitsAll, questions, assignments };
    }

    const matchedFeatures = MODULE_REGISTRY
      .filter(m => canFeature(m.id))
      .map(m => resolveModuleMeta(m, settings))
      .filter(m => matchText(`${m.label} ${m.desc}`));

    // 2 chức năng khớp nhất được giới thiệu đầy đủ: là gì và cách dùng.
    const guides: GuideHit[] = matchedFeatures.slice(0, 2).map(m => {
      const g = FEATURE_GUIDE[m.id];
      return {
        id: m.id,
        name: m.label,
        whatIs: g?.whatIs || m.desc,
        howTo: g?.howTo || ['Mở chức năng từ hàng phím tắt ở trang tổng quan hoặc trang Tất cả tính năng.'],
      };
    });
    const guideIds = new Set(guides.map(g => g.id));
    // Các chức năng khớp còn lại chỉ liệt kê gọn để mở nhanh.
    const features: FeatureHit[] = matchedFeatures
      .filter(m => !guideIds.has(m.id))
      .slice(0, 3)
      .map(m => ({ id: m.id, label: m.label, desc: m.desc }));

    const lessonHits = lessons
      .filter(l => matchText(`${l.title || ''} ${l.summary || ''} ${subjectName(l.subject_id)}`))
      .slice(0, 5)
      .map(l => ({ id: l.id, title: l.title || 'Bài giảng', subject: subjectName(l.subject_id) }));

    const faqs = FAQS.filter(f => f.keys.some(k => q.includes(k)) || f.keys.some(k => words.some(w => k.includes(w))))
      .filter(f => !f.goId || canFeature(f.goId))
      .slice(0, 3)
      .map(f => ({ title: f.title, body: f.body, goId: f.goId }));

    let questions: { id: string; text: string }[] = [];
    if (canEdu) {
      try {
        const qs: QuizQuestion[] = await getBankQuestions({ search: text });
        questions = qs.slice(0, 3).map(x => ({ id: x.id, text: stripHtml(x.content).slice(0, 120) }));
      } catch { /* bỏ qua */ }
    }

    const total = knowledge.length + guides.length + features.length + lessonHits.length + faqs.length + questions.length;
    let intro: string;
    if (total === 0) {
      intro = 'Mình chưa tìm thấy kết quả phù hợp. Bạn thử gõ ngắn gọn hơn, ví dụ tên môn, tên bài giảng, hoặc việc muốn làm như tạo đề, nhập điểm, tải PDF.';
    } else if (knowledge.length > 0) {
      intro = 'Mình tìm được thông tin liên quan:';
    } else if (guides.length > 0) {
      intro = guides.length === 1
        ? `Bạn đang hỏi về chức năng ${guides[0].name}. Mình giới thiệu ngắn gọn chức năng này là gì và cách dùng:`
        : 'Mình giới thiệu các chức năng bạn đang hỏi, kèm cách dùng:';
    } else {
      intro = 'Đây là những gì mình tìm được:';
    }
    return { intro, answers: [], knowledge, guides, faqs, features, lessons: lessonHits, questions, assignments: [] };
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

  const suggestions = knowledgeMode
    ? ['Bài giảng về Blender', 'Vertex là gì', 'Bài tập về dựng hình', 'Câu hỏi ôn tập']
    : ['Tạo đề trắc nghiệm', 'Nhập điểm ở đâu', 'Tải bài giảng ra PDF', 'Thêm môn học mới'];
  const greeting = knowledgeMode
    ? `Xin chào ${currentUser?.fullName?.split(' ').slice(-1)[0] || ''}. Mình là Trợ lý giáo dục, giúp hỏi đáp kiến thức bài học dựa trên bài giảng, câu hỏi và bài tập đã được chia sẻ công khai. Bạn muốn tìm hiểu điều gì?`
    : `Xin chào ${currentUser?.fullName?.split(' ').slice(-1)[0] || ''}. Mình là Trợ lý hệ thống, giúp hướng dẫn dùng và chỉ đường tới các chức năng. Bạn muốn làm gì?`;

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 text-[13px] text-slate-700 shadow-sm">
              {greeting}
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

            {m.result.aiAnswer && (
              <div className="rounded-2xl border border-brand/30 bg-brand-light/50 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase text-brand"><Sparkles className="h-3.5 w-3.5" /> AI Gemini</p>
                <p className="whitespace-pre-line text-[13.5px] leading-snug text-slate-800">{m.result.aiAnswer}</p>
              </div>
            )}
            {m.result.aiError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Không dùng được AI ({m.result.aiError}). Dưới đây là kết quả tìm trong học liệu.</div>
            )}

            {m.result.answers.map((a, k) => (
              <div key={`ans${k}`} className="rounded-2xl border border-brand/20 bg-brand-light/40 p-3">
                <p className="text-[13.5px] leading-snug text-slate-800">{a.snippet}</p>
                <button onClick={() => openLesson(a.lessonId)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline">Nguồn: {a.lessonTitle} <ArrowRight className="h-3 w-3" /></button>
              </div>
            ))}

            {m.result.knowledge.map((kn, k) => (
              <div key={`kn${k}`} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900"><BookMarked className="h-4 w-4 text-brand" /> {kn.title}</p>
                <p className="mt-1 whitespace-pre-line text-[12.5px] leading-snug text-slate-600">{kn.content}</p>
              </div>
            ))}

            {m.result.guides.map((g, k) => (
              <div key={k} className="rounded-2xl border border-brand/20 bg-brand-light/40 p-3">
                <p className="flex items-center gap-1.5 text-[13px] font-black text-slate-900"><Sparkles className="h-4 w-4 text-brand" /> {g.name}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-slate-600">{g.whatIs}</p>
                <p className="mt-2 text-[10px] font-black uppercase text-slate-400">Cách dùng</p>
                <ol className="mt-1 space-y-1">
                  {g.howTo.map((step, si) => (
                    <li key={si} className="flex gap-2 text-[12.5px] text-slate-700">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-[9px] font-bold text-white">{si + 1}</span>
                      <span className="min-w-0 flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
                <button onClick={() => go(g.id)} className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-hover">Mở {g.name} <ArrowRight className="h-3 w-3" /></button>
              </div>
            ))}

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
                {!knowledgeMode && <button onClick={() => go('edu_exam')} className="mt-2 inline-flex items-center gap-1 px-1 text-[11px] font-bold text-brand hover:underline">Mở phần trắc nghiệm <ArrowRight className="h-3 w-3" /></button>}
              </div>
            )}

            {m.result.assignments.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-2.5">
                <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black uppercase text-slate-400"><BookMarked className="h-3.5 w-3.5" /> Bài tập công khai</p>
                <div className="space-y-1">
                  {m.result.assignments.map(a => (
                    <div key={a.id} className="rounded-xl bg-slate-50 px-2.5 py-2">
                      <p className="text-[12.5px] font-semibold text-slate-800">{a.title}{a.subject ? ` · ${a.subject}` : ''}</p>
                      {a.snippet && <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{a.snippet}</p>}
                    </div>
                  ))}
                </div>
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

        {loading && <div className="flex items-center gap-2 px-2 text-[12px] text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> {aiMode ? 'AI đang trả lời...' : 'Đang tìm...'}</div>}
      </div>

      {knowledgeMode && (
        <button
          type="button"
          onClick={() => setAiMode(v => !v)}
          className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-3 py-2 text-left"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><Sparkles className={`h-3.5 w-3.5 ${aiMode ? 'text-brand' : 'text-slate-400'}`} /> Trả lời bằng AI Gemini</span>
          <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${aiMode ? 'bg-brand' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${aiMode ? 'left-[18px]' : 'left-0.5'}`} /></span>
        </button>
      )}

      <div className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Hỏi hoặc tìm gì đó..."
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] outline-none focus:border-brand focus:bg-white"
        />
        <button onClick={() => submit()} disabled={!input.trim() || loading} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white hover:bg-brand-hover disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </div>
    </>
  );
}
