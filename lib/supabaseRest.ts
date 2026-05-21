/**
 * ============================================================================
 * SUPABASE REST KLIJENT — lib/supabaseRest.ts
 * ============================================================================
 *
 * Ovaj fajl zamenjuje zvanični @supabase/supabase-js SDK.
 * Umesto gotove biblioteke, aplikacija direktno šalje HTTP zahteve (fetch)
 * ka Supabase REST endpoint-ima.
 *
 * ZAŠTO REST?
 * - Manje zavisnosti u bundle-u
 * - Potpuna kontrola nad HTTP zahtevima
 * - Isti API kao SDK (supabase.from, supabase.auth, ...) pa ostatak koda
 *   ne mora da se menja
 *
 * TRI SUPABASE API-ja (sve pod istim baznim URL-om):
 *
 *   1) GoTrue (autentifikacija)     →  {SUPABASE_URL}/auth/v1/...
 *   2) PostgREST (baza podataka)    →  {SUPABASE_URL}/rest/v1/...
 *   3) Storage (fajlovi/slike)      →  {SUPABASE_URL}/storage/v1/...
 *
 * OBAVEZNI HEADERI na svakom zahtevu:
 *   - apikey: EXPO_PUBLIC_SUPABASE_ANON_KEY  (javni ključ projekta)
 *   - Authorization: Bearer <access_token>   (samo kad je korisnik ulogovan)
 *
 * ENV promenljive (iz .env fajla):
 *   EXPO_PUBLIC_SUPABASE_URL      npr. https://xxxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY JWT anon ključ iz Supabase Dashboard → Settings → API
 */

import { universalStorage } from './storage';

// Bazni URL bez trailing slash-a; sve putanje se nadovezuju na njega
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ID projekta iz URL-a (npr. "khxcvfwsrkupsuttrbyl") — koristi se za ključ u storage-u
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'supabase';

// Ključ pod kojim čuvamo sesiju lokalno (isti format kao stari supabase-js SDK)
const AUTH_STORAGE_KEY = `sb-${projectRef}-auth-token`;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOVI — strukture podataka koje vraća Supabase Auth i koje app koristi
// ─────────────────────────────────────────────────────────────────────────────

/** Korisnik iz GoTrue Auth API-ja (posle login/register) */
export type User = {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>; // npr. username iz registracije
    app_metadata?: Record<string, unknown>;
    [key: string]: unknown;
};

/**
 * Sesija = access_token + refresh_token + korisnik.
 * access_token se šalje kao Bearer token na /rest/v1 i /storage/v1.
 * refresh_token služi da se dobije novi access_token kad istekne.
 */
export type Session = {
    access_token: string;
    refresh_token: string;
    expires_in: number;       // sekundi do isteka access tokena
    expires_at?: number;      // Unix timestamp — računamo lokalno pri čuvanju
    token_type: string;       // obično "bearer"
    user: User;
};

/** Odgovor GoTrue API-ja na login/signup/refresh */
type AuthResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: User;
};

/** Standardizovana greška — kompatibilna sa starim SDK formatom { error: { message } } */
type ApiError = { message: string; code?: string; status?: number };

/** Rezultat database upita — uvek { data, error }, opciono count za HEAD upite */
type QueryResult<T> = { data: T | null; error: ApiError | null; count?: number | null };

// ─────────────────────────────────────────────────────────────────────────────
// LOKALNO ČUVANJE SESIJE
// ─────────────────────────────────────────────────────────────────────────────
// Sesija se drži u memoriji (cachedSession) i u universalStorage (AsyncStorage
// na webu = localStorage). Pri svakom pokretanju app-a učitavamo token odatle.

let cachedSession: Session | null = null;

/** Listeneri koje auth.tsx registruje — obaveštavaju UI kad se korisnik uloguje/izloguje */
const authListeners = new Set<(event: string, session: Session | null) => void>();

