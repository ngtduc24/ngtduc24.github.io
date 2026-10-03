import React, { useState, useEffect } from 'react';
import { applyBrandTheme, applyFontTheme } from './lib/applyTheme';
import { startBandwidthMeter } from './lib/usage';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import AllFeatures from './components/AllFeatures';
import ProfilePage from './components/ProfilePage';
import StatsOverview from './components/StatsOverview';
import SampleSizeCalculator from './components/SampleSizeCalculator';
import PublicJournalSearch from './components/PublicJournalSearch';
import GuideSection from './components/GuideSection';
import UserManagement from './components/UserManagement';
import PermissionManagement from './components/PermissionManagement';
import LoginScreen from './components/LoginScreen';
import ScientificJournals from './components/ScientificJournals';
import QualitativeAnalysis from './components/QualitativeAnalysis';
import QuantitativeAnalysis from './components/QuantitativeAnalysis';
import SystemSettings from './components/SystemSettings';
import TaskProjects from './components/TaskProjects';
import ProfileModal from './components/ProfileModal';
import BackupManager from './components/BackupManager';
import AdminNotifications from './components/AdminNotifications';
import UserNotifications from './components/UserNotifications';
import MediaLibrary from './components/MediaLibrary';
import LandingPage from './components/LandingPage';
import CoursesApp from './components/courses/CoursesApp';
import { getLandingConfig } from './lib/landing';
import { getSiteBySlug, setSiteOwner, RESERVED_SLUGS, SiteRecord } from './lib/portfolioData';
import { canUseModule, setDefaultApps, withDefaultRights } from './lib/moduleAccess';
import PortfolioWebsite from './components/PortfolioWebsite';
import PortfolioCMS from './components/PortfolioCMS';
import UtilitiesModule from './components/UtilitiesModule';
import PublicARScanner from './components/PublicARScanner';
import PublicVRViewer from './components/PublicVRViewer';
import VR360Module from './components/vr/VR360Module';
import QuizTake from './components/edu/QuizTake';
import ELessonView from './components/edu/ELessonView';
import ELessonPreviewPage from './components/edu/ELessonPreviewPage';
import EduBankShareView from './components/edu/EduBankShareView';
import { publicParam } from './lib/shareLinks';
import ELearningModule from './components/edu/ELearningModule';
import RemierModule from './components/remier/RemierModule';
import ScientificCvModule from './components/scientificCv/ScientificCvModule';
import QrCodeModule from './components/qr/QrCodeModule';
const AutomaticModule = React.lazy(() => import('./components/automatic/AutomaticModule'));
import { useAutomaticScheduler } from './lib/automatic/scheduler';
import { trackModule, setUsageUser } from './lib/personalize';
import { MODULE_REGISTRY } from './lib/modules';
import EduModule from './components/EduModule';
import { setEduAuthContext } from './lib/edu';
import { TaskProvider } from './components/TaskContext';
import { useIsPhone, useIsPhoneDevice, setUiPreference } from './lib/device';
import PhoneShell from './components/phone/PhoneShell';
import PhoneWelcome from './components/phone/PhoneWelcome';
import PhoneHome from './components/phone/PhoneHome';
import PhoneAllFeatures from './components/phone/PhoneAllFeatures';
import PhoneNotifications from './components/phone/PhoneNotifications';
import PhoneAccount from './components/phone/PhoneAccount';
import { ShieldAlert, RefreshCw, LayoutDashboard, Calculator, BookOpen, Users, Settings, ClipboardList, Shield, Bell, Layers, Image, Wrench, FolderKanban, GraduationCap, Film, FileUser, QrCode, Presentation, Workflow } from 'lucide-react';
import { supabase } from "./lib/supabase";
import { useMyNotifications, resetNotificationStore, notifyAppAccessChange } from './lib/notifications';
import SlidesModule from './components/slides/SlidesModule';
import UserProfileView from './components/UserProfileView';
import { readSubRoute, writeSubRoute } from './lib/seoConfig';
import { rememberUsers, rememberMe, loadPeople } from './lib/people';
import SlidePublicView from './components/slides/SlidePublicView';
import { SlideAudience } from './components/slides/SlidePresenter';
import { syncPublicName } from './lib/data';
import { saveUser, savePublicProfile, deleteUser, getUsers, getUserById, mapUserFromDB, seedDefaultUsersIfNeeded, getDefaultSettingsFromSupabase, getCachedSettings, saveDefaultSettingsToSupabase, testSupabaseConnection, getNotificationsFromSupabase, subscribeToNotificationChanges, USERS_TABLE } from './lib/data';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { requestFCMToken, getMessagingInstance } from './lib/firebase';
import { AppSettings, UserAccount } from './types';
import { onMessage } from 'firebase/messaging';
import { updateDocumentSEO, getTabFromUrl, getSeoMeta, clearSubRoute } from './lib/seoConfig';
import { isModuleHidden } from './lib/modules';
import MaintenanceScreen from './components/MaintenanceScreen';
import VirtualAssistant from './components/assistant/VirtualAssistant';
import AssistantPage from './components/assistant/AssistantPage';
import { trackUserPresence, untrackUserPresence } from './lib/presence';

// Khóa lưu khu vực đang mở (portfolio công khai hay trang quản trị) để tải lại trang không bị nhảy ra ngoài.
const ENTRY_VIEW_STORAGE_KEY = 'app_entry_view';

