"use client";

import { BaseDialog } from "@/components/ui/base-dialog";
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
    <BaseDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title="Settings"
      subtitle="Customize your experience"
      size="lg"
    >
      <form onSubmit={form.handleSubmit}>
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
    </BaseDialog>
  );
}
