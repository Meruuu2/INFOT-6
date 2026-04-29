// pages/articles/[id].js
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getArticleById, getComments, trackView } from '../../lib/db';
import SocialBar from '../../components/socialBar';

// ── getServerSideProps ──────────────────────────────────────────────────────
export async function getServerSideProps({ params }) {
  try {
    const [article, initialComments] = await Promise.all([
      getArticleById(params.id),
      getComments(params.id),
    ]);
    if (!article) return { notFound: true };
    return { props: { article, initialComments } };
  } catch (err) {
    console.error('getServerSideProps error:', err.message);
    return { notFound: true };
  }
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ArticlePage({ article, initialComments }) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments ?? []);
  const [replyTo, setReplyTo]   = useState(null); // { id, name }
  const viewTracked = useRef(false);

  useEffect(() => {
    if (article?.id && !viewTracked.current) {
      viewTracked.current = true;
      trackView(article.id);
    }
  }, [article?.id]);

  const refreshComments = async () => {
    const fresh = await getComments(article.id);
    setComments(fresh ?? []);
  };

  if (router.isFallback || !article) {
    return (
      <div style={styles.page}>
        <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: 80 }}>
          Loading article...
        </div>
      </div>
    );
  }

  const getAuthorName = (author) =>
    author?.full_name || author?.username || 'Anonymous';

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <Link href="/dashboard" style={styles.backLink}>← Back to Feed</Link>

        {/* Header */}
        <div style={styles.articleHeader}>
          <h1 style={styles.title}>{article.title}</h1>
          <div style={styles.meta}>
            <span style={styles.authorBadge}>✍️ {getAuthorName(article.author)}</span>
            <span style={styles.dot}>·</span>
            <span style={styles.metaText}>{formatDate(article.created_at)}</span>
            <span style={styles.dot}>·</span>
            <span style={styles.viewText}>👁 {(article.view_count ?? 0).toLocaleString()} views</span>
          </div>
        </div>

        {/* Body */}
        <div style={styles.body}>{article.content}</div>

        {/* Like / Share / Comment form */}
        <div id="comment-form-anchor">
          <SocialBar
            article={article}
            onCommentAdded={refreshComments}
            replyTo={replyTo}
            onReplyChange={setReplyTo}
          />
        </div>

        {/* Comments list */}
        <div style={styles.commentsSection}>
          <h2 style={styles.commentsTitle}>
            💬 Comments {comments.length > 0 && `(${comments.length})`}
          </h2>

          {comments.length === 0 ? (
            <div style={styles.noComments}>
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            comments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                getAuthorName={getAuthorName}
                onReply={(id, name) => {
                  setReplyTo({ id, name });
                  document.getElementById('comment-form-anchor')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}

// ── Comment Card ────────────────────────────────────────────────────────────
function CommentCard({ comment, getAuthorName, onReply, isReply = false }) {
  const authorName = getAuthorName(comment.author);
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ ...styles.commentCard, ...(isReply ? styles.replyCard : {}) }}>
      <div style={styles.commentHeader}>
        <div style={{ ...styles.commentAvatar, ...(isReply ? { width: 26, height: 26, fontSize: 11 } : {}) }}>
          {authorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <span style={styles.commentAuthor}>{authorName}</span>
          <span style={styles.commentDate}>{formatDate(comment.created_at)}</span>
        </div>
      </div>

      <p style={styles.commentContent}>{comment.content}</p>

      {!isReply && onReply && (
        <button style={styles.replyBtn} onClick={() => onReply(comment.id, authorName)}>
          ↩ Reply
        </button>
      )}

      {comment.replies?.length > 0 && (
        <div style={styles.repliesWrapper}>
          {comment.replies.map(reply => (
            <CommentCard key={reply.id} comment={reply} getAuthorName={getAuthorName} isReply />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page:            { minHeight: '100vh', backgroundColor: '#0f172a', padding: '2rem 1rem', color: '#f1f5f9' },
  container:       { maxWidth: 760, margin: '0 auto' },
  backLink:        { color: '#6366f1', textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'inline-block', marginBottom: '1.5rem' },
  articleHeader:   { marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #334155' },
  title:           { color: '#f1f5f9', fontSize: '2rem', fontWeight: 700, lineHeight: 1.3, margin: '0 0 1rem', wordBreak: 'break-word' },
  meta:            { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 },
  authorBadge:     { backgroundColor: '#1e293b', color: '#94a3b8', padding: '3px 10px', borderRadius: 99, border: '1px solid #334155', fontSize: 13 },
  dot:             { color: '#334155' },
  metaText:        { color: '#64748b' },
  viewText:        { color: '#6366f1', fontSize: 13 },
  body:            { color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: '2rem' },
  commentsSection: { marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #334155' },
  commentsTitle:   { color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' },
  noComments:      { color: '#64748b', fontSize: 14, textAlign: 'center', padding: '2rem', backgroundColor: '#1e293b', borderRadius: 10, border: '1px dashed #334155' },
  commentCard:     { backgroundColor: '#1e293b', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '0.75rem', border: '1px solid #334155' },
  replyCard:       { backgroundColor: '#0f172a', borderLeft: '3px solid #6366f1', borderRadius: '0 8px 8px 0', border: 'none', marginLeft: 8 },
  commentHeader:   { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  commentAvatar:   { width: 32, height: 32, borderRadius: '50%', backgroundColor: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  commentAuthor:   { color: '#a5b4fc', fontWeight: 600, fontSize: 14, display: 'block' },
  commentDate:     { color: '#475569', fontSize: 11, display: 'block' },
  commentContent:  { color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, margin: 0, wordBreak: 'break-word' },
  replyBtn:        { marginTop: 8, background: 'none', border: 'none', color: '#6366f1', fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: '2px 0' },
  repliesWrapper:  { marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid #334155', display: 'flex', flexDirection: 'column', gap: 6 },
};