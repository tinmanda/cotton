import { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Lucide } from "@react-native-vector-icons/lucide";
import { COLORS } from "@/constants/colors";
import {
  CountryData,
  ALL_COUNTRIES,
  POPULAR_COUNTRIES,
  filterCountries,
} from "@/constants/countries";

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: CountryData) => void;
  selectedCountry?: CountryData;
}

export function CountryPickerModal({
  visible,
  onClose,
  onSelect,
  selectedCountry,
}: CountryPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) {
      // Show popular countries first, then all countries
      return [...POPULAR_COUNTRIES, ...ALL_COUNTRIES];
    }
    return filterCountries(ALL_COUNTRIES, searchTerm);
  }, [searchTerm]);

  const handleSelect = (country: CountryData) => {
    onSelect(country);
    setSearchTerm("");
    onClose();
  };

  const handleClose = () => {
    setSearchTerm("");
    onClose();
  };

  const renderCountryItem = ({
    item,
    index,
  }: {
    item: CountryData;
    index: number;
  }) => {
    const isSelected = selectedCountry?.code === item.code;
    const showDivider =
      !searchTerm.trim() && index === POPULAR_COUNTRIES.length - 1;

    return (
      <>
        <Pressable
          onPress={() => handleSelect(item)}
          className={`flex-row items-center py-3.5 px-4 ${
            isSelected ? "bg-primary/10" : "active:bg-gray-100"
          }`}
        >
          <Text className="text-2xl mr-3">{item.flag}</Text>
          <Text className="flex-1 text-base text-gray-900">{item.name}</Text>
          <Text className="text-base text-gray-500">{item.dialCode}</Text>
          {isSelected && (
            <Lucide
              name="check"
              size={20}
              color={COLORS.primary}
              style={{ marginLeft: 8 }}
            />
          )}
        </Pressable>
        {showDivider && <View className="h-2 bg-gray-100" />}
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <Pressable
              onPress={handleClose}
              className="p-2 -ml-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Lucide name="x" size={24} color={COLORS.gray600} />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900">
              Select Country
            </Text>
            <View className="w-10" />
          </View>

          {/* Search */}
          <View className="px-4 py-3 border-b border-gray-200">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
              <Lucide name="search" size={20} color={COLORS.gray400} />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search country or code"
                placeholderTextColor={COLORS.gray400}
                className="flex-1 ml-2 text-base text-gray-900"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchTerm.length > 0 && (
                <Pressable onPress={() => setSearchTerm("")}>
                  <Lucide name="circle-x" size={18} color={COLORS.gray400} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Country List */}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item, index) => `${item.code}-${index}`}
            renderItem={renderCountryItem}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Text className="text-gray-500 text-base">
                  No countries found
                </Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
