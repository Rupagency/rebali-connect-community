
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
TO public
USING (auth.uid() = reviewer_id)
WITH CHECK (
  auth.uid() = reviewer_id
  AND reviewed_user_id IS NOT DISTINCT FROM (SELECT r.reviewed_user_id FROM public.reviews r WHERE r.id = reviews.id)
  AND seller_id IS NOT DISTINCT FROM (SELECT r.seller_id FROM public.reviews r WHERE r.id = reviews.id)
  AND conversation_id IS NOT DISTINCT FROM (SELECT r.conversation_id FROM public.reviews r WHERE r.id = reviews.id)
  AND listing_id IS NOT DISTINCT FROM (SELECT r.listing_id FROM public.reviews r WHERE r.id = reviews.id)
  AND is_verified_purchase IS NOT DISTINCT FROM (SELECT r.is_verified_purchase FROM public.reviews r WHERE r.id = reviews.id)
);
