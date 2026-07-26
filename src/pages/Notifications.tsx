import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/Modal';
import { formatRelative } from '../lib/format';
import { NOTIFICATION_SEVERITY_COLORS } from '../lib/labels';
import { cn } from '../lib/cn';
import type { Notification } from '../lib/types';

export function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const markRead = async (n: Notification) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', n.id);
    setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false);
    setNotifications((list) => list.map((x) => ({ ...x, is_read: true })));
    toast('Toutes les notifications marquées comme lues.', 'success');
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('notifications').delete().eq('id', deleteTarget.id);
    setNotifications((list) => list.filter((x) => x.id !== deleteTarget.id));
    toast('Notification supprimée.', 'success');
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notifications"
        subtitle={`${notifications.length} notification(s) · ${unread} non lue(s)`}
        icon={<Bell className="w-5 h-5" />}
        actions={unread > 0 && <Button variant="secondary" icon={<CheckCheck className="w-4 h-4" />} onClick={markAllRead}>Tout marquer lu</Button>}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-4"><div className="skeleton h-12 w-full" /></div>)}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="py-16">
          <div className="flex flex-col items-center text-ink-300 dark:text-ink-600">
            <BellOff className="w-12 h-12 mb-3" />
            <p className="text-sm">Aucune notification</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={cn('p-4 flex items-start gap-3 cursor-pointer hover:shadow-card-hover transition', !n.is_read && 'border-blue-200/60 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-900/5')} >
              <div className={cn('badge flex-shrink-0 mt-0.5', NOTIFICATION_SEVERITY_COLORS[n.severity])}>
                {n.severity === 'critical' ? '!' : n.severity === 'warning' ? '⚠' : 'i'}
              </div>
              <div className="flex-1 min-w-0" onClick={() => markRead(n)}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{n.title}</p>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                </div>
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">{n.message}</p>
                <p className="text-xs text-ink-400 mt-1">{formatRelative(n.created_at)}</p>
              </div>
              <button onClick={() => setDeleteTarget(n)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600 flex-shrink-0" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer la notification" message="Supprimer cette notification ?" confirmLabel="Supprimer" danger />
    </div>
  );
}
