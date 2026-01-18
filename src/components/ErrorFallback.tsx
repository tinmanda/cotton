import { COLORS } from "@/constants";
import { Lucide } from "@react-native-vector-icons/lucide";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "./ui/Button";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center p-6">
        <Lucide name="circle-alert" size={64} color={COLORS.error} />

        <Text className="text-2xl font-bold mt-6 mb-2 text-center">
          Something went wrong
        </Text>

        <Text className="text-gray-600 text-center mb-6">
          An unexpected error occurred. Please try again.
        </Text>

        {__DEV__ && (
          <View className="bg-gray-100 p-4 rounded-lg mb-6 w-full">
            <Text className="text-sm font-mono text-gray-800">
              {error.message}
            </Text>
          </View>
        )}

        <Button
          title="Try Again"
          variant="primary"
          onPress={resetError}
          className="w-full"
        />
      </View>
    </SafeAreaView>
  );
};
