
-- FIX 1: profiles - lock privileged fields on self-update
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_banned IS NOT DISTINCT FROM (SELECT p.is_banned FROM public.profiles p WHERE p.id = profiles.id)
  AND is_verified_seller IS NOT DISTINCT FROM (SELECT p.is_verified_seller FROM public.profiles p WHERE p.id = profiles.id)
  AND trust_score IS NOT DISTINCT FROM (SELECT p.trust_score FROM public.profiles p WHERE p.id = profiles.id)
  AND risk_level IS NOT DISTINCT FROM (SELECT p.risk_level FROM public.profiles p WHERE p.id = profiles.id)
  AND listing_limit_override IS NOT DISTINCT FROM (SELECT p.listing_limit_override FROM public.profiles p WHERE p.id = profiles.id)
  AND phone_verified IS NOT DISTINCT FROM (SELECT p.phone_verified FROM public.profiles p WHERE p.id = profiles.id)
  AND referral_code IS NOT DISTINCT FROM (SELECT p.referral_code FROM public.profiles p WHERE p.id = profiles.id)
  AND referred_by IS NOT DISTINCT FROM (SELECT p.referred_by FROM public.profiles p WHERE p.id = profiles.id)
);
