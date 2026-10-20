create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

select cron.schedule(
  'lasu-official-updates-every-30-minutes',
  '*/30 * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'lasu_updates_project_url')
        || '/functions/v1/sync-lasu-updates',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'lasu_updates_cron_jwt'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lasu_updates_cron_jwt')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
