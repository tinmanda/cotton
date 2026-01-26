/**
 * Finance atoms - Re-exported from data layer
 *
 * In the local-first architecture, atoms are defined in @/data/atoms
 * and synced with SQLite. This file re-exports them for compatibility.
 */

export {
  // Categories
  categoriesAtom,
  categoriesLoadingAtom,
  loadCategoriesAtom,

  // Projects
  projectsAtom,
  projectsLoadingAtom,
  loadProjectsAtom,

  // Contacts
  contactsAtom,
  contactsLoadingAtom,
  loadContactsAtom,

  // Recurring Transactions
  recurringTransactionsAtom,
  recurringTransactionsLoadingAtom,
  loadRecurringTransactionsAtom,

  // Dashboard
  dashboardTotalsAtom,
  recentTransactionsAtom,
  loadRecentTransactionsAtom,
} from "@/data/atoms";

// Note: CACHE_TTL is no longer needed in local-first architecture
// Data is always fresh from SQLite
export const CACHE_TTL = 0;
