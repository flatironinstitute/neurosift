import { createContext, useContext } from "react";
import type { ToastProps } from "./Toast";

export type ToastOptions = Omit<ToastProps, "onDismiss">;

export interface ToastApi {
  show: (toast: ToastOptions) => void;
  dismiss: () => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Shows a toast in the app's one toast region, replacing any toast already there. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast needs a ToastProvider at the app root");
  return api;
}
