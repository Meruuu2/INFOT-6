// lib/commentActions.js
import { supabase } from './supabaseClient';

// parentId = null for top-level, or a comment uuid for a reply
export async function addComment(articleId, authorId, content, parentId = null) {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      article_id: articleId,
      author_id:  authorId,
      content,
      parent_id:  parentId, // null → top-level comment
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fetch all comments for an article, ordered oldest-first
export async function getComments(articleId) {
  const { data, error } = await supabase
    .from('comments')
    .select('id, content, created_at, parent_id, author_id')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Nest replies client-side for rendering
  const topLevel = data.filter(c => !c.parent_id);
  topLevel.forEach(c => {
    c.replies = data.filter(r => r.parent_id === c.id);
  });
  return topLevel;
}