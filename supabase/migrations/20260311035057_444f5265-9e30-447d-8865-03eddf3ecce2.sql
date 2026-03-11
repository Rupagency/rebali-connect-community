
-- Fix: Remove overly permissive public INSERT policy on risk_events
DROP POLICY IF EXISTS "Service role can insert risk events" ON public.risk_events;

-- Replace with authenticated-only policy tied to auth.uid()
CREATE POLICY "Authenticated users can create own risk events" ON public.risk_events
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
