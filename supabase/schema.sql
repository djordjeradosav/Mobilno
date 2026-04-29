-- Ticksnap full schema (Clerk-compatible TEXT user IDs).
-- Paste this into Supabase Dashboard -> SQL Editor and click "Run".
-- Safe to re-run: it drops and recreates everything.

-- 1. Drop existing tables (cascade removes dependent FKs/policies)
drop table if exists public.comments cascade;
drop table if exists public.likes cascade;
drop table if exists public.follows cascade;
drop table if exists public.forecasts cascade;
drop table if exists public.users cascade;

-- 2. Users (id is the Clerk user id, e.g. "user_2abc...")
create table public.users (
    id text primary key,
    username text unique not null,
    email text unique not null,
    avatar_url text,
    member_since timestamptz not null default now(),
    subscription_tier text not null default 'free',
    is_verified boolean not null default false
);

-- 3. Forecasts (a.k.a. "posts")
create table public.forecasts (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references public.users(id) on delete cascade,
    content text not null default '',
    chart_image_url text,
    currency_pair text not null,
    profit numeric not null default 0,
    likes_count integer not null default 0,
    created_at timestamptz not null default now()
);
create index forecasts_user_idx on public.forecasts(user_id);
create index forecasts_created_idx on public.forecasts(created_at desc);

-- 4. Likes (one per user per forecast)
create table public.likes (
    user_id text not null references public.users(id) on delete cascade,
    forecast_id uuid not null references public.forecasts(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, forecast_id)
);

-- 5. Comments
create table public.comments (
    id uuid primary key default gen_random_uuid(),
    forecast_id uuid not null references public.forecasts(id) on delete cascade,
    user_id text not null references public.users(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now()
);
create index comments_forecast_idx on public.comments(forecast_id, created_at desc);

-- 6. Follows
create table public.follows (
    follower_id text not null references public.users(id) on delete cascade,
    followed_id text not null references public.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (follower_id, followed_id)
);

-- 7. Like counter RPCs used by the app
create or replace function public.increment_likes(forecast_id uuid)
returns void as $$
    update public.forecasts set likes_count = likes_count + 1 where id = forecast_id;
$$ language sql;

create or replace function public.decrement_likes(forecast_id uuid)
returns void as $$
    update public.forecasts set likes_count = greatest(likes_count - 1, 0) where id = forecast_id;
$$ language sql;

-- 8. RLS: keep it simple for now -- the publishable key has anon role.
-- We disable RLS so the client can read/write directly. Tighten later by
-- enabling RLS and writing per-table policies based on auth.jwt().
alter table public.users      disable row level security;
alter table public.forecasts  disable row level security;
alter table public.likes      disable row level security;
alter table public.comments   disable row level security;
alter table public.follows    disable row level security;

-- 9. Realtime (so the live feed updates)
alter publication supabase_realtime add table public.forecasts;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.likes;

-- 10. Storage bucket for chart images (publicly readable, anonymous uploads)
insert into storage.buckets (id, name, public)
values ('forecasts', 'forecasts', true)
on conflict (id) do update set public = true;

-- Drop existing policies (idempotent re-run)
drop policy if exists "forecasts_public_read" on storage.objects;
drop policy if exists "forecasts_anon_insert" on storage.objects;
drop policy if exists "forecasts_anon_delete" on storage.objects;

create policy "forecasts_public_read" on storage.objects
    for select using (bucket_id = 'forecasts');

create policy "forecasts_anon_insert" on storage.objects
    for insert with check (bucket_id = 'forecasts');

create policy "forecasts_anon_delete" on storage.objects
    for delete using (bucket_id = 'forecasts');

-- 11. RPC for creating forecasts with a bypass/helper if needed
-- This function matches the call in forecast.tsx
create or replace function public.create_forecast_v2(
    p_content text,
    p_currency_pair text,
    p_profit numeric,
    p_chart_image_url text default null
)
returns uuid as $$
declare
    new_id uuid;
    v_user_id text;
    v_user_email text;
begin
    -- 1. Get the authenticated user ID
    v_user_id := auth.uid()::text;
    
    if v_user_id is null then
        raise exception 'User not authenticated';
    end if;

    -- 2. Ensure the user exists in the public.users table
    -- This prevents foreign key violations if the user profile hasn't been created yet
    if not exists (select 1 from public.users where id = v_user_id) then
        -- Get email from auth.users if available
        select email into v_user_email from auth.users where id::text = v_user_id;
        
        insert into public.users (id, username, email)
        values (
            v_user_id, 
            coalesce(split_part(v_user_email, '@', 1), 'user_' || substr(v_user_id, 1, 8)),
            coalesce(v_user_email, v_user_id || '@placeholder.com')
        )
        on conflict (id) do nothing;
    end if;

    -- 3. Insert the forecast
    insert into public.forecasts (
        user_id,
        content,
        currency_pair,
        profit,
        chart_image_url
    )
    values (
        v_user_id,
        p_content,
        p_currency_pair,
        p_profit,
        p_chart_image_url
    )
    returning id into new_id;
    
    return new_id;
end;
$$ language plpgsql security definer;
