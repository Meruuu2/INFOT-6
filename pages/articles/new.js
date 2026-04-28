import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { createArticle } from '../../lib/db';

export default function NewArticle() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) router.push('/auth');
      else setUser(data.user);
    });
  }, []);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    // 1. Check if the user is actually logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to publish.");

    // 2. Use your form state (title and content) instead of hardcoded strings
    // We use the function from db.js to keep it clean
    await createArticle(title, content, user.id);

    router.push('/dashboard'); 
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Write an Article</h1>
        <p style={styles.subtitle}>Share your ML knowledge with the community</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Title</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Introduction to Neural Networks"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <label style={styles.label}>Content</label>
          <textarea
            style={{ ...styles.input, height: 280, resize: 'vertical' }}
            placeholder="Write your article here. HTML is supported."
            value={content}
            onChange={e => setContent(e.target.value)}
          />

          {error && <p style={styles.errorMsg}>{error}</p>}

          <div style={styles.btnRow}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Publishing...' : '🚀 Publish Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: '2.5rem',
    width: '100%',
    maxWidth: 680,
    border: '1px solid #334155',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '1.6rem',
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: 6,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    marginBottom: '1.25rem',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontSize: '1rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  errorMsg: {
    color: '#f87171',
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#6366f1',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};