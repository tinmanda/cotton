import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { AuthService } from "@/services/auth.service";
import { COLORS } from "@/constants";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState(user?.fullName || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      showError("Name must be at least 2 characters");
      return;
    }

    // Don't save if name hasn't changed
    if (trimmedName === user?.fullName) {
      router.back();
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.updateUserName(trimmedName);

      if (result.success) {
        setUser(result.data);
        showSuccess("Profile updated successfully");
        router.back();
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = name.trim().length >= 2;
  const hasChanges = name.trim() !== (user?.fullName || "");

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Lucide name="chevron-left" size={24} color={COLORS.gray600} />
          <Text className="text-base text-gray-600 ml-1">Back</Text>
        </Pressable>

        <Text className="text-lg font-semibold text-gray-900">Edit Profile</Text>

        <Pressable
          onPress={handleSave}
          disabled={!isValid || !hasChanges || isLoading}
          className="px-3 py-1.5"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text
              className={`text-base font-semibold ${
                isValid && hasChanges ? "text-primary" : "text-gray-300"
              }`}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 pt-8">
        {/* Avatar */}
        <View className="items-center mb-8">
          <View
            style={styles.avatarContainer}
            className="items-center justify-center rounded-full"
          >
            <Text className="text-3xl font-semibold text-primary">
              {name.trim().charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
        </View>

        {/* Name Field */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-2">Name</Text>
          <View className="bg-gray-100 rounded-xl px-4 py-4">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.gray400}
              autoCapitalize="words"
              autoComplete="name"
              style={{ fontSize: 16, color: COLORS.gray900 }}
              editable={!isLoading}
            />
          </View>
          <Text className="text-xs text-gray-400 mt-2">
            This is how you'll appear to others
          </Text>
        </View>

        {/* Phone Number (Read-only) */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-2">
            Phone Number
          </Text>
          <View
            style={styles.readOnlyField}
            className="rounded-xl px-4 py-4 flex-row items-center justify-between"
          >
            <Text className="text-base text-gray-500">
              {user?.phoneNumber || "Not set"}
            </Text>
            <Lucide name="lock" size={16} color={COLORS.gray400} />
          </View>
          <Text className="text-xs text-gray-400 mt-2">
            Phone number cannot be changed
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    width: 80,
    height: 80,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 2,
    borderColor: `${COLORS.primary}30`,
  },
  readOnlyField: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
});
