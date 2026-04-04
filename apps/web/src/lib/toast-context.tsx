"use client";

import { useEffect } from "react";
import { Toast } from "@base-ui/react/toast";

type ToastType = "error" | "success" | "info";

export const toastManager = Toast.createToastManager();

export function addToast(message: string, type: ToastType = "error") {
  toastManager.add({ title: message, type, timeout: 4000 });
}

export function useToast() {
  const manager = Toast.useToastManager();
  return {
    toasts: manager.toasts,
    addToast: (message: string, type: ToastType = "error") => {
      manager.add({ title: message, type, timeout: 4000 });
    },
    removeToast: (id: string) => {
      manager.close(id);
    },
  };
}

export function AuthExpiredListener() {
  useEffect(() => {
    const handler = () =>
      addToast("Your session has expired. Please log in again.", "info");
    window.addEventListener("newchat:auth-expired", handler);
    return () => window.removeEventListener("newchat:auth-expired", handler);
  }, []);
  return null;
}
