import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { likeArticle, unlikeArticle, hasLiked, getLikeCount, addComment } from '../lib/db';
import { shareOnFacebook, shareOnTwitter, copyLink } from '../lib/share';

export default function SocialBar({ article }) {
  const [user, setUser]             = useState(null);
  const [liked, setLiked]           = useState(false);
  const [likeCount, setLikeCount]   = useState(0);
  const [comment, setComment]       = useState('');
  const [copyLabel, setCopyLabel]   = useState('Copy link');

  // Get current user session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  // Check if this user already liked the article
  useEffect(() => {
    if (!user) return;
    hasLiked(article.id, user.id).then(setLiked);
    getLikeCount(article.id).then(setLikeCount);
  }, [article.id, user]);

  const handleLike = async () => {
    if (!user) return alert('Please log in to like articles.');
    if (liked) {
      await unlikeArticle(article.id, user.id);
      setLiked(false);
      setLikeCount(c => c - 1);
    } else {
      await likeArticle(article.id, user.id);
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please log in to comment.');
    if (!comment.trim()) return;
    await addComment(article.id, user.id, comment.trim());
    setComment('');
    alert('Comment posted!');
  };

  const handleCopy = async () => {
    const { success } = await copyLink();
    if (success) {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy link'), 2000);
    }
  };

  const articleUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>

      {/* Like button */}
      <button onClick={handleLike} style={{ marginRight: 12 }}>
        {liked ? 'Unlike' : 'Like'} ({likeCount})
      </button>

      {/* Share buttons */}
      <button onClick={() => shareOnFacebook(articleUrl)} style={{ marginRight: 8 }}>
        Share on Facebook
      </button>
      <button onClick={() => shareOnTwitter(articleUrl, article.title)} style={{ marginRight: 8 }}>
        Share on X
      </button>
      <button onClick={handleCopy}>{copyLabel}</button>

      {/* Comment form */}
      <form onSubmit={handleComment} style={{ marginTop: '1rem' }}>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          style={{ width: '100%', padding: 8 }}
        />
        <button type="submit" style={{ marginTop: 6 }}>Post comment</button>
      </form>

    </div>
  );
}