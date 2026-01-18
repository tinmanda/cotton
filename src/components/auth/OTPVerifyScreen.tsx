import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { Button } from "@/components/ui/Button";
import { COLORS, Country } from "@/constants";

interface OTPVerifyScreenProps {
  phoneNumber: string;
  country: Country;
  onVerify: (otp: string) => void;
  onBack: () => void;
  onResend: () => void;
  isLoading: boolean;
}

const OTP_LENGTH = 4;

export function OTPVerifyScreen({
  phoneNumber,
  country,
  onVerify,
  onBack,
  onResend,
  isLoading,
}: OTPVerifyScreenProps) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join("");
      if (fullOtp.length === OTP_LENGTH) {
        onVerify(fullOtp);
      }
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = () => {
    const fullOtp = otp.join("");
    if (fullOtp.length === OTP_LENGTH) {
      onVerify(fullOtp);
    }
  };

  const isComplete = otp.every((digit) => digit !== "");
  const formattedPhone = `${country.dialingCode} ${phoneNumber}`;

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
        Verify Phone
      </Text>
      <Text className="text-gray-500 text-center mb-2">
        Enter the 4-digit code sent to
      </Text>
      <Text className="text-gray-900 text-center font-medium mb-8">
        {formattedPhone}
      </Text>

      <View className="flex-row justify-center gap-3 mb-8">
        {Array.from({ length: OTP_LENGTH }).map((_, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref; }}
            className={`w-14 h-14 border-2 rounded-xl text-center text-2xl font-bold ${
              otp[index]
                ? "border-primary bg-primary/5"
                : "border-gray-300 bg-white"
            }`}
            value={otp[index]}
            onChangeText={(value) => handleChange(value, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <Button
        title="Verify"
        variant="primary"
        onPress={handleSubmit}
        disabled={!isComplete || isLoading}
      />

      <View className="flex-row justify-center items-center mt-6">
        <Text className="text-gray-500">Didn't receive the code? </Text>
        <Pressable onPress={onResend} disabled={isLoading}>
          <Text className="text-primary font-medium">Resend</Text>
        </Pressable>
      </View>

      <Text className="text-gray-400 text-center text-xs mt-4">
        For testing, use code: 1234
      </Text>
    </View>
  );
}
