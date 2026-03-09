-- Include both old and new types to allow transition
ALTER TABLE public.user_addons 
DROP CONSTRAINT IF EXISTS user_addons_addon_type_check;

ALTER TABLE public.user_addons 
ADD CONSTRAINT user_addons_addon_type_check 
CHECK (addon_type IN ('boost', 'boost_premium', 'vip', 'protection', 'active_seller', 'extra_listings', 'expert_seller'));