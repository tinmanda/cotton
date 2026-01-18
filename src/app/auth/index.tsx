import { useState } from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  PhoneInputScreen,
  OTPVerifyScreen,
  NameEntryScreen,
} from "@/components/auth";
import { AuthService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ROUTES, Country } from "@/constants";

type AuthStep = "phone" | "otp" | "name";

interface AuthState {
  countryCode: string;
  phoneNumber: string;
  country: Country | null;
  countryIsoCode: string;
}

export default function AuthScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [step, setStep] = useState<AuthStep>("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    countryCode: "",
    phoneNumber: "",
    country: null,
    countryIsoCode: "",
  });

  const handlePhoneSubmit = async (
    countryCode: string,
    phoneNumber: string,
    country: Country
  ) => {
    setIsLoading(true);
    try {
      const result = await AuthService.requestOTP(countryCode, phoneNumber);
      if (result.success) {
        setAuthState({
          countryCode,
          phoneNumber,
          country,
          countryIsoCode: country.code,
        });
        setStep("otp");
        showSuccess("OTP sent successfully");
      } else {
        showError(result.error.message);
      }
    } catch (error) {
      showError("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otp: string) => {
    setIsLoading(true);
    try {
      const result = await AuthService.verifyOTP(
        authState.countryCode,
        authState.phoneNumber,
        otp,
        authState.countryIsoCode
      );

      if (result.success) {
        if (result.data.isNewUser) {
          // New user - need to collect name
          setStep("name");
        } else if (result.data.user) {
          // Existing user - logged in
          setUser(result.data.user);
          showSuccess("Welcome back!");
          router.replace(ROUTES.HOME);
        }
      } else {
        showError(result.error.message);
      }
    } catch (error) {
      showError("Failed to verify OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const result = await AuthService.requestOTP(
        authState.countryCode,
        authState.phoneNumber
      );
      if (result.success) {
        showSuccess("OTP sent again");
      } else {
        showError(result.error.message);
      }
    } catch (error) {
      showError("Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = async (fullName: string) => {
    setIsLoading(true);
    try {
      const result = await AuthService.createUser(
        authState.countryCode,
        authState.phoneNumber,
        authState.countryIsoCode,
        fullName
      );

      if (result.success) {
        setUser(result.data.user);
        showSuccess("Account created successfully!");
        router.replace(ROUTES.HOME);
      } else {
        showError(result.error.message);
      }
    } catch (error) {
      showError("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setAuthState({
      countryCode: "",
      phoneNumber: "",
      country: null,
      countryIsoCode: "",
    });
  };

  const handleBackToOTP = () => {
    setStep("otp");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center p-6">
          {step === "phone" && (
            <PhoneInputScreen
              onSubmit={handlePhoneSubmit}
              isLoading={isLoading}
            />
          )}

          {step === "otp" && authState.country && (
            <OTPVerifyScreen
              phoneNumber={authState.phoneNumber}
              country={authState.country}
              onVerify={handleOTPVerify}
              onBack={handleBackToPhone}
              onResend={handleResendOTP}
              isLoading={isLoading}
            />
          )}

          {step === "name" && (
            <NameEntryScreen
              onSubmit={handleNameSubmit}
              onBack={handleBackToOTP}
              isLoading={isLoading}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
