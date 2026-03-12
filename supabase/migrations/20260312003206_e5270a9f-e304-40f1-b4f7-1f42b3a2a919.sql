
-- Step 1: Drop the overly permissive SELECT policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anon can view profiles" ON public.profiles;

-- Step 2: The remaining SELECT policies are already correct:
-- "Users can view their own full profile" → USING ((auth.uid() = id) OR has_role(auth.uid(), 'admin'))
-- This allows owner + admin access only.

-- Step 3: Grant SELECT on public_profiles view to anon and authenticated
-- (the view already excludes phone, whatsapp, risk_level, trust_score)
GRANT SELECT ON public.public_profiles TO anon, authenticated;
