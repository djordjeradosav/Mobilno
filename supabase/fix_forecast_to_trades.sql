-- FIX: Migrate forecasts to trades table
-- This script ensures the trades table is properly set up to handle both trades and forecasts

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

-- 2. Safely add all necessary columns
DO $$ 
BEGIN 
    -- Core trade columns
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

    -- Backward compatibility columns for forecasts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='currency_pair') THEN
        ALTER TABLE public.trades ADD COLUMN currency_pair text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='profit') THEN
        ALTER TABLE public.trades ADD COLUMN profit numeric DEFAULT 0;
    END IF;

    -- Forecast-specific fields for backward compatibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='content') THEN
        ALTER TABLE public.trades ADD COLUMN content text;
    END IF;
END $$;

-- 3. Ensure proper foreign key relationship
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_user_id_fkey;
ALTER TABLE public.trades ADD CONSTRAINT trades_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Create indices for performance
CREATE INDEX IF NOT EXISTS trades_user_idx ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS trades_date_idx ON public.trades(trade_date DESC);
CREATE INDEX IF NOT EXISTS trades_user_date_idx ON public.trades(user_id, trade_date DESC);

-- 5. Ensure likes table is properly configured
CREATE TABLE IF NOT EXISTS public.likes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    unique(user_id, trade_id)
);

-- 6. Ensure comments table is properly configured
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Enable RLS on all tables
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
DROP POLICY IF EXISTS "Public read" ON public.trades;
CREATE POLICY "Public read" ON public.trades FOR SELECT USING (true);

DROP POLICY IF EXISTS "User can manage own trades" ON public.trades;
CREATE POLICY "User can manage own trades" ON public.trades FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Public read" ON public.likes;
CREATE POLICY "Public read" ON public.likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "User can manage own likes" ON public.likes;
CREATE POLICY "User can manage own likes" ON public.likes FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Public read" ON public.comments;
CREATE POLICY "Public read" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "User can manage own comments" ON public.comments;
CREATE POLICY "User can manage own comments" ON public.comments FOR ALL USING (auth.uid()::text = user_id);

-- 9. Re-create the add_new_trade RPC function
CREATE OR REPLACE FUNCTION public.add_new_trade(
    p_symbol text,
    p_trade_type text,
    p_entry_price numeric,
    p_exit_price numeric,
    p_money_value numeric,
    p_trade_date date,
    p_tradingview_link text,
    p_notes text,
    p_chart_image_url text DEFAULT null,
    p_currency_pair text DEFAULT null,
    p_content text DEFAULT null
)
RETURNS uuid AS $$
DECLARE
    new_id uuid;
    v_user_id text;
    v_user_email text;
BEGIN
    v_user_id := auth.uid()::text;
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not authenticated'; END IF;

    -- Ensure user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id::text = v_user_id;
        INSERT INTO public.users (id, username, email)
        VALUES (v_user_id, coalesce(split_part(v_user_email, '@', 1), 'user_' || substr(v_user_id, 1, 8)), coalesce(v_user_email, v_user_id || '@placeholder.com'))
        ON CONFLICT (id) DO NOTHING;
    END IF;

    INSERT INTO public.trades (
        user_id, symbol, trade_type, entry_price, exit_price, money_value, 
        trade_date, tradingview_link, notes, chart_image_url, currency_pair, content, profit
    )
    VALUES (
        v_user_id, p_symbol, p_trade_type, p_entry_price, p_exit_price, p_money_value, 
        p_trade_date, p_tradingview_link, p_notes, p_chart_image_url, 
        coalesce(p_currency_pair, p_symbol), p_content, p_money_value
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
