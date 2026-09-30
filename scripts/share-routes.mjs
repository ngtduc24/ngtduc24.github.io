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

  const hash = createHash('sha1')
    .update(JSON.stringify(routes.map(r => [r.folder, r.id, r.title, r.image, r.description])))
    .digest('hex');
  return { routes, hash };
}
