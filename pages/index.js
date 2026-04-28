// pages/index.js
// FIXES:
//   1. If user is already logged in → redirect to /dashboard (no flash)
//   2. Loading state while checking session
//   3. "Get Started" → /auth page

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        router.push('/dashboard');
      } else {
        setChecking(false);
      }
    });
  }, []);

  // Don't flash the landing page if we're about to redirect
  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
      }} />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* Icon */}
        <div style={{ fontSize: 56, marginBottom: 16 }}>🧠</div>

        {/* Title */}
        <h1 style={styles.title}>Machine Learning Hub</h1>

        {/* Description */}
        <p style={styles.description}>
          A community platform for exploring machine learning concepts,
          sharing research, and discovering the latest in AI — all in one place.
        </p>

        {/* Feature list */}
        <div style={styles.features}>
          {[
            '📝 Write and publish articles',
            '❤️  Like and comment on posts',
            '🔔 Real-time notifications',
            '📊 Track article views',
          ].map(f => (
            <div key={f} style={styles.featureItem}>{f}</div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={styles.btnRow}>
          <button
            style={styles.primaryBtn}
            onClick={() => router.push('/auth')}
          >
            Get Started →
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={() => router.push('/auth')}
          >
            Log In
          </button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: '20px',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: '3rem 2.5rem',
    maxWidth: 520,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
    border: '1px solid #334155',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 16,
    lineHeight: 1.2,
  },
  description: {
    color: '#94a3b8',
    fontSize: '1rem',
    lineHeight: 1.7,
    marginBottom: 24,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 32,
    textAlign: 'left',
  },
  featureItem: {
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: '0.9rem',
    border: '1px solid #1e293b',
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '13px 28px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'opacity 0.2s',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '13px 28px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
};