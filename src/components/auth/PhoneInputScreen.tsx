import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { getLocales } from "expo-localization";
import { COLORS } from "@/constants/colors";
import {
  CountryData,
  DEFAULT_COUNTRY,
  getCountryByCode,
} from "@/constants/countries";
import { useToast } from "@/hooks/useToast";
import { AuthService } from "@/services/auth.service";
import { CountryPickerModal } from "./CountryPickerModal";

interface PhoneInputScreenProps {
  onContinue: (
    countryDialCode: string,
    phoneNumber: string,
    countryIsoCode: string
  ) => void;
}

export function PhoneInputScreen({ onContinue }: PhoneInputScreenProps) {
  const { showError } = useToast();
  const [selectedCountry, setSelectedCountry] =
    useState<CountryData>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Auto-detect country from device locale on mount
  useEffect(() => {
    try {
      const locales = getLocales();
      if (locales.length > 0 && locales[0].regionCode) {
        const detectedCountry = getCountryByCode(locales[0].regionCode);
        if (detectedCountry) {
          setSelectedCountry(detectedCountry);
        }
      }
    } catch {
      // Fallback to default country
    }
  }, []);

  const handleContinue = async () => {
    // Basic validation
    const cleanNumber = phoneNumber.replace(/[^\d]/g, "");
    if (cleanNumber.length < 6) {
      showError("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.requestOTP(
        selectedCountry.dialCode,
        cleanNumber
      );

      if (result.success) {
        onContinue(selectedCountry.dialCode, cleanNumber, selectedCountry.code);
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = phoneNumber.replace(/[^\d]/g, "").length >= 6;

  return (
    <View>
      {/* Title */}
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Enter your phone number
      </Text>
      <Text className="text-base text-gray-500 mb-8">
        We'll send you a verification code
      </Text>

      {/* Phone Input Row */}
      <View className="flex-row items-center gap-3">
        {/* Country Picker Button */}
        <Pressable
          onPress={() => setShowCountryPicker(true)}
          className="flex-row items-center bg-gray-100 rounded-xl px-4 h-14 active:bg-gray-200"
        >
          <Text className="text-xl mr-2">{selectedCountry.flag}</Text>
          <Text className="text-base font-medium text-gray-900">
            {selectedCountry.dialCode}
          </Text>
          <Lucide
            name="chevron-down"
            size={18}
            color={COLORS.gray500}
            style={{ marginLeft: 4 }}
          />
        </Pressable>

        {/* Phone Number Input */}
        <View className="flex-1 bg-gray-100 rounded-xl px-4 justify-center h-14">
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Phone number"
            placeholderTextColor={COLORS.gray400}
            keyboardType="phone-pad"
            autoFocus
            style={{ fontSize: 16, color: COLORS.gray900 }}
            editable={!isLoading}
            testID="phone-input"
          />
        </View>
      </View>

      {/* Continue Button */}
      <Pressable
        onPress={handleContinue}
        disabled={!isValid || isLoading}
        className={`mt-6 rounded-xl py-4 items-center justify-center ${
          isValid && !isLoading ? "bg-primary active:bg-primary/90" : "bg-gray-300"
        }`}
        testID="phone-continue-button"
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-base font-semibold">Continue</Text>
        )}
      </Pressable>

      {/* Terms */}
      <Text className="text-center text-sm text-gray-400 mt-6 px-4 pb-16">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>

      {/* Country Picker Modal */}
      <CountryPickerModal
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={setSelectedCountry}
        selectedCountry={selectedCountry}
      />
    </View>
  );
}
