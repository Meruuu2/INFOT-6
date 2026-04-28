import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getUnreadNotifications, markAllNotificationsRead } from '../lib/db';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const notifChannel   = useRef(null);
  const articleChannel = useRef(null);

  // Fetch existing unread notifications on login
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    getUnreadNotifications(userId).then(data => {
      setNotifications(data);
      setUnreadCount(data.length);
    });
  }, [userId]);

  // Set up Realtime subscriptions
  useEffect(() => {
    if (!userId) return;

    // Clean up stale channels before creating new ones
    if (notifChannel.current)   supabase.removeChannel(notifChannel.current);
    if (articleChannel.current) supabase.removeChannel(articleChannel.current);

    // ── Channel 1: My notifications (likes + comments on my articles) ──────────
    notifChannel.current = supabase
      .channel(`my-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `recipient_id=eq.${userId}`, // server-side filter — private
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    // ── Channel 2: New articles from anyone + article updates ────────────────
    articleChannel.current = supabase
      .channel('global-articles')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'articles' },
        (payload) => {
          // Add a synthetic notification for "new article published"
          const synth = {
            id:           `article-${payload.new.id}`,
            type:         'new_article',
            is_read:      false,
            created_at:   payload.new.created_at,
            payload: {
              article_id:    payload.new.id,
              article_title: payload.new.title,
            },
          };
          setNotifications(prev => [synth, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'articles' },
        (payload) => {
          console.log('[Realtime] Article updated:', payload.new.title);
        }
      )
      .subscribe();

    return () => {
      if (notifChannel.current)   supabase.removeChannel(notifChannel.current);
      if (articleChannel.current) supabase.removeChannel(articleChannel.current);
    };
  }, [userId]);

  const markRead = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    setNotifications([]);
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markRead };
}