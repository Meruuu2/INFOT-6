import { supabase } from './supabaseClient';

// ─── ARTICLES ─────────────────────────────────────────────────────────────────

// Recent articles for the main feed (client-safe, works with anon key + RLS)
export async function getRecentArticles(limit = 10) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, title, created_at, view_count,
      author:author_id ( id, username, full_name, avatar_url )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getRecentArticles error:', error.message);
    return [];
  }
  return data ?? [];
}

// Top 5 by views + likes combined — for the sidebar
// Fetches articles with their like count, then sorts by (view_count + like_count) descending
// Update this specific function in your db.js
export async function getTopArticles(limit = 5) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      view_count,
      author:author_id ( username ),
      likes:interactions(count)
    `)
    .eq('interactions.type', 'like');

  if (error) {
    console.error('getTopArticles error:', error.message);
    return [];
  }

  // Calculate popularity and sort
  return data
    .map(art => ({
      ...art,
      like_count: art.likes?.[0]?.count || 0,
      score: (art.view_count || 0) + (art.likes?.[0]?.count || 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
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

// Create a new article
// Gets session UUID directly from Supabase Auth so author_id always matches auth.uid() — fixes RLS
export async function createArticle(title, content, authorId) {
  const { data: { session } } = await supabase.auth.getSession();
  const resolvedAuthorId = session?.user?.id ?? authorId;

  if (!resolvedAuthorId) {
    throw new Error('You must be logged in to publish an article.');
  }

  const { data, error } = await supabase
    .from('articles')
    .insert({ title, content, author_id: resolvedAuthorId })
    .select()
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

// ─── INTERACTIONS ──────────────────────────────────────────────────────────────

// Check if a user has liked an article
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

// Like an article + create notification for the author
export async function likeArticle(articleId, userId) {
  const { error } = await supabase
    .from('interactions')
    .insert({ article_id: articleId, user_id: userId, type: 'like' });
  if (error) throw error;

  // Fetch article author to send notification
  const { data: article } = await supabase
    .from('articles')
    .select('author_id, title')
    .eq('id', articleId)
    .single();

  // Don't notify yourself
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

// Get total like count for an article
export async function getLikeCount(articleId) {
  const { count } = await supabase
    .from('interactions')
    .select('id', { count: 'exact', head: true })
    .eq('article_id', articleId)
    .eq('type', 'like');
  return count ?? 0;
}

// Add a comment (parentId = null → top-level; uuid → reply to a comment)
// ─── COMMENT SYSTEM LOGIC ───

export async function addComment(articleId, userId, content, parentId = null) {
  // Ensure we are sending the right structure to the DB
  const { data, error } = await supabase
    .from('interactions')
    .insert({
      article_id: articleId,
      user_id:    userId,
      type:       'comment',
      content:    content,
      parent_id:  parentId, 
    })
    .select(`
      id, 
      content, 
      created_at, 
      parent_id,
      author:user_id ( id, username, full_name, avatar_url )
    `)
    .single();

  if (error) {
    console.error("Database Error:", error.message);
    throw error;
  }

  // Handle Notification for the Article Owner
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
        comment_preview: content.substring(0, 50),
      },
    });
  }
  
  return data;
}

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

  // Organizes replies directly under the main comments
  const top = data.filter(c => !c.parent_id);
  top.forEach(c => { 
    c.replies = data.filter(r => r.parent_id === c.id); 
  });
  return top;
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export async function getUnreadNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getUnreadNotifications error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) console.error('markAllRead error:', error.message);
}