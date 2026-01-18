import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Provider } from "jotai";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import "../../global.css";

import { cssInterop } from "nativewind";
import { Image } from "expo-image";

// Enable NativeWind className support for expo-image
cssInterop(Image, { className: "style" });

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/ui/Toast";
import { useAuthInit } from "@/hooks/useAuthInit";
import { initializeParse } from "@/config/parse";

// Initialize Parse
initializeParse();

SplashScreen.preventAutoHideAsync();

/**
 * Inner layout component that has access to Jotai context
 */
function RootLayoutInner() {
  // Initialize auth once at app startup
  useAuthInit();

  // Hide splash screen after initialization
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack>
      <ToastContainer />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Provider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutInner />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
