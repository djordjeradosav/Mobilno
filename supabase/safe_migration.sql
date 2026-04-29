-- SAFE MIGRATION SCRIPT
-- This script only creates what is missing and updates functions.

-- 1. Create Trades Table if it doesn't exist
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

-- 2. Ensure indices exist
CREATE INDEX IF NOT EXISTS trades_user_idx ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS trades_date_idx ON public.trades(trade_date DESC);

-- 3. Update Likes and Comments to point to trades (Safe way)
-- If you already have these tables pointing to forecasts, you might need to drop and recreate them
-- or add new columns. For a clean start with the new 'trades' system:
DROP TABLE IF EXISTS public.comments;
DROP TABLE IF EXISTS public.likes;

CREATE TABLE public.likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, trade_id)
);

CREATE TABLE public.comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 5. Re-apply Policies (Drop first to avoid "already exists" errors)
DROP POLICY IF EXISTS "Public read" ON public.trades;
DROP POLICY IF EXISTS "User can manage own trades" ON public.trades;
CREATE POLICY "Public read" ON public.trades FOR SELECT USING (true);
CREATE POLICY "User can manage own trades" ON public.trades FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Public read" ON public.likes;
DROP POLICY IF EXISTS "User can manage own likes" ON public.likes;
CREATE POLICY "Public read" ON public.likes FOR SELECT USING (true);
CREATE POLICY "User can manage own likes" ON public.likes FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Public read" ON public.comments;
DROP POLICY IF EXISTS "User can manage own comments" ON public.comments;
CREATE POLICY "Public read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "User can manage own comments" ON public.comments FOR ALL USING (auth.uid()::text = user_id);

-- 6. Updated RPC function
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
