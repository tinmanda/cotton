import Parse from "parse/react-native.js";
import {
  ApiResponse,
  IProject,
  ICategory,
  IMerchant,
  IEmployee,
  ITransaction,
  IDashboardSummary,
  IProjectSummary,
  ParseTransactionResponse,
  ParseBulkTransactionsResponse,
  ParseImageTransactionsResponse,
  CreateBulkTransactionsRequest,
  CreateBulkTransactionsResponse,
  TransactionFilters,
  ProjectType,
  ProjectStatus,
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
  // Employees
  // ============================================

  /**
   * Create a new employee
   */
  static async createEmployee(params: {
    name: string;
    role: string;
    projectId: string;
    monthlySalary: number;
    currency?: Currency;
    email?: string;
    phone?: string;
    notes?: string;
  }): Promise<ApiResponse<IEmployee>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.CREATE_EMPLOYEE,
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
   * Get employees
   */
  static async getEmployees(params?: {
    projectId?: string;
    status?: EmployeeStatus;
  }): Promise<ApiResponse<IEmployee[]>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.GET_EMPLOYEES,
        params || {}
      );
      return successResponse(
        result.map((e: IEmployee) => ({
          ...e,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
        }))
      );
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Update an employee
   */
  static async updateEmployee(params: {
    employeeId: string;
    name?: string;
    role?: string;
    projectId?: string;
    monthlySalary?: number;
    currency?: Currency;
    status?: EmployeeStatus;
    email?: string;
    phone?: string;
    notes?: string;
  }): Promise<ApiResponse<IEmployee>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.UPDATE_EMPLOYEE,
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
  // Merchants
  // ============================================

  /**
   * Get merchants
   */
  static async getMerchants(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<IMerchant[]>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.GET_MERCHANTS,
        params || {}
      );
      return successResponse(
        result.map((m: IMerchant) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        }))
      );
    } catch (error) {
      return errorResponseFromUnknown(error);
    }
  }

  /**
   * Update a merchant
   */
  static async updateMerchant(params: {
    merchantId: string;
    name?: string;
    aliases?: string[];
    defaultCategoryId?: string | null;
    defaultProjectId?: string | null;
    website?: string;
    notes?: string;
  }): Promise<ApiResponse<IMerchant>> {
    try {
      const result = await Parse.Cloud.run(
        CLOUD_FUNCTIONS.UPDATE_MERCHANT,
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
   * Delete a merchant
   * Note: Will fail if merchant has associated transactions
   */
  static async deleteMerchant(
    merchantId: string
  ): Promise<ApiResponse<{ success: boolean; deletedId: string }>> {
    try {
      const result = await Parse.Cloud.run(CLOUD_FUNCTIONS.DELETE_MERCHANT, {
        merchantId,
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
    merchantName: string;
    categoryId?: string;
    projectId?: string;
    employeeId?: string;
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
    ApiResponse<{ transactions: ITransaction[]; total: number; hasMore: boolean }>
  > {
    try {
      const params: Record<string, unknown> = {};
      if (filters?.startDate)
        params.startDate = filters.startDate.toISOString();
      if (filters?.endDate) params.endDate = filters.endDate.toISOString();
      if (filters?.type) params.type = filters.type;
      if (filters?.projectId) params.projectId = filters.projectId;
      if (filters?.categoryId) params.categoryId = filters.categoryId;
      if (filters?.merchantId) params.merchantId = filters.merchantId;
      if (filters?.employeeId) params.employeeId = filters.employeeId;
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
    merchantName?: string;
    categoryId?: string | null;
    projectId?: string | null;
    employeeId?: string | null;
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
}
