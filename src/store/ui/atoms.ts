import { atom } from "jotai";
import { TOAST } from "@/constants";
import { ToastType, ToastState, ErrorModalState } from "@/types";

/**
 * Toast state atom
 */
export const toastAtom = atom<ToastState>({
  type: "info",
  message: "",
  duration: TOAST.DURATION_DEFAULT,
  visible: false,
});

/**
 * Error modal state atom (for showing detailed error information)
 */
export const errorModalAtom = atom<ErrorModalState>({
  visible: false,
  title: "",
  message: "",
});

/**
 * Bulk transaction data atom (temporary, for navigation between screens)
 */
export interface BulkTransactionData {
  data: any;
  rawInputId: string;
  summary: string;
  confidence: number;
}

export const bulkTransactionDataAtom = atom<BulkTransactionData | null>(null);

// Re-export ToastType for convenience
export type { ToastType };
