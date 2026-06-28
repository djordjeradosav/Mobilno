# Detaljna Dokumentacija Koda za Mobilnu Aplikaciju Ticksnap

Ovaj dokument pruža detaljan pregled koda mobilne aplikacije Ticksnap, objašnjavajući njenu strukturu, ključne komponente, funkcionalnosti i način na koji se različiti delovi koda integrišu i sarađuju.

## 1. Uvod

Ticksnap je mobilna aplikacija razvijena korišćenjem React Native-a, Expo-a i TypeScript-a, sa Supabase-om kao backend servisom za autentifikaciju, bazu podataka i skladištenje fajlova. Aplikacija omogućava korisnicima da prate finansijska tržišta, objavljuju prognoze (forecasts) sa grafikonima, lajkuju i komentarišu tuđe prognoze, kao i da prate druge korisnike.

## 2. Struktura Projekta

Projekat je organizovan u nekoliko ključnih direktorijuma, svaki sa specifičnom ulogom:

-   `app/`: Sadrži glavne ekrane i navigacionu strukturu aplikacije. Podeljen je na poddirektorijume za autentifikaciju (`(auth)`) i glavne tabove (`(tabs)`).
-   `components/`: Sadrži React Native komponente za višekratnu upotrebu, kao što su `ForecastCard`, `CandlestickChart`, `Avatar`, itd.
-   `lib/`: Sadrži pomoćne funkcije i servise za interakciju sa eksternim API-jima (Finnhub, FRED, News), Supabase-om, autentifikacijom i skladištenjem.
-   `constants/`: Definiše konstante kao što su boje (`Colors.ts`).
-   `assets/`: Sadrži statičke resurse poput fontova i slika.
-   `supabase/`: Sadrži SQL šemu za Supabase bazu podataka (`schema.sql`).

## 3. Ključne Tehnologije i Biblioteke

-   **React Native & Expo**: Za razvoj mobilne aplikacije za iOS i Android.
-   **TypeScript**: Za tipizirani JavaScript, poboljšavajući održivost i smanjujući greške.
-   **Supabase**: Kompletan backend-as-a-service (BaaS) koji pruža:
    -   **Autentifikaciju**: Upravljanje korisnicima i sesijama.
    -   **PostgreSQL Baza Podataka**: Za skladištenje podataka o korisnicima, prognozama, lajkovima, komentarima i praćenjima.
    -   **Supabase Storage**: Za skladištenje slika (npr. grafikona prognoza).
    -   **Realtime**: Za ažuriranje podataka u realnom vremenu.
-   **Finnhub API**: Za finansijske podatke (cene akcija, forex, itd.).
-   **FRED API**: Za ekonomske podatke (Federal Reserve Economic Data).
-   **News API**: Za vesti vezane za finansije.
-   **Clerk**: Za autentifikaciju korisnika (iako `supabase/schema.sql` pominje Clerk ID-je, `lib/auth.tsx` implementira Supabase autentifikaciju).

## 4. Detaljan Opis Modula i Funkcija

### 4.1. `lib/` Direktorijum

Ovaj direktorijum sadrži logiku za interakciju sa backend servisima i eksternim API-jima.

#### `lib/supabase.ts`

Ovo je centralni fajl za inicijalizaciju i interakciju sa Supabase klijentom. Izvozi `supabase` objekat koji sadrži metode za autentifikaciju (`auth`), rad sa tabelama (`from`), pozivanje RPC funkcija (`rpc`) i skladištenje fajlova (`storage`).

-   `auth`: Omogućava prijavu, registraciju, upravljanje sesijama i odjavu korisnika.
-   `from(tableName)`: Metoda za izvođenje CRUD operacija (Create, Read, Update, Delete) nad tabelama u bazi podataka (npr. `users`, `forecasts`, `likes`, `comments`, `follows`).
-   `rpc(functionName, params)`: Za pozivanje prilagođenih SQL funkcija definisanih u Supabase bazi podataka (npr. `increment_likes`, `decrement_likes`).
-   `storage`: Omogućava upload i preuzimanje fajlova iz Supabase Storage bucket-a.
    -   `from(bucketName)`: Selektuje specifičan bucket.
    -   `upload(path, file, options)`: Upload-uje fajl u navedeni bucket. Prihvata `Blob` objekat i opcije kao što su `contentType` i `upsert`.
    -   `getPublicUrl(path)`: Generiše javni URL za fajl u public bucket-u.

