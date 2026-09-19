/**
 * Sinh trang chia sẻ tĩnh cho từng nội dung của trang portfolio.
 *
 * Zalo, Facebook, Messenger và các mạng xã hội khác không chạy JavaScript khi lấy
 * thông tin xem trước. Chúng chỉ đọc đúng đoạn HTML mà máy chủ trả về. Trang này là
 * ứng dụng một trang, toàn bộ nội dung do JavaScript dựng lên sau khi tải, nên mọi
 * đường link chia sẻ đều nhận chung một tiêu đề nằm sẵn trong tệp index.html.
 *
 * Vì vậy sau khi build xong, tập lệnh này đọc dữ liệu công khai từ Supabase rồi tạo
 * thêm cho mỗi khóa học, dự án, nghiên cứu và bài viết một tệp HTML tĩnh riêng, bên
 * trong có đúng tiêu đề, mô tả và ảnh bìa của nội dung đó. Người thật mở link sẽ được
 * chuyển ngay vào nội dung trong ứng dụng, còn máy quét của mạng xã hội thì dừng lại
 * ở đoạn HTML tĩnh và lấy được đúng thông tin xem trước.
 *
 * Tập lệnh này không bao giờ được phép làm hỏng quá trình build. Mọi trục trặc về
 * mạng hay cấu hình đều chỉ ghi một dòng cảnh báo rồi kết thúc êm, trang web vẫn lên
 * bình thường, chỉ là tạm thời chưa có trang chia sẻ riêng.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const SITE_ORIGIN = 'https://ngtduc24.github.io';
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const cleanEnv = value => {
  if (!value) return '';
  let cleaned = String(value).trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
  return cleaned;
};

let SUPABASE_URL = cleanEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
const SUPABASE_KEY = cleanEnv(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

if (SUPABASE_URL.endsWith('/rest/v1/')) SUPABASE_URL = SUPABASE_URL.slice(0, -9);
else if (SUPABASE_URL.endsWith('/rest/v1')) SUPABASE_URL = SUPABASE_URL.slice(0, -8);
if (SUPABASE_URL && !SUPABASE_URL.startsWith('http')) SUPABASE_URL = `https://${SUPABASE_URL}`;
SUPABASE_URL = SUPABASE_URL.replace(/\/+$/, '');

/** Biến đoạn văn bản bất kỳ thành chuỗi an toàn để đặt trong thuộc tính HTML. */
const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Bỏ thẻ HTML và rút gọn phần mô tả cho vừa khung xem trước của mạng xã hội. */
const toPlainSummary = (value, limit = 200) => {
  const text = String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
};

/** Ảnh xem trước phải là đường dẫn tuyệt đối thì mạng xã hội mới tải được. */
const toAbsoluteUrl = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `${SITE_ORIGIN}${raw}`;
  return '';
};

