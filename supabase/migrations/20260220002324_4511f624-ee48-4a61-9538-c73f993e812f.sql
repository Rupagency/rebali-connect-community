
-- Create reviews table for buyer ratings
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(reviewer_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Reviews are viewable by everyone"
ON public.reviews FOR SELECT
USING (true);

-- Authenticated users can create reviews (not for themselves)
CREATE POLICY "Users can create reviews for others"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() = reviewer_id AND auth.uid() != seller_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON public.reviews FOR DELETE
USING (auth.uid() = reviewer_id);
