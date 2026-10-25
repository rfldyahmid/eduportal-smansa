import React, { useState, useEffect } from 'react';
import { UserAccount } from './types';
import { getActiveSession, setActiveSession } from './utils/storage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { VisiMisiView } from './components/VisiMisiView';
import { PrincipalSpeechView } from './components/PrincipalSpeechView';
import { TeachersView } from './components/TeachersView';
import { PPDBView } from './components/PPDBView';
import { GalleryView } from './components/GalleryView';
import { ContactView } from './components/ContactView';
import { AuthModal } from './components/Portal/AuthModal';
import { StudentPortal } from './components/Portal/StudentPortal';
import { TeacherPortal } from './components/Portal/TeacherPortal';
import { AdminPortal } from './components/Portal/AdminPortal';
import { apiGetMe, hasAuthToken } from './utils/api';

import { KombelView } from './components/KombelView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('beranda');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('sman1halteng_theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('sman1halteng_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Initialize persistent database and restore session
  useEffect(() => {
    async function init() {
      const session = getActiveSession();
      if (session || hasAuthToken()) {
        try {
          const verifiedUser = await apiGetMe();
          if (verifiedUser.mustChangePassword) {
            setActiveSession(null);
            setIsAuthOpen(true);
          } else {
            setActiveSession(verifiedUser);
            setCurrentUser(verifiedUser);
          }
        } catch {
          // Do not restore a browser-cached session when the server no longer recognizes it.
          setActiveSession(null);
        }
      }
      setDbReady(true);
    }
    init();

    const handleSessionUpdate = () => {
      const updated = getActiveSession();
      setCurrentUser(updated);
    };

    window.addEventListener('storage-session-updated', handleSessionUpdate);
    return () => window.removeEventListener('storage-session-updated', handleSessionUpdate);
  }, []);

  const handleOpenAuth = () => {
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setCurrentTab('portal');
  };

  const handleLogout = () => {
    setActiveSession(null);
    setCurrentUser(null);
    setCurrentTab('beranda');
  };

  const handleOpenPortal = () => {
    if (currentUser) {
      setCurrentTab('portal');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
        Memuat Sistem Informasi SMAN 1 Halmahera Tengah...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-900 selection:text-white">
      {/* Top Navigation */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleNavigate}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenPortal={handleOpenPortal}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(mode => !mode)}
      />

      {/* Main Content Sections */}
      <main className="min-w-0 w-full flex-1">
        {currentTab === 'beranda' && (
          <HomeView
            onNavigate={handleNavigate}
            onOpenPortal={handleOpenPortal}
          />
        )}

        {currentTab === 'visimisi' && (
          <VisiMisiView
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'sambutan' && (
          <PrincipalSpeechView
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'guru' && (
          <TeachersView
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'kombel' && (
          <KombelView
            onNavigate={handleNavigate}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'ppdb' && (
          <PPDBView
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'galeri' && (
          <GalleryView
            onNavigate={handleNavigate}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'kontak' && (
          <ContactView
            onNavigate={handleNavigate}
          />
        )}

        {/* Integrated Academic Portal */}
        {currentTab === 'portal' && currentUser && (
          <div>
            {currentUser.role === 'siswa' && (
              <StudentPortal
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )}

            {(currentUser.role === 'guru' || currentUser.role === 'ketua_kombel') && (
              <TeacherPortal
                currentUser={currentUser}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
              />
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'kepala_sekolah') && (
              <AdminPortal
                currentUser={currentUser}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
              />
            )}
          </div>
        )}
      </main>

      {/* Institutional Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenPortal={handleOpenPortal}
      />

      {/* Encrypted Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
