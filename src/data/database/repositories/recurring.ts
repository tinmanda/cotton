import db, { generateId } from "../index";
import {
  IRecurringTransaction,
  TransactionType,
  Currency,
  RecurringFrequency,
} from "@/types";

/**
 * RecurringTransaction row from SQLite
 */
interface RecurringTransactionRow {
  id: string;
  name: string;
  amount: number;
  currency: string;
  type: string;
  frequency: string;
  contact_id: string | null;
  contact_name?: string | null;
  category_id: string | null;
  category_name?: string | null;
  project_id: string | null;
  project_name?: string | null;
  description: string | null;
  notes: string | null;
  is_active: number;
  last_created_at: string | null;
  next_due_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transform SQLite row to IRecurringTransaction
 */
const transformRow = (row: RecurringTransactionRow): IRecurringTransaction => ({
  id: row.id,
  name: row.name,
  amount: row.amount,
  currency: row.currency as Currency,
  type: row.type as TransactionType,
  frequency: row.frequency as RecurringFrequency,
  contactId: row.contact_id ?? undefined,
  contactName: row.contact_name ?? undefined,
  categoryId: row.category_id ?? undefined,
  categoryName: row.category_name ?? undefined,
  projectId: row.project_id ?? undefined,
  projectName: row.project_name ?? undefined,
  description: row.description ?? undefined,
  notes: row.notes ?? undefined,
  isActive: row.is_active === 1,
  lastCreatedAt: row.last_created_at ? new Date(row.last_created_at) : undefined,
  nextDueDate: row.next_due_date ? new Date(row.next_due_date) : undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

/**
 * Calculate next due date based on frequency
 */
const calculateNextDueDate = (
  frequency: RecurringFrequency,
  lastDate?: Date
): Date => {
  const baseDate = lastDate || new Date();
  const nextDate = new Date(baseDate);

  switch (frequency) {
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
};

/**
 * Get all recurring transactions
 */
export const getAllRecurringTransactions = (params?: {
  type?: TransactionType;
  projectId?: string;
  isActive?: boolean;
}): IRecurringTransaction[] => {
  let query = `
    SELECT rt.*,
           c.name as contact_name,
           cat.name as category_name,
           p.name as project_name
    FROM recurring_transactions rt
    LEFT JOIN contacts c ON rt.contact_id = c.id
    LEFT JOIN categories cat ON rt.category_id = cat.id
    LEFT JOIN projects p ON rt.project_id = p.id
    WHERE 1=1
  `;
  const queryParams: (string | number)[] = [];

  if (params?.type) {
    query += " AND rt.type = ?";
    queryParams.push(params.type);
  }

  if (params?.projectId) {
    query += " AND rt.project_id = ?";
    queryParams.push(params.projectId);
  }

  if (params?.isActive !== undefined) {
    query += " AND rt.is_active = ?";
    queryParams.push(params.isActive ? 1 : 0);
  }

  query += " ORDER BY rt.next_due_date ASC, rt.name ASC";

  const rows = db.getAllSync<RecurringTransactionRow>(query, queryParams);
  return rows.map(transformRow);
};

/**
 * Get recurring transaction by ID
 */
export const getRecurringTransactionById = (
  id: string
): IRecurringTransaction | null => {
  const row = db.getFirstSync<RecurringTransactionRow>(
    `SELECT rt.*,
            c.name as contact_name,
            cat.name as category_name,
            p.name as project_name
     FROM recurring_transactions rt
     LEFT JOIN contacts c ON rt.contact_id = c.id
     LEFT JOIN categories cat ON rt.category_id = cat.id
     LEFT JOIN projects p ON rt.project_id = p.id
     WHERE rt.id = ?;`,
    [id]
  );
  return row ? transformRow(row) : null;
};

/**
 * Create a new recurring transaction
 */
export const createRecurringTransaction = (params: {
  name: string;
  amount: number;
  currency?: Currency;
  type: TransactionType;
  frequency: RecurringFrequency;
  contactId?: string;
  categoryId?: string;
  projectId?: string;
  description?: string;
  notes?: string;
}): IRecurringTransaction => {
  const id = generateId();
  const now = new Date().toISOString();
  const nextDueDate = calculateNextDueDate(params.frequency);

  db.runSync(
    `INSERT INTO recurring_transactions (
       id, name, amount, currency, type, frequency, contact_id, category_id, project_id,
       description, notes, is_active, last_created_at, next_due_date, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, ?, ?, ?);`,
    [
      id,
      params.name,
      params.amount,
      params.currency ?? "INR",
      params.type,
      params.frequency,
      params.contactId ?? null,
      params.categoryId ?? null,
      params.projectId ?? null,
      params.description ?? null,
      params.notes ?? null,
      nextDueDate.toISOString(),
      now,
      now,
    ]
  );

  return getRecurringTransactionById(id)!;
};

/**
 * Update a recurring transaction
 */
export const updateRecurringTransaction = (params: {
  id: string;
  name?: string;
  amount?: number;
  currency?: Currency;
  type?: TransactionType;
  frequency?: RecurringFrequency;
  contactId?: string | null;
  categoryId?: string | null;
  projectId?: string | null;
  description?: string | null;
  notes?: string | null;
  isActive?: boolean;
}): IRecurringTransaction | null => {
  const existing = getRecurringTransactionById(params.id);
  if (!existing) return null;

  const now = new Date().toISOString();

  // Recalculate next due date if frequency changed
  let nextDueDate = existing.nextDueDate?.toISOString() ?? null;
  if (params.frequency && params.frequency !== existing.frequency) {
    nextDueDate = calculateNextDueDate(
      params.frequency,
      existing.lastCreatedAt
    ).toISOString();
  }

  db.runSync(
    `UPDATE recurring_transactions
     SET name = ?, amount = ?, currency = ?, type = ?, frequency = ?,
         contact_id = ?, category_id = ?, project_id = ?,
         description = ?, notes = ?, is_active = ?, next_due_date = ?, updated_at = ?
     WHERE id = ?;`,
    [
      params.name ?? existing.name,
      params.amount ?? existing.amount,
      params.currency ?? existing.currency,
      params.type ?? existing.type,
      params.frequency ?? existing.frequency,
      params.contactId === null
        ? null
        : params.contactId ?? existing.contactId ?? null,
      params.categoryId === null
        ? null
        : params.categoryId ?? existing.categoryId ?? null,
      params.projectId === null
        ? null
        : params.projectId ?? existing.projectId ?? null,
      params.description === null
        ? null
        : params.description ?? existing.description ?? null,
      params.notes === null ? null : params.notes ?? existing.notes ?? null,
      params.isActive !== undefined
        ? params.isActive
          ? 1
          : 0
        : existing.isActive
          ? 1
          : 0,
      nextDueDate,
      now,
      params.id,
    ]
  );

  return getRecurringTransactionById(params.id);
};

/**
 * Delete a recurring transaction
 */
export const deleteRecurringTransaction = (id: string): boolean => {
  const existing = getRecurringTransactionById(id);
  if (!existing) return false;

  db.runSync("DELETE FROM recurring_transactions WHERE id = ?;", [id]);
  return true;
};

/**
 * Mark a recurring transaction as created (update lastCreatedAt and nextDueDate)
 */
export const markRecurringTransactionCreated = (
  id: string,
  createdDate?: Date
): IRecurringTransaction | null => {
  const existing = getRecurringTransactionById(id);
  if (!existing) return null;

  const now = new Date();
  const lastCreatedAt = createdDate || now;
  const nextDueDate = calculateNextDueDate(existing.frequency, lastCreatedAt);

  db.runSync(
    `UPDATE recurring_transactions
     SET last_created_at = ?, next_due_date = ?, updated_at = ?
     WHERE id = ?;`,
    [
      lastCreatedAt.toISOString(),
      nextDueDate.toISOString(),
      now.toISOString(),
      id,
    ]
  );

  return getRecurringTransactionById(id);
};

/**
 * Get recurring transactions that are due
 */
export const getDueRecurringTransactions = (): IRecurringTransaction[] => {
  const now = new Date().toISOString();

  const rows = db.getAllSync<RecurringTransactionRow>(
    `SELECT rt.*,
            c.name as contact_name,
            cat.name as category_name,
            p.name as project_name
     FROM recurring_transactions rt
     LEFT JOIN contacts c ON rt.contact_id = c.id
     LEFT JOIN categories cat ON rt.category_id = cat.id
     LEFT JOIN projects p ON rt.project_id = p.id
     WHERE rt.is_active = 1 AND rt.next_due_date <= ?
     ORDER BY rt.next_due_date ASC;`,
    [now]
  );

  return rows.map(transformRow);
};

/**
 * Get upcoming recurring transactions (next 30 days)
 */
export const getUpcomingRecurringTransactions = (
  days: number = 30
): IRecurringTransaction[] => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const rows = db.getAllSync<RecurringTransactionRow>(
    `SELECT rt.*,
            c.name as contact_name,
            cat.name as category_name,
            p.name as project_name
     FROM recurring_transactions rt
     LEFT JOIN contacts c ON rt.contact_id = c.id
     LEFT JOIN categories cat ON rt.category_id = cat.id
     LEFT JOIN projects p ON rt.project_id = p.id
     WHERE rt.is_active = 1 AND rt.next_due_date <= ?
     ORDER BY rt.next_due_date ASC;`,
    [futureDate.toISOString()]
  );

  return rows.map(transformRow);
};
