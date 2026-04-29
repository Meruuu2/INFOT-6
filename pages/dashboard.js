// pages/dashboard.js
// FIXES:
//   1. article.author.full_name shows correctly (not null)
//   2. Article cards link to /articles/[id] correctly
//   3. Top 5 sidebar shows like_count from fixed getTopArticles()
//   4. Auth guard works — redirects to /auth if not logged in
//   5. Loading skeletons while data fetches
//   6. Empty state with call-to-action

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { getRecentArticles, getTopArticles } from '../lib/db';

export default function Dashboard() {
  const router = useRouter();
  const [recent,  setRecent]  = useState([]);
  const [top,     setTop]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [user,    setUser]    = useState(null);

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.push('/auth');
      } else {
        setUser(data.user);
      }
    });
  }, []);

  // Fetch both feeds in parallel
  useEffect(() => {
    Promise.all([getRecentArticles(10), getTopArticles(5)])
      .then(([recentData, topData]) => {
        setRecent(recentData ?? []);
        setTop(topData ?? []);
      })
      .catch(err => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  // Helper: safely get author display name
  // Handles NULL username/full_name from profile
  const getAuthorName = (article) => {
    const a = article.author;
    if (!a) return 'Anonymous';
    return a.full_name || a.username || user?.email?.split('@')[0] || 'Anonymous';
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div style={styles.page}>

      {/* ── Page header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>ML Hub Feed</h1>
          <p style={styles.pageSubtitle}>
            {user ? `Welcome back, ${user.email?.split('@')[0]}` : 'Browse the latest articles'}
          </p>
        </div>
        <Link href="/articles/new" style={styles.writeBtn}>
          ✏️ Write Article
        </Link>
      </div>

      <div style={styles.grid}>

        {/* ── LEFT: Recent Articles ── */}
        <main>
          <h2 style={styles.sectionTitle}>📰 Recent Articles</h2>

          {/* Loading skeletons */}
          {loading && (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} style={styles.skeletonCard}>
                  <div style={{ ...styles.skeletonLine, width: '70%', height: 18, marginBottom: 10 }} />
                  <div style={{ ...styles.skeletonLine, width: '40%', height: 12 }} />
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {!loading && recent.length === 0 && (
            <div style={styles.emptyState}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
              <p style={{ color: '#94a3b8', marginBottom: 12 }}>No articles yet.</p>
              <Link href="/articles/new" style={styles.writeBtn}>
                Be the first to write one →
              </Link>
            </div>
          )}

          {/* Article cards */}
          {!loading && recent.map(article => (
            <div key={article.id} style={styles.articleCard}>

              {/* Title — links to the article page */}
              <Link
                href={`/articles/${article.id}`}
                style={{ textDecoration: 'none' }}
              >
                <h3 style={styles.articleTitle}>{article.title}</h3>
              </Link>

              {/* Meta row: author · date · views */}
              <div style={styles.articleMeta}>
                <span style={styles.authorBadge}>
                  ✍️ {getAuthorName(article)}
                </span>
                <span style={styles.dot}>·</span>
                <span>{formatDate(article.created_at)}</span>
                <span style={styles.dot}>·</span>
                <span style={styles.viewBadge}>
                  👁 {(article.view_count ?? 0).toLocaleString()} views
                </span>
              </div>

              {/* Read article link */}
              <div style={{ marginTop: 10 }}>
                <Link href={`/articles/${article.id}`}>
                  Read article →
                </Link>
              </div>
            </div>
          ))}
        </main>

        {/* ── RIGHT: Top 5 Sidebar ── */}
        <aside>
          <div style={styles.sidebar}>
            <h2 style={styles.sectionTitle}>🏆 Top 5 Articles</h2>
            <p style={styles.sidebarSubtitle}>Ranked by views + likes</p>

            {/* Loading */}
            {loading && (
              <>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ ...styles.skeletonLine, width: '100%', height: 40, marginBottom: 10, borderRadius: 6 }} />
                ))}
              </>
            )}

            {/* Empty */}
            {!loading && top.length === 0 && (
              <p style={{ color: '#64748b', fontSize: 13 }}>No articles yet.</p>
            )}

            {/* Top 5 list */}
            <ol style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
              {!loading && top.map((article, i) => (
                <li key={article.id} style={styles.topItem}>
                  {/* Rank badge */}
                  <span style={{
                    ...styles.topRank,
                    backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#6366f1',
                  }}>
                    {i + 1}
                  </span>

                  <div style={{ flex: 1 }}>
                    <Link
                      href={`/articles/${article.id}`}
                      style={styles.topLink}
                    >
                      {article.title}
                    </Link>
                    <div style={styles.topStats}>
                      <span>👁 {(article.view_count ?? 0).toLocaleString()}</span>
                      <span style={styles.statDot}>·</span>
                      <span>❤️ {article.like_count ?? 0}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Quick stats card */}
          {!loading && recent.length > 0 && (
            <div style={{ ...styles.sidebar, marginTop: 16 }}>
              <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                📊 Quick Stats
              </h3>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Total Articles</span>
                <span style={styles.statValue}>{recent.length}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Total Views</span>
                <span style={styles.statValue}>
                  {recent.reduce((sum, a) => sum + (a.view_count ?? 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
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
    marginBottom: 0,
  },
  writeBtn: {
    backgroundColor: '#6366f1',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    display: 'inline-block',
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
    marginTop: 0,
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #1e293b',
  },
  // Article cards
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
    wordBreak: 'break-word',
    cursor: 'pointer',
    // No truncation — shows full title
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
  dot: { color: '#334155' },
  viewBadge: { color: '#6366f1', fontSize: 12 },
  readLink: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
  },
  // Skeleton loaders
  skeletonCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: '1.25rem',
    marginBottom: '1rem',
    border: '1px solid #334155',
  },
  skeletonLine: {
    backgroundColor: '#334155',
    borderRadius: 4,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  emptyState: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: '2rem',
    textAlign: 'center',
    border: '1px dashed #334155',
    color: '#94a3b8',
  },
  // Sidebar
  sidebar: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: '1.25rem',
    border: '1px solid #334155',
  },
  sidebarSubtitle: {
    color: '#475569',
    fontSize: 11,
    marginTop: -8,
    marginBottom: 12,
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
    wordBreak: 'break-word',
  },
  topStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    fontSize: 11,
    color: '#64748b',
  },
  statDot: { color: '#334155' },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #1e293b',
    fontSize: 13,
  },
  statLabel: { color: '#64748b' },
  statValue: { color: '#a5b4fc', fontWeight: 600 },
};