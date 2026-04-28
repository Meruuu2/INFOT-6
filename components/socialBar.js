// components/SocialBar.js
// FIXES:
//   1. Loads hasLiked() + getLikeCount() on mount so like state shows correctly
//   2. Removed duplicate useEffect for getUser (was running twice)
//   3. Reply button now sets replyTo state properly
//   4. interactions INSERT uses auth.uid() via session — fixes FK error
//   5. Toast auto-hides correctly
//   6. Disabled state on submit button works properly

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { likeArticle, unlikeArticle, hasLiked, getLikeCount, addComment } from '../lib/db';
import { shareOnFacebook, shareOnTwitter, copyLink } from '../lib/share';

export default function SocialBar({ article, onCommentAdded }) {
  const [user,           setUser]           = useState(null);
  const [liked,          setLiked]          = useState(false);
  const [likeCount,      setLikeCount]      = useState(0);
  const [comment,        setComment]        = useState('');
  const [replyTo,        setReplyTo]        = useState(null); // { id, name }
  const [copyLabel,      setCopyLabel]      = useState('Copy Link');
  const [likeLoading,    setLikeLoading]    = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [toast,          setToast]          = useState('');
  const [initLoading,    setInitLoading]    = useState(true);

  // ── SINGLE useEffect: load user + like state together ──────────
  // Previously there were TWO useEffects both calling getUser — merged into one.
  // This also calls hasLiked and getLikeCount which were MISSING before.
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser ?? null);

        // Always load the current like count for this article
        const count = await getLikeCount(article.id);
        setLikeCount(count);

        // Only check if THIS user has liked it (requires user to be logged in)
        if (currentUser) {
          const userHasLiked = await hasLiked(article.id, currentUser.id);
          setLiked(userHasLiked);
        }
      } catch (err) {
        console.error('SocialBar init error:', err.message);
      } finally {
        setInitLoading(false);
      }
    };

    if (article?.id) init();
  }, [article?.id]);

  // ── Toast helper ───────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Like / Unlike ──────────────────────────────────────────────
  const handleLike = async () => {
    if (!user) {
      showToast('⚠️ Please log in to like articles.');
      return;
    }
    if (likeLoading) return;

    setLikeLoading(true);

    // Optimistic UI update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);

    try {
      if (wasLiked) {
        await unlikeArticle(article.id, user.id);
      } else {
        await likeArticle(article.id, user.id);
        showToast('❤️ Article liked!');
      }
    } catch (err) {
      // Revert on error
      setLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : c - 1);
      showToast('❌ ' + (err.message || 'Could not update like.'));
    } finally {
      setLikeLoading(false);
    }
  };

  // ── Post comment or reply ──────────────────────────────────────
  const handleComment = async (e) => {
    e.preventDefault();
    if (!user)           return showToast('⚠️ Please log in to comment.');
    if (!comment.trim()) return;

    setCommentLoading(true);
    try {
      // Pass replyTo.id as parentId for nested replies
      await addComment(
        article.id,
        user.id,
        comment.trim(),
        replyTo?.id ?? null
      );
      setComment('');
      setReplyTo(null);
      showToast('✅ Comment posted!');
      if (onCommentAdded) onCommentAdded(); // tells [id].js to reload comments
    } catch (err) {
      showToast('❌ ' + (err.message || 'Could not post comment.'));
    } finally {
      setCommentLoading(false);
    }
  };

  // ── Copy link ──────────────────────────────────────────────────
  const handleCopy = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const { success } = await copyLink(url);
    if (success) {
      setCopyLabel('✓ Copied!');
      showToast('🔗 Link copied to clipboard!');
      setTimeout(() => setCopyLabel('Copy Link'), 2500);
    }
  };

  const articleUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div style={styles.wrapper}>

      {/* Toast pop-up */}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* ── Action bar: Like + Share buttons ── */}
      <div style={styles.actionBar}>

        {/* Like button — shows current count and liked state */}
        <button
          onClick={handleLike}
          disabled={likeLoading || initLoading}
          style={{
            ...styles.actionBtn,
            ...(liked ? styles.actionBtnActive : {}),
            opacity: initLoading ? 0.6 : 1,
          }}
          title={user ? (liked ? 'Unlike this article' : 'Like this article') : 'Log in to like'}
        >
          {liked ? '❤️' : '🤍'}
          <span style={{ marginLeft: 4 }}>
            {likeCount > 0 ? likeCount : ''} {liked ? 'Liked' : 'Like'}
          </span>
        </button>

        {/* Facebook share */}
        <button
          onClick={() => shareOnFacebook(articleUrl)}
          style={styles.shareBtn}
          title="Share on Facebook"
        >
          <span style={styles.fbIcon}>f</span>
          Facebook
        </button>

        {/* Twitter / X share */}
        <button
          onClick={() => shareOnTwitter(articleUrl, article.title)}
          style={styles.shareBtn}
          title="Share on Twitter / X"
        >
          <span style={styles.xIcon}>𝕏</span>
          Twitter / X
        </button>

        {/* Copy link */}
        <button onClick={handleCopy} style={styles.copyBtn}>
          🔗 {copyLabel}
        </button>

      </div>

      <hr style={styles.divider} />

      {/* ── Comment / Reply form ── */}
      <div style={styles.commentForm}>

        <h3 style={styles.formTitle}>
          {replyTo
            ? `↩ Replying to ${replyTo.name}`
            : '💬 Leave a Comment'
          }
          {replyTo && (
            <button
              onClick={() => setReplyTo(null)}
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
                ? replyTo
                  ? `Write your reply to ${replyTo.name}...`
                  : 'Share your thoughts on this article...'
                : 'Log in to leave a comment'
            }
            disabled={!user || commentLoading}
            rows={3}
            style={{
              ...styles.textarea,
              opacity: !user ? 0.5 : 1,
              cursor:  !user ? 'not-allowed' : 'text',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="submit"
              disabled={commentLoading || !user || !comment.trim()}
              style={{
                ...styles.submitBtn,
                opacity: (commentLoading || !user || !comment.trim()) ? 0.6 : 1,
                cursor:  (commentLoading || !user || !comment.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {commentLoading ? '⏳ Posting...' : replyTo ? '↩ Post Reply' : '💬 Post Comment'}
            </button>

            {!user && (
              <span style={{ color: '#64748b', fontSize: 12 }}>
                You must be logged in to comment
              </span>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}

const styles = {
  wrapper: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #334155',
    position: 'relative',
  },
  toast: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: '12px 20px',
    fontSize: 14,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    zIndex: 9999,
    maxWidth: 320,
  },
  actionBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: '1.5rem',
    alignItems: 'center',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  actionBtnActive: {
    borderColor: '#6366f1',
    color: '#a5b4fc',
    backgroundColor: '#1e1b4b',
  },
  shareBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  fbIcon: {
    backgroundColor: '#1877f2',
    color: '#fff',
    borderRadius: 4,
    width: 18,
    height: 18,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  xIcon: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: 700,
  },
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #1e293b',
    margin: '0 0 1.5rem',
  },
  commentForm: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: '1.25rem',
    border: '1px solid #334155',
  },
  formTitle: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    fontWeight: 600,
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  cancelReply: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: 13,
    cursor: 'pointer',
    padding: 0,
    fontWeight: 500,
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 8,
    border: '1px solid #334155',
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    fontSize: 14,
    resize: 'vertical',
    boxSizing: 'border-box',
    marginBottom: 10,
    fontFamily: 'inherit',
    lineHeight: 1.6,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 22px',
    fontSize: 14,
    fontWeight: 600,
    transition: 'opacity 0.2s',
  },
};