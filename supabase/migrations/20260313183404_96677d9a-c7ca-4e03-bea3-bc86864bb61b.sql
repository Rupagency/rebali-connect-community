CREATE OR REPLACE FUNCTION public.validate_content(content text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cleaned text;
BEGIN
  -- Remove Indonesian-format prices (e.g. 28.000.000, 150.000) before phone checks
  cleaned := regexp_replace(content, '\m\d{1,3}(\.\d{3}){1,4}\M', '', 'g');

  -- Check for URLs
  IF content ~* 'https?://[^\s]+' THEN RETURN false; END IF;
  -- Check for messaging app domains
  IF content ~* '(wa\.me|t\.me|whatsapp\.com|telegram|signal\.me|bit\.ly|tinyurl\.com)' THEN RETURN false; END IF;
  -- Check for phone numbers (various formats) on cleaned text
  IF cleaned ~ '\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}' THEN RETURN false; END IF;
  -- Check for raw digit sequences (8+ digits = phone-like) on cleaned text
  IF cleaned ~ '\b\d{8,15}\b' THEN RETURN false; END IF;
  RETURN true;
END;
$function$;