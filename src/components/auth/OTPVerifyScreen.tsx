import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { COLORS } from "@/constants/colors";
import { useToast } from "@/hooks/useToast";
import { AuthService } from "@/services/auth.service";
import { IUser } from "@/types";

const OTP_LENGTH = 4;

interface OTPVerifyScreenProps {
  countryDialCode: string;
  phoneNumber: string;
  countryIsoCode: string;
  onBack: () => void;
  onExistingUserVerified: (user: IUser) => void;
  onNewUserVerified: () => void;
}

export function OTPVerifyScreen({
  countryDialCode,
  phoneNumber,
  countryIsoCode,
  onBack,
  onExistingUserVerified,
  onNewUserVerified,
}: OTPVerifyScreenProps) {
  const { showError } = useToast();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const hiddenInputRef = useRef<TextInput | null>(null);

  // Focus hidden input on mount
  useEffect(() => {
    setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 100);
  }, []);

  // Handle OTP from hidden input (paste/autofill)
  const handleHiddenInput = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, OTP_LENGTH);

    if (!digits) {
      setOtp(Array(OTP_LENGTH).fill(""));
      setFocusedIndex(0);
      return;
    }

    // Distribute digits to all cells
    const newOtp = Array(OTP_LENGTH).fill("");
    digits.split("").forEach((d, i) => {
      if (i < OTP_LENGTH) {
        newOtp[i] = d;
      }
    });

    setOtp(newOtp);
    setFocusedIndex(Math.min(digits.length - 1, OTP_LENGTH - 1));

    // Clear hidden input after processing
    hiddenInputRef.current?.setNativeProps({ text: "" });
  };

  // Handle input from visible cells
  const handleCellInput = (index: number, text: string) => {
    const digits = text.replace(/\D/g, "");

    // If multiple digits (paste), redirect to hidden input handler
    if (digits.length > 1) {
      handleHiddenInput(digits);
      return;
    }

    // Single digit input
    if (digits.length === 1) {
      const newOtp = [...otp];
      newOtp[index] = digits;
      setOtp(newOtp);

      // Auto-focus next field
      if (index < OTP_LENGTH - 1) {
        setFocusedIndex(index + 1);
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== "Backspace") return;

    if (otp[index]) {
      // Clear current field
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    } else if (index > 0) {
      // Move to previous and clear it
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      setFocusedIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCellFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      showError("Please enter the complete code");
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.verifyOTP(
        countryDialCode,
        phoneNumber,
        otpCode,
        countryIsoCode
      );

      if (result.success) {
        if (result.data.isNewUser) {
          onNewUserVerified();
        } else if (result.data.user) {
          onExistingUserVerified(result.data.user);
        }
      } else {
        showError(result.error.message);
        // Clear OTP on error
        setOtp(Array(OTP_LENGTH).fill(""));
        setFocusedIndex(0);
        hiddenInputRef.current?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const result = await AuthService.requestOTP(countryDialCode, phoneNumber);
      if (!result.success) {
        showError(result.error.message);
      }
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = otp.every((d) => d !== "");
  const displayPhone = `${countryDialCode} ${phoneNumber}`;

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View>
        {/* Back Button */}
        <Pressable
          onPress={onBack}
          className="flex-row items-center -ml-2 mb-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="otp-back-button"
        >
          <Lucide name="chevron-left" size={24} color={COLORS.gray600} />
          <Text className="text-gray-600 text-base">Back</Text>
        </Pressable>

        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Enter verification code
        </Text>
        <Text className="text-base text-gray-500 mb-8">
          Code sent to {displayPhone}
        </Text>

        {/* Hidden input for paste/autofill */}
        <TextInput
          ref={hiddenInputRef}
          style={styles.hiddenInput}
          onChangeText={handleHiddenInput}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          textContentType="oneTimeCode"
          caretHidden
          testID="otp-hidden-input"
        />

        {/* Visible OTP cells */}
        <View className="flex-row justify-center gap-3 mb-6">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(text) => handleCellInput(index, text)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(index, nativeEvent.key)
              }
              onFocus={() => handleCellFocus(index)}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              selectTextOnFocus
              style={{
                width: 64,
                height: 64,
                textAlign: "center",
                fontSize: 24,
                fontWeight: "bold",
                borderRadius: 12,
                borderWidth: 2,
                borderColor: digit
                  ? COLORS.primary
                  : focusedIndex === index
                  ? COLORS.primary
                  : COLORS.gray200,
                backgroundColor: digit ? `${COLORS.primary}10` : COLORS.gray50,
                color: COLORS.gray900,
              }}
              editable={!isLoading}
              testID={`otp-input-${index}`}
            />
          ))}
        </View>

        {/* Verify Button */}
        <Pressable
          onPress={handleVerify}
          disabled={!isComplete || isLoading}
          className={`rounded-xl py-4 items-center justify-center ${
            isComplete && !isLoading
              ? "bg-primary active:bg-primary/90"
              : "bg-gray-300"
          }`}
          testID="otp-verify-button"
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-base font-semibold">Verify</Text>
          )}
        </Pressable>

        {/* Resend Link */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Didn't receive the code? </Text>
          <Pressable onPress={handleResend} disabled={isResending || isLoading}>
            <Text
              className={`font-semibold ${
                isResending || isLoading ? "text-gray-400" : "text-primary"
              }`}
            >
              {isResending ? "Sending..." : "Resend"}
            </Text>
          </Pressable>
        </View>

        {/* Extra spacing for keyboard */}
        <View className="h-8" />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
