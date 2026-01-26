import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter, useFocusEffect } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { COLORS } from "@/constants";
import { FinanceService } from "@/services";
import { useCategories, useProjects, useContacts } from "@/store";
import {
  IRecurringTransaction,
  ICategory,
  IProject,
  IContact,
  TransactionType,
  RecurringFrequency,
  Currency,
} from "@/types";

interface SuggestedRecurring {
  name: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  frequency: RecurringFrequency;
  contactName?: string;
  categoryId?: string;
  categoryName?: string;
  projectId?: string;
  projectName?: string;
  confidence: number;
  reason: string;
}
import { useToast } from "@/hooks/useToast";

function formatAmount(amount: number, currency: string = "INR"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatFrequency(frequency: RecurringFrequency): string {
  const labels: Record<RecurringFrequency, string> = {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };
  return labels[frequency] || frequency;
}

function getDueStatus(nextDueDate?: Date): {
  label: string;
  color: string;
  isOverdue: boolean;
  isDueSoon: boolean;
} {
  if (!nextDueDate) {
    return { label: "Not set", color: COLORS.gray400, isOverdue: false, isDueSoon: false };
  }

  const now = new Date();
  const dueDate = new Date(nextDueDate);
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, color: COLORS.error, isOverdue: true, isDueSoon: false };
  } else if (diffDays === 0) {
    return { label: "Due today", color: COLORS.warning, isOverdue: false, isDueSoon: true };
  } else if (diffDays <= 7) {
    return { label: `Due in ${diffDays}d`, color: COLORS.warning, isOverdue: false, isDueSoon: true };
  } else {
    return { label: `Due in ${diffDays}d`, color: COLORS.gray500, isOverdue: false, isDueSoon: false };
  }
}

