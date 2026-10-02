import { supabase } from './supabase';
import { getEduCtx } from './edu';

// Thùng rác chung của mỗi tài khoản, hiện ở trang Cá nhân, mục Đã xoá.
// Khi xoá một nội dung, bản sao đầy đủ các dòng dữ liệu được giữ lại ở bảng portfolio_settings
// với khoá trash:<uid>:<thời điểm>:<ứng dụng>. Khôi phục là ghi lại đúng các dòng đó.
// Bài giảng E-Learning và dự án Remier đã có thùng rác riêng nên đọc thẳng từ chính chúng.
// Sau 30 ngày mục đã xoá tự dọn hẳn.

export const TRASH_DAYS = 30;
const DAY = 24 * 3600 * 1000;

export type TrashApp =
  | 'bank_item' | 'quiz' | 'quiz_question' | 'qda_project' | 'vr_tour' | 'task' | 'website' | 'el_lesson' | 'remier' | 'slide_deck' | 'quant_project';

export const TRASH_APP_LABELS: Record<TrashApp, string> = {
  bank_item: 'Ngân hàng bài tập',
  quiz: 'Đề trắc nghiệm',
  quiz_question: 'Câu hỏi trắc nghiệm',
  qda_project: 'Dự án định tính',
  vr_tour: 'Tour VR 360',
  task: 'Công việc',
  website: 'Website',
  el_lesson: 'Giáo trình',
  remier: 'Dự án dựng phim',
  slide_deck: 'Bài giảng',
  quant_project: 'Dự án định lượng',
};

export interface TrashTable { table: string; rows: any[] }
export interface TrashItem {
  key: string;            // khoá trong portfolio_settings, hoặc el:<id>, remier:<id> cho 2 thùng rác riêng
  app: TrashApp;
  title: string;
  deletedAt: string;
  note?: string;          // ví dụ: kèm 12 bài làm của sinh viên
}

const me = () => getEduCtx().userId;
const T = 'portfolio_settings';

// Giữ bản sao trước khi xoá. Ghi không được thì báo lỗi để không xoá mất dữ liệu.
export async function putInTrash(app: TrashApp, title: string, tables: TrashTable[], note?: string): Promise<void> {
  const uid = me();
  if (!uid) throw new Error('Bạn cần đăng nhập.');
  const kept = tables.filter(t => t.rows && t.rows.length);
  if (!kept.length) return;
  const key = `trash:${uid}:${Date.now()}:${app}:${Math.random().toString(36).slice(2, 7)}`;
  const { error } = await supabase.from(T).upsert({ key, data: { app, title: title || 'Không có tiêu đề', at: new Date().toISOString(), owner: uid, note: note || '', tables: kept } });
  if (error) throw new Error('Chưa giữ được bản sao vào mục Đã xoá, nên chưa xoá gì. Vui lòng thử lại.');
}

// Đọc nhanh các dòng sẽ bị xoá (bỏ qua bảng lỗi hoặc không có cột tương ứng).
export async function rowsOf(table: string, column: string, values: string[]): Promise<any[]> {
  if (!values.length) return [];
  const out: any[] = [];
  for (let i = 0; i < values.length; i += 100) {
    const { data, error } = await supabase.from(table).select('*').in(column, values.slice(i, i + 100));
    if (error) return out;
    out.push(...(data || []));
  }
  return out;
}

const stripTitle = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

