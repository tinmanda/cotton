import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import { COLORS, buildRoute } from "@/constants";
import { IContact } from "@/types";
import { useToast } from "@/hooks/useToast";
import { useContacts } from "@/store";

type FilterType = "all" | "revenue" | "expense";
type SortType = "amount_desc" | "amount_asc" | "name_asc" | "name_desc";

function formatAmount(amount: number, currency: string = "INR"): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const symbol = currency === "USD" ? "$" : "₹";

  let formatted: string;
  if (currency === "INR") {
    // Indian format: K (thousands), L (lakhs)
    if (absAmount >= 100000) {
      formatted = `${symbol}${(absAmount / 100000).toFixed(1)}L`;
    } else if (absAmount >= 1000) {
      formatted = `${symbol}${(absAmount / 1000).toFixed(1)}K`;
    } else {
      formatted = `${symbol}${absAmount.toLocaleString("en-IN")}`;
    }
  } else {
    // International format: K (thousands), M (millions)
    if (absAmount >= 1000000) {
      formatted = `${symbol}${(absAmount / 1000000).toFixed(1)}M`;
    } else if (absAmount >= 1000) {
      formatted = `${symbol}${(absAmount / 1000).toFixed(1)}K`;
    } else {
      formatted = `${symbol}${absAmount.toLocaleString("en-US")}`;
    }
  }

  return isNegative ? `-${formatted}` : formatted;
}

