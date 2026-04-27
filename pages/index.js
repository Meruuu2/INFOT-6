import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Double check if your path is ../utils/supabaseClient
import SocialBar from '../components/SocialBar';

export default function Dashboard() {
  const [articles, setArticles] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchArticles();
      }
    };
    getUser();
  }, []);

  // 2. Fetch articles from the database
  async function fetchArticles() {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        profiles (full_name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
    } else {
      setArticles(data);
    }
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; // Redirect to login
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading ML Hub...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      {/* HEADER */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold text-white">🚀 ML Hub</h1>
          <p className="text-sm text-slate-400">Logged in as: {user?.email}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
        >
          Logout
        </button>
      </div>

      {/* ARTICLES LIST */}
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-xl font-semibold border-b border-slate-700 pb-2">Latest Machine Learning Resources</h2>
        
        {articles.length === 0 ? (
          <div className="bg-slate-800 p-10 rounded-xl text-center border border-dashed border-slate-600">
            <p className="text-slate-400">No articles found in the database.</p>
            <p className="text-xs mt-2 text-slate-500">Go to Supabase Table Editor and add a row to "articles" to see it here!</p>
          </div>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold">
                  {article.profiles?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{article.profiles?.full_name || 'Anonymous User'}</p>
                  <p className="text-xs text-slate-500">{new Date(article.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{article.title}</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                {article.content}
              </p>

              {/* THE SOCIAL BAR COMPONENT */}
              <div className="border-t border-slate-700 pt-4">
                <SocialBar articleId={article.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