#### `lib/auth.tsx`

Definiše kontekst za autentifikaciju (`AuthContext`) i `AuthProvider` komponentu koja upravlja stanjem korisnika (prijavljen/odjavljen) i sesijama. Koristi `supabase.auth` za interakciju sa Supabase autentifikacionim servisom.

-   `useAuth()`: Hook za pristup autentifikacionom kontekstu, pružajući pristup korisničkim podacima i funkcijama za prijavu/registraciju/odjavu.
-   `signInWithEmail(email, password)`: Funkcija za prijavu korisnika putem emaila i lozinke.
-   `signUpWithEmail(email, password)`: Funkcija za registraciju novog korisnika putem emaila i lozinke.
-   `signOut()`: Funkcija za odjavu korisnika.

#### `lib/syncUser.ts`

Funkcija `syncUserToSupabase(userId, username, email)` sinhronizuje podatke novoregistrovanog ili prijavljenog korisnika iz autentifikacionog sistema (npr. Clerk ili Supabase Auth) u `public.users` tabelu u Supabase bazi podataka. Koristi `upsert` operaciju kako bi se osiguralo da korisnik postoji u bazi, ili da se njegovi podaci ažuriraju ako već postoji.

#### `lib/uploadImage.ts`

Funkcija `uploadForecastImage(uri, userId)` je zadužena za upload slika grafikona prognoza u Supabase Storage. Prima URI slike (npr. iz Expo Image Picker-a) i ID korisnika, konvertuje URI u `Blob` i upload-uje ga u `forecasts` bucket. Vraća javni URL upload-ovane slike.

#### `lib/comments.ts`

Sadrži funkcije za interakciju sa tabelom `public.comments` u Supabase bazi podataka.

-   `getCommentsForForecast(forecastId)`: Preuzima sve komentare za određenu prognozu.
-   `addComment(forecastId, userId, content)`: Dodaje novi komentar na prognozu.
-   `deleteComment(commentId)`: Briše komentar.

#### `lib/finnhub.ts`, `lib/forex.ts`, `lib/fred.ts`, `lib/news.ts`

Ovi fajlovi sadrže funkcije za interakciju sa eksternim finansijskim API-jima. Oni su odgovorni za preuzimanje podataka o akcijama, valutama, ekonomskim indikatorima i vestima. Svaki modul verovatno sadrži funkcije za dohvaćanje specifičnih tipova podataka (npr. `getQuote`, `getCandles`, `getForexRates`, `getEconomicData`, `getNews`).

#### `lib/storage.ts`

Ovaj fajl verovatno sadrži pomoćne funkcije za rad sa lokalnim skladištem (npr. `AsyncStorage` u React Native-u) za čuvanje korisničkih preferenci ili tokena. (Na osnovu `universalStorage` u `ThemeContext.tsx`, ovo bi moglo biti apstrakcija za lokalno skladište).

### 4.2. `app/` Direktorijum

Ovaj direktorijum sadrži glavne ekrane i navigacionu logiku aplikacije.

#### `app/_layout.tsx`

Definiše globalni layout aplikacije i navigacionu strukturu. Verovatno koristi Expo Router za definisanje ruta i layout-a za autentifikacione ekrane i glavne tabove. Takođe može da inicijalizuje globalne provajdere kao što je `ThemeProvider`.

#### `app/index.tsx`

Početni ekran aplikacije, koji može da služi kao redirect ka autentifikacionim ekranima ili glavnim tabovima, u zavisnosti od toga da li je korisnik prijavljen.

#### `app/(auth)/` Direktorijum

Sadrži ekrane vezane za autentifikaciju.

-   `_layout.tsx`: Layout za autentifikacione ekrane.
-   `login.tsx`: Ekran za prijavu korisnika.
-   `register.tsx`: Ekran za registraciju novog korisnika.
-   `welcome.tsx`: Ekran dobrodošlice nakon registracije ili prijave.

#### `app/(tabs)/` Direktorijum

Sadrži ekrane koji su deo glavne navigacije putem tabova.

