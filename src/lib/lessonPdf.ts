import { ELLesson, ELSection, ELResource } from './elearning';

// Xuất toàn bộ bài giảng ra PDF bằng cách dựng một tài liệu in gọn gàng rồi mở hộp thoại in
// của trình duyệt, người dùng chọn Lưu thành PDF. Cách này chạy được trên cả máy tính và điện
// thoại, giữ đúng tiếng Việt và chữ vẫn chọn được, không cần thư viện nặng.

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Chân trang mặc định cho PDF bài giảng, hiện ở cuối mọi trang khi in.
const FOOTER_LEFT = 'Biên soạn: Nguyễn Trọng Đức';
const FOOTER_RIGHT = 'Giáo Trình Tạo Hình Blender';

function buildLessonHtml(lesson: ELLesson, sections: ELSection[], resources: ELResource[], footerLeft: string, footerRight: string): string {
  const author = lesson.author_label || lesson.owner_name || 'Ẩn danh';
  const sectionsHtml = sections.map((s, i) => {
    const res = resources.filter(r => r.section_id === s.id);
    const resHtml = res.length
      ? `<div class="resources"><p class="res-title">Tài nguyên</p><ul>${res.map(r => `<li><a href="${esc(r.url || '#')}">${esc(r.title || 'Tài nguyên')}</a></li>`).join('')}</ul></div>`
      : '';
    return `<section class="sec">
      <h2>${i + 1}. ${esc(s.title || 'Phần ' + (i + 1))}</h2>
      <div class="content">${s.content || '<p class="empty">(Chưa có nội dung)</p>'}</div>
      ${resHtml}
    </section>`;
  }).join('');

  const cover = lesson.cover_url ? `<img class="cover" src="${esc(lesson.cover_url)}" alt="" />` : '';
  const summary = lesson.summary ? `<p class="summary">${esc(lesson.summary)}</p>` : '';

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(lesson.title || 'Bài giảng')}</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Be Vietnam Pro", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0 auto; padding: 24px 24px 46px; max-width: 820px; }
  .page-footer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; gap: 12px; padding: 6px 24px; font-size: 10px; color: #64748b; border-top: 1px solid #cbd5e1; background: #fff; }
  .page-footer span { white-space: nowrap; }
  .page-footer .right { font-weight: 600; }
  h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; color: #0f172a; }
  .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  .cover { width: 100%; max-height: 320px; object-fit: cover; border-radius: 10px; margin: 12px 0 18px; }
  .summary { background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #475569; margin-bottom: 20px; }
  .sec { margin-bottom: 26px; page-break-inside: avoid; }
  h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0 0 8px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; page-break-after: avoid; }
  .content { font-size: 14px; }
  .content img { max-width: 100%; height: auto; border-radius: 6px; }
  .content table { border-collapse: collapse; width: 100%; }
  .content td, .content th { border: 1px solid #cbd5e1; padding: 6px 8px; }
  .content .empty { color: #94a3b8; font-style: italic; }
  .resources { margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .res-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin: 0 0 4px; }
  .resources ul { margin: 0; padding-left: 18px; }
  .resources a { color: #2563eb; font-size: 13px; word-break: break-all; }
  a { text-decoration: none; }
</style></head>
<body>
  <h1>${esc(lesson.title || 'Bài giảng')}</h1>
  <div class="meta">${esc(author)} · ${sections.length} phần</div>
  ${cover}
  ${summary}
  ${sectionsHtml || '<p class="content empty">Bài giảng chưa có nội dung.</p>'}
  <div class="page-footer"><span class="left">${esc(footerLeft)}</span><span class="right">${esc(footerRight)}</span></div>
</body></html>`;
}

export function exportLessonToPdf(lesson: ELLesson, sections: ELSection[], resources: ELResource[], footer?: { left?: string; right?: string }): void {
  const html = buildLessonHtml(lesson, sections, resources, footer?.left ?? FOOTER_LEFT, footer?.right ?? FOOTER_RIGHT);

  // Dùng iframe ẩn để in, chạy ổn định trên di động hơn là mở cửa sổ mới (hay bị chặn popup).
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
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (_e) {
      // Bỏ qua nếu trình duyệt chặn in.
    }
    // Dọn iframe sau khi hộp thoại in xử lý xong.
    setTimeout(() => { try { iframe.remove(); } catch (_e) {} }, 60000);
  };

  // Chờ ảnh trong nội dung tải xong rồi mới in để không bị thiếu hình.
  const imgs = Array.from(doc.images || []);
  if (imgs.length === 0) {
    setTimeout(doPrint, 300);
  } else {
    let left = imgs.length;
    const tick = () => { left -= 1; if (left <= 0) doPrint(); };
    imgs.forEach(img => {
      if (img.complete) { tick(); }
      else { img.addEventListener('load', tick); img.addEventListener('error', tick); }
    });
    // Phòng khi ảnh treo, vẫn in sau tối đa 2.5 giây.
    setTimeout(doPrint, 2500);
  }
}
