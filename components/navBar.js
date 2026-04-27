import Link from 'next/link';

export default function Navbar({ user, unreadCount, notifications, onMarkRead }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0.75rem 1.5rem', borderBottom: '1px solid #eee' }}>
      <Link href="/dashboard"><strong>ArticlePlatform</strong></Link>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {user ? (
          <>
            <span style={{ fontSize: 13, color: '#666' }}>{user.email}</span>

            {/* Notification bell with badge */}
            <button onClick={onMarkRead} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#e53e3e', color: '#fff',
                  borderRadius: '50%', width: 18, height: 18,
                  fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            <Link href="/articles/new">Write</Link>
          </>
        ) : (
          <Link href="/login">Sign in</Link>
        )}
      </div>
    </nav>
  );
}