/**
 * Učitava sesiju: prvo iz RAM keša, pa iz storage-a.
 * Ne proverava da li je token još validan na serveru — to radi getSession().
 */
async function loadSession(): Promise<Session | null> {
    if (cachedSession) return cachedSession;
    const raw = await universalStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
        cachedSession = JSON.parse(raw) as Session;
        return cachedSession;
    } catch {
        return null;
    }
}

/**
 * Čuva ili briše sesiju lokalno i obaveštava sve auth listenere.
 * expires_at = sada + expires_in (za automatski refresh pre isteka).
 */
async function saveSession(session: Session | null): Promise<void> {
    cachedSession = session;
    if (session) {
        const expiresAt = Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
        session.expires_at = expiresAt;
        await universalStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
        await universalStorage.removeItem(AUTH_STORAGE_KEY);
    }
    authListeners.forEach((cb) => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session));
}

/** Eksplicitno obaveštavanje (npr. posle uspešnog logina) */
function notifyAuth(session: Session | null, event = 'SIGNED_IN') {
    authListeners.forEach((cb) => cb(event, session));
}

/**
 * Vraća važeći access_token za zahteve ka bazi/storage-u.
 * Ako token ističe za manje od 60s, poziva refresh preko refresh_token-a.
 */
async function getAccessToken(): Promise<string | null> {
    const session = await loadSession();
    if (!session?.access_token) return null;

    const now = Math.floor(Date.now() / 1000);
    // Još uvek važi (sa 60s marginom)
    if (session.expires_at && session.expires_at - 60 > now) {
        return session.access_token;
    }

    if (!session.refresh_token) return session.access_token;

    const refreshed = await refreshSession(session.refresh_token);
    return refreshed?.access_token ?? session.access_token;
}

/**
 * POST /auth/v1/token?grant_type=refresh_token
 * Dobija novi par tokena; pri neuspehu briše lokalnu sesiju (korisnik mora ponovo login).
 */
async function refreshSession(refreshToken: string): Promise<Session | null> {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: baseHeaders(),
        body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
        await saveSession(null);
        return null;
    }
    const auth = body as AuthResponse;
    const session: Session = {
        access_token: auth.access_token,
        refresh_token: auth.refresh_token,
        expires_in: auth.expires_in,
        token_type: auth.token_type,
        user: auth.user,
    };
    await saveSession(session);
    return session;
}

/** Headeri za javne auth rute (login, signup, refresh) — samo apikey, bez Bearer-a */
function baseHeaders(): Record<string, string> {
    return {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
    };
}

