-- OPTIONAL PRICES FIX
-- This script makes entry_price and exit_price optional in the trades table.

-- 1. Remove NOT NULL constraints if they exist
ALTER TABLE public.trades ALTER COLUMN entry_price DROP NOT NULL;
ALTER TABLE public.trades ALTER COLUMN exit_price DROP NOT NULL;

-- 2. Update the add_new_trade function to handle nulls correctly
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

-- 3. Force PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
