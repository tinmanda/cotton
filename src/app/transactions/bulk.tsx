import React, { useState, useMemo, useEffect } from "react";
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
import { useRouter } from "expo-router";
import { useAtom } from "jotai";
import { COLORS, ROUTES } from "@/constants";
import { bulkTransactionDataAtom } from "@/store/ui/atoms";
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
}

interface NewContact {
  name: string;
  transactionCount: number;
}

export default function BulkTransactionsScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  // Get data from Jotai atom
  const [bulkData, setBulkData] = useAtom(bulkTransactionDataAtom);

  const [transactions, setTransactions] = useState<BulkTransactionItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Bulk project selector
  const [bulkProjectId, setBulkProjectId] = useState<string | undefined>();

  // Initialize transactions from atom data
  useEffect(() => {
    if (bulkData?.data?.transactions) {
      setTransactions(
        bulkData.data.transactions.map((t: ParsedBulkTransaction) => ({
          ...t,
          selected: true,
          categoryId: t.suggestedCategoryId || undefined,
          projectId: t.suggestedProjectId || undefined,
        }))
      );
    }
  }, [bulkData]);

  // Clear atom data when leaving the screen
  useEffect(() => {
    return () => {
      setBulkData(null);
    };
  }, [setBulkData]);

  const rawInputId = bulkData?.rawInputId;
  const summary = bulkData?.summary;
  const confidence = bulkData?.confidence || 0;
  const categories = bulkData?.data?.categories || [];
  const projects: Array<{ id: string; name: string; color?: string }> = bulkData?.data?.projects || [];

  // Apply bulk project to all transactions
  const applyBulkProject = (projectId: string) => {
    setBulkProjectId(projectId);
    setTransactions((prev) =>
      prev.map((t) => ({ ...t, projectId }))
    );
  };

  // Update individual transaction's project
  const setTransactionProject = (index: number, projectId: string) => {
    setTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, projectId } : t))
    );
    // Clear bulk selection if individual project differs
    setBulkProjectId(undefined);
  };

  // Check if all selected transactions have a project
  const allHaveProject = transactions
    .filter((t) => t.selected)
    .every((t) => t.projectId);

  // Extract unique new contacts (where existingContactId is null/undefined)
  const newContacts = useMemo(() => {
    const contactMap = new Map<string, NewContact>();

    for (const t of transactions) {
      // Skip if this contact already exists in database
      if (t.existingContactId) continue;

      const existing = contactMap.get(t.contactName);
      if (existing) {
        existing.transactionCount += 1;
      } else {
        contactMap.set(t.contactName, {
          name: t.contactName,
          transactionCount: 1,
        });
      }
    }

    return Array.from(contactMap.values());
  }, [transactions]);

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

    // Validate all selected transactions have a project
    const missingProject = selectedTransactions.find((t) => !t.projectId);
    if (missingProject) {
      showError("All transactions must have a project assigned");
      return;
    }

    setIsCreating(true);
    try {
      // Flag for review if overall confidence is low (below 70%)
      const needsReview = confidence < 0.7;

      const result = await FinanceService.createBulkTransactions({
        transactions: selectedTransactions.map((t) => ({
          amount: t.amount,
          currency: t.currency,
          type: t.type,
          date: t.date,
          contactName: t.contactName,
          categoryId: t.categoryId,
          projectId: t.projectId,
          description: t.description,
          needsReview,
          confidence,
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

  if (!bulkData || transactions.length === 0) {
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

      {/* Scrollable Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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

        {/* New Contacts Section */}
        {newContacts.length > 0 && (
          <View className="bg-white mx-4 mt-4 p-4 rounded-2xl" style={styles.card}>
            <View className="flex-row items-center mb-3">
              <Lucide name="user-plus" size={16} color={COLORS.primary} />
              <Text className="text-sm font-semibold text-gray-900 ml-2">
                New Contacts
              </Text>
              <View style={styles.badge} className="ml-2 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-primary font-medium">{newContacts.length}</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-500 mb-3">
              These contacts will be created automatically.
            </Text>
            {newContacts.map((contact) => (
              <View
                key={contact.name}
                className="flex-row items-center justify-between py-2 border-t border-gray-100"
              >
                <Text className="text-sm font-medium text-gray-900 flex-1" numberOfLines={1}>
                  {contact.name}
                </Text>
                <Text className="text-xs text-gray-500 ml-2">
                  {contact.transactionCount} txn{contact.transactionCount !== 1 ? "s" : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Bulk Project Selector */}
        {projects.length > 0 && (
          <View className="bg-white mx-4 mt-4 p-4 rounded-2xl" style={styles.card}>
            <View className="flex-row items-center mb-3">
              <Lucide name="folder" size={16} color={COLORS.primary} />
              <Text className="text-sm font-semibold text-gray-900 ml-2">
                Assign Project
              </Text>
              <Text className="text-xs text-error ml-1">*</Text>
            </View>
            <Text className="text-xs text-gray-500 mb-3">
              Select a project for all transactions, or set individually below.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              <View className="flex-row px-1 gap-2">
                {projects.map((project) => (
                  <Pressable
                    key={project.id}
                    onPress={() => applyBulkProject(project.id)}
                    style={[
                      styles.projectChip,
                      bulkProjectId === project.id && styles.projectChipActive,
                    ]}
                    className="px-3 py-2 rounded-lg flex-row items-center"
                  >
                    <View
                      style={[styles.projectDot, { backgroundColor: project.color || COLORS.primary }]}
                    />
                    <Text
                      className={`text-sm font-medium ml-2 ${
                        bulkProjectId === project.id ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {project.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {!allHaveProject && (
              <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
                <Lucide name="alert-circle" size={14} color={COLORS.error} />
                <Text className="text-xs text-error ml-1.5">
                  Some transactions don't have a project assigned
                </Text>
              </View>
            )}
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
        <View className="px-4 mt-4 pb-6">
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
                      {transaction.contactName}
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
                  </View>

                  {/* Project Selector */}
                  {transaction.selected && (
                    <View className="mt-2 pt-2 border-t border-gray-100">
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                        <View className="flex-row px-1 gap-1.5">
                          {projects.map((project) => {
                            const isSelected = transaction.projectId === project.id;
                            return (
                              <Pressable
                                key={project.id}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  setTransactionProject(index, project.id);
                                }}
                                style={[
                                  styles.miniProjectChip,
                                  isSelected && styles.miniProjectChipActive,
                                ]}
                                className="px-2 py-1 rounded-md flex-row items-center"
                              >
                                <View
                                  style={[
                                    styles.miniProjectDot,
                                    { backgroundColor: project.color || COLORS.primary },
                                  ]}
                                />
                                <Text
                                  className={`text-xs font-medium ml-1 ${
                                    isSelected ? "text-white" : "text-gray-600"
                                  }`}
                                >
                                  {project.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </ScrollView>
                      {!transaction.projectId && (
                        <View className="flex-row items-center mt-1">
                          <Lucide name="alert-circle" size={10} color={COLORS.error} />
                          <Text className="text-xs text-error ml-1">Project required</Text>
                        </View>
                      )}
                    </View>
                  )}
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
  badge: {
    backgroundColor: `${COLORS.primary}15`,
  },
  projectChip: {
    backgroundColor: COLORS.gray100,
  },
  projectChipActive: {
    backgroundColor: COLORS.primary,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectDropdown: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  miniProjectChip: {
    backgroundColor: COLORS.gray100,
  },
  miniProjectChipActive: {
    backgroundColor: COLORS.primary,
  },
  miniProjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  createButton: {
    backgroundColor: COLORS.primary,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
});
