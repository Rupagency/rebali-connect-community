
-- Email-based 2FA preferences
CREATE TABLE public.email_mfa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_mfa ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own email MFA settings
CREATE POLICY "Users can read own email_mfa"
  ON public.email_mfa FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email_mfa"
  ON public.email_mfa FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email_mfa"
  ON public.email_mfa FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email_mfa"
  ON public.email_mfa FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Email MFA OTP codes (server-side only, no client RLS needed)
CREATE TABLE public.email_mfa_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_mfa_codes ENABLE ROW LEVEL SECURITY;

-- No client-side access - only service role accesses this table
