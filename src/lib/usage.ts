// Đo băng thông và dung lượng để hiện ở trang Thống kê.
//
// Băng thông: Supabase gói miễn phí không cho ứng dụng đọc số egress qua API, nên ta tự đo ở phía trình
// duyệt bằng PerformanceObserver (transferSize của từng tài nguyên đã tải), gom theo nhóm máy chủ
// (supabase, cloudinary, trang web, khác) rồi cộng dồn vào bảng usage_bandwidth theo ngày. Cộng tất cả
// người dùng lại sẽ ra ước lượng lưu lượng thật của hệ thống. Số này là ước lượng: tài nguyên lấy từ
// bộ đệm trình duyệt có transferSize 0 nên không bị tính trùng.
//
// Dung lượng: get_storage_stats() (SQL, security definer) trả về kích thước cơ sở dữ liệu Postgres,
// 15 bảng lớn nhất và tổng tệp trong Supabase Storage. Dung lượng media (Cloudinary) lấy từ tổng
// trường bytes của bộ sưu tập uploaded_images trên Firestore.
import { supabase } from './supabase';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export type UsageHost = 'supabase' | 'cloudinary' | 'site' | 'firebase' | 'other';

const pending: Record<UsageHost, { bytes: number; requests: number }> = {
  supabase: { bytes: 0, requests: 0 },
  cloudinary: { bytes: 0, requests: 0 },
  site: { bytes: 0, requests: 0 },
  firebase: { bytes: 0, requests: 0 },
  other: { bytes: 0, requests: 0 },
};
let started = false;
let flushTimer: number | null = null;

function hostOf(url: string): UsageHost {
  try {
    const h = new URL(url, location.href).hostname;
    if (h.endsWith('supabase.co') || h.endsWith('supabase.in')) return 'supabase';
    if (h.includes('cloudinary.com')) return 'cloudinary';
    if (h.includes('googleapis.com') || h.includes('firebaseio.com') || h.includes('gstatic.com') || h.includes('firebase')) return 'firebase';
    if (h === location.hostname) return 'site';
    return 'other';
  } catch {
    return 'other';
  }
}

async function flush() {
  const batch = (Object.keys(pending) as UsageHost[]).filter(k => pending[k].bytes > 0 || pending[k].requests > 0);
  if (batch.length === 0) return;
  const snapshot = batch.map(k => ({ host: k, ...pending[k] }));
  batch.forEach(k => { pending[k] = { bytes: 0, requests: 0 }; });
  for (const item of snapshot) {
    try {
      await supabase.rpc('log_bandwidth', { p_host: item.host, p_bytes: Math.round(item.bytes), p_requests: item.requests });
    } catch {
      // Mất mạng hoặc chưa tạo hàm SQL thì bỏ qua, không làm phiền người dùng.
    }
  }
}

// Gọi 1 lần khi ứng dụng khởi động.
export function startBandwidthMeter() {
  if (started || typeof PerformanceObserver === 'undefined') return;
  started = true;
  // Tính cả những tài nguyên đã tải trước khi observer chạy (bundle JS, CSS lúc mở trang).
  try {
    performance.getEntriesByType('resource').forEach((e) => record(e as PerformanceResourceTiming));
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) { pending.site.bytes += nav.transferSize || 0; pending.site.requests += 1; }
  } catch { /* bỏ qua */ }
  try {
    const obs = new PerformanceObserver((list) => { list.getEntries().forEach((e) => record(e as PerformanceResourceTiming)); });
    obs.observe({ type: 'resource', buffered: false });
  } catch { /* trình duyệt cũ */ }
  flushTimer = window.setInterval(flush, 30000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', () => { flush(); });
}

function record(e: PerformanceResourceTiming) {
  const size = e.transferSize || 0;
  const host = hostOf(e.name);
  pending[host].bytes += size;
  pending[host].requests += 1;
}

export function stopBandwidthMeter() {
  if (flushTimer) window.clearInterval(flushTimer);
  flushTimer = null;
}

export interface BandwidthRow { day: string; host: UsageHost; bytes: number; requests: number }

export async function getBandwidthRows(days = 30): Promise<BandwidthRow[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase.from('usage_bandwidth').select('day, host, bytes, requests').gte('day', since).order('day', { ascending: true });
  if (error) throw error;
  return (data || []) as BandwidthRow[];
}

export interface StorageStats {
  db_bytes: number;
  tables: { name: string; bytes: number }[];
  storage_bytes: number;
  storage_files: number;
}

export async function getStorageStats(): Promise<StorageStats | null> {
  const { data, error } = await supabase.rpc('get_storage_stats');
  if (error) throw error;
  return (data as StorageStats) || null;
}

export interface MediaStats { bytes: number; files: number; byType: Record<string, { bytes: number; files: number }> }

export async function getMediaStats(): Promise<MediaStats> {
  const snap = await getDocs(collection(db, 'uploaded_images'));
  const out: MediaStats = { bytes: 0, files: 0, byType: {} };
  const seen = new Set<string>();
  snap.forEach((d) => {
    const v = d.data() as any;
    // Mỗi lần tải lên có thể được ghi 2 bản ghi (theo publicId và theo url), lọc trùng theo url.
    const key = v.url || v.publicId || d.id;
    if (seen.has(key)) return;
    seen.add(key);
    const bytes = Number(v.bytes) || 0;
    const type = String(v.type || 'khác');
    out.bytes += bytes; out.files += 1;
    if (!out.byType[type]) out.byType[type] = { bytes: 0, files: 0 };
    out.byType[type].bytes += bytes; out.byType[type].files += 1;
  });
  return out;
}

export function formatBytes(n: number): string {
  if (!n || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${units[i]}`;
}
