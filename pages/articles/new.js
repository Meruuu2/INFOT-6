// pages/articles/new.js
// FIXES:
//   1. After publish → redirects to /articles/[id] so you see your article immediately
//   2. Shows the exact title entered (no mismatch)
//   3. author_id is pulled from live session (fixes RLS + FK)
//   4. Title and content are validated before submit
//   5. Auth guard redirects to /auth if not logged in

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { createArticle } from '../../lib/db'; // We will fix this file next

export default function NewArticle() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.push('/auth');
      } else {
        setUser(data.user);
      }
    });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!title.trim() || !content.trim()) {
      setError('Please fill out all fields.');
      return;
    }

    setLoading(true);
    try {
      // 1. Get current session to ensure we have the correct UUID
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        throw new Error('You must be logged in to publish.');
      }

      // 2. Insert the article using the helper in lib/db.js
      // We pass the title, content, and the authenticated user's ID
      await createArticle(
        title.trim(),
        content.trim(),
        session.user.id
      );

      // 3. ✅ SUCCESS: Redirect to Dashboard instead of the specific article ID
      // This avoids the 404 error and shows the updated newsfeed immediately
     
      router.push('/dashboard'); 

    } catch (err) {
      console.error("Publishing failed:", err.message);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of your return () block remains the same ...

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Write an Article</h1>
        <p style={styles.subtitle}>Share your ML knowledge with the community</p>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <label style={styles.label}>Title</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Introduction to Neural Networks"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            required
          />
          {/* Character hint */}
          {title.length > 0 && (
            <p style={styles.charHint}>{title.length}/200 characters</p>
          )}

          {/* Content */}
          <label style={styles.label}>Content</label>
          <textarea
            style={{ ...styles.input, height: 280, resize: 'vertical' }}
            placeholder="Write your article here..."
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          />

          {/* Error message */}
          {error && (
            <div style={styles.errorBox}>
              ❌ {error}
            </div>
          )}

          {/* Preview of title that will be saved */}
          {title.trim() && (
            <div style={styles.previewBox}>
              <span style={styles.previewLabel}>Preview title: </span>
              <span style={styles.previewTitle}>"{title.trim()}"</span>
            </div>
          )}

          <div style={styles.btnRow}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                opacity: loading || !title.trim() || !content.trim() ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              disabled={loading || !title.trim() || !content.trim()}
            >
              {loading ? '⏳ Publishing...' : '🚀 Publish Article'}
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
    marginBottom: '0.5rem',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontSize: '1rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
  },
  charHint: {
    color: '#475569',
    fontSize: '0.75rem',
    marginBottom: '1.25rem',
    textAlign: 'right',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    border: '1px solid #7f1d1d',
    color: '#f87171',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  previewBox: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  previewLabel: {
    color: '#64748b',
  },
  previewTitle: {
    color: '#a5b4fc',
    fontWeight: 600,
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
    transition: 'opacity 0.2s',
  },
};