import { useEffect, useState } from 'react';
import { getArticleById, trackView, getComments } from '../../lib/db';

export async function getServerSideProps({ params }) {
  const article = await getArticleById(params.id);
  if (!article) return { notFound: true };
  return { props: { article } };
}

export default function ArticlePage({ article }) {
  const [comments, setComments] = useState([]);

  // Fire view counter on mount — runs once because article.id is stable
  useEffect(() => {
    trackView(article.id); // fire-and-forget, no await needed
  }, [article.id]);

  // Load comments on mount
  useEffect(() => {
    getComments(article.id).then(setComments);
  }, [article.id]);

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '2rem 1rem' }}>

      <h1>{article.title}</h1>
      <p style={{ color: '#666', fontSize: 13 }}>
        By {article.author?.full_name}
         • {article.view_count} views
      </p>

      <div dangerouslySetInnerHTML={{ __html: article.content }} />

      {/* Social bar — see Tab 6 for the full component */}
      <SocialBar article={article} />

      {/* Comments */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Comments</h2>
        {comments.map(c => (
          <div key={c.id} style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
            <strong>{c.author?.full_name}</strong>: {c.content}
            {c.replies?.map(r => (
              <div key={r.id} style={{ marginLeft: 24, marginTop: 8, color: '#555' }}>
                ↔ <strong>{r.author?.full_name}</strong>: {r.content}
              </div>
            ))}
          </div>
        ))}
      </section>

    </div>
  );
}