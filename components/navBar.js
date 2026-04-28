// components/Navbar.js
// FIXES:
//   1. Notification panel closes when clicking outside
//   2. Notification items correctly route to /articles/[id]
//   3. "reply" notification type added to getNotifText
//   4. User email pill shows username portion clearly
//   5. Write link always visible when logged in

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Navbar({ user, unreadCount = 0, notifications = [], onMarkRead }) {
  const router = useRouter();
  const [showNotifs, setShowNotifs] = useState(false);
  const panelRef = useRef(null);

  // Close panel when clicking anywhere outside of it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const toggleNotifs = () => {
    const opening = !showNotifs;
    setShowNotifs(opening);
    // Mark as read when opening the panel (if there are unread ones)
    if (opening && unreadCount > 0 && onMarkRead) {
      onMarkRead();
    }
  };

  // Map notification type → human-readable text
  const getNotifText = (n) => {
    const title = n.payload?.article_title || 'your article';
    switch (n.type) {
      case 'like':        return `❤️  Someone liked "${title}"`;
      case 'comment':     return `💬 New comment on "${title}"`;
      case 'reply':       return `↩️  Someone replied to your comment on "${title}"`;
      case 'new_article': return `📰 New article published: "${title}"`;
      default:            return `🔔 New notification`;
    }
  };

  // Navigate to the article when a notification is clicked
  const handleNotifClick = (n) => {
    setShowNotifs(false);
    const articleId = n.payload?.article_id;
    if (articleId) {
      router.push(`/articles/${articleId}`);
    }
  };

  const username = user?.email?.split('@')[0] ?? '';

  return (
    <nav style={styles.nav}>
      {/* Brand */}
      <Link href="/dashboard" style={styles.brand}>
        🧠 ML Hub
      </Link>

      <div style={styles.right}>
        {user ? (
          <>
            {/* Write article link */}
            <Link href="/articles/new" style={styles.writeLink}>
              ✏️ Write
            </Link>

            {/* Notification bell + dropdown */}
            <div style={{ position: 'relative' }} ref={panelRef}>
              <button
                onClick={toggleNotifs}
                style={styles.bellBtn}
                title="Notifications"
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
              >
                🔔
                {unreadCount > 0 && (
                  <span style={styles.badge}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown panel */}
              {showNotifs && (
                <div style={styles.notifPanel}>
                  {/* Panel header */}
                  <div style={styles.notifHeader}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>
                      Notifications
                    </span>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => { onMarkRead?.(); setShowNotifs(false); }}
                        style={styles.markReadBtn}
                      >
                        ✓ Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification list */}
                  {notifications.length === 0 ? (
                    <div style={styles.noNotifs}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>🔕</div>
                      No new notifications
                    </div>
                  ) : (
                    notifications.slice(0, 8).map(n => (
                      <div
                        key={n.id}
                        style={styles.notifItem}
                        onClick={() => handleNotifClick(n)}
                      >
                        <div style={styles.notifText}>{getNotifText(n)}</div>
                        <div style={styles.notifTime}>
                          {new Date(n.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                          })}
                        </div>
                      </div>
                    ))
                  )}

                  {notifications.length > 8 && (
                    <div style={styles.notifFooter}>
                      +{notifications.length - 8} more notifications
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Username pill */}
            <span style={styles.userPill} title={user.email}>
              {username}
            </span>

            {/* Logout */}
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </>
        ) : (
          /* Not logged in */
          <Link href="/auth" style={styles.loginLink}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '0 1.5rem',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 200,
  },
  brand: {
    color: '#a5b4fc',
    fontWeight: 700,
    fontSize: '1.1rem',
    textDecoration: 'none',
    letterSpacing: '0.01em',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  writeLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 7,
    border: '1px solid #334155',
    transition: 'border-color 0.2s',
  },
  bellBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    position: 'relative',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: 7,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    color: '#fff',
    borderRadius: '50%',
    minWidth: 18,
    height: 18,
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
    lineHeight: 1,
  },
  notifPanel: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    width: 320,
    maxHeight: 420,
    overflowY: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  notifHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #334155',
    position: 'sticky',
    top: 0,
    backgroundColor: '#1e293b',
  },
  markReadBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 500,
  },
  noNotifs: {
    padding: '24px 16px',
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  notifItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #0f172a',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  notifText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  notifTime: {
    color: '#475569',
    fontSize: 11,
    marginTop: 4,
  },
  notifFooter: {
    padding: '10px 16px',
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    borderTop: '1px solid #334155',
  },
  userPill: {
    backgroundColor: '#334155',
    color: '#94a3b8',
    padding: '4px 12px',
    borderRadius: 99,
    fontSize: 13,
    maxWidth: 140,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    padding: '6px 14px',
    borderRadius: 7,
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#f87171',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  loginLink: {
    color: '#fff',
    backgroundColor: '#6366f1',
    textDecoration: 'none',
    padding: '7px 16px',
    borderRadius: 7,
    fontSize: 14,
    fontWeight: 600,
  },
};