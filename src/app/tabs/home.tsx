import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900">Home</Text>
        <Text className="text-gray-600 mt-2">
          Welcome to Cotton! Start building your app here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
