import { useEffect } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants";

/**
 * Root screen - redirects based on auth state
 */
export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Wait a bit for auth state to be hydrated from storage
    const timer = setTimeout(() => {
      if (isAuthenticated && user) {
        router.replace(ROUTES.DASHBOARD);
      } else {
        router.replace(ROUTES.AUTH);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, router]);

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <View className="items-center">
        <Text className="text-2xl font-bold text-primary">Cotton</Text>
        <Text className="text-gray-500 mt-2">Loading...</Text>
      </View>
    </SafeAreaView>
  );
}