-   `_layout.tsx`: Layout za tab navigaciju.
-   `forecast.tsx`: Ekran za prikaz prognoza.
-   `macro.tsx`: Ekran za prikaz makroekonomskih podataka (verovatno koristi FRED API).
-   `popular.tsx`: Ekran za prikaz popularnih prognoza.
-   `profile.tsx`: Korisnički profil.
-   `search.tsx`: Ekran za pretragu.

#### `app/post-forecast.tsx`

Ekran na kojem korisnici mogu da kreiraju i objavljuju nove prognoze. Verovatno uključuje formu za unos teksta, izbor valutnog para i opciju za upload slike grafikona (koristeći `uploadForecastImage` iz `lib/uploadImage.ts`).

#### `app/user-profile.tsx`

Ekran za prikaz profila drugog korisnika, sa opcijama za praćenje/otpraćivanje i pregled njihovih prognoza.

#### `app/settings/index.tsx`

Ekran sa podešavanjima aplikacije, gde korisnici mogu da menjaju teme, upravljaju nalogom, itd.

### 4.3. `components/` Direktorijum

Sadrži React Native komponente za višekratnu upotrebu.

#### `components/ForecastCard.tsx`

Komponenta za prikaz pojedinačne prognoze. Prikazuje korisničke informacije, sadržaj prognoze, sliku grafikona, valutni par, profit, broj lajkova i komentara. Verovatno sadrži logiku za lajkovanje/dislajkovanje i otvaranje modala za komentare.

#### `components/CandlestickChart.tsx`

Komponenta za prikaz candlestick grafikona. Verovatno prima podatke o cenama (OHLCV) i renderuje ih koristeći neku biblioteku za grafikone (npr. `react-native-svg-charts` ili slično).

#### `components/ThemeContext.tsx`

Definiše kontekst za upravljanje temama (svetla/tamna/sistemska) u aplikaciji. `ThemeProvider` komponenta pruža trenutnu temu i funkciju za promenu teme. `useTheme()` hook omogućava komponentama da pristupe temi.

#### `components/Avatar.tsx`

Komponenta za prikaz korisničkog avatara.

#### `components/EditScreenInfo.tsx`, `components/ExternalLink.tsx`, `components/StyledText.tsx`, `components/Themed.tsx`, `components/TradeDetailsModal.tsx`, `components/ProfilePreviewSheet.tsx`, `components/userPreviewCard.tsx`

Ostale pomoćne komponente za prikaz informacija, linkova, stilizovanog teksta, modala i kartica za pregled profila.

#### `components/useColorScheme.ts`, `components/useClientOnlyValue.ts`

Hooks za rad sa šemom boja sistema i uslovnim renderovanjem koda samo na klijentskoj strani.

### 4.4. `supabase/schema.sql`

Ovaj fajl definiše kompletnu SQL šemu za Supabase bazu podataka. Ključne tabele su:

-   `public.users`: Skladišti korisničke podatke (ID, korisničko ime, email, avatar_url, member_since, subscription_tier, is_verified).
-   `public.forecasts`: Skladišti podatke o prognozama (ID, user_id, content, chart_image_url, currency_pair, profit, likes_count, created_at).
-   `public.likes`: Povezuje korisnike sa prognozama koje su lajkovali.
-   `public.comments`: Skladišti komentare na prognoze.
-   `public.follows`: Povezuje korisnike koji prate jedni druge.

Definiše i SQL funkcije (`increment_likes`, `decrement_likes`) za ažuriranje broja lajkova, kao i politike Row Level Security (RLS) i konfiguraciju za Supabase Storage bucket `forecasts`.

## 5. Kako Sve Funkcioniše Zajedno (Arhitektura i Tok Podataka)

Ticksnap aplikacija sledi arhitekturu klijent-server, gde je mobilna aplikacija klijent, a Supabase služi kao backend. Evo kako se različiti delovi integrišu:

1.  **Autentifikacija**: Korisnici se prijavljuju ili registruju putem ekrana u `app/(auth)/`. `lib/auth.tsx` i `lib/supabase.ts` upravljaju procesom autentifikacije sa Supabase Auth servisom. Nakon uspešne prijave/registracije, `lib/syncUser.ts` osigurava da korisnički podaci budu sinhronizovani sa `public.users` tabelom u bazi podataka.