// Danh sách mục đã xoá của mình, mới nhất trước. Mục quá hạn thì dọn luôn.
export async function listMyTrash(): Promise<TrashItem[]> {
  const uid = me();
  if (!uid) return [];
  const out: TrashItem[] = [];
  const expired: TrashItem[] = [];
  const cut = Date.now() - TRASH_DAYS * DAY;

  const { data } = await supabase.from(T).select('key,data').like('key', `trash:${uid}:%`);
  for (const r of data || []) {
    const d: any = r.data || {};
    const at = d.at || new Date(Number(String(r.key).split(':')[2]) || Date.now()).toISOString();
    // Bản sao Website cũ không có trường app.
    const app: TrashApp = d.app || 'website';
    const title = app === 'website' ? (d.site?.title || d.site?.slug || 'Website') : stripTitle(d.title);
    const note = app === 'website' && d.site?.slug ? `Địa chỉ /${d.site.slug}` : d.note;
    const item: TrashItem = { key: r.key, app, title, deletedAt: at, note };
    // Bản sao Website giữ lâu hơn, không tự dọn, vì là bản an toàn của cả trang.
    (app !== 'website' && new Date(at).getTime() < cut ? expired : out).push(item);
  }

  // Bài giảng E-Learning và dự án dựng phim dùng thùng rác riêng.
  try {
    const { getTrashLessons } = await import('./elearning');
    for (const l of await getTrashLessons()) {
      const item: TrashItem = { key: `el:${l.id}`, app: 'el_lesson', title: l.title || 'Bài giảng', deletedAt: (l as any).deleted_at || new Date().toISOString() };
      (new Date(item.deletedAt).getTime() < cut ? expired : out).push(item);
    }
  } catch { /* bỏ qua */ }
  try {
    const { getTrashProjects } = await import('./remier');
    for (const p of await getTrashProjects()) {
      const at = (p as any).deleted_at || (p as any).deletedAt || new Date().toISOString();
      const item: TrashItem = { key: `remier:${p.id}`, app: 'remier', title: (p as any).name || (p as any).title || 'Dự án', deletedAt: at };
      (new Date(at).getTime() < cut ? expired : out).push(item);
    }
  } catch { /* bỏ qua */ }

  // Bài giảng trình chiếu.
  try {
    const { listTrashDecks } = await import('./slides');
    for (const d of await listTrashDecks()) {
      const item: TrashItem = { key: `deck:${d.id}`, app: 'slide_deck', title: d.title, deletedAt: d.deletedAt };
      (new Date(d.deletedAt).getTime() < cut ? expired : out).push(item);
    }
  } catch { /* bỏ qua */ }

  // Dự án định lượng.
  try {
    const { listTrashQuant } = await import('./quant');
    for (const d of await listTrashQuant()) {
      const item: TrashItem = { key: `quant:${d.id}`, app: 'quant_project', title: d.title, deletedAt: d.deletedAt };
      (new Date(d.deletedAt).getTime() < cut ? expired : out).push(item);
    }
  } catch { /* bỏ qua */ }

  // Công việc dùng cờ isDeleted (thùng rác của Quản lý công việc), chỉ lấy việc do mình tạo.
  try {
    const { getTasksFromSupabase } = await import('./tasks');
    for (const t of await getTasksFromSupabase()) {
      if (!t.isDeleted || t.createdBy !== uid) continue;
      const hist: any[] = (t as any).history || [];
      const last = [...hist].reverse().find(h => /thùng rác/i.test(h?.action || ''));
      const at = last?.timestamp || (t as any).updatedAt || t.createdAt || new Date().toISOString();
      out.push({ key: `task:${t.id}`, app: 'task', title: t.name || 'Công việc', deletedAt: at, note: 'Cũng xem được ở thùng rác của Quản lý công việc' });
    }
  } catch { /* bỏ qua */ }

  // Dọn mục quá hạn ở nền.
  expired.forEach(it => { purgeTrash(it).catch(() => {}); });
  return out.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

// Ghi lại các dòng theo đúng thứ tự (bảng cha trước, bảng con sau).
async function writeBack(tables: TrashTable[]) {
  for (const t of tables) {
    for (let i = 0; i < t.rows.length; i += 200) {
      const { error } = await supabase.from(t.table).upsert(t.rows.slice(i, i + 200));
      if (error) throw new Error(`Chưa khôi phục được dữ liệu (${t.table}): ${error.message}`);
    }
  }
}

export async function restoreTrash(item: TrashItem): Promise<void> {
  const uid = me();
  if (!uid) throw new Error('Bạn cần đăng nhập.');
  if (item.key.startsWith('el:')) { const { restoreLesson } = await import('./elearning'); await restoreLesson(item.key.slice(3)); return; }
  if (item.key.startsWith('remier:')) { const { restoreProject } = await import('./remier'); await restoreProject(item.key.slice(7)); return; }
  if (item.key.startsWith('deck:')) { const { restoreDeck } = await import('./slides'); await restoreDeck(item.key.slice(5)); return; }
  if (item.key.startsWith('quant:')) { const { restoreQuant } = await import('./quant'); await restoreQuant(item.key.slice(6)); return; }
  if (item.key.startsWith('task:')) {
    const { getTasksFromSupabase, saveTaskToSupabase, addTaskHistory } = await import('./tasks');
    const t = (await getTasksFromSupabase()).find(x => x.id === item.key.slice(5));
    if (!t) throw new Error('Không tìm thấy công việc này.');
    await saveTaskToSupabase(addTaskHistory({ ...t, isDeleted: false }, 'Khôi phục từ mục Đã xoá', uid, ''));
    return;
  }
  const { data, error } = await supabase.from(T).select('data').eq('key', item.key).maybeSingle();
  if (error || !data) throw new Error('Không tìm thấy bản sao của mục này.');
  const d: any = data.data || {};
  if (d.owner && d.owner !== uid) throw new Error('Mục này không thuộc tài khoản của bạn.');

  if (item.app === 'website') {
    const { getSiteOfOwner, getSiteBySlug } = await import('./portfolioData');
    if (await getSiteOfOwner(uid)) throw new Error('Bạn đang có một Website. Mỗi tài khoản chỉ có 1 Website, hãy xoá Website hiện tại trước khi khôi phục.');
    const slug = d.site?.slug;
    if (slug) {
      const taken = await getSiteBySlug(slug);
      if (taken && taken.owner !== uid) throw new Error(`Địa chỉ /${slug} đã có người khác dùng, chưa khôi phục được.`);
    }
    await writeBack((d.tables || []) as TrashTable[]);
    const settings = (d.settings || []) as Array<{ key: string; data: unknown }>;
    const reg = slug ? [{ key: `site:${slug}`, data: { ...d.site, owner: uid, updatedAt: new Date().toISOString() } }, { key: `site_owner:${uid}`, data: { slug } }] : [];
    const { error: e2 } = await supabase.from(T).upsert([...settings, ...reg]);
    if (e2) throw new Error('Chưa khôi phục được cài đặt Website: ' + e2.message);
  } else {
    await writeBack((d.tables || []) as TrashTable[]);
  }
  await supabase.from(T).delete().eq('key', item.key);
}

export async function purgeTrash(item: TrashItem): Promise<void> {
  if (item.key.startsWith('el:')) { const { purgeLesson } = await import('./elearning'); await purgeLesson(item.key.slice(3)); return; }
  if (item.key.startsWith('remier:')) { const { purgeProject } = await import('./remier'); await purgeProject(item.key.slice(7)); return; }
  if (item.key.startsWith('deck:')) { const { purgeDeck } = await import('./slides'); await purgeDeck(item.key.slice(5)); return; }
  if (item.key.startsWith('quant:')) { const { purgeQuant } = await import('./quant'); await purgeQuant(item.key.slice(6)); return; }
  if (item.key.startsWith('task:')) { const { deleteTaskFromSupabase } = await import('./tasks'); await deleteTaskFromSupabase(item.key.slice(5)); return; }
  const uid = me();
  if (!uid || !item.key.startsWith(`trash:${uid}:`)) throw new Error('Mục này không thuộc tài khoản của bạn.');
  const { error } = await supabase.from(T).delete().eq('key', item.key);
  if (error) throw error;
}
