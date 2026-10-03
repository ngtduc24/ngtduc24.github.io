import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Loader2, BookOpen, Settings2, Library, ChevronLeft } from 'lucide-react';
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
import { usePhoneMaybe } from '../phone/PhoneShell';
import PhoneCourses from './PhoneCourses';

// Ứng dụng Khoá học: admin tạo và quản lý khoá học, mọi tài khoản vào học các khoá admin đã phát hành.
// Không có công tắc trong trang Phân quyền: ai đăng nhập cũng học được, chỉ admin thấy mục Quản lý.

type Tab = 'all' | 'mine' | 'manage';

const META_ALL = { label: 'Khoá học', eyebrow: 'EduGo', title: 'Khoá học trực tuyến', description: 'Các khoá học do EduGo biên soạn, học theo video, học liệu và bài kiểm tra.' };
const META_MINE = { label: 'Khoá học của tôi', eyebrow: 'EduGo', title: 'Khoá học của tôi', description: 'Các khoá bạn đã ghi danh, học tiếp từ bài đang dở.' };

export default function CoursesApp({ currentUser }: { currentUser: UserAccount }) {
  const isAdmin = currentUser.role === 'admin';
  const phone = usePhoneMaybe();
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

  // Mở thẳng một khoá từ link chia sẻ (?course=<mã>).
  const [pendingCourse, setPendingCourse] = useState<string | null>(() => new URLSearchParams(window.location.search).get('course'));
  useEffect(() => {
    if (phone || !pendingCourse || !courses.length) return;
    const c = courses.find(x => x.id === pendingCourse);
    if (c) setDetail({ type: 'course', data: c });
    setPendingCourse(null);
  }, [pendingCourse, courses]);

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
      updateCourse({ ...course, studentsCount: (course.studentsCount || 0) + (exists ? 0 : 1), students: exists ? (course.students || []).map(s => (s.id === id ? row : s)) : [...(course.students || []), row] });
      notice('Đã đăng ký khoá học, bạn có thể bắt đầu học.', 'info');
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

  // Điện thoại: giao diện riêng (danh sách, trang khoá học, màn học bài) theo bản mẫu đã duyệt.
  if (phone) {
    return <PhoneCourses user={currentUser} courses={courses} loading={loading} onEnroll={enroll} registering={registering} onUpdateCourse={updateCourse} settings={coursesSettings} />;
  }
  // Máy tính: cùng giao diện mới (bố cục rộng), riêng admin bấm Quản lý khoá học thì mở trang quản lý cũ.
  if (tab !== 'manage') {
    return <PhoneCourses desktop user={currentUser} courses={courses} loading={loading} onEnroll={enroll} registering={registering} onUpdateCourse={updateCourse} settings={coursesSettings}
      onManage={isAdmin ? () => setTab('manage') : undefined} />;
  }
  if (isAdmin) {
    return (
      <div className="space-y-5 animate-fadeIn">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setTab('all')} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            <ChevronLeft className="h-4 w-4" /> Về trang Khoá học
          </button>
          <h1 className="text-xl font-bold text-slate-900">Quản lý khoá học</h1>
        </div>
        <ProjectsCoursesCMS initialSubTab="courses" showSubTabs={false} />
      </div>
    );
  }

  return null;
}
