
DROP POLICY IF EXISTS "Everyone can see active boosts" ON public.user_addons;

CREATE POLICY "Everyone can see active boosts and seller status"
  ON public.user_addons
  FOR SELECT
  USING (
    active = true
    AND addon_type IN ('boost', 'boost_premium', 'active_seller', 'expert_seller')
  );
