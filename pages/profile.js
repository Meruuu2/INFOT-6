import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // ── Load user + their articles ──────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      setUser(user);

      // Fetch profile row
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, created_at')
        .eq('id', user.id)
        .single();
      setProfile(profileData ?? {});

      // Fetch this user's articles ordered newest first
      const { data: articleData } = await supabase
        .from('articles')
        .select('id, title, content, view_count, created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });
      setArticles(articleData ?? []);

      setLoading(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  const getInitial = () => {
    const name = profile?.full_name || user?.email || '?';
    return name[0].toUpperCase();
  };

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'User';

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: '#94a3b8' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>

      {/* ── Profile Card ──────────────────────────────────────────────── */}
      <div style={styles.profileCard}>

        {/* Avatar */}
        <div style={styles.avatarWrap}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarFallback}>{getInitial()}</div>
          )}
        </div>

        {/* Info */}
        <div style={styles.profileInfo}>
          <h1 style={styles.displayName}>{displayName}</h1>
          <p style={styles.email}>{user?.email}</p>
          {profile?.bio && (
            <p style={styles.bio}>{profile.bio}</p>
          )}
          <div style={styles.statRow}>
            <div style={styles.statBox}>
              <span style={styles.statNum}>{articles.length}</span>
              <span style={styles.statLabel}>Articles</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statNum}>
                {articles.reduce((sum, a) => sum + (a.view_count ?? 0), 0)}
              </span>
              <span style={styles.statLabel}>Total Views</span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statNum}>
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—'}
              </span>
              <span style={styles.statLabel}>Joined</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={styles.actions}>
          <Link href="/articles/new" style={styles.writeBtn}>
            ✏️ Write Article
          </Link>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            style={styles.logoutBtn}
          >
            {logoutLoading ? 'Logging out...' : '🚪 Log Out'}
          </button>
        </div>

      </div>

      {/* ── Articles Timeline ──────────────────────────────────────────── */}
      <div style={styles.timelineSection}>

        <div style={styles.timelineHeader}>
          <h2 style={styles.timelineTitle}>📋 My Articles</h2>
          <span style={styles.articleCount}>{articles.length} published</span>
        </div>

        {articles.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ fontSize: '2rem', marginBottom: 12 }}>📝</p>
            <p style={{ color: '#94a3b8', marginBottom: 16 }}>
              You haven't written any articles yet.
            </p>
            <Link href="/articles/new" style={styles.writeBtn}>
              Write your first article →
            </Link>
          </div>
        ) : (
          <div style={styles.timeline}>
            {articles.map((article, index) => (
              <div key={article.id} style={styles.timelineItem}>

                {/* Timeline line + dot */}
                <div style={styles.timelineLine}>
                  <div style={styles.timelineDot} />
                  {index < articles.length - 1 && (
                    <div style={styles.timelineConnector} />
                  )}
                </div>

                {/* Article card */}
                <div style={styles.articleCard}>
                  <div style={styles.articleDate}>
                    🗓 {formatDate(article.created_at)}
                  </div>
                  <Link href={`/articles/${article.id}`} style={{ textDecoration: 'none' }}>
                    <h3 style={styles.articleTitle}>{article.title}</h3>
                  </Link>

                  {/* Content preview — strip HTML tags */}
                  {article.content && (
                    <p style={styles.articlePreview}>
                      {article.content.replace(/<[^>]+>/g, '').slice(0, 120)}
                      {article.content.replace(/<[^>]+>/g, '').length > 120 ? '...' : ''}
                    </p>
                  )}

                  <div style={styles.articleFooter}>
                    <span style={styles.viewCount}>👁 {article.view_count ?? 0} views</span>
                    <Link href={`/articles/${article.id}`} style={styles.readLink}>
                      Read article →
                    </Link>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    padding: '2rem 1.5rem',
    color: '#f1f5f9',
  },
  loadingPage: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Profile Card ────────────────────────────────────────────────────────────
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: '2rem',
    maxWidth: 760,
    margin: '0 auto 2rem',
    border: '1px solid #334155',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
    alignItems: 'flex-start',
  },
  avatarWrap: {
    flexShrink: 0,
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #6366f1',
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 700,
    border: '3px solid #4f46e5',
  },
  profileInfo: {
    flex: 1,
    minWidth: 200,
  },
  displayName: {
    color: '#f1f5f9',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0 0 4px',
  },
  email: {
    color: '#64748b',
    fontSize: '0.9rem',
    marginBottom: 8,
  },
  bio: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginBottom: 12,
    lineHeight: 1.6,
  },
  statRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  statBox: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '8px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 80,
  },
  statNum: {
    color: '#a5b4fc',
    fontWeight: 700,
    fontSize: '1.1rem',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flexShrink: 0,
  },
  writeBtn: {
    backgroundColor: '#6366f1',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    textAlign: 'center',
    display: 'block',
  },
  logoutBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #ef4444',
    backgroundColor: 'transparent',
    color: '#ef4444',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // ── Timeline ────────────────────────────────────────────────────────────────
  timelineSection: {
    maxWidth: 760,
    margin: '0 auto',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  timelineTitle: {
    color: '#e2e8f0',
    fontSize: '1.15rem',
    fontWeight: 600,
    margin: 0,
  },
  articleCount: {
    backgroundColor: '#334155',
    color: '#94a3b8',
    padding: '3px 12px',
    borderRadius: 99,
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: '3rem 2rem',
    textAlign: 'center',
    border: '1px dashed #334155',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  timelineItem: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
  },
  timelineLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 6,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    border: '2px solid #4f46e5',
    flexShrink: 0,
    zIndex: 1,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#334155',
    minHeight: 40,
    marginTop: 4,
  },
  articleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: '1.25rem',
    border: '1px solid #334155',
    flex: 1,
    marginBottom: 16,
  },
  articleDate: {
    color: '#475569',
    fontSize: 12,
    marginBottom: 8,
  },
  articleTitle: {
    color: '#a5b4fc',
    fontSize: '1.05rem',
    fontWeight: 600,
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  articlePreview: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  articleFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  viewCount: {
    color: '#475569',
    fontSize: 12,
  },
  readLink: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
  },
};