import { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAtom } from "jotai";
import { Lucide } from "@react-native-vector-icons/lucide";

import { COLORS } from "@/constants";
import { toastAtom, ToastType } from "@/store/ui/atoms";

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: "#ecfdf5",
    border: "#10b981",
    icon: "#059669",
  },
  error: {
    bg: "#fef2f2",
    border: "#ef4444",
    icon: "#dc2626",
  },
  warning: {
    bg: "#fffbeb",
    border: "#f59e0b",
    icon: "#d97706",
  },
  info: {
    bg: "#eff6ff",
    border: "#3b82f6",
    icon: "#2563eb",
  },
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: "circle-check",
  error: "circle-x",
  warning: "triangle-alert",
  info: "info",
};

/**
 * Toast container that renders toasts using Modal
 * This ensures toasts appear above all other modals
 */
export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useAtom(toastAtom);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toast.visible) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, toast.duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [toast.visible, toast.duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  };

  if (!toast.visible) return null;

  const colors = TOAST_COLORS[toast.type];
  const iconName = TOAST_ICONS[toast.type];

  return (
    <Modal
      visible={toast.visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={hideToast}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: insets.top + 10,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Pressable onPress={hideToast} style={styles.pressable}>
            <View
              style={[
                styles.toast,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Lucide name={iconName as any} size={20} color={colors.icon} />
              <Text style={styles.message} numberOfLines={2}>
                {toast.message}
              </Text>
              <Pressable onPress={hideToast} hitSlop={8}>
                <Lucide name="x" size={18} color={COLORS.gray500} />
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  toastContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  pressable: {
    width: "100%",
    maxWidth: 400,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});