export default function RecurringTransactionsScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  // Use cached data from Jotai store
  const { categories, fetchCategories } = useCategories();
  const { projects, fetchProjects } = useProjects();
  const { contacts, fetchContacts } = useContacts();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recurringTransactions, setRecurringTransactions] = useState<IRecurringTransaction[]>([]);

  // Modal states
  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<IRecurringTransaction | null>(null);
  const [createTransactionModalVisible, setCreateTransactionModalVisible] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState<IRecurringTransaction | null>(null);

  // Suggestions states
  const [suggestionsModalVisible, setSuggestionsModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedRecurring[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Tab state (expenses vs income)
  const [activeTab, setActiveTab] = useState<TransactionType>("expense");

  const loadData = useCallback(async (showLoader = true, forceRefresh = false) => {
    if (showLoader) setIsLoading(true);
    try {
      // Fetch recurring transactions (not cached) + reference data (cached)
      const [rtResult] = await Promise.all([
        FinanceService.getRecurringTransactions(),
        fetchCategories(forceRefresh),
        fetchProjects(forceRefresh),
        fetchContacts(forceRefresh),
      ]);

      if (rtResult.success) {
        setRecurringTransactions(rtResult.data);
      } else {
        showError(rtResult.error.message);
      }
    } catch (error) {
      console.error("Error loading recurring transactions:", error);
      showError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError, fetchCategories, fetchProjects, fetchContacts]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(false, true); // Force refresh all data
  }, [loadData]);

  const filteredItems = recurringTransactions.filter((rt) => rt.type === activeTab);

  // Sort: overdue first, then due soon, then by next due date
  const sortedItems = [...filteredItems].sort((a, b) => {
    const statusA = getDueStatus(a.nextDueDate);
    const statusB = getDueStatus(b.nextDueDate);

    // Overdue items first
    if (statusA.isOverdue && !statusB.isOverdue) return -1;
    if (!statusA.isOverdue && statusB.isOverdue) return 1;

    // Then due soon
    if (statusA.isDueSoon && !statusB.isDueSoon) return -1;
    if (!statusA.isDueSoon && statusB.isDueSoon) return 1;

    // Then by next due date
    const dateA = a.nextDueDate ? new Date(a.nextDueDate).getTime() : Infinity;
    const dateB = b.nextDueDate ? new Date(b.nextDueDate).getTime() : Infinity;
    return dateA - dateB;
  });

  // Calculate totals
  const monthlyTotal = filteredItems.reduce((sum, rt) => {
    if (!rt.isActive) return sum;
    let monthlyAmount = rt.amount;
    switch (rt.frequency) {
      case "weekly":
        monthlyAmount = rt.amount * 4.33;
        break;
      case "quarterly":
        monthlyAmount = rt.amount / 3;
        break;
      case "yearly":
        monthlyAmount = rt.amount / 12;
        break;
    }
    return sum + monthlyAmount;
  }, 0);

  const handleAddNew = () => {
    setEditingItem(null);
    setAddEditModalVisible(true);
  };

  const handleEdit = (item: IRecurringTransaction) => {
    setEditingItem(item);
    setAddEditModalVisible(true);
  };

  const handleCreateTransaction = (item: IRecurringTransaction) => {
    setSelectedRecurring(item);
    setCreateTransactionModalVisible(true);
  };

  const handleSaved = () => {
    setAddEditModalVisible(false);
    setEditingItem(null);
    loadData();
    showSuccess(editingItem ? "Updated successfully" : "Created successfully");
  };

  const handleTransactionCreated = () => {
    setCreateTransactionModalVisible(false);
    setSelectedRecurring(null);
    loadData();
    showSuccess("Transaction recorded");
  };

  const handleSuggest = async () => {
    setIsLoadingSuggestions(true);
    setSuggestionsModalVisible(true);
    try {
      const result = await FinanceService.suggestRecurringTransactions();
      if (result.success) {
        setSuggestions(result.data.suggestions || []);
        if (result.data.suggestions?.length === 0) {
          showError(result.data.message || "No patterns found in your transactions");
        }
      } else {
        showError(result.error.message);
        setSuggestionsModalVisible(false);
      }
    } catch {
      showError("Failed to analyze transactions");
      setSuggestionsModalVisible(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleAddSuggestion = async (suggestion: SuggestedRecurring) => {
    try {
      const result = await FinanceService.createRecurringTransaction({
        name: suggestion.name,
        amount: suggestion.amount,
        currency: suggestion.currency,
        type: suggestion.type,
        frequency: suggestion.frequency,
        contactName: suggestion.contactName,
        categoryId: suggestion.categoryId,
        projectId: suggestion.projectId,
      });
      if (result.success) {
        showSuccess(`Added: ${suggestion.name}`);
        // Remove from suggestions
        setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
        loadData(false);
      } else {
        showError(result.error.message);
      }
    } catch {
      showError("Failed to add recurring item");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Pressable
            onPress={() => router.back()}
            className="mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Lucide name="chevron-left" size={24} color={COLORS.gray600} />
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-gray-900">Recurring</Text>
            <Text className="text-xs text-gray-500">
              {filteredItems.length} {activeTab === "expense" ? "expenses" : "income"}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={handleSuggest}
            style={styles.suggestButton}
            className="flex-row items-center px-3 py-2 rounded-full"
          >
            <Lucide name="sparkles" size={16} color={COLORS.primary} />
            <Text className="text-sm font-semibold text-primary ml-1">Suggest</Text>
          </Pressable>
          <Pressable onPress={handleAddNew} style={styles.addButton} className="rounded-full">
            <Lucide name="plus" size={20} color={COLORS.white} />
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View className="bg-white px-4 py-2 border-b border-gray-100">
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          <Pressable
            onPress={() => setActiveTab("expense")}
            style={[styles.tab, activeTab === "expense" && styles.tabActive]}
            className="flex-1 py-2 rounded-lg"
          >
            <Text
              className={`text-center text-sm font-semibold ${
                activeTab === "expense" ? "text-white" : "text-gray-600"
              }`}
            >
              Expenses
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("income")}
            style={[styles.tab, activeTab === "income" && styles.tabActiveIncome]}
            className="flex-1 py-2 rounded-lg"
          >
            <Text
              className={`text-center text-sm font-semibold ${
                activeTab === "income" ? "text-white" : "text-gray-600"
              }`}
            >
              Income
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Monthly Estimate */}
      {filteredItems.length > 0 && (
        <View className="bg-white px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-500">Monthly estimate</Text>
            <Text
              className="text-lg font-bold"
              style={{ color: activeTab === "expense" ? COLORS.error : COLORS.success }}
            >
              {activeTab === "expense" ? "-" : "+"}
              {formatAmount(Math.round(monthlyTotal))}
            </Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : sortedItems.length === 0 ? (
        <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
          <View style={styles.emptyIconBg}>
            <Lucide
              name={activeTab === "expense" ? "calendar-minus" : "calendar-plus"}
              size={32}
              color={COLORS.gray400}
            />
          </View>
          <Text className="text-base font-medium text-gray-700 mt-4">
            No recurring {activeTab === "expense" ? "expenses" : "income"} yet
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            Tap + to add {activeTab === "expense" ? "bills and subscriptions" : "retainers and revenue"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecurringItemRow
              item={item}
              onEdit={() => handleEdit(item)}
              onCreateTransaction={() => handleCreateTransaction(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add/Edit Modal */}
      <AddEditRecurringModal
        visible={addEditModalVisible}
        editingItem={editingItem}
        defaultType={activeTab}
        categories={categories}
        projects={projects}
        contacts={contacts}
        onClose={() => {
          setAddEditModalVisible(false);
          setEditingItem(null);
        }}
        onSaved={handleSaved}
      />

      {/* Create Transaction Modal */}
      {selectedRecurring && (
        <CreateTransactionModal
          visible={createTransactionModalVisible}
          recurringTransaction={selectedRecurring}
          onClose={() => {
            setCreateTransactionModalVisible(false);
            setSelectedRecurring(null);
          }}
          onCreated={handleTransactionCreated}
        />
      )}

      {/* Suggestions Modal */}
      <SuggestionsModal
        visible={suggestionsModalVisible}
        suggestions={suggestions}
        isLoading={isLoadingSuggestions}
        onClose={() => {
          setSuggestionsModalVisible(false);
          setSuggestions([]);
        }}
        onAdd={handleAddSuggestion}
      />
    </SafeAreaView>
  );
}

function RecurringItemRow({
  item,
  onEdit,
  onCreateTransaction,
}: {
  item: IRecurringTransaction;
  onEdit: () => void;
  onCreateTransaction: () => void;
}) {
  const dueStatus = getDueStatus(item.nextDueDate);
  const isExpense = item.type === "expense";

  return (
    <View style={styles.itemCard} className="mx-4 mb-3 bg-white rounded-xl overflow-hidden">
      <Pressable onPress={onEdit} className="p-4 active:bg-gray-50">
        <View className="flex-row items-start">
          <View
            style={[
              styles.itemIcon,
              { backgroundColor: isExpense ? `${COLORS.error}15` : `${COLORS.success}15` },
            ]}
          >
            <Lucide
              name={isExpense ? "arrow-up-right" : "arrow-down-left"}
              size={18}
              color={isExpense ? COLORS.error : COLORS.success}
            />
          </View>
          <View className="flex-1 ml-3">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-base font-semibold text-gray-900 flex-1 flex-shrink" numberOfLines={1}>
                {item.name}
              </Text>
              <Text
                className="text-base font-bold flex-shrink-0"
                style={{ color: isExpense ? COLORS.error : COLORS.success }}
              >
                {isExpense ? "-" : "+"}
                {formatAmount(item.amount, item.currency)}
              </Text>
            </View>
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-gray-500">{formatFrequency(item.frequency)}</Text>
              {item.projectName && (
                <>
                  <Text className="text-xs text-gray-400 mx-1">•</Text>
                  <Text className="text-xs text-gray-500" numberOfLines={1}>
                    {item.projectName}
                  </Text>
                </>
              )}
            </View>
            {item.contactName && (
              <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                {item.contactName}
              </Text>
            )}
          </View>
        </View>

        {/* Due status badge */}
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <View className="flex-row items-center">
            <View
              style={[styles.dueBadge, { backgroundColor: `${dueStatus.color}15` }]}
              className="px-2 py-1 rounded-full"
            >
              <Text className="text-xs font-medium" style={{ color: dueStatus.color }}>
                {dueStatus.label}
              </Text>
            </View>
            {item.lastCreatedAt && (
              <Text className="text-xs text-gray-400 ml-2">
                Last: {new Date(item.lastCreatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </Text>
            )}
          </View>
          {!item.isActive && (
            <View className="bg-gray-100 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-gray-500">Paused</Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Quick action: Record transaction */}
      <Pressable
        onPress={onCreateTransaction}
        style={[styles.recordButton, { backgroundColor: isExpense ? `${COLORS.error}08` : `${COLORS.success}08` }]}
        className="flex-row items-center justify-center py-3 border-t border-gray-100 active:opacity-70"
      >
        <Lucide name="circle-plus" size={16} color={isExpense ? COLORS.error : COLORS.success} />
        <Text
          className="text-sm font-semibold ml-2"
          style={{ color: isExpense ? COLORS.error : COLORS.success }}
        >
          Record Transaction
        </Text>
      </Pressable>
    </View>
  );
}

function AddEditRecurringModal({
  visible,
  editingItem,
  defaultType,
  categories,
  projects,
  contacts,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editingItem: IRecurringTransaction | null;
  defaultType: TransactionType;
  categories: ICategory[];
  projects: IProject[];
  contacts: IContact[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [type, setType] = useState<TransactionType>(defaultType);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [contactId, setContactId] = useState<string | undefined>();
  const [contactName, setContactName] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEdit = !!editingItem;

  // Reset form when modal opens
  const resetForm = useCallback(() => {
    if (editingItem) {
      setName(editingItem.name);
      setAmount(editingItem.amount.toString());
      setCurrency(editingItem.currency);
      setType(editingItem.type);
      setFrequency(editingItem.frequency);
      setContactId(editingItem.contactId);
      setContactName(editingItem.contactName || "");
      setCategoryId(editingItem.categoryId);
      setProjectId(editingItem.projectId);
      setDescription(editingItem.description || "");
      setIsActive(editingItem.isActive);
    } else {
      setName("");
      setAmount("");
      setContactId(undefined);
      setCurrency("INR");
      setType(defaultType);
      setFrequency("monthly");
      setContactName("");
      setCategoryId(undefined);
      setProjectId(undefined);
      setDescription("");
      setIsActive(true);
    }
  }, [editingItem, defaultType]);

  useFocusEffect(
    useCallback(() => {
      if (visible) {
        resetForm();
      }
    }, [visible, resetForm])
  );

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSave = async () => {
    if (!name.trim()) {
      showError("Please enter a name");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showError("Please enter a valid amount");
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit) {
        const result = await FinanceService.updateRecurringTransaction({
          recurringTransactionId: editingItem.id,
          name: name.trim(),
          amount: amountNum,
          currency,
          type,
          frequency,
          contactName: contactName.trim() || null,
          categoryId: categoryId || null,
          projectId: projectId || null,
          description: description.trim() || null,
          isActive,
        });
        if (!result.success) {
          showError(result.error.message);
          return;
        }
      } else {
        const result = await FinanceService.createRecurringTransaction({
          name: name.trim(),
          amount: amountNum,
          currency,
          type,
          frequency,
          contactName: contactName.trim() || undefined,
          categoryId,
          projectId,
          description: description.trim() || undefined,
        });
        if (!result.success) {
          showError(result.error.message);
          return;
        }
      }
      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingItem) return;

    setIsDeleting(true);
    try {
      const result = await FinanceService.deleteRecurringTransaction(editingItem.id);
      if (result.success) {
        onSaved();
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const frequencies: { value: RecurringFrequency; label: string }[] = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Recurring" : "Add Recurring"}
          </Text>
          <Pressable onPress={handleSave} disabled={isSaving} className="px-2 py-1">
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text className="text-base font-semibold text-primary">Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {/* Name */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Name</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., AWS Subscription, Office Rent"
                placeholderTextColor={COLORS.gray400}
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          {/* Amount */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Amount</Text>
            <View className="flex-row gap-3">
              <View className="bg-gray-100 rounded-xl px-4 py-4 flex-1 flex-row items-center">
                <Text className="text-gray-500 mr-1">{currency === "USD" ? "$" : "₹"}</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={COLORS.gray400}
                  keyboardType="numeric"
                  style={{ fontSize: 16, color: COLORS.gray900, flex: 1 }}
                />
              </View>
              <View className="flex-row bg-gray-100 rounded-xl overflow-hidden">
                <Pressable
                  onPress={() => setCurrency("INR")}
                  style={[styles.currencyBtn, currency === "INR" && styles.currencyBtnActive]}
                  className="px-4 py-4"
                >
                  <Text className={`text-sm font-semibold ${currency === "INR" ? "text-white" : "text-gray-600"}`}>
                    ₹
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCurrency("USD")}
                  style={[styles.currencyBtn, currency === "USD" && styles.currencyBtnActive]}
                  className="px-4 py-4"
                >
                  <Text className={`text-sm font-semibold ${currency === "USD" ? "text-white" : "text-gray-600"}`}>
                    $
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Type */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Type</Text>
            <View className="flex-row bg-gray-100 rounded-xl p-1">
              <Pressable
                onPress={() => setType("expense")}
                style={[styles.typeBtn, type === "expense" && styles.typeBtnExpense]}
                className="flex-1 py-3 rounded-lg"
              >
                <Text
                  className={`text-center text-sm font-semibold ${type === "expense" ? "text-white" : "text-gray-600"}`}
                >
                  Expense
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setType("income")}
                style={[styles.typeBtn, type === "income" && styles.typeBtnIncome]}
                className="flex-1 py-3 rounded-lg"
              >
                <Text
                  className={`text-center text-sm font-semibold ${type === "income" ? "text-white" : "text-gray-600"}`}
                >
                  Income
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Frequency */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Frequency</Text>
            <View className="flex-row flex-wrap gap-2">
              {frequencies.map((f) => (
                <Pressable
                  key={f.value}
                  onPress={() => setFrequency(f.value)}
                  style={[styles.freqChip, frequency === f.value && styles.freqChipActive]}
                  className="px-4 py-2.5 rounded-xl"
                >
                  <Text
                    className={`text-sm font-medium ${frequency === f.value ? "text-white" : "text-gray-600"}`}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Contact */}
          {contacts.length > 0 && (
            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-500 mb-2">Contact (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => {
                      setContactId(undefined);
                      setContactName("");
                    }}
                    style={[styles.categoryChip, !contactId && styles.categoryChipActive]}
                    className="px-3 py-2 rounded-lg"
                  >
                    <Text className={`text-sm ${!contactId ? "text-primary font-semibold" : "text-gray-600"}`}>
                      None
                    </Text>
                  </Pressable>
                  {contacts.map((contact) => (
                    <Pressable
                      key={contact.id}
                      onPress={() => {
                        setContactId(contact.id);
                        setContactName(contact.name);
                      }}
                      style={[styles.categoryChip, contactId === contact.id && styles.categoryChipActive]}
                      className="px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <Lucide name="user" size={12} color={contactId === contact.id ? COLORS.primary : COLORS.gray500} />
                      <Text className={`text-sm ml-1.5 ${contactId === contact.id ? "text-primary font-semibold" : "text-gray-600"}`}>
                        {contact.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Category */}
          {filteredCategories.length > 0 && (
            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-500 mb-2">Category (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setCategoryId(undefined)}
                    style={[styles.categoryChip, !categoryId && styles.categoryChipActive]}
                    className="px-3 py-2 rounded-lg"
                  >
                    <Text className={`text-sm ${!categoryId ? "text-primary font-semibold" : "text-gray-600"}`}>
                      None
                    </Text>
                  </Pressable>
                  {filteredCategories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      style={[styles.categoryChip, categoryId === cat.id && styles.categoryChipActive]}
                      className="px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color, marginRight: 6 }} />
                      <Text className={`text-sm ${categoryId === cat.id ? "text-primary font-semibold" : "text-gray-600"}`}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Project */}
          {projects.length > 0 && (
            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-500 mb-2">Project (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setProjectId(undefined)}
                    style={[styles.categoryChip, !projectId && styles.categoryChipActive]}
                    className="px-3 py-2 rounded-lg"
                  >
                    <Text className={`text-sm ${!projectId ? "text-primary font-semibold" : "text-gray-600"}`}>
                      None
                    </Text>
                  </Pressable>
                  {projects.map((proj) => (
                    <Pressable
                      key={proj.id}
                      onPress={() => setProjectId(proj.id)}
                      style={[styles.categoryChip, projectId === proj.id && styles.categoryChipActive]}
                      className="px-3 py-2 rounded-lg flex-row items-center"
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: proj.color, marginRight: 6 }} />
                      <Text className={`text-sm ${projectId === proj.id ? "text-primary font-semibold" : "text-gray-600"}`}>
                        {proj.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Description */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Description (optional)</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Any notes about this recurring item"
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={2}
                style={{ fontSize: 16, color: COLORS.gray900, minHeight: 60, textAlignVertical: "top" }}
              />
            </View>
          </View>

          {/* Active toggle (only for edit) */}
          {isEdit && (
            <View className="mb-5">
              <Pressable
                onPress={() => setIsActive(!isActive)}
                className="flex-row items-center justify-between bg-gray-100 rounded-xl px-4 py-4"
              >
                <Text className="text-base text-gray-900">Active</Text>
                <View
                  style={[styles.toggle, isActive && styles.toggleActive]}
                  className="w-12 h-7 rounded-full justify-center"
                >
                  <View
                    style={[styles.toggleKnob, isActive && styles.toggleKnobActive]}
                    className="w-5 h-5 rounded-full bg-white"
                  />
                </View>
              </Pressable>
            </View>
          )}

          {/* Delete button (only for edit) */}
          {isEdit && (
            <Pressable
              onPress={handleDelete}
              disabled={isDeleting}
              className="mb-8 py-4 rounded-xl border border-red-200 bg-red-50 items-center"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Text className="text-base font-semibold text-red-600">Delete Recurring Item</Text>
              )}
            </Pressable>
          )}

          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function CreateTransactionModal({
  visible,
  recurringTransaction,
  onClose,
  onCreated,
}: {
  visible: boolean;
  recurringTransaction: IRecurringTransaction;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showError } = useToast();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amount, setAmount] = useState(recurringTransaction.amount.toString());
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const isExpense = recurringTransaction.type === "expense";

  const handleCreate = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showError("Please enter a valid amount");
      return;
    }

    setIsCreating(true);
    try {
      const result = await FinanceService.createTransactionFromRecurring({
        recurringTransactionId: recurringTransaction.id,
        date: date.toISOString(),
        amount: amountNum !== recurringTransaction.amount ? amountNum : undefined,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        onCreated();
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Record Transaction</Text>
          <Pressable onPress={handleCreate} disabled={isCreating} className="px-2 py-1">
            {isCreating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text className="text-base font-semibold text-primary">Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          {/* Summary card */}
          <View
            style={[styles.summaryCard, { borderLeftColor: isExpense ? COLORS.error : COLORS.success }]}
            className="bg-gray-50 rounded-xl p-4 mb-6"
          >
            <Text className="text-lg font-bold text-gray-900">{recurringTransaction.name}</Text>
            <Text className="text-sm text-gray-500 mt-1">
              {formatFrequency(recurringTransaction.frequency)}
              {recurringTransaction.contactName && ` • ${recurringTransaction.contactName}`}
            </Text>
          </View>

          {/* Date */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Date</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="bg-gray-100 rounded-xl px-4 py-4 flex-row items-center justify-between"
            >
              <Text className="text-base text-gray-900">
                {date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </Text>
              <Lucide name="calendar" size={20} color={COLORS.gray400} />
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          {/* Amount */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Amount</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4 flex-row items-center">
              <Text className="text-gray-500 mr-1">
                {recurringTransaction.currency === "USD" ? "$" : "₹"}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={{ fontSize: 16, color: COLORS.gray900, flex: 1 }}
              />
            </View>
            {parseFloat(amount) !== recurringTransaction.amount && (
              <Text className="text-xs text-gray-400 mt-1">
                Default: {formatAmount(recurringTransaction.amount, recurringTransaction.currency)}
              </Text>
            )}
          </View>

          {/* Notes */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Notes (optional)</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes for this transaction"
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={2}
                style={{ fontSize: 16, color: COLORS.gray900, minHeight: 60, textAlignVertical: "top" }}
              />
            </View>
          </View>

          {/* Info about what will be created */}
          <View className="bg-blue-50 rounded-xl p-4 mb-6">
            <Text className="text-sm text-blue-800">
              This will create a {isExpense ? "expense" : "income"} transaction
              {recurringTransaction.projectName && ` for ${recurringTransaction.projectName}`}
              {recurringTransaction.categoryName && ` in ${recurringTransaction.categoryName}`}.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SuggestionsModal({
  visible,
  suggestions,
  isLoading,
  onClose,
  onAdd,
}: {
  visible: boolean;
  suggestions: SuggestedRecurring[];
  isLoading: boolean;
  onClose: () => void;
  onAdd: (suggestion: SuggestedRecurring) => void;
}) {
  const [addingIndex, setAddingIndex] = useState<number | null>(null);

  const handleAdd = async (suggestion: SuggestedRecurring, index: number) => {
    setAddingIndex(index);
    await onAdd(suggestion);
    setAddingIndex(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <View className="w-16" />
          <Text className="text-lg font-semibold text-gray-900">Suggested Recurring</Text>
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600">Done</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text className="text-sm text-gray-500 mt-4">Analyzing your transactions...</Text>
            <Text className="text-xs text-gray-400 mt-1">This may take a moment</Text>
          </View>
        ) : suggestions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View style={styles.emptyIconBg}>
              <Lucide name="search-x" size={32} color={COLORS.gray400} />
            </View>
            <Text className="text-base font-medium text-gray-700 mt-4 text-center">
              No patterns found
            </Text>
            <Text className="text-sm text-gray-500 text-center mt-1">
              We couldn't identify any recurring transactions from your history yet. Add more transactions and try again.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
            <Text className="text-sm text-gray-500 mb-4">
              Based on your transaction history, here are some potential recurring items:
            </Text>
            {suggestions.map((suggestion, index) => {
              const isExpense = suggestion.type === "expense";
              const isAdding = addingIndex === index;

              return (
                <View
                  key={`${suggestion.name}-${index}`}
                  style={styles.suggestionCard}
                  className="bg-white rounded-xl mb-3 overflow-hidden border border-gray-100"
                >
                  <View className="p-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900">{suggestion.name}</Text>
                        <View className="flex-row items-center mt-1">
                          <Text className="text-xs text-gray-500">{formatFrequency(suggestion.frequency)}</Text>
                          {suggestion.contactName && (
                            <>
                              <Text className="text-xs text-gray-400 mx-1">•</Text>
                              <Text className="text-xs text-gray-500">{suggestion.contactName}</Text>
                            </>
                          )}
                        </View>
                      </View>
                      <Text
                        className="text-base font-bold"
                        style={{ color: isExpense ? COLORS.error : COLORS.success }}
                      >
                        {isExpense ? "-" : "+"}
                        {formatAmount(suggestion.amount, suggestion.currency)}
                      </Text>
                    </View>

                    <Text className="text-xs text-gray-400 mt-2 italic">{suggestion.reason}</Text>

                    <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <View className="flex-row items-center">
                        {suggestion.categoryName && (
                          <View className="bg-gray-100 px-2 py-1 rounded-full mr-2">
                            <Text className="text-xs text-gray-600">{suggestion.categoryName}</Text>
                          </View>
                        )}
                        {suggestion.projectName && (
                          <View className="bg-gray-100 px-2 py-1 rounded-full">
                            <Text className="text-xs text-gray-600">{suggestion.projectName}</Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row items-center">
                        <View className="bg-blue-100 px-2 py-1 rounded-full">
                          <Text className="text-xs text-blue-700">{Math.round(suggestion.confidence * 100)}% match</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => handleAdd(suggestion, index)}
                    disabled={isAdding}
                    style={[
                      styles.addSuggestionButton,
                      { backgroundColor: isExpense ? `${COLORS.error}08` : `${COLORS.success}08` },
                    ]}
                    className="flex-row items-center justify-center py-3 border-t border-gray-100"
                  >
                    {isAdding ? (
                      <ActivityIndicator size="small" color={isExpense ? COLORS.error : COLORS.success} />
                    ) : (
                      <>
                        <Lucide name="plus" size={16} color={isExpense ? COLORS.error : COLORS.success} />
                        <Text
                          className="text-sm font-semibold ml-2"
                          style={{ color: isExpense ? COLORS.error : COLORS.success }}
                        >
                          Add to Recurring
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestButton: {
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  tab: {},
  tabActive: {
    backgroundColor: COLORS.error,
  },
  tabActiveIncome: {
    backgroundColor: COLORS.success,
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
  itemCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dueBadge: {},
  recordButton: {},
  currencyBtn: {},
  currencyBtnActive: {
    backgroundColor: COLORS.primary,
  },
  typeBtn: {},
  typeBtnExpense: {
    backgroundColor: COLORS.error,
  },
  typeBtnIncome: {
    backgroundColor: COLORS.success,
  },
  freqChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  freqChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  categoryChipActive: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  toggle: {
    backgroundColor: COLORS.gray300,
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleKnob: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  summaryCard: {
    borderLeftWidth: 4,
  },
  suggestionCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  addSuggestionButton: {},
});
