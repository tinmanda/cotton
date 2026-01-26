import { atom } from "jotai";
import {
  ICategory,
  IProject,
  IContact,
  IRecurringTransaction,
  ITransaction,
} from "@/types";
import {
  getAllCategories,
  createCategory as createCategoryRepo,
  updateCategory as updateCategoryRepo,
  deleteCategory as deleteCategoryRepo,
} from "./database/repositories/categories";
import {
  getAllProjects,
  createProject as createProjectRepo,
  updateProject as updateProjectRepo,
  deleteProject as deleteProjectRepo,
} from "./database/repositories/projects";
import {
  getAllContacts,
  createContact as createContactRepo,
  updateContact as updateContactRepo,
  deleteContact as deleteContactRepo,
} from "./database/repositories/contacts";
import {
  getAllRecurringTransactions,
  createRecurringTransaction as createRecurringRepo,
  updateRecurringTransaction as updateRecurringRepo,
  deleteRecurringTransaction as deleteRecurringRepo,
} from "./database/repositories/recurring";
import {
  getTransactions,
  createTransaction as createTransactionRepo,
  updateTransaction as updateTransactionRepo,
  deleteTransaction as deleteTransactionRepo,
  getDashboardTotals,
  getRecentTransactions,
} from "./database/repositories/transactions";

// ============================================
// Categories Atoms
// ============================================

/**
 * Categories atom - loaded from SQLite
 */
export const categoriesAtom = atom<ICategory[]>([]);

/**
 * Categories loading state
 */
export const categoriesLoadingAtom = atom<boolean>(false);

/**
 * Load categories from SQLite into atom
 */
export const loadCategoriesAtom = atom(null, (get, set) => {
  try {
    const categories = getAllCategories();
    set(categoriesAtom, categories);
    console.log(`Loaded ${categories.length} categories from SQLite`);
  } catch (error) {
    console.error("Error loading categories:", error);
    set(categoriesAtom, []);
  }
});

/**
 * Writable atom for CRUD operations on categories
 */
export const categoriesWritableAtom = atom(
  (get) => get(categoriesAtom),
  (
    get,
    set,
    action:
      | { type: "create"; payload: Parameters<typeof createCategoryRepo>[0] }
      | { type: "update"; payload: Parameters<typeof updateCategoryRepo>[0] }
      | { type: "delete"; payload: string }
  ) => {
    switch (action.type) {
      case "create": {
        const newCategory = createCategoryRepo(action.payload);
        set(categoriesAtom, [...get(categoriesAtom), newCategory]);
        return newCategory;
      }
      case "update": {
        const updated = updateCategoryRepo(action.payload);
        if (updated) {
          set(
            categoriesAtom,
            get(categoriesAtom).map((c) =>
              c.id === updated.id ? updated : c
            )
          );
        }
        return updated;
      }
      case "delete": {
        const deleted = deleteCategoryRepo(action.payload);
        if (deleted) {
          set(
            categoriesAtom,
            get(categoriesAtom).filter((c) => c.id !== action.payload)
          );
        }
        return deleted;
      }
    }
  }
);

// ============================================
// Projects Atoms
// ============================================

/**
 * Projects atom - loaded from SQLite
 */
export const projectsAtom = atom<IProject[]>([]);

/**
 * Projects loading state
 */
export const projectsLoadingAtom = atom<boolean>(false);

/**
 * Load projects from SQLite into atom
 */
export const loadProjectsAtom = atom(null, (get, set) => {
  try {
    const projects = getAllProjects();
    set(projectsAtom, projects);
    console.log(`Loaded ${projects.length} projects from SQLite`);
  } catch (error) {
    console.error("Error loading projects:", error);
    set(projectsAtom, []);
  }
});

/**
 * Writable atom for CRUD operations on projects
 */
export const projectsWritableAtom = atom(
  (get) => get(projectsAtom),
  (
    get,
    set,
    action:
      | { type: "create"; payload: Parameters<typeof createProjectRepo>[0] }
      | { type: "update"; payload: Parameters<typeof updateProjectRepo>[0] }
      | { type: "delete"; payload: string }
  ) => {
    switch (action.type) {
      case "create": {
        const newProject = createProjectRepo(action.payload);
        set(projectsAtom, [newProject, ...get(projectsAtom)]);
        return newProject;
      }
      case "update": {
        const updated = updateProjectRepo(action.payload);
        if (updated) {
          set(
            projectsAtom,
            get(projectsAtom).map((p) =>
              p.id === updated.id ? updated : p
            )
          );
        }
        return updated;
      }
      case "delete": {
        const deleted = deleteProjectRepo(action.payload);
        if (deleted) {
          set(
            projectsAtom,
            get(projectsAtom).filter((p) => p.id !== action.payload)
          );
        }
        return deleted;
      }
    }
  }
);

