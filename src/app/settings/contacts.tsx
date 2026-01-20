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
import { IContact } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function ContactsScreen() {
  const router = useRouter();
  const { showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadContacts = useCallback(
    async (showLoader = true) => {
      if (showLoader) setIsLoading(true);
      try {
        const result = await FinanceService.getContacts({
          search: searchQuery || undefined,
        });
        if (result.success) {
          // Filter to show only suppliers and customers (not employees)
          const nonEmployees = result.data.filter(
            (c) => c.types.includes("supplier") || c.types.includes("customer")
          );
          setContacts(nonEmployees);
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

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
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
          <Text className="text-xl font-bold text-gray-900">Contacts</Text>
          <Text className="text-xs text-gray-500">{contacts.length} vendors & clients</Text>
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredContacts.length === 0 ? (
        <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
          <View style={styles.emptyIconBg}>
            <Lucide name="users" size={32} color={COLORS.gray400} />
          </View>
          <Text className="text-base font-medium text-gray-700 mt-4">
            {searchQuery ? "No contacts found" : "No contacts yet"}
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            {searchQuery
              ? "Try a different search term"
              : "Contacts are automatically created when you add transactions"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ContactRow contact={item} />}
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

function ContactRow({ contact }: { contact: IContact }) {
  const totalAmount = contact.totalSpent + contact.totalReceived;
  const isSupplier = contact.types.includes("supplier");
  const isCustomer = contact.types.includes("customer");

  // Determine icon based on type
  const iconName = isCustomer && !isSupplier ? "user" : "store";

  return (
    <View style={styles.contactCard} className="mx-4 mb-3 bg-white rounded-xl p-4">
      <View className="flex-row items-center">
        <View style={styles.contactIcon}>
          <Lucide name={iconName} size={18} color={COLORS.primary} />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-gray-900">{contact.name}</Text>
          <View className="flex-row items-center mt-0.5">
            <Text className="text-xs text-gray-500">
              {contact.transactionCount} transactions
            </Text>
            {contact.types.length > 0 && (
              <View className="flex-row ml-2">
                {isSupplier && (
                  <View style={styles.typeBadge} className="px-1.5 py-0.5 rounded mr-1">
                    <Text className="text-xs text-gray-500">Supplier</Text>
                  </View>
                )}
                {isCustomer && (
                  <View style={styles.typeBadge} className="px-1.5 py-0.5 rounded">
                    <Text className="text-xs text-gray-500">Customer</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {totalAmount > 0 && (
        <View className="flex-row mt-3 pt-3 border-t border-gray-100">
          <View className="flex-1">
            <Text className="text-xs text-gray-500">Spent</Text>
            <Text className="text-sm font-medium text-error mt-0.5">
              {formatAmount(contact.totalSpent)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500">Received</Text>
            <Text className="text-sm font-medium text-success mt-0.5">
              {formatAmount(contact.totalReceived)}
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
  typeBadge: {
    backgroundColor: COLORS.gray100,
  },
});
