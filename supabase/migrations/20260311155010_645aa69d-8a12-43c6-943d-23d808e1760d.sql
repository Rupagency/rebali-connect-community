
-- Fix 1: Recreate public_profiles view WITHOUT sensitive fields (risk_level, trust_score)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS SELECT
  id,
  display_name,
  avatar_url,
  is_verified_seller,
  phone_verified,
  user_type,
  created_at
FROM public.profiles;

-- Fix 2: Remove the INSERT policy that lets users self-insert risk events
DROP POLICY IF EXISTS "Authenticated users can create own risk events" ON public.risk_events;
