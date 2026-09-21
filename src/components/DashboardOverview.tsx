import React, { useState, useEffect, useRef } from 'react';
import MediaSourcePicker from './MediaSourcePicker';
import {
  Calculator, Settings, Users, BookOpen, Search, X, Database, Sparkles,
  CalendarDays, BarChart3, GraduationCap, Wrench, FolderKanban, Mail,
  Library, Image as ImageIcon, LayoutGrid, ArrowRight, Bell, ChevronDown,
  Home, FileText, CheckCircle2, ClipboardList, Scan, LayoutTemplate, Megaphone, Minus, Eye, Shield, Plus, Clapperboard, FileArchive
} from 'lucide-react';
import {
  getStatsFromSupabase,
  getJournalsFromSupabase,
  getNotificationsFromSupabase,
  saveDefaultSettingsToSupabase,
  saveUser
} from '../lib/data';
import { useTasks } from './TaskContext';
import { isModuleHidden, resolveModuleMeta } from '../lib/modules';
import { UserAccount, AppSettings, ScientificJournal, AppNotification } from '../types';
import { isTaskRelevantToUser } from '../lib/tasks';
import { useNotifications } from './NotificationContext';

interface DashboardProps {
  onSwitchTab: (tab: string) => void;
  settings?: AppSettings;
  users: UserAccount[];
  currentUser: UserAccount;
  onRefreshSettings?: () => Promise<void>;
}

