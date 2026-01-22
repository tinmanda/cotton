import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAtom } from "jotai";
import { Lucide } from "@react-native-vector-icons/lucide";

import { COLORS } from "@/constants";
import { toastAtom, errorModalAtom, ToastType } from "@/store/ui/atoms";

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
  const [errorModal, setErrorModal] = useAtom(errorModalAtom);
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

  const handleToastPress = () => {
    if (toast.details) {
      // Show error modal with details
      hideToast();
      setErrorModal({
        visible: true,
        title: toast.type === "error" ? "Error Details" : "Details",
        message: toast.details,
      });
    } else {
      hideToast();
    }
  };

  const hideErrorModal = () => {
    setErrorModal((prev) => ({ ...prev, visible: false }));
  };

  if (!toast.visible && !errorModal.visible) return null;

  const colors = TOAST_COLORS[toast.type];
  const iconName = TOAST_ICONS[toast.type];

  return (
    <>
      {/* Toast */}
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
            <Pressable onPress={handleToastPress} style={styles.pressable}>
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
                <View style={styles.messageContainer}>
                  <Text style={styles.message} numberOfLines={2}>
                    {toast.message}
                  </Text>
                  {toast.details && (
                    <Text style={styles.tapForDetails}>Tap for details</Text>
                  )}
                </View>
                <Pressable onPress={hideToast} hitSlop={8}>
                  <Lucide name="x" size={18} color={COLORS.gray500} />
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={hideErrorModal}
      >
        <View style={styles.errorModalOverlay}>
          <View style={[styles.errorModalContent, { marginTop: insets.top + 40 }]}>
            <View style={styles.errorModalHeader}>
              <View style={styles.errorIconContainer}>
                <Lucide name="alert-circle" size={24} color={COLORS.error} />
              </View>
              <Text style={styles.errorModalTitle}>{errorModal.title}</Text>
              <Pressable onPress={hideErrorModal} hitSlop={12} style={styles.closeButton}>
                <Lucide name="x" size={24} color={COLORS.gray500} />
              </Pressable>
            </View>
            <ScrollView style={styles.errorModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.errorModalMessage} selectable>
                {errorModal.message}
              </Text>
              {errorModal.details && (
                <View style={styles.errorDetails}>
                  <Text style={styles.errorDetailsLabel}>Technical Details:</Text>
                  <Text style={styles.errorDetailsText} selectable>
                    {errorModal.details}
                  </Text>
                </View>
              )}
            </ScrollView>
            <Pressable onPress={hideErrorModal} style={styles.errorModalButton}>
              <Text style={styles.errorModalButtonText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  tapForDetails: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
  },
  // Error Modal styles
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  errorModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  errorIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  errorModalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  errorModalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: 300,
  },
  errorModalMessage: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  errorDetails: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  errorDetailsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gray500,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorDetailsText: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 18,
    fontFamily: "monospace",
  },
  errorModalButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  errorModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
});
