import db, { generateId } from "../index";
import { IContact } from "@/types";

/**
 * Contact row from SQLite
 */
interface ContactRow {
  id: string;
  name: string;
  aliases_json: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  notes: string | null;
  total_spent: number;
  total_received: number;
  transaction_count: number;
  default_category_id: string | null;
  project_id: string | null;
  project_name?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transform SQLite row to IContact
 */
const transformRow = (row: ContactRow): IContact => ({
  id: row.id,
  name: row.name,
  aliases: JSON.parse(row.aliases_json || "[]"),
  email: row.email ?? undefined,
  phone: row.phone ?? undefined,
  company: row.company ?? undefined,
  website: row.website ?? undefined,
  notes: row.notes ?? undefined,
  totalSpent: row.total_spent,
  totalReceived: row.total_received,
  transactionCount: row.transaction_count,
  defaultCategoryId: row.default_category_id ?? undefined,
  projectId: row.project_id ?? undefined,
  projectName: row.project_name ?? undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

/**
 * Get all contacts
 */
export const getAllContacts = (params?: {
  projectId?: string;
  search?: string;
  limit?: number;
}): IContact[] => {
  let query = `
    SELECT c.*, p.name as project_name
    FROM contacts c
    LEFT JOIN projects p ON c.project_id = p.id
    WHERE 1=1
  `;
  const queryParams: (string | number)[] = [];

  if (params?.projectId) {
    query += " AND c.project_id = ?";
    queryParams.push(params.projectId);
  }

  if (params?.search) {
    query += " AND (c.name LIKE ? OR c.aliases_json LIKE ?)";
    queryParams.push(`%${params.search}%`, `%${params.search}%`);
  }

  query += " ORDER BY c.name ASC";

  if (params?.limit) {
    query += " LIMIT ?";
    queryParams.push(params.limit);
  }

  const rows = db.getAllSync<ContactRow>(query, queryParams);
  return rows.map(transformRow);
};

/**
 * Get contact by ID
 */
export const getContactById = (id: string): IContact | null => {
  const row = db.getFirstSync<ContactRow>(
    `SELECT c.*, p.name as project_name
     FROM contacts c
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE c.id = ?;`,
    [id]
  );
  return row ? transformRow(row) : null;
};

/**
 * Find contact by name or alias
 */
export const findContactByNameOrAlias = (name: string): IContact | null => {
  const normalizedName = name.toLowerCase().trim();

  // First try exact name match
  let row = db.getFirstSync<ContactRow>(
    `SELECT c.*, p.name as project_name
     FROM contacts c
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE LOWER(c.name) = ?;`,
    [normalizedName]
  );

  if (row) return transformRow(row);

  // Then try alias match
  const allContacts = getAllContacts();
  for (const contact of allContacts) {
    if (contact.aliases.some((a) => a.toLowerCase() === normalizedName)) {
      return contact;
    }
  }

  return null;
};

/**
 * Create a new contact
 */
export const createContact = (params: {
  name: string;
  aliases?: string[];
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  notes?: string;
  defaultCategoryId?: string;
  projectId?: string;
}): IContact => {
  const id = generateId();
  const now = new Date().toISOString();

  db.runSync(
    `INSERT INTO contacts (id, name, aliases_json, email, phone, company, website, notes,
       total_spent, total_received, transaction_count, default_category_id, project_id,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?);`,
    [
      id,
      params.name,
      JSON.stringify(params.aliases || []),
      params.email ?? null,
      params.phone ?? null,
      params.company ?? null,
      params.website ?? null,
      params.notes ?? null,
      params.defaultCategoryId ?? null,
      params.projectId ?? null,
      now,
      now,
    ]
  );

  return getContactById(id)!;
};

/**
 * Update a contact
 */
export const updateContact = (params: {
  id: string;
  name?: string;
  aliases?: string[];
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  notes?: string | null;
  defaultCategoryId?: string | null;
  projectId?: string | null;
}): IContact | null => {
  const existing = getContactById(params.id);
  if (!existing) return null;

  const now = new Date().toISOString();

  db.runSync(
    `UPDATE contacts
     SET name = ?, aliases_json = ?, email = ?, phone = ?, company = ?,
         website = ?, notes = ?, default_category_id = ?, project_id = ?, updated_at = ?
     WHERE id = ?;`,
    [
      params.name ?? existing.name,
      JSON.stringify(params.aliases ?? existing.aliases),
      params.email === null ? null : (params.email ?? existing.email ?? null),
      params.phone === null ? null : (params.phone ?? existing.phone ?? null),
      params.company === null ? null : (params.company ?? existing.company ?? null),
      params.website === null ? null : (params.website ?? existing.website ?? null),
      params.notes === null ? null : (params.notes ?? existing.notes ?? null),
      params.defaultCategoryId === null ? null : (params.defaultCategoryId ?? existing.defaultCategoryId ?? null),
      params.projectId === null ? null : (params.projectId ?? existing.projectId ?? null),
      now,
      params.id,
    ]
  );

  return getContactById(params.id);
};

/**
 * Delete a contact
 */
export const deleteContact = (id: string): boolean => {
  const existing = getContactById(id);
  if (!existing) return false;

  // Check if contact has transactions
  if (existing.transactionCount > 0) {
    throw new Error(
      `Cannot delete contact: ${existing.transactionCount} transactions are associated with this contact`
    );
  }

  db.runSync("DELETE FROM contacts WHERE id = ?;", [id]);
  return true;
};

/**
 * Update contact totals after a transaction is added/updated/deleted
 * This recalculates the totals from the transactions table
 */
export const recalculateContactTotals = (contactId: string): void => {
  const result = db.getFirstSync<{
    total_spent: number;
    total_received: number;
    transaction_count: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_inr ELSE 0 END), 0) as total_spent,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_inr ELSE 0 END), 0) as total_received,
       COUNT(*) as transaction_count
     FROM transactions
     WHERE contact_id = ?;`,
    [contactId]
  );

  if (result) {
    db.runSync(
      `UPDATE contacts
       SET total_spent = ?, total_received = ?, transaction_count = ?, updated_at = ?
       WHERE id = ?;`,
      [
        result.total_spent,
        result.total_received,
        result.transaction_count,
        new Date().toISOString(),
        contactId,
      ]
    );
  }
};

/**
 * Get or create a contact by name
 * Used when creating transactions with a contact name
 */
export const getOrCreateContact = (name: string): IContact => {
  // Try to find existing contact
  const existing = findContactByNameOrAlias(name);
  if (existing) return existing;

  // Create new contact
  return createContact({ name });
};
