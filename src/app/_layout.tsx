import { useEffect, useState } from "react";
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
import { initDatabase } from "@/data";

// Initialize Parse (still needed for AI cloud functions)
initializeParse();

SplashScreen.preventAutoHideAsync();

/**
 * Inner layout component that has access to Jotai context
 */
function RootLayoutInner() {
  const [isDbReady, setIsDbReady] = useState(false);

  // Initialize auth once at app startup
  useAuthInit();

  // Initialize SQLite database
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
        // Still allow app to load, but data may not work
        setIsDbReady(true);
      }
    };
    init();
  }, []);

  // Hide splash screen after database is initialized
  useEffect(() => {
    if (isDbReady) {
      SplashScreen.hideAsync();
    }
  }, [isDbReady]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="projects/[id]" />
        <Stack.Screen name="transactions/[id]/edit" />
        <Stack.Screen name="transactions/bulk" />
        <Stack.Screen name="transactions/flagged" />
        <Stack.Screen name="settings/employees" />
        <Stack.Screen name="settings/contacts" />
        <Stack.Screen name="settings/categories" />
        <Stack.Screen name="contacts/[id]" />
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
