import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { COLORS } from "@/constants/colors";
import { useToast } from "@/hooks/useToast";
import { AuthService } from "@/services/auth.service";
import { IUser } from "@/types";

interface NameEntryScreenProps {
  countryDialCode: string;
  phoneNumber: string;
  countryIsoCode: string;
  onComplete: (user: IUser) => void;
}

export function NameEntryScreen({
  countryDialCode,
  phoneNumber,
  countryIsoCode,
  onComplete,
}: NameEntryScreenProps) {
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      showError("Please enter your name");
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.createUser(
        countryDialCode,
        phoneNumber,
        countryIsoCode,
        trimmedName
      );

      if (result.success) {
        onComplete(result.data.user);
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = name.trim().length >= 2;

  return (
    <View>
      {/* Title */}
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        What's your name?
      </Text>
      <Text className="text-base text-gray-500 mb-8">
        This is how you'll appear to others
      </Text>

      {/* Name Input */}
      <View className="bg-gray-100 rounded-xl px-4 py-4 mb-6">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor={COLORS.gray400}
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          style={{ fontSize: 16, color: COLORS.gray900 }}
          editable={!isLoading}
          testID="name-input"
        />
      </View>

      {/* Continue Button */}
      <Pressable
        onPress={handleContinue}
        disabled={!isValid || isLoading}
        className={`rounded-xl py-4 mb-14 items-center justify-center ${
          isValid && !isLoading
            ? "bg-primary active:bg-primary/90"
            : "bg-gray-300"
        }`}
        testID="name-continue-button"
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-base font-semibold">Continue</Text>
        )}
      </Pressable>
    </View>
  );
}
