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
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS } from "@/constants";
import { FinanceService } from "@/services";
import { ICategory, TransactionType } from "@/types";
import { useToast } from "@/hooks/useToast";

export default function CategoriesScreen() {
  const router = useRouter();
  const { showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [filterType, setFilterType] = useState<TransactionType | "all">("all");

  const loadCategories = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const result = await FinanceService.getCategories();
      if (result.success) {
        setCategories(result.data);
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
      loadCategories();
    }, [loadCategories])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCategories(false);
  }, [loadCategories]);

  const filteredCategories =
    filterType === "all"
      ? categories
      : categories.filter((c) => c.type === filterType);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

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
          <Text className="text-xl font-bold text-gray-900">Categories</Text>
          <Text className="text-xs text-gray-500">
            {expenseCategories.length} expense, {incomeCategories.length} income
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row gap-2">
          {(["all", "expense", "income"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setFilterType(t)}
              style={[styles.filterChip, filterType === t && styles.filterChipActive]}
              className="px-4 py-2 rounded-full"
            >
              <Text
                className={`text-sm font-medium capitalize ${
                  filterType === t ? "text-white" : "text-gray-600"
                }`}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
          <View style={styles.emptyIconBg}>
            <Lucide name="tags" size={32} color={COLORS.gray400} />
          </View>
          <Text className="text-base font-medium text-gray-700 mt-4">
            No categories yet
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            Categories are automatically created when you start
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 12, gap: 12 }}
          renderItem={({ item }) => <CategoryCard category={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function CategoryCard({ category }: { category: ICategory }) {
  return (
    <View
      style={[styles.categoryCard, { borderLeftColor: category.color }]}
      className="flex-1 bg-white rounded-xl p-4"
    >
      <View className="flex-row items-center justify-between">
        <View
          style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}
        >
          <Lucide name={category.icon as any} size={16} color={category.color} />
        </View>
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor:
                category.type === "expense" ? `${COLORS.error}10` : `${COLORS.success}10`,
            },
          ]}
        >
          <Text
            className="text-xs font-medium capitalize"
            style={{
              color: category.type === "expense" ? COLORS.error : COLORS.success,
            }}
          >
            {category.type}
          </Text>
        </View>
      </View>
      <Text className="text-sm font-semibold text-gray-900 mt-3" numberOfLines={1}>
        {category.name}
      </Text>
      {category.isSystem && (
        <Text className="text-xs text-gray-400 mt-1">System category</Text>
      )}
    </View>
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
  categoryCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderLeftWidth: 3,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
