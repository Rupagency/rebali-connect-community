
-- Business Pages table for Agence tier
CREATE TABLE public.business_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  logo_url text,
  business_name text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_pages ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD their own page
CREATE POLICY "Users can view their own business page"
  ON public.business_pages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own business page"
  ON public.business_pages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own business page"
  ON public.business_pages FOR UPDATE
  USING (user_id = auth.uid());

-- Everyone can view business pages (public profiles)
CREATE POLICY "Everyone can view business pages"
  ON public.business_pages FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_business_pages_updated_at
  BEFORE UPDATE ON public.business_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
