import React, { useState, useEffect } from 'react';
import { BarChart3, Calculator, Layers, Microscope, BookOpen, CheckCircle2, ClipboardList, Database, HardDrive, Image as ImageIcon, Activity, RefreshCw, Info } from 'lucide-react';
import { getStatsFromSupabase, getJournalsFromSupabase } from '../lib/data';
import { useTasks } from './TaskContext';
import { UserAccount, ScientificJournal } from '../types';
import { isTaskRelevantToUser } from '../lib/tasks';
import OnlineUsersPresence from './OnlineUsersPresence';
import { getBandwidthRows, getStorageStats, getMediaStats, formatBytes, BandwidthRow, StorageStats, MediaStats, UsageHost } from '../lib/usage';
import { PageHeader, Card, CardTitle, Badge, Button, Spinner } from './ui';

interface StatsOverviewProps {
  currentUser: UserAccount;
}

const HOST_LABEL: Record<UsageHost, string> = { supabase: 'Supabase (dữ liệu)', cloudinary: 'Cloudinary (media)', site: 'Trang web (mã nguồn)', firebase: 'Firebase (tài khoản)', other: 'Khác' };
const HOST_COLOR: Record<UsageHost, string> = { supabase: 'bg-emerald-500', cloudinary: 'bg-blue-500', site: 'bg-slate-500', firebase: 'bg-amber-500', other: 'bg-slate-300' };
// Hạn mức gói miễn phí để so sánh (Supabase Free: 5 GB egress, 500 MB Postgres, 1 GB Storage. Cloudinary Free: 25 credit, tương đương 25 GB lưu trữ hoặc băng thông).
const LIMITS = { egress: 5 * 1024 ** 3, db: 500 * 1024 ** 2, storage: 1024 ** 3, media: 25 * 1024 ** 3 };

function Meter({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'warn' | 'danger' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : tone === 'brand' ? 'bg-brand' : 'bg-slate-400';
  return (
    <div className="mt-2">
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} /></div>
      <p className="text-xs text-slate-500 mt-1">{pct}% hạn mức gói miễn phí ({formatBytes(max)})</p>
    </div>
  );
}