/** Headeri za zaštićene rute — apikey + Bearer access_token (ako postoji sesija) */
async function authHeaders(): Promise<Record<string, string>> {
    const token = await getAccessToken();
    return {
        ...baseHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/** Bezbedno parsira JSON telo odgovora; prazan body → null */
async function parseJson(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

/** Mapira HTTP grešku u { message, code } format koji očekuje UI (Alert.alert itd.) */
function toError(res: Response, body: unknown): ApiError {
    const b = (body ?? {}) as Record<string, unknown>;
    const msg =
        (typeof b.msg === 'string' && b.msg) ||
        (typeof b.message === 'string' && b.message) ||
        (typeof b.error_description === 'string' && b.error_description) ||
        (typeof b.error === 'string' && b.error) ||
        res.statusText ||
        'Request failed';
    return {
        message: msg,
        code: typeof b.error_code === 'string' ? b.error_code : typeof b.code === 'string' ? b.code : undefined,
        status: res.status,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH API — GoTrue (/auth/v1)
// Koriste: login.tsx, register.tsx, lib/auth.tsx
// ─────────────────────────────────────────────────────────────────────────────

const auth = {
    /**
     * Proverava da li postoji aktivna sesija.
     * 1) Učita token iz storage-a
     * 2) GET /auth/v1/user — server potvrđuje da token važi
     * 3) Pri 401 pokušava refresh_token
     */
    async getSession(): Promise<{ data: { session: Session | null }; error: ApiError | null }> {
        try {
            const session = await loadSession();
            if (!session) return { data: { session: null }, error: null };

            const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: await authHeaders(),
            });
            if (res.status === 401) {
                const refreshed = session.refresh_token
                    ? await refreshSession(session.refresh_token)
                    : null;
                return { data: { session: refreshed }, error: null };
            }
            if (!res.ok) {
                const body = await parseJson(res);
                if (res.status >= 400) await saveSession(null);
                return { data: { session: null }, error: toError(res, body) };
            }
            const user = (await parseJson(res)) as User;
            const updated: Session = { ...session, user };
            await saveSession(updated);
            return { data: { session: updated }, error: null };
        } catch (e: unknown) {
            return { data: { session: null }, error: { message: (e as Error).message ?? 'Unknown error' } };
        }
    },

    /**
     * Pretplata na promene auth stanja (kao supabase.auth.onAuthStateChange).
     * AuthProvider u lib/auth.tsx koristi ovo da ažurira React state.
     * unsubscribe() uklanja listener pri unmount-u.
     */
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        authListeners.add(callback);
        loadSession().then((s) => callback(s ? 'INITIAL_SESSION' : 'INITIAL_SESSION', s));
        return {
            data: {
                subscription: {
                    unsubscribe: () => authListeners.delete(callback),
                },
            },
        };
    },

    /**
     * Login email + lozinka.
     * POST /auth/v1/token?grant_type=password
     * Telo: { email, password }
     */
    async signInWithPassword(credentials: {
        email: string;
        password: string;
    }): Promise<{ data: { session: Session | null; user: User | null }; error: ApiError | null }> {
        try {
            const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: baseHeaders(),
                body: JSON.stringify({
                    email: credentials.email,
                    password: credentials.password,
                }),
            });
            const body = await parseJson(res);
            if (!res.ok) return { data: { session: null, user: null }, error: toError(res, body) };

            const authData = body as AuthResponse;
            const session: Session = {
                access_token: authData.access_token,
                refresh_token: authData.refresh_token,
                expires_in: authData.expires_in,
                token_type: authData.token_type,
                user: authData.user,
            };
            await saveSession(session);
            notifyAuth(session);
            return { data: { session, user: authData.user }, error: null };
        } catch (e: unknown) {
            return { data: { session: null, user: null }, error: { message: (e as Error).message ?? 'Unknown error' } };
        }
    },

    /**
     * Registracija novog naloga.
     * POST /auth/v1/signup
     * options.data → user_metadata (username, full_name u register.tsx)
     * Ako je uključena email potvrda, access_token može da ne stigne odmah.
     */
    async signUp(params: {
        email: string;
        password: string;
        options?: { data?: Record<string, unknown> };
    }): Promise<{ data: { user: User | null; session: Session | null }; error: ApiError | null }> {
        try {
            const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
                method: 'POST',
                headers: baseHeaders(),
                body: JSON.stringify({
                    email: params.email,
                    password: params.password,
                    data: params.options?.data ?? {},
                }),
            });
            const body = await parseJson(res);
            if (!res.ok) return { data: { user: null, session: null }, error: toError(res, body) };

            const authData = body as AuthResponse;
            const user = authData.user ?? (body as { user?: User }).user ?? null;
            let session: Session | null = null;
            if (authData.access_token) {
                session = {
                    access_token: authData.access_token,
                    refresh_token: authData.refresh_token,
                    expires_in: authData.expires_in,
                    token_type: authData.token_type,
                    user: user!,
                };
                await saveSession(session);
                notifyAuth(session);
            }
            return { data: { user, session }, error: null };
        } catch (e: unknown) {
            return { data: { user: null, session: null }, error: { message: (e as Error).message ?? 'Unknown error' } };
        }
    },

    /**
     * Odjava: POST /auth/v1/logout + brisanje lokalne sesije.
     * Čak i ako mreža padne, lokalni token se uvek briše.
     */
    async signOut(): Promise<{ error: ApiError | null }> {
        try {
            const headers = await authHeaders();
            await fetch(`${supabaseUrl}/auth/v1/logout`, {
                method: 'POST',
                headers,
            });
        } catch {
            // ignoriši mrežnu grešku — lokalno ipak čistimo sesiju
        }
        await saveSession(null);
        notifyAuth(null, 'SIGNED_OUT');
        return { error: null };
    },

    /**
     * Slanje mejla za reset lozinke.
     * POST /auth/v1/recover
     */
    async resetPasswordForEmail(email: string, options?: { redirectTo?: string }): Promise<{ data: unknown; error: ApiError | null }> {
        try {
            const res = await fetch(`${supabaseUrl}/auth/v1/recover`, {
                method: 'POST',
                headers: baseHeaders(),
                body: JSON.stringify({ email, redirectTo: options?.redirectTo }),
            });
            const body = await parseJson(res);
            if (!res.ok) return { data: null, error: toError(res, body) };
            return { data: body, error: null };
        } catch (e: unknown) {
            return { data: null, error: { message: (e as Error).message ?? 'Unknown error' } };
        }
    },

    /**
     * Ažuriranje korisničkih podataka (npr. lozinke).
     * PUT /auth/v1/user
     */
    async updateUser(attributes: { password?: string; data?: Record<string, unknown> }): Promise<{ data: { user: User | null }; error: ApiError | null }> {
        try {
            const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
                method: 'PUT',
                headers: await authHeaders(),
                body: JSON.stringify(attributes),
            });
            const body = await parseJson(res);
            if (!res.ok) return { data: { user: null }, error: toError(res, body) };
            return { data: { user: body as User }, error: null };
        } catch (e: unknown) {
            return { data: { user: null }, error: { message: (e as Error).message ?? 'Unknown error' } };
        }
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// POSTGREST QUERY BUILDER — /rest/v1/{tabela}
//
// Lančani API (kao supabase-js):
//   supabase.from('trades').select('*').eq('user_id', id).order('created_at', { ascending: false })
//
// Filteri u URL query string-u PostgREST sintakse:
//   id=eq.abc123
//   symbol=ilike.%EUR%
//   or=(username.ilike.%foo%,email.ilike.%foo%)
//
// Klasa implementira .then() — može se await-ovati kao Promise.
// ─────────────────────────────────────────────────────────────────────────────

