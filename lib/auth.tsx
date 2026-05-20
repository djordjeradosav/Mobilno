/**
 * ============================================================================
 * AUTH PROVIDER — lib/auth.tsx
 * ============================================================================
 *
 * React Context koji drži trenutnog korisnika i sesiju u celoj aplikaciji.
 *
 * TOK:
 * 1) Pri mount-u poziva supabase.auth.getSession() → učitava token iz storage-a
 * 2) Registruje onAuthStateChange → UI se ažurira posle login/logout
 * 3) useAuth() hook u ekranima vraća { user, session, isLoaded, signOut }
 *
 * KORIŠĆENJE U EKRANIMA:
 *   const { user, isLoaded, signOut } = useAuth();
 *   if (!user) → redirect na welcome/login
 *   user.id → UUID iz Supabase Auth (koristi se kao FK u users/trades tabelama)
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type Session, type User } from './supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    isLoaded: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isLoaded: false,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Inicijalno učitavanje sesije (REST: GET /auth/v1/user + lokalni token)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoaded(true);
        });

        // Listener — okida se posle login, logout, refresh
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoaded(true);
        });

        return () => { subscription.unsubscribe(); };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, isLoaded, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
