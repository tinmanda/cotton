import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { COLORS, buildRoute } from "@/constants";
import { FinanceService } from "@/services";
import { ITransaction, IContact, ICategory, IProject } from "@/types";
import { useToast } from "@/hooks/useToast";
import { useContacts, useCategories, useProjects } from "@/store";

function formatAmount(amount: number, currency: string = "INR"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(date: Date, includeYear = false): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const transDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (transDate.getTime() === today.getTime()) return "Today";
  if (transDate.getTime() === yesterday.getTime()) return "Yesterday";

  const showYear = includeYear || date.getFullYear() !== now.getFullYear();
  if (showYear) {
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function groupTransactionsByDate(transactions: ITransaction[]): { date: string; dateKey: string; data: ITransaction[] }[] {
  const groups: Record<string, { displayDate: string; data: ITransaction[] }> = {};

  for (const t of transactions) {
    const dateKey = getDateKey(t.date);
    if (!groups[dateKey]) {
      groups[dateKey] = {
        displayDate: formatDate(t.date),
        data: [],
      };
    }
    groups[dateKey].data.push(t);
  }

  return Object.entries(groups)
    .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
    .map(([dateKey, { displayDate, data }]) => ({ date: displayDate, dateKey, data }));
}

// Time period helpers
type TimePeriod = "all" | "today" | "this_week" | "this_month" | "last_month" | "this_quarter" | "this_year" | "last_year" | "custom" | "fy_current" | "fy_previous";

function getTimePeriodDates(period: TimePeriod, customStart?: Date, customEnd?: Date): { startDate?: Date; endDate?: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "all":
      return {};
    case "today":
      return { startDate: today, endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
    case "this_week": {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return { startDate: startOfWeek, endDate: endOfWeek };
    }
    case "this_month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { startDate: startOfMonth, endDate: endOfMonth };
    }
    case "last_month": {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { startDate: startOfLastMonth, endDate: endOfLastMonth };
    }
    case "this_quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const endOfQuarter = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59);
      return { startDate: startOfQuarter, endDate: endOfQuarter };
    }
    case "this_year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { startDate: startOfYear, endDate: endOfYear };
    }
    case "last_year": {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      return { startDate: startOfLastYear, endDate: endOfLastYear };
    }
    case "fy_current": {
      // Indian FY: April to March
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const startOfFY = new Date(fyStartYear, 3, 1); // April 1
      const endOfFY = new Date(fyStartYear + 1, 2, 31, 23, 59, 59); // March 31
      return { startDate: startOfFY, endDate: endOfFY };
    }
    case "fy_previous": {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
      const startOfFY = new Date(fyStartYear, 3, 1);
      const endOfFY = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
      return { startDate: startOfFY, endDate: endOfFY };
    }
    case "custom":
      return { startDate: customStart, endDate: customEnd };
    default:
      return {};
  }
}

function getTimePeriodLabel(period: TimePeriod): string {
  const now = new Date();
  const labels: Record<TimePeriod, string> = {
    all: "All Time",
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
    last_month: "Last Month",
    this_quarter: "This Quarter",
    this_year: "This Year",
    last_year: "Last Year",
    fy_current: `FY ${now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1}-${(now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear()).toString().slice(-2)}`,
    fy_previous: `FY ${now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2}-${(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1).toString().slice(-2)}`,
    custom: "Custom Range",
  };
  return labels[period];
}

type FilterType = "all" | "income" | "expense";

interface Filters {
  type: FilterType;
  timePeriod: TimePeriod;
  customStartDate?: Date;
  customEndDate?: Date;
  contactId?: string;
  categoryId?: string;
  projectId?: string;
}

const defaultFilters: Filters = {
  type: "all",
  timePeriod: "all",
};