/** Jedan filter: kolona + operator + vrednost */
type FilterOp = { col: string; op: string; val: string };

class RestQueryBuilder<T = unknown> {
    private table: string;
    private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'HEAD' = 'GET';
    private selectCols = '*';
    private filters: FilterOp[] = [];
    private orFilter = '';
    private orderCol = '';
    private orderAsc = true;
    private limitN: number | null = null;
    private body: unknown = null;
    /** PostgREST Prefer header: return=representation, count=exact, resolution=merge-duplicates... */
    private prefer: string[] = [];
    private returnSingle = false;
    private returnMaybeSingle = false;
    private countExact = false;
    private headOnly = false;
    /** Za upsert: on_conflict=id */
    private onConflict = '';

    constructor(table: string) {
        this.table = table;
    }

    /**
     * Kolone za SELECT (može i join sintaksa):
     *   select('*, users(username, avatar_url)')
     * Opcije:
     *   { count: 'exact', head: true } → HEAD zahtev, broj redova u Content-Range headeru
     */
    select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
        this.selectCols = columns;
        if (options?.count === 'exact') {
            this.countExact = true;
            this.prefer.push('count=exact');
        }
        if (options?.head) {
            this.headOnly = true;
            this.method = 'HEAD';
        } else if (this.method === 'POST' || this.method === 'PATCH') {
            if (!this.prefer.includes('return=representation')) {
                this.prefer.push('return=representation');
            }
        }
        return this;
    }

    /** INSERT — POST sa JSON telom */
    insert(values: unknown) {
        this.method = 'POST';
        this.body = values;
        this.prefer.push('return=representation');
        return this;
    }

    /** UPSERT — POST + Prefer: resolution=merge-duplicates + ?on_conflict=kolona */
    upsert(values: unknown, options?: { onConflict?: string }) {
        this.method = 'POST';
        this.body = values;
        this.preConflict(options?.onConflict ?? 'id');
        this.prefer.push('return=representation', 'resolution=merge-duplicates');
        return this;
    }

    private preConflict(col: string) {
        this.onConflict = col;
    }

    /** UPDATE — PATCH (mora imati bar jedan .eq filter) */
    update(values: unknown) {
        this.method = 'PATCH';
        this.body = values;
        this.prefer.push('return=representation');
        return this;
    }

    /** DELETE — DELETE metoda */
    delete() {
        this.method = 'DELETE';
        return this;
    }

    /** filter: kolona=eq.vrednost */
    eq(column: string, value: string | number | boolean) {
        this.filters.push({ col: column, op: 'eq', val: String(value) });
        return this;
    }

    /** case-insensitive LIKE: kolona=ilike.%pattern% */
    ilike(column: string, pattern: string) {
        this.filters.push({ col: column, op: 'ilike', val: pattern });
        return this;
    }

    /** IN lista: kolona=in.(a,b,c) */
    in(column: string, values: (string | number)[]) {
        this.filters.push({ col: column, op: 'in', val: `(${values.join(',')})` });
        return this;
    }

    /** OR filter: or=(username.ilike.%x%,email.ilike.%x%) */
    or(expression: string) {
        this.orFilter = expression;
        return this;
    }

    /** sortiranje: order=created_at.desc */
    order(column: string, options?: { ascending?: boolean }) {
        this.orderCol = column;
        this.orderAsc = options?.ascending !== false;
        return this;
    }

    limit(n: number) {
        this.limitN = n;
        return this;
    }

    /** Tačno jedan red — Accept: application/vnd.pgrst.object+json */
    single() {
        this.returnSingle = true;
        this.prefer.push('return=representation');
        return this;
    }

    /** Nula ili jedan red — 406 se tretira kao null bez greške */
    maybeSingle() {
        this.returnMaybeSingle = true;
        this.prefer.push('return=representation');
        return this;
    }

    /** Sastavlja finalni URL sa svim query parametrima */
    private buildUrl(): string {
        const params = new URLSearchParams();
        const needsSelect =
            this.method === 'GET' ||
            this.method === 'HEAD' ||
            this.method === 'PATCH' ||
            this.method === 'DELETE' ||
            (this.method === 'POST' && this.prefer.includes('return=representation'));
        if (needsSelect) {
            params.set('select', this.selectCols);
        }
        for (const f of this.filters) {
            params.append(f.col, `${f.op}.${f.val}`);
        }
        if (this.orFilter) params.set('or', `(${this.orFilter})`);
        if (this.orderCol) {
            params.set('order', `${this.orderCol}.${this.orderAsc ? 'asc' : 'desc'}`);
        }
        if (this.limitN != null) params.set('limit', String(this.limitN));
        if (this.onConflict) params.set('on_conflict', this.onConflict);
        const qs = params.toString();
        return `${supabaseUrl}/rest/v1/${this.table}${qs ? `?${qs}` : ''}`;
    }

    /** Izvršava fetch i vraća { data, error, count? } */
    private async execute(): Promise<QueryResult<T>> {
        try {
            const url = this.buildUrl();
            const headers: Record<string, string> = {
                ...(await authHeaders()),
                ...(this.prefer.length ? { Prefer: this.prefer.join(',') } : {}),
            };

            if (this.returnSingle || this.returnMaybeSingle) {
                headers.Accept = 'application/vnd.pgrst.object+json';
            }

            const init: RequestInit = { method: this.method, headers };
            if (this.body != null && (this.method === 'POST' || this.method === 'PATCH')) {
                init.body = JSON.stringify(this.body);
            }

            const res = await fetch(url, init);

            if (this.returnMaybeSingle && res.status === 406) {
                return { data: null, error: null };
            }

            const countHeader = res.headers.get('content-range');
            let count: number | null = null;
            if (countHeader) {
                const m = countHeader.match(/\/(\d+|\*)/);
                if (m && m[1] !== '*') count = parseInt(m[1], 10);
            }

            if (this.headOnly) {
                if (!res.ok) {
                    const body = await parseJson(res);
                    return { data: null, error: toError(res, body), count };
                }
                return { data: null, error: null, count };
            }

            const body = await parseJson(res);
            if (!res.ok) {
                return { data: null, error: toError(res, body), count };
            }

            return { data: body as T, error: null, count };
        } catch (e: unknown) {
            return { data: null, error: { message: (e as Error).message ?? 'Unknown error' } };
        }
    }

    /** Omogućava: const { data } = await supabase.from('users').select('*') */
    then<TResult1 = QueryResult<T>, TResult2 = never>(
        onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }
}

