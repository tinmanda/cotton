import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { IContact, ICategory, IProject } from "@/types";
import { STORAGE_KEYS, createAtomStorageAdapter } from "@/lib/storage";

/**
 * Contacts atom with AsyncStorage persistence
 * Caches the contacts list to avoid repeated API calls
 */
export const contactsAtom = atomWithStorage<IContact[]>(
  STORAGE_KEYS.CONTACTS,
  [],
  createAtomStorageAdapter<IContact[]>()
);

/**
 * Contacts loading state
 */
export const contactsLoadingAtom = atom<boolean>(false);

/**
 * Contacts last fetched timestamp
 * Used to determine if cache is stale
 */
export const contactsTimestampAtom = atom<number>(0);

/**
 * Categories atom with AsyncStorage persistence
 */
export const categoriesAtom = atomWithStorage<ICategory[]>(
  STORAGE_KEYS.CATEGORIES,
  [],
  createAtomStorageAdapter<ICategory[]>()
);

/**
 * Categories loading state
 */
export const categoriesLoadingAtom = atom<boolean>(false);

/**
 * Categories last fetched timestamp
 */
export const categoriesTimestampAtom = atom<number>(0);

/**
 * Projects atom with AsyncStorage persistence
 */
export const projectsAtom = atomWithStorage<IProject[]>(
  STORAGE_KEYS.PROJECTS,
  [],
  createAtomStorageAdapter<IProject[]>()
);

/**
 * Projects loading state
 */
export const projectsLoadingAtom = atom<boolean>(false);

/**
 * Projects last fetched timestamp
 */
export const projectsTimestampAtom = atom<number>(0);

/**
 * Cache TTL in milliseconds (5 minutes)
 */
export const CACHE_TTL = 5 * 60 * 1000;
