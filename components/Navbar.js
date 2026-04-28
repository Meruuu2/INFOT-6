import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Navbar({ user, unreadCount = 0, notifications = [], onMarkRead }) {
  const router = useRouter();
  const [showNotifs, setShowNotifs] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const toggleNotifs = () => {
    setShowNotifs(v => !v);
    if (!showNotifs && unreadCount > 0 && onMarkRead) {
      onMarkRead();
    }
  };

  const getNotifText = (n) => {
    if (n.type === 'like')    return `❤️ Someone liked "${n.payload?.article_title || 'your article'}"`;
    if (n.type === 'comment') return `💬 New comment on "${n.payload?.article_title || 'your article'}"`;
    if (n.type === 'new_article') return `📰 New article published`;
    return '🔔 New notification';
  };

  return (
    <nav style={styles.nav}>
      <Link href="/dashboard" style={styles.brand}>
        🧠 ML Hub
      </Link>

      <div style={styles.right}>
        {user ? (
          <>
            <Link href="/articles/new" style={styles.writeLink}>
              ✏️ Write
            </Link>

            

            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button onClick={toggleNotifs} style={styles.bellBtn}>
                🔔
                {unreadCount > 0 && (
                  <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {/* Dropdown panel */}
              {showNotifs && (
                <div style={styles.notifPanel}>
                  <div style={styles.notifHeader}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Notifications</span>
                    {notifications.length > 0 && (
                      <button onClick={onMarkRead} style={styles.markReadBtn}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={styles.noNotifs}>No new notifications</div>
                  ) : (
                    notifications.slice(0, 8).map(n => (
                      <div
                        key={n.id}
                        style={styles.notifItem}
                        onClick={() => {
                          setShowNotifs(false);
                          if (n.payload?.article_id) {
                            router.push(`/articles/${n.payload.article_id}`);
                          }
                        }}
                      >
                        <div style={styles.notifText}>{getNotifText(n)}</div>
                        <div style={styles.notifTime}>
                          {new Date(n.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User email pill */}
            <span style={styles.userPill}>
              {user.email?.split('@')[0]}
            </span>

            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </>
        ) : (
          <Link href="/auth" style={styles.loginLink}>Sign In</Link>
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
    zIndex: 100,
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
  },
  bellBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    position: 'relative',
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
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
  },
  notifPanel: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    width: 320,
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    zIndex: 999,
    overflow: 'hidden',
  },
  notifHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #334155',
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
    padding: '20px 16px',
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
  },
  notifTime: {
    color: '#475569',
    fontSize: 11,
    marginTop: 4,
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