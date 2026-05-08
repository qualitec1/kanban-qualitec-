-- Enable REPLICA IDENTITY FULL for tasks table to support Realtime with all columns
-- This allows Supabase Realtime to send the full row data on UPDATE events

ALTER TABLE tasks REPLICA IDENTITY FULL;

-- Verify the change
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'tasks';

-- Expected result: relreplident = 'f' (FULL)
