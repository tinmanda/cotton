/**
 * Finance tracking types for Cotton
 * Solo founder expense/income tracking across multiple projects
 */

// ============================================
// Enums and Constants
// ============================================

export type TransactionType = "income" | "expense";
export type Currency = "INR" | "USD";
export type ProjectStatus = "active" | "paused" | "closed";
export type ProjectType = "service" | "product" | "investment" | "other";
export type EmployeeStatus = "active" | "inactive";
export type RawInputStatus = "pending" | "processed" | "failed";
export type RawInputSource = "sms" | "email" | "manual" | "voice";

// ============================================
// Core Models
// ============================================

/**
 * Project - A business venture or investment
 */
export interface IProject {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  description?: string;
  color: string; // Hex color for UI
  monthlyBudget?: number;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category - Transaction categorization
 */
export interface ICategory {
  id: string;
  name: string;
  type: TransactionType;
  icon: string; // Lucide icon name
  color: string; // Hex color
  isSystem: boolean; // System categories can't be deleted
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Merchant - Vendor or client
 */
export interface IMerchant {
  id: string;
  name: string;
  aliases: string[]; // Alternative names for AI matching
  defaultCategoryId?: string;
  defaultProjectId?: string;
  website?: string;
  notes?: string;
  totalSpent: number; // Aggregated expense total
  totalReceived: number; // Aggregated income total
  transactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Employee - Team member with salary tracking
 */
export interface IEmployee {
  id: string;
  name: string;
  role: string;
  projectId: string;
  projectName?: string; // Denormalized for display
  monthlySalary: number;
  currency: Currency;
  status: EmployeeStatus;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project allocation for shared expenses
 */
export interface IAllocation {
  projectId: string;
  projectName?: string; // For display
  amount: number;
  percentage: number;
}

/**
 * Transaction - Single money movement
 */
export interface ITransaction {
  id: string;
  amount: number;
  currency: Currency;
  amountINR: number; // Normalized to INR for reporting
  type: TransactionType;
  date: Date;
  merchantId?: string;
  merchantName?: string; // Denormalized for display
  categoryId?: string;
  categoryName?: string; // Denormalized for display
  projectId?: string; // Null if shared expense
  projectName?: string; // Denormalized for display
  employeeId?: string; // If salary payment
  employeeName?: string; // Denormalized for display
  allocations?: IAllocation[]; // For shared expenses
  description?: string;
  notes?: string;
  rawInputId?: string;
  isRecurring: boolean;
  recurringGroupId?: string; // To group recurring transactions
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RawInput - Original pasted text for audit trail
 */
export interface IRawInput {
  id: string;
  originalText: string;
  source: RawInputSource;
  parsedData?: ParsedTransactionData;
  transactionId?: string;
  status: RawInputStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API Response Types
// ============================================

/**
 * AI-parsed transaction data from raw input
 */
export interface ParsedTransactionData {
  amount: number;
  currency: Currency;
  type: TransactionType;
  date: string; // ISO date string
  merchantName?: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  suggestedProjectId?: string;
  suggestedProjectName?: string;
  description?: string;
  confidence: number; // 0-1 confidence score
  needsReview: boolean;
  rawExtracted: {
    amountString?: string;
    dateString?: string;
    merchantString?: string;
  };
}

/**
 * Response from parseTransaction cloud function
 */
export interface ParseTransactionResponse {
  parsed: ParsedTransactionData;
  rawInputId: string;
  existingMerchant?: IMerchant;
  suggestedCategory?: ICategory;
  suggestedProject?: IProject;
}

/**
 * Request to confirm/create transaction from parsed data
 */
export interface CreateTransactionFromParsedRequest {
  rawInputId: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  date: string;
  merchantName: string;
  categoryId?: string;
  projectId?: string;
  employeeId?: string;
  allocations?: IAllocation[];
  description?: string;
  notes?: string;
  isRecurring?: boolean;
}

/**
 * Parsed transaction item from bulk parsing
 */
export interface ParsedBulkTransaction {
  amount: number;
  currency: Currency;
  type: TransactionType;
  date: string;
  merchantName: string;
  existingMerchantId?: string | null;
  existingEmployeeId?: string | null;
  suggestedCategoryId?: string | null;
  suggestedProjectId?: string | null;
  description?: string;
}

/**
 * Response from parseBulkTransactions cloud function
 */
export interface ParseBulkTransactionsResponse {
  transactions: ParsedBulkTransaction[];
  summary: string;
  confidence: number;
  rawInputId: string;
  categories: Array<{ id: string; name: string; type: TransactionType }>;
  projects: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; name: string; role: string; projectId?: string; monthlySalary: number }>;
}

/**
 * Response from parseTransactionFromImage cloud function
 */
export interface ParseImageTransactionsResponse {
  transactions: ParsedBulkTransaction[];
  documentType: "receipt" | "invoice" | "bank_statement" | "other";
  summary: string;
  confidence: number;
  rawInputId: string;
  categories: Array<{ id: string; name: string; type: TransactionType }>;
  projects: Array<{ id: string; name: string }>;
}

/**
 * Request to create bulk transactions
 */
export interface CreateBulkTransactionsRequest {
  transactions: Array<{
    amount: number;
    currency: Currency;
    type: TransactionType;
    date: string;
    merchantName: string;
    categoryId?: string;
    projectId?: string;
    employeeId?: string;
    description?: string;
  }>;
  rawInputId?: string;
}

/**
 * Response from createBulkTransactions cloud function
 */
export interface CreateBulkTransactionsResponse {
  created: number;
  transactions: Array<{
    id: string;
    amount: number;
    currency: Currency;
    type: TransactionType;
    date: string;
    merchantName: string;
  }>;
}

// ============================================
// Dashboard & Summary Types
// ============================================

/**
 * Project financial summary
 */
export interface IProjectSummary {
  project: IProject;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  employeeCount: number;
  topCategories: Array<{
    category: ICategory;
    amount: number;
    percentage: number;
  }>;
  topMerchants: Array<{
    merchant: IMerchant;
    amount: number;
    transactionCount: number;
  }>;
  monthlyTrend: Array<{
    month: string; // YYYY-MM format
    income: number;
    expenses: number;
    net: number;
  }>;
}

/**
 * Overall dashboard summary
 */
export interface IDashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  projectCount: number;
  merchantCount: number;
  employeeCount: number;
  recentTransactions: ITransaction[];
  projectSummaries: Array<{
    project: IProject;
    income: number;
    expenses: number;
    net: number;
  }>;
  topExpenseCategories: Array<{
    category: ICategory;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
}

/**
 * Filters for transaction queries
 */
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  type?: TransactionType;
  projectId?: string;
  categoryId?: string;
  merchantId?: string;
  employeeId?: string;
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
}