// Đường dẫn 1 đoạn /<địa chỉ> là Website của người dùng (trừ các thư mục hệ thống).
function siteSlugFromPath(): string | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/^\/([a-z0-9][a-z0-9-]{1,38}[a-z0-9])\/?$/i);
  if (!m) return null;
  const slug = m[1].toLowerCase();
  return RESERVED_SLUGS.has(slug) || /\.html?$/.test(slug) ? null : slug;
}

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  // Trang cá nhân công khai đang xem (bấm vào tên, ảnh đại diện của người dùng ở bất kỳ đâu).
  const [profileUid, setProfileUid] = useState<string | null>(() => readSubRoute().uid || null);
  // Khởi tạo currentUser từ cache để khi tải lại trang không bị giật màn hình đăng nhập
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedUser = localStorage.getItem('logged_in_user');
      if (savedUser) {
        return JSON.parse(savedUser) as UserAccount;
      }
    } catch (e) {
      // Bỏ qua nếu lỗi parse cache
    }
    return null;
  });
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  // Cập nhật ngữ cảnh người dùng cho module Edu để tách dữ liệu theo từng người. Admin xem tất cả.
  useEffect(() => {
    setEduAuthContext(currentUser?.id ?? null, currentUser?.role === 'admin');
  }, [currentUser]);

  // Đo băng thông tải về của trình duyệt này để cộng dồn vào thống kê hệ thống.
  useEffect(() => { startBandwidthMeter(); }, []);

  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const tabFromUrl = getTabFromUrl();
      if (tabFromUrl) return tabFromUrl;
      return localStorage.getItem('app_last_active_tab') || 'dashboard';
    }
    return 'dashboard';
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  // Giao diện điện thoại (màn hẹp, cảm ứng). Người dùng có thể chọn giao diện máy tính trên điện thoại.
  const isPhone = useIsPhone();
  const isPhoneDevice = useIsPhoneDevice();
  useEffect(() => { if (!isPhone && currentTab === 'me') setCurrentTab('dashboard'); }, [isPhone, currentTab]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  // landing: trang đầu EduGo cho khách. portfolio: trang Website công khai (link chia sẻ khoá học,
  // dự án, nghiên cứu, bài viết). admin: khu làm việc sau khi đăng nhập.
  const [entryView, setEntryView] = useState<'landing' | 'portfolio' | 'login' | 'admin'>(() => {
    if (typeof window === 'undefined') return 'landing';
    const params = new URLSearchParams(window.location.search);
    if (params.has('tab')) {
      return 'admin';
    }
    if (params.get('portfolio') === 'true' || params.get('site') || /^\/(c|p|r|b)\/[^/]+\/?$/.test(window.location.pathname) || siteSlugFromPath()) {
      return 'portfolio';
    }
    const shouldResumeAdmin = sessionStorage.getItem('resume_admin_after_refresh') === 'true';
    if (shouldResumeAdmin) {
      sessionStorage.removeItem('resume_admin_after_refresh');
      return 'admin';
    }
    // Giữ nguyên khu vực đang làm việc khi người dùng tự bấm F5 hoặc trình duyệt khôi phục tab.
    // Dùng sessionStorage nên tab mới mở vẫn vào trang portfolio công khai như trước.
    try {
      const saved = sessionStorage.getItem(ENTRY_VIEW_STORAGE_KEY);
      if (saved === 'admin') {
        return saved;
      }
    } catch (e) {
      // Trình duyệt chặn sessionStorage thì bỏ qua, quay về mặc định.
    }
    return 'landing';
  });
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [welcomePreview, setWelcomePreview] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('chao') === '1');

  // Website của người dùng: ngtduc24.github.io/<địa chỉ> hoặc ?site=<địa chỉ>. Không có địa chỉ là trang cũ của admin.
  const [siteState, setSiteState] = useState<{ slug: string; status: 'loading' | 'ok' | 'missing'; rec?: SiteRecord | null }>({ slug: '', status: 'ok' });
  useEffect(() => {
    if (entryView !== 'portfolio') return;
    const slug = (new URLSearchParams(window.location.search).get('site') || siteSlugFromPath() || '').toLowerCase();
    if (!slug) { setSiteOwner(null); setSiteState({ slug: '', status: 'ok' }); return; }
    setSiteState({ slug, status: 'loading' });
    getSiteBySlug(slug).then(rec => {
      if (rec && rec.published !== false) { setSiteOwner(rec.owner); setSiteState({ slug, status: 'ok', rec }); }
      else setSiteState({ slug, status: 'missing' });
    }).catch(() => setSiteState({ slug, status: 'missing' }));
  }, [entryView]);

  // Đồng bộ tiêu đề trang (SEO), OpenGraph và URL hai chiều
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Các link công khai riêng (xem bài tập, làm Quizz, xem bài giảng...) giữ nguyên địa chỉ, không gắn ?tab.
    const sp = new URLSearchParams(window.location.search);
    if (['bt', 'quiz', 'elesson', 'elview', 'vr', 'ar'].some(k => sp.has(k)) || /^\/(bt|bg|hl|tn|vr|ar|nb)\//.test(window.location.pathname)) return;

    if (entryView === 'portfolio' || entryView === 'landing') {
      updateDocumentSEO('portfolio');
      return;
    }

    if (entryView === 'admin') {
      updateDocumentSEO(currentTab);
      localStorage.setItem('app_last_active_tab', currentTab);

      // Cập nhật query param ?tab=slug mà không làm reload trang
      const meta = getSeoMeta(currentTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== meta.slug || url.pathname !== '/') {
        url.pathname = '/'; // rời đường dẫn gọn của trang chia sẻ (/c/<id>/...) khi vào khu quản trị
        url.searchParams.set('tab', meta.slug);
        url.searchParams.delete('portfolio');
        // Đổi sang chức năng khác thì bỏ các tham số màn hình con của chức năng cũ.
        clearSubRoute(url);
        window.history.pushState({ tab: currentTab }, '', url.toString());
      }
    }
  }, [currentTab, entryView]);

  // Lắng nghe sự kiện người dùng bấm nút Back / Forward trên trình duyệt
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const tab = getTabFromUrl();
      if (tab) {
        setCurrentTab(tab);
        updateDocumentSEO(tab);
        if (entryView !== 'admin') {
          setEntryView('admin');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [entryView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Không lưu trạng thái màn hình đăng nhập, tránh việc tải lại trang lại rơi vào form đăng nhập.
    if (entryView === 'login') return;
    try {
      sessionStorage.setItem(ENTRY_VIEW_STORAGE_KEY, entryView);
    } catch (e) {
      // Bỏ qua khi trình duyệt chặn sessionStorage.
    }
  }, [entryView]);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileModalReadOnly, setProfileModalReadOnly] = useState<boolean>(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  

  useEffect(() => {
    if (currentUser) {
      requestFCMToken(currentUser.id).catch(console.error);
      
      const messagingInstance = getMessagingInstance();
      if (messagingInstance) {
        const unsubscribe = onMessage(messagingInstance, (payload) => {
          console.log('FCM Foreground message:', payload);
          // Assuming you have a way to show notifications. We can use the browser's Notification API if focused, or just show a custom toast.
          // For now, we rely on the existing system notifications, but we can also trigger a visual toast if needed.
          // Since the app already polls/listens to firestore notifications, FCM is mostly for background/push.
          if (Notification.permission === 'granted') {
             new Notification(payload.notification?.title || 'Thông báo mới', {
               body: payload.notification?.body,
               icon: '/vite.svg'
             });
          }
        });
        return () => unsubscribe();
      }
    }
  }, [currentUser]);

  // Theo dõi trạng thái trực tuyến qua Supabase Realtime Presence
  useEffect(() => {
    if (currentUser) {
      trackUserPresence(currentUser);
    } else {
      untrackUserPresence();
    }

    const handleBeforeUnload = () => {
      untrackUserPresence();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // Bấm tên, ảnh người dùng ở bất kỳ đâu thì mở trang cá nhân công khai của người đó.
  useEffect(() => {
    const open = (e: Event) => { const uid = (e as CustomEvent).detail as string; if (!uid) return; e.preventDefault(); setProfileUid(uid); setCurrentTab('user_profile'); };
    window.addEventListener('app_open_profile', open);
    return () => window.removeEventListener('app_open_profile', open);
  }, []);
  useEffect(() => { if (currentTab === 'user_profile' && profileUid) writeSubRoute({ uid: profileUid }); }, [currentTab, profileUid]);
  // Danh bạ công khai: cập nhật tên, ảnh của mình lên bản công khai mỗi lần đăng nhập, nạp danh sách tài khoản nếu có.
  useEffect(() => {
    if (!currentUser) return;
    rememberMe(currentUser);
    syncPublicName(currentUser).then(() => loadPeople(true)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.fullName, currentUser?.avatarUrl, currentUser?.coverImage, currentUser?.avatarPosition, currentUser?.coverImagePosition]);
  useEffect(() => { if (users.length) rememberUsers(users); }, [users]);

  // Số thông báo chưa đọc lấy từ kho thông báo dùng chung (đồng bộ giữa các thiết bị).
  const myNotifs = useMyNotifications(currentUser);
  useEffect(() => { setUnreadNotificationsCount(currentUser ? myNotifs.unread : 0); }, [myNotifs.unread, currentUser]);
  useEffect(() => { if (!currentUser) resetNotificationStore(); }, [currentUser]);
  
  // Nạp cấu hình từ cache trình duyệt ngay từ lần vẽ đầu tiên, để tên chức năng, ảnh, tiêu đề,
  // font hiện đúng liền, không còn cảnh hiện giá trị mặc định rồi mới nhảy sang giá trị đúng.
  const cachedSettings = getCachedSettings();
  const [settings, setSettings] = useState<AppSettings>(cachedSettings || {
    id: "general_config",
    defaultCoverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80",
    themeColor: "green-black",
    webAppTitle: "EduGo",
    webAppIcon: "",
    footerText: "Hệ thống hỗ trợ tính toán phương pháp nghiên cứu định lượng toàn diện.",
    allowPublicAccess: true,
    systemDescription: "Hệ thống hỗ trợ tính toán phương pháp nghiên cứu định lượng chuẩn hóa."
  });

  // Có cache thì coi như đã có cấu hình để áp màu và font ngay, tránh nháy khi F5.
  const [settingsLoaded, setSettingsLoaded] = useState(!!cachedSettings);

  // Load configuration from Supabase
  const loadConfig = async () => {
    try {
      const s = await getDefaultSettingsFromSupabase();
      setSettings(s);
    } catch (e) {
      console.error("Lỗi khi load config hệ thống:", e);
    } finally {
      // Luôn kết thúc trạng thái tải để không kẹt ở màn chờ, kể cả khi tải lỗi hoặc egress hết.
      setSettingsLoaded(true);
    }
  };

  useEffect(() => {
    loadConfig();
    // Ứng dụng mặc định cho tài khoản tự đăng ký, admin chọn trong Cấu hình hệ thống.
    getLandingConfig().then(c => { setDefaultApps(c.defaultApps); setCurrentUser(u => withDefaultRights(u)); }).catch(() => {});
  }, []);

  // Keep the browser title in sync with the current administration module.
  useEffect(() => {
    const baseTitle = settings.webAppTitle || 'EduGo';
    const adminTitles: Record<string, string> = {
      dashboard: 'Tổng quan hệ thống',
      tasks: 'Quản lý dự án',
      scientific_journals: 'Quản lý điểm báo khoa học',
      calculator: 'Tính toán cỡ mẫu',
      qualitative_analysis: 'Phân tích định tính',
      quantitative_analysis: 'Phân tích số liệu định lượng',
      utilities: 'Tiện ích',
      ar_module: 'Tiện ích',
      vr360: 'VR 360',
      courses: 'Khoá học',
      utility_file_compress: 'Giảm dung lượng file',
      edu_bank: 'Ngân hàng bài tập',
      edu_exam: 'Quizz',
      edu_question_bank: 'Ngân hàng câu hỏi',
      edu_grade: 'Nhập điểm',
      stats: 'Thống kê',
      portfolio_cms: 'Website',
      notifications: 'Thông báo hệ thống',
      notifications_admin: 'Quản trị thông báo',
      users: 'Quản lý người dùng',
      permissions: 'Phân quyền người dùng',
      media_library: 'Kho lưu trữ',
      settings: 'Cấu hình hệ thống',
      edu: 'Quản lý Giáo dục & Đào tạo',
      slides: 'Bài giảng',
      elearning: 'Giáo trình',
      remier: 'Remier · Dựng phim',
      scientific_cv: 'Lý lịch khoa học',
      qr_codes: 'Tạo mã QR',
      automatic: 'Automatic · Tự động hoá',
      assistant: 'Trợ lý giáo dục',
    };

    if (entryView === 'admin') {
      document.title = `${adminTitles[currentTab] || 'Trang quản trị'} | ${baseTitle}`;
    } else if (entryView === 'login') {
      document.title = `Đăng nhập quản trị | ${baseTitle}`;
    }
  }, [currentTab, entryView, settings.webAppTitle]);

  useEffect(() => {
    if (settings.webAppIcon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.webAppIcon;
    }
  }, [settings.webAppIcon]);

  useEffect(() => {
    // Chỉ áp màu sau khi đã tải cấu hình thật, tránh áp màu mặc định đè lên
    // màu đúng mà script trong head đã đặt sẵn, gây nháy khi F5.
    if (!settingsLoaded) return;
    applyBrandTheme(settings);
  }, [settingsLoaded, settings.themeColor, settings.primaryColor, settings.secondaryColor]);

  // Áp phông chữ hệ thống sau khi tải cấu hình. Đổi phông trong cấu hình là cập nhật ngay.
  useEffect(() => {
    if (!settingsLoaded) return;
    applyFontTheme(settings);
  }, [settingsLoaded, settings.fontHeading, settings.fontBody]);

  // Initialize and sync with Firebase
  useEffect(() => {
    let active = true;
    let unsubscribeUsers = () => {};
    let latestUsers: UserAccount[] = (() => {
      try { return JSON.parse(localStorage.getItem('local_users_cache') || '[]'); } catch { return []; }
    })();

    const initFirebaseSync = () => {
      // Chạy kiểm tra kết nối nền không làm nghẽn giao diện người dùng
      testSupabaseConnection()
        .then(isConnected => {
          if (active) setDbConnected(isConnected);
        })
        .catch(() => {
          if (active) setDbConnected(false);
        });

      // Tải danh sách người dùng từ Firestore trong nền
      getUsers()
        .then(dbUsers => {
          if (active && dbUsers && dbUsers.length > 0) {
            setUsers(dbUsers);
            localStorage.setItem('local_users_cache', JSON.stringify(dbUsers));
          }
        })
        .catch(err => {
          console.warn("Lỗi khi tải trước danh sách người dùng:", err);
        });
    };

    initFirebaseSync();

    const startUserSync = () => {
      unsubscribeUsers();
      unsubscribeUsers = onSnapshot(collection(db, USERS_TABLE), (snapshot) => {
        const loadedUsers: UserAccount[] = [];
        snapshot.forEach(docSnap => {
          loadedUsers.push(mapUserFromDB({ id: docSnap.id, ...docSnap.data() }));
        });
        latestUsers = loadedUsers;
        setUsers(loadedUsers);
        localStorage.setItem('local_users_cache', JSON.stringify(loadedUsers));

        setCurrentUser(prevUser => {
          if (prevUser) {
            const updatedUser = loadedUsers.find(u => u.id === prevUser.id);
            if (updatedUser) {
              if (JSON.stringify(prevUser) !== JSON.stringify(updatedUser)) {
                localStorage.setItem('logged_in_user', JSON.stringify(updatedUser));
                return updatedUser;
              }
            } else {
              localStorage.removeItem('logged_in_user');
              return null;
            }
          }
          return prevUser;
        });
      }, error => {
        console.warn('Không thể đồng bộ danh sách người dùng Firebase:', error);
      });
    };

    // Firebase Authentication là nguồn xác thực duy nhất. localStorage chỉ là
    // cache giao diện và không được dùng để tự khôi phục quyền đăng nhập.
    const unsubscribeAuth = onAuthStateChanged(auth, async firebaseUser => {
      if (!active) return;
      setAuthInitialized(true);
      if (!firebaseUser) {
        unsubscribeUsers();
        unsubscribeUsers = () => {};
        setCurrentUser(null);
        localStorage.removeItem('logged_in_user');
        return;
      }

      let directProfile = await getUserById(firebaseUser.uid);
      // Tài khoản vừa đăng ký: hồ sơ được ghi ngay sau khi tạo tài khoản, chờ một chút rồi đọc lại.
      if (!directProfile) {
        await new Promise(r => setTimeout(r, 1500));
        if (!active) return;
        directProfile = await getUserById(firebaseUser.uid);
      }
      const profiles = latestUsers.length > 0 ? latestUsers : directProfile ? [directProfile] : await getUsers();
      if (!active) return;
      const verifiedProfile = directProfile || profiles.find(user => user.id === firebaseUser.uid) || null;
      setCurrentUser(verifiedProfile);
      if (verifiedProfile) {
        localStorage.setItem('logged_in_user', JSON.stringify(verifiedProfile));
        if (verifiedProfile.role === 'member') {
          latestUsers = [verifiedProfile];
          setUsers([verifiedProfile]);
        } else {
          startUserSync();
        }
      } else {
        localStorage.removeItem('logged_in_user');
      }
    });

    return () => {
      active = false;
      unsubscribeUsers();
      unsubscribeAuth();
    };
  }, []);

  // Save or update the user profile in Firebase Firestore.
  const handleSaveUser = async (user: UserAccount) => {
    const prevUser = users.find(u => u.id === user.id);
    try {
      await saveUser(user);
      // Báo cho người được cấp hoặc thu hồi quyền dùng ứng dụng.
      notifyAppAccessChange(prevUser, user, currentUser).catch(() => {});
    } catch (e: any) {
      console.warn("Firebase error on saveUser:", e);
      throw new Error(e.message || 'Lỗi khi lưu thông tin vào database.');
    }
    
    // Update local state and cache immediately
    setUsers(prev => {
      const index = prev.findIndex(u => u.id === user.id);
      let next;
      if (index !== -1) {
        next = [...prev];
        next[index] = user;
      } else {
        next = [...prev, user];
      }
      localStorage.setItem('local_users_cache', JSON.stringify(next));
      return next;
    });

    if (currentUser && user.id === currentUser.id) {
      setCurrentUser(user);
      localStorage.setItem('logged_in_user', JSON.stringify(user));
    }
  };

  const handleSaveProfile = async (updatedUser: UserAccount) => {
    // Ảnh đại diện, ảnh bìa lưu bản công khai trên máy chủ để mọi người, mọi máy đều thấy.
    const shared = await savePublicProfile(updatedUser).catch(() => false);
    try {
      await saveUser(updatedUser);
    } catch (e) {
      console.warn("Firebase error on saveProfile:", e);
      if (!shared) throw e;
    }

    setUsers(prev => {
      const index = prev.findIndex(u => u.id === updatedUser.id);
      let next;
      if (index !== -1) {
        next = [...prev];
        next[index] = updatedUser;
      } else {
        next = [...prev, updatedUser];
      }
      localStorage.setItem('local_users_cache', JSON.stringify(next));
      return next;
    });

    setCurrentUser(updatedUser);
    localStorage.setItem('logged_in_user', JSON.stringify(updatedUser));
    // Đổi họ tên thì cập nhật tên người biên soạn trên bài giảng E-Learning và đề Quizz.
    import('./lib/elearning').then(m => m.syncOwnerName(updatedUser.id, updatedUser.fullName)).catch(() => {});
  };

  // Delete the user profile from Firebase Firestore.
  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
    } catch (e) {
      console.warn("Firebase error on deleteUser, using local cache:", e);
    }

    setUsers(prev => {
      const next = prev.filter(u => u.id !== userId);
      localStorage.setItem('local_users_cache', JSON.stringify(next));
      return next;
    });
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem('logged_in_user', JSON.stringify(user));
    
    // Set appropriate initial tab
    if (user.role === 'member') {
      setCurrentTab('courses');
    } else if (user.role === 'admin') {
      setCurrentTab('dashboard');
    } else {
      // Find first permitted tab
      if (user.permissions.includes('dashboard')) {
        setCurrentTab('dashboard');
      } else if (user.permissions.includes('calculator')) {
        setCurrentTab('calculator');
      } else {
        setCurrentTab('dashboard');
      }
    }
  };

  const handleLogout = async () => {
    await untrackUserPresence();
    await signOut(auth);
    setCurrentUser(null);
    localStorage.removeItem('logged_in_user');
    setCurrentTab('dashboard');
    setEntryView('landing');
    try { window.history.replaceState(null, '', '/'); } catch { /* bỏ qua */ }
  };

  // Ghi nhật ký chức năng đã mở (riêng từng tài khoản) để Trang chủ sắp xếp theo thói quen.
  useEffect(() => { setUsageUser(currentUser?.id); }, [currentUser?.id]);
  useEffect(() => {
    if (!currentUser?.id || entryView !== 'admin') return;
    if (MODULE_REGISTRY.some(m => m.id === currentTab)) trackModule(currentUser.id, currentTab);
  }, [currentTab, currentUser?.id, entryView]);

  // Quy trình Automatic đang bật lịch chạy nền khi EduGo đang mở
  useAutomaticScheduler(currentUser, !!currentUser && !isModuleHidden('automatic', settings) && canUseModule(currentUser, 'automatic'));

  // Helper check to verify if currentUser has permission to view a tab
  const hasPermission = (tabId: string) => {
    if (!currentUser) return false;
    // Chức năng bị admin gạt ẩn thì chặn truy cập với mọi tài khoản, kể cả admin và kể cả
    // khi mở bằng đường dẫn trực tiếp. Riêng trang Cấu hình hệ thống luôn mở để admin còn
    // vào lại được mà bật hiện chức năng khác.
    if (tabId !== 'settings' && isModuleHidden(tabId, settings)) return false;
    return canUseModule(currentUser, tabId);
  };

  const renderActiveTab = () => {
    if (!currentUser) return null;

    // Permissions Gate Check
    if (!hasPermission(currentTab)) {
      return (
        <div className="bg-white rounded-2xl p-8 border border-rose-100 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-50 text-rose-500 rounded-full">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 font-display">Truy cập bị từ chối</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tài khoản của bạn (<strong className="text-slate-700">@{currentUser.username}</strong>) hiện không có quyền truy cập chức năng này. Vui lòng liên hệ với Quản trị viên hệ thống để cấp quyền tương ứng.
            </p>
          </div>
          <div className="pt-2">
            <button 
              onClick={() => {
                // Return to first allowed tab
                if (currentUser.permissions.includes('dashboard')) {
                  setCurrentTab('dashboard');
                } else if (currentUser.permissions.includes('calculator')) {
                  setCurrentTab('calculator');
                }
              }}
              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Quay về trang được cấp quyền</span>
            </button>
          </div>
        </div>
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return <DashboardOverview onSwitchTab={(tab) => setCurrentTab(tab)} settings={settings} users={users} currentUser={currentUser} onRefreshSettings={loadConfig} />;
      case 'all_features':
        return <AllFeatures currentUser={currentUser} settings={settings} onSwitchTab={(tab) => setCurrentTab(tab)} onBack={() => setCurrentTab('dashboard')} />;
      case 'assistant':
        return <AssistantPage currentUser={currentUser} settings={settings} onSwitchTab={(tab) => setCurrentTab(tab)} onBack={() => setCurrentTab('dashboard')} />;
      case 'user_profile': {
        const uid = profileUid || readSubRoute().uid || currentUser.id;
        return <UserProfileView key={uid} uid={uid} isMe={uid === currentUser.id} self={currentUser} onBack={() => window.history.length > 1 ? window.history.back() : setCurrentTab('dashboard')} onEditMine={() => setCurrentTab('profile')} />;
      }
      case 'profile':
        return <ProfilePage user={currentUser} onSaveProfile={handleSaveProfile} onBack={() => setCurrentTab('dashboard')} />;
      case 'stats':
        return <StatsOverview currentUser={currentUser} />;
      case 'tasks':
        return <TaskProjects users={users} currentUser={currentUser} settings={settings} onRefreshSettings={loadConfig} onUpdateUser={handleSaveUser} />;
      case 'calculator':
        return <SampleSizeCalculator settings={settings} onRefreshSettings={loadConfig} currentUser={currentUser} />;
      case 'qualitative_analysis':
        return (
          <QualitativeAnalysis
            users={users}
            currentUser={currentUser}
            onSaveUser={handleSaveUser}
            isUserAdmin={currentUser?.role === 'admin'}
            settings={settings}
            onRefreshSettings={loadConfig}
          />
        );
      case 'quantitative_analysis':
        return (
          <QuantitativeAnalysis
            users={users}
            currentUser={currentUser}
            onSaveUser={handleSaveUser}
            isUserAdmin={currentUser?.role === 'admin'}
            settings={settings}
            onRefreshSettings={loadConfig}
          />
        );
      case 'scientific_journals':
        return <ScientificJournals currentUser={currentUser} users={users} onUpdateUser={handleSaveUser} />;
      case 'backup':
        return <BackupManager />;
      case 'media_library':
        // Kho lưu trữ nằm trong Cấu hình hệ thống, đường dẫn cũ mở thẳng mục đó.
        return (
          <SystemSettings
            settings={settings}
            onRefreshSettings={loadConfig}
            isAdmin={currentUser.role === 'admin' || currentUser.permissions.includes('settings')}
            currentUser={currentUser}
            initialTab="storage"
          />
        );
      case 'notifications':
        return (
          <UserNotifications 
            currentUser={currentUser} 
            settings={settings} 
            setCurrentTab={setCurrentTab} 
            onUnreadCountChange={setUnreadNotificationsCount} 
          />
        );
      case 'settings':
        return (
          <SystemSettings
            settings={settings}
            onRefreshSettings={loadConfig}
            isAdmin={currentUser.role === 'admin' || currentUser.permissions.includes('settings')}
            currentUser={currentUser}
          />
        );
      case 'users':
        return (
          <UserManagement 
            currentUser={currentUser} 
            users={users} 
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            settings={settings}
            onRefreshSettings={loadConfig}
          />
        );
      case 'permissions':
        return (
          <PermissionManagement
            currentUser={currentUser}
            users={users}
            onSaveUser={handleSaveUser}
          />
        );
      case 'notifications_admin':
        return (
          <AdminNotifications
            currentUser={currentUser} 
            users={users} 
            settings={settings}
            onRefreshSettings={loadConfig}
            onBackToInbox={() => setCurrentTab('notifications')}
          />
        );
      case 'utilities':
        return <UtilitiesModule currentUser={currentUser} />;
      case 'edu':
        return <EduModule currentUser={currentUser} settings={settings} />;
      // Các chức năng con của Giáo dục có link riêng, mở thẳng vào màn hình tương ứng.
      case 'edu_bank':
        return <EduModule key="edu_bank" currentUser={currentUser} settings={settings} initialView="assignment_bank" />;
      case 'edu_exam':
        return <EduModule key="edu_exam" currentUser={currentUser} settings={settings} initialView="exam_bank" />;
      case 'edu_question_bank':
        return <EduModule key="edu_question_bank" currentUser={currentUser} settings={settings} initialView="question_bank" />;
      case 'edu_grade':
        return <EduModule key="edu_grade" currentUser={currentUser} settings={settings} initialView="grade_entry" />;
      case 'courses':
        return <CoursesApp currentUser={currentUser} />;
      case 'slides':
        return <SlidesModule currentUser={currentUser} />;
      case 'elearning':
        return <ELearningModule currentUser={currentUser} onExit={() => setCurrentTab('dashboard')} />;
      case 'remier':
        return <RemierModule currentUser={currentUser} />;
      case 'scientific_cv':
        return <ScientificCvModule currentUser={currentUser} />;
      case 'qr_codes':
        return <QrCodeModule currentUser={currentUser} />;
      case 'automatic':
        return <React.Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">Đang tải Automatic...</div>}><AutomaticModule currentUser={currentUser} /></React.Suspense>;
      // Mã cũ của mục Tạo AR. Giữ lại để tài khoản nào đang mở sẵn mục này, hoặc có
      // đường dẫn cũ lưu trong trình duyệt, vẫn vào đúng nơi thay vì gặp trang trắng.
      case 'ar_module':
        return <UtilitiesModule currentUser={currentUser} initialTool="ar" standalone />;
      case 'utility_image_resize':
        return <UtilitiesModule currentUser={currentUser} initialTool="image_resize" standalone />;
      case 'utility_file_compress':
        return <UtilitiesModule currentUser={currentUser} initialTool="file_compress" standalone />;
      case 'vr360':
        return <VR360Module currentUser={currentUser} />;
      case 'utility_social_design':
        return <UtilitiesModule currentUser={currentUser} initialTool="social_design" standalone />;
      case 'public_search':
        return <PublicJournalSearch onLoginClick={() => setCurrentTab('dashboard')} />;
      case 'portfolio_website':
        return <PortfolioWebsite 
          currentUser={currentUser} 
          isAuthenticated={Boolean(currentUser)} 
          onUpdateUser={handleSaveProfile} 
          onLogout={handleLogout}
          onEnterSystem={() => {
          if (currentUser?.role === 'member') {
            setEntryView('portfolio');
          } else {
            setCurrentTab('dashboard');
          }
        }} />;
      case 'portfolio_cms':
        return <PortfolioCMS currentUser={currentUser} />;
      case 'guide':
        return <GuideSection />;
      default:
        return <DashboardOverview onSwitchTab={(tab) => setCurrentTab(tab)} settings={settings} users={users} currentUser={currentUser} onRefreshSettings={loadConfig} />;
    }
  };


  // Chế độ tạm tắt hệ thống: khi admin bật, mọi khách và người dùng thường đều thấy trang
  // thông báo tạm đóng hoặc đang nâng cấp. Admin đăng nhập vẫn dùng bình thường để tắt lại.
  // Vẫn cho vào màn hình đăng nhập để admin có lối vào bật tắt chế độ này.
  const inMaintenance = settingsLoaded && !!settings.maintenanceMode && currentUser?.role !== 'admin';
  if (inMaintenance && entryView !== 'login') {
    return (
      <MaintenanceScreen
        variant={settings.maintenanceVariant || 1}
        date={settings.maintenanceDate}
        title={settings.webAppTitle}
        onAdminLogin={() => setEntryView('login')}
      />
    );
  }

  // Link AR công khai phải hiển thị ngay, không chờ bước khởi tạo phân quyền,
  // nếu không thì Supabase hoặc Firestore chậm sẽ làm màn hình quét đứng vĩnh viễn.
  const isPublicARRoute = !!publicParam('ar');

  if (isPublicARRoute) {
    return <PublicARScanner />;
  }

  // Link xem VR 360 công khai, không cần đăng nhập.
  if (publicParam('vr')) {
    return <PublicVRViewer />;
  }

  // Link làm bài Quizz công khai: sinh viên vào bằng MSSV, không cần đăng nhập.
  const quizSlug = publicParam('quiz');
  if (quizSlug) {
    return <QuizTake slug={quizSlug} />;
  }

  // Link xem bài giảng E-Learning công khai: sinh viên vào bằng MSSV, không cần đăng nhập.
  const elessonToken = publicParam('elesson');
  if (elessonToken) {
    return <ELessonView token={elessonToken} />;
  }

  // Link xem bài tập trong ngân hàng: ai có link đều xem được, không cần MSSV.
  const bankShareToken = publicParam('bt');
  if (bankShareToken) {
    return <EduBankShareView token={bankShareToken} />;
  }

  // Bài giảng trình chiếu chia sẻ công khai (?deck=<mã>).
  const deckToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('deck') : null;
  if (deckToken) {
    return <SlidePublicView token={deckToken} />;
  }
  // Cửa sổ khán giả khi trình chiếu ở chế độ người thuyết trình (?audience=<mã>).
  const audienceId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('audience') : null;
  if (audienceId) {
    return <SlideAudience channel={audienceId} />;
  }

  // Trang xem bài giảng ở chế độ riêng, có link riêng: dùng để xem/chia sẻ bài công khai.
  const elviewId = publicParam('elview');
  if (elviewId) {
    return <ELessonPreviewPage lessonId={elviewId} />;
  }

  const isForcePublic = typeof window !== 'undefined' && (
    window.location.search.includes('public=true') ||
    new URLSearchParams(window.location.search).get('tab') === 'tra-cuu' ||
    new URLSearchParams(window.location.search).get('tab') === 'public_search'
  );
  if (isForcePublic) {
    return (
      <PublicJournalSearch 
        onLoginClick={() => {
          window.location.href = window.location.origin;
        }} 
      />
    );
  }

  // Cách 1 chống nhá lần đầu: khi máy chưa có cache cấu hình, hiện màn chờ nhỏ cho tới khi tải xong
  // cấu hình rồi mới vẽ giao diện, để không bao giờ thấy tên chức năng, màu, ảnh mặc định trước.
  if (!settingsLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-brand animate-spin" style={{ borderTopColor: 'var(--color-brand, #10b981)' }} />
        <p className="text-xs font-semibold text-slate-400">Đang tải cấu hình...</p>
      </div>
    );
  }

  // Xem thử màn chào chưa đăng nhập khi đang đăng nhập (link ?chao=1, admin mở từ Cấu hình hệ thống).
  if (welcomePreview) {
    return <PhoneWelcome settings={settings} users={users} onClosePreview={() => {
      const url = new URL(window.location.href); url.searchParams.delete('chao'); window.history.replaceState({}, '', url.toString()); setWelcomePreview(false); if (currentUser) setEntryView('admin');
    }} />;
  }

  // Điện thoại chưa đăng nhập: màn chào có sẵn ô đăng nhập, đăng ký ngay trên màn hình (thay trang đầu và trang đăng nhập).
  if (isPhone && !currentUser && (entryView === 'landing' || entryView === 'login' || (entryView === 'admin' && authInitialized))) {
    return (
      <PhoneWelcome
        settings={settings}
        users={users}
        initialMode={loginMode}
        onLoginSuccess={(user) => { handleLoginSuccess(user); setEntryView('admin'); }}
      />
    );
  }

  // Điện thoại đã đăng nhập mà mở trang đầu: vẫn dùng màn chào, nút Đăng nhập đổi thành Vào EduGo.
  if (isPhone && currentUser && entryView === 'landing') {
    return <PhoneWelcome settings={settings} users={users} user={currentUser} onEnter={() => { setCurrentTab('dashboard'); setEntryView('admin'); }} />;
  }

  // Trang đầu EduGo cho khách: giới thiệu, đăng nhập, đăng ký.
  if (entryView === 'landing') {
    return (
      <LandingPage
        settings={settings}
        currentUser={currentUser}
        onLogin={() => { setLoginMode('login'); setEntryView('login'); }}
        onRegister={() => { setLoginMode('register'); setEntryView('login'); }}
        onEnter={() => { setCurrentTab('dashboard'); setEntryView('admin'); }}
      />
    );
  }

  // Trang Website công khai (mở từ link chia sẻ hoặc địa chỉ riêng của người dùng).
  if (entryView === 'portfolio' && siteState.status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-brand animate-spin" />
      </div>
    );
  }
  if (entryView === 'portfolio' && siteState.status === 'missing') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-xl font-bold text-slate-800">Không tìm thấy trang</p>
          <p className="text-[13px] text-slate-500">Địa chỉ ngtduc24.github.io/{siteState.slug} chưa có ai dùng hoặc trang đang tạm ẩn.</p>
          <a href="/" className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">Về trang chủ EduGo</a>
        </div>
      </div>
    );
  }
  if (entryView === 'portfolio') {
    return (
      <PortfolioWebsite
        key={siteState.slug || 'legacy'}
        siteSlug={siteState.slug || undefined}
        site={siteState.rec || null}
        currentUser={currentUser}
        isAuthenticated={Boolean(currentUser)}
        onUpdateUser={handleSaveProfile}
        onLogout={handleLogout}
        onEnterSystem={() => {
          if (currentUser?.role === 'member') {
            const url = new URL(window.location.href);
            url.pathname = '/';
            url.searchParams.set('portfolio', 'true');
            url.searchParams.set('page', 'my-courses');
            window.history.pushState({}, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
            return;
          }
          setCurrentTab('dashboard');
          setEntryView(currentUser ? 'admin' : 'login');
        }}
      />
    );
  }

  // Only show the login form after the visitor explicitly requests Admin access,
  // or when authentication check has completed and there is no logged in user.
  if (entryView === 'login' || (authInitialized && !currentUser)) {
    return (
      <LoginScreen 
        users={users} 
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          setEntryView('admin');
        }} 
        initialMode={loginMode}
        key={loginMode}
        onBackToPublic={() => setEntryView('landing')}
      />
    );
  }

  // Nếu đang khôi phục phiên đăng nhập khi F5 từ trang admin, hiển thị skeleton mượt mà không flash login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8">
          {settings.loadingGif ? (
            <img src={settings.loadingGif} alt="Đang tải" className="w-20 h-20 object-contain mx-auto mb-3" />
          ) : (
            <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          )}
          <p className="text-xs font-semibold text-slate-500">Đang đồng bộ quyền truy cập...</p>
        </div>
      </div>
    );
  }

  const getNavItems = () => {
    if (!currentUser) return [];
    const items = [
      { id: 'dashboard', label: 'Tổng quan Dashboard', icon: LayoutDashboard },
      { id: 'tasks', label: 'Quản lý Công việc', icon: ClipboardList },
      { id: 'scientific_journals', label: 'Quản lý điểm báo khoa học', icon: BookOpen },
      { id: 'calculator', label: 'Tính Cỡ Mẫu Nghiên Cứu', icon: Calculator },
      { id: 'qualitative_analysis', label: 'Phân tích định tính', icon: FolderKanban },
      { id: 'quantitative_analysis', label: 'Phân tích số liệu định lượng', icon: Calculator },
      { id: 'edu', label: 'Quản lý Giáo dục', icon: GraduationCap },
      { id: 'slides', label: 'Bài giảng', icon: Presentation },
      { id: 'elearning', label: 'Giáo trình', icon: BookOpen },
      { id: 'remier', label: 'Remier · Dựng phim', icon: Film },
      { id: 'scientific_cv', label: 'Lý lịch khoa học', icon: FileUser },
      { id: 'qr_codes', label: 'Tạo mã QR', icon: QrCode },
      { id: 'automatic', label: 'Automatic', icon: Workflow },
      { id: 'utilities', label: 'Tiện ích', icon: Wrench },
      { id: 'portfolio_cms', label: 'Website', icon: Shield },
      { id: 'notifications', icon: Bell, label: 'Thông báo' },
    ];
    
    const allowed = items.filter(item => {
      if (item.id === 'notifications') return true;
      if (currentUser.role === 'admin') return true;
      return hasPermission(item.id);
    });

    if (currentUser.role === 'admin') {
      allowed.push({ id: 'users', label: 'Quản lý người dùng', icon: Users });
      allowed.push({ id: 'permissions', label: 'Phân quyền người dùng', icon: Shield });
    }

    if (currentUser.role === 'admin' || currentUser.permissions.includes('notifications')) {
      allowed.push({ id: 'notifications_admin', label: 'Chức năng thông báo', icon: Bell });
    }


    if (currentUser.role === 'admin' || currentUser.permissions.includes('settings')) {
      allowed.push({ id: 'settings', label: 'Cấu hình hệ thống', icon: Settings });
    }

    return allowed;
  };

  if (isPhone) {
    const PHONE_SCREENS = ['dashboard', 'all_features', 'notifications', 'me'];
    const phoneContent = currentTab === 'dashboard' ? <PhoneHome />
      : currentTab === 'all_features' ? <PhoneAllFeatures />
      : currentTab === 'notifications' ? <PhoneNotifications />
      : currentTab === 'me' ? <PhoneAccount onLogout={handleLogout} />
      : renderActiveTab();
    return (
      <TaskProvider>
        <PhoneShell user={currentUser} settings={settings} tab={currentTab} setTab={setCurrentTab} unread={myNotifs.unread} bare={PHONE_SCREENS.includes(currentTab)}>
          {phoneContent}
        </PhoneShell>
        {showProfileModal && currentUser && (
          <ProfileModal user={currentUser} onSaveProfile={handleSaveProfile} onClose={() => setShowProfileModal(false)} isReadOnly={profileModalReadOnly} />
        )}
      </TaskProvider>
    );
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans" id="app-root">
      {isPhoneDevice && (
        <button type="button" onClick={() => setUiPreference('auto')} className="fixed bottom-3 left-1/2 z-[300] -translate-x-1/2 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-lg">Về giao diện điện thoại</button>
      )}
      
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setCurrentTab('profile')}
        settings={settings}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Dynamic Inner Tab View */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 ${currentTab === 'dashboard' ? '!pt-3' : ''}`} id="main-content">
          <TaskProvider>
            <div className="max-w-[1720px] mx-auto space-y-6">
              {renderActiveTab()}
            </div>
          </TaskProvider>
        </main>


      </div>

      {showProfileModal && currentUser && (
        <ProfileModal
          user={currentUser}
          onSaveProfile={handleSaveProfile}
          onClose={() => setShowProfileModal(false)}
          isReadOnly={profileModalReadOnly}
        />
      )}

      {/* Nút nổi trợ lý ảo. Admin bật tắt trong Cấu hình hệ thống; mặc định bật. */}
      {currentUser && currentUser.role !== 'member' && settings.assistantFloating !== false && (
        <VirtualAssistant currentUser={currentUser} settings={settings} onSwitchTab={setCurrentTab} />
      )}

    </div>
  );
}
