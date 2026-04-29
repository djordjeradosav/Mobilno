-- FINAL ROBUST SCHEMA FIX
-- Run this in your Supabase SQL Editor

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
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Explicitly add the trade_date column if missing (most common error)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='trade_date') THEN
        ALTER TABLE public.trades ADD COLUMN trade_date date NOT NULL DEFAULT current_date;
    END IF;
END $$;

-- 3. Ensure indices for performance
CREATE INDEX IF NOT EXISTS trades_user_date_idx ON public.trades(user_id, trade_date DESC);

-- 4. Re-create the RPC function for trade creation
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

    -- Basic check to ensure user exists in public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
        INSERT INTO public.users (id, username, email)
        VALUES (v_user_id, 'user_' || substr(v_user_id, 1, 8), v_user_id || '@placeholder.com')
        ON CONFLICT (id) DO NOTHING;
    END IF;

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
