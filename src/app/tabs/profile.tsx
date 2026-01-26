import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useFocusEffect, useRouter } from "expo-router";
import Constants from "expo-constants";
import { COLORS, ROUTES } from "@/constants";
import { useToast } from "@/hooks/useToast";
import { FinanceService, ExportService, ImportService } from "@/services";

export default function ProfileScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResettingRecurring, setIsResettingRecurring] = useState(false);
  const [flaggedCount, setFlaggedCount] = useState(0);

  // Fetch flagged count on focus
  useFocusEffect(
    useCallback(() => {
      FinanceService.getFlaggedCount().then((result) => {
        if (result.success) {
          setFlaggedCount(result.data.count);
        }
      });
    }, [])
  );

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const result = await ExportService.exportAllData();
      if (result.success) {
        if (result.data.shared) {
          showSuccess("Data exported successfully");
        } else {
          showSuccess(`Data saved to ${result.data.filePath}`);
        }
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (isImporting) return;

    setIsImporting(true);
    try {
      const result = await ImportService.importFromFile();
      if (result.success) {
        const { stats, skipped } = result.data;
        const importedTotal =
          stats.categories +
          stats.projects +
          stats.contacts +
          stats.transactions +
          stats.recurringTransactions;
        const skippedTotal =
          skipped.categories +
          skipped.projects +
          skipped.contacts +
          skipped.transactions +
          skipped.recurringTransactions;

        if (importedTotal > 0) {
          showSuccess(
            `Imported ${importedTotal} items${skippedTotal > 0 ? ` (${skippedTotal} already existed)` : ""}`
          );
        } else if (skippedTotal > 0) {
          showSuccess("All items already exist in the database");
        }
      } else if (result.error.code !== "CANCELLED") {
        showError(result.error.message);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetRecurring = async () => {
    if (isResettingRecurring) return;

    setIsResettingRecurring(true);
    try {
      const result = await FinanceService.clearAllRecurringTransactions();
      if (result.success) {
        showSuccess(`Cleared ${result.data.deletedCount} recurring transactions`);
      } else {
        showError(result.error.message);
      }
    } catch (error) {
      showError("Failed to reset recurring transactions");
    } finally {
      setIsResettingRecurring(false);
    }
  };

  const menuSections = [
    {
      title: "Account",
      items: [
        {
          icon: "user",
          label: "Account Settings",
          subtitle: "Edit your profile information",
          route: ROUTES.EDIT_PROFILE,
        },
      ],
    },
    ...(flaggedCount > 0
      ? [
          {
            title: "Review",
            items: [
              {
                icon: "alert-triangle",
                label: "Flagged Transactions",
                subtitle: `${flaggedCount} transaction${flaggedCount !== 1 ? "s" : ""} need review`,
                route: ROUTES.FLAGGED_TRANSACTIONS,
                badge: flaggedCount,
              },
            ],
          },
        ]
      : []),
    {
      title: "Business Settings",
      items: [
        {
          icon: "repeat",
          label: "Recurring",
          subtitle: "Manage recurring expenses & income",
          route: ROUTES.RECURRING_TRANSACTIONS,
        },
        {
          icon: "users",
          label: "Contacts",
          subtitle: "Manage your contacts",
          route: ROUTES.CONTACTS,
        },
        {
          icon: "tags",
          label: "Categories",
          subtitle: "Customize expense categories",
          route: ROUTES.CATEGORIES,
        },
      ],
    },
    {
      title: "Data",
      items: [
        {
          icon: "download",
          label: "Export Data",
          subtitle: "Export all data for backup",
          route: null,
          onPress: handleExport,
          loading: isExporting,
          loadingText: "Exporting...",
        },
        {
          icon: "upload",
          label: "Import Data",
          subtitle: "Import from Parse Server export",
          route: null,
          onPress: handleImport,
          loading: isImporting,
          loadingText: "Importing...",
        },
        {
          icon: "trash-2",
          label: "Reset Recurring",
          subtitle: "Clear all recurring transactions",
          route: null,
          onPress: handleResetRecurring,
          loading: isResettingRecurring,
          loadingText: "Resetting...",
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "info",
          label: "About Cotton",
          subtitle: "Learn more about the app",
          route: null,
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={section.title} className="px-6 py-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">
              {section.title}
            </Text>
            {section.items.map((item, itemIndex) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  if ("onPress" in item && item.onPress) {
                    item.onPress();
                  } else if (item.route) {
                    router.push(item.route as any);
                  }
                }}
                disabled={"loading" in item && item.loading}
                style={[
                  styles.menuItem,
                  "badge" in item && item.badge ? styles.menuItemHighlighted : null,
                ]}
                className={`${itemIndex < section.items.length - 1 ? "mb-2" : ""} flex-row items-center justify-between rounded-xl px-4 py-3.5 active:bg-gray-100`}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    style={[
                      styles.iconContainer,
                      "badge" in item && item.badge ? styles.iconContainerWarning : null,
                    ]}
                  >
                    {"loading" in item && item.loading ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Lucide
                        name={item.icon as any}
                        size={18}
                        color={"badge" in item && item.badge ? "#F59E0B" : COLORS.primary}
                      />
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-[15px] font-semibold text-gray-900">
                        {"loading" in item && item.loading && "loadingText" in item
                          ? item.loadingText
                          : item.label}
                      </Text>
                      {"badge" in item && item.badge ? (
                        <View style={styles.badge} className="ml-2 px-2 py-0.5 rounded-full">
                          <Text className="text-xs font-semibold text-white">{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="text-xs text-gray-500">
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <View style={styles.chevronContainer}>
                  <Lucide name="chevron-right" size={18} color={COLORS.gray400} />
                </View>
              </Pressable>
            ))}
          </View>
        ))}

        {/* App Version */}
        <View className="px-6 pt-4 pb-6">
          <Text className="text-center text-xs text-gray-400">
            Version {Constants.expoConfig?.version || "1.0.0"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  menuItemHighlighted: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerWarning: {
    backgroundColor: "#FEF3C7",
  },
  badge: {
    backgroundColor: "#F59E0B",
  },
  chevronContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
});
