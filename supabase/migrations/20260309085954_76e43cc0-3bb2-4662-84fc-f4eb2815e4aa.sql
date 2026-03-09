
-- Add monthly boost tracking to pro_subscriptions
ALTER TABLE public.pro_subscriptions 
  ADD COLUMN IF NOT EXISTS monthly_boosts_included integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_boosts_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_boosts_reset_at timestamptz;

-- Create pro_boost_purchases table for purchased boost packs
CREATE TABLE IF NOT EXISTS public.pro_boost_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  boosts_remaining integer NOT NULL DEFAULT 0,
  amount_paid integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pro_boost_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own boost purchases" 
  ON public.pro_boost_purchases FOR SELECT 
  USING (user_id = auth.uid());

-- Update check_listing_limit to handle pro tiers
CREATE OR REPLACE FUNCTION public.check_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  active_count INTEGER;
  account_age INTERVAL;
  max_listings INTEGER;
  extra_slots INTEGER;
  is_pro BOOLEAN;
  custom_limit INTEGER;
  v_user_type text;
  v_plan_type text;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT (now() - p.created_at), p.listing_limit_override, p.user_type::text
    INTO account_age, custom_limit, v_user_type
    FROM public.profiles p WHERE p.id = NEW.seller_id;
    
    -- Check for custom admin override first
    IF custom_limit IS NOT NULL THEN
      max_listings := custom_limit;
    ELSIF v_user_type = 'business' THEN
      -- Business (Pro) users: check subscription tier
      SELECT ps.plan_type INTO v_plan_type
      FROM public.pro_subscriptions ps
      WHERE ps.user_id = NEW.seller_id
        AND ps.status = 'active'
        AND ps.expires_at > now()
      ORDER BY ps.created_at DESC LIMIT 1;
      
      IF v_plan_type = 'agence' THEN
        max_listings := 9999;
      ELSIF v_plan_type = 'vendeur_pro' THEN
        max_listings := 20;
      ELSE
        -- Free Pro
        max_listings := 5;
      END IF;
    ELSE
      -- Private users: existing logic
      IF account_age < INTERVAL '7 days' THEN
        max_listings := 3;
      ELSE
        max_listings := 5;
      END IF;
    END IF;
    
    -- Add extra slots from active extra_listings addons (private users only)
    IF v_user_type != 'business' AND custom_limit IS NULL THEN
      SELECT COALESCE(SUM(ua.extra_slots), 0) INTO extra_slots
      FROM public.user_addons ua
      WHERE ua.user_id = NEW.seller_id
        AND ua.addon_type = 'extra_listings'
        AND ua.active = true
        AND (ua.expires_at IS NULL OR ua.expires_at > now());
      
      max_listings := max_listings + extra_slots;
      
      -- Check old-style pro subscription for private users
      SELECT EXISTS(
        SELECT 1 FROM public.pro_subscriptions
        WHERE user_id = NEW.seller_id
          AND status = 'active'
          AND expires_at > now()
      ) INTO is_pro;
      
      IF is_pro THEN
        max_listings := 50;
      END IF;
    END IF;
    
    SELECT COUNT(*) INTO active_count
    FROM public.listings
    WHERE seller_id = NEW.seller_id AND status = 'active' 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF active_count >= max_listings THEN
      RAISE EXCEPTION 'Maximum % active listings allowed', max_listings;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
