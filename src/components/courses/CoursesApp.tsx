import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Loader2, BookOpen, Settings2, Library } from 'lucide-react';
import { UserAccount } from '../../types';
import { PortfolioCourse, PortfolioCoursesSettings, PortfolioGlobalSettings, CourseStudent } from '../portfolioTypes';
import {
  getPortfolioCourses, getCourseStudents, getPortfolioCoursesSettings, getPortfolioGlobalSettings,
  getCourseStudentCounts, enrollCourse,
} from '../../lib/portfolioData';
import { PortfolioCollectionPage, PortfolioDetailPage, CollectionCard, DetailItem } from '../PortfolioWebsite';
import ProjectsCoursesCMS from '../cms/ProjectsCoursesCMS';
import { PageHeader } from '../ui';
import { notice } from '../ui/Dialogs';

// Ứng dụng Khoá học: admin tạo và quản lý khoá học, mọi tài khoản vào học các khoá admin đã phát hành.
// Không có công tắc trong trang Phân quyền: ai đăng nhập cũng học được, chỉ admin thấy mục Quản lý.

type Tab = 'all' | 'mine' | 'manage';

const META_ALL = { label: 'Khoá học', eyebrow: 'EduGo', title: 'Khoá học trực tuyến', description: 'Các khoá học do EduGo biên soạn, học theo video, học liệu và bài kiểm tra.' };
const META_MINE = { label: 'Khoá học của tôi', eyebrow: 'EduGo', title: 'Khoá học của tôi', description: 'Các khoá bạn đã ghi danh, học tiếp từ bài đang dở.' };

export default function CoursesApp({ currentUser }: { currentUser: UserAccount }) {
  const isAdmin = currentUser.role === 'admin';
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<PortfolioCourse[]>([]);
  const [coursesSettings, setCoursesSettings] = useState<PortfolioCoursesSettings | null>(null);
  const [globalSettings, setGlobalSettings] = useState<PortfolioGlobalSettings | null>(null);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [courseData, studentData, cs, gs, counts] = await Promise.all([
        getPortfolioCourses(), getCourseStudents(), getPortfolioCoursesSettings(), getPortfolioGlobalSettings(), getCourseStudentCounts(),
      ]);
      setCoursesSettings(cs);
      setGlobalSettings(gs);
      setCourses(courseData
        .filter(c => c.status === 'published' || isAdmin)
        .map(c => ({
          ...c,
          // Chỉ chứa dòng ghi danh của chính người đang xem, dùng để mở khoá bài học.
          students: studentData.filter(s => s.courseId === c.id),
          studentsCount: counts[c.id] ?? c.studentsCount ?? 0,
        })));
    } catch {
      notice('Không tải được danh sách khoá học, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  useEffect(() => { if (tab !== 'manage') load(); }, [tab, load]);

  const toCard = (c: PortfolioCourse): CollectionCard => ({
    id: c.id, type: 'course', title: c.title, description: c.briefDescription, image: c.coverImage, video: c.introVideo,
    category: c.category || 'Khoá học', date: c.publishDate, views: c.viewCount || 0, featured: false,
    detail: { type: 'course', data: c },
  });
  const allCards = useMemo(() => courses.filter(c => c.status === 'published').map(toCard), [courses]);
  const myCards = useMemo(() => courses
    .filter(c => (c.students || []).some(s => s.accountId === currentUser.id || s.studentEmail === currentUser.email))
    .map(toCard), [courses, currentUser.id, currentUser.email]);

  const updateCourse = (c: PortfolioCourse) => {
    setCourses(prev => prev.map(x => (x.id === c.id ? c : x)));
    setDetail(d => (d && d.type === 'course' && d.data.id === c.id ? { type: 'course', data: c } : d));
  };

  const enroll = async (course: PortfolioCourse) => {
    setRegistering(true);
    try {
      const ok = await enrollCourse(course, currentUser);
      if (!ok) { notice('Chưa ghi danh được, vui lòng thử lại.'); return; }
      const id = `${currentUser.id}_${course.id}`;
      const row: CourseStudent = {
        id, accountId: currentUser.id, studentName: currentUser.fullName, studentEmail: currentUser.email,
        courseId: course.id, paymentStatus: 'paid', registrationDate: new Date().toISOString(), progress: 0, completedLessons: [],
      };
      const exists = (course.students || []).some(s => s.id === id);
      updateCourse({ ...course, students: exists ? (course.students || []).map(s => (s.id === id ? row : s)) : [...(course.students || []), row] });
      notice('Đã ghi danh, bạn có thể bắt đầu học.', 'info');
    } catch {
      notice('Ghi danh không thành công, vui lòng kiểm tra mạng rồi thử lại.');
    } finally {
      setRegistering(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'all', label: 'Tất cả khoá học', icon: Library },
    { id: 'mine', label: 'Khoá học của tôi', icon: BookOpen },
    ...(isAdmin ? [{ id: 'manage' as Tab, label: 'Quản lý khoá học', icon: Settings2 }] : []),
  ];

  // Đang mở một khoá học: trang học bài toàn khung.
  if (detail) {
    const related = allCards.filter(c => c.id !== detail.data.id);
    return (
      <div className="-m-4 sm:-m-6 md:-m-8">
        <PortfolioDetailPage
          item={detail}
          viewer={currentUser}
          related={related}
          onOpen={setDetail}
          onBack={() => setDetail(null)}
          globalSettings={globalSettings}
          onUpdateCourse={updateCourse}
          onEnroll={enroll}
          registering={registering}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <PageHeader icon={<GraduationCap size={22} />} title="Khoá học" description="Học các khoá do EduGo biên soạn, theo dõi tiến độ và làm bài kiểm tra ngay trong khoá." />

      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex w-max gap-1 rounded-2xl bg-slate-100 p-1">
          {tabs.map(t => {
            const Icon = t.icon; const on = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-semibold transition-all ${on ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon className={`h-4 w-4 ${on ? 'text-brand' : ''}`} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'manage' && isAdmin ? (
        <ProjectsCoursesCMS initialSubTab="courses" showSubTabs={false} />
      ) : loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" /> Đang tải khoá học...</div>
      ) : (tab === 'mine' ? myCards : allCards).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">{tab === 'mine' ? 'Bạn chưa ghi danh khoá học nào' : 'Chưa có khoá học nào được phát hành'}</p>
          {tab === 'mine' && <button onClick={() => setTab('all')} className="mt-3 text-[13px] font-semibold text-brand hover:underline">Xem tất cả khoá học</button>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
          <PortfolioCollectionPage
            page={tab === 'mine' ? 'my-courses' : 'courses'}
            cards={tab === 'mine' ? myCards : allCards}
            onOpen={setDetail}
            metaOverride={tab === 'mine' ? META_MINE : META_ALL}
            coursesSettings={coursesSettings}
            onEnroll={enroll}
            registering={registering}
            viewer={currentUser}
          />
        </div>
      )}
    </div>
  );
}
