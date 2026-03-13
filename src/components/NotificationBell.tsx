import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageCircle, Handshake, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  compact?: boolean;
}

interface UnifiedNotification {
  id: string;
  type: 'search' | 'message' | 'deal';
  title: string;
  subtitle: string;
  read: boolean;
  created_at: string;
  link: string;
}

export default function NotificationBell({ compact = false }: NotificationBellProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Search notifications
  const { data: searchNotifs = [] } = useQuery({
    queryKey: ['search-notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('search_notifications')
        .select('id, read, created_at, listing_id, saved_search_id, saved_searches(keyword), listings(title_original, price)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Unread message count
  const { data: unreadMsgCount = 0 } = useQuery({
    queryKey: ['unread-msg-count', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_total_unread_messages', { _user_id: user!.id });
      return data || 0;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Recent completed deals
  const { data: recentDeals = [] } = useQuery({
    queryKey: ['recent-deals-notif', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id, deal_closed_at, buyer_confirmed, listing_id, listings(title_original)')
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .eq('deal_closed', true)
        .eq('buyer_confirmed', true)
        .order('deal_closed_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Build unified list
  const notifications: UnifiedNotification[] = [
    ...searchNotifs.map((n: any) => ({
      id: `search-${n.id}`,
      type: 'search' as const,
      title: (n.listings as any)?.title_original || t('notifications.listing'),
      subtitle: `${t('notifications.alertLabel')} : « ${(n.saved_searches as any)?.keyword} »`,
      read: n.read,
      created_at: n.created_at,
      link: `/listing/${n.listing_id}`,
    })),
    ...(unreadMsgCount > 0 ? [{
      id: 'unread-messages',
      type: 'message' as const,
      title: t('notifications.unreadMessages'),
      subtitle: `${unreadMsgCount} ${t('notifications.newMessages')}`,
      read: false,
      created_at: new Date().toISOString(),
      link: '/messages',
    }] : []),
    ...recentDeals.map((d: any) => ({
      id: `deal-${d.id}`,
      type: 'deal' as const,
      title: (d.listings as any)?.title_original || t('notifications.deal'),
      subtitle: t('notifications.dealCompleted'),
      read: true,
      created_at: d.deal_closed_at || d.created_at,
      link: `/messages`,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const unreadIds = searchNotifs.filter((n: any) => !n.read).map((n: any) => n.id);
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) {
      await supabase.from('search_notifications').update({ read: true }).eq('id', id);
    }
    qc.invalidateQueries({ queryKey: ['search-notifications'] });
  };

  const handleClick = async (notif: UnifiedNotification) => {
    if (notif.type === 'search' && !notif.read) {
      const realId = notif.id.replace('search-', '');
      await supabase.from('search_notifications').update({ read: true }).eq('id', realId);
      qc.invalidateQueries({ queryKey: ['search-notifications'] });
    }
    setOpen(false);
    navigate(notif.link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'deal': return <Handshake className="h-4 w-4 text-green-500" />;
      default: return <Search className="h-4 w-4 text-primary" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      {compact ? (
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-colors text-muted-foreground"
        >
          <div className="relative">
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">{t('notifications.alerts')}</span>
        </button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="flex-col items-center gap-0.5 h-auto py-1.5 px-3 relative"
          onClick={() => setOpen(!open)}
        >
          <div className="relative">
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">{t('notifications.alerts')}</span>
        </Button>
      )}

      {open && (
        <div className={cn(
          "absolute bg-card border rounded-lg shadow-xl z-[60] max-h-96 overflow-y-auto",
          compact
            ? "top-full mt-2 right-0 w-[calc(100vw-2rem)] max-w-80"
            : "top-full mt-1 right-0 w-80"
        )}>
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-semibold">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('notifications.empty')}
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                    !notif.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1 shrink-0">
                      {!notif.read ? (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      ) : (
                        getIcon(notif.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!notif.read && getIcon(notif.type)}
                        <p className="text-sm font-medium truncate">{notif.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{notif.subtitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
