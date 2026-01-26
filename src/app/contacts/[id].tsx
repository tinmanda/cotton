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
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS, buildRoute } from "@/constants";
import { FinanceService } from "@/services";
import { IContact, ITransaction } from "@/types";
import { useToast } from "@/hooks/useToast";
import { useContacts } from "@/store";

function formatAmount(amount: number, currency: string = "INR"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ContactDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSuccess, showError } = useToast();

  // Use cached contacts from Jotai store
  const { contacts, fetchContacts, updateContact: updateContactInStore, removeContact } = useContacts();

  // Find contact from cached data
  const contact = useMemo(() => {
    return contacts.find((c) => c.id === id) || null;
  }, [contacts, id]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const loadTransactions = useCallback(
    async (showLoader = true, loadMore = false) => {
      if (!id) return;
      if (showLoader && !loadMore) setIsLoading(true);
      if (loadMore) setIsLoadingMore(true);

      try {
        const transactionsResult = await FinanceService.getTransactions({
          contactId: id,
          limit: 20,
          skip: loadMore ? transactions.length : 0,
        });

        if (transactionsResult.success) {
          if (loadMore) {
            setTransactions((prev) => [...prev, ...transactionsResult.data.transactions]);
          } else {
            setTransactions(transactionsResult.data.transactions);
          }
          setHasMore(transactionsResult.data.hasMore);
        }
      } catch (error) {
        showError("Failed to load transactions");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [id, transactions.length, showError]
  );

  // Load contacts (from cache) and transactions on mount
  useEffect(() => {
    const load = async () => {
      await fetchContacts(); // Will use cache if valid
      await loadTransactions();
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle case where contact is not found after loading
  useEffect(() => {
    if (!isLoading && contacts.length > 0 && !contact) {
      showError("Contact not found");
      router.back();
    }
  }, [isLoading, contacts.length, contact, showError, router]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchContacts(true); // Force refresh contacts
    await loadTransactions(false);
  }, [fetchContacts, loadTransactions]);

  const loadMoreTransactions = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadTransactions(false, true);
    }
  }, [isLoadingMore, hasMore, loadTransactions]);

  const handleEditSaved = (updatedContact: IContact) => {
    setEditModalVisible(false);
    updateContactInStore(updatedContact); // Update in Jotai cache
    showSuccess("Contact updated");
  };

  const handleDeleted = () => {
    setEditModalVisible(false);
    if (id) removeContact(id); // Remove from Jotai cache
    router.back();
  };

  if (isLoading || !contact) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
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
        <View className="flex-row items-center flex-1">
          <Pressable
            onPress={() => router.back()}
            className="mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Lucide name="chevron-left" size={24} color={COLORS.gray600} />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
            {contact.name}
          </Text>
        </View>
        <Pressable
          onPress={() => setEditModalVisible(true)}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Lucide name="pencil" size={20} color={COLORS.primary} />
        </Pressable>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {/* Contact Info Card */}
            <View style={styles.infoCard} className="mx-4 mt-4 bg-white rounded-2xl p-5">
              <View className="flex-row items-center mb-4">
                <View style={styles.contactIconLarge}>
                  <Lucide name="user" size={28} color={COLORS.primary} />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-xl font-bold text-gray-900">{contact.name}</Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    {contact.transactionCount} transactions
                  </Text>
                </View>
              </View>

              {/* Contact details */}
              {(contact.email || contact.phone || contact.company) && (
                <View className="border-t border-gray-100 pt-4 mt-4">
                  {contact.email && (
                    <View className="flex-row items-center mb-2">
                      <Lucide name="mail" size={14} color={COLORS.gray400} />
                      <Text className="text-sm text-gray-600 ml-2">{contact.email}</Text>
                    </View>
                  )}
                  {contact.phone && (
                    <View className="flex-row items-center mb-2">
                      <Lucide name="phone" size={14} color={COLORS.gray400} />
                      <Text className="text-sm text-gray-600 ml-2">{contact.phone}</Text>
                    </View>
                  )}
                  {contact.company && (
                    <View className="flex-row items-center">
                      <Lucide name="building" size={14} color={COLORS.gray400} />
                      <Text className="text-sm text-gray-600 ml-2">{contact.company}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Stats */}
              <View className="flex-row border-t border-gray-100 pt-4 mt-4">
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-bold text-gray-900">
                    {contact.transactionCount}
                  </Text>
                  <Text className="text-xs text-gray-500">Transactions</Text>
                </View>
                {contact.totalReceived > 0 && (
                  <View className="flex-1 items-center border-l border-gray-100">
                    <Text className="text-2xl font-bold text-success">
                      {formatAmount(contact.totalReceived)}
                    </Text>
                    <Text className="text-xs text-gray-500">Received</Text>
                  </View>
                )}
                {contact.totalSpent > 0 && (
                  <View className="flex-1 items-center border-l border-gray-100">
                    <Text className="text-2xl font-bold text-error">
                      {formatAmount(contact.totalSpent)}
                    </Text>
                    <Text className="text-xs text-gray-500">Spent</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Transactions Header */}
            <View className="flex-row items-center justify-between px-4 mt-6 mb-3">
              <Text className="text-base font-semibold text-gray-900">Transactions</Text>
              <Text className="text-sm text-gray-500">{transactions.length} shown</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TransactionRow
            transaction={item}
            onPress={() => router.push(buildRoute.transactionEdit(item.id))}
          />
        )}
        ListEmptyComponent={
          <View className="mx-4 py-8 items-center">
            <View style={styles.emptyIconBg}>
              <Lucide name="receipt" size={24} color={COLORS.gray400} />
            </View>
            <Text className="text-sm text-gray-500 mt-3">No transactions yet</Text>
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : null
        }
        onEndReached={loadMoreTransactions}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Edit Modal */}
      <ContactEditModal
        visible={editModalVisible}
        contact={contact}
        onClose={() => setEditModalVisible(false)}
        onSaved={handleEditSaved}
        onDeleted={handleDeleted}
      />
    </SafeAreaView>
  );
}

function TransactionRow({
  transaction,
  onPress,
}: {
  transaction: ITransaction;
  onPress: () => void;
}) {
  const isExpense = transaction.type === "expense";

  return (
    <Pressable
      onPress={onPress}
      style={styles.transactionCard}
      className="mx-4 mb-2 bg-white rounded-xl p-4 active:bg-gray-50"
    >
      <View className="flex-row items-center">
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor: isExpense ? `${COLORS.error}15` : `${COLORS.success}15`,
            },
          ]}
        >
          <Lucide
            name={isExpense ? "arrow-up-right" : "arrow-down-left"}
            size={16}
            color={isExpense ? COLORS.error : COLORS.success}
          />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-sm font-medium text-gray-900">
            {transaction.description || transaction.categoryName || "Transaction"}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {formatDate(transaction.date)}
            {transaction.projectName && ` • ${transaction.projectName}`}
          </Text>
        </View>
        <Text
          className="text-sm font-bold"
          style={{ color: isExpense ? COLORS.error : COLORS.success }}
        >
          {isExpense ? "-" : "+"}
          {formatAmount(transaction.amount, transaction.currency)}
        </Text>
      </View>
    </Pressable>
  );
}

