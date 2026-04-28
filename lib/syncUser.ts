import { supabase } from './supabase';

/**
 * Syncs a newly authenticated user to the public.users table.
 * This is called after a successful sign-up.
 */
export async function syncUserToSupabase(
    userId: string,
    username: string,
    email: string
) {
    // We use upsert to handle cases where the user might already exist
    // (e.g., if they signed up but the sync failed previously)
    const { error } = await supabase.from('users').upsert(
        {
            id: userId,
            username: username.trim().toLowerCase(),
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