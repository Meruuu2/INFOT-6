import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { getRecentArticles, getTopArticles } from '../lib/db';

export async function getServerSideProps(context) {
  // Fetching data on the server side for SEO and speed
  const [recent, top] = await Promise.all([
    getRecentArticles(10),
    getTopArticles(5),
  ]);

  return { 
    props: { recent, top } 
  };
}

export default function Dashboard({ recent, top }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
      } else {
        setUser(session.user);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Loading state while checking auth
  if (!user) {
    return (
      <div style={styles.loading}>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header / User Profile Section */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🎉 ML Hub Dashboard</h1>
          <p style={styles.email}>Logged in as: <strong>{user.email}</strong></p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </header>

      <div style={styles.layout}>
        {/* Main Feed: Recent Articles */}
        <main style={styles.main}>
          <h2 style={styles.sectionTitle}>Recent Articles</h2>
          {recent.map((article) => (
            <article key={article.id} style={styles.articleCard}>
              <Link href={`/articles/${article.id}`} style={styles.link}>
                <h3 style={styles.articleTitle}>{article.title}</h3>
              </Link>
              <p style={styles.meta}>
                By {article.author?.full_name || 'System'} — {article.view_count} views
              </p>
            </article>
          ))}
        </main>

        {/* Sidebar: Top Articles */}
        <aside style={styles.sidebar}>
          <h2 style={styles.sectionTitle}>Top 5 Trending</h2>
          <ol style={styles.list}>
            {top.map((article) => (
              <li key={article.id} style={styles.listItem}>
                <Link href={`/articles/${article.id}`} style={styles.link}>
                  {article.title}
                </Link>
                <span style={styles.sidebarMeta}>{article.view_count} views</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a', // Dark blue theme
    color: '#f1f5f9',
    padding: '2rem',
    fontFamily: 'system-ui, sans-serif',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#0f172a',
    color: '#fff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1100px',
    margin: '0 auto 2rem auto',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #1e293b',
  },
  title: { fontSize: '1.8rem', margin: 0 },
  email: { color: '#94a3b8', margin: '5px 0 0 0', fontSize: '0.9rem' },
  logoutBtn: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: '3rem',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  main: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  sectionTitle: { fontSize: '1.4rem', marginBottom: '1.5rem', color: '#38bdf8' },
  articleCard: {
    backgroundColor: '#1e293b',
    padding: '1.5rem',
    borderRadius: '10px',
    border: '1px solid #334155',
  },
  articleTitle: { margin: '0 0 0.5rem 0', color: '#f8fafc' },
  link: { textDecoration: 'none', color: 'inherit' },
  meta: { fontSize: '0.85rem', color: '#64748b' },
  sidebar: {
    backgroundColor: '#1e293b',
    padding: '1.5rem',
    borderRadius: '10px',
    height: 'fit-content'
  },
  list: { paddingLeft: '1.2rem', margin: 0 },
  listItem: { marginBottom: '1rem', color: '#e2e8f0' },
  sidebarMeta: { display: 'block', fontSize: '0.75rem', color: '#64748b' }
};