
-- Function to notify seller when their listing gets favorited
CREATE OR REPLACE FUNCTION public.notify_favorite_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/notify-favorite',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1),
        current_setting('app.settings.service_role_key', true)
      )
    ),
    body := jsonb_build_object(
      'listing_id', NEW.listing_id,
      'user_id', NEW.user_id
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger on favorites insert
CREATE TRIGGER on_favorite_notify
  AFTER INSERT ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_favorite_on_insert();
