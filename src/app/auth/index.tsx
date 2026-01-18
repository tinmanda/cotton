import { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { AuthService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/constants";

export default function AuthScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      showError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await AuthService.signUp(username, password);
        if (result.success) {
          setUser(result.data);
          showSuccess("Account created successfully!");
          router.replace(ROUTES.HOME);
        } else {
          showError(result.error.message);
        }
      } else {
        const result = await AuthService.signIn(username, password);
        if (result.success) {
          setUser(result.data);
          showSuccess("Welcome back!");
          router.replace(ROUTES.HOME);
        } else {
          showError(result.error.message);
        }
      }
    } catch (error) {
      showError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center p-6">
          <Text className="text-3xl font-bold text-center text-gray-900 mb-2">
            Cotton
          </Text>
          <Text className="text-gray-500 text-center mb-8">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </Text>

          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 mb-2 font-medium">Username</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-base"
                placeholder="Enter username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="mt-4">
              <Text className="text-gray-700 mb-2 font-medium">Password</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-4 text-base"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View className="mt-6">
              <Button
                title={isSignUp ? "Sign Up" : "Sign In"}
                variant="primary"
                onPress={handleSubmit}
                disabled={isLoading}
              />
            </View>

            <View className="mt-4">
              <Button
                title={isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                variant="secondary"
                onPress={() => setIsSignUp(!isSignUp)}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
