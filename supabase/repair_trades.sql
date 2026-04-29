-- COMPREHENSIVE REPAIR SCRIPT FOR TRADES SYSTEM
-- Run this in your Supabase SQL Editor

-- 1. Ensure the trades table exists
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

-- 2. If the table existed but was missing columns, add them safely
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='trade_date') THEN
        ALTER TABLE public.trades ADD COLUMN trade_date date NOT NULL DEFAULT current_date;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='symbol') THEN
        ALTER TABLE public.trades ADD COLUMN symbol text NOT NULL DEFAULT 'UNKNOWN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='trade_type') THEN
        ALTER TABLE public.trades ADD COLUMN trade_type text CHECK (trade_type IN ('Buy', 'Sell'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='money_value') THEN
        ALTER TABLE public.trades ADD COLUMN money_value numeric NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 3. Re-create the RPC function to match the app's expectations
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
    v_user_email text;
BEGIN
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not authenticated'; END IF;

    -- Ensure user exists in public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id::text = v_user_id;
        INSERT INTO public.users (id, username, email)
        VALUES (v_user_id, COALESCE(split_part(v_user_email, '@', 1), 'user_' || substr(v_user_id, 1, 8)), COALESCE(v_user_email, v_user_id || '@placeholder.com'))
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