/** Chỉ nhận mã định danh lành mạnh để không tạo ra đường dẫn thư mục lạ. */
const isSafeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(value);

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} khi gọi ${url}`);
  return response.json();
}

/** Đọc một bảng nội dung công khai, trả về mảng đối tượng nằm trong cột data. */
async function loadTable(table) {
  const rows = await fetchJson(`${SUPABASE_URL}/rest/v1/${table}?select=data`);
  return Array.isArray(rows) ? rows.map(row => row?.data).filter(Boolean) : [];
}

/** Bài viết không có bảng riêng, chúng nằm chung trong bảng cấu hình theo khóa posts. */
async function loadSetting(key) {
  const rows = await fetchJson(`${SUPABASE_URL}/rest/v1/portfolio_settings?select=data&key=eq.${key}`);
  return Array.isArray(rows) && rows.length ? rows[0]?.data : null;
}

const CONTENT_TYPES = [
  {
    name: 'khóa học',
    folder: 'c',
    param: 'course',
    page: 'courses',
    load: () => loadTable('portfolio_courses'),
    keep: item => item?.status === 'published',
    title: item => item.title,
    description: item => item.briefDescription || item.detailedDescription,
    image: item => item.coverImage
  },
  {
    name: 'dự án',
    folder: 'p',
    param: 'project',
    page: 'projects',
    load: () => loadTable('portfolio_projects'),
    keep: item => ['published', 'completed', 'ongoing'].includes(item?.status),
    title: item => item.title,
    description: item => item.briefDescription || item.detailedContent,
    image: item => item.coverImage || item.gallery?.[0]
  },
  {
    name: 'nghiên cứu',
    folder: 'r',
    param: 'research',
    page: 'research',
    load: () => loadTable('portfolio_research'),
    keep: () => true,
    title: item => item.titleVi || item.titleEn,
    description: item => item.abstractVi || item.abstractEn,
    image: item => item.coverImage
  },
  {
    name: 'bài viết',
    folder: 'b',
    param: 'post',
    page: null,
    load: async () => {
      const posts = await loadSetting('posts');
      return Array.isArray(posts) ? posts : [];
    },
    keep: item => item?.status === 'published',
    title: item => item.title,
    description: item => item.excerpt || item.content,
    image: item => item.coverImage
  }
];

function buildSharePage({ title, description, image, targetUrl, shareUrl }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeTarget = escapeHtml(targetUrl);
  const imageTags = image
    ? `
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />`
    : '';

  // Chuyển hướng bằng JavaScript chứ không dùng thẻ refresh, để máy quét của mạng
  // xã hội đọc trọn phần thẻ mô tả thay vì bị đẩy sang địa chỉ khác giữa chừng.
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <link rel="canonical" href="${escapeHtml(shareUrl)}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Andy Nguyễn" />
    <meta property="og:locale" content="vi_VN" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />${imageTags}
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />

    <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #475569; }
      main { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; text-align: center; }
      h1 { font-size: 18px; color: #0f172a; margin: 0; }
      a { color: #059669; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <h1>${safeTitle}</h1>
      <p>Đang mở nội dung, vui lòng chờ trong giây lát.</p>
      <p><a href="${safeTarget}">Bấm vào đây nếu trang không tự chuyển</a></p>
    </main>
  </body>
</html>
`;
}

/** Gắn ảnh mặc định của trang chủ vào tệp index.html đã build. */
async function applyDefaultShareImage() {
  try {
    const banner = await loadSetting('banner');
    const image = toAbsoluteUrl(banner?.backgroundImage);
    if (!image) return;
    const indexPath = path.join(DIST_DIR, 'index.html');
    const html = await readFile(indexPath, 'utf8');
    if (html.includes('property="og:image"')) return;
    const injected = html.replace(
      '<meta name="twitter:card"',
      `<meta property="og:image" content="${escapeHtml(image)}" />\n    <meta name="twitter:image" content="${escapeHtml(image)}" />\n    <meta name="twitter:card"`
    );
    await writeFile(indexPath, injected, 'utf8');
    console.log('Đã gắn ảnh xem trước mặc định cho trang chủ.');
  } catch (error) {
    console.warn('Bỏ qua ảnh xem trước mặc định của trang chủ:', error.message);
  }
}

async function run() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Thiếu cấu hình Supabase nên bỏ qua bước tạo trang chia sẻ.');
    return;
  }

  let total = 0;
  for (const type of CONTENT_TYPES) {
    let items = [];
    try {
      items = await type.load();
    } catch (error) {
      console.warn(`Không đọc được dữ liệu ${type.name}, bỏ qua:`, error.message);
      continue;
    }

    let written = 0;
    for (const item of items) {
      if (!item || !isSafeId(item.id) || !type.keep(item)) continue;

      const title = toPlainSummary(type.title(item), 110);
      if (!title) continue;

      const description = toPlainSummary(type.description(item)) || 'Xem chi tiết trên trang của Andy Nguyễn.';
      const image = toAbsoluteUrl(type.image(item));

      const target = new URL(SITE_ORIGIN);
      target.searchParams.set('portfolio', 'true');
      if (type.page) target.searchParams.set('page', type.page);
      target.searchParams.set(type.param, item.id);

      const folder = path.join(DIST_DIR, type.folder, item.id);
      await mkdir(folder, { recursive: true });
      await writeFile(
        path.join(folder, 'index.html'),
        buildSharePage({
          title,
          description,
          image,
          targetUrl: target.toString(),
          shareUrl: `${SITE_ORIGIN}/${type.folder}/${item.id}/`
        }),
        'utf8'
      );
      written += 1;
    }

    total += written;
    console.log(`Đã tạo ${written} trang chia sẻ cho ${type.name}.`);
  }

  await applyDefaultShareImage();
  console.log(`Tổng cộng ${total} trang chia sẻ.`);
}

run().catch(error => {
  // Không để bước phụ này làm hỏng bản build của cả trang web.
  console.warn('Bỏ qua bước tạo trang chia sẻ do gặp lỗi:', error?.message || error);
});
