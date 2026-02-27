
-- Autocomplete suggestions: returns distinct titles matching a prefix/partial term
-- Uses the existing fts_vector for speed, with ILIKE fallback for partial words
CREATE OR REPLACE FUNCTION public.search_suggestions(search_term text, max_results integer DEFAULT 8)
RETURNS TABLE(title text, listing_id uuid, category text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Match original titles
  SELECT DISTINCT ON (lower(l.title_original))
    l.title_original as title,
    l.id as listing_id,
    l.category
  FROM public.listings l
  WHERE l.status = 'active'
    AND l.title_original ILIKE '%' || search_term || '%'
  ORDER BY lower(l.title_original), l.created_at DESC
  LIMIT max_results
$$;
