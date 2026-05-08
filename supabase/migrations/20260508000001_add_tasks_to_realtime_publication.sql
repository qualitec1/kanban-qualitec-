-- Add tasks table to Realtime publication
-- This enables Supabase Realtime to broadcast changes to the tasks table

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Verify the change
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'tasks';

-- Expected result: one row with schemaname='public' and tablename='tasks'
