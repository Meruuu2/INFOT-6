// hooks/useNotifications.js
// FIXES:
//   1. Channels are cleaned up properly when userId changes or component unmounts
//   2. Article channel uses a unique name to avoid conflicts across sessions
//   3. Synthetic "new article" notification is correctly structured
//   4. markRead resets both state values atomically

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getUnreadNotifications, markAllNotificationsRead } from '../lib/db';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const notifChannel   = useRef(null);
  const articleChannel = useRef(null);

  // ── Load existing unread notifications when user logs in ───────
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    getUnreadNotifications(userId).then(data => {
      setNotifications(data ?? []);
      setUnreadCount((data ?? []).length);
    });
  }, [userId]);

  // ── Set up Realtime subscriptions ──────────────────────────────
  useEffect(() => {
    if (!userId) return;

    // Clean up any stale channels before creating new ones
    if (notifChannel.current) {
      supabase.removeChannel(notifChannel.current);
      notifChannel.current = null;
    }
    if (articleChannel.current) {
      supabase.removeChannel(articleChannel.current);
      articleChannel.current = null;
    }

    // ── Channel 1: Personal notifications ─────────────────────────
    // Fires when someone likes/comments on YOUR articles
    // filter: `recipient_id=eq.${userId}` ensures you only get YOUR notifications
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Notifications channel connected');
        }
      });

    // ── Channel 2: Global new articles ────────────────────────────
    // Fires when ANY user publishes a new article
    // Users get a bell notification that new content is available
    articleChannel.current = supabase
      .channel(`global-articles:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'articles',
        },
        (payload) => {
          const newArticle = payload.new;

          // Build a synthetic notification object that matches the
          // shape Navbar expects: { id, type, payload, created_at }
          const syntheticNotif = {
            id:         `new-article-${newArticle.id}`,
            type:       'new_article',
            is_read:    false,
            created_at: newArticle.created_at,
            payload: {
              article_id:    newArticle.id,
              article_title: newArticle.title,
            },
          };

          setNotifications(prev => [syntheticNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'articles',
        },
        (payload) => {
          // Article was updated — you can show a notification here if needed
          // Currently just logs for debugging
          console.log('[Realtime] Article updated:', payload.new?.title);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Articles channel connected');
        }
      });

    // Cleanup when userId changes or component unmounts
    return () => {
      if (notifChannel.current) {
        supabase.removeChannel(notifChannel.current);
        notifChannel.current = null;
      }
      if (articleChannel.current) {
        supabase.removeChannel(articleChannel.current);
        articleChannel.current = null;
      }
    };
  }, [userId]);

  // ── Mark all as read ───────────────────────────────────────────
  const markRead = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    // Clear both state values atomically
    setNotifications([]);
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markRead };
}