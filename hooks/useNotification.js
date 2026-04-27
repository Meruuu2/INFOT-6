import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getUnreadNotifications, markAllNotificationsRead } from '../lib/db';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const notifChannel  = useRef(null);
  const articleChannel = useRef(null);

  // Initial fetch on mount
  useEffect(() => {
    if (!userId) return;
    getUnreadNotifications(userId).then(data => {
      setNotifications(data);
      setUnreadCount(data.length);
    });
  }, [userId]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    // Clean up any old channels first
    if (notifChannel.current)   supabase.removeChannel(notifChannel.current);
    if (articleChannel.current) supabase.removeChannel(articleChannel.current);

    // ── Channel 1: New notifications (likes, comments on MY articles) ──
    notifChannel.current = supabase
      .channel(`my-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `recipient_id=eq.${userId}`,  // server-side filter — private
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
          // Optional: show a toast
          showToast(payload.new);
        }
      )
      .subscribe();

    // ── Channel 2: New articles published by ANYONE ──
    articleChannel.current = supabase
      .channel('new-articles-feed')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'articles',
        },
        (payload) => {
          console.log('New article published:', payload.new.title);
          // E.g. show a "New article available" banner
        }
      )
      // ── Channel 2b: Article UPDATED event ──
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'articles',
        },
        (payload) => {
          console.log('Article updated:', payload.new.title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel.current);
      supabase.removeChannel(articleChannel.current);
    };
  }, [userId]);

  const markRead = async () => {
    await markAllNotificationsRead(userId);
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markRead };
}

// Simple toast helper — replace with your toast library of choice
function showToast(notif) {
  const msgs = {
    like:    `Someone liked your article: "${notif.payload?.article_title}"`,
    comment: `New comment on: "${notif.payload?.article_title}"`,
  };
  if (typeof window !== 'undefined' && msgs[notif.type]) {
    console.info('[Notification]', msgs[notif.type]);
    // e.g. toast.success(msgs[notif.type]);
  }
}