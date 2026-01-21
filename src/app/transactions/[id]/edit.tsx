import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS, ROUTES } from "@/constants";
import { FinanceService } from "@/services";
import { ITransaction, ICategory, IProject, IContact, TransactionType, Currency } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [transaction, setTransaction] = useState<ITransaction | null>(null);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [projects, setProjects] = useState<IProject[]>([]);
  const [contacts, setContacts] = useState<IContact[]>([]);

  // Form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [type, setType] = useState<TransactionType>("expense");
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showAddContactInput, setShowAddContactInput] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  // Load transaction and reference data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [transResult, catResult, projResult, contactsResult] = await Promise.all([
        FinanceService.getTransactions({ limit: 1000 }),
        FinanceService.getCategories(),
        FinanceService.getProjects(),
        FinanceService.getContacts({}),
      ]);

      if (catResult.success) setCategories(catResult.data);
      if (projResult.success) setProjects(projResult.data);
      if (contactsResult.success) setContacts(contactsResult.data);

      if (transResult.success) {
        const found = transResult.data.transactions.find((t) => t.id === id);
        if (found) {
          setTransaction(found);
          // Pre-fill form
          setAmount(found.amount.toString());
          setCurrency(found.currency);
          setType(found.type);
          setDate(formatDateForInput(found.date));
          setContactId(found.contactId || null);
          setContactName(found.contactName || "");
          setCategoryId(found.categoryId || null);
          setProjectId(found.projectId || null);
          setDescription(found.description || "");
        } else {
          showError("Transaction not found");
          router.back();
        }
      } else {
        showError(transResult.error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, showError, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if form has changed
  const hasChanges = transaction
    ? amount !== transaction.amount.toString() ||
      currency !== transaction.currency ||
      type !== transaction.type ||
      date !== formatDateForInput(transaction.date) ||
      contactId !== (transaction.contactId || null) ||
      contactName !== (transaction.contactName || "") ||
      categoryId !== (transaction.categoryId || null) ||
      projectId !== (transaction.projectId || null) ||
      description !== (transaction.description || "")
    : false;

  const handleSave = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showError("Please enter a valid amount");
      return;
    }
    if (!contactName.trim()) {
      showError("Contact name is required");
      return;
    }

    setIsSaving(true);
    try {
      const result = await FinanceService.updateTransaction({
        transactionId: id,
        amount: amountNum,
        currency,
        type,
        date,
        contactName: contactName.trim(),
        categoryId,
        projectId,
        description: description.trim(),
      });

      if (result.success) {
        showSuccess("Transaction updated");
        router.back();
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await FinanceService.deleteTransaction(id);
      if (result.success) {
        showSuccess("Transaction deleted");
        setShowDeleteModal(false);
        router.replace(ROUTES.TRANSACTIONS);
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const isFormValid = parseFloat(amount) > 0 && contactName.trim().length > 0;
  const canSave = isFormValid && hasChanges;

  // Filter categories by type
  const filteredCategories = categories.filter((c) => c.type === type);

  // Filter contacts by type (suppliers for expense, customers for income)
  const relevantContactType = type === "expense" ? "supplier" : "customer";
  const filteredContacts = contacts.filter((c) => c.types?.includes(relevantContactType));

  // Recently used contacts (top 5 by transaction count)
  const recentlyUsedContacts = [...filteredContacts]
    .sort((a, b) => (b.transactionCount || 0) - (a.transactionCount || 0))
    .slice(0, 5);

  // All contacts sorted alphabetically (excluding recently used)
  const recentlyUsedIds = new Set(recentlyUsedContacts.map((c) => c.id));
  const allOtherContacts = filteredContacts
    .filter((c) => !recentlyUsedIds.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
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
          <Lucide name="x" size={24} color={COLORS.gray600} />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">Edit Transaction</Text>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !canSave}
          className="px-2 py-1"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text
              className={`text-base font-semibold ${
                canSave ? "text-primary" : "text-gray-300"
              }`}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4">
          {/* Amount & Currency */}
          <View style={styles.card} className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-sm font-medium text-gray-500 mb-3">Amount</Text>
            <View className="flex-row items-center">
              <View className="flex-row gap-2 mr-4">
                {(["INR", "USD"] as Currency[]).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={[styles.currencyChip, currency === c && styles.currencyChipActive]}
                    className="px-3 py-2 rounded-lg"
                  >
                    <Text
                      className={`text-sm font-medium ${
                        currency === c ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {c === "INR" ? "₹" : "$"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-1 bg-gray-100 rounded-xl px-4 py-3">
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={COLORS.gray400}
                  keyboardType="decimal-pad"
                  style={{ fontSize: 20, fontWeight: "600", color: COLORS.gray900 }}
                />
              </View>
            </View>
          </View>

          {/* Type */}
          <View style={styles.card} className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-sm font-medium text-gray-500 mb-3">Type</Text>
            <View className="flex-row gap-2">
              {(["expense", "income"] as TransactionType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setType(t);
                    setCategoryId(null); // Reset category when type changes
                    // Reset contact when type changes (contacts are filtered by type)
                    setContactId(null);
                    setContactName("");
                  }}
                  style={[
                    styles.typeChip,
                    type === t && (t === "expense" ? styles.typeChipExpense : styles.typeChipIncome),
                  ]}
                  className="flex-1 flex-row items-center justify-center px-4 py-3 rounded-xl"
                >
                  <Lucide
                    name={t === "expense" ? "arrow-up-right" : "arrow-down-left"}
                    size={18}
                    color={
                      type === t
                        ? t === "expense"
                          ? COLORS.error
                          : COLORS.success
                        : COLORS.gray500
                    }
                  />
                  <Text
                    className={`ml-2 text-sm font-medium capitalize ${
                      type === t
                        ? t === "expense"
                          ? "text-error"
                          : "text-success"
                        : "text-gray-600"
                    }`}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Date */}
          <View style={styles.card} className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-sm font-medium text-gray-500 mb-2">Date</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-3.5 flex-row items-center">
              <Lucide name="calendar" size={18} color={COLORS.gray500} />
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.gray400}
                style={{ flex: 1, marginLeft: 12, fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          {/* Contact */}
          <View style={styles.card} className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-sm font-medium text-gray-500 mb-2">Contact</Text>
            <Pressable
              onPress={() => {
                setNewContactName("");
                setShowAddContactInput(false);
                setShowContactPicker(true);
              }}
              className="bg-gray-100 rounded-xl px-4 py-3.5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <Lucide
                  name={type === "expense" ? "store" : "user"}
                  size={18}
                  color={contactName ? COLORS.gray700 : COLORS.gray400}
                />
                <Text
                  className={`ml-3 text-base ${contactName ? "text-gray-900" : "text-gray-400"}`}
                  numberOfLines={1}
                >
                  {contactName || "Select contact"}
                </Text>
              </View>
              <Lucide name="chevron-down" size={18} color={COLORS.gray400} />
            </Pressable>
          </View>

          {/* Category */}
          <View style={styles.card} className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-sm font-medium text-gray-500 mb-3">Category</Text>
            {filteredCategories.length === 0 ? (
              <Text className="text-sm text-gray-400">No categories available</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => setCategoryId(null)}
                  style={[styles.categoryChip, categoryId === null && styles.categoryChipSelected]}
                  className="px-3 py-2 rounded-lg"
                >
                  <Text
                    className={`text-sm ${categoryId === null ? "text-primary font-medium" : "text-gray-600"}`}
                  >
                    None
                  </Text>
                </Pressable>
                {filteredCategories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategoryId(cat.id)}
                    style={[
                      styles.categoryChip,
                      categoryId === cat.id && styles.categoryChipSelected,
                    ]}
                    className="flex-row items-center px-3 py-2 rounded-lg"
                  >
                    <View
                      style={{ backgroundColor: cat.color, width: 8, height: 8, borderRadius: 4 }}
                      className="mr-2"
                    />
                    <Text
                      className={`text-sm ${
                        categoryId === cat.id ? "text-primary font-medium" : "text-gray-600"
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Project */}
          <View style={styles.card} className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-sm font-medium text-gray-500 mb-3">Project</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => setProjectId(null)}
                style={[styles.categoryChip, projectId === null && styles.categoryChipSelected]}
                className="px-3 py-2 rounded-lg"
              >
                <Text
                  className={`text-sm ${projectId === null ? "text-primary font-medium" : "text-gray-600"}`}
                >
                  None
                </Text>
              </Pressable>
              {projects.map((proj) => (
                <Pressable
                  key={proj.id}
                  onPress={() => setProjectId(proj.id)}
                  style={[
                    styles.categoryChip,
                    projectId === proj.id && styles.categoryChipSelected,
                  ]}
                  className="flex-row items-center px-3 py-2 rounded-lg"
                >
                  <View
                    style={{ backgroundColor: proj.color, width: 8, height: 8, borderRadius: 4 }}
                    className="mr-2"
                  />
                  <Text
                    className={`text-sm ${
                      projectId === proj.id ? "text-primary font-medium" : "text-gray-600"
                    }`}
                  >
                    {proj.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.card} className="bg-white rounded-2xl p-4 mb-3">
            <Text className="text-sm font-medium text-gray-500 mb-2">Description</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-3.5">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={3}
                style={{ fontSize: 16, color: COLORS.gray900, textAlignVertical: "top" }}
              />
            </View>
          </View>

          {/* Delete Button */}
          <Pressable
            onPress={() => setShowDeleteModal(true)}
            style={styles.deleteButton}
            className="flex-row items-center justify-center px-4 py-4 rounded-2xl mt-4"
          >
            <Lucide name="trash-2" size={18} color={COLORS.error} />
            <Text className="ml-2 text-base font-medium text-error">Delete Transaction</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeleteModal(false)}
        >
          <Pressable style={styles.modalContent} className="bg-white rounded-2xl mx-6 p-6">
            <View className="items-center mb-4">
              <View style={styles.deleteIconBg}>
                <Lucide name="trash-2" size={24} color={COLORS.error} />
              </View>
            </View>
            <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Transaction?
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              This action cannot be undone. The transaction will be permanently removed.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100"
              >
                <Text className="text-center text-base font-medium text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={isDeleting}
                style={styles.confirmDeleteButton}
                className="flex-1 py-3 rounded-xl"
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text className="text-center text-base font-medium text-white">Delete</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Contact Picker Modal */}
      <Modal visible={showContactPicker} transparent={false} animationType="slide">
        <View style={[styles.fullScreenModal, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.pickerHeader}>
            <Pressable
              onPress={() => {
                setShowContactPicker(false);
                setShowAddContactInput(false);
                setNewContactName("");
              }}
              className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
            >
              <Lucide name="x" size={18} color={COLORS.gray600} />
            </Pressable>
            <Text style={styles.pickerTitle}>Select Contact</Text>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Add New Contact Row */}
              {showAddContactInput ? (
                <View className="px-4 py-3 border-b border-gray-100">
                  <View className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center">
                    <Lucide name="user-plus" size={18} color={COLORS.primary} />
                    <TextInput
                      value={newContactName}
                      onChangeText={setNewContactName}
                      placeholder="Enter contact name"
                      placeholderTextColor={COLORS.gray400}
                      autoFocus
                      style={{ flex: 1, marginLeft: 12, fontSize: 16, color: COLORS.gray900 }}
                    />
                  </View>
                  <View className="flex-row gap-2 mt-3">
                    <Pressable
                      onPress={() => {
                        setShowAddContactInput(false);
                        setNewContactName("");
                      }}
                      className="flex-1 py-2.5 rounded-lg bg-gray-100"
                    >
                      <Text className="text-center text-sm font-medium text-gray-600">Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (newContactName.trim()) {
                          setContactId(null);
                          setContactName(newContactName.trim());
                          setNewContactName("");
                          setShowAddContactInput(false);
                          setShowContactPicker(false);
                        }
                      }}
                      disabled={!newContactName.trim()}
                      className={`flex-1 py-2.5 rounded-lg ${newContactName.trim() ? "bg-primary" : "bg-gray-200"}`}
                    >
                      <Text className={`text-center text-sm font-medium ${newContactName.trim() ? "text-white" : "text-gray-400"}`}>
                        Add
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowAddContactInput(true)}
                  className="flex-row items-center px-4 py-3.5 border-b border-gray-100 active:bg-gray-50"
                >
                  <View style={[styles.contactIcon, { backgroundColor: `${COLORS.success}15` }]}>
                    <Lucide name="plus" size={18} color={COLORS.success} />
                  </View>
                  <Text className="ml-3 text-base text-gray-900 font-medium">Add new contact</Text>
                </Pressable>
              )}

              {/* Recently Used Section */}
              {recentlyUsedContacts.length > 0 && (
                <View>
                  <View className="px-4 pt-4 pb-2">
                    <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Recently Used
                    </Text>
                  </View>
                  {recentlyUsedContacts.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setContactId(item.id);
                        setContactName(item.name);
                        setShowContactPicker(false);
                      }}
                      className="flex-row items-center px-4 py-3 active:bg-gray-50"
                    >
                      <View style={styles.contactIcon}>
                        <Lucide
                          name={type === "expense" ? "store" : "user"}
                          size={16}
                          color={COLORS.primary}
                        />
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="text-base text-gray-900">{item.name}</Text>
                        <Text className="text-xs text-gray-500">
                          {item.transactionCount} transaction{item.transactionCount !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      {contactId === item.id && (
                        <Lucide name="check" size={20} color={COLORS.primary} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              {/* All Contacts Section */}
              {allOtherContacts.length > 0 && (
                <View>
                  <View className="px-4 pt-4 pb-2">
                    <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      All Contacts
                    </Text>
                  </View>
                  {allOtherContacts.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setContactId(item.id);
                        setContactName(item.name);
                        setShowContactPicker(false);
                      }}
                      className="flex-row items-center px-4 py-3 active:bg-gray-50"
                    >
                      <View style={styles.contactIcon}>
                        <Lucide
                          name={type === "expense" ? "store" : "user"}
                          size={16}
                          color={COLORS.primary}
                        />
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="text-base text-gray-900">{item.name}</Text>
                        <Text className="text-xs text-gray-500">
                          {item.transactionCount} transaction{item.transactionCount !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      {contactId === item.id && (
                        <Lucide name="check" size={20} color={COLORS.primary} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Empty State */}
              {filteredContacts.length === 0 && !showAddContactInput && (
                <View className="items-center py-8">
                  <Lucide name="users" size={32} color={COLORS.gray300} />
                  <Text className="text-gray-400 mt-2">No contacts yet</Text>
                  <Text className="text-gray-400 text-sm">Tap above to add one</Text>
                </View>
              )}

              {/* Bottom padding */}
              <View className="h-6" />
            </ScrollView>
        </View>
      </Modal>
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
  currencyChip: {
    backgroundColor: COLORS.gray100,
  },
  currencyChipActive: {
    backgroundColor: COLORS.primary,
  },
  typeChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  typeChipExpense: {
    backgroundColor: `${COLORS.error}10`,
    borderColor: COLORS.error,
  },
  typeChipIncome: {
    backgroundColor: `${COLORS.success}10`,
    borderColor: COLORS.success,
  },
  categoryChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  categoryChipSelected: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: `${COLORS.error}10`,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
  },
  deleteIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.error}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteButton: {
    backgroundColor: COLORS.error,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  pickerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.gray900,
    marginLeft: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
});
