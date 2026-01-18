import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { IUser } from "@/types";
import { STORAGE_KEYS, createAtomStorageAdapter } from "@/lib/storage";

/**
 * User state atom with AsyncStorage persistence
 * Automatically syncs with storage on changes
 */
export const userAtom = atomWithStorage<IUser | null>(
  STORAGE_KEYS.USER,
  null,
  createAtomStorageAdapter<IUser | null>()
);

/**
 * Derived atom for authentication status
 */
export const isAuthenticatedAtom = atom((get) => {
  const user = get(userAtom);
  return !!user;
});

/**
 * Loading state for auth operations
 */
export const authLoadingAtom = atom<boolean>(false);
