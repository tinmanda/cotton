import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { COLORS, ROUTES } from "@/constants";
import { FinanceService } from "@/services";
import { IProjectSummary, ITransaction, ContactType } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDateForPdf(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function generatePdfHtml(
  summary: IProjectSummary,
  transactions: ITransaction[],
  exportDate: string
): string {
  const incomeTransactions = transactions.filter((t) => t.type === "income");
  const expenseTransactions = transactions.filter((t) => t.type === "expense");

  const transactionRows = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(
      (t) => `
      <tr>
        <td>${formatDateForPdf(new Date(t.date))}</td>
        <td>${t.contactName || "Unknown"}</td>
        <td>${t.categoryName || "Uncategorized"}</td>
        <td>${t.description || "-"}</td>
        <td class="${t.type}">${t.type === "expense" ? "-" : "+"}₹${t.amountINR.toLocaleString("en-IN")}</td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${summary.project.name} - Transactions</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; }
          .header { margin-bottom: 30px; border-bottom: 2px solid ${summary.project.color}; padding-bottom: 20px; }
          .project-name { font-size: 28px; font-weight: 700; color: ${summary.project.color}; }
          .export-date { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .summary { display: flex; gap: 20px; margin-bottom: 30px; }
          .summary-card { flex: 1; background: #f9fafb; border-radius: 8px; padding: 16px; }
          .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .summary-value { font-size: 20px; font-weight: 600; margin-top: 4px; }
          .summary-value.income { color: #059669; }
          .summary-value.expense { color: #dc2626; }
          .section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #374151; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
          td { padding: 10px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
          td.income { color: #059669; font-weight: 500; text-align: right; }
          td.expense { color: #dc2626; font-weight: 500; text-align: right; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="project-name">${summary.project.name}</div>
          <div class="export-date">Exported on ${exportDate}</div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="summary-label">Total Income</div>
            <div class="summary-value income">₹${summary.totalIncome.toLocaleString("en-IN")}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Expenses</div>
            <div class="summary-value expense">₹${summary.totalExpenses.toLocaleString("en-IN")}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Net Amount</div>
            <div class="summary-value" style="color: ${summary.netAmount >= 0 ? "#059669" : "#dc2626"}">
              ${summary.netAmount >= 0 ? "+" : ""}₹${summary.netAmount.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div class="section-title">All Transactions (${transactions.length})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 12%">Date</th>
              <th style="width: 20%">Contact</th>
              <th style="width: 15%">Category</th>
              <th style="width: 38%">Description</th>
              <th style="width: 15%; text-align: right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows}
          </tbody>
        </table>

        <div class="footer">
          Generated by Cotton • ${summary.transactionCount} transactions
        </div>
      </body>
    </html>
  `;
}

interface ContactListSectionProps {
  title: string;
  icon: string;
  contacts: Array<{
    id: string;
    name: string;
    types: ContactType[];
    amount: number;
    count: number;
  }>;
  projectId: string;
  router: ReturnType<typeof useRouter>;
}

function ContactListSection({ title, icon, contacts, projectId, router }: ContactListSectionProps) {
  if (contacts.length === 0) return null;

  return (
    <View className="px-4 mb-4">
      <View className="flex-row items-center mb-3">
        <Lucide name={icon as any} size={16} color={COLORS.gray500} />
        <Text className="text-base font-semibold text-gray-900 ml-2">
          {title}
        </Text>
        <Text className="text-sm text-gray-400 ml-2">({contacts.length})</Text>
      </View>
      <View style={sectionCardStyle} className="bg-white rounded-2xl overflow-hidden">
        {contacts.map((contact, index) => (
          <Pressable
            key={contact.id}
            onPress={() =>
              router.push({
                pathname: ROUTES.TRANSACTIONS,
                params: {
                  projectId,
                  contactId: contact.id,
                  contactName: contact.name,
                },
              } as any)
            }
            className={`flex-row items-center justify-between px-4 py-3 active:bg-gray-50 ${
              index < contacts.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                {contact.name}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {contact.count} transaction{contact.count !== 1 ? "s" : ""}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm font-semibold text-gray-900 mr-2">
                {formatAmount(contact.amount)}
              </Text>
              <Lucide name="chevron-right" size={16} color={COLORS.gray400} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const sectionCardStyle = {
  shadowColor: COLORS.shadow,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 1,
};

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showError, showSuccess } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState<IProjectSummary | null>(null);

  const loadData = useCallback(
    async (showLoader = true) => {
      if (!id) return;
      if (showLoader) setIsLoading(true);

      try {
        const summaryRes = await FinanceService.getProjectSummary(id);

        if (summaryRes.success) {
          setSummary(summaryRes.data);
        } else {
          showError(summaryRes.error.message);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [id, showError]
  );

  const exportToPdf = useCallback(async () => {
    if (!id || !summary) return;

    setIsExporting(true);
    try {
      // Fetch all transactions for this project
      const result = await FinanceService.getTransactions({
        projectId: id,
        limit: 10000, // Get all transactions
      });

      if (!result.success) {
        showError("Failed to fetch transactions");
        return;
      }

      const transactions = result.data.transactions;
      const exportDate = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // Generate HTML for PDF
      const html = generatePdfHtml(summary, transactions, exportDate);

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${summary.project.name} Transactions`,
          UTI: "com.adobe.pdf",
        });
        showSuccess("PDF exported successfully");
      } else {
        showError("Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Export error:", error);
      showError("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  }, [id, summary, showError, showSuccess]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(false);
  }, [loadData]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Project not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: summary.project.color }]}
        className="px-4 py-4"
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Lucide name="chevron-left" size={24} color={COLORS.white} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">{summary.project.name}</Text>
            <Text className="text-sm text-white/70 capitalize">{summary.project.type}</Text>
          </View>
          <Pressable
            onPress={exportToPdf}
            disabled={isExporting}
            className="ml-2 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Lucide name="download" size={22} color={COLORS.white} />
            )}
          </Pressable>
        </View>

        {/* Summary Cards */}
        <View className="flex-row mt-4 gap-3">
          <View style={styles.summaryCard} className="flex-1 rounded-xl p-3">
            <Text className="text-xs text-white/70">Income</Text>
            <Text className="text-lg font-bold text-white mt-0.5">
              {formatAmount(summary.totalIncome)}
            </Text>
          </View>
          <View style={styles.summaryCard} className="flex-1 rounded-xl p-3">
            <Text className="text-xs text-white/70">Expenses</Text>
            <Text className="text-lg font-bold text-white mt-0.5">
              {formatAmount(summary.totalExpenses)}
            </Text>
          </View>
          <View style={styles.summaryCard} className="flex-1 rounded-xl p-3">
            <Text className="text-xs text-white/70">Net</Text>
            <Text className="text-lg font-bold text-white mt-0.5">
              {summary.netAmount >= 0 ? "+" : ""}
              {formatAmount(summary.netAmount)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Stats */}
        <View className="flex-row px-4 py-4 gap-4">
          <View style={styles.statCard} className="flex-1 bg-white rounded-xl p-4 items-center">
            <View style={[styles.statIcon, { backgroundColor: `${COLORS.primary}15` }]}>
              <Lucide name="receipt" size={18} color={COLORS.primary} />
            </View>
            <Text className="text-lg font-bold text-gray-900 mt-2">
              {summary.transactionCount}
            </Text>
            <Text className="text-xs text-gray-500">Transactions</Text>
          </View>
          <View style={styles.statCard} className="flex-1 bg-white rounded-xl p-4 items-center">
            <View style={[styles.statIcon, { backgroundColor: `${COLORS.primary}15` }]}>
              <Lucide name="users" size={18} color={COLORS.primary} />
            </View>
            <Text className="text-lg font-bold text-gray-900 mt-2">
              {summary.employeeCount}
            </Text>
            <Text className="text-xs text-gray-500">Employees</Text>
          </View>
        </View>

        {/* Top Categories */}
        {summary.topCategories.length > 0 && (
          <View className="px-4 mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Top Expense Categories
            </Text>
            <View style={styles.sectionCard} className="bg-white rounded-2xl overflow-hidden">
              {summary.topCategories.map((cat, index) => (
                <View
                  key={cat.id}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    index < summary.topCategories.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      style={[styles.categoryDot, { backgroundColor: cat.color }]}
                    />
                    <Text className="text-sm text-gray-800 ml-2" numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-sm font-semibold text-gray-900 mr-2">
                      {formatAmount(cat.amount)}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {cat.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact Lists by Type */}
        <ContactListSection
          title="Customers"
          icon="user"
          contacts={summary.contacts?.filter((c) => c.types?.includes("customer")) || []}
          projectId={id!}
          router={router}
        />
        <ContactListSection
          title="Suppliers"
          icon="truck"
          contacts={summary.contacts?.filter((c) => c.types?.includes("supplier")) || []}
          projectId={id!}
          router={router}
        />
        <ContactListSection
          title="Employees"
          icon="briefcase"
          contacts={summary.contacts?.filter((c) => c.types?.includes("employee")) || []}
          projectId={id!}
          router={router}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  statCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
});
