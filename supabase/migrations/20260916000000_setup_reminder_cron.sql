-- ============================================================
-- CRON: Disparo automatico de lembretes de tarefas a cada minuto
-- Execute este script no Supabase > SQL Editor
-- ============================================================

-- 1. Habilitar extensoes necessarias (pg_cron e pg_net)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remover job anterior se existir (evitar duplicatas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-task-reminders') THEN
    PERFORM cron.unschedule('send-task-reminders');
  END IF;
END;
$$;

-- 3. Criar o cron job que dispara a edge function a cada 1 minuto
SELECT cron.schedule(
  'send-task-reminders',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url     := 'https://ifftngadjtwgjsadqvep.supabase.co/functions/v1/send-task-reminders',
      headers := jsonb_build_object(
        'Content-Type',   'application/json',
        'Authorization',  'Bearer COLE_SUA_SERVICE_ROLE_KEY_AQUI'
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) AS request_id;
  $$
);

-- 4. Confirmar criacao do job
SELECT jobid, jobname, schedule, active, command
FROM cron.job
WHERE jobname = 'send-task-reminders';
