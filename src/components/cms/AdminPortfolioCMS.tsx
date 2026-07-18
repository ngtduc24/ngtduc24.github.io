import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Eye,
  FileText,
  FolderKanban,
  GraduationCap,
  Layers3,
  Loader2,
  RefreshCw,
  Search
} from 'lucide-react';
import {
  getPortfolioCourses,
  getPortfolioLectures,
  getPortfolioProjects,
  getPortfolioResearch
} from '../../lib/portfolioData';
import {
  PortfolioCourse,
  PortfolioLecture,
  PortfolioProject,
  PortfolioResearch
} from '../portfolioTypes';

type OverviewFilter = 'all' | 'project' | 'course' | 'research' | 'lecture';
type PortfolioDivisionTarget = 'creative' | 'academia';

interface AdminPortfolioCMSProps {
  onNavigate?: (division: PortfolioDivisionTarget) => void;
}

interface OverviewItem {
  id: string;
  title: string;
  type: Exclude<OverviewFilter, 'all'>;
  typeLabel: string;
  status: string;
  date: string;
  views: number;
  coverImage?: string;
  target: PortfolioDivisionTarget;
}

const FILTERS: Array<{
  id: OverviewFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: 'Tất cả nội dung', icon: Layers3 },
  { id: 'project', label: 'Dự án', icon: FolderKanban },
  { id: 'course', label: 'Khóa học', icon: GraduationCap },
  { id: 'research', label: 'Nghiên cứu', icon: Award }
];

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  completed: 'bg-blue-50 text-blue-700 border-blue-100',
  ongoing: 'bg-amber-50 text-amber-700 border-amber-100',
  pending: 'bg-orange-50 text-orange-700 border-orange-100',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  hidden: 'bg-rose-50 text-rose-700 border-rose-100',
  archived: 'bg-slate-100 text-slate-500 border-slate-200',
  scheduled: 'bg-purple-50 text-purple-700 border-purple-100'
};

const STATUS_LABELS: Record<string, string> = {
  published: 'Đã xuất bản',
  completed: 'Hoàn thành',
  ongoing: 'Đang thực hiện',
  pending: 'Chờ xuất bản',
  draft: 'Bản nháp',
  hidden: 'Đã ẩn',
  archived: 'Lưu trữ',
  scheduled: 'Đã lên lịch'
};

export default function AdminPortfolioCMS({ onNavigate = () => {} }: AdminPortfolioCMSProps) {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [courses, setCourses] = useState<PortfolioCourse[]>([]);
  const [research, setResearch] = useState<PortfolioResearch[]>([]);
  const [lectures, setLectures] = useState<PortfolioLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OverviewFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [projectData, courseData, researchData, lectureData] = await Promise.all([
        getPortfolioProjects(),
        getPortfolioCourses(),
        getPortfolioResearch(),
        getPortfolioLectures()
      ]);
      setProjects(projectData);
      setCourses(courseData);
      setResearch(researchData);
      setLectures(lectureData);
    } catch (error) {
      console.error('Không thể tải tổng quan Portfolio:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const contentItems = useMemo<OverviewItem[]>(() => {
    const projectItems = projects.map(item => ({
      id: item.id,
      title: item.title,
      type: 'project' as const,
      typeLabel: 'Dự án',
      status: item.status,
      date: item.publishDate,
      views: item.viewCount,
      coverImage: item.coverImage,
      target: 'creative' as const
    }));
    const courseItems = courses.map(item => ({
      id: item.id,
      title: item.title,
      type: 'course' as const,
      typeLabel: 'Khóa học',
      status: item.status,
      date: item.publishDate,
      views: item.viewCount,
      coverImage: item.coverImage,
      target: 'creative' as const
    }));
    const researchItems = research.map(item => ({
      id: item.id,
      title: item.titleVi,
      type: 'research' as const,
      typeLabel: 'Nghiên cứu',
      status: 'published',
      date: String(item.publishYear),
      views: item.viewCount,
      coverImage: item.coverImage,
      target: 'academia' as const
    }));
    const lectureItems = lectures.map(item => ({
      id: item.id,
      title: item.title,
      type: 'lecture' as const,
      typeLabel: 'Bài giảng',
      status: item.status,
      date: item.publishDate,
      views: item.viewCount,
      coverImage: item.images?.[0],
      target: 'academia' as const
    }));

    return [...projectItems, ...courseItems, ...researchItems, ...lectureItems]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [projects, courses, research, lectures]);

  const filteredItems = contentItems.filter(item => {
    const matchesType = activeFilter === 'all' || item.type === activeFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-xs font-bold">Đang tổng hợp dữ liệu Portfolio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tìm kiếm và làm mới */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Tìm kiếm nội dung Portfolio</span>
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Tìm dự án, khóa học, nghiên cứu hoặc bài giảng..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
          />
        </label>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 text-brand ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Đang tải...' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {/* Bộ lọc một hàng, cuộn ngang bằng con lăn */}
      <div
        className="flex flex-nowrap gap-1.5 overflow-x-auto rounded-2xl bg-slate-50 p-1.5 scrollbar-none select-none"
        onWheel={event => {
          if (event.currentTarget.scrollWidth > event.currentTarget.clientWidth && event.deltaY !== 0) {
            event.preventDefault();
            event.currentTarget.scrollLeft += event.deltaY * 1.2;
          }
        }}
      >
        {FILTERS.map(filter => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;
          const count = filter.id === 'all' ? contentItems.length : contentItems.filter(item => item.type === filter.id).length;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? 'border border-slate-200/70 bg-white text-brand shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{filter.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${isActive ? 'bg-brand/10 text-brand' : 'bg-slate-200/70 text-slate-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Danh sách nội dung tổng hợp */}
      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <div className="hidden grid-cols-[minmax(280px,1fr)_120px_130px_100px_72px] gap-4 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400 md:grid">
          <span>Nội dung</span>
          <span>Loại</span>
          <span>Trạng thái</span>
          <span>Lượt xem</span>
          <span />
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-500">Không tìm thấy nội dung phù hợp</p>
            <p className="mt-1 text-xs text-slate-400">Thử thay đổi từ khóa hoặc bộ lọc.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map(item => (
              <div key={`${item.type}-${item.id}`} className="grid gap-4 px-4 py-4 transition hover:bg-slate-50/60 md:grid-cols-[minmax(280px,1fr)_120px_130px_100px_72px] md:items-center">
                <div className="flex min-w-0 items-center gap-3 text-left">
                  {item.coverImage ? (
                    <img src={item.coverImage} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><FileText className="h-5 w-5" /></span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-slate-800" title={item.title}>{item.title}</p>
                    <p className="mt-1 text-[10px] font-medium text-slate-400">{item.date || 'Chưa cập nhật ngày'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:block">
                  <span className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Loại</span>
                  <span className="text-xs font-bold text-slate-600">{item.typeLabel}</span>
                </div>
                <div className="flex items-center justify-between md:block">
                  <span className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Trạng thái</span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[item.status] || STATUS_STYLES.draft}`}>
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <div className="flex items-center justify-between md:justify-start">
                  <span className="text-[10px] font-bold uppercase text-slate-400 md:hidden">Lượt xem</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><Eye className="h-3.5 w-3.5" /> {item.views.toLocaleString('vi-VN')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(item.target)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold text-brand hover:bg-brand/10"
                >
                  Quản lý <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
