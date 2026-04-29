// components/socialBar.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { likeArticle, unlikeArticle, hasLiked, getLikeCount, addComment } from '../lib/db';
import { shareOnFacebook, shareOnTwitter, copyLink } from '../lib/share';

export default function SocialBar({ article, onCommentAdded, replyTo: externalReplyTo, onReplyChange }) {
  const [user,           setUser]           = useState(null);
  const [liked,          setLiked]          = useState(false);
  const [likeCount,      setLikeCount]      = useState(0);
  const [comment,        setComment]        = useState('');
  const [replyTo,        setReplyTo]        = useState(null);
  const [copyLabel,      setCopyLabel]      = useState('Copy Link');
  const [likeLoading,    setLikeLoading]    = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [toast,          setToast]          = useState('');

  // Sync external replyTo (from Reply button in CommentCard)
  useEffect(() => {
    if (externalReplyTo !== undefined) setReplyTo(externalReplyTo);
  }, [externalReplyTo]);

  // Load user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  // Load like count + personal liked state once user and article are known
  useEffect(() => {
    if (!article?.id) return;
    getLikeCount(article.id).then(setLikeCount);
  }, [article?.id]);

  useEffect(() => {
    if (!article?.id || !user?.id) return;
    hasLiked(article.id, user.id).then(setLiked);
  }, [article?.id, user?.id]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleLike = async () => {
    if (!user) { showToast('Please log in to like posts'); return; }
    setLikeLoading(true);
    try {
      if (liked) {
        await unlikeArticle(article.id, user.id);
        setLikeCount(prev => Math.max(0, prev - 1));
        setLiked(false);
      } else {
        await likeArticle(article.id, user.id);
        setLikeCount(prev => prev + 1);
        setLiked(true);
      }
    } catch (err) {
      console.error('[handleLike]', err.message);
      showToast('Something went wrong. Try again.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user)          { showToast('Please log in to comment'); return; }
    if (!comment.trim()) return;

    setCommentLoading(true);
    try {
      await addComment(article.id, user.id, comment.trim(), replyTo?.id ?? null);
      setComment('');
      setReplyTo(null);
      if (onReplyChange) onReplyChange(null);
      if (onCommentAdded) onCommentAdded();
      showToast('💬 Comment posted!');
    } catch (err) {
      console.error('[handleComment]', err.message);
      showToast('Failed to post comment. Please try again.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleCopy = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const { success } = await copyLink(url);
    if (success) {
      setCopyLabel('✓ Copied!');
      setTimeout(() => setCopyLabel('Copy Link'), 2500);
      showToast('🔗 Link copied to clipboard!');
    }
  };

  const articleUrl = typeof window !== 'undefined' ? window.location.href : '';
  const activeReplyTo = externalReplyTo ?? replyTo;

  return (
    <div style={styles.wrapper}>
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Action bar */}
      <div style={styles.actionBar}>
        <button
          onClick={handleLike}
          disabled={likeLoading}
          style={{ ...styles.actionBtn, ...(liked ? styles.actionBtnActive : {}) }}
        >
          {liked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : ''} Like
        </button>

        <button onClick={() => shareOnFacebook(articleUrl)} style={styles.shareBtn}>
          <span style={styles.fbIcon}>f</span> Facebook
        </button>

        <button onClick={() => shareOnTwitter(articleUrl, article?.title)} style={styles.shareBtn}>
          <span style={styles.xIcon}>𝕏</span> Twitter / X
        </button>

        <button onClick={handleCopy} style={styles.copyBtn}>
          🔗 {copyLabel}
        </button>
      </div>

      <hr style={styles.divider} />

      {/* Comment form */}
      <div style={styles.commentForm}>
        <h3 style={styles.formTitle}>
          {activeReplyTo ? `↩ Replying to ${activeReplyTo.name}` : '💬 Leave a Comment'}
          {activeReplyTo && (
            <button
              onClick={() => { setReplyTo(null); if (onReplyChange) onReplyChange(null); }}
              style={styles.cancelReply}
            >
              Cancel reply
            </button>
          )}
        </h3>

        <form onSubmit={handleComment}>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={
              user
                ? activeReplyTo
                  ? `Reply to ${activeReplyTo.name}...`
                  : 'Share your thoughts on this article...'
                : 'Log in to leave a comment'
            }
            disabled={!user}
            rows={3}
            style={styles.textarea}
          />
          <button
            type="submit"
            disabled={commentLoading || !user || !comment.trim()}
            style={{
              ...styles.submitBtn,
              opacity: (commentLoading || !user || !comment.trim()) ? 0.5 : 1,
              cursor:  (commentLoading || !user || !comment.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {commentLoading ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper:         { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #334155', position: 'relative' },
  toast:           { position: 'fixed', bottom: 24, right: 24, backgroundColor: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 10, padding: '12px 20px', fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 9999 },
  actionBar:       { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '1.5rem' },
  actionBtn:       { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#94a3b8', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  actionBtnActive: { borderColor: '#6366f1', color: '#a5b4fc', backgroundColor: '#1e1b4b' },
  shareBtn:        { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#94a3b8', fontSize: 14, cursor: 'pointer' },
  fbIcon:          { backgroundColor: '#1877f2', color: '#fff', borderRadius: 4, width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  xIcon:           { color: '#f1f5f9', fontSize: 14, fontWeight: 700 },
  copyBtn:         { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#94a3b8', fontSize: 14, cursor: 'pointer' },
  divider:         { border: 'none', borderTop: '1px solid #1e293b', margin: '0 0 1.5rem' },
  commentForm:     { backgroundColor: '#0f172a', borderRadius: 10, padding: '1.25rem', border: '1px solid #334155' },
  formTitle:       { color: '#94a3b8', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 12 },
  cancelReply:     { background: 'none', border: 'none', color: '#6366f1', fontSize: 13, cursor: 'pointer', padding: 0, fontWeight: 500 },
  textarea:        { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', backgroundColor: '#1e293b', color: '#f1f5f9', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10, fontFamily: 'inherit', lineHeight: 1.6 },
  submitBtn:       { backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 600 },
};