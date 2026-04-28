import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function CreateArticle() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) router.push('/auth');
      else setUser(data.user);
    });
  }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title || !content) return alert("Please fill in all fields");

    setLoading(true);
    const { error } = await supabase
      .from('articles')
      .insert([
        { 
          title, 
          content, 
          author_id: user.id,
          view_count: 0 
        }
      ]);

    if (error) {
      alert(error.message);
    } else {
      // Redirect to main dashboard to see the new post
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handlePublish} style={styles.card}>
        <h2 style={styles.title}>Create New Article</h2>
        <input 
          style={styles.input}
          placeholder="Article Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea 
          style={styles.textarea}
          placeholder="Write your content here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Publishing...' : 'Publish Article'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { padding: '40px', backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center' },
  card: { backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '700px' },
  title: { color: '#f1f5f9', marginBottom: '20px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' },
  textarea: { width: '100%', minHeight: '300px', padding: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', marginBottom: '15px' },
  button: { width: '100%', padding: '12px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
};