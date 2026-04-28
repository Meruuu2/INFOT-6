// hooks/useLike.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useLike(articleId, userId) {
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user already liked this article
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single()
      .then(({ data }) => setLiked(!!data));
  }, [articleId, userId]);

  const toggleLike = async () => {
    if (!userId || loading) return;
    setLoading(true);

    if (liked) {
      // Unlike
      await supabase
        .from('likes')
        .delete()
        .match({ user_id: userId, article_id: articleId });
      setLiked(false);
    } else {
      // Like + create notification for article author
      await supabase
        .from('likes')
        .insert({ user_id: userId, article_id: articleId });

      // Fetch author to notify them
      const { data: article } = await supabase
        .from('articles')
        .select('author_id, title')
        .eq('id', articleId)
        .single();

      if (article && article.author_id !== userId) {
        await supabase.from('notifications').insert({
          recipient_id: article.author_id,
          actor_id: userId,
          type: 'like',
          payload: { article_id: articleId, title: article.title },
        });
      }
      setLiked(true);
    }
    setLoading(false);
  };

  return { liked, toggleLike, loading };
}