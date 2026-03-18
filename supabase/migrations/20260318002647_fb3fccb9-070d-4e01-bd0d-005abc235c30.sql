-- Fix finding #1: Add WITH CHECK on business_pages UPDATE to lock user_id
DROP POLICY IF EXISTS "Users can update their own business page" ON public.business_pages;

CREATE POLICY "Users can update their own business page"
ON public.business_pages
FOR UPDATE
TO public
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  -- Prevent changing user_id (ownership transfer)
  AND NOT (user_id IS DISTINCT FROM (SELECT bp.user_id FROM business_pages bp WHERE bp.id = business_pages.id))
);