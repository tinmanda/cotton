import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "jotai/utils";

/**
 * AsyncStorage wrapper for persistent storage
 * Provides a clean API for storage operations
 */
export const storage = {
  async getString(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  },

  async setString(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.clear();
  },
};

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  USER: "user",
  AUTH_TOKEN: "authToken",
  ONBOARDING_COMPLETED: "onboardingCompleted",
  // Finance data cache
  CONTACTS: "contacts",
  CATEGORIES: "categories",
  PROJECTS: "projects",
} as const;

/**
 * Create a shared AsyncStorage adapter for Jotai atoms
 * This ensures consistent JSON serialization across all atoms
 *
 * Usage:
 * ```typescript
 * const myAtom = atomWithStorage<MyType>(
 *   STORAGE_KEYS.MY_KEY,
 *   defaultValue,
 *   createAtomStorageAdapter<MyType>()
 * );
 * ```
 */
export function createAtomStorageAdapter<T>() {
  return createJSONStorage<T>(() => ({
    getItem: async (key: string) => {
      return await storage.getString(key);
    },
    setItem: async (key: string, value: string) => {
      await storage.setString(key, value);
    },
    removeItem: async (key: string) => {
      await storage.delete(key);
    },
  }));
}
