"use client";

import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";

const typeStyles: Record<string, string> = {
  error: "bg-red-600 text-white",
  success: "bg-emerald-600 text-white",
  info: "bg-slate-700 text-white",
};

export function ToastViewport() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          className={`toast-enter flex items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-lg transition-all data-ending-style:translate-x-full data-ending-style:opacity-0 data-starting-style:translate-x-full data-starting-style:opacity-0 ${typeStyles[toast.type ?? "error"]}`}
        >
          <Toast.Title className="flex-1">{toast.title}</Toast.Title>
          <Toast.Close className="text-white/80 hover:text-white">
            <X className="h-4 w-4" />
          </Toast.Close>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  );
}
