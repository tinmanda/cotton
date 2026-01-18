import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { Button } from "@/components/ui/Button";
import { COLORS } from "@/constants";

interface NameEntryScreenProps {
  onSubmit: (fullName: string) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function NameEntryScreen({
  onSubmit,
  onBack,
  isLoading,
}: NameEntryScreenProps) {
  const [fullName, setFullName] = useState("");

  const handleSubmit = () => {
    const trimmedName = fullName.trim();
    if (trimmedName.length >= 2) {
      onSubmit(trimmedName);
    }
  };

  const isValidName = fullName.trim().length >= 2;

  return (
    <View className="flex-1">
      <Pressable
        onPress={onBack}
        className="flex-row items-center mb-6"
      >
        <Lucide name="arrow-left" size={24} color={COLORS.gray700} />
        <Text className="text-gray-700 ml-2 text-base">Back</Text>
      </Pressable>

      <Text className="text-3xl font-bold text-center text-gray-900 mb-2">
        What's your name?
      </Text>
      <Text className="text-gray-500 text-center mb-8">
        Let us know what to call you
      </Text>

      <View className="mb-6">
        <Text className="text-gray-700 mb-2 font-medium">Full Name</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-4 text-base"
          placeholder="Enter your full name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
        />
      </View>

      <Button
        title="Create Account"
        variant="primary"
        onPress={handleSubmit}
        disabled={!isValidName || isLoading}
      />
    </View>
  );
}
