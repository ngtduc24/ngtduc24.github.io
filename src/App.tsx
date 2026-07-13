import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import SampleSizeCalculator from './components/SampleSizeCalculator';
import PublicJournalSearch from './components/PublicJournalSearch';
import GuideSection from './components/GuideSection';
import UserManagement from './components/UserManagement';
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
import PortfolioWebsite from './components/PortfolioWebsite';
import PortfolioCMS from './components/PortfolioCMS';
import { TaskProvider } from './components/TaskContext';
import { ShieldAlert, RefreshCw, LayoutDashboard, Calculator, BookOpen, Users, Settings, ClipboardList, Shield, Bell, Layers, Image } from 'lucide-react';
import { saveUser, deleteUser, getUsers, mapUserFromDB, seedDefaultUsersIfNeeded, getDefaultSettingsFromSupabase, saveDefaultSettingsToSupabase, testSupabaseConnection, getNotificationsFromSupabase, USERS_TABLE } from './lib/data';
import { supabase } from './lib/supabase';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { requestFCMToken, getMessagingInstance } from './lib/firebase';
import { AppSettings, UserAccount } from './types';
import { onMessage } from 'firebase/messaging';

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const cached = localStorage.getItem('logged_in_user');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app_last_active_tab') || 'dashboard';
    }
    return 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('app_last_active_tab', currentTab);
  }, [currentTab]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

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

  const [initialized, setInitialized] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [showPublicSearch, setShowPublicSearch] = useState<boolean>(true);
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

  // Real-time listener for unread notifications count
  useEffect(() => {
    if (!currentUser) {
      setUnreadNotificationsCount(0);
      return;
    }
    
    let currentSupabaseNotifs: any[] = [];
    
    const updateCounts = () => {
      const newUnreadSupabase = currentSupabaseNotifs.filter(fn => {
        if (localStorage.getItem(`notif_deleted_${currentUser.id}_${fn.id}`) === 'true') return false;
        const readKey = `notif_read_${currentUser.id}_${fn.id}`;
        return localStorage.getItem(readKey) !== 'true';
      }).length;
      
      let newUnreadLocal = 0;
      const stored = localStorage.getItem(`notifications_${currentUser.id}`);
      if (stored) {
        try {
          const localNotifs = JSON.parse(stored);
          const filteredLocal = localNotifs.filter((n: any) => !n.id.startsWith("system-welcome-") && !n.id.startsWith("journal-sync-") && !n.id.startsWith("task-tip-"));
          newUnreadLocal = filteredLocal.filter((n: any) => n.unread).length;
        } catch (e) {}
      } else {
        newUnreadLocal = 0;
      }
      setUnreadNotificationsCount(newUnreadSupabase + newUnreadLocal);
    };

    const channel = supabase
      .channel('app-notifications-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_notifications' }, () => {
        loadNotifs();
      })
      .subscribe();

    async function loadNotifs() {
      const notifs = await getNotificationsFromSupabase();
      currentSupabaseNotifs = notifs.filter(fn => {
        let isTarget = false;
        if (fn.targetAudience === 'all') isTarget = true;
        else if (fn.targetAudience === 'all_admins' && currentUser.role === 'admin') isTarget = true;
        else if (fn.targetAudience === 'custom_admins' && currentUser.role === 'admin' && fn.targetUserIds?.includes(currentUser.id)) isTarget = true;
        else if (fn.targetAudience === 'custom_users' && fn.targetUserIds?.includes(currentUser.id)) isTarget = true;
        return isTarget;
      });
      updateCounts();
    }
    
    loadNotifs();
    window.addEventListener('app_notifications_changed', updateCounts);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('app_notifications_changed', updateCounts);
    };
  }, [currentUser]);
  
  const [settings, setSettings] = useState<AppSettings>({
    id: "general_config",
    defaultCoverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80",
    themeColor: "green-black",
    webAppTitle: "Smart Research VN",
    webAppIcon: "",
    footerText: "Hệ thống hỗ trợ tính toán phương pháp nghiên cứu định lượng toàn diện.",
    allowPublicAccess: true,
    systemDescription: "Hệ thống hỗ trợ tính toán phương pháp nghiên cứu định lượng chuẩn hóa."
  });

  // Load configuration from Supabase
  const loadConfig = async () => {
    try {
      const s = await getDefaultSettingsFromSupabase();
      setSettings(s);
    } catch (e) {
      console.error("Lỗi khi load config hệ thống:", e);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Sync favicon/title and theme color changes
  useEffect(() => {
    if (settings.webAppTitle) {
      document.title = settings.webAppTitle;
    }
  }, [settings.webAppTitle]);

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
    const theme = settings.themeColor || 'green-black';
    const root = document.documentElement;
    
    if (settings.primaryColor && settings.secondaryColor) {
      root.style.setProperty('--color-brand', settings.primaryColor);
      root.style.setProperty('--color-brand-hover', settings.secondaryColor);
      // Generate a light version for brand-light, simple approximation or could do more complex
      root.style.setProperty('--color-brand-light', `${settings.primaryColor}15`); 
    } else {
      if (theme === 'green-black') {
        root.style.setProperty('--color-brand', '#10b981'); // Emerald
        root.style.setProperty('--color-brand-hover', '#059669');
        root.style.setProperty('--color-brand-light', '#ecfdf5');
      } else if (theme === 'purple-indigo') {
        root.style.setProperty('--color-brand', '#712cf9'); // Purple
        root.style.setProperty('--color-brand-hover', '#5b21d3');
        root.style.setProperty('--color-brand-light', '#f3eeff');
      } else if (theme === 'blue-cyan') {
        root.style.setProperty('--color-brand', '#3b82f6'); // Blue
        root.style.setProperty('--color-brand-hover', '#2563eb');
        root.style.setProperty('--color-brand-light', '#eff6ff');
      } else if (theme === 'red-orange') {
        root.style.setProperty('--color-brand', '#ef4444'); // Red
        root.style.setProperty('--color-brand-hover', '#dc2626');
        root.style.setProperty('--color-brand-light', '#fef2f2');
      } else if (theme === 'amber-yellow') {
        root.style.setProperty('--color-brand', '#f59e0b'); // Amber
        root.style.setProperty('--color-brand-hover', '#d97706');
        root.style.setProperty('--color-brand-light', '#fefbeb');
      }
    }
  }, [settings.themeColor, settings.primaryColor, settings.secondaryColor]);

  // Initialize and sync with Firebase
  useEffect(() => {
    const initFirebaseSync = async () => {
      // 0. Test connection (Keep this for other Supabase tables if any, or disable)
      const isConnected = await testSupabaseConnection();
      setDbConnected(isConnected);

      // 2. Initial load
      const loadedUsers = await getUsers();
      setUsers(loadedUsers);
      localStorage.setItem('local_users_cache', JSON.stringify(loadedUsers));
      setInitialized(true);
    };

    initFirebaseSync();

    const unsubscribeUsers = onSnapshot(collection(db, USERS_TABLE), (snapshot) => {
      const loadedUsers = [];
      snapshot.forEach(docSnap => {
        loadedUsers.push(mapUserFromDB(docSnap.data()));
      });
      setUsers(loadedUsers);
      localStorage.setItem('local_users_cache', JSON.stringify(loadedUsers));
      
      setCurrentUser(prevUser => {
        if (prevUser) {
          const updatedUser = loadedUsers.find(u => u.id === prevUser.id);
          if (updatedUser) {
            // Only update if there are actual changes
            if (JSON.stringify(prevUser) !== JSON.stringify(updatedUser)) {
              localStorage.setItem('logged_in_user', JSON.stringify(updatedUser));
              return updatedUser;
            }
          }
        }
        return prevUser;
      });
    });

    const unsubscribeAuth = () => {};
    // Ensure we keep the local storage user on refresh
    try {
      const cached = JSON.parse(localStorage.getItem('logged_in_user') || 'null');
      if (cached) {
        setCurrentUser(cached);
      }
    } catch (e) {
      setCurrentUser(null);
      localStorage.removeItem('logged_in_user');
    }

    return () => {
      unsubscribeUsers();
      unsubscribeAuth();
    };
  }, []);

  // Save or update user in Supabase
  const handleSaveUser = async (user: UserAccount) => {
    try {
      await saveUser(user);
    } catch (e: any) {
      console.warn("Supabase error on saveUser, using localStorage fallback:", e);
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
    try {
      await saveUser(updatedUser);
    } catch (e) {
      console.warn("Supabase error on saveProfile, using localStorage fallback:", e);
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
  };

  // Delete user from Supabase
  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
    } catch (e) {
      console.warn("Supabase error on deleteUser, using localStorage fallback:", e);
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
    if (user.role === 'admin') {
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
    await signOut(auth);
    setCurrentUser(null);
    localStorage.removeItem('logged_in_user');
    setCurrentTab('dashboard');
  };

  // Helper check to verify if currentUser has permission to view a tab
  const hasPermission = (tabId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    
    if (tabId === 'notifications') return true; // All registered users have notifications inbox access
    if (tabId === 'portfolio_website') return true;
    if (tabId === 'users') return false; // Only admin can ever see users panel
    if (tabId === 'settings') return currentUser.permissions.includes('settings');
    if (tabId === 'notifications_admin') return currentUser.permissions.includes('notifications');
    if (tabId === 'backup') return false;
    return currentUser.permissions.includes(tabId);
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
        return <MediaLibrary currentUser={currentUser} />;
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
      case 'public_search':
        return <PublicJournalSearch onLoginClick={() => setCurrentTab('dashboard')} />;
      case 'portfolio_website':
        return <PortfolioWebsite onEnterSystem={() => setCurrentTab('dashboard')} />;
      case 'portfolio_cms':
        return <PortfolioCMS />;
      case 'guide':
        return <GuideSection />;
      default:
        return <DashboardOverview onSwitchTab={(tab) => setCurrentTab(tab)} settings={settings} users={users} currentUser={currentUser} onRefreshSettings={loadConfig} />;
    }
  };


  if (!initialized) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Đang khởi động hệ thống phân quyền...</p>
        </div>
      </div>
    );
  }

  // Check if force public search portal is requested in URL
  const isForcePortfolio = typeof window !== 'undefined' && window.location.search.includes('portfolio=true');
  if (isForcePortfolio) {
    return (
      <PortfolioWebsite
        onEnterSystem={() => {
          window.location.href = window.location.origin;
        }}
      />
    );
  }

  const isForcePublic = typeof window !== 'undefined' && window.location.search.includes('public=true');
  if (isForcePublic) {
    return (
      <PublicJournalSearch 
        onLoginClick={() => {
          window.location.href = window.location.origin;
        }} 
      />
    );
  }

  // Auth gate
  if (!currentUser) {
    if (showPublicSearch) {
      return (
        <PortfolioWebsite
          onEnterSystem={() => setShowPublicSearch(false)}
        />
      );
    }
    return (
      <LoginScreen 
        users={users} 
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          setShowPublicSearch(false);
        }} 
        onBackToPublic={() => setShowPublicSearch(true)}
      />
    );
  }

  const getNavItems = () => {
    if (!currentUser) return [];
    const items = [
      { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'tasks', label: 'Dự án', icon: ClipboardList },
      { id: 'scientific_journals', label: 'Tra cứu báo', icon: BookOpen },
      { id: 'calculator', label: 'Tính cỡ mẫu', icon: Calculator },
      { id: 'qualitative_analysis', label: 'Phân tích định tính', icon: Layers },
      { id: 'quantitative_analysis', label: 'Phân tích định lượng', icon: Calculator },
      { id: 'portfolio_cms', label: 'Quản trị Portfolio', icon: Shield },
      { id: 'notifications', icon: Bell, label: 'Thông báo' },
    ];
    
    const allowed = items.filter(item => {
      if (item.id === 'notifications') return true;
      if (currentUser.role === 'admin') return true;
      return currentUser.permissions.includes(item.id);
    });

    if (currentUser.role === 'admin') {
      allowed.push({ id: 'users', label: 'Quản lý thành viên', icon: Users });
    }

    if (currentUser.role === 'admin' || currentUser.permissions.includes('notifications')) {
      allowed.push({ id: 'notifications_admin', label: 'Chức năng thông báo', icon: Bell });
    }

    if (currentUser.role === 'admin' || currentUser.permissions.includes('media_library')) {
      allowed.push({ id: 'media_library', label: 'Thư viện', icon: Image });
    }

    if (currentUser.role === 'admin' || currentUser.permissions.includes('settings')) {
      allowed.push({ id: 'settings', label: 'Cài đặt', icon: Settings });
    }

    return allowed;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans" id="app-root">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        settings={settings}
        unreadCount={unreadNotificationsCount}
        dbConnected={dbConnected}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <Header 
          currentTab={currentTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen} 
          currentUser={currentUser}
          settings={settings}
          onProfileClick={(readOnly = false) => {
            setProfileModalReadOnly(readOnly);
            setShowProfileModal(true);
          }}
          onLogout={handleLogout}
          setCurrentTab={setCurrentTab}
        />

        {/* Responsive Horizontal Navigation Bar (Only visible when sidebar is hidden) */}
        {!sidebarOpen && (
          <div
            className="bg-white px-4 py-2 flex items-center overflow-x-auto scrollbar-none shrink-0 scroll-smooth overscroll-x-contain shadow-xs md:hidden"
            id="horizontal-nav"
            onWheel={(event) => {
              const navigation = event.currentTarget;
              if (navigation.scrollWidth <= navigation.clientWidth) return;
              if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                event.preventDefault();
                navigation.scrollLeft += event.deltaY * 1.15;
              }
            }}
          >
            <div className="flex min-w-max items-center gap-1.5">
              {getNavItems().map(item => {
                const IconComponent = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 relative ${
                      isActive 
                        ? 'bg-brand text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Inner Tab View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8" id="main-content">
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

    </div>
  );
}