export default function ContactsScreen() {
  const router = useRouter();
  const { showError } = useToast();
  const { contacts, isLoading, fetchContacts } = useContacts();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeSort, setActiveSort] = useState<SortType>("amount_desc");

  // Load contacts on mount (will use cache if valid)
  useEffect(() => {
    const load = async () => {
      const result = await fetchContacts();
      if (!result.success && "error" in result) {
        showError(result.error.message);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const result = await fetchContacts(true); // Force refresh
    if (!result.success && "error" in result) {
      showError(result.error.message);
    }
    setIsRefreshing(false);
  }, [fetchContacts, showError]);

  // Filter and sort contacts
  const processedContacts = useMemo(() => {
    let filtered = contacts.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply filter
    if (activeFilter === "expense") {
      filtered = filtered.filter((c) => (c.totalSpent || 0) > 0);
    } else if (activeFilter === "revenue") {
      filtered = filtered.filter((c) => (c.totalReceived || 0) > 0);
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (activeSort) {
        case "amount_desc": {
          // Sort by net amount (received - spent), highest first
          const netA = (a.totalReceived || 0) - (a.totalSpent || 0);
          const netB = (b.totalReceived || 0) - (b.totalSpent || 0);
          return netB - netA;
        }
        case "amount_asc": {
          // Sort by net amount (received - spent), lowest first
          const netA = (a.totalReceived || 0) - (a.totalSpent || 0);
          const netB = (b.totalReceived || 0) - (b.totalSpent || 0);
          return netA - netB;
        }
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [contacts, searchQuery, activeFilter, activeSort]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalSpent = contacts.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalReceived = contacts.reduce((sum, c) => sum + (c.totalReceived || 0), 0);
    const expenseCount = contacts.filter((c) => (c.totalSpent || 0) > 0).length;
    const revenueCount = contacts.filter((c) => (c.totalReceived || 0) > 0).length;
    return { totalSpent, totalReceived, expenseCount, revenueCount };
  }, [contacts]);

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: contacts.length },
    { key: "revenue", label: "Revenue", count: stats.revenueCount },
    { key: "expense", label: "Expense", count: stats.expenseCount },
  ];

  const sortOptions: { key: SortType; label: string; icon: string }[] = [
    { key: "amount_desc", label: "Amount ↓", icon: "arrow-down" },
    { key: "amount_asc", label: "Amount ↑", icon: "arrow-up" },
    { key: "name_asc", label: "A-Z", icon: "arrow-down-a-z" },
    { key: "name_desc", label: "Z-A", icon: "arrow-up-a-z" },
  ];

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
          <Text className="text-xl font-bold text-gray-900">Contacts</Text>
          <Text className="text-xs text-gray-500">
            {processedContacts.length} of {contacts.length} contacts
          </Text>
        </View>
      </View>

      {/* Search */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View style={styles.searchContainer} className="flex-row items-center px-3 py-2 rounded-xl">
          <Lucide name="search" size={18} color={COLORS.gray400} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search contacts..."
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

      {/* Filter Chips */}
      <View className="bg-white border-b border-gray-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        >
          <View className="flex-row gap-2">
            {filters.map((filter) => (
              <Pressable
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                style={[
                  styles.filterChip,
                  activeFilter === filter.key && styles.filterChipActive,
                ]}
                className="flex-row items-center px-3 py-2 rounded-full"
              >
                <Text
                  className={`text-sm font-medium ${
                    activeFilter === filter.key ? "text-white" : "text-gray-600"
                  }`}
                >
                  {filter.label}
                </Text>
                <View
                  style={[
                    styles.filterCount,
                    activeFilter === filter.key && styles.filterCountActive,
                  ]}
                  className="ml-1.5 px-1.5 py-0.5 rounded-full"
                >
                  <Text
                    className={`text-xs font-semibold ${
                      activeFilter === filter.key ? "text-primary" : "text-gray-500"
                    }`}
                  >
                    {filter.count}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View className="bg-white border-b border-gray-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-gray-400 mr-2">Sort:</Text>
            {sortOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setActiveSort(option.key)}
                style={[
                  styles.sortChip,
                  activeSort === option.key && styles.sortChipActive,
                ]}
                className="flex-row items-center px-2.5 py-1.5 rounded-lg"
              >
                <Lucide
                  name={option.icon as "arrow-up-down"}
                  size={12}
                  color={activeSort === option.key ? COLORS.primary : COLORS.gray500}
                />
                <Text
                  className={`text-xs font-medium ml-1 ${
                    activeSort === option.key ? "text-primary" : "text-gray-500"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : processedContacts.length === 0 ? (
        <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
          <View style={styles.emptyIconBg}>
            <Lucide name="users" size={32} color={COLORS.gray400} />
          </View>
          <Text className="text-base font-medium text-gray-700 mt-4">
            {searchQuery || activeFilter !== "all" ? "No contacts found" : "No contacts yet"}
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            {searchQuery
              ? "Try a different search term"
              : activeFilter !== "all"
              ? `No ${activeFilter} contacts found`
              : "Contacts are automatically created when you add transactions"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={processedContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactRow
              contact={item}
              onPress={() => router.push(buildRoute.contactDetail(item.id))}
            />
          )}
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

function ContactRow({
  contact,
  onPress,
}: {
  contact: IContact;
  onPress: () => void;
}) {
  const spent = contact.totalSpent || 0;
  const received = contact.totalReceived || 0;
  const netAmount = received - spent;

  // Determine the primary type of contact
  const isPrimarilyExpense = spent > received;
  const isPrimarilyIncome = received > spent;

  return (
    <Pressable
      onPress={onPress}
      style={styles.contactCard}
      className="mx-4 mb-3 bg-white rounded-xl p-4 active:bg-gray-50"
    >
      <View className="flex-row items-center">
        <View
          style={[
            styles.contactIcon,
            isPrimarilyExpense && styles.contactIconExpense,
            isPrimarilyIncome && styles.contactIconIncome,
          ]}
        >
          <Lucide
            name="user"
            size={18}
            color={
              isPrimarilyExpense
                ? COLORS.error
                : isPrimarilyIncome
                ? COLORS.success
                : COLORS.primary
            }
          />
        </View>
        <View className="flex-1 ml-3 mr-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 flex-1 flex-shrink" numberOfLines={1}>
              {contact.name}
            </Text>
            {netAmount !== 0 && (
              <Text
                className="text-sm font-bold flex-shrink-0 ml-2"
                style={{ color: netAmount > 0 ? COLORS.success : COLORS.error }}
              >
                {netAmount > 0 ? "+" : ""}{formatAmount(netAmount)}
              </Text>
            )}
          </View>
          <View className="flex-row items-center mt-0.5">
            <Text className="text-xs text-gray-500">
              {contact.transactionCount} txn{contact.transactionCount !== 1 ? "s" : ""}
            </Text>
            {spent > 0 && (
              <View className="flex-row items-center ml-2">
                <Lucide name="arrow-up-right" size={10} color={COLORS.error} />
                <Text className="text-xs text-error ml-0.5">{formatAmount(spent)}</Text>
              </View>
            )}
            {received > 0 && (
              <View className="flex-row items-center ml-2">
                <Lucide name="arrow-down-left" size={10} color={COLORS.success} />
                <Text className="text-xs text-success ml-0.5">{formatAmount(received)}</Text>
              </View>
            )}
          </View>
        </View>
        <Lucide name="chevron-right" size={16} color={COLORS.gray300} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    backgroundColor: COLORS.gray100,
  },
  filterChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterCount: {
    backgroundColor: COLORS.white,
  },
  filterCountActive: {
    backgroundColor: `${COLORS.white}90`,
  },
  sortChip: {
    backgroundColor: "transparent",
  },
  sortChipActive: {
    backgroundColor: `${COLORS.primary}10`,
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
  contactCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  contactIconExpense: {
    backgroundColor: `${COLORS.error}15`,
  },
  contactIconIncome: {
    backgroundColor: `${COLORS.success}15`,
  },
});
