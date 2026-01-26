import db from "../index";
import { SEED_CATEGORIES } from "../../seed/categories";

/**
 * Initial database schema for Cotton
 * Creates all tables and seeds default categories
 */

const up = async (): Promise<void> => {
  console.log("Starting initial schema setup...");

  try {
    // 1. Create migrations table
    db.runSync(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created migrations table");

    // 2. Create categories table
    db.runSync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created categories table");

    // 3. Create projects table
    db.runSync(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('service', 'product', 'investment', 'other')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
        description TEXT,
        color TEXT NOT NULL,
        monthly_budget REAL,
        currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created projects table");

    // 4. Create contacts table
    db.runSync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        aliases_json TEXT DEFAULT '[]',
        email TEXT,
        phone TEXT,
        company TEXT,
        website TEXT,
        notes TEXT,
        total_spent REAL NOT NULL DEFAULT 0,
        total_received REAL NOT NULL DEFAULT 0,
        transaction_count INTEGER NOT NULL DEFAULT 0,
        default_category_id TEXT,
        project_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (default_category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );
    `);
    console.log("Created contacts table");

    // 5. Create transactions table
    db.runSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
        amount_inr REAL NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        date TEXT NOT NULL,
        contact_id TEXT,
        category_id TEXT,
        project_id TEXT,
        allocations_json TEXT,
        description TEXT,
        notes TEXT,
        raw_input_id TEXT,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        recurring_group_id TEXT,
        needs_review INTEGER NOT NULL DEFAULT 0,
        confidence REAL,
        review_reason TEXT CHECK (review_reason IN ('low_confidence', 'potential_duplicate', 'incomplete') OR review_reason IS NULL),
        potential_duplicate_ids_json TEXT,
        missing_fields_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );
    `);
    console.log("Created transactions table");

    // Create indexes for common queries
    db.runSync(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`);
    db.runSync(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`);
    db.runSync(`CREATE INDEX IF NOT EXISTS idx_transactions_contact_id ON transactions(contact_id);`);
    db.runSync(`CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);`);
    db.runSync(`CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);`);
    db.runSync(`CREATE INDEX IF NOT EXISTS idx_transactions_needs_review ON transactions(needs_review);`);
    console.log("Created transaction indexes");

    // 6. Create recurring_transactions table
    db.runSync(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
        contact_id TEXT,
        category_id TEXT,
        project_id TEXT,
        description TEXT,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_created_at DATETIME,
        next_due_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );
    `);
    console.log("Created recurring_transactions table");

    // 7. Create raw_inputs table (for AI audit trail)
    db.runSync(`
      CREATE TABLE IF NOT EXISTS raw_inputs (
        id TEXT PRIMARY KEY NOT NULL,
        original_text TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('sms', 'email', 'manual', 'voice')),
        parsed_data_json TEXT,
        transaction_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
      );
    `);
    console.log("Created raw_inputs table");

    // 8. Seed default categories
    for (const category of SEED_CATEGORIES) {
      db.runSync(
        `INSERT OR REPLACE INTO categories (id, name, type, icon, color, is_system) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          category.id,
          category.name,
          category.type,
          category.icon,
          category.color,
          category.isSystem ? 1 : 0,
        ]
      );
    }
    console.log(`Seeded ${SEED_CATEGORIES.length} default categories`);

    console.log("Initial schema setup completed successfully");
  } catch (error) {
    console.error("Error during initial schema setup:", error);
    throw error;
  }
};

const down = async (): Promise<void> => {
  // Drop all tables in reverse order
  db.runSync("DROP TABLE IF EXISTS raw_inputs;");
  db.runSync("DROP TABLE IF EXISTS recurring_transactions;");
  db.runSync("DROP TABLE IF EXISTS transactions;");
  db.runSync("DROP TABLE IF EXISTS contacts;");
  db.runSync("DROP TABLE IF EXISTS projects;");
  db.runSync("DROP TABLE IF EXISTS categories;");
  db.runSync("DROP TABLE IF EXISTS migrations;");
  console.log("All tables dropped");
};

export default { up, down };