// Trang Số liệu tách riêng, gom toàn bộ thống kê trước đây nằm trên dashboard.
export default function StatsOverview({ currentUser }: StatsOverviewProps) {
  const { tasks } = useTasks();
  const [statsData, setStatsData] = useState<Record<string, number>>({ calculator: 0, public_search: 0 });
  const [journals, setJournals] = useState<ScientificJournal[]>([]);
  const [bw, setBw] = useState<BandwidthRow[] | null>(null);
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [media, setMedia] = useState<MediaStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');

  const isUserAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    getStatsFromSupabase().then(setStatsData).catch(() => {});
    getJournalsFromSupabase().then(setJournals).catch(() => {});
  }, []);

  const loadUsage = async () => {
    setUsageLoading(true); setUsageError('');
    const errs: string[] = [];
    await Promise.all([
      getBandwidthRows(30).then(setBw).catch(() => errs.push('băng thông')),
      getStorageStats().then(setStorage).catch(() => errs.push('dung lượng cơ sở dữ liệu')),
      getMediaStats().then(setMedia).catch(() => errs.push('media')),
    ]);
    if (errs.length) setUsageError(`Chưa đọc được ${errs.join(', ')}. Nếu vừa cập nhật, hãy chạy tệp SQL USAGE_STATS.sql trong Supabase.`);
    setUsageLoading(false);
  };
  useEffect(() => { if (isUserAdmin) loadUsage(); }, [isUserAdmin]);

  const perms = currentUser?.permissions || [];
  const can = (id: string) => isUserAdmin || perms.includes(id);

  const visibleTasks = tasks.filter(t => !t.isDeleted && isTaskRelevantToUser(t, currentUser));
  const completedTasksCount = (isUserAdmin ? tasks.filter(t => !t.isDeleted) : visibleTasks).filter(t => t.status === 'Completed').length;
  const runningTasksCount = visibleTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length;
  const journalsCount = journals.length;
  const disciplinesCount = new Set(journals.map(j => j.field?.trim()).filter(Boolean)).size;

  const tiles = [
    ...(can('tasks') ? [
      { label: 'Công việc đang thực hiện', value: runningTasksCount, sub: 'Chưa hoàn thành', icon: ClipboardList },
      { label: 'Công việc đã hoàn thành', value: completedTasksCount, sub: 'Tổng đã xong', icon: CheckCircle2 },
    ] : []),
    ...(can('calculator') ? [
      { label: 'Lượt tính cỡ mẫu', value: statsData.calculator || 0, sub: 'Thời gian thực', icon: Calculator },
    ] : []),
    ...(can('scientific_journals') ? [
      { label: 'Tạp chí lưu trữ', value: journalsCount, sub: 'Trong thư viện', icon: Layers },
      { label: 'Ngành và lĩnh vực', value: disciplinesCount, sub: 'Đa dạng', icon: Microscope },
      { label: 'Lượt tra cứu điểm báo', value: statsData.public_search || 0, sub: 'Cổng công khai', icon: BookOpen },
    ] : []),
  ];

  // Gom băng thông theo ngày và theo máy chủ.
  const today = new Date().toISOString().slice(0, 10);
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const sum = (rows: BandwidthRow[]) => rows.reduce((a, r) => a + Number(r.bytes || 0), 0);
  const bwRows = bw || [];
  const bwToday = sum(bwRows.filter(r => r.day === today));
  const bw7 = sum(bwRows.filter(r => r.day >= since7));
  const bw30 = sum(bwRows);
  const byHost = (Object.keys(HOST_LABEL) as UsageHost[]).map(h => ({ host: h, bytes: sum(bwRows.filter(r => r.host === h)), requests: bwRows.filter(r => r.host === h).reduce((a, r) => a + Number(r.requests || 0), 0) })).filter(x => x.bytes > 0);
  const days: { day: string; bytes: number; perHost: Record<string, number> }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const rows = bwRows.filter(r => r.day === d);
    const perHost: Record<string, number> = {}; rows.forEach(r => { perHost[r.host] = (perHost[r.host] || 0) + Number(r.bytes || 0); });
    days.push({ day: d, bytes: sum(rows), perHost });
  }
  const maxDay = Math.max(1, ...days.map(d => d.bytes));

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader icon={<BarChart3 size={22} />} title="Số liệu tổng quan" description="Thống kê hoạt động, băng thông và dung lượng của hệ thống theo quyền của bạn" />

      {tiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {tiles.map((t) => (
            <Card key={t.label} padding="item" className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">{t.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1 leading-none">{t.value.toLocaleString('vi-VN')}</p>
                <p className="text-xs text-slate-500 mt-1.5">{t.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-light text-brand flex items-center justify-center shrink-0"><t.icon size={18} /></div>
            </Card>
          ))}
        </div>
      )}

      {isUserAdmin && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-slate-800">Băng thông và dung lượng</h2>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} loading={usageLoading} onClick={loadUsage}>Cập nhật</Button>
          </div>
          {usageError && <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[13px] text-amber-700 flex items-start gap-2"><Info size={16} className="shrink-0 mt-0.5" />{usageError}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card padding="item">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">Băng thông 30 ngày</p><Activity size={18} className="text-brand" /></div>
              <p className="text-2xl font-bold text-slate-800 mt-1 leading-none">{formatBytes(bw30)}</p>
              <p className="text-xs text-slate-500 mt-1.5">Hôm nay {formatBytes(bwToday)} · 7 ngày {formatBytes(bw7)}</p>
              <Meter value={bw30} max={LIMITS.egress} />
            </Card>
            <Card padding="item">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">Cơ sở dữ liệu (Postgres)</p><Database size={18} className="text-brand" /></div>
              <p className="text-2xl font-bold text-slate-800 mt-1 leading-none">{storage ? formatBytes(storage.db_bytes) : '…'}</p>
              <p className="text-xs text-slate-500 mt-1.5">{storage ? `${storage.tables?.length || 0} bảng lớn nhất bên dưới` : 'Đang đọc'}</p>
              {storage && <Meter value={storage.db_bytes} max={LIMITS.db} />}
            </Card>
            <Card padding="item">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">Supabase Storage (tệp)</p><HardDrive size={18} className="text-brand" /></div>
              <p className="text-2xl font-bold text-slate-800 mt-1 leading-none">{storage ? formatBytes(storage.storage_bytes) : '…'}</p>
              <p className="text-xs text-slate-500 mt-1.5">{storage ? `${Number(storage.storage_files || 0).toLocaleString('vi-VN')} tệp` : 'Đang đọc'}</p>
              {storage && <Meter value={storage.storage_bytes} max={LIMITS.storage} />}
            </Card>
            <Card padding="item">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-500">Media trên Cloudinary</p><ImageIcon size={18} className="text-brand" /></div>
              <p className="text-2xl font-bold text-slate-800 mt-1 leading-none">{media ? formatBytes(media.bytes) : '…'}</p>
              <p className="text-xs text-slate-500 mt-1.5">{media ? `${media.files.toLocaleString('vi-VN')} tệp đã tải lên` : 'Đang đọc'}</p>
              {media && <Meter value={media.bytes} max={LIMITS.media} />}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardTitle description="Ước lượng từ dữ liệu tải về trên trình duyệt của mọi người dùng, cộng dồn theo ngày">Băng thông 30 ngày gần nhất</CardTitle>
              {bw === null && !usageError ? <Spinner /> : (
                <>
                  <div className="flex items-end gap-[3px] h-36">
                    {days.map((d) => (
                      <div key={d.day} className="flex-1 flex flex-col justify-end h-full" title={`${d.day.split('-').reverse().join('/')}: ${formatBytes(d.bytes)}`}>
                        {(Object.keys(HOST_LABEL) as UsageHost[]).map(h => d.perHost[h] ? <div key={h} className={`${HOST_COLOR[h]} w-full first:rounded-t`} style={{ height: `${(d.perHost[h] / maxDay) * 100}%` }} /> : null)}
                        {d.bytes === 0 && <div className="w-full h-px bg-slate-200" />}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-2"><span>{days[0].day.split('-').reverse().slice(0, 2).join('/')}</span><span>Hôm nay</span></div>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {byHost.map(x => (
                      <div key={x.host} className="flex items-center gap-2 text-xs text-slate-600"><span className={`w-3 h-3 rounded-sm ${HOST_COLOR[x.host]}`} />{HOST_LABEL[x.host]} <span className="font-semibold text-slate-800">{formatBytes(x.bytes)}</span> <span className="text-slate-400">({x.requests.toLocaleString('vi-VN')} lượt)</span></div>
                    ))}
                    {byHost.length === 0 && <p className="text-[13px] text-slate-500">Chưa có số liệu. Dữ liệu bắt đầu được ghi từ lúc bản này lên mạng.</p>}
                  </div>
                </>
              )}
            </Card>

            <Card>
              <CardTitle description="Theo pg_total_relation_size, gồm cả chỉ mục">Bảng chiếm dung lượng nhiều nhất</CardTitle>
              {!storage ? <Spinner /> : (
                <div className="space-y-2">
                  {(storage.tables || []).slice(0, 10).map(t => {
                    const pct = storage.db_bytes ? Math.round((t.bytes / storage.db_bytes) * 100) : 0;
                    return (
                      <div key={t.name}>
                        <div className="flex items-center justify-between text-[13px]"><span className="font-medium text-slate-700 truncate">{t.name}</span><span className="text-slate-500 shrink-0 ml-2">{formatBytes(t.bytes)}</span></div>
                        <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden"><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
              {media && Object.keys(media.byType).length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Media theo loại</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(media.byType).sort((a, b) => b[1].bytes - a[1].bytes).map(([k, v]) => <Badge key={k} tone="neutral">{k}: {formatBytes(v.bytes)} · {v.files} tệp</Badge>)}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {isUserAdmin && <OnlineUsersPresence currentUser={currentUser} />}
    </div>
  );
}
