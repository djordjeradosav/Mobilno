import { Platform } from 'react-native';

/**
 * Lokalno skladište za Supabase auth token (i eventualno druge ključeve).
 *
 * - Web: localStorage (perzistentno između refresh-a)
 * - Native (dev): in-memory Map — sesija se gubi posle restarta app-a
 *
 * Koristi ga supabaseRest.ts (AUTH_STORAGE_KEY).
 * Za produkciju na telefonu preporuka: @react-native-async-storage/async-storage
 */

class MemoryStorage {
    private storage: Record<string, string> = {};

    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return this.storage[key] || null;
    }

    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        this.storage[key] = value;
    }

    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        delete this.storage[key];
    }
}

export const universalStorage = new MemoryStorage();