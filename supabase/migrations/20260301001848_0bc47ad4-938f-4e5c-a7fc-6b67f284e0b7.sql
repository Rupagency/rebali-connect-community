
-- Fix Security Definer View: use INVOKER so RLS of the querying user applies
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  display_name,
  avatar_url,
  is_verified_seller,
  trust_score,
  risk_level,
  user_type,
  created_at,
  phone_verified
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- We need anon/authenticated to be able to read profiles via the view
-- Since we removed the public SELECT policy, we need a policy that allows
-- reading basic profile info for everyone (the view filters columns)
-- Add a permissive policy for authenticated users to see other profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Anon users can also view profiles (needed for public listing pages)
CREATE POLICY "Anon can view profiles"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);
