-- Schedule expire-addons to run every hour via pg_cron + pg_net
SELECT cron.schedule(
  'expire-addons',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/expire-addons',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);