// ============================================
// Contacts Atoms
// ============================================

/**
 * Contacts atom - loaded from SQLite
 */
export const contactsAtom = atom<IContact[]>([]);

/**
 * Contacts loading state
 */
export const contactsLoadingAtom = atom<boolean>(false);

/**
 * Load contacts from SQLite into atom
 */
export const loadContactsAtom = atom(null, (get, set) => {
  try {
    const contacts = getAllContacts();
    set(contactsAtom, contacts);
    console.log(`Loaded ${contacts.length} contacts from SQLite`);
  } catch (error) {
    console.error("Error loading contacts:", error);
    set(contactsAtom, []);
  }
});

/**
 * Writable atom for CRUD operations on contacts
 */
export const contactsWritableAtom = atom(
  (get) => get(contactsAtom),
  (
    get,
    set,
    action:
      | { type: "create"; payload: Parameters<typeof createContactRepo>[0] }
      | { type: "update"; payload: Parameters<typeof updateContactRepo>[0] }
      | { type: "delete"; payload: string }
      | { type: "reload" }
  ) => {
    switch (action.type) {
      case "create": {
        const newContact = createContactRepo(action.payload);
        set(contactsAtom, [newContact, ...get(contactsAtom)]);
        return newContact;
      }
      case "update": {
        const updated = updateContactRepo(action.payload);
        if (updated) {
          set(
            contactsAtom,
            get(contactsAtom).map((c) =>
              c.id === updated.id ? updated : c
            )
          );
        }
        return updated;
      }
      case "delete": {
        const deleted = deleteContactRepo(action.payload);
        if (deleted) {
          set(
            contactsAtom,
            get(contactsAtom).filter((c) => c.id !== action.payload)
          );
        }
        return deleted;
      }
      case "reload": {
        const contacts = getAllContacts();
        set(contactsAtom, contacts);
        return contacts;
      }
    }
  }
);

// ============================================
// Recurring Transactions Atoms
// ============================================

/**
 * Recurring transactions atom - loaded from SQLite
 */
export const recurringTransactionsAtom = atom<IRecurringTransaction[]>([]);

/**
 * Recurring transactions loading state
 */
export const recurringTransactionsLoadingAtom = atom<boolean>(false);

/**
 * Load recurring transactions from SQLite into atom
 */
export const loadRecurringTransactionsAtom = atom(null, (get, set) => {
  try {
    const recurring = getAllRecurringTransactions();
    set(recurringTransactionsAtom, recurring);
    console.log(`Loaded ${recurring.length} recurring transactions from SQLite`);
  } catch (error) {
    console.error("Error loading recurring transactions:", error);
    set(recurringTransactionsAtom, []);
  }
});

/**
 * Writable atom for CRUD operations on recurring transactions
 */
export const recurringTransactionsWritableAtom = atom(
  (get) => get(recurringTransactionsAtom),
  (
    get,
    set,
    action:
      | { type: "create"; payload: Parameters<typeof createRecurringRepo>[0] }
      | { type: "update"; payload: Parameters<typeof updateRecurringRepo>[0] }
      | { type: "delete"; payload: string }
      | { type: "reload" }
  ) => {
    switch (action.type) {
      case "create": {
        const newRecurring = createRecurringRepo(action.payload);
        set(recurringTransactionsAtom, [newRecurring, ...get(recurringTransactionsAtom)]);
        return newRecurring;
      }
      case "update": {
        const updated = updateRecurringRepo(action.payload);
        if (updated) {
          set(
            recurringTransactionsAtom,
            get(recurringTransactionsAtom).map((r) =>
              r.id === updated.id ? updated : r
            )
          );
        }
        return updated;
      }
      case "delete": {
        const deleted = deleteRecurringRepo(action.payload);
        if (deleted) {
          set(
            recurringTransactionsAtom,
            get(recurringTransactionsAtom).filter((r) => r.id !== action.payload)
          );
        }
        return deleted;
      }
      case "reload": {
        const recurring = getAllRecurringTransactions();
        set(recurringTransactionsAtom, recurring);
        return recurring;
      }
    }
  }
);

// ============================================
// Dashboard Atoms (computed from SQLite)
// ============================================

/**
 * Dashboard totals - computed from transactions
 */
export const dashboardTotalsAtom = atom(() => {
  return getDashboardTotals();
});

/**
 * Recent transactions for dashboard
 */
export const recentTransactionsAtom = atom<ITransaction[]>([]);

/**
 * Load recent transactions
 */
export const loadRecentTransactionsAtom = atom(null, (get, set) => {
  try {
    const recent = getRecentTransactions(10);
    set(recentTransactionsAtom, recent);
  } catch (error) {
    console.error("Error loading recent transactions:", error);
    set(recentTransactionsAtom, []);
  }
});
