import sys

file_path = 'src/components/PortfolioWebsite.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The block to replace starts at line 376 (index 375) and ends at line 493 (index 492)
# Verified in view_file:
# 376: function PortfolioDetailPage
# 492:       )}

new_block = """function PortfolioDetailPage({ item, related, onOpen, viewer, onBack, globalSettings }: { item: DetailItem; related: CollectionCard[]; onOpen: (item: DetailItem) => void; viewer?: UserAccount | null; onBack?: () => void; globalSettings: PortfolioGlobalSettings | null }) {
  const course = item.type === 'course' ? item.data : null;
  const courseChapters = course?.chapters || [];
  const courseLessons = courseChapters.flatMap(chapter => chapter.lessons || []);
  const enrollment = course?.students?.find(student =>
    Boolean(viewer) && (student.accountId === viewer?.id || student.email === viewer?.email || student.studentEmail === viewer?.email)
  );
  const canLearn = Boolean(course && viewer && (viewer.role === 'admin' || (viewer.role === 'member' && enrollment && !enrollment.isLocked)));
  const progressStorageKey = course && viewer ? `portfolio_course_progress_${viewer.id}_${course.id}` : '';
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(courseLessons[0]?.id || null);

  useEffect(() => {
    if (!course || !viewer) {
      setCompletedLessonIds([]);
      setActiveLessonId(null);
      return;
    }
    let stored: string[] = [];
    try { stored = JSON.parse(localStorage.getItem(progressStorageKey) || '[]'); } catch { stored = []; }
    const saved = enrollment?.completedLessons || [];
    setCompletedLessonIds(Array.from(new Set([...saved, ...stored])));
    setActiveLessonId(courseLessons[0]?.id || null);
  }, [course?.id, viewer?.id, enrollment?.id, progressStorageKey]);

  const activeLesson = courseLessons.find(lesson => lesson.id === activeLessonId);
  const courseProgress = courseLessons.length
    ? Math.round((completedLessonIds.filter(id => courseLessons.some(lesson => lesson.id === id)).length / courseLessons.length) * 100)
    : 0;

  const toggleLessonComplete = async (lessonId: string) => {
    if (!course || !viewer || !canLearn) return;
    const next = completedLessonIds.includes(lessonId)
      ? completedLessonIds.filter(id => id !== lessonId)
      : [...completedLessonIds, lessonId];
    setCompletedLessonIds(next);
    localStorage.setItem(progressStorageKey, JSON.stringify(next));
    if (enrollment) {
      await saveCourseStudent({
        ...enrollment,
        courseId: course.id,
        completedLessons: next,
        progress: courseLessons.length ? Math.round((next.length / courseLessons.length) * 0) : 0,
        completionDate: next.length === courseLessons.length && courseLessons.length ? new Date().toISOString() : undefined
      });
    }
  };

  const title = item.type === 'research' ? item.data.titleVi : item.data.title;
  const cover = item.type === 'article' || item.type === 'project' || item.type === 'course' || item.type === 'research' ? item.data.coverImage : item.data.images?.[0];
  const video = item.type === 'project' || item.type === 'course' ? item.data.introVideo : null;
  
  const category = item.type === 'project' ? item.data.category : item.type === 'course' ? item.data.category : item.type === 'research' ? (item.data.field || researchTypeLabel[item.data.type]) : item.type === 'lecture' ? (item.data.subject || lectureTypeLabel[item.data.documentType]) : item.data.category;

  const infoItems = useMemo(() => {
    if (item.type === 'project') {
      return [
        { icon: Layout, label: 'Thể loại', value: item.data.tags?.[0] || item.data.category || 'Chưa cập nhật' },
        { icon: CalendarDays, label: 'Năm thực hiện', value: item.data.timeline || 'Chưa cập nhật' },
        { icon: Wrench, label: 'Công cụ', value: item.data.tools?.slice(0, 2).join(', ') || 'Chưa cập nhật' },
        { icon: Layers, label: 'Danh mục', value: item.data.category || 'Chưa cập nhật' }
      ];
    }
    if (item.type === 'course') {
      return [
        { icon: BookOpen, label: 'Trình độ', value: levelLabel[item.data.level] || 'Chưa cập nhật' },
        { icon: Users, label: 'Học viên', value: `${item.data.studentsCount?.toLocaleString('vi-VN') || 0} người` },
        { icon: Play, label: 'Bài giảng', value: `${item.data.lessonsCount || 0} bài` },
        { icon: Layers, label: 'Danh mục', value: item.data.category || 'Chưa cập nhật' }
      ];
    }
    return [];
  }, [item]);

  const glassStyle = globalSettings?.menuGlassEffect ? 'backdrop-blur-xl' : '';
  const opacityHex = globalSettings ? Math.round((globalSettings.menuOpacity / 100) * 255).toString(16).padStart(2, '0') : 'f2';
  const bgColor = globalSettings ? `#ffffff${opacityHex}` : 'white';

  return (
    <div className="bg-white">
      {/* 1. Hero Banner Style */}
      <section className="relative h-[60vh] min-h-[400px] w-full overflow-hidden bg-slate-950 sm:h-[70vh]">
        {video ? (
          <video key={video} src={video} poster={cover} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-60" />
        ) : cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        
        {/* Back button */}
        <div className={sectionShell + " relative z-20 pt-28"}>
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition-colors">
            <ArrowRight className="h-4 w-4 rotate-180" /> Quay lại
          </button>
        </div>
      </section>
 
      {/* 2. Info Block Bento Grid Style */}
      {(item.type === 'project' || item.type === 'course') && (
        <div className={`${sectionShell} relative z-30 -mt-20`}>
          <div 
            className={`mx-auto grid max-w-5xl overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-900/20 sm:grid-cols-2 lg:grid-cols-4 ${glassStyle}`}
            style={{ backgroundColor: bgColor }}
          >
            {infoItems.map((info, idx) => (
              <div key={idx} className={`group flex items-start gap-4 p-6 transition-colors hover:bg-emerald-50/50 sm:p-8 ${idx < 3 ? 'border-b sm:border-r lg:border-b-0' : ''} border-slate-100`}>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                  <info.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{info.label}</p>
                  <h3 className="mt-1 text-sm font-black text-slate-950">{info.value}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
"""

# We replace lines 376 to 492 (index 375 to 492)
lines[375:492] = [line + '\\n' for line in new_block.split('\\n')]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