2.  **Kreiranje Prognoze**: Korisnik na `app/post-forecast.tsx` ekranu unosi detalje prognoze i može da upload-uje sliku grafikona. `lib/uploadImage.ts` šalje sliku u Supabase Storage, a zatim se podaci o prognozi (uključujući URL slike) čuvaju u `public.forecasts` tabeli putem `supabase.from("forecasts").insert()` metode.

3.  **Prikaz Prognoza**: Na ekranima kao što su `app/(tabs)/forecast.tsx` ili `app/(tabs)/popular.tsx`, aplikacija preuzima prognoze iz `public.forecasts` tabele koristeći `supabase.from("forecasts").select()`. Svaka prognoza se prikazuje pomoću `components/ForecastCard.tsx` komponente.

4.  **Lajkovi i Komentari**: Kada korisnik lajkuje prognozu, aplikacija poziva `supabase.rpc("increment_likes", { forecast_id: ... })` i dodaje unos u `public.likes` tabelu. Komentari se dodaju i preuzimaju putem funkcija u `lib/comments.ts`, koje komuniciraju sa `public.comments` tabelom.

5.  **Finansijski Podaci**: Ekrani kao što su `app/(tabs)/macro.tsx` ili `app/(tabs)/search.tsx` koriste funkcije iz `lib/finnhub.ts`, `lib/forex.ts`, `lib/fred.ts` i `lib/news.ts` za dohvaćanje i prikaz relevantnih finansijskih i ekonomskih podataka.

6.  **Upravljanje Temama**: `components/ThemeContext.tsx` omogućava korisnicima da biraju između svetle, tamne ili sistemske teme, što utiče na izgled cele aplikacije.

7.  **Realtime Ažuriranja**: Zahvaljujući Supabase Realtime funkcionalnosti (konfigurisanoj u `supabase/schema.sql`), promene u tabelama `forecasts`, `comments` i `likes` mogu se automatski propagirati do povezanih klijenata, omogućavajući ažuriranje UI-ja u realnom vremenu bez potrebe za ručnim osvežavanjem.

## 6. Zaključak

Ticksnap je dobro strukturirana mobilna aplikacija koja efikasno koristi moderne tehnologije kao što su React Native, Expo, TypeScript i Supabase za pružanje bogatog korisničkog iskustva. Modularni dizajn, sa jasnom podelom odgovornosti između `app/`, `components/` i `lib/` direktorijuma, olakšava razvoj, održavanje i skaliranje aplikacije. Supabase kao backend pruža robustnu i skalabilnu infrastrukturu za autentifikaciju, bazu podataka i skladištenje, dok integracija sa eksternim finansijskim API-jima obogaćuje funkcionalnost aplikacije relevantnim podacima.

## 7. Nova Funkcionalnost: Izmena Slike Prognoze

Uvedena je mogućnost izmene ili brisanja slike grafikona za već postojeće prognoze.

### 7.1. Backend Logika (`lib/updateTradeImage.ts`)

Dodat je novi modul `updateTradeImage.ts` koji sadrži:
- `updateTradeImage(tradeId, uri, userId)`: Funkcija koja preuzima staru sliku, briše je iz Supabase Storage-a, upload-uje novu sliku i ažurira URL u bazi podataka.
- `deleteTradeImage(tradeId)`: Funkcija koja briše sliku iz Storage-a i postavlja `chart_image_url` na `null` u bazi podataka.

### 7.2. UI Promene (`components/TradeDetailsModal.tsx`)

Ekran za editovanje prognoze (unutar `TradeDetailsModal`) je proširen:
- Dodata je sekcija "Chart Image" koja se pojavljuje u modu za editovanje.
- Korisnik može da izabere novu sliku iz galerije koristeći `expo-image-picker`.
- Prikazuje se pregled izabrane slike pre uploada.
- Dodato je dugme "Upload New Chart" koje pokreće proces ažuriranja.
- Dodato je dugme "Remove Current Chart" koje omogućava brisanje postojeće slike bez dodavanja nove.
- Implementirani su indikatori učitavanja (`ActivityIndicator`) tokom procesa uploada.
