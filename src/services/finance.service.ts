import Parse from "parse/react-native.js";
import {
  ApiResponse,
  IProject,
  ICategory,
  IContact,
  ITransaction,
  IRecurringTransaction,
  IDashboardSummary,
  IProjectSummary,
  ParseTransactionInputResponse,
  ImageInput,
  CreateBulkTransactionsRequest,
  CreateBulkTransactionsResponse,
  TransactionFilters,
  ProjectType,
  ProjectStatus,
  Currency,
  TransactionType,
  RecurringFrequency,
  IAllocation,
  successResponse,
  errorResponseFromUnknown,
} from "@/types";
import { CLOUD_FUNCTIONS } from "@/constants";

// Import SQLite repositories
import {
  getAllCategories,
  getCategoryById,
  createCategory as createCategoryRepo,
  updateCategory as updateCategoryRepo,
  deleteCategory as deleteCategoryRepo,
} from "@/data/database/repositories/categories";
import {
  getAllProjects,
  getProjectById,
  createProject as createProjectRepo,
  updateProject as updateProjectRepo,
  deleteProject as deleteProjectRepo,
  getProjectsWithSummaries,
  getProjectSummary as getProjectSummaryRepo,
} from "@/data/database/repositories/projects";
import {
  getAllContacts,
  getContactById,
  createContact as createContactRepo,
  updateContact as updateContactRepo,
  deleteContact as deleteContactRepo,
  getOrCreateContact,
  recalculateContactTotals,
} from "@/data/database/repositories/contacts";
import {
  getTransactions as getTransactionsRepo,
  getTransactionById,
  createTransaction as createTransactionRepo,
  updateTransaction as updateTransactionRepo,
  deleteTransaction as deleteTransactionRepo,
  getFlaggedTransactions as getFlaggedTransactionsRepo,
  markTransactionReviewed as markTransactionReviewedRepo,
  getFlaggedCount as getFlaggedCountRepo,
  getDashboardTotals,
  getRecentTransactions,
} from "@/data/database/repositories/transactions";
import {
  getAllRecurringTransactions,
  getRecurringTransactionById,
  createRecurringTransaction as createRecurringRepo,
  updateRecurringTransaction as updateRecurringRepo,
  deleteRecurringTransaction as deleteRecurringRepo,
  markRecurringTransactionCreated,
} from "@/data/database/repositories/recurring";
import { generateId } from "@/data/database";

/**
 * Finance service - Local-First Architecture
 *
 * - CRUD operations use SQLite (local)
 * - AI features use Back4App Cloud Functions (remote)
 */
export class FinanceService {
  // ============================================
  // Categories (Local SQLite)
  // ============================================

  /**
   * Seed default categories - now handled by SQLite migration
   */
  static async seedCategories(): Promise<
    ApiResponse<{ success: boolean; count: number }>
  > {
    // Categories are seeded automatically by SQLite migration
    const categories = getAllCategories();
    return successResponse({ success: true, count: categories.length });
  }

