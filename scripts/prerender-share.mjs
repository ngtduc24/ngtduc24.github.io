/**
 * Sinh trang chia sẻ tĩnh cho từng nội dung có link chia sẻ.
 *
 * Zalo, Facebook, Messenger và các mạng xã hội khác không chạy JavaScript khi lấy
 * thông tin xem trước. Chúng chỉ đọc đúng đoạn HTML mà máy chủ trả về. Trang này là
 * ứng dụng một trang, toàn bộ nội dung do JavaScript dựng lên sau khi tải, nên mọi
 * đường link chia sẻ đều nhận chung một tiêu đề nằm sẵn trong tệp index.html.
 *
 * Vì vậy sau khi build xong, tập lệnh này đọc dữ liệu công khai từ Supabase rồi tạo
 * cho mỗi nội dung (khoá học, dự án, nghiên cứu, bài viết, bài tập, bài giảng, đề trắc
 * nghiệm, VR, AR, link nộp bài) một tệp HTML tĩnh /<thư mục>/<mã>/ có đúng tiêu đề,
 * mô tả và ảnh bìa. Người thật mở link được chuyển ngay vào ứng dụng, còn máy quét của
 * mạng xã hội dừng lại ở đoạn HTML tĩnh và lấy được đúng thông tin xem trước.
 *
 * Ảnh xem trước được đưa về đúng chuẩn mà Zalo, Facebook đọc được ổn định: ảnh JPG
 * 1200x630, dung lượng nhỏ, có khai báo kích thước. Ảnh gốc dạng WebP, AVIF hay ảnh nặng
 * hàng chục MB (ví dụ ảnh nhận diện AR) thường bị các mạng xã hội bỏ qua.
 *
 * Tập lệnh này không bao giờ được phép làm hỏng quá trình build. Mọi trục trặc về
 * mạng hay cấu hình đều chỉ ghi một dòng cảnh báo rồi kết thúc êm.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadShareRoutes } from './share-routes.mjs';

const SITE_ORIGIN = 'https://ngtduc24.github.io';
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const OG_W = 1200;
const OG_H = 630;
// Biến đổi của Cloudinary: cắt khung 1200x630 theo vùng nổi bật, nén JPG.
const CLD_TRANSFORM = `c_fill,g_auto,w_${OG_W},h_${OG_H},q_auto:good,f_jpg`;

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
  const raw = String(value ?? '').trim().replace(/&amp;/g, '&');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `${SITE_ORIGIN}${raw}`;
  return '';
};

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} khi gọi ${url}`);
  return response.json();
}

async function loadSetting(key) {
  const rows = await fetchJson(`${SUPABASE_URL}/rest/v1/portfolio_settings?select=data&key=eq.${key}`);
  return Array.isArray(rows) && rows.length ? rows[0]?.data : null;
}

// ---------------------------------------------------------------------------
// Ảnh xem trước
// ---------------------------------------------------------------------------

/** Ảnh trên Cloudinary: chèn biến đổi để Cloudinary trả về JPG 1200x630. Video thì lấy một khung hình. */
function cloudinaryOg(url) {
  const m = url.match(/^https?:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video)\/upload\/(.+)$/i);
  if (!m) return '';
  const [, cloud, kind, rest] = m;
  const clean = rest.split('?')[0].split('#')[0];
  if (kind.toLowerCase() === 'video') return `https://res.cloudinary.com/${cloud}/video/upload/so_auto,${CLD_TRANSFORM}/${clean.replace(/\.[a-z0-9]+$/i, '')}.jpg`;
  // Tệp PDF trên Cloudinary lấy trang đầu.
  const page = /\.pdf$/i.test(clean) ? 'pg_1,' : '';
  return `https://res.cloudinary.com/${cloud}/image/upload/${page}${CLD_TRANSFORM}/${clean}`;
}

let sharpLib = null;
let sharpTried = false;
async function getSharp() {
  if (sharpTried) return sharpLib;
  sharpTried = true;
  try { sharpLib = (await import('sharp')).default; } catch { sharpLib = null; }
  return sharpLib;
}

