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
  items: PortalNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({ title, items, activeId, onSelect }) => {
  const activeParent = items.find(item => item.children?.some(child => child.id === activeId))?.id;
  const [expanded, setExpanded] = useState<string[]>(activeParent ? [activeParent] : []);

  useEffect(() => {
    if (activeParent) setExpanded(current => current.includes(activeParent) ? current : [...current, activeParent]);
  }, [activeParent]);

  const toggle = (id: string) => setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  return (
    <aside className="h-fit min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl lg:sticky lg:top-4">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <img src={IMAGES.logoSekolah} alt="" className="h-11 w-11 shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold tracking-wide text-white">SMA NEGERI 1 HALTENG</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">{title}</p>
        </div>
      </div>
      <nav aria-label={`Navigasi ${title}`} className="max-h-64 space-y-1 overflow-y-auto p-3 lg:max-h-[calc(100vh-11rem)]">
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
      <div className="border-t border-white/10 px-4 py-3 text-[10px] leading-relaxed text-slate-400">
        Sistem administrasi sekolah<br />Akses sesuai hak pengguna
      </div>
    </aside>
  );
};
