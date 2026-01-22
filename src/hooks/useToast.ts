import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { toastAtom, errorModalAtom, ToastType } from "@/store/ui/atoms";

export interface ShowToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
  /** Optional detailed message (shown when user taps for more info) */
  details?: string;
}

export interface ShowErrorModalOptions {
  title?: string;
  message: string;
  details?: string;
}

/**
 * Hook to show toast notifications and error modals
 * Uses Jotai atoms to trigger display from ToastContainer/ErrorModal
 */
export const useToast = () => {
  const setToast = useSetAtom(toastAtom);
  const setErrorModal = useSetAtom(errorModalAtom);

  const showToast = useCallback(
    ({ type, message, duration = 3000, details }: ShowToastOptions) => {
      setToast({ type, message, duration, visible: true, details });
    },
    [setToast]
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showToast({ type: "success", message, duration });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration?: number, details?: string) => {
      // For long messages (>100 chars), automatically add details
      if (message.length > 100 && !details) {
        showToast({
          type: "error",
          message: message.substring(0, 80) + "...",
          duration: duration || 5000,
          details: message,
        });
      } else {
        showToast({ type: "error", message, duration, details });
      }
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showToast({ type: "warning", message, duration });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showToast({ type: "info", message, duration });
    },
    [showToast]
  );

  /**
   * Show error in a full-screen modal (for detailed error information)
   */
  const showErrorModal = useCallback(
    ({ title = "Error", message, details }: ShowErrorModalOptions) => {
      setErrorModal({ visible: true, title, message, details });
    },
    [setErrorModal]
  );

  /**
   * Hide the error modal
   */
  const hideErrorModal = useCallback(() => {
    setErrorModal((prev) => ({ ...prev, visible: false }));
  }, [setErrorModal]);

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showErrorModal,
    hideErrorModal,
  };
};