const localCache = new Map();
/** Ảnh ở nơi khác (ví dụ kho Supabase): tải về, thu nhỏ thành og.jpg đặt cạnh trang chia sẻ. */
async function localOg(url, folder, id) {
  if (localCache.has(url)) {
    const cached = await localCache.get(url);
    return cached;
  }
  const job = (async () => {
    const sharp = await getSharp();
    if (!sharp) return '';
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return '';
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 120 * 1024 * 1024) return '';
      const out = await sharp(buf, { limitInputPixels: false, failOn: 'none' })
        .rotate()
        .resize(OG_W, OG_H, { fit: 'cover', position: 'attention' })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
      const dir = path.join(DIST_DIR, folder, id);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'og.jpg'), out);
      return `${SITE_ORIGIN}/${[folder, id].filter(Boolean).join('/')}/og.jpg`;
    } catch (e) {
      console.warn(`Không tạo được ảnh xem trước cho /${folder}/${id}/:`, e?.message || e);
      return '';
    }
  })();
  localCache.set(url, job);
  return job;
}

/** Trả về địa chỉ ảnh xem trước đạt chuẩn, rỗng nếu không có ảnh dùng được. */
async function ogImage(raw, folder, id) {
  const url = toAbsoluteUrl(raw);
  if (!url || /^data:/i.test(url)) return '';
  const cld = cloudinaryOg(url);
  if (cld) return cld;
  return localOg(url, folder, id);
}

let APP_ICON_TAGS = '';
function buildSharePage({ title, description, image, targetUrl, shareUrl, icon = '', keywords = '', siteName = '' }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeTarget = escapeHtml(targetUrl);
  const imageTags = image
    ? `
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="${OG_W}" />
    <meta property="og:image:height" content="${OG_H}" />
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <link rel="image_src" href="${escapeHtml(image)}" />`
    : '';

  // Chuyển hướng bằng JavaScript chứ không dùng thẻ refresh, để máy quét của mạng
  // xã hội đọc trọn phần thẻ mô tả thay vì bị đẩy sang địa chỉ khác giữa chừng.
  return `<!doctype html>
<html lang="vi" prefix="og: https://ogp.me/ns#">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />
    <link rel="canonical" href="${escapeHtml(shareUrl)}" />${icon ? `
    <link rel="icon" href="${escapeHtml(icon)}" />
    <link rel="apple-touch-icon" href="${escapeHtml(icon)}" />` : APP_ICON_TAGS ? `
    ${APP_ICON_TAGS}` : ''}${keywords ? `
    <meta name="keywords" content="${escapeHtml(keywords)}" />` : ''}

    <meta property="og:type" content="${siteName ? 'website' : 'article'}" />
    <meta property="og:site_name" content="${escapeHtml(siteName || 'EduGo')}" />
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
async function applyDefaultShareImage(image) {
  try {
    if (!image) return;
    const indexPath = path.join(DIST_DIR, 'index.html');
    const html = await readFile(indexPath, 'utf8');
    if (html.includes('property="og:image"')) return;
    const injected = html.replace(
      '<meta name="twitter:card"',
      `<meta property="og:image" content="${escapeHtml(image)}" />\n    <meta property="og:image:width" content="${OG_W}" />\n    <meta property="og:image:height" content="${OG_H}" />\n    <meta name="twitter:image" content="${escapeHtml(image)}" />\n    <meta name="twitter:card"`
    );
    await writeFile(indexPath, injected, 'utf8');
    console.log('Đã gắn ảnh xem trước mặc định cho trang chủ.');
  } catch (error) {
    console.warn('Bỏ qua ảnh xem trước mặc định của trang chủ:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Biểu tượng web (favicon) đồng bộ cho mọi trang
// ---------------------------------------------------------------------------

/**
 * Lấy biểu tượng admin đặt ở Cấu hình hệ thống (cột web_app_icon), xuất thành các tệp ảnh tĩnh
 * (favicon, biểu tượng màn hình chính iPhone và Android) rồi gắn vào mọi trang HTML đã build,
 * để thẻ trình duyệt, kết quả tìm kiếm, link chia sẻ và biểu tượng thêm ra màn hình chính đều giống nhau.
 * Trả về đoạn thẻ link để gắn vào các trang chia sẻ, chuỗi rỗng nếu chưa có biểu tượng.
 */
async function buildAppIcon() {
  try {
    const rows = await fetchJson(`${SUPABASE_URL}/rest/v1/app_settings?select=web_app_icon,web_app_title&id=eq.general_config`);
    const raw = Array.isArray(rows) && rows[0]?.web_app_icon ? String(rows[0].web_app_icon) : '';
    const name = (Array.isArray(rows) && rows[0]?.web_app_title) || 'EduGo';
    if (!raw) return '';
    let buf;
    const m = /^data:[^;,]+;base64,(.*)$/s.exec(raw);
    if (m) buf = Buffer.from(m[1], 'base64');
    else {
      const url = toAbsoluteUrl(raw);
      if (!url) return '';
      const res = await fetch(url);
      if (!res.ok) return '';
      buf = Buffer.from(await res.arrayBuffer());
    }
    const sharp = await getSharp();
    if (!sharp) return '';
    const png = size => sharp(buf, { failOn: 'none' }).resize(size, size, { fit: 'cover' }).png().toBuffer();
    const [p32, p180, p192, p512] = await Promise.all([png(32), png(180), png(192), png(512)]);
    await Promise.all([
      writeFile(path.join(DIST_DIR, 'favicon-32.png'), p32),
      writeFile(path.join(DIST_DIR, 'favicon.ico'), p32),
      writeFile(path.join(DIST_DIR, 'apple-touch-icon.png'), p180),
      writeFile(path.join(DIST_DIR, 'icon-192.png'), p192),
      writeFile(path.join(DIST_DIR, 'icon-512.png'), p512),
    ]);
    // Đổi biểu tượng thì đổi mã phiên bản để trình duyệt không giữ ảnh cũ.
    let h = 0; for (const b of p32) h = (h * 31 + b) >>> 0;
    const v = h.toString(36);
    const tags = `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=${v}" data-app-icon />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=${v}" data-app-icon />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=${v}" data-app-icon />`;
    // Không gắn tệp manifest: trên iPhone, ứng dụng thêm ra màn hình chính có manifest bị thiếu khung ở đáy màn hình.
    for (const file of ['index.html', '404.html', 'khoiphuc.html']) {
      try {
        const fp = path.join(DIST_DIR, file);
        const html = await readFile(fp, 'utf8');
        if (html.includes('data-app-icon')) continue;
        await writeFile(fp, html.replace('</head>', `    ${tags}\n  </head>`), 'utf8');
      } catch { /* trang không có trong bản build */ }
    }
    console.log('Đã gắn biểu tượng web cho các trang.');
    return tags;
  } catch (error) {
    console.warn('Bỏ qua biểu tượng web:', error?.message || error);
    return '';
  }
}

