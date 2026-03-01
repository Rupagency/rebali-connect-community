
-- ===========================================
-- 1. Server-side content validation trigger on messages
-- ===========================================

CREATE OR REPLACE FUNCTION public.validate_content(content text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for URLs
  IF content ~* 'https?://[^\s]+' THEN RETURN false; END IF;
  -- Check for messaging app domains
  IF content ~* '(wa\.me|t\.me|whatsapp\.com|telegram|signal\.me|bit\.ly|tinyurl\.com)' THEN RETURN false; END IF;
  -- Check for phone numbers (various formats)
  IF content ~ '\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}' THEN RETURN false; END IF;
  -- Check for raw digit sequences (8+ digits = phone-like)
  IF content ~ '\b\d{8,15}\b' THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip system messages
  IF NEW.from_role = 'system' THEN RETURN NEW; END IF;
  
  IF NOT public.validate_content(NEW.content) THEN
    RAISE EXCEPTION 'Message contains prohibited content (URLs, phone numbers, or external messaging links)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_message_content
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_content();

-- ===========================================
-- 2. Restrict whatsapp_click_logs INSERT to authenticated users
-- ===========================================
DROP POLICY IF EXISTS "Anyone can insert click logs" ON public.whatsapp_click_logs;
CREATE POLICY "Authenticated users can insert click logs"
  ON public.whatsapp_click_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===========================================
-- 3. Restrict search_logs INSERT to authenticated users
-- ===========================================
DROP POLICY IF EXISTS "Anyone can log searches" ON public.search_logs;
CREATE POLICY "Authenticated users can log searches"
  ON public.search_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
