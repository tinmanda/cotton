import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { FinanceService } from "./finance.service";
import { ApiResponse, AppError } from "@/types";

/**
 * Export data format compatible with local-first SQLite schema
 */
export interface ExportData {
  metadata: {
    version: string;
    exportDate: string;
    exportedFrom: "sqlite" | "parse-server";
    schemaVersion: 1;
  };
  categories: ExportCategory[];
  projects: ExportProject[];
  contacts: ExportContact[];
  transactions: ExportTransaction[];
  recurringTransactions: ExportRecurringTransaction[];
}

interface ExportCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExportProject {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  color: string;
  monthlyBudget: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface ExportContact {
  id: string;
  name: string;
  aliases: string[];
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  notes: string | null;
  totalSpent: number;
  totalReceived: number;
  transactionCount: number;
  defaultCategoryId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExportTransaction {
  id: string;
  amount: number;
  currency: string;
  amountINR: number;
  type: "income" | "expense";
  date: string;
  contactId: string | null;
  contactName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  notes: string | null;
  isRecurring: boolean;
  recurringGroupId: string | null;
  needsReview: boolean;
  confidence: number | null;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExportRecurringTransaction {
  id: string;
  name: string;
  amount: number;
  currency: string;
  type: "income" | "expense";
  frequency: string;
  contactId: string | null;
  contactName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  lastCreatedAt: string | null;
  nextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service for exporting data from local SQLite database
 * The export format is compatible with the import service for backup/restore
 */
export class ExportService {
  /**
   * Export all user data to a JSON file and share it
   */
  static async exportAllData(): Promise<
    ApiResponse<{ filePath: string; shared: boolean }>
  > {
    try {
      // Fetch all data in parallel
      const [
        categoriesResult,
        projectsResult,
        contactsResult,
        transactionsResult,
        recurringResult,
      ] = await Promise.all([
        FinanceService.getCategories(),
        FinanceService.getProjects(),
        FinanceService.getContacts(),
        FinanceService.getTransactions({ limit: 10000 }), // Get all transactions
        FinanceService.getRecurringTransactions(),
      ]);

      // Check for errors
      if (!categoriesResult.success) {
        return { success: false, error: categoriesResult.error };
      }
      if (!projectsResult.success) {
        return { success: false, error: projectsResult.error };
      }
      if (!contactsResult.success) {
        return { success: false, error: contactsResult.error };
      }
      if (!transactionsResult.success) {
        return { success: false, error: transactionsResult.error };
      }
      if (!recurringResult.success) {
        return { success: false, error: recurringResult.error };
      }

      // Transform data to export format
      const exportData: ExportData = {
        metadata: {
          version: "1.0.0",
          exportDate: new Date().toISOString(),
          exportedFrom: "sqlite",
          schemaVersion: 1,
        },
        categories: categoriesResult.data.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          isSystem: c.isSystem,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
        projects: projectsResult.data.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          description: p.description || null,
          color: p.color,
          monthlyBudget: p.monthlyBudget || null,
          currency: p.currency,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
        contacts: contactsResult.data.map((c) => ({
          id: c.id,
          name: c.name,
          aliases: c.aliases || [],
          email: c.email || null,
          phone: c.phone || null,
          company: c.company || null,
          website: c.website || null,
          notes: c.notes || null,
          totalSpent: c.totalSpent || 0,
          totalReceived: c.totalReceived || 0,
          transactionCount: c.transactionCount || 0,
          defaultCategoryId: c.defaultCategoryId || null,
          projectId: c.projectId || null,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
        transactions: transactionsResult.data.transactions.map((t) => ({
          id: t.id,
          amount: t.amount,
          currency: t.currency,
          amountINR: t.amountINR,
          type: t.type,
          date: t.date.toISOString(),
          contactId: t.contactId || null,
          contactName: t.contactName || null,
          categoryId: t.categoryId || null,
          categoryName: t.categoryName || null,
          projectId: t.projectId || null,
          projectName: t.projectName || null,
          description: t.description || null,
          notes: t.notes || null,
          isRecurring: t.isRecurring || false,
          recurringGroupId: t.recurringGroupId || null,
          needsReview: t.needsReview || false,
          confidence: t.confidence || null,
          reviewReason: t.reviewReason || null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        recurringTransactions: recurringResult.data.map((r) => ({
          id: r.id,
          name: r.name,
          amount: r.amount,
          currency: r.currency,
          type: r.type,
          frequency: r.frequency,
          contactId: r.contactId || null,
          contactName: r.contactName || null,
          categoryId: r.categoryId || null,
          categoryName: r.categoryName || null,
          projectId: r.projectId || null,
          projectName: r.projectName || null,
          description: r.description || null,
          notes: r.notes || null,
          isActive: r.isActive,
          lastCreatedAt: r.lastCreatedAt?.toISOString() || null,
          nextDueDate: r.nextDueDate?.toISOString() || null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      };

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const fileName = `cotton-export-${timestamp}.json`;
      const file = new File(Paths.document, fileName);

      // Write JSON to file
      await file.write(JSON.stringify(exportData, null, 2));

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Export Cotton Data",
          UTI: "public.json",
        });
        return {
          success: true,
          data: { filePath: file.uri, shared: true },
        };
      }

      return {
        success: true,
        data: { filePath: file.uri, shared: false },
      };
    } catch (error) {
      return {
        success: false,
        error: AppError.fromUnknown(error),
      };
    }
  }

  /**
   * Get export statistics without actually exporting
   */
  static async getExportStats(): Promise<
    ApiResponse<{
      categoriesCount: number;
      projectsCount: number;
      contactsCount: number;
      transactionsCount: number;
      recurringCount: number;
    }>
  > {
    try {
      const [
        categoriesResult,
        projectsResult,
        contactsResult,
        transactionsResult,
        recurringResult,
      ] = await Promise.all([
        FinanceService.getCategories(),
        FinanceService.getProjects(),
        FinanceService.getContacts(),
        FinanceService.getTransactions({ limit: 1 }), // Just to get total count
        FinanceService.getRecurringTransactions(),
      ]);

      return {
        success: true,
        data: {
          categoriesCount: categoriesResult.success
            ? categoriesResult.data.length
            : 0,
          projectsCount: projectsResult.success
            ? projectsResult.data.length
            : 0,
          contactsCount: contactsResult.success
            ? contactsResult.data.length
            : 0,
          transactionsCount: transactionsResult.success
            ? transactionsResult.data.total
            : 0,
          recurringCount: recurringResult.success
            ? recurringResult.data.length
            : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: AppError.fromUnknown(error),
      };
    }
  }
}
