import Parse from "parse/react-native.js";
import {
  ApiResponse,
  IProject,
  ICategory,
  IContact,
  ITransaction,
  IDashboardSummary,
  IProjectSummary,
  ParseTransactionResponse,
  ParseBulkTransactionsResponse,
  ParseImageTransactionsResponse,
  ParseTransactionInputResponse,
  ImageInput,
  CreateBulkTransactionsRequest,
  CreateBulkTransactionsResponse,
  TransactionFilters,
  ProjectType,
  ProjectStatus,
  ContactType,
  EmployeeStatus,
  Currency,
  TransactionType,
  IAllocation,
  successResponse,
  errorResponseFromUnknown,
} from "@/types";
import { CLOUD_FUNCTIONS } from "@/constants";

/**
 * Finance service
 * Handles all finance-related operations
 */
export class FinanceService {
  // ============================================
  // Categories
  // ============================================

  /**
   * Seed default categories for the user
   */
  static async seedCategories(): Promise<
    ApiResponse<{ success: boolean; count: number }>
  > {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.SEED_CATEGORIES);
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get all categories
   */
  static async getCategories(
    type?: TransactionType
  ): Promise<ApiResponse<ICategory[]>> {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.GET_CATEGORIES, {
        type,
      });
      return successResponse(
        result.map((c: ICategory) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        }))
      );
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Projects
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
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.CREATE_PROJECT,
        params
      );
      return successResponse({
        ...result,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
      });
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
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.GET_PROJECTS, {
        status,
      });
      return successResponse(
        result.map((p: IProject) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }))
      );
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
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.UPDATE_PROJECT,
        params
      );
      return successResponse({
        ...result,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
      });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Contacts (Unified: Customers, Suppliers, Employees)
  // ============================================

  /**
   * Create a new contact
   */
  static async createContact(params: {
    name: string;
    types: ContactType[];
    aliases?: string[];
    email?: string;
    phone?: string;
    company?: string;
    website?: string;
    notes?: string;
    defaultCategoryId?: string;
    // Employee-specific fields
    role?: string;
    monthlySalary?: number;
    salaryCurrency?: Currency;
    projectId?: string;
  }): Promise<ApiResponse<IContact>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.CREATE_CONTACT,
        params
      );
      return successResponse({
        ...result,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
      });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get contacts with optional filters
   */
  static async getContacts(params?: {
    type?: ContactType;
    projectId?: string;
    employeeStatus?: EmployeeStatus;
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<IContact[]>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.GET_CONTACTS,
        params || {}
      );
      return successResponse(
        result.map((c: IContact) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        }))
      );
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
    types?: ContactType[];
    aliases?: string[];
    email?: string;
    phone?: string;
    company?: string;
    website?: string;
    notes?: string;
    defaultCategoryId?: string | null;
    // Employee-specific fields
    role?: string;
    monthlySalary?: number;
    salaryCurrency?: Currency;
    employeeStatus?: EmployeeStatus;
    projectId?: string | null;
  }): Promise<ApiResponse<IContact>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.UPDATE_CONTACT,
        params
      );
      return successResponse({
        ...result,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
      });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Delete a contact
   * Note: Will fail if contact has associated transactions
   */
  static async deleteContact(
    contactId: string
  ): Promise<ApiResponse<{ success: boolean; deletedId: string }>> {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.DELETE_CONTACT, {
        contactId,
      });
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Transactions
  // ============================================

  /**
   * Parse raw text into transaction data using AI
   */
  static async parseTransaction(
    text: string,
    source?: string
  ): Promise<ApiResponse<ParseTransactionResponse>> {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.PARSE_TRANSACTION, {
        text,
        source,
      });
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Parse bulk transactions from text (e.g., salary ranges, recurring payments)
   */
  static async parseBulkTransactions(
    text: string,
    source?: string
  ): Promise<ApiResponse<ParseBulkTransactionsResponse>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.PARSE_BULK_TRANSACTIONS,
        { text, source }
      );
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Parse transactions from an image (receipt, invoice, bank statement)
   */
  static async parseTransactionFromImage(
    imageBase64: string,
    mediaType?: string,
    source?: string
  ): Promise<ApiResponse<ParseImageTransactionsResponse>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.PARSE_TRANSACTION_FROM_IMAGE,
        { imageBase64, mediaType, source }
      );
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Parse transactions from unified input (text and/or images)
   * Supports optional text, optional multiple images, or both
   */
  static async parseTransactionInput(params: {
    text?: string;
    images?: ImageInput[];
    source?: string;
  }): Promise<ApiResponse<ParseTransactionInputResponse>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.PARSE_TRANSACTION_INPUT,
        params
      );
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Create multiple transactions at once
   */
  static async createBulkTransactions(
    params: CreateBulkTransactionsRequest
  ): Promise<ApiResponse<CreateBulkTransactionsResponse>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.CREATE_BULK_TRANSACTIONS,
        params
      );
      return successResponse(result);
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
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.CREATE_TRANSACTION_FROM_PARSED,
        params
      );
      return successResponse({
        ...result,
        date: new Date(result.date),
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
      });
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
      const params: Record<string, unknown> = {};
      if (filters?.startDate)
        params.startDate = filters.startDate.toISOString();
      if (filters?.endDate) params.endDate = filters.endDate.toISOString();
      if (filters?.type) params.type = filters.type;
      if (filters?.projectId) params.projectId = filters.projectId;
      if (filters?.categoryId) params.categoryId = filters.categoryId;
      if (filters?.contactId) params.contactId = filters.contactId;
      if (filters?.limit) params.limit = filters.limit;
      if (filters?.skip) params.skip = filters.skip;

      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.GET_TRANSACTIONS,
        params
      );

      return successResponse({
        transactions: result.transactions.map((t: ITransaction) => ({
          ...t,
          date: new Date(t.date),
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        })),
        total: result.total,
        totalIncome: result.totalIncome || 0,
        totalExpenses: result.totalExpenses || 0,
        hasMore: result.hasMore,
      });
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
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.UPDATE_TRANSACTION,
        params
      );
      return successResponse({
        ...result,
        date: new Date(result.date),
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
      });
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
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.DELETE_TRANSACTION, {
        transactionId,
      });
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Dashboard & Analytics
  // ============================================

  /**
   * Get dashboard summary
   */
  static async getDashboard(params?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<ApiResponse<IDashboardSummary>> {
    try {
      const cloudParams: Record<string, string> = {};
      if (params?.startDate)
        cloudParams.startDate = params.startDate.toISOString();
      if (params?.endDate) cloudParams.endDate = params.endDate.toISOString();

      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.GET_DASHBOARD,
        cloudParams
      );

      return successResponse({
        ...result,
        recentTransactions: result.recentTransactions.map(
          (t: ITransaction) => ({
            ...t,
            date: new Date(t.date),
          })
        ),
      });
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
      const cloudParams: Record<string, string> = { projectId };
      if (params?.startDate)
        cloudParams.startDate = params.startDate.toISOString();
      if (params?.endDate) cloudParams.endDate = params.endDate.toISOString();

      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.GET_PROJECT_SUMMARY,
        cloudParams
      );
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  // ============================================
  // Flagged Transactions
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
      duplicateTransactions: Record<string, { id: string; amount: number; currency: string; type: string; date: Date; contactName: string; projectName?: string }>;
      total: number;
      hasMore: boolean;
    }>
  > {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.GET_FLAGGED_TRANSACTIONS,
        params
      );

      // Convert duplicate transaction dates
      const duplicateTransactions: Record<string, { id: string; amount: number; currency: string; type: string; date: Date; contactName: string; projectName?: string }> = {};
      for (const [id, dup] of Object.entries(result.duplicateTransactions || {})) {
        const d = dup as { id: string; amount: number; currency: string; type: string; date: string; contactName: string; projectName?: string };
        duplicateTransactions[id] = {
          ...d,
          date: new Date(d.date),
        };
      }

      return successResponse({
        transactions: result.transactions.map((t: ITransaction) => ({
          ...t,
          date: new Date(t.date),
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        })),
        duplicateTransactions,
        total: result.total,
        hasMore: result.hasMore,
      });
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Mark a transaction as reviewed (remove the flag)
   */
  static async markTransactionReviewed(
    transactionId: string
  ): Promise<ApiResponse<{ success: boolean; transactionId: string }>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.MARK_TRANSACTION_REVIEWED,
        { transactionId }
      );
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Get count of flagged transactions
   */
  static async getFlaggedCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.GET_FLAGGED_COUNT);
      return successResponse(result);
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }
}
