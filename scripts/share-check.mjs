/**
 * Chạy định kỳ trên GitHub Actions: so danh sách link chia sẻ (bài tập, bài giảng, trắc nghiệm, VR, AR, nộp bài) trên Supabase với bản
 * đang có trên trang. Có link mới hoặc bài đổi tên, đổi ảnh thì báo cần build lại để mạng xã hội
 * đọc được khung xem trước (tên bài, ảnh, mô tả). Không có thay đổi thì bỏ qua, không build.
 */
import { appendFileSync } from 'node:fs';
import { loadShareRoutes } from './share-routes.mjs';

const clean = v => String(v || '').trim().replace(/^"|"$/g, '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const url = clean(process.env.VITE_SUPABASE_URL);
const key = clean(process.env.VITE_SUPABASE_ANON_KEY);
const out = changed => {
  console.log(`changed=${changed}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
};

try {
  const { hash } = await loadShareRoutes(url, key);
  const live = await fetch(`https://ngtduc24.github.io/share-manifest.txt?t=${Date.now()}`).then(r => (r.ok ? r.text() : '')).catch(() => '');
  out(live.trim() !== hash);
} catch (e) {
  console.warn('Không kiểm tra được, bỏ qua lần này:', e?.message || e);
  out(false);
}
