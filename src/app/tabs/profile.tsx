import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { useRouter } from "expo-router";
import { ROUTES } from "@/constants";
import { useToast } from "@/hooks/useToast";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      showSuccess("Signed out successfully");
      router.replace(ROUTES.AUTH);
    } else {
      showError(result.error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>

        {user ? (
          <View className="mt-4">
            <Text className="text-gray-600">
              Phone: {user.phoneNumber}
            </Text>
            {user.fullName && (
              <Text className="text-gray-600">Name: {user.fullName}</Text>
            )}
            {user.email && (
              <Text className="text-gray-600">Email: {user.email}</Text>
            )}
          </View>
        ) : (
          <Text className="text-gray-600 mt-4">Not logged in</Text>
        )}

        <View className="mt-8">
          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleSignOut}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
