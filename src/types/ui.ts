/**
 * Toast notification types
 */
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastState {
  type: ToastType;
  message: string;
  duration: number;
  visible: boolean;
  /** Optional detailed error message (shown in modal when tapped) */
  details?: string;
}

/**
 * Error modal state for showing detailed error information
 */
export interface ErrorModalState {
  visible: boolean;
  title: string;
  message: string;
  details?: string;
}