/** Chạy lần lượt theo nhóm nhỏ để không tải dồn quá nhiều ảnh cùng lúc. */
async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

async function run() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Thiếu cấu hình Supabase nên bỏ qua bước tạo trang chia sẻ.');
    return;
  }

  APP_ICON_TAGS = await buildAppIcon();

  let fallbackImage = '';
  try {
    const banner = await loadSetting('banner');
    fallbackImage = await ogImage(banner?.backgroundImage, 'og', 'home');
  } catch { /* bỏ qua */ }

  let routes = [];
  let hash = '';
  try {
    ({ routes, hash } = await loadShareRoutes(SUPABASE_URL, SUPABASE_KEY));
  } catch (error) {
    console.warn('Không đọc được danh sách link chia sẻ:', error?.message || error);
  }

  const counts = {};
  let ownImage = 0;
  await inBatches(routes, 6, async r => {
    try {
      const image = (await ogImage(r.image, r.folder, r.id)) || fallbackImage;
      if (image && image !== fallbackImage) ownImage += 1;
      const folder = path.join(DIST_DIR, r.folder, r.id);
      await mkdir(folder, { recursive: true });
      await writeFile(path.join(folder, 'index.html'), buildSharePage({
        title: toPlainSummary(r.title, 110) || 'EduGo',
        description: toPlainSummary(r.description, 220) || 'Xem chi tiết trên EduGo.',
        image,
        targetUrl: `${SITE_ORIGIN}${r.target}`,
        shareUrl: `${SITE_ORIGIN}/${[r.folder, r.id].filter(Boolean).join('/')}/`,
        icon: r.icon || '', keywords: r.keywords || '', siteName: r.siteName || '',
      }), 'utf8');
      counts[r.folder] = (counts[r.folder] || 0) + 1;
    } catch (error) {
      console.warn(`Bỏ qua trang /${r.folder}/${r.id}/:`, error?.message || error);
    }
  });

  if (hash) await writeFile(path.join(DIST_DIR, 'share-manifest.txt'), hash, 'utf8');
  await applyDefaultShareImage(fallbackImage);
  console.log('Đã tạo trang chia sẻ:', JSON.stringify(counts), `(${ownImage} trang có ảnh riêng)`);
}

run().catch(error => {
  // Không để bước phụ này làm hỏng bản build của cả trang web.
  console.warn('Bỏ qua bước tạo trang chia sẻ do gặp lỗi:', error?.message || error);
});
