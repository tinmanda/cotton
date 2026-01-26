import * as SQLite from "expo-sqlite";

/**
 * Cotton SQLite Database
 * Local-first architecture for privacy
 */

// Database name
const DB_NAME = "cotton.db";

// Open the database synchronously
const db = SQLite.openDatabaseSync(DB_NAME);

// Migration interface
interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

/**
 * Get list of executed migrations
 */
const getExecutedMigrations = async (): Promise<string[]> => {
  try {
    const result = db.getAllSync<{ name: string }>(
      "SELECT name FROM migrations ORDER BY id;"
    );
    return result.map((row) => row.name);
  } catch {
    // If migrations table doesn't exist yet, return empty array
    console.log("No migrations table found, starting fresh");
    return [];
  }
};

/**
 * Run all pending migrations
 */
export const runMigrations = async (): Promise<void> => {
  console.log("Checking migrations status...");

  try {
    // Import all migrations in order
    const migrations: Array<{ name: string; module: Migration }> = [
      {
        name: "000_initial_schema",
        module: require("./migrations/000_initial_schema").default,
      },
    ];

    // Get list of already executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log("Executed migrations:", executedMigrations);

    // Run any pending migrations
    for (const migration of migrations) {
      if (!executedMigrations.includes(migration.name)) {
        console.log(`Running migration: ${migration.name}`);
        await migration.module.up();

        // Mark the migration as executed
        db.runSync("INSERT INTO migrations (name) VALUES (?);", [
          migration.name,
        ]);

        console.log(`Migration ${migration.name} completed successfully`);
      } else {
        console.log(`Migration ${migration.name} already executed, skipping`);
      }
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
};

/**
 * Reset database - drops all tables
 * Use with caution! Only for development/testing
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    console.log("Starting database reset...");

    // Get all tables
    const tables = db.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    );

    // Drop each table
    for (const { name } of tables) {
      db.runSync(`DROP TABLE IF EXISTS ${name};`);
      console.log(`Dropped table: ${name}`);
    }

    console.log("Database reset completed");
  } catch (error) {
    console.error("Error resetting database:", error);
    throw error;
  }
};

/**
 * Generate a UUID v4
 * Used for creating unique IDs for records
 */
export const generateId = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Export the database instance
export default db;
