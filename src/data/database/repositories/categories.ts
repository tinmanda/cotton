import db, { generateId } from "../index";
import { ICategory, TransactionType } from "@/types";

/**
 * Category row from SQLite
 */
interface CategoryRow {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  is_system: number;
  created_at: string;
  updated_at: string;
}

/**
 * Transform SQLite row to ICategory
 */
const transformRow = (row: CategoryRow): ICategory => ({
  id: row.id,
  name: row.name,
  type: row.type as TransactionType,
  icon: row.icon,
  color: row.color,
  isSystem: row.is_system === 1,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

/**
 * Get all categories
 */
export const getAllCategories = (type?: TransactionType): ICategory[] => {
  let query = "SELECT * FROM categories";
  const params: string[] = [];

  if (type) {
    query += " WHERE type = ?";
    params.push(type);
  }

  query += " ORDER BY name ASC";

  const rows = db.getAllSync<CategoryRow>(query, params);
  return rows.map(transformRow);
};

/**
 * Get category by ID
 */
export const getCategoryById = (id: string): ICategory | null => {
  const row = db.getFirstSync<CategoryRow>(
    "SELECT * FROM categories WHERE id = ?;",
    [id]
  );
  return row ? transformRow(row) : null;
};

/**
 * Create a new category
 */
export const createCategory = (params: {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isSystem?: boolean;
}): ICategory => {
  const id = generateId();
  const now = new Date().toISOString();

  db.runSync(
    `INSERT INTO categories (id, name, type, icon, color, is_system, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      params.name,
      params.type,
      params.icon,
      params.color,
      params.isSystem ? 1 : 0,
      now,
      now,
    ]
  );

  return {
    id,
    name: params.name,
    type: params.type,
    icon: params.icon,
    color: params.color,
    isSystem: params.isSystem ?? false,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
};

/**
 * Update a category
 */
export const updateCategory = (params: {
  id: string;
  name?: string;
  icon?: string;
  color?: string;
}): ICategory | null => {
  const existing = getCategoryById(params.id);
  if (!existing) return null;

  // Don't allow updating system categories
  if (existing.isSystem) {
    throw new Error("Cannot update system categories");
  }

  const now = new Date().toISOString();

  db.runSync(
    `UPDATE categories
     SET name = ?, icon = ?, color = ?, updated_at = ?
     WHERE id = ?;`,
    [
      params.name ?? existing.name,
      params.icon ?? existing.icon,
      params.color ?? existing.color,
      now,
      params.id,
    ]
  );

  return getCategoryById(params.id);
};

/**
 * Delete a category
 * Note: System categories cannot be deleted
 */
export const deleteCategory = (id: string): boolean => {
  const existing = getCategoryById(id);
  if (!existing) return false;

  if (existing.isSystem) {
    throw new Error("Cannot delete system categories");
  }

  // Check if category is used in any transactions
  const transactionCount = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;",
    [id]
  );

  if (transactionCount && transactionCount.count > 0) {
    throw new Error(
      `Cannot delete category: ${transactionCount.count} transactions use this category`
    );
  }

  db.runSync("DELETE FROM categories WHERE id = ?;", [id]);
  return true;
};

/**
 * Get categories with transaction counts
 */
export const getCategoriesWithCounts = (
  type?: TransactionType
): Array<ICategory & { transactionCount: number; totalAmount: number }> => {
  let query = `
    SELECT c.*,
           COUNT(t.id) as transaction_count,
           COALESCE(SUM(t.amount_inr), 0) as total_amount
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id
  `;

  const params: string[] = [];

  if (type) {
    query += " WHERE c.type = ?";
    params.push(type);
  }

  query += " GROUP BY c.id ORDER BY c.name ASC";

  const rows = db.getAllSync<CategoryRow & { transaction_count: number; total_amount: number }>(
    query,
    params
  );

  return rows.map((row) => ({
    ...transformRow(row),
    transactionCount: row.transaction_count,
    totalAmount: row.total_amount,
  }));
};