function ContactEditModal({
  visible,
  contact,
  onClose,
  onSaved,
  onDeleted,
}: {
  visible: boolean;
  contact: IContact;
  onClose: () => void;
  onSaved: (updatedContact: IContact) => void;
  onDeleted: () => void;
}) {
  const { showError, showSuccess } = useToast();
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [company, setCompany] = useState(contact.company || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canDelete = contact.transactionCount === 0;

  const handleSave = async () => {
    if (name.trim().length < 2) {
      showError("Name must be at least 2 characters");
      return;
    }

    setIsSaving(true);
    try {
      const result = await FinanceService.updateContact({
        contactId: contact.id,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
      });

      if (result.success) {
        // Pass the updated contact back
        const updatedContact: IContact = {
          ...contact,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
        };
        onSaved(updatedContact);
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    name !== contact.name ||
    email !== (contact.email || "") ||
    phone !== (contact.phone || "") ||
    company !== (contact.company || "");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await FinanceService.deleteContact(contact.id);
      if (result.success) {
        showSuccess("Contact deleted");
        onDeleted();
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Edit Contact</Text>
          <Pressable
            onPress={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-2 py-1"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text
                className={`text-base font-semibold ${
                  hasChanges ? "text-primary" : "text-gray-300"
                }`}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Name</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Contact name"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="words"
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Email</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={COLORS.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Phone</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 99999 99999"
                placeholderTextColor={COLORS.gray400}
                keyboardType="phone-pad"
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Company</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={company}
                onChangeText={setCompany}
                placeholder="Company name"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="words"
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          {/* Delete Section */}
          <View className="mt-6 pt-6 border-t border-gray-200">
            {!canDelete && (
              <View className="bg-amber-50 rounded-xl p-4 mb-4 flex-row items-start">
                <Lucide name="alert-triangle" size={18} color={COLORS.warning} />
                <Text className="text-sm text-amber-800 ml-2 flex-1">
                  This contact has {contact.transactionCount} transaction{contact.transactionCount !== 1 ? "s" : ""}.
                  You can only delete contacts with no transactions.
                </Text>
              </View>
            )}

            {showDeleteConfirm ? (
              <View className="bg-red-50 rounded-xl p-4">
                <Text className="text-sm text-red-800 mb-3">
                  Are you sure you want to delete {contact.name}? This cannot be undone.
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-gray-200 items-center"
                  >
                    <Text className="text-sm font-semibold text-gray-700">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-3 rounded-xl bg-red-600 items-center"
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text className="text-sm font-semibold text-white">Delete</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowDeleteConfirm(true)}
                disabled={!canDelete}
                style={[
                  styles.deleteButton,
                  !canDelete && styles.deleteButtonDisabled,
                ]}
                className="py-4 rounded-xl items-center"
              >
                <Text
                  className={`text-base font-semibold ${
                    canDelete ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  Delete Contact
                </Text>
              </Pressable>
            )}
          </View>

          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: `${COLORS.error}10`,
    borderWidth: 1,
    borderColor: `${COLORS.error}30`,
  },
  deleteButtonDisabled: {
    backgroundColor: COLORS.gray100,
    borderColor: COLORS.gray200,
  },
});
