import { atom } from "jotai";
import { TOAST } from "@/constants";
import { ToastType, ToastState } from "@/types";

/**
 * Toast state atom
 */
export const toastAtom = atom<ToastState>({
  type: "info",
  message: "",
  duration: TOAST.DURATION_DEFAULT,
  visible: false,
});

// Re-export ToastType for convenience
export type { ToastType };
