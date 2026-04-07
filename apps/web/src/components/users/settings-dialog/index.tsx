"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ScrollArea } from "@base-ui/react";
import { useSettingsForm } from "./hooks/useSettingsForm";
import { SettingsSection } from "./components/SettingsSection";
import { NotificationSection } from "./components/NotificationSection";
import { DialogFooter } from "./components/DialogFooter";

export function SettingsDialog({
  open,
  onClose,
  isDark,
  onToggleDarkMode,
  muted,
  onToggleMute,
}: {
  open: boolean;
  onClose: () => void;
  isDark?: boolean;
  onToggleDarkMode?: () => void;
  muted?: boolean;
  onToggleMute?: () => void;
}) {
  const form = useSettingsForm(open, onClose);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/30" />
        <Dialog.Viewport className="fixed inset-0 flex items-center justify-center px-4">
          <ScrollArea.Root
            style={{ position: undefined }}
            className="box-border h-full overscroll-contain in-data-ending-style:pointer-events-none"
          >
            <ScrollArea.Viewport className="box-border h-full overscroll-contain in-data-ending-style:pointer-events-none">
              <ScrollArea.Content className="flex min-h-full items-center justify-center">
                <Dialog.Popup className="w-full max-w-lg min-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                  <form onSubmit={form.handleSubmit}>
                    <div className="flex items-start justify-between">
                      <div>
                        <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          Settings
                        </Dialog.Title>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Customize your experience
                        </p>
                      </div>
                      <Dialog.Close className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        Close
                      </Dialog.Close>
                    </div>

                    {form.error && (
                      <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        {form.error}
                      </div>
                    )}

                    <SettingsSection
                      isDark={isDark}
                      onToggleDarkMode={onToggleDarkMode}
                      muted={muted}
                      onToggleMute={onToggleMute}
                    />

                    <NotificationSection
                      telegramEnabled={form.enableTelegram}
                      onTelegramToggle={form.setEnableTelegram}
                      webEnabled={form.enableWeb}
                      onWebToggle={form.setEnableWeb}
                    />

                    <DialogFooter
                      isBusy={form.isBusy}
                      submitLabel={form.submitLabel}
                    />
                  </form>
                </Dialog.Popup>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
