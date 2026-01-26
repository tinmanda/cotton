/**
 * Data Layer - Local-First SQLite Architecture
 *
 * This module provides:
 * - SQLite database with migrations
 * - Repositories for CRUD operations
 * - Jotai atoms synced with SQLite
 */

import { runMigrations, resetDatabase } from "./database";
import { getDefaultStore } from "jotai";
import {
  loadCategoriesAtom,
  loadProjectsAtom,
  loadContactsAtom,
  loadRecurringTransactionsAtom,
} from "./atoms";

// Re-export database utilities
export { runMigrations, resetDatabase, generateId } from "./database";

// Re-export repositories
export * from "./database/repositories/categories";
export * from "./database/repositories/projects";
export * from "./database/repositories/contacts";
export * from "./database/repositories/transactions";
export * from "./database/repositories/recurring";

// Re-export atoms
export * from "./atoms";

// Re-export seed data
export * from "./seed/categories";

// Get the default Jotai store
const store = getDefaultStore();

/**
 * Initialize the database and load data into Jotai atoms
 * Call this on app startup
 */
export const initDatabase = async (): Promise<void> => {
  try {
    console.log("Initializing database...");

    // Run any pending migrations
    await runMigrations();

    // Load data from SQLite into Jotai atoms
    await store.set(loadCategoriesAtom);
    await store.set(loadProjectsAtom);
    await store.set(loadContactsAtom);
    await store.set(loadRecurringTransactionsAtom);

    console.log("Database initialized and data loaded successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};
