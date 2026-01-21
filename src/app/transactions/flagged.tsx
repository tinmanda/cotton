import React, { useState, useCallback } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS, ROUTES, buildRoute } from "@/constants";
import { FinanceService } from "@/services";
import { ITransaction, Currency } from "@/types";
import { useToast } from "@/hooks/useToast";

interface DuplicateInfo {
  id: string;
  amount: number;
  currency: string;
  type: string;
  date: Date;
  contactName: string;
  projectName?: string;
}

function formatAmount(amount: number, currency: Currency | string): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FlaggedTransactionsScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [duplicateTransactions, setDuplicateTransactions] = useState<Record<string, DuplicateInfo>>({});
  const [markingReviewed, setMarkingReviewed] = useState<string | null>(null);

  const loadTransactions = useCallback(
    async (showLoader = true) => {
      if (showLoader) setIsLoading(true);
      try {
        const result = await FinanceService.getFlaggedTransactions({ limit: 100 });
        if (result.success) {
          setTransactions(result.data.transactions);
          setDuplicateTransactions(result.data.duplicateTransactions);
        } else {
          showError(result.error.message);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [showError]
  );

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTransactions(false);
  }, [loadTransactions]);

  const handleMarkReviewed = async (transactionId: string) => {
    setMarkingReviewed(transactionId);
    try {
      const result = await FinanceService.markTransactionReviewed(transactionId);
      if (result.success) {
        setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
        showSuccess("Marked as reviewed");
      } else {
        showError(result.error.message);
      }
    } finally {
      setMarkingReviewed(null);
    }
  };

  const handleEditTransaction = (transactionId: string) => {
    router.push(buildRoute.transactionEdit(transactionId));
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    setMarkingReviewed(transactionId);
    try {
      const result = await FinanceService.deleteTransaction(transactionId);
      if (result.success) {
        setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
        showSuccess("Transaction deleted");
      } else {
        showError(result.error.message);
      }
    } finally {
      setMarkingReviewed(null);
    }
  };

  // Count by reason
  const lowConfidenceCount = transactions.filter(t => t.reviewReason === "low_confidence").length;
  const duplicateCount = transactions.filter(t => t.reviewReason === "potential_duplicate").length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="mr-3"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Lucide name="chevron-left" size={24} color={COLORS.gray600} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">Flagged for Review</Text>
          <Text className="text-xs text-gray-500">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} need attention
          </Text>
        </View>
      </View>

      {/* Info Banners */}
      {lowConfidenceCount > 0 && (
        <View className="bg-amber-50 mx-4 mt-4 p-4 rounded-2xl border border-amber-200">
          <View className="flex-row items-start">
            <Lucide name="alert-triangle" size={20} color="#F59E0B" />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-medium text-amber-900">
                Low confidence ({lowConfidenceCount})
              </Text>
              <Text className="text-xs text-amber-700 mt-1">
                These transactions were parsed with low AI confidence. Please review and edit if needed.
              </Text>
            </View>
          </View>
        </View>
      )}

      {duplicateCount > 0 && (
        <View className="bg-red-50 mx-4 mt-3 p-4 rounded-2xl border border-red-200">
          <View className="flex-row items-start">
            <Lucide name="copy" size={20} color="#EF4444" />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-medium text-red-900">
                Potential duplicates ({duplicateCount})
              </Text>
              <Text className="text-xs text-red-700 mt-1">
                These transactions may be duplicates of existing entries. Review and delete if needed.
              </Text>
            </View>
          </View>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
          <View style={styles.emptyIconBg}>
            <Lucide name="check-circle" size={32} color={COLORS.success} />
          </View>
          <Text className="text-base font-medium text-gray-700 mt-4">
            All caught up!
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            No transactions need review at this time.
          </Text>
          <Pressable
            onPress={() => router.replace(ROUTES.TRANSACTIONS)}
            className="mt-4 px-6 py-3 rounded-xl"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Text className="text-white font-semibold">View All Transactions</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionCard
              transaction={item}
              duplicates={
                item.potentialDuplicateIds
                  ?.map(id => duplicateTransactions[id])
                  .filter(Boolean) || []
              }
              onMarkReviewed={() => handleMarkReviewed(item.id)}
              onEdit={() => handleEditTransaction(item.id)}
              onDelete={() => handleDeleteTransaction(item.id)}
              isMarking={markingReviewed === item.id}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

interface TransactionCardProps {
  transaction: ITransaction;
  duplicates: DuplicateInfo[];
  onMarkReviewed: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isMarking: boolean;
}

function TransactionCard({
  transaction,
  duplicates,
  onMarkReviewed,
  onEdit,
  onDelete,
  isMarking,
}: TransactionCardProps) {
  const confidencePercent = Math.round((transaction.confidence || 0) * 100);
  const isDuplicate = transaction.reviewReason === "potential_duplicate";

  return (
    <View style={styles.card} className="mx-4 mb-3 bg-white rounded-2xl p-4">
      {/* Main Row */}
      <View className="flex-row items-start">
        <View
          style={[
            styles.typeIcon,
            {
              backgroundColor: isDuplicate
                ? `${COLORS.error}15`
                : transaction.type === "expense"
                ? `${COLORS.error}15`
                : `${COLORS.success}15`,
            },
          ]}
        >
          <Lucide
            name={isDuplicate ? "copy" : transaction.type === "expense" ? "arrow-up-right" : "arrow-down-left"}
            size={18}
            color={isDuplicate ? COLORS.error : transaction.type === "expense" ? COLORS.error : COLORS.success}
          />
        </View>

        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
              {transaction.contactName || "Unknown"}
            </Text>
            <Text
              className="text-base font-bold"
              style={{
                color: transaction.type === "expense" ? COLORS.error : COLORS.success,
              }}
            >
              {transaction.type === "expense" ? "-" : "+"}
              {formatAmount(transaction.amount, transaction.currency)}
            </Text>
          </View>

          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-gray-500">
              {formatDate(transaction.date)}
            </Text>
            {transaction.projectName && (
              <>
                <Text className="text-xs text-gray-400 mx-1">•</Text>
                <Text className="text-xs text-gray-500">{transaction.projectName}</Text>
              </>
            )}
          </View>

          {transaction.description && (
            <Text className="text-xs text-gray-500 mt-1" numberOfLines={2}>
              {transaction.description}
            </Text>
          )}

          {/* Reason Badge */}
          <View className="flex-row items-center mt-2">
            {isDuplicate ? (
              <View
                style={styles.duplicateBadge}
                className="px-2 py-0.5 rounded-full"
              >
                <Text className="text-xs font-medium text-red-700">
                  Potential duplicate
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.confidenceBadge,
                  {
                    backgroundColor:
                      confidencePercent >= 70
                        ? `${COLORS.success}15`
                        : confidencePercent >= 40
                        ? "#FEF3C7"
                        : `${COLORS.error}15`,
                  },
                ]}
                className="px-2 py-0.5 rounded-full"
              >
                <Text
                  className="text-xs font-medium"
                  style={{
                    color:
                      confidencePercent >= 70
                        ? COLORS.success
                        : confidencePercent >= 40
                        ? "#B45309"
                        : COLORS.error,
                  }}
                >
                  {confidencePercent}% confidence
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Duplicate Details */}
      {isDuplicate && duplicates.length > 0 && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-xs font-medium text-gray-600 mb-2">
            Similar to existing transaction{duplicates.length > 1 ? "s" : ""}:
          </Text>
          {duplicates.map((dup) => (
            <View
              key={dup.id}
              style={styles.duplicateRow}
              className="flex-row items-center justify-between p-2 rounded-lg mb-1"
            >
              <View className="flex-1">
                <Text className="text-xs font-medium text-gray-800">
                  {dup.contactName}
                </Text>
                <Text className="text-xs text-gray-500">
                  {formatDate(dup.date)}
                  {dup.projectName && ` • ${dup.projectName}`}
                </Text>
              </View>
              <Text
                className="text-xs font-semibold"
                style={{ color: dup.type === "expense" ? COLORS.error : COLORS.success }}
              >
                {dup.type === "expense" ? "-" : "+"}
                {formatAmount(dup.amount, dup.currency)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View className="flex-row mt-3 pt-3 border-t border-gray-100 gap-2">
        {isDuplicate ? (
          <>
            <Pressable
              onPress={onMarkReviewed}
              disabled={isMarking}
              className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
              style={[styles.notDuplicateButton, isMarking && styles.buttonDisabled]}
            >
              <Lucide name="check" size={16} color={COLORS.primary} />
              <Text className="text-sm font-medium text-primary ml-2">Not a Duplicate</Text>
            </Pressable>

            <Pressable
              onPress={onDelete}
              disabled={isMarking}
              className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
              style={[styles.deleteButton, isMarking && styles.buttonDisabled]}
            >
              {isMarking ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Lucide name="trash-2" size={16} color={COLORS.white} />
                  <Text className="text-sm font-medium text-white ml-2">Delete</Text>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={onEdit}
              className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
              style={styles.editButton}
            >
              <Lucide name="pencil" size={16} color={COLORS.primary} />
              <Text className="text-sm font-medium text-primary ml-2">Edit</Text>
            </Pressable>

            <Pressable
              onPress={onMarkReviewed}
              disabled={isMarking}
              className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
              style={[styles.reviewedButton, isMarking && styles.buttonDisabled]}
            >
              {isMarking ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Lucide name="check" size={16} color={COLORS.white} />
                  <Text className="text-sm font-medium text-white ml-2">Looks Good</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
    backgroundColor: `${COLORS.success}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceBadge: {},
  duplicateBadge: {
    backgroundColor: "#FEE2E2",
  },
  duplicateRow: {
    backgroundColor: COLORS.gray50,
  },
  editButton: {
    backgroundColor: `${COLORS.primary}15`,
  },
  notDuplicateButton: {
    backgroundColor: `${COLORS.primary}15`,
  },
  reviewedButton: {
    backgroundColor: COLORS.success,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