// Bảng màu theo ảnh mẫu cho từng chức năng. Nút hệ thống dùng màu thương hiệu (brand),
// còn biểu tượng và thẻ chức năng dùng các màu theo ảnh mẫu.
const COLORS: Record<string, { bg: string; text: string }> = {
  rose: { bg: 'bg-rose-100', text: 'text-rose-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-500' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-600' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  red: { bg: 'bg-red-100', text: 'text-red-500' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-500' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-500' },
};

function timeAgo(ts?: string) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

export default function DashboardOverview({ onSwitchTab, settings, users, currentUser, onRefreshSettings }: DashboardProps) {
  const { addNotification } = useNotifications();
  const { tasks } = useTasks();

  const [showBannerSettings, setShowBannerSettings] = useState(false);
  const [showDatabaseSettings, setShowDatabaseSettings] = useState(false);
  const [isUploading] = useState(false);
  const [bannerTitle, setBannerTitle] = useState(settings?.dashboardBannerTitle || '');
  const [bannerDesc, setBannerDesc] = useState(settings?.systemDescription || '');
  const [bannerImg, setBannerImg] = useState(settings?.dashboardBannerImage || '');
  const [bannerPos, setBannerPos] = useState(settings?.dashboardBannerPosition || '50% 50%');
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [dbConfig, setDbConfig] = useState(() => {
    const savedUrl = localStorage.getItem('custom_supabase_url');
    const savedKey = localStorage.getItem('custom_supabase_key');
    return {
      url: savedUrl || import.meta.env.VITE_SUPABASE_URL || '',
      key: savedKey || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    };
  });

  const [statsData, setStatsData] = useState<Record<string, number>>({ calculator: 0, public_search: 0 });
  const [journals, setJournals] = useState<ScientificJournal[]>([]);
  const [journalsCount, setJournalsCount] = useState<number>(0);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [search, setSearch] = useState('');

  // Thứ tự hàng biểu tượng chức năng do người dùng tự kéo thả sắp xếp, lưu theo tài khoản
  // trên máy chủ (Firestore) để đồng bộ giữa các thiết bị, kèm bộ nhớ cục bộ làm bộ đệm nhanh.
  const ORDER_KEY = `dashboard_icon_order_${currentUser?.id || 'anon'}`;
  const [iconOrder, setIconOrder] = useState<string[]>(() => {
    if (Array.isArray(currentUser?.dashboardIconOrder)) return currentUser!.dashboardIconOrder as string[];
    try { const raw = localStorage.getItem(ORDER_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Chỉ vào chế độ sắp xếp (kéo thả + hiện nút ẩn) sau khi nhấn giữ. Bình thường
  // rê chuột vẫn là con trỏ thường và bấm là mở chức năng.
  const [sortMode, setSortMode] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const dragIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);

  // Các biểu tượng chức năng ít dùng được người dùng ẩn bớt, lưu theo tài khoản trên máy chủ.
  const HIDDEN_KEY = `dashboard_icon_hidden_${currentUser?.id || 'anon'}`;
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    if (Array.isArray(currentUser?.dashboardIconHidden)) return currentUser!.dashboardIconHidden as string[];
    try { const raw = localStorage.getItem(HIDDEN_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });

  // Lưu thứ tự và danh sách ẩn lên tài khoản (Firestore) để mọi thiết bị dùng chung một
  // cách sắp xếp. Bộ nhớ cục bộ vẫn được ghi để hiển thị tức thì khi chưa tải xong tài khoản.
  const saveArrangementToAccount = (order: string[], hidden: string[]) => {
    if (!currentUser?.id) return;
    saveUser({ ...currentUser, dashboardIconOrder: order, dashboardIconHidden: hidden }).catch(() => {});
  };

  const persistHidden = (ids: string[]) => {
    setHiddenIds(ids);
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids)); } catch {}
    saveArrangementToAccount(iconOrder, ids);
  };
  const hideIcon = (id: string) => { if (!hiddenIds.includes(id)) persistHidden([...hiddenIds, id]); };
  const restoreHidden = () => persistHidden([]);
  // Hiện lại một phím tắt: bỏ khỏi danh sách ẩn và đảm bảo có trong thứ tự.
  const showShortcut = (id: string) => {
    const nextHidden = hiddenIds.filter(x => x !== id);
    setHiddenIds(nextHidden);
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(nextHidden)); } catch {}
    let nextOrder = iconOrder;
    if (!iconOrder.includes(id)) { nextOrder = [...iconOrder, id]; setIconOrder(nextOrder); try { localStorage.setItem(ORDER_KEY, JSON.stringify(nextOrder)); } catch {} }
    saveArrangementToAccount(nextOrder, nextHidden);
  };
  const toggleShortcut = (id: string) => { if (hiddenIds.includes(id)) showShortcut(id); else hideIcon(id); };

  // Nút dấu trừ chỉ hiện khi nhấn giữ vào biểu tượng.
  const [activeMinusId, setActiveMinusId] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const startPress = (id: string) => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => { longPressed.current = true; setSortMode(true); setActiveMinusId(id); beginDrag(id); }, 450);
  };
  const cancelPress = () => { if (pressTimer.current) { window.clearTimeout(pressTimer.current); pressTimer.current = null; } };
  const iconRowRef = useRef<HTMLDivElement>(null);
  // Bấm ra ngoài hàng biểu tượng thì thoát chế độ sắp xếp.
  useEffect(() => {
    if (!sortMode) return;
    const onDown = (e: PointerEvent) => {
      if (iconRowRef.current && !iconRowRef.current.contains(e.target as Node)) { setSortMode(false); setActiveMinusId(null); }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [sortMode]);

  // Khi tài khoản tải xong (hoặc đổi thiết bị), nhận cách sắp xếp đã lưu trên máy chủ một lần
  // cho mỗi tài khoản. Sau đó các thao tác cục bộ mới được ưu tiên và tự đẩy lên máy chủ.
  const hydratedUserRef = useRef<string | null>(null);
  useEffect(() => {
    const uid = currentUser?.id;
    if (!uid || hydratedUserRef.current === uid) return;
    const serverOrder = currentUser?.dashboardIconOrder;
    const serverHidden = currentUser?.dashboardIconHidden;
    // Chỉ nhận khi máy chủ thực sự có dữ liệu (đã tải xong hồ sơ tài khoản).
    if (Array.isArray(serverOrder) || Array.isArray(serverHidden)) {
      if (Array.isArray(serverOrder)) { setIconOrder(serverOrder); try { localStorage.setItem(ORDER_KEY, JSON.stringify(serverOrder)); } catch {} }
      if (Array.isArray(serverHidden)) { setHiddenIds(serverHidden); try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(serverHidden)); } catch {} }
      hydratedUserRef.current = uid;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.dashboardIconOrder, currentUser?.dashboardIconHidden]);

  useEffect(() => {
    if (settings) {
      setBannerTitle(settings.dashboardBannerTitle || '');
      setBannerDesc(settings.systemDescription || '');
      setBannerImg(settings.dashboardBannerImage || '');
      setBannerPos(settings.dashboardBannerPosition || '50% 50%');
    }
  }, [settings]);

  useEffect(() => {
    getStatsFromSupabase().then(setStatsData).catch(() => {});
    getJournalsFromSupabase().then(j => { setJournals(j); setJournalsCount(j.length); }).catch(() => {});
    getNotificationsFromSupabase().then(setNotifs).catch(() => {});
  }, []);

  const handleSaveDbConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('custom_supabase_url', dbConfig.url);
    localStorage.setItem('custom_supabase_key', dbConfig.key);
    setShowDatabaseSettings(false);
    addNotification('Đã lưu cấu hình Supabase. Vui lòng tải lại trang để áp dụng.', 'success');
    setTimeout(() => window.location.reload(), 1200);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await saveDefaultSettingsToSupabase({ ...settings, dashboardBannerTitle: bannerTitle, systemDescription: bannerDesc, dashboardBannerImage: bannerImg, dashboardBannerPosition: bannerPos });
      if (onRefreshSettings) await onRefreshSettings();
      setShowBannerSettings(false);
      addNotification('Đã lưu ảnh nền và nội dung đầu trang.', 'success');
    } catch (err) {
      addNotification('Lỗi lưu cấu hình: ' + (err as Error).message, 'error');
    }
  };

  const handleResetBanner = async () => {
    if (!settings) return;
    try {
      await saveDefaultSettingsToSupabase({ ...settings, dashboardBannerTitle: '', systemDescription: '', dashboardBannerImage: '', dashboardBannerPosition: '50% 50%' });
      if (onRefreshSettings) await onRefreshSettings();
      setBannerTitle(''); setBannerDesc(''); setBannerImg(''); setBannerPos('50% 50%');
      setShowBannerSettings(false);
      addNotification('Đã khôi phục đầu trang về mặc định.', 'success');
    } catch (err) {
      addNotification('Lỗi làm mới: ' + (err as Error).message, 'error');
    }
  };

  const isUserAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions || [];

  // Mở chức năng. Với phím tắt con của Giáo dục thì đặt sẵn màn hình đích rồi vào module edu.
  const go = (id: string) => {
    if (id === 'edu_bank' || id === 'edu_exam' || id === 'edu_grade' || id === 'edu_question_bank') {
      const map: Record<string, string> = { edu_bank: 'assignment_bank', edu_exam: 'exam_bank', edu_grade: 'grade_entry', edu_question_bank: 'question_bank' };
      try { localStorage.setItem('edu_initial_view', map[id]); } catch {}
      onSwitchTab('edu');
      return;
    }
    onSwitchTab(id);
  };
  const can = (id: string) => {
    if (isUserAdmin) return true;
    if (id === 'notifications') return true;
    if (id === 'utilities') return perms.includes('utilities') || perms.includes('ar_module') || perms.includes('utility_image_resize') || perms.includes('utility_social_design');
    if (id === 'ar_module') return perms.includes('ar_module') || perms.includes('utilities');
    if (id === 'utility_image_resize') return perms.includes('utility_image_resize') || perms.includes('utilities');
    if (id === 'utility_file_compress') return perms.includes('utility_file_compress') || perms.includes('utilities');
    if (id === 'utility_social_design') return perms.includes('utility_social_design') || perms.includes('utilities');
    // Phím tắt tới chức năng con trong Quản lý Giáo dục.
    if (id === 'edu_bank') return perms.includes('edu') && !!currentUser?.canCreateEdu;
    if (id === 'edu_exam') return perms.includes('edu') && !!currentUser?.canGradeEdu;
    if (id === 'edu_question_bank') return perms.includes('edu') && !!currentUser?.canGradeEdu;
    if (id === 'edu_grade') return perms.includes('edu') && !!currentUser?.canGradeImportEdu;
    if (id === 'users' || id === 'permissions') return false;
    return perms.includes(id);
  };

  // Danh sách chức năng theo ảnh mẫu, kèm màu và biểu tượng.
  const allModules = [
    { id: 'tasks', label: 'Quản lý công việc', desc: 'Tạo, theo dõi và quản lý công việc cá nhân/nhóm', icon: CalendarDays, color: 'rose' },
    { id: 'scientific_journals', label: 'Quản lý điểm báo khoa học', desc: 'Lưu trữ và phân loại điểm báo, bài viết', icon: BookOpen, color: 'orange' },
    { id: 'calculator', label: 'Tính cỡ mẫu nghiên cứu', desc: 'Hỗ trợ tính toán cỡ mẫu trong nghiên cứu', icon: LayoutGrid, color: 'violet' },
    { id: 'qualitative_analysis', label: 'Định tính', desc: 'Mã hóa, phân tích dữ liệu phỏng vấn, thảo luận nhóm', icon: ImageIcon, color: 'emerald' },
    { id: 'quantitative_analysis', label: 'Định lượng', desc: 'Phân tích thống kê, trực quan hóa dữ liệu', icon: BarChart3, color: 'blue' },
    { id: 'edu', label: 'Quản lý Giáo dục', desc: 'Quản lý lớp học, sinh viên, chương trình đào tạo', icon: GraduationCap, color: 'purple' },
    { id: 'edu_bank', label: 'Ngân hàng bài tập', desc: 'Kho bài tập dùng lại và chia sẻ theo môn', icon: Library, color: 'amber' },
    { id: 'edu_exam', label: 'Trắc nghiệm', desc: 'Tạo và chấm đề kiểm tra trắc nghiệm', icon: CheckCircle2, color: 'blue' },
    { id: 'edu_question_bank', label: 'Ngân hàng câu hỏi', desc: 'Kho câu hỏi trắc nghiệm dùng lại và chia sẻ theo môn', icon: Library, color: 'teal' },
    { id: 'edu_grade', label: 'Nhập điểm', desc: 'Nhập điểm vào file .fg của phần mềm trường', icon: ClipboardList, color: 'emerald' },
    { id: 'elearning', label: 'E-Learning', desc: 'Soạn, lưu trữ và chia sẻ bài giảng theo môn', icon: BookOpen, color: 'orange' },
    { id: 'remier', label: 'Remier · Dựng phim', desc: 'Dựng video nhiều lớp trên trình duyệt', icon: Clapperboard, color: 'rose' },
    { id: 'ar_module', label: 'Tạo AR', desc: 'Tạo điểm ảnh AR kèm mã QR để quét bằng điện thoại', icon: Scan, color: 'red' },
    { id: 'utility_image_resize', label: 'Phóng to ảnh', desc: 'Phóng to và làm rõ chi tiết ảnh theo tỉ lệ tùy chọn', icon: ImageIcon, color: 'blue' },
    { id: 'utility_file_compress', label: 'Giảm dung lượng file', desc: 'Nén PDF, JPG, PNG mà vẫn giữ chất lượng tốt', icon: FileArchive, color: 'emerald' },
    { id: 'utility_social_design', label: 'Thiết kế ảnh', desc: 'Tạo nhanh ảnh cho bài báo, tin tức từ khung mẫu có sẵn', icon: LayoutTemplate, color: 'violet' },
    { id: 'portfolio_cms', label: 'Quản trị Portfolio', desc: 'Lưu trữ và quản lý hồ sơ cá nhân, dự án', icon: FolderKanban, color: 'teal' },
    { id: 'assistant', label: 'Trợ lý giáo dục', desc: 'Hỏi đáp kiến thức bài học từ nội dung công khai', icon: Sparkles, color: 'violet' },
    { id: 'notifications', label: 'Thông báo', desc: 'Tài liệu, mẫu biểu, dữ liệu tham khảo', icon: Mail, color: 'amber' },
    { id: 'users', label: 'Quản lý người dùng', desc: 'Tạo, chỉnh sửa tài khoản trên hệ thống', icon: Users, color: 'indigo' },
    { id: 'permissions', label: 'Phân quyền người dùng', desc: 'Cấp quyền truy cập chức năng chi tiết', icon: Shield, color: 'teal' },
    { id: 'settings', label: 'Cấu hình hệ thống', desc: 'Quản trị hệ thống, phân quyền người dùng', icon: Settings, color: 'rose' },
  ];
  // Lọc theo quyền, bỏ chức năng bị admin ẩn, rồi áp tên, mô tả và ảnh icon do admin tùy chỉnh.
  const baseIcons = allModules
    .filter(m => can(m.id))
    .filter(m => !isModuleHidden(m.id, settings))
    .map(m => resolveModuleMeta(m, settings));
  // Sắp xếp lại theo thứ tự người dùng đã kéo thả, mục chưa có trong thứ tự thì giữ nguyên phía sau.
  const iconModules = [...baseIcons].sort((a, b) => {
    const ia = iconOrder.indexOf(a.id); const ib = iconOrder.indexOf(b.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  // Thẻ nổi bật theo ảnh mẫu, không gồm Quản lý & Phân quyền và Thư viện.
  const cardModules = iconModules.filter(m => m.id !== 'users' && m.id !== 'permissions' && m.id !== 'media_library');
  const q = search.trim().toLowerCase();
  const visibleIcons = iconModules.filter(m => !hiddenIds.includes(m.id));
  const filteredIcons = q ? iconModules.filter(m => m.label.toLowerCase().includes(q)) : visibleIcons;
  // Hàng phím tắt đầu trang chỉ hiện tối đa 12 nút. Khi tìm kiếm thì hiện đủ kết quả khớp.
  const rowIcons = q ? filteredIcons : filteredIcons.slice(0, 12);
  // Trang chủ chỉ hiển thị tối đa 10 thẻ nổi bật, phần còn lại xem ở trang Tất cả tính năng.
  const filteredCards = q ? cardModules.filter(m => m.label.toLowerCase().includes(q)) : cardModules.slice(0, 10);

  const persistOrder = (ids: string[]) => {
    setIconOrder(ids);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch {}
    saveArrangementToAccount(ids, hiddenIds);
  };
  // Sắp xếp lại theo id nguồn và id đích (dùng cho kéo thả bằng con trỏ).
  const reorder = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    const ids = iconModules.map(m => m.id);
    const from = ids.indexOf(sourceId); const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    persistOrder(ids);
  };

  // Bắt đầu kéo một biểu tượng và theo dõi con trỏ tới khi thả.
  const beginDrag = (id: string) => {
    setDragId(id); dragIdRef.current = id;
  };
  useEffect(() => {
    if (!dragId) return;
    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const iconEl = el?.closest('[data-icon-id]') as HTMLElement | null;
      const id = iconEl?.getAttribute('data-icon-id') || null;
      const next = id && id !== dragIdRef.current ? id : null;
      overIdRef.current = next; setOverId(next);
    };
    const onUp = () => {
      if (dragIdRef.current && overIdRef.current && dragIdRef.current !== overIdRef.current) {
        reorder(dragIdRef.current, overIdRef.current);
      }
      dragIdRef.current = null; overIdRef.current = null;
      setDragId(null); setOverId(null);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);

  // Kéo sắp xếp thẻ Tính năng nổi bật. Nhấn giữ để vào chế độ sắp xếp rồi kéo thả, dùng chung
  // thứ tự với hàng phím tắt ở trên nên sắp xếp một nơi thì đồng bộ cả hai.
  const [cardSortMode, setCardSortMode] = useState(false);
  const [cardDragId, setCardDragId] = useState<string | null>(null);
  const [cardOverId, setCardOverId] = useState<string | null>(null);
  const cardDragRef = useRef<string | null>(null);
  const cardOverRef = useRef<string | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardPressTimer = useRef<number | null>(null);
  const cardLongPressed = useRef(false);
  const beginCardDrag = (id: string) => { setCardDragId(id); cardDragRef.current = id; };
  const startCardPress = (id: string) => {
    if (cardPressTimer.current) window.clearTimeout(cardPressTimer.current);
    cardPressTimer.current = window.setTimeout(() => { cardLongPressed.current = true; setCardSortMode(true); beginCardDrag(id); }, 400);
  };
  const cancelCardPress = () => { if (cardPressTimer.current) { window.clearTimeout(cardPressTimer.current); cardPressTimer.current = null; } };

  useEffect(() => {
    if (!cardDragId) return;
    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const cardEl = el?.closest('[data-card-id]') as HTMLElement | null;
      const id = cardEl?.getAttribute('data-card-id') || null;
      const next = id && id !== cardDragRef.current ? id : null;
      cardOverRef.current = next; setCardOverId(next);
    };
    const onUp = () => {
      if (cardDragRef.current && cardOverRef.current && cardDragRef.current !== cardOverRef.current) {
        reorder(cardDragRef.current, cardOverRef.current);
      }
      cardDragRef.current = null; cardOverRef.current = null;
      setCardDragId(null); setCardOverId(null);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDragId]);

  // Bấm ra ngoài khu vực thẻ thì thoát chế độ sắp xếp thẻ.
  useEffect(() => {
    if (!cardSortMode) return;
    const onDown = (e: PointerEvent) => { if (cardsRef.current && !cardsRef.current.contains(e.target as Node)) setCardSortMode(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [cardSortMode]);

  const visibleTasks = tasks.filter(t => !t.isDeleted && isTaskRelevantToUser(t, currentUser));
  const runningTasks = visibleTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
  const completedCount = (isUserAdmin ? tasks.filter(t => !t.isDeleted) : visibleTasks).filter(t => t.status === 'Completed').length;
  const recentTasks = [...visibleTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
  const unreadCount = notifs.filter(n => !n.isRead).length;

  const statusBadge = (status: string) => {
    if (status === 'Completed') return { label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    if (status === 'Paused') return { label: 'Tạm dừng', cls: 'bg-amber-50 text-amber-600 border-amber-200' };
    if (status === 'Cancelled') return { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
    if (status === 'Pending') return { label: 'Chờ duyệt', cls: 'bg-orange-50 text-orange-600 border-orange-200' };
    return { label: 'Đang thực hiện', cls: 'bg-blue-50 text-blue-600 border-blue-200' };
  };

  const tiles = [
    { label: 'Công việc đang thực hiện', value: runningTasks.length, icon: CalendarDays, color: 'blue' },
    { label: 'Tài liệu trong thư viện', value: journalsCount, icon: FileText, color: 'emerald' },
    { label: 'Điểm báo trong hệ thống', value: journalsCount, icon: ImageIcon, color: 'violet' },
    { label: 'Thông báo chưa đọc', value: unreadCount, icon: Bell, color: 'rose' },
  ];

  const hasBg = !!settings?.dashboardBannerImage;

  return (
    <div className="space-y-8">
      {/* ===== Hero đầu trang ===== */}
      <div
        className="relative overflow-hidden rounded-3xl border border-slate-100"
        style={hasBg
          ? { backgroundImage: `url(${settings!.dashboardBannerImage})`, backgroundSize: 'cover', backgroundPosition: settings!.dashboardBannerPosition || 'center' }
          : { background: 'linear-gradient(135deg, var(--color-brand-light, #eef2ff) 0%, #ffffff 55%, var(--color-brand-light, #f5f3ff) 100%)' }}
      >
        {hasBg && <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/25 to-white/45" />}

        {isUserAdmin && (
          <button
            onClick={() => setShowBannerSettings(true)}
            title="Đổi ảnh nền đầu trang"
            className="absolute top-4 right-4 z-20 p-2 bg-white/70 hover:bg-white text-slate-500 hover:text-brand rounded-xl shadow-sm transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}

        <div className="relative z-10 px-6 pt-6 pb-8 md:px-10 flex flex-col items-center text-center gap-3">
          <div className="w-full max-w-2xl space-y-4">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight font-display text-brand">
              Chào mừng trở lại, {currentUser?.fullName}
            </h1>
            <p className="text-lg md:text-xl font-black text-slate-800">{settings?.dashboardBannerTitle || 'Hôm nay bạn muốn làm gì?'}</p>
            <p className="text-sm text-slate-500 font-medium">{settings?.systemDescription || 'Tìm nhanh công cụ, tính năng hoặc tài liệu phục vụ học tập và nghiên cứu.'}</p>

            {/* Ô tìm kiếm căn giữa trang */}
            <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 w-full max-w-xl mx-auto">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm chức năng, tài liệu, biểu mẫu..."
                className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 py-2.5"
              />
              <button className="bg-brand hover:bg-brand-hover text-white text-sm font-bold px-6 py-2.5 rounded-xl shrink-0 transition-colors">Tìm kiếm</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Hàng biểu tượng chức năng (kéo thả để sắp xếp, ẩn bớt mục ít dùng) ===== */}
      {rowIcons.length > 0 && (
        <div>
          {/* Luôn giữ 1 hàng phím tắt trên mọi thiết bị. Vừa màn thì canh giữa,
              hẹp hơn thì cuộn ngang, không xuống nhiều hàng. */}
          <div ref={iconRowRef} className="overflow-x-auto scrollbar-none">
          <div className="flex w-max mx-auto gap-4 px-1 pb-1">
            {rowIcons.map(m => {
              const Icon = m.icon; const c = COLORS[m.color];
              const isDragging = dragId === m.id;
              const isOver = overId === m.id && dragId !== m.id;
              const showMinus = !q && sortMode;
              return (
                <div
                  key={m.id}
                  data-icon-id={m.id}
                  draggable={false}
                  onPointerDown={(e) => {
                    if (q) return;
                    if (sortMode) { e.preventDefault(); beginDrag(m.id); }
                    else startPress(m.id);
                  }}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onClick={() => {
                    if (longPressed.current) { longPressed.current = false; return; }
                    if (sortMode) return; // đang sắp xếp thì bấm không mở chức năng
                    if (!dragId) go(m.id);
                  }}
                  title={m.label}
                  className={`group relative flex w-[84px] shrink-0 flex-col items-center gap-2 text-center rounded-2xl p-1 transition-all select-none ${sortMode ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-pointer'} ${isDragging ? 'opacity-40' : ''} ${isOver ? 'ring-2 ring-brand ring-offset-2 rounded-2xl' : ''}`}
                >
                  {showMinus && (
                    <button
                      type="button"
                      draggable={false}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setActiveMinusId(null); hideIcon(m.id); }}
                      title={`Ẩn "${m.label}"`}
                      aria-label={`Ẩn ${m.label}`}
                      className="absolute -top-1 right-2 z-10 grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:text-slate-700"
                    >
                      <Minus className="h-3 w-3" strokeWidth={3} />
                    </button>
                  )}
                  <span className={`w-14 h-14 rounded-2xl ${c.bg} ${c.text} grid place-items-center shadow-sm group-hover:scale-105 transition-transform pointer-events-none overflow-hidden`}>
                    {(m as any).iconUrl ? <img src={(m as any).iconUrl} alt="" className="w-full h-full object-cover" /> : <Icon className="w-7 h-7" />}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 leading-tight line-clamp-2 group-hover:text-brand pointer-events-none">{m.label}</span>
                </div>
              );
            })}
            {/* Ô vuông dấu + chỉ hiện khi đang ở chế độ sắp xếp, bấm để thêm phím tắt. */}
            {!q && sortMode && (
              <button onClick={() => setShowAddPicker(true)} title="Thêm phím tắt" className="flex w-[84px] shrink-0 flex-col items-center gap-2 rounded-2xl p-1">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand hover:text-brand">
                  <Plus className="h-7 w-7" />
                </span>
                <span className="text-[11px] font-bold text-slate-400 leading-tight">Thêm</span>
              </button>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Popup chọn chức năng để thêm vào phím tắt đầu trang */}
      {showAddPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowAddPicker(false)}>
          <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">Thêm phím tắt đầu trang</h3>
                <p className="text-[11px] text-slate-400">Chọn chức năng muốn hiện ở hàng phím tắt.</p>
              </div>
              <button onClick={() => setShowAddPicker(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {baseIcons.map(m => {
                const Icon = m.icon; const c = COLORS[m.color]; const shown = !hiddenIds.includes(m.id);
                return (
                  <button key={m.id} onClick={() => toggleShortcut(m.id)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${shown ? 'border-brand/30 bg-brand-light' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl overflow-hidden ${c.bg} ${c.text}`}>{(m as any).iconUrl ? <img src={(m as any).iconUrl} alt="" className="h-full w-full object-cover" /> : <Icon className="h-4.5 w-4.5" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-slate-800">{m.label}</span>
                      <span className="block truncate text-[10px] text-slate-400">{m.desc}</span>
                    </span>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${shown ? 'bg-brand text-white' : 'border border-slate-300 text-transparent'}`}>{shown ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-4">
              {hiddenIds.length > 0 ? <button onClick={restoreHidden} className="text-[11px] font-bold text-brand hover:underline">Hiện lại tất cả</button> : <span />}
              <button onClick={() => setShowAddPicker(false)} className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-hover">Xong</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Tính năng nổi bật ===== */}
      {filteredCards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand grid place-items-center"><LayoutGrid className="w-5 h-5" /></div>
              <div>
                <h2 className="text-lg font-black text-slate-900 font-display">Tính năng nổi bật</h2>
                <p className="text-[11px] text-slate-400 font-medium">Truy cập nhanh các chức năng thường dùng</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {cardSortMode && <button onClick={() => setCardSortMode(false)} className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-hover">Xong</button>}
              <button onClick={() => onSwitchTab('all_features')} className="text-xs font-bold text-brand hover:underline">Xem tất cả</button>
            </div>
          </div>
          {cardSortMode && <p className="text-[11px] font-semibold text-brand">Đang sắp xếp. Kéo thả thẻ để đổi vị trí, bấm Xong khi hoàn tất.</p>}
          <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {filteredCards.map(m => {
              const Icon = m.icon; const c = COLORS[m.color];
              const isDragging = cardDragId === m.id;
              const isOver = cardOverId === m.id && cardDragId !== m.id;
              return (
                <button
                  key={m.id}
                  data-card-id={m.id}
                  onPointerDown={(e) => { if (q) return; if (cardSortMode) { e.preventDefault(); beginCardDrag(m.id); } else startCardPress(m.id); }}
                  onPointerUp={cancelCardPress}
                  onPointerLeave={cancelCardPress}
                  onClick={() => { if (cardLongPressed.current) { cardLongPressed.current = false; return; } if (cardSortMode || cardDragId) return; go(m.id); }}
                  className={`group text-left bg-white rounded-2xl border shadow-xs transition-all p-4 flex items-start gap-3 select-none ${cardSortMode ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-pointer hover:shadow-md hover:border-brand/30'} ${isDragging ? 'opacity-40' : ''} ${isOver ? 'ring-2 ring-brand ring-offset-2 border-brand/30' : 'border-slate-100'}`}
                >
                  <span className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} grid place-items-center shrink-0 overflow-hidden pointer-events-none`}>{(m as any).iconUrl ? <img src={(m as any).iconUrl} alt="" className="w-full h-full object-cover" /> : <Icon className="w-5 h-5" />}</span>
                  <div className="min-w-0 flex-1 pointer-events-none">
                    <h3 className="text-[13px] font-black text-slate-800 leading-tight group-hover:text-brand transition-colors">{m.label}</h3>
                    <p className="text-[10.5px] text-slate-400 font-medium leading-snug mt-1 line-clamp-2">{m.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0 pointer-events-none" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Ba cột dưới: Công việc gần đây, Thông báo mới, Thống kê tổng quan.
              Tạm ẩn khi đang tìm kiếm, hiện lại khi xoá nội dung tìm kiếm. ===== */}
      {!q && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Công việc gần đây */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand" />
              <h3 className="text-sm font-black text-slate-800">Công việc gần đây</h3>
            </div>
            <button onClick={() => onSwitchTab('tasks')} className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1">Xem tất cả <ArrowRight className="w-3 h-3" /></button>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">Chưa có công việc nào.</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map(t => {
                const b = statusBadge(t.status);
                return (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                    <span className="text-[13px] font-semibold text-slate-700 truncate flex-1">{t.name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${b.cls}`}>{b.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 hidden sm:block">{t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Thông báo mới */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand" />
              <h3 className="text-sm font-black text-slate-800">Thông báo mới</h3>
            </div>
            <button onClick={() => onSwitchTab('notifications')} className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1">Xem tất cả <ArrowRight className="w-3 h-3" /></button>
          </div>
          {(isUserAdmin || perms.includes('notifications')) && (
            <button
              onClick={() => onSwitchTab('notifications_admin')}
              className="mb-4 w-full flex items-center gap-3 rounded-xl bg-brand-light/60 hover:bg-brand-light text-left px-3 py-2.5 transition-colors border border-brand/10"
            >
              <span className="w-8 h-8 rounded-lg bg-brand text-white grid place-items-center shrink-0"><Megaphone className="w-4 h-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-black text-slate-800 leading-tight">Trung tâm thông báo</span>
                <span className="block text-[10px] text-slate-500 font-medium">Quản lý và phát thông báo tới người dùng</span>
              </span>
              <ArrowRight className="w-4 h-4 text-brand shrink-0" />
            </button>
          )}
          {notifs.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">Chưa có thông báo nào.</p>
          ) : (
            <div className="space-y-3.5">
              {notifs.slice(0, 3).map((n, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-700 truncate">{n.title}</p>
                    {n.description && <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{n.description}</p>}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">{timeAgo(n.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thống kê tổng quan */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand" />
              <h3 className="text-sm font-black text-slate-800">Thống kê tổng quan</h3>
            </div>
            <button onClick={() => onSwitchTab('stats')} className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1">Chi tiết <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((t, i) => {
              const Icon = t.icon; const c = COLORS[t.color];
              return (
                <div key={i} className="rounded-xl border border-slate-100 p-3.5">
                  <span className={`w-8 h-8 rounded-lg ${c.bg} ${c.text} grid place-items-center mb-2`}><Icon className="w-4 h-4" /></span>
                  <p className="text-2xl font-black text-slate-800 leading-none">{t.value}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 leading-tight">{t.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* ===== Modal đổi ảnh nền và nội dung đầu trang (admin) ===== */}
      {showBannerSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) setShowBannerSettings(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-7 space-y-6 text-left text-slate-800 relative">
            <button onClick={() => setShowBannerSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cấu hình đầu trang</h2>
              <p className="text-xs text-slate-500 mt-1">Đổi tiêu đề, mô tả và ảnh nền hiển thị ở đầu trang chủ.</p>
            </div>
            <form onSubmit={handleSaveBanner} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiêu đề (câu hỏi lớn)</label>
                <input type="text" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} placeholder="Hôm nay bạn muốn làm gì?" className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mô tả ngắn</label>
                <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} rows={2} placeholder="Tìm nhanh công cụ, tính năng hoặc tài liệu..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none" />
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ảnh nền đầu trang</label>
                  {bannerImg && <button type="button" onClick={() => setBannerImg('')} className="text-rose-500 text-[10px] font-bold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg"><X className="w-3 h-3" /> Xóa ảnh, dùng màu nền</button>}
                </div>
                {bannerImg && (
                  <div
                    className="relative h-28 w-full cursor-move select-none overflow-hidden rounded-2xl border border-slate-200"
                    style={{ backgroundImage: `url(${bannerImg})`, backgroundSize: 'cover', backgroundPosition: bannerPos }}
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); const m = (bannerPos || '').match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/); dragRef.current = { x: e.clientX, y: e.clientY, px: m ? parseFloat(m[1]) : 50, py: m ? parseFloat(m[2]) : 50 }; }}
                    onPointerMove={(e) => {
                      if (!dragRef.current) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const nx = Math.max(0, Math.min(100, dragRef.current.px - (e.clientX - dragRef.current.x) / rect.width * 100));
                      const ny = Math.max(0, Math.min(100, dragRef.current.py - (e.clientY - dragRef.current.y) / rect.height * 100));
                      setBannerPos(`${Math.round(nx)}% ${Math.round(ny)}%`);
                    }}
                    onPointerUp={() => { dragRef.current = null; }}
                  >
                    <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-slate-900/60 px-2 py-0.5 text-[9px] font-bold text-white">Kéo để chọn vùng hiển thị trên banner</span>
                  </div>
                )}
                <MediaSourcePicker onSelect={(url) => { setBannerImg(url); setBannerPos('50% 50%'); }} accept="image/*" resourceType="image" folder="module-banners/dashboard" label={bannerImg ? 'Thay đổi ảnh' : 'Chọn ảnh nền'} disabled={isUploading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-xs font-bold text-white hover:bg-brand-hover" />
              </div>
              <div className="flex gap-3 justify-between pt-4 border-t border-slate-100">
                <button type="button" onClick={handleResetBanner} className="px-4 py-2.5 text-rose-600 border border-rose-200 hover:bg-rose-50 text-xs font-bold rounded-xl">Về mặc định</button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowBannerSettings(false)} className="px-5 py-2.5 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100">Hủy</button>
                  <button type="submit" disabled={isUploading} className="px-8 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-extrabold shadow-lg shadow-brand/20 disabled:opacity-50">Lưu</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDatabaseSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowDatabaseSettings(false); }}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-left text-slate-800">
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><Database className="w-4 h-4" /> Cấu hình cơ sở dữ liệu Supabase</h2>
            <form onSubmit={handleSaveDbConfig} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Project URL</label>
                <input type="text" value={dbConfig.url} onChange={e => setDbConfig({ ...dbConfig, url: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Anon Key</label>
                <input type="text" value={dbConfig.key} onChange={e => setDbConfig({ ...dbConfig, key: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowDatabaseSettings(false)} className="px-4 py-2 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-100">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-bold shadow-sm">Lưu và tải lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
