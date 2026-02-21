
-- =============================================
-- PHASE 1-4: Complete Security & Anti-Scam Schema
-- =============================================

-- 1. Create risk_level enum
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high');

-- 2. Create verification_status enum
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- 3. Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS risk_level public.risk_level NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS is_verified_seller boolean NOT NULL DEFAULT false;

-- 4. Table: user_devices
CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  ip_address text,
  user_agent text,
  os text,
  browser text,
  is_vpn boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices" ON public.user_devices
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert devices" ON public.user_devices
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_device_hash ON public.user_devices(device_hash);
CREATE INDEX idx_user_devices_ip_address ON public.user_devices(ip_address);

-- 5. Table: phone_verifications
CREATE TABLE public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  otp_hash text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verifications" ON public.phone_verifications
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage verifications" ON public.phone_verifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update verifications" ON public.phone_verifications
  FOR UPDATE USING (true);

CREATE INDEX idx_phone_verifications_user_id ON public.phone_verifications(user_id);
CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications(phone_number);

-- 6. Table: banned_devices
CREATE TABLE public.banned_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_hash text,
  phone_number text,
  reason text NOT NULL,
  banned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banned_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view banned devices" ON public.banned_devices
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert banned devices" ON public.banned_devices
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete banned devices" ON public.banned_devices
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can read banned devices" ON public.banned_devices
  FOR SELECT USING (true);

CREATE INDEX idx_banned_devices_hash ON public.banned_devices(device_hash);
CREATE INDEX idx_banned_devices_phone ON public.banned_devices(phone_number);

-- 7. Table: whatsapp_click_logs
CREATE TABLE public.whatsapp_click_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_click_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert click logs" ON public.whatsapp_click_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view click logs" ON public.whatsapp_click_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_wa_clicks_listing ON public.whatsapp_click_logs(listing_id);

-- 8. Table: trust_scores
CREATE TABLE public.trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  risk_level public.risk_level NOT NULL DEFAULT 'low',
  last_calculated timestamptz NOT NULL DEFAULT now(),
  factors jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trust score" ON public.trust_scores
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage trust scores" ON public.trust_scores
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update trust scores" ON public.trust_scores
  FOR UPDATE USING (true);

-- 9. Table: id_verifications
CREATE TABLE public.id_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('ktp', 'passport')),
  document_path text NOT NULL,
  selfie_path text NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.id_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verifications" ON public.id_verifications
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can submit verification" ON public.id_verifications
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update verifications" ON public.id_verifications
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_id_verifications_user ON public.id_verifications(user_id);
CREATE INDEX idx_id_verifications_status ON public.id_verifications(status);

-- 10. Update check_listing_limit to enforce 3 for new accounts
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
BEGIN
  IF NEW.status = 'active' THEN
    -- Get account age
    SELECT (now() - p.created_at) INTO account_age
    FROM public.profiles p WHERE p.id = NEW.seller_id;
    
    -- New accounts (< 7 days) get max 3, others get 5
    IF account_age < INTERVAL '7 days' THEN
      max_listings := 3;
    ELSE
      max_listings := 5;
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

-- 11. Auto-archive on 3+ scam reports in 24h
CREATE OR REPLACE FUNCTION public.auto_moderate_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  scam_count INTEGER;
  listing_seller_id uuid;
BEGIN
  IF NEW.reason = 'scam' THEN
    SELECT COUNT(*) INTO scam_count
    FROM public.reports
    WHERE listing_id = NEW.listing_id
      AND reason = 'scam'
      AND created_at > now() - INTERVAL '24 hours';
    
    IF scam_count >= 3 THEN
      -- Archive the listing
      UPDATE public.listings SET status = 'archived' WHERE id = NEW.listing_id;
      
      -- Get seller and set risk to high
      SELECT seller_id INTO listing_seller_id FROM public.listings WHERE id = NEW.listing_id;
      UPDATE public.profiles SET risk_level = 'high' WHERE id = listing_seller_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_scam_report
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_moderate_reports();

-- 12. Storage bucket for ID verifications (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('id-verifications', 'id-verifications', false);

CREATE POLICY "Users can upload their own ID docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'id-verifications' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view ID docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'id-verifications' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own ID docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'id-verifications' AND auth.uid()::text = (storage.foldername(name))[1]);
