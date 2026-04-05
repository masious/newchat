"use client";

import { Toast } from "@base-ui/react/toast";
import { toastManager, AuthExpiredListener } from "./toast-context";
import { ToastViewport } from "@/components/ui/toast-container";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} timeout={4000}>
      {children}
      <AuthExpiredListener />
      <ToastViewport />
    </Toast.Provider>
  );
}
