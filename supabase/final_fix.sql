-- DEFINITIVE RELATIONSHIP AND CACHE FIX
-- Run this in your Supabase SQL Editor

-- 1. Ensure the relationship between trades and users is explicitly defined
ALTER TABLE public.trades 
DROP CONSTRAINT IF EXISTS trades_user_id_fkey;

ALTER TABLE public.trades
ADD CONSTRAINT trades_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 2. Grant necessary permissions (sometimes required for relationships to show up)
GRANT ALL ON TABLE public.trades TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- 3. FORCE RELOAD THE SCHEMA CACHE
-- This is the most important part. It tells PostgREST to re-examine the database schema.
NOTIFY pgrst, 'reload schema';

-- 4. Verification (Run this separately if the error persists)
-- SELECT 
--     tc.table_name, 
--     kcu.column_name, 
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name 
-- FROM 
--     information_schema.table_constraints AS tc 
--     JOIN information_schema.key_column_usage AS kcu
--       ON tc.constraint_name = kcu.constraint_name
--     JOIN information_schema.constraint_column_usage AS ccu
--       ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'trades';
