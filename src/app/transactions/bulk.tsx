import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS, ROUTES } from "@/constants";
import { FinanceService } from "@/services";
import { ParsedBulkTransaction, Currency, TransactionType } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatAmount(amount: number, currency: Currency): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface BulkTransactionItem extends ParsedBulkTransaction {
  selected: boolean;
  categoryId?: string;
  projectId?: string;
  employeeId?: string;
}

export default function BulkTransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showSuccess, showError } = useToast();

  // Parse the data passed from the Add screen
  const initialData = params.data ? JSON.parse(params.data as string) : null;
  const rawInputId = params.rawInputId as string | undefined;
  const summary = params.summary as string | undefined;
  const confidence = params.confidence ? parseFloat(params.confidence as string) : 0;

  const [transactions, setTransactions] = useState<BulkTransactionItem[]>(() =>
    (initialData?.transactions || []).map((t: ParsedBulkTransaction) => ({
      ...t,
      selected: true,
      categoryId: t.suggestedCategoryId || undefined,
      projectId: t.suggestedProjectId || undefined,
      employeeId: t.existingEmployeeId || undefined,
    }))
  );
  const [isCreating, setIsCreating] = useState(false);

  const categories = initialData?.categories || [];
  const projects = initialData?.projects || [];

  const toggleTransaction = (index: number) => {
    setTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const selectedCount = transactions.filter((t) => t.selected).length;
  const totalAmount = transactions
    .filter((t) => t.selected)
    .reduce((sum, t) => sum + (t.type === "expense" ? -t.amount : t.amount), 0);

  const handleCreate = async () => {
    const selectedTransactions = transactions.filter((t) => t.selected);
    if (selectedTransactions.length === 0) {
      showError("Select at least one transaction");
      return;
    }

    setIsCreating(true);
    try {
      const result = await FinanceService.createBulkTransactions({
        transactions: selectedTransactions.map((t) => ({
          amount: t.amount,
          currency: t.currency,
          type: t.type,
          date: t.date,
          merchantName: t.merchantName,
          categoryId: t.categoryId,
          projectId: t.projectId,
          employeeId: t.employeeId,
          description: t.description,
        })),
        rawInputId,
      });

      if (result.success) {
        showSuccess(`Created ${result.data.created} transactions`);
        router.replace(ROUTES.TRANSACTIONS);
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (!initialData || transactions.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Lucide name="alert-circle" size={48} color={COLORS.gray400} />
          <Text className="text-lg font-medium text-gray-700 mt-4">No transactions found</Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 px-6 py-3 bg-primary rounded-xl"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="px-2 py-1"
        >
          <Lucide name="arrow-left" size={24} color={COLORS.gray600} />
        </Pressable>
        <View className="flex-1 mx-4">
          <Text className="text-lg font-semibold text-gray-900 text-center">
            Review Transactions
          </Text>
          <Text className="text-xs text-gray-500 text-center">
            {selectedCount} of {transactions.length} selected
          </Text>
        </View>
        <Pressable
          onPress={handleCreate}
          disabled={isCreating || selectedCount === 0}
          className="px-2 py-1"
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text
              className={`text-base font-semibold ${
                selectedCount > 0 ? "text-primary" : "text-gray-300"
              }`}
            >
              Create
            </Text>
          )}
        </Pressable>
      </View>

      {/* Summary */}
      {summary && (
        <View className="bg-white px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center">
            <Lucide name="sparkles" size={16} color={COLORS.primary} />
            <Text className="text-sm text-gray-600 ml-2 flex-1">{summary}</Text>
          </View>
          <View className="flex-row items-center mt-2">
            <Text className="text-xs text-gray-400">
              AI Confidence: {Math.round(confidence * 100)}%
            </Text>
          </View>
        </View>
      )}

      {/* Total */}
      <View className="bg-white mx-4 mt-4 p-4 rounded-2xl" style={styles.card}>
        <Text className="text-sm text-gray-500">Net Total (selected)</Text>
        <Text
          className="text-2xl font-bold mt-1"
          style={{ color: totalAmount >= 0 ? COLORS.success : COLORS.error }}
        >
          {totalAmount >= 0 ? "+" : ""}
          {formatAmount(Math.abs(totalAmount), "INR")}
        </Text>
      </View>

      {/* Transaction List */}
      <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-6">
          {transactions.map((transaction, index) => (
            <Pressable
              key={index}
              onPress={() => toggleTransaction(index)}
              style={[styles.card, !transaction.selected && styles.cardDeselected]}
              className="bg-white rounded-2xl p-4 mb-3"
            >
              <View className="flex-row items-start">
                {/* Checkbox */}
                <View
                  style={[
                    styles.checkbox,
                    transaction.selected && styles.checkboxSelected,
                  ]}
                  className="mr-3 mt-0.5"
                >
                  {transaction.selected && (
                    <Lucide name="check" size={14} color={COLORS.white} />
                  )}
                </View>

                {/* Details */}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-base font-medium ${
                        transaction.selected ? "text-gray-900" : "text-gray-400"
                      }`}
                      numberOfLines={1}
                    >
                      {transaction.merchantName}
                    </Text>
                    <Text
                      className="text-base font-semibold"
                      style={{
                        color: transaction.selected
                          ? transaction.type === "expense"
                            ? COLORS.error
                            : COLORS.success
                          : COLORS.gray400,
                      }}
                    >
                      {transaction.type === "expense" ? "-" : "+"}
                      {formatAmount(transaction.amount, transaction.currency)}
                    </Text>
                  </View>

                  <View className="flex-row items-center mt-1">
                    <Text
                      className={`text-xs ${
                        transaction.selected ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {formatDate(transaction.date)}
                    </Text>
                    {transaction.description && (
                      <>
                        <Text className="text-xs text-gray-400 mx-1">•</Text>
                        <Text
                          className={`text-xs flex-1 ${
                            transaction.selected ? "text-gray-500" : "text-gray-400"
                          }`}
                          numberOfLines={1}
                        >
                          {transaction.description}
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Category & Project chips */}
                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {transaction.categoryId && (
                      <View style={styles.chip} className="px-2 py-1 rounded-md">
                        <Text className="text-xs text-gray-600">
                          {categories.find((c: { id: string }) => c.id === transaction.categoryId)?.name || "Category"}
                        </Text>
                      </View>
                    )}
                    {transaction.projectId && (
                      <View style={styles.chip} className="px-2 py-1 rounded-md">
                        <Text className="text-xs text-gray-600">
                          {projects.find((p: { id: string }) => p.id === transaction.projectId)?.name || "Project"}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View className="bg-white px-4 py-4 border-t border-gray-100">
        <Pressable
          onPress={handleCreate}
          disabled={isCreating || selectedCount === 0}
          style={[
            styles.createButton,
            (isCreating || selectedCount === 0) && styles.createButtonDisabled,
          ]}
          className="py-4 rounded-xl items-center"
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text className="text-white font-semibold text-base">
              Create {selectedCount} Transaction{selectedCount !== 1 ? "s" : ""}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
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
  cardDeselected: {
    opacity: 0.6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chip: {
    backgroundColor: COLORS.gray100,
  },
  createButton: {
    backgroundColor: COLORS.primary,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
});
