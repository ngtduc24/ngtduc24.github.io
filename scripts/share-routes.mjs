/**
 * Danh sách trang chia sẻ của các chức năng (ngoài portfolio): bài tập ngân hàng, bài giảng
 * E-Learning, đề trắc nghiệm, VR 360, AR, link nộp bài. Mỗi mục thành một trang tĩnh
 * /<thư mục>/<mã>/ có tên, mô tả, ảnh bìa cho khung xem trước, rồi chuyển vào ứng dụng.
 * Dùng chung cho bước build (prerender-share.mjs) và bước kiểm tra định kỳ (share-check.mjs).
 */
import { createHash } from 'node:crypto';

const plain = (html, limit = 170) => {
  const t = String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  return t.length <= limit ? t : `${t.slice(0, limit - 1).trimEnd()}…`;
};
const firstImg = html => (String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '';
const join = (...parts) => parts.filter(Boolean).join(' · ');
const safe = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(id);
const fmtDeadline = iso => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false });
  } catch { return ''; }
};

export async function loadShareRoutes(supabaseUrl, key) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async path => {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
      if (!r.ok) { console.warn(`Bỏ qua ${path.split('?')[0]}: ${r.status}`); return []; }
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    } catch (e) { console.warn(`Bỏ qua ${path.split('?')[0]}:`, e?.message || e); return []; }
  };
  const subjects = Object.fromEntries((await get('edu_subjects?select=id,name')).map(x => [x.id, x.name]));
  const routes = [];

  // Bài tập trong ngân hàng: /bt/<mã>/
  for (const x of await get('edu_assignment_bank?select=share_token,title,content,subject_id,owner_name&share_token=not.is.null&order=share_token')) {
    if (!safe(x.share_token)) continue;
    routes.push({ folder: 'bt', id: x.share_token, title: x.title || 'Bài tập', image: firstImg(x.content),
      description: [join(subjects[x.subject_id] && `Bài tập môn ${subjects[x.subject_id]}`, x.owner_name && `Giảng viên ${x.owner_name}`), plain(x.content)].filter(Boolean).join('. '),
      target: `/?bt=${x.share_token}` });
  }

  const lessons = await get('el_lessons?select=id,title,summary,cover_url,subject_id,owner_name,author_label,is_public,status,share_token,deleted_at&deleted_at=is.null&order=id');
  for (const x of lessons) {
    const author = x.author_label || x.owner_name;
    const desc = [join(subjects[x.subject_id] && `Bài giảng môn ${subjects[x.subject_id]}`, author && `Biên soạn ${author}`), plain(x.summary)].filter(Boolean).join('. ');
    // Bài giảng công khai: /bg/<id>/
    if (x.is_public && x.status === 'published' && safe(x.id)) routes.push({ folder: 'bg', id: x.id, title: x.title || 'Bài giảng', image: x.cover_url || '', description: desc, target: `/?elview=${x.id}` });
    // Link bài giảng giao cho lớp: /hl/<mã>/
    if (safe(x.share_token)) routes.push({ folder: 'hl', id: x.share_token, title: x.title || 'Bài giảng', image: x.cover_url || '', description: desc, target: `/?elesson=${x.share_token}` });
  }

  // Đề trắc nghiệm: /tn/<slug>/
  for (const x of await get('quizzes?select=slug,title,description,subject_id,owner_name,duration_minutes&order=slug')) {
    if (!safe(x.slug)) continue;
    routes.push({ folder: 'tn', id: x.slug, title: x.title || 'Bài kiểm tra trắc nghiệm', image: '',
      description: [join('Bài kiểm tra trắc nghiệm', subjects[x.subject_id] && `môn ${subjects[x.subject_id]}`, x.duration_minutes && `${x.duration_minutes} phút`, x.owner_name && `Giảng viên ${x.owner_name}`), plain(x.description)].filter(Boolean).join('. '),
      target: `/?quiz=${x.slug}` });
  }

  // VR 360: /vr/<id>/
  for (const x of await get('vr_tours?select=id,title,description,image_url,thumb_url,owner_name,is_active&is_active=eq.true&order=id')) {
    if (!safe(x.id)) continue;
    routes.push({ folder: 'vr', id: x.id, title: x.title || 'Không gian VR 360', image: x.thumb_url || x.image_url || '',
      description: plain(x.description) || 'Trải nghiệm không gian 360 độ trên trình duyệt, hỗ trợ kính VR.', target: `/?vr=${x.id}` });
  }

  // AR: /ar/<id>/
  for (const x of await get('ar_targets?select=id,name,target_image_url&order=id')) {
    if (!safe(x.id)) continue;
    routes.push({ folder: 'ar', id: x.id, title: x.name || 'Trải nghiệm AR', image: x.target_image_url || '',
      description: 'Mở link bằng điện thoại rồi đưa camera vào ảnh để xem nội dung thực tế tăng cường (AR).', target: `/?ar=${x.id}` });
  }

  // Link nộp bài tập của lớp: /nb/<mã>/
  for (const x of await get('edu_assignments?select=share_link_id,title,content,deadline,subject_id,edu_classes(name)&order=share_link_id')) {
    if (!safe(x.share_link_id)) continue;
    routes.push({ folder: 'nb', id: x.share_link_id, title: x.title || 'Nộp bài tập', image: firstImg(x.content),
      description: [join('Nộp bài tập', x.edu_classes?.name && `Lớp ${x.edu_classes.name}`, x.deadline && `Hạn nộp ${fmtDeadline(x.deadline)}`), plain(x.content, 140)].filter(Boolean).join('. '),
      target: `/tracuu.html?edu=${x.share_link_id}` });
  }

  // Website của người dùng: sổ địa chỉ nằm trong portfolio_settings với khoá site:<địa chỉ>.
  // Trang cũ của quản trị viên dùng khoá cài đặt không tiền tố và các dòng chưa ghi chủ.
  const LEGACY_OWNER = 'QDaOMwea6MV3XkFnv9uguv4M0Zr1';
  const siteRows = (await get('portfolio_settings?select=key,data&key=like.site:*')).map(r => r.data).filter(r => r && r.owner && r.slug);
  const slugOf = Object.fromEntries(siteRows.filter(r => r.published !== false).map(r => [r.owner, r.slug]));
  const ownerOf = x => x?.ownerId || LEGACY_OWNER;
  const base = x => { const slug = slugOf[ownerOf(x)]; return slug ? `/?site=${slug}` : (ownerOf(x) === LEGACY_OWNER ? '/?portfolio=true' : null); };
  const settingRow = async key => (await get(`portfolio_settings?select=data&key=eq.${encodeURIComponent(key)}`))[0]?.data;

  // Trang chủ Website: /<địa chỉ>/ có tên, mô tả, ảnh bìa lấy từ banner của trang đó.
  for (const site of siteRows) {
    if (site.published === false || !safe(site.slug)) continue;
    const prefix = site.owner === LEGACY_OWNER ? '' : `${site.owner}:`;
    const banner = (await settingRow(`${prefix}banner`)) || {};
    routes.push({ folder: '', id: site.slug, title: plain(site.title || banner.title || site.slug, 110),
      image: site.ogImage || banner.backgroundImage || '', description: plain(site.description || banner.description || '', 200),
      icon: site.icon || '', keywords: plain(site.keywords || '', 300), siteName: plain(site.title || '', 80), target: `/?site=${site.slug}` });
  }

  // Nội dung trang: khoá học /c/ (ứng dụng Khoá học), dự án /p/, nghiên cứu /r/, bài viết /b/.
  const dataOf = rows => rows.map(r => r?.data).filter(Boolean);
  const portfolio = [
    { folder: 'c', items: dataOf(await get('portfolio_courses?select=data')), keep: x => x.status === 'published',
      title: x => x.title, desc: x => x.briefDescription || x.detailedDescription, image: x => x.coverImage,
      target: x => `/?tab=khoa-hoc&course=${x.id}` },
    { folder: 'p', items: dataOf(await get('portfolio_projects?select=data')), keep: x => ['published', 'completed', 'ongoing'].includes(x.status) && base(x),
      title: x => x.title, desc: x => x.briefDescription || x.detailedContent, image: x => x.coverImage || x.gallery?.[0],
      target: x => `${base(x)}&page=projects&project=${x.id}` },
    { folder: 'r', items: dataOf(await get('portfolio_research?select=data')), keep: x => !!base(x),
      title: x => x.titleVi || x.titleEn, desc: x => x.abstractVi || x.abstractEn, image: x => x.coverImage,
      target: x => `${base(x)}&page=research&research=${x.id}` },
    { folder: 'b', items: [], keep: x => x.status === 'published' && base(x),
      title: x => x.title, desc: x => x.excerpt || x.content, image: x => x.coverImage,
      target: x => `${base(x)}&post=${x.id}` },
  ];
  // Bài viết nằm trong cài đặt posts của từng trang.
  const legacyPosts = await settingRow('posts');
  portfolio[3].items.push(...(Array.isArray(legacyPosts) ? legacyPosts : []));
  for (const site of siteRows) {
    if (site.owner === LEGACY_OWNER) continue;
    const posts = await settingRow(`${site.owner}:posts`);
    if (Array.isArray(posts)) portfolio[3].items.push(...posts.map(p => ({ ...p, ownerId: site.owner })));
  }
  for (const t of portfolio) {
    for (const x of t.items) {
      if (!x || !safe(x.id) || !t.keep(x)) continue;
      const title = plain(t.title(x), 110);
      if (!title) continue;
      routes.push({ folder: t.folder, id: x.id, title, image: (typeof t.image(x) === 'string' ? t.image(x) : '') || '', description: plain(t.desc(x), 200), target: t.target(x) });
    }
  }

  const hash = createHash('sha1')
    .update(JSON.stringify(routes.map(r => [r.folder, r.id, r.title, r.image, r.description])))
    .digest('hex');
  return { routes, hash };
}
