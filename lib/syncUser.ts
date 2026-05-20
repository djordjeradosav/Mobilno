import { supabase } from './supabase';

/**
 * Sinhronizuje Auth korisnika u public.users tabelu (REST upsert).
 *
 * Poziva se posle registracije / prvog posta da profil postoji u bazi.
 * REST: POST /rest/v1/users?on_conflict=id + Prefer: resolution=merge-duplicates
 */
export async function syncUserToSupabase(
    userId: string,
    username: string,
    email: string
) {
    // Fallback to email prefix if username is missing
    const finalUsername = (username || email.split('@')[0]).trim().toLowerCase();

    // We use upsert to handle cases where the user might already exist
    // (e.g., if they signed up but the sync failed previously)
    const { error } = await supabase.from('users').upsert(
        {
            id: userId,
            username: finalUsername,
            email: email.trim().toLowerCase(),
            // member_since is handled by database default now()
            // subscription_tier is handled by database default 'free'
            // is_verified is handled by database default false
        },
        { onConflict: 'id' }
    );

    if (error) {
        console.error('Error syncing user to Supabase:', error.message);
        throw new Error(`Database sync failed: ${error.message}`);
    }
}