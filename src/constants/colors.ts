/**
 * App color palette
 * Use these constants instead of hardcoded color values for consistency
 */
export const COLORS = {
  // Primary Brand
  primary: "#3b82f6", // Blue primary - customize as needed
  primaryDark: "#2563eb",
  primaryLight: "#60a5fa",

  // Grays (Standard Tailwind)
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",

  // Semantic colors
  white: "#ffffff",
  black: "#000000",

  // Status colors
  success: "#10b981",
  successLight: "#d1fae5",
  error: "#ef4444",
  errorLight: "#fef2f2",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  info: "#3b82f6",
  infoLight: "#dbeafe",

  // Background colors
  background: "#ffffff",
  backgroundSecondary: "#f9fafb",

  // Text colors
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textTertiary: "#9ca3af",
  textDisabled: "#d1d5db",

  // Border colors
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  borderDark: "#d1d5db",

  // Shadow color
  shadow: "#000000",
} as const;

export type ColorKey = keyof typeof COLORS;

/**
 * Common shadow configurations
 */
export const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
