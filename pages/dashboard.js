import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { getRecentArticles, getTopArticles } from '../lib/db';

export default function Dashboard() {
  const router = useRouter();
  const [recent, setRecent] = useState([]);
  const [top, setTop] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Guard: redirect to auth if not logged in
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.push('/auth');
      } else {
        setUser(data.user);
      }
    });
  }, []);

  useEffect(() => {
    // Fetch both feeds in parallel
    Promise.all([getRecentArticles(10), getTopArticles(5)])
      .then(([recentData, topData]) => {
        setRecent(recentData ?? []);
        setTop(topData ?? []);
      })
      .catch(err => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div style={styles.page}>

      {/* Page header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>ML Hub Feed</h1>
          <p style={styles.pageSubtitle}>
            {user ? `Welcome back, ${user.email}` : 'Browse the latest articles'}
          </p>
        </div>
        <Link href="/articles/new" style={styles.writeBtn}>
          + Write Article
        </Link>
      </div>

      <div style={styles.grid}>

        {/* ── Main Feed ───────────────────────────────────── */}
        <main>
          <h2 style={styles.sectionTitle}>Recent Articles</h2>

          {loading && (
            <div style={styles.emptyState}>Loading articles...</div>
          )}

          {!loading && recent.length === 0 && (
            <div style={styles.emptyState}>
              <p style={{ color: '#94a3b8', marginBottom: 12 }}>No articles yet.</p>
              <Link href="/articles/new" style={styles.writeBtn}>
                Be the first to write one →
              </Link>
            </div>
          )}

          {recent.map(article => (
            <div key={article.id} style={styles.articleCard}>
              <Link href={`/articles/${article.id}`} style={{ textDecoration: 'none' }}>
                <h3 style={styles.articleTitle}>{article.title}</h3>
              </Link>
              <div style={styles.articleMeta}>
                <span style={styles.authorBadge}>
                  {article.author?.full_name || article.author?.username || 'Anonymous'}
                </span>
                <span style={styles.dot}>·</span>
                <span>{formatDate(article.created_at)}</span>
                <span style={styles.dot}>·</span>
                <span style={styles.viewBadge}>👁 {article.view_count ?? 0} views</span>
              </div>
            </div>
          ))}
        </main>

        {/* ── Top 5 Sidebar ───────────────────────────────── */}
        <aside>
          <div style={styles.sidebar}>
            <h2 style={styles.sectionTitle}>🏆 Top 5 Articles</h2>

            {loading && (
              <p style={{ color: '#64748b', fontSize: 13 }}>Loading...</p>
            )}

            {!loading && top.length === 0 && (
              <p style={{ color: '#64748b', fontSize: 13 }}>No articles yet.</p>
            )}

            <ol style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
              {top.map((article, i) => (
                <li key={article.id} style={styles.topItem}>
                  <span style={styles.topRank}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <Link href={`/articles/${article.id}`} style={styles.topLink}>
                      {article.title}
                    </Link>
                    <div style={styles.topViews}>👁 {article.view_count ?? 0} views</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>

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
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 960,
    margin: '0 auto 2rem',
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
  },
  pageSubtitle: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginTop: 4,
  },
  writeBtn: {
    backgroundColor: '#6366f1',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: '2rem',
    maxWidth: 960,
    margin: '0 auto',
    alignItems: 'start',
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #1e293b',
  },
  articleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: '1.25rem',
    marginBottom: '1rem',
    border: '1px solid #334155',
    transition: 'border-color 0.2s',
  },
  articleTitle: {
    color: '#a5b4fc',
    fontSize: '1.05rem',
    fontWeight: 600,
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  articleMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    fontSize: 12,
    color: '#64748b',
  },
  authorBadge: {
    backgroundColor: '#334155',
    color: '#94a3b8',
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: 12,
  },
  dot: {
    color: '#334155',
  },
  viewBadge: {
    color: '#6366f1',
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: '2rem',
    textAlign: 'center',
    border: '1px dashed #334155',
    color: '#94a3b8',
  },
  sidebar: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: '1.25rem',
    border: '1px solid #334155',
  },
  topItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #1e293b',
  },
  topRank: {
    backgroundColor: '#6366f1',
    color: '#fff',
    borderRadius: 6,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 2,
  },
  topLink: {
    color: '#a5b4fc',
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: 500,
    lineHeight: 1.4,
    display: 'block',
  },
  topViews: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 3,
  },
};