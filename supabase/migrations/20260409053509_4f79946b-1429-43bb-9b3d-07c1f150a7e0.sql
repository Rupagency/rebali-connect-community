CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app config"
ON public.app_config FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Only admins can modify app config"
ON public.app_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_config (key, value) VALUES
  ('min_version_android', '1.0.0'),
  ('min_version_ios', '1.0.0'),
  ('store_url_android', 'https://play.google.com/store/apps/details?id=com.rebali.community'),
  ('store_url_ios', 'https://apps.apple.com/app/re-bali/id6745498498');