export default function TransactionsScreen() {
  const router = useRouter();
  const { projectId: urlProjectId, contactId: urlContactId, contactName: urlContactName } = useLocalSearchParams<{
    projectId?: string;
    contactId?: string;
    contactName?: string;
  }>();
  const { showError } = useToast();

  // Cached data from Jotai
  const { contacts, fetchContacts } = useContacts();
  const { categories, fetchCategories } = useCategories();
  const { projects, fetchProjects } = useProjects();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [totals, setTotals] = useState({ income: 0, expenses: 0 });
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<Filters>(() => ({
    ...defaultFilters,
    projectId: urlProjectId || undefined,
    contactId: urlContactId || undefined,
  }));

  // Temp filters for modal (applied on "Apply")
  const [tempFilters, setTempFilters] = useState<Filters>(filters);

  // Context names for display
  const [projectName, setProjectName] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(urlContactName || null);

  // Load cached reference data on mount
  useEffect(() => {
    fetchContacts();
    fetchCategories();
    fetchProjects();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Count active filters (excluding type which is always visible)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.timePeriod !== "all") count++;
    if (filters.contactId && !urlContactId) count++;
    if (filters.categoryId) count++;
    if (filters.projectId && !urlProjectId) count++;
    return count;
  }, [filters, urlContactId, urlProjectId]);

  const loadTransactions = useCallback(
    async (reset = true, showLoader = true) => {
      if (showLoader && reset) setIsLoading(true);
      if (!reset) setIsLoadingMore(true);

      try {
        const { startDate, endDate } = getTimePeriodDates(
          filters.timePeriod,
          filters.customStartDate,
          filters.customEndDate
        );

        const result = await FinanceService.getTransactions({
          type: filters.type === "all" ? undefined : filters.type,
          projectId: filters.projectId || undefined,
          contactId: filters.contactId || undefined,
          categoryId: filters.categoryId || undefined,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          limit: 30,
          skip: reset ? 0 : transactions.length,
        });

        if (result.success) {
          if (reset) {
            setTransactions(result.data.transactions);
            setTotals({
              income: result.data.totalIncome,
              expenses: result.data.totalExpenses,
            });
            if (result.data.transactions.length > 0) {
              if (filters.projectId) {
                setProjectName(result.data.transactions[0].projectName || null);
              }
              if (filters.contactId && !urlContactName) {
                setContactName(result.data.transactions[0].contactName || null);
              }
            }
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
    [filters, urlContactName, transactions.length, showError]
  );

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps
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

  const handleTypeChange = (type: FilterType) => {
    setFilters((prev) => ({ ...prev, type }));
  };

  const openFilterModal = () => {
    setTempFilters(filters);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setFilterModalVisible(false);
  };

  const clearFilters = () => {
    const clearedFilters: Filters = {
      ...defaultFilters,
      type: filters.type, // Keep the type filter
      projectId: urlProjectId || undefined, // Keep URL params
      contactId: urlContactId || undefined,
    };
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setFilterModalVisible(false);
  };

  const groupedTransactions = groupTransactionsByDate(transactions);

  // Get selected names for display
  const selectedContactName = useMemo(() => {
    if (!filters.contactId) return null;
    return contacts.find((c) => c.id === filters.contactId)?.name || contactName;
  }, [filters.contactId, contacts, contactName]);

  const selectedCategoryName = useMemo(() => {
    if (!filters.categoryId) return null;
    return categories.find((c) => c.id === filters.categoryId)?.name || null;
  }, [filters.categoryId, categories]);

  const selectedProjectName = useMemo(() => {
    if (!filters.projectId) return null;
    return projects.find((p) => p.id === filters.projectId)?.name || projectName;
  }, [filters.projectId, projects, projectName]);

  // Build subtitle with active filters
  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (filters.timePeriod !== "all") {
      parts.push(getTimePeriodLabel(filters.timePeriod));
    }
    if (selectedContactName && !urlContactId) {
      parts.push(selectedContactName);
    }
    if (selectedCategoryName) {
      parts.push(selectedCategoryName);
    }
    if (selectedProjectName && !urlProjectId) {
      parts.push(selectedProjectName);
    }
    if (parts.length === 0) {
      return `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`;
    }
    return parts.join(" • ");
  }, [filters.timePeriod, selectedContactName, selectedCategoryName, selectedProjectName, urlContactId, urlProjectId, transactions.length]);

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
        <View className="flex-row items-center">
          {(urlProjectId || urlContactId) && (
            <Pressable onPress={() => router.back()} className="mr-3" hitSlop={10}>
              <Lucide name="chevron-left" size={24} color={COLORS.gray700} />
            </Pressable>
          )}
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900" numberOfLines={1}>
              {urlContactName || (urlContactId ? selectedContactName : null) || (urlProjectId ? selectedProjectName : null) || "Transactions"}
            </Text>
            <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Bar */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          {/* Type Tabs */}
          <View className="flex-row gap-2">
            {(["all", "income", "expense"] as FilterType[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => handleTypeChange(f)}
                style={[styles.filterChip, filters.type === f && styles.filterChipActive]}
                className="px-4 py-2 rounded-full"
              >
                <Text
                  className={`text-sm font-medium capitalize ${
                    filters.type === f ? "text-white" : "text-gray-600"
                  }`}
                >
                  {f}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Filter Button */}
          <Pressable
            onPress={openFilterModal}
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
            className="flex-row items-center px-3 py-2 rounded-full"
          >
            <Lucide
              name="sliders-horizontal"
              size={16}
              color={activeFilterCount > 0 ? COLORS.white : COLORS.gray600}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge} className="ml-1.5">
                <Text className="text-xs font-bold text-primary">{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Summary */}
        <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
          {filters.type === "all" ? (
            <>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-500">Income: </Text>
                <Text className="text-sm font-semibold" style={{ color: COLORS.success }}>
                  {formatAmount(totals.income)}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-500">Expenses: </Text>
                <Text className="text-sm font-semibold" style={{ color: COLORS.error }}>
                  {formatAmount(totals.expenses)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text className="text-sm text-gray-500">
                Total {filters.type === "income" ? "Income" : "Expenses"}
              </Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: filters.type === "income" ? COLORS.success : COLORS.error }}
              >
                {formatAmount(filters.type === "income" ? totals.income : totals.expenses)}
              </Text>
            </>
          )}
        </View>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
          <View style={styles.emptyIconBg}>
            <Lucide name="receipt" size={32} color={COLORS.gray400} />
          </View>
          <Text className="text-base font-medium text-gray-700 mt-4">
            No transactions found
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            {activeFilterCount > 0 ? "Try adjusting your filters" : "Add your first transaction to see it here"}
          </Text>
          {activeFilterCount > 0 && (
            <Pressable onPress={clearFilters} className="mt-4">
              <Text className="text-sm font-semibold text-primary">Clear Filters</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={groupedTransactions}
          keyExtractor={(item) => item.dateKey}
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

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        filters={tempFilters}
        onFiltersChange={setTempFilters}
        contacts={contacts}
        categories={categories}
        projects={projects}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={() => setFilterModalVisible(false)}
        urlContactId={urlContactId}
        urlProjectId={urlProjectId}
      />
    </SafeAreaView>
  );
}

function FilterModal({
  visible,
  filters,
  onFiltersChange,
  contacts,
  categories,
  projects,
  onApply,
  onClear,
  onClose,
  urlContactId,
  urlProjectId,
}: {
  visible: boolean;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  contacts: IContact[];
  categories: ICategory[];
  projects: IProject[];
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
  urlContactId?: string;
  urlProjectId?: string;
}) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  const timePeriods: TimePeriod[] = [
    "all",
    "today",
    "this_week",
    "this_month",
    "last_month",
    "this_quarter",
    "this_year",
    "last_year",
    "fy_current",
    "fy_previous",
    "custom",
  ];

  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts.slice(0, 20);
    return contacts
      .filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
      .slice(0, 20);
  }, [contacts, contactSearch]);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Filters</Text>
          <Pressable onPress={onApply} className="px-2 py-1">
            <Text className="text-base font-semibold text-primary">Apply</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Time Period */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text className="text-sm font-semibold text-gray-900 mb-3">Time Period</Text>
            <View className="flex-row flex-wrap gap-2">
              {timePeriods.map((period) => (
                <Pressable
                  key={period}
                  onPress={() => onFiltersChange({ ...filters, timePeriod: period })}
                  style={[
                    styles.optionChip,
                    filters.timePeriod === period && styles.optionChipActive,
                  ]}
                  className="px-3 py-2 rounded-lg"
                >
                  <Text
                    className={`text-sm ${
                      filters.timePeriod === period ? "text-white font-medium" : "text-gray-700"
                    }`}
                  >
                    {getTimePeriodLabel(period)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Date Range */}
            {filters.timePeriod === "custom" && (
              <View className="flex-row gap-3 mt-4">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Start Date</Text>
                  <Pressable
                    onPress={() => setShowStartPicker(true)}
                    className="bg-gray-100 rounded-lg px-3 py-3"
                  >
                    <Text className="text-sm text-gray-700">
                      {filters.customStartDate
                        ? filters.customStartDate.toLocaleDateString("en-IN")
                        : "Select"}
                    </Text>
                  </Pressable>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">End Date</Text>
                  <Pressable
                    onPress={() => setShowEndPicker(true)}
                    className="bg-gray-100 rounded-lg px-3 py-3"
                  >
                    <Text className="text-sm text-gray-700">
                      {filters.customEndDate
                        ? filters.customEndDate.toLocaleDateString("en-IN")
                        : "Select"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {showStartPicker && (
              <DateTimePicker
                value={filters.customStartDate || new Date()}
                mode="date"
                onChange={(_, date) => {
                  setShowStartPicker(false);
                  if (date) onFiltersChange({ ...filters, customStartDate: date });
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={filters.customEndDate || new Date()}
                mode="date"
                onChange={(_, date) => {
                  setShowEndPicker(false);
                  if (date) onFiltersChange({ ...filters, customEndDate: date });
                }}
              />
            )}
          </View>

          {/* Contact Filter - only show if not already filtered by URL */}
          {!urlContactId && (
            <View className="px-4 py-4 border-b border-gray-100">
              <Text className="text-sm font-semibold text-gray-900 mb-3">Contact</Text>
              <View className="bg-gray-100 rounded-lg px-3 py-2 mb-3">
                <TextInput
                  value={contactSearch}
                  onChangeText={setContactSearch}
                  placeholder="Search contacts..."
                  placeholderTextColor={COLORS.gray400}
                  style={{ fontSize: 14, color: COLORS.gray900 }}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => onFiltersChange({ ...filters, contactId: undefined })}
                    style={[
                      styles.optionChip,
                      !filters.contactId && styles.optionChipActive,
                    ]}
                    className="px-3 py-2 rounded-lg"
                  >
                    <Text className={`text-sm ${!filters.contactId ? "text-white font-medium" : "text-gray-700"}`}>
                      All Contacts
                    </Text>
                  </Pressable>
                  {filteredContacts.map((contact) => (
                    <Pressable
                      key={contact.id}
                      onPress={() => onFiltersChange({ ...filters, contactId: contact.id })}
                      style={[
                        styles.optionChip,
                        filters.contactId === contact.id && styles.optionChipActive,
                      ]}
                      className="px-3 py-2 rounded-lg"
                    >
                      <Text
                        className={`text-sm ${
                          filters.contactId === contact.id ? "text-white font-medium" : "text-gray-700"
                        }`}
                        numberOfLines={1}
                      >
                        {contact.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Category Filter */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text className="text-sm font-semibold text-gray-900 mb-3">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => onFiltersChange({ ...filters, categoryId: undefined })}
                  style={[
                    styles.optionChip,
                    !filters.categoryId && styles.optionChipActive,
                  ]}
                  className="px-3 py-2 rounded-lg"
                >
                  <Text className={`text-sm ${!filters.categoryId ? "text-white font-medium" : "text-gray-700"}`}>
                    All Categories
                  </Text>
                </Pressable>
                {(filters.type === "expense" ? expenseCategories : filters.type === "income" ? incomeCategories : categories).map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => onFiltersChange({ ...filters, categoryId: category.id })}
                    style={[
                      styles.optionChip,
                      filters.categoryId === category.id && styles.optionChipActive,
                    ]}
                    className="px-3 py-2 rounded-lg flex-row items-center"
                  >
                    <View
                      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: category.color }}
                      className="mr-1.5"
                    />
                    <Text
                      className={`text-sm ${
                        filters.categoryId === category.id ? "text-white font-medium" : "text-gray-700"
                      }`}
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Project Filter - only show if not already filtered by URL */}
          {!urlProjectId && (
            <View className="px-4 py-4 border-b border-gray-100">
              <Text className="text-sm font-semibold text-gray-900 mb-3">Project</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => onFiltersChange({ ...filters, projectId: undefined })}
                    style={[
                      styles.optionChip,
                      !filters.projectId && styles.optionChipActive,
                    ]}
                    className="px-3 py-2 rounded-lg"
                  >
                    <Text className={`text-sm ${!filters.projectId ? "text-white font-medium" : "text-gray-700"}`}>
                      All Projects
                    </Text>
                  </Pressable>
                  {projects.map((project) => (
                    <Pressable
                      key={project.id}
                      onPress={() => onFiltersChange({ ...filters, projectId: project.id })}
                      style={[
                        styles.optionChip,
                        filters.projectId === project.id && styles.optionChipActive,
                      ]}
                      className="px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <View
                        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: project.color }}
                        className="mr-1.5"
                      />
                      <Text
                        className={`text-sm ${
                          filters.projectId === project.id ? "text-white font-medium" : "text-gray-700"
                        }`}
                        numberOfLines={1}
                      >
                        {project.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Clear Filters Button */}
          <View className="px-4 py-6">
            <Pressable
              onPress={onClear}
              className="py-3 items-center rounded-xl border border-gray-200"
            >
              <Text className="text-base font-medium text-gray-600">Clear All Filters</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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

      <View className="flex-1 ml-3">
        <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
          {transaction.contactName || "Unknown"}
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
  filterButton: {
    backgroundColor: COLORS.gray100,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  optionChip: {
    backgroundColor: COLORS.gray100,
  },
  optionChipActive: {
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
