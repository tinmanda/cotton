import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS } from "@/constants";
import { FinanceService } from "@/services";
import { IMerchant } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function MerchantsScreen() {
  const router = useRouter();
  const { showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [merchants, setMerchants] = useState<IMerchant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadMerchants = useCallback(
    async (showLoader = true) => {
      if (showLoader) setIsLoading(true);
      try {
        const result = await FinanceService.getMerchants({
          search: searchQuery || undefined,
        });
        if (result.success) {
          setMerchants(result.data);
        } else {
          showError(result.error.message);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchQuery, showError]
  );

  useFocusEffect(
    useCallback(() => {
      loadMerchants();
    }, [loadMerchants])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadMerchants(false);
  }, [loadMerchants]);

  const filteredMerchants = merchants.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Text className="text-xl font-bold text-gray-900">Merchants</Text>
          <Text className="text-xs text-gray-500">{merchants.length} vendors & clients</Text>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View style={styles.searchContainer} className="flex-row items-center px-3 py-2 rounded-xl">
          <Lucide name="search" size={18} color={COLORS.gray400} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search merchants..."
            placeholderTextColor={COLORS.gray400}
            className="flex-1 ml-2 text-base"
            style={{ color: COLORS.gray900 }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Lucide name="x" size={18} color={COLORS.gray400} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredMerchants.length === 0 ? (
        <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
          <View style={styles.emptyIconBg}>
            <Lucide name="store" size={32} color={COLORS.gray400} />
          </View>
          <Text className="text-base font-medium text-gray-700 mt-4">
            {searchQuery ? "No merchants found" : "No merchants yet"}
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            {searchQuery
              ? "Try a different search term"
              : "Merchants are automatically created when you add transactions"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMerchants}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MerchantRow merchant={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function MerchantRow({ merchant }: { merchant: IMerchant }) {
  const totalAmount = merchant.totalSpent + merchant.totalReceived;
  const isNetPositive = merchant.totalReceived > merchant.totalSpent;

  return (
    <View style={styles.merchantCard} className="mx-4 mb-3 bg-white rounded-xl p-4">
      <View className="flex-row items-center">
        <View style={styles.merchantIcon}>
          <Lucide name="store" size={18} color={COLORS.primary} />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-gray-900">{merchant.name}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {merchant.transactionCount} transactions
          </Text>
        </View>
      </View>

      {totalAmount > 0 && (
        <View className="flex-row mt-3 pt-3 border-t border-gray-100">
          <View className="flex-1">
            <Text className="text-xs text-gray-500">Spent</Text>
            <Text className="text-sm font-medium text-error mt-0.5">
              {formatAmount(merchant.totalSpent)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500">Received</Text>
            <Text className="text-sm font-medium text-success mt-0.5">
              {formatAmount(merchant.totalReceived)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    backgroundColor: COLORS.gray100,
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
  merchantCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  merchantIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
});
