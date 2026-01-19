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
  HOME: "/tabs/home",
  PROFILE: "/tabs/profile",

  // Profile screens
  EDIT_PROFILE: "/profile/edit",
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
