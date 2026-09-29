import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, FileText, AlertTriangle, CheckCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  order_id: string | null;
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub?.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    const { data } = await supabase
      .from('notifications')
      .select('id, kind, title, body, link, read_at, created_at, order_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15);
    setNotifications((data as Notification[]) ?? []);
  }, [userId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter((n) => !n.read_at);

  const openPanel = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread.length > 0) {
      const ids = unread.map((n) => n.id);
      // Optimistically clear badge
      setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)));
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).eq('user_id', userId);
    }
  };

  const markAllRead = async () => {
    if (!userId || unread.length === 0) return;
    const ids = unread.map((n) => n.id);
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).eq('user_id', userId);
  };

  const go = (n: Notification) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  if (!userId) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPanel}
        className="relative p-2 rounded transition-colors"
        style={{ color: 'var(--text-body)' }}
        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-accent)')}
        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-body)')}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 rounded-full text-white flex items-center justify-center font-bold"
            style={{
              backgroundColor: 'var(--brand-accent)',
              fontSize: '10px',
              minWidth: '18px',
              height: '18px',
              lineHeight: '18px',
              textAlign: 'center',
              padding: '0 4px',
            }}
          >
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border z-50 overflow-hidden"
          style={{ borderColor: 'var(--bg-border)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--bg-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
              Notifications
            </p>
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--brand-accent)' }}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No notifications yet. We'll let you know when a report is ready.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const failed = n.kind === 'report_failed' || n.kind === 'screening_failed' || /: (Hit|Review) —/.test(n.title);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => go(n)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left border-b last:border-b-0 transition-colors"
                    style={{ borderColor: 'var(--bg-border)' }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span
                      className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: failed ? 'rgba(220, 38, 38, 0.08)' : 'rgba(37, 99, 235, 0.08)' }}
                    >
                      {failed ? (
                        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--status-dissolved)' }} />
                      ) : (
                        <FileText className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug" style={{ color: 'var(--text-heading)' }}>
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {n.body}
                        </span>
                      )}
                      <span className="block text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/account/orders');
            }}
            className="w-full px-4 py-3 text-sm font-medium text-center border-t transition-colors"
            style={{ borderColor: 'var(--bg-border)', color: 'var(--brand-accent)' }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            View my orders
          </button>
        </div>
      )}
    </div>
  );
}
