# Ticksnap

## Overview
Ticksnap is an Expo (React Native) application targeting iOS, Android, and Web. It uses Expo Router for navigation, Clerk for authentication, and Supabase for the backend, with market data from Finnhub and Alpha Vantage.

## Tech Stack
- **Framework**: Expo SDK ~54 with Expo Router (file-based routing)
- **Language**: TypeScript
- **Auth**: Clerk (`@clerk/clerk-expo`)
- **Database/Backend**: Supabase (`@supabase/supabase-js`)
- **Market Data**: Finnhub, Alpha Vantage
- **UI**: React Native, react-native-web, react-native-reanimated, react-native-svg, @gorhom/bottom-sheet

## Project Structure
- `app/` — Expo Router pages
  - `index.tsx` — splash/redirect entry
  - `(auth)/` — login, register, welcome
  - `(tabs)/` — popular, search, forecast, profile
  - `post-forecast.tsx` — create-post screen (CRUD: create)
- `components/` — Shared UI components (incl. `TradeDetailsModal` with comments)
- `lib/` — Supabase client, Clerk token cache, market data helpers, `comments.ts`, `syncUser.ts`
- `supabase/schema.sql` — full DB schema (run once in Supabase SQL editor)
- `constants/` — Theme/colors
- `assets/` — Fonts and images

## Data model (run `supabase/schema.sql` in Supabase Dashboard → SQL Editor)
- `users(id text PK, username, email, avatar_url, member_since, subscription_tier, is_verified)`
  — `id` is the Clerk user id (text, e.g. `user_2abc...`).
- `forecasts(id uuid PK, user_id text → users.id, content, chart_image_url, currency_pair, profit, likes_count, created_at)`
- `likes(user_id text, forecast_id uuid, PRIMARY KEY (user_id, forecast_id))`
- `comments(id uuid PK, forecast_id uuid, user_id text, content, created_at)`
- `follows(follower_id text, followed_id text, PRIMARY KEY ...)`
- RPCs `increment_likes(forecast_id uuid)`, `decrement_likes(forecast_id uuid)`
- RLS is **disabled** for now (publishable key is anon role); tighten later.

## CRUD coverage
- **Posts (forecasts):** Create (`/post-forecast`), Read (popular/forecast tabs), Delete (profile tab).
- **Likes:** toggle from feed cards & details modal (uses `likes` table + RPCs).
- **Comments:** add / list / delete inside `TradeDetailsModal` via `lib/comments.ts`.
- **Sign out:** profile tab → `signOut()` from `useAuth()` (Clerk).

## Replit Setup
- **Workflow**: `Start application` runs `npx expo start --web --port 5000 --host lan` on port 5000 (webview).
- **Web bundler**: Metro (configured via `app.json` → `web.bundler: metro`, `web.output: static`).
- **Environment variables** (in `.env`, all `EXPO_PUBLIC_*` prefixed so they ship to the client):
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_FINNHUB_KEY`, `EXPO_PUBLIC_ALPHA_VANTAGE_KEY`

## Deployment
Configured as **static** deployment:
- Build: `npx expo export -p web`
- Public directory: `dist`

## Notes
- Expo dev server already binds to `0.0.0.0` and serves the web build through the Replit proxy without additional host-allowlist configuration.
- Native targets (iOS/Android) are not built in Replit; only the web target runs here.
