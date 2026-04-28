
import { supabase } from './supabase';

export async function syncUserToSupabase(
    clerkId: string,
    username: string,
    email: string
) {
    const { error } = await supabase.from('users').upsert(
        {
            id: clerkId,
            username,
            email,
            member_since: new Date().toISOString(),
            subscription_tier: 'free',
            is_verified: false,
        },
        { onConflict: 'id' }
    );

    if (error) {
        console.error('Error syncing user to Supabase:', error);
        throw error;
    }
}