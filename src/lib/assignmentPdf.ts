import { EduResource } from '../types/edu';
import { eduFileTypeLabel } from './eduFileTypes';
import { supabase } from './supabase';

// Xuất đề bài tập ra PDF: dựng tài liệu in rồi mở hộp thoại in của trình duyệt, người dùng chọn
// Lưu thành PDF. Cách này giữ đúng tiếng Việt, chữ chọn được, chạy trên máy tính và điện thoại.

export interface AssignmentPdfInput {
  title: string;
  content?: string;
  subjectName?: string;
  author?: string;
  className?: string;
  deadline?: string | null;
  allowedFileTypes?: string[];
  resources?: EduResource[];
}

const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cssEsc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const fmtDeadline = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} ngày ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

function buildHtml(a: AssignmentPdfInput): string {
  const top = a.subjectName ? `Bài tập môn ${a.subjectName}` : 'Bài tập';
  const bottom = a.author ? `Giảng viên: ${a.author}` : '';
  const rows: string[] = [];
  if (a.subjectName) rows.push(`<tr><th>Môn học</th><td>${esc(a.subjectName)}</td></tr>`);
  if (a.className) rows.push(`<tr><th>Lớp</th><td>${esc(a.className)}</td></tr>`);
  if (a.deadline) rows.push(`<tr><th>Hạn nộp</th><td>${esc(fmtDeadline(a.deadline))}</td></tr>`);
  if (a.allowedFileTypes?.length) rows.push(`<tr><th>Định dạng nộp</th><td>${esc(a.allowedFileTypes.map(eduFileTypeLabel).join(', '))}</td></tr>`);
  if (a.author) rows.push(`<tr><th>Giảng viên</th><td>${esc(a.author)}</td></tr>`);
  const res = (a.resources || []).length
    ? `<div class="res"><h2>Tài nguyên thực hành</h2><ol>${(a.resources || []).map(r => `<li><b>${esc(r.name)}</b><br/><a href="${esc(r.url)}">${esc(r.url)}</a></li>`).join('')}</ol></div>`
    : '';
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(a.title || 'Bài tập')}</title>
<style>
  @page {
    margin: 20mm 16mm;
    @top-left { content: "${cssEsc(top)}"; font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; font-weight: 600; color: #64748b; }
    @bottom-left { content: "${cssEsc(bottom)}"; font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; color: #64748b; }
    @bottom-right { content: "Trang " counter(page) " / " counter(pages); font-family: "Be Vietnam Pro", system-ui, sans-serif; font-size: 9pt; color: #64748b; }
  }
  * { box-sizing: border-box; }
  body { font-family: "Be Vietnam Pro", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0 auto; padding: 24px; max-width: 820px; }
  h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px; color: #0f172a; }
  table.meta { border-collapse: collapse; margin: 0 0 20px; font-size: 13px; }
  table.meta th { text-align: left; color: #64748b; font-weight: 600; padding: 3px 16px 3px 0; white-space: nowrap; vertical-align: top; }
  table.meta td { padding: 3px 0; color: #0f172a; font-weight: 600; }
  h2 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 22px 0 8px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; page-break-after: avoid; }
  .content { font-size: 14px; overflow-wrap: anywhere; word-break: break-word; }
  .content img { max-width: 100%; height: auto; border-radius: 6px; }
  .content table { border-collapse: collapse; width: 100%; }
  .content td, .content th { border: 1px solid #cbd5e1; padding: 6px 8px; }
  .res ol { margin: 0; padding-left: 20px; font-size: 13px; }
  .res li { margin-bottom: 6px; }
  .res a { color: #2563eb; word-break: break-all; font-size: 12px; text-decoration: none; }
</style></head>
<body>
  <h1>${esc(a.title || 'Bài tập')}</h1>
  ${rows.length ? `<table class="meta">${rows.join('')}</table>` : ''}
  <h2>Yêu cầu và hướng dẫn</h2>
  <div class="content">${a.content && a.content.trim() ? a.content : '<p><i>Không có hướng dẫn cụ thể.</i></p>'}</div>
  ${res}
</body></html>`;
}

// In bằng iframe ẩn, ổn định trên di động hơn mở cửa sổ mới.
export function printHtml(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }
  doc.open(); doc.write(html); doc.close();
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { /* trình duyệt chặn in */ }
    setTimeout(() => { try { iframe.remove(); } catch { /* bỏ qua */ } }, 60000);
  };
  const imgs = Array.from(doc.images || []);
  if (!imgs.length) { setTimeout(doPrint, 300); return; }
  let left = imgs.length;
  const done = () => { left -= 1; if (left <= 0) setTimeout(doPrint, 200); };
  imgs.forEach(img => { if (img.complete) done(); else { img.onload = done; img.onerror = done; } });
  setTimeout(doPrint, 6000);
}

export function exportAssignmentToPdf(a: AssignmentPdfInput) {
  printHtml(buildHtml(a));
}

// Tra tên môn theo mã môn của bài tập (trang sinh viên và trang chi tiết bài tập chỉ có mã môn).
export async function subjectNameById(id?: string | null): Promise<string> {
  if (!id) return '';
  try {
    const { data } = await supabase.from('edu_subjects').select('name').eq('id', id).maybeSingle();
    return ((data as any)?.name || '').trim();
  } catch { return ''; }
}
