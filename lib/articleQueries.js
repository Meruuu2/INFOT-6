// lib/articleQueries.js
import { supabase } from './supabaseClient';

// Recent Articles — for homepage feed
export async function getRecentArticles(limit = 10) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      created_at,
      view_count,
      author:author_id (
        id,
        email,
        raw_user_meta_data->>full_name as full_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Top 5 Articles — ordered by popularity
export async function getTopArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, view_count')
    .order('view_count', { ascending: false })
    .limit(5);

  if (error) throw error;
  return data;
}