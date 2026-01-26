import { useState, useCallback, useMemo } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS, buildRoute } from "@/constants";
import { FinanceService } from "@/services";
import { IContact } from "@/types";
import { useToast } from "@/hooks/useToast";

type FilterType = "all" | "paid_to" | "received_from";
type SortType = "transactions" | "spent" | "received" | "name";

function formatAmount(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function ContactsScreen() {
  const router = useRouter();
  const { showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeSort, setActiveSort] = useState<SortType>("transactions");

  const loadContacts = useCallback(
    async (showLoader = true) => {
      if (showLoader) setIsLoading(true);
      try {
        const result = await FinanceService.getContacts({
          search: searchQuery || undefined,
        });
        if (result.success) {
          setContacts(result.data);
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
      loadContacts();
    }, [loadContacts])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadContacts(false);
  }, [loadContacts]);

  // Filter and sort contacts
  const processedContacts = useMemo(() => {
    let filtered = contacts.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply filter
    if (activeFilter === "paid_to") {
      filtered = filtered.filter((c) => (c.totalSpent || 0) > 0);
    } else if (activeFilter === "received_from") {
      filtered = filtered.filter((c) => (c.totalReceived || 0) > 0);
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (activeSort) {
        case "transactions":
          return (b.transactionCount || 0) - (a.transactionCount || 0);
        case "spent":
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case "received":
          return (b.totalReceived || 0) - (a.totalReceived || 0);
        case "name":
          return a.name.localeCompare(b.name);
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
    const paidToCount = contacts.filter((c) => (c.totalSpent || 0) > 0).length;
    const receivedFromCount = contacts.filter((c) => (c.totalReceived || 0) > 0).length;
    return { totalSpent, totalReceived, paidToCount, receivedFromCount };
  }, [contacts]);

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: contacts.length },
    { key: "paid_to", label: "Paid to", count: stats.paidToCount },
    { key: "received_from", label: "Received from", count: stats.receivedFromCount },
  ];

  const sortOptions: { key: SortType; label: string; icon: string }[] = [
    { key: "transactions", label: "Most active", icon: "arrow-up-down" },
    { key: "spent", label: "Most spent", icon: "arrow-up-right" },
    { key: "received", label: "Most received", icon: "arrow-down-left" },
    { key: "name", label: "A-Z", icon: "arrow-down-a-z" },
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
              ? "No contacts match this filter"
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
  const hasActivity = spent > 0 || received > 0;

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
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {contact.name}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {contact.transactionCount} transaction{contact.transactionCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <Lucide name="chevron-right" size={16} color={COLORS.gray300} />
      </View>

      {/* Financial Summary */}
      {hasActivity && (
        <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
          {spent > 0 && (
            <View className="flex-row items-center mr-4">
              <Lucide name="arrow-up-right" size={12} color={COLORS.error} />
              <Text className="text-xs font-medium text-error ml-1">
                {formatAmount(spent)}
              </Text>
            </View>
          )}
          {received > 0 && (
            <View className="flex-row items-center mr-4">
              <Lucide name="arrow-down-left" size={12} color={COLORS.success} />
              <Text className="text-xs font-medium text-success ml-1">
                {formatAmount(received)}
              </Text>
            </View>
          )}
          {spent > 0 && received > 0 && (
            <View className="flex-1 items-end">
              <View
                style={[
                  styles.netBadge,
                  netAmount >= 0 ? styles.netBadgePositive : styles.netBadgeNegative,
                ]}
                className="px-2 py-1 rounded-full"
              >
                <Text
                  className={`text-xs font-semibold ${
                    netAmount >= 0 ? "text-success" : "text-error"
                  }`}
                >
                  Net: {netAmount >= 0 ? "+" : ""}{formatAmount(Math.abs(netAmount))}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
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
  netBadge: {
    borderWidth: 1,
  },
  netBadgePositive: {
    backgroundColor: `${COLORS.success}10`,
    borderColor: `${COLORS.success}30`,
  },
  netBadgeNegative: {
    backgroundColor: `${COLORS.error}10`,
    borderColor: `${COLORS.error}30`,
  },
});
