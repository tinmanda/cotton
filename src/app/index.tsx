import { useEffect } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ROUTES } from "@/constants";

/**
 * Root screen - redirects to dashboard (local-first, no auth needed)
 */
export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    // Local-first: no authentication needed, go directly to dashboard
    const timer = setTimeout(() => {
      router.replace(ROUTES.DASHBOARD);
    }, 300);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <View className="items-center">
        <Text className="text-2xl font-bold text-primary">Cotton</Text>
        <Text className="text-gray-500 mt-2">Loading...</Text>
      </View>
    </SafeAreaView>
  );
}
