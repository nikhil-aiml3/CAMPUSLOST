import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, Trash2, MessageCircle, ShieldQuestion, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Notification, NotificationType } from '@/types';

export default function NotificationBell() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    const list = (data as Notification[]) || [];
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.is_read).length);
  }, [session?.user?.id]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAllRead = async () => {
    if (!session?.user?.id) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);
    loadNotifications();
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    loadNotifications();
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    loadNotifications();
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'chat_message': return MessageCircle;
      case 'claim_submitted': return ShieldQuestion;
      case 'status_update': return RefreshCw;
      default: return Bell;
    }
  };

  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case 'chat_message': return 'bg-indigo-50 text-indigo-600';
      case 'claim_submitted': return 'bg-amber-50 text-amber-600';
      case 'status_update': return 'bg-emerald-50 text-emerald-600';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition-all hover:bg-slate-50"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white animate-scale-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50">
                  <Check size={12} /> Mark all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Bell size={24} className="text-slate-300" />
                </div>
                <p className="mt-3 text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((n) => {
                  const Icon = getIcon(n.type);
                  return (
                    <div
                      key={n.id}
                      className={`group flex gap-3 px-4 py-3 transition-colors ${!n.is_read ? 'bg-indigo-50/40' : 'bg-white'}`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${getIconColor(n.type)}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">{n.title}</p>
                          {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                        </div>
                        {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-slate-400">{formatTime(n.created_at)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!n.is_read && (
                          <button onClick={() => markRead(n.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Mark read">
                            <Check size={12} />
                          </button>
                        )}
                        <button onClick={() => deleteNotification(n.id)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