/** Početak query lanca: supabase.from('trades') */
function from<T = any>(table: string) {
    return new RestQueryBuilder<T>(table);
}

/**
 * Poziv PostgreSQL funkcije iz baze (RPC).
 * POST /rest/v1/rpc/{ime_funkcije}
 * Npr: increment_likes, decrement_likes, increment_comments
 */
async function rpc(
    fn: string,
    params: Record<string, unknown>,
): Promise<{ data: unknown; error: ApiError | null }> {
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
            method: 'POST',
            headers: await authHeaders(),
            body: JSON.stringify(params),
        });
        const body = await parseJson(res);
        if (!res.ok) return { data: null, error: toError(res, body) };
        return { data: body, error: null };
    } catch (e: unknown) {
        return { data: null, error: { message: (e as Error).message ?? 'Unknown error' } };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE API — /storage/v1
// Koristi: lib/uploadImage.ts (bucket "forecasts" — chart slike)
// ─────────────────────────────────────────────────────────────────────────────

const storage = {
    from(bucket: string) {
        return {
            /**
             * Upload fajla u bucket.
             * POST /storage/v1/object/{bucket}/{path}
             * Telo = raw Blob; Content-Type = MIME slike
             */
            async upload(
                path: string,
                file: Blob,
                options?: { contentType?: string; upsert?: boolean },
            ): Promise<{ data: { path: string } | null; error: ApiError | null }> {
                try {
                    const headers = await authHeaders();
                    if (options?.contentType) headers['Content-Type'] = options.contentType;
                    if (options?.upsert) headers['x-upsert'] = 'true';

                    const res = await fetch(
                        `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
                        { method: 'POST', headers, body: file },
                    );
                    const body = await parseJson(res);
                    if (!res.ok) return { data: null, error: toError(res, body) };
                    return { data: { path }, error: null };
                } catch (e: unknown) {
                    return { data: null, error: { message: (e as Error).message ?? 'Unknown error' } };
                }
            },

            /**
             * Javni URL slike (bucket mora biti public u Supabase Dashboard).
             * GET nije potreban — URL se sastavlja lokalno.
             */
            getPublicUrl(path: string) {
                return {
                    data: { publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}` },
                };
            },
        };
    },
};

/**
 * Glavni export — koristi se kao: import { supabase } from '@/lib/supabase'
 *
 * supabase.auth     → login, register, sesija, logout
 * supabase.from()   → CRUD nad tabelama (users, trades, likes, follows, comments)
 * supabase.rpc()    → pozivi SQL funkcija u bazi
 * supabase.storage  → upload slika prognoza
 */
export const supabase = { auth, from, rpc, storage };
