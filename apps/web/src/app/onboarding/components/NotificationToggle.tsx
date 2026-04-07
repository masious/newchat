import { Bell, Send } from "lucide-react";
import { SwitchOption } from "@/components/ui/switch-option";

interface NotificationToggleProps {
  webEnabled: boolean;
  onWebToggle: (value: boolean) => void;
  webSupported: boolean;
  telegramEnabled: boolean;
  onTelegramToggle: (value: boolean) => void;
}

export function NotificationToggle({
  webEnabled,
  onWebToggle,
  webSupported,
  telegramEnabled,
  onTelegramToggle,
}: NotificationToggleProps) {
  return (
    <div className="mt-6 space-y-3">
      <SwitchOption
        checked={telegramEnabled}
        onCheckedChange={onTelegramToggle}
        icon={<Send className="h-4 w-4" />}
        label="Telegram notifications"
        description="Receive notifications via the Telegram bot. You can change this later in settings."
      />
      {webSupported && (
        <SwitchOption
          checked={webEnabled}
          onCheckedChange={onWebToggle}
          icon={<Bell className="h-4 w-4" />}
          label="Browser notifications"
          description="Get notified about new messages even when the tab is in the background. You can change this later in settings."
        />
      )}
    </div>
  );
}
