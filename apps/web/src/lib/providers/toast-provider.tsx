"use client";

import { Toast } from "@base-ui/react/toast";
import { ToastViewport } from "@/components/ui/toast-container";
import { AuthExpiredListener, toastManager } from "./toast-context";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} timeout={4000}>
      {children}
      <AuthExpiredListener />
      <ToastViewport />
    </Toast.Provider>
  );
}
