import { useState, useCallback } from "react";
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
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { COLORS, buildRoute } from "@/constants";
import { FinanceService } from "@/services";
import { IContact, ITransaction, IProject, Currency, EmployeeStatus } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatAmount(amount: number, currency: string = "INR"): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatSalary(amount: number | undefined, currency: Currency | undefined): string {
  if (!amount) return "Not set";
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}/mo`;
  }
  return `₹${amount.toLocaleString("en-IN")}/mo`;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contact, setContact] = useState<IContact | null>(null);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [projects, setProjects] = useState<IProject[]>([]);

  const isEmployee = contact?.types.includes("employee");

  const loadData = useCallback(
    async (showLoader = true, loadMore = false) => {
      if (!id) return;
      if (showLoader && !loadMore) setIsLoading(true);
      if (loadMore) setIsLoadingMore(true);

      try {
        // Load contact, projects, and transactions
        const [contactsResult, projectsResult, transactionsResult] = await Promise.all([
          FinanceService.getContacts({}),
          FinanceService.getProjects(),
          FinanceService.getTransactions({
            contactId: id,
            limit: 20,
            skip: loadMore ? transactions.length : 0,
          }),
        ]);

        // Find the specific contact by ID
        if (contactsResult.success) {
          const foundContact = contactsResult.data.find((c) => c.id === id);
          if (foundContact) {
            setContact(foundContact);
          } else {
            showError("Contact not found");
            router.back();
            return;
          }
        }

        if (projectsResult.success) {
          setProjects(projectsResult.data);
        }

        if (transactionsResult.success) {
          if (loadMore) {
            setTransactions((prev) => [...prev, ...transactionsResult.data.transactions]);
          } else {
            setTransactions(transactionsResult.data.transactions);
          }
          setHasMore(transactionsResult.data.hasMore);
        }
      } catch (error) {
        showError("Failed to load contact details");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [id, transactions.length, showError]
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(false);
  }, [loadData]);

  const loadMoreTransactions = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadData(false, true);
    }
  }, [isLoadingMore, hasMore, loadData]);

  const handleEditSaved = () => {
    setEditModalVisible(false);
    loadData();
    showSuccess("Contact updated");
  };

  // Determine icon based on contact type
  const getContactIcon = () => {
    if (contact?.types.includes("employee")) return "user";
    if (contact?.types.includes("supplier")) return "store";
    return "user";
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
                  <Lucide name={getContactIcon()} size={28} color={COLORS.primary} />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-xl font-bold text-gray-900">{contact.name}</Text>
                  <View className="flex-row flex-wrap gap-1 mt-1">
                    {contact.types.map((type) => (
                      <View key={type} style={styles.typeBadge} className="px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-medium text-primary capitalize">{type}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Employee-specific info */}
              {isEmployee && (
                <View className="border-t border-gray-100 pt-4 mt-2">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm text-gray-500">Role</Text>
                    <Text className="text-sm font-medium text-gray-900">
                      {contact.role || "Not set"}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm text-gray-500">Monthly Salary</Text>
                    <Text className="text-sm font-bold text-gray-900">
                      {formatSalary(contact.monthlySalary, contact.salaryCurrency)}
                    </Text>
                  </View>
                  {contact.projectName && (
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-sm text-gray-500">Project</Text>
                      <Text className="text-sm font-medium text-gray-900">
                        {contact.projectName}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-500">Status</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            contact.employeeStatus === "active"
                              ? `${COLORS.success}15`
                              : `${COLORS.gray400}15`,
                        },
                      ]}
                      className="px-2 py-0.5 rounded-full"
                    >
                      <Text
                        className="text-xs font-medium capitalize"
                        style={{
                          color:
                            contact.employeeStatus === "active"
                              ? COLORS.success
                              : COLORS.gray500,
                        }}
                      >
                        {contact.employeeStatus || "active"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

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
      {isEmployee ? (
        <EmployeeEditModal
          visible={editModalVisible}
          employee={contact}
          projects={projects}
          onClose={() => setEditModalVisible(false)}
          onSaved={handleEditSaved}
        />
      ) : (
        <ContactEditModal
          visible={editModalVisible}
          contact={contact}
          onClose={() => setEditModalVisible(false)}
          onSaved={handleEditSaved}
        />
      )}
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
}: {
  visible: boolean;
  contact: IContact;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showError } = useToast();
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [company, setCompany] = useState(contact.company || "");
  const [isSaving, setIsSaving] = useState(false);

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
        onSaved();
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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function EmployeeEditModal({
  visible,
  employee,
  projects,
  onClose,
  onSaved,
}: {
  visible: boolean;
  employee: IContact;
  projects: IProject[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showError } = useToast();
  const [name, setName] = useState(employee.name);
  const [role, setRole] = useState(employee.role || "");
  const [projectId, setProjectId] = useState<string | undefined>(employee.projectId);
  const [salary, setSalary] = useState(employee.monthlySalary?.toString() || "");
  const [status, setStatus] = useState<EmployeeStatus>(employee.employeeStatus || "active");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (name.trim().length < 2) {
      showError("Name must be at least 2 characters");
      return;
    }

    setIsSaving(true);
    try {
      const result = await FinanceService.updateContact({
        contactId: employee.id,
        name: name.trim(),
        role: role.trim() || undefined,
        projectId: projectId || undefined,
        monthlySalary: salary ? parseFloat(salary) : undefined,
        employeeStatus: status,
      });

      if (result.success) {
        onSaved();
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    name !== employee.name ||
    role !== (employee.role || "") ||
    projectId !== employee.projectId ||
    salary !== (employee.monthlySalary?.toString() || "") ||
    status !== (employee.employeeStatus || "active");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Edit Employee</Text>
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
                placeholder="Employee name"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="words"
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Role</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={role}
                onChangeText={setRole}
                placeholder="e.g., Developer, Designer"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="words"
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Project</Text>
            <View className="flex-row flex-wrap gap-2">
              {projects.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setProjectId(p.id)}
                  style={[
                    styles.projectChip,
                    projectId === p.id && styles.projectChipSelected,
                  ]}
                  className="flex-row items-center px-4 py-2.5 rounded-xl"
                >
                  <View
                    style={{ backgroundColor: p.color, width: 10, height: 10, borderRadius: 5 }}
                    className="mr-2"
                  />
                  <Text
                    className={`text-sm font-medium ${
                      projectId === p.id ? "text-primary" : "text-gray-600"
                    }`}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Monthly Salary</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4 flex-row items-center">
              <Text className="text-gray-500 mr-1">₹</Text>
              <TextInput
                value={salary}
                onChangeText={setSalary}
                placeholder="50000"
                placeholderTextColor={COLORS.gray400}
                keyboardType="numeric"
                style={{ fontSize: 16, color: COLORS.gray900, flex: 1 }}
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Status</Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setStatus("active")}
                style={[
                  styles.statusChip,
                  status === "active" && styles.statusChipActive,
                ]}
                className="flex-row items-center px-4 py-2.5 rounded-xl"
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: status === "active" ? COLORS.success : COLORS.gray400,
                    marginRight: 8,
                  }}
                />
                <Text
                  className={`text-sm font-medium ${
                    status === "active" ? "text-success" : "text-gray-600"
                  }`}
                >
                  Active
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setStatus("inactive")}
                style={[
                  styles.statusChip,
                  status === "inactive" && styles.statusChipInactive,
                ]}
                className="flex-row items-center px-4 py-2.5 rounded-xl"
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: status === "inactive" ? COLORS.gray500 : COLORS.gray400,
                    marginRight: 8,
                  }}
                />
                <Text
                  className={`text-sm font-medium ${
                    status === "inactive" ? "text-gray-700" : "text-gray-600"
                  }`}
                >
                  Inactive
                </Text>
              </Pressable>
            </View>
          </View>
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
  typeBadge: {
    backgroundColor: `${COLORS.primary}15`,
  },
  statusBadge: {},
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
  projectChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  projectChipSelected: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  statusChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  statusChipActive: {
    backgroundColor: `${COLORS.success}10`,
    borderColor: COLORS.success,
  },
  statusChipInactive: {
    backgroundColor: COLORS.gray100,
    borderColor: COLORS.gray400,
  },
});
