import { NavLink, useLocation } from 'react-router-dom';
import { X, Truck } from 'lucide-react';
import { NAV_SECTIONS } from './nav';
import { cn } from '../lib/cn';
import { usePermissions } from '../lib/permissions';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  orgName?: string;
}

export function Sidebar({ open, onClose, orgName }: SidebarProps) {
  const { can, isPlatformAdmin } = usePermissions();
  const location = useLocation();

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-ink-900 border-r border-ink-200/60 dark:border-ink-800/60 flex flex-col transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-200/60 dark:border-ink-800/60 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-sm">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-ink-900 dark:text-white leading-tight">FleetControl</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider">360</p>
          </div>
          <button onClick={onClose} className="ml-auto lg:hidden text-ink-400 hover:text-ink-600 dark:hover:text-ink-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {orgName && (
          <div className="px-4 py-3 border-b border-ink-100 dark:border-ink-800/60">
            <p className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">Entreprise</p>
            <p className="text-sm font-medium text-ink-800 dark:text-ink-100 truncate mt-0.5">{orgName}</p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => !item.permission || isPlatformAdmin || can(item.permission));
            if (items.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="sidebar-section">{section.title}</p>
                {items.map((item) => {
                  const active = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={cn('sidebar-link', active && 'sidebar-link-active')}
                    >
                      <item.icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-ink-100 dark:border-ink-800/60 flex-shrink-0">
          <p className="text-[10px] text-ink-400 dark:text-ink-500">© 2024 FleetControl 360</p>
        </div>
      </aside>
    </>
  );
}
