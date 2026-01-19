import { useState, useEffect, useCallback } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS, ROUTES } from "@/constants";
import { FinanceService } from "@/services";
import { IDashboardSummary, ITransaction } from "@/types";
import { useToast } from "@/hooks/useToast";

/**
 * Format currency amount
 */
function formatAmount(amount: number, currency: string = "INR"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function DashboardScreen() {
  const router = useRouter();
  const { showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<IDashboardSummary | null>(null);

  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      // Seed categories on first load
      await FinanceService.seedCategories();

      const result = await FinanceService.getDashboard();
      if (result.success) {
        setDashboard(result.data);
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboard(false);
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const hasData = dashboard && dashboard.transactionCount > 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Dashboard</Text>
        <Text className="text-sm text-gray-500 mt-0.5">
          Track your business finances
        </Text>
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
        {/* Summary Cards */}
        <View className="px-4 pt-4">
          <View className="flex-row gap-3">
            {/* Income Card */}
            <View style={styles.summaryCard} className="flex-1 bg-white rounded-2xl p-4">
              <View className="flex-row items-center mb-2">
                <View style={[styles.iconBg, { backgroundColor: `${COLORS.success}15` }]}>
                  <Lucide name="trending-up" size={16} color={COLORS.success} />
                </View>
                <Text className="text-xs text-gray-500 ml-2">Income</Text>
              </View>
              <Text className="text-lg font-bold text-gray-900">
                {formatAmount(dashboard?.totalIncome || 0)}
              </Text>
            </View>

            {/* Expense Card */}
            <View style={styles.summaryCard} className="flex-1 bg-white rounded-2xl p-4">
              <View className="flex-row items-center mb-2">
                <View style={[styles.iconBg, { backgroundColor: `${COLORS.error}15` }]}>
                  <Lucide name="trending-down" size={16} color={COLORS.error} />
                </View>
                <Text className="text-xs text-gray-500 ml-2">Expenses</Text>
              </View>
              <Text className="text-lg font-bold text-gray-900">
                {formatAmount(dashboard?.totalExpenses || 0)}
              </Text>
            </View>
          </View>

          {/* Net Amount Card */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor:
                  (dashboard?.netAmount || 0) >= 0 ? `${COLORS.success}10` : `${COLORS.error}10`,
              },
            ]}
            className="mt-3 rounded-2xl p-4"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-gray-600">Net Position</Text>
                <Text
                  className="text-2xl font-bold mt-1"
                  style={{
                    color: (dashboard?.netAmount || 0) >= 0 ? COLORS.success : COLORS.error,
                  }}
                >
                  {formatAmount(dashboard?.netAmount || 0)}
                </Text>
              </View>
              <View
                style={[
                  styles.netIconBg,
                  {
                    backgroundColor:
                      (dashboard?.netAmount || 0) >= 0 ? COLORS.success : COLORS.error,
                  },
                ]}
              >
                <Lucide
                  name={(dashboard?.netAmount || 0) >= 0 ? "arrow-up-right" : "arrow-down-right"}
                  size={24}
                  color={COLORS.white}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="px-4 mt-6">
          <View className="flex-row gap-2">
            <View style={styles.statChip} className="flex-1 flex-row items-center justify-center py-3 rounded-xl">
              <Lucide name="folder" size={16} color={COLORS.primary} />
              <Text className="text-sm font-medium text-gray-700 ml-2">
                {dashboard?.projectCount || 0} Projects
              </Text>
            </View>
            <View style={styles.statChip} className="flex-1 flex-row items-center justify-center py-3 rounded-xl">
              <Lucide name="store" size={16} color={COLORS.primary} />
              <Text className="text-sm font-medium text-gray-700 ml-2">
                {dashboard?.merchantCount || 0} Merchants
              </Text>
            </View>
          </View>
        </View>

        {/* Project Breakdown */}
        {dashboard?.projectSummaries && dashboard.projectSummaries.length > 0 && (
          <View className="px-4 mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-semibold text-gray-900">By Project</Text>
              <Pressable onPress={() => router.push(ROUTES.PROJECTS)}>
                <Text className="text-sm text-primary font-medium">View All</Text>
              </Pressable>
            </View>
            <View style={styles.sectionCard} className="bg-white rounded-2xl overflow-hidden">
              {dashboard.projectSummaries.slice(0, 4).map((item, index) => (
                <View
                  key={item.id}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    index < dashboard.projectSummaries.length - 1 && index < 3
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      style={[styles.projectDot]}
                      className="w-3 h-3 rounded-full mr-3"
                    />
                    <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text
                    className="text-sm font-semibold ml-2"
                    style={{ color: item.net >= 0 ? COLORS.success : COLORS.error }}
                  >
                    {item.net >= 0 ? "+" : ""}
                    {formatAmount(item.net)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Expense Categories */}
        {dashboard?.topExpenseCategories && dashboard.topExpenseCategories.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Top Expenses
            </Text>
            <View style={styles.sectionCard} className="bg-white rounded-2xl overflow-hidden">
              {dashboard.topExpenseCategories.map((item, index) => (
                <View
                  key={item.id}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    index < dashboard.topExpenseCategories.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <Text className="text-sm text-gray-800" numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-sm font-semibold text-gray-900 mr-2">
                      {formatAmount(item.amount)}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {item.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View className="px-4 mt-6 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-gray-900">
              Recent Transactions
            </Text>
            {hasData && (
              <Pressable onPress={() => router.push(ROUTES.TRANSACTIONS)}>
                <Text className="text-sm text-primary font-medium">View All</Text>
              </Pressable>
            )}
          </View>

          {!hasData ? (
            <View style={styles.emptyState} className="bg-white rounded-2xl p-8 items-center">
              <View style={styles.emptyIconBg}>
                <Lucide name="receipt" size={32} color={COLORS.gray400} />
              </View>
              <Text className="text-base font-medium text-gray-700 mt-4">
                No transactions yet
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-1">
                Paste your first SMS or invoice to get started
              </Text>
              <Pressable
                onPress={() => router.push(ROUTES.ADD)}
                style={styles.emptyButton}
                className="mt-4 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Add Transaction</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.sectionCard} className="bg-white rounded-2xl overflow-hidden">
              {dashboard?.recentTransactions.map((transaction, index) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  isLast={index === dashboard.recentTransactions.length - 1}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TransactionRow({
  transaction,
  isLast,
}: {
  transaction: ITransaction;
  isLast: boolean;
}) {
  const isExpense = transaction.type === "expense";

  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
          {transaction.merchantName || "Unknown"}
        </Text>
        <Text className="text-xs text-gray-500 mt-0.5">
          {transaction.categoryName || "Uncategorized"} • {formatDate(transaction.date)}
        </Text>
      </View>
      <Text
        className="text-sm font-semibold ml-2"
        style={{ color: isExpense ? COLORS.error : COLORS.success }}
      >
        {isExpense ? "-" : "+"}
        {formatAmount(transaction.amountINR)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  netIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statChip: {
    backgroundColor: `${COLORS.primary}08`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  projectDot: {
    backgroundColor: COLORS.primary,
  },
  emptyState: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
  },
});
