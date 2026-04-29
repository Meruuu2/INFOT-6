// hooks/useLikes.js
// FIX: Old version queried a 'likes' table that doesn't exist.
// Now uses hasLiked / likeArticle / unlikeArticle / getLikeCount from lib/db.js
// which all correctly query the 'interactions' table with type='like'.

import { useState, useEffect } from 'react';
import { hasLiked, likeArticle, unlikeArticle, getLikeCount } from '../lib/db';

export function useLike(articleId, userId) {
  const [liked,   setLiked]   = useState(false);
  const [count,   setCount]   = useState(0);
  const [loading, setLoading] = useState(false);

  // Load like count for everyone
  useEffect(() => {
    if (!articleId) return;
    getLikeCount(articleId).then(setCount);
  }, [articleId]);

  // Load personal liked state only if logged in
  useEffect(() => {
    if (!articleId || !userId) return;
    hasLiked(articleId, userId).then(setLiked);
  }, [articleId, userId]);

  const toggleLike = async () => {
    if (!userId || loading) return;
    setLoading(true);
    try {
      if (liked) {
        await unlikeArticle(articleId, userId);
        setLiked(false);
        setCount(prev => Math.max(0, prev - 1));
      } else {
        await likeArticle(articleId, userId);
        setLiked(true);
        setCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('[useLike] toggleLike error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return { liked, count, toggleLike, loading };
}