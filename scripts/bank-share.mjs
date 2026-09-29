/**
 * Dữ liệu cho trang chia sẻ bài tập trong ngân hàng (link /bt/<mã>/).
 * Dùng chung cho bước build (prerender-share.mjs) và bước kiểm tra định kỳ (share-check.mjs),
 * để hai nơi tính cùng một mã băm, biết khi nào cần build lại cho khung xem trước link.
 */
import { createHash } from 'node:crypto';

export async function loadBankShares(supabaseUrl, key) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const r = await fetch(`${supabaseUrl}/rest/v1/edu_assignment_bank?select=share_token,title,content,subject_id,owner_name&share_token=not.is.null&order=share_token`, { headers });
  if (!r.ok) throw new Error(`${r.status} khi đọc ngân hàng bài tập`);
  const rows = await r.json();
  const s = await fetch(`${supabaseUrl}/rest/v1/edu_subjects?select=id,name`, { headers });
  const subjects = s.ok ? await s.json() : [];
  const subjectName = Object.fromEntries((subjects || []).map(x => [x.id, x.name]));
  const items = (Array.isArray(rows) ? rows : [])
    .filter(x => typeof x.share_token === 'string' && /^[a-z0-9]{6,40}$/.test(x.share_token))
    .map(x => ({
      token: x.share_token,
      title: x.title || 'Bài tập',
      content: x.content || '',
      image: (String(x.content || '').match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '',
      subject: subjectName[x.subject_id] || '',
      author: x.owner_name || '',
    }));
  const hash = createHash('sha1')
    .update(JSON.stringify(items.map(i => [i.token, i.title, i.image, i.subject, i.author, i.content.length])))
    .digest('hex');
  return { items, hash };
}
