/**
 * Ulazna tačka za Supabase u celoj aplikaciji.
 *
 * Umesto @supabase/supabase-js, sve ide kroz REST (lib/supabaseRest.ts).
 * Import uvek iz ovog fajla:
 *
 *   import { supabase } from '@/lib/supabase';
 *
 * Env: EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
 */
export { supabase, type Session, type User } from './supabaseRest';
