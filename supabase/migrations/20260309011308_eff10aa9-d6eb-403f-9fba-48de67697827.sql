
-- Function to auto-trigger listing translation via pg_net
CREATE OR REPLACE FUNCTION public.trigger_translate_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM net.http_post(
      url := 'https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/translate-listing',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('listing_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: fires after INSERT or when title/description changes on UPDATE
CREATE TRIGGER auto_translate_listing
AFTER INSERT OR UPDATE OF title_original, description_original
ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_translate_listing();
