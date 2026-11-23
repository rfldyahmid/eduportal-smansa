import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import { IMAGES } from '../../assets/images';

export interface PortalNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  children?: { id: string; label: string }[];
}

interface PortalSidebarProps {
  title: string;
  userName?: string;
  items: PortalNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({ title, userName, items, activeId, onSelect }) => {
  const activeParent = items.find(item => item.children?.some(child => child.id === activeId))?.id;
  const [expanded, setExpanded] = useState<string[]>(activeParent ? [activeParent] : []);

  useEffect(() => {
    if (activeParent) setExpanded(current => current.includes(activeParent) ? current : [...current, activeParent]);
  }, [activeParent]);

  const toggle = (id: string) => setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  return (
    <aside className="flex h-[100dvh] min-h-[100dvh] min-w-0 flex-col overflow-hidden bg-slate-950 text-white shadow-xl lg:sticky lg:top-0">
      <div className="shrink-0 px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <img src={IMAGES.logoSekolah} alt="" className="h-11 w-11 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold tracking-wide text-white">SMA NEGERI 1 HALTENG</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">{title}</p>
          </div>
        </div>
        {userName && <div className="mt-4 flex items-center gap-3 border-y border-white/10 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300/50 bg-amber-300/10 text-sm font-bold text-amber-200">{userName.trim().charAt(0).toUpperCase()}</span>
          <div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{userName}</p><p className="mt-1 text-[10px] text-slate-400">{title}</p></div>
        </div>}
      </div>
      <nav aria-label={`Navigasi ${title}`} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = item.id === activeId || item.children?.some(child => child.id === activeId) || false;
          const isExpanded = expanded.includes(item.id);
          return (
            <div key={item.id}>
              {item.children ? (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggle(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${isActive ? 'bg-white/10 text-amber-300' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
              ) : (
                <button
                  type="button"
                  aria-current={activeId === item.id ? 'page' : undefined}
                  onClick={() => onSelect(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${activeId === item.id ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="min-w-0 flex-1">{item.label}</span>
                </button>
              )}
              {item.children && isExpanded && (
                <div className="ml-5 mt-1 space-y-1 border-l border-white/15 pl-3">
                  {item.children.map(child => (
                    <button
                      key={child.id}
                      type="button"
                      aria-current={activeId === child.id ? 'page' : undefined}
                      onClick={() => onSelect(child.id)}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${activeId === child.id ? 'bg-amber-400 font-semibold text-slate-950' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto shrink-0 border-t border-white/10 px-4 py-4 text-[10px] leading-relaxed text-slate-400">
        Sistem informasi sekolah<br />{title === 'Kepala Sekolah' ? 'Akses pemantauan · hanya melihat' : 'Akses pengelolaan Admin'}
      </div>
    </aside>
  );
};
