/**
 * Route path constants
 * Use these instead of hardcoded strings for type safety
 */
export const ROUTES = {
  // Root
  INDEX: "/",

  // Auth
  AUTH: "/auth",

  // Main tabs
  TABS: "/tabs",
  DASHBOARD: "/tabs/dashboard",
  PROJECTS: "/tabs/projects",
  ADD: "/tabs/add",
  TRANSACTIONS: "/tabs/transactions",
  PROFILE: "/tabs/profile",

  // Project screens
  PROJECT_DETAIL: "/projects/[id]",

  // Transaction screens
  TRANSACTION_CONFIRM: "/transactions/confirm",
  TRANSACTION_EDIT: "/transactions/[id]/edit",
  BULK_TRANSACTIONS: "/transactions/bulk",
  FLAGGED_TRANSACTIONS: "/transactions/flagged",

  // Settings screens
  CUSTOMERS: "/settings/contacts?type=customer",
  SUPPLIERS: "/settings/contacts?type=supplier",
  EMPLOYEES: "/settings/employees",
  CATEGORIES: "/settings/categories",

  // Contact screens
  CONTACT_DETAIL: "/contacts/[id]",

  // Profile screens
  EDIT_PROFILE: "/profile/edit",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];

/**
 * Helper to build dynamic routes
 */
export const buildRoute = {
  projectDetail: (id: string) => `/projects/${id}` as const,
  transactionEdit: (id: string) => `/transactions/${id}/edit` as const,
  contactDetail: (id: string) => `/contacts/${id}` as const,
};
