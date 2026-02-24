-- Update the public visibility policy for boosts to also include boost_premium
DROP POLICY IF EXISTS "Everyone can see active boosts" ON public.user_addons;
CREATE POLICY "Everyone can see active boosts" ON public.user_addons
  FOR SELECT
  USING (addon_type IN ('boost', 'boost_premium') AND active = true);