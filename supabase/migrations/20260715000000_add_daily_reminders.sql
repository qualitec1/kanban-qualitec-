-- Migration to add daily interval reminders support to task_reminders table and upsert function

ALTER TABLE public.task_reminders 
ADD COLUMN reminder_type TEXT NOT NULL DEFAULT 'days_before',
ADD COLUMN start_date DATE;

-- Update the RPC helper function
DROP FUNCTION IF EXISTS public.upsert_reminders_for_assignees(UUID, INTEGER, TIME, BOOLEAN);

CREATE OR REPLACE FUNCTION public.upsert_reminders_for_assignees(
  p_task_id UUID,
  p_days_before INTEGER,
  p_reminder_time TIME,
  p_notify_all BOOLEAN,
  p_reminder_type TEXT DEFAULT 'days_before',
  p_start_date DATE DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_user_id   UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM task_assignees
    WHERE task_id = p_task_id AND user_id = v_caller_id
  ) THEN
    INSERT INTO task_reminders (task_id, user_id, enabled, days_before, reminder_time, notify_all_assignees, reminder_type, start_date)
    VALUES (p_task_id, v_caller_id, true, p_days_before, p_reminder_time, p_notify_all, p_reminder_type, p_start_date)
    ON CONFLICT (task_id, user_id) DO UPDATE SET
      enabled              = true,
      days_before          = EXCLUDED.days_before,
      reminder_time        = EXCLUDED.reminder_time,
      notify_all_assignees = EXCLUDED.notify_all_assignees,
      reminder_type        = EXCLUDED.reminder_type,
      start_date           = EXCLUDED.start_date,
      updated_at           = NOW();
    RETURN;
  END IF;

  IF p_notify_all THEN
    FOR v_user_id IN
      SELECT user_id FROM task_assignees WHERE task_id = p_task_id
    LOOP
      INSERT INTO task_reminders (task_id, user_id, enabled, days_before, reminder_time, notify_all_assignees, reminder_type, start_date)
      VALUES (p_task_id, v_user_id, true, p_days_before, p_reminder_time, p_notify_all, p_reminder_type, p_start_date)
      ON CONFLICT (task_id, user_id) DO UPDATE SET
        enabled              = true,
        days_before          = EXCLUDED.days_before,
        reminder_time        = EXCLUDED.reminder_time,
        notify_all_assignees = EXCLUDED.notify_all_assignees,
        reminder_type        = EXCLUDED.reminder_type,
        start_date           = EXCLUDED.start_date,
        updated_at           = NOW();
    END LOOP;
  ELSE
    INSERT INTO task_reminders (task_id, user_id, enabled, days_before, reminder_time, notify_all_assignees, reminder_type, start_date)
    VALUES (p_task_id, v_caller_id, true, p_days_before, p_reminder_time, p_notify_all, p_reminder_type, p_start_date)
    ON CONFLICT (task_id, user_id) DO UPDATE SET
      enabled              = true,
      days_before          = EXCLUDED.days_before,
      reminder_time        = EXCLUDED.reminder_time,
      notify_all_assignees = EXCLUDED.notify_all_assignees,
      reminder_type        = EXCLUDED.reminder_type,
      start_date           = EXCLUDED.start_date,
      updated_at           = NOW();
  END IF;
END;
$$;
