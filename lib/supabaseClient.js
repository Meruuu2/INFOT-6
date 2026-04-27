import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── RECENT ARTICLES ───────────────────────────────────────────
// Ordered by published_at descending, joins author profile
export async function getRecentArticles(limit = 10) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, title, slug, view_count, published_at,
      profiles ( username, avatar_url )
    `)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// ─── TOP 5 ARTICLES (by view count) ────────────────────────────
export async function getTop5Articles() {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, title, slug, view_count, published_at,
      profiles ( username, avatar_url )
    `)
    .order('view_count', { ascending: false })
    .limit(5)

  if (error) throw error
  return data
}

// ─── INCREMENT VIEW COUNT ───────────────────────────────────────
// Call this every time an article page is opened.
// Uses a Postgres RPC function to avoid race conditions.
export async function incrementViewCount(articleId) {
  const { error } = await supabase.rpc('increment_view_count', {
    article_id: articleId
  })
  if (error) console.error('View count error:', error)
}