DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
  SELECT id, display_name, avatar_url, is_verified_seller, phone_verified, user_type, created_at
  FROM public.profiles;