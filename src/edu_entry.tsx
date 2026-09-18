
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import EduModule from './components/EduModule';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProfileModal from './components/ProfileModal';
import './index.css';
import { NotificationProvider } from './components/NotificationContext';
import { ConfirmationProvider } from './components/ConfirmationContext';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserById, getUsers, getDefaultSettingsFromSupabase } from './lib/data';
import { applyBrandTheme } from './lib/applyTheme';
import { UserAccount, AppSettings } from './types';
import { untrackUserPresence, trackUserPresence } from './lib/presence';

function EduApp() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const s = await getDefaultSettingsFromSupabase();
        setSettings(s);
        applyBrandTheme(s);
        const u = await getUsers();
        setUsers(u);
      } catch (e) {
        console.error(e);
      }
    }
    init();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthInitialized(true);
      if (firebaseUser) {
        const profile = await getUserById(firebaseUser.uid);
        setCurrentUser(profile);
        if (profile) trackUserPresence(profile);
      } else {
        setCurrentUser(null);
        untrackUserPresence();
      }
    });

    return () => {
      unsubscribe();
      untrackUserPresence();
    };
  }, []);

  const handleLogout = async () => {
    await untrackUserPresence();
    await signOut(auth);
    window.location.href = '/';
  };

  if (!authInitialized || !settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen 
        users={users} 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'member') {
             window.location.href = '/';
          }
        }} 
        onBackToPublic={() => window.location.href = '/'}
      />
    );
  }

  // Permission check
  if (currentUser.role !== 'admin' && !currentUser.permissions.includes('edu')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-black text-slate-900">Truy cập bị từ chối</h2>
          <p className="text-slate-500">Bạn không có quyền truy cập vào hệ thống Quản lý Giáo dục.</p>
          <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-brand text-white rounded-xl font-bold">Quay về trang chủ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar 
        currentTab="edu" 
        setCurrentTab={(tab) => {
          if (tab !== 'edu') window.location.href = `/?tab=${tab}`;
        }} 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        settings={settings}
        unreadCount={0}
        dbConnected={true}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          currentTab="edu"
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen} 
          currentUser={currentUser}
          settings={settings}
          onProfileClick={() => setShowProfileModal(true)}
          onLogout={handleLogout}
          setCurrentTab={() => {}}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-[1720px] mx-auto">
            <EduModule currentUser={currentUser} settings={settings} />
          </div>
        </main>
      </div>

      {showProfileModal && (
        <ProfileModal 
          user={currentUser} 
          onSaveProfile={async (u) => setCurrentUser(u)} 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <ConfirmationProvider>
        <EduApp />
      </ConfirmationProvider>
    </NotificationProvider>
  </StrictMode>,
);
