import { QuizQuestion } from './quiz';

// Xuất đề trắc nghiệm hoặc các câu hỏi đã chọn ra PDF theo mẫu đề thi để in. Dựng tài liệu in
// gọn gàng có đầu trang (trường, môn, tên bài kiểm tra, mã đề, thời gian) rồi mở hộp thoại in,
// người dùng chọn Lưu thành PDF. Chạy trên cả máy tính và điện thoại, giữ đúng tiếng Việt.

export interface ExamHeader {
  orgTop?: string;      // dòng trên cùng, ví dụ SỞ GD&ĐT BÌNH DƯƠNG
  school?: string;      // trường hoặc khoa
  examTitle?: string;   // tên bài kiểm tra
  subject?: string;     // môn
  duration?: string;    // thời gian làm bài, ví dụ 90 phút
  code?: string;        // mã đề
  pages?: string;       // số trang, để trống thì ẩn dòng này
  official?: boolean;   // hiện dòng (ĐỀ CHÍNH THỨC)
  showAnswers?: boolean;// in kèm bảng đáp án cuối đề (bản dành cho giáo viên)
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Lấy các phương án theo thứ tự và gán chữ cái A, B, C, D...
function sortedOptions(q: QuizQuestion) {
  return [...(q.options || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

function buildExamHtml(header: ExamHeader, questions: QuizQuestion[]): string {
  const officialLine = header.official ? '<div class="mid">(ĐỀ CHÍNH THỨC)</div>' : '';
  const pagesLine = header.pages ? `<div class="small">(Đề thi có ${esc(header.pages)} trang)</div>` : '';
  const codeBox = header.code ? `<span class="code">Mã đề ${esc(header.code)}</span>` : '';

  const questionsHtml = questions.map((q, i) => {
    const opts = sortedOptions(q).map((o, oi) =>
      `<div class="opt"><b>${String.fromCharCode(65 + oi)}.</b> ${o.content || ''}</div>`
    ).join('');
    return `<div class="q">
      <div class="q-content"><b>Câu ${i + 1}.</b> ${q.content || ''}</div>
      <div class="opts">${opts}</div>
    </div>`;
  }).join('');

  // Bảng đáp án cuối đề, chỉ in khi bật, dành cho giáo viên.
  let answerKey = '';
  if (header.showAnswers) {
    const rows = questions.map((q, i) => {
      const letters = sortedOptions(q).map((o, oi) => o.is_correct ? String.fromCharCode(65 + oi) : null).filter(Boolean).join('');
      return `<span class="ak"><b>Câu ${i + 1}:</b> ${letters || '-'}</span>`;
    }).join('');
    answerKey = `<div class="answer-key"><div class="ak-title">ĐÁP ÁN</div><div class="ak-grid">${rows}</div></div>`;
  }

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(header.examTitle || 'Đề kiểm tra')}${header.code ? ' - Mã đề ' + esc(header.code) : ''}</title>
<style>
  @page { size: A4; margin: 15mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, serif; color: #000; font-size: 13pt; line-height: 1.45; margin: 0; padding: 20px; }
  .hdr { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .hdr td { vertical-align: top; width: 50%; text-align: center; padding: 0 6px; }
  .hdr .org { font-weight: bold; font-size: 12pt; }
  .hdr .school { font-weight: bold; text-decoration: underline; font-size: 12pt; }
  .hdr .title { font-weight: bold; font-size: 13pt; text-transform: uppercase; }
  .hdr .subject { font-weight: bold; font-size: 12pt; }
  .hdr .mid { font-style: italic; margin-top: 2px; }
  .hdr .small { font-style: italic; font-size: 11pt; }
  .hdr .time { margin-top: 2px; }
  .hdr .note { font-style: italic; font-size: 11pt; }
  .student { display: flex; align-items: center; gap: 14px; margin: 8px 0; font-size: 11pt; white-space: nowrap; }
  .student .fld { display: inline-flex; align-items: baseline; gap: 4px; }
  .student .ln { display: inline-block; border-bottom: 1px dotted #000; height: 1em; }
  .ln-name { width: 150px; } .ln-id { width: 88px; } .ln-class { width: 72px; }
  .student .code { margin-left: auto; border: 1px solid #000; padding: 2px 10px; font-weight: bold; white-space: nowrap; }
  .rule { border: none; border-top: 1px solid #000; margin: 6px 0 10px; }
  .part { font-weight: bold; margin: 4px 0 10px; }
  .q { margin-bottom: 12px; page-break-inside: avoid; }
  .q-content { margin-bottom: 3px; }
  .q-content img, .opt img { max-width: 100%; height: auto; vertical-align: middle; }
  .opts { display: flex; flex-wrap: wrap; }
  .opt { width: 50%; padding-right: 12px; margin-bottom: 2px; }
  .answer-key { margin-top: 22px; border-top: 2px solid #000; padding-top: 10px; page-break-inside: avoid; }
  .ak-title { font-weight: bold; text-align: center; margin-bottom: 8px; }
  .ak-grid { display: flex; flex-wrap: wrap; }
  .ak { width: 20%; padding: 2px 4px; font-size: 12pt; }
</style></head>
<body>
  <table class="hdr"><tr>
    <td>
      ${header.orgTop ? `<div class="org">${esc(header.orgTop)}</div>` : ''}
      ${header.school ? `<div class="school">${esc(header.school)}</div>` : ''}
      ${officialLine}
      ${pagesLine}
    </td>
    <td>
      ${header.examTitle ? `<div class="title">${esc(header.examTitle)}</div>` : ''}
      ${header.subject ? `<div class="subject">${esc(header.subject)}</div>` : ''}
      ${header.duration ? `<div class="time"><i>Thời gian làm bài: ${esc(header.duration)}</i></div>` : ''}
      <div class="note">(không kể thời gian phát đề)</div>
    </td>
  </tr></table>

  <div class="student">
    <span class="fld">Họ và tên: <span class="ln ln-name"></span></span>
    <span class="fld">MSSV: <span class="ln ln-id"></span></span>
    <span class="fld">Lớp: <span class="ln ln-class"></span></span>
    ${codeBox}
  </div>
  <hr class="rule" />
  <div class="part">I. PHẦN CÂU HỎI TRẮC NGHIỆM</div>
  ${questionsHtml || '<p>Chưa có câu hỏi.</p>'}
  ${answerKey}
</body></html>`;
}

export function exportExamToPdf(header: ExamHeader, questions: QuizQuestion[]): void {
  const html = buildExamHtml(header, questions);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch (_e) {}
    setTimeout(() => { try { iframe.remove(); } catch (_e) {} }, 60000);
  };

  const imgs = Array.from(doc.images || []);
  if (imgs.length === 0) {
    setTimeout(doPrint, 300);
  } else {
    let left = imgs.length;
    const tick = () => { left -= 1; if (left <= 0) doPrint(); };
    imgs.forEach(img => { if (img.complete) tick(); else { img.addEventListener('load', tick); img.addEventListener('error', tick); } });
    setTimeout(doPrint, 2500);
  }
}
