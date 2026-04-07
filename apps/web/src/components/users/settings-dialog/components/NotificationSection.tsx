import { Bell, Send } from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";
import { SwitchOption } from "@/components/ui/switch-option";

export function NotificationSection({
  telegramEnabled,
  onTelegramToggle,
  webEnabled,
  onWebToggle,
}: {
  telegramEnabled: boolean;
  onTelegramToggle: (value: boolean) => void;
  webEnabled: boolean;
  onWebToggle: (value: boolean) => void;
}) {
  return (
    <fieldset className="mt-6">
      <SectionLabel as="legend">
        Notifications
      </SectionLabel>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Choose how you want to receive message notifications
      </p>
      <div className="mt-3 space-y-3">
        <SwitchOption
          checked={telegramEnabled}
          onCheckedChange={onTelegramToggle}
          icon={<Send className="h-4 w-4" />}
          label="Telegram notifications"
          description="Receive notifications via the Telegram bot"
        />
        <SwitchOption
          checked={webEnabled}
          onCheckedChange={onWebToggle}
          icon={<Bell className="h-4 w-4" />}
          label="Browser notifications"
          description="Get notified about new messages even when the tab is in the background"
        />
      </div>
    </fieldset>
  );
}
