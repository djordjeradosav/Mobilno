# Ticksnap — Mobilna aplikacija za trading dnevnik

**Ticksnap** je cross-platform mobilna aplikacija (iOS, Android, Web) napravljena u **Expo / React Native**. Korisnici mogu da objavljuju trgovinske prognoze („forecasts“), prate druge tradere, lajkuju objave, komentarišu i pregledaju makro/forex podatke.

---

## Šta aplikacija radi

| Funkcija | Gde u app-u |
|----------|-------------|
| Registracija / login (email + lozinka) | `(auth)/register`, `(auth)/login` |
| Feed popularnih prognoza | `(tabs)/popular` |
| Pretraga korisnika i simbola | `(tabs)/search` |
| Nova prognoza (post) | `(tabs)/forecast`, `post-forecast.tsx` |
| Makro / forex podaci | `(tabs)/macro` |
| Profil, moji trade-ovi, follow | `(tabs)/profile` |
| Tuđi profil | `user-profile.tsx` |
| Detalji trade-a + komentari | `TradeDetailsModal` |

---

## Tehnologije

| Sloj | Tehnologija |
|------|-------------|
| Framework | **Expo SDK 54** + **Expo Router** (file-based routing) |
| Jezik | **TypeScript** |
| UI | React Native, NativeWind/Tailwind, Reanimated, Bottom Sheet |
| Backend / baza | **Supabase** (PostgreSQL + Auth + Storage) preko **REST API-ja** |
| Autentifikacija | Supabase Auth (GoTrue) — `lib/supabaseRest.ts` + `lib/auth.tsx` |
| Tržišni podaci | Finnhub, Alpha Vantage, FRED, News API (env ključevi) |

> **Napomena:** Aplikacija **ne koristi** `@supabase/supabase-js` SDK za runtime — sve ide preko `fetch` ka REST endpoint-ima. Detaljno objašnjenje je u `lib/supabaseRest.ts` (komentarisano na srpskom).

---

## Struktura projekta

```
Mobilno/
├── app/                      # Ekrani (Expo Router)
│   ├── index.tsx             # Splash → redirect (ulogovan / welcome)
│   ├── _layout.tsx           # Root: fontovi + AuthProvider + Stack
│   ├── (auth)/               # welcome, login, register
│   ├── (tabs)/               # popular, search, forecast, macro, profile
│   ├── post-forecast.tsx     # Forma za novi post sa slikom
│   └── user-profile.tsx      # Profil drugog korisnika
├── components/               # UI komponente (ForecastCard, modali, Avatar...)
├── lib/
│   ├── supabaseRest.ts       # ★ REST klijent za Supabase (auth, DB, storage)
│   ├── supabase.ts           # Re-export za ostatak app-a
│   ├── auth.tsx              # React Context (user, session, signOut)
│   ├── storage.ts            # Lokalno čuvanje tokena (web: localStorage)
│   ├── syncUser.ts           # Upsert u public.users posle registracije
│   ├── comments.ts           # CRUD komentara
│   ├── uploadImage.ts        # Upload chart slika u Storage bucket
│   ├── finnhub.ts, forex.ts, fred.ts, news.ts  # Spoljni API-ji
├── supabase/
│   └── schema.sql            # Referentna SQL šema (može se razlikovati od produkcije)
├── assets/                   # Fontovi, ikone, splash
├── .env                      # Tajni ključevi (NE commitovati u git!)
├── app.json                  # Expo konfiguracija
├── package.json
└── read.md                   # Ovaj fajl
```

---

## Kako pokrenuti projekat

### 1. Preduslovi

