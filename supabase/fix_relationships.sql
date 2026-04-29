-- RELATIONSHIP REPAIR SCRIPT
-- Run this in your Supabase SQL Editor to fix "Could not find a relationship" errors.

-- 1. Explicitly ensure the trades -> users foreign key exists with a clear name
ALTER TABLE public.trades 
DROP CONSTRAINT IF EXISTS trades_user_id_fkey;

ALTER TABLE public.trades
ADD CONSTRAINT trades_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 2. Ensure likes -> trades relationship
ALTER TABLE public.likes 
DROP CONSTRAINT IF EXISTS likes_trade_id_fkey;

ALTER TABLE public.likes
ADD CONSTRAINT likes_trade_id_fkey 
FOREIGN KEY (trade_id) 
REFERENCES public.trades(id) 
ON DELETE CASCADE;

-- 3. Ensure comments -> trades relationship
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_trade_id_fkey;

ALTER TABLE public.comments
ADD CONSTRAINT comments_trade_id_fkey 
FOREIGN KEY (trade_id) 
REFERENCES public.trades(id) 
ON DELETE CASCADE;

-- 4. Refresh the PostgREST schema cache
-- This is a critical step to make Supabase "see" the new relationships immediately.
NOTIFY pgrst, 'reload schema';

-- 5. Verification Query (Optional: Run this to check relationships)
-- SELECT 
--     tc.table_name, 
--     kcu.column_name, 
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name 
-- FROM 
--     information_schema.table_constraints AS tc 
--     JOIN information_schema.key_column_usage AS kcu
--       ON tc.constraint_name = kcu.constraint_name
--       AND tc.table_schema = kcu.table_schema
--     JOIN information_schema.constraint_column_usage AS ccu
--       ON ccu.constraint_name = tc.constraint_name
--       AND ccu.table_schema = tc.table_schema
-- WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'trades';
