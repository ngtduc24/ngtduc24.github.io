import React, { useState, useEffect, useRef } from 'react';
import { canUseModule } from '../lib/moduleAccess';
import MediaSourcePicker from './MediaSourcePicker';
import {
  Settings, Users, BookOpen, Search, X, Database, Sparkles,
  CalendarDays, BarChart3, GraduationCap, Mail,
  Library, Image as ImageIcon, LayoutGrid, ArrowRight,
  CheckCircle2, ClipboardList, Scan, LayoutTemplate, Minus, Shield, Plus, Clapperboard, FileArchive, Globe,
  FileUser, QrCode, Presentation, Workflow } from 'lucide-react';
import {
  saveDefaultSettingsToSupabase,
  saveUser,
  shareLocalDashboardBannerOnce,
} from '../lib/data';
import { isModuleHidden, resolveModuleMeta } from '../lib/modules';
import { UserAccount, AppSettings } from '../types';
import { useNotifications } from './NotificationContext';
import { useUsage, useScores, personalOrder, suggestNow, rememberOrder, setPins, setAutoSort, forgetDoc, MIN_EVENTS, DocVisit } from '../lib/personalize';
import { writeSubRoute } from '../lib/seoConfig';
import { Pin, PinOff, History, Clock as ClockIcon } from 'lucide-react';

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

function ago(sec: number) {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - sec);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(sec * 1000).toLocaleDateString('vi-VN');
}

