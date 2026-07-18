import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Database,
  Eye,
  Folder,
  FolderKanban,
  GraduationCap,
  BookOpen,
  Newspaper,
  RefreshCw,
  Shield,
  User,
  Compass
} from 'lucide-react';
import BannerAboutCMS from './cms/BannerAboutCMS';
import ProjectsCoursesCMS from './cms/ProjectsCoursesCMS';
import PortfolioNavigationManager from './cms/PortfolioNavigationManager';
import PortfolioContentManager from './cms/PortfolioContentManager';
import { getPortfolioCourses, getPortfolioLectures, getPortfolioProjects, getPortfolioResearch } from '../lib/portfolioData';

type PortfolioDivision = 'profile' | 'content' | 'projects' | 'courses' | 'research' | 'navigation';

const DIVISIONS: Array<{
  id: PortfolioDivision;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'content',
    title: 'Thêm bài viết mới',
    description: 'Chọn dạng nội dung và mở trực tiếp form tạo mới tương ứng',
    icon: Newspaper
  },
  {
    id: 'projects',
    title: 'Dự án',
    description: 'Danh sách dự án Design và case study đã tạo',
    icon: Folder
  },
  {
    id: 'courses',
    title: 'Khóa học',
    description: 'Danh sách khóa học online, giáo trình và học viên',
    icon: GraduationCap
  },
  {
    id: 'research',
    title: 'Nghiên cứu',
    description: 'Danh sách bài báo và công trình nghiên cứu khoa học',
    icon: Award
  },
  {
    id: 'navigation',
    title: 'Menu chính Portfolio',
    description: 'Quản lý menu chính, menu con và liên kết điều hướng toàn trang chủ',
    icon: Compass
  },
  {
    id: 'profile',
    title: 'Hồ Sơ',
    description: 'Banner, giới thiệu, học vấn, kinh nghiệm và kỹ năng',
    icon: User
  },
];

export default function PortfolioCMS() {
  const [activeDivision, setActiveDivision] = useState<PortfolioDivision>('content');
  const [syncing, setSyncing] = useState(false);
  const [overviewStats, setOverviewStats] = useState([
    { label: 'Dự án', value: 0, detail: '0 đã xuất bản', icon: FolderKanban },
    { label: 'Khóa học', value: 0, detail: '0 học viên', icon: GraduationCap },
    { label: 'Nghiên cứu', value: 0, detail: '0 lượt xem', icon: Award },
  ]);

  useEffect(() => {
    Promise.all([getPortfolioProjects(), getPortfolioCourses(), getPortfolioResearch()]).then(([projects, courses, research]) => setOverviewStats([
      { label: 'Dự án', value: projects.length, detail: `${projects.filter(item => item.status === 'published').length} đã xuất bản`, icon: FolderKanban },
      { label: 'Khóa học', value: courses.length, detail: `${courses.reduce((sum, item) => sum + item.studentsCount, 0).toLocaleString('vi-VN')} học viên`, icon: GraduationCap },
      { label: 'Nghiên cứu', value: research.length, detail: `${research.reduce((sum, item) => sum + item.viewCount, 0).toLocaleString('vi-VN')} lượt xem`, icon: Award },
    ])).catch(error => console.error('Không thể tải thống kê Portfolio:', error));
  }, []);

  const handleTriggerSync = () => {
    setSyncing(true);
    window.setTimeout(() => setSyncing(false), 1200);
  };

  const activeDivisionInfo = DIVISIONS.find(item => item.id === activeDivision) ?? DIVISIONS[0];
  const isContentListDivision = ['projects', 'courses', 'research'].includes(activeDivision);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 text-slate-800">
      {/* Module banner — cùng cấu trúc với các phân hệ quản trị khác */}
      <section className="bg-brand rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -right-12 -top-16 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute right-20 -bottom-24 w-48 h-48 rounded-full bg-slate-950/10" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
              <Shield className="w-3.5 h-3.5" />
              <span>QUẢN TRỊ WEBSITE PORTFOLIO</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight">Quản trị Portfolio</h1>
              <p className="text-xs text-white/90 max-w-2xl leading-relaxed">
                Biên tập nội dung hồ sơ, dự án, chương trình đào tạo và học thuật hiển thị trên trang Portfolio công khai.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.open('/?portfolio=true', '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-brand hover:bg-white/90 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Eye className="w-4 h-4" />
            <span>Xem trang Portfolio</span>
          </button>
        </div>
      </section>

      {/* Trạng thái và thao tác nhanh */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="bg-white rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Phân hệ đang mở</span>
            <span className="text-base font-extrabold text-slate-900 block">{activeDivisionInfo.title}</span>
            <span className="text-[11px] text-slate-500 font-medium block">{activeDivisionInfo.description}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <activeDivisionInfo.icon className="w-6 h-6" />
          </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Cơ sở dữ liệu Portfolio</span>
            <span className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Sẵn sàng đồng bộ
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">Nội dung được lưu và đồng bộ trên Supabase</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={syncing}
            className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-60"
            title="Kiểm tra kết nối dữ liệu"
          >
            {syncing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Database className="w-6 h-6" />}
          </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map(item => <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-xs"><div className="min-w-0 text-left"><span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{item.label}</span><strong className="mt-1 block text-2xl font-black leading-none text-slate-900">{item.value}</strong><span className="mt-2 block truncate text-[11px] font-medium text-slate-500">{item.detail}</span></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><item.icon className="h-5 w-5" /></span></div>)}
        </div>
      </section>

      {/* Thanh tab ngang — đồng nhất với module Báo khoa học */}
      <nav
        className="flex flex-nowrap border-b border-slate-200 overflow-x-auto scrollbar-none gap-2 bg-slate-50 p-1.5 rounded-2xl select-none"
        onWheel={(e) => {
          if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth && e.deltaY !== 0) {
            e.preventDefault();
            e.currentTarget.scrollLeft += e.deltaY * 1.2;
          }
        }}
      >
        {DIVISIONS.map(item => {
          const Icon = item.icon;
          const isActive = activeDivision === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveDivision(item.id)}
              className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-brand shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Nội dung phân hệ */}
      <section className={isContentListDivision ? 'min-h-[440px]' : 'min-h-[440px] rounded-3xl bg-white p-5 shadow-sm sm:p-6'}>
        {!isContentListDivision && (
          <div className="border-b border-slate-100 pb-4 mb-6 text-left">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <activeDivisionInfo.icon className="w-5 h-5 text-brand" />
              <span>{activeDivisionInfo.title}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">{activeDivisionInfo.description}</p>
          </div>
        )}

        {activeDivision === 'profile' && <BannerAboutCMS />}
        {activeDivision === 'content' && <PortfolioContentManager />}
        {activeDivision === 'projects' && <ProjectsCoursesCMS initialSubTab="projects" showSubTabs={false} />}
        {activeDivision === 'courses' && <ProjectsCoursesCMS initialSubTab="courses" showSubTabs={false} />}
        {activeDivision === 'research' && <div className="text-center py-10 text-slate-500 text-xs">Phân hệ Nghiên cứu đang được cập nhật.</div>}
        {activeDivision === 'navigation' && <PortfolioNavigationManager />}
      </section>
    </div>
  );
}
