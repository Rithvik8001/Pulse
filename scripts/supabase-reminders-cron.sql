create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://pulseapp.company', 'pulse_app_url');
select vault.create_secret('bLdbfAqUrRSZsqcfN+6NIY5f67X7pt1w4KtQ1OcDDZI=', 'pulse_cron_secret');

select cron.schedule(
  'pulse-reminders',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'pulse_app_url') || '/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'pulse_cron_secret')
    ),
    timeout_milliseconds := 300000
  );
  $$
);
