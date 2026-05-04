import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const notifChannel   = useRef(null);
  const articleChannel = useRef(null);

  // ── 1. Load Notification "Stack" (History) ──────────────────────
  // This ensures notifications stay visible even after being read
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchNotifs = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(20); // Keep the latest 20 in the stack

      if (!error) {
        setNotifications(data ?? []);
        // Only count those where is_read is false
        setUnreadCount(data?.filter(n => !n.is_read).length ?? 0);
      }
    };

    fetchNotifs();
  }, [userId]);

  // ── 2. Realtime Subscriptions ──────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    // Cleanup stale channels
    if (notifChannel.current) supabase.removeChannel(notifChannel.current);
    if (articleChannel.current) supabase.removeChannel(articleChannel.current);

    // Channel: Personal (Likes, Comments, Shares)[cite: 19]
    notifChannel.current = supabase
      .channel(`user-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    // Channel: Global (New Articles)[cite: 19]
    articleChannel.current = supabase
      .channel(`global-articles:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'articles' },
        (payload) => {
          const newArticle = payload.new;
          const syntheticNotif = {
            id: `new-article-${newArticle.id}`,
            type: 'new_article',
            is_read: false,
            created_at: newArticle.created_at,
            payload: {
              article_id: newArticle.id,
              article_title: newArticle.title,
            },
          };
          setNotifications(prev => [syntheticNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      if (notifChannel.current) supabase.removeChannel(notifChannel.current);
      if (articleChannel.current) supabase.removeChannel(articleChannel.current);
    };
  }, [userId]);

  // ── 3. Mark Read (Update instead of Clear) ─────────────────────
  const markRead = async () => {
    if (!userId || unreadCount === 0) return;

    // Update database to set is_read to true[cite: 17]
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (!error) {
      // Keep notifications in the state but mark them as read locally[cite: 17]
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return { notifications, unreadCount, markRead };
}