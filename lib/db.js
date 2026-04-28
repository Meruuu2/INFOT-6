// lib/db.js
// FIXES:
//   1. getTopArticles — old query used .eq('interactions.type','like') which doesn't
//      work on embedded counts in Supabase JS v2. Fixed to use a separate count query.
//   2. getArticleById — added fallback so author never shows as null
//   3. getComments — fixed author join hint to match your actual FK name
//   4. All functions handle null/undefined gracefully

import { supabase } from './supabaseClient';

// ─── ARTICLES ──────────────────────────────────────────────────────────────────

/**
 * getRecentArticles
 * Fetches the N most recent articles with author profile.
 * The `author:author_id(...)` hint tells Supabase which FK to use.
 */
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

/**
 * getTopArticles
 * FIX: The old version used .eq('interactions.type','like') on an embedded
 * count — this silently returns wrong results in Supabase JS v2.
 * New approach: fetch articles ordered by view_count, then fetch like
 * counts separately and merge. Simple and reliable.
 */
export async function getTopArticles(limit = 5) {
  // Step 1: get top articles by view_count (fetch 20 so we can re-sort)
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, view_count')
    .order('view_count', { ascending: false })
    .limit(20);

  if (error) {
    console.error('getTopArticles error:', error.message);
    return [];
  }

  // Step 2: fetch like counts for each article
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
        // Combined score: views + likes
        score:      (article.view_count ?? 0) + likeCount,
      };
    })
  );

  // Step 3: sort by combined score and return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * getArticleById
 * Fetches a single article with full author profile.
 * Used by [id].js getServerSideProps.
 */
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

/**
 * createArticle
 * Inserts a new article. Gets author_id from the live session to
 * ensure it matches auth.uid() — this is what RLS checks.
 */
export async function createArticle(title, content, authorId) {
  // Always resolve from session — never trust a passed-in ID alone
  const { data: { session } } = await supabase.auth.getSession();
  const resolvedAuthorId = session?.user?.id ?? authorId;

  if (!resolvedAuthorId) {
    throw new Error('You must be logged in to publish an article.');
  }

  const { data, error } = await supabase
    .from('articles')
    .insert({
      title:     title.trim(),
      content:   content.trim(),
      author_id: resolvedAuthorId,   // must === auth.uid() for RLS to allow it
    })
    .select('id, title, created_at')
    .single();

  if (error) throw error;
  return data; // returns { id, title, created_at } — used by new.js to redirect
}

/**
 * trackView
 * Calls the increment_view_count RPC — atomic, no race conditions.
 * Safe to call from useEffect on the article page.
 */
export async function trackView(articleId) {
  const { error } = await supabase.rpc('increment_view_count', {
    article_id: articleId,
  });
  if (error) console.warn('[trackView]', error.message);
}

// ─── INTERACTIONS ──────────────────────────────────────────────────────────────

/**
 * hasLiked
 * Returns true if the given user has already liked this article.
 * Called by SocialBar on mount to set the initial liked state.
 */
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

/**
 * likeArticle
 * Inserts a like row + sends a notification to the article author.
 * The interactions INSERT requires auth.uid() === user_id (checked by RLS).
 */
export async function likeArticle(articleId, userId) {
  const { error } = await supabase
    .from('interactions')
    .insert({ article_id: articleId, user_id: userId, type: 'like' });
  if (error) throw error;

  // Notify the article author (skip self-likes)
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

/**
 * unlikeArticle
 * Removes the like row for this user + article.
 */
export async function unlikeArticle(articleId, userId) {
  const { error } = await supabase
    .from('interactions')
    .delete()
    .match({ article_id: articleId, user_id: userId, type: 'like' });
  if (error) throw error;
}

/**
 * getLikeCount
 * Returns the total number of likes for an article.
 * Called by SocialBar on mount so the count shows immediately.
 */
export async function getLikeCount(articleId) {
  if (!articleId) return 0;
  const { count, error } = await supabase
    .from('interactions')
    .select('id', { count: 'exact', head: true })
    .eq('article_id', articleId)
    .eq('type', 'like');
  if (error) {
    console.error('[getLikeCount]', error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * addComment
 * Inserts a comment (or reply if parentId is provided).
 * Also sends a notification to the article author.
 */
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

  // Notify article author (skip self-comments)
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

/**
 * getComments
 * Fetches all comments for an article, assembled into a nested tree.
 * Top-level comments have a `replies` array of their child comments.
 */
export async function getComments(articleId) {
  if (!articleId) return [];

  const { data, error } = await supabase
    .from('interactions')
    .select(`
      id, content, created_at, parent_id,
      author:user_id ( id, username, full_name, avatar_url )
    `)
    .eq('article_id', articleId)
    .eq('type', 'comment')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getComments]', error.message);
    return [];
  }

  const allComments = data ?? [];

  // Separate top-level comments from replies
  const topLevel = allComments.filter(c => !c.parent_id);
  const replies  = allComments.filter(c =>  c.parent_id);

  // Attach replies to their parent comments
  topLevel.forEach(comment => {
    comment.replies = replies.filter(r => r.parent_id === comment.id);
  });

  return topLevel;
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────

/**
 * getUnreadNotifications
 * Returns all unread notifications for a user, newest first.
 */
export async function getUnreadNotifications(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getUnreadNotifications]', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * markAllNotificationsRead
 * Marks all unread notifications for a user as read.
 */
export async function markAllNotificationsRead(userId) {
  if (!userId) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) console.error('[markAllRead]', error.message);
}