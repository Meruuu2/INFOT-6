import { supabase } from './supabaseClient';

// ─── ARTICLES ─────────────────────────────────────────────

// Recent articles for the main feed
export async function getRecentArticles(limit = 10) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, title, created_at, view_count,
      author:author_id ( id, username, full_name, avatar_url )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// Top 5 by view_count — for the sidebar
export async function getTopArticles(limit = 5) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, view_count')
    .order('view_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// Single article with full author profile
export async function getArticleById(id) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, title, content, view_count, created_at, updated_at,
      author:author_id ( id, username, full_name, avatar_url )
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// Atomic view count increment via RPC (prevents race conditions)
export async function trackView(articleId) {
  const { error } = await supabase.rpc('increment_view_count', {
    article_id: articleId,
  });
  if (error) console.warn('View tracking error:', error.message);
}

// ─── INTERACTIONS ──────────────────────────────────────────

// Check if user has liked an article
export async function hasLiked(articleId, userId) {
  const { data } = await supabase
    .from('interactions')
    .select('id')
    .eq('article_id', articleId)
    .eq('user_id', userId)
    .eq('type', 'like')
    .maybeSingle();
  return !!data;
}

// Like an article + notify the author
export async function likeArticle(articleId, userId) {
  const { error } = await supabase
    .from('interactions')
    .insert({ article_id: articleId, user_id: userId, type: 'like' });
  if (error) throw error;

  // Create notification for the article author
  const { data: article } = await supabase
    .from('articles')
    .select('author_id, title')
    .eq('id', articleId)
    .single();

  if (article && article.author_id !== userId) {
    await supabase.from('notifications').insert({
      recipient_id: article.author_id,
      actor_id:     userId,
      type:         'like',
      payload:      { article_id: articleId, article_title: article.title },
    });
  }
}

// Unlike an article
export async function unlikeArticle(articleId, userId) {
  const { error } = await supabase
    .from('interactions')
    .delete()
    .match({ article_id: articleId, user_id: userId, type: 'like' });
  if (error) throw error;
}

// Get like count for an article
export async function getLikeCount(articleId) {
  const { count } = await supabase
    .from('interactions')
    .select('id', { count: 'exact', head: true })
    .eq('article_id', articleId)
    .eq('type', 'like');
  return count ?? 0;
}

// Add a comment (parentId = null for top-level, uuid for reply)
export async function addComment(articleId, userId, content, parentId = null) {
  const { data, error } = await supabase
    .from('interactions')
    .insert({
      article_id: articleId,
      user_id:    userId,
      type:       'comment',
      content,
      parent_id:  parentId,
    })
    .select()
    .single();
  if (error) throw error;

  // Notify the article author about the new comment
  const { data: article } = await supabase
    .from('articles')
    .select('author_id, title')
    .eq('id', articleId)
    .single();

  if (article && article.author_id !== userId) {
    await supabase.from('notifications').insert({
      recipient_id: article.author_id,
      actor_id:     userId,
      type:         'comment',
      payload: {
        article_id:      articleId,
        article_title:   article.title,
        comment_preview: content.slice(0, 80),
      },
    });
  }
  return data;
}

// Fetch comments for an article, nested into threads
export async function getComments(articleId) {
  const { data, error } = await supabase
    .from('interactions')
    .select(`
      id, content, created_at, parent_id,
      author:user_id ( id, username, full_name, avatar_url )
    `)
    .eq('article_id', articleId)
    .eq('type', 'comment')
    .order('created_at', { ascending: true });
  if (error) throw error;

  // Build nested tree client-side
  const top = data.filter(c => !c.parent_id);
  top.forEach(c => { c.replies = data.filter(r => r.parent_id === c.id); });
  return top;
}

// ─── NOTIFICATIONS ─────────────────────────────────────────

export async function getUnreadNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}