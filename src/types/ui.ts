/**
 * Toast notification types
 */
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastState {
  type: ToastType;
  message: string;
  duration: number;
  visible: boolean;
}
