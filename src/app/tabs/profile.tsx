import { useState } from "react";
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
import Constants from "expo-constants";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "expo-router";
import { COLORS, ROUTES } from "@/constants";
import { useToast } from "@/hooks/useToast";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    const result = await signOut();
    if (result.success) {
      showSuccess("Signed out successfully");
      router.replace(ROUTES.AUTH);
    } else {
      showError(result.error.message);
      setIsSigningOut(false);
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.fullName) return "U";
    const names = user.fullName.trim().split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        {user && (
          <View className="px-6 py-8 border-b border-gray-100">
            <View className="flex-row items-center">
              {/* Avatar */}
              <View
                style={styles.avatarContainer}
                className="items-center justify-center rounded-full mr-4"
              >
                <Text className="text-2xl font-semibold text-primary">
                  {getInitials()}
                </Text>
              </View>

              {/* User Details */}
              <View className="flex-1">
                <Text
                  className="text-xl font-semibold text-gray-900 mb-1"
                  style={styles.userName}
                >
                  {user.fullName || "User"}
                </Text>
                <Text className="text-sm text-gray-500">{user.phoneNumber}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View className="px-6 py-6">
          {/* Account Settings */}
          <Pressable
            style={styles.menuItem}
            className="mb-3 flex-row items-center justify-between rounded-xl px-4 py-3.5 active:bg-gray-100"
          >
            <View className="flex-row items-center">
              <View style={styles.iconContainer}>
                <Lucide name="user" size={18} color={COLORS.primary} />
              </View>
              <View className="ml-3">
                <Text className="text-[15px] font-semibold text-gray-900">
                  Account Settings
                </Text>
                <Text className="text-xs text-gray-500">
                  Edit your profile information
                </Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <Lucide name="chevron-right" size={18} color={COLORS.gray400} />
            </View>
          </Pressable>

          {/* About */}
          <Pressable
            style={styles.menuItem}
            className="flex-row items-center justify-between rounded-xl px-4 py-3.5 active:bg-gray-100"
          >
            <View className="flex-row items-center">
              <View style={styles.iconContainer}>
                <Lucide name="info" size={18} color={COLORS.primary} />
              </View>
              <View className="ml-3">
                <Text className="text-[15px] font-semibold text-gray-900">
                  About Cotton
                </Text>
                <Text className="text-xs text-gray-500">
                  Learn more about the app
                </Text>
              </View>
            </View>
            <View style={styles.chevronContainer}>
              <Lucide name="chevron-right" size={18} color={COLORS.gray400} />
            </View>
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <View className="px-6 pt-4 pb-6">
          <Pressable
            onPress={handleSignOut}
            disabled={isSigningOut}
            style={[styles.signOutButton, isSigningOut && styles.signOutButtonDisabled]}
            className="flex-row items-center justify-center rounded-xl py-3.5 active:opacity-80"
          >
            {isSigningOut ? (
              <>
                <ActivityIndicator size="small" color={COLORS.gray500} />
                <Text className="ml-2 text-[15px] font-semibold text-gray-500">
                  Signing out...
                </Text>
              </>
            ) : (
              <>
                <Lucide name="log-out" size={18} color={COLORS.gray700} />
                <Text className="ml-2 text-[15px] font-semibold text-gray-700">
                  Sign Out
                </Text>
              </>
            )}
          </Pressable>

          {/* App Version */}
          <Text className="mt-6 text-center text-xs text-gray-400">
            Version {Constants.expoConfig?.version || "1.0.0"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    width: 64,
    height: 64,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 2,
    borderColor: `${COLORS.primary}30`,
  },
  userName: {
    letterSpacing: -0.3,
  },
  menuItem: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  signOutButtonDisabled: {
    backgroundColor: COLORS.gray50,
    borderColor: COLORS.gray200,
  },
});
