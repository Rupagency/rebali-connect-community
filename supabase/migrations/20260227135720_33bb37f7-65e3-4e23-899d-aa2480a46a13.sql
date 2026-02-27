
-- Add GIN indexes for full-text search on listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fts_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title_original, '') || ' ' || coalesce(description_original, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_listings_fts ON public.listings USING GIN (fts_vector);

-- Also add a GIN index on listing_translations for multilingual search
ALTER TABLE public.listing_translations ADD COLUMN IF NOT EXISTS fts_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_listing_translations_fts ON public.listing_translations USING GIN (fts_vector);

-- Optimized search function using tsvector instead of ILIKE
CREATE OR REPLACE FUNCTION public.search_listings(search_term text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT l.id FROM public.listings l
  WHERE l.status = 'active'
    AND l.fts_vector @@ plainto_tsquery('simple', search_term)
  UNION
  SELECT DISTINCT lt.listing_id FROM public.listing_translations lt
  JOIN public.listings l ON l.id = lt.listing_id
  WHERE l.status = 'active'
    AND lt.fts_vector @@ plainto_tsquery('simple', search_term)
$$;
