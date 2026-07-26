import { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Menu, Bell, Sun, Moon, LogOut, Search, ChevronDown, Truck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { initials } from '../lib/format';
import { NOTIFICATION_SEVERITY_COLORS } from '../lib/labels';
import { cn } from '../lib/cn';
import type { Notification } from '../lib/types';
import { usePermissions } from '../lib/permissions';
import { NAV_SECTIONS } from './nav';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, profile, signOut, organization } = useAuth();
  const { can, isPlatformAdmin } = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [globalQuery, setGlobalQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (!active) return;
        const rows = (data as Notification[]) ?? [];
        setNotifications(rows);
        setUnread(rows.filter((n) => !n.is_read).length);
      });
    return () => { active = false; };
  }, [user]);

  const markRead = async (id: string, link?: string | null) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    if (link) navigate(link);
    setNotifOpen(false);
  };

  const onGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalQuery.trim()) navigate(`/vehicles?q=${encodeURIComponent(globalQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-ink-900/80 backdrop-blur-md border-b border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2 px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden btn-ghost p-2">
        <Menu className="w-5 h-5" />
      </button>

      {/* Section Logo */}
      <div className="flex items-center gap-2.5 mr-4 flex-shrink-0">
        {organization?.logo_url ? (
          <div className="flex items-center gap-2">
            <img 
              src={organization.logo_url} 
              alt={organization.name} 
              className="h-9 w-auto max-w-[120px] object-contain rounded"
            />
            <span className="hidden xl:inline font-semibold text-sm text-ink-800 dark:text-white border-l border-ink-200 dark:border-ink-800 pl-2">
              {organization.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-sm">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="font-display font-bold text-sm text-ink-900 dark:text-white leading-tight">FleetControl</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider">360</p>
            </div>
          </div>
        )}
      </div>

      {/* Menu horizontal */}
      <nav className="hidden lg:flex items-center gap-1 px-2 mr-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.permission || isPlatformAdmin || can(item.permission));
          if (items.length === 0) return null;
          
          if (section.title === 'Pilotage') {
            const PilotIcon = items[0].icon;
            return (
              <NavLink
                key={items[0].to}
                to={items[0].to}
                className={({ isActive }) => cn(
                  'px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5',
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                    : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100 hover:bg-ink-100/50 dark:hover:bg-ink-800/50'
                )}
              >
                <PilotIcon className="w-4 h-4" />
                <span>{items[0].label}</span>
              </NavLink>
            );
          }

          return (
            <div key={section.title} className="relative group">
              <button className="px-3 py-2 text-sm font-semibold rounded-lg text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-100 hover:bg-ink-100/50 dark:hover:bg-ink-800/50 transition-colors flex items-center gap-1">
                <span>{section.title}</span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-400 group-hover:rotate-180 transition-transform duration-200" />
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-ink-900 rounded-xl shadow-card-hover border border-ink-200/60 dark:border-ink-800/60 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50 py-1.5">
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => cn(
                        'px-4 py-2 text-sm transition-colors flex items-center gap-2 w-full',
                        isActive 
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 font-medium' 
                          : 'text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-ink-100 hover:bg-ink-50 dark:hover:bg-ink-800/40'
                      )}
                    >
                      <ItemIcon className="w-4 h-4 text-ink-400 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <form onSubmit={onGlobalSearch} className="hidden xl:flex relative flex-1 max-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          value={globalQuery}
          onChange={(e) => setGlobalQuery(e.target.value)}
          placeholder="Rechercher..."
          className="input pl-9 h-9 w-full"
        />
      </form>

      <div className="flex items-center gap-1.5 ml-auto">
        <button onClick={toggleTheme} className="btn-ghost p-2" title="Mode sombre / clair">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative">
          <button onClick={() => { setNotifOpen((o) => !o); setMenuOpen(false); }} className="btn-ghost p-2 relative">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-ink-900 rounded-xl shadow-card-hover border border-ink-200/60 dark:border-ink-800/60 z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
                  <p className="font-semibold text-sm">Notifications</p>
                  {unread > 0 && <span className="text-xs text-ink-500">{unread} non lue{unread > 1 ? 's' : ''}</span>}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-sm text-ink-400 py-8">Aucune notification</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markRead(n.id, n.link)}
                        className={cn(
                          'w-full text-left px-4 py-3 border-b border-ink-50 dark:border-ink-800/40 hover:bg-ink-50 dark:hover:bg-ink-800/40 transition flex gap-3',
                          !n.is_read && 'bg-blue-50/40 dark:bg-blue-900/10',
                        )}
                      >
                        <span className={cn('badge flex-shrink-0 mt-0.5', NOTIFICATION_SEVERITY_COLORS[n.severity])}>
                          {n.severity === 'critical' ? '!' : n.severity === 'warning' ? '⚠' : 'i'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-800 dark:text-ink-100 truncate">{n.title}</p>
                          <p className="text-xs text-ink-500 dark:text-ink-400 line-clamp-2">{n.message}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <button onClick={() => { navigate('/notifications'); setNotifOpen(false); }} className="w-full text-center text-xs font-medium text-blue-600 dark:text-blue-400 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-800/40">
                  Voir toutes les notifications
                </button>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setMenuOpen((o) => !o); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-semibold">
              {initials(profile?.full_name || user?.email)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-ink-800 dark:text-ink-100 leading-tight max-w-[120px] truncate">{profile?.full_name || 'Utilisateur'}</p>
              <p className="text-[10px] text-ink-500 dark:text-ink-400">{profile?.is_platform_admin ? 'Super admin' : 'Utilisateur'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-ink-400" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-ink-900 rounded-xl shadow-card-hover border border-ink-200/60 dark:border-ink-800/60 z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-ink-100 dark:border-ink-800">
                  <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
                  <p className="text-xs text-ink-500 truncate">{profile?.email}</p>
                </div>
                <button onClick={() => { navigate('/settings'); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-800/40">
                  Paramètres
                </button>
                <button onClick={() => signOut()} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
