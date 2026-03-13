
-- Analytics events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert events" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_analytics_event_type ON public.analytics_events(event_type, created_at);

-- Waitlist table for Coming Soon page
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist" ON public.waitlist
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view waitlist" ON public.waitlist
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
