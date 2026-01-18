import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { Button } from "@/components/ui/Button";
import { COLORS, COUNTRIES, Country, DEFAULT_COUNTRY } from "@/constants";

interface PhoneInputScreenProps {
  onSubmit: (countryCode: string, phoneNumber: string, country: Country) => void;
  isLoading: boolean;
}

export function PhoneInputScreen({
  onSubmit,
  isLoading,
}: PhoneInputScreenProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialingCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length >= 6) {
      onSubmit(selectedCountry.dialingCode, cleanPhone, selectedCountry);
    }
  };

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    setSearchQuery("");
  };

  const isValidPhone = phoneNumber.replace(/\D/g, "").length >= 6;

  return (
    <View className="flex-1">
      <Text className="text-3xl font-bold text-center text-gray-900 mb-2">
        Cotton
      </Text>
      <Text className="text-gray-500 text-center mb-8">
        Enter your phone number to continue
      </Text>

      <View className="mb-6">
        <Text className="text-gray-700 mb-2 font-medium">Phone Number</Text>
        <View className="flex-row">
          <Pressable
            onPress={() => setShowCountryPicker(true)}
            className="flex-row items-center border border-gray-300 rounded-l-lg px-3 py-4 bg-gray-50"
          >
            <Text className="text-xl mr-1">{selectedCountry.flag}</Text>
            <Text className="text-base text-gray-900">
              {selectedCountry.dialingCode}
            </Text>
            <Lucide
              name="chevron-down"
              size={16}
              color={COLORS.gray500}
              style={{ marginLeft: 4 }}
            />
          </Pressable>
          <TextInput
            className="flex-1 border border-l-0 border-gray-300 rounded-r-lg px-4 py-4 text-base"
            placeholder="Phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoFocus
          />
        </View>
      </View>

      <Button
        title="Continue"
        variant="primary"
        onPress={handleSubmit}
        disabled={!isValidPhone || isLoading}
      />

      <Text className="text-gray-400 text-center text-sm mt-4">
        We'll send you a verification code
      </Text>

      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white pt-4">
          <View className="flex-row items-center justify-between px-4 pb-4 border-b border-gray-200">
            <Text className="text-xl font-bold">Select Country</Text>
            <Pressable
              onPress={() => {
                setShowCountryPicker(false);
                setSearchQuery("");
              }}
              className="p-2"
            >
              <Lucide name="x" size={24} color={COLORS.gray700} />
            </Pressable>
          </View>

          <View className="px-4 py-3">
            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
              <Lucide name="search" size={20} color={COLORS.gray400} />
              <TextInput
                className="flex-1 ml-2 text-base"
                placeholder="Search countries..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>
          </View>

          <ScrollView className="flex-1">
            {filteredCountries.map((country) => (
              <Pressable
                key={country.code}
                onPress={() => selectCountry(country)}
                className="flex-row items-center px-4 py-3 border-b border-gray-100 active:bg-gray-50"
              >
                <Text className="text-2xl mr-3">{country.flag}</Text>
                <View className="flex-1">
                  <Text className="text-base text-gray-900">{country.name}</Text>
                </View>
                <Text className="text-gray-500">{country.dialingCode}</Text>
                {country.code === selectedCountry.code && (
                  <Lucide
                    name="check"
                    size={20}
                    color={COLORS.primary}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