  /**
   * Get all categories
   */
  static async getCategories(
    type?: TransactionType
  ): Promise<ApiResponse<ICategory[]>> {
    try {
      const categories = getAllCategories(type);
      return successResponse(categories);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Projects (Local SQLite)
  // ============================================

  /**
   * Create a new project
   */
  static async createProject(params: {
    name: string;
    type: ProjectType;
    description?: string;
    color: string;
    monthlyBudget?: number;
    currency?: Currency;
  }): Promise<ApiResponse<IProject>> {
    try {
      const project = createProjectRepo(params);
      return successResponse(project);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get all projects
   */
  static async getProjects(
    status?: ProjectStatus
  ): Promise<ApiResponse<IProject[]>> {
    try {
      const projects = getAllProjects(status);
      return successResponse(projects);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Update a project
   */
  static async updateProject(params: {
    projectId: string;
    name?: string;
    type?: ProjectType;
    status?: ProjectStatus;
    description?: string;
    color?: string;
    monthlyBudget?: number | null;
    currency?: Currency;
  }): Promise<ApiResponse<IProject>> {
    try {
      const project = updateProjectRepo({
        id: params.projectId,
        name: params.name,
        type: params.type,
        status: params.status,
        description: params.description,
        color: params.color,
        monthlyBudget: params.monthlyBudget,
        currency: params.currency,
      });
      if (!project) {
        return errorResponseFromUnknown(new Error("Project not found"));
      }
      return successResponse(project);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Contacts (Local SQLite)
  // ============================================

  /**
   * Create a new contact
   */
  static async createContact(params: {
    name: string;
    aliases?: string[];
    email?: string;
    phone?: string;
    company?: string;
    website?: string;
    notes?: string;
    defaultCategoryId?: string;
    projectId?: string;
  }): Promise<ApiResponse<IContact>> {
    try {
      const contact = createContactRepo(params);
      return successResponse(contact);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get contacts with optional filters
   */
  static async getContacts(params?: {
    projectId?: string;
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<IContact[]>> {
    try {
      const contacts = getAllContacts(params);
      return successResponse(contacts);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Update a contact
   */
  static async updateContact(params: {
    contactId: string;
    name?: string;
    aliases?: string[];
    email?: string;
    phone?: string;
    company?: string;
    website?: string;
    notes?: string;
    defaultCategoryId?: string | null;
    projectId?: string | null;
  }): Promise<ApiResponse<IContact>> {
    try {
      const contact = updateContactRepo({
        id: params.contactId,
        name: params.name,
        aliases: params.aliases,
        email: params.email,
        phone: params.phone,
        company: params.company,
        website: params.website,
        notes: params.notes,
        defaultCategoryId: params.defaultCategoryId,
        projectId: params.projectId,
      });
      if (!contact) {
        return errorResponseFromUnknown(new Error("Contact not found"));
      }
      return successResponse(contact);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Delete a contact
   */
  static async deleteContact(
    contactId: string
  ): Promise<ApiResponse<{ success: boolean; deletedId: string }>> {
    try {
      const deleted = deleteContactRepo(contactId);
      if (!deleted) {
        return errorResponseFromUnknown(new Error("Contact not found"));
      }
      return successResponse({ success: true, deletedId: contactId });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Transactions (Local SQLite + AI from Back4App)
  // ============================================

  /**
   * Parse transactions from unified input (text and/or images)
   * Uses Back4App Cloud Function for AI processing
   */
  static async parseTransactionInput(params: {
    text?: string;
    images?: ImageInput[];
    source?: string;
  }): Promise<ApiResponse<ParseTransactionInputResponse>> {
    try {
      // Get context data for AI
      const contacts = getAllContacts();
      const categories = getAllCategories();
      const projects = getAllProjects();

      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.PARSE_TRANSACTION_INPUT,
        {
          ...params,
          // Send context for AI to use for matching
          context: {
            contacts: contacts.map((c) => ({
              id: c.id,
              name: c.name,
              aliases: c.aliases,
            })),
            categories: categories.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
            })),
            projects: projects.map((p) => ({
              id: p.id,
              name: p.name,
            })),
          },
        }
      );
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Create multiple transactions at once (from AI parsing)
   */
  static async createBulkTransactions(
    params: CreateBulkTransactionsRequest
  ): Promise<ApiResponse<CreateBulkTransactionsResponse>> {
    try {
      const created: Array<{
        id: string;
        amount: number;
        currency: Currency;
        type: TransactionType;
        date: string;
        contactName: string;
      }> = [];

      for (const t of params.transactions) {
        // Get or create contact
        const contact = getOrCreateContact(t.contactName);

        // Calculate INR amount (for now, assume 1:1 for INR, 83 for USD)
        const amountINR =
          t.currency === "USD" ? t.amount * 83 : t.amount;

        // Create transaction
        const transaction = createTransactionRepo({
          amount: t.amount,
          currency: t.currency,
          amountINR,
          type: t.type,
          date: t.date,
          contactId: contact.id,
          categoryId: t.categoryId,
          projectId: t.projectId,
          description: t.description,
          needsReview: t.needsReview,
          confidence: t.confidence,
        });

        created.push({
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          date:
            typeof transaction.date === "string"
              ? transaction.date
              : transaction.date.toISOString(),
          contactName: t.contactName,
        });
      }

      return successResponse({
        created: created.length,
        transactions: created,
      });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Create a transaction from parsed data
   */
  static async createTransactionFromParsed(params: {
    rawInputId?: string;
    amount: number;
    currency: Currency;
    type: TransactionType;
    date: string;
    contactName: string;
    categoryId?: string;
    projectId?: string;
    allocations?: IAllocation[];
    description?: string;
    notes?: string;
    isRecurring?: boolean;
  }): Promise<ApiResponse<ITransaction>> {
    try {
      // Get or create contact
      const contact = getOrCreateContact(params.contactName);

      // Calculate INR amount
      const amountINR =
        params.currency === "USD" ? params.amount * 83 : params.amount;

      const transaction = createTransactionRepo({
        amount: params.amount,
        currency: params.currency,
        amountINR,
        type: params.type,
        date: params.date,
        contactId: contact.id,
        categoryId: params.categoryId,
        projectId: params.projectId,
        allocations: params.allocations,
        description: params.description,
        notes: params.notes,
        rawInputId: params.rawInputId,
        isRecurring: params.isRecurring,
      });

      return successResponse(transaction);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get transactions with filters
   */
  static async getTransactions(
    filters?: TransactionFilters & { limit?: number; skip?: number }
  ): Promise<
    ApiResponse<{
      transactions: ITransaction[];
      total: number;
      totalIncome: number;
      totalExpenses: number;
      hasMore: boolean;
    }>
  > {
    try {
      const result = getTransactionsRepo(filters);
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Update a transaction
   */
  static async updateTransaction(params: {
    transactionId: string;
    amount?: number;
    currency?: Currency;
    type?: TransactionType;
    date?: string;
    contactName?: string;
    categoryId?: string | null;
    projectId?: string | null;
    description?: string;
    notes?: string;
  }): Promise<ApiResponse<ITransaction>> {
    try {
      // If contact name changed, get or create the contact
      let contactId: string | undefined | null;
      if (params.contactName) {
        const contact = getOrCreateContact(params.contactName);
        contactId = contact.id;
      }

      // Calculate INR amount if amount/currency changed
      let amountINR: number | undefined;
      if (params.amount !== undefined || params.currency !== undefined) {
        const existing = getTransactionById(params.transactionId);
        if (existing) {
          const amount = params.amount ?? existing.amount;
          const currency = params.currency ?? existing.currency;
          amountINR = currency === "USD" ? amount * 83 : amount;
        }
      }

      const transaction = updateTransactionRepo({
        id: params.transactionId,
        amount: params.amount,
        currency: params.currency,
        amountINR,
        type: params.type,
        date: params.date,
        contactId,
        categoryId: params.categoryId,
        projectId: params.projectId,
        description: params.description,
        notes: params.notes,
      });

      if (!transaction) {
        return errorResponseFromUnknown(new Error("Transaction not found"));
      }
      return successResponse(transaction);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Delete a transaction
   */
  static async deleteTransaction(
    transactionId: string
  ): Promise<ApiResponse<{ success: boolean; deletedId: string }>> {
    try {
      const deleted = deleteTransactionRepo(transactionId);
      if (!deleted) {
        return errorResponseFromUnknown(new Error("Transaction not found"));
      }
      return successResponse({ success: true, deletedId: transactionId });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Dashboard & Analytics (Local SQLite)
  // ============================================

  /**
   * Get dashboard summary
   */
  static async getDashboard(params?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<ApiResponse<IDashboardSummary>> {
    try {
      const totals = getDashboardTotals();
      const recentTransactions = getRecentTransactions(10);
      const projects = getAllProjects();
      const contacts = getAllContacts();
      const projectSummaries = getProjectsWithSummaries();
      const categories = getAllCategories("expense");

      // Calculate top expense categories
      const categoryTotals: Record<string, number> = {};
      const transactionsResult = getTransactionsRepo({
        type: "expense",
        startDate: params?.startDate,
        endDate: params?.endDate,
      });

      for (const t of transactionsResult.transactions) {
        if (t.categoryId) {
          categoryTotals[t.categoryId] =
            (categoryTotals[t.categoryId] || 0) + t.amountINR;
        }
      }

      const topExpenseCategories = Object.entries(categoryTotals)
        .map(([categoryId, amount]) => {
          const category = categories.find((c) => c.id === categoryId);
          return {
            category: category!,
            amount,
            percentage:
              totals.totalExpenses > 0
                ? (amount / totals.totalExpenses) * 100
                : 0,
          };
        })
        .filter((c) => c.category)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const dashboard: IDashboardSummary = {
        totalIncome: totals.totalIncome,
        totalExpenses: totals.totalExpenses,
        netAmount: totals.totalIncome - totals.totalExpenses,
        transactionCount: totals.transactionCount,
        projectCount: projects.length,
        contactCount: contacts.length,
        recentTransactions,
        projectSummaries: projectSummaries.map((p) => ({
          project: p,
          // Also add id and name directly for dashboard compatibility
          id: p.id,
          name: p.name,
          income: p.income,
          expenses: p.expenses,
          net: p.net,
        })),
        topExpenseCategories: topExpenseCategories.map((c) => ({
          category: c.category,
          // Also add id and name directly for dashboard compatibility
          id: c.category.id,
          name: c.category.name,
          amount: c.amount,
          percentage: c.percentage,
        })),
        monthlyTrend: [], // TODO: Calculate monthly trend
      };

      return successResponse(dashboard);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get project summary
   */
  static async getProjectSummary(
    projectId: string,
    params?: { startDate?: Date; endDate?: Date }
  ): Promise<ApiResponse<IProjectSummary>> {
    try {
      const project = getProjectById(projectId);
      if (!project) {
        return errorResponseFromUnknown(new Error("Project not found"));
      }

      const summary = getProjectSummaryRepo(projectId);
      if (!summary) {
        return errorResponseFromUnknown(new Error("Could not get project summary"));
      }

      const transactions = getTransactionsRepo({
        projectId,
        startDate: params?.startDate,
        endDate: params?.endDate,
      });

      // Calculate top categories
      const categoryTotals: Record<string, number> = {};
      for (const t of transactions.transactions) {
        if (t.categoryId) {
          categoryTotals[t.categoryId] =
            (categoryTotals[t.categoryId] || 0) + t.amountINR;
        }
      }

      const categories = getAllCategories();
      const topCategories = Object.entries(categoryTotals)
        .map(([categoryId, amount]) => {
          const category = categories.find((c) => c.id === categoryId);
          return {
            category: category!,
            amount,
            percentage:
              summary.expenses > 0 ? (amount / summary.expenses) * 100 : 0,
          };
        })
        .filter((c) => c.category)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Get contacts for this project
      const contactTotals: Record<
        string,
        { name: string; amount: number; count: number }
      > = {};
      for (const t of transactions.transactions) {
        if (t.contactId && t.contactName) {
          if (!contactTotals[t.contactId]) {
            contactTotals[t.contactId] = {
              name: t.contactName,
              amount: 0,
              count: 0,
            };
          }
          contactTotals[t.contactId].amount += t.amountINR;
          contactTotals[t.contactId].count++;
        }
      }

      const projectContacts = Object.entries(contactTotals)
        .map(([id, { name, amount, count }]) => ({ id, name, amount, count }))
        .sort((a, b) => b.amount - a.amount);

      const projectSummary: IProjectSummary = {
        project,
        totalIncome: summary.income,
        totalExpenses: summary.expenses,
        netAmount: summary.net,
        transactionCount: summary.transactionCount,
        topCategories,
        contacts: projectContacts,
        monthlyTrend: [], // TODO: Calculate monthly trend
      };

      return successResponse(projectSummary);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Flagged Transactions (Local SQLite)
  // ============================================

  /**
   * Get transactions flagged for review
   */
  static async getFlaggedTransactions(params?: {
    limit?: number;
    skip?: number;
  }): Promise<
    ApiResponse<{
      transactions: ITransaction[];
      duplicateTransactions: Record<
        string,
        {
          id: string;
          amount: number;
          currency: string;
          type: string;
          date: Date;
          contactName: string;
          projectName?: string;
        }
      >;
      total: number;
      hasMore: boolean;
    }>
  > {
    try {
      const result = getFlaggedTransactionsRepo(params);
      return successResponse({
        ...result,
        duplicateTransactions: {}, // TODO: Implement duplicate detection
      });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Mark a transaction as reviewed
   */
  static async markTransactionReviewed(
    transactionId: string
  ): Promise<ApiResponse<{ success: boolean; transactionId: string }>> {
    try {
      const marked = markTransactionReviewedRepo(transactionId);
      if (!marked) {
        return errorResponseFromUnknown(new Error("Transaction not found"));
      }
      return successResponse({ success: true, transactionId });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get count of flagged transactions
   */
  static async getFlaggedCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const count = getFlaggedCountRepo();
      return successResponse({ count });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Recurring Transactions (Local SQLite + AI from Back4App)
  // ============================================

  /**
   * Create a recurring transaction template
   */
  static async createRecurringTransaction(params: {
    name: string;
    amount: number;
    currency?: Currency;
    type: TransactionType;
    frequency: RecurringFrequency;
    contactName?: string;
    categoryId?: string;
    projectId?: string;
    description?: string;
    notes?: string;
  }): Promise<ApiResponse<IRecurringTransaction>> {
    try {
      // Get or create contact if name provided
      let contactId: string | undefined;
      if (params.contactName) {
        const contact = getOrCreateContact(params.contactName);
        contactId = contact.id;
      }

      const recurring = createRecurringRepo({
        name: params.name,
        amount: params.amount,
        currency: params.currency,
        type: params.type,
        frequency: params.frequency,
        contactId,
        categoryId: params.categoryId,
        projectId: params.projectId,
        description: params.description,
        notes: params.notes,
      });

      return successResponse(recurring);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get recurring transactions with optional filters
   */
  static async getRecurringTransactions(params?: {
    type?: TransactionType;
    projectId?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<IRecurringTransaction[]>> {
    try {
      const recurring = getAllRecurringTransactions(params);
      return successResponse(recurring);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Update a recurring transaction
   */
  static async updateRecurringTransaction(params: {
    recurringTransactionId: string;
    name?: string;
    amount?: number;
    currency?: Currency;
    type?: TransactionType;
    frequency?: RecurringFrequency;
    contactName?: string | null;
    categoryId?: string | null;
    projectId?: string | null;
    description?: string | null;
    notes?: string | null;
    isActive?: boolean;
  }): Promise<ApiResponse<IRecurringTransaction>> {
    try {
      // Get or create contact if name provided
      let contactId: string | undefined | null;
      if (params.contactName === null) {
        contactId = null;
      } else if (params.contactName) {
        const contact = getOrCreateContact(params.contactName);
        contactId = contact.id;
      }

      const recurring = updateRecurringRepo({
        id: params.recurringTransactionId,
        name: params.name,
        amount: params.amount,
        currency: params.currency,
        type: params.type,
        frequency: params.frequency,
        contactId,
        categoryId: params.categoryId,
        projectId: params.projectId,
        description: params.description,
        notes: params.notes,
        isActive: params.isActive,
      });

      if (!recurring) {
        return errorResponseFromUnknown(
          new Error("Recurring transaction not found")
        );
      }
      return successResponse(recurring);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Delete a recurring transaction
   */
  static async deleteRecurringTransaction(
    recurringTransactionId: string
  ): Promise<ApiResponse<{ success: boolean; deletedId: string }>> {
    try {
      const deleted = deleteRecurringRepo(recurringTransactionId);
      if (!deleted) {
        return errorResponseFromUnknown(
          new Error("Recurring transaction not found")
        );
      }
      return successResponse({ success: true, deletedId: recurringTransactionId });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Delete all recurring transactions (for debugging/reset)
   */
  static async clearAllRecurringTransactions(): Promise<
    ApiResponse<{ success: boolean; deletedCount: number }>
  > {
    try {
      const all = getAllRecurringTransactions();
      let deletedCount = 0;
      for (const rt of all) {
        if (deleteRecurringRepo(rt.id)) {
          deletedCount++;
        }
      }
      return successResponse({ success: true, deletedCount });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Create an actual transaction from a recurring transaction template
   */
  static async createTransactionFromRecurring(params: {
    recurringTransactionId: string;
    date?: string;
    amount?: number;
    notes?: string;
  }): Promise<
    ApiResponse<{
      transaction: {
        id: string;
        amount: number;
        currency: Currency;
        type: TransactionType;
        date: Date;
        contactName?: string;
        categoryName?: string;
        projectName?: string;
      };
      recurringTransaction: IRecurringTransaction;
    }>
  > {
    try {
      const recurring = getRecurringTransactionById(params.recurringTransactionId);
      if (!recurring) {
        return errorResponseFromUnknown(
          new Error("Recurring transaction not found")
        );
      }

      const amount = params.amount ?? recurring.amount;
      const amountINR = recurring.currency === "USD" ? amount * 83 : amount;
      const dateStr = params.date ?? new Date().toISOString().split("T")[0];

      const transaction = createTransactionRepo({
        amount,
        currency: recurring.currency,
        amountINR,
        type: recurring.type,
        date: dateStr,
        contactId: recurring.contactId,
        categoryId: recurring.categoryId,
        projectId: recurring.projectId,
        description: recurring.description,
        notes: params.notes ?? recurring.notes,
        isRecurring: true,
        recurringGroupId: recurring.id,
      });

      // Update the recurring transaction's lastCreatedAt and nextDueDate
      const updatedRecurring = markRecurringTransactionCreated(
        recurring.id,
        new Date(dateStr)
      );

      return successResponse({
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          date: transaction.date,
          contactName: recurring.contactName,
          categoryName: recurring.categoryName,
          projectName: recurring.projectName,
        },
        recurringTransaction: updatedRecurring!,
      });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Suggest recurring transactions based on transaction history
   * Uses Back4App Cloud Function for AI analysis
   */
  static async suggestRecurringTransactions(): Promise<
    ApiResponse<{
      suggestions: Array<{
        name: string;
        amount: number;
        currency: Currency;
        type: TransactionType;
        frequency: RecurringFrequency;
        contactName?: string;
        categoryId?: string;
        categoryName?: string;
        projectId?: string;
        projectName?: string;
        confidence: number;
        reason: string;
      }>;
      analyzed: number;
      message?: string;
    }>
  > {
    try {
      // Get ALL transactions for AI analysis (no limit - local SQLite is fast)
      const transactions = getTransactionsRepo();
      const contacts = getAllContacts();
      const categories = getAllCategories();
      const projects = getAllProjects();

      // Get existing recurring transactions to filter out duplicates
      const existingRecurring = getAllRecurringTransactions();

      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.SUGGEST_RECURRING_TRANSACTIONS,
        {
          transactions: transactions.transactions.map((t) => ({
            amount: t.amount,
            currency: t.currency,
            type: t.type,
            date:
              typeof t.date === "string"
                ? t.date
                : t.date.toISOString(),
            contactName: t.contactName,
            categoryId: t.categoryId,
            categoryName: t.categoryName,
            projectId: t.projectId,
            projectName: t.projectName,
            description: t.description,
          })),
          // Send existing recurring so cloud function can filter duplicates
          existingRecurring: existingRecurring.map((r) => ({
            id: r.id,
            name: r.name,
            contactName: r.contactName,
            amount: r.amount,
            frequency: r.frequency,
          })),
          context: {
            contacts: contacts.map((c) => ({ id: c.id, name: c.name })),
            categories: categories.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
            })),
            projects: projects.map((p) => ({ id: p.id, name: p.name })),
          },
        }
      );
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Legacy methods (kept for compatibility, redirect to Back4App)
  // ============================================

  /**
   * Parse raw text into transaction data using AI
   * @deprecated Use parseTransactionInput instead
   */
  static async parseTransaction(
    text: string,
    source?: string
  ): Promise<ApiResponse<any>> {
    return this.parseTransactionInput({ text, source });
  }

  /**
   * Parse bulk transactions from text
   * @deprecated Use parseTransactionInput instead
   */
  static async parseBulkTransactions(
    text: string,
    source?: string
  ): Promise<ApiResponse<any>> {
    return this.parseTransactionInput({ text, source });
  }

  /**
   * Parse transactions from an image
   * @deprecated Use parseTransactionInput instead
   */
  static async parseTransactionFromImage(
    imageBase64: string,
    mediaType?: string,
    source?: string
  ): Promise<ApiResponse<any>> {
    return this.parseTransactionInput({
      images: [{ base64: imageBase64, mediaType: mediaType ?? "image/jpeg" }],
      source,
    });
  }
}
