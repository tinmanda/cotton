import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { toastAtom, ToastType } from "@/store/ui/atoms";

export interface ShowToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

/**
 * Hook to show toast notifications
 * Uses Jotai atom to trigger toast display from ToastContainer
 */
export const useToast = () => {
  const setToast = useSetAtom(toastAtom);

  const showToast = useCallback(
    ({ type, message, duration = 3000 }: ShowToastOptions) => {
      setToast({ type, message, duration, visible: true });
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
    (message: string, duration?: number) => {
      showToast({ type: "error", message, duration });
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

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
