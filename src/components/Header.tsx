import React, { useState, useEffect, useRef } from 'react';
import { UserAccount } from '../types';
import { fetchAnnouncements, fetchStudentNotificationReads } from '../utils/api';
import { Menu, X, User, LogOut, ChevronRight, Bell, LayoutDashboard, Moon, Sun, Mail, Phone } from 'lucide-react';
import { IMAGES } from '../assets/images';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onOpenPortal: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenAuth,
  onOpenPortal,
  onLogout,
  isDarkMode,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<number>(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const upperAreaRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const upperArea = upperAreaRef.current;
    if (!header || !upperArea) return;

    const updateUpperHeight = () => {
      header.style.setProperty('--header-upper-height', `${upperArea.offsetHeight}px`);
    };

    updateUpperHeight();
    const resizeObserver = new ResizeObserver(updateUpperHeight);
    resizeObserver.observe(upperArea);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let accumulatedScrollDelta = 0;
    let animationFrame = 0;

    const updateHeaderOnScroll = () => {
      animationFrame = 0;
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      if (currentScrollY <= 8) {
        setIsCollapsed(false);
        accumulatedScrollDelta = 0;
      } else if (mobileMenuOpen) {
        setIsCollapsed(false);
        accumulatedScrollDelta = 0;
      } else if (scrollDelta > 0) {
        accumulatedScrollDelta = Math.max(0, accumulatedScrollDelta) + scrollDelta;
        if (accumulatedScrollDelta >= 12 && currentScrollY > 90) {
          setIsCollapsed(true);
          accumulatedScrollDelta = 0;
        }
      } else if (scrollDelta < 0) {
        accumulatedScrollDelta = Math.min(0, accumulatedScrollDelta) + scrollDelta;
        if (accumulatedScrollDelta <= -12) {
          setIsCollapsed(false);
          accumulatedScrollDelta = 0;
        }
      }

      lastScrollY = currentScrollY;
    };

    const handleScroll = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(updateHeaderOnScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let active = true;
    const updateUnread = async () => {
      if (currentUser?.role !== 'siswa') {
        setUnreadAnnouncements(0);
        return;
      }
      try {
        const [announcements, readKeys] = await Promise.all([
          fetchAnnouncements(),
          fetchStudentNotificationReads()
        ]);
        if (active) {
          const read = new Set(readKeys);
          setUnreadAnnouncements(announcements.filter(item => !read.has(`public-announcement:${item.id}`)).length);
        }
      } catch {
        if (active) setUnreadAnnouncements(0);
      }
    };

    updateUnread();
    window.addEventListener('server-announcements-read-updated', updateUnread);
    window.addEventListener('storage-announcements-updated', updateUnread);
    return () => {
      active = false;
      window.removeEventListener('server-announcements-read-updated', updateUnread);
      window.removeEventListener('storage-announcements-updated', updateUnread);
    };
  }, [currentUser]);

  const navLinks = [
    { id: 'beranda', label: 'Beranda' },
    { id: 'visimisi', label: 'Visi & Misi' },
    { id: 'sambutan', label: 'Sambutan Kepsek' },
    { id: 'guru', label: 'Profil Guru' },
    { id: 'kombel', label: 'KOMBEL' },
    { id: 'ppdb', label: 'PPDB' },
    { id: 'galeri', label: 'Galeri' },
    { id: 'kontak', label: 'Kontak' },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      ref={headerRef}
      className={`school-header${isCollapsed ? ' header-collapsed' : ''}`}
    >
      <div className="school-header__upper">
        <div ref={upperAreaRef} className="border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <button
              onClick={() => handleNavClick('beranda')}
              className="group flex min-w-0 items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 sm:gap-3"
            >
              <img
                src={IMAGES.logoSekolah}
                alt="Logo SMA Negeri 1 Halmahera Tengah"
                className="school-logo-3d h-12 w-12 shrink-0 object-contain sm:h-16 sm:w-16 lg:h-[4.5rem] lg:w-[4.5rem]"
              />
              <span className="min-w-0">
                <span className="block break-words font-serif-title text-[10px] font-bold leading-tight tracking-tight text-blue-950 transition-colors group-hover:text-blue-900 min-[375px]:text-xs sm:whitespace-nowrap sm:text-lg lg:text-xl dark:text-blue-100">
                  SMA NEGERI 1 HALMAHERA TENGAH
                </span>
                <span className="mt-1 hidden whitespace-nowrap text-[7px] font-semibold uppercase tracking-[0.08em] text-slate-500 min-[420px]:block min-[420px]:text-[8px] sm:text-[10px] lg:text-[11px] dark:text-slate-400">
                  BUDI LUHUR FAGOGORU · CERDAS · BERPRESTASI
                </span>
              </span>
            </button>

            <div className="hidden shrink-0 items-center gap-3 rounded-xl border border-white/80 bg-white/70 px-4 py-2 text-[11px] text-slate-600 shadow-sm backdrop-blur-sm lg:flex xl:gap-5 xl:text-xs dark:border-slate-700/80 dark:bg-slate-950/40 dark:text-slate-300">
              <a href="mailto:humas@sman1halteng.sch.id" className="inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 dark:hover:text-sky-300">
                <Mail className="h-3.5 w-3.5 shrink-0 text-blue-900 dark:text-sky-300" />
                <span>humas@sman1halteng.sch.id</span>
              </a>
              <span aria-hidden="true" className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <a href="tel:+629213120045" className="inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 dark:hover:text-sky-300">
                <Phone className="h-3.5 w-3.5 shrink-0 text-blue-900 dark:text-sky-300" />
                <span>Sekretariat (0921) 312-0045</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <nav aria-label="Navigasi utama" className="school-header__nav relative border-0 bg-gradient-to-r from-white via-sky-100 to-blue-200 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.38)] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-gradient-to-r after:from-transparent after:via-blue-300 after:to-transparent dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:after:via-sky-500/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          <button
            onClick={() => setMobileMenuOpen(open => !open)}
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-blue-950 transition-colors hover:bg-blue-900/10 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 xl:hidden dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-amber-300 dark:focus-visible:outline-amber-300"
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            {currentUser?.role === 'siswa' && unreadAnnouncements > 0 && !mobileMenuOpen && (
              <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-3 xl:flex xl:gap-6">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
              {navLinks.map(link => {
                const isActive = currentTab === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => handleNavClick(link.id)}
                    className={`group relative inline-flex items-center whitespace-nowrap px-3 py-3 text-xs font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 2xl:text-sm dark:focus-visible:outline-amber-300 ${
                      isActive
                        ? 'font-extrabold tracking-wider text-blue-950 dark:text-sky-300'
                        : 'text-slate-700 hover:text-blue-900 dark:text-slate-300 dark:hover:text-sky-300'
                    }`}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3 bottom-1 h-0.5 origin-center rounded-full bg-gradient-to-r from-sky-500 via-blue-700 to-indigo-500 transition-transform duration-200 dark:from-sky-300 dark:via-blue-400 dark:to-indigo-300 ${
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {currentUser ? (
                <>
                  <button onClick={onOpenPortal} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-900/30 px-2.5 py-2 text-xs font-semibold text-blue-950 transition-colors hover:bg-blue-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 dark:border-white/30 dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-amber-300">
                    <LayoutDashboard className="h-4 w-4" /><span>Dashboard</span>
                  </button>
                  <button onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 py-2 text-xs font-semibold text-blue-950 shadow-sm transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
                    <LogOut className="h-4 w-4" /><span>Logout</span>
                  </button>
                </>
              ) : (
                <button onClick={onOpenAuth} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-blue-950 shadow-sm transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
                  <User className="h-3.5 w-3.5" /><span>Login</span>
                </button>
              )}
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-900/25 text-blue-950 transition-colors hover:bg-blue-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 dark:border-white/30 dark:text-slate-100 dark:hover:bg-white/10 dark:focus-visible:outline-amber-300"
                aria-label={isDarkMode ? 'Aktifkan mode terang' : 'Aktifkan mode malam'}
                title={isDarkMode ? 'Aktifkan mode terang' : 'Aktifkan mode malam'}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 xl:hidden">
            {currentUser ? (
              <>
                <button onClick={onOpenPortal} aria-label="Dashboard" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-900/30 text-blue-950 transition-colors hover:bg-blue-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 dark:border-white/30 dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-amber-300">
                  <LayoutDashboard className="h-4 w-4" />
                </button>
                <button onClick={onLogout} aria-label="Logout" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-blue-950 transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button onClick={onOpenAuth} aria-label="Login" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-blue-950 transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">
                <User className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-900/25 text-blue-950 transition-colors hover:bg-blue-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 dark:border-white/30 dark:text-slate-100 dark:hover:bg-white/10 dark:focus-visible:outline-amber-300"
              aria-label={isDarkMode ? 'Aktifkan mode terang' : 'Aktifkan mode malam'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div
          id="mobile-navigation"
          className={`${mobileMenuOpen ? 'block' : 'hidden'} border-t border-slate-100 bg-white px-4 py-3 shadow-lg animate-in fade-in duration-150 xl:hidden dark:border-slate-800 dark:bg-slate-950`}
        >
            <div className="mx-auto max-w-7xl space-y-1">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 dark:focus-visible:outline-amber-300 ${
                    currentTab === link.id
                      ? 'bg-blue-50 font-semibold text-blue-950 dark:bg-slate-800 dark:text-sky-300'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-blue-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-sky-300'
                  }`}
                >
                  <span>{link.label}</span><ChevronRight className="h-4 w-4 text-current opacity-60" />
                </button>
              ))}
            </div>
        </div>
      </nav>
    </header>
  );
};
