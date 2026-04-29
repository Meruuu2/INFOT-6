// lib/db.js
import { supabase } from './supabaseClient';

// ─── HELPER ─────────────────────────────────────────────────────────────────
// Fetches profiles by IDs and returns a lookup map { id: profile }.
// Used everywhere instead of FK join syntax (author:author_id / author:user_id)
// which breaks when Supabase schema cache doesn't recognise the FK.
async function fetchProfiles(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', unique);

  if (error) { console.error('[fetchProfiles]', error.message); return {}; }
  return Object.fromEntries((data ?? []).map(p => [p.id, p]));
}

// ─── ARTICLES ────────────────────────────────────────────────────────────────

export async function getRecentArticles(limit = 10) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, created_at, view_count, author_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('getRecentArticles error:', error.message); return []; }

  const articles   = data ?? [];
  const profileMap = await fetchProfiles(articles.map(a => a.author_id));
  return articles.map(a => ({ ...a, author: profileMap[a.author_id] ?? null }));
}

export async function getTopArticles(limit = 5) {
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, view_count')
    .order('view_count', { ascending: false })
    .limit(20);

  if (error) { console.error('getTopArticles error:', error.message); return []; }

  const scored = await Promise.all(
    (articles ?? []).map(async (article) => {
      const { count } = await supabase
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', article.id)
        .eq('type', 'like');

      const likeCount = count ?? 0;
      return {
        id:         article.id,
        title:      article.title,
        view_count: article.view_count ?? 0,
        like_count: likeCount,
        score:      (article.view_count ?? 0) + likeCount,
      };
    })
  );

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export async function getArticleById(id) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, content, view_count, created_at, updated_at, author_id')
    .eq('id', id)
    .single();

  if (error) { console.error('getArticleById error:', error.message); return null; }

  const profileMap = await fetchProfiles([data.author_id]);
  return { ...data, author: profileMap[data.author_id] ?? null };
}

export async function createArticle(title, content, authorId) {
  const { data: { session } } = await supabase.auth.getSession();
  const resolvedAuthorId = session?.user?.id ?? authorId;

  if (!resolvedAuthorId) throw new Error('You must be logged in to publish an article.');

  const { data, error } = await supabase
    .from('articles')
    .insert({ title: title.trim(), content: content.trim(), author_id: resolvedAuthorId })
    .select('id, title, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function trackView(articleId) {
  const { error } = await supabase.rpc('increment_view_count', { article_id: articleId });
  if (error) console.warn('[trackView]', error.message);
}



// ─── INTERACTIONS ────────────────────────────────────────────────────────────

export async function hasLiked(articleId, userId) {
  if (!articleId || !userId) return false;
  const { data } = await supabase
    .from('interactions')
    .select('id')
    .eq('article_id', articleId)
    .eq('user_id', userId)
    .eq('type', 'like')
    .maybeSingle();
  return !!data;
}

export async function likeArticle(articleId, userId) {
  const { error } = await supabase
    .from('interactions')
    .insert({ article_id: articleId, user_id: userId, type: 'like' });
  if (error) throw error;

  const { data: article } = await supabase
    .from('articles').select('author_id, title').eq('id', articleId).single();

  if (article && article.author_id !== userId) {
    await supabase.from('notifications').insert({
      recipient_id: article.author_id,
      actor_id:     userId,
      type:         'like',
      payload:      { article_id: articleId, article_title: article.title },
    });
  }
}

export async function unlikeArticle(articleId, userId) {
  const { error } = await supabase
    .from('interactions')
    .delete()
    .match({ article_id: articleId, user_id: userId, type: 'like' });
  if (error) throw error;
}

export async function getLikeCount(articleId) {
  if (!articleId) return 0;
  const { count, error } = await supabase
    .from('interactions')
    .select('id', { count: 'exact', head: true })
    .eq('article_id', articleId)
    .eq('type', 'like');
  if (error) { console.error('[getLikeCount]', error.message); return 0; }
  return count ?? 0;
}

export async function addComment(articleId, userId, content, parentId = null) {
  const { data, error } = await supabase
    .from('interactions')
    .insert({
      article_id: articleId,
      user_id:    userId,
      type:       'comment',
      content:    content.trim(),
      parent_id:  parentId ?? null,
    })
    .select('id, content, created_at, parent_id')
    .single();

  if (error) throw error;

  const { data: article } = await supabase
    .from('articles').select('author_id, title').eq('id', articleId).single();

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

export async function getComments(articleId) {
  if (!articleId) return [];

  const { data, error } = await supabase
    .from('interactions')
    .select('id, content, created_at, parent_id, user_id')
    .eq('article_id', articleId)
    .eq('type', 'comment')
    .order('created_at', { ascending: true });

  if (error) { console.error('[getComments]', error.message); return []; }

  const allComments = data ?? [];
  const profileMap  = await fetchProfiles(allComments.map(c => c.user_id));
  const withAuthors = allComments.map(c => ({ ...c, author: profileMap[c.user_id] ?? null }));

  const topLevel = withAuthors.filter(c => !c.parent_id);
  const replies  = withAuthors.filter(c =>  c.parent_id);
  topLevel.forEach(comment => {
    comment.replies = replies.filter(r => r.parent_id === comment.id);
  });
  return topLevel;
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export async function getUnreadNotifications(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) { console.error('[getUnreadNotifications]', error.message); return []; }
  return data ?? [];
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) console.error('[markAllRead]', error.message);
}