# Ticksnap

Ticksnap je mobilna aplikacija za praćenje i deljenje trading journala. Napravljena za trgovce koji žele da beleže svoje tradove, analiziraju rezultate i prate šta drugi traderi rade.

---

## O projektu

Ticksnap omogućava korisnicima da objavljuju svoje tradove (kupovina/prodaja), prate profit i gubitak, komentarišu tuđe postove i prate makroekonomske indikatore SAD-a. Aplikacija ima i socijalni feed gde možeš da pratiš druge tradere i vidiš njihove analize.

---

## Tehnologije

| Tehnologija | Verzija |
|---|---|
| Expo (React Native) | ~54.0 |
| TypeScript | ~5.9 |
| Expo Router | ~6.0 |
| Supabase | ^2.105 |
| React Native Reanimated | ~4.1 |
| React Native SVG | 15.12 |
| NativeWind (Tailwind) | ^4.2 |

---

## Funkcionalnosti

- **Feed** — pregled tradova svih korisnika, filtriranje po najnovijim, praćenima i najpopularnijim
- **Novi trad** — unos simbola, smera (buy/sell), profita/gubitka, entry i exit cene, i napomene
- **Explore** — pretraga tradera, praćenje korisnika, market news
- **Macro** — US ekonomski indikatori u realnom vremenu (GDP, CPI, Fed Funds Rate, 10Y Treasury, Unemployment)
- **Profil** — lični statistike, ukupan P&L, win rate, istorija tradova
- **Komentari i lajkovi** — interakcija na postovima
- **Autentikacija** — registracija i prijava putem Supabase Auth

---

## Struktura projekta

```
ticksnap/
├── app/
│   ├── index.tsx              # Splash / redirect
│   ├── _layout.tsx            # Root layout, AuthProvider
│   ├── (auth)/
│   │   ├── welcome.tsx        # Uvodni ekran
│   │   ├── login.tsx          # Prijava
│   │   └── register.tsx       # Registracija
│   ├── (tabs)/
│   │   ├── popular.tsx        # Feed tradova
│   │   ├── search.tsx         # Explore / pretraga
│   │   ├── forecast.tsx       # Novi trad
│   │   ├── macro.tsx          # Makro indikatori
│   │   └── profile.tsx        # Profil korisnika
│   └── user-profile.tsx       # Tuđi profil
├── components/
│   ├── ForecastCard.tsx        # Kartica trada u feedu
│   ├── TradeDetailsModal.tsx   # Modal sa detaljima trada
│   ├── ProfilePreviewSheet.tsx # Bottom sheet pregled profila
│   ├── Avatar.tsx              # Avatar komponenta
│   └── CandlestickChart.tsx    # SVG grafikon svećnjaka
├── lib/
│   ├── supabase.ts             # Supabase klijent
│   ├── auth.tsx                # Auth context i hook
│   ├── syncUser.ts             # Sinhronizacija korisnika u bazu
│   ├── fred.ts                 # FRED API (makro podaci)
│   ├── finnhub.ts              # Finnhub API (market news)
│   ├── news.ts                 # Alpha Vantage news
│   ├── forex.ts                # Forex kursevi
│   ├── comments.ts             # CRUD za komentare
│   ├── uploadImage.ts          # Upload slike na Supabase Storage
│   └── storage.ts              # Cross-platform storage helper
├── supabase/
│   └── schema.sql              # SQL shema baze podataka
└── constants/
    └── Colors.ts               # Paleta boja
```

---

## Baza podataka

Shema se pokreće u **Supabase Dashboard → SQL Editor** pokretanjem fajla `supabase/schema.sql`.

Tabele:

| Tabela | Opis |
|---|---|
| `users` | Korisnici (id je Supabase Auth UID) |
| `trades` | Tradovi (simbol, tip, P&L, napomene, slika) |
| `likes` | Lajkovi (jedan po korisniku po tradu) |
| `comments` | Komentari na tradove |
| `follows` | Praćenje korisnika |

---

## Pokretanje lokalno

### Preduslovi

- Node.js >= 18
- Expo CLI
- Supabase projekat (besplatan nalog na [supabase.com](https://supabase.com))

### Koraci

1. Kloniraj repozitorijum:
   ```bash
   git clone https://github.com/djordjeradosav/Mobilno.git
   cd Mobilno
   ```

2. Instaliraj zavisnosti:
   ```bash
   npm install
   ```

3. Kreiraj `.env` fajl u korenu projekta:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=tvoj_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tvoj_anon_key
   EXPO_PUBLIC_FINNHUB_KEY=tvoj_finnhub_key
   EXPO_PUBLIC_ALPHA_VANTAGE_KEY=tvoj_alpha_vantage_key
   EXPO_PUBLIC_FRED_API_KEY=tvoj_fred_key
   ```

4. Pokreni aplikaciju:
   ```bash
   npx expo start
   ```

---

## API ključevi

| Servis | Gde se registrovati | Za šta se koristi |
|---|---|---|
| Supabase | [supabase.com](https://supabase.com) | Baza podataka i autentikacija |
| Finnhub | [finnhub.io](https://finnhub.io) | Market news |
| Alpha Vantage | [alphavantage.co](https://www.alphavantage.co) | Forex kursevi i news sentiment |
| FRED | [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/fred) | US makroekonomski podaci |

> Aplikacija radi i bez API ključeva — sve funkcije imaju fallback na mock podatke.

---

## Autor

**Đorđe Radosavljević**  
GitHub: [@djordjeradosav](https://github.com/djordjeradosav)
