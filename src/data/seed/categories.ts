import { TransactionType } from "@/types";

/**
 * Default categories seeded on first run
 * These are system categories that cannot be deleted
 */

interface SeedCategory {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isSystem: boolean;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  // Expense Categories
  {
    id: "cat_software",
    name: "Software & Tools",
    type: "expense",
    icon: "laptop",
    color: "#3B82F6",
    isSystem: true,
  },
  {
    id: "cat_hosting",
    name: "Hosting & Cloud",
    type: "expense",
    icon: "cloud",
    color: "#8B5CF6",
    isSystem: true,
  },
  {
    id: "cat_marketing",
    name: "Marketing",
    type: "expense",
    icon: "megaphone",
    color: "#EC4899",
    isSystem: true,
  },
  {
    id: "cat_contractor",
    name: "Contractors",
    type: "expense",
    icon: "users",
    color: "#F59E0B",
    isSystem: true,
  },
  {
    id: "cat_office",
    name: "Office & Equipment",
    type: "expense",
    icon: "building-2",
    color: "#10B981",
    isSystem: true,
  },
  {
    id: "cat_travel",
    name: "Travel",
    type: "expense",
    icon: "plane",
    color: "#06B6D4",
    isSystem: true,
  },
  {
    id: "cat_food",
    name: "Food & Meals",
    type: "expense",
    icon: "utensils",
    color: "#EF4444",
    isSystem: true,
  },
  {
    id: "cat_utilities",
    name: "Utilities",
    type: "expense",
    icon: "zap",
    color: "#F97316",
    isSystem: true,
  },
  {
    id: "cat_taxes",
    name: "Taxes & Fees",
    type: "expense",
    icon: "receipt",
    color: "#6366F1",
    isSystem: true,
  },
  {
    id: "cat_other_expense",
    name: "Other Expense",
    type: "expense",
    icon: "circle-dot",
    color: "#78716C",
    isSystem: true,
  },

  // Income Categories
  {
    id: "cat_client_payment",
    name: "Client Payment",
    type: "income",
    icon: "banknote",
    color: "#22C55E",
    isSystem: true,
  },
  {
    id: "cat_product_sale",
    name: "Product Sale",
    type: "income",
    icon: "shopping-bag",
    color: "#14B8A6",
    isSystem: true,
  },
  {
    id: "cat_subscription",
    name: "Subscription Revenue",
    type: "income",
    icon: "repeat",
    color: "#0EA5E9",
    isSystem: true,
  },
  {
    id: "cat_consulting",
    name: "Consulting",
    type: "income",
    icon: "briefcase",
    color: "#A855F7",
    isSystem: true,
  },
  {
    id: "cat_investment",
    name: "Investment Returns",
    type: "income",
    icon: "trending-up",
    color: "#84CC16",
    isSystem: true,
  },
  {
    id: "cat_refund",
    name: "Refund",
    type: "income",
    icon: "rotate-ccw",
    color: "#64748B",
    isSystem: true,
  },
  {
    id: "cat_other_income",
    name: "Other Income",
    type: "income",
    icon: "circle-dot",
    color: "#78716C",
    isSystem: true,
  },
];
