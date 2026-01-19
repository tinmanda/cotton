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

  // Settings screens
  MERCHANTS: "/settings/merchants",
  EMPLOYEES: "/settings/employees",
  CATEGORIES: "/settings/categories",

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
};
