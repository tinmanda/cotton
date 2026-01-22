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
import { COLORS } from "@/constants";
import { FinanceService } from "@/services";
import { IProjectSummary } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

        {/* Contacts */}
        <View className="px-4 mb-6">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Contacts
          </Text>
          {summary.contacts && summary.contacts.length > 0 ? (
            <View style={styles.sectionCard} className="bg-white rounded-2xl overflow-hidden">
              {summary.contacts.map((contact, index) => (
                <View
                  key={contact.id}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    index < summary.contacts.length - 1 ? "border-b border-gray-100" : ""
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
                  <Text className="text-sm font-semibold text-gray-900">
                    {formatAmount(contact.amount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState} className="bg-white rounded-2xl p-6 items-center">
              <Lucide name="users" size={24} color={COLORS.gray400} />
              <Text className="text-sm text-gray-500 mt-2">No contacts yet</Text>
            </View>
          )}
        </View>
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
