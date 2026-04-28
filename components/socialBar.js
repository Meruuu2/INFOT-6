// components/socialBar.js   ← filename is lowercase 's' — matches all imports
// FIX: Renamed from SocialBar.js to socialBar.js to resolve the Windows
//      case-sensitivity conflict that caused:
//      "Already included file name 'd:/...components/socialBar.js' differs from file name"
//
// HOW TO APPLY THIS FIX IN VS CODE:
//   1. Delete your old components/SocialBar.js  (or socialBar.js — whichever exists)
//   2. Create a NEW file named exactly:  components/socialBar.js
//   3. Paste this entire file into it
//   4. In [id].js make sure the import reads:
//        import SocialBar from '../../components/socialBar';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { likeArticle, unlikeArticle, hasLiked, getLikeCount, addComment } from '../lib/db';
import { shareOnFacebook, shareOnTwitter, copyLink } from '../lib/share';

export default function SocialBar({ article, onCommentAdded }) {
  const [user,           setUser]           = useState(null);
  const [liked,          setLiked]          = useState(false);
  const [likeCount,      setLikeCount]      = useState(0);
  const [comment,        setComment]        = useState('');
  const [replyTo,        setReplyTo]        = useState(null);
  const [copyLabel,      setCopyLabel]      = useState('Copy Link');
  const [likeLoading,    setLikeLoading]    = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [toast,          setToast]          = useState('');
  const [initLoading,    setInitLoading]    = useState(true);

  // ── Load user + like state once on mount ─────────────────────
  // FIX: Was two separate useEffects both calling getUser (ran twice).
  //      Merged into one. Also added getLikeCount + hasLiked calls
  //      which were completely missing before — that's why the like
  //      button always showed 0 and wasn't highlighted.
  useEffect(() => {
    if (!article?.id) return;

    const init = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser ?? null);

        // Always load the like count regardless of login state
        const count = await getLikeCount(article.id);
        setLikeCount(count);

        // Only check if THIS user liked it when logged in
        if (currentUser) {
          const alreadyLiked = await hasLiked(article.id, currentUser.id);
          setLiked(alreadyLiked);
        }
      } catch (err) {
        console.error('[SocialBar init]', err.message);
      } finally {
        setInitLoading(false);
      }
    };

    init();
  }, [article?.id]);

  // ── Toast helper ──────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Like / Unlike ─────────────────────────────────────────────
  const handleLike = async () => {
    if (!user) return showToast('⚠️ Please log in to like articles.');
    if (likeLoading) return;

    setLikeLoading(true);

    // Optimistic update — change UI instantly
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
      // Revert on failure
      setLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : c - 1);
      showToast('❌ ' + (err.message || 'Could not update like.'));
    } finally {
      setLikeLoading(false);
    }
  };

  // ── Post comment / reply ──────────────────────────────────────
  const handleComment = async (e) => {
    e.preventDefault();
    if (!user)           return showToast('⚠️ Please log in to comment.');
    if (!comment.trim()) return;

    setCommentLoading(true);
    try {
      await addComment(
        article.id,
        user.id,
        comment.trim(),
        replyTo?.id ?? null   // null = top-level comment, uuid = reply
      );
      setComment('');
      setReplyTo(null);
      showToast('✅ Comment posted!');
      if (onCommentAdded) onCommentAdded(); // refresh comment list in [id].js
    } catch (err) {
      showToast('❌ ' + (err.message || 'Could not post comment.'));
    } finally {
      setCommentLoading(false);
    }
  };

  // ── Copy link ─────────────────────────────────────────────────
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

      {/* ── Action bar ── */}
      <div style={styles.actionBar}>

        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={likeLoading || initLoading}
          style={{
            ...styles.actionBtn,
            ...(liked ? styles.actionBtnActive : {}),
            opacity: initLoading ? 0.5 : 1,
          }}
          title={user ? (liked ? 'Unlike' : 'Like this article') : 'Log in to like'}
        >
          {liked ? '❤️' : '🤍'}
          <span style={{ marginLeft: 4 }}>
            {likeCount > 0 ? likeCount : ''} {liked ? 'Liked' : 'Like'}
          </span>
        </button>

        {/* Share: Facebook */}
        <button
          onClick={() => shareOnFacebook(articleUrl)}
          style={styles.shareBtn}
          title="Share on Facebook"
        >
          <span style={styles.fbIcon}>f</span> Facebook
        </button>

        {/* Share: Twitter / X */}
        <button
          onClick={() => shareOnTwitter(articleUrl, article.title)}
          style={styles.shareBtn}
          title="Share on Twitter / X"
        >
          <span style={styles.xIcon}>𝕏</span> Twitter / X
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
          {replyTo ? `↩ Replying to ${replyTo.name}` : '💬 Leave a Comment'}
          {replyTo && (
            <button onClick={() => setReplyTo(null)} style={styles.cancelReply}>
              Cancel reply
            </button>
          )}
        </h3>

        <form onSubmit={handleComment}>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={
              !user
                ? 'Log in to leave a comment'
                : replyTo
                  ? `Reply to ${replyTo.name}...`
                  : 'Share your thoughts on this article...'
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
              {commentLoading
                ? '⏳ Posting...'
                : replyTo ? '↩ Post Reply' : '💬 Post Comment'}
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