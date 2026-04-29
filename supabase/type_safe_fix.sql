-- TYPE-SAFE SCHEMA FIX
-- This script resolves the mismatch between UUID and TEXT types for user IDs.

-- 1. Drop the problematic foreign key if it partially exists
ALTER TABLE IF EXISTS public.trades DROP CONSTRAINT IF EXISTS trades_user_id_fkey;

-- 2. Ensure the 'trades' table has the correct column type
-- We use TEXT for user_id to match the 'public.users' table which is likely using Clerk/Auth IDs as text.
DO $$ 
BEGIN 
    -- If the table exists, ensure the user_id column is TEXT
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='trades') THEN
        -- Check if user_id is already TEXT
        IF (SELECT data_type FROM information_schema.columns WHERE table_name='trades' AND column_name='user_id') != 'text' THEN
            -- Convert to text if it's not
            ALTER TABLE public.trades ALTER COLUMN user_id TYPE text;
        END IF;
    ELSE
        -- Create the table from scratch if it doesn't exist
        CREATE TABLE public.trades (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id text NOT NULL, -- Matches public.users.id type
            symbol text NOT NULL,
            trade_type text CHECK (trade_type IN ('Buy', 'Sell')),
            entry_price numeric,
            exit_price numeric,
            money_value numeric NOT NULL DEFAULT 0,
            trade_date date NOT NULL DEFAULT current_date,
            tradingview_link text,
            notes text,
            chart_image_url text,
            likes_count integer NOT NULL DEFAULT 0,
            comments_count integer NOT NULL DEFAULT 0,
            created_at timestamptz NOT NULL DEFAULT now()
        );
    END IF;
END $$;

-- 3. Now safely add the foreign key constraint
-- This assumes public.users.id is of type TEXT.
ALTER TABLE public.trades 
ADD CONSTRAINT trades_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 4. Update the add_new_trade function to be type-consistent
CREATE OR REPLACE FUNCTION public.add_new_trade(
    p_symbol text,
    p_trade_type text,
    p_entry_price numeric,
    p_exit_price numeric,
    p_money_value numeric,
    p_trade_date date,
    p_tradingview_link text,
    p_notes text,
    p_chart_image_url text DEFAULT null
)
RETURNS uuid AS $$
DECLARE
    new_id uuid;
    v_user_id text;
BEGIN
    -- Cast auth.uid() to text to match our table type
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not authenticated'; END IF;

    INSERT INTO public.trades (
        user_id, symbol, trade_type, entry_price, exit_price, money_value, 
        trade_date, tradingview_link, notes, chart_image_url
    )
    VALUES (
        v_user_id, p_symbol, p_trade_type, p_entry_price, p_exit_price, p_money_value, 
        p_trade_date, p_tradingview_link, p_notes, p_chart_image_url
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Force cache reload
NOTIFY pgrst, 'reload schema';
