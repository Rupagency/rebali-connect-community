
CREATE OR REPLACE FUNCTION public.check_listing_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.validate_content(NEW.title_original) THEN
    RAISE EXCEPTION 'Title contains prohibited content (URLs, phone numbers, or external messaging links)';
  END IF;
  IF NOT public.validate_content(NEW.description_original) THEN
    RAISE EXCEPTION 'Description contains prohibited content (URLs, phone numbers, or external messaging links)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_listing_content
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_listing_content();
