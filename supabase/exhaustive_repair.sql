-- EXHAUSTIVE TRADES REPAIR SCRIPT
-- Run this in your Supabase SQL Editor to fix ALL missing column and relationship errors.

-- 1. Create the trades table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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

-- 2. Safely add every possible missing column
DO $$ 
BEGIN 
    -- Basic columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='trade_date') THEN
        ALTER TABLE public.trades ADD COLUMN trade_date date NOT NULL DEFAULT current_date;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='symbol') THEN
        ALTER TABLE public.trades ADD COLUMN symbol text NOT NULL DEFAULT 'UNKNOWN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='trade_type') THEN
        ALTER TABLE public.trades ADD COLUMN trade_type text CHECK (trade_type IN ('Buy', 'Sell'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='entry_price') THEN
        ALTER TABLE public.trades ADD COLUMN entry_price numeric;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='exit_price') THEN
        ALTER TABLE public.trades ADD COLUMN exit_price numeric;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='money_value') THEN
        ALTER TABLE public.trades ADD COLUMN money_value numeric NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='tradingview_link') THEN
        ALTER TABLE public.trades ADD COLUMN tradingview_link text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='notes') THEN
        ALTER TABLE public.trades ADD COLUMN notes text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='chart_image_url') THEN
        ALTER TABLE public.trades ADD COLUMN chart_image_url text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='comments_count') THEN
        ALTER TABLE public.trades ADD COLUMN comments_count integer NOT NULL DEFAULT 0;
    END IF;

    -- Backward compatibility columns (if app still looks for 'currency_pair' or 'profit')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='currency_pair') THEN
        ALTER TABLE public.trades ADD COLUMN currency_pair text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='profit') THEN
        ALTER TABLE public.trades ADD COLUMN profit numeric DEFAULT 0;
    END IF;
END $$;

-- 3. Explicitly define the relationship for Supabase
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_user_id_fkey;
ALTER TABLE public.trades ADD CONSTRAINT trades_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Re-create the add_new_trade function
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
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not authenticated'; END IF;

    INSERT INTO public.trades (
        user_id, symbol, trade_type, entry_price, exit_price, money_value, 
        trade_date, tradingview_link, notes, chart_image_url,
        currency_pair, profit -- Keep for backward compatibility
    )
    VALUES (
        v_user_id, p_symbol, p_trade_type, p_entry_price, p_exit_price, p_money_value, 
        p_trade_date, p_tradingview_link, p_notes, p_chart_image_url,
        p_symbol, 0 -- Mock values for legacy columns
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Force cache reload
NOTIFY pgrst, 'reload schema';
