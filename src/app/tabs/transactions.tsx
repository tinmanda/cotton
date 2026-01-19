import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useFocusEffect, useRouter } from "expo-router";
import { COLORS, buildRoute } from "@/constants";
import { FinanceService } from "@/services";
import { ITransaction, TransactionType } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatAmount(amount: number, currency: string = "INR"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const transDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (transDate.getTime() === today.getTime()) return "Today";
  if (transDate.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function groupTransactionsByDate(transactions: ITransaction[]): { date: string; data: ITransaction[] }[] {
  const groups: Record<string, ITransaction[]> = {};

  for (const t of transactions) {
    const dateKey = formatDate(t.date);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(t);
  }

  return Object.entries(groups).map(([date, data]) => ({ date, data }));
}

type FilterType = "all" | "income" | "expense";

export default function TransactionsScreen() {
  const router = useRouter();
  const { showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const loadTransactions = useCallback(
    async (reset = true, showLoader = true) => {
      if (showLoader && reset) setIsLoading(true);
      if (!reset) setIsLoadingMore(true);

      try {
        const result = await FinanceService.getTransactions({
          type: filter === "all" ? undefined : filter,
          limit: 30,
          skip: reset ? 0 : transactions.length,
        });

        if (result.success) {
          if (reset) {
            setTransactions(result.data.transactions);
          } else {
            setTransactions((prev) => [...prev, ...result.data.transactions]);
          }
          setHasMore(result.data.hasMore);
        } else {
          showError(result.error.message);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [filter, transactions.length, showError]
  );

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTransactions(true, false);
  }, [loadTransactions]);

  const onEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadTransactions(false, false);
    }
  }, [hasMore, isLoadingMore, loadTransactions]);

  const groupedTransactions = groupTransactionsByDate(transactions);

  // Calculate totals for filtered transactions
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amountINR;
      else acc.expenses += t.amountINR;
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Transactions</Text>
        <Text className="text-sm text-gray-500 mt-0.5">
          {transactions.length} transactions
        </Text>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row gap-2">
          {(["all", "income", "expense"] as FilterType[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              className="px-4 py-2 rounded-full"
            >
              <Text
                className={`text-sm font-medium capitalize ${
                  filter === f ? "text-white" : "text-gray-600"
                }`}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary */}
        {filter !== "all" && (
          <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
            <Text className="text-sm text-gray-500">
              Total {filter === "income" ? "Income" : "Expenses"}
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: filter === "income" ? COLORS.success : COLORS.error }}
            >
              {formatAmount(filter === "income" ? totals.income : totals.expenses)}
            </Text>
          </View>
        )}
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
          <View style={styles.emptyIconBg}>
            <Lucide name="receipt" size={32} color={COLORS.gray400} />
          </View>
          <Text className="text-base font-medium text-gray-700 mt-4">
            No transactions yet
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            Add your first transaction to see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedTransactions}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View className="mt-4">
              <Text className="px-4 text-xs font-semibold text-gray-500 uppercase mb-2">
                {item.date}
              </Text>
              <View style={styles.dayCard} className="mx-4 bg-white rounded-2xl overflow-hidden">
                {item.data.map((transaction, index) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    isLast={index === item.data.length - 1}
                    onPress={() => router.push(buildRoute.transactionEdit(transaction.id) as any)}
                  />
                ))}
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function TransactionRow({
  transaction,
  isLast,
  onPress,
}: {
  transaction: ITransaction;
  isLast: boolean;
  onPress: () => void;
}) {
  const isExpense = transaction.type === "expense";

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 active:bg-gray-50 ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      {/* Icon */}
      <View
        style={[
          styles.transactionIcon,
          {
            backgroundColor: isExpense ? `${COLORS.error}10` : `${COLORS.success}10`,
          },
        ]}
      >
        <Lucide
          name={isExpense ? "arrow-up-right" : "arrow-down-left"}
          size={18}
          color={isExpense ? COLORS.error : COLORS.success}
        />
      </View>

      {/* Details */}
      <View className="flex-1 ml-3">
        <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
          {transaction.merchantName || "Unknown"}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <Text className="text-xs text-gray-500">
            {transaction.categoryName || "Uncategorized"}
          </Text>
          {transaction.projectName && (
            <>
              <Text className="text-xs text-gray-400 mx-1">•</Text>
              <Text className="text-xs text-gray-500">{transaction.projectName}</Text>
            </>
          )}
        </View>
      </View>

      {/* Amount */}
      <View className="items-end mr-2">
        <Text
          className="text-sm font-semibold"
          style={{ color: isExpense ? COLORS.error : COLORS.success }}
        >
          {isExpense ? "-" : "+"}
          {formatAmount(transaction.amount, transaction.currency)}
        </Text>
        {transaction.currency === "USD" && (
          <Text className="text-xs text-gray-400 mt-0.5">
            ≈ ₹{transaction.amountINR.toLocaleString("en-IN")}
          </Text>
        )}
      </View>
      <Lucide name="chevron-right" size={16} color={COLORS.gray400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    backgroundColor: COLORS.gray100,
  },
  filterChipActive: {
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
  dayCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
