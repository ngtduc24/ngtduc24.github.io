// Dựng lý lịch khoa học thành HTML theo đúng bố cục mẫu (A4, Times New Roman, bảng kẻ ô).
// Cùng 1 HTML dùng cho 3 việc: xem trước trong ứng dụng, in ra PDF và tải về file Word (.doc).
import { CvData } from './scientificCv';

function esc(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function multi(s: string): string { return esc(s).replace(/\n/g, '<br/>'); }

type Col<T> = { label: string; key: keyof T; w?: string; center?: boolean };

function table<T>(cols: Col<T>[], rows: T[], opts: { stt?: boolean; minRows?: number } = {}): string {
  const head = (opts.stt ? '<th style="width:6%">TT</th>' : '') + cols.map(c => `<th${c.w ? ` style="width:${c.w}"` : ''}>${esc(c.label)}</th>`).join('');
  const body = rows.map((r, i) => '<tr>' + (opts.stt ? `<td class="c">${i + 1}</td>` : '') + cols.map(c => `<td${c.center ? ' class="c"' : ''}>${multi((r as any)[c.key] ?? '')}</td>`).join('') + '</tr>').join('');
  return `<table class="t"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function groupTable<T>(title: string, cols: Col<T>[], rows: T[]): string {
  const span = cols.length + 1;
  const head = '<th style="width:6%">TT</th>' + cols.map(c => `<th${c.w ? ` style="width:${c.w}"` : ''}>${esc(c.label)}</th>`).join('');
  const body = rows.map((r, i) => `<tr><td class="c">${i + 1}</td>` + cols.map(c => `<td${c.center ? ' class="c"' : ''}>${multi((r as any)[c.key] ?? '')}</td>`).join('') + '</tr>').join('');
  return `<table class="t"><thead><tr><th colspan="${span}" class="l">${esc(title)}</th></tr><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function line(n: string, label: string, value: string): string {
  return `<p class="ln">${n}. ${esc(label)}: ${esc(value)}</p>`;
}

export const CV_STYLES = `
  .cv { font-family: "Times New Roman", Times, serif; font-size: 13pt; color: #000; line-height: 1.35; }
  .cv p { margin: 0 0 4pt; }
  .cv table.lay { width: 100%; border-collapse: collapse; }
  .cv table.lay td { border: none; padding: 0; vertical-align: top; }
  .cv .hdr td { width: 45%; text-align: center; font-size: 12pt; white-space: nowrap; }
  .cv .hdr td + td { width: 55%; }
  .cv .hdr .b { font-weight: bold; }
  .cv .hdr .rule { width: 60%; margin: 3pt auto 0; border-top: 1px solid #000; height: 0; }
  .cv .top { margin: 10pt 0 14pt; }
  .cv .top td.ph { width: 3.3cm; }
  .cv .top td.ph img { width: 3cm; height: 4cm; object-fit: cover; display: block; }
  .cv .top .box { width: 3cm; height: 4cm; border: 1px dashed #999; font-size: 10pt; color: #777; text-align: center; line-height: 4cm; }
  .cv .top td.tt { vertical-align: middle; text-align: center; padding-right: 3.3cm; }
  .cv .top h1 { font-size: 16pt; font-weight: bold; margin: 0; }
  .cv .top .sub { font-size: 12pt; }
  .cv h2 { font-size: 13pt; font-weight: bold; margin: 12pt 0 4pt; }
  .cv h3 { font-size: 13pt; font-weight: bold; margin: 8pt 0 3pt; }
  .cv h4 { font-size: 13pt; font-weight: normal; margin: 6pt 0 3pt; }
  .cv table.row2 { margin: 0 0 4pt; }
  .cv table.t { width: 100%; border-collapse: collapse; margin: 2pt 0 6pt; page-break-inside: auto; }
  .cv table.t th, .cv table.t td { border: 1px solid #000; padding: 3pt 4pt; font-size: 12pt; vertical-align: middle; }
  .cv table.t th { font-weight: bold; text-align: center; }
  .cv table.t th.l { text-align: left; }
  .cv table.t td.c { text-align: center; }
  .cv table.t tr { page-break-inside: avoid; }
  .cv .sign { margin-top: 18pt; }
  .cv .note { margin-top: 26pt; }
`;

export function renderCvBody(d: CvData): string {
  const degreeCols = [
    { label: 'Tên văn bằng', key: 'name', w: '17%' }, { label: 'Số năm đào tạo', key: 'years', w: '9%', center: true },
    { label: 'Trường cấp bằng', key: 'school', w: '20%' }, { label: 'Chuyên ngành đào tạo', key: 'major', w: '20%' },
    { label: 'Hình thức đào tạo', key: 'mode', w: '10%', center: true }, { label: 'Nơi học', key: 'place', w: '10%', center: true },
    { label: 'Năm được cấp', key: 'year', w: '9%', center: true },
  ] as Col<any>[];
  const thesisCols = [
    { label: 'Tên văn bằng', key: 'name', w: '14%' }, { label: 'Số năm đào tạo', key: 'years', w: '7%', center: true },
    { label: 'Trường cấp bằng', key: 'school', w: '16%' }, { label: 'Chuyên ngành đào tạo', key: 'major', w: '16%' },
    { label: 'Tên luận văn/ luận án', key: 'thesis', w: '19%' }, { label: 'Hình thức đào tạo', key: 'mode', w: '9%', center: true },
    { label: 'Nơi học', key: 'place', w: '9%', center: true }, { label: 'Năm được cấp', key: 'year', w: '8%', center: true },
  ] as Col<any>[];
  const periodTable = (rows: any[]) => {
    // Đang công tác (tick Hiện tại, hoặc gõ "nay", "hiện tại", "hiện nay") thì in "Hiện tại" thay cho "Đến tháng ...".
    const isNow = (r: any) => !!r.current || /^\s*(nay|hiện tại|hiện nay|đến nay|present|now)\s*$/i.test(r.to || '');
    const toCell = (r: any) => isNow(r) ? 'Hiện tại' : (r.to ? 'Đến tháng<br/>' + esc(r.to) : '');
    const body = rows.map(r => `<tr><td class="c">${r.from ? 'Từ tháng<br/>' + esc(r.from) : ''}</td><td class="c">${toCell(r)}</td><td>${multi(r.unit)}</td><td class="c">${multi(r.position)}</td></tr>`).join('');
    return `<table class="t"><thead><tr><th colspan="2" style="width:36%">Thời gian</th><th style="width:32%">Tên đơn vị</th><th style="width:32%">Chức danh/Chức vụ</th></tr></thead><tbody>${body}</tbody></table>`;
  };
  const articleCols = [
    { label: 'Các tác giả', key: 'authors', w: '22%' }, { label: 'Tên công trình', key: 'title', w: '22%' },
    { label: 'Tên tạp chí', key: 'journal', w: '20%' }, { label: 'Năm xuất bản', key: 'year', w: '10%', center: true }, { label: 'Vai trò', key: 'role', w: '20%', center: true },
  ] as Col<any>[];
  const confCols = [
    { label: 'Tác giả', key: 'authors', w: '20%' }, { label: 'Tên công trình', key: 'title', w: '20%' },
    { label: 'Tên hội thảo', key: 'conference', w: '20%' }, { label: 'Địa điểm', key: 'place', w: '18%' }, { label: 'Ghi chú', key: 'note', w: '16%' },
  ] as Col<any>[];

  const signDate = d.signDate ? esc(d.signDate) : 'ngày &nbsp;&nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp;&nbsp; năm';
  return `<div class="cv">
  <table class="lay hdr"><tr>
    <td>${d.agency ? `<div>${esc(d.agency)}</div>` : ''}<div class="b">${esc(d.school)}</div><div class="rule"></div></td>
    <td><div class="b">${esc(d.motto1)}</div><div class="b">${esc(d.motto2)}</div><div class="rule"></div></td>
  </tr></table>
  <table class="lay top"><tr>
    <td class="ph">${d.photo ? `<img src="${d.photo}" width="113" height="151" alt=""/>` : '<div class="box">Ảnh 3x4</div>'}</td>
    <td class="tt"><h1>${esc(d.docTitle || 'LÝ LỊCH KHOA HỌC')}</h1>${d.subtitle ? `<div class="sub">${esc(d.subtitle)}</div>` : ''}</td>
  </tr></table>

  <h2>A. PHẦN SƠ LƯỢC VỀ BẢN THÂN</h2>
  <table class="lay row2"><tr><td>1. Họ và tên (Chữ in): ${esc((d.fullName || '').toUpperCase())}</td><td style="text-align:right;width:25%">Giới tính: ${esc(d.gender)}</td></tr></table>
  <table class="lay row2"><tr><td style="width:50%">2. Ngày sinh: ${esc(d.birthDate)}</td><td>Nơi sinh: ${esc(d.birthPlace)}</td></tr></table>
  <table class="lay row2"><tr><td style="width:50%">3. Số CCCD/CMND: ${esc(d.idNumber)}</td><td>Ngày cấp: ${esc(d.idDate)}</td></tr></table>
  <p>Nơi cấp: ${esc(d.idPlace)}</p>
  <table class="lay row2"><tr><td style="width:33%">4. Quốc tịch: ${esc(d.nationality)}</td><td style="width:33%">Dân tộc: ${esc(d.ethnicity)}</td><td>Tôn giáo: ${esc(d.religion)}</td></tr></table>
  ${line('5', 'Địa chỉ thường trú', d.address)}
  ${line('6', 'Điện thoại liên lạc', d.phone)}
  ${line('7', 'Email cá nhân', d.email)}
  ${line('8', 'Học vị', d.degree)}
  ${line('9', 'Học hàm', d.academicRank)}
  ${line('10', 'Chức danh', d.title)}
  ${line('11', 'Danh hiệu được Nhà nước phong', d.honors)}

  <h2>B. VĂN BẰNG, CHỨNG CHỈ VÀ HỒ SƠ PHÁP LÝ</h2>
  <h3>1. Đại học</h3>${table(degreeCols, d.bachelor)}
  <h3>2. Thạc sĩ</h3>${table(thesisCols, d.master)}
  <h3>3. Tiến sĩ</h3>${table(thesisCols, d.doctor)}
  <h3>4. Chứng chỉ, chứng nhận và giấy tờ liên quan khác</h3>
  ${table([{ label: 'LOẠI GIẤY TỜ', key: 'type', w: '30%', center: true }, { label: 'TÊN GIẤY TỜ', key: 'name', w: '30%' }, { label: 'Đơn vị cấp', key: 'issuer', w: '30%' }, { label: 'Năm được cấp', key: 'year', w: '10%', center: true }] as Col<any>[], d.certificates)}

  <h2>C. QUÁ TRÌNH GIẢNG DẠY, CÔNG TÁC</h2>
  <h3>1. Nơi làm việc hiện nay</h3>
  ${table([{ label: 'Hình thức công tác', key: 'mode', w: '18%', center: true }, { label: 'Tên đơn vị', key: 'unit', w: '20%' }, { label: 'Địa chỉ', key: 'address', w: '22%' }, { label: 'Chức danh/Chức vụ', key: 'position', w: '18%', center: true }, { label: 'Số năm công tác', key: 'years', w: '10%', center: true }, { label: 'Ghi chú', key: 'note', w: '12%' }] as Col<any>[], d.currentJobs)}
  <h3>2. Quá trình giảng dạy tại các trường cao đẳng, trường đại học</h3>${periodTable(d.teaching)}
  <h3>3. Kinh nghiệm công tác tại các đơn vị thực tế</h3>${periodTable(d.experience)}

  <h2>D. QUÁ TRÌNH NGHIÊN CỨU KHOA HỌC</h2>
  <h3>1. Lĩnh vực nghiên cứu</h3>${d.researchField ? `<p>${multi(d.researchField)}</p>` : ''}
  <h3>2. Các công trình khoa học đã công bố</h3>
  <h4>2.1 Sách/chương sách</h4>
  ${table([{ label: 'Tên sách', key: 'title', w: '50%' }, { label: 'Nhà xuất bản', key: 'publisher', w: '32%' }, { label: 'Năm xuất bản', key: 'year', w: '12%', center: true }] as Col<any>[], d.books, { stt: true })}
  <h4>2.2 Bài báo</h4>
  ${groupTable('I.Trong nước', articleCols, d.articlesDomestic)}
  ${groupTable('II. Quốc tế', articleCols, d.articlesIntl)}
  <h4>2.3 Hội thảo</h4>
  ${groupTable('I.Trong nước', confCols, d.confDomestic)}
  ${groupTable('II. Quốc tế', confCols, d.confIntl)}
  <h3>3. Các đề tài/dự án nghiên cứu khoa học đã và đang tham gia</h3>
  ${table([{ label: 'Tên đề tài/dự án', key: 'title', w: '26%' }, { label: 'Thời gian', key: 'time', w: '14%', center: true }, { label: 'Tổ chức tài trợ', key: 'sponsor', w: '18%' }, { label: 'Vai trò tham gia trong đề tài', key: 'role', w: '18%', center: true }, { label: 'Tổng giá trị đề tài/dự án', key: 'value', w: '18%', center: true }] as Col<any>[], d.projects, { stt: true })}
  <h3>4. Bằng sáng chế</h3>
  ${table([{ label: 'Tên sản phẩm', key: 'product', w: '28%' }, { label: 'Năm cấp', key: 'year', w: '10%', center: true }, { label: 'Tổ chức cấp', key: 'issuer', w: '22%' }, { label: 'Quốc gia', key: 'country', w: '16%', center: true }, { label: 'Tổng giá trị chuyển giao', key: 'value', w: '18%', center: true }] as Col<any>[], d.patents, { stt: true })}
  <h3>5.Thành viên ban biên tập của tạp chí ISI/Scopus</h3>${d.editorialBoard ? `<p>${multi(d.editorialBoard)}</p>` : ''}
  <h3>6. Lịch sử phản biện trên các tạp chí ISI/Scopus</h3>
  ${table([{ label: 'Tạp chí', key: 'journal', w: '82%' }, { label: 'Số lần phản biện', key: 'times', w: '12%', center: true }] as Col<any>[], d.reviews, { stt: true })}
  <h3>7. Các giải thưởng, thành tựu về nghiên cứu khoa học</h3>
  ${table([{ label: 'Tên giải thưởng, thành tựu', key: 'name', w: '34%' }, { label: 'Năm', key: 'year', w: '10%', center: true }, { label: 'Tổ chức trao giải', key: 'organization', w: '28%' }, { label: 'Quốc gia', key: 'country', w: '22%', center: true }] as Col<any>[], d.awards, { stt: true })}

  <h2>E. HỌC PHẦN CÓ THỂ GIẢNG DẠY</h2>
  ${(() => {
    const body = d.courses.map((c, i) => `<tr><td class="c">${i + 1}</td><td>${multi(c.name)}</td><td>${multi(c.unit)}</td></tr>`).join('');
    return `<table class="t"><thead><tr><th style="width:6%">STT</th><th style="width:47%">Tên học phần</th><th style="width:47%">Đơn vị</th></tr></thead><tbody>${body}</tbody></table>`;
  })()}

  <table class="lay sign"><tr><td style="width:50%"></td><td style="text-align:center">
    <p><i>${esc(d.signPlace)}${d.signPlace ? ', ' : ''}${signDate}</i></p>
    <p style="margin-top:8pt">KÝ TÊN</p><p>(ghi rõ họ và tên)</p>
    <p style="margin-top:56pt">${esc((d.signName || d.fullName || '').toUpperCase())}</p>
  </td></tr></table>
  ${d.note ? `<p class="note">${multi(d.note)}</p>` : ''}
</div>`;
}

function fullHtml(d: CvData, forWord = false): string {
  const title = `Lý lịch khoa học ${d.fullName || ''}`.trim();
  const wordHead = forWord
    ? `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->`
    : '';
  return `<!DOCTYPE html><html${forWord ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"' : ''} lang="vi"><head><meta charset="utf-8"/><title>${esc(title)}</title>${wordHead}
<style>
  @page { size: A4; margin: 2cm 1.8cm 2cm 2.2cm; }
  body { margin: 0; background: #fff; }
  ${CV_STYLES}
</style></head><body>${renderCvBody(d)}</body></html>`;
}

function fileBase(d: CvData): string {
  const n = (d.fullName || 'ly_lich_khoa_hoc').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return 'LLKH_' + n.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// In ra PDF bằng hộp thoại in của trình duyệt (chọn Lưu thành PDF), giữ đúng tiếng Việt.
export function printCv(d: CvData): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const w = iframe.contentWindow;
  const docu = w?.document;
  if (!w || !docu) { iframe.remove(); return; }
  docu.open(); docu.write(fullHtml(d)); docu.close();
  docu.title = fileBase(d);
  let done = false;
  const go = () => { if (done) return; done = true; try { w.focus(); w.print(); } catch { /* bỏ qua */ } setTimeout(() => { try { iframe.remove(); } catch { /* bỏ qua */ } }, 60000); };
  const img = docu.querySelector('img');
  if (img && !(img as HTMLImageElement).complete) { img.addEventListener('load', go, { once: true }); img.addEventListener('error', go, { once: true }); setTimeout(go, 1500); }
  else setTimeout(go, 250);
}

// Tải về dạng .doc mà Word mở và chỉnh sửa được.
export function downloadCvWord(d: CvData): void {
  const blob = new Blob(['﻿', fullHtml(d, true)], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileBase(d) + '.doc';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
