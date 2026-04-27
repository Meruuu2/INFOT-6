// pages/articles/[id].js
import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ArticlePage({ article }) {
  useEffect(() => {
    // Fire-and-forget: increment when component mounts.
    // No await needed — we don't block the UI on this.
    const trackView = async () => {
      const { error } = await supabase.rpc('increment_view_count', {
        article_id: article.id,
      });
      if (error) console.error('View tracking failed:', error.message);
    };

    if (article?.id) trackView();
  }, [article?.id]); // Dependency on article.id prevents double-firing

  return (
    <article>
      <h1>{article.title}</h1>
      <p>Views: {article.view_count}</p>
      <div dangerouslySetInnerHTML={{ __html: article.content }} />
    </article>
  );
}