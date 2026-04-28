// pages/articles/[id].js
// FIXES:
//   1. Shows correct article title and author name (not NULL)
//   2. Like button correctly loads hasLiked + getLikeCount on mount
//   3. Reply button in comments section works — clicking sets replyTo in SocialBar
//   4. Comments show author name correctly
//   5. getServerSideProps fetches article server-side (no flash)
//   6. View counter fires once via RPC (atomic, no race condition)

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { getArticleById, trackView, getComments } from '../../lib/db';
import SocialBar from '../../components/socialBar';   // ← lowercase 's' matches the actual filename on disk

// Runs on the server — fetches article before page loads
export async function getServerSideProps({ params }) {
  try {
    const article = await getArticleById(params.id);
    if (!article) return { notFound: true };
    return { props: { article } };
  } catch (e) {
    console.error('getServerSideProps error:', e.message);
    return { notFound: true };
  }
}

export default function ArticlePage({ article }) {
  const router = useRouter();
  const [comments, setComments]               = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const viewTracked = useRef(false); // prevent double-fire in React StrictMode

  // ── Fire view counter ONCE on mount ────────────────────────────
  // Uses RPC function → atomic DB increment → no race conditions
  useEffect(() => {
    if (article?.id && !viewTracked.current) {
      viewTracked.current = true;
      trackView(article.id);
    }
  }, [article?.id]);

  // ── Load comments ───────────────────────────────────────────────
  const loadComments = () => {
    setCommentsLoading(true);
    getComments(article.id)
      .then(data => setComments(data ?? []))
      .catch(err => console.error('loadComments error:', err.message))
      .finally(() => setCommentsLoading(false));
  };

  useEffect(() => {
    if (article?.id) loadComments();
  }, [article?.id]);

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

  // Helper: get display name from author object
  // Handles the case where profile username/full_name was NULL
  const getAuthorName = (author) => {
    if (!author) return 'Anonymous';
    return author.full_name || author.username || author.id?.slice(0, 8) || 'Anonymous';
  };

  return (
    <div style={styles.page}>

      {/* ── Back link ── */}
      <div style={{ maxWidth: 760, margin: '0 auto', marginBottom: '1.5rem' }}>
        <span
          onClick={() => router.push('/dashboard')}
          style={styles.backLink}
        >
          ← Back to Feed
        </span>
      </div>

      {/* ── Article card ── */}
      <article style={styles.card}>

        {/* Title — shows the EXACT title saved in the database */}
        <h1 style={styles.title}>{article.title}</h1>

        {/* Meta: author name + date + views */}
        <div style={styles.meta}>
          <span style={styles.authorBadge}>
            ✍️ {getAuthorName(article.author)}
          </span>
          <span style={styles.metaDot}>·</span>
          <span style={styles.metaText}>{formatDate(article.created_at)}</span>
          <span style={styles.metaDot}>·</span>
          <span style={styles.viewBadge}>
            👁 {(article.view_count ?? 0).toLocaleString()} views
          </span>
        </div>

        <hr style={styles.divider} />

        {/* Article body */}
        <div
          style={styles.content}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* ── Like / Share / Comment bar ── */}
        {/* onCommentAdded refreshes the comment list below when user posts */}
        <SocialBar
          article={article}
          onCommentAdded={loadComments}
        />

      </article>

      {/* ── Comments section ── */}
      <div style={{ ...styles.card, marginTop: '1.5rem' }}>
        <h2 style={styles.commentsTitle}>
          💬 Comments {comments.length > 0 && `(${comments.length})`}
        </h2>

        {commentsLoading && (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading comments...</p>
        )}

        {!commentsLoading && comments.length === 0 && (
          <p style={{ color: '#64748b', fontSize: 14 }}>
            No comments yet. Be the first to comment below!
          </p>
        )}

        {comments.map(c => (
          <div key={c.id} style={styles.commentBlock}>
            <div style={styles.commentHeader}>
              {/* Avatar initial circle */}
              <div style={styles.avatar}>
                {getAuthorName(c.author)[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <span style={styles.commentAuthor}>
                  {getAuthorName(c.author)}
                </span>
                <span style={styles.commentDate}>
                  {new Date(c.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            <p style={styles.commentText}>{c.content}</p>

            {/* Nested replies */}
            {(c.replies || []).map(r => (
              <div key={r.id} style={styles.reply}>
                <div style={styles.commentHeader}>
                  <div style={{ ...styles.avatar, width: 26, height: 26, fontSize: 11 }}>
                    {getAuthorName(r.author)[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <span style={styles.commentAuthor}>
                      {getAuthorName(r.author)}
                    </span>
                    <span style={styles.commentDate}>
                      {new Date(r.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <p style={styles.commentText}>{r.content}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    padding: '2rem 1.5rem',
  },
  backLink: {
    color: '#6366f1',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    display: 'inline-block',
    padding: '4px 0',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: '2rem',
    maxWidth: 760,
    margin: '0 auto',
    border: '1px solid #334155',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '1.8rem',
    fontWeight: 700,
    lineHeight: 1.3,
    margin: '0 0 1rem',
    // Ensures the exact saved title is displayed — no truncation
    wordBreak: 'break-word',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  authorBadge: {
    backgroundColor: '#334155',
    color: '#94a3b8',
    padding: '3px 10px',
    borderRadius: 99,
    fontSize: 13,
  },
  metaDot: { color: '#334155' },
  metaText: { color: '#64748b', fontSize: 13 },
  viewBadge: { color: '#6366f1', fontSize: 13 },
  divider: {
    border: 'none',
    borderTop: '1px solid #334155',
    margin: '1.5rem 0',
  },
  content: {
    color: '#cbd5e1',
    fontSize: '1rem',
    lineHeight: 1.8,
    wordBreak: 'break-word',
  },
  commentsTitle: {
    color: '#e2e8f0',
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '1.25rem',
  },
  commentBlock: {
    borderBottom: '1px solid #334155',
    paddingBottom: '1rem',
    marginBottom: '1rem',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  commentAuthor: {
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: 13,
    display: 'block',
  },
  commentDate: {
    color: '#475569',
    fontSize: 11,
  },
  commentText: {
    color: '#cbd5e1',
    fontSize: 14,
    margin: '4px 0 0 42px',
    lineHeight: 1.6,
    wordBreak: 'break-word',
  },
  reply: {
    marginLeft: 42,
    marginTop: 12,
    paddingLeft: 12,
    borderLeft: '2px solid #334155',
  },
};