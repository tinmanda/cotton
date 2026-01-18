import { useCallback, useRef, useState } from "react";
import { Dimensions, View, Text } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import {
  PhoneInputScreen,
  OTPVerifyScreen,
  NameEntryScreen,
} from "@/components/auth";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { IUser } from "@/types";

type AuthStep = "phone" | "otp" | "name";

interface PhoneData {
  countryDialCode: string;
  phoneNumber: string;
  countryIsoCode: string;
}

export default function AuthScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [bottomSheetHeight, setBottomSheetHeight] = useState(400);
  const [currentStep, setCurrentStep] = useState<AuthStep>("phone");
  const [phoneData, setPhoneData] = useState<PhoneData | null>(null);
  const screenHeight = Dimensions.get("window").height;

  const availableTopSpace = screenHeight - bottomSheetHeight;

  const handlePhoneContinue = useCallback(
    (countryDialCode: string, phoneNumber: string, countryIsoCode: string) => {
      setPhoneData({ countryDialCode, phoneNumber, countryIsoCode });
      setCurrentStep("otp");
    },
    []
  );

  const handleExistingUserVerified = useCallback(
    (user: IUser) => {
      setUser(user);
      router.replace(ROUTES.HOME);
    },
    [setUser, router]
  );

  const handleNewUserVerified = useCallback(() => {
    setCurrentStep("name");
  }, []);

  const handleNameComplete = useCallback(
    (user: IUser) => {
      setUser(user);
      router.replace(ROUTES.HOME);
    },
    [setUser, router]
  );

  const handleBackToPhone = useCallback(() => {
    setCurrentStep("phone");
    setPhoneData(null);
  }, []);

  return (
    <View className="flex-1 bg-primary">
      {/* Top section with primary color */}
      <View
        className="items-center justify-center bg-primary px-6"
        style={{ height: availableTopSpace }}
      >
        <View className="items-center">
          <Text className="text-white text-4xl font-bold">Cotton</Text>
        </View>
      </View>

      {/* Bottom sheet with auth forms */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        enableDynamicSizing={true}
        enablePanDownToClose={false}
        handleComponent={() => null}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setBottomSheetHeight(height);
          }}
        >
          <View className="p-6 pb-12">
            {currentStep === "phone" && (
              <PhoneInputScreen onContinue={handlePhoneContinue} />
            )}

            {currentStep === "otp" && phoneData && (
              <OTPVerifyScreen
                countryDialCode={phoneData.countryDialCode}
                phoneNumber={phoneData.phoneNumber}
                countryIsoCode={phoneData.countryIsoCode}
                onBack={handleBackToPhone}
                onExistingUserVerified={handleExistingUserVerified}
                onNewUserVerified={handleNewUserVerified}
              />
            )}

            {currentStep === "name" && phoneData && (
              <NameEntryScreen
                countryDialCode={phoneData.countryDialCode}
                phoneNumber={phoneData.phoneNumber}
                countryIsoCode={phoneData.countryIsoCode}
                onComplete={handleNameComplete}
              />
            )}
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
