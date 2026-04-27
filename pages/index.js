// pages/index.js
import { getRecentArticles, getTopArticles } from '../lib/articleQueries';

export async function getServerSideProps() {
  const [recent, top] = await Promise.all([
    getRecentArticles(10),
    getTopArticles(),
  ]);

  return { props: { recent, top } };
}

export default function HomePage({ recent, top }) {
  return (
    <main>
      <section>
        <h2>Recent Articles</h2>
        {recent.map(a => (
          <div key={a.id}>
            <a href={`/articles/${a.id}`}>{a.title}</a>
            <span> — {a.view_count} views</span>
          </div>
        ))}
      </section>

      <aside>
        <h2>Top Articles</h2>
        {top.map((a, i) => (
          <div key={a.id}>{i + 1}. {a.title} ({a.view_count} views)</div>
        ))}
      </aside>
    </main>
  );
}