- **Node.js** 18+ (preporuka: LTS)
- **npm** ili **yarn**
- Za telefon: **Expo Go** app ili **development build** (`expo-dev-client`)
- Nalog na [supabase.com](https://supabase.com) sa kreiranim projektom

### 2. Kloniranje i instalacija

```bash
cd Mobilno
npm install
```

### 3. Podesi `.env`

Kopiraj `.env.example` ako postoji, ili kreiraj `.env` u root-u:

```env
# Supabase (obavezno)
EXPO_PUBLIC_SUPABASE_URL=https://TVOJ_PROJEKAT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Tržišni API-ji (opciono — macro/search/news)
EXPO_PUBLIC_FINNHUB_KEY=
EXPO_PUBLIC_ALPHA_VANTAGE_KEY=
EXPO_PUBLIC_FRED_API_KEY=
EXPO_PUBLIC_NEWS_API_KEY=
```

Ključeve nađeš u **Supabase Dashboard → Project Settings → API**:
- **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
- **anon public** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 4. Supabase baza

U **SQL Editor** pokreni šemu koja odgovara tvojim tabelama. Aplikacija u kodu koristi tabele:

- `users` — profili
- `trades` — prognoze/postovi (ne `forecasts` iz starog `schema.sql`)
- `likes` — lajkovi (`trade_id`)
- `comments` — komentari
- `follows` — praćenje korisnika

RPC funkcije koje app poziva:
- `increment_likes(trade_id)`
- `decrement_likes(trade_id)`
- `increment_comments(trade_id)`

**Storage:** kreiraj javni bucket `forecasts` za slike chart-ova.

**Auth:** u Authentication → Providers uključi Email; po želji email confirmation.

### 5. Pokretanje

```bash
# Dev server (QR kod za Expo Go)
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android

# Web browser
npm run web
```

U terminalu pritisni `i` (iOS), `a` (Android) ili skeniraj QR kod u **Expo Go**.

---

## Tok aplikacije (navigacija)

```
app/index.tsx (splash 1.5s)
    │
    ├─ nema sesije → /(auth)/welcome → login / register
    │
    └─ ima sesiju  → /(tabs)/popular

(tabs)/_layout.tsx
    └─ ako nema user → Redirect na welcome
```

**AuthProvider** (`lib/auth.tsx`) omotava ceo app u `app/_layout.tsx` i deli `user` / `session` svim ekranima preko `useAuth()`.

---

## Kako radi Supabase REST (kratko)

Bazni URL: `https://<ref>.supabase.co`

| API | Putanja | Primer u kodu |
|-----|---------|---------------|
| **Auth** | `/auth/v1/` | `supabase.auth.signInWithPassword` |
| **Database** | `/rest/v1/<tabela>` | `supabase.from('trades').select('*')` |
| **RPC** | `/rest/v1/rpc/<fn>` | `supabase.rpc('increment_likes', { trade_id })` |
| **Storage** | `/storage/v1/object/...` | `uploadForecastImage()` |

Svaki zahtev šalje header `apikey: ANON_KEY`. Kad je korisnik ulogovan, dodaje se `Authorization: Bearer <access_token>`.

Sesija (tokeni) se čuvaju lokalno u `lib/storage.ts` (`universalStorage`).

**Detaljni komentari:** pogledaj `lib/supabaseRest.ts` (sekcije Auth, PostgREST, Storage).

---

## Glavni fajlovi po funkciji

| Fajl | Uloga |
|------|-------|
| `app/(auth)/login.tsx` | Email login → REST `signInWithPassword` |
| `app/(auth)/register.tsx` | Signup + `user_metadata` (username) |
| `lib/syncUser.ts` | Upis/red u `users` tabelu posle auth |
| `app/(tabs)/popular.tsx` | Feed + lajkovi + follow |
| `lib/comments.ts` | Lista/dodaj/obriši komentare |
| `lib/uploadImage.ts` | Slika → Supabase Storage → public URL |
| `components/TradeDetailsModal.tsx` | Komentari, edit, delete trade |

---

## Build za produkciju (web)

```bash
npx expo export -p web
# Output: dist/
```

U `app.json` je podešeno `web.output: "static"` za statički hosting.

Za native build koristi [EAS Build](https://docs.expo.dev/build/introduction/) (`eas.json` u projektu).

---

## Česta pitanja / problemi

**„Invalid API key“**  
Proveri `EXPO_PUBLIC_SUPABASE_ANON_KEY` i da URL odgovara istom projektu.

**Login radi, ali feed je prazan**  
Tabele `trades` / `users` možda nisu kreirane ili RLS blokira upite. U dev-u RLS može biti isključen (vidi `schema.sql`).

**Upload slike ne radi**  
Bucket `forecasts` mora postojati i biti **public** (ili koristiti signed URL — trenutno app očekuje public).

**Sesija se ne pamti na native-u**  
`lib/storage.ts` na native koristi in-memory storage u dev-u — za produkciju dodaj `@react-native-async-storage/async-storage`.

**Stari `red.md` pominje Clerk**  
Trenutna verzija koristi **Supabase Auth**, ne Clerk. `EXPO_PUBLIC_CLERK_*` u `.env` se ne koristi u kodu.

---

## Korisne komande

```bash
npm start          # Expo dev server
npx tsc --noEmit   # Provera TypeScript grešaka
npm uninstall @supabase/supabase-js   # Opciono — SDK više nije potreban
```

---

## Autor / verzija

- **Verzija app-a:** 1.0.0 (`package.json`)
- **Expo slug:** `ticksnap`
- **Bundle ID (iOS):** `com.radosavljevic.ticksnap`

Za dublje tehničke detalje REST sloja → **`lib/supabaseRest.ts`** (komentari na srpskom).
