
-- Schedule cron job for auto-closing expired deals (daily at midnight)
SELECT cron.schedule(
  'close-expired-deals',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eddrshyqlrpxgvyxpjee.supabase.co/functions/v1/close-expired-deals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZHJzaHlxbHJweGd2eXhwamVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODI0MjYsImV4cCI6MjA4NzA1ODQyNn0.On_i0UMaMbhYVV18NTrWZiUDz6mPqVY8Hrv5URj11tc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
