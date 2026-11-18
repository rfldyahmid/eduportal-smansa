import React, { lazy, Suspense, useState, useEffect } from 'react';
import { UserAccount } from './types';
import { getActiveSession, setActiveSession } from './utils/storage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { AuthModal } from './components/Portal/AuthModal';
import { apiGetMe, hasAuthToken } from './utils/api';

const VisiMisiView = lazy(() => import('./components/VisiMisiView').then(module => ({ default: module.VisiMisiView })));
const PrincipalSpeechView = lazy(() => import('./components/PrincipalSpeechView').then(module => ({ default: module.PrincipalSpeechView })));
const TeachersView = lazy(() => import('./components/TeachersView').then(module => ({ default: module.TeachersView })));
const PPDBView = lazy(() => import('./components/PPDBView').then(module => ({ default: module.PPDBView })));
const GalleryView = lazy(() => import('./components/GalleryView').then(module => ({ default: module.GalleryView })));
const ContactView = lazy(() => import('./components/ContactView').then(module => ({ default: module.ContactView })));
const StudentPortal = lazy(() => import('./components/Portal/StudentPortal').then(module => ({ default: module.StudentPortal })));
const TeacherPortal = lazy(() => import('./components/Portal/TeacherPortal').then(module => ({ default: module.TeacherPortal })));
const AdminPortal = lazy(() => import('./components/Portal/AdminPortal').then(module => ({ default: module.AdminPortal })));
const KombelView = lazy(() => import('./components/KombelView').then(module => ({ default: module.KombelView })));
export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('beranda');
  const [galleryPhotoToOpen, setGalleryPhotoToOpen] = useState<string | null>(null);
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
            if (verifiedUser.role === 'admin' || verifiedUser.role === 'kepala_sekolah') {
              setCurrentTab('portal');
            }
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
    setIsAuthOpen(true);
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

  const isStandaloneAdminPortal = currentTab === 'portal' &&
    (currentUser?.role === 'admin' || currentUser?.role === 'kepala_sekolah');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-900 selection:text-white">
      {/* Top Navigation */}
      {!isStandaloneAdminPortal && <Header
        currentTab={currentTab}
        setCurrentTab={handleNavigate}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenPortal={handleOpenPortal}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(mode => !mode)}
      />}

      {/* Main Content Sections */}
      <main className="min-w-0 w-full flex-1">
        <Suspense fallback={(
          <div role="status" className="mx-auto flex min-h-48 max-w-7xl items-center justify-center px-4 text-sm text-slate-500">
            Memuat halaman...
          </div>
        )}>
        {currentTab === 'beranda' && (
          <HomeView
            onNavigate={handleNavigate}
            onOpenGalleryPhoto={photoId => {
              setGalleryPhotoToOpen(photoId);
              handleNavigate('galeri');
            }}
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
            initialPhotoId={galleryPhotoToOpen}
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
                onNavigate={handleNavigate}
              />
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'kepala_sekolah') && (
              <AdminPortal
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )}
          </div>
        )}
        </Suspense>
      </main>

      {/* Institutional Footer */}
      {!isStandaloneAdminPortal && <Footer
        onNavigate={handleNavigate}
        onOpenPortal={handleOpenPortal}
      />}

      {/* Encrypted Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