export default function DashboardOverview({ onSwitchTab, settings, users, currentUser, onRefreshSettings }: DashboardProps) {
  // Ảnh nền đầu trang admin đặt trước đây chỉ lưu trên máy admin: đẩy lên máy chủ một lần cho mọi người thấy.
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    shareLocalDashboardBannerOnce().then(done => { if (done && onRefreshSettings) onRefreshSettings(); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);
  const { addNotification } = useNotifications();

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

  // Thẻ Tính năng nổi bật do người dùng tự chọn và sắp xếp, lưu theo tài khoản. null nghĩa là
  // chưa tùy chỉnh, khi đó lấy 10 chức năng đầu theo thứ tự phím tắt.
  const FEATURED_KEY = `dashboard_featured_${currentUser?.id || 'anon'}`;
  const [featuredIds, setFeaturedIds] = useState<string[] | null>(() => {
    if (Array.isArray(currentUser?.dashboardFeatured)) return currentUser!.dashboardFeatured as string[];
    try { const raw = localStorage.getItem(FEATURED_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [showCardPicker, setShowCardPicker] = useState(false);

  // Lưu thứ tự và danh sách ẩn lên tài khoản (Firestore) để mọi thiết bị dùng chung một
  // cách sắp xếp. Bộ nhớ cục bộ vẫn được ghi để hiển thị tức thì khi chưa tải xong tài khoản.
  const saveArrangementToAccount = (order: string[], hidden: string[], featured?: string[] | null) => {
    if (!currentUser?.id) return;
    const f = featured === undefined ? featuredIds : featured;
    saveUser({ ...currentUser, dashboardIconOrder: order, dashboardIconHidden: hidden, dashboardFeatured: f || undefined }).catch(() => {});
  };
  const persistFeatured = (ids: string[]) => {
    setFeaturedIds(ids);
    try { localStorage.setItem(FEATURED_KEY, JSON.stringify(ids)); } catch {}
    saveArrangementToAccount(iconOrder, hiddenIds, ids);
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
    const serverFeatured = currentUser?.dashboardFeatured;
    // Chỉ nhận khi máy chủ thực sự có dữ liệu (đã tải xong hồ sơ tài khoản).
    if (Array.isArray(serverOrder) || Array.isArray(serverHidden) || Array.isArray(serverFeatured)) {
      if (Array.isArray(serverOrder)) { setIconOrder(serverOrder); try { localStorage.setItem(ORDER_KEY, JSON.stringify(serverOrder)); } catch {} }
      if (Array.isArray(serverHidden)) { setHiddenIds(serverHidden); try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(serverHidden)); } catch {} }
      if (Array.isArray(serverFeatured)) { setFeaturedIds(serverFeatured); try { localStorage.setItem(FEATURED_KEY, JSON.stringify(serverFeatured)); } catch {} }
      hydratedUserRef.current = uid;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.dashboardIconOrder, currentUser?.dashboardIconHidden, currentUser?.dashboardFeatured]);

  useEffect(() => {
    if (settings) {
      setBannerTitle(settings.dashboardBannerTitle || '');
      setBannerDesc(settings.systemDescription || '');
      setBannerImg(settings.dashboardBannerImage || '');
      setBannerPos(settings.dashboardBannerPosition || '50% 50%');
    }
  }, [settings]);

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
  // Mỗi chức năng là một tab có link riêng (?tab=slug), kể cả các chức năng con của Giáo dục.
  const go = (id: string) => onSwitchTab(id);
  const can = (id: string) => canUseModule(currentUser, id);

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
    { id: 'courses', label: 'Khoá học', desc: 'Học các khoá trực tuyến do EduGo biên soạn', icon: GraduationCap, color: 'purple' },
    { id: 'slides', label: 'Bài giảng', desc: 'Thiết kế bài giảng trình chiếu', icon: Presentation, color: 'violet' },
    { id: 'elearning', label: 'Giáo trình', desc: 'Soạn, lưu trữ và chia sẻ giáo trình theo môn', icon: BookOpen, color: 'orange' },
    { id: 'remier', label: 'Remier · Dựng phim', desc: 'Dựng video nhiều lớp trên trình duyệt', icon: Clapperboard, color: 'rose' },
    { id: 'qr_codes', label: 'Tạo mã QR', desc: 'Tạo và quản lý mã QR từ đường link', icon: QrCode, color: 'emerald' },
    { id: 'scientific_cv', label: 'Lý lịch khoa học', desc: 'Lý lịch khoa học cá nhân theo mẫu, xuất PDF và Word', icon: FileUser, color: 'indigo' },
    { id: 'ar_module', label: 'Tạo AR', desc: 'Tạo điểm ảnh AR kèm mã QR để quét bằng điện thoại', icon: Scan, color: 'red' },
    { id: 'vr360', label: 'VR 360', desc: 'Ghép ảnh thành không gian 360 độ, xem bằng kính VR hoặc xoay điện thoại', icon: Globe, color: 'indigo' },
    { id: 'utility_image_resize', label: 'Phóng to ảnh', desc: 'Phóng to và làm rõ chi tiết ảnh theo tỉ lệ tùy chọn', icon: ImageIcon, color: 'blue' },
    { id: 'utility_file_compress', label: 'Giảm dung lượng file', desc: 'Nén PDF, JPG, PNG mà vẫn giữ chất lượng tốt', icon: FileArchive, color: 'emerald' },
    { id: 'utility_social_design', label: 'Thiết kế ảnh', desc: 'Tạo nhanh ảnh cho bài báo, tin tức từ khung mẫu có sẵn', icon: LayoutTemplate, color: 'violet' },
    { id: 'portfolio_cms', label: 'Website', desc: 'Tạo trang giới thiệu bản thân với địa chỉ riêng ngtduc24.github.io/tên', icon: Globe, color: 'teal' },
    { id: 'automatic', label: 'Automatic', desc: 'Tự động hoá công việc bằng quy trình kéo thả', icon: Workflow, color: 'orange' },
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
  // Thói quen sử dụng của riêng tài khoản này (nhật ký mở chức năng, tài liệu vừa mở).
  const usage = useUsage(currentUser?.id);
  const scores = useScores(usage);
  const enoughData = usage.ev.length >= MIN_EVENTS;
  const autoSort = usage.autoSort !== false;
  const idsKey = baseIcons.map(m => m.id).join('|');
  const pinsKey = JSON.stringify(usage.pins || {});
  // Thứ tự theo thói quen chỉ tính lại khi mở trang hoặc khi dữ liệu thay đổi, không nhảy chỗ lúc đang xem.
  const personal = React.useMemo(
    () => (autoSort && enoughData ? personalOrder(baseIcons.map(m => m.id), scores, usage.order, usage.pins || {}) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey, autoSort, enoughData, pinsKey, scores],
  );
  useEffect(() => { if (personal && currentUser?.id) rememberOrder(currentUser.id, personal); }, [personal, currentUser?.id]);
  // Sắp xếp lại theo thứ tự người dùng đã kéo thả, mục chưa có trong thứ tự thì giữ nguyên phía sau.
  const iconModules = personal ? personal.map(id => baseIcons.find(m => m.id === id)!).filter(Boolean) : [...baseIcons].sort((a, b) => {
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
  // Thẻ nổi bật: người dùng tự chọn (featuredIds), chưa chọn thì lấy 10 chức năng đầu.
  const defaultFeatured = cardModules.slice(0, 10).map(m => m.id); // khi bật tự sắp xếp, cardModules đã theo thói quen
  const currentFeatured = featuredIds ?? defaultFeatured;
  const featuredCards = currentFeatured.map(id => cardModules.find(m => m.id === id)).filter(Boolean) as typeof cardModules;
  const filteredCards = q ? cardModules.filter(m => m.label.toLowerCase().includes(q)) : featuredCards;
  const addFeatured = (id: string) => { if (!currentFeatured.includes(id)) persistFeatured([...currentFeatured, id]); };
  const removeFeatured = (id: string) => persistFeatured(currentFeatured.filter(x => x !== id));
  const toggleFeatured = (id: string) => { if (currentFeatured.includes(id)) removeFeatured(id); else addFeatured(id); };
  // Đổi vị trí 2 thẻ nổi bật, chỉ ảnh hưởng danh sách thẻ, không đụng hàng phím tắt.
  const reorderFeatured = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    const ids = [...currentFeatured];
    const from = ids.indexOf(sourceId); const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    persistFeatured(ids);
  };

  const persistOrder = (ids: string[]) => {
    setIconOrder(ids);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch {}
    saveArrangementToAccount(ids, hiddenIds);
  };
  // Sắp xếp lại theo id nguồn và id đích (dùng cho kéo thả bằng con trỏ).
  const reorder = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    // Đang tự sắp xếp: kéo vào vị trí nào thì ghim chức năng đó ở vị trí ấy
    if (personal && currentUser?.id) {
      const to = iconModules.findIndex(m => m.id === targetId);
      if (to === -1) return;
      const pins = { ...(usage.pins || {}) };
      Object.keys(pins).forEach(k => { if (pins[k] === to) delete pins[k]; });
      pins[sourceId] = to;
      setPins(currentUser.id, pins);
      return;
    }
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

  // Kéo sắp xếp thẻ Tính năng nổi bật. Nhấn giữ để vào chế độ chỉnh sửa rồi kéo thả, bỏ bớt
  // thẻ bằng nút trừ hoặc thêm thẻ bằng ô dấu cộng ở cuối.
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
        reorderFeatured(cardDragRef.current, cardOverRef.current);
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
    const onDown = (e: PointerEvent) => {
      if (showCardPicker) return; // đang mở bảng chọn thì giữ chế độ chỉnh sửa
      if (cardsRef.current && !cardsRef.current.contains(e.target as Node)) setCardSortMode(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [cardSortMode, showCardPicker]);

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
                  {personal && usage.pins?.[m.id] !== undefined && (
                    sortMode && !q ? (
                      <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); const p = { ...(usage.pins || {}) }; delete p[m.id]; setPins(currentUser.id, p); }}
                        title={`Bỏ ghim "${m.label}"`} aria-label={`Bỏ ghim ${m.label}`}
                        className="absolute -top-1 left-2 z-10 grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-white text-brand shadow-md hover:text-rose-500"><PinOff className="h-3 w-3" /></button>
                    ) : <span className="pointer-events-none absolute -top-0.5 left-3 z-10 grid h-4 w-4 place-items-center rounded-full bg-white text-brand shadow" title="Đã ghim vị trí"><Pin className="h-2.5 w-2.5" /></span>
                  )}
                  <span className="relative pointer-events-none">
                    <span className={`w-14 h-14 rounded-2xl ${c.bg} ${c.text} grid place-items-center shadow-sm group-hover:scale-105 transition-transform overflow-hidden`}>
                      {(m as any).iconUrl ? <img src={(m as any).iconUrl} alt="" className="w-full h-full object-cover" /> : <Icon className="w-7 h-7" />}
                    </span>
                    {(m as any).beta && !showMinus && <span className="absolute -top-1.5 -right-2 rounded-full bg-amber-500 px-1.5 py-[2px] text-[8px] font-black uppercase tracking-wider text-white shadow">Thử nghiệm</span>}
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

      {/* Thanh tuỳ chọn khi đang sắp xếp phím tắt */}
      {sortMode && !q && (
        <div className="-mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-slate-500">
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-slate-600" onPointerDown={e => e.stopPropagation()}>
            <input type="checkbox" className="h-4 w-4 accent-brand" checked={autoSort} onChange={e => currentUser?.id && setAutoSort(currentUser.id, e.target.checked)} />
            Tự sắp xếp theo thói quen sử dụng
          </label>
          {personal ? <span>Kéo một chức năng vào vị trí nào thì chức năng đó được ghim ở vị trí ấy.</span> : autoSort ? <span>Đang học thói quen của bạn, cần thêm vài lần sử dụng.</span> : <span>Đang dùng thứ tự bạn tự kéo thả.</span>}
          {personal && Object.keys(usage.pins || {}).length > 0 && (
            <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => setPins(currentUser.id, {})} className="font-bold text-brand hover:underline">Bỏ ghim tất cả</button>
          )}
        </div>
      )}

      {/* ===== Dành cho bạn: Tiếp tục tài liệu đang làm và Gợi ý lúc này ===== */}
      {!q && (() => {
        const findMod = (id: string) => baseIcons.find(m => m.id === id);
        const docs = (usage.docs || []).filter(d => findMod(d.tab)).slice(0, 4);
        const sugg = enoughData ? suggestNow(baseIcons.filter(m => !hiddenIds.includes(m.id)).map(m => m.id), scores) : [];
        const openDoc = (d: DocVisit) => { writeSubRoute(d.sub); onSwitchTab(d.tab); };
        if (!docs.length && !sugg.length) {
          return (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-5 py-4 text-[12px] text-slate-500">
              <Sparkles className="h-4 w-4 shrink-0 text-brand" />
              EduGo đang học thói quen sử dụng của bạn. Sau vài lần dùng, nơi đây sẽ hiện tài liệu đang làm dở và chức năng hợp với thời điểm trong ngày.
            </div>
          );
        }
        return (
          <div className={`grid gap-4 ${docs.length && sugg.length ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''}`}>
            {docs.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-brand" />
                  <h2 className="text-sm font-black text-slate-800">Tiếp tục</h2>
                  <span className="text-[11px] text-slate-400">Tài liệu bạn mở gần đây</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {docs.map(d => {
                    const m = findMod(d.tab)!; const Icon = m.icon; const c = COLORS[m.color];
                    return (
                      <div key={d.key} className="group relative">
                        <button onClick={() => openDoc(d)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-left transition-colors hover:border-brand/30 hover:bg-brand-light/40">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl ${c.bg} ${c.text}`}>{(m as any).iconUrl ? <img src={(m as any).iconUrl} alt="" className="h-full w-full object-cover" /> : <Icon className="h-[18px] w-[18px]" />}</span>
                          <span className="min-w-0 flex-1 pr-5">
                            <span className="block truncate text-[13px] font-bold text-slate-800 group-hover:text-brand">{d.title}</span>
                            <span className="block truncate text-[11px] text-slate-400">{m.label} · {ago(d.at)}</span>
                          </span>
                        </button>
                        <button type="button" title="Bỏ khỏi danh sách" onClick={() => currentUser?.id && forgetDoc(currentUser.id, d.key)} className="absolute right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 group-hover:grid"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {sugg.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-brand" />
                  <h2 className="text-sm font-black text-slate-800">Gợi ý lúc này</h2>
                </div>
                <div className="space-y-2">
                  {sugg.map(sg => {
                    const m = findMod(sg.id); if (!m) return null; const Icon = m.icon; const c = COLORS[m.color];
                    return (
                      <button key={sg.id} onClick={() => go(sg.id)} className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-left transition-colors hover:border-brand/30 hover:bg-brand-light/40">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl ${c.bg} ${c.text}`}>{(m as any).iconUrl ? <img src={(m as any).iconUrl} alt="" className="h-full w-full object-cover" /> : <Icon className="h-[18px] w-[18px]" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-slate-800 group-hover:text-brand">{m.label}</span>
                          <span className="block truncate text-[11px] text-slate-400">{sg.reason}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
      {!q && (filteredCards.length > 0 || cardSortMode || featuredCards.length === 0) && (
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
          {cardSortMode && <p className="text-[11px] font-semibold text-brand">Đang chỉnh sửa. Kéo thả để đổi vị trí, bấm dấu trừ để bỏ thẻ, bấm ô dấu cộng để thêm chức năng khác, bấm Xong khi hoàn tất.</p>}
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
                  className={`group relative text-left bg-white rounded-2xl border shadow-xs transition-all p-4 flex items-start gap-3 select-none ${cardSortMode ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-pointer hover:shadow-md hover:border-brand/30'} ${isDragging ? 'opacity-40' : ''} ${isOver ? 'ring-2 ring-brand ring-offset-2 border-brand/30' : 'border-slate-100'}`}
                >
                  {(m as any).beta && <span className="absolute top-2 right-2 rounded-full bg-amber-500 px-1.5 py-[2px] text-[8px] font-black uppercase tracking-wider text-white shadow pointer-events-none">Thử nghiệm</span>}
                  {cardSortMode && !q && (
                    <span
                      role="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); removeFeatured(m.id); }}
                      title={`Bỏ "${m.label}" khỏi Tính năng nổi bật`}
                      className="absolute -top-2 -left-2 z-10 grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:text-rose-500 cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                  <span className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} grid place-items-center shrink-0 overflow-hidden pointer-events-none`}>{(m as any).iconUrl ? <img src={(m as any).iconUrl} alt="" className="w-full h-full object-cover" /> : <Icon className="w-5 h-5" />}</span>
                  <div className="min-w-0 flex-1 pointer-events-none">
                    <h3 className="text-[13px] font-black text-slate-800 leading-tight group-hover:text-brand transition-colors pr-6">{m.label}</h3>
                    <p className="text-[10.5px] text-slate-400 font-medium leading-snug mt-1 line-clamp-2">{m.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0 pointer-events-none" />
                </button>
              );
            })}
            {/* Ô dấu cộng ở cuối, hiện khi đang chỉnh sửa hoặc khi chưa có thẻ nào, bấm để chọn chức năng thêm vào. */}
            {!q && (cardSortMode || featuredCards.length === 0) && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setShowCardPicker(true)}
                title="Thêm chức năng vào Tính năng nổi bật"
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-4 text-slate-400 transition-colors hover:border-brand hover:text-brand min-h-[76px]"
              >
                <Plus className="h-6 w-6" />
                <span className="text-[12px] font-bold">Thêm chức năng</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Popup chọn chức năng thêm vào Tính năng nổi bật */}
      {showCardPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowCardPicker(false)}>
          <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">Thêm vào Tính năng nổi bật</h3>
                <p className="text-[11px] text-slate-400">Chọn chức năng muốn hiện ở khu vực thẻ nổi bật.</p>
              </div>
              <button onClick={() => setShowCardPicker(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {cardModules.map(m => {
                const Icon = m.icon; const c = COLORS[m.color]; const shown = currentFeatured.includes(m.id);
                return (
                  <button key={m.id} onClick={() => toggleFeatured(m.id)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${shown ? 'border-brand/30 bg-brand-light' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl overflow-hidden ${c.bg} ${c.text}`}>{(m as any).iconUrl ? <img src={(m as any).iconUrl} alt="" className="h-full w-full object-cover" /> : <Icon className="h-4.5 w-4.5" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-slate-800">{m.label}{(m as any).beta && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-[1px] text-[8px] font-black uppercase tracking-wider text-white align-middle">Thử nghiệm</span>}</span>
                      <span className="block truncate text-[10px] text-slate-400">{m.desc}</span>
                    </span>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${shown ? 'bg-brand text-white' : 'border border-slate-300 text-transparent'}`}>{shown ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-3.5 w-3.5 text-slate-400" />}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-4">
              {featuredIds ? <button onClick={() => persistFeatured(defaultFeatured)} className="text-[11px] font-bold text-brand hover:underline">Về mặc định</button> : <span />}
              <button onClick={() => setShowCardPicker(false)} className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-hover">Xong</button>
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
