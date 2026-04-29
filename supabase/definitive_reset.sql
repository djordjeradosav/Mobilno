-- DEFINITIVE TRADES SYSTEM RESET
-- WARNING: This script will drop and recreate your trades table to ensure 100% column compatibility.
-- Run this in your Supabase SQL Editor.

-- 1. Drop existing trades table and related functions to start fresh
DROP TABLE IF EXISTS public.trades CASCADE;
DROP FUNCTION IF EXISTS public.add_new_trade;

-- 2. Recreate the trades table with the EXACT columns the app expects
CREATE TABLE public.trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symbol text NOT NULL,
    trade_type text NOT NULL CHECK (trade_type IN ('Buy', 'Sell')),
    entry_price numeric NOT NULL DEFAULT 0,
    exit_price numeric NOT NULL DEFAULT 0,
    money_value numeric NOT NULL DEFAULT 0,
    trade_date date NOT NULL DEFAULT current_date,
    tradingview_link text,
    notes text,
    chart_image_url text,
    likes_count integer NOT NULL DEFAULT 0,
    comments_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Legacy columns for backward compatibility
    currency_pair text,
    profit numeric DEFAULT 0
);

-- 3. Create indices for performance
CREATE INDEX trades_user_id_idx ON public.trades(user_id);
CREATE INDEX trades_trade_date_idx ON public.trades(trade_date DESC);

-- 4. Recreate the add_new_trade function with correct types
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
        currency_pair, profit
    )
    VALUES (
        v_user_id, p_symbol, p_trade_type, p_entry_price, p_exit_price, p_money_value, 
        p_trade_date, p_tradingview_link, p_notes, p_chart_image_url,
        p_symbol, 0
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Force PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
