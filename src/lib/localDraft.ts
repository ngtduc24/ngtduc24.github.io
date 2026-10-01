// Lưu bản nháp lớn trên máy bằng IndexedDB (không giới hạn 5 MB như localStorage).
// Dùng để giữ phiên nhập điểm khi trang tải lại giữa chừng.
const DB = 'remier_drafts';
const STORE = 'drafts';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function draftGet<T = any>(key: string): Promise<T | undefined> {
  try { return await run<T>('readonly', s => s.get(key) as IDBRequest<T>); } catch { return undefined; }
}
export async function draftSet(key: string, value: unknown): Promise<void> {
  try { await run('readwrite', s => s.put(value, key)); } catch { /* trình duyệt chặn bộ nhớ thì bỏ qua */ }
}
export async function draftDel(key: string): Promise<void> {
  try { await run('readwrite', s => s.delete(key)); } catch { /* bỏ qua */ }
}
