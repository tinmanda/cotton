import db, { generateId } from "../index";
import { IProject, ProjectType, ProjectStatus, Currency } from "@/types";

/**
 * Project row from SQLite
 */
interface ProjectRow {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  color: string;
  monthly_budget: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

/**
 * Transform SQLite row to IProject
 */
const transformRow = (row: ProjectRow): IProject => ({
  id: row.id,
  name: row.name,
  type: row.type as ProjectType,
  status: row.status as ProjectStatus,
  description: row.description ?? undefined,
  color: row.color,
  monthlyBudget: row.monthly_budget ?? undefined,
  currency: row.currency as Currency,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

/**
 * Get all projects
 */
export const getAllProjects = (status?: ProjectStatus): IProject[] => {
  let query = "SELECT * FROM projects";
  const params: string[] = [];

  if (status) {
    query += " WHERE status = ?";
    params.push(status);
  }

  query += " ORDER BY created_at DESC";

  const rows = db.getAllSync<ProjectRow>(query, params);
  return rows.map(transformRow);
};

/**
 * Get project by ID
 */
export const getProjectById = (id: string): IProject | null => {
  const row = db.getFirstSync<ProjectRow>(
    "SELECT * FROM projects WHERE id = ?;",
    [id]
  );
  return row ? transformRow(row) : null;
};

/**
 * Create a new project
 */
export const createProject = (params: {
  name: string;
  type: ProjectType;
  description?: string;
  color: string;
  monthlyBudget?: number;
  currency?: Currency;
}): IProject => {
  const id = generateId();
  const now = new Date().toISOString();

  db.runSync(
    `INSERT INTO projects (id, name, type, status, description, color, monthly_budget, currency, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?);`,
    [
      id,
      params.name,
      params.type,
      params.description ?? null,
      params.color,
      params.monthlyBudget ?? null,
      params.currency ?? "INR",
      now,
      now,
    ]
  );

  return {
    id,
    name: params.name,
    type: params.type,
    status: "active",
    description: params.description,
    color: params.color,
    monthlyBudget: params.monthlyBudget,
    currency: params.currency ?? "INR",
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
};

/**
 * Update a project
 */
export const updateProject = (params: {
  id: string;
  name?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  description?: string | null;
  color?: string;
  monthlyBudget?: number | null;
  currency?: Currency;
}): IProject | null => {
  const existing = getProjectById(params.id);
  if (!existing) return null;

  const now = new Date().toISOString();

  db.runSync(
    `UPDATE projects
     SET name = ?, type = ?, status = ?, description = ?, color = ?,
         monthly_budget = ?, currency = ?, updated_at = ?
     WHERE id = ?;`,
    [
      params.name ?? existing.name,
      params.type ?? existing.type,
      params.status ?? existing.status,
      params.description === null ? null : (params.description ?? existing.description ?? null),
      params.color ?? existing.color,
      params.monthlyBudget === null ? null : (params.monthlyBudget ?? existing.monthlyBudget ?? null),
      params.currency ?? existing.currency,
      now,
      params.id,
    ]
  );

  return getProjectById(params.id);
};

/**
 * Delete a project
 */
export const deleteProject = (id: string): boolean => {
  const existing = getProjectById(id);
  if (!existing) return false;

  // Check if project has transactions
  const transactionCount = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM transactions WHERE project_id = ?;",
    [id]
  );

  if (transactionCount && transactionCount.count > 0) {
    throw new Error(
      `Cannot delete project: ${transactionCount.count} transactions belong to this project`
    );
  }

  db.runSync("DELETE FROM projects WHERE id = ?;", [id]);
  return true;
};

/**
 * Get project financial summary
 */
export const getProjectSummary = (
  projectId: string
): { income: number; expenses: number; net: number; transactionCount: number } | null => {
  const project = getProjectById(projectId);
  if (!project) return null;

  const result = db.getFirstSync<{
    income: number;
    expenses: number;
    count: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_inr ELSE 0 END), 0) as income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_inr ELSE 0 END), 0) as expenses,
       COUNT(*) as count
     FROM transactions
     WHERE project_id = ?;`,
    [projectId]
  );

  if (!result) {
    return { income: 0, expenses: 0, net: 0, transactionCount: 0 };
  }

  return {
    income: result.income,
    expenses: result.expenses,
    net: result.income - result.expenses,
    transactionCount: result.count,
  };
};

/**
 * Get all projects with their financial summaries
 */
export const getProjectsWithSummaries = (
  status?: ProjectStatus
): Array<IProject & { income: number; expenses: number; net: number }> => {
  let query = `
    SELECT p.*,
           COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_inr ELSE 0 END), 0) as income,
           COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_inr ELSE 0 END), 0) as expenses
    FROM projects p
    LEFT JOIN transactions t ON p.id = t.project_id
  `;

  const params: string[] = [];

  if (status) {
    query += " WHERE p.status = ?";
    params.push(status);
  }

  query += " GROUP BY p.id ORDER BY p.created_at DESC";

  const rows = db.getAllSync<ProjectRow & { income: number; expenses: number }>(
    query,
    params
  );

  return rows.map((row) => ({
    ...transformRow(row),
    income: row.income,
    expenses: row.expenses,
    net: row.income - row.expenses,
  }));
};
