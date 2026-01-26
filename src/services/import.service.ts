import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import db from "@/data/database";
import { ApiResponse, AppError } from "@/types";

/**
 * Import data format (matches export from main branch)
 */
interface ImportData {
  metadata: {
    version: string;
    exportDate: string;
    exportedFrom: "parse-server" | "sqlite";
    schemaVersion: 1;
  };
  categories: ImportCategory[];
  projects: ImportProject[];
  contacts: ImportContact[];
  transactions: ImportTransaction[];
  recurringTransactions: ImportRecurringTransaction[];
}

interface ImportCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ImportProject {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  color: string;
  monthlyBudget: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface ImportContact {
  id: string;
  name: string;
  aliases: string[];
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  notes: string | null;
  totalSpent: number;
  totalReceived: number;
  transactionCount: number;
  defaultCategoryId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ImportTransaction {
  id: string;
  amount: number;
  currency: string;
  amountINR: number;
  type: "income" | "expense";
  date: string;
  contactId: string | null;
  contactName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  notes: string | null;
  isRecurring: boolean;
  recurringGroupId: string | null;
  needsReview: boolean;
  confidence: number | null;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ImportRecurringTransaction {
  id: string;
  name: string;
  amount: number;
  currency: string;
  type: "income" | "expense";
  frequency: string;
  contactId: string | null;
  contactName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  lastCreatedAt: string | null;
  nextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportStats {
  categories: number;
  projects: number;
  contacts: number;
  transactions: number;
  recurringTransactions: number;
}

/**
 * Service for importing data from Parse Server export
 */
export class ImportService {
  /**
   * Pick and import a JSON export file
   */
  static async importFromFile(): Promise<
    ApiResponse<{ stats: ImportStats; skipped: ImportStats }>
  > {
    try {
      // Pick a JSON file
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return {
          success: false,
          error: new AppError("Import cancelled", "CANCELLED"),
        };
      }

      const fileUri = result.assets[0].uri;

      // Read and parse the file
      const file = new File(fileUri);
      const content = await file.text();
      const data: ImportData = JSON.parse(content);

      // Validate the data structure (accept both parse-server and sqlite exports)
      if (!data.metadata || !["parse-server", "sqlite"].includes(data.metadata.exportedFrom)) {
        return {
          success: false,
          error: new AppError(
            "Invalid export file. Please select a Cotton export file.",
            "INVALID_FORMAT"
          ),
        };
      }

      // Import data
      const stats = await ImportService.importData(data);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: new AppError(
            "Invalid JSON file. Please select a valid export file.",
            "INVALID_JSON"
          ),
        };
      }
      return {
        success: false,
        error: AppError.fromUnknown(error),
      };
    }
  }

  /**
   * Import data into SQLite
   * Order matters: categories/projects first, then contacts, then transactions
   */
  private static async importData(
    data: ImportData
  ): Promise<{ stats: ImportStats; skipped: ImportStats }> {
    const stats: ImportStats = {
      categories: 0,
      projects: 0,
      contacts: 0,
      transactions: 0,
      recurringTransactions: 0,
    };

    const skipped: ImportStats = {
      categories: 0,
      projects: 0,
      contacts: 0,
      transactions: 0,
      recurringTransactions: 0,
    };

    // Import categories (skip if already exists by ID)
    for (const category of data.categories) {
      const existing = db.getFirstSync<{ id: string }>(
        "SELECT id FROM categories WHERE id = ?;",
        [category.id]
      );

      if (existing) {
        skipped.categories++;
        continue;
      }

      db.runSync(
        `INSERT INTO categories (id, name, type, icon, color, is_system, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          category.id,
          category.name,
          category.type,
          category.icon,
          category.color,
          category.isSystem ? 1 : 0,
          category.createdAt,
          category.updatedAt,
        ]
      );
      stats.categories++;
    }

    // Import projects
    for (const project of data.projects) {
      const existing = db.getFirstSync<{ id: string }>(
        "SELECT id FROM projects WHERE id = ?;",
        [project.id]
      );

      if (existing) {
        skipped.projects++;
        continue;
      }

      db.runSync(
        `INSERT INTO projects (id, name, type, status, description, color, monthly_budget, currency, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          project.id,
          project.name,
          project.type,
          project.status,
          project.description,
          project.color,
          project.monthlyBudget,
          project.currency,
          project.createdAt,
          project.updatedAt,
        ]
      );
      stats.projects++;
    }

    // Import contacts
    for (const contact of data.contacts) {
      const existing = db.getFirstSync<{ id: string }>(
        "SELECT id FROM contacts WHERE id = ?;",
        [contact.id]
      );

      if (existing) {
        skipped.contacts++;
        continue;
      }

      db.runSync(
        `INSERT INTO contacts (id, name, aliases_json, email, phone, company, website, notes,
           total_spent, total_received, transaction_count, default_category_id, project_id,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          contact.id,
          contact.name,
          JSON.stringify(contact.aliases),
          contact.email,
          contact.phone,
          contact.company,
          contact.website,
          contact.notes,
          contact.totalSpent,
          contact.totalReceived,
          contact.transactionCount,
          contact.defaultCategoryId,
          contact.projectId,
          contact.createdAt,
          contact.updatedAt,
        ]
      );
      stats.contacts++;
    }

    // Import transactions
    for (const transaction of data.transactions) {
      const existing = db.getFirstSync<{ id: string }>(
        "SELECT id FROM transactions WHERE id = ?;",
        [transaction.id]
      );

      if (existing) {
        skipped.transactions++;
        continue;
      }

      // Convert ISO date to just the date part for SQLite
      const dateStr = transaction.date.split("T")[0];

      db.runSync(
        `INSERT INTO transactions (
           id, amount, currency, amount_inr, type, date, contact_id, category_id, project_id,
           allocations_json, description, notes, raw_input_id, is_recurring, recurring_group_id,
           needs_review, confidence, review_reason, potential_duplicate_ids_json, missing_fields_json,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          transaction.id,
          transaction.amount,
          transaction.currency,
          transaction.amountINR,
          transaction.type,
          dateStr,
          transaction.contactId,
          transaction.categoryId,
          transaction.projectId,
          null, // allocations_json
          transaction.description,
          transaction.notes,
          null, // raw_input_id
          transaction.isRecurring ? 1 : 0,
          transaction.recurringGroupId,
          transaction.needsReview ? 1 : 0,
          transaction.confidence,
          transaction.reviewReason,
          null, // potential_duplicate_ids_json
          null, // missing_fields_json
          transaction.createdAt,
          transaction.updatedAt,
        ]
      );
      stats.transactions++;
    }

    // Import recurring transactions
    for (const recurring of data.recurringTransactions) {
      const existing = db.getFirstSync<{ id: string }>(
        "SELECT id FROM recurring_transactions WHERE id = ?;",
        [recurring.id]
      );

      if (existing) {
        skipped.recurringTransactions++;
        continue;
      }

      db.runSync(
        `INSERT INTO recurring_transactions (
           id, name, amount, currency, type, frequency, contact_id, category_id, project_id,
           description, notes, is_active, last_created_at, next_due_date, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          recurring.id,
          recurring.name,
          recurring.amount,
          recurring.currency,
          recurring.type,
          recurring.frequency,
          recurring.contactId,
          recurring.categoryId,
          recurring.projectId,
          recurring.description,
          recurring.notes,
          recurring.isActive ? 1 : 0,
          recurring.lastCreatedAt,
          recurring.nextDueDate,
          recurring.createdAt,
          recurring.updatedAt,
        ]
      );
      stats.recurringTransactions++;
    }

    return { stats, skipped };
  }

  /**
   * Preview import without actually importing
   * Returns counts of what would be imported
   */
  static async previewImport(): Promise<
    ApiResponse<{ toImport: ImportStats; existing: ImportStats }>
  > {
    try {
      // Pick a JSON file
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return {
          success: false,
          error: new AppError("Import cancelled", "CANCELLED"),
        };
      }

      const fileUri = result.assets[0].uri;

      // Read and parse the file
      const file = new File(fileUri);
      const content = await file.text();
      const data: ImportData = JSON.parse(content);

      // Validate the data structure (accept both parse-server and sqlite exports)
      if (!data.metadata || !["parse-server", "sqlite"].includes(data.metadata.exportedFrom)) {
        return {
          success: false,
          error: new AppError(
            "Invalid export file. Please select a Cotton export file.",
            "INVALID_FORMAT"
          ),
        };
      }

      // Count what would be imported vs what already exists
      const toImport: ImportStats = {
        categories: 0,
        projects: 0,
        contacts: 0,
        transactions: 0,
        recurringTransactions: 0,
      };

      const existing: ImportStats = {
        categories: 0,
        projects: 0,
        contacts: 0,
        transactions: 0,
        recurringTransactions: 0,
      };

      // Check categories
      for (const category of data.categories) {
        const exists = db.getFirstSync<{ id: string }>(
          "SELECT id FROM categories WHERE id = ?;",
          [category.id]
        );
        if (exists) {
          existing.categories++;
        } else {
          toImport.categories++;
        }
      }

      // Check projects
      for (const project of data.projects) {
        const exists = db.getFirstSync<{ id: string }>(
          "SELECT id FROM projects WHERE id = ?;",
          [project.id]
        );
        if (exists) {
          existing.projects++;
        } else {
          toImport.projects++;
        }
      }

      // Check contacts
      for (const contact of data.contacts) {
        const exists = db.getFirstSync<{ id: string }>(
          "SELECT id FROM contacts WHERE id = ?;",
          [contact.id]
        );
        if (exists) {
          existing.contacts++;
        } else {
          toImport.contacts++;
        }
      }

      // Check transactions
      for (const transaction of data.transactions) {
        const exists = db.getFirstSync<{ id: string }>(
          "SELECT id FROM transactions WHERE id = ?;",
          [transaction.id]
        );
        if (exists) {
          existing.transactions++;
        } else {
          toImport.transactions++;
        }
      }

      // Check recurring transactions
      for (const recurring of data.recurringTransactions) {
        const exists = db.getFirstSync<{ id: string }>(
          "SELECT id FROM recurring_transactions WHERE id = ?;",
          [recurring.id]
        );
        if (exists) {
          existing.recurringTransactions++;
        } else {
          toImport.recurringTransactions++;
        }
      }

      return {
        success: true,
        data: { toImport, existing },
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: new AppError(
            "Invalid JSON file. Please select a valid export file.",
            "INVALID_JSON"
          ),
        };
      }
      return {
        success: false,
        error: AppError.fromUnknown(error),
      };
    }
  }
}
