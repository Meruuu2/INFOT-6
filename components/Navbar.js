import { useState, useEffect, useRef, memo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

// ✅ Added memo for scalability: prevents Navbar from re-rendering unless props change
const Navbar = memo(function Navbar({ user, unreadCount = 0, notifications = [], onMarkRead }) {
  const router = useRouter();
  const [showNotifs, setShowNotifs] = useState(false);
  const panelRef = useRef(null);

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

  const toggleNotifs = () => {
    const opening = !showNotifs;
    setShowNotifs(opening);
    if (opening && unreadCount > 0 && onMarkRead) {
      onMarkRead();
    }
  };

  const handleNotifClick = (n) => {
    setShowNotifs(false);
    const articleId = n.payload?.article_id;
    if (articleId) {
      router.push(`/articles/${articleId}`);
    }
  };

  // ✅ Helper to turn notification payload into readable text
  const getNotifText = (n) => {
    if (n.type === 'new_article') {
      return (
        <span>
          🚀 <strong>New:</strong> {n.payload?.article_title || 'A new article was posted'}
        </span>
      );
    }
    if (n.type === 'like') return `❤️ Someone liked your article`;
    if (n.type === 'comment') return `💬 Someone commented on your article`;
    return n.message || 'New activity in ML Hub';
  };

  const username = user?.email?.split('@')[0] ?? '';

  return (
    <nav style={styles.nav}>
      <Link href="/dashboard" style={styles.brand}>🧠 ML Hub</Link>

      <div style={styles.right}>
        {user && (
          <>
            <Link href="/articles/new" style={styles.writeLink}>✏️ Write</Link>

            <div style={{ position: 'relative' }} ref={panelRef}>
              <button onClick={toggleNotifs} style={styles.bellBtn}>
                🔔
                {unreadCount > 0 && (
                  <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {showNotifs && (
                <div style={styles.notifPanel}>
                  <div style={styles.notifHeader}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>Notifications</span>
                    {notifications.length > 0 && (
                      <button onClick={onMarkRead} style={styles.markReadBtn}>✓ Mark all read</button>
                    )}
                  </div>

                  <div style={styles.notifList}>
                    {notifications.length === 0 ? (
                      <div style={styles.noNotifs}>No new notifications</div>
                    ) : (
                      notifications.slice(0, 8).map(n => (
                        <div key={n.id} style={styles.notifItem} onClick={() => handleNotifClick(n)}>
                          <div style={styles.notifText}>
                            {getNotifText(n)}
                          </div>
                          <div style={styles.notifTime}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link href="/profile" style={styles.userPill}>👤 {username}</Link>
          </>
        )}
      </div>
    </nav>
  );
});

const styles = {
  nav: {
    height: '64px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#f1f5f9',
    textDecoration: 'none',
  },
  right: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
  writeLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  bellBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    position: 'relative',
    padding: '4px',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 5px',
    borderRadius: '10px',
    border: '2px solid #1e293b',
  },
  notifPanel: {
    position: 'absolute',
    top: '40px',
    right: 0,
    width: '300px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  notifHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  markReadBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: '11px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  notifList: { maxHeight: '400px', overflowY: 'auto' },
  notifItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #0f172a',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  notifText: { color: '#cbd5e1', fontSize: '13px', lineHeight: 1.4 },
  notifTime: { color: '#475569', fontSize: '11px', marginTop: '4px' },
  noNotifs: { padding: '24px', color: '#64748b', textAlign: 'center', fontSize: '13px' },
  userPill: {
    backgroundColor: '#334155',
    color: '#a5b4fc',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    textDecoration: 'none',
  }
};

export default Navbar;