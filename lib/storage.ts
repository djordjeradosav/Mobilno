import { Platform } from 'react-native';

/**
 * ZERO-DEPENDENCY STORAGE
 * This bypasses the "Native module is null" error by avoiding 
 * @react-native-async-storage/async-storage entirely on native platforms
 * during development.
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