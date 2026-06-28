import { supabase } from './supabase';

/**
 * Sinhronizuje Auth korisnika u public.users tabelu.
 *
 * Problem: Ako korisnik pokuša da se sinhronizuje sa username-om koji već postoji (ali pod drugim ID-jem),
 * dobićemo "duplicate key value violates unique constraint".
 *
 * Rešenje: Prvo proveravamo da li korisnik sa tim ID-jem već postoji.
 * Ako postoji, ažuriramo ga. Ako ne, proveravamo da li je username zauzet.
 */
export async function syncUserToSupabase(
    userId: string,
    username: string,
    email: string
) {
    const finalEmail = email.trim().toLowerCase();
    const baseUsername = (username || email.split('@')[0]).trim().toLowerCase();

    // 1. Proveri da li korisnik već postoji po ID-u
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, username')
        .eq('id', userId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 je "no rows found"
        console.error('Error fetching existing user:', fetchError.message);
    }

    // Ako korisnik postoji, samo ažuriramo podatke (id je isti, pa nema konflikta)
    if (existingUser) {
        const { error: updateError } = await supabase
            .from('users')
            .update({
                email: finalEmail,
                // Ne menjamo username ako već postoji, osim ako je baš potrebno
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user:', updateError.message);
            throw new Error(`Database update failed: ${updateError.message}`);
        }
        return;
    }

    // 2. Ako korisnik NE postoji, pokušavamo INSERT, ali moramo paziti na unikatan username
    let finalUsername = baseUsername;
    
    // Provera da li username već koristi NEKO DRUGI
    const { data: userWithSameName } = await supabase
        .from('users')
        .select('id')
        .eq('username', finalUsername)
        .single();

    if (userWithSameName) {
        // Ako je username zauzet, dodajemo nasumičan sufiks (npr. timestamp ili slučajan broj)
        finalUsername = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;
    }

    const { error: insertError } = await supabase.from('users').insert({
        id: userId,
        username: finalUsername,
        email: finalEmail,
    });

    if (insertError) {
        console.error('Error inserting user:', insertError.message);
        throw new Error(`Database insert failed: ${insertError.message}`);
    }
}
