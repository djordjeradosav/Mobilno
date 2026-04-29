-- 1. Users Table (unchanged)
create table public.users (
    id text primary key, -- Clerk/Supabase Auth ID
    username text unique,
    email text unique,
    avatar_url text,
    is_verified boolean not null default false
);

-- 2. Trades Table (Renamed from forecasts and specialized)
create table public.trades (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references public.users(id) on delete cascade,
    symbol text not null,
    trade_type text check (trade_type in ('Buy', 'Sell')),
    entry_price numeric,
    exit_price numeric,
    money_value numeric not null default 0, -- Profit/Loss amount
    trade_date date not null default current_date,
    tradingview_link text,
    notes text,
    chart_image_url text, -- For TradingView preview
    likes_count integer not null default 0,
    created_at timestamptz not null default now()
);

create index trades_user_idx on public.trades(user_id);
create index trades_date_idx on public.trades(trade_date desc);

-- 3. Likes (Updated for trades)
create table public.likes (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references public.users(id) on delete cascade,
    trade_id uuid not null references public.trades(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique(user_id, trade_id)
);

-- 4. Comments (Updated for trades)
create table public.comments (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references public.users(id) on delete cascade,
    trade_id uuid not null references public.trades(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now()
);

-- 5. RLS Policies
alter table public.users enable row level security;
alter table public.trades enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- Public read access
create policy "Public read" on public.users for select using (true);
create policy "Public read" on public.trades for select using (true);
create policy "Public read" on public.likes for select using (true);
create policy "Public read" on public.comments for select using (true);

-- Authenticated write access
create policy "User can update own profile" on public.users for update using (auth.uid()::text = id);
create policy "User can manage own trades" on public.trades for all using (auth.uid()::text = user_id);
create policy "User can manage own likes" on public.likes for all using (auth.uid()::text = user_id);
create policy "User can manage own comments" on public.comments for all using (auth.uid()::text = user_id);

-- 6. RPC for creating trades (JIT user creation)
create or replace function public.add_new_trade(
    p_symbol text,
    p_trade_type text,
    p_entry_price numeric,
    p_exit_price numeric,
    p_money_value numeric,
    p_trade_date date,
    p_tradingview_link text,
    p_notes text,
    p_chart_image_url text default null
)
returns uuid as $$
declare
    new_id uuid;
    v_user_id text;
    v_user_email text;
begin
    v_user_id := auth.uid()::text;
    if v_user_id is null then raise exception 'User not authenticated'; end if;

    -- Ensure user exists
    if not exists (select 1 from public.users where id = v_user_id) then
        select email into v_user_email from auth.users where id::text = v_user_id;
        insert into public.users (id, username, email)
        values (v_user_id, coalesce(split_part(v_user_email, '@', 1), 'user_' || substr(v_user_id, 1, 8)), coalesce(v_user_email, v_user_id || '@placeholder.com'))
        on conflict (id) do nothing;
    end if;

    insert into public.trades (
        user_id, symbol, trade_type, entry_price, exit_price, money_value, 
        trade_date, tradingview_link, notes, chart_image_url
    )
    values (
        v_user_id, p_symbol, p_trade_type, p_entry_price, p_exit_price, p_money_value, 
        p_trade_date, p_tradingview_link, p_notes, p_chart_image_url
    )
    returning id into new_id;
    
    return new_id;
end;
$$ language plpgsql security definer;
