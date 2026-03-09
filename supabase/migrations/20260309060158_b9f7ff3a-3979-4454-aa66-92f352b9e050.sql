
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT id, display_name, avatar_url, is_verified_seller, trust_score, risk_level, user_type, created_at, phone_verified
FROM profiles;

-- Grant access
GRANT SELECT ON public.public_profiles TO anon, authenticated;
