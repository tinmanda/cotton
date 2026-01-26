import db, { generateId } from "../index";
import {
  ITransaction,
  IAllocation,
  TransactionType,
  Currency,
  TransactionFilters,
} from "@/types";
import { recalculateContactTotals } from "./contacts";

/**
 * Transaction row from SQLite
 */
interface TransactionRow {
  id: string;
  amount: number;
  currency: string;
  amount_inr: number;
  type: string;
  date: string;
  contact_id: string | null;
  contact_name?: string | null;
  category_id: string | null;
  category_name?: string | null;
  project_id: string | null;
  project_name?: string | null;
  allocations_json: string | null;
  description: string | null;
  notes: string | null;
  raw_input_id: string | null;
  is_recurring: number;
  recurring_group_id: string | null;
  needs_review: number;
  confidence: number | null;
  review_reason: string | null;
  potential_duplicate_ids_json: string | null;
  missing_fields_json: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transform SQLite row to ITransaction
 */
const transformRow = (row: TransactionRow): ITransaction => ({
  id: row.id,
  amount: row.amount,
  currency: row.currency as Currency,
  amountINR: row.amount_inr,
  type: row.type as TransactionType,
  date: new Date(row.date),
  contactId: row.contact_id ?? undefined,
  contactName: row.contact_name ?? undefined,
  categoryId: row.category_id ?? undefined,
  categoryName: row.category_name ?? undefined,
  projectId: row.project_id ?? undefined,
  projectName: row.project_name ?? undefined,
  allocations: row.allocations_json
    ? JSON.parse(row.allocations_json)
    : undefined,
  description: row.description ?? undefined,
  notes: row.notes ?? undefined,
  rawInputId: row.raw_input_id ?? undefined,
  isRecurring: row.is_recurring === 1,
  recurringGroupId: row.recurring_group_id ?? undefined,
  needsReview: row.needs_review === 1,
  confidence: row.confidence ?? undefined,
  reviewReason: row.review_reason as ITransaction["reviewReason"],
  potentialDuplicateIds: row.potential_duplicate_ids_json
    ? JSON.parse(row.potential_duplicate_ids_json)
    : undefined,
  missingFields: row.missing_fields_json
    ? JSON.parse(row.missing_fields_json)
    : undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

/**
 * Get transactions with filters
 */
export const getTransactions = (
  filters?: TransactionFilters & { limit?: number; skip?: number }
): {
  transactions: ITransaction[];
  total: number;
  totalIncome: number;
  totalExpenses: number;
  hasMore: boolean;
} => {
  let whereClause = "WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.startDate) {
    whereClause += " AND t.date >= ?";
    // Handle both Date objects and ISO strings
    const dateStr = filters.startDate instanceof Date
      ? filters.startDate.toISOString().split("T")[0]
      : String(filters.startDate).split("T")[0];
    params.push(dateStr);
  }

  if (filters?.endDate) {
    whereClause += " AND t.date <= ?";
    // Handle both Date objects and ISO strings
    const dateStr = filters.endDate instanceof Date
      ? filters.endDate.toISOString().split("T")[0]
      : String(filters.endDate).split("T")[0];
    params.push(dateStr);
  }

  if (filters?.type) {
    whereClause += " AND t.type = ?";
    params.push(filters.type);
  }

  if (filters?.projectId) {
    whereClause += " AND t.project_id = ?";
    params.push(filters.projectId);
  }

  if (filters?.categoryId) {
    whereClause += " AND t.category_id = ?";
    params.push(filters.categoryId);
  }

  if (filters?.contactId) {
    whereClause += " AND t.contact_id = ?";
    params.push(filters.contactId);
  }

  if (filters?.minAmount !== undefined) {
    whereClause += " AND t.amount_inr >= ?";
    params.push(filters.minAmount);
  }

  if (filters?.maxAmount !== undefined) {
    whereClause += " AND t.amount_inr <= ?";
    params.push(filters.maxAmount);
  }

  if (filters?.searchQuery) {
    whereClause += " AND (t.description LIKE ? OR t.notes LIKE ?)";
    params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
  }

  // Get totals
  const totalsResult = db.getFirstSync<{
    total: number;
    total_income: number;
    total_expenses: number;
  }>(
    `SELECT
       COUNT(*) as total,
       COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_inr ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_inr ELSE 0 END), 0) as total_expenses
     FROM transactions t
     ${whereClause};`,
    params
  );

  const total = totalsResult?.total ?? 0;
  const totalIncome = totalsResult?.total_income ?? 0;
  const totalExpenses = totalsResult?.total_expenses ?? 0;

  // Get paginated transactions
  let query = `
    SELECT t.*,
           c.name as contact_name,
           cat.name as category_name,
           p.name as project_name
    FROM transactions t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN categories cat ON t.category_id = cat.id
    LEFT JOIN projects p ON t.project_id = p.id
    ${whereClause}
    ORDER BY t.date DESC, t.created_at DESC
  `;

  const limit = filters?.limit ?? 30;
  const skip = filters?.skip ?? 0;

  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, skip);

  const rows = db.getAllSync<TransactionRow>(query, params);
  const transactions = rows.map(transformRow);

  return {
    transactions,
    total,
    totalIncome,
    totalExpenses,
    hasMore: skip + transactions.length < total,
  };
};

/**
 * Get transaction by ID
 */
export const getTransactionById = (id: string): ITransaction | null => {
  const row = db.getFirstSync<TransactionRow>(
    `SELECT t.*,
            c.name as contact_name,
            cat.name as category_name,
            p.name as project_name
     FROM transactions t
     LEFT JOIN contacts c ON t.contact_id = c.id
     LEFT JOIN categories cat ON t.category_id = cat.id
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE t.id = ?;`,
    [id]
  );
  return row ? transformRow(row) : null;
};

/**
 * Create a new transaction
 */
export const createTransaction = (params: {
  amount: number;
  currency?: Currency;
  amountINR: number;
  type: TransactionType;
  date: Date | string;
  contactId?: string;
  categoryId?: string;
  projectId?: string;
  allocations?: IAllocation[];
  description?: string;
  notes?: string;
  rawInputId?: string;
  isRecurring?: boolean;
  recurringGroupId?: string;
  needsReview?: boolean;
  confidence?: number;
  reviewReason?: ITransaction["reviewReason"];
  potentialDuplicateIds?: string[];
  missingFields?: string[];
}): ITransaction => {
  const id = generateId();
  const now = new Date().toISOString();
  const dateStr =
    typeof params.date === "string"
      ? params.date.split("T")[0]
      : params.date.toISOString().split("T")[0];

  db.runSync(
    `INSERT INTO transactions (
       id, amount, currency, amount_inr, type, date, contact_id, category_id, project_id,
       allocations_json, description, notes, raw_input_id, is_recurring, recurring_group_id,
       needs_review, confidence, review_reason, potential_duplicate_ids_json, missing_fields_json,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      params.amount,
      params.currency ?? "INR",
      params.amountINR,
      params.type,
      dateStr,
      params.contactId ?? null,
      params.categoryId ?? null,
      params.projectId ?? null,
      params.allocations ? JSON.stringify(params.allocations) : null,
      params.description ?? null,
      params.notes ?? null,
      params.rawInputId ?? null,
      params.isRecurring ? 1 : 0,
      params.recurringGroupId ?? null,
      params.needsReview ? 1 : 0,
      params.confidence ?? null,
      params.reviewReason ?? null,
      params.potentialDuplicateIds
        ? JSON.stringify(params.potentialDuplicateIds)
        : null,
      params.missingFields ? JSON.stringify(params.missingFields) : null,
      now,
      now,
    ]
  );

  // Update contact totals if contact is specified
  if (params.contactId) {
    recalculateContactTotals(params.contactId);
  }

  return getTransactionById(id)!;
};

/**
 * Update a transaction
 */
export const updateTransaction = (params: {
  id: string;
  amount?: number;
  currency?: Currency;
  amountINR?: number;
  type?: TransactionType;
  date?: Date | string;
  contactId?: string | null;
  categoryId?: string | null;
  projectId?: string | null;
  allocations?: IAllocation[] | null;
  description?: string | null;
  notes?: string | null;
  needsReview?: boolean;
  confidence?: number | null;
  reviewReason?: ITransaction["reviewReason"] | null;
}): ITransaction | null => {
  const existing = getTransactionById(params.id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const oldContactId = existing.contactId;

  let dateStr: string | undefined;
  if (params.date) {
    dateStr =
      typeof params.date === "string"
        ? params.date.split("T")[0]
        : params.date.toISOString().split("T")[0];
  }

  db.runSync(
    `UPDATE transactions
     SET amount = ?, currency = ?, amount_inr = ?, type = ?, date = ?,
         contact_id = ?, category_id = ?, project_id = ?, allocations_json = ?,
         description = ?, notes = ?, needs_review = ?, confidence = ?, review_reason = ?,
         updated_at = ?
     WHERE id = ?;`,
    [
      params.amount ?? existing.amount,
      params.currency ?? existing.currency,
      params.amountINR ?? existing.amountINR,
      params.type ?? existing.type,
      dateStr ?? existing.date.toISOString().split("T")[0],
      params.contactId === null
        ? null
        : params.contactId ?? existing.contactId ?? null,
      params.categoryId === null
        ? null
        : params.categoryId ?? existing.categoryId ?? null,
      params.projectId === null
        ? null
        : params.projectId ?? existing.projectId ?? null,
      params.allocations === null
        ? null
        : params.allocations
          ? JSON.stringify(params.allocations)
          : existing.allocations
            ? JSON.stringify(existing.allocations)
            : null,
      params.description === null
        ? null
        : params.description ?? existing.description ?? null,
      params.notes === null ? null : params.notes ?? existing.notes ?? null,
      params.needsReview !== undefined
        ? params.needsReview
          ? 1
          : 0
        : existing.needsReview
          ? 1
          : 0,
      params.confidence === null
        ? null
        : params.confidence ?? existing.confidence ?? null,
      params.reviewReason === null
        ? null
        : params.reviewReason ?? existing.reviewReason ?? null,
      now,
      params.id,
    ]
  );

  // Update contact totals
  const newContactId =
    params.contactId === null
      ? undefined
      : params.contactId ?? existing.contactId;
  if (oldContactId) {
    recalculateContactTotals(oldContactId);
  }
  if (newContactId && newContactId !== oldContactId) {
    recalculateContactTotals(newContactId);
  }

  return getTransactionById(params.id);
};

/**
 * Delete a transaction
 */
export const deleteTransaction = (id: string): boolean => {
  const existing = getTransactionById(id);
  if (!existing) return false;

  const contactId = existing.contactId;

  db.runSync("DELETE FROM transactions WHERE id = ?;", [id]);

  // Update contact totals
  if (contactId) {
    recalculateContactTotals(contactId);
  }

  return true;
};

/**
 * Get flagged transactions (need review)
 */
export const getFlaggedTransactions = (params?: {
  limit?: number;
  skip?: number;
}): {
  transactions: ITransaction[];
  total: number;
  hasMore: boolean;
} => {
  const limit = params?.limit ?? 20;
  const skip = params?.skip ?? 0;

  const totalResult = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM transactions WHERE needs_review = 1;"
  );
  const total = totalResult?.count ?? 0;

  const rows = db.getAllSync<TransactionRow>(
    `SELECT t.*,
            c.name as contact_name,
            cat.name as category_name,
            p.name as project_name
     FROM transactions t
     LEFT JOIN contacts c ON t.contact_id = c.id
     LEFT JOIN categories cat ON t.category_id = cat.id
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE t.needs_review = 1
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?;`,
    [limit, skip]
  );

  const transactions = rows.map(transformRow);

  return {
    transactions,
    total,
    hasMore: skip + transactions.length < total,
  };
};

/**
 * Mark transaction as reviewed
 */
export const markTransactionReviewed = (id: string): boolean => {
  const existing = getTransactionById(id);
  if (!existing) return false;

  db.runSync(
    `UPDATE transactions
     SET needs_review = 0, review_reason = NULL, potential_duplicate_ids_json = NULL,
         missing_fields_json = NULL, updated_at = ?
     WHERE id = ?;`,
    [new Date().toISOString(), id]
  );

  return true;
};

/**
 * Get count of flagged transactions
 */
export const getFlaggedCount = (): number => {
  const result = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM transactions WHERE needs_review = 1;"
  );
  return result?.count ?? 0;
};

/**
 * Get recent transactions for dashboard
 */
export const getRecentTransactions = (limit: number = 10): ITransaction[] => {
  const rows = db.getAllSync<TransactionRow>(
    `SELECT t.*,
            c.name as contact_name,
            cat.name as category_name,
            p.name as project_name
     FROM transactions t
     LEFT JOIN contacts c ON t.contact_id = c.id
     LEFT JOIN categories cat ON t.category_id = cat.id
     LEFT JOIN projects p ON t.project_id = p.id
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ?;`,
    [limit]
  );
  return rows.map(transformRow);
};

/**
 * Get dashboard totals
 */
export const getDashboardTotals = (): {
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
} => {
  const result = db.getFirstSync<{
    total_income: number;
    total_expenses: number;
    count: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_inr ELSE 0 END), 0) as total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_inr ELSE 0 END), 0) as total_expenses,
       COUNT(*) as count
     FROM transactions;`
  );

  return {
    totalIncome: result?.total_income ?? 0,
    totalExpenses: result?.total_expenses ?? 0,
    transactionCount: result?.count ?? 0,
  